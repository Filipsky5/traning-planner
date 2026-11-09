## Backend – Calendar View Unit Test Plan

### 1. Context and Goals

The goal is to design a **unit test suite (Vitest)** for the calendar backend so that:

- key date range and status filtering rules remain stable,
- validation errors consistently map to appropriate HTTP codes,
- `CalendarDto` remains consistent regardless of input (0+ workouts, multiple days, different statuses).

Scope covers **three levels**:

- parameter validation (`calendarQuerySchema`),
- service logic (`getCalendar`),
- HTTP handler (`GET /api/v1/calendar`).

### 2. General Assumptions (@testing-unit-vitest.mdc)

- **Framework**: Vitest (`describe` / `it` / `expect`).
- **Pattern**: AAA (Arrange – Act – Assert) in each test.
- **Structure**: Clear `describe` blocks per function / layer (schema, service, handler).
- **Mocks**:
  - `vi.fn()` / manual stubs for `SupabaseClient`,
  - `vi.spyOn()` for `getCalendar` in handler tests.
- **Scope**:
  - validation → test the **real** `calendarQuerySchema` (do not mock Zod),
  - service → isolate from real Supabase by stubbing chained methods (`from().select().eq().gte()...`),
  - handler → treat as “unit/integration”, mocking only the service (`getCalendar`), leaving the schema intact.

Recommended execution:

```bash
npm run test:unit -- src/lib/validation/workouts.calendarQuerySchema.test.ts
npm run test:unit -- src/lib/services/workoutsService.calendar.test.ts
npm run test:unit -- src/pages/api/v1/calendar.test.ts
```

---

## 3. `src/lib/validation/workouts.ts` – `calendarQuerySchema`

### 3.1. Proposed Test Location

- File: `src/lib/validation/workouts.calendarQuerySchema.test.ts`
- `describe("calendarQuerySchema", () => { ... })`

### 3.2. Business Rules to Cover

- `start` and `end` are **required**.
- `start` and `end` must use **`YYYY-MM-DD`** (regex).
- `status` is **optional**, but if present must be one of:
  - `"planned" | "completed" | "skipped" | "canceled"`.
- Range rule: \(`new Date(end) >= new Date(start)`\) – allowed:
  - `start < end`,
  - `start === end`,
  - prohibited: `end < start`.
- **Semantically invalid dates** (e.g., `2025-13-01`) – currently `new Date()` returns `Invalid Date`, so refine should fail.

### 3.3. Happy Path Scenarios

1. **Valid month range, no status**
   - Input: `{ start: "2025-01-01", end: "2025-01-31" }`.
   - Expected:
     - `parse()` returns an object with the same values,
     - `status` is `undefined`.

2. **Valid single-day range (start === end)**
   - Input: `{ start: "2025-02-15", end: "2025-02-15" }`.
   - Expected: no error, correct result.

3. **Valid range with each allowed status**
   - Test data: status ∈ `["planned", "completed", "skipped", "canceled"]`.
   - For each status:
     - Input: `{ start: "2025-03-01", end: "2025-03-31", status }`.
     - Expected: no error; result `status` exactly matches input.

### 3.4. Validation Scenarios and Edge Cases (Negative)

4. **Missing `start`**
   - Input: `{ end: "2025-01-31" }`.
   - Expected:
     - `parse()` throws `ZodError`,
     - `issues` reports missing `start`.

5. **Missing `end`**
   - Input: `{ start: "2025-01-01" }`.
   - Expected: same as above for `end`.

6. **Invalid date format – `start`**
   - Examples: `"2025/01/01"`, `"2025-1-1"`, `"01-01-2025"`.
   - Expected:
     - `parse()` throws `ZodError`,
     - error message comes from regex (`Invalid` / `Expected string to match`).

7. **Invalid date format – `end`**
   - Same as item 6, for `end`.

8. **`end` < `start` – range rule violation**
   - Input: `{ start: "2025-02-10", end: "2025-02-01" }`.
   - Expected:
     - `parse()` throws `ZodError`,
     - `issues` contains a `refine` error with `"End date must be >= start date"`.

9. **Invalid status**
   - Input: `{ start: "2025-01-01", end: "2025-01-31", status: "archived" as any }`.
   - Expected: `ZodError` indicating an invalid enum value.

10. **Semantically invalid dates (e.g., month 13)**
    - Input: `{ start: "2025-13-01", end: "2025-13-10" }`.
    - Expected:
      - Regex passes, but `refine` should reject because `new Date(...)` yields `Invalid Date` → comparison returns `false`.
      - `ZodError` with the `refine` message.

11. **Minimal fields – extra fields ignored**
    - Input: `{ start: "2025-01-01", end: "2025-01-31", foo: "bar" } as any`.
    - Expected:
      - Current schema is _not_ `strict()`, so extra fields are accepted.
      - Test documents this deliberate behavior, without necessarily requiring a change.

---

