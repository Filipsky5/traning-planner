# API Endpoint Implementation Plan: AI Suggestion Events

## 1. Endpoint Overview

This endpoint retrieves events associated with a specific AI suggestion. In the MVP, the main event kind is `regenerate`, recording user regeneration actions. It supports auditing suggestion history and enforcing limits (e.g., regeneration counts).

**Functionality:**

- Retrieve event history for a single AI suggestion
- Paginate results
- Sort by occurrence date (newest first)
- Verify ownership (events of own suggestions only)

**Scope:** GET `/api/v1/ai/suggestions/{id}/events`

## 2. Request Details

**HTTP Method:** GET

**URL Structure:** `/api/v1/ai/suggestions/{id}/events`

**Parameters:**

**Required (Path):**

- `id` (string, UUID) - AI suggestion ID whose events are requested

**Optional (Query):**

- `page` (number, default: 1, min: 1) - Result page number
- `per_page` (number, default: 20, min: 1, max: 100) - Results per page

**Request Headers:**

- `Authorization: Bearer {token}` - Supabase session token (required)

**Request Body:** None (GET method)

**Example requests:**

```http
GET /api/v1/ai/suggestions/550e8400-e29b-41d4-a716-446655440000/events
GET /api/v1/ai/suggestions/550e8400-e29b-41d4-a716-446655440000/events?page=1&per_page=10
```

## 3. Types Used

**Existing in `src/types.ts`:**

```typescript
// Response DTO
export type AiSuggestionEventDto = Pick<AiSuggestionEventRow, "id" | "kind" | "occurred_at" | "metadata">;

// Paginated response envelope
export interface ApiListResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
}
```

**New (create in `src/lib/validation/aiSuggestions.ts`):**

```typescript
// Event query parameter validation schema
export const eventsQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(z.number().int("page must be an integer").min(1, "page must be >= 1"))
    .default(1),
  per_page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(
      z.number().int("per_page must be an integer").min(1, "per_page must be >= 1").max(100, "per_page must be <= 100")
    )
    .default(20),
});

export type EventsQueryParams = z.infer<typeof eventsQuerySchema>;
```

## 4. Response Details

**Success (200 OK):**

```json
{
  "data": [
    {
      "id": "uuid",
      "kind": "regenerate",
      "occurred_at": "2025-11-08T10:00:00Z",
      "metadata": {
        "new_suggestion_id": "uuid",
        "reason": "need variation",
        "adjustment_hint": "-10% distance"
      }
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 1
}
```

**Response structure:**

- `data` - Array of `AiSuggestionEventDto` objects
- `page` - Current page number
- `per_page` - Results per page
- `total` - Total events for this suggestion

**Status codes:**

- `200 OK` - Events retrieved successfully (may be empty)
- `400 Bad Request` - Invalid UUID or query parameter format
- `401 Unauthorized` - Unauthenticated
- `404 Not Found` - Suggestion does not exist or belongs to another user
- `500 Internal Server Error` - Server/database error

## 5. Data Flow

```
1. Request → Astro API Route Handler
   ↓
2. Validate path parameter (id: UUID)
   ↓
3. Validate query parameters (page, per_page)
   ↓
4. Authentication (requireUserId)
   ↓
5. Verify suggestion ownership
   │  └─ fetchSuggestionRow(supabase, userId, id)
   │     ├─ 404 if missing or not owned by the user
   │     └─ OK - kontynuuj
   ↓
6. Service: listSuggestionEvents(supabase, userId, suggestionId, pagination)
   │  ├─ SELECT from ai_suggestion_events
   │  ├─ WHERE user_id = userId AND ai_suggestion_id = suggestionId
   │  ├─ ORDER BY occurred_at DESC
   │  ├─ LIMIT/OFFSET for pagination
   │  └─ COUNT(*) for total
   ↓
7. Map to AiSuggestionEventDto[]
   ↓
8. Konstrukcja ApiListResponse
   ↓
9. Response 200 + JSON
```

