## Test Plan – AI Running Training Planner (MVP)

### 1. Introduction and Testing Goals

This test plan aims to ensure that **AI Running Training Planner**:

- correctly supports core user scenarios (onboarding, planning and completing workouts, using AI suggestions),
- is functionally stable with typical and edge-case user data,
- securely manages user sessions and workout data (Supabase + RLS),
- delivers a consistent UI experience across key browsers and resolutions,
- has a minimal but meaningful level of test automation (E2E + selected unit / integration tests).

The plan covers **manual exploratory testing** and **automated testing** (mainly Playwright E2E), accounting for the technical stack: Astro 5 (SSR), React 19, Tailwind 4, Supabase, and the API layer under `src/pages/api`.

### 2. Test Scope

#### 2.1 Features in Scope

- **Authentication and account management**
  - Registration (`RegisterForm`, API `POST /api/v1/auth/register`).
  - Login (`LoginForm`, `POST /api/v1/auth/login`).
  - Logout (`UserMenu` → `POST /api/v1/auth/logout`).
  - Password reset: “forgot password” (`ForgotPasswordForm`, `POST /api/v1/auth/forgot-password`) and setting a new password (`ResetPasswordForm`, `POST /api/v1/auth/reset-password`).
  - Session handling (cookies, `src/middleware/index.ts`) and redirects (e.g., to `/login`).

- **User onboarding**
  - 3-step entry of recent workouts (`OnboardingView`, `WorkoutOnboardingForm`, `DurationInput`).
  - Field validation (distance, time, heart rate, past date).
  - Transition after step 3 to the rest of the application (e.g., calendar).

- **Calendar and workout management**
  - Calendar view (`CalendarView`, `useCalendar`, `CalendarHeader`, `CalendarGrid`, `DayCell`).
  - Month / week views and date navigation.
  - Day view (`DayDrawer`, `DayDrawerContent`, `WorkoutList`, `WorkoutItem`, `QuickActions`).
  - Workout details (`WorkoutDetailDrawer`, `WorkoutDetailView`, `WorkoutMetrics`, `WorkoutSteps`, `WorkoutActions`).
  - Workout actions: completion, rating (`CompleteWorkoutDialog`, `RateWorkoutDialog`), skipping, cancellation.

- **AI suggestions**
  - Generation (`AISuggestionDrawer`, `AISuggestionForm`, API `POST /api/v1/ai/suggestions`).
  - Preview (`SuggestionPreview`, `SuggestionMeta`, `SuggestionSteps`).
  - Acceptance, rejection with regeneration (limit 3/day), and position conflict handling (`SuggestionControls`, `ConflictDialog`).
  - Expiration after 24h (`ExpiredSuggestionState`).

- **User goal**
  - Goal view (`GoalView`, `GoalForm`, `useUserGoal`).
  - Distance goal setup (distance + date) with validation.
  - “I run for health” mode (no active goal).
  - Editing and deleting goals.

- **User preferences**
  - Pace unit (`PaceUnitProvider`, `PaceUnitToggle`, `UserMenu`).
  - Saving to and restoring from `localStorage`.

- **API layer and domain logic**
  - Endpoints under `src/pages/api/v1` (auth, workouts, training-types, calendar, ai-suggestions, goals).
  - Services in `src/lib/services`, utilities in `src/lib/utils`, validation in `src/lib/validation`.
  - Supabase integration (`src/db/supabase.client.ts`, `src/db/database.types.ts`, migrations in `supabase/migrations`).

#### 2.2 Features Outside Scope (MVP)

- .FIT / .GPX imports, external integrations (Garmin, Strava).
- Advanced chart visualizations.
- Social features.
- Native mobile applications (testing only mobile/responsive browsers).

### 3. Test Types

#### 3.1 Static Tests

- **Linting and formatting**
  - `npm run lint`, `npm run lint:fix`, `npm run format` as part of CI.
  - Goal: no lint errors or serious warnings before merging to `master`.

- **Type analysis**
  - TypeScript compilation (`tsc` via Astro config / CI).
  - No type errors, especially at API boundaries (`src/types.ts`, `src/types/*`, `src/lib/api/*`).

#### 3.2 Unit Tests

A framework (e.g., **Vitest** or **Jest**) is expected to be added for unit testing.

Priority areas:

