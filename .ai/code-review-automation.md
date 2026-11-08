# Automated code review

The `Claude Code Review` workflow in `.github/workflows/claude-code-review.yml`
runs when a pull request is opened, updated, or reopened. It uses the existing
`CLAUDE_CODE_OAUTH_TOKEN` repository secret and has a 15-minute timeout. A new PR
update cancels an earlier run of this workflow.

## Review completion

The workflow tests the completion guard before invoking Claude. After the action
returns, the guard requires a successful action step and a successful final
result in its JSON execution trace. An exit code of zero alone is insufficient.

Claude's action can exit successfully without running its model when the workflow
differs from the default branch. Its logs then report a workflow-validation skip
and its execution outputs are absent. The guard marks this as a failed review;
it does not bypass Claude's workflow-validation security check.

Run guard regression tests with:

```sh
node --test .github/scripts/verify-claude-review.test.mjs
```

They cover successful action skips, absent/malformed/incomplete traces, failed
results, and completed successful reviews.

The separate mention-triggered `.github/workflows/claude.yml` remains available.
