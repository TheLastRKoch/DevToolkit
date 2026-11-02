# Design

## Context

See `proposal.md — Why` for the motivation. The two affected files are:

- [`scripts/openspec_apply.py`](../../../../scripts/openspec_apply.py) — a self-contained Python 3 script (~194 lines) that reads environment variables, constructs a prompt, calls an OpenAI-compatible chat-completion endpoint, extracts the unified diff from the response, and applies it with `git apply`.
- [`.github/workflows/openspec-apply.yml`](../../../../.github/workflows/openspec-apply.yml) — the workflow that orchestrates the above script; the "Validate source and change" step is written as an inline Python heredoc.

The script has no external dependencies beyond the Python standard library and `git`. Changes must stay within that constraint.

## Goals / Non-Goals

**Goals:**
- Add raw model response debug logging on parse failure (both initial call and retry).
- Add a single retry with fixed 5-second back-off when the model returns a non-diff response.
- Guard against empty or whitespace-only specs: raise a pre-flight error before model invocation when `specs/` is empty.
- Guard against change-name mismatch at the workflow level (the inline Python validation step in the YAML).

**Non-Goals:**
- Structured/tool-call output mode — out of scope; requires provider-specific API changes and a larger refactor.
- Multiple retries or exponential back-off — a single retry is sufficient for transient model variance; more retries risk wasted quota and long runtimes.
- Changing the diff-extraction regex itself — the pattern ` ```diff\s*(.*?)``` ` is correct; the issue is a missing diff, not a malformed one.
- Modifying any PR or commit metadata.

## Decisions

### 1. Log raw response at `::debug::` level, not `::error::`

GitHub Actions' `::debug::` annotation is hidden by default and enabled via the `ACTIONS_STEP_DEBUG` secret, keeping noisy raw payloads out of normal run output while still being accessible when needed. Using `::error::` would make every failed attempt noisy in production.

*Alternative considered*: Write to a temporary file artifact. Rejected — adds artifact upload complexity and persists credentials-adjacent data unnecessarily.

### 2. Single retry with 5-second sleep (`time.sleep(5)`)

A one-shot retry handles transient model inconsistency (the most common cause) without meaningful cost. The sleep is short enough that it does not materially affect the 30-minute workflow timeout.

*Alternative considered*: Retry on any exception, not just non-diff responses. Rejected — HTTP errors and quota errors should surface immediately, not be masked by a retry.

### 3. Specs content guard in `openspec_apply.py`, not only in the YAML

The Python script is the authoritative enforcer because it already reads all spec files to construct the prompt. Placing the guard there means the check fires even when the script is run locally or from a different CI system. The YAML step gets a lighter guard (directory existence + glob match) as an early-exit signal before model invocation.

*Alternative considered*: Guard only in YAML. Rejected — makes the script fragile when used outside the workflow.

### 4. "Substantive content" defined as: at least one `.md` file whose stripped content is longer than zero bytes

This is the simplest threshold that catches the incident scenario (empty directory or all-whitespace files) without false positives for real but minimal specs.

## Risks / Trade-offs

- **Retry may double API cost on genuine refusals** → Mitigation: retry is unconditional on the first non-diff response. A model that consistently refuses will fail on the second attempt. Acceptable because the cost of one extra call is low and genuine refusals are rare with `temperature=0`.
- **5-second back-off may be too short for rate-limited providers** → Mitigation: documented as a known limitation. A future change can make the delay configurable via an environment variable.
- **Debug log contains the full model response** → If the response inadvertently reflects injected content from the prompt, it may appear in debug logs. Mitigation: the workflow masks `MODEL_API_KEY` via GitHub Actions secrets; no credential is in the response itself.

## Migration Plan

1. Modify `scripts/openspec_apply.py`:
   a. Add `import time` to imports.
   b. Extract the HTTP call into a helper `_call_model(...)` that returns `content` (the raw string).
   c. Wrap the diff-extraction regex in a `_extract_diff(content)` helper.
   d. In `request_patch`, call `_call_model` once; if `_extract_diff` returns `None`, log via `::debug::`, sleep 5 s, call `_call_model` again; if still `None`, log and call `fail(...)`.
   e. Add `_validate_specs_content(change_dir)` that globs `specs/**/*.md` and checks at least one has non-empty stripped text; call it from `validate_change`.

2. Modify `.github/workflows/openspec-apply.yml` "Validate source and change" inline Python:
   a. After the existing `subprocess.run(["openspec", "validate", change, "--json"], check=True)` call, add a check that `list((directory / "specs").glob("**/*.md"))` is non-empty and at least one file has non-whitespace content; raise `SystemExit` with a diagnostic message if not.

3. No schema changes, no dependency changes, no rollback required — all changes are additive guards and logging.

## Open Questions

- Should the retry delay be user-configurable (e.g., via `OPENSPEC_RETRY_DELAY_SECONDS` env var)? Deferred — not needed for the incident fix; can be added in a follow-up change.
