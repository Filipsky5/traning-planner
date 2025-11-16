# E2E Tests Configuration

## Test Users Setup

Testy E2E wymagają **jednego użytkownika** w `.env.test`:

```bash
# Test user credentials
E2E_USERNAME=test@example.com
E2E_PASSWORD=TestPassword123!
```

**Ważne**: Ten sam użytkownik jest używany przez wszystkie testy. Teardown automatycznie czyści dane między testami.

## How Tests Work

### 1. Onboarding Flow Tests (runs first)
- **File**: `e2e/onboarding-flow.spec.ts`
- **Project**: `onboarding-flow`
- **User**: `E2E_USERNAME` (fresh login each test)
- **Purpose**:
  - Tests onboarding flow (3 steps)
  - Creates 3 workouts in the process
  - These workouts are reused by calendar tests

### 2. Setup Phase (runs after onboarding-flow)
- **File**: `e2e/setup/auth.setup.ts`
- **Project**: `setup`
- **User**: `E2E_USERNAME`
- **Dependencies**: Requires `onboarding-flow` to complete first
- **Purpose**:
  - Logs in as test user (who now has 3 workouts from onboarding-flow)
  - Verifies user has completed onboarding (≥3 workouts)
  - Saves authenticated state to `playwright/.auth/user.json`
  - **Does NOT delete workouts** - reuses them for calendar tests

### 3. Calendar Tests
- **File**: `e2e/calendar.spec.ts`
- **Projects**: `chromium-desktop`, `chromium-mobile`
- **User**: Uses saved auth state from setup (E2E_USERNAME)
- **Dependencies**: Requires `setup` to run first
- **Purpose**:
  - Tests calendar view functionality
  - Uses the 3 workouts created by onboarding-flow

### 4. Global Teardown
- **File**: `e2e/teardown/onboarding.teardown.ts`
- **Project**: `teardown`
- **User**: `E2E_USERNAME`
- **Dependencies**: Runs AFTER all tests (chromium-desktop, chromium-mobile, onboarding-flow)
- **Purpose**:
  - Cleans up ALL test user workouts after entire test suite
  - Logs in as test user
  - Fetches all workouts
  - Deletes each workout via DELETE /api/v1/workouts/[id]
  - Ensures clean state for next test run

## Test Execution Order

```
1. onboarding-flow (onboarding-flow.spec.ts)
   └─ Creates 3 workouts for E2E_USERNAME
   ↓
2. setup (auth.setup.ts)
   └─ Verifies user has 3 workouts, saves auth state
   ↓
3. chromium-desktop (calendar.spec.ts) + chromium-mobile (calendar.spec.ts)
   └─ Use the 3 workouts from onboarding-flow (run in parallel)
   ↓
4. teardown (onboarding.teardown.ts)
   └─ Deletes all 3 workouts (cleanup for next test run)
```

**Key Points**:
- Onboarding-flow creates workouts that are **reused** by calendar tests
- Setup does **NOT** delete workouts - it verifies they exist
- Teardown runs **LAST** to clean up for the next test run
- If teardown fails, the next run may have stale data (re-run teardown manually)

## Creating Test Users in Supabase

You need to create both test users in your local Supabase instance:

1. Start Supabase: `npx supabase start`
2. Open Supabase Studio: http://localhost:54323
3. Go to Authentication → Users
4. Create both users with the credentials from `.env.test`

### Alternative: Use Register Endpoint

```bash
# Main test user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Onboarding test user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"onboarding@example.com","password":"TestPassword123!"}'
```

## Running Tests

```bash
# Run all tests (includes setup)
npm run test:e2e

# Run specific project
npx playwright test --project=setup
npx playwright test --project=chromium-desktop
npx playwright test --project=onboarding-flow

# Run in UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

## Troubleshooting

### "Timeout waiting for navigation"
- Verify test users exist in Supabase
- Check `.env.test` has correct credentials
- Ensure local Supabase is running (`npx supabase status`)

### "Calendar tests fail with redirect to /onboarding"
- Onboarding-flow tests failed - user doesn't have 3 workouts
- Check `onboarding-flow` project output for errors
- Run onboarding tests manually: `npx playwright test --project=onboarding-flow`

### "Onboarding tests fail - user already has workouts"
- Previous test run's teardown failed (workouts not cleaned up)
- Run teardown manually to clean up: `npx playwright test e2e/teardown/onboarding.teardown.ts`
- Or manually delete workouts via Supabase Studio

### "Teardown fails to delete workouts"
- Check if user is authenticated (401 error)
- Verify DELETE /api/v1/workouts/[id] endpoint works
- Teardown failures won't fail the test suite (best-effort cleanup)
