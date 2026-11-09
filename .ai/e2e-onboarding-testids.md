# E2E Test IDs - Onboarding Flow

Mapping of all `data-testid` values for the E2E scenario: **Login → Onboarding → Calendar**

## Test Scenario

1. **Login** - log in using credentials from `.env.test`
2. **Onboarding** - complete the form for 3 workouts
3. **Calendar** - ensure the calendar view appears

---

## 1. Login Page (`/login`)

### LoginForm Component

| Element        | data-testid            | Type                   | Description                  |
| -------------- | ---------------------- | ---------------------- | ---------------------------- |
| Email input    | `login-email-input`    | input[type="email"]    | User email field             |
| Password input | `login-password-input` | input[type="password"] | Password field               |
| Submit button  | `login-submit-button`  | button[type="submit"]  | "Log in" button              |
| Error message  | `login-error-message`  | div                    | Login error message (if any) |

**Test usage example**:

```typescript
// Login scenario
await page.getByTestId("login-email-input").fill(process.env.E2E_USERNAME);
await page.getByTestId("login-password-input").fill(process.env.E2E_PASSWORD);
await page.getByTestId("login-submit-button").click();

// Wait for redirect to onboarding
await page.waitForURL("/onboarding");
```

---

## 2. Onboarding Page (`/onboarding`)

### OnboardingView Component

| Element        | data-testid             | Type | Description                                 |
| -------------- | ----------------------- | ---- | ------------------------------------------- |
| Main container | `onboarding-view`       | div  | Main onboarding view container              |
| Step title     | `onboarding-step-title` | h2   | Current step title (e.g., "Workout 1 of 3") |

### Stepper Component

| Element           | data-testid          | Type | Description                            |
| ----------------- | -------------------- | ---- | -------------------------------------- |
| Stepper container | `onboarding-stepper` | div  | Progress indicator container           |
| Step 1 indicator  | `onboarding-step-1`  | div  | Step 1 circle (green ✓ when completed) |
| Step 2 indicator  | `onboarding-step-2`  | div  | Step 2 circle                          |
| Step 3 indicator  | `onboarding-step-3`  | div  | Step 3 circle                          |

**Step states**:

- `bg-green-500` + "✓" - completed
- `bg-blue-600` + number - current
- `bg-gray-300` + number - pending

### WorkoutOnboardingForm Component

| Element        | data-testid               | Type                  | Description                            |
| -------------- | ------------------------- | --------------------- | -------------------------------------- |
| Form           | `workout-onboarding-form` | form                  | Main workout form                      |
| Distance input | `workout-distance-input`  | input[type="number"]  | Distance in km (e.g., 5.5)             |
| Avg HR input   | `workout-avghr-input`     | input[type="number"]  | Average heart rate in bpm (e.g., 145)  |
| Date input     | `workout-date-input`      | input[type="date"]    | Workout date (YYYY-MM-DD)              |
| Submit button  | `workout-submit-button`   | button[type="submit"] | "Next" (steps 1-2) / "Finish" (step 3) |

**Error messages** (shown only when validation fails):

| Element        | data-testid              | Type | Description                 |
| -------------- | ------------------------ | ---- | --------------------------- |
| Distance error | `workout-error-distance` | p    | Distance validation error   |
| Duration error | `workout-error-duration` | p    | Duration validation error   |
| Avg HR error   | `workout-error-avghr`    | p    | Heart rate validation error |
| Date error     | `workout-error-date`     | p    | Date validation error       |

### DurationInput Component (Within WorkoutOnboardingForm)

| Element       | data-testid              | Type                 | Description    |
| ------------- | ------------------------ | -------------------- | -------------- |
| Hours input   | `duration-hours-input`   | input[type="number"] | Hours (0-23)   |
| Minutes input | `duration-minutes-input` | input[type="number"] | Minutes (0-59) |
| Seconds input | `duration-seconds-input` | input[type="number"] | Seconds (0-59) |

**Test usage example**:

```typescript
// Fill workout #1
await page.getByTestId("workout-distance-input").fill("5.5");
await page.getByTestId("duration-hours-input").fill("0");
await page.getByTestId("duration-minutes-input").fill("30");
await page.getByTestId("duration-seconds-input").fill("15");
await page.getByTestId("workout-avghr-input").fill("145");
await page.getByTestId("workout-date-input").fill("2024-11-01");
await page.getByTestId("workout-submit-button").click();

// Wait for step 2
await expect(page.getByTestId("onboarding-step-title")).toHaveText("Workout 2 of 3");

// Repeat for workout #2 and #3
// After workout #3, wait for redirect to calendar
await page.waitForURL("/");
```

---

