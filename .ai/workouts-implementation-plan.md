# API Endpoint Implementation Plan: Workouts Management

## 1. Endpoint Overview

Workout management is the application's core. It covers the full workout lifecycle: planning, completion, rating, and states (planned, completed, skipped, canceled). Endpoints provide CRUD and domain-specific actions (complete, skip, cancel, rate), plus special views: last3 (last 3 completed workouts) and calendar (grouped by date).

### Key Features:

- **Authorization**: All operations require an authenticated user
- **Ownership**: Users may operate only on their own workouts
- **Status machine**: Controlled status transitions
- **Validation**: Complex business rules (e.g., metrics required only for completed)
- **Performance**: Optimized indexed queries
- **Data integrity**: Unique position per (user_id, planned_date)

## 2. Request Details

### 2.1 GET /api/v1/workouts

Workout list with advanced filters and pagination.

**Query parameters (all optional):**

- `status` - status filter: `planned`, `completed`, `skipped`, `canceled`
- `training_type_code` - workout type (multi: comma-separated, e.g., `easy,tempo`)
- `origin` - source: `manual`, `ai`, `import`
- `rating` - rating: `too_easy`, `just_right`, `too_hard`
- `planned_date_gte` - planned date from (YYYY-MM-DD)
- `planned_date_lte` - planned date through (YYYY-MM-DD)
- `completed_at_gte` - completion date from (ISO 8601)
- `completed_at_lte` - completion date through (ISO 8601)
- `sort` - sorting (default: `planned_date:asc,position:asc` for planned; `completed_at:desc` for completed)
- `page` - page number (default: 1)
- `per_page` - result count (default: 20, max: 100)

**Headers:**

- `Authorization` - Supabase session token (from cookies)

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "training_type_code": "easy",
      "planned_date": "2025-10-13",
      "position": 1,
      "planned_distance_m": 5000,
      "planned_duration_s": 1800,
      "status": "planned",
      "origin": "manual",
      "rating": null,
      "avg_pace_s_per_km": null
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 42
}
```

**Errors:** 401, 422 (invalid filters)

---

### 2.2 POST /api/v1/workouts

Create a workout - planned (plan only) or completed (with actual metrics).

**Request Body (planned workout):**

```json
{
  "training_type_code": "easy",
  "planned_date": "2025-10-15",
  "position": 1,
  "planned_distance_m": 5000,
  "planned_duration_s": 1800,
  "steps": [
    { "part": "warmup", "duration_s": 600 },
    { "part": "main", "duration_s": 900 },
    { "part": "cooldown", "duration_s": 300 }
  ]
}
```

**Request Body (completed workout):**

```json
{
  "training_type_code": "easy",
  "planned_date": "2025-10-15",
  "position": 1,
  "planned_distance_m": 5000,
  "planned_duration_s": 1800,
  "status": "completed",
  "distance_m": 5000,
  "duration_s": 1800,
  "avg_hr_bpm": 140,
  "completed_at": "2025-10-15T18:00:00Z",
  "rating": "just_right",
  "steps": [
    { "part": "warmup", "distance_m": 1000, "duration_s": 600 },
    { "part": "main", "distance_m": 3000, "duration_s": 900 },
    { "part": "cooldown", "distance_m": 1000, "duration_s": 300 }
  ]
}
```

**Response 201:**

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "training_type_code": "easy",
    "planned_date": "2025-10-15",
    "position": 1,
    "planned_distance_m": 5000,
    "planned_duration_s": 1800,
    "status": "planned",
    "origin": "manual",
    "ai_suggestion_id": null,
    "steps": [...],
    "distance_m": null,
    "duration_s": null,
    "avg_hr_bpm": null,
    "completed_at": null,
    "rating": null,
    "avg_pace_s_per_km": null
  }
}
```

**Errors:** 400, 401, 404 (invalid training_type_code), 409 (duplicate position), 422 (validation)

---

### 2.3 GET /api/v1/workouts/{id}

Retrieve details of a single workout.

**URL params:**

- `id` - workout UUID

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "training_type_code": "easy",
    "planned_date": "2025-10-13",
    "position": 1,
    "planned_distance_m": 5000,
    "planned_duration_s": 1800,
    "status": "completed",
    "origin": "ai",
    "ai_suggestion_id": "uuid",
    "steps": [
      { "part": "warmup", "distance_m": 1000, "duration_s": 600 },
      { "part": "main", "distance_m": 3000, "duration_s": 1200 },
      { "part": "cooldown", "distance_m": 1000, "duration_s": 600 }
    ],
    "distance_m": 5200,
    "duration_s": 1850,
    "avg_hr_bpm": 145,
    "completed_at": "2025-10-13T18:30:00Z",
    "rating": "just_right",
    "avg_pace_s_per_km": 356
  }
}
```

**Errors:** 401, 403 (not owner), 404

---

### 2.4 PATCH /api/v1/workouts/{id}

Update a workout (minor corrections, plan edits).

**URL params:**

- `id` - workout UUID

**Request Body (partial update):**

```json
{
  "planned_distance_m": 6000,
  "planned_duration_s": 2100,
  "steps": [
    { "part": "warmup", "duration_s": 600 },
    { "part": "main", "duration_s": 1200 },
    { "part": "cooldown", "duration_s": 300 }
  ]
}
```

**Immutable fields (cannot be changed):**

- `id`, `user_id`, `origin`, `ai_suggestion_id` (once set), `avg_pace_s_per_km` (calculated)

**Response 200:** Workout detail

**Errors:** 400, 401, 403, 404, 409 (status transition conflict), 422

---

### 2.5 DELETE /api/v1/workouts/{id}

Delete a workout.

**URL params:**

- `id` - workout UUID

**Response 204:** No Content

**Errors:** 401, 403, 404, 409 (FK constraint - workout from accepted AI suggestion)

---

### 2.6 POST /api/v1/workouts/{id}/complete

Mark a workout completed (domain action).

**URL params:**

- `id` - workout UUID

**Request Body:**

```json
{
  "distance_m": 5200,
  "duration_s": 1850,
  "avg_hr_bpm": 145,
  "completed_at": "2025-10-13T18:30:00Z",
  "rating": "just_right"
}
```

**Response 200:** Workout detail (status=completed, avg_pace calculated)

**Errors:** 401, 403, 404, 409 (invalid state transition), 422

---

### 2.7 POST /api/v1/workouts/{id}/skip

Mark as skipped.

**URL params:**

- `id` - workout UUID

**Request Body:** Empty `{}`

**Response 200:** Workout detail (status=skipped, metrics cleared)

**Errors:** 401, 403, 404, 409

---

### 2.8 POST /api/v1/workouts/{id}/cancel

Mark as canceled.

**URL params:**

- `id` - workout UUID

**Request Body:** Empty `{}`

**Response 200:** Workout detail (status=canceled, metrics cleared)

**Errors:** 401, 403, 404, 409

---

### 2.9 POST /api/v1/workouts/{id}/rate

Rate a completed workout.

**URL params:**

- `id` - workout UUID

**Request Body:**

```json
{
  "rating": "too_hard"
}
```

**Response 200:** Workout detail

**Errors:** 401, 403, 404, 409 (status != completed), 422

---

### 2.10 GET /api/v1/workouts/last3

Last 3 completed workouts (for AI context).

**Query params (optional):**

- `training_type_code` - type filter (if omitted: last 3 overall)

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "completed_at": "2025-10-13T18:30:00Z",
      "training_type_code": "easy"
    }
  ],
  "page": 1,
  "per_page": 3,
  "total": 1
}
```

