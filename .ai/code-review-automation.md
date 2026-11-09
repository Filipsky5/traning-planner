# Code review automation

Repository-managed Claude and Codex review workflows are disabled. Pull requests,
review comments, and `@claude` mentions do not invoke an AI review action.

The automatic Claude review workflow and the mention-triggered Claude workflow,
including the review completion guard and its tests, have been removed. CI/CD no
longer references `CLAUDE_CODE_OAUTH_TOKEN` or requires private AI review credentials.

Pull request lint, unit tests, database tests, E2E tests, and status comments remain configured in
`.github/workflows/pull-request.yml`. Manual deployment remains configured in
`.github/workflows/deploy.yml`.
