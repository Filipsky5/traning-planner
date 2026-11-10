> Historical Cloudflare Pages documentation, preserved from before the dependency upgrade.
> Astro 7 uses Workers; follow the [current Workers deployment guide](cloudflare-workers-deployment-guide.md) for the upgraded app.

# Cloudflare Deployment - Setup Summary

## ✅ What Has Been Done

### 1. Dependency Installation

```bash
npm install --save-dev @astrojs/cloudflare wrangler
```

**Installed packages:**

- `@astrojs/cloudflare@^12.6.10` - Astro adapter for Cloudflare Pages
- `wrangler@^4.47.0` - Cloudflare CLI for local development

### 2. Configuration Files

#### Created:

**`astro.config.cloudflare.mjs`** - Astro configuration for Cloudflare

```javascript
- adapter: cloudflare (mode: "directory")
- imageService: "compile" (build-time image optimization)
- site: process.env.PUBLIC_SITE_URL || fallback URL
- All integrations as in the Node version
```

**`wrangler.toml`** - Wrangler configuration for local development

```toml
- name: "training-planner"
- compatibility_date: "2025-11-16"
- pages_build_output_dir: "./dist"
```

**`.github/workflows/deploy.yml`** - CI/CD workflow

```yaml
Jobs: 1. lint - ESLint checking
  2. unit-tests - Vitest with coverage
  3. build - Build for Cloudflare
  4. deploy - Deployment to Cloudflare Pages (main branch only)
  5. status - Status reporting

Triggers:
  - push to main (automatic deployment)
  - workflow_dispatch (manual deployment with environment selection)

Concurrency:
  - Cancels previous deployments for the same branch
```

#### Modified:

**`package.json`** - Added scripts

```json
"build:cloudflare": "astro build --config astro.config.cloudflare.mjs"
"preview:cloudflare": "wrangler pages dev ./dist"
```

**`.gitignore`** - Added `.dev.vars`

```
.dev.vars  # Environment variables for Wrangler
```

### 3. Documentation

**`.ai/cloudflare-deployment-guide.md`** - Complete guide covering:

- Requirements and Cloudflare account setup
- GitHub Secrets configuration
- Environment variables
- Deployment process (automatic and manual)
- Monitoring and logs
- Troubleshooting
- Free tier limits
- Best practices

## 🔧 Required Actions Before Deployment

### 1. Create a Cloudflare Pages Project

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **Workers & Pages** → **Create application** → **Pages**
3. Select **Create a project**
4. **DO NOT connect GitHub** (deployment through GitHub Actions)
5. Name the project (e.g., `training-planner`)

### 2. Generate a Cloudflare API Token

1. **My Profile** → **API Tokens** → **Create Token**
2. Use the **Edit Cloudflare Workers** template or:
   - Permission: Account → Cloudflare Pages → Edit
3. Copy the token (visible only once!)

### 3. Find the Account ID

- Cloudflare Dashboard → right panel below the account name
- Or from the URL: `dash.cloudflare.com/<ACCOUNT_ID>/...`

### 4. Configure GitHub Secrets

In the GitHub repository → **Settings** → **Secrets and variables** → **Actions**

**Required for Deployment:**

```
CLOUDFLARE_API_TOKEN         # From step 2
CLOUDFLARE_ACCOUNT_ID        # From step 3
CLOUDFLARE_PROJECT_NAME      # Name from step 1
```

**Required for the Application:**

```
SUPABASE_URL
SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY
OPENROUTER_DEFAULT_MODEL
OPENROUTER_TIMEOUT_MS
OPENROUTER_MAX_RETRIES
PUBLIC_SITE_URL              # np. https://training-planner.pages.dev
INTERNAL_ADMIN_TOKEN
```

### 5. Configure Environment Variables in Cloudflare

**Why also in Cloudflare?**

- GitHub Secrets → used at **build time** (GitHub Actions)
- Cloudflare Variables → used at **runtime** (Cloudflare Workers)

**In Cloudflare Dashboard:**