**Errors:** 401, 422

---

### 2.11 GET /api/v1/calendar

Calendar view (grouped by date).

**Query params (required):**

- `start` - date from (YYYY-MM-DD)
- `end` - date through (YYYY-MM-DD)

**Query params (optional):**

- `status` - status filter

**Response 200:**

```json
{
  "data": {
    "range": {
      "start": "2025-10-01",
      "end": "2025-10-31"
    },
    "days": [
      {
        "date": "2025-10-13",
        "workouts": [
          {
            "id": "uuid",
            "training_type_code": "easy",
            "status": "planned",
            "position": 1
          }
        ]
      }
    ]
  }
}
```

**Errors:** 401, 422 (invalid date range)

---

## 3. Types Used

From `src/types.ts`:

### DTOs:

```typescript
// Lista workouts (summary)
export type WorkoutSummaryDto = Pick<
  WorkoutRow,
  | "id"
  | "training_type_code"
  | "planned_date"
  | "position"
  | "planned_distance_m"
  | "planned_duration_s"
  | "status"
  | "origin"
  | "rating"
  | "avg_pace_s_per_km"
>;

// Workout details
export type WorkoutDetailDto = Omit<WorkoutRow, "steps_jsonb"> & {
  steps: WorkoutStepDto[];
};

// Last3 item
export type WorkoutLast3ItemDto = Pick<WorkoutRow, "id" | "completed_at" | "training_type_code">;

// Calendar item
export type CalendarWorkoutItemDto = Pick<WorkoutRow, "id" | "training_type_code" | "status" | "position">;

export interface CalendarDayDto {
  date: string; // YYYY-MM-DD
  workouts: CalendarWorkoutItemDto[];
}

export interface CalendarDto {
  range: { start: string; end: string };
  days: CalendarDayDto[];
}

// Step structure
export interface WorkoutStepDto {
  part: "warmup" | "main" | "cooldown" | "segment";
  distance_m?: number;
  duration_s?: number;
  notes?: string;
}
```

### Commands:

```typescript
export type WorkoutCreatePlannedCommand = Pick<
  WorkoutInsert,
  "training_type_code" | "planned_date" | "position" | "planned_distance_m" | "planned_duration_s"
> & {
  steps: WorkoutStepDto[];
};

export type WorkoutCreateCompletedCommand = Pick<
  WorkoutInsert,
  | "training_type_code"
  | "planned_date"
  | "position"
  | "planned_distance_m"
  | "planned_duration_s"
  | "distance_m"
  | "duration_s"
  | "avg_hr_bpm"
  | "completed_at"
  | "rating"
> & {
  status: Extract<Enums<"workout_status">, "completed">;
  steps?: WorkoutStepDto[];
};

export type WorkoutUpdateCommand = Partial<
  Omit<WorkoutUpdate, "id" | "user_id" | "origin" | "ai_suggestion_id" | "avg_pace_s_per_km" | "steps_jsonb">
> & {
  steps?: WorkoutStepDto[];
};

export type WorkoutCompleteCommand = Pick<
  WorkoutUpdate,
  "distance_m" | "duration_s" | "avg_hr_bpm" | "completed_at"
> & {
  rating?: Enums<"workout_rating">;
};

export type WorkoutSkipCommand = Record<string, never>;
export type WorkoutCancelCommand = Record<string, never>;

export interface WorkoutRateCommand {
  rating: Enums<"workout_rating">;
}
```

### Response envelopes:

```typescript
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
}
```

---

## 4. Data Flow

### 4.1 GET /api/v1/workouts (list)

1. Endpoint parses and validates query params with Zod (`listQuerySchema`)
2. Verifies user session (`context.locals.user`)
3. Service `workoutsService.listWorkouts(supabase, userId, filters)`:
   - Builds Supabase query with filters (status, type, origin, rating, date ranges)
   - Applies sorting (default depends on status filter)
   - Executes count query for total
   - Fetches paginated results
   - Transforms to WorkoutSummaryDto[] (without steps for performance)