**Database interactions:**

1. **Ownership verification:**
   - Table: `ai_suggestions`
   - Query: `SELECT id FROM ai_suggestions WHERE id = ? AND user_id = ?`
   - RLS: Automatically filters by `user_id = auth.uid()`

2. **Fetch events:**
   - Table: `ai_suggestion_events`
   - Query:
     ```sql
     SELECT id, kind, occurred_at, metadata, COUNT(*) OVER() as total_count
     FROM ai_suggestion_events
     WHERE user_id = ? AND ai_suggestion_id = ?
     ORDER BY occurred_at DESC
     LIMIT ? OFFSET ?
     ```
   - RLS: Automatically filters by `user_id = auth.uid()`

**Indexes (already in DB):**

- `idx_ai_suggestion_events_user_suggestion` on `(user_id, ai_suggestion_id, occurred_at DESC)` - query performance

## 6. Security Considerations

### Authentication

- **Required:** Supabase token in `Authorization: Bearer {token}`
- **Implementation:** Use `requireUserId(context)` from `src/lib/http/auth.ts`
- **Failure mode:** 401 Unauthorized

### Authorization (Ownership Verification)

- **Requirement:** Users may see only their own suggestion events
- **Two-layer implementation:**
  1. **Application layer:** First `fetchSuggestionRow(supabase, userId, id)` - checks ownership
  2. **Database layer:** RLS on `ai_suggestion_events` with `user_id = auth.uid()`
- **Failure mode:** 404 Not Found (do not reveal existence when owned by someone else)

### Input Validation

- **UUID format:** Zod schema `z.string().uuid()` for `id`
- **Query params:** Zod schema with limits (page >= 1, per_page 1-100)
- **Sanitization:** Not needed - parameterized queries through Supabase client

### Rate Limiting

- **Not implemented in MVP** - possible future additions:
  - Requests per user per minute limit
  - Middleware or Supabase Edge Functions implementation

### Information Disclosure Prevention

- **404 for all access failures:** Do not reveal resource existence if the user lacks access
- **Consistent timing:** Avoid timing attacks (verify ownership before querying events)

### SQL Injection

- **Mitigation:** Supabase client uses parameterized queries (prepared statements)
- **No raw SQL:** No `supabase.rpc()` with raw SQL

## 7. Error Handling

### Error Scenarios and Status Codes:

| Code | Scenario           | Condition                                   | Response Body                                                                                      |
| ---- | ------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 400  | Invalid UUID       | `id` is not a valid UUID                    | `{"error": {"code": "validation_error", "message": "Invalid suggestion ID format"}}`               |
| 400  | Invalid pagination | `page < 1` or `per_page > 100`              | `{"error": {"code": "validation_error", "message": "Invalid query parameters", "details": [...]}}` |
| 401  | Unauthorized       | Missing or invalid session token            | `{"error": {"code": "unauthorized", "message": "Authentication required"}}`                        |
| 404  | Not Found          | Suggestion missing OR owned by another user | `{"error": {"code": "not_found", "message": "AI suggestion not found"}}`                           |
| 500  | Database Error     | Supabase query failure                      | `{"error": {"code": "internal_error", "message": "Failed to load events"}}`                        |

### Error Handling Implementation:

```typescript
function handleError(error: unknown): Response {
  // Zod validation error
  if (error instanceof Error && error.name === "ZodError") {
    return errorResponse(createApiError(400, "validation_error", "Invalid query parameters", { cause: error }));
  }

  // API errors (from service layer)
  if (isApiError(error)) {
    return errorResponse(error);
  }

  // Unexpected errors
  console.error("AI suggestion events endpoint failed", error);
  return errorResponse(createApiError(500, "internal_error", "Failed to load events", { cause: error }));
}
```

### Error Logging:

```typescript
// Server-side logging for 500 errors
console.error("AI suggestion events endpoint failed", {
  suggestionId: id,
  userId,
  error: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
});
```

