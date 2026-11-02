# Proposal

## Why

The `openspec-apply` GitHub Actions pipeline fails silently when the DeepSeek model returns a response that does not contain a fenced ` ```diff ``` ` block—a failure mode that is undiagnosable because the raw model response is never logged, and unrecoverable because there is no retry. Additionally, the workflow does not guard against the change name mismatch and empty specs context that produced the incident on 2026-09-25, meaning pre-flight checks stop too late and the model is invoked with insufficient context.

## What Changes

- **Add raw model response logging on parse failure** — when the ````diff` pattern is not found, print the raw model response to the debug log before surfacing the error, enabling post-incident diagnosis without re-running the workflow.
- **Add a single retry with back-off after a non-diff response** — if the model returns a parseable chat completion that does not contain a diff, the script retries once after a short delay instead of failing immediately.
- **Add a non-empty specs context guard** — before invoking the model, validate that the change's `specs/` directory contains at least one spec file with substantive (non-whitespace) content; fail early with a clear diagnostic if not.
- **Add a change-name existence pre-check to the workflow** — the `openspec-apply.yml` workflow step that validates the source ref now also verifies the change directory exists and is non-empty on the checked-out ref, making the mismatch detectable before model invocation.

## Capabilities

### New Capabilities

*(none — all changes are modifications to the existing capability)*

### Modified Capabilities

- `github-actions-openspec-apply`: Adding requirements for model response diagnostics (raw response logging), single retry on non-diff response, pre-flight specs content validation, and change-name existence guard before model invocation.

## Impact

- [`scripts/openspec_apply.py`](../../../../scripts/openspec_apply.py) — modified to log the raw response, retry once, and validate specs content.
- [`.github/workflows/openspec-apply.yml`](../../../../.github/workflows/openspec-apply.yml) — the "Validate source and change" step gains a specs-content existence check.
- No external API contract, no dependency changes, no breaking changes to existing workflow inputs or outputs.
