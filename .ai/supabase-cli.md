# Supabase CLI 3

The project pins Supabase CLI **3.0.0** in `package.json` and `package-lock.json`. CI and local development use the npm-installed executable. Run `nvm use` and `npm ci`, then verify it with:

```sh
npm run supabase -- --version
```

## Configuration

`supabase/config.toml` uses `[local_smtp]` for the local email testing server, keeping its existing port. The email and SMS provider sections use `enabled`; `[auth].enable_signup` still controls new account registration. The unused legacy `[experimental].orioledb_version` entry has been removed.

The existing local `project_id` and database version are preserved. Stop an existing local stack before upgrading the CLI, then restart it with version 3.

## Local database tests

With Docker running:

```sh
npm run supabase -- db start
npm run supabase -- migration up
npm run supabase -- test db
npm run supabase -- stop
```

CLI 3 database commands target the local stack by default. These pgTAP tests create synthetic data and must run locally. See [database regression tests](../supabase/tests/README.md) for coverage. CI uses `stop --no-backup` only for its disposable test stack.

## Hosted migrations

Choose the intended project explicitly. Replace `<project-ref>` with the project reference from the relevant environment configuration or Dashboard URL:

```sh
npm run supabase -- login
npm run supabase -- db push --remote=<project-ref> --dry-run
npm run supabase -- db push --remote=<project-ref>
```

Hosted changes require interactive confirmation. In an authorized deployment script, pass `--yes` explicitly. A linked project alone no longer makes `db push` target that project; pass `--remote` to use the link or `--remote=<project-ref>` to choose it directly. Do not pass deprecated `--local`, `--linked`, or `--project-ref` database flags.

Preview generated SQL when using `db diff` or `db pull`: CLI 3 defaults to pg-delta. This repository tracks SQL migrations and does not use a declarative schema workflow. Review `config diff --remote=<project-ref>` before any hosted configuration push; that is separate from applying database migrations.

Reference: [Supabase CLI v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3).
