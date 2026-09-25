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
2. Enter `source_ref` with the branch, tag, or commit SHA to use as the source,
   for example `develop`, `feature/my-change`, `v1.2.0`, or
   `a1b2c3d4`.
3. Enter the change directory name, for example
   `add-github-actions-openspec-apply`.
4. Enter a task ID from that change's `tasks.md`, or `all` to apply every
   pending task in order.
5. Keep or override the model and validation inputs.

The workflow checks out the selected source ref, resolves it to a commit, and
validates the OpenSpec change and task from that exact revision before creating
a branch. It then asks the configured model for a unified diff, applies it on
a run-specific branch derived from the change, source ref, and workflow run,
runs the validation command, and opens one pull request only when a non-empty
diff passes validation. The pull request records both the requested source ref
and resolved source commit.

If the source ref is missing, invalid, unavailable, or does not contain the
requested change, the workflow stops before model invocation. A branch or tag
is resolved once at checkout, so later movement of that branch cannot change
the source revision used by the run.

If a run fails before publication, correct the reported input or artifact and
dispatch it again. If a branch was pushed but PR creation failed, use the
branch name shown in the workflow logs to open or recover the PR manually.
Never print or commit `MODEL_API_KEY`.