4. Endpoint returns ApiListResponse with pagination metadata

### 4.2 POST /api/v1/workouts (create)

1. Endpoint validates body with Zod (`createWorkoutSchema`)
   - Conditional validation: status=completed requires actual metrics
   - Validates steps (min 1, each with distance or duration)
2. Verifies user session
3. Service `workoutsService.createWorkout(supabase, userId, command)`:
   - Checks training_type_code exists (FK validation)
   - Checks (user_id, planned_date, position) uniqueness
   - Transforms steps → steps_jsonb
   - Calculates avg_pace_s_per_km if completed
   - Sets origin=manual, status=planned (default)
   - INSERT into workouts table
   - Returns WorkoutDetailDto
4. Endpoint returns 201 Created with ApiResponse

### 4.3 GET /api/v1/workouts/{id} (detail)

1. Endpoint extracts id from URL params
2. Verifies user session
3. Service `workoutsService.getWorkoutById(supabase, userId, id)`:
   - SELECT workout WHERE id=? AND user_id=?
   - Guard: if missing → throw 404
   - Guard: if user_id mismatches → throw 403
   - Transforms steps_jsonb → steps (WorkoutStepDto[])
4. Endpoint returns 200 OK with ApiResponse

### 4.4 PATCH /api/v1/workouts/{id} (update)

1. Endpoint validates body with Zod (`updateWorkoutSchema`)
   - Partial validation
   - Blocks immutable fields (origin, ai_suggestion_id, avg_pace)
2. Verifies user session
3. Service `workoutsService.updateWorkout(supabase, userId, id, command)`:
   - SELECT current workout (ownership check)
   - Checks immutable fields are absent from command
   - Transforms steps if present
   - Recalculates avg_pace if distance/duration changed
   - UPDATE workout
   - Returns WorkoutDetailDto
4. Endpoint returns 200 OK

### 4.5 DELETE /api/v1/workouts/{id}

1. Verifies user session
2. Service `workoutsService.deleteWorkout(supabase, userId, id)`:
   - SELECT workout (ownership check)
   - Checks FK constraint (ai_suggestion accepted_workout_id)
   - DELETE workout WHERE id=? AND user_id=?
   - Guard: FK error → throw 409 with remediation hint
3. Endpoint returns 204 No Content

### 4.6 POST /api/v1/workouts/{id}/complete

1. Endpoint validates body with Zod (`completeWorkoutSchema`)
2. Verifies user session
3. Service `workoutsService.completeWorkout(supabase, userId, id, command)`:
   - SELECT workout (ownership + state check)
   - Guard: if status=completed → throw 409
   - UPDATE workout SET status=completed, distance_m, duration_s, avg_hr_bpm, completed_at, rating
   - Calculates avg_pace_s_per_km = duration_s / (distance_m/1000)
   - Returns WorkoutDetailDto
4. Endpoint returns 200 OK

### 4.7 POST /api/v1/workouts/{id}/skip

1. Verifies user session
2. Service `workoutsService.skipWorkout(supabase, userId, id)`:
   - SELECT workout (ownership + state check)
   - Guard: if already skipped → throw 409
   - UPDATE workout SET status=skipped, distance_m=null, duration_s=null, avg_hr_bpm=null, completed_at=null, rating=null, avg_pace_s_per_km=null
3. Endpoint returns 200 OK

### 4.8 POST /api/v1/workouts/{id}/cancel

1. Verifies user session
2. Service `workoutsService.cancelWorkout(supabase, userId, id)`:
   - SELECT workout (ownership + state check)
   - Guard: if already canceled → throw 409
   - UPDATE workout SET status=canceled, clear metrics
3. Endpoint returns 200 OK

### 4.9 POST /api/v1/workouts/{id}/rate

1. Endpoint validates body with Zod (`rateWorkoutSchema`)
2. Verifies user session
3. Service `workoutsService.rateWorkout(supabase, userId, id, command)`:
   - SELECT workout (ownership check)
   - Guard: if status != completed → throw 409
   - UPDATE workout SET rating=?
4. Endpoint returns 200 OK

### 4.10 GET /api/v1/workouts/last3

1. Endpoint parses query params (`last3QuerySchema`)
2. Verifies user session
3. Service `workoutsService.getLastThreeWorkouts(supabase, userId, trainingTypeCode?)`:
   - SELECT with WHERE user_id=? AND status=completed
   - If trainingTypeCode: AND training_type_code=?
   - ORDER BY completed_at DESC LIMIT 3
   - Uses index: (user_id, training_type_code, completed_at DESC) or (user_id, completed_at DESC)
   - Transforms to WorkoutLast3ItemDto[]
4. Endpoint returns ApiListResponse (page=1, per_page=3, total=count)

### 4.11 GET /api/v1/calendar

1. Endpoint validates query params (`calendarQuerySchema`)
   - start and end required (YYYY-MM-DD)
   - Validation: end >= start
2. Verifies user session
3. Service `workoutsService.getCalendar(supabase, userId, start, end, status?)`:
   - SELECT with WHERE user_id=? AND planned_date BETWEEN ? AND ?
   - If status: AND status=?
   - ORDER BY planned_date, position
   - Uses index: (user_id, planned_date)
   - Group by planned_date (in application or SQL)
   - Transforms to CalendarDto (range + days[])
4. Endpoint returns ApiResponse

---

## 5. Security Considerations

### 5.1 Authorization and Authentication

- **Session validation**: Each endpoint checks `context.locals.user`
  - If missing: 401 Unauthorized
- **Ownership verification**: All operations check `user_id` in WHERE
  - Accessing another user's workout: 403 Forbidden
- **RLS (Row Level Security)**: Supabase policies as a backup security layer
  - Policy: `workouts` table - enable RLS, allow SELECT/INSERT/UPDATE/DELETE only WHERE user_id = auth.uid()

