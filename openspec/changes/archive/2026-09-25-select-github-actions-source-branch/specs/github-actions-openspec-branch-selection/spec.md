# Spec Delta

## Purpose

This capability lets maintainers choose and verify the repository branch or ref from which a GitHub Actions OpenSpec application starts.

## ADDED Requirements

### Requirement: Maintainer can select the OpenSpec source branch

The manually triggered OpenSpec apply workflow SHALL accept a required source branch or ref input and SHALL use that ref as the checkout source for the selected OpenSpec change.

#### Scenario: Apply from a feature branch

- **WHEN** a maintainer dispatches the workflow with an existing feature branch
- **THEN** the workflow checks out that branch and reads the OpenSpec change and task from that branch before invoking the model

#### Scenario: Apply from a tag or commit ref

- **WHEN** a maintainer dispatches the workflow with an accessible tag or commit ref
- **THEN** the workflow checks out that exact ref and uses it as the immutable source revision for the run

#### Scenario: Source ref omitted

- **WHEN** the source branch or ref input is empty
- **THEN** the workflow fails before model invocation and reports that a source ref is required

### Requirement: The selected source ref is validated before application

The workflow SHALL verify that the selected source ref exists and is accessible, and SHALL validate the requested OpenSpec change and task against the checked-out source before creating an implementation branch.

#### Scenario: Source ref is unavailable

- **WHEN** the requested branch, tag, or commit cannot be resolved
- **THEN** the workflow fails with the requested ref and does not invoke the model or create a pull request

#### Scenario: Change exists only on another ref

- **WHEN** the selected source ref is valid but does not contain the requested OpenSpec change or required artifacts
- **THEN** the workflow reports the missing change/artifact from that ref and stops before model invocation

#### Scenario: Selected task is not pending on source ref

- **WHEN** the requested task is absent or already complete in the selected source ref's `tasks.md`
- **THEN** the workflow fails before making implementation changes and identifies the source ref used for the check

### Requirement: Generated work remains traceable to the selected source

The workflow SHALL create the implementation branch from the selected source ref and SHALL include the source ref and resolved source commit in the pull-request metadata.

#### Scenario: Successful application from selected ref

- **WHEN** the model applies a pending task successfully and validation passes
- **THEN** the generated branch is based on the selected source ref and the pull request identifies the source ref, resolved source commit, OpenSpec change, task selection, and workflow run

#### Scenario: Source branch moves during the run

- **WHEN** the named source branch advances after the workflow checkout resolves it
- **THEN** the run continues from the originally resolved commit and reports that commit in the pull request rather than silently switching revisions

#### Scenario: Source ref conflicts with generated branch

- **WHEN** the requested generated branch name would collide with an existing branch or unsafe ref syntax
- **THEN** the workflow fails with a clear collision or validation error before publishing a branch or pull request
