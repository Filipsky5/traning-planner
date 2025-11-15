# Testing Guide - AI Running Training Planner

## Przegląd środowiska testowego

Projekt wykorzystuje dwa frameworki testowe zgodnie z wymaganiami certyfikacyjnymi:

- **Vitest** - unit & integration tests (src/lib/utils, src/lib/validation, src/lib/services)
- **Playwright** - E2E tests (główne flow użytkownika)

## Struktura testów

```
training-planner/
├── e2e/                           # Testy E2E (Playwright)
│   ├── pages/                     # Page Object Model
│   │   ├── LoginPage.ts
│   │   └── CalendarPage.ts
│   ├── fixtures/                  # Test fixtures
│   └── *.spec.ts                  # Test files
├── src/
│   ├── lib/
│   │   ├── utils/
│   │   │   ├── workout.ts
│   │   │   └── workout.test.ts   # Unit tests
│   │   └── validation/
│   │       └── *.test.ts
│   └── test/
│       └── setup.ts               # Vitest setup file
├── vitest.config.ts               # Vitest configuration
└── playwright.config.ts           # Playwright configuration
```

## Uruchamianie testów

### Testy jednostkowe (Vitest)

```bash
# Uruchom wszystkie testy jednostkowe
npm run test:unit

# Watch mode (ciągłe uruchamianie przy zmianach)
npm run test:unit:watch

# UI mode (wizualna nawigacja testów)
npm run test:unit:ui

# Coverage report
npm run test:unit:coverage

# Interactive mode (default)
npm test
```

### Testy E2E (Playwright)

```bash
# Uruchom wszystkie testy E2E
npm run test:e2e

# UI mode (interaktywny debugger)
npm run test:e2e:ui

# Headed mode (widoczna przeglądarka)
npm run test:e2e:headed

# Debug mode (step-by-step)
npm run test:e2e:debug

# Pokaż ostatni raport
npm run test:e2e:report
```

### Uruchom wszystkie testy

```bash
# Unit tests + Build + E2E tests (full CI/CD flow)
npm run test:all
```

## Wymagania testowe (zgodne z certyfikatem)

### Pokrycie kodu (Coverage)
- **Cel**: min. 60–70% dla `src/lib/utils`, `src/lib/validation`, `src/lib/services`
- **Narzędzie**: Vitest coverage (v8 provider)
- **Raport**: HTML raport generowany w `coverage/` po uruchomieniu `npm run test:unit:coverage`

### Testy E2E (Playwright)
- **Cel**: Min. 1 test weryfikujący główny flow użytkownika
- **Przeglądarki**: Chromium (Desktop: 1440×900, Mobile: 390×844)
- **Scenariusze**:
  - Nawigacja po kalendarzu
  - Dodawanie treningów
  - Przeglądanie szczegółów treningu
  - Autentykacja (login/logout)

## Konfiguracja

### Vitest (vitest.config.ts)

- **Environment**: jsdom (dla testów React)
- **Globals**: true (describe, it, expect bez importów)
- **Coverage**: v8 provider, thresholds: 60%
- **Setup**: `src/test/setup.ts` (global mocks, cleanup)

### Playwright (playwright.config.ts)

- **Projects**: chromium-desktop, chromium-mobile
- **Base URL**: http://localhost:4321
- **Web Server**: `npm run preview` (production build)
- **Retries**: 2 w CI, 0 lokalnie
- **Trace**: on-first-retry
- **Screenshot/Video**: only-on-failure

## Przykłady testów

### Unit Test (Vitest)

```typescript
// src/lib/utils/workout.test.ts
import { describe, it, expect } from 'vitest';
import { formatDistance } from './workout';

describe('formatDistance', () => {
  it('should format meters to kilometers', () => {
    expect(formatDistance(5000)).toBe('5.00 km');
  });

  it('should return empty string for null', () => {
    expect(formatDistance(null)).toBe('');
  });
});
```

### E2E Test (Playwright)

```typescript
// e2e/calendar.spec.ts
import { test, expect } from '@playwright/test';
import { CalendarPage } from './pages/CalendarPage';

test('should display calendar grid', async ({ page }) => {
  const calendarPage = new CalendarPage(page);
  await calendarPage.goto();
  await calendarPage.waitForCalendarLoad();

  await expect(calendarPage.calendarGrid).toBeVisible();
});
```

## Best Practices

### Vitest (Unit Tests)

1. **Używaj opisowych nazw testów** - "should format meters to kilometers" zamiast "test 1"
2. **Stosuj AAA pattern** - Arrange, Act, Assert
3. **Mockuj zależności** - `vi.mock()` dla modułów zewnętrznych
4. **Cleanup po każdym teście** - automatyczne dzięki setup.ts
5. **Typuj mocki** - zachowaj type safety

### Playwright (E2E Tests)

1. **Page Object Model** - enkapsuluj logikę strony w klasach
2. **Resilient selectors** - używaj role locators i data-testid
3. **Wait for elements** - `waitFor()`, `toBeVisible()` przed interakcjami
4. **Isolate tests** - każdy test niezależny (beforeEach setup)
5. **Visual testing** - `toHaveScreenshot()` dla regression testing

## Debugging

### Vitest

```bash
# Uruchom konkretny test file
npx vitest run src/lib/utils/workout.test.ts

# Filter tests by name
npx vitest run -t "formatDistance"

# UI mode dla wizualnego debugowania
npm run test:unit:ui
```

### Playwright

```bash
# Debug mode (step-by-step)
npm run test:e2e:debug

# Headed mode (zobacz co się dzieje)
npm run test:e2e:headed

# Trace viewer (po failure)
npx playwright show-trace trace.zip

# Codegen (nagrywaj interakcje → kod)
npx playwright codegen http://localhost:4321
```

## CI/CD Integration

### GitHub Actions (przykład)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'

      # Unit tests
      - run: npm ci
      - run: npm run test:unit

      # E2E tests
      - run: npx playwright install chromium
      - run: npm run build
      - run: npm run test:e2e

      # Upload artifacts on failure
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: |
            playwright-report/
            coverage/
```

## Troubleshooting

### Problem: "Cannot find module '@testing-library/jest-dom'"
**Rozwiązanie**: Sprawdź czy `src/test/setup.ts` importuje `@testing-library/jest-dom`

### Problem: Playwright nie może uruchomić serwera
**Rozwiązanie**:
1. Upewnij się że `npm run build` działa
2. Sprawdź czy port 4321 jest wolny
3. Ustaw `reuseExistingServer: true` w playwright.config.ts

### Problem: Coverage poniżej thresholds
**Rozwiązanie**:
1. Dodaj testy dla uncovered code
2. Lub obniż thresholds w vitest.config.ts (tylko tymczasowo)

## Analogie do iOS (dla developera iOS)

| iOS/Swift | Web (ten projekt) |
|-----------|-------------------|
| XCTest | Vitest + Playwright |
| XCTestCase | describe/test blocks |
| XCTAssert | expect().toBe() |
| UI Tests (XCUITest) | Playwright E2E |
| @testable import | vi.mock() |
| Test Plans | test.describe() groups |
| Code Coverage | vitest --coverage |

## Linki do dokumentacji

- [Vitest Docs](https://vitest.dev/)
- [Playwright Docs](https://playwright.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest UI](https://vitest.dev/guide/ui.html)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