### 5.2 Input Validation

- **Zod schemas**: All inputs validated with Zod before service calls
- **Type safety**: TypeScript provides compile-time type checking
- **Range validation**:
  - `distance_m`: 100-100,000 (100m - 100km)
  - `duration_s`: 300-21,600 (5min - 6h)
  - `avg_hr_bpm`: 0-240
  - `position`: >= 1
- **Date validation**:
  - `planned_date`: YYYY-MM-DD (regex + parse check)
  - `completed_at`: ISO 8601 (Zod datetime)
- **Enum validation**: status, rating, origin, part (strict enum checks)
- **Steps validation**:
  - Min 1 step required
  - Each step must have distance_m OR duration_s (anyOf logic)
  - part in ["warmup", "main", "cooldown", "segment"]

### 5.3 Immutability enforcement

- **Immutable fields**: Block PATCH changes:
  - `id`, `user_id` - always immutable
  - `origin` - immutable (set once on create)
  - `ai_suggestion_id` - immutable once set
  - `avg_pace_s_per_km` - calculated field (read-only)
- **Validation**: PATCH Zod schema detects immutable field changes → 422

### 5.4 Business logic constraints

- **Status transitions**: Validate allowed transitions
  - planned → completed (via /complete)
  - planned → skipped (via /skip)
  - planned → canceled (via /cancel)
  - completed → may remain (update rating)
  - Invalid transitions: 409 Conflict
- **Metrics requirements**:
  - status=completed REQUIRES: distance_m, duration_s, avg_hr_bpm, completed_at
  - status!=completed: metrics must be NULL
  - Zod validation + DB constraints
- **Rating constraint**: rating allowed ONLY for status=completed
- **Position uniqueness**: (user_id, planned_date, position) DB unique constraint
  - Duplicate: 409 Conflict

### 5.5 SQL Injection prevention

- **Parameterized queries**: Supabase query builder uses prepared statements
- **No raw SQL**: Avoid raw SQL queries
- **Input sanitization**: Zod validation before query use

### 5.6 Foreign Key validation

- **training_type_code**: Must exist in `training_types`
  - Validation: SELECT before INSERT/UPDATE
  - DB FK constraint (RESTRICT) - backup
- **ai_suggestion_id**: If present, must exist in `ai_suggestions` and belong to user
  - Validation: SELECT with ownership check
  - FK: (ai_suggestion_id, user_id) → (ai_suggestions.id, ai_suggestions.user_id)

### 5.7 Data exposure

- **User isolation**: Never return other users' workouts
- **Sensitive data**: avg_hr_bpm is sensitive - owner access only
- **Error messages**: Do not leak internal details (stack traces, DB errors)
  - Generic messages: "Workout not found" instead of "No row with id=..."

---

## 6. Error Handling

### 6.1 HTTP Status Codes

- **200 OK**: Successful operation (GET, PATCH, domain actions)
- **201 Created**: Workout created (POST /workouts)
- **204 No Content**: Workout deleted (DELETE)
- **400 Bad Request**: Malformed request (invalid JSON, missing required fields)
- **401 Unauthorized**: No user session (no auth token or expired)
- **403 Forbidden**: Access to another user's workout
- **404 Not Found**: Workout does not exist
- **409 Conflict**:
  - Duplicate position for (user_id, planned_date)
  - Invalid status transition
  - FK constraint on DELETE (accepted AI workout)
- **422 Unprocessable Entity**: Business validation errors (Zod)
- **500 Internal Server Error**: Unexpected DB/server errors

### 6.2 Error Response Format