**Do not use `ai_logs`** - this is a read-only endpoint that does not call AI.

## 8. Performance Considerations

### Potential Bottlenecks:

1. **N+1 Query Problem:** ❌ Not present - single events query
2. **Large result sets:** Mitigated by pagination (max 100 per request)
3. **Database indexing:** Existing index: `(user_id, ai_suggestion_id, occurred_at DESC)`

### Optimization Strategies:

**Database:**

- ✅ Index on `ai_suggestion_events(user_id, ai_suggestion_id, occurred_at DESC)` - covers sorting + WHERE
- ✅ RLS on indexed columns - efficient `user_id` filtering
- ✅ Pagination instead of full load

**Application:**

- ✅ Streaming response for large results (Astro automatically)
- ✅ Lazy evaluation through Supabase client
- 🔄 **Optional:** HTTP caching (ETag) if events change rarely

**Monitoring:**

- Metric: Response time (target: < 200ms p95)
- Metric: Database query time
- Alert: If > 500ms p99

### Performance Estimate:

- **Expected load:** Low (audit / debugging, not on critical path)
- **Query complexity:** O(log n) thanks to the index + O(k) for LIMIT k
- **Typical response size:** < 5KB (20 events * ~200B)
- **Database round trips:** 2 (ownership check + events query)

**Future optimization (if needed):**

- Combine ownership check + event fetch into one query (JOIN)
- Add Redis caching for frequently read suggestion events
- Implement GraphQL DataLoader pattern for batch requests

## 9. Implementation Stages

### Step 1: Validation (Zod Schemas)

**File:** `src/lib/validation/aiSuggestions.ts`

```typescript
// Add a new event query parameter schema
export const eventsQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(z.number().int().min(1))
    .default(1),
  per_page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(z.number().int().min(1).max(100))
    .default(20),
});

export type EventsQueryParams = z.infer<typeof eventsQuerySchema>;
```

**Test:**

```typescript
// Verify schema handles edge cases
eventsQuerySchema.parse({ page: "1", per_page: "20" }); // OK
eventsQuerySchema.parse({ page: 0 }); // Should throw
eventsQuerySchema.parse({ per_page: 101 }); // Should throw
```

---

### Step 2: Service Layer - Event Pagination

**File:** `src/lib/services/aiSuggestionsService.ts`

```typescript
// Add a new function beside existing fetchSuggestionEvents
export interface ListEventsFilters {
  page: number;
  per_page: number;
}

export interface ListEventsResult {
  data: AiSuggestionEventDto[];
  page: number;
  perPage: number;
  total: number;
}

export async function listSuggestionEvents(
  supabase: SupabaseClient,
  userId: string,
  suggestionId: string,
  filters: ListEventsFilters
): Promise<ListEventsResult> {
  const page = filters.page ?? 1;
  const perPage = filters.per_page ?? 20;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const { data, error, count } = await supabase
    .from("ai_suggestion_events")
    .select(EVENT_SELECT, { count: "exact" })
    .eq("user_id", userId)
    .eq("ai_suggestion_id", suggestionId)
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw createApiError(500, "internal_error", "Failed to load events", { cause: error });
  }

  const items = (data ?? []).map((event) => ({
    id: event.id,
    kind: event.kind,
    occurred_at: event.occurred_at,
    metadata: event.metadata,
  }));

  return {
    data: items,
    page,
    perPage,
    total: count ?? items.length,
  };
}
```

**Test:**

- Verify pagination works (correct offset/limit)
- Verify count is accurate
- Verify occurred_at DESC sorting

---

### Step 3: API Route Handler

**File:** `src/pages/api/v1/ai/suggestions/[id]/events.ts`