- **Utilities** (`src/lib/utils`, `src/lib/utils/workout.ts`):
  - distance/time/pace formatting,
  - workout type to color mapping.
- **Validation** (`src/lib/validation/*`):
  - correct rules and error messages.
- **Domain hooks**:
  - `useCalendar` – date range generation, API data to `DayCellViewModel` mapping.
  - `useDayWorkouts` – filtering, sorting, network error handling.
  - `useWorkoutDetail` – DTO → `WorkoutViewModel` transformations, `canBe*` flags.
- **AI transformations** (`src/lib/services/aiSuggestionsService.ts`, `src/types/suggestions.ts`):
  - total time/distance, `isExpired` status, step mapping.
- **AI logic** (if implemented as separate modules):
  - calibration mode (first 3 workouts – more conservative suggestions),
  - progression logic (10% increase after 3 positive ratings),
  - pace suggestion accuracy based on user history.

#### 3.3 Integration Tests (Backend and Frontend)

- **API integration (HTTP)**
  - Endpoint tests for `src/pages/api/v1/*` on a test Astro server (Node adapter).
  - Tool: e.g., **supertest** or plain `fetch` in a test environment.
  - Verify RLS and filters (e.g., date range, user filtering).

- **Frontend–API integrations**
  - React component tests using **React Testing Library**:
    - `CalendarView` + `useCalendar` – correct day rendering from API data (mock fetch).
    - `DayDrawer` + `useDayWorkouts` – correct loading/error states and updates after actions.
    - `AISuggestionDrawer` – correct transitions (form → suggestion → acceptance/regeneration).

#### 3.4 E2E Tests (Playwright)

Core automation pillar:

- Run against built SSR (`npm run build`, `npm run preview`).
- Scenarios described in section 4 cover critical flows:
  - authentication and session management (TC-AUTH-*),
  - onboarding with sample data (TC-ONB-*),
  - calendar and workout management (TC-CAL-_, TC-WRK-_),
  - AI suggestions - basic flow and advanced logic (calibration, progression, pace accuracy) (TC-AI-*),
  - user goals (TC-GOAL-*),
  - user preferences (TC-PACE-*).
- At least 2 browsers (Chromium, WebKit) and responsive testing (desktop + mobile viewport).

#### 3.5 Nonfunctional Tests

- **Performance (lightweight)**
  - TTFB and rendering time for main views (Onboarding, Calendar).
  - Verify correct SSR and reasonable client-side JS volume.
- **Security**
  - Verify middleware access restrictions (logged-out user).
  - Verify other users' data is inaccessible (Supabase RLS – API tests).
  - Check session cookie storage (httpOnly, secure in production).
- **Accessibility**
  - Basic Playwright + axe tests (or manual).
  - Check focus management (modals, drawers, dialogs).

### 4. Test Scenarios for Key Features

The following scenarios should have E2E coverage (high priority), supplemented by unit/integration tests where appropriate.

#### 4.1 Authentication

- **TC-AUTH-01 – New user registration (happy path)**
  - Visit `/register`.
  - Enter valid data (unique email, strong password, terms acceptance).
  - Expected: no validation errors, email verification confirmation screen displayed.

- **TC-AUTH-02 – Registration form validation**
  - Empty fields, invalid email, short password, missing digits/letters, mismatched passwords, no terms acceptance.
  - Expected: correct field error messages.

- **TC-AUTH-03 – Login with valid credentials**
  - Visit `/login`, log in with a valid account.
  - Expected: redirect to `/` (calendar), `UserMenu` with email visible.

- **TC-AUTH-04 – Login with invalid credentials**
  - Nonexistent email, wrong password.
  - Expected: meaningful global error (e.g., “Login failed”).

- **TC-AUTH-05 – Forgot password**
  - Visit `/forgot-password`, enter existing and nonexistent emails.
  - Expected: always a success message, no disclosure of account existence.

- **TC-AUTH-06 – Reset password**
  - Simulate visiting `/reset-password?token=...`.
  - Set and confirm a new password.
  - Expected: success message, login with new password possible.

- **TC-AUTH-07 – Logout**
  - Click “Log out” in `UserMenu`.
  - Expected: `/api/v1/auth/logout` called, redirect to `/login`, no access to `/` without login.

#### 4.2 Onboarding (3 Recent Workouts)

