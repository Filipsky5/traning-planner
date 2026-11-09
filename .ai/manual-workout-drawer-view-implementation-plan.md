## “Add Manually” Drawer View Implementation Plan

### 1. Overview

The **“Drawer: Add manually”** is a sliding panel on the main calendar (`/`) that lets users **manually add a workout**, either planned or already completed. Users select type and date and build the workout from segments (warm-up / main part / cool-down / segments). **Total distance and duration are calculated automatically from the steps**. The view integrates with `POST /api/v1/workouts`, uses the `training_types` dictionary, and refreshes the calendar and closes on success.

### 2. View Routing

- **Routing path**: no dedicated URL — the drawer is an **overlay on the calendar view** at `/`.
- **Activation**:
  - From `DayCell` (empty day): click `+` → `Dropdown` → **“Add manually”**.
  - Potentially elsewhere (e.g., global “Add” in mobile bottom navigation) — use the same `ManualWorkoutDrawer` with a supplied date.
- **Closing**:
  - Set `isOpen` to `false` (X, backdrop click, successful save).
  - Reset form state when closed.

### 3. Component Structure

Recommended component locations:

- View container: `src/components/calendar/ManualWorkoutDrawer.tsx`
- Form components: `src/components/workout/WorkoutPlanForm.tsx`, `src/components/workout/StepsEditor.tsx`, `src/components/workout/OptionalRealizationSection.tsx`

Proposed component tree:

```text
CalendarView.tsx
  └── ManualWorkoutDrawer (new)
        └── WorkoutPlanForm
              ├── WorkoutPlanBasicsSection
              │     ├── TrainingTypeSelect
              │     ├── PlannedDatePicker
              │     └── PositionInput (+ aggregated distance/time preview)
              ├── StepsEditor
              │     ├── StepRow[] (dynamic list)
              │     │     ├── SegmentTypeSelect (warmup/main/cooldown/segment)
              │     │     ├── DistanceInput (km)
              │     │     ├── DurationInput (mm:ss / hh:mm:ss)
              │     │     └── TargetHrInput + NotesInput (optional)
              └── OptionalRealizationSection
                    ├── CompletedToggle (“Workout already completed”)
                    ├── RealizedDistanceInput (km)
                    ├── RealizedDurationInput (time)
                    ├── AvgHrInput
                    ├── CompletedAtDateTimePicker
                    └── RatingSelect (too_easy / just_right / too_hard)
```

### 4. Component Details

#### 4.1 `ManualWorkoutDrawer`

- **Component description**: Drawer container based on `Sheet` from `shadcn/ui`. Responsible for:
  - controlling panel visibility,
  - passing input data (default date, default type, available `trainingTypes`),
  - calendar integration (`refetch` on success),
  - basic error handling (view-level messages).
- **Main elements**:
  - `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`.
  - `WorkoutPlanForm` as the only child.
- **Supported interactions**:
  - `onOpenChange(isOpen: boolean)` – close panel.
  - `onSubmitSuccess` callback – called after successful creation (with `WorkoutDetailDto`).
- **Validation**: no detailed validation — delegated to `WorkoutPlanForm`.
- **Types used**:
  - `TrainingTypeDto` – workout type list.
  - `WorkoutDetailDto` – creation API response (for potential UI use).
  - `ManualWorkoutFormValues` (form ViewModel — section 5).
- **Props**:
  - `isOpen: boolean` – whether the drawer is open.
  - `onOpenChange: (open: boolean) => void` – close handler (set from `CalendarView`).
  - `initialDate: Date` – selected calendar cell date.
  - `trainingTypes: TrainingTypeDto[]` – active workout types (from `useCalendar`).
  - `onWorkoutCreated?: (workout: WorkoutDetailDto) => void` – optional callback (e.g., toast + calendar `refetch`).

#### 4.2 `WorkoutPlanForm`

