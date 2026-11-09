# API Endpoint Implementation Plan: AI Logs (Internal)

## 1. Endpoint Overview

The AI Logs endpoint ingests and lists AI interaction logs (OpenRouter). It is an **internal-only endpoint**, accessible only with a service-role key and unavailable to regular users.

### Business Goal:

- **Diagnostics**: Track AI errors and problems
- **Cost tracking**: Monitor AI call costs (tokens, USD)
- **Audit**: AI call history per user/suggestion

### Endpoints:

- `POST /api/v1/internal/ai/logs` - Ingest a single AI log
- `GET /api/v1/internal/ai/logs` - List logs with filters and pagination

---

## 2. Request Details

### POST `/api/v1/internal/ai/logs`

**HTTP Method**: POST
**URL Structure**: `/api/v1/internal/ai/logs`
**Authorization**: Service-role key through `Authorization: Bearer <service_role_key>`

**Request Headers**:

- `Authorization: Bearer <service_role_key>` (required)
- `Content-Type: application/json` (required)

**Request Body**:

```json
{
  "event": "suggestion.generate",
  "level": "info",
  "model": "gpt-4o-mini",
  "provider": "openrouter",
  "latency_ms": 450,
  "input_tokens": 1200,
  "output_tokens": 300,
  "cost_usd": 0.015,
  "payload": {
    "user_id": "uuid",
    "suggestion_id": "uuid"
  }
}
```

**Parameters**:

- **Required**:
  - `event` (string): Event type (e.g., "suggestion.generate")
  - `level` (string): Log level ("info", "warn", "error")

- **Optional**:
  - `model` (string): AI model name
  - `provider` (string): AI provider (e.g., "openrouter")
  - `latency_ms` (integer ≥ 0): Response time in ms
  - `input_tokens` (integer ≥ 0): Input token count
  - `output_tokens` (integer ≥ 0): Output token count
  - `cost_usd` (number ≥ 0): Call cost in USD
  - `payload` (object): Additional JSON context (max 10KB)
  - `user_id` (uuid): ID of the user associated with the log

---

### GET `/api/v1/internal/ai/logs`

**HTTP Method**: GET
**URL Structure**: `/api/v1/internal/ai/logs?page=1&per_page=20&event=suggestion.generate`
**Authorization**: Service-role key through `Authorization: Bearer <service_role_key>`

**Query Parameters**:

- **Optional**:
  - `event` (string): Filter by event type
  - `level` (string): Filter by log level
  - `created_after` (ISO timestamp): Logs created after this date
  - `created_before` (ISO timestamp): Logs created before this date
  - `page` (integer, default: 1, min: 1): Page number
  - `per_page` (integer, default: 20, min: 1, max: 100): Items per page

---

## 3. Types Used

### DTOs (Data Transfer Objects)

From `src/types.ts`:

```typescript
// Response type for GET
export type AiLogDto = Pick<
  AiLogRow,
  | "id"
  | "event"
  | "level"
  | "model"
  | "provider"
  | "latency_ms"
  | "input_tokens"
  | "output_tokens"
  | "cost_usd"
  | "payload"
  | "created_at"
  | "user_id"
>;

// Command type for POST
export type AiLogIngestCommand = Omit<AiLogInsert, "id" | "created_at">;
```

### Validation Schemas (to Create)

File: `src/lib/validation/aiLogs.ts`

```typescript
import { z } from "zod";

// Schema for POST body
export const aiLogIngestSchema = z.object({
  event: z.string().min(1),
  level: z.string().min(1),
  model: z.string().optional(),
  provider: z.string().optional(),
  latency_ms: z.number().int().nonnegative().optional(),
  input_tokens: z.number().int().nonnegative().optional(),
  output_tokens: z.number().int().nonnegative().optional(),
  cost_usd: z.number().nonnegative().optional(),
  payload: z.record(z.unknown()).optional(),
  user_id: z.string().uuid().optional(),
});

// Schema for GET query params
export const aiLogListQuerySchema = z.object({
  event: z.string().optional(),
  level: z.string().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
});

export type AiLogIngestInput = z.infer<typeof aiLogIngestSchema>;
export type AiLogListQuery = z.infer<typeof aiLogListQuerySchema>;
```

---

## 4. Response Details

### POST `/api/v1/internal/ai/logs`

**Success - 202 Accepted**:

