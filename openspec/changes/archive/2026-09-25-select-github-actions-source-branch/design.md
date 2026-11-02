# Design

## Context

The current workflow uses the default `actions/checkout` ref and creates a run-specific branch after validating the OpenSpec change. Its dispatch inputs identify the change, task, model, endpoint, and validation command, but not the source revision. The new behavior must select the source before validation so every artifact and task check is evaluated against the same revision.

## Goals / Non-Goals

**Goals:**

- Add a required, safe source-ref input to the manual workflow.
- Resolve and pin the selected ref to one commit before OpenSpec validation and model execution.
- Base the generated branch and pull request on that pinned commit.
- Surface the source ref and resolved commit in logs and PR metadata.
- Keep existing task, model, validation, and PR behavior unchanged apart from their selected source.

**Non-Goals:**

- Automatically discovering or presenting a dynamic branch list in the dispatch form.
- Allowing arbitrary repository or fork selection.
- Rebasing or merging the generated implementation onto another branch during the same run.
- Changing the OpenSpec artifact format or model adapter protocol.

## Decisions

### Use a required string ref input

The workflow will expose `source_ref` as a required string rather than a free-form optional default. GitHub Actions does not provide a reliable native branch dropdown for arbitrary repository branches, while silently defaulting to the current workflow ref would preserve the current ambiguity. A string accepts branches, tags, and commit SHAs and can be validated explicitly.

### Resolve the ref during checkout and pin the resolved commit

`actions/checkout` will receive `ref: ${{ inputs.source_ref }}` with full history. A validation step will resolve `origin/<ref>` or the supplied ref to a commit, export that commit for later steps, and ensure the generated branch starts at that exact commit. This prevents a moving branch from changing the source halfway through a run.

### Validate ref syntax and repository containment

The workflow will reject control characters, path traversal, and malformed refs, then use Git's ref resolution commands rather than shell interpolation. It will not accept a ref that resolves outside the checked-out repository or rely on a remote URL supplied by the dispatcher.

### Include source metadata in the generated branch and PR

The generated branch name will include a sanitized source-ref component and the workflow run ID. The PR body will include the original source ref and resolved commit. The resolved commit is authoritative for reproducibility; the original ref remains useful for operator intent and auditability.

### Keep source selection separate from task selection

Source ref selection determines the repository snapshot. Change and task inputs continue to determine what is applied within that snapshot. This separation avoids coupling branch names to OpenSpec semantics and lets the same change be applied from multiple branches.

## Risks / Trade-offs

- **[Invalid or hostile ref input]** → Validate with Git ref checks, reject unsafe characters and traversal, and avoid interpolating raw input into shell commands.
- **[Source branch lacks the change]** → Validate all required artifacts and task state after checkout, before model invocation.
- **[Branch name collisions]** → Include the run ID and fail if the generated branch already exists rather than overwriting it.
- **[Permissions prevent reading a private ref]** → Fail during checkout/ref resolution with the GitHub error and do not create implementation output.
- **[Long-lived source branch changes after dispatch]** → Pin and report the resolved commit used by the run.

## Migration Plan

1. Add the required `source_ref` dispatch input and update checkout/metadata logic.
2. Update operator documentation and any dispatch examples to include the source branch.
3. Test with the default branch, a feature branch containing an active change, an unavailable ref, and a ref without the change.
4. Existing dispatches must be updated to provide `source_ref`; no automatic fallback is retained.
5. Roll back by reverting the workflow/documentation change, restoring checkout of the workflow ref.
