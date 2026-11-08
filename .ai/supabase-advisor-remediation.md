# Supabase advisor remediation

Migration: `20261108122832_fix_supabase_security_and_policy_performance.sql`.

## Implemented database changes

- Both last-three workout views use `security_invoker = true`, applying the caller's existing workout ownership policies to direct view queries.
- `PUBLIC`, `anon`, and `authenticated` lose EXECUTE on `app_expire_ai_suggestions()`. The hourly cron job runs as its owner, `postgres`, and remains authorized. Existing trusted service-role permissions are preserved.
- All 16 authenticated CRUD policies across `workouts`, `ai_suggestions`, `ai_suggestion_events`, and `user_goals` evaluate `(select auth.uid())` once per statement. UPDATE retains USING and WITH CHECK to prevent ownership reassignment.
- Training-type foreign keys gain leading-column indexes on `workouts` and `ai_suggestions`.

Existing ownership indexes, partial unique indexes, and unused-index candidates are retained. The three composite foreign-key notices already have useful index access paths; extra indexes solely to clear those notices are not included.

## Verification

The 54 pgTAP assertions in `supabase/tests/database/security_advisors.test.sql` validate isolation and legitimate CRUD behavior, privileged maintenance, and indexes. They run in PR CI against a local database without hosted credentials. See `supabase/tests/README.md` for commands.

Before the migration, 16 assertions fail, including anonymous view reads, cross-user view reads, unauthorized maintenance, and missing indexes. After the migration, all 54 pass. Local catalog checks confirm both invoker views, revoked API-role execution, all 16 optimized policies, and an InitPlan for the workout ownership check.

## Deployment

This PR prepares the migration; it does not apply it to a hosted database. After review, apply pending migrations to the intended Supabase environment using the project's normal migration process. Repeat the role-isolation and function-grant checks there, confirm the next hourly cron run succeeds, and refresh security/performance advisors.

The changes retain view columns, function signature, ownership rules, and cron schedule, so no application deployment order change is required. A standard index build is appropriate for the currently small tables; reassess locking and concurrent index creation before applying to a substantially larger database.

## Hosted Auth follow-up

Leaked-password protection is a hosted Supabase Auth setting, not a Postgres schema setting. A SQL migration or the local `supabase/config.toml` cannot enable it for the hosted project.

After confirming the project has Pro or above, open its [Email Auth settings](https://supabase.com/dashboard/project/_/auth/providers?provider=Email), enable leaked-password protection, and refresh the security advisor. Do not change the subscription automatically. This setting remains a separate deployment action and is not claimed as fixed by the database migration.

References: [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [view RLS](https://supabase.com/docs/guides/database/postgres/row-level-security#views), [function privileges](https://supabase.com/docs/guides/database/functions#function-privileges).