```json
{
  "data": {
    "status": "accepted"
  }
}
```

**Errors**:

- **400 Bad Request** - Malformed JSON body

  ```json
  {
    "error": {
      "code": "validation_error",
      "message": "Invalid JSON body"
    }
  }
  ```

- **401 Unauthorized** - Missing Authorization header

  ```json
  {
    "error": {
      "code": "unauthorized",
      "message": "Missing service-role credentials"
    }
  }
  ```

- **403 Forbidden** - Invalid service-role key

  ```json
  {
    "error": {
      "code": "forbidden",
      "message": "Invalid service-role key"
    }
  }
  ```

- **422 Unprocessable Entity** - Validation error

  ```json
  {
    "error": {
      "code": "validation_error",
      "message": "Invalid request body",
      "details": {
        "invalid_params": ["latency_ms", "cost_usd"]
      }
    }
  }
  ```

- **500 Internal Server Error** - Database error
  ```json
  {
    "error": {
      "code": "internal_error",
      "message": "Failed to ingest log"
    }
  }
  ```

---

### GET `/api/v1/internal/ai/logs`

**Success - 200 OK**:

```json
{
  "data": [
    {
      "id": "uuid",
      "event": "suggestion.generate",
      "level": "info",
      "model": "gpt-4o-mini",
      "provider": "openrouter",
      "latency_ms": 450,
      "input_tokens": 1200,
      "output_tokens": 300,
      "cost_usd": 0.015,
      "payload": { "user_id": "uuid", "suggestion_id": "uuid" },
      "created_at": "2025-10-13T09:00:00Z",
      "user_id": "uuid"
    }
  ],
  "page": 1,
  "per_page": 20,
  "total": 120
}
```

**Errors**:

- **400 Bad Request** - Malformed query params
- **401 Unauthorized** - Missing Authorization header
- **403 Forbidden** - Invalid service-role key
- **422 Unprocessable Entity** - Invalid filters
- **500 Internal Server Error** - Database error

---

## 5. Data Flow

### POST `/api/v1/internal/ai/logs`

```
1. Request → Astro API Route Handler
2. Validate Authorization header (service-role key)
3. Parse and validate JSON body (Zod schema)
4. Call aiLogsService.ingestAiLog()
5. Service → Supabase insert into ai_logs
6. Response 202 Accepted
```

**Flow Diagram**:

```
Client (OpenRouter wrapper)
  ↓
POST /api/v1/internal/ai/logs
  ↓
[Auth check: service-role key]
  ↓
[Validation: Zod schema]
  ↓
aiLogsService.ingestAiLog()
  ↓
Supabase insert → ai_logs table
  ↓
202 Accepted
```

---

### GET `/api/v1/internal/ai/logs`

```
1. Request → Astro API Route Handler
2. Validate Authorization header (service-role key)
3. Parse and validate query params (Zod schema)
4. Call aiLogsService.listAiLogs(filters, pagination)
5. Service → Supabase query with filters and pagination
6. Response 200 OK with data + pagination metadata
```

**Flow Diagram**:

```
Admin/Service client
  ↓
GET /api/v1/internal/ai/logs?event=...&page=1
  ↓
[Auth check: service-role key]
  ↓
[Validation: query params]
  ↓
aiLogsService.listAiLogs()
  ↓
Supabase query → ai_logs table
  ↓
200 OK + pagination
```

---

## 6. Security Considerations

### Critical Threats and Mitigations:

1. **Authorization Bypass** (CRITICAL)
   - **Threat**: User tokens can access endpoint → log leakage
   - **Mitigation**: Check `Authorization: Bearer <service_role_key>` against `import.meta.env.SUPABASE_SERVICE_ROLE_KEY`
   - **Guard clause**: Return 401/403 before any operation

2. **Privacy Leak** (HIGH)
   - **Threat**: Payload may contain user PII
   - **Mitigation**:
     - Documentation: DO NOT log PII in payload
     - Retention: 30 days (external job)
     - RLS disabled on ai_logs (service-role only)

3. **DoS Attack** (MEDIUM)
   - **Threat**: Large payload flood → DB overflow
   - **Mitigation**:
     - Payload size validation (max 10KB)
     - Rate limiting: 100 req/min (optional)

4. **Network Exposure** (HIGH)
   - **Threat**: Endpoint called from browser
   - **Mitigation**:
     - Service-role key MUST NOT appear in client-side environment variables
     - Endpoint used only server-side (in AI service)

