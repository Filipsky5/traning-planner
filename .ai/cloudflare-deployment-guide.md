> Historical Cloudflare Pages documentation, preserved from before the dependency upgrade.
> Astro 7 uses Workers; follow the [current Workers deployment guide](cloudflare-workers-deployment-guide.md) for the upgraded app.

# Cloudflare Pages Deployment Guide

## Overview

This project is configured for automatic deployment to Cloudflare Pages through GitHub Actions. It uses `@astrojs/cloudflare` for full SSR support.

## Requirements

### 1. Cloudflare Account

- Create an account at [Cloudflare](https://dash.cloudflare.com/sign-up)
- The free Pages plan is sufficient for the MVP

### 2. Cloudflare Pages Project

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **Create application** → **Pages**
3. **Important:** Create a project but **DO NOT** connect GitHub (CI/CD uses GitHub Actions)
4. Note the project name (needed in secrets)

### 3. Cloudflare API Token

1. Go to **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use the **Edit Cloudflare Workers** template
4. Or create a custom token with permissions:
   - Account → Cloudflare Pages → Edit
   - Zone → Workers Routes → Edit (optional)
5. Copy the generated token (visible only once!)

### 4. Account ID

1. In Cloudflare Dashboard, go to **Workers & Pages**
2. Account ID is in the right column below the account name
3. Or in the URL: `dash.cloudflare.com/<ACCOUNT_ID>/...`

## GitHub Secrets Configuration

Set these secrets in the GitHub repository:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Required Deployment Secrets:

```
CLOUDFLARE_API_TOKEN         # Token generated in step 3
CLOUDFLARE_ACCOUNT_ID        # Account ID from step 4
CLOUDFLARE_PROJECT_NAME      # Project name created in step 2
```

### Required Application Secrets:

```
SUPABASE_URL                 # URL projektu Supabase
SUPABASE_KEY                 # Anon/public key Supabase
SUPABASE_SERVICE_ROLE_KEY    # Service role key (backend only)
OPENROUTER_API_KEY           # Klucz API OpenRouter.ai
OPENROUTER_DEFAULT_MODEL     # np. "openai/gpt-4o-mini"
OPENROUTER_TIMEOUT_MS        # np. "30000"
OPENROUTER_MAX_RETRIES       # np. "3"
PUBLIC_SITE_URL              # Production application URL
INTERNAL_ADMIN_TOKEN         # Strong token for admin endpoints
```

### Optional Secrets:

```
E2E_USERNAME                 # Username for E2E tests (if run)
E2E_PASSWORD                 # Password for E2E tests
```

## Environment Variables in Cloudflare Pages

**Important:** Some variables must also be set in Cloudflare Pages Dashboard:

1. Go to **Workers & Pages** → Your project → **Settings** → **Environment variables**
2. Add variables for **Production**:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_DEFAULT_MODEL`
   - `OPENROUTER_TIMEOUT_MS`
   - `OPENROUTER_MAX_RETRIES`
   - `PUBLIC_SITE_URL`
   - `INTERNAL_ADMIN_TOKEN`

3. For **Preview** (optional):
   - You can set separate values for preview deployments

**Why two locations?**

- GitHub Secrets: Used during the GitHub Actions build process
- Cloudflare Variables: Used at runtime by Workers/Pages

## Deployment Process

### Automatic Deployment (Recommended)

**Trigger:** Push to `main` branch

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

GitHub Actions automatically:

1. ✅ Runs linting
2. ✅ Runs unit tests
3. ✅ Builds for Cloudflare
4. ✅ Deploys to Cloudflare Pages

### Manual Deployment

**Trigger:** Manual workflow dispatch

1. Open the GitHub **Actions** tab
2. Select **Deploy to Cloudflare Pages**
3. Click **Run workflow**
4. Select environment (`production` or `preview`)
5. Click **Run workflow**

### Local Cloudflare Preview

You can test the build locally before deployment:

```bash
# 1. Build with the Cloudflare adapter
npm run build:cloudflare

# 2. Start the local Cloudflare Pages dev server
npm run preview:cloudflare
```

**Note:** You need a `.dev.vars` file with environment variables:

```env
# .dev.vars (add to .gitignore!)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_DEFAULT_MODEL=openai/gpt-4o-mini
OPENROUTER_TIMEOUT_MS=30000
OPENROUTER_MAX_RETRIES=3
PUBLIC_SITE_URL=http://localhost:8788
INTERNAL_ADMIN_TOKEN=your-local-token
```

## CI/CD Workflow

### Jobs in deploy.yml:

1. **lint** - Checks code quality (ESLint)
2. **unit-tests** - Runs unit tests (Vitest)
3. **build** - Builds for Cloudflare
4. **deploy** - Deploys to Cloudflare Pages (main branch only)
5. **status** - Reports deployment status

### Concurrency Control

The workflow uses `concurrency` to:

- Cancel previous deployments for the same branch
- Prevent simultaneous deployment conflicts

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true
```

### Artifacts

Build artifacts are retained for 7 days:

- `cloudflare-build-<sha>` - Built application
- `unit-coverage-<sha>` - Test coverage report

## Differences Between Node and Cloudflare Adapters

### Node Adapter (astro.config.mjs)

- Used for local development (`npm run dev`)
- Used for E2E tests (`npm run build:test`)
- Standalone Node.js server

### Cloudflare Adapter (astro.config.cloudflare.mjs)

- Used for production deployment
- Optimized for Cloudflare Workers
- Edge runtime, global CDN

## Deployment URL

After successful deployment, the application is available at:

```
https://<project-name>.pages.dev
```

You can also configure a custom domain in Cloudflare Pages dashboard:
**Settings** → **Custom domains**

## Monitoring and Logs

### Real-time Logs

1. Cloudflare Dashboard → **Workers & Pages** → Your project
2. Click **View logs** or **Deployment**
3. View recent request logs

### Analytics

1. **Analytics** tab in the Pages project
2. Check:
   - Requests per second
   - Bandwidth usage
   - Error rate
   - Geographic distribution

### GitHub Actions Logs

1. Repository → **Actions** tab
2. Select a workflow run
3. Expand jobs to see detailed logs

## Rollback

If deployment does not work correctly:

### Option 1: Cloudflare Dashboard

1. Open project → **Deployments**
2. Find a previous working deployment
3. Click **Rollback to this deployment**

### Option 2: Git Revert

```bash
git revert HEAD
git push origin main
```

This automatically triggers deployment with the older code.

## Troubleshooting

### Build Fails

**Problem:** `npm run build:cloudflare` fails

**Solution:**

1. Check GitHub Actions logs
2. Run locally: `npm run build:cloudflare`
3. Check all dependencies are installed
4. Check compatibility date in `wrangler.toml`

### Deployment Fails

**Problem:** Deployment fails after building

**Solution:**

1. Check `CLOUDFLARE_API_TOKEN` is valid
2. Check token permissions (Edit Cloudflare Workers)
3. Check `CLOUDFLARE_PROJECT_NAME` matches the dashboard name
4. Check `CLOUDFLARE_ACCOUNT_ID` is correct

### Runtime Errors

**Problem:** Application deploys but has runtime errors

**Solution:**

1. Check Cloudflare Dashboard logs
2. Check environment variables are set in Cloudflare Pages
3. Check variable values (URLs, API keys)
4. Test locally with `npm run preview:cloudflare`

### Environment Variables Not Working

**Problem:** Environment variables are unavailable

**Solution:**

1. Variables must be in **two** places:
   - GitHub Secrets (build time)
   - Cloudflare Environment Variables (runtime)
2. Redeploy after adding variables
3. Use the `PUBLIC_*` prefix according to Astro docs

## Cloudflare Pages Limits (Free Plan)

- **Builds:** 500/month
- **Requests:** Unlimited
- **Bandwidth:** Unlimited
- **Build time:** 20 minutes/build
- **File size:** 25 MB/file
- **Total size:** 20,000 files

**The MVP fits comfortably within the free tier!**

## Best Practices

1. **Always test locally** before pushing to main

   ```bash
   npm run lint
   npm run test:unit
   npm run build:cloudflare
   npm run preview:cloudflare
   ```

2. **Use preview environments** for feature branches
   - Configure automatic preview deployments in Cloudflare

3. **Monitor performance** in Cloudflare Analytics
   - Check cache hit ratio
   - Monitor error rate

4. **Secure secrets** - never commit:
   - `.env` files
   - `.dev.vars` files
   - API keys

5. **Document changes** to the deployment process
   - Update this guide when workflows change

## Migration from DigitalOcean to Cloudflare

If previously deployed to DigitalOcean:

### What to Change:

1. ✅ Adapter: `@astrojs/node` → `@astrojs/cloudflare`
2. ✅ Build command: `npm run build` → `npm run build:cloudflare`
3. ✅ Deployment target: VPS/Docker → Cloudflare Pages

### What to Keep:

- ✅ All environment variables (move to Cloudflare)
- ✅ Application code (unchanged)
- ✅ Supabase database (unchanged)
- ✅ OpenRouter AI (unchanged)

### Cloudflare Advantages vs DigitalOcean:

- ✅ **Simpler deployment** - no Docker/nginx configuration
- ✅ **Global CDN** - faster loading worldwide
- ✅ **Auto-scaling** - handles traffic spikes
- ✅ **Zero-downtime deployments** - automatic
- ✅ **Free SSL** - automatic HTTPS
- ✅ **Preview deployments** - test before production

## Next Steps

After successful deployment:

1. ✅ Configure a custom domain (optional)
2. ✅ Set DNS in Cloudflare (if using a custom domain)
3. ✅ Enable Cloudflare Web Analytics
4. ✅ Configure error alerts
5. ✅ Add uptime monitoring (e.g., UptimeRobot)

## Support

- **Cloudflare Docs:** https://developers.cloudflare.com/pages/
- **Astro Cloudflare Adapter:** https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/

---

**Created:** 2025-11-16
**Last updated:** 2025-11-16
