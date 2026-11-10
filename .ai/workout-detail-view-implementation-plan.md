# Workout Detail View Implementation Plan

## 1. Overview

The workout detail view is the central place for managing a single workout. It shows planned and actual metrics and workout structure (steps), and supports key actions: marking a workout completed, skipped, or canceled, and rating it. The view is fully dynamic and adapts available actions to the current workout status.

## 2. View Routing

The view will use a dynamic route:

- **Path**: `/workouts/[id]`
- **File**: `src/pages/workouts/[id].astro`

The Astro page extracts `id` from the URL and passes it as a prop to the main client-rendered React component.

## 3. Component Structure

Components will use React with TypeScript, Tailwind CSS, and `shadcn/ui`.

```
src/pages/workouts/[id].astro
└── src/components/views/WorkoutDetailView.tsx (client:load)
    ├── hooks/useWorkoutDetail.ts
    ├── WorkoutMetrics.tsx
    ├── WorkoutSteps.tsx
    ├── WorkoutActions.tsx
    │   ├── CompleteWorkoutDialog.tsx
    │   └── RateWorkoutDialog.tsx
    └── ui/
        ├── Skeleton.tsx
        ├── Card.tsx
        ├── Button.tsx
        └── Dialog.tsx
```

## 4. Component Details

### `WorkoutDetailView.tsx`

- **Description**: Main view container. Fetches workout data by `id`, manages state (loading, error, data), and renders children.
- **Main elements**:
  - Uses `useWorkoutDetail` for business logic.
  - Renders `Skeleton` while loading.
  - Displays an error message for API problems.
  - Renders `WorkoutMetrics`, `WorkoutSteps`, and `WorkoutActions`, passing processed workout data (`WorkoutViewModel`) and action handlers.
- **Supported interactions**: None directly. Delegates actions to children.
- **Types**: `WorkoutViewModel`
- **Props**: `{ workoutId: string }`

### `WorkoutMetrics.tsx`

- **Description**: Presents key workout metrics, comparing planned and actual values (if available).
- **Main elements**:
  - `Card` with `CardHeader` and `CardContent`.
  - "Plan" and "Completion" sections.
  - Numeric display: distance (km), time (hh:mm:ss), average heart rate, average pace (min/km), rating.
- **Supported interactions**: None.
- **Types**: `WorkoutViewModel`
- **Props**: `{ workout: WorkoutViewModel }`

### `WorkoutSteps.tsx`

- **Description**: Displays workout steps (warm-up, main part, cool-down).
- **Main elements**:
  - `Card` component.
  - Step list with each item's `part`, `duration_s`, and/or `distance_m`.
- **Supported interactions**: None.
- **Types**: `WorkoutStepDto[]`
- **Props**: `{ steps: WorkoutStepDto[] }`

### `WorkoutActions.tsx`

- **Description**: Action button panel. Buttons render conditionally based on workout status.
- **Main elements**:
  - `Button` from `shadcn/ui` for each action.
  - "Complete" opens `CompleteWorkoutDialog`.
  - "Rate" opens `RateWorkoutDialog`.
  - "Skip" and "Cancel" execute actions immediately.
- **Supported interactions**: `onComplete`, `onRate`, `onSkip`, `onCancel`.
- **Validation conditions**:
  - "Complete", "Skip", "Cancel" visible only for `status === 'planned'`.
  - "Rate" visible only for `status === 'completed'`.
- **Types**: `WorkoutViewModel`
- **Props**: `{ workout: WorkoutViewModel, onComplete: (data) => void, onRate: (data) => void, onSkip: () => void, onCancel: () => void }`

### `CompleteWorkoutDialog.tsx`

- **Description**: Dialog with a form for completed workout metrics.
- **Main elements**:
  - `Dialog` with `DialogContent`, `DialogHeader`, `DialogFooter`.
  - Form (`react-hook-form`) with: `distance_m`, `duration_s`, `avg_hr_bpm`, `completed_at`, `rating`.
- **Supported interactions**: `onSubmit`.
- **Validation conditions**: All fields required (`zod` schema `completeWorkoutSchema`).
- **Types**: `CompleteWorkoutCommand`
- **Props**: `{ open: boolean, onOpenChange: (open) => void, onSubmit: (data) => void }`

### `RateWorkoutDialog.tsx`

- **Description**: Dialog for rating a completed workout.
- **Main elements**:
  - `Dialog` with `DialogContent`.
  - Buttons or `RadioGroup` to select: `too_easy`, `just_right`, `too_hard`.
- **Supported interactions**: `onRateSelect`.
- **Validation conditions**: One of the three ratings must be selected.
- **Types**: `WorkoutRateCommand`
- **Props**: `{ open: boolean, onOpenChange: (open) => void, onSubmit: (data) => void }`

## 5. Types

### DTO (Data Transfer Object)

- **`WorkoutDetailDto`**: Directly from `src/types.ts`. Mirrors the `GET /api/v1/workouts/{id}` response.

### ViewModel

- **`WorkoutViewModel`**: Object created on the frontend to simplify display.

```typescript
interface WorkoutViewModel {
  id: string;
  status: "planned" | "completed" | "skipped" | "canceled";
  origin: "manual" | "ai" | "import";
  rating: "too_easy" | "just_right" | "too_hard" | null;

  // Fields formatted for display
  plannedDateFormatted: string; // "DD.MM.YYYY"
  completedAtFormatted: string | null; // "DD.MM.YYYY HH:mm"
  plannedDistanceFormatted: string; // "X.XX km"
  distanceFormatted: string | null; // "X.XX km"
  plannedDurationFormatted: string; // "HH:mm:ss"
  durationFormatted: string | null; // "HH:mm:ss"
  avgPaceFormatted: string | null; // "X:XX min/km"
  avgHr: number | null;

  // Fields for logic
  steps: WorkoutStepDto[];
  canBeCompleted: boolean;
  canBeRated: boolean;
  canBeSkipped: boolean;
  canBeCanceled: boolean;
}
```

