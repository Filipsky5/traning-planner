# User Goal View Implementation Plan

## 1. Overview

The "User Goal" view (`/goal`) lets users define, edit, and delete their main training goal. In the MVP, the only supported goal type is running a specified distance by a specific date (`distance_by_date`). The view also collects information about users without a specific goal who "run for health", for future application personalization.

The interface consists of a form initially populated with API data. Users can update or delete their goal, or declare that they have no specific goal.

## 2. View Routing

The view will be available at:

- **Path**: `/goal`
- **File**: `src/pages/goal.astro`

## 3. Component Structure

The view will be a React island (`client:load`) inside an Astro page. Component hierarchy:

```
src/layouts/Layout.astro
└── src/pages/goal.astro
    └── src/components/views/GoalView.tsx (Main React component)
        ├── Common/LoadingSpinner.tsx (Loading indicator)
        ├── Common/ErrorMessage.tsx (Error message)
        └── features/goal/GoalForm.tsx (Goal form)
            ├── ui/RadioGroup.tsx (Goal type selection)
            ├── ui/Input.tsx (Distance, Notes)
            ├── ui/DatePicker.tsx (Date)
            └── ui/Button.tsx (Save, Delete)
```

## 4. Component Details

### `GoalView.tsx`

- **Component description**: Main view container. Handles API communication, state (loading, errors, goal data), and rendering appropriate children (`LoadingSpinner`, `ErrorMessage`, `GoalForm`).
- **Main elements**: Uses `useUserGoal` to fetch data. Conditionally renders a loading indicator, error message, or `GoalForm`.
- **Supported interactions**: No direct interactions. Passes save and delete functions to `GoalForm`.
- **Validation**: None.
- **Types**: `UserGoalDto`, `ApiError`.
- **Props**: None.

### `GoalForm.tsx`

- **Component description**: Form for managing a user goal. Allows choosing a distance or general goal ("running for health"), editing goal details, and deleting it.
- **Main elements**:
  - `Card` (Shadcn) as the container.
  - `RadioGroup` to choose: "I have a specific goal (distance)" vs "I run for health".
  - Conditionally visible form fields (`Input`, `DatePicker`, `Textarea` from Shadcn) for distance, date, and notes.
  - Save `Button` and delete `Button` (`destructive` variant).
- **Supported interactions**:
  - `onSubmit`: Validates data and invokes `saveGoal` or `deleteGoal` from `GoalView`.
  - `onDelete`: Displays a confirmation modal, then calls `deleteGoal`.
  - `RadioGroup` change: Shows or hides distance goal fields.
- **Validation**:
  - **Distance**: Must be positive and no more than 1000 km. Message: "Distance must be between 0.1 and 1000 km".
  - **Date**: Must be today or in the future. Message: "Date cannot be in the past".
  - **Notes**: Maximum 500 characters. Message: "Notes can contain up to 500 characters".
- **Types**: `GoalFormViewModel`, `UserGoalDto`, `UserGoalUpsertDto`.
- **Props**:
  ```typescript
  interface GoalFormProps {
    initialGoal: UserGoalDto | null;
    isSubmitting: boolean;
    onSave: (data: UserGoalUpsertDto) => Promise<void>;
    onDelete: () => Promise<void>;
  }
  ```

## 5. Types

Implementation requires existing DTO types and a new form ViewModel type.

- **`UserGoalDto` (from `src/types.ts`)**: Represents the goal object retrieved from the API.
  ```typescript
  export interface UserGoalDto {
    id: string;
    user_id: string;
    goal_type: "distance_by_date";
    target_distance_m: number;
    due_date: string; // Format: YYYY-MM-DD
    notes: string | null;
    created_at: string;
  }
  ```
- **`UserGoalUpsertDto` (from `src/lib/validation/userGoals.ts`)**: Represents the object sent to the API (`PUT`).
  ```typescript
  export interface UserGoalUpsertDto {
    goal_type: "distance_by_date";
    target_distance_m: number;
    due_date: string; // Format: YYYY-MM-DD
    notes?: string;
  }
  ```
- **`GoalFormViewModel` (new type)**: Represents internal `GoalForm` state.
  ```typescript
  interface GoalFormViewModel {
    // Indicates which RadioGroup option the user selected
    goalChoice: "distance" | "health";

    // Stored as a string for easier validation and input handling
    target_distance_km: string;

    // Uses Date for compatibility with DatePicker
    due_date: Date | undefined;

    // Notes as a string
    notes: string;
  }
  ```

## 6. State Management

State management will be centralized in the custom `useUserGoal` hook to separate data fetching and API communication from UI components.

- **`useUserGoal.ts`**:
  - **Goal**: Abstract business logic related to the user goal.
  - **Internal state**:
    - `goal: UserGoalDto | null | undefined` (`undefined` - initial/loading state, `null` - no goal, `UserGoalDto` - goal exists)
    - `isLoading: boolean`
    - `error: ApiError | null`
  - **Returned functions**:
    - `goal`, `isLoading`, `error`
    - `saveGoal(data: UserGoalUpsertDto): Promise<void>`: Executes `PUT /api/v1/user-goal`.
    - `deleteGoal(): Promise<void>`: Executes `DELETE /api/v1/user-goal`.
  - **Logic**: Inside the hook, `useEffect` fetches initial data (`GET`). `saveGoal` and `deleteGoal` wrap `fetch` calls, manage `isLoading` and `error`, and update `goal` after a successful operation.