5. **SQL Injection** (LOW)
   - **Threat**: Malicious GET filters
   - **Mitigation**: Supabase client automatically sanitizes queries

### Auth Check Implementation:

```typescript
// Guard clause pattern - check service-role key
function requireServiceRole(context: APIContext): void {
  const authHeader = context.request.headers.get("authorization");

  if (!authHeader) {
    throw createApiError(401, "unauthorized", "Missing service-role credentials");
  }

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (token !== serviceRoleKey) {
    throw createApiError(403, "forbidden", "Invalid service-role key");
  }
}
```

---

## 7. Error Handling

### Error Categories:

**400 Bad Request**:

- Malformed JSON body
- Malformed query params
- Example: Invalid JSON syntax

**401 Unauthorized**:

- Missing Authorization header
- Example: Missing Authorization header

**403 Forbidden**:

- Invalid service-role key
- Example: User token instead of service-role key

**422 Unprocessable Entity**:

- Validation error (Zod)
- Invalid field values (negative numbers, invalid UUID)
- Example: `latency_ms: -10`, `cost_usd: "abc"`

**500 Internal Server Error**:

- Database insert/query failed
- Unexpected server error
- Example: Supabase connection timeout

### Error Handling Strategy:

```typescript
try {
  // 1. Auth check (guard clause)
  requireServiceRole(context);

  // 2. Validation (guard clause)
  const body = await parseAndValidate(context.request);

  // 3. Service call
  await aiLogsService.ingestAiLog(context.locals.supabase, body);

  // 4. Happy path
  return jsonResponse(202, { data: { status: "accepted" } });
} catch (err) {
  // Handle ApiError (from auth, validation)
  if (isApiError(err)) {
    return errorResponse(err);
  }

  // Handle Zod validation error
  if (err.name === "ZodError") {
    const details = { invalid_params: err.errors.map((e) => e.path.join(".")) };
    return errorResponse(createApiError(422, "validation_error", "Invalid request body", { details }));
  }

  // Handle unexpected errors
  console.error("POST /api/v1/internal/ai/logs failed", err);
  return errorResponse(createApiError(500, "internal_error", "Failed to ingest log"));
}
```

### Logging Strategy:

- DO NOT log to ai_logs (circular dependency)
- Use `console.error` for internal errors
- Include context (endpoint, timestamp), but NOT payload (may contain PII)

---

## 8. Performance Considerations

### Potential Bottlenecks:

1. **Database Write Throughput** (POST)
   - **Problem**: High RPS → Supabase free tier overflow (500MB DB)
   - **Mitigation**:
     - Batch inserts (optional in future)
     - Rate limiting: 100 req/min
     - Retention: 30 days (auto-delete old logs)

2. **Database Query Performance** (GET)
   - **Problem**: Full table scans on large tables
   - **Mitigation**:
     - Indexes on `(event, created_at)`, `(level, created_at)`
     - Limit per_page max 100
     - Default sort: `created_at DESC` (uses index)

3. **Payload Size** (POST)
   - **Problem**: Large payloads (>100KB) → slow inserts
   - **Mitigation**:
     - Payload size validation (max 10KB)
     - Reject with 422 if too large

### Optimizations:

**Indexes on `ai_logs`**:

```sql
-- Index for event filtering + date range
CREATE INDEX idx_ai_logs_event_created ON ai_logs(event, created_at DESC);

-- Index for level filtering + date range
CREATE INDEX idx_ai_logs_level_created ON ai_logs(level, created_at DESC);

-- Index for user_id (if filtering by user)
CREATE INDEX idx_ai_logs_user_id ON ai_logs(user_id) WHERE user_id IS NOT NULL;
```

**Cache Strategy**:

- DO NOT cache GET (diagnostic data, always fresh)
- DO NOT cache POST (asynchronous ingest)

**Rate Limiting**:

- 100 req/min per service-role key (optional in future)

---

## 9. Implementation Steps

### Step 1: Create Validation Schemas

**File**: `src/lib/validation/aiLogs.ts`

- [ ] Create Zod schema `aiLogIngestSchema` (POST body)
- [ ] Create Zod schema `aiLogListQuerySchema` (GET query params)
- [ ] Export TypeScript types from schemas
- [ ] Add schema unit tests (optional)