## 4. `src/lib/services/workoutsService.ts` – `getCalendar`

### 4.1. Proposed Test Location

- File: `src/lib/services/workoutsService.calendar.test.ts`
- `describe("getCalendar", () => { ... })`

### 4.2. Supabase Mock Assumptions

- Create a lightweight `supabase` stub with a chain:
  - `.from("workouts")` → returns query object,
  - `.select()` → records selected columns, returns `this`,
  - `.eq()` / `.gte()` / `.lte()` / `.order()` → record calls in an array (for assertions), return `this`,
  - terminal call: an `execute()` function invoked by tests and attached through a `.then()`-like mechanism:
    - simplest: `.order()` ends the chain; the test sets query `__resolve` (`{ data, error }`), and `getCalendar` uses `await query;` — stub implements `then`/`[Symbol.toStringTag]` or returns `{ data, error }` from the last method (`order`).
- **Simpler option** (preferred): instead of faithfully emulating an asynchronous client, stub `select()` to return `{ data, error }` directly and subsequent `.eq()/.gte()/.lte()/.order()` as no-ops; focus on **grouping** and **return shape**, checking date/status filters at handler level through parameters.
- The plan assumes **two test types**:
  1. shape and grouping tests – stub controls `data`,
  2. optional query construction test – stub records `eq/gte/lte/order` calls.

### 4.3. Business Rules to Cover

- User filtering: always `user_id = userId`.
- **Date range** filtering:
  - `planned_date >= start`,
  - `planned_date <= end`.
- Optional status filtering:
  - if `status` supplied → `eq("status", status)`,
  - if `status` is `undefined` → no `eq("status", ...)`.
- Sorting:
  - `order("planned_date", { ascending: true })`,
  - then `order("position", { ascending: true })`.
- **Grouping by date**:
  - all records with the same `planned_date` belong to the same day,
  - workouts within a day retain `position` order,
  - `days` contains only dates present in the data.
- Result structure:
  - `range: { start, end }` identical to inputs,
  - `days: CalendarDayDto[]` with `{ date, workouts }`,
  - each `workout` has only: `id`, `training_type_code`, `status`, `position`.

### 4.4. Test Scenarios – Grouping and Shape

1. **No workouts in range**
   - Stub `data: []`, `error: null`.
   - Input: `start = "2025-01-01"`, `end = "2025-01-31"`, `status = undefined`.
   - Expected:
     - `result.range` exactly `{ start, end }`,
     - `result.days` is empty.

2. **One workout on one day**
   - `data` contains 1 record:
     - `{ id: "w1", training_type_code: "easy_run", status: "planned", position: 1, planned_date: "2025-01-10" }`.
   - Expected:
     - `days.length === 1`,
     - `days[0].date === "2025-01-10"`,
     - `days[0].workouts` has 1 item matching input fields.

3. **Multiple workouts on one day – position sorting**
   - `data` contains 3 records with the same `planned_date` but random position order.
   - Expected:
     - all 3 in `days[0].workouts`,
     - **result DTO** order matches `position` (rely on DB ORDER BY — test assumes `data` is sorted and checks that **we preserve order**).

4. **Multiple days – correct grouping**
   - `data` contains:
     - 2 workouts for `"2025-01-10"`,
     - 1 workout for `"2025-01-11"`,
     - 1 workout for `"2025-01-15"`.
   - Expected:
     - `days.length === 3`,
     - dates in `days` match the three distinct days,
     - each day's workout count matches input.

5. **Different statuses – copied unchanged**
   - `data` contains workouts with `status` ∈ `["planned", "completed", "skipped", "canceled"]`.
   - Expected:
     - each `result.days[*].workouts[*].status` equals input (no mapping/change).

6. **Single-day range**
   - `start === end`, data contains workouts only on that day.
   - Expected: `range` as above, `days.length === 1`.

### 4.5. Scenarios – Error Handling

7. **Supabase error – non-null error**
   - Stub returns `{ data: null, error: { message: "db error" } }`.
   - Expected:
     - `getCalendar(...)` throws the same `error` (no wrapping),
     - test uses `await expect(getCalendar(...)).rejects.toThrow("db error")`.

### 4.6. Optional Scenarios – Query Construction Verification

8. **`user_id` filter + date range**
   - Query stub records `eq/gte/lte/order` calls (e.g., in `calls`).
   - Call: `getCalendar(supabaseStub, "user-123", "2025-01-01", "2025-01-31")`.
   - Expected:
     - `eq("user_id", "user-123")` called once,
     - `gte("planned_date", "2025-01-01")`,
     - `lte("planned_date", "2025-01-31")`.

9. **Optional status – present**
   - Call: `getCalendar(supabaseStub, "user-123", "2025-01-01", "2025-01-31", "planned")`.
   - Expected:
     - recorded calls include `eq("status", "planned")`.

10. **Optional status – absent**
    - Call with `status = undefined`.
    - Expected:
      - no `eq("status", ...)` call (e.g., assert no such entry in `calls`).

