> Update 2026-11-08: Node 22.23.4 (`.nvmrc`), Astro 7, React 19.3, Zod 4, Vitest 5, and Vite 8 are required. Cloudflare adapter 14 supports Workers instead of Pages. Migration details: [dependency-upgrade.md](dependency-upgrade.md). ESLint remains at version 9 and TypeScript at 5.9 for plugin compatibility.

# Tech Stack - AI Running Training Planner

## Frontend

### Framework

- **Astro 7** (SSR mode)
  - Fast, efficient pages with minimal JavaScript
  - Server-side rendering for better SEO and performance
  - Adapter: `@astrojs/node` in standalone mode

### UI Framework

- **React 19**
  - Interactive components (calendar, forms)
  - Hydration only where needed (Astro Islands)
  - Directives: `client:load`, `client:visible` for optimization

### Styling

- **Tailwind CSS 4**
  - Utility-first CSS framework
  - Rapid prototyping
  - Recommended by the course authors

### UI Components

- **shadcn/ui**
  - Accessible, customizable React components
  - Based on Radix UI
  - TypeScript support out of the box

### Icons

- **Lucide React**
  - Consistent icon library
  - Tree-shakeable

## Backend

### Database

- **Supabase** (hosted PostgreSQL)
  - Automatic REST API
  - Built-in authentication
  - Real-time subscriptions (optional for the future)
  - Row Level Security (RLS) for security
  - Free tier sufficient for the MVP

### Authentication

- **Supabase Auth**
  - Ready-made solution
  - Email/password authentication
  - Session management
  - Zero configuration

### API Layer

- **Astro API Routes**
  - Endpoints in `src/pages/api/`
  - Server-side only
  - TypeScript support

### AI Integration

- **OpenRouter.ai**
  - Access to multiple AI models (OpenAI, Anthropic, Google)
  - Flexible model selection
  - Spending limits on API keys
  - One interface for different providers

## DevOps & Deployment

### Containerization

- **Docker**
  - Dockerfile based on `node:22-alpine`
  - Single-stage build for simplicity
  - docker-compose for local development (optional)

### Hosting

- **Cloudflare Workers**
  - Native support for Astro SSR through Cloudflare Workers
  - Global CDN network and edge deployments
  - Free plan with generous limits and support for commercial projects
  - Automatic Git deployments

### CI/CD

- **GitHub Actions**
  - Builds and tests on pull requests; deployment via workflow_dispatch
  - Running tests
  - No automatic Claude/Codex review requiring private credentials ([details](code-review-automation.md))
  - Manual deployment to Cloudflare Workers
  - Manual trigger via `workflow_dispatch`

### Testing

#### E2E Tests

- **Playwright**
  - End-to-end testing framework
  - Cross-browser testing (Chromium, WebKit, optionally Firefox)
  - Multi-viewport testing (desktop: 1440×900, mobile: 390×844)
  - TypeScript support out of the box
  - Run against the production build (`npm run build` + `npm run preview`)
  - At least 1 test verifying the main user flow (required for certification)
  - Scenarios: authentication, onboarding, calendar, AI suggestions, user goals

#### Unit & Integration Tests

- **Vitest 5**
  - Unit tests for utilities, validation, and services
  - Fast, Vite-native test runner (Vitest)
  - Compatible with the Jest ecosystem
  - Coverage: at least 60–70% for `src/lib/utils`, `src/lib/validation`, `src/lib/services`

- **React Testing Library**
  - Component integration tests
  - Testing hooks (`useCalendar`, `useDayWorkouts`, `useWorkoutDetail`)
  - User-centric testing approach

#### API Tests

- **supertest** or **node-fetch**
  - HTTP endpoint testing for `src/pages/api/v1/*`
  - Run against a test Astro server (Node adapter)
  - Verification of RLS and database filters
  - Alternatively: Playwright APIRequestContext

#### Mocking & Helpers

- **MSW** (Mock Service Worker) - optional
  - Mocking API responses in component tests
  - Deterministic AI responses for tests
  - Isolating tests from external services (OpenRouter.ai)

## Development Tools

### Type Safety

- **TypeScript 5.9**
  - Static typing
  - Better IDE support
  - Fewer runtime errors

### Code Quality

- **ESLint 9** - JavaScript/TypeScript linting
- **Prettier** - code formatting
- **Husky** - Git hooks
- **lint-staged** - linting only changed files

## Project Structure

```
src/
├── pages/
│   ├── api/              # API endpoints (Astro SSR)
│   │   ├── auth/         # Authentication
│   │   ├── trainings/    # Workout CRUD
│   │   └── ai/           # AI generator
│   ├── dashboard/        # Main calendar view
│   ├── login/            # Login page
│   └── register/         # Registration
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── Calendar.tsx      # Calendar component
│   ├── TrainingForm.tsx  # Workout form
│   └── AIGenerator.tsx   # AI generator
├── lib/
│   ├── supabase.ts       # Supabase client
│   ├── openrouter.ts     # OpenRouter client
│   └── utils.ts          # Utility functions
├── types/
│   └── index.ts          # TypeScript types
└── styles/
    └── global.css        # Global styles
```

## Monthly Costs (Estimated)

- **Supabase**: $0 (Free tier - 500MB DB, 2GB transfer)
- **Cloudflare Workers**: $0 (Free tier with generous limits)
- **OpenRouter AI**: $5-20/month (depending on usage)
- **GitHub Actions**: $0 (free for public repos, 2000 min/month for private repos)

**TOTAL: $5-20/month**

## Alternatives and Plan B

### If Cloudflare Workers causes problems:

1. Deploy to **Vercel** or **Netlify** (free, 5-minute setup)
2. Both platforms automatically support Astro SSR
3. In the documentation: "Deployment available on multiple platforms"

### If Tailwind 4 causes problems:

- Downgrade to **Tailwind 3.4** (stable)

### If React is too difficult:

- **Alpine.js** as an alternative (simpler)
- Or plain **Astro components**

## Why This Stack?

1. **Meets certification requirements** - all mandatory points covered
2. **Good for an iOS developer** - React concepts are similar to React Native/SwiftUI
3. **TypeScript** - type safety like Swift
4. **Supabase** - simple setup, similar to Firebase
5. **GitHub Actions** - sufficiently configurable
6. **Realistic timeframe** - 25-30h for implementation

## Timeline (5 weeks, 8h/week)

**Week 1**: Setup (Supabase, Cloudflare Workers, GitHub Actions)
**Week 2**: CRUD + UI (calendar, forms)
**Week 3**: AI generator + business logic
**Week 4**: Tests + debugging + documentation
**Week 5**: Buffer for unexpected problems