**Estimate**: 20 minutes

---

### Step 2: Create AI Logs Service

**File**: `src/lib/services/aiLogsService.ts`

- [ ] Function `ingestAiLog(supabase, command): Promise<void>`
  - Insert into `ai_logs`
  - Handle DB errors (throw)

- [ ] Function `listAiLogs(supabase, filters, pagination): Promise<{ logs: AiLogDto[], total: number }>`
  - Query with filters (event, level, date range)
  - Order by `created_at DESC`
  - Pagination (offset, limit)
  - Count total for pagination metadata

**Estimate**: 45 minutes

**Example Implementation**:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { AiLogDto, AiLogIngestCommand } from "../../types";

export async function ingestAiLog(supabase: SupabaseClient<Database>, command: AiLogIngestCommand): Promise<void> {
  const { error } = await supabase.from("ai_logs").insert({
    event: command.event,
    level: command.level,
    model: command.model ?? null,
    provider: command.provider ?? null,
    latency_ms: command.latency_ms ?? null,
    input_tokens: command.input_tokens ?? null,
    output_tokens: command.output_tokens ?? null,
    cost_usd: command.cost_usd ?? null,
    payload: command.payload ?? null,
    user_id: command.user_id ?? null,
  });

  if (error) throw error;
}

export async function listAiLogs(
  supabase: SupabaseClient<Database>,
  filters: {
    event?: string;
    level?: string;
    created_after?: string;
    created_before?: string;
  },
  pagination: { page: number; per_page: number }
): Promise<{ logs: AiLogDto[]; total: number }> {
  // Build query
  let query = supabase.from("ai_logs").select("*", { count: "exact" }).order("created_at", { ascending: false });

  // Apply filters
  if (filters.event) {
    query = query.eq("event", filters.event);
  }
  if (filters.level) {
    query = query.eq("level", filters.level);
  }
  if (filters.created_after) {
    query = query.gte("created_at", filters.created_after);
  }
  if (filters.created_before) {
    query = query.lte("created_at", filters.created_before);
  }

  // Apply pagination
  const offset = (pagination.page - 1) * pagination.per_page;
  query = query.range(offset, offset + pagination.per_page - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    logs: (data ?? []) as AiLogDto[],
    total: count ?? 0,
  };
}
```

---

### Step 3: Create Service-Role Auth Utility

**File**: `src/lib/http/auth.ts` (add to existing file)

- [ ] Function `requireServiceRole(context): void`
  - Check `Authorization` header
  - Compare with `import.meta.env.SUPABASE_SERVICE_ROLE_KEY`
  - Throw ApiError(401/403) if invalid

**Estimate**: 15 minuteses

**Example Implementation**:

```typescript
export function requireServiceRole(context: APIContext): void {
  const authHeader = context.request.headers.get("authorization");

  if (!authHeader) {
    throw createApiError(401, "unauthorized", "Missing service-role credentials");
  }

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not set in environment");
    throw createApiError(500, "internal_error", "Server configuration error");
  }

  if (token !== serviceRoleKey) {
    throw createApiError(403, "forbidden", "Invalid service-role key");
  }
}
```

---

### Step 4: Implement POST Endpoint

**File**: `src/pages/api/v1/internal/ai/logs.ts`

- [ ] Export `export const prerender = false`
- [ ] Handler `POST(context: APIContext)`
  - Auth check: `requireServiceRole(context)`
  - Parse and validate body: `aiLogIngestSchema.parse(await context.request.json())`
  - Call service: `await ingestAiLog(supabase, body)`
  - Return 202 Accepted
  - Error handling (ApiError, ZodError, catch-all)

**Estimate**: 30 minutes

**Example Implementation**:

```typescript
export const prerender = false;

import type { APIContext } from "astro";
import { aiLogIngestSchema } from "../../../../lib/validation/aiLogs";
import { ingestAiLog } from "../../../../lib/services/aiLogsService";
import { requireServiceRole } from "../../../../lib/http/auth";
import { jsonResponse, errorResponse } from "../../../../lib/http/responses";
import { createApiError, isApiError } from "../../../../lib/http/errors";

