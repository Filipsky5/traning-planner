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

### 1. Setup Phase (runs first)
- **File**: `e2e/setup/auth.setup.ts`
- **Project**: `setup`
- **User**: `E2E_USERNAME`
- **Purpose**:
  - Logs in as test user
  - Completes onboarding if needed (creates 3 workouts)
  - Saves authenticated state to `playwright/.auth/user.json`

### 2. Calendar Tests
- **File**: `e2e/calendar.spec.ts`
- **Projects**: `chromium-desktop`, `chromium-mobile`
- **User**: Uses saved auth state from setup (E2E_USERNAME)
- **Dependencies**: Requires setup to run first
- **Assumption**: User has completed onboarding (≥3 workouts)

### 3. Onboarding Flow Tests
- **File**: `e2e/onboarding-flow.spec.ts`
- **Project**: `onboarding-flow`
- **User**: `E2E_USERNAME` (fresh login each test)
- **Dependencies**: None (runs independently)
- **Assumption**: User has <3 workouts (ensured by teardown)

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
1. setup (auth.setup.ts)
   ↓
2. chromium-desktop (calendar.spec.ts) + chromium-mobile (calendar.spec.ts)
   + onboarding-flow (onboarding-flow.spec.ts) - runs in parallel
   ↓
3. teardown (onboarding.teardown.ts) - runs AFTER ALL tests complete
```

**Note**: Teardown runs LAST, after all test projects complete. This ensures all workouts are cleaned up once, at the very end.

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
- Setup phase failed - check `setup` project output
- Main test user might not have 3 workouts
- Run setup manually: `npx playwright test --project=setup`

### "Onboarding tests fail - user already has workouts"
- Onboarding test user has ≥3 workouts (should be cleaned by teardown)
- Teardown might have failed - check test output for teardown logs
- Manually delete workouts via Supabase Studio or API
- Or run teardown manually: `npx playwright test --project=onboarding-teardown`

### "Teardown fails to delete workouts"
- Check if user is authenticated (401 error)
- Verify DELETE /api/v1/workouts/[id] endpoint works
- Teardown failures won't fail the test suite (best-effort cleanup)