- **TC-ONB-01 – Complete onboarding**
  - New account → automatic redirect to `/onboarding`.
  - Enter valid data for 3 historical workouts.
  - Expected: each step saves data, step 3 redirects to `nextUrl` (e.g., `/`), success messages.

- **TC-ONB-02 – Workout form validation**
  - Distance < 0.1 km, time < 60s, heart rate outside 40–220, future date.
  - Expected: appropriate errors, progression blocked.

- **TC-ONB-03 – Interrupt and return**
  - Start onboarding, refresh / log out during the process.
  - Expected: after login, return to the appropriate step or onboarding again (according to backend assumptions).

- **TC-ONB-04 – Sample data verification**
  - Check onboarding displays sample data (e.g., “30 min walk”, “15 min easy jog”).
  - Sample data can be used through clicking or autofill.
  - Expected: sample buttons/links visible and functional, lowering the barrier for new users.

#### 4.3 Calendar and Workouts

- **TC-CAL-01 – Calendar view (month)**
  - Visit `/` after login.
  - Expected: correct month, today highlighted, days outside current month indicated.

- **TC-CAL-02 – Period and mode navigation**
  - Switch to “Week”, use `Previous / Next` and “Today”.
  - Expected: correct date ranges and week number.

- **TC-CAL-03 – Workouts in cells**
  - Days with 0, 1, 2, and >2 workouts.
  - Expected: at most 2 cards + “+N more” link opening `DayDrawer`.

- **TC-CAL-04 – Keyboard calendar navigation**
  - Focus cell, use arrows and Enter/space.
  - Expected: focus moves, Enter/space opens day.

- **TC-CAL-05 – Day view (`DayDrawer`)**
  - Open a day with different workout statuses.
  - Expected: workout count, correct status labels, `QuickActions` only for `planned`.

- **TC-CAL-06 – Quick actions: “Skip” and “Cancel”**
  - Use “Skip” / “Cancel” on `planned` workouts.
  - Expected: status update / removal from list, appropriate messages (alerts / toast), refreshed data.

- **TC-CAL-07 – Workout details from calendar**
  - Click workout to open `WorkoutDetailDrawer`.
  - Expected: correct planned data, actual data if present, step list.

#### 4.4 AI Suggestions

- **TC-AI-01 – Generate AI suggestion**
  - Select “Generate with AI” in `DayCell` → open `AISuggestionDrawer`.
  - Select type and date, click “Generate AI suggestion”.
  - Expected: spinner, then workout preview with summary and steps.

- **TC-AI-02 – Suggestion form validation**
  - No type / date selected.
  - Expected: field error messages.

- **TC-AI-03 – Accept suggestion**
  - Click “Accept suggestion” for a generated suggestion.
  - Expected: API call, drawer closes, workout appears at the correct calendar position.

- **TC-AI-04 – Position conflict (409)**
  - Force an existing workout at position 1.
  - Expected: `ConflictDialog` opens, select position 2–5, accept again, workout added at selected position.

- **TC-AI-05 – Regenerate suggestion (limit 3)**
  - Repeatedly use “Reject and generate another”.
  - Expected: remaining regeneration count, blocked after 3 uses, limit message.

- **TC-AI-06 – Suggestion expiration**
  - Simulate a suggestion older than 24h (`isExpired = true`).
  - Expected: “Suggestion expired”, acceptance blocked, new generation available.

- **TC-AI-07 – Calibration mode (first 3 AI workouts)**
  - Verify the first 3 AI workouts are more conservative and varied.
  - Generate 3 AI suggestions of different types for a new user after onboarding.
  - Expected:
    - Varied types (e.g., not the same type 3 times).
    - Distance/time more conservative than onboarding average (e.g., not >120% of average distance).
    - Calibration message/hint (optional, if supported by UI).

- **TC-AI-08 – AI progression logic (10% increase)**
  - Verify progression after 3 positive ratings of the same workout type.
  - Setup: last 3 “Easy Run” workouts all rated “Just right” or “Too easy”.
  - Generate a new “Easy Run” suggestion.
  - Expected:
    - Suggested distance ~10% (±2%) above average of the last 3 workouts of this type.
    - Alternatively: time ~10% greater (if time-based logic).