Consistent format for all errors:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Invalid workout data",
    "details": [
      {
        "field": "distance_m",
        "message": "Must be between 100 and 100000"
      }
    ]
  }
}
```

**Error codes:**

- `unauthorized` - 401
- `forbidden` - 403
- `not_found` - 404
- `duplicate_position` - 409
- `invalid_status_transition` - 409
- `fk_constraint_violation` - 409
- `validation_error` - 422
- `internal_error` - 500

### 6.3 Validation Errors (Zod)

```typescript
// Example Zod error handling
catch (err: any) {
  if (err.name === "ZodError") {
    const details = err.errors.map((e: any) => ({
      field: e.path.join("."),
      message: e.message
    }));
    return new Response(
      JSON.stringify({
        error: {
          code: "validation_error",
          message: "Invalid workout data",
          details
        }
      }),
      { status: 422, headers: { "content-type": "application/json" } }
    );
  }
}
```

### 6.4 Database Errors

**Unique constraint violation (23505):**

```json
{
  "error": {
    "code": "duplicate_position",
    "message": "Workout with this position already exists for the given date"
  }
}
```

**Foreign key violation (23503):**

```json
{
  "error": {
    "code": "fk_constraint_violation",
    "message": "Cannot delete workout created from accepted AI suggestion. Revert acceptance first."
  }
}
```

### 6.5 Logging

**Warn level** (user errors):

```typescript
console.warn("Validation error in POST /workouts", {
  userId: user.id,
  errors: zodError.errors,
  timestamp: new Date().toISOString(),
});
```

**Error level** (server errors):

```typescript
console.error("Database error in GET /workouts", {
  userId: user.id,
  error: err.message,
  code: err.code,
  timestamp: new Date().toISOString(),
});
```

**Do not log**:

- Personal data (HR, distances for a specific user)
- Auth tokens
- Full stack traces in production

---

## 7. Performance Considerations

### 7.1 Database Indexes

**Critical indexes** (already in DB schema):

- `(user_id, planned_date)` - calendar view and date-filtered list
- `(user_id, training_type_code, completed_at DESC)` - last3 per type
- `(user_id, completed_at DESC)` - last3 overall
- `(user_id, status)` - status filtering
- Unique: `(user_id, planned_date, position)` - integrity + performance

### 7.2 Query Optimization

**Workout list (GET /workouts):**

- Use `select()` only for needed columns (WorkoutSummaryDto, not full row)
- No steps_jsonb in list (large payload) - only in GET /workouts/{id}
- Pagination always active (default per_page=20, max=100)
- Optimized count query: `select("*", { count: "exact", head: true })`

**Calendar view:**

- Date range limited (max 90 days? - consider)
- Index (user_id, planned_date) ensures fast scan
- Group by in application (JS) rather than DB (simpler)

**Last3 query:**

- Always LIMIT 3 - minimal payload
- Index (user_id, completed_at DESC) = index-only scan
- No JOIN (training_types) - code only (denormalized)

### 7.3 Payload Size

**Payload minimization:**

- List: WorkoutSummaryDto (no steps, no user_id)
- Detail: WorkoutDetailDto (full data only when needed)
- Last3: WorkoutLast3ItemDto (only id, completed_at, type)
- Calendar: CalendarWorkoutItemDto (minimal fields)

**steps_jsonb:**

- Stored as JSONB in DB (indexed, compressed)
- Transformation only on read/write
- Not returned in list endpoints

### 7.4 Caching

**Potential strategies** (optional, beyond MVP):

- ETag for GET /workouts/{id} (like training-types)
- Cache-Control headers for calendar (private, max-age=300)
- No cache for lists (dynamic, user-specific data)

### 7.5 Supabase Connection Pooling

- Supabase managed service - connection pooling built-in
- context.locals.supabase uses the same client throughout a request
- Avoid creating new clients per query

### 7.6 N+1 Query Prevention

- **Do not** SELECT per workout in a loop
- One SELECT with filters for list
- JOIN with training_types **not needed** (only code, already in workouts)

---

## 8. Implementation Steps

### Step 1: File Structure

Create structure:

```
src/
├── lib/
│   ├── validation/
│   │   └── workouts.ts          # Zod schemas
│   ├── services/
│   │   └── workoutsService.ts   # Business logic
│   └── http/
│       └── errors.ts            # Error helpers (optional)
├── pages/
│   └── api/
│       └── v1/
│           ├── workouts.ts           # GET list, POST create
│           ├── workouts/
│           │   ├── [id].ts           # GET detail, PATCH, DELETE
│           │   ├── [id]/
│           │   │   ├── complete.ts   # POST complete
│           │   │   ├── skip.ts       # POST skip
│           │   │   ├── cancel.ts     # POST cancel
│           │   │   └── rate.ts       # POST rate
│           │   └── last3.ts          # GET last3
│           └── calendar.ts           # GET calendar
```

### Step 2: Zod Validation (src/lib/validation/workouts.ts)

Implement validation schemas:

```typescript
import { z } from "zod";

// Helper schema for steps
const stepSchema = z
  .object({
    part: z.enum(["warmup", "main", "cooldown", "segment"]),
    distance_m: z.number().int().min(100).max(100000).optional(),
    duration_s: z.number().int().min(60).max(21600).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.distance_m !== undefined || data.duration_s !== undefined, {
    message: "At least one of distance_m or duration_s is required",
  });

// List query schema
export const listQuerySchema = z.object({
  status: z.enum(["planned", "completed", "skipped", "canceled"]).optional(),
  training_type_code: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",").map((s) => s.trim()) : undefined)),
  origin: z.enum(["manual", "ai", "import"]).optional(),
  rating: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
  planned_date_gte: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  planned_date_lte: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  completed_at_gte: z.string().datetime().optional(),
  completed_at_lte: z.string().datetime().optional(),
  sort: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

// Create workout schema (planned or completed)
export const createWorkoutSchema = z
  .object({
    training_type_code: z.string().min(1).max(50),
    planned_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    position: z.number().int().min(1),
    planned_distance_m: z.number().int().min(100).max(100000),
    planned_duration_s: z.number().int().min(300).max(21600),
    steps: z.array(stepSchema).min(1),
    // Optional fields for completed workout
    status: z.enum(["planned", "completed"]).optional(),
    distance_m: z.number().int().min(100).max(100000).optional(),
    duration_s: z.number().int().min(300).max(21600).optional(),
    avg_hr_bpm: z.number().int().min(0).max(240).optional(),
    completed_at: z.string().datetime().optional(),
    rating: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
  })
  .refine(
    (data) => {
      if (data.status === "completed") {
        return (
          data.distance_m !== undefined &&
          data.duration_s !== undefined &&
          data.avg_hr_bpm !== undefined &&
          data.completed_at !== undefined
        );
      }
      return true;
    },
    { message: "Completed workouts require distance_m, duration_s, avg_hr_bpm, and completed_at" }
  );

// Update workout schema
export const updateWorkoutSchema = z
  .object({
    planned_distance_m: z.number().int().min(100).max(100000).optional(),
    planned_duration_s: z.number().int().min(300).max(21600).optional(),
    steps: z.array(stepSchema).min(1).optional(),
    distance_m: z.number().int().min(100).max(100000).optional(),
    duration_s: z.number().int().min(300).max(21600).optional(),
    avg_hr_bpm: z.number().int().min(0).max(240).optional(),
    completed_at: z.string().datetime().optional(),
    rating: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
    status: z.enum(["planned", "completed", "skipped", "canceled"]).optional(),
  })
  .strict(); // Strict mode - reject unknown fields (prevents immutable field changes)

// Complete workout schema
export const completeWorkoutSchema = z.object({
  distance_m: z.number().int().min(100).max(100000),
  duration_s: z.number().int().min(300).max(21600),
  avg_hr_bpm: z.number().int().min(0).max(240),
  completed_at: z.string().datetime(),
  rating: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
});

// Rate workout schema
export const rateWorkoutSchema = z.object({
  rating: z.enum(["too_easy", "just_right", "too_hard"]),
});

