# AI Suggestion Drawer View Implementation Plan

## 1. Overview

The "AI Suggestion Drawer" is a sliding panel for interacting with the AI engine to generate, review, accept, or reject a personalized workout suggestion for a specific day. It is a key part of the feedback loop, allowing future suggestions to adapt to the user's history and preferences.

## 2. View Routing

- **Path**: An overlay on the main calendar view (`/`). No dedicated URL.
- **Activation**: Opened by a calendar action, e.g., clicking "Generate" on an empty day.

## 3. Component Structure

Components will be implemented in React in `src/components/suggestions/`.

```
<AISuggestionDrawer> (Main container component)
|
├── <AISuggestionForm>
|   ├── <Select> (for training_type_code)
|   └── <DatePicker> (for planned_date)
|
├── <SuggestionPreview>
|   ├── <SuggestionMeta> (distance/time, type)
|   ├── <SuggestionSteps> (warm-up, main part, cool-down)
|   └── <Badge> (for status)
|
├── <SuggestionControls>
|   ├── <Button> (Accept)
|   ├── <Button> (Reject and generate another)
|   └── <p> (Regeneration counter: X/3)
|
├── <ExpiredSuggestionState>
|   ├── <p> (Expiration notice)
|   └── <Button> (Generate new)
|
└── <ConflictDialog>
    ├── <DialogHeader>
    ├── <DialogDescription>
    └── <DialogFooter>
        └── <Button> (Change position and accept)
```

## 4. Component Details

### `AISuggestionDrawer` (Container Component)

- **Description**: Main component managing the entire view's state. Orchestrates data flow between form, preview, and controls, and handles API communication.
- **Main elements**: Uses `Sheet` from `shadcn/ui` as a base. Conditionally renders children (`AISuggestionForm`, `SuggestionPreview`, `SuggestionControls`, `ExpiredSuggestionState`) according to state (`loading`, `error`, `data`).
- **Supported events**: `onGenerate`, `onAccept`, `onRegenerate`.
- **Types**: `AISuggestionViewModel`, `TrainingType`.
- **Props**:
  - `isOpen: boolean`: Controls panel visibility.
  - `onOpenChange: (isOpen: boolean) => void`: Panel close handler.
  - `initialData: { plannedDate: Date; trainingTypeCode?: string }`: Form prefill data.

### `AISuggestionForm`

- **Description**: Form for entering new suggestion data.
- **Main elements**: `<Select>` and `<DatePicker>` from `shadcn/ui`. "Generate suggestion" button.
- **Supported events**: `onSubmit: (data: { plannedDate: Date; trainingTypeCode: string }) => void`.
- **Validation conditions**:
  - `trainingTypeCode`: Must be selected and non-empty.
  - `plannedDate`: Must be a selected valid date.
- **Types**: `TrainingType`.
- **Props**:
  - `trainingTypes: TrainingType[]`: Available workout types.
  - `onSubmit: (data: ...) => void`: Callback after form validation and submission.
  - `isSubmitting: boolean`: Disables form during generation.
  - `initialData: { plannedDate: Date; trainingTypeCode?: string }`: Initial values.

### `SuggestionPreview`

- **Description**: Displays generated or existing AI suggestion details.
- **Main elements**: `Card` components for metadata (`SuggestionMeta`) and steps (`SuggestionSteps`). Status `Badge`.
- **Types**: `AISuggestionViewModel`.
- **Props**:
  - `suggestion: AISuggestionViewModel`: Suggestion to display.

### `SuggestionControls`

- **Description**: Action buttons for an active (unexpired) suggestion.
- **Main elements**: Two `Button` components: "Accept" and "Reject and generate another". Displays remaining regenerations.
- **Supported events**: `onAccept: () => void`, `onRegenerate: () => void`.
- **Validation conditions**: "Reject and generate another" is disabled if `regenerationCount >= 3`.
- **Props**:
  - `onAccept: () => void`.
  - `onRegenerate: () => void`.
  - `regenerationCount: number`.
  - `isAccepting: boolean`.
  - `isRegenerating: boolean`.

## 5. Types

### `AISuggestionDTO` (Data Transfer Object)

Mirrors the API response data structure.

```typescript
interface AISuggestionDTO {
  id: string; // uuid
  user_id: string; // uuid
  training_type_code: string;
  planned_date: string; // YYYY-MM-DD
  steps: Array<{
    part: "warmup" | "main" | "cooldown";
    duration_s?: number;
    distance_m?: number;
    description: string;
  }>;
  status: "shown" | "accepted" | "rejected" | "expired";
  accepted_workout_id: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  expires_at: string; // ISO 8601
}
```

### `AISuggestionViewModel` (View Model)

Type tailored to UI needs, with processed fields.

```typescript
interface AISuggestionViewModel {
  id: string;
  trainingTypeCode: string;
  plannedDate: Date;
  totalDurationSec: number;
  totalDistanceMeters: number;
  steps: Array<{
    part: "warmup" | "main" | "cooldown";
    label: string; // "Warm-up", "Main", "Cool-down"
    details: string; // e.g., "10 min" or "5 km"
  }>;
  status: "shown" | "accepted" | "rejected" | "expired";
  isExpired: boolean;
  expiresAt: Date;
}
```