## 6. State Management

Business logic will be encapsulated in the custom `useWorkoutDetail` hook.

### `useWorkoutDetail(workoutId: string)`

- **Goal**: Encapsulate data fetching, loading/error state, and workout actions.
- **Returns**:
  ```typescript
  {
    workout: WorkoutViewModel | null;
    isLoading: boolean;
    error: Error | null;
    completeWorkout: (data: CompleteWorkoutCommand) => Promise<void>;
    rateWorkout: (data: WorkoutRateCommand) => Promise<void>;
    skipWorkout: () => Promise<void>;
    cancelWorkout: () => Promise<void>;
    refetch: () => void;
  }
  ```
- **Logic**:
  - Uses `useEffect` to fetch data on initialization.
  - Stores `workout`, `isLoading`, `error` with `useState`.
  - After each successful mutation (e.g., `completeWorkout`), calls `refetch` to synchronize with the server.

## 7. API Integration

Integration uses the `fetch` API inside `useWorkoutDetail`.

- **Fetch data**:
  - `GET /api/v1/workouts/{id}`
  - **Response**: `ApiResponse<WorkoutDetailDto>`
- **Complete workout**:
  - `POST /api/v1/workouts/{id}/complete`
  - **Request**: `CompleteWorkoutCommand` (`{ distance_m, duration_s, avg_hr_bpm, completed_at, rating }`)
  - **Response**: `ApiResponse<WorkoutDetailDto>`
- **Rate workout**:
  - `POST /api/v1/workouts/{id}/rate`
  - **Request**: `WorkoutRateCommand` (`{ rating }`)
  - **Response**: `ApiResponse<WorkoutDetailDto>`
- **Skip workout**:
  - `POST /api/v1/workouts/{id}/skip`
  - **Request**: None (empty body)
  - **Response**: `ApiResponse<WorkoutDetailDto>`
- **Cancel workout**:
  - `POST /api/v1/workouts/{id}/cancel`
  - **Request**: None (empty body)
  - **Response**: `ApiResponse<WorkoutDetailDto>`

## 8. User Interactions

- **Visit page**: Display `Skeleton` and fetch data. Once loaded, show metrics and appropriate action buttons.
- **Click "Complete"**: Open `CompleteWorkoutDialog`. User completes and submits the form. On API success, refresh the view, change status to "completed", and show actual metrics.
- **Click "Rate"**: Open `RateWorkoutDialog`. User selects a rating. On API success, show it in metrics.
- **Click "Skip" / "Cancel"**: Execute immediately. Display a confirmation toast and refresh the view with the new status.

## 9. Conditions and Validation

- **`WorkoutActions.tsx`**: Uses `WorkoutViewModel` flags such as `canBeCompleted`, `canBeRated`, etc., to render buttons conditionally, preventing invalid actions.
- **`CompleteWorkoutDialog.tsx`**: Uses `zod` and `react-hook-form` with `completeWorkoutSchema` from `src/lib/validation/workouts.ts`. Validation includes:
  - Required `distance_m`, `duration_s`, `avg_hr_bpm`, `completed_at`.
  - Numeric values within specified ranges (e.g., `min`, `max`).
- **`RateWorkoutDialog.tsx`**: Ensures the selected rating is an allowed enum value.

## 10. Error Handling

- **404 (Not Found)**: `WorkoutDetailView` displays "Workout not found" with a return-to-calendar button.
- **401 (Unauthorized)**: A global handler should redirect to login.
- **409 (Conflict)**: Occurs for an action in an invalid state (e.g., completing an already completed workout). `useWorkoutDetail` catches it and the UI shows a Toast (e.g., "The workout is no longer planned").
- **422 (Validation)**: `CompleteWorkoutDialog` validation errors appear directly below the relevant fields.
- **Other server errors (5xx)**: Display a generic error with "Try again", calling `useWorkoutDetail`'s `refetch`.

## 11. Implementation Steps

1. **Create files**: Create component, hook, and Astro page files in appropriate directories (`src/pages/workouts/`, `src/components/views/`, `src/components/hooks/`).
2. **Implement Astro page**: Create `src/pages/workouts/[id].astro`, extracting URL `id` and rendering `WorkoutDetailView` with `client:load`.
3. **Implement `useWorkoutDetail`**: Add `GET` fetching, `loading`/`error` state, and empty action handlers.
4. **Implement `WorkoutDetailView`**: Connect the hook, display `Skeleton`, and handle errors.
5. **Implement `WorkoutMetrics` and `WorkoutSteps`**: Create presentation components receiving `WorkoutViewModel` data.
6. **Implement `WorkoutActions`**: Create conditionally rendered action buttons.
7. **Implement `CompleteWorkoutDialog`**: Build a form with `react-hook-form` and `zod` validation.
8. **Implement `RateWorkoutDialog`**: Build a simple rating selection dialog.
9. **Integrate API in hook**: Implement `complete`, `rate`, `skip`, `cancel` calls. Call `refetch` after each success.
10. **Handle errors and toasts**: Add API error handling and success/failure toasts.
11. **Final styling and tests**: Refine Tailwind CSS styling and manually test all user paths.
