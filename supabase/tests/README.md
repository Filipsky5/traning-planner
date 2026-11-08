# Database regression tests

These pgTAP tests run against a local Supabase database with all migrations applied. They create synthetic users and training data inside a transaction and roll everything back. Do not target a hosted database.

With Docker running and Supabase CLI **2.58.5** installed:

```sh
supabase db start
supabase migration up --local
supabase test db
```

The CLI version matches the database-test CI job and the existing `config.toml` format. Review the Supabase CLI migration guide before upgrading to v3, which changes configuration keys and command defaults.

`database/security_advisors.test.sql` covers:

- Anonymous, two owning users, and an unrelated user reading workout-history views.
- Last-three limits overall and per training type.
- SELECT, INSERT, UPDATE, DELETE, and ownership reassignment on all four owner-protected tables.
- Rejection of anonymous and signed-in maintenance calls, with continued execution by the cron owner.
- Expiration of stale suggestions across users while fresh suggestions remain available.
- Preservation of the hourly cron schedule and presence of training-type foreign-key indexes.

For an isolated PostgreSQL container, the same SQL can be executed with `psql -X -qAt -v ON_ERROR_STOP=1` after applying all migrations. Inspect the TAP result as well as the process exit code: pgTAP assertion failures are reported as `not ok` lines and do not by themselves make psql exit unsuccessfully. The standard `supabase test db` runner handles this automatically.
