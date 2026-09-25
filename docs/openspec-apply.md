# GitHub Actions OpenSpec apply

The `Apply OpenSpec change` workflow applies an existing change from
`openspec/changes/` and opens a pull request. It is intentionally manual:
reviewers decide which change and task are safe to execute.

## Repository setup

Create the repository secret `MODEL_API_KEY` with the API key for the selected
provider. The default configuration uses DeepSeek's OpenAI-compatible endpoint
and `deepseek-chat`. The workflow requests `contents: write` and
`pull-requests: write`, so repository Actions settings must allow the workflow
token to create branches and pull requests.

The model adapter accepts any compatible provider through:

- `model_provider` — provider label used for traceability.
- `model_name` — model identifier.
- `model_endpoint` — API base URL; `/chat/completions` is appended.
- `MODEL_API_KEY` — masked repository secret.

## Dispatching

1. Open **Actions → Apply OpenSpec change → Run workflow**.
2. Enter the change directory name, for example
   `add-github-actions-openspec-apply`.
3. Enter a task ID from that change's `tasks.md`, or `all` to apply every
   pending task in order.
4. Keep or override the model and validation inputs.

The workflow validates the change before creating a branch. It then asks the
configured model for a unified diff, applies it on a run-specific branch, runs
the validation command, and opens one pull request only when a non-empty diff
passes validation. OpenSpec artifacts remain in the branch so the PR includes
the task progress and planning context.

If a run fails before publication, correct the reported input or artifact and
dispatch it again. If a branch was pushed but PR creation failed, use the
branch name shown in the workflow logs to open or recover the PR manually.
Never print or commit `MODEL_API_KEY`.
