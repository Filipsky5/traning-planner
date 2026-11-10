## API Endpoint Implementation Plan: AI Suggestions

### 1. Endpoint Overview

A set of endpoints for managing AI-generated workout suggestions (AI Suggestions). Covers listing, creation, detail retrieval, and actions: acceptance (creates a workout), rejection, and regeneration (a new suggestion based on an existing one). Suggestion expiration is calculated as `created_at + 24h` (without a DB column). The regeneration/creation limit is 3/day per user per planned_date.

Scope:

- GET `/api/v1/ai/suggestions` — list (with filters)
- POST `/api/v1/ai/suggestions` — create a new suggestion
- GET `/api/v1/ai/suggestions/{id}` — suggestion details
- POST `/api/v1/ai/suggestions/{id}/accept` — accept and create a workout
- POST `/api/v1/ai/suggestions/{id}/reject` — reject a suggestion
- POST `/api/v1/ai/suggestions/{id}/regenerate` — regenerate a new suggestion

Implementation: Astro 5 (API routes), TypeScript 5, Supabase (RLS), Zod (validation); React does not apply to the API layer. Use `context.locals.supabase` and `export const prerender = false` in endpoints.

### 2. Request Details

- HTTP methods: GET, POST (according to the specification)
- URL structures:
  - `/api/v1/ai/suggestions` (GET, POST)
  - `/api/v1/ai/suggestions/[id]` (GET)
  - `/api/v1/ai/suggestions/[id]/accept` (POST)
  - `/api/v1/ai/suggestions/[id]/reject` (POST)
  - `/api/v1/ai/suggestions/[id]/regenerate` (POST)

- Parameters and body per endpoint:
  - GET `/api/v1/ai/suggestions`
    - Query (optional): `status`, `created_after`, `created_before`, `page` (default 1), `per_page` (default 20, max 100), `sort` (default `created_at:desc`)
  - POST `/api/v1/ai/suggestions`
    - Body (required): `planned_date` (YYYY-MM-DD), `training_type_code` (string, existing type)
    - Body (optional): `context` (Record<string, unknown>)
  - GET `/api/v1/ai/suggestions/{id}`
    - Query (optional): `include_expired` (bool, default false)
  - POST `/api/v1/ai/suggestions/{id}/accept`
    - Body (required): `position` (number, >=1, unique per `user_id+planned_date`)
  - POST `/api/v1/ai/suggestions/{id}/reject`
    - Body: none
  - POST `/api/v1/ai/suggestions/{id}/regenerate`
    - Body (optional): `reason` (string), `adjustment_hint` (string)

### 3. Types Used

From `src/types.ts` (already existing):

- DTO:
  - `AiSuggestionDto` — response object (with `steps: WorkoutStepDto[]`, `expires_at: string`, and `planned_date: string` fields)
  - `AiSuggestionEventDto` — audit events (internal)
  - `ApiListResponse<T>`, `ApiResponse<T>` — response envelopes
- Commands (API inputs):
  - `AiSuggestionCreateCommand`
  - `AiSuggestionAcceptCommand`
  - `AiSuggestionRejectCommand` (empty alias)
  - `AiSuggestionRegenerateCommand`
- Workout steps: `WorkoutStepDto`, `StepPart`

Notes: Runtime validation uses Zod (schemas mirror the above types and domain constraints).

### 4. Response Details

- GET `/ai/suggestions` → 200 + `ApiListResponse<AiSuggestionDto>`
- POST `/ai/suggestions` → 201 + `ApiResponse<AiSuggestionDto>`
- GET `/ai/suggestions/{id}` → 200 + `ApiResponse<AiSuggestionDto>` (404 or 410 when expired and `include_expired=false`)
- POST `/ai/suggestions/{id}/accept` → 201 + `ApiResponse<WorkoutDetailDto>` (creates a workout with `origin='ai'` and a 1–1 link)
- POST `/ai/suggestions/{id}/reject` → 200 + `ApiResponse<AiSuggestionDto>`
- POST `/ai/suggestions/{id}/regenerate` → 201 + `ApiResponse<AiSuggestionDto>`