export async function POST(context: APIContext) {
  try {
    // 1. Auth check (service-role only)
    requireServiceRole(context);

    // 2. Parse and validate request body
    const rawBody = await context.request.json();
    const body = aiLogIngestSchema.parse(rawBody);

    // 3. Ingest log
    const supabase = context.locals.supabase;
    await ingestAiLog(supabase, body);

    // 4. Return 202 Accepted
    return jsonResponse(202, { data: { status: "accepted" } });
  } catch (err: any) {
    // Handle ApiError (from auth check)
    if (isApiError(err)) {
      return errorResponse(err);
    }

    // Handle Zod validation error
    if (err.name === "ZodError") {
      const invalidParams = err.errors.map((e: any) => e.path.join("."));
      return errorResponse(
        createApiError(422, "validation_error", "Invalid request body", {
          details: { invalid_params: invalidParams },
        })
      );
    }

    // Handle JSON parse error
    if (err instanceof SyntaxError) {
      return errorResponse(createApiError(400, "validation_error", "Invalid JSON body"));
    }

    // Handle unexpected errors
    console.error("POST /api/v1/internal/ai/logs failed", {
      error: err.message,
      name: err.name,
    });
    return errorResponse(createApiError(500, "internal_error", "Failed to ingest log"));
  }
}
```

---

### Step 5: Implement GET Endpoint

**File**: `src/pages/api/v1/internal/ai/logs.ts` (same file as POST)

- [ ] Handler `GET(context: APIContext)`
  - Auth check: `requireServiceRole(context)`
  - Parse and validate query params: `aiLogListQuerySchema.parse(params)`
  - Call service: `const { logs, total } = await listAiLogs(supabase, filters, pagination)`
  - Return 200 OK with ApiListResponse
  - Error handling

**Estimate**: 30 minutes

**Example Implementation**:

```typescript
import type { ApiListResponse, AiLogDto } from "../../../../types";
import { aiLogListQuerySchema } from "../../../../lib/validation/aiLogs";
import { listAiLogs } from "../../../../lib/services/aiLogsService";