## 3. Calendar Page (`/`)

### CalendarView Component

| Element        | data-testid     | Type | Description                  |
| -------------- | --------------- | ---- | ---------------------------- |
| Main container | `calendar-view` | div  | Main calendar view container |

**Test usage example**:

```typescript
// Verify calendar view is visible after onboarding
await expect(page.getByTestId("calendar-view")).toBeVisible();
```

---

## Onboarding Form Validation Rules

### Distance

- **Min**: 0.1 km
- **Format**: floating-point number (step="0.1")
- **Error**: "Distance must be greater than 0.1 km"

### Duration

- **Min total**: 60 seconds (1 minute)
- **Format**: HH (0-23), MM (0-59), SS (0-59)
- **Error**: "Duration must exceed 60 seconds"

### Average Heart Rate

- **Range**: 40-220 bpm
- **Format**: integer
- **Error**: "Heart rate must be between 40 and 220 bpm"

### Completed At (Workout Date)

- **Constraint**: Must be in the past or today
- **Format**: YYYY-MM-DD (date input)
- **Max**: today's date
- **Error**: "Workout date must be in the past"

---

## Environment Variables (.env.test)

```bash
# Credentials for E2E testing (example)
E2E_USERNAME=test@example.com
E2E_PASSWORD=testpassword123
```

⚠️ **Note**: `.env.test` is not accessible to AI, but is already configured in the project.

---

## Complete E2E Test Example

```typescript
import { test, expect } from "@playwright/test";

test("complete onboarding flow", async ({ page }) => {
  // 1. Login
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(process.env.E2E_USERNAME!);
  await page.getByTestId("login-password-input").fill(process.env.E2E_PASSWORD!);
  await page.getByTestId("login-submit-button").click();

  // Wait for redirect to onboarding
  await page.waitForURL("/onboarding");
  await expect(page.getByTestId("onboarding-view")).toBeVisible();

  // 2. Fill workout #1
  await expect(page.getByTestId("onboarding-step-title")).toHaveText("Workout 1 of 3");
  await page.getByTestId("workout-distance-input").fill("5.5");
  await page.getByTestId("duration-hours-input").fill("0");
  await page.getByTestId("duration-minutes-input").fill("30");
  await page.getByTestId("duration-seconds-input").fill("15");
  await page.getByTestId("workout-avghr-input").fill("145");
  await page.getByTestId("workout-date-input").fill("2024-11-10");
  await page.getByTestId("workout-submit-button").click();

  // Verify step 2
  await expect(page.getByTestId("onboarding-step-1")).toHaveClass(/bg-green-500/);
  await expect(page.getByTestId("onboarding-step-1")).toHaveText("✓");
  await expect(page.getByTestId("onboarding-step-title")).toHaveText("Workout 2 of 3");

  // 3. Fill workout #2
  await page.getByTestId("workout-distance-input").fill("8.0");
  await page.getByTestId("duration-hours-input").fill("0");
  await page.getByTestId("duration-minutes-input").fill("45");
  await page.getByTestId("duration-seconds-input").fill("30");
  await page.getByTestId("workout-avghr-input").fill("155");
  await page.getByTestId("workout-date-input").fill("2024-11-12");
  await page.getByTestId("workout-submit-button").click();

  // Verify step 3
  await expect(page.getByTestId("onboarding-step-2")).toHaveClass(/bg-green-500/);
  await expect(page.getByTestId("onboarding-step-title")).toHaveText("Workout 3 of 3");

  // 4. Fill workout #3
  await page.getByTestId("workout-distance-input").fill("10.0");
  await page.getByTestId("duration-hours-input").fill("1");
  await page.getByTestId("duration-minutes-input").fill("0");
  await page.getByTestId("duration-seconds-input").fill("0");
  await page.getByTestId("workout-avghr-input").fill("150");
  await page.getByTestId("workout-date-input").fill("2024-11-14");
  await page.getByTestId("workout-submit-button").click();

  // 5. Verify redirect to calendar
  await page.waitForURL("/");
  await expect(page.getByTestId("calendar-view")).toBeVisible();
});
```

---

## Tips for Testers

1. **Wait for navigation**: Use `waitForURL()` after redirecting actions
2. **Verify step states**: Check Stepper colors and icons (✓ for completed)
3. **Test validation**: Try invalid data and check `workout-error-*` elements
4. **Loading states**: Submit button displays "Saving..." when `isLoading=true`
5. **Parallel API calls**: Step 3 sends 3 concurrent requests to `/api/v1/workouts`

---

**Created**: 2024-11-15
**Status**: ✅ All data-testid attributes added to components
**Readiness**: Components ready for E2E testing