- **Component description**: Main React form (`react-hook-form` + `zodResolver`) handling all logic:
  - local form ViewModel (`ManualWorkoutFormValues`),
  - dynamic steps list (`steps`),
  - total distance/time conversion into API values (`planned_distance_m`, `planned_duration_s`),
  - conditional completion fields (“Workout already completed”),
  - submission — `POST /api/v1/workouts`.
- **Main HTML / UI elements**:
  - Basic plan fields (`WorkoutPlanBasicsSection`),
  - `StepsEditor` (segment list),
  - `OptionalRealizationSection` (completion fields),
  - Global error bar (e.g., `Alert` with API message),
  - “Save” (primary) and “Cancel” buttons.
- **Supported interactions**:
  - Change form fields (type, date, position, steps, completion section).
  - Add/remove a segment.
  - Submit form (`onSubmit`).
  - Cancel — close without saving.
- **Validation conditions (matching the API)**:
  - `trainingTypeCode`:
    - required, non-empty, from `trainingTypes` (dropdown effectively eliminates invalid values).
  - `plannedDate`:
    - required, converted to `YYYY-MM-DD` (e.g., with the `formatDate` helper used in `useCalendar`).
  - `position`:
    - integer `>= 1`,
    - defaults to `max(existingPositions) + 1` for the day (calculated in parent or helper),
    - uniqueness cannot be checked on the frontend — handle conflicts (`409 duplicate_position`) as API errors.
  - `steps`:
    - at least 1 step,
    - each step: `part` in `["warmup", "main", "cooldown", "segment"]`,
    - each step must have **at least one** of distance or time (UI requires distance _or_ time; both allowed),
    - mapped to `WorkoutStepDto` (`distance_m?: number`, `duration_s?: number`, `notes?: string`).
  - **Aggregated plan**:
    - `planned_distance_m` = sum of all step `distance_m` values (ignoring `undefined`),
    - `planned_duration_s` = sum of all step `duration_s` values,
    - total validation:
      - `planned_distance_m` in `[100, 100000]`,
      - `planned_duration_s` in `[300, 21600]`,
      - out-of-range totals block submission (e.g., “Total distance must be between 0.1 km and 100 km”).
  - **Completion (optional section)**:
    - if `isCompleted === false`:
      - ignore completion fields, omit `status` and actual metrics → API treats workout as `planned`.
    - if `isCompleted === true`:
      - completion fields required according to `completeWorkoutSchema` / `createWorkoutSchema`:
        - `distance_m` (displayed as km in UI, converted to m, range `[100, 100000]`),
        - `duration_s` (seconds, UI as hh:mm:ss, range `[300, 21600]`),
        - `avg_hr_bpm` (integer `[0, 240]`),
        - `completed_at` (ISO 8601, UI: local `DateTime`, converted to UTC),
      - optional `rating` (enum `too_easy | just_right | too_hard`), matching `WorkoutRateCommand`.
