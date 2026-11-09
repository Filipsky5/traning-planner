## UI Architecture for Traning Planner

### 1. UI Structure Overview

- **Stack and rendering approach**
  - Astro 5 (SSR + React 19 islands).
  - TanStack Query for server state with SSR prefetch and de/rehydration.
  - Local UI state in React (drawers, forms, selections).
- **Main view**
  - Weekly calendar (default), switch to month (grid of complete weeks).
  - SSR for the week + prefetch of the adjacent week.
- **Navigation**
  - Mobile: bottom navigation (“Calendar”, “Add”, “Goal”).
  - Desktop: 2-column layout (left sidebar: navigation + goal progress bar; Main: views and panels).
- **Modal interactions**
  - Drawer as the primary interaction container: Day Drawer (workout list), AI Drawer (generation/acceptance), “Add manually” Drawer.
  - No URL parameter routing for drawers (overlay on the current view).
- **Data and cache**
  - TanStack Query keys:
    - ["training-types"] (ETag, staleTime 1h),
    - ["calendar", start, end, status] (staleTime 1h),
    - ["workout", id],
    - ["workouts","last3", type?] (staleTime 30s),
    - ["ai","suggestions", date?, type?] (staleTime 30s).
  - refetchOnWindowFocus: always; retry: 2 (except 4xx).
  - Optimistic updates: accept/regenerate, rate/skip/cancel + immediate invalidation of related keys.
- **A11y**
  - Calendar grid: role="grid"/"row"/"gridcell", arrow keys move focus, day labels.
  - shadcn/ui (Radix) with focus trap; "Skip to content"; :focus-visible; do not rely on color alone (icon + text).
- **Security**
  - Supabase Auth; 401 → SSR redirect to `/login?next=...`; 403 → toast (no sensitive data).
  - No client-side service-role use. CSRF mitigated through the `Content-Type: application/json` header and same-site cookies in SSR.
- **Units and presentation**
  - Distance: km (conversion ↔ m for the API).
  - Time: segmented (mm:ss / h:mm:ss).
  - Pace: global min/km ↔ km/h toggle (in the user menu).

### 2. View List

#### View: Calendar

- **Path**: `/`
- **Main goal**: Plan overview and quick workout actions in a day/week/month context.
- **Key information**:
  - Day grid with workouts, status (planned/completed/skipped/canceled), workout type, origin (AI badge), “+” for empty days.
  - “Week/Month” toggle; persistent desktop sidebar with goal progress.
- **Key view components**:
  - CalendarHeader (week/month navigation, range toggle, DatePicker).
  - CalendarGrid (role="grid"), DayCell (role="gridcell", “+”).
  - WorkoutCard (status, type, AI badge, quick actions).
  - DayDrawer (day list, “+2 more”).
  - AISuggestionDrawer (opened from “+” or the AI button).
- **UX, accessibility, security**:
  - Grid loading skeletons; spinners only for actions.
  - Keyboard: arrows between cells, Enter opens the Drawer, Esc closes it.
  - 401 → redirect; 403 → toast; 410 (“Expired”) → disabled with tooltip; 429 → disabled + Retry-After.
- **Related API**:
  - GET `/api/v1/calendar?start=&end=&status?`
  - GET `/api/v1/training-types` (If-None-Match, ETag, 304)

#### View: Onboarding (3 recent workouts)

- **Path**: `/onboarding`
- **Main goal**: Enter exactly 3 completed workouts as initial data.
- **Key information**:
  - Steps 1–3: distance (km), time (segments), avg. heart rate, date/time; example hints.
  - Message about the application's purpose and the option to add a goal later.
- **Key view components**:
  - Stepper (3 steps), WorkoutCompletedForm (segmented time, validation).
  - “Finish” CTA → redirect to `next` or `/`.
- **UX, accessibility, security**:
  - SSR gating on `/`: when <3, redirect to `/onboarding?next=/`.
  - A11y: clear field labels, Tab order, validation messages.
- **Related API**:
  - POST `/api/v1/workouts` (status=completed, metrics required)

#### View: Workout Details

- **Path**: `/workouts/[id]`
- **Main goal**: Full insight into and operations on a single workout.
- **Key information**:
  - Plan vs completion, steps (warmup/main/cooldown), pace, rating.
  - Origin (AI/manual/import), linked AI suggestion (if applicable).