```typescript
import type { APIContext } from "astro";

import { requireUserId } from "../../../../../../lib/http/auth";
import { createApiError, isApiError } from "../../../../../../lib/http/errors";
import { errorResponse, jsonResponse } from "../../../../../../lib/http/responses";
import { eventsQuerySchema, type EventsQueryParams } from "../../../../../../lib/validation/aiSuggestions";
import {
  fetchSuggestionRow,
  listSuggestionEvents,
  type ListEventsFilters,
} from "../../../../../../lib/services/aiSuggestionsService";
import type { ApiListResponse } from "../../../../../../types";

export const prerender = false;

export async function GET(context: APIContext) {
  try {
    const { id } = context.params;

    // Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw createApiError(400, "validation_error", "Invalid suggestion ID format");
    }

    // Parse and validate query params
    const filters = parseEventsQuery(context.request.url);
    const { userId } = await requireUserId(context);

    // Verify ownership (throws 404 if not found or not owned)
    await fetchSuggestionRow(context.locals.supabase, userId, id);

    // Fetch events with pagination
    const result = await listSuggestionEvents(context.locals.supabase, userId, id, filters);

    const payload: ApiListResponse<(typeof result.data)[number]> = {
      data: result.data,
      page: result.page,
      per_page: result.perPage,
      total: result.total,
    };

    return jsonResponse(200, payload);
  } catch (error) {
    return handleError(error);
  }
}

function parseEventsQuery(urlString: string): ListEventsFilters {
  const url = new URL(urlString);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = eventsQuerySchema.parse(params) as EventsQueryParams;

  return {
    page: parsed.page,
    per_page: parsed.per_page,
  };
}

function handleError(error: unknown): Response {
  if (isApiError(error)) {
    return errorResponse(error);
  }

  if (error instanceof Error && error.name === "ZodError") {
    return errorResponse(createApiError(400, "validation_error", "Invalid query parameters", { cause: error }));
  }

  console.error("AI suggestion events endpoint failed", error);
  return errorResponse(createApiError(500, "internal_error", "Failed to load events", { cause: error }));
}
```

**Test:**

- Verify route is accessible at `/api/v1/ai/suggestions/{id}/events`
- Verify 401 without auth token
- Verify 404 for nonexistent suggestion
- Verify 404 for another user's suggestion (security)

---

### Step 4: Integration Tests

**File:** `.curls/ai-suggestions-events.sh`

```bash
#!/bin/bash

# Test Suite for GET /api/v1/ai/suggestions/{id}/events

BASE_URL="http://localhost:3000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔐 Fetching authorization token..."
AUTH_TOKEN=$("${SCRIPT_DIR}/auth-test-user.sh")

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "❌ Could not obtain token."
  exit 1
fi

echo "✅ Token uzyskany"
echo ""

# First create a suggestion (needed for event tests)
echo "🆕 Creating test suggestion..."
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}/api/v1/ai/suggestions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{"planned_date":"2025-11-10","training_type_code":"easy"}')

CREATE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')
CREATE_STATUS=$(echo "$CREATE_RESPONSE" | tail -n1)

if [[ "$CREATE_STATUS" != "201" ]]; then
  echo "❌ Could not create suggestion (status: $CREATE_STATUS)"
  exit 1
fi

SUGGESTION_ID=$(echo "$CREATE_BODY" | jq -r '.data.id')
echo "✅ Sugestia utworzona: $SUGGESTION_ID"
echo ""

# Test 1: GET events without parameters
echo "📋 Test 1: GET /events without parameters (default pagination)"
curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/ai/suggestions/${SUGGESTION_ID}/events" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | \
  (read body; read status; echo "$body" | jq '.'; echo "Status: $status")
echo ""

# Test 2: GET events with custom pagination
echo "📋 Test 2: GET /events?page=1&per_page=5"
curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/ai/suggestions/${SUGGESTION_ID}/events?page=1&per_page=5" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | \
  (read body; read status; echo "$body" | jq '.'; echo "Status: $status")
echo ""

# Test 3: GET events without auth (expect 401)
echo "🔒 Test 3: GET /events without auth (expect 401)"
curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/ai/suggestions/${SUGGESTION_ID}/events" | \
  (read body; read status; echo "$body" | jq '.'; echo "Status: $status")
echo ""

# Test 4: GET events for nonexistent suggestion (expect 404)
echo "❌ Test 4: GET /events for nonexistent suggestion (expect 404)"
curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/ai/suggestions/00000000-0000-0000-0000-000000000000/events" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | \
  (read body; read status; echo "$body" | jq '.'; echo "Status: $status")
echo ""

# Test 5: Invalid pagination (expect 400)
echo "❌ Test 5: GET /events?per_page=999 (expect 400)"
curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/ai/suggestions/${SUGGESTION_ID}/events?per_page=999" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | \
  (read body; read status; echo "$body" | jq '.'; echo "Status: $status")
echo ""

echo "✅ Test suite completed"
```