- **Types used**:
  - `WorkoutStepDto` – target step format.
  - `WorkoutCreatePlannedCommand` / `WorkoutCreateCompletedCommand` – conceptual mapping basis (formally using validation's `CreateWorkoutInput`).
  - `ManualWorkoutFormValues` – form ViewModel (section 5).
- **Props**:
  - `trainingTypes: TrainingTypeDto[]`
  - `initialDate: Date`
  - `onCancel: () => void`
  - `onSubmitSuccess: (workout: WorkoutDetailDto) => void`

#### 4.3 `WorkoutPlanBasicsSection`

- **Component description**: General plan fields — type, date, position + automatically calculated distance/time preview.
- **Main elements**:
  - `Select` (`shadcn/ui`) with `trainingTypes` (label = `name`, `value` = `code`).
  - `DatePicker` (e.g., based on `react-day-picker`) — default selected date from `initialDate`.
  - Numeric `Input` for `position` (default `1` or `nextPosition` calculated from the day cell).
  - `Read-only` label/text showing `Total distance` and `Total time` (calculated in `WorkoutPlanForm`, passed as props).
- **Supported interactions**:
  - Change workout type.
  - Change date (reschedule to another day if needed).
  - Change position (e.g., 1 to 2 if multiple workouts on the day).
- **Validation**:
  - According to `WorkoutPlanForm` rules — a presentation-only component receiving and displaying `react-hook-form` errors.
- **Types**:
  - Props: subset of `ManualWorkoutFormValues` (`trainingTypeCode`, `plannedDate`, `position`) and aggregated `totalPlannedDistanceKm`, `totalPlannedDurationFormatted`.

#### 4.4 `StepsEditor`

- **Component description**: Dynamic workout step editor. Each step describes one part (warm-up / main / cool-down / segment).
- **Main elements**:
  - `StepRow` list (`useFieldArray` from `react-hook-form`), each in a separate card/row.
  - **“Add segment”** `Button`, adding a step with defaults (e.g., part=`main`).
  - Optional up/down buttons for future reordering.
- **Supported interactions**:
  - Add a new step.
  - Remove a step (validate that at least one remains).
  - Change segment type (`warmup` | `main` | `cooldown` | `segment`).
  - Change distance (km) and/or time (minutes/seconds).
  - Change “planned heart rate” (numeric field) and `notes` (additional description).
- **Validation (per step)**:
  - `part` – required enum value.
  - `distanceKm` – optional; if provided, must meet `[100, 100000]` after conversion to meters.
  - `durationTotalSeconds` – optional; if provided, must be in `[60, 21600]` (a step may be shorter than a full workout).
  - “anyOf” validation: **at least one of** `distance` or `duration` must be provided. If both empty — row error.
  - `targetHrBpm` – optional number `[0, 240]`. Not present in `WorkoutStepDto`, so mapped into `notes` (e.g., `HR: 140 bpm;` + optional description).
- **DTO mapping**:
  - Each `StepRow` maps to:
    - `part`: `StepPart`
    - `distance_m`: `distanceKm * 1000` (rounded to `int`), or `undefined`.
    - `duration_s`: total seconds (from time control), or `undefined`.
    - `notes`: string with optional heart rate information + additional text.
- **Types**:
  - `ManualWorkoutStepForm` (ViewModel in section 5).

#### 4.5 `OptionalRealizationSection`

- **Component description**: Optionally enters completion data immediately (distance, time, avg. HR, rating). Partially covers the user story for manually adding completed workouts.
- **Main elements**:
  - `Switch` / `Checkbox`: **“This workout is already completed”** → sets `isCompleted`.
  - Fields visible only when `isCompleted === true`:
    - Distance `Input` (km) – prefilled from `totalPlannedDistanceKm` by default.
    - `TimeInput` (e.g., three `hh:mm:ss` fields or one time control) – prefilled from `totalPlannedDurationSec` by default.
    - `Input` `avg_hr_bpm` (bpm).
    - `DateTimePicker` for `completed_at` (default `now`).
    - `RatingSelect` (e.g., `RadioGroup` with three options).
- **Supported interactions**:
  - Toggle completion section.
  - Edit completion fields.
- **Validation**:
  - As in `WorkoutPlanForm`:
    - if `isCompleted === true`, all completion fields (except rating) are required and must meet ranges.
    - if `isCompleted === false`, no section errors and no completion fields sent to the API.
- **Types**:
  - Subset of `ManualWorkoutFormValues`: `isCompleted`, `realizedDistanceKm`, `realizedDurationSec`, `avgHrBpm`, `completedAt`, `rating`.

### 5. Types

#### 5.1 Existing Types from `src/types.ts`

- **`WorkoutStepDto`**:
  - `part: "warmup" | "main" | "cooldown" | "segment"`
  - `distance_m?: number`
  - `duration_s?: number`
  - `notes?: string`
- **`WorkoutCreatePlannedCommand` / `WorkoutCreateCompletedCommand`**:
  - Target models for form submission data (according to `createWorkoutSchema`).
- **`WorkoutDetailDto`**:
  - Result of `POST /api/v1/workouts` (fields such as `id`, `planned_date`, `status`, `steps`, etc.).
- **`TrainingTypeDto`**:
  - `code`, `name`, `is_active`, `created_at`.

#### 5.2 New ViewModel Types

> Note: ViewModels are frontend-local, allowing convenient work with units (km, minutes, Date). Mapping functions convert them to API types.

- **`ManualWorkoutStepForm`** – individual form step type:

```typescript
type StepPart = "warmup" | "main" | "cooldown" | "segment";

interface ManualWorkoutStepForm {
  id: string; // local UI identifier (e.g., uuid)
  part: StepPart;
  distanceKm?: number; // distance in km (e.g., 1.0, 5.0)
  durationMinutes?: number; // minutes (optional, to build duration_s)
  durationSeconds?: number; // additional seconds (0–59)
  targetHrBpm?: number; // optional: planned heart rate 0–240
  notes?: string; // additional user description
}
```

- **`ManualWorkoutFormValues`** – main form ViewModel:

```typescript
interface ManualWorkoutFormValues {
  trainingTypeCode: string; // from TrainingTypeDto.code
  plannedDate: Date; // UI uses Date, mapped to YYYY-MM-DD
  position: number; // workout order in a day

  steps: ManualWorkoutStepForm[]; // dynamic step list

  // Derived display-only fields (not sent directly to the API)
  totalPlannedDistanceKm: number; // sum of distanceKm
  totalPlannedDurationSec: number; // sum of seconds

  // Completion section (optional)
  isCompleted: boolean;
  realizedDistanceKm?: number;
  realizedDurationSec?: number;
  avgHrBpm?: number;
  completedAt?: Date;
  rating?: "too_easy" | "just_right" | "too_hard";
}
```

- **Mapping `ManualWorkoutFormValues` → `CreateWorkoutInput` (API)**:
  - `training_type_code = trainingTypeCode`
  - `planned_date = plannedDate` in `YYYY-MM-DD` format (helper).
  - `position = position`
  - `planned_distance_m = Math.round(totalPlannedDistanceKm * 1000)`
  - `planned_duration_s = totalPlannedDurationSec`
  - `steps = ManualWorkoutStepForm[]` mapped to `WorkoutStepDto[]`
  - if `isCompleted === true`:
    - `status = "completed"`
    - `distance_m = Math.round(realizedDistanceKm * 1000)`
    - `duration_s = realizedDurationSec`
    - `avg_hr_bpm = avgHrBpm`
    - `completed_at = completedAt.toISOString()`
    - `rating` – if set
  - if `isCompleted === false`:
    - omit `status` and completion fields (API defaults to `status="planned"`).

### 6. State Management

- **State in `CalendarView`**:
  - New variables:
    - `isManualDrawerOpen: boolean`
    - `selectedManualDate: Date | null`
  - New handlers:
    - `openManualDrawer(date: Date)` – set `selectedManualDate` and open.
    - `closeManualDrawer()` – reset state and close.
  - `DayCell` already accepts `onAddWorkoutManual` — connect `openManualDrawer`.

- **State in `ManualWorkoutDrawer`**:
  - No long-lived state — uses `WorkoutPlanForm`'s internal `react-hook-form` state.
  - May store:
    - `apiError: string | null` – server error message.
    - `isSubmitting: boolean` – disables form during submission.

- **State in `WorkoutPlanForm`**:
  - Managed by `useForm<ManualWorkoutFormValues>()`:
    - `steps` as `useFieldArray`.
    - Watch `steps` to recalculate `totalPlannedDistanceKm` and `totalPlannedDurationSec`.
    - Watch `isCompleted` to validate completion section.

- **Potential custom hook**:
  - `useManualWorkoutForm(initialDate: Date, initialTrainingTypeCode?: string)`:
    - Initializes `useForm` with sensible defaults:
      - `plannedDate = initialDate`,
      - `steps` with one `warmup` or `main` step,
      - `position` = `1` or `nextPosition`.
    - Provides `handleSubmit`, `addStep`, `removeStep`, calculates totals.
    - May be in the same file as `WorkoutPlanForm` or in `src/components/hooks`.

### 7. API Integration

- **Endpoints used by the view**:
  - `GET /api/v1/training-types`
    - Not called from `ManualWorkoutDrawer` — types already fetched by `useCalendar` and passed as `trainingTypes`.
    - Response type: `ApiListResponse<TrainingTypeDto>`.
  - `POST /api/v1/workouts`
    - Called from `WorkoutPlanForm` on submission.
    - **Body (planned)** – mapped from `ManualWorkoutFormValues`:
      - `training_type_code`
      - `planned_date`
      - `position`
      - `planned_distance_m`
      - `planned_duration_s`
      - `steps`
    - **Body (completed)** – additionally:
      - `status: "completed"`
      - `distance_m`
      - `duration_s`
      - `avg_hr_bpm`
      - `completed_at`
      - `rating?`
    - **Request type**: `CreateWorkoutInput` (Zod from `src/lib/validation/workouts.ts` — in JS, ensure fields meet ranges).
    - **Response type (success)**: `ApiResponse<WorkoutDetailDto>`.
    - **Error codes**:
      - `401 unauthorized` – global redirect to `/login` (handled by middleware).
      - `404 not_found` (`INVALID_TRAINING_TYPE`) – should not occur with a dropdown.
      - `409 duplicate_position` – position conflict on the same day.
      - `422 validation_error` – data validation errors.
      - `500 internal_error` – unexpected server error.

- **Client layer**:
  - Add a helper in `src/lib/api/workoutsClient.ts`, e.g., `createWorkout(request: CreateWorkoutInput): Promise<WorkoutDetailDto>`, following existing clients (`getWorkoutById`, `completeWorkout`).
  - `WorkoutPlanForm` uses this helper instead of raw `fetch`, maintaining consistent error handling (`ApiError`).

- **Refresh calendar on success**:
  - After successful `POST /workouts`, `ManualWorkoutDrawer` calls:
    - `onWorkoutCreated(workout)` → in `CalendarView`:
      - show “Workout added” toast,
      - call `refetch()` from `useCalendar()` to fetch `/api/v1/calendar` again.

### 8. User Interactions

- **Click `+` → “Add manually” in an empty day cell**:
  - `DayCell` calls `onAddWorkoutManual(day.date)`.
  - `CalendarView`:
    - sets `selectedManualDate = date`,
    - `isManualDrawerOpen = true`.
  - Drawer opens with `plannedDate` defaulting to the selected date.

- **Complete form**:
  - User:
    - selects workout type,
    - optionally changes date/position,
    - adds steps with the appropriate parts, time, distance, and planned heart rate,
    - optionally selects “Workout already completed” and enters actual metrics.
  - UI:
    - automatically updates total planned distance/time,
    - immediately shows validation errors for invalid values (e.g., missing step distance/time, out-of-range values).

- **Submit form (“Save”)**:
  - `WorkoutPlanForm` runs local validation.
  - If no errors:
    - builds `CreateWorkoutInput`,
    - sends `POST /api/v1/workouts`,
    - shows `isSubmitting` (disabled buttons, button spinner).
  - On successful save:
    - calls `onSubmitSuccess(workout)`,
    - `ManualWorkoutDrawer` closes (`onOpenChange(false)`),
    - `CalendarView` refetches calendar data.

- **Cancel**:
  - Clicking “Cancel” closes (`onOpenChange(false)`) without an API call.
  - Form state resets on the next opening.

### 9. Conditions and Validation

- **Frontend form validation**:
  - Based on a local `zod` schema or `react-hook-form` rules mirroring `createWorkoutSchema`:
    - all plan fields (`trainingTypeCode`, `plannedDate`, `position`, `steps`) required,
    - range validation for distance/time/HR,
    - `steps` validation (anyOf distance or duration, at least 1 item),
    - conditional completion validation (only if `isCompleted === true`).
- **Field dependencies**:
  - step changes automatically update `totalPlannedDistanceKm` and `totalPlannedDurationSec`; out-of-range totals show a global error (e.g., above “Save”).
  - `position` remains editable, but UI may warn via tooltip about a potential duplicate position.
- **API-consistent validation**:
  - convert units (m, s) and formats (`YYYY-MM-DD`, ISO 8601) before submission.
  - omit fields the API does not understand (e.g., `targetHrBpm` flattened into `notes`).

### 10. Error Handling

- **Server validation (422)**:
  - `ApiError` contains `error.details` with Zod errors.
  - `WorkoutPlanForm`:
    - maps errors to corresponding fields where possible,
    - displays a general message at the top (e.g., “Invalid workout data”).

- **Position conflict (409 `duplicate_position`)**:
  - Show a toast or form banner: “A workout already has this position on the selected date. Change the position or delete the existing workout.”
  - Highlight `position` as invalid.

- **401 / no session**:
  - Handled globally by middleware — user redirects to `/login`.

- **Network/500 errors**:
  - Show “An unexpected server error occurred. Please try again later.”
  - Retain form data so the user can retry without losing entries.

- **Edge cases**:
  - No available `trainingTypes` (e.g., fetching error in `useCalendar`):
    - do not open, or show “Could not load workout types” with a retry button.
  - `selectedManualDate` in the past — allowed (historical workout entry), but UI may show a subtle hint.

### 11. Implementation Steps

1. **Prepare types**
   - Add `ManualWorkoutStepForm` and `ManualWorkoutFormValues` (e.g., `src/types/workoutForms.ts` or locally in `WorkoutPlanForm.tsx`).
   - Ensure `TrainingTypeDto`, `WorkoutDetailDto`, `WorkoutStepDto` imports from `src/types.ts` are available.

2. **Implement mapping helpers**
   - Create functions:
     - `mapStepFormToDto(step: ManualWorkoutStepForm): WorkoutStepDto`
     - `mapFormValuesToCreateWorkoutInput(values: ManualWorkoutFormValues): CreateWorkoutInput`
   - Correctly convert units (km → m, hh:mm:ss → s) and insert `targetHrBpm` into `notes`.

3. **Implement `WorkoutPlanForm`**
   - Create with `react-hook-form` (`useForm`, `useFieldArray`) and a local validation schema.
   - Calculate totals (`totalPlannedDistanceKm`, `totalPlannedDurationSec`) from `steps`.
   - Handle submission: call API client `createWorkout`, pass result to `onSubmitSuccess`.
   - Add field errors and a general error banner.

4. **Implement `StepsEditor` and `StepRow`**
   - Use `useFieldArray` to render steps with add/remove buttons.
   - Each step offers type selection and distance/time/HR fields.

5. **Implement `OptionalRealizationSection`**
   - Add `isCompleted` and actual metric fields, prefilled from plan totals.
   - Ensure conditional validation and field mapping on submit.

6. **Implement `ManualWorkoutDrawer`**
   - Base on `Sheet` from `shadcn/ui` (like `AISuggestionDrawer` and `WorkoutDetailDrawer`).
   - Render `WorkoutPlanForm` inside with `trainingTypes` and `initialDate`.
   - Handle `onSubmitSuccess` (close + callback to `CalendarView`).

7. **Integrate `CalendarView`**
   - Add `isManualDrawerOpen` and `selectedManualDate` state.
   - Implement `handleAddWorkoutManual(date: Date)` opening the drawer instead of `alert`.
   - Add `<ManualWorkoutDrawer>` alongside existing drawers (Day, AI, WorkoutDetail), passing `trainingTypes` and `refetch`.

8. **Handle errors and toasts**
   - Use the existing toast mechanism, or add a simple `ToastManager` for success/error messages if absent.
   - Specifically handle `409 duplicate_position` and general server errors.

9. **Manual testing and UX**
   - Check flows:
     - simple planned workout (1 step),
     - multiple-step workout (distance/time totals),
     - completed workout (HR and rating),
     - invalid values (excessive distance/time, missing step distance/time),
     - position conflict (force by manually changing `position`).
   - Ensure successful creation appears on the correct calendar day and position.

10. **Refactoring and reuse (optional)**
    - Consider reusing `WorkoutPlanForm` / `StepsEditor` in future editing or onboarding views to avoid form logic duplication.