- **Key view components**:
  - WorkoutDetailPanel (in Main on desktop; full-screen on mobile).
  - Actions: Complete, Skip, Cancel, Rate; Edit (metrics/plan – limited).
- **UX, accessibility, security**:
  - Immediate Skip/Cancel actions (irreversible in the MVP) + toast.
  - Rating available only for completed workouts.
- **Related API**:
  - GET `/api/v1/workouts/{id}`; POST `/complete`, `/skip`, `/cancel`, `/rate`

#### View: User Goal

- **Path**: `/goal`
- **Main goal**: Set/edit a single user goal (MVP).
- **Key information**:
  - Goal type (e.g., distance_by_date), target_distance_m, due_date, notes.
  - Sidebar progress bar based on completed workouts.
- **Key view components**:
  - GoalForm (GET/PUT), GoalProgress (in the sidebar + expandable details).
- **UX, accessibility, security**:
  - Simple validation (positive values, future date).
- **Related API**:
  - GET/PUT/DELETE `/api/v1/user-goal`

#### Drawer: Daily Overview (Day List)

- **Path**: overlay on `/` (no URL change)
- **Main goal**: Review and manage workouts for a given day.
- **Key information**:
  - Workout list (collapsed/expanded), “+2 more” → full list in the Drawer.
- **Key view components**:
  - DayDrawerList, WorkoutCard (compact), QuickActions (skip/cancel).
- **Related API**:
  - GET `/api/v1/workouts?planned_date_*`

#### Drawer: AI Suggestion

- **Path**: overlay on `/` (no URL change)
- **Main goal**: Generate and accept an AI suggestion for the selected day/type.
- **Key information**:
  - Type and date form (prefilled from the day cell), resulting suggestion (steps, total distance/time), “Expired” badge if applicable.
  - Regeneration counter (max 3/day UTC).
- **Key view components**:
  - AISuggestionForm (POST generate), SuggestionPreview (metadata + steps), AcceptControls (position).
  - RegenerateControls with limit; ExpiredBadge; ConflictDialog (409).
- **UX, accessibility, security**:
  - 410 → read-only state + “Generate new” CTA.
  - 409 (position conflict) → dialog to select a new position or cancel.
- **Related API**:
  - POST `/api/v1/ai/suggestions`, GET `/ai/suggestions/{id}`
  - POST `/ai/suggestions/{id}/accept`, `/reject`, `/regenerate`

#### Drawer: Add Manually

- **Path**: overlay on `/` (no URL change)
- **Main goal**: Manually add a planned or completed workout.
- **Key information**:
  - Plan fields: type, date, position, planned_distance_m, planned_duration_s, steps (optional).
  - Completion fields (optional): distance_m, duration_s, avg_hr_bpm, completed_at, rating.
- **Key view components**:
  - WorkoutPlanForm, StepsEditor (minimal schema), OptionalRealizationSection.
- **Related API**:
  - POST `/api/v1/workouts`

#### View: Settings (User Menu)

- **Path**: overlay/popover (menu), globally available
- **Main goal**: Pace display toggle (min/km ↔ km/h), link to “Goal”.
- **Key information**:
  - Current pace unit (persisted in localStorage).
- **Key view components**:
  - UserMenu, PaceUnitToggle.

### 3. User Journey Map

1. New user (Onboarding)

- Visits `/` → SSR gating → redirect to `/onboarding?next=/`.
- Steps 1–3: enters 3 completed workouts → POST `/workouts`.
- After completion → redirect to `next` (usually `/`).

2. AI planning (main use case)

- On `/`, selects a day → “+” → AI Drawer.
- Selects a type (prefilled from popular types / last3), date prefilled → POST `/ai/suggestions`.
- Reviews the suggestion (steps, metadata, AI badge). If too hard → POST `/regenerate` (limit 3/day per date).
- Accepts with a selected `position` (next available by default) → POST `/accept`.
  - On 409 → ConflictDialog to change the position.
- After acceptance: invalidate calendar + suggestions; no “Customize” option (MVP).

2. Manual Planning

- On `/`, selects a day → “+” → dropdown with the Add manually option.
- Can select a workout type (`training_types` table) and date; duration is calculated automatically.
- The workout plan section has a + button to add a segment; each segment requires selecting its type (`warmup` | `main` | `cooldown`), duration, and distance in kilometers.
- After acceptance: invalidate calendar + suggestions; no “Customize” option (MVP).