Example error codes: 400 (validation), 401 (unauthenticated), 404 (resource missing), 409 (conflict / already accepted / position collision), 410 (expired), 429 (daily limit), 500 (server error).

### 5. Data Flow

Shared rules:

- Authentication: `const supabase = locals.supabase` and `const user = await supabase.auth.getUser()` (or helpers); RLS provides isolation by `user_id`.
- Expiration: `expires_at = created_at + 24h` calculated in the API. Mutations (accept/reject/regenerate) are blocked after expiration (410).
- Limits: 3/day per user per planned_date (creation and regeneration counted together). Counting: COUNT where `created_at::date = current_date` AND `planned_date = target_date`.
- Events: entry in `ai_suggestion_events` for `created|accepted|rejected|regenerated` (metadata).

Per endpoint:

- GET list
  1. Validate query (Zod), map sorting to an allowlist of columns (`created_at`, `planned_date`, `status`).
  2. Select by `user_id`, status/date filters, sorting, pagination (COUNT + LIMIT/OFFSET).
  3. Calculate `expires_at` in the API; return in `ApiListResponse`.
  4. (Optional) ETag based on the sum of `id+updated_at` (utility `src/lib/http/etag.ts`).
- POST create
  1. Validate body (Zod); check that `training_type_code` exists (service: `trainingTypesService`).
  2. Check the daily limit (COUNT in `ai_suggestions` for the user, today).
  3. Call `aiEngine.generateSuggestion(...)` (stub in the MVP) ⇒ `steps_jsonb` steps, suggestion with status `shown`.
  4. INSERT into `ai_suggestions` in a transaction; EVENT `created`.
  5. Return 201 + object with `expires_at`.
- GET detail
  1. Fetch the `id+user_id` row; if missing → 404.
  2. If expired and `include_expired=false` → 410. Otherwise 200 with `expires_at`.
- POST accept
  1. Fetch the suggestion; verify the user, `shown` status, and that it has not expired.
  2. In a transaction:
     - Type/date consistency: the workout must have `training_type_code` and `planned_date` matching the suggestion.
     - Uniqueness of `(user_id, planned_date, position)` in `workouts` (DB constraint).
     - INSERT `workouts` with `origin='ai'` and `ai_suggestion_id = suggestion.id` (DB enforces 1–1 through UNIQUE).
     - UPDATE `ai_suggestions.status='accepted'`, `accepted_workout_id=workout.id`.
     - EVENT `accepted`.
  3. Return 201 + `WorkoutDetailDto`.
  4. Conflicts → 409; expiration → 410.
- POST reject
  1. Fetch the suggestion; if not `shown` or expired → 409/410.
  2. UPDATE `status='rejected'`; EVENT `rejected`; 200 with the object.
- POST regenerate
  1. Fetch the source suggestion; block if expired, user mismatch, or status `accepted` → 409/410/403 (403 through RLS is rare).
  2. Check the daily limit (as in create).
  3. Generate a new suggestion (AI), INSERT with status `shown`, EVENT `regenerated` (with a source link in `metadata`).
  4. Return 201 + new suggestion.

### 6. Security Considerations

- Authentication and RLS: only `locals.supabase` (no global client), queries based on `user_id` — RLS enforces access.
- Authorization: all DB operations must filter by `user_id`. Other users' `id` values cannot be enumerated (RLS).
- Input validation: Zod + sorting allowlist, pagination limits (max 100), date sanity checks (`YYYY-MM-DD`, ±2-year range).
- Conflict resilience: transactions for accept/regenerate (atomicity), rely on DB constraints (UNIQUE, FK).
- Domain rate limiting: 3/day per user per planned_date (429). Optional per-IP limiting in the future (middleware).
- No data leaks: responses contain only DTO-defined fields. No raw DB errors in responses.
- CORS: inherited from Astro settings (internal SSR).

### 7. Error Handling

Mapping (examples):

- 400: invalid body/query (ZodError), nonexistent `training_type_code`, invalid `position`
- 401: no user session
- 404: no suggestion with the given `id`
- 409: already accepted, `(planned_date, position)` collision, status other than `shown`
- 410: suggestion expired (for GET detail without `include_expired`, and for mutations)
- 429: 3/day limit exceeded for the given planned_date
- 500: server exception, transaction error

