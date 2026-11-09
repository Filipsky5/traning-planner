# API Endpoint Implementation Plan: User Goal

## 1. Endpoint Overview

The User Goal endpoint manages a user's single training goal. In the MVP, each user may have exactly one "distance_by_date" goal (achieving a specified distance by a chosen date).

**Key functionality:**

- Retrieve current user goal (GET)
- Create or update a goal (PUT - upsert)
- Delete a goal (DELETE)

**MVP constraints:**

- One goal per user
- Only `distance_by_date`
- No goal history (current state only)

---

## 2. Request Details

### 2.1 GET `/api/v1/user-goal`

**HTTP Method:** GET

**URL Structure:** `/api/v1/user-goal`

**Parameters:**

- Required: none
- Optional: none

**Headers:**

- `Authorization: Bearer <token>` (required)

**Request Body:** N/A

---

### 2.2 PUT `/api/v1/user-goal`

**HTTP Method:** PUT

**URL Structure:** `/api/v1/user-goal`

**Parameters:**

- Required: none
- Optional: none

**Headers:**

- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json` (required)

**Request Body:**

```json
{
  "goal_type": "distance_by_date",
  "target_distance_m": 100000,
  "due_date": "2025-12-31",
  "notes": "Berlin Half Marathon preparation"
}
```

**Request body fields:**

- `goal_type` (string, required): Goal type. Only "distance_by_date" in MVP.
- `target_distance_m` (number, required): Target distance in meters. Min: 1, Max: 1000000 (1000 km).
- `due_date` (string, required): Target date in YYYY-MM-DD format. Today or in the future.
- `notes` (string, optional): User notes. Max 500 characters.

---

### 2.3 DELETE `/api/v1/user-goal`

**HTTP Method:** DELETE

**URL Structure:** `/api/v1/user-goal`

**Parameters:**

- Required: none
- Optional: none

**Headers:**

- `Authorization: Bearer <token>` (required)

**Request Body:** N/A

---

## 3. Types Used

### 3.1 DTO Types (Already Defined in `src/types.ts`)

```typescript
// GET response - may return goal or null
type UserGoalDto = Pick<UserGoalRow, "goal_type" | "target_distance_m" | "due_date" | "notes">;

// PUT request/response
type UserGoalUpsertCommand = UserGoalDto;

// API Response wrapper
interface ApiResponse<T> {
  data: T;
}
```

### 3.2 Validation Types (Create in `src/lib/validation/userGoals.ts`)

```typescript
import { z } from "zod";

