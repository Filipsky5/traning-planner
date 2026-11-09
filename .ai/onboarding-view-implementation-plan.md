# Onboarding View Implementation Plan

## 1. Overview

The Onboarding view collects data about a new user's three most recent workouts. This information provides an initial basis for AI to generate future workout suggestions. The view consists of a 3-step form where users enter each workout's basic metrics: distance, duration, average heart rate, and date. This process is mandatory for new users and is a prerequisite for access to the main application.

## 2. View Routing

- **Path**: `/onboarding`
- **Access logic**:
  - New users (with fewer than 3 recorded workouts) attempting to access `/` (the home page) should be automatically redirected to `/onboarding`.
  - The redirect should preserve the original destination in the URL, e.g., `/onboarding?next=/calendar`.
  - Redirect logic will be implemented in application middleware (`src/middleware/index.ts`).

## 3. Component Structure

Components will be implemented in React and embedded in the Astro page as an island.

```
/src/pages/onboarding.astro
└── /src/components/views/OnboardingView.tsx (client:load)
    ├── /src/components/onboarding/Stepper.tsx
    ├── <h2> (step title, e.g., "Workout 1 of 3")
    └── /src/components/onboarding/WorkoutOnboardingForm.tsx
        ├── /src/components/ui/input.tsx (distance)
        ├── /src/components/onboarding/DurationInput.tsx (duration HH:MM:SS)
        ├── /src/components/ui/input.tsx (average heart rate)
        ├── /src/components/ui/datepicker.tsx (workout date)
        ├── /src/components/ui/button.tsx ("Next" / "Finish" button)
        └── /src/components/ui/sonner.tsx (API error messages)
```

## 4. Component Details

### `OnboardingView.tsx`

- **Description**: Main container managing the entire onboarding process. Responsible for form state, step navigation, and API communication.
- **Main elements**: Displays `Stepper` and `WorkoutOnboardingForm` for the current step.
- **Supported interactions**: Handles `onSubmit` from `WorkoutOnboardingForm`.
- **Types**: `WorkoutOnboardingFormViewModel`, `CreateCompletedWorkoutDto`.
- **Props**: `nextUrl: string` (optional, for redirect after completion).

### `Stepper.tsx`

- **Description**: Simple visual component indicating progress (e.g., "Step 2 of 3").
- **Main elements**: A series of `<div>` or `<span>` elements styled according to whether the step is active, completed, or pending.
- **Supported interactions**: None.
- **Types**: None.
- **Props**: `currentStep: number`, `totalSteps: number`.

### `WorkoutOnboardingForm.tsx`

- **Description**: Form for entering one workout's data. Reused for each of the three steps.
- **Main elements**: `<Input>` fields for distance and heart rate, custom `DurationInput` for time, `DatePicker` for date, and a submit `Button`.
- **Supported interactions**: `onSubmit` (sends data to parent `OnboardingView`), `onChange` on form fields.
- **Validation conditions**:
  - `distance`: must be a positive number greater than 0.1 km.
  - `duration`: at least one value (hours, minutes, seconds) must be greater than 0. Total time must exceed 60 seconds.
  - `average heart rate`: must be an integer in the range 40-220.
  - `workout date`: must be a past date.
- **Types**: `WorkoutOnboardingFormViewModel`.
- **Props**: `onSubmit: (data: WorkoutOnboardingFormViewModel) => void`, `isLoading: boolean`, `stepNumber: number`.

### `DurationInput.tsx`

- **Description**: Custom component for entering duration in segments (hours, minutes, seconds), simplifying data entry.
- **Main elements**: Three `<Input type="number">` fields for HH, MM, SS with appropriate labels.
- **Supported interactions**: `onChange` on each field, passing `{ hours, minutes, seconds }` to the form.
- **Types**: `DurationState = { hours: string; minutes: string; seconds: string; }`.
- **Props**: `value: DurationState`, `onChange: (value: DurationState) => void`, `disabled: boolean`.

## 5. Types

### `WorkoutOnboardingFormViewModel` (ViewModel)

Type representing form state in `WorkoutOnboardingForm`.

```typescript
interface WorkoutOnboardingFormViewModel {
  distanceKm: string;
  duration: {
    hours: string;
    minutes: string;
    seconds: string;
  };
  avgHr: string;
  completedAt: Date;
}
```

### `CreateCompletedWorkoutDto` (DTO)

Data transfer object sent to the API. Created from `WorkoutOnboardingFormViewModel`. Fields not entered by the user will receive defaults.

