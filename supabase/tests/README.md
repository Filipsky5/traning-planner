# Database regression tests

These pgTAP tests run against a local Supabase database with all migrations applied. They create synthetic users and training data inside a transaction and roll everything back. Do not target a hosted database.

Use Node 22 (`nvm use`), install dependencies with `npm ci`, and start Docker. The project pins Supabase CLI **3.0.0** as a development dependency:

```sh
npm run supabase -- db start
npm run supabase -- migration up
npm run supabase -- test db
```

The database-test CI job installs the same CLI from `package-lock.json`. CLI 3 targets the local stack by default, so these commands do not use `--remote`. See [the project CLI guide](../../.ai/supabase-cli.md) for hosted migration commands and configuration changes.

After testing, stop the local stack with `npm run supabase -- stop`. CI uses `stop --no-backup` to delete its disposable test volumes.

`database/security_advisors.test.sql` covers:

- Anonymous, two owning users, and an unrelated user reading workout-history views.
- Last-three limits overall and per training type.
- SELECT, INSERT, UPDATE, DELETE, and ownership reassignment on all four owner-protected tables.
- Rejection of anonymous and signed-in maintenance calls, with continued execution by the cron owner.
- Expiration of stale suggestions across users while fresh suggestions remain available.
- Preservation of the hourly cron schedule and presence of training-type foreign-key indexes.

For an isolated PostgreSQL container, the same SQL can be executed with `psql -X -qAt -v ON_ERROR_STOP=1` after applying all migrations. Inspect the TAP result as well as the process exit code: pgTAP assertion failures are reported as `not ok` lines and do not by themselves make psql exit unsuccessfully. The standard `supabase test db` runner handles this automatically.
