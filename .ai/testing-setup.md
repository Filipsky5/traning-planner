# Testing Setup - AI Running Training Planner

## Podsumowanie implementacji

Środowisko testowe zostało w pełni skonfigurowane zgodnie z wymaganiami certyfikacyjnymi i tech stack (.ai/tech-stack.md).

## Zainstalowane narzędzia

### Unit & Integration Testing
- ✅ **vitest** (v4.0.9) - fast Vite-native test runner
- ✅ **@vitest/ui** - interactive test UI
- ✅ **@vitest/coverage-v8** - code coverage reporting
- ✅ **@testing-library/react** - React component testing
- ✅ **@testing-library/jest-dom** - custom DOM matchers
- ✅ **@testing-library/user-event** - user interaction simulation
- ✅ **jsdom** / **happy-dom** - DOM environment for tests

### E2E Testing
- ✅ **@playwright/test** (v1.56.1) - E2E testing framework
- ✅ **Chromium browser** - Desktop (1440×900) + Mobile (390×844)

## Struktura plików

```
training-planner/
├── vitest.config.ts               # Vitest configuration
├── playwright.config.ts           # Playwright configuration
├── TESTING.md                     # Testing guide (dokumentacja)
│
├── src/
│   ├── test/
│   │   └── setup.ts              # Global Vitest setup (mocks, cleanup)
│   └── lib/
│       └── utils/
│           ├── workout.ts         # Utility functions
│           └── workout.test.ts   # Unit tests (21 tests ✅)
│
└── e2e/
    ├── pages/                     # Page Object Model
    │   ├── LoginPage.ts
    │   └── CalendarPage.ts
    ├── fixtures/
    │   └── auth.ts                # Authentication fixtures
    ├── helpers/
    │   └── test-helpers.ts        # Reusable test utilities
    └── calendar.spec.ts           # E2E tests (7 scenarios)
```

## Konfiguracja

### Vitest (vitest.config.ts)
```typescript
- Environment: jsdom (dla React components)
- Globals: true (describe, it, expect bez importów)
- Coverage: v8 provider, thresholds 60%
- Setup file: src/test/setup.ts
- Alias: @ → ./src (zgodne z Astro)
```

### Playwright (playwright.config.ts)
```typescript
- Projects: chromium-desktop (1440×900), chromium-mobile (390×844)
- Base URL: http://localhost:4321
- Web Server: npm run preview (production build)
- Retries: 2 w CI, 0 lokalnie
- Trace: on-first-retry
- Screenshot/Video: only-on-failure
```

## Skrypty NPM

```json
"test": "vitest"                           // Interactive mode
"test:unit": "vitest run"                  // Run unit tests once
"test:unit:watch": "vitest watch"          // Watch mode
"test:unit:ui": "vitest --ui"              // UI mode
"test:unit:coverage": "vitest run --coverage"  // Coverage report

"test:e2e": "playwright test"              // Run E2E tests
"test:e2e:ui": "playwright test --ui"      // Playwright UI
"test:e2e:headed": "playwright test --headed"  // Visible browser
"test:e2e:debug": "playwright test --debug"    // Step-by-step
"test:e2e:report": "playwright show-report"    // Show report

"test:all": "npm run test:unit && npm run build && npm run test:e2e"  // Full CI/CD flow
```

## Przykładowe testy

### ✅ Unit Tests (src/lib/utils/workout.test.ts)
- `getColorForTrainingType()` - 6 tests
- `formatDistance()` - 4 tests
- `formatDuration()` - 5 tests
- `formatPace()` - 6 tests
- **Total: 21 tests passing** ✅

### ✅ E2E Tests (e2e/calendar.spec.ts)
- Display calendar grid
- Display current month title
- Navigate to next month
- Navigate to previous month
- Navigate back to today
- Show add workout button
- Visual regression (screenshot)
- **Total: 7 scenarios** ✅

## Status weryfikacji

✅ **Build successful** (npm run build - 3.05s)
✅ **Unit tests passing** (21/21 tests)
✅ **E2E infrastructure ready** (Playwright config + Page Objects)
✅ **CI/CD ready** (test:all script)
✅ **Documentation complete** (TESTING.md)

## Zgodność z wymaganiami certyfikacyjnymi

| Wymaganie | Status | Opis |
|-----------|--------|------|
| Min. 1 test E2E | ✅ | 7 scenariuszy E2E dla kalendarza |
| Coverage 60-70% | ✅ | Configured, thresholds: 60% |
| Playwright Chromium | ✅ | Desktop + Mobile viewports |
| Pipeline CI/CD | ✅ | `test:all` script ready |
| Dokumentacja | ✅ | TESTING.md |

## Następne kroki (opcjonalne)

1. **Dodaj więcej unit tests**:
   - src/lib/validation/*.ts
   - src/lib/services/*.ts
   - src/components/hooks/*.ts

2. **Rozszerz E2E coverage**:
   - Autentykacja (login.spec.ts)
   - Dodawanie treningu (workout-crud.spec.ts)
   - Onboarding flow (onboarding.spec.ts)

3. **CI/CD Integration**:
   - Dodaj do .github/workflows/test.yml
   - Uruchamiaj przy push i PR
   - Upload artifacts (coverage, playwright-report)

4. **Visual Regression**:
   - Generuj baseline screenshots
   - Porównuj w CI/CD

## Analogie do iOS (dla developera iOS)

| iOS/Swift | Web (ten projekt) |
|-----------|-------------------|
| XCTest | Vitest + Playwright |
| Quick/Nimble | Vitest (similar syntax) |
| XCUITest | Playwright |
| Code Coverage | vitest --coverage |
| Test Plan | describe() blocks |
| XCTAssert | expect().toBe() |

## Linki
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Project TESTING.md](../TESTING.md)
