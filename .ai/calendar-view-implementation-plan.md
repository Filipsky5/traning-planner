# Calendar View Implementation Plan

## 1. Overview

The calendar view is the application's main screen for reviewing the training plan. It visualizes planned and completed workouts by week or month, allows quick addition of AI-generated workouts, and supports managing existing workouts.

## 2. View Routing

The view should be available at the application's root path:

- **Path**: `/`
- **Astro component**: `src/pages/index.astro`
- **React component**: `src/components/views/CalendarView.tsx` (as a `client:load` island)

## 3. Component Structure

The calendar component hierarchy will be:

```
src/pages/index.astro
└── CalendarView.tsx (React Island)
    ├── useCalendar.ts (Custom Hook)
    ├── CalendarHeader.tsx
    │   ├── Button (Previous period)
    │   ├── Button (Next period)
    │   ├── DatePicker (Date selection)
    │   └── Switch (Week/Month)
    ├── CalendarGrid.tsx
    │   └── DayCell.tsx[]
    │       ├── DropdownMenu (+)
    │       │   ├── MenuItem (Generate with AI)
    │       │   └── MenuItem (Add manually)
    │       └── WorkoutCard.tsx[]
    ├── DayDrawer.tsx (conditionally rendered)
    │   └── WorkoutCard.tsx[]
    └── AISuggestionDrawer.tsx (conditionally rendered)
```

## 4. Component Details

### `CalendarView.tsx`

- **Component description**: Main calendar container. Manages all state through `useCalendar`, fetches data, and renders children.
- **Main elements**: `<CalendarHeader />`, `<CalendarGrid />`, `<DayDrawer />`, `<AISuggestionDrawer />`.
- **Supported interactions**: No direct interactions; delegates handling to children.
- **Validation**: None.
- **Types**: `CalendarViewModel`, `TrainingTypeDto[]`.
- **Props**: None.

### `CalendarHeader.tsx`

- **Component description**: Calendar navigation bar with period navigation buttons, view toggle, and date selector.
- **Main elements**: `Button`, `Switch`, `DatePicker` from `shadcn/ui`.
- **Supported interactions**:
  - Click "Previous"/"Next" (`onPeriodChange`).
  - Switch "Week"/"Month" (`onViewModeChange`).
  - Select a date in `DatePicker` (`onDateSelect`).
- **Validation**: `DatePicker` validates date format.
- **Types**: No specific types.
- **Props**:
  ```typescript
  interface CalendarHeaderProps {
    currentDate: Date;
    viewMode: "month" | "week";
    onPeriodChange: (direction: "prev" | "next") => void;
    onViewModeChange: (mode: "month" | "week") => void;
    onDateSelect: (date: Date) => void;
  }
  ```

### `CalendarGrid.tsx`

- **Component description**: Grid displaying day cells for the selected period (week/month). Handles rendering all days in the range.
- **Main elements**: `<div>` with `grid` role, dynamically generated `<DayCell />` list.
- **Supported interactions**: Keyboard navigation (arrows) between cells.
- **Validation**: None.
- **Types**: `DayCellViewModel[]`.
- **Props**:
  ```typescript
  interface CalendarGridProps {
    days: DayCellViewModel[];
    onAddWorkout: (date: Date) => void;
    onAddWorkoutManual?: (date: Date) => void;
    onOpenDay: (day: DayCellViewModel) => void;
  }
  ```

### `DayCell.tsx`

- **Component description**: Represents one grid day. Displays workout cards (`WorkoutCard`) or a `+` menu to choose how to add a workout.
- **Main elements**: `<div>` with `gridcell` role, `<WorkoutCard />` list, `<DropdownMenu />` (`+`) with "Generate with AI" and "Add manually", `+N more` indicator.
- **Supported interactions**:
  - Clicking `+` opens a dropdown with:
    - "Generate with AI" (`onAddWorkout`) - opens the AI suggestion panel
    - "Add manually" (`onAddWorkoutManual`) - opens the manual entry form (implementation in progress)
  - Clicking the cell or `+N more` opens `DayDrawer` (`onOpenDay`).
