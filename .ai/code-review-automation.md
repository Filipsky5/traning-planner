# Automated code review

The `AI Code Review` workflow in `.github/workflows/claude-code-review.yml` runs
when a pull request is opened, updated, or reopened.

## Primary and fallback reviewers

1. `claude-review` runs the existing Claude review, with a 15-minute timeout.
   A completion guard then requires a successful action step
   and a successful final result in its JSON execution trace. An exit code of
   zero from the action alone is insufficient.
2. `codex-review` starts only when the Claude job fails, the workflow has not been
   canceled, and the PR head belongs to this repository. A Claude review that
   completes successfully and reports findings does not trigger the fallback.
3. `post-codex-review` publishes successful, nonempty Codex output as a GitHub PR
   review with the `COMMENT` event. It does not approve or request changes.

Codex checks out the exact PR head with full history and compares it with the
event's base commit. `.github/codex/prompts/review.md` defines the review scope.
The action uses its default model, a read-only sandbox, and the `drop-sudo` safety
strategy. The Codex job is pinned to `ubuntu-24.04`: Ubuntu 26.04 (currently
`ubuntu-latest`) hits the upstream [D-Bus socket isolation bug](https://github.com/openai/codex-action/issues/188)
before Codex can execute. Keep this runner pin until the upstream fix is verified;
do not work around it by disabling privilege isolation.
The generation job has only `contents: read`, and checkout credentials
are not persisted. The separate publishing job has `pull-requests: write` and
does not check out or execute PR code.

Publishing is skipped if the PR is closed or its current head no longer matches
the reviewed commit. Repeated runs do not publish a duplicate fallback review
for the same commit. A new PR update cancels earlier runs of this workflow.

## Configuration and limitations

- Existing Claude authentication uses `CLAUDE_CODE_OAUTH_TOKEN`.
- Claude's action can exit successfully without running its model when the
  workflow differs from the default branch. Its logs then report a workflow
  validation skip and its execution outputs are absent. The completion guard
  treats this as a failed primary review so Codex runs; it does not bypass
  Claude's workflow-validation security check.
- Codex requires the repository Actions secret `OPENAI_API_KEY`. Keep its value
  in GitHub Secrets; the workflow references the name only.
- Codex API usage is charged to the key's API project. Connecting GitHub to the
  desktop app does not configure CI authentication.
- Fork PRs do not run the Codex fallback, because repository secrets are not
  available to their `pull_request` workflows. The Codex action also retains its
  default restriction to trusted users with repository write access; bot and
  external-contributor reviews need separate access configuration.
- A missing or invalid key, exhausted quota, or unavailable model causes the
  fallback job to fail visibly. It does not publish a fabricated review.
- The original Claude job remains failed even when Codex succeeds. If branch
  protection requires `claude-review`, its failure still blocks merging; the
  fallback does not change branch protection or mask that failure.
- The separate mention-triggered `.github/workflows/claude.yml` is unchanged.

On a same-repository PR, pushing this workflow update triggers the primary job
and, if it fails, the fallback automatically. Review the Actions run to verify
the API credentials and model availability in the actual GitHub environment.

Reference: [Official Codex GitHub Action documentation](https://learn.chatgpt.com/docs/github-action).

Run the completion guard regression tests with
`node --test .github/scripts/verify-claude-review.test.mjs`. They cover successful
action skips, absent/malformed/incomplete traces, failed results, and completed
successful reviews.
