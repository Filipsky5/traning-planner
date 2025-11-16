# Cloudflare Deployment - Setup Summary

## ✅ Co zostało zrobione

### 1. Instalacja Zależności

```bash
npm install --save-dev @astrojs/cloudflare wrangler
```

**Zainstalowane pakiety:**
- `@astrojs/cloudflare@^12.6.10` - Adapter Astro dla Cloudflare Pages
- `wrangler@^4.47.0` - CLI Cloudflare dla lokalnego developmentu

### 2. Pliki Konfiguracyjne

#### Utworzone:

**`astro.config.cloudflare.mjs`** - Konfiguracja Astro dla Cloudflare
```javascript
- adapter: cloudflare (mode: "directory")
- imageService: "compile" (optymalizacja obrazów w build time)
- site: process.env.PUBLIC_SITE_URL || fallback URL
- Wszystkie integracje jak w wersji Node
```

**`wrangler.toml`** - Konfiguracja Wrangler dla lokalnego dev
```toml
- name: "training-planner"
- compatibility_date: "2025-11-16"
- pages_build_output_dir: "./dist"
```

**`.github/workflows/deploy.yml`** - Workflow CI/CD
```yaml
Jobs:
  1. lint - ESLint checking
  2. unit-tests - Vitest z coverage
  3. build - Build dla Cloudflare
  4. deploy - Deployment na Cloudflare Pages (tylko main branch)
  5. status - Status reporting

Triggers:
  - push do main (automatyczny deployment)
  - workflow_dispatch (ręczny deployment z wyborem environment)

Concurrency:
  - Anuluje poprzednie deploymenty dla tego samego brancha
```

#### Zmodyfikowane:

**`package.json`** - Dodane skrypty
```json
"build:cloudflare": "astro build --config astro.config.cloudflare.mjs"
"preview:cloudflare": "wrangler pages dev ./dist"
```

**`.gitignore`** - Dodany `.dev.vars`
```
.dev.vars  # Zmienne środowiskowe dla Wrangler
```

### 3. Dokumentacja

**`.ai/cloudflare-deployment-guide.md`** - Kompletny przewodnik zawierający:
- Wymagania i setup konta Cloudflare
- Konfiguracja GitHub Secrets
- Zmienne środowiskowe
- Proces wdrożenia (automatyczny i ręczny)
- Monitoring i logi
- Troubleshooting
- Limity free tier
- Best practices

## 🔧 Wymagane Akcje przed Deployment

### 1. Utwórz Projekt Cloudflare Pages

