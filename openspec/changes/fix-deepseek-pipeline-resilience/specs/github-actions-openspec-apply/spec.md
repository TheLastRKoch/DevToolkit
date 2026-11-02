# Spec Delta

## MODIFIED Requirements

### Requirement: The run uses the repository's OpenSpec artifacts as source of truth

The system SHALL read the selected active change's specification files and `tasks.md` from the checked-out repository, SHALL verify that the change is complete enough for application before invoking the model, and SHALL additionally verify that the change's `specs/` directory contains at least one specification file with non-empty content before invoking the model.

#### Scenario: Valid active change

- **WHEN** the selected change exists under `openspec/changes/` and contains its required proposal, specification, design, and task artifacts
- **THEN** the run passes those artifacts to the implementation agent as read-only planning context

#### Scenario: Change is absent or incomplete

- **WHEN** the selected change does not exist or is missing a required artifact
- **THEN** the workflow fails with the missing path and does not create a branch or pull request

#### Scenario: Requested task is already complete

- **WHEN** the selected task is already marked complete in `tasks.md`
- **THEN** the workflow fails without invoking the model and reports that no pending work matches the request

#### Scenario: Specs directory is empty or contains only whitespace

- **WHEN** the selected change's `specs/` directory exists but contains no files with substantive content
- **THEN** the workflow fails before invoking the model and reports that the specs directory is empty, naming the change and the specs path

## ADDED Requirements

### Requirement: Model response format errors are diagnosable and retried

The system SHALL log the raw model response text to the run diagnostics when the response does not contain a parseable unified diff, and SHALL automatically retry the model call once after a short back-off delay before raising a terminal failure.

#### Scenario: Model returns prose instead of a diff on first attempt

- **WHEN** the model's first response does not contain a fenced ` ```diff ` code block
- **THEN** the workflow logs the full raw response text at debug level, waits a short interval, and issues a second model request

#### Scenario: Model returns prose instead of a diff on retry

- **WHEN** both the initial model call and the single retry return responses without a fenced ` ```diff ` code block
- **THEN** the workflow logs the raw response from the retry and raises a terminal failure with the message that no unified diff was returned

#### Scenario: Model returns a diff on retry

- **WHEN** the initial model call does not contain a diff but the retry does
- **THEN** the workflow uses the retried diff and continues normally without surfacing an error

#### Scenario: Model response contains a diff on first attempt

- **WHEN** the first model response contains a fenced ` ```diff ` code block
- **THEN** no retry is issued and the workflow proceeds to apply the diff immediately