## 6. State Management

State management will be centralized in `AISuggestionDrawer` using `useState`. Main state variables:

- `suggestion: AISuggestionViewModel | null`: Currently displayed suggestion.
- `isLoading: boolean`: Loading process (generation, acceptance, etc.).
- `error: Error | null`: API errors.
- `regenerationCount: number`: Regenerations performed for a given planned_date (limit 3).
- `isConflictDialogOpen: boolean`: Position conflict modal visibility.

No dedicated custom hook (`useAISuggestion`) is needed because logic is tied directly to the lifecycle of the single `AISuggestionDrawer` component.

## 7. API Integration

API integration uses dedicated service functions in `src/lib/services/aiSuggestionsService.ts`.

- **Generate suggestion**: `POST /api/v1/ai/suggestions`
  - **Request Body**: `{ planned_date: string; training_type_code: string; }`
  - **Response (201)**: `{ data: AISuggestionDTO }`
  - **Frontend action**: Called after `AISuggestionForm` submission. Result populates `suggestion` state.
- **Accept suggestion**: `POST /api/v1/ai/suggestions/{id}/accept`
  - **Request Body**: `{ position: number }` (default `1`)
  - **Response (201)**: `{ data: WorkoutDTO }`
  - **Frontend action**: After clicking "Accept". On success, closes the panel and refreshes calendar data.
- **Regenerate suggestion**: `POST /api/v1/ai/suggestions/{id}/regenerate`
  - **Request Body**: (empty)
  - **Response (201)**: `{ data: AISuggestionDTO }` (new suggestion)
  - **Frontend action**: After clicking "Reject and generate another". Replaces the old suggestion and increments `regenerationCount`.

## 8. User Interactions

- **Open panel with data**: User clicks a calendar day. Panel opens with the date prefilled in `AISuggestionForm`.
- **Generate suggestion**: User completes the form and clicks "Generate". `AISuggestionForm` is disabled, `isLoading`=true. On response, render `SuggestionPreview` and `SuggestionControls`.
- **Accept suggestion**: User clicks "Accept". `isLoading`=true. On API 201, close the panel and refresh the calendar.
- **Regenerate suggestion**: User clicks "Reject and generate another". `isLoading`=true. Load a new suggestion, replace the old one, and update the counter.
- **Close panel**: User clicks close or outside the panel. Reset state.

## 9. Conditions and Validation

- **Regeneration limit**: In `SuggestionControls`, disable and gray out regeneration if `regenerationCount >= 3` for the planned_date. `AISuggestionDrawer` checks this before sending a request.
- **Expired suggestion**: If `suggestion.isExpired` is `true`, hide `SuggestionControls` and show `ExpiredSuggestionState` with a button to generate a new suggestion. All actions (accept, regenerate) are blocked.
- **Form validation**: `AISuggestionForm` checks that type and date are selected before submission.

## 10. Error Handling

- **404 Not Found**: Display "Suggestion not found".
- **409 Conflict (Position)**: After an acceptance attempt, `AISuggestionDrawer` sets `isConflictDialogOpen` to `true`, opening `ConflictDialog` so the user can choose to change position.
- **410 Gone (Expired)**: Treat as expired. Switch to `read-only` (`ExpiredSuggestionState`).
- **429 Too Many Requests (Regeneration Limit)**: Display "Today's regeneration limit has been exceeded." and disable regeneration.
- **Other errors (500, network errors)**: Display a generic error with a retry option.

## 11. Implementation Steps

1. **File structure**: Create `src/components/suggestions` and component files: `AISuggestionDrawer.tsx`, `AISuggestionForm.tsx`, `SuggestionPreview.tsx`, `SuggestionControls.tsx`, etc.
2. **Type definitions**: Define `AISuggestionDTO` and `AISuggestionViewModel` in `src/types.ts` or a dedicated file in `src/components/suggestions`.
3. **Implement `AISuggestionDrawer`**: Build the main component with `useState`, `isOpen`/`initialData` props, and `Sheet` from `shadcn/ui`.
4. **Implement `AISuggestionForm`**: Build the form with validation and `onSubmit`.
5. **Implement `SuggestionPreview`**: Display `AISuggestionViewModel`, formatting time/distance.
6. **Implement `SuggestionControls` and `ExpiredSuggestionState`**: Conditionally show controls or expiration information based on `suggestion.isExpired` and `regenerationCount`.
7. **API integration**: Create or update `aiSuggestionsService.ts` with `generateSuggestion`, `acceptSuggestion`, `regenerateSuggestion`.
8. **Connect logic**: Integrate API calls in `AISuggestionDrawer` in response to child events. Fully handle `loading` and `error` states.
9. **Error handling**: Handle individual API codes (409, 410, 429). Create `ConflictDialog`.
10. **Final testing and styling**: Manually test the entire flow, adjust styles, and ensure components are fully responsive.