1. Zaloguj się do [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Przejdź do **Workers & Pages** → **Create application** → **Pages**
3. Wybierz **Create a project**
4. **NIE łącz z GitHub** (deployment przez GitHub Actions)
5. Nadaj nazwę projektu (np. `training-planner`)

### 2. Wygeneruj Cloudflare API Token

1. **My Profile** → **API Tokens** → **Create Token**
2. Użyj template **Edit Cloudflare Workers** lub:
   - Permission: Account → Cloudflare Pages → Edit
3. Skopiuj token (będzie widoczny tylko raz!)

### 3. Znajdź Account ID

- Cloudflare Dashboard → prawy panel pod nazwą konta
- Lub z URL: `dash.cloudflare.com/<ACCOUNT_ID>/...`

### 4. Skonfiguruj GitHub Secrets

W repo GitHub → **Settings** → **Secrets and variables** → **Actions**

**Wymagane dla Deployment:**
```
CLOUDFLARE_API_TOKEN         # Z kroku 2
CLOUDFLARE_ACCOUNT_ID        # Z kroku 3
CLOUDFLARE_PROJECT_NAME      # Nazwa z kroku 1
```

**Wymagane dla Aplikacji:**
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

### 5. Skonfiguruj Environment Variables w Cloudflare

**Dlaczego też w Cloudflare?**
- GitHub Secrets → używane podczas **build time** (GitHub Actions)
- Cloudflare Variables → używane podczas **runtime** (Cloudflare Workers)

**W Cloudflare Dashboard:**
1. Twój projekt → **Settings** → **Environment variables**
2. Dodaj te same zmienne co w GitHub Secrets dla **Production** environment:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_DEFAULT_MODEL`
   - `OPENROUTER_TIMEOUT_MS`
   - `OPENROUTER_MAX_RETRIES`
   - `PUBLIC_SITE_URL`
   - `INTERNAL_ADMIN_TOKEN`

## 🚀 Jak Wdrożyć

### Automatyczny Deployment (Rekomendowany)

```bash
git add .
git commit -m "Setup Cloudflare deployment"
git push origin main
```

GitHub Actions automatycznie:
1. ✅ Sprawdzi kod (lint)
2. ✅ Uruchomi testy (unit)
3. ✅ Zbuduje aplikację
4. ✅ Wdroży na Cloudflare Pages

### Ręczny Deployment

1. GitHub → **Actions** → **Deploy to Cloudflare Pages**
2. **Run workflow** → Wybierz environment → **Run workflow**

### Lokalny Preview

```bash
# Build aplikacji
npm run build:cloudflare

# Uruchom lokalny Cloudflare dev server
npm run preview:cloudflare
```

**Uwaga:** Potrzebujesz pliku `.dev.vars` z zmiennymi (przykład w `cloudflare-deployment-guide.md`)

## ✅ Weryfikacja Setup

### Build Test (Wykonany ✅)

```bash
npm run build:cloudflare
```

**Rezultat:**
```
✓ Completed in 59ms
✓ Built in 5.68s
✓ Complete!
```

**Ostrzeżenia (nieszkodliwe):**
- `[WARN] node:crypto externalized` - normalne dla SSR

### Deployment Test (Do wykonania)

Po skonfigurowaniu secrets:
1. Push do main **LUB** manual workflow
2. Sprawdź GitHub Actions logs
3. Weryfikuj deployment URL w Cloudflare Dashboard

## 📊 Różnice: Node vs Cloudflare

| Aspekt | Node Adapter | Cloudflare Adapter |
|--------|--------------|-------------------|
| **Plik config** | `astro.config.mjs` | `astro.config.cloudflare.mjs` |
| **Build script** | `npm run build` | `npm run build:cloudflare` |
| **Preview** | `npm run preview` | `npm run preview:cloudflare` |
| **Runtime** | Node.js server | Cloudflare Workers (V8) |
| **Deployment** | VPS/Docker | Cloudflare Pages |
| **Używany do** | Local dev, E2E tests | Production deployment |

**Oba adaptery pozostają w projekcie** - możesz używać Node lokalnie i Cloudflare w produkcji.

## 🎯 Workflow Deployment

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

## 📝 Następne Kroki

1. ✅ **Skonfiguruj Cloudflare** (projekt + API token)
2. ✅ **Dodaj GitHub Secrets** (wszystkie wymagane)
3. ✅ **Dodaj Cloudflare Environment Variables** (runtime)
4. 🔄 **Test deployment** (push do main lub manual trigger)
5. 🔄 **Sprawdź logi** (GitHub Actions + Cloudflare Dashboard)
6. 🔄 **Zweryfikuj aplikację** (otwórz deployment URL)
7. ⏭️  **Opcjonalnie: Custom domain** (jeśli potrzebne)

## 🔗 Przydatne Linki

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
1. Sprawdź logi w GitHub Actions
2. Weryfikuj GitHub Secrets (CLOUDFLARE_API_TOKEN, ACCOUNT_ID, PROJECT_NAME)
3. Sprawdź uprawnienia API tokena

### Runtime errors in production
1. Sprawdź logi w Cloudflare Dashboard → projekt → Logs
2. Weryfikuj Environment Variables w Cloudflare
3. Porównaj z wartościami w .env.example

---

**Data utworzenia:** 2025-11-16
**Wersja adapter:** @astrojs/cloudflare@12.6.10
**Wersja wrangler:** 4.47.0