export async function GET(context: APIContext) {
  try {
    // 1. Auth check (service-role only)
    requireServiceRole(context);

    // 2. Parse and validate query params
    const url = new URL(context.request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const validated = aiLogListQuerySchema.parse(params);

    // 3. Extract filters and pagination
    const filters = {
      event: validated.event,
      level: validated.level,
      created_after: validated.created_after,
      created_before: validated.created_before,
    };
    const pagination = {
      page: validated.page,
      per_page: validated.per_page,
    };

    // 4. Fetch logs
    const supabase = context.locals.supabase;
    const { logs, total } = await listAiLogs(supabase, filters, pagination);

    // 5. Return 200 OK with pagination
    const response: ApiListResponse<AiLogDto> = {
      data: logs,
      page: pagination.page,
      per_page: pagination.per_page,
      total,
    };

    return jsonResponse(200, response);
  } catch (err: any) {
    // Handle ApiError (from auth check)
    if (isApiError(err)) {
      return errorResponse(err);
    }

    // Handle Zod validation error
    if (err.name === "ZodError") {
      const invalidParams = err.errors.map((e: any) => e.path.join("."));
      return errorResponse(
        createApiError(422, "validation_error", "Invalid query parameters", {
          details: { invalid_params: invalidParams },
        })
      );
    }

    // Handle unexpected errors
    console.error("GET /api/v1/internal/ai/logs failed", {
      error: err.message,
      name: err.name,
    });
    return errorResponse(createApiError(500, "internal_error", "Failed to fetch logs"));
  }
}
```

---

### Step 6: Create Database Indexes

**Supabase migration** (if indexes do not exist)

- [ ] Create SQL migration:

  ```sql
  -- Index for event filtering + date range
  CREATE INDEX IF NOT EXISTS idx_ai_logs_event_created
  ON ai_logs(event, created_at DESC);

  -- Index for level filtering + date range
  CREATE INDEX IF NOT EXISTS idx_ai_logs_level_created
  ON ai_logs(level, created_at DESC);

  -- Index for user_id (optional)
  CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id
  ON ai_logs(user_id)
  WHERE user_id IS NOT NULL;
  ```

- [ ] Run migration through Supabase CLI or Dashboard

**Estimate**: 10 minutes

---

### Step 7: Manual Tests

**Using curl or Postman**

- [ ] Test POST - success case (202)

  ```bash
  curl -X POST http://localhost:4321/api/v1/internal/ai/logs \
    -H "Authorization: Bearer <service_role_key>" \
    -H "Content-Type: application/json" \
    -d '{
      "event": "suggestion.generate",
      "level": "info",
      "model": "gpt-4o-mini",
      "provider": "openrouter",
      "latency_ms": 450,
      "input_tokens": 1200,
      "output_tokens": 300,
      "cost_usd": 0.015,
      "payload": { "user_id": "test-uuid" }
    }'
  ```

- [ ] Test POST - 401 (missing auth)
- [ ] Test POST - 403 (invalid service-role key)
- [ ] Test POST - 422 (validation error)

- [ ] Test GET - success case (200)

  ```bash
  curl -X GET "http://localhost:4321/api/v1/internal/ai/logs?page=1&per_page=20" \
    -H "Authorization: Bearer <service_role_key>"
  ```

- [ ] Test GET - with filters
- [ ] Test GET - 401/403 errors

**Estimate**: 30 minutes

---

### Step 8: Integrate AI Engine

**File**: `src/lib/services/aiEngine.ts` (if it exists)

- [ ] Call `POST /api/v1/internal/ai/logs` after each OpenRouter call
- [ ] Log:
  - `event`: "suggestion.generate"
  - `level`: "info" (or "error" on failure)
  - `latency_ms`, `input_tokens`, `output_tokens`, `cost_usd`
  - `payload`: `{ user_id, suggestion_id }`

**Estimate**: 30 minutes

**Integration example**:

```typescript
// In aiEngine.ts - after calling OpenRouter
try {
  const startTime = Date.now();
  const aiResponse = await callOpenRouter(prompt);
  const latencyMs = Date.now() - startTime;

  // Log success
  await fetch(`${import.meta.env.PUBLIC_API_URL}/api/v1/internal/ai/logs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: "suggestion.generate",
      level: "info",
      model: aiResponse.model,
      provider: "openrouter",
      latency_ms: latencyMs,
      input_tokens: aiResponse.usage.prompt_tokens,
      output_tokens: aiResponse.usage.completion_tokens,
      cost_usd: aiResponse.usage.total_cost,
      payload: { user_id: userId, suggestion_id: suggestionId },
    }),
  });

  return aiResponse;
} catch (err) {
  // Log error
  await fetch(`${import.meta.env.PUBLIC_API_URL}/api/v1/internal/ai/logs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${import.meta.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: "suggestion.generate",
      level: "error",
      model: "unknown",
      provider: "openrouter",
      payload: { user_id: userId, error: err.message },
    }),
  });

  throw err;
}
```

---

### Step 9: Documentation

**File**: `.ai/api-plan.md` (already exists; update if needed)

- [ ] Check API documentation is current
- [ ] Add curl examples for AI Logs endpoints
- [ ] Add "Security notes" for service-role auth

**Estimate**: 15 minuteses

---

## 10. Time Summary

| Step      | Task                      | Estimate       |
| --------- | ------------------------- | -------------- |
| 1         | Validation schemas        | 20 min         |
| 2         | AI Logs Service           | 45 min         |
| 3         | Service-role auth utility | 15 min         |
| 4         | POST endpoint             | 30 min         |
| 5         | GET endpoint              | 30 min         |
| 6         | Database indexes          | 10 min         |
| 7         | Manual tests              | 30 min         |
| 8         | AI Engine integration     | 30 min         |
| 9         | Documentation             | 15 min         |
| **TOTAL** |                           | **~3.5 hours** |

---

## 11. Checklist Before Merging into Main

- [ ] All validation schemas work correctly
- [ ] Service layer returns correct types (AiLogDto)
- [ ] POST endpoint returns 202 Accepted
- [ ] GET endpoint returns pagination metadata
- [ ] Auth check blocks user tokens (service-role only)
- [ ] Manual tests pass (curl)
- [ ] Database indexes created
- [ ] AI Engine integration works (logs saved)
- [ ] Documentation updated
- [ ] No PII logged in payload
- [ ] Console.error used instead of ai_logs (avoids circular dependency)

---

## 12. Future Improvements (Post-MVP)

- [ ] Rate limiting (100 req/min per service-role key)
- [ ] Batch inserts for POST (if high RPS)
- [ ] Retention job (auto-delete after 30 days)
- [ ] Monitoring dashboard (Grafana?) for AI costs
- [ ] Alerting for high latency or high cost
- [ ] CSV/JSON export for admin
