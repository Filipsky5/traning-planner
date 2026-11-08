# Cloudflare deployment summary

Updated 2026-11-08. See [the deployment guide](cloudflare-deployment-guide.md) for
the current procedure.

- Astro 7 / Cloudflare adapter 14 target **Workers**. Pages is no longer supported.
- Local Node builds use `astro.config.mjs`; Worker builds use
  `astro.config.cloudflare.mjs` and `wrangler.toml`.
- Node 22.23.4 or newer is required.
- Build with `npm run build:cloudflare`, preview with `npm run preview:cloudflare`,
  and publish a reviewed build with `npm run deploy:cloudflare`.
- The manual GitHub deployment workflow uploads `dist` and
  `.wrangler/deploy/config.json` between jobs and uses Worker secrets explicitly.
- Existing Pages projects require account-side domain and Supabase redirect
  configuration changes before switching traffic. Repository updates do not make
  those changes or deploy the app.