```typescript
// Compatible with createWorkoutSchema in /src/lib/validation/workouts.ts
interface CreateCompletedWorkoutDto {
  training_type_code: string; // Default: 'easy'
  planned_date: string; // Default: date from completed_at (YYYY-MM-DD format)
  position: number; // Default: 1
  planned_distance_m: number; // Default: equal to distance_m
  planned_duration_s: number; // Default: equal to duration_s
  steps: Array<{
    // Default: one 'main' step
    part: "main";
    distance_m: number;
    duration_s: number;
  }>;
  status: "completed"; // Default: constant value
  distance_m: number; // From the form
  duration_s: number; // From the form
  avg_hr_bpm: number; // From the form
  completed_at: string; // From the form (ISO format)
  rating: "just_right"; // Default rating for initial workouts
}
```

## 6. State Management

A custom `useOnboarding` hook will manage the multistep form logic.

### `useOnboarding(nextUrl?: string)`

- **Goal**: Encapsulate state logic, step navigation, and data submission.
- **Managed state**:
  - `currentStep: number`: Current step (1-3).
  - `workouts: CreateCompletedWorkoutDto[]`: Array holding data for three workouts.
  - `isLoading: boolean`: Flag indicating API data submission is in progress.
- **Returned functions**:
  - `handleFormSubmit(data: WorkoutOnboardingFormViewModel)`: Called on form submission. Validates data, transforms it into a DTO, adds it to `workouts`, and advances to the next step. At the last step, initiates submission of all three workouts.
  - `currentWorkoutData: WorkoutOnboardingFormViewModel`: Data for prefilling the form (if returning to previous steps is desired).

## 7. API Integration

- **Endpoint**: `POST /api/v1/workouts`
- **Process**:
  1. After the third step, `handleFormSubmit` from `useOnboarding` is called.
  2. The hook initiates three `POST` requests to `/api/v1/workouts`, using `Promise.all` to execute them concurrently. Each request contains one workout DTO.
  3. During the operation, `isLoading` is `true`, disabling the form button.
- **Request types**: `CreateCompletedWorkoutDto` (according to `createWorkoutSchema`).
- **Response types**: `ApiResponse<WorkoutDetailDto>` (status `201 Created`).

## 8. User Interactions

- **Completing the form**: The user enters data. Validation occurs on blur or when attempting to proceed.
- **Clicking "Next"**: Data is validated. If valid, `currentStep` increments and the form clears for the next workout. Otherwise validation errors appear.
- **Clicking "Finish" (last step)**: Data is validated. If valid, API submission begins and the button is disabled. On success, the user is redirected to `/` or the address in the `next` parameter.
- **API error**: If any `POST` operation fails, the user sees a message (e.g., toast/sonner) describing the problem and offering a retry.

## 9. Conditions and Validation

- **Component level**: `WorkoutOnboardingForm` uses `zod` to validate `WorkoutOnboardingFormViewModel` before passing it to the parent. Errors appear below the relevant fields.
- **DTO mapping**: The frontend ensures all fields required by `createWorkoutSchema` are correctly populated, even when not entered by the user (e.g., `planned_distance_m` takes `distance_m`).
  - `distanceKm` is converted to `distance_m` (km * 1000).
  - `{ hours, minutes, seconds }` is converted to `duration_s`.
- **Business conditions**: The application enforces exactly 3 workouts through the step mechanism.

## 10. Error Handling

- **Form validation errors**: Display messages directly below invalid fields. Error state is managed inside `WorkoutOnboardingForm`.
- **Network / server errors (API)**: On submission failure (e.g., status 500, no connection), `OnboardingView` displays a global `sonner` toast asking the user to retry. Set `isLoading` to `false`, enabling "Finish".
- **Server-side validation error (422)**: Although client validation should prevent it, handle it as a standard server error with a user message.

## 11. Implementation Steps

1.  **Modify Middleware**: Update `src/middleware/index.ts` to check the user's workout count. If fewer than 3 and the request is not for `/onboarding` (or related static/API resources), return `307 Temporary Redirect` to `/onboarding`.
2.  **Create the page and component skeletons**: Create `src/pages/onboarding.astro` and React components: `OnboardingView.tsx`, `Stepper.tsx`, `WorkoutOnboardingForm.tsx`, `DurationInput.tsx`.
3.  **Implement `DurationInput`**: Build a fully functional custom component for segmented time entry.
4.  **Implement `WorkoutOnboardingForm`**: Build fields, client-side `zod` validation, and `isLoading` handling.
5.  **Implement `useOnboarding`**: Create state and step management and `ViewModel` to `DTO` transformation logic.
6.  **Implement `OnboardingView`**: Integrate all components, use `useOnboarding`, and submit API data with `Promise.all`. Add API error handling with `sonner`.
7.  **Styling**: Style all components with Tailwind CSS according to the application design system (shadcn/ui).
8.  **Manual testing**: Test the entire flow:
    - Redirect for a new user.
    - Form validation at each step.
    - Correct "Next" and "Finish" button behavior.
    - API error handling.
    - Correct redirect after successful onboarding.
