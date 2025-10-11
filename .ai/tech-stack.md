# Tech Stack - AI Running Training Planner

## Frontend

### Framework
- **Astro 5** (SSR mode)
  - Szybkie, wydajne strony z minimalnym JavaScript
  - Server-side rendering dla lepszego SEO i performance
  - Adapter: `@astrojs/node` w trybie standalone

### UI Framework
- **React 19**
  - Komponenty interaktywne (kalendarz, formularze)
  - Hydration tylko tam gdzie potrzebna (Astro Islands)
  - Dyrektywy: `client:load`, `client:visible` dla optymalizacji

### Styling
- **Tailwind CSS 4**
  - Utility-first CSS framework
  - Szybkie prototypowanie
  - Rekomendowany przez autorów kursu

### UI Components
- **shadcn/ui**
  - Dostępne, konfigurowalne komponenty React
  - Oparte na Radix UI
  - TypeScript support out of the box

### Ikony
- **Lucide React**
  - Spójna biblioteka ikon
  - Tree-shakeable

## Backend

### Database
- **Supabase** (hosted PostgreSQL)
  - Automatyczne REST API
  - Wbudowana autentykacja
  - Real-time subscriptions (opcjonalnie na przyszłość)
  - Row Level Security (RLS) dla bezpieczeństwa
  - Darmowy tier wystarczający na MVP

### Authentication
- **Supabase Auth**
  - Gotowe rozwiązanie
  - Email/password authentication
  - Session management
  - Zero konfiguracji

### API Layer
- **Astro API Routes**
  - Endpointy w `src/pages/api/`
  - Server-side tylko
  - TypeScript support

### AI Integration
- **OpenRouter.ai**
  - Dostęp do wielu modeli AI (OpenAI, Anthropic, Google)
  - Elastyczność w wyborze modelu
  - Ustawienie limitów finansowych na klucze API
  - Jeden interfejs dla różnych providerów

## DevOps & Deployment

### Containerization
- **Docker**
  - Dockerfile oparty na `node:20-alpine`
  - Single-stage build dla uproszczenia
  - docker-compose dla lokalnego developmentu (opcjonalnie)

### Hosting
- **DigitalOcean**
  - Droplet z Docker Marketplace image (zalecane)
  - LUB DigitalOcean App Platform (prostsze, $5/miesiąc)
  - Container Registry dla Docker images

### CI/CD
- **GitHub Actions**
  - Automatyczne buildy przy push do main
  - Uruchamianie testów
  - Automatyczny deploy na DigitalOcean
  - Ręczny trigger przez `workflow_dispatch`

### Testing
- **Playwright**
  - Testy E2E
  - Cross-browser testing
  - TypeScript support
  - Minimum 1 test weryfikujący flow użytkownika

## Development Tools

### Type Safety
- **TypeScript 5**
  - Statyczne typowanie
  - Lepsze wsparcie IDE
  - Mniej błędów w runtime

### Code Quality
- **ESLint 9** - linting JavaScript/TypeScript
- **Prettier** - formatowanie kodu
- **Husky** - Git hooks
- **lint-staged** - linting tylko zmienionych plików

## Struktura Projektu

```
src/
├── pages/
│   ├── api/              # API endpoints (Astro SSR)
│   │   ├── auth/         # Autentykacja
│   │   ├── trainings/    # CRUD treningów
│   │   └── ai/           # Generator AI
│   ├── dashboard/        # Główny widok kalendarza
│   ├── login/            # Strona logowania
│   └── register/         # Rejestracja
├── components/
│   ├── ui/               # shadcn/ui komponenty
│   ├── Calendar.tsx      # Komponent kalendarza
│   ├── TrainingForm.tsx  # Formularz treningu
│   └── AIGenerator.tsx   # Generator AI
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── openrouter.ts     # OpenRouter client
│   └── utils.ts          # Utility functions
├── types/
│   └── index.ts          # TypeScript types
└── styles/
    └── global.css        # Style globalne
```

## Koszty Miesięczne (Szacowane)

- **Supabase**: $0 (Free tier - 500MB DB, 2GB transfer)
- **DigitalOcean Droplet**: $12-24/miesiąc (Basic/Regular)
- **DigitalOcean App Platform** (alternatywa): $5/miesiąc
- **OpenRouter AI**: $5-20/miesiąc (zależnie od użycia)
- **GitHub Actions**: $0 (darmowe dla public repos, 2000 min/miesiąc dla private)

**RAZEM: $17-44/miesiąc** (lub $10-25/miesiąc z App Platform)

## Alternatywy i Plan B

### Jeśli zabraknie czasu na Docker + DO:
1. Deploy na **Vercel** (darmowy, 5 minut setup)
2. Vercel automatycznie obsługuje Astro SSR
3. GitHub Actions deploy do Vercel
4. W dokumentacji: "Deployment available on multiple platforms"

### Jeśli Tailwind 4 sprawia problemy:
- Downgrade do **Tailwind 3.4** (stabilny)

### Jeśli React jest za trudny:
- **Alpine.js** jako alternatywa (prostszy)
- Lub czyste **Astro components**

## Dlaczego Ten Stack?

1. **Spełnia wymagania certyfikacyjne** - wszystkie obowiązkowe punkty pokryte
2. **Dobry dla iOS developera** - React koncepty podobne do React Native/SwiftUI
3. **TypeScript** - type safety jak w Swift
4. **Supabase** - prosty setup, podobny do Firebase
5. **GitHub Actions** - wystarczająco konfigurowalne
6. **Realistyczny timeframe** - 25-30h na implementację

## Timeline (5 tygodni, 8h/tydzień)

**Tydzień 1**: Setup (Supabase, DO, Docker, GitHub Actions)
**Tydzień 2**: CRUD + UI (Kalendarz, formularze)
**Tydzień 3**: AI Generator + logika biznesowa
**Tydzień 4**: Testy + debugging + dokumentacja
**Tydzień 5**: Buffer na nieprzewidziane problemy