11. **Sorting**
    - For any parameters, expected:
      - `order("planned_date", { ascending: true })` called before `order("position", { ascending: true })`.

---

## 5. `src/pages/api/v1/calendar.ts` – `GET` Handler

### 5.1. Proposed Test Location

- File: `src/pages/api/v1/calendar.test.ts`
- `describe("GET /api/v1/calendar", () => { ... })`

### 5.2. Test Setup

- Import `GET` directly from the module:
  - `import { GET } from "./calendar";`
- Create lightweight `APIContext` objects:
  - `request`: `new Request("http://localhost/api/v1/calendar?start=...&end=...&status=...")`,
  - `locals`: `{ user: { id: "user-123" }, supabase: {} as any }`.
- Mock `getCalendar`:
  - `vi.spyOn(workoutsService, "getCalendar")`.
- Do not mock `calendarQuerySchema` — use real validation to test Zod rules too.

### 5.3. Business Rules to Cover

- No `user` in `context.locals` → **401 Unauthorized**.
- Zod throws `ZodError` → **422 Unprocessable Entity** with `"validation_error"`.
- When valid:
  - handler calls `getCalendar` with:
    - `context.locals.supabase`,
    - `user.id`,
    - `start`, `end`, optional `status`,
  - returns **200 OK** with `ApiResponse<CalendarDto>`.
- `getCalendar` throws any other error → **500 Internal Server Error** with `"internal_error"`.

### 5.4. Test Scenarios

1. **401 – no user in locals**
   - Context:
     - `locals.user = undefined`,
     - `request` with valid query params (start/end).
   - Call: `const res = await GET(ctx as any);`.
   - Expected:
     - `res.status === 401`,
     - `content-type` contains `"application/json"`,
     - parsed JSON body contains:
       - `error.code === "unauthorized"`,
       - `error.message === "Authentication required"`.

2. **422 – Zod validation error (e.g., `end` < `start`)**
   - Context:
     - `locals.user = { id: "user-123" }`,
     - `request` with URL:
       - `/api/v1/calendar?start=2025-02-10&end=2025-02-01`.
   - Expected:
     - `res.status === 422`,
     - `error.code === "validation_error"`,
     - `error.message === "Invalid query parameters"`,
     - `error.details` is an array (`ZodError["errors"]`).
   - Additionally (optional):
     - verify `getCalendar` **was not** called.

3. **200 – happy path without status**
   - Context:
     - `locals.user = { id: "user-123" }`,
     - `locals.supabase = {}` (mock),
     - `request` with URL:
       - `/api/v1/calendar?start=2025-01-01&end=2025-01-31`.
   - Mock:
     - `getCalendar` returns `Promise.resolve(mockCalendarDto)`.
   - Expected:
     - `res.status === 200`,
     - correct `content-type`,
     - body JSON:
       - has `data` equal to `mockCalendarDto`,
     - `getCalendar` called exactly once with:
       - `(locals.supabase, "user-123", "2025-01-01", "2025-01-31", undefined)`.

4. **200 – happy path with status**
   - As above, but URL:
     - `/api/v1/calendar?start=2025-01-01&end=2025-01-31&status=planned`.
   - Expected:
     - `getCalendar` called with `status = "planned"`,
     - response remains `{ data: mockCalendarDto }`.

5. **500 – unexpected service error**
   - Context: happy path (user + valid query).
   - Mock:
     - `getCalendar` throws `new Error("DB down")`.
   - Expected:
     - `res.status === 500`,
     - JSON error:
       - `error.code === "internal_error"`,
       - `error.message === "Unexpected server error"`.

6. **422 – invalid date format (e.g., `/` instead of `-`)**
   - URL:
     - `/api/v1/calendar?start=2025/01/01&end=2025/01/31`.
   - Expected:
     - status 422,
     - `error.code === "validation_error"`,
     - no `getCalendar` call.

7. **422 – missing required parameters**
   - Cases:
     - missing `start`,
     - missing `end`,
     - both missing.
   - For each:
     - Expected: 422 + `validation_error`.

### 5.5. Additional Assertions (Optional)

- Verify:
  - 422 path calls `console.warn` describing validation error,
  - 500 path calls `console.error` with exception information.
- These enforce logging standards but are optional (need not block refactoring).

---

## 6. Summary and Coverage Target

- **Files in scope**:
  - `src/lib/validation/workouts.ts` – `calendarQuerySchema`,
  - `src/lib/services/workoutsService.ts` – `getCalendar`,
  - `src/pages/api/v1/calendar.ts` – `GET` handler.
- **Calendar backend coverage target**:
  - ≥ 80% lines and branches for these functions (easy with deterministic logic),
  - all paths (401/422/200/500) covered by at least one test.
- **Next step**:
  - create the specified test files,
  - implement scenarios according to this plan,
  - include tests in existing `npm run test:unit` scripts.
