# Tasks

## 1. Workflow contract and configuration

- [x] 1.1 Add a `workflow_dispatch` workflow with validated change, task/all-pending, model provider, model name, endpoint, and validation-command inputs; verify the workflow parses with a GitHub Actions YAML validator.
- [x] 1.2 Add generic model configuration and DeepSeek defaults backed by a masked repository secret; verify the workflow fails before checkout mutation when the selected provider has no credential.
- [x] 1.3 Add least-privilege `contents` and `pull-requests` permissions, concurrency by change/task, and safe shell settings; verify the workflow definition contains no secret interpolation in logs or committed files.

## 2. OpenSpec loading and model application

- [x] 2.1 Install a repository-approved OpenSpec CLI version and validate the selected change's required artifacts and status before model invocation; verify missing changes/artifacts produce actionable failures without a branch or PR.
- [x] 2.2 Implement task selection from `tasks.md`, including one pending task and all pending tasks in order; verify completed or unknown tasks are rejected before the model client runs.
- [x] 2.3 Add the model adapter invocation using provider-neutral configuration and pass proposal, specs, design, and tasks as repository context; verify the default DeepSeek configuration and an alternate compatible provider use the same orchestration path.
- [x] 2.4 Preserve OpenSpec artifacts and fail explicitly on model errors or an empty implementation diff; verify no-op runs do not create an empty pull request.

## 3. Validation and pull request publication

- [x] 3.1 Create a collision-resistant implementation branch, commit only the generated repository changes, and run the configured repository validation command; verify validation failures stop publication and retain actionable logs.
- [x] 3.2 Create one pull request targeting the default branch with change, task, model identifier, source commit, workflow run, and validation metadata; verify the body contains no credential and the PR is opened only after a non-empty validated diff.
- [x] 3.3 Document required repository secrets, dispatch inputs, model-provider configuration, permissions, validation command, and recovery behavior; verify the documented manual dispatch can be followed against a disposable change.

## 4. Integration verification

- [x] 4.1 Run OpenSpec validation and a dry-run or mocked workflow execution covering valid, missing-artifact, completed-task, missing-credential, validation-failure, no-op, and successful-PR paths; verify all expected failure gates and traceability fields.
