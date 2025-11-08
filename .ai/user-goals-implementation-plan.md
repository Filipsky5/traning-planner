# API Endpoint Implementation Plan: User Goal

## 1. Przegląd punktu końcowego

Endpoint User Goal zarządza pojedynczym celem treningowym użytkownika. W wersji MVP każdy użytkownik może mieć dokładnie jeden cel typu "distance_by_date" (osiągnięcie określonego dystansu do wybranej daty).

**Kluczowe funkcjonalności:**
- Pobranie aktualnego celu użytkownika (GET)
- Utworzenie lub aktualizacja celu (PUT - upsert)
- Usunięcie celu (DELETE)

**Ograniczenia MVP:**
- Jeden cel na użytkownika
- Tylko typ `distance_by_date`
- Brak historii celów (tylko aktualny stan)

---

## 2. Szczegóły żądań

### 2.1 GET `/api/v1/user-goal`

**Metoda HTTP:** GET

**Struktura URL:** `/api/v1/user-goal`

**Parametry:**
- Wymagane: brak
- Opcjonalne: brak

**Headers:**
- `Authorization: Bearer <token>` (wymagane)

**Request Body:** N/A

---

### 2.2 PUT `/api/v1/user-goal`

**Metoda HTTP:** PUT

**Struktura URL:** `/api/v1/user-goal`

**Parametry:**
- Wymagane: brak
- Opcjonalne: brak

**Headers:**
- `Authorization: Bearer <token>` (wymagane)
- `Content-Type: application/json` (wymagane)

**Request Body:**
```json
{
  "goal_type": "distance_by_date",
  "target_distance_m": 100000,
  "due_date": "2025-12-31",
  "notes": "Berlin Half Marathon preparation"
}
```

**Pola request body:**
- `goal_type` (string, wymagane): Typ celu. W MVP tylko "distance_by_date".
- `target_distance_m` (number, wymagane): Docelowy dystans w metrach. Min: 1, Max: 1000000 (1000 km).
- `due_date` (string, wymagane): Data wykonania w formacie YYYY-MM-DD. Musi być dzisiaj lub w przyszłości.
- `notes` (string, opcjonalne): Notatki użytkownika. Max 500 znaków.

---

### 2.3 DELETE `/api/v1/user-goal`

**Metoda HTTP:** DELETE

**Struktura URL:** `/api/v1/user-goal`

**Parametry:**
- Wymagane: brak
- Opcjonalne: brak

**Headers:**
- `Authorization: Bearer <token>` (wymagane)

**Request Body:** N/A

---

## 3. Wykorzystywane typy

### 3.1 DTO Types (już zdefiniowane w `src/types.ts`)

```typescript
// GET response - może zwrócić goal lub null
type UserGoalDto = Pick<UserGoalRow, "goal_type" | "target_distance_m" | "due_date" | "notes">

// PUT request/response
type UserGoalUpsertCommand = UserGoalDto

// API Response wrapper
interface ApiResponse<T> {
  data: T;
}
```

### 3.2 Validation Types (do stworzenia w `src/lib/validation/userGoals.ts`)

