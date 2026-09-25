# Design

## Context

The repository already contains OpenSpec configuration and a setup workflow that installs the OpenSpec CLI, but it has no workflow for applying a change. The new automation must operate on repository-local artifacts under `openspec/changes/`, preserve the existing planning flow, and produce a normal pull request rather than pushing directly to the default branch.

## Goals / Non-Goals

**Goals:**

- Provide a `workflow_dispatch` entry point with a change selector, task selector, and generic model settings.
- Validate OpenSpec artifacts before any model invocation.
- Run a model-backed implementation agent in an isolated branch, execute repository validation, and create a traceable pull request.
- Keep provider-specific details behind generic provider/model/endpoint/credential configuration, with DeepSeek as the initial default.
- Make failures explicit and prevent secrets from entering logs, commits, or pull request content.

**Non-Goals:**

- Automatically applying changes on pushes, schedules, or pull request events.
- Replacing OpenSpec's local proposal, specification, design, or task authoring workflow.
- Supporting arbitrary model protocols that cannot be driven through the selected model client.
- Automatically merging the generated pull request or marking OpenSpec tasks complete without the implementation agent's changes.

## Decisions

### Use a repository workflow with explicit dispatch inputs

The workflow will be a checked-in `.github/workflows` file using `workflow_dispatch`. Inputs will identify the change and either a task ID or all-pending mode. This keeps executions intentional and reproducible; push-triggered automation would risk applying unfinished or unexpected changes.

### Validate through OpenSpec and local file checks before model execution

The workflow will install a pinned or repository-approved OpenSpec CLI version, inspect the requested change status, and confirm the required artifacts and pending task exist. This gives actionable errors before any model cost or branch mutation. The agent receives the artifacts from the checked-out commit, not user-supplied free-form content alone.

### Use a generic model adapter configuration

The workflow will define generic values such as `MODEL_PROVIDER`, `MODEL_NAME`, `MODEL_ENDPOINT`, and `MODEL_API_KEY`, with DeepSeek defaults and a repository secret for the initial key. The implementation layer will translate these values to the chosen client invocation. This avoids coupling task orchestration, validation, and PR publication to DeepSeek and permits a compatible provider later.

### Use least-privilege GitHub token permissions

The job will request only `contents: write` and `pull-requests: write` (plus read metadata as required by GitHub Actions). The model key will come from GitHub Secrets, be passed only to the process that needs it, and never be interpolated into shell output or PR text.

### Branch, validate, and publish through standard GitHub tooling

The workflow will create a deterministic, collision-resistant branch from the source ref, run the implementation agent there, execute the repository's documented validation commands, and use the GitHub CLI or an official pull-request action to open one PR. The PR body will include the change/task/run/source metadata and validation results so reviewers can audit the automation.

### Fail closed on no-op or invalid output

Missing artifacts, completed tasks, missing credentials, model failure, validation failure, or an empty diff will stop the run. A PR is created only after a non-empty diff and successful validation, avoiding misleading success signals.

## Risks / Trade-offs

- **[Model-generated unsafe or incorrect code]** → Require normal PR review, run repository validation before PR creation, and never merge automatically.
- **[Provider API incompatibility]** → Keep provider configuration generic but constrain the first implementation to a documented compatible client contract; fail with a clear configuration error for unsupported combinations.
- **[Concurrent runs target the same change]** → Use a concurrency group keyed by change and task, and include the run ID in branch names and PR metadata.
- **[Workflow token cannot create PRs due to repository policy]** → Check permissions early and report the required repository setting or token scope.
- **[Secrets leak through model output or diagnostics]** → Mask the secret, avoid echoing environment values, scrub generated PR metadata, and fail rather than include suspicious credential text.

## Migration Plan

1. Add the workflow and generic model configuration documentation with DeepSeek as the initial default.
2. Configure the required repository secret and verify permissions in a test dispatch against a disposable OpenSpec change.
3. Review and merge the generated PR using the existing repository process.
4. Roll back by disabling or removing the workflow; existing OpenSpec changes and local application remain unaffected.

## Open Questions

- Which repository-specific validation command should be the default if the project does not yet document one? The implementation can use a required workflow input or a repository script without changing the capability contract.
