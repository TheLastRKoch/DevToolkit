# Proposal

## Why

The OpenSpec apply workflow currently always checks out the workflow-triggered revision, so maintainers cannot apply a change against a selected development branch or verify the result against a branch other than the default source. A branch input is needed to make the automation useful across parallel feature branches while keeping the selected source explicit and auditable.

## What Changes

- Add a required manual-dispatch input for the source branch or ref from which the OpenSpec change will be applied.
- Check out and validate the selected source ref before reading OpenSpec artifacts or invoking the model.
- Include the selected source ref in generated branch naming and pull-request metadata.
- Reject missing, invalid, unavailable, or inaccessible refs before creating an implementation branch or calling the model.
- Preserve the existing change/task selection, model configuration, validation, and PR behavior.

## Capabilities

### New Capabilities

- `github-actions-openspec-branch-selection`: Select and validate the source branch or ref used by a manually dispatched OpenSpec apply workflow.

### Modified Capabilities

- None. The existing apply capability is archived without a main spec, so this change introduces the branch-selection contract as a separate capability.

## Impact

- Updates `.github/workflows/openspec-apply.yml`, its checkout and branch logic, and the operator documentation.
- Adds a required workflow dispatch input and changes the workflow's default checkout behavior.
- Pull requests will identify both the source ref and generated implementation branch.
- No application runtime APIs or model provider interfaces change.
