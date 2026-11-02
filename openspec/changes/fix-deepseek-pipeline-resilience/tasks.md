# Tasks

## 1. Validate specs content before model invocation (openspec_apply.py)

- [x] 1.1 Add `_validate_specs_content(change_dir: Path) -> None` to `scripts/openspec_apply.py`: glob `specs/**/*.md` under `change_dir`; if no files exist or all files have empty stripped content, call `fail(...)` with a message naming the change and the specs path. Call this function from `validate_change()` after the existing `openspec validate` subprocess call. Verify by running the script locally with an empty `specs/` directory and confirming exit code 1 and a descriptive error message.

## 2. Add specs content guard to the workflow validation step (openspec-apply.yml)

- [x] 2.1 In the inline Python heredoc of the "Validate source and change" step in `.github/workflows/openspec-apply.yml`, after the `subprocess.run(["openspec", "validate", change, "--json"], check=True)` call, add a check that globs `(directory / "specs").glob("**/*.md")` and verifies at least one file has non-whitespace content; raise `SystemExit` with a diagnostic message if not. Verify by dispatching the workflow with a change whose `specs/` is empty and confirming the workflow fails before the model is invoked.

## 3. Extract model call and add retry with debug logging (openspec_apply.py)

- [x] 3.1 Add `import time` to the imports section of `scripts/openspec_apply.py`.
- [x] 3.2 Extract the HTTP request logic from `request_patch` into a private helper `_call_model(url: str, payload: bytes, headers: dict) -> str` that returns the raw `content` string from `choices[0].message.content`. Keep the existing HTTP exception handling inside this helper. Verify by confirming `request_patch` still works end-to-end when called with a valid endpoint returning a diff.
- [x] 3.3 Extract the diff-extraction regex into a private helper `_extract_diff(content: str) -> str | None` that returns the stripped diff string on success and `None` when the pattern is not found. Verify by unit-testing the helper with a sample diff response and a non-diff prose response.
- [x] 3.4 In `request_patch`, call `_call_model` once; if `_extract_diff` returns `None`, print the raw content using `::debug::` level (`print(f"::debug::Raw model response (attempt 1):\n{content}", file=sys.stderr)`), sleep 5 seconds, call `_call_model` again; if still `None`, print the second raw content at debug level and call `fail("Model response did not contain a unified diff")`. If the retry returns a diff, return it normally. Verify by running the script against a mock endpoint that returns prose on the first call and a valid diff on the second call and confirming exit code 0 and the diff is applied.

## 4. Integration verification

- [ ] 4.1 Dispatch the `Apply OpenSpec change` workflow with a valid change that has substantive specs content and confirm the pipeline completes end-to-end without the `::error::Model response did not contain a unified diff` error. Confirm no regression in the successful path by verifying the generated branch and PR are created as before.