- **TC-AI-09 – Pace suggestion accuracy based on history**
  - Verify suggested pace is realistic based on history.
  - Setup: several workouts with different average paces (e.g., 5:30 min/km, 6:00 min/km, 5:45 min/km).
  - Generate an AI suggestion.
  - Expected:
    - Step paces within a reasonable range of the user's average pace (e.g., ±15%).
    - Warm-up pace slower than main part.
    - Cool-down pace slower than main part.

#### 4.5 User Goals

- **TC-GOAL-01 – Set distance goal**
  - Visit `/goal`, select “I have a specific goal”.
  - Enter distance in km, future date, notes.
  - Expected: validation, goal saved, success toast.

- **TC-GOAL-02 – Goal validation**
  - Distance outside 0.1–1000 km, past date, >500 note characters.
  - Expected: errors, save blocked.

- **TC-GOAL-03 – “I run for health” mode**
  - Select “I run for health”, save.
  - Existing goal should be deleted from backend.

- **TC-GOAL-04 – Delete goal**
  - Click “Delete goal” and confirm in `Dialog`.
  - Expected: backend deletion, form reset, success message.

#### 4.6 Workout Actions and Rating

- **TC-WRK-01 – Complete workout from details**
  - For `planned`, click “✓ Complete workout”.
  - Enter distance (0.1–100 km), time (5 min–6 h), heart rate (0–240), date/time (not future).
  - Expected: validation, save, `completed` status, actual metrics populated.

- **TC-WRK-02 – Rate workout**
  - For `completed`, click “⭐ Rate workout”.
  - Select “Too easy/Just right/Too hard”.
  - Expected: rating saved, metrics refreshed with a Polish label.

- **TC-WRK-03 – Skip/Cancel from details**
  - For `planned`, use “Skip” and “Cancel” (with confirmation).
  - Expected: status changes in UI, appropriate data update.

#### 4.7 Preferences – Pace Unit

- **TC-PACE-01 – Change pace unit in user menu**
  - Open `UserMenu`, use `PaceUnitToggle`.
  - Expected: saved in `localStorage`, preserved on application reentry.

- **TC-PACE-02 – localStorage unavailable**
  - Incognito / browser with storage blocked.
  - Expected: no crash, default value used, console warning.

#### 4.8 Errors, Edge Cases, and Accessibility

- **TC-ERR-01 – Calendar API connection unavailable**
  - Simulate network error for `/api/v1/calendar`.
  - Expected: calendar error message with “Refresh”.

- **TC-ERR-02 – Unauthorized access**
  - Access `/`, `/goal`, `/onboarding` without a session.
  - Expected: redirect to `/login`.

- **TC-ACC-01 – Basic accessibility**
  - Check ARIA labels and focus order in dialogs and sheets (`Dialog`, `Sheet`).
  - Expected: main scenarios can be completed using keyboard alone.

### 5. Test Environment

- **Application configuration**
  - Node.js: `22.14.0` (according to `.nvmrc`).
  - Run modes:
    - `npm run dev` – quick local verification.
    - `npm run build` + `npm run preview` – E2E / regression environment.

- **Database (Supabase / Postgres)**
  - Dedicated **test Supabase project** or local Postgres with migrations applied:
    - `supabase/migrations/*`, `supabase/seed.sql` for initialization.
  - Separate credentials in `.env.test` (no production keys).

- **AI configuration (OpenRouter)**
  - Recommended for E2E:
    - mocked responses (e.g., service layer in `src/lib/services/aiSuggestionsService.ts` and/or MSW),
    - or a separate key with hard limits and deterministic models.

- **Browsers**
  - Playwright: Chromium, WebKit (optionally Firefox).
  - Resolutions:
    - desktop: 1440×900,
    - mobile: 390×844 (iPhone 13).

### 6. Testing Tools

- **Automated E2E tests**
  - **Playwright** (`tests/e2e/*`):
    - scenarios matching section 4,
    - run in CI after `npm run build`.

- **Unit/integration tests**
  - Proposed: **Vitest** + **React Testing Library**:
    - hook logic (`useCalendar`, `useDayWorkouts`, `useWorkoutDetail`),
    - validation and utilities (formatting, AI logic).

- **API tests**
  - `supertest` or `node-fetch` in the Astro Node test environment.
  - Alternatively: Playwright API tests (APIRequestContext).