- **Validation**: Checks workout count to decide whether to show `+N more`.
- **Types**: `DayCellViewModel`.
- **Props**:
  ```typescript
  interface DayCellProps {
    day: DayCellViewModel;
    onAddWorkout: (date: Date) => void;
    onAddWorkoutManual?: (date: Date) => void;
    onOpenDay: (day: DayCellViewModel) => void;
  }
  ```

### `WorkoutCard.tsx`

- **Component description**: Small card for one workout. Shows type (color and name), status, and a badge if AI-generated.
- **Main elements**: `<Card />`, `<Badge />` from `shadcn/ui`.
- **Supported interactions**: Clicking the card may open details in the future. Contains a context menu (`DropdownMenu`) with actions (e.g., "Complete", "Skip").
- **Validation**: None.
- **Types**: `WorkoutViewModel`.
- **Props**:
  ```typescript
  interface WorkoutCardProps {
    workout: WorkoutViewModel;
  }
  ```

## 5. Types

### DTO (Data Transfer Objects) - API Types

- `CalendarDto`: `{ range: { start: string; end: string }; days: CalendarDayDto[] }`
- `CalendarDayDto`: `{ date: string; workouts: CalendarWorkoutItemDto[] }`
- `CalendarWorkoutItemDto`: `{ id: string; training_type_code: string; status: "planned" | "completed" | ...; position: number }`
- `TrainingTypeDto`: `{ code: string; name: string; ... }`

### ViewModels - View-Specific Types

- **`WorkoutViewModel`**: Extends `CalendarWorkoutItemDto` with full workout type data and an assigned color.
  ```typescript
  interface WorkoutViewModel extends CalendarWorkoutItemDto {
    trainingType: TrainingTypeDto;
    color: string; // e.g., 'bg-blue-500', 'text-green-500'
  }
  ```
- **`DayCellViewModel`**: Aggregates data for one calendar grid cell.
  ```typescript
  interface DayCellViewModel {
    date: Date;
    dateString: string; // YYYY-MM-DD
    isToday: boolean;
    isCurrentMonth: boolean;
    workouts: WorkoutViewModel[];
  }
  ```

## 6. State Management

A custom `useCalendar` hook will manage calendar logic and state.

### `useCalendar(initialDate: Date)`

- **Goal**: Encapsulate data fetching, view state (date, mode), and error handling.
- **Managed state**:
  - `viewDate: Date`: Reference date for the current view.
  - `viewMode: 'month' | 'week'`: Current display mode.
  - `calendarDays: DayCellViewModel[]`: Processed day list for the grid.
  - `isLoading: boolean`: API loading flag.
  - `error: ApiError | null`: Error object for API problems.
  - `isDayDrawerOpen`, `isAiDrawerOpen`: Side panel visibility flags.
  - `selectedDay: DayCellViewModel | null`: Data for the day open in `DayDrawer`.
- **Public functions**:
  - `setPeriod(direction: 'prev' | 'next')`: Changes to the previous/next period.
  - `setViewMode(mode: 'month' | 'week')`: Changes view mode.
  - `setDate(date: Date)`: Sets a specific date.
  - `openDayDrawer(day: DayCellViewModel)`: Opens the daily workout list panel.
  - `openAiDrawer(date: Date)`: Opens AI suggestion generation.
  - `refetch()`: Allows manual data refresh.

## 7. API Integration

- **Fetch calendar data**:
  - **Endpoint**: `GET /api/v1/calendar`
  - **Action**: Called on initialization and whenever `viewDate` or `viewMode` changes.
  - **Request Query Params**: `{ start: string; end: string; }` (e.g., `start=2025-11-01&end=2025-11-30`).
  - **Response Body**: `ApiResponse<CalendarDto>`.