1. Your project → **Settings** → **Environment variables**
2. Add the same variables as in GitHub Secrets for the **Production** environment:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_DEFAULT_MODEL`
   - `OPENROUTER_TIMEOUT_MS`
   - `OPENROUTER_MAX_RETRIES`
   - `PUBLIC_SITE_URL`
   - `INTERNAL_ADMIN_TOKEN`

## 🚀 How to Deploy

### Automatic Deployment (Recommended)

```bash
git add .
git commit -m "Setup Cloudflare deployment"
git push origin main
```

GitHub Actions automatically:

1. ✅ Checks code (lint)
2. ✅ Runs tests (unit)
3. ✅ Builds the application
4. ✅ Deploys to Cloudflare Pages

### Manual Deployment

1. GitHub → **Actions** → **Deploy to Cloudflare Pages**
2. **Run workflow** → Select environment → **Run workflow**

### Local Preview

```bash
# Build application
npm run build:cloudflare

# Start the local Cloudflare dev server
npm run preview:cloudflare
```

**Note:** You need a `.dev.vars` file with variables (example in `cloudflare-deployment-guide.md`)

## ✅ Setup Verification

### Build Test (Completed ✅)

```bash
npm run build:cloudflare
```

**Result:**

```
✓ Completed in 59ms
✓ Built in 5.68s
✓ Complete!
```

**Warnings (harmless):**

- `[WARN] node:crypto externalized` - normal for SSR

### Deployment Test (Pending)

After configuring secrets:

1. Push to main **OR** run the workflow manually
2. Check GitHub Actions logs
3. Verify the deployment URL in Cloudflare Dashboard

## 📊 Differences: Node vs Cloudflare

| Aspect           | Node Adapter         | Cloudflare Adapter            |
| ---------------- | -------------------- | ----------------------------- |
| **Config file**  | `astro.config.mjs`   | `astro.config.cloudflare.mjs` |
| **Build script** | `npm run build`      | `npm run build:cloudflare`    |
| **Preview**      | `npm run preview`    | `npm run preview:cloudflare`  |
| **Runtime**      | Node.js server       | Cloudflare Workers (V8)       |
| **Deployment**   | VPS/Docker           | Cloudflare Pages              |
| **Used for**     | Local dev, E2E tests | Production deployment         |

**Both adapters remain in the project** - use Node locally and Cloudflare in production.

## 🎯 Deployment Workflow

```
┌─────────────────┐
│  Push to main   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Lint (ESLint) │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌──────┐  ┌──────┐
│ Unit │  │Build │
│Tests │  │  CF  │
└───┬──┘  └───┬──┘
    │         │
    └────┬────┘
         ▼
    ┌─────────┐
    │ Deploy  │
    │   to    │
    │  Pages  │
    └────┬────┘
         │
         ▼
   ┌──────────┐
   │ Success! │
   └──────────┘
```

## 📝 Next Steps

1. ✅ **Configure Cloudflare** (project + API token)
2. ✅ **Add GitHub Secrets** (all required)
3. ✅ **Add Cloudflare Environment Variables** (runtime)
4. 🔄 **Test deployment** (push to main or manual trigger)
5. 🔄 **Check logs** (GitHub Actions + Cloudflare Dashboard)
6. 🔄 **Verify the application** (open deployment URL)
7. ⏭️ **Optional: Custom domain** (if needed)

## 🔗 Useful Links

- **Cloudflare Dashboard:** https://dash.cloudflare.com/
- **Astro Cloudflare Docs:** https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- **Wrangler CLI Docs:** https://developers.cloudflare.com/workers/wrangler/
- **GitHub Actions Workflow:** `.github/workflows/deploy.yml`
- **Deployment Guide:** `.ai/cloudflare-deployment-guide.md`

## ⚠️ Troubleshooting Quick Reference

### Build fails locally

```bash
npm ci  # Reinstall dependencies
npm run build:cloudflare
```

### Deployment fails in GitHub Actions

1. Check GitHub Actions logs
2. Verify GitHub Secrets (CLOUDFLARE_API_TOKEN, ACCOUNT_ID, PROJECT_NAME)
3. Check API token permissions

### Runtime errors in production

1. Check logs in Cloudflare Dashboard → project → Logs
2. Verify Environment Variables in Cloudflare
3. Compare with .env.example values

---

**Created:** 2025-11-16
**Adapter version:** @astrojs/cloudflare@12.6.10
**Wrangler version:** 4.47.0
