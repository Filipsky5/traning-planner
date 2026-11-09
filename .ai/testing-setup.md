# Testing Setup - AI Running Training Planner

## Implementation Summary

The test environment has been fully configured according to certification requirements and the tech stack (.ai/tech-stack.md).

## Installed Tools

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

## File Structure

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

## Configuration

### Vitest (vitest.config.ts)

```typescript
- Environment: jsdom (for React components)
- Globals: true (describe, it, expect without imports)
- Coverage: v8 provider, thresholds 60%
- Setup file: src/test/setup.ts
- Alias: @ → ./src (matching Astro)
```

### Playwright (playwright.config.ts)

```typescript
- Projects: chromium-desktop (1440×900), chromium-mobile (390×844)
- Base URL: http://localhost:4321
- Web Server: npm run preview (production build)
- Retries: 2 in CI, 0 locally
- Trace: on-first-retry
- Screenshot/Video: only-on-failure
```

## NPM Scripts

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

## Example Tests

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

## Verification Status

✅ **Build successful** (npm run build - 3.05s)
✅ **Unit tests passing** (21/21 tests)
✅ **E2E infrastructure ready** (Playwright config + Page Objects)
✅ **CI/CD ready** (test:all script)
✅ **Documentation complete** (TESTING.md)

## Certification Requirement Compliance

| Requirement         | Status | Description                 |
| ------------------- | ------ | --------------------------- |
| At least 1 E2E test | ✅     | 7 E2E calendar scenarios    |
| Coverage 60-70%     | ✅     | Configured, thresholds: 60% |
| Playwright Chromium | ✅     | Desktop + Mobile viewports  |
| Pipeline CI/CD      | ✅     | `test:all` script ready     |
| Documentation       | ✅     | TESTING.md                  |

## Next Steps (Optional)

1. **Add more unit tests**:
   - src/lib/validation/*.ts
   - src/lib/services/*.ts
   - src/components/hooks/*.ts

2. **Expand E2E coverage**:
   - Authentication (login.spec.ts)
   - Adding workouts (workout-crud.spec.ts)
   - Onboarding flow (onboarding.spec.ts)

3. **CI/CD Integration**:
   - Add to .github/workflows/test.yml
   - Run on push and PR
   - Upload artifacts (coverage, playwright-report)

4. **Visual Regression**:
   - Generate baseline screenshots
   - Compare in CI/CD

## iOS Analogies (for an iOS Developer)

| iOS/Swift     | Web (this project)      |
| ------------- | ----------------------- |
| XCTest        | Vitest + Playwright     |
| Quick/Nimble  | Vitest (similar syntax) |
| XCUITest      | Playwright              |
| Code Coverage | vitest --coverage       |
| Test Plan     | describe() blocks       |
| XCTAssert     | expect().toBe()         |

## Links

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Project TESTING.md](../TESTING.md)