export const userGoalUpsertSchema = z
  .object({
    goal_type: z.enum(["distance_by_date"]),
    target_distance_m: z.number().int().min(1).max(1000000),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      const dueDate = new Date(data.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate >= today;
    },
    { message: "due_date must be today or in the future" }
  );

export type UserGoalUpsertInput = z.infer<typeof userGoalUpsertSchema>;
```

---

## 4. Response Details

### 4.1 GET `/api/v1/user-goal`

**Success Response (200 OK):**

```json
{
  "data": {
    "goal_type": "distance_by_date",
    "target_distance_m": 100000,
    "due_date": "2025-12-31",
    "notes": "Berlin Half Marathon"
  }
}
```

**Success Response - no goal (200 OK):**

```json
{
  "data": null
}
```

**Error Responses:**

- **401 Unauthorized:**
  ```json
  {
    "error": {
      "code": "unauthorized",
      "message": "Authentication required"
    }
  }
  ```
- **500 Internal Server Error:**
  ```json
  {
    "error": {
      "code": "internal_error",
      "message": "Unexpected server error"
    }
  }
  ```

---

### 4.2 PUT `/api/v1/user-goal`

**Success Response (200 OK):**

```json
{
  "data": {
    "goal_type": "distance_by_date",
    "target_distance_m": 100000,
    "due_date": "2025-12-31",
    "notes": "Berlin Half Marathon"
  }
}
```

**Error Responses:**

- **401 Unauthorized:** (same as GET)
- **422 Unprocessable Entity:**
  ```json
  {
    "error": {
      "code": "validation_error",
      "message": "Invalid goal data",
      "details": [
        {
          "code": "too_small",
          "path": ["target_distance_m"],
          "message": "Number must be greater than or equal to 1"
        }
      ]
    }
  }
  ```
- **500 Internal Server Error:** (same as GET)

---

### 4.3 DELETE `/api/v1/user-goal`

**Success Response (204 No Content):**

- Empty response body
- Status: 204

**Error Responses:**

- **401 Unauthorized:** (same as GET)
- **404 Not Found:**
  ```json
  {
    "error": {
      "code": "not_found",
      "message": "No goal found to delete"
    }
  }
  ```
- **500 Internal Server Error:** (same as GET)

---

## 5. Data Flow

### 5.1 GET `/api/v1/user-goal`

```
1. Request arrives → Astro API route
2. Middleware → Auth check (context.locals.user)
3. Service Layer → getUserGoal(supabase, userId)
4. Supabase Query:
   SELECT goal_type, target_distance_m, due_date, notes
   FROM user_goals
   WHERE user_id = $1
5. Transform → UserGoalDto | null
6. Response → ApiResponse<UserGoalDto | null>
```

**SQL Query (via Supabase):**

```typescript
const { data, error } = await supabase
  .from("user_goals")
  .select("goal_type, target_distance_m, due_date, notes")
  .eq("user_id", userId)
  .maybeSingle();
```

---

### 5.2 PUT `/api/v1/user-goal`

```
1. Request arrives → Astro API route
2. Middleware → Auth check (context.locals.user)
3. Validation → Zod schema (userGoalUpsertSchema)
4. Service Layer → upsertUserGoal(supabase, userId, command)
5. Supabase Upsert:
   INSERT INTO user_goals (user_id, goal_type, target_distance_m, due_date, notes)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (user_id) DO UPDATE SET ...
6. Transform → UserGoalDto
7. Response → ApiResponse<UserGoalDto>
```

**SQL Query (via Supabase):**

```typescript
const { data, error } = await supabase
  .from("user_goals")
  .upsert({
    user_id: userId,
    goal_type: command.goal_type,
    target_distance_m: command.target_distance_m,
    due_date: command.due_date,
    notes: command.notes || null,
  })
  .select("goal_type, target_distance_m, due_date, notes")
  .single();
```

---

### 5.3 DELETE `/api/v1/user-goal`

```
1. Request arrives → Astro API route
2. Middleware → Auth check (context.locals.user)
3. Service Layer → deleteUserGoal(supabase, userId)
4. Check existence → SELECT COUNT(*) FROM user_goals WHERE user_id = $1
5. If not exists → throw "GOAL_NOT_FOUND"
6. Supabase Delete:
   DELETE FROM user_goals WHERE user_id = $1
7. Response → 204 No Content
```

**SQL Queries (via Supabase):**

```typescript
// Check existence
const { count } = await supabase.from("user_goals").select("*", { count: "exact", head: true }).eq("user_id", userId);

if (count === 0) throw new Error("GOAL_NOT_FOUND");

// Delete
const { error } = await supabase.from("user_goals").delete().eq("user_id", userId);
```

---

## 6. Security Considerations

### 6.1 Authentication

- **Requirement:** All endpoints require a logged-in user
- **Implementation:** Guard clause at the beginning of each function
  ```typescript
  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  ```
- **Token:** Supabase Auth JWT in `Authorization: Bearer <token>`

### 6.2 Authorization

- **Ownership:** Users may operate only on their own goal
- **Implementation:** All queries filter by `user_id` from `context.locals.user.id`
- **RLS (Row Level Security):** Supabase RLS enforces database-level authorization
  ```sql
  CREATE POLICY "Users can only access their own goals"
  ON user_goals
  FOR ALL
  USING (auth.uid() = user_id);
  ```

### 6.3 Input Validation

- **Zod schemas:** Runtime validation of all inputs
- **Protections:**
  - SQL Injection: Supabase uses parameterized queries
  - XSS: `notes` limited to 500 characters, client-side sanitization
  - Type safety: TypeScript + Zod ensure correct types
  - Business rules: `due_date` must be in the future
  - Range validation: `target_distance_m` 1-1000000m

### 6.4 Rate Limiting (Optional)

- May add PUT/DELETE rate limiting middleware (e.g., max 10 req/min)
- MVP: rely on RLS and auth

### 6.5 CORS

- API endpoints default to same-origin requests only
- If frontend uses another domain: configure middleware CORS

---

## 7. Error Handling

### 7.1 GET `/api/v1/user-goal`

| Scenario        | HTTP Status | Error Code       | Handling                          |
| --------------- | ----------- | ---------------- | --------------------------------- |
| Unauthenticated | 401         | `unauthorized`   | Initial guard clause              |
| Goal exists     | 200         | N/A              | Return UserGoalDto                |
| Goal missing    | 200         | N/A              | Return `{ data: null }`           |
| DB error        | 500         | `internal_error` | Log error, return generic message |

**Implementation:**

```typescript
export async function GET(context: APIContext) {
  try {
    // Auth guard
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // Fetch goal
    const goal = await getUserGoal(context.locals.supabase, user.id);

    // Happy path
    return new Response(JSON.stringify({ data: goal }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("GET /api/v1/user-goal failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
```

---

### 7.2 PUT `/api/v1/user-goal`

| Scenario                  | HTTP Status | Error Code         | Handling                       |
| ------------------------- | ----------- | ------------------ | ------------------------------ |
| Unauthenticated           | 401         | `unauthorized`     | Guard clause                   |
| Validation failed         | 422         | `validation_error` | Catch ZodError, return details |
| Due date in past          | 422         | `validation_error` | Zod refine rule                |
| Invalid goal_type         | 422         | `validation_error` | Zod enum validation            |
| Conflict (race condition) | 500         | `internal_error`   | Upsert handles automatically   |
| DB error                  | 500         | `internal_error`   | Log error, generic message     |

**Implementation:**

```typescript
export async function PUT(context: APIContext) {
  try {
    // Auth guard
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // Validate body
    const body = await context.request.json();
    const input = userGoalUpsertSchema.parse(body);

    // Upsert goal
    const goal = await upsertUserGoal(context.locals.supabase, user.id, input);

    // Happy path
    return new Response(JSON.stringify({ data: goal }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    // Validation errors
    if (err.name === "ZodError") {
      console.warn("PUT /api/v1/user-goal - validation error", { errors: err.errors });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid goal data",
            details: err.errors,
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    // Server errors
    console.error("PUT /api/v1/user-goal failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
```

---

### 7.3 DELETE `/api/v1/user-goal`

| Scenario        | HTTP Status | Error Code       | Handling                        |
| --------------- | ----------- | ---------------- | ------------------------------- |
| Unauthenticated | 401         | `unauthorized`   | Guard clause                    |
| Goal missing    | 404         | `not_found`      | Service throws "GOAL_NOT_FOUND" |
| Goal deleted    | 204         | N/A              | Empty response                  |
| DB error        | 500         | `internal_error` | Log error, generic message      |

**Implementation:**

```typescript
export async function DELETE(context: APIContext) {
  try {
    // Auth guard
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // Delete goal
    await deleteUserGoal(context.locals.supabase, user.id);

    // Happy path - 204 No Content
    return new Response(null, { status: 204 });
  } catch (err: any) {
    // Not found error
    if (err.message === "GOAL_NOT_FOUND") {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "No goal found to delete" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Server errors
    console.error("DELETE /api/v1/user-goal failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
```

---

## 8. Performance Considerations

### 8.1 Database Queries

**Optimizations:**

- **Index:** `user_id` is primary key or has a unique constraint - native index
- **Single query:** GET/DELETE use one query (no N+1)
- **Upsert efficiency:** PUT uses `ON CONFLICT` instead of SELECT + INSERT/UPDATE
- **Projection:** SELECT only needed columns (not `SELECT *`)

**Expected times:**

- GET: ~10-30ms (single row lookup by PK)
- PUT: ~20-50ms (upsert + returning)
- DELETE: ~15-40ms (check + delete)

### 8.2 Payload Size

**Request:**

- PUT body: ~100-200 bytes (JSON)

**Response:**

- GET/PUT: ~150-250 bytes (JSON)
- DELETE: 0 bytes (204 No Content)

**Optimizations:**

- No compression for such small payloads (overhead > benefit)
- JSON format - readable and sufficiently compact

### 8.3 Caching

**MVP: No cache layer**

- Data changes rarely (goal setup every few months)
- Small user base
- Supabase connection pool is sufficient

**Future (optional):**

- Redis cache for GET endpoint (TTL: 5 min)
- Cache invalidation on PUT/DELETE
- ETag header for conditional requests

### 8.4 Concurrent Requests

**Race conditions:**

- **PUT:** Upsert (`ON CONFLICT`) is atomic - safe
- **DELETE:** Check-then-delete may race (insignificant in MVP)

**Mitigation:**

- Upsert handle conflicts automatically
- RLS policies ensure per-user isolation
- Transaction isolation level: READ COMMITTED (default Postgres)

### 8.5 Monitoring

**Metrics to track:**

- Request latency (p50, p95, p99)
- Error rate per endpoint
- DB query duration
- Auth failures (potential attack detection)

**Tools:**

- Supabase Dashboard: query performance
- Application logs: error tracking
- Optional: Sentry for error monitoring

---

## 9. Implementation Stages

### Step 1: Create Validation Schema

**File:** `src/lib/validation/userGoals.ts`

```typescript
import { z } from "zod";

export const userGoalUpsertSchema = z
  .object({
    goal_type: z.enum(["distance_by_date"]),
    target_distance_m: z.number().int().min(1).max(1000000),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      const dueDate = new Date(data.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate >= today;
    },
    { message: "due_date must be today or in the future" }
  );

export type UserGoalUpsertInput = z.infer<typeof userGoalUpsertSchema>;
```

**Test:**

```typescript
// Valid
userGoalUpsertSchema.parse({
  goal_type: "distance_by_date",
  target_distance_m: 100000,
  due_date: "2025-12-31",
  notes: "Berlin Half",
}); // ✅

// Invalid - due_date in the past
userGoalUpsertSchema.parse({
  goal_type: "distance_by_date",
  target_distance_m: 100000,
  due_date: "2020-01-01",
}); // ❌ ZodError
```

---

### Step 2: Create Service Layer

**File:** `src/lib/services/userGoalsService.ts`

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { UserGoalDto } from "../../types";
import type { UserGoalUpsertInput } from "../validation/userGoals";

/**
 * Get current user goal or null if not set
 */
export async function getUserGoal(supabase: SupabaseClient, userId: string): Promise<UserGoalDto | null> {
  const { data, error } = await supabase
    .from("user_goals")
    .select("goal_type, target_distance_m, due_date, notes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return data as UserGoalDto | null;
}

/**
 * Create or replace user goal (upsert)
 */
export async function upsertUserGoal(
  supabase: SupabaseClient,
  userId: string,
  command: UserGoalUpsertInput
): Promise<UserGoalDto> {
  const { data, error } = await supabase
    .from("user_goals")
    .upsert({
      user_id: userId,
      goal_type: command.goal_type,
      target_distance_m: command.target_distance_m,
      due_date: command.due_date,
      notes: command.notes || null,
    })
    .select("goal_type, target_distance_m, due_date, notes")
    .single();

  if (error) throw error;

  return data as UserGoalDto;
}

/**
 * Delete user goal
 * Throws "GOAL_NOT_FOUND" if goal doesn't exist
 */
export async function deleteUserGoal(supabase: SupabaseClient, userId: string): Promise<void> {
  // Check if goal exists
  const { count } = await supabase.from("user_goals").select("*", { count: "exact", head: true }).eq("user_id", userId);

  if (count === 0) {
    throw new Error("GOAL_NOT_FOUND");
  }

  // Delete goal
  const { error } = await supabase.from("user_goals").delete().eq("user_id", userId);

  if (error) throw error;
}
```

**Test (manual via curl or Playwright):**

- Verify getUserGoal returns null for new user
- Verify upsertUserGoal creates goal
- Verify getUserGoal returns created goal
- Verify deleteUserGoal removes goal
- Verify deleteUserGoal throws for non-existent goal

---

### Step 3: Create API Endpoint

**File:** `src/pages/api/v1/user-goal.ts`

```typescript
/**
 * GET /api/v1/user-goal - Get current user goal or null
 * PUT /api/v1/user-goal - Create or replace user goal
 * DELETE /api/v1/user-goal - Delete user goal
 */
export const prerender = false;

import type { APIContext } from "astro";
import { userGoalUpsertSchema } from "../../../lib/validation/userGoals";
import { getUserGoal, upsertUserGoal, deleteUserGoal } from "../../../lib/services/userGoalsService";
import type { ApiResponse, UserGoalDto } from "../../../types";

/**
 * GET /api/v1/user-goal
 * Returns current user goal or null if not set
 */
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

    // 2. Fetch goal
    const goal = await getUserGoal(context.locals.supabase, user.id);

    // 3. Happy path
    const response: ApiResponse<UserGoalDto | null> = { data: goal };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("GET /api/v1/user-goal failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

/**
 * PUT /api/v1/user-goal
 * Create or replace user goal (upsert)
 */
export async function PUT(context: APIContext) {
  try {
    // 1. Auth check
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // 2. Validate body
    const body = await context.request.json();
    const input = userGoalUpsertSchema.parse(body);

    // 3. Upsert goal
    const goal = await upsertUserGoal(context.locals.supabase, user.id, input);

    // 4. Happy path
    const response: ApiResponse<UserGoalDto> = { data: goal };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    // Validation errors
    if (err.name === "ZodError") {
      console.warn("PUT /api/v1/user-goal - validation error", { errors: err.errors });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid goal data",
            details: err.errors,
          },
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    // Server errors
    console.error("PUT /api/v1/user-goal failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

/**
 * DELETE /api/v1/user-goal
 * Delete user goal
 */
export async function DELETE(context: APIContext) {
  try {
    // 1. Auth check
    const user = context.locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // 2. Delete goal
    await deleteUserGoal(context.locals.supabase, user.id);

    // 3. Happy path - 204 No Content
    return new Response(null, { status: 204 });
  } catch (err: any) {
    // Not found error
    if (err.message === "GOAL_NOT_FOUND") {
      return new Response(JSON.stringify({ error: { code: "not_found", message: "No goal found to delete" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Server errors
    console.error("DELETE /api/v1/user-goal failed", { err });
    return new Response(JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
```

**Test (manual):**

- Start dev server: `npm run dev`
- Test each endpoint with curl or Postman

---

### Step 4: Create Test Suite (curl Scripts)

**File:** `.curls/user-goal.sh`

```bash
#!/bin/bash

# Test Suite for User Goal endpoints
# - GET /api/v1/user-goal
# - PUT /api/v1/user-goal
# - DELETE /api/v1/user-goal

BASE_URL="http://localhost:3000"

# Automatic token retrieval
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "🔐 Fetching authorization token..."
AUTH_TOKEN=$("${SCRIPT_DIR}/auth-test-user.sh")

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "❌ Could not obtain authorization token."
  exit 1
fi

echo "✅ Token uzyskany (user: test@example.com)"
echo ""

echo "=================================="
echo "Test Suite: User Goal"
echo "=================================="
echo ""

# Test 1: GET without auth → 401
echo "🔒 Test 1: GET /user-goal without auth"
echo "Expected status: 401"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

# Test 2: GET with auth (no goal) → 200 null
echo "📋 Test 2: GET /user-goal (no goal)"
echo "Expected status: 200, data: null"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

# Test 3: PUT - create goal → 200
echo "✅ Test 3: PUT /user-goal (create)"
echo "Expected status: 200"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "goal_type": "distance_by_date",
    "target_distance_m": 100000,
    "due_date": "2025-12-31",
    "notes": "Berlin Half Marathon"
  }')
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

# Test 4: GET with auth (goal exists) → 200 goal
echo "📋 Test 4: GET /user-goal (goal exists)"
echo "Expected status: 200, data: goal object"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

# Test 5: PUT - update goal → 200
echo "✅ Test 5: PUT /user-goal (update)"
echo "Expected status: 200"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "goal_type": "distance_by_date",
    "target_distance_m": 150000,
    "due_date": "2026-06-30",
    "notes": "Updated goal"
  }')
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

# Test 6: PUT - validation error (invalid due_date) → 422
echo "❌ Test 6: PUT /user-goal (invalid due_date format)"
echo "Expected status: 422"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "goal_type": "distance_by_date",
    "target_distance_m": 100000,
    "due_date": "2025/12/31"
  }')
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

# Test 7: PUT - validation error (due_date in the past) → 422
echo "❌ Test 7: PUT /user-goal (due_date in past)"
echo "Expected status: 422"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X PUT \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "goal_type": "distance_by_date",
    "target_distance_m": 100000,
    "due_date": "2020-01-01"
  }')
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

# Test 8: DELETE - delete goal → 204
echo "🗑️  Test 8: DELETE /user-goal"
echo "Expected status: 204"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X DELETE \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

# Test 9: GET with auth (after deletion) → 200 null
echo "📋 Test 9: GET /user-goal (after deletion)"
echo "Expected status: 200, data: null"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

# Test 10: DELETE - delete nonexistent goal → 404
echo "❌ Test 10: DELETE /user-goal (not found)"
echo "Expected status: 404"
echo "---"
HTTP_CODE=$(curl -s -w "\n%{http_code}" \
  -X DELETE \
  "${BASE_URL}/api/v1/user-goal" \
  -H "Authorization: Bearer ${AUTH_TOKEN}")
BODY=$(echo "$HTTP_CODE" | sed '$d')
STATUS=$(echo "$HTTP_CODE" | tail -n 1)
echo "$BODY"
echo "Status: $STATUS"
echo -e "\n"

echo "=================================="
echo "✅ Test suite completed"
echo "=================================="
```

**Running:**

```bash
chmod +x .curls/user-goal.sh
./.curls/user-goal.sh
```

---

### Step 5: Verification and Tests

1. **Start dev server:**

   ```bash
   npm run dev
   ```

2. **Run test suite:**

   ```bash
   ./.curls/user-goal.sh
   ```

3. **Check results:**
   - All tests should return expected status codes
   - GET without goal → 200 + `{"data": null}`
   - PUT create → 200 + goal object
   - GET with goal → 200 + goal object
   - PUT update → 200 + updated goal
   - DELETE → 204
   - GET after DELETE → 200 + `{"data": null}`
   - DELETE not found → 404

4. **Check logs:**
   - Validation errors should use `console.warn`
   - Server errors should use `console.error`
   - No sensitive data in logs

---

### Step 6: Documentation

**Update:**

- `.ai/api-plan.md` - add implementation details if needed
- README.md - add API usage examples

**README example:**

````markdown
### User Goal API

**Get current goal:**

```bash
GET /api/v1/user-goal
Authorization: Bearer <token>
```

**Set or update goal:**

```bash
PUT /api/v1/user-goal
Authorization: Bearer <token>
Content-Type: application/json

{
  "goal_type": "distance_by_date",
  "target_distance_m": 100000,
  "due_date": "2025-12-31",
  "notes": "Berlin Half Marathon"
}
```

**Delete goal:**

```bash
DELETE /api/v1/user-goal
Authorization: Bearer <token>
```
````

---

### Step 7: Code Review Checklist

- [ ] Auth guard in all endpoints
- [ ] Complete and correct validation schema
- [ ] Service layer separate from API routes
- [ ] Error handling consistent with project
- [ ] Status codes match conventions
- [ ] Correct type usage
- [ ] Test suite covers all scenarios
- [ ] No sensitive data in logs
- [ ] Supabase RLS policies configured
- [ ] Documentation updated

---

## 10. Summary

**Key implementation points:**

1. **Simple design:** One goal per user, upsert instead of create/update
2. **Security:** Auth + RLS + validation
3. **Consistency:** Patterns from other endpoints (workouts, training-types)
4. **Testability:** Service layer + curl test suite
5. **Performance:** Single-query operations, no N+1

**Estimated implementation time:** 2-3 hours

- Validation + Service: 45 min
- API Endpoint: 30 min
- Test suite: 30 min
- Testing + debugging: 45 min

**Potential extensions (beyond MVP):**

- Multiple goals per user
- Goal progress tracking (% completion)
- Goal history
- Goal types: pace_improvement, race_time, etc.
