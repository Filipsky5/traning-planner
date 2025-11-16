# Cloudflare Pages Deployment Guide

## Przegląd

Ten projekt jest skonfigurowany do automatycznego wdrażania na Cloudflare Pages poprzez GitHub Actions. Wykorzystuje adapter `@astrojs/cloudflare` dla pełnego wsparcia SSR.

## Wymagania

### 1. Konto Cloudflare
- Utwórz konto na [Cloudflare](https://dash.cloudflare.com/sign-up)
- Darmowy plan Pages wystarczy dla projektu MVP

### 2. Projekt Cloudflare Pages
1. Zaloguj się do [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Przejdź do **Workers & Pages** → **Create application** → **Pages**
3. **Ważne:** Utwórz projekt ale **NIE** łącz go z GitHub (CI/CD będzie przez GitHub Actions)
4. Zanotuj nazwę projektu (będzie potrzebna w secrets)

### 3. API Token Cloudflare
1. Przejdź do **My Profile** → **API Tokens**
2. Kliknij **Create Token**
3. Użyj template **Edit Cloudflare Workers**
4. Lub utwórz custom token z uprawnieniami:
   - Account → Cloudflare Pages → Edit
   - Zone → Workers Routes → Edit (opcjonalnie)
5. Skopiuj wygenerowany token (będzie widoczny tylko raz!)

### 4. Account ID
1. W Cloudflare Dashboard, przejdź do **Workers & Pages**
2. Account ID znajduje się w prawej kolumnie pod nazwą konta
3. Lub w URL: `dash.cloudflare.com/<ACCOUNT_ID>/...`

## Konfiguracja GitHub Secrets

W repozytorium GitHub ustaw następujące secrets:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

### Wymagane Secrets dla Deployment:

```
CLOUDFLARE_API_TOKEN         # Token wygenerowany w kroku 3
CLOUDFLARE_ACCOUNT_ID        # Account ID z kroku 4
CLOUDFLARE_PROJECT_NAME      # Nazwa projektu utworzonego w kroku 2
```

### Wymagane Secrets dla Aplikacji:

```
SUPABASE_URL                 # URL projektu Supabase
SUPABASE_KEY                 # Anon/public key Supabase
SUPABASE_SERVICE_ROLE_KEY    # Service role key (tylko backend)
OPENROUTER_API_KEY           # Klucz API OpenRouter.ai
OPENROUTER_DEFAULT_MODEL     # np. "openai/gpt-4o-mini"
OPENROUTER_TIMEOUT_MS        # np. "30000"
OPENROUTER_MAX_RETRIES       # np. "3"
PUBLIC_SITE_URL              # URL produkcyjny aplikacji
INTERNAL_ADMIN_TOKEN         # Silny token do endpointów admin
```

### Opcjonalne Secrets:

```
E2E_USERNAME                 # Username do testów E2E (jeśli uruchamiane)
E2E_PASSWORD                 # Hasło do testów E2E
```

## Zmienne Środowiskowe w Cloudflare Pages

**Ważne:** Niektóre zmienne muszą być również ustawione w Cloudflare Pages Dashboard:

1. Przejdź do **Workers & Pages** → Twój projekt → **Settings** → **Environment variables**
2. Dodaj zmienne dla **Production** environment:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_DEFAULT_MODEL`
   - `OPENROUTER_TIMEOUT_MS`
   - `OPENROUTER_MAX_RETRIES`
   - `PUBLIC_SITE_URL`
   - `INTERNAL_ADMIN_TOKEN`

3. Dla **Preview** environment (opcjonalnie):
   - Możesz ustawić osobne wartości dla preview deployments

**Dlaczego dwa miejsca?**
- GitHub Secrets: Używane podczas build process w GitHub Actions
- Cloudflare Variables: Używane w runtime przez Workers/Pages

## Proces Wdrożenia

### Automatyczne Wdrożenie (Rekomendowane)

**Trigger:** Push do `main` branch

```bash
git add .
git commit -m "Deploy to production"
git push origin main
```

GitHub Actions automatycznie:
1. ✅ Uruchomi linting
2. ✅ Uruchomi testy jednostkowe
3. ✅ Zbuduje aplikację dla Cloudflare
4. ✅ Wdroży na Cloudflare Pages

### Ręczne Wdrożenie

**Trigger:** Manual workflow dispatch

1. Przejdź do **Actions** tab w GitHub
2. Wybierz workflow **Deploy to Cloudflare Pages**
3. Kliknij **Run workflow**
4. Wybierz environment (`production` lub `preview`)
5. Kliknij **Run workflow**

### Lokalne Preview Cloudflare

Możesz przetestować build lokalnie przed wdrożeniem:

```bash
# 1. Zbuduj aplikację z Cloudflare adapter
npm run build:cloudflare

# 2. Uruchom lokalny Cloudflare Pages dev server
npm run preview:cloudflare
```

**Uwaga:** Potrzebujesz pliku `.dev.vars` z zmiennymi środowiskowymi:

```env
# .dev.vars (dodaj do .gitignore!)
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

## Workflow CI/CD

### Jobs w deploy.yml:

1. **lint** - Sprawdza jakość kodu (ESLint)
2. **unit-tests** - Uruchamia testy jednostkowe (Vitest)
3. **build** - Buduje aplikację dla Cloudflare
4. **deploy** - Wdraża na Cloudflare Pages (tylko main branch)
5. **status** - Raportuje status wdrożenia

### Concurrency Control

Workflow używa `concurrency` aby:
- Anulować poprzednie wdrożenia dla tego samego brancha
- Zapobiec konfliktom przy równoczesnych deployments

```yaml
concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true
```

### Artifacts

Build artifacts są przechowywane 7 dni:
- `cloudflare-build-<sha>` - Zbudowana aplikacja
- `unit-coverage-<sha>` - Raport pokrycia testami

## Różnice między Node adapter a Cloudflare adapter

### Node Adapter (astro.config.mjs)
- Używany dla lokalnego developmentu (`npm run dev`)
- Używany dla testów E2E (`npm run build:test`)
- Standalone Node.js server

### Cloudflare Adapter (astro.config.cloudflare.mjs)
- Używany dla produkcyjnego wdrożenia
- Zoptymalizowany dla Cloudflare Workers
- Edge runtime, globalny CDN

## Deployment URL

Po udanym wdrożeniu, aplikacja będzie dostępna pod:

```
https://<project-name>.pages.dev
```

Możesz również skonfigurować custom domain w Cloudflare Pages dashboard:
**Settings** → **Custom domains**

## Monitoring i Logs

### Real-time Logs
1. Cloudflare Dashboard → **Workers & Pages** → Twój projekt
2. Kliknij **View logs** lub **Deployment**
3. Zobacz logi z ostatnich requestów

### Analytics
1. **Analytics** tab w projekcie Pages
2. Sprawdź:
   - Requests per second
   - Bandwidth usage
   - Error rate
   - Geographic distribution

### GitHub Actions Logs
1. Repository → **Actions** tab
2. Wybierz konkretny workflow run
3. Rozwiń jobs aby zobaczyć szczegółowe logi

## Rollback

Jeśli wdrożenie nie działa poprawnie:

### Opcja 1: Cloudflare Dashboard
1. Przejdź do projektu → **Deployments**
2. Znajdź poprzednie działające wdrożenie
3. Kliknij **Rollback to this deployment**

### Opcja 2: Git Revert
```bash
git revert HEAD
git push origin main
```
Automatycznie wywoła nowe wdrożenie ze starszym kodem.

## Troubleshooting

### Build Fails
**Problem:** `npm run build:cloudflare` kończy się błędem

**Rozwiązanie:**
1. Sprawdź logi w GitHub Actions
2. Uruchom lokalnie: `npm run build:cloudflare`
3. Sprawdź czy wszystkie dependencies są zainstalowane
4. Sprawdź compatibility date w `wrangler.toml`

### Deployment Fails
**Problem:** Wdrożenie nie powiodło się po buildzie

**Rozwiązanie:**
1. Sprawdź czy `CLOUDFLARE_API_TOKEN` jest poprawny
2. Sprawdź uprawnienia tokena (Edit Cloudflare Workers)
3. Sprawdź czy `CLOUDFLARE_PROJECT_NAME` pasuje do nazwy w dashboard
4. Sprawdź czy `CLOUDFLARE_ACCOUNT_ID` jest poprawny

### Runtime Errors
**Problem:** Aplikacja wdraża się, ale występują błędy runtime

**Rozwiązanie:**
1. Sprawdź logi w Cloudflare Dashboard
2. Sprawdź czy zmienne środowiskowe są ustawione w Cloudflare Pages
3. Sprawdź czy wartości zmiennych są poprawne (URL, klucze API)
4. Przetestuj lokalnie z `npm run preview:cloudflare`

### Environment Variables Not Working
**Problem:** Zmienne środowiskowe nie są dostępne

**Rozwiązanie:**
1. Zmienne muszą być w **dwóch** miejscach:
   - GitHub Secrets (dla build time)
   - Cloudflare Environment Variables (dla runtime)
2. Po dodaniu nowych zmiennych, uruchom re-deployment
3. Dla `PUBLIC_*` zmiennych używaj prefixu zgodnie z Astro docs

## Limity Cloudflare Pages (Free Plan)

- **Builds:** 500/month
- **Requests:** Unlimited
- **Bandwidth:** Unlimited
- **Build time:** 20 minutes/build
- **File size:** 25 MB/file
- **Total size:** 20,000 files

**MVP będzie dobrze w ramach free tier!**

## Best Practices

1. **Zawsze testuj lokalnie** przed push do main
   ```bash
   npm run lint
   npm run test:unit
   npm run build:cloudflare
   npm run preview:cloudflare
   ```

2. **Używaj preview environments** dla feature branches
   - Możesz skonfigurować automatyczne preview deployments w Cloudflare

3. **Monitoruj performance** w Cloudflare Analytics
   - Sprawdzaj cache hit ratio
   - Monitoruj error rate

4. **Secure secrets** - nigdy nie commituj:
   - `.env` files
   - `.dev.vars` files
   - API keys

5. **Dokumentuj zmiany** w deployment process
   - Aktualizuj ten guide przy zmianach w workflow

## Przejście z DigitalOcean na Cloudflare

Jeśli wcześniej deployment był na DigitalOcean:

### Co zmienić:
1. ✅ Adapter: `@astrojs/node` → `@astrojs/cloudflare`
2. ✅ Build command: `npm run build` → `npm run build:cloudflare`
3. ✅ Deployment target: VPS/Docker → Cloudflare Pages

### Co zachować:
- ✅ Wszystkie zmienne środowiskowe (tylko przenieś do Cloudflare)
- ✅ Kod aplikacji (bez zmian)
- ✅ Baza danych Supabase (bez zmian)
- ✅ OpenRouter AI (bez zmian)

### Zalety Cloudflare vs DigitalOcean:
- ✅ **Prostszy deployment** - brak konfiguracji Docker/nginx
- ✅ **Globalny CDN** - szybsze ładowanie na całym świecie
- ✅ **Auto-scaling** - obsługa traffic spikes
- ✅ **Zero-downtime deployments** - automatyczne
- ✅ **Darmowy SSL** - automatyczny HTTPS
- ✅ **Preview deployments** - testuj przed produkcją

## Dalsze kroki

Po udanym wdrożeniu:

1. ✅ Skonfiguruj custom domain (opcjonalnie)
2. ✅ Ustaw DNS w Cloudflare (jeśli custom domain)
3. ✅ Włącz Web Analytics w Cloudflare
4. ✅ Skonfiguruj alerting dla błędów
5. ✅ Dodaj monitoring uptime (np. UptimeRobot)

## Wsparcie

- **Cloudflare Docs:** https://developers.cloudflare.com/pages/
- **Astro Cloudflare Adapter:** https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/

---

**Utworzono:** 2025-11-16
**Ostatnia aktualizacja:** 2025-11-16