// Last3 query schema
export const last3QuerySchema = z.object({
  training_type_code: z.string().optional(),
});

// Calendar query schema
export const calendarQuerySchema = z
  .object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(["planned", "completed", "skipped", "canceled"]).optional(),
  })
  .refine((data) => new Date(data.end) >= new Date(data.start), { message: "End date must be >= start date" });

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;
export type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;
export type CompleteWorkoutInput = z.infer<typeof completeWorkoutSchema>;
export type RateWorkoutInput = z.infer<typeof rateWorkoutSchema>;
export type Last3Query = z.infer<typeof last3QuerySchema>;
export type CalendarQuery = z.infer<typeof calendarQuerySchema>;
```

### Step 3: Service Layer (src/lib/services/workoutsService.ts)

Implement business logic:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type {
  WorkoutSummaryDto,
  WorkoutDetailDto,
  WorkoutLast3ItemDto,
  CalendarDto,
  WorkoutStepDto,
} from "../../types";
import type {
  ListQuery,
  CreateWorkoutInput,
  UpdateWorkoutInput,
  CompleteWorkoutInput,
  RateWorkoutInput,
} from "../validation/workouts";

// Helper: Transform steps_jsonb to WorkoutStepDto[]
function transformSteps(steps_jsonb: any): WorkoutStepDto[] {
  if (!steps_jsonb) return [];
  return Array.isArray(steps_jsonb) ? steps_jsonb : [];
}

// Helper: Calculate avg_pace_s_per_km
function calculateAvgPace(distance_m: number | null, duration_s: number | null): number | null {
  if (!distance_m || !duration_s || distance_m === 0) return null;
  return Math.round(duration_s / (distance_m / 1000));
}

// 1. List workouts
export async function listWorkouts(
  supabase: SupabaseClient<Database>,
  userId: string,
  filters: ListQuery
): Promise<{ data: WorkoutSummaryDto[]; total: number }> {
  let query = supabase
    .from("workouts")
    .select(
      "id,training_type_code,planned_date,position,planned_distance_m,planned_duration_s,status,origin,rating,avg_pace_s_per_km",
      { count: "exact" }
    )
    .eq("user_id", userId);

  // Apply filters
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.training_type_code) {
    query = query.in("training_type_code", filters.training_type_code);
  }
  if (filters.origin) {
    query = query.eq("origin", filters.origin);
  }
  if (filters.rating) {
    query = query.eq("rating", filters.rating);
  }
  if (filters.planned_date_gte) {
    query = query.gte("planned_date", filters.planned_date_gte);
  }
  if (filters.planned_date_lte) {
    query = query.lte("planned_date", filters.planned_date_lte);
  }
  if (filters.completed_at_gte) {
    query = query.gte("completed_at", filters.completed_at_gte);
  }
  if (filters.completed_at_lte) {
    query = query.lte("completed_at", filters.completed_at_lte);
  }

  // Sorting
  const sort = filters.sort || (filters.status === "completed" ? "completed_at:desc" : "planned_date:asc,position:asc");
  const sortParts = sort.split(",");
  sortParts.forEach((part) => {
    const [field, order] = part.split(":");
    query = query.order(field, { ascending: order === "asc" });
  });

  // Pagination
  const from = (filters.page - 1) * filters.per_page;
  const to = from + filters.per_page - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: (data ?? []) as WorkoutSummaryDto[],
    total: count ?? 0,
  };
}

// 2. Get workout by ID
export async function getWorkoutById(
  supabase: SupabaseClient<Database>,
  userId: string,
  workoutId: string
): Promise<WorkoutDetailDto> {
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", workoutId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") throw new Error("NOT_FOUND");
    throw error;
  }
  if (!data) throw new Error("NOT_FOUND");

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb),
  } as WorkoutDetailDto;
}

// 3. Create workout
export async function createWorkout(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateWorkoutInput
): Promise<WorkoutDetailDto> {
  // Check training_type_code exists
  const { data: typeExists } = await supabase
    .from("training_types")
    .select("code")
    .eq("code", input.training_type_code)
    .single();

  if (!typeExists) throw new Error("INVALID_TRAINING_TYPE");

  // Calculate avg_pace if completed
  const avgPace =
    input.status === "completed" && input.distance_m && input.duration_s
      ? calculateAvgPace(input.distance_m, input.duration_s)
      : null;

  const insertData = {
    user_id: userId,
    training_type_code: input.training_type_code,
    planned_date: input.planned_date,
    position: input.position,
    planned_distance_m: input.planned_distance_m,
    planned_duration_s: input.planned_duration_s,
    steps_jsonb: input.steps,
    status: input.status || "planned",
    origin: "manual",
    distance_m: input.distance_m ?? null,
    duration_s: input.duration_s ?? null,
    avg_hr_bpm: input.avg_hr_bpm ?? null,
    completed_at: input.completed_at ?? null,
    rating: input.rating ?? null,
    avg_pace_s_per_km: avgPace,
  };

  const { data, error } = await supabase.from("workouts").insert(insertData).select("*").single();

  if (error) {
    if (error.code === "23505") throw new Error("DUPLICATE_POSITION");
    throw error;
  }

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb),
  } as WorkoutDetailDto;
}

// 4. Update workout
export async function updateWorkout(
  supabase: SupabaseClient<Database>,
  userId: string,
  workoutId: string,
  input: UpdateWorkoutInput
): Promise<WorkoutDetailDto> {
  // Get current workout
  const current = await getWorkoutById(supabase, userId, workoutId);

  // Build update object
  const updateData: any = {};
  if (input.planned_distance_m !== undefined) updateData.planned_distance_m = input.planned_distance_m;
  if (input.planned_duration_s !== undefined) updateData.planned_duration_s = input.planned_duration_s;
  if (input.steps !== undefined) updateData.steps_jsonb = input.steps;
  if (input.distance_m !== undefined) updateData.distance_m = input.distance_m;
  if (input.duration_s !== undefined) updateData.duration_s = input.duration_s;
  if (input.avg_hr_bpm !== undefined) updateData.avg_hr_bpm = input.avg_hr_bpm;
  if (input.completed_at !== undefined) updateData.completed_at = input.completed_at;
  if (input.rating !== undefined) updateData.rating = input.rating;
  if (input.status !== undefined) updateData.status = input.status;

  // Recalculate avg_pace if distance or duration changed
  const newDistance = input.distance_m ?? current.distance_m;
  const newDuration = input.duration_s ?? current.duration_s;
  if (input.distance_m !== undefined || input.duration_s !== undefined) {
    updateData.avg_pace_s_per_km = calculateAvgPace(newDistance, newDuration);
  }

  const { data, error } = await supabase
    .from("workouts")
    .update(updateData)
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb),
  } as WorkoutDetailDto;
}

// 5. Delete workout
export async function deleteWorkout(
  supabase: SupabaseClient<Database>,
  userId: string,
  workoutId: string
): Promise<void> {
  // Check ownership first
  await getWorkoutById(supabase, userId, workoutId);

  const { error } = await supabase.from("workouts").delete().eq("id", workoutId).eq("user_id", userId);

  if (error) {
    if (error.code === "23503") throw new Error("FK_CONSTRAINT");
    throw error;
  }
}

// 6. Complete workout
export async function completeWorkout(
  supabase: SupabaseClient<Database>,
  userId: string,
  workoutId: string,
  input: CompleteWorkoutInput
): Promise<WorkoutDetailDto> {
  const current = await getWorkoutById(supabase, userId, workoutId);

  if (current.status === "completed") {
    throw new Error("ALREADY_COMPLETED");
  }

  const avgPace = calculateAvgPace(input.distance_m, input.duration_s);

  const { data, error } = await supabase
    .from("workouts")
    .update({
      status: "completed",
      distance_m: input.distance_m,
      duration_s: input.duration_s,
      avg_hr_bpm: input.avg_hr_bpm,
      completed_at: input.completed_at,
      rating: input.rating ?? null,
      avg_pace_s_per_km: avgPace,
    })
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb),
  } as WorkoutDetailDto;
}

// 7. Skip workout
export async function skipWorkout(
  supabase: SupabaseClient<Database>,
  userId: string,
  workoutId: string
): Promise<WorkoutDetailDto> {
  const current = await getWorkoutById(supabase, userId, workoutId);

  if (current.status === "skipped") {
    throw new Error("ALREADY_SKIPPED");
  }

  const { data, error } = await supabase
    .from("workouts")
    .update({
      status: "skipped",
      distance_m: null,
      duration_s: null,
      avg_hr_bpm: null,
      completed_at: null,
      rating: null,
      avg_pace_s_per_km: null,
    })
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb),
  } as WorkoutDetailDto;
}

// 8. Cancel workout
export async function cancelWorkout(
  supabase: SupabaseClient<Database>,
  userId: string,
  workoutId: string
): Promise<WorkoutDetailDto> {
  const current = await getWorkoutById(supabase, userId, workoutId);

  if (current.status === "canceled") {
    throw new Error("ALREADY_CANCELED");
  }

  const { data, error } = await supabase
    .from("workouts")
    .update({
      status: "canceled",
      distance_m: null,
      duration_s: null,
      avg_hr_bpm: null,
      completed_at: null,
      rating: null,
      avg_pace_s_per_km: null,
    })
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb),
  } as WorkoutDetailDto;
}

// 9. Rate workout
export async function rateWorkout(
  supabase: SupabaseClient<Database>,
  userId: string,
  workoutId: string,
  input: RateWorkoutInput
): Promise<WorkoutDetailDto> {
  const current = await getWorkoutById(supabase, userId, workoutId);

  if (current.status !== "completed") {
    throw new Error("NOT_COMPLETED");
  }

  const { data, error } = await supabase
    .from("workouts")
    .update({ rating: input.rating })
    .eq("id", workoutId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) throw error;

  return {
    ...data,
    steps: transformSteps(data.steps_jsonb),
  } as WorkoutDetailDto;
}

// 10. Get last 3 workouts
export async function getLastThreeWorkouts(
  supabase: SupabaseClient<Database>,
  userId: string,
  trainingTypeCode?: string
): Promise<WorkoutLast3ItemDto[]> {
  let query = supabase
    .from("workouts")
    .select("id,completed_at,training_type_code")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(3);

  if (trainingTypeCode) {
    query = query.eq("training_type_code", trainingTypeCode);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []) as WorkoutLast3ItemDto[];
}

// 11. Get calendar
export async function getCalendar(
  supabase: SupabaseClient<Database>,
  userId: string,
  start: string,
  end: string,
  status?: string
): Promise<CalendarDto> {
  let query = supabase
    .from("workouts")
    .select("id,training_type_code,status,position,planned_date")
    .eq("user_id", userId)
    .gte("planned_date", start)
    .lte("planned_date", end)
    .order("planned_date", { ascending: true })
    .order("position", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Group by date
  const grouped = new Map<string, any[]>();
  (data ?? []).forEach((workout) => {
    const date = workout.planned_date;
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push({
      id: workout.id,
      training_type_code: workout.training_type_code,
      status: workout.status,
      position: workout.position,
    });
  });

  const days = Array.from(grouped.entries()).map(([date, workouts]) => ({
    date,
    workouts,
  }));

  return {
    range: { start, end },
    days,
  };
}
```