```typescript
import { z } from "zod";

export const userGoalUpsertSchema = z.object({
  goal_type: z.enum(["distance_by_date"]),
  target_distance_m: z.number().int().min(1).max(1000000),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional()
}).refine(
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

## 4. Szczegóły odpowiedzi

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

**Success Response - brak celu (200 OK):**
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
- **401 Unauthorized:** (jak w GET)
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
- **500 Internal Server Error:** (jak w GET)

---

### 4.3 DELETE `/api/v1/user-goal`

**Success Response (204 No Content):**
- Empty response body
- Status: 204

**Error Responses:**
- **401 Unauthorized:** (jak w GET)
- **404 Not Found:**
  ```json
  {
    "error": {
      "code": "not_found",
      "message": "No goal found to delete"
    }
  }
  ```
- **500 Internal Server Error:** (jak w GET)

---

## 5. Przepływ danych

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
    notes: command.notes || null
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
const { count } = await supabase
  .from("user_goals")
  .select("*", { count: "exact", head: true })
  .eq("user_id", userId);

if (count === 0) throw new Error("GOAL_NOT_FOUND");

// Delete
const { error } = await supabase
  .from("user_goals")
  .delete()
  .eq("user_id", userId);
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja
- **Wymaganie:** Wszystkie endpointy wymagają zalogowanego użytkownika
- **Implementacja:** Guard clause na początku każdej funkcji
  ```typescript
  const user = context.locals.user;
  if (!user) {
    return new Response(
      JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
      { status: 401, headers: { "content-type": "application/json" } }
    );
  }
  ```
- **Token:** JWT token z Supabase Auth w header `Authorization: Bearer <token>`

### 6.2 Autoryzacja
- **Ownership:** Użytkownik może operować tylko na swoim celu
- **Implementacja:** Wszystkie query filtrują po `user_id` z `context.locals.user.id`
- **RLS (Row Level Security):** Supabase RLS policy wymusza autoryzację na poziomie bazy danych
  ```sql
  CREATE POLICY "Users can only access their own goals"
  ON user_goals
  FOR ALL
  USING (auth.uid() = user_id);
  ```

### 6.3 Walidacja danych wejściowych
- **Zod schemas:** Runtime validation wszystkich danych wejściowych
- **Zabezpieczenia:**
  - SQL Injection: Supabase używa parameterized queries
  - XSS: `notes` field ma limit 500 znaków, sanityzacja po stronie klienta
  - Type safety: TypeScript + Zod zapewniają poprawność typów
  - Business rules: `due_date` musi być w przyszłości
  - Range validation: `target_distance_m` 1-1000000m

### 6.4 Rate Limiting (opcjonalnie)
- Można dodać middleware rate limiting dla PUT/DELETE (np. max 10 req/min)
- W MVP: polegamy na RLS i auth

### 6.5 CORS
- API endpoints domyślnie dostępne tylko dla same-origin requests
- Jeśli frontend na innej domenie: skonfigurować CORS w middleware

---

## 7. Obsługa błędów

### 7.1 GET `/api/v1/user-goal`

| Scenariusz | HTTP Status | Error Code | Handling |
|------------|-------------|------------|----------|
| Brak autoryzacji | 401 | `unauthorized` | Guard clause na początku |
| Goal istnieje | 200 | N/A | Zwróć UserGoalDto |
| Goal nie istnieje | 200 | N/A | Zwróć `{ data: null }` |
| Błąd DB | 500 | `internal_error` | Log error, zwróć generic message |

**Implementacja:**
```typescript
export async function GET(context: APIContext) {
  try {
    // Auth guard
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // Fetch goal
    const goal = await getUserGoal(context.locals.supabase, user.id);

    // Happy path
    return new Response(
      JSON.stringify({ data: goal }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err: any) {
    console.error("GET /api/v1/user-goal failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
```

---

### 7.2 PUT `/api/v1/user-goal`

| Scenariusz | HTTP Status | Error Code | Handling |
|------------|-------------|------------|----------|
| Brak autoryzacji | 401 | `unauthorized` | Guard clause |
| Walidacja failed | 422 | `validation_error` | Catch ZodError, zwróć details |
| Due date w przeszłości | 422 | `validation_error` | Zod refine rule |
| Invalid goal_type | 422 | `validation_error` | Zod enum validation |
| Conflict (race condition) | 500 | `internal_error` | Upsert handles automatically |
| Błąd DB | 500 | `internal_error` | Log error, generic message |

**Implementacja:**
```typescript
export async function PUT(context: APIContext) {
  try {
    // Auth guard
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // Validate body
    const body = await context.request.json();
    const input = userGoalUpsertSchema.parse(body);

    // Upsert goal
    const goal = await upsertUserGoal(context.locals.supabase, user.id, input);

    // Happy path
    return new Response(
      JSON.stringify({ data: goal }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err: any) {
    // Validation errors
    if (err.name === "ZodError") {
      console.warn("PUT /api/v1/user-goal - validation error", { errors: err.errors });
      return new Response(
        JSON.stringify({
          error: {
            code: "validation_error",
            message: "Invalid goal data",
            details: err.errors
          }
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    // Server errors
    console.error("PUT /api/v1/user-goal failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
```

---

### 7.3 DELETE `/api/v1/user-goal`

| Scenariusz | HTTP Status | Error Code | Handling |
|------------|-------------|------------|----------|
| Brak autoryzacji | 401 | `unauthorized` | Guard clause |
| Goal nie istnieje | 404 | `not_found` | Service throws "GOAL_NOT_FOUND" |
| Goal usunięty | 204 | N/A | Empty response |
| Błąd DB | 500 | `internal_error` | Log error, generic message |

**Implementacja:**
```typescript
export async function DELETE(context: APIContext) {
  try {
    // Auth guard
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // Delete goal
    await deleteUserGoal(context.locals.supabase, user.id);

    // Happy path - 204 No Content
    return new Response(null, { status: 204 });
  } catch (err: any) {
    // Not found error
    if (err.message === "GOAL_NOT_FOUND") {
      return new Response(
        JSON.stringify({ error: { code: "not_found", message: "No goal found to delete" } }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    // Server errors
    console.error("DELETE /api/v1/user-goal failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Database Queries

**Optymalizacje:**
- **Index:** `user_id` jest primary key lub ma unique constraint - natywny index
- **Single query:** GET/DELETE używają pojedynczego query (no N+1)
- **Upsert efficiency:** PUT używa `ON CONFLICT` zamiast SELECT + INSERT/UPDATE
- **Projection:** SELECT tylko potrzebne kolumny (nie `SELECT *`)

**Przewidywane czasy:**
- GET: ~10-30ms (single row lookup by PK)
- PUT: ~20-50ms (upsert + returning)
- DELETE: ~15-40ms (check + delete)

### 8.2 Payload Size

**Request:**
- PUT body: ~100-200 bytes (JSON)

**Response:**
- GET/PUT: ~150-250 bytes (JSON)
- DELETE: 0 bytes (204 No Content)

**Optymalizacje:**
- Brak kompresji dla tak małych payloadów (overhead > benefit)
- JSON format - readable i wystarczająco compact

### 8.3 Caching

**MVP: Brak cache layer**
- Dane zmieniają się rzadko (goal setup raz na kilka miesięcy)
- User base mały
- Supabase connection pool wystarczający

**Przyszłość (opcjonalnie):**
- Redis cache dla GET endpoint (TTL: 5 min)
- Cache invalidation przy PUT/DELETE
- ETag header dla conditional requests

### 8.4 Concurrent Requests

**Race conditions:**
- **PUT:** Upsert (`ON CONFLICT`) jest atomic - bezpieczne
- **DELETE:** Check-then-delete może mieć race condition (nieistotne w MVP)

**Mitigacja:**
- Upsert handle conflicts automatically
- RLS policies zapewniają isolation per user
- Transaction isolation level: READ COMMITTED (default Postgres)

### 8.5 Monitoring

**Metryki do śledzenia:**
- Request latency (p50, p95, p99)
- Error rate per endpoint
- DB query duration
- Auth failures (potential attack detection)

**Narzędzia:**
- Supabase Dashboard: query performance
- Application logs: error tracking
- Opcjonalnie: Sentry dla error monitoring

---

## 9. Etapy wdrożenia

### Krok 1: Utworzenie validation schema
**Plik:** `src/lib/validation/userGoals.ts`

```typescript
import { z } from "zod";

export const userGoalUpsertSchema = z.object({
  goal_type: z.enum(["distance_by_date"]),
  target_distance_m: z.number().int().min(1).max(1000000),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional()
}).refine(
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
  notes: "Berlin Half"
}); // ✅

// Invalid - due_date w przeszłości
userGoalUpsertSchema.parse({
  goal_type: "distance_by_date",
  target_distance_m: 100000,
  due_date: "2020-01-01"
}); // ❌ ZodError
```

---

### Krok 2: Utworzenie service layer
**Plik:** `src/lib/services/userGoalsService.ts`

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { UserGoalDto } from "../../types";
import type { UserGoalUpsertInput } from "../validation/userGoals";

/**
 * Get current user goal or null if not set
 */
export async function getUserGoal(
  supabase: SupabaseClient,
  userId: string
): Promise<UserGoalDto | null> {
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
      notes: command.notes || null
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
export async function deleteUserGoal(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  // Check if goal exists
  const { count } = await supabase
    .from("user_goals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count === 0) {
    throw new Error("GOAL_NOT_FOUND");
  }

  // Delete goal
  const { error } = await supabase
    .from("user_goals")
    .delete()
    .eq("user_id", userId);

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

### Krok 3: Utworzenie API endpoint
**Plik:** `src/pages/api/v1/user-goal.ts`

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
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // 2. Fetch goal
    const goal = await getUserGoal(context.locals.supabase, user.id);

    // 3. Happy path
    const response: ApiResponse<UserGoalDto | null> = { data: goal };
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (err: any) {
    console.error("GET /api/v1/user-goal failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
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
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
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
      headers: { "content-type": "application/json" }
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
            details: err.errors
          }
        }),
        { status: 422, headers: { "content-type": "application/json" } }
      );
    }

    // Server errors
    console.error("PUT /api/v1/user-goal failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
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
      return new Response(
        JSON.stringify({ error: { code: "unauthorized", message: "Authentication required" } }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // 2. Delete goal
    await deleteUserGoal(context.locals.supabase, user.id);

    // 3. Happy path - 204 No Content
    return new Response(null, { status: 204 });
  } catch (err: any) {
    // Not found error
    if (err.message === "GOAL_NOT_FOUND") {
      return new Response(
        JSON.stringify({ error: { code: "not_found", message: "No goal found to delete" } }),
        { status: 404, headers: { "content-type": "application/json" } }
      );
    }

    // Server errors
    console.error("DELETE /api/v1/user-goal failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
```

**Test (manual):**
- Start dev server: `npm run dev`
- Test każdego endpointa przez curl lub Postman

---

### Krok 4: Utworzenie test suite (curl scripts)
**Plik:** `.curls/user-goal.sh`

```bash
#!/bin/bash

# Test Suite dla User Goal endpoints
# - GET /api/v1/user-goal
# - PUT /api/v1/user-goal
# - DELETE /api/v1/user-goal

BASE_URL="http://localhost:3000"

# Automatyczne pobieranie tokena
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "🔐 Pobieranie tokena autoryzacyjnego..."
AUTH_TOKEN=$("${SCRIPT_DIR}/auth-test-user.sh")

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "❌ Nie udało się uzyskać tokena autoryzacyjnego."
  exit 1
fi

echo "✅ Token uzyskany (user: test@example.com)"
echo ""

echo "=================================="
echo "Test Suite: User Goal"
echo "=================================="
echo ""

# Test 1: GET bez auth → 401
echo "🔒 Test 1: GET /user-goal bez auth"
echo "Oczekiwany status: 401"
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

# Test 2: GET z auth (brak celu) → 200 null
echo "📋 Test 2: GET /user-goal (brak celu)"
echo "Oczekiwany status: 200, data: null"
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

# Test 3: PUT - utworzenie celu → 200
echo "✅ Test 3: PUT /user-goal (create)"
echo "Oczekiwany status: 200"
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

# Test 4: GET z auth (cel istnieje) → 200 goal
echo "📋 Test 4: GET /user-goal (cel istnieje)"
echo "Oczekiwany status: 200, data: goal object"
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

# Test 5: PUT - aktualizacja celu → 200
echo "✅ Test 5: PUT /user-goal (update)"
echo "Oczekiwany status: 200"
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
echo "Oczekiwany status: 422"
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

# Test 7: PUT - validation error (due_date w przeszłości) → 422
echo "❌ Test 7: PUT /user-goal (due_date in past)"
echo "Oczekiwany status: 422"
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

# Test 8: DELETE - usunięcie celu → 204
echo "🗑️  Test 8: DELETE /user-goal"
echo "Oczekiwany status: 204"
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

# Test 9: GET z auth (po usunięciu) → 200 null
echo "📋 Test 9: GET /user-goal (po usunięciu)"
echo "Oczekiwany status: 200, data: null"
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

# Test 10: DELETE - usunięcie nieistniejącego celu → 404
echo "❌ Test 10: DELETE /user-goal (not found)"
echo "Oczekiwany status: 404"
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
echo "✅ Test Suite zakończony"
echo "=================================="
```

**Uruchomienie:**
```bash
chmod +x .curls/user-goal.sh
./.curls/user-goal.sh
```

---

### Krok 5: Weryfikacja i testy
1. **Uruchom dev server:**
   ```bash
   npm run dev
   ```

2. **Uruchom test suite:**
   ```bash
   ./.curls/user-goal.sh
   ```

3. **Sprawdź wyniki:**
   - Wszystkie testy powinny zwrócić oczekiwane status codes
   - GET bez celu → 200 + `{"data": null}`
   - PUT create → 200 + goal object
   - GET z celem → 200 + goal object
   - PUT update → 200 + updated goal
   - DELETE → 204
   - GET po DELETE → 200 + `{"data": null}`
   - DELETE not found → 404

4. **Sprawdź logi:**
   - Validation errors powinny być w `console.warn`
   - Server errors powinny być w `console.error`
   - Brak sensitive data w logach

---

### Krok 6: Dokumentacja
**Aktualizuj:**
- `.ai/api-plan.md` - dodaj szczegóły implementacji jeśli potrzebne
- README.md - dodaj przykłady użycia API

**Przykład w README:**
```markdown
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
```

---

### Krok 7: Code Review Checklist
- [ ] Auth guard we wszystkich endpointach
- [ ] Validation schema kompletny i poprawny
- [ ] Service layer oddzielony od API routes
- [ ] Error handling spójny z resztą projektu
- [ ] Status codes zgodne z konwencją
- [ ] Types poprawnie wykorzystane
- [ ] Test suite pokrywa wszystkie scenariusze
- [ ] Brak sensitive data w logach
- [ ] RLS policies w Supabase skonfigurowane
- [ ] Dokumentacja zaktualizowana

---

## 10. Podsumowanie

**Kluczowe punkty implementacji:**
1. **Prosty design:** Jeden cel na użytkownika, upsert zamiast create/update
2. **Bezpieczeństwo:** Auth + RLS + validation
3. **Spójność:** Wzorce z innych endpointów (workouts, training-types)
4. **Testowalność:** Service layer + curl test suite
5. **Wydajność:** Single query operations, brak N+1

**Szacowany czas implementacji:** 2-3 godziny
- Validation + Service: 45 min
- API Endpoint: 30 min
- Test suite: 30 min
- Testing + debugging: 45 min

**Potencjalne rozszerzenia (poza MVP):**
- Multiple goals per user
- Goal progress tracking (% completion)
- Goal history
- Goal types: pace_improvement, race_time, etc.