3. Completion and rating

- After completing a workout → from `/workouts/[id]` details → Complete/Rate, or Skip/Cancel from cards in the calendar/Day Drawer.
- Rate (too_easy/just_right/too_hard) → immediate update and invalidation of last3 and calendar.

4. User goal

- Opens `/goal` from the bottom navigation / sidebar.
- Sets a goal → PUT `/user-goal`; sees progress in the sidebar.

5. Errors and exceptional states

- 401 → redirect `/login?next=...`.
- 403 → “Access denied” toast.
- 410 (suggestion expired) → disabled actions in the AI Drawer + “Generate new” CTA.
- 429 → disabled actions and respect `Retry-After`.

### 4. Navigation Layout and Structure

- **Mobile**
  - Header: logo, user menu button (Settings/Logout).
  - Bottom navigation:
    - Calendar (`/`),
    - Add (opens choice: Manual/AI; if <3 → `/onboarding?next=/`),
    - Goal (`/goal`).
  - Full-screen drawers (AI, Day, Add).
- **Desktop**
  - 2-column layout:
    - Sidebar (left): navigation (Calendar, Goal), GoalProgress (expandable).
    - Main (right): calendar/content + detail panels.
  - Drawers as side panels (AI, Day, Add).
- **Routing**
  - Routed views: `/`, `/onboarding`, `/workouts/[id]`, `/goal`.
  - Interactions: drawers without URL changes (UI state).

### 5. Key Components (Reusable)

- **CalendarHeader**: date navigation, mode toggle, integrated DatePicker (react-day-picker).
- **CalendarGrid / DayCell**: role="grid"/"gridcell", keyboard support, day status indicators.
- **WorkoutCard**: status, type, AI badge, quick actions (skip/cancel), icons + text.
- **DayDrawer**: daily workout list, “+2 more”, access to actions and details.
- **AISuggestionDrawer**: form (type, date), steps preview, Accept/Regenerate (limit 3/day per date), ExpiredBadge, ConflictDialog.
- **WorkoutPlanForm**: planned fields, range validation (according to the API).
- **WorkoutCompletedForm**: completion metrics, rating.
- **StepsEditor**: simple step editor (warmup/main/cooldown/segment) according to the minimal schema.
- **GoalForm / GoalProgress**: goal CRUD + progress visualization (total completed distance vs target).
- **DatePicker**: consistent picker (react-day-picker) everywhere.
- **UserMenu / PaceUnitToggle**: global pace setting (persisted).
- **ToastManager**: error and success messages (403/409/410/429 – according to policy).
- **QueryBoundary**: skeletons and data state retry.

### Compliance with the API Plan and Requirements

- All UI operations map 1:1 to REST endpoints in the API plan (including AI acceptance/regeneration, workout domain actions, ETag for `training-types`).
- Error states and messages match codes: 401/403/409/410/429; the UI respects headers (If-None-Match/ETag, Cache-Control, Retry-After).
- Progression/calibration logic runs on the backend; the UI provides the correct context (last 3, type, date) and presents results.

### Mapping PRD Stories → UI Elements

- Onboarding with 3 workouts → `/onboarding` + Stepper + WorkoutCompletedForm.
- AI generation → AISuggestionDrawer (opened from DayCell “+”).
- Accept/Reject/Regenerate → AcceptControls/RegenerateControls + limit 3/day per planned_date.
- Workout management → Day Drawer, `/workouts/[id]`, domain actions (complete/skip/cancel/rate).
- Main calendar → `/` with week/month, type icons/colors, “+” for empty days.
- Rating system → Rating in details/completed; affects subsequent suggestions (backend).
- User goal → `/goal` + GoalProgress in the sidebar.

### Edge Cases and Error States

- <3 workouts → gating to `/onboarding`.
- Suggestion expired (24h) → “Expired” badge, disabled actions, “Generate new” CTA.
- `position` conflict → dialog to reorder/select a position; guidance for resolving it.
- 429 → disable CTA, show time according to `Retry-After`, automatically enable after the wait/refresh.
- 304 for `training-types` → do not replace data; lightweight refresh.
- No workouts on a day → clear empty state + “Add”/“AI”.
