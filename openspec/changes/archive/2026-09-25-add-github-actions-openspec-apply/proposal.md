# Proposal

## Why

OpenSpec changes currently require a developer or agent to run the apply workflow locally, which makes implementation less repeatable and harder to trigger from a controlled repository workflow. A manually triggered GitHub Action should be able to select the active OpenSpec change, apply its specification and `tasks.md` with an AI model, and publish the result as a pull request for review.

## What Changes

- Add a manually dispatchable GitHub Actions workflow for applying an active OpenSpec change.
- Allow the workflow dispatch to receive the change/spec identifier and task input, while also supporting the repository’s active OpenSpec change and its `tasks.md` as the source of truth.
- Introduce model-neutral workflow configuration and provider-specific credentials, initially configured to use DeepSeek.
- Install and invoke the OpenSpec tooling and model-backed implementation agent in the workflow.
- Create a branch, commit the generated implementation, and open a pull request with links to the applied change and execution metadata.
- Fail explicitly when the requested change, required artifacts, credentials, or generated diff are invalid or unavailable.

## Capabilities

### New Capabilities

- `github-actions-openspec-apply`: Manually dispatch, configure, and execute an OpenSpec change through GitHub Actions, then publish the implementation as a pull request.

### Modified Capabilities

- None.

## Impact

- Adds a repository workflow under `.github/workflows/` and supporting configuration/documentation for model credentials and action inputs.
- Requires GitHub Actions permissions to read/write repository contents and pull requests, plus a repository secret for the selected model provider.
- Uses the existing `openspec/changes/` layout and active change artifacts, especially the specification files and `tasks.md`.
- Changes repository automation behavior only; no existing runtime application API is changed.
