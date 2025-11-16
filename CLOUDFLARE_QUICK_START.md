# Cloudflare Pages - Quick Start

## ⚡ TL;DR

1. **Setup Cloudflare** (10 min)
   - Create Pages project at https://dash.cloudflare.com/
   - Generate API token (Edit Cloudflare Workers permission)
   - Copy Account ID

2. **Add GitHub Secrets** (5 min)
   ```
   CLOUDFLARE_API_TOKEN
   CLOUDFLARE_ACCOUNT_ID
   CLOUDFLARE_PROJECT_NAME
   + all existing app secrets (SUPABASE_*, OPENROUTER_*, etc.)
   ```

3. **Add Cloudflare Environment Variables** (5 min)
   - Go to project → Settings → Environment variables
   - Add the same variables as GitHub Secrets

4. **Deploy** (1 min)
   ```bash
   git push origin main
   ```

## 📋 Checklist

- [ ] Cloudflare account created
- [ ] Pages project created (don't connect to GitHub)
- [ ] API token generated
- [ ] Account ID copied
- [ ] GitHub Secrets configured (CLOUDFLARE_*)
- [ ] GitHub Secrets configured (app variables)
- [ ] Cloudflare Environment Variables configured
- [ ] First deployment triggered
- [ ] Deployment successful
- [ ] Application works at deployment URL

## 🔗 Quick Links

- **Dashboard:** https://dash.cloudflare.com/
- **Full Guide:** `.ai/cloudflare-deployment-guide.md`
- **Setup Summary:** `.ai/cloudflare-deployment-summary.md`

## 🚀 Deploy Commands

```bash
# Automatic (recommended)
git push origin main

# Manual
# GitHub → Actions → Deploy to Cloudflare Pages → Run workflow

# Local preview
npm run build:cloudflare
npm run preview:cloudflare  # Requires .dev.vars file
```

## ⚙️ Files Changed

- ✅ `astro.config.cloudflare.mjs` - Cloudflare adapter config
- ✅ `wrangler.toml` - Wrangler configuration
- ✅ `package.json` - Added build:cloudflare, preview:cloudflare
- ✅ `.github/workflows/deploy.yml` - CI/CD workflow
- ✅ `.gitignore` - Added .dev.vars

## 📚 Documentation

- **Quick Start:** This file
- **Full Guide:** `.ai/cloudflare-deployment-guide.md` (detailed setup + troubleshooting)
- **Setup Summary:** `.ai/cloudflare-deployment-summary.md` (what was done + next steps)

---

**Need help?** See `.ai/cloudflare-deployment-guide.md` → Troubleshooting section