Error format (consistent):

```json
{ "error": { "code": "string", "message": "string" } }
```

Error logging:

- Minimum: `console.error` (stack trace).
- (Optional) entry in `ai_logs` with `level='error'`, `event='api.ai_suggestions.<action>'`, `payload` (context without sensitive data).

### 8. Performance Considerations

- DB indexes (recommended if absent from migrations):
  - `ai_suggestions (user_id, created_at DESC)`
  - `ai_suggestions (user_id, status, created_at DESC)`
  - `workouts (user_id, planned_date, position)` UNIQUE
- Pagination: LIMIT/OFFSET, `per_page <= 100`.
- ETag for GET list/detail (optional; `src/lib/http/etag.ts`).
- JSONB `steps_jsonb`: validate length (e.g., max 50 steps) and payload size.
- Transactions: only for mutations, kept as short as possible.
- Select specific columns in SELECT (no unnecessary fields).

### 9. Implementation Steps

1. File structure (Astro API):
   - `src/pages/api/v1/ai/suggestions/index.ts` (GET, POST)
   - `src/pages/api/v1/ai/suggestions/[id].ts` (GET)
   - `src/pages/api/v1/ai/suggestions/[id]/accept.ts` (POST)
   - `src/pages/api/v1/ai/suggestions/[id]/reject.ts` (POST)
   - `src/pages/api/v1/ai/suggestions/[id]/regenerate.ts` (POST)
   - Each file: `export const prerender = false`, `export async function GET/POST(...) {}`

2. Domain service:
   - `src/lib/services/aiSuggestionsService.ts`
     - `listSuggestions(supabase, userId, filters)`
     - `createSuggestion(supabase, userId, cmd)`
     - `getSuggestion(supabase, userId, id, includeExpired)`
     - `acceptSuggestion(supabase, userId, id, cmd)`
     - `rejectSuggestion(supabase, userId, id)`
     - `regenerateSuggestion(supabase, userId, id, cmd)`
   - `src/lib/services/aiSuggestionEventsService.ts` — event recording
   - `src/lib/services/aiEngine.ts` — stub generating `steps_jsonb` (calibration in the future)

3. Validation (Zod) — `src/lib/validation/aiSuggestions.ts`:
   - Schemas for: list query, create, accept, regenerate
   - Reuse step schemas (`WorkoutStepDto`) from `workouts` if/when available

4. Endpoint implementation:
   - Get `supabase` from `locals`, verify session (401)
   - Input validation (Zod → 400)
   - Delegate to the service, map results to DTOs
   - Calculate `expires_at` in the API
   - `ApiResponse`/`ApiListResponse` response envelopes, 200/201 statuses

5. Transactions:
   - Run `acceptSuggestion` and processes creating new records in a single transaction
   - Enforce consistency: type/date/position/1–1 `ai_suggestion_id`

6. Errors and codes:
   - Consistent exception-to-code mapping (400/401/404/409/410/429/500)
   - Uniform error payload

7. Tests (E2E in Playwright — phase II):
   - Scenarios: create→detail, accept (position conflict), reject, regenerate (limit), list filters
   - AI stubs (deterministic `aiEngine` results)

8. Quality:
   - `npm run lint` / `npm run lint:fix`, `npm run format`
   - PR review: JSON response snapshots, test description

9. Documentation:
   - Update `.ai/api-plan.md` if the contract changes
   - Update `.ai/prd.md` if user flows are affected

### 10. Implementation Notes (Specific Details)

- `expires_at`: `new Date(new Date(row.created_at).getTime() + 24*60*60*1000).toISOString()`
- Daily limit: `count(*) from ai_suggestions where user_id = $1 and created_at::date = current_date`
- Sort parsing: allowed fields and directions `asc|desc`, default `created_at:desc`
- Allowed statuses: `shown|accepted|rejected|expired` (`expired` is read-only; mutations blocked when `now() > created_at + 24h`)
- Accept: verify `(user_id, planned_date, position)` before INSERT, but ultimately rely on UNIQUE + handle 409
- Reuse: `trainingTypesService` to validate `training_type_code`
- ETag (optional): return `ETag` and handle `If-None-Match` → 304