- **Other**
  - **ESLint**, **Prettier**, Husky, lint-staged – quality gate.
  - **Supabase CLI** – migrations, seeds.
  - **MSW** (optional) – mocking selected endpoints in component tests.

### 7. Test Schedule

Based on the overall schedule (5 weeks):

- **Weeks 1–2**
  - Prepare test environment (test Supabase, CI).
  - Choose unit/integration framework (Vitest/Jest).
  - Design test cases (expand section 4 TCs in a test management tool).

- **Weeks 2–3**
  - Implement key E2E tests:
    - authentication (TC-AUTH-01 to TC-AUTH-07),
    - onboarding with sample data (TC-ONB-01 to TC-ONB-04),
    - basic calendar (TC-CAL-01 to TC-CAL-03).
  - Implement utility and validation unit tests.

- **Weeks 3–4**
  - Expand E2E to include:
    - AI suggestions - basic flow (TC-AI-01 to TC-AI-06),
    - advanced AI logic: calibration, progression, pace (TC-AI-07 to TC-AI-09),
    - user goals (TC-GOAL-01 to TC-GOAL-04),
    - workout actions (TC-WRK-01 to TC-WRK-03).
  - Add API integration tests (workouts, calendar, ai-suggestions, goals).
  - Basic performance/accessibility tests.

- **Weeks 4–5**
  - Full regression before release.
  - Stabilize flaky E2E tests (if any).
  - Review coverage and add missing critical cases.

### 8. Test Acceptance Criteria

- **Functional**
  - 100% E2E pass rate for:
    - registration/login/password reset (TC-AUTH-01 to TC-AUTH-07),
    - 3-workout onboarding with sample data checks (TC-ONB-01 to TC-ONB-04),
    - calendar/workout browsing (TC-CAL-01 to TC-CAL-07),
    - at least one full AI suggestion flow (generation–acceptance) (TC-AI-01 to TC-AI-06),
    - AI logic: calibration, progression, pace accuracy (TC-AI-07 to TC-AI-09),
    - goal setup/edit/delete (TC-GOAL-01 to TC-GOAL-04).
  - No open **critical** or **high** priority defects blocking main flows.

- **Quality**
  - No lint errors (`npm run lint`) on release branch.
  - No TypeScript errors in build.
  - No obvious accessibility violations (e.g., missing dialog focus, unlabeled buttons).

- **Coverage (indicative)**
  - Unit tests:
    - at least 60–70% line coverage for `src/lib/utils`, `src/lib/validation`, `src/lib/services/aiSuggestionsService.ts`.
  - E2E:
    - all main paths in section 4.

### 9. Roles and Responsibilities

- **QA Engineer**
  - Prepare and maintain test plan and cases.
  - Implement and maintain Playwright E2E tests.
  - Report defects and help reproduce them.

- **Developers**
  - Implement unit/integration tests for new functionality.
  - Maintain code quality (lint, types, refactoring).
  - Collaborate on root cause analysis.

- **Tech Lead / Architect**
  - Approve testing strategy.
  - Prioritize defect fixes.
  - Oversee CI/CD test integration.

- **Product Owner**
  - Define feature acceptance criteria.
  - Participate in UAT (user acceptance testing) for critical changes.

### 10. Defect Reporting Procedures

- **Tracking system**: GitHub Issues (or another selected tool).

- **Minimum issue fields**
  - Title: brief description (e.g., “[Calendar] Incorrect workout count in DayDrawer”).
  - Environment: application version (commit/branch), browser, environment type (dev/preview/prod).
  - Steps to reproduce (numbered list).
  - Expected result.
  - Actual result (screenshots / console logs / network trace, if available).
  - Severity: Blocker / High / Medium / Low.
  - Priority: P1 / P2 / P3.
  - Related test case ID (e.g., TC-AI-03).

- **Defect workflow**
  - Report: QA / Developer creates an issue with full description.
  - Triage: Tech Lead + PO prioritize and assign to a sprint.
  - Fix: developer creates a PR referencing the issue.
  - Verification: QA retests and runs regression if needed.
  - Close: mark issue “Done” after successful verification.

- **Aggregate reporting**
  - After each major test cycle (e.g., before release), prepare a brief report:
    - number of test cases executed,
    - defect count and status (by severity),
    - open risks and recommendations.