**Running:**

```bash
chmod +x .curls/ai-suggestions-events.sh
./.curls/ai-suggestions-events.sh > .curls/ai-suggestions-events-results.log 2>&1
```

---

### Step 5: Documentation

**File:** Update `README.md` or API docs

````markdown
### GET /api/v1/ai/suggestions/{id}/events

Retrieves events for a specific AI suggestion.

**Authentication:** Required (Bearer token)

**Parameters:**

- `id` (path, UUID) - AI suggestion ID
- `page` (query, number, optional, default: 1) - Page number
- `per_page` (query, number, optional, default: 20, max: 100) - Results per page

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "kind": "regenerate",
      "occurred_at": "2025-11-08T10:00:00Z",
      "metadata": {...}
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 1
}
```

**Errors:**

- 400 - Invalid parameters
- 401 - Unauthorized
- 404 - Suggestion not found
- 500 - Server error
````

---

### Step 6: Verification and Manual Tests

1. **Start dev server:**
   ```bash
   npm run dev
   ```

````

2. **Run test suite:**

   ```bash
   ./.curls/ai-suggestions-events.sh
   ```

3. **Verify responses:**
   - ✅ 200 for valid requests with empty list (new suggestion has no events)
   - ✅ 200 with events after regeneration
   - ✅ 401 without auth
   - ✅ 404 for nonexistent suggestion
   - ✅ 400 for invalid pagination

4. **Performance test:**

   ```bash
   # Apache Bench - 100 requests, 10 concurrent
   ab -n 100 -c 10 -H "Authorization: Bearer {token}" \
     http://localhost:3000/api/v1/ai/suggestions/{id}/events
   ```

5. **Security test:**
   - Access another user's suggestion → 404
   - Invalid/expired token → 401
   - SQL injection attempts → Blocked by Supabase

---

### Final Checklist

- [ ] Query parameter Zod schema (`eventsQuerySchema`)
- [ ] Paginated service function (`listSuggestionEvents`)
- [ ] API route handler (`/api/v1/ai/suggestions/[id]/events.ts`)
- [ ] Error handling for all scenarios
- [ ] Test suite bash script
- [ ] Ownership verification (security)
- [ ] Response format matches specification
- [ ] Endpoint documentation
- [ ] Performance test (< 200ms p95)
- [ ] Security test (cross-user access blocked)

---

## 10. Potential Extensions (Beyond the MVP)

1. **Filter by `kind`:**
   - Query param: `kind=regenerate`
   - Useful when more event types exist (create, accept, reject)

2. **Sorting:**
   - Query param: `sort=occurred_at:asc|desc`
   - Default: `desc` (newest first)

3. **HTTP Caching:**
   - ETag based on last event `occurred_at`
   - Cache-Control: `private, max-age=60`

4. **Batch endpoint:**
   - POST `/api/v1/ai/suggestions/events/batch`
   - Body: `{ suggestion_ids: [...] }`
   - Returns events for multiple suggestions at once

5. **Real-time updates:**
   - WebSocket/SSE for a live event stream
   - Supabase Realtime subscriptions

6. **Aggregations:**
   - Count per event kind
   - Event timeline/histogram
````