### Step 4: Endpoints - GET /api/v1/workouts and POST /api/v1/workouts

(src/pages/api/v1/workouts.ts)

```typescript
export const prerender = false;

import type { APIContext } from "astro";
import { listQuerySchema, createWorkoutSchema } from "../../../lib/validation/workouts";
import { listWorkouts, createWorkout } from "../../../lib/services/workoutsService";
import type { ApiListResponse, ApiResponse, WorkoutSummaryDto, WorkoutDetailDto } from "../../../types";

export async function GET(context: APIContext) {
  try {
    // 1. Auth check
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // 2. Validate query params
    const url = new URL(context.request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const filters = listQuerySchema.parse(params);

    // 3. Fetch workouts
    const { data, total } = await listWorkouts(context.locals.supabase, user.id, filters);

    // 4. Build response
    const response: ApiListResponse<WorkoutSummaryDto> = {
      data,
      page: filters.page,
      per_page: filters.per_page,
      total,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid query parameters",
            details: err.errors,
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    console.error("GET /api/v1/workouts failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function POST(context: APIContext) {
  try {
    // 1. Auth check
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // 2. Parse and validate body
    const body = await context.request.json();
    const input = createWorkoutSchema.parse(body);

    // 3. Create workout
    const workout = await createWorkout(context.locals.supabase, user.id, input);

    // 4. Build response
    const response: ApiResponse<WorkoutDetailDto> = { data: workout };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid workout data",
            details: err.errors,
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    if (err.message === "INVALID_TRAINING_TYPE") {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "Training type not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    if (err.message === "DUPLICATE_POSITION") {
      return new Response(
        JSON.stringify({
          error: {
            code: "duplicate_position",
            message: "Workout with this position already exists for the given date",
          },
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }

    console.error("POST /api/v1/workouts failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
```

