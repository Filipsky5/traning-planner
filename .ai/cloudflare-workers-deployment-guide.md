# Cloudflare Workers deployment

Updated 2026-11-08 for Astro 7 and `@astrojs/cloudflare` 14.

## Hosting migration

The current Astro Cloudflare adapter supports Workers, not Pages. The repository's
Cloudflare configuration and manual deployment workflow now target a Worker named
`training-planner` in `wrangler.toml`. Existing Pages projects and their domains do
not migrate automatically. Configure the Worker, transfer the custom domain when
ready, and update Supabase's permitted site/redirect URLs to the new origin.

No deployment or account/domain changes are performed by dependency installation.

## Runtime and installation

```sh
nvm use
npm ci
```

Node 22.23.4 or newer is required. Local Node development and tests continue using
`astro.config.mjs`. Cloudflare commands use `astro.config.cloudflare.mjs`.

## Environment

For local Worker development, set secrets in the ignored `.dev.vars` file. For
Node development, use `.env`; for Playwright builds, use `.env.test`.

Required server secrets:

- `SUPABASE_URL`
- `SUPABASE_KEY` (anonymous/publishable key)
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `OPENROUTER_API_KEY`
- `INTERNAL_ADMIN_TOKEN`

Set `PUBLIC_SITE_URL` at build time to the actual app origin. The OpenRouter model,
timeout, and retries are configured through `OPENROUTER_DEFAULT_MODEL`,
`OPENROUTER_TIMEOUT_MS`, and `OPENROUTER_MAX_RETRIES`, with defaults in the config.

Production Worker secrets must be configured on the Worker or uploaded by the
deployment workflow. Values from a local shell or GitHub `env` alone are not
automatically persisted as Worker secrets.

## Build and preview

```sh
npm run build:cloudflare
npm run preview:cloudflare
```

Astro generates the deployment configuration and assets in `dist`, together with
`.wrangler/deploy/config.json`, which tells Wrangler where to find the built
configuration. Keep both when transferring a build between CI jobs. Generated
`.wrangler` state is ignored by Git.

Image processing remains set to `compile`; the upgrade does not enable a paid
Cloudflare Images binding. Astro session bindings are managed by the adapter;
application login continues using Supabase cookies.

## Manual deployment

After building and configuring Worker secrets:

```sh
npm run deploy:cloudflare
```

This command publishes to Cloudflare. Review the generated configuration and the
Worker name before invoking it. To validate packaging without publishing, run
`npx wrangler deploy --dry-run` after the Cloudflare build.

## GitHub Actions

The `Deploy to Cloudflare Workers` workflow remains manually triggered and runs
lint/unit checks before building. Configure the `production` GitHub environment:

- `CLOUDFLARE_API_TOKEN` with Worker deployment permissions
- `CLOUDFLARE_ACCOUNT_ID`
- Required app secrets listed above
- `PUBLIC_SITE_URL` and any OpenRouter overrides

The deploy job uses the locked Wrangler installation, downloads the build and
Wrangler redirect file, and uploads app secrets through `wrangler-action`'s
`secrets` input. `CLOUDFLARE_PROJECT_NAME` is no longer used; the Worker name comes
from `wrangler.toml`.

## References

- [Astro Cloudflare adapter migration](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
- [Pages to Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Wrangler action](https://github.com/cloudflare/wrangler-action)
