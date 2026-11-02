# Tasks

## 1. Workflow source selection

- [x] 1.1 Add a required `source_ref` workflow-dispatch input and pass it to checkout; verify the workflow YAML exposes the input and checkout uses the selected ref.
- [x] 1.2 Resolve the checked-out ref to one commit, reject unsafe or unavailable refs, and export the resolved commit for later steps; verify invalid and missing refs fail before model invocation.
- [x] 1.3 Create the generated implementation branch from the resolved source commit with a sanitized source-ref component and run identifier; verify branch creation does not overwrite an existing branch.

## 2. Source-aware application and publication

- [x] 2.1 Validate the OpenSpec change and selected task after checking out the requested source ref; verify a change or task that exists only on another ref is rejected before the model client runs.
- [x] 2.2 Include the selected source ref and resolved source commit in workflow logs and pull-request metadata; verify successful publication preserves both values without exposing credentials.
- [x] 2.3 Preserve existing model, validation, no-op, commit, push, and pull-request failure gates while using the selected source; verify the workflow still refuses empty diffs and failed validation.

## 3. Documentation and integration verification

- [x] 3.1 Update the OpenSpec apply documentation with source-ref configuration, branch/tag/SHA examples, validation behavior, and recovery guidance; verify the documented dispatch sequence includes the required source ref.
- [x] 3.2 Run workflow YAML/static checks and mocked or dry-run scenarios for a valid branch, tag or SHA, missing ref, invalid ref, missing change, task mismatch, and moving branch; verify every scenario reports the resolved source context or fails before model invocation.