- **Fetch workout types**:
  - **Endpoint**: `GET /api/v1/training-types`
  - **Action**: Called once when `useCalendar` initializes.
  - **Request Headers**: The frontend should implement `If-None-Match` with `ETag` to cache responses.
  - **Response Body**: `ApiListResponse<TrainingTypeDto>`.

## 8. User Interactions

- **Change period**: Clicking arrows in `CalendarHeader` invokes `useCalendar`'s `setPeriod`, recalculating the date range and fetching data again.
- **Change view**: Selecting "Week" or "Month" in `CalendarHeader` calls `setViewMode`, changing mode and fetching the new range.
- **Add workout**: Clicking `+` in `DayCell` opens a dropdown with two options:
  - **"Generate with AI"**: Calls `openAiDrawer` from `useCalendar`, opening `AISuggestionDrawer` for the selected date.
  - **"Add manually"**: Calls `handleAddWorkoutManual`, which currently displays a placeholder alert (manual entry form implementation in progress).
- **Review day**: Clicking a day with multiple workouts (`+N more`) calls `openDayDrawer`, opening `DayDrawer` with all workouts for that day.
- **Keyboard navigation**: Arrow keys in `CalendarGrid` move focus to adjacent `DayCell` cells.

## 9. Conditions and Validation

- **Date range**: `useCalendar` generates valid dates (`start`, `end` as `YYYY-MM-DD`) from `viewDate` and `viewMode`.
- **Display `+N more`**: `DayCell` checks whether `workouts.length` exceeds a defined limit (e.g., 2). If so, renders a shortened list and indicator.
- **Empty days**: `DayCell` renders the `+` dropdown with workout creation options if `workouts.length === 0`.
- **Days outside the month**: `DayCell` receives `isCurrentMonth` and renders a muted style accordingly.
- **Today**: `DayCell` receives `isToday` and highlights it (e.g., border or background).

## 10. Error Handling

- **Loading data**: While fetching (`isLoading === true`), display `Skeleton` components (`shadcn/ui`) on the calendar grid.
- **API errors**:
  - **401 Unauthorized**: The application should catch this globally and redirect to login.
  - **403 Forbidden**: Display a `Toast` indicating access is denied.
  - **422 Unprocessable Entity**: Log validation errors (e.g., invalid date format) in the developer console; optionally show a subtle user message.
  - **5xx Server Error**: Display a general error (`Toast` or dedicated error component) asking the user to try again later.
- **No data**: If the API returns no workouts, the calendar displays empty cells with `+` buttons, as expected.

## 11. Implementation Steps

1. **Create file structure**: Create `src/pages/index.astro`, `src/components/views/CalendarView.tsx`, subcomponents (`CalendarHeader`, `CalendarGrid`, `DayCell`, `WorkoutCard`), and `src/hooks/useCalendar.ts`.
2. **Implement `useCalendar`**: Implement state, date/view changes, and fetching/caching from `/api/v1/training-types` and `/api/v1/calendar`.
3. **Build `CalendarView`**: Integrate `useCalendar` and pass state/actions to children.
4. **Build `CalendarHeader`**: Create navigation, connecting user interactions to `useCalendar` functions.
5. **Build `CalendarGrid` and `DayCell`**: Implement day grid rendering. `DayCell` should display workouts, `+`, or `+N more` according to props.
6. **Build `WorkoutCard`**: Display `WorkoutViewModel` data and map `training_type_code` to a color.
7. **Handle side panels (`Drawer`)**: Open `DayDrawer` and `AISuggestionDrawer` according to `useCalendar` state.
8. **Styling and UX**: Apply TailwindCSS styles, loading skeletons, and highlights for today and days outside the month.
9. **Keyboard navigation**: Implement arrow key support in `CalendarGrid`.
10. **Testing and fixes**: Test all interactions, error handling, and edge cases (e.g., a month without workouts, a day with many workouts).
