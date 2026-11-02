# Spec Delta

## Purpose

This capability lets maintainers manually dispatch GitHub Actions to apply an OpenSpec change with a configurable AI model and publish the resulting implementation as a reviewable pull request.

## ADDED Requirements

### Requirement: Maintainer can manually dispatch an OpenSpec apply run

The system SHALL provide a manually triggerable GitHub Actions workflow that accepts the target OpenSpec change and the task to apply as dispatch inputs, with the task input supporting a specific task identifier or an explicit request to apply all pending tasks.

#### Scenario: Dispatch a selected task for the active change

- **WHEN** a maintainer dispatches the workflow with a change name and task identifier
- **THEN** the run uses that change's active specification artifacts and applies only the selected pending task

#### Scenario: Dispatch all pending tasks

- **WHEN** a maintainer dispatches the workflow with a change name and the all-pending-tasks option
- **THEN** the run attempts every pending task from that change in task order

#### Scenario: Missing dispatch input

- **WHEN** a required change or task input is empty or invalid
- **THEN** the workflow fails before invoking the model and reports which input must be corrected

### Requirement: The run uses the repository's OpenSpec artifacts as source of truth

The system SHALL read the selected active change's specification files and `tasks.md` from the checked-out repository, and SHALL verify that the change is complete enough for application before invoking the model.

#### Scenario: Valid active change

- **WHEN** the selected change exists under `openspec/changes/` and contains its required proposal, specification, design, and task artifacts
- **THEN** the run passes those artifacts to the implementation agent as read-only planning context

#### Scenario: Change is absent or incomplete

- **WHEN** the selected change does not exist or is missing a required artifact
- **THEN** the workflow fails with the missing path and does not create a branch or pull request

#### Scenario: Requested task is already complete

- **WHEN** the selected task is already marked complete in `tasks.md`
- **THEN** the workflow fails without invoking the model and reports that no pending work matches the request

### Requirement: Model configuration is provider-neutral and initially uses DeepSeek

The system SHALL expose model selection through generic configuration such as model provider, model name, and model API key inputs or secrets, while the default repository configuration SHALL use DeepSeek without embedding provider-specific names in the workflow's control flow.

#### Scenario: Default model configuration

- **WHEN** a maintainer dispatches a run without overriding model configuration
- **THEN** the workflow uses the configured DeepSeek provider and model credentials

#### Scenario: Alternate compatible model provider

- **WHEN** repository configuration supplies another provider, model identifier, endpoint, and credential using the generic configuration surface
- **THEN** the workflow passes that configuration to the model client without requiring changes to task-selection or PR logic

#### Scenario: Missing model credential

- **WHEN** no credential is available for the selected provider
- **THEN** the workflow fails before changing repository contents and identifies the required secret or configuration

### Requirement: Generated implementation is isolated and reviewable

The system SHALL apply the selected task on a dedicated branch based on the dispatch context, SHALL preserve the OpenSpec artifacts in the working tree, and SHALL create a pull request containing the generated changes and a summary of the source change, task selection, model configuration, and validation results.

#### Scenario: Successful application

- **WHEN** the model completes the selected task and repository validation succeeds
- **THEN** the workflow commits the implementation to a dedicated branch and opens one pull request targeting the default branch

#### Scenario: No implementation diff

- **WHEN** the model completes without producing a repository diff
- **THEN** the workflow fails or reports no-op completion and does not open an empty pull request

#### Scenario: Validation failure

- **WHEN** the generated implementation fails the configured validation checks
- **THEN** the workflow does not open a pull request and exposes the failing command output in the run logs

#### Scenario: Pull request creation is unavailable

- **WHEN** the workflow lacks permission to push the branch or create a pull request
- **THEN** the workflow fails explicitly with the missing permission and leaves the generated branch state identifiable for recovery

### Requirement: Workflow execution is safe and auditable

The system SHALL limit the workflow token to the permissions required for checkout, branch publication, and pull request creation, SHALL prevent model credentials from being written to repository files or logs, and SHALL expose run identifiers and source commit information in the pull request.

#### Scenario: Credential handling

- **WHEN** the model client is configured with a secret credential
- **THEN** the credential is supplied through the action environment or secret mechanism and is masked from logs

#### Scenario: Source traceability

- **WHEN** a pull request is opened
- **THEN** its body identifies the OpenSpec change, task selection, source commit, workflow run, and model identifier without exposing the credential