### Step 5: Endpoints - GET/PATCH/DELETE /api/v1/workouts/[id]

(src/pages/api/v1/workouts/[id].ts)

```typescript
export const prerender = false;

import type { APIContext } from "astro";
import { updateWorkoutSchema } from "../../../../lib/validation/workouts";
import { getWorkoutById, updateWorkout, deleteWorkout } from "../../../../lib/services/workoutsService";
import type { ApiResponse, WorkoutDetailDto } from "../../../../types";

export async function GET(context: APIContext) {
  try {
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: { code: "bad_request", message: "Workout ID required" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const workout = await getWorkoutById(context.locals.supabase, user.id, id);
    const response: ApiResponse<WorkoutDetailDto> = { data: workout };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    if (err.message === "NOT_FOUND") {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "Workout not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    console.error("GET /api/v1/workouts/[id] failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function PATCH(context: APIContext) {
  try {
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: { code: "bad_request", message: "Workout ID required" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    const body = await context.request.json();
    const input = updateWorkoutSchema.parse(body);

    const workout = await updateWorkout(context.locals.supabase, user.id, id, input);
    const response: ApiResponse<WorkoutDetailDto> = { data: workout };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid workout data",
            details: err.errors,
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    if (err.message === "NOT_FOUND") {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "Workout not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    console.error("PATCH /api/v1/workouts/[id] failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function DELETE(context: APIContext) {
  try {
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    const { id } = context.params;
    if (!id) {
      return new Response(JSON.stringify({ error: { code: "bad_request", message: "Workout ID required" } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    await deleteWorkout(context.locals.supabase, user.id, id);

    return new Response(null, { status: 204 });
  } catch (err: any) {
    if (err.message === "NOT_FOUND") {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "Workout not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    if (err.message === "FK_CONSTRAINT") {
      return new Response(
        JSON.stringify({
          error: {
            code: "fk_constraint_violation",
            message: "Cannot delete workout created from accepted AI suggestion. Revert acceptance first.",
          },
        }),
        { status: 409, headers: { "content-type": "application/json" } }
      );
    }

    console.error("DELETE /api/v1/workouts/[id] failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
```

### Step 6: Domain Actions Endpoints

Implement remaining endpoints:

- `src/pages/api/v1/workouts/[id]/complete.ts` - POST complete
- `src/pages/api/v1/workouts/[id]/skip.ts` - POST skip
- `src/pages/api/v1/workouts/[id]/cancel.ts` - POST cancel
- `src/pages/api/v1/workouts/[id]/rate.ts` - POST rate

All follow the same pattern (auth check, validation, service call, error handling).

### Step 7: Special Endpoints

Implement:

- `src/pages/api/v1/workouts/last3.ts` - GET last3
- `src/pages/api/v1/calendar.ts` - GET calendar

### Step 8: Testing

Create test files in `.curls/`:

- `workouts-list.sh` - GET /workouts tests with different filters
- `workouts-crud.sh` - CRUD operation tests
- `workouts-actions.sh` - domain action tests
- `workouts-special.sh` - last3 and calendar tests

Each test should check:

- Happy path (200/201/204)
- Auth errors (401)
- Validation errors (422)
- Not found (404)
- Conflicts (409)

### Step 9: Documentation

Add to the plan:

- Usage examples for each endpoint
- Typical error scenarios
- Performance tips

### Step 10: Code Review Checklist

Check before committing:

- [ ] All endpoints have auth checks
- [ ] All Zod schemas complete
- [ ] Service functions verify ownership
- [ ] Consistent error handling
- [ ] Immutable fields protected
- [ ] avg_pace_s_per_km calculated automatically
- [ ] steps_jsonb transformed correctly
- [ ] Tests cover all scenarios
- [ ] Clear, helpful comments
- [ ] No SQL injection vulnerabilities
- [ ] Logging does not reveal sensitive data

---

## Summary

This plan covers all workout API requirements. Key aspects:

- **Security**: Authorization, validation, RLS, immutability
- **Performance**: Indexes, pagination, optimized queries
- **Maintainability**: Service layer, Zod validation, error handling
- **User experience**: Consistent API, clear errors, domain actions

Implementation time estimate: **10-15 hours** (larger than training-types due to complexity).