## 7. API Integration

Integration uses `useUserGoal` and covers three endpoints:

- **`GET /api/v1/user-goal`**:
  - **Action**: Called on the first `GoalView` render to fetch the current goal.
  - **Response type**: `ApiResponse<UserGoalDto | null>`.
- **`PUT /api/v1/user-goal`**:
  - **Action**: Called by `saveGoal` after submitting the form with a distance goal selected.
  - **Request type (body)**: `UserGoalUpsertDto`.
  - **Response type**: `ApiResponse<UserGoalDto>`.
- **`DELETE /api/v1/user-goal`**:
  - **Action**: Called by `deleteGoal` after confirming deletion or saving with "I run for health" (when a goal previously existed).
  - **Response type**: `204 No Content`.

## 8. User Interactions

- **User visits `/goal`**:
  1. The application displays `LoadingSpinner`.
  2. Sends `GET /api/v1/user-goal`.
  3. After the response, populates `GoalForm` with data (if a goal exists) or displays defaults.
- **User selects "I run for health"**:
  - Form fields (distance, date, notes) are hidden or disabled.
  - Saving this state sends `DELETE` if a goal previously existed.
- **User selects "I have a specific goal (distance)"**:
  - Form fields become visible and active.
- **User clicks "Save"**:
  1. Client-side validation runs.
  2. If validation fails, errors appear beside the relevant fields.
  3. If validation passes, `GoalFormViewModel` data is transformed into `UserGoalUpsertDto` (e.g., km to meters).
  4. Sends `PUT`. The "Save" button is `disabled` with `LoadingSpinner`.
  5. On success, displays "Goal saved!" toast and updates local state.
- **User clicks "Delete goal"**:
  1. Displays a confirmation modal.
  2. After confirmation, sends `DELETE`.
  3. On success, displays "Goal deleted!" toast and clears the form.

## 9. Conditions and Validation

Client-side validation will be implemented in `GoalForm`, most likely using `react-hook-form` with a `Zod` resolver for backend consistency.

- **Condition 1: Distance** (`target_distance_km`)
  - **Check**: `value > 0 && value <= 1000`.
  - **UI**: If the condition fails, the input gets a red border and an error below it. "Save" is disabled.
- **Condition 2: Date** (`due_date`)
  - **Check**: `value >= today`.
  - **UI**: `DatePicker` prevents selecting past dates. An invalid date produces a red border and a message below the field.
- **Condition 3: Notes** (`notes`)
  - **Check**: `value.length <= 500`.
  - **UI**: A character counter may appear below `Textarea`. Exceeding the limit displays an error.

## 10. Error Handling

- **Data fetching error (GET)**: If `useUserGoal` returns an error, `GoalView` displays `ErrorMessage` with "Could not load the goal. Try refreshing the page."
- **Save/delete error (PUT/DELETE)**:
  - **Server error (5xx)**: `useUserGoal` sets error state. `GoalView` displays a global toast: "A server error occurred. Please try again later."
  - **Validation error (422)**: Should not occur with correct frontend validation, but handled as a server error if it does.
  - **No network connection**: `fetch` throws an error caught by `useUserGoal`. Display toast: "No internet connection. Check your connection and try again."

## 11. Implementation Steps

1.  **Create the Astro page**: Create `src/pages/goal.astro` importing and rendering `GoalView` with `client:load`.
2.  **Create `GoalView`**: Create `src/components/views/GoalView.tsx`. Add conditional rendering structure (loading, error, form).
3.  **Implement `useUserGoal`**: Create `src/lib/hooks/useUserGoal.ts`. Implement fetching (`GET`), saving (`PUT`), and deleting (`DELETE`) goals with loading and error state.
4.  **Create `GoalForm`**: Create `src/components/features/goal/GoalForm.tsx`. Build the form layout with Shadcn/ui (`Card`, `RadioGroup`, `Input`, `DatePicker`, `Button`).
5.  **Integrate `react-hook-form`**: Add `react-hook-form` and `zod` to `GoalForm` for form state and validation. Define the Zod schema for `GoalFormViewModel`.
6.  **Connect components**: In `GoalView`, use `useUserGoal` and pass data, `saveGoal`, and `deleteGoal` to `GoalForm` as props.
7.  **Implement interaction logic**: Add `RadioGroup` handling, `onSubmit` ViewModel-to-DTO transformation, and the deletion confirmation modal.
8.  **Styling and UX**: Refine styles with Tailwind CSS. Add toasts (e.g., Shadcn `sonner`) for successful saves/deletions and errors. Ensure button loading states work correctly.
9.  **Manual testing**: Test all scenarios: page loading, no goal, existing goal, creation, update, deletion, field validation, and API error handling.
