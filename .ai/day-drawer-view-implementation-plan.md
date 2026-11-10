# Day Drawer View Implementation Plan

## 1. Overview

The "Day Drawer" is a sliding panel (drawer/sheet) for displaying and managing all workouts planned for a specific day selected by the user. It provides quick access to the workout list without leaving the main calendar view, which is essential when a day contains multiple workouts. The view also supports quick actions such as skipping or canceling a workout.

## 2. View Routing

The view will not have a dedicated URL. It will render as an overlay component on the main calendar view at `/`. Visibility will be controlled by parent component state.

## 3. Component Structure

The component hierarchy will use React and `shadcn/ui` for consistency with the rest of the application.

```
- CalendarView (parent component managing state)
  - DayDrawer (container component based on `shadcn/ui/Sheet`)
    - DayDrawerContent (presentation component)
      - Header (title with date)
      - LoadingSpinner (displayed while loading data)
      - ErrorMessage (displayed on API error)
      - WorkoutList (workout list)
        - WorkoutCard (compact workout card)
          - QuickActions (quick action buttons)
```

## 4. Component Details

### DayDrawer

- **Component description:** Main view container built with `Sheet` from `shadcn/ui`. Manages open/closed state, receives the selected date, and initiates API data fetching through the custom `useDayWorkouts` hook.
- **Main elements:** `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from `shadcn/ui`.
- **Supported interactions:** Open panel, close panel (button, gesture, or outside click).
- **Validation:** None.
- **Types:** `WorkoutSummaryDto` (for the workout list).
- **Props:**
  - `selectedDate: string | null` - Selected date in `YYYY-MM-DD` format. The Drawer is visible when the date is not `null`.
  - `onOpenChange: (isOpen: boolean) => void` - Callback to control visibility from the parent component.

### DayDrawerContent

- **Component description:** Renders content inside the drawer. Displays a date header and, depending on state (loading, error, success), a spinner, error message, or workout list.
- **Main elements:** `div` with conditional logic, `LoadingSpinner`, `ErrorMessage`, and `WorkoutList` components.
- **Supported interactions:** None.
- **Validation:** None.
- **Types:** `WorkoutSummaryDto[]`.
- **Props:**
  - `date: string`
  - `workouts: WorkoutSummaryDto[]`
  - `isLoading: boolean`
  - `error: Error | null`

### WorkoutList

- **Component description:** Renders a list of `WorkoutCard` components from the supplied workout array.
- **Main elements:** `ul`, `li`, or `div` mapping over the workout array.
- **Supported interactions:** None (delegates handling to `WorkoutCard`).
- **Validation:** None.
- **Types:** `WorkoutSummaryDto[]`.
- **Props:**
  - `workouts: WorkoutSummaryDto[]`

### WorkoutCard (Compact Variant)

- **Component description:** Displays a compact summary of one workout, including type (name and color), planned distance/time, status, and `QuickActions`.
- **Main elements:** `Card` from `shadcn/ui`, `div`, `span`, `Badge`, and `Button` components.
- **Supported interactions:** Card click (navigate to details), action clicks in `QuickActions`.
- **Validation:** Quick action availability depends on workout status (e.g., `status === 'planned'`).
- **Types:** `WorkoutSummaryDto`.
- **Props:**
  - `workout: WorkoutSummaryDto`

## 5. Types

The view will directly use the existing `WorkoutSummaryDto` type from `src/types.ts`. No new types or `ViewModel` models are needed.

- **`WorkoutSummaryDto`**:
  - `id: string` - Unique identifier.
  - `training_type_code: string` - Workout type code (e.g., "easy", "long_run").
  - `planned_date: string` - Date in `YYYY-MM-DD` format.
  - `position: number` - Workout order within the day.
  - `planned_distance_m: number | null` - Planned distance.
  - `planned_duration_s: number | null` - Planned time.
  - `status: 'planned' | 'completed' | 'skipped' | 'canceled'` - Workout status.
  - `origin: 'manual' | 'ai' | 'import'` - Workout origin.
  - `rating: 'too_easy' | 'just_right' | 'too_hard' | null` - Rating.
  - `avg_pace_s_per_km: number | null` - Average pace.

## 6. State Management

A dedicated custom `useDayWorkouts` hook will encapsulate data fetching, loading state, and error handling.

- **`useDayWorkouts(date: string | null)`**:
  - **Goal:** Abstract business logic for fetching workouts for a given day.
  - **Managed state:** `workouts: WorkoutSummaryDto[]`, `isLoading: boolean`, `error: Error | null`.
  - **Logic:** Uses `useEffect` to call the API when the `date` prop changes. Manages loading and error states. May also expose functions for optimistic UI updates (e.g., removing a workout from the list after cancellation).

Drawer visibility (`isOpen`) and the selected date (`selectedDate`) will be managed in the parent component (e.g., `CalendarView`) to enable calendar/drawer interaction.

## 7. API Integration

The component will communicate with one API endpoint.

- **Endpoint:** `GET /api/v1/workouts`
- **Request type:**
  - **Method:** `GET`
  - **Query parameters:**
    - `planned_date_gte`: `YYYY-MM-DD` (selected date)
    - `planned_date_lte`: `YYYY-MM-DD` (same selected date)
    - `per_page`: `50` (a large value to fetch all workouts for the day without pagination)
- **Response type (success):** `ApiListResponse<WorkoutSummaryDto>`
- **Response type (error):** `{ error: { code: string, message: string } }`

## 8. User Interactions

- **User clicks a calendar day:** Opens `DayDrawer`, passing the clicked date.
- **User clicks the close button or backdrop:** Closes `DayDrawer`.
- **User clicks a workout card:** Navigates to the workout's full detail view (implementation outside this plan's scope).
- **User clicks "Skip" on a workout card:** Calls `POST /api/v1/workouts/{id}/skip`, then updates the workout status in the UI.
- **User clicks "Cancel" on a workout card:** Calls `POST /api/v1/workouts/{id}/cancel`, then removes the workout from the UI list.

## 9. Conditions and Validation

- **Condition:** `selectedDate` must be a valid `YYYY-MM-DD` date for a valid API query. The calendar component ensures this.
- **UI validation:** `QuickActions` (containing "Skip" and "Cancel" buttons) renders these buttons only when `workout.status === 'planned'`. They are hidden for other statuses.

## 10. Error Handling

- **Network or server error (e.g., 500):** `useDayWorkouts` catches the error. `DayDrawerContent` displays a generic error message (e.g., "Could not load workouts. Please try again later.") with a retry button.
- **Unauthenticated (401):** The application should have a global 401 handler redirecting the user to the login page.
- **No workouts:** If the API returns an empty list (`total: 0`), `DayDrawerContent` displays an informational message, e.g., "No workouts planned for this day."

## 11. Implementation Steps

1.  **Create the custom `useDayWorkouts` hook:** Implement data fetching from `GET /api/v1/workouts` with appropriate parameters (`planned_date_gte`, `planned_date_lte`), loading state, and error handling.
2.  **Create presentation components:** Build `DayDrawerContent`, `WorkoutList`, and a compact `WorkoutCard` using `shadcn/ui` and Tailwind CSS.
3.  **Implement `QuickActions`:** Add "Skip" and "Cancel" buttons to `WorkoutCard`, conditionally rendered based on workout status.
4.  **Create the `DayDrawer` container:** Integrate `shadcn/ui/Sheet`, `useDayWorkouts`, and presentation components.
5.  **Integrate with the calendar view:** Add `selectedDate` state management to the parent component (e.g., `CalendarView`). Clicking a calendar day should set the date, opening and populating `DayDrawer`. Handle closing the drawer (set `selectedDate` to `null`).
6.  **Implement action logic:** Connect API calls (`skip`, `cancel`) to `QuickActions` buttons and update the UI after a successful response.
7.  **Handle edge cases:** Ensure the UI handles loading, error, and no-workout states correctly.
8.  **Styling and visual refinement:** Match component styles to the rest of the application, including workout type colors.
9.  **Manual testing:** Test the entire flow: opening, closing, data loading, quick actions, and responsiveness.
