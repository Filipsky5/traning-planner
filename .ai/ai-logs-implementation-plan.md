# API Endpoint Implementation Plan: AI Logs (Internal)

## 1. Przegląd punktu końcowego

Endpoint AI Logs służy do ingesting i przeglądania logów interakcji z AI (OpenRouter). Jest to **internal-only endpoint** dostępny wyłącznie dla service-role key, niedostępny dla zwykłych użytkowników.

### Cel biznesowy:
- **Diagnostyka**: Śledzenie błędów i problemów z AI
- **Cost tracking**: Monitorowanie kosztów wywołań AI (tokens, USD)
- **Audyt**: Historia wywołań AI per użytkownik/sugestia

### Endpointy:
- `POST /api/v1/internal/ai/logs` - Ingest pojedynczego logu AI
- `GET /api/v1/internal/ai/logs` - Listowanie logów z filtrami i paginacją

---

## 2. Szczegóły żądania

### POST `/api/v1/internal/ai/logs`

**Metoda HTTP**: POST
**Struktura URL**: `/api/v1/internal/ai/logs`
**Autoryzacja**: Service-role key przez header `Authorization: Bearer <service_role_key>`

**Request Headers**:
- `Authorization: Bearer <service_role_key>` (wymagane)
- `Content-Type: application/json` (wymagane)

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

**Parametry**:
- **Wymagane**:
  - `event` (string): Typ zdarzenia (np. "suggestion.generate")
  - `level` (string): Poziom loga ("info", "warn", "error")

- **Opcjonalne**:
  - `model` (string): Nazwa modelu AI
  - `provider` (string): Provider AI (np. "openrouter")
  - `latency_ms` (integer ≥ 0): Czas odpowiedzi w ms
  - `input_tokens` (integer ≥ 0): Liczba tokenów wejściowych
  - `output_tokens` (integer ≥ 0): Liczba tokenów wyjściowych
  - `cost_usd` (number ≥ 0): Koszt wywołania w USD
  - `payload` (object): Dodatkowy kontekst JSON (max 10KB)
  - `user_id` (uuid): ID użytkownika powiązanego z logiem

---

### GET `/api/v1/internal/ai/logs`

**Metoda HTTP**: GET
**Struktura URL**: `/api/v1/internal/ai/logs?page=1&per_page=20&event=suggestion.generate`
**Autoryzacja**: Service-role key przez header `Authorization: Bearer <service_role_key>`

**Query Parameters**:
- **Opcjonalne**:
  - `event` (string): Filtr po typie zdarzenia
  - `level` (string): Filtr po poziomie loga
  - `created_after` (ISO timestamp): Logi utworzone po tej dacie
  - `created_before` (ISO timestamp): Logi utworzone przed tą datą
  - `page` (integer, default: 1, min: 1): Numer strony
  - `per_page` (integer, default: 20, min: 1, max: 100): Liczba elementów na stronę

---

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects)

Z pliku `src/types.ts`:

```typescript
// Response type dla GET
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

// Command type dla POST
export type AiLogIngestCommand = Omit<AiLogInsert, "id" | "created_at">;
```

### Validation Schemas (do stworzenia)

Plik: `src/lib/validation/aiLogs.ts`

```typescript
import { z } from "zod";

// Schema dla POST body
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

// Schema dla GET query params
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

## 4. Szczegóły odpowiedzi

### POST `/api/v1/internal/ai/logs`

**Sukces - 202 Accepted**:
```json
{
  "data": {
    "status": "accepted"
  }
}
```

**Błędy**:
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

**Sukces - 200 OK**:
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

**Błędy**:
- **400 Bad Request** - Malformed query params
- **401 Unauthorized** - Missing Authorization header
- **403 Forbidden** - Invalid service-role key
- **422 Unprocessable Entity** - Invalid filters
- **500 Internal Server Error** - Database error

---

## 5. Przepływ danych

### POST `/api/v1/internal/ai/logs`

```
1. Request → Astro API Route Handler
2. Walidacja Authorization header (service-role key)
3. Parse i walidacja JSON body (Zod schema)
4. Wywołanie aiLogsService.ingestAiLog()
5. Service → Supabase insert do tabeli ai_logs
6. Response 202 Accepted
```

**Diagram przepływu**:
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
2. Walidacja Authorization header (service-role key)
3. Parse i walidacja query params (Zod schema)
4. Wywołanie aiLogsService.listAiLogs(filters, pagination)
5. Service → Supabase query z filtrami i paginacją
6. Response 200 OK z danymi + pagination metadata
```

**Diagram przepływu**:
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

## 6. Względy bezpieczeństwa

### Krytyczne zagrożenia i mitigacje:

1. **Authorization Bypass** (KRYTYCZNE)
   - **Zagrożenie**: Endpoint dostępny dla user tokens → leak logów
   - **Mitigacja**: Sprawdzenie `Authorization: Bearer <service_role_key>` przez porównanie z `import.meta.env.SUPABASE_SERVICE_ROLE_KEY`
   - **Guard clause**: Zwrócić 401/403 przed jakąkolwiek operacją

2. **Privacy Leak** (WYSOKIE)
   - **Zagrożenie**: Payload może zawierać PII użytkownika
   - **Mitigacja**:
     - Dokumentacja: NIE logować PII w payload
     - Retention: 30 dni (job zewnętrzny)
     - RLS disabled na ai_logs (tylko service-role)

3. **DoS Attack** (ŚREDNIE)
   - **Zagrożenie**: Flood dużych payloadów → overflow DB
   - **Mitigacja**:
     - Walidacja payload size (max 10KB)
     - Rate limiting: 100 req/min (opcjonalnie)

4. **Network Exposure** (WYSOKIE)
   - **Zagrożenie**: Endpoint wywołany z przeglądarki
   - **Mitigacja**:
     - Service-role key **NIE** może być w zmiennych środowiskowych client-side
     - Endpoint używany tylko server-side (w AI service)

5. **SQL Injection** (NISKIE)
   - **Zagrożenie**: Malicious filters w GET
   - **Mitigacja**: Supabase client sanitizes queries automatycznie

### Implementacja auth check:

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

## 7. Obsługa błędów

### Poziomy błędów:

**400 Bad Request**:
- Malformed JSON body
- Malformed query params
- Przykład: Niepoprawny JSON syntax

**401 Unauthorized**:
- Missing Authorization header
- Przykład: Brak header'a Authorization

**403 Forbidden**:
- Invalid service-role key
- Przykład: User token zamiast service-role key

**422 Unprocessable Entity**:
- Validation error (Zod)
- Invalid field values (negative numbers, invalid UUID)
- Przykład: `latency_ms: -10`, `cost_usd: "abc"`

**500 Internal Server Error**:
- Database insert/query failed
- Unexpected server error
- Przykład: Supabase connection timeout

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
    const details = { invalid_params: err.errors.map(e => e.path.join(".")) };
    return errorResponse(createApiError(422, "validation_error", "Invalid request body", { details }));
  }

  // Handle unexpected errors
  console.error("POST /api/v1/internal/ai/logs failed", err);
  return errorResponse(createApiError(500, "internal_error", "Failed to ingest log"));
}
```

### Logging Strategy:

- **NIE** logować do ai_logs (circular dependency)
- Używać `console.error` dla internal errors
- Dołączyć context (endpoint, timestamp) ale NIE payload (może zawierać PII)

---

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

1. **Database Write Throughput** (POST)
   - **Problem**: Wysokie RPS → overflow Supabase free tier (500MB DB)
   - **Mitigacja**:
     - Batch inserts (opcjonalnie w przyszłości)
     - Rate limiting: 100 req/min
     - Retention: 30 dni (auto-delete starych logów)

2. **Database Query Performance** (GET)
   - **Problem**: Full table scan na dużych tabelach
   - **Mitigacja**:
     - Index na kolumnach: `(event, created_at)`, `(level, created_at)`
     - Limit per_page max 100
     - Default sort: `created_at DESC` (używa index)

3. **Payload Size** (POST)
   - **Problem**: Duże payloady (>100KB) → slow inserts
   - **Mitigacja**:
     - Walidacja payload size (max 10KB)
     - Reject z 422 jeśli za duże

### Optymalizacje:

**Index'y na tabeli `ai_logs`**:
```sql
-- Index dla filtrowania po event + date range
CREATE INDEX idx_ai_logs_event_created ON ai_logs(event, created_at DESC);

-- Index dla filtrowania po level + date range
CREATE INDEX idx_ai_logs_level_created ON ai_logs(level, created_at DESC);

-- Index dla user_id (jeśli będziemy filtrować po użytkowniku)
CREATE INDEX idx_ai_logs_user_id ON ai_logs(user_id) WHERE user_id IS NOT NULL;
```

**Cache Strategy**:
- **NIE** cache'ować GET (dane diagnostyczne, zawsze fresh)
- **NIE** cache'ować POST (asynchroniczny ingest)

**Rate Limiting**:
- 100 req/min per service-role key (opcjonalnie w przyszłości)

---

## 9. Kroki implementacji

### Krok 1: Utworzenie validation schemas
**Plik**: `src/lib/validation/aiLogs.ts`

- [ ] Utworzyć Zod schema `aiLogIngestSchema` (POST body)
- [ ] Utworzyć Zod schema `aiLogListQuerySchema` (GET query params)
- [ ] Eksportować typy TypeScript z schemas
- [ ] Dodać testy jednostkowe dla schemas (opcjonalnie)

**Estimate**: 20 minut

---

### Krok 2: Utworzenie AI Logs Service
**Plik**: `src/lib/services/aiLogsService.ts`

- [ ] Funkcja `ingestAiLog(supabase, command): Promise<void>`
  - Insert do tabeli `ai_logs`
  - Handle DB errors (throw)

- [ ] Funkcja `listAiLogs(supabase, filters, pagination): Promise<{ logs: AiLogDto[], total: number }>`
  - Query z filtrami (event, level, date range)
  - Order by `created_at DESC`
  - Paginacja (offset, limit)
  - Count total dla pagination metadata

**Estimate**: 45 minut

**Przykładowa implementacja**:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { AiLogDto, AiLogIngestCommand } from "../../types";

export async function ingestAiLog(
  supabase: SupabaseClient<Database>,
  command: AiLogIngestCommand
): Promise<void> {
  const { error } = await supabase
    .from("ai_logs")
    .insert({
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
  let query = supabase
    .from("ai_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

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

### Krok 3: Utworzenie utility function dla service-role auth
**Plik**: `src/lib/http/auth.ts` (dodać do istniejącego pliku)

- [ ] Funkcja `requireServiceRole(context): void`
  - Sprawdzenie `Authorization` header
  - Porównanie z `import.meta.env.SUPABASE_SERVICE_ROLE_KEY`
  - Throw ApiError(401/403) jeśli invalid

**Estimate**: 15 minut

**Przykładowa implementacja**:

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

### Krok 4: Implementacja POST endpoint
**Plik**: `src/pages/api/v1/internal/ai/logs.ts`

- [ ] Export `export const prerender = false`
- [ ] Handler `POST(context: APIContext)`
  - Auth check: `requireServiceRole(context)`
  - Parse i validate body: `aiLogIngestSchema.parse(await context.request.json())`
  - Call service: `await ingestAiLog(supabase, body)`
  - Return 202 Accepted
  - Error handling (ApiError, ZodError, catch-all)

**Estimate**: 30 minut

**Przykładowa implementacja**:

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
      return errorResponse(
        createApiError(400, "validation_error", "Invalid JSON body")
      );
    }

    // Handle unexpected errors
    console.error("POST /api/v1/internal/ai/logs failed", {
      error: err.message,
      name: err.name,
    });
    return errorResponse(
      createApiError(500, "internal_error", "Failed to ingest log")
    );
  }
}
```

---

### Krok 5: Implementacja GET endpoint
**Plik**: `src/pages/api/v1/internal/ai/logs.ts` (w tym samym pliku co POST)

- [ ] Handler `GET(context: APIContext)`
  - Auth check: `requireServiceRole(context)`
  - Parse i validate query params: `aiLogListQuerySchema.parse(params)`
  - Call service: `const { logs, total } = await listAiLogs(supabase, filters, pagination)`
  - Return 200 OK z ApiListResponse
  - Error handling

**Estimate**: 30 minut

**Przykładowa implementacja**:

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
    return errorResponse(
      createApiError(500, "internal_error", "Failed to fetch logs")
    );
  }
}
```

---

### Krok 6: Utworzenie index'ów w bazie danych
**Migracja Supabase** (jeśli jeszcze nie istnieją)

- [ ] Utworzyć migrację SQL:
  ```sql
  -- Index dla filtrowania po event + date range
  CREATE INDEX IF NOT EXISTS idx_ai_logs_event_created
  ON ai_logs(event, created_at DESC);

  -- Index dla filtrowania po level + date range
  CREATE INDEX IF NOT EXISTS idx_ai_logs_level_created
  ON ai_logs(level, created_at DESC);

  -- Index dla user_id (optional)
  CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id
  ON ai_logs(user_id)
  WHERE user_id IS NOT NULL;
  ```

- [ ] Uruchomić migrację przez Supabase CLI lub Dashboard

**Estimate**: 10 minut

---

### Krok 7: Testy manualne
**Używając curl lub Postman**

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

**Estimate**: 30 minut

---

### Krok 8: Integracja z AI Engine
**Plik**: `src/lib/services/aiEngine.ts` (jeśli istnieje)

- [ ] Dodać wywołanie `POST /api/v1/internal/ai/logs` po każdym wywołaniu OpenRouter
- [ ] Logować:
  - `event`: "suggestion.generate"
  - `level`: "info" (lub "error" jeśli failed)
  - `latency_ms`, `input_tokens`, `output_tokens`, `cost_usd`
  - `payload`: `{ user_id, suggestion_id }`

**Estimate**: 30 minut

**Przykład integracji**:

```typescript
// W aiEngine.ts - po wywołaniu OpenRouter
try {
  const startTime = Date.now();
  const aiResponse = await callOpenRouter(prompt);
  const latencyMs = Date.now() - startTime;

  // Log success
  await fetch(`${import.meta.env.PUBLIC_API_URL}/api/v1/internal/ai/logs`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${import.meta.env.SUPABASE_SERVICE_ROLE_KEY}`,
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
      "Authorization": `Bearer ${import.meta.env.SUPABASE_SERVICE_ROLE_KEY}`,
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

### Krok 9: Dokumentacja
**Plik**: `.ai/api-plan.md` (już istnieje, update jeśli potrzeba)

- [ ] Sprawdzić czy dokumentacja API jest aktualna
- [ ] Dodać przykłady curl dla AI Logs endpointów
- [ ] Dodać sekcję "Security notes" dla service-role auth

**Estimate**: 15 minut

---

## 10. Podsumowanie czasowe

| Krok | Zadanie | Estimate |
|------|---------|----------|
| 1 | Validation schemas | 20 min |
| 2 | AI Logs Service | 45 min |
| 3 | Service-role auth utility | 15 min |
| 4 | POST endpoint | 30 min |
| 5 | GET endpoint | 30 min |
| 6 | Database indexes | 10 min |
| 7 | Testy manualne | 30 min |
| 8 | Integracja z AI Engine | 30 min |
| 9 | Dokumentacja | 15 min |
| **TOTAL** | | **~3.5 godziny** |

---

## 11. Checklist przed merging do main

- [ ] Wszystkie validation schemas działają poprawnie
- [ ] Service layer zwraca poprawne typy (AiLogDto)
- [ ] POST endpoint zwraca 202 Accepted
- [ ] GET endpoint zwraca pagination metadata
- [ ] Auth check blokuje user tokens (tylko service-role)
- [ ] Testy manualne przeszły (curl)
- [ ] Index'y w bazie danych utworzone
- [ ] AI Engine integracja działa (logi są zapisywane)
- [ ] Dokumentacja zaktualizowana
- [ ] Brak logowania PII w payload
- [ ] Console.error używany zamiast ai_logs (uniknięcie circular dependency)

---

## 12. Przyszłe usprawnienia (post-MVP)

- [ ] Rate limiting (100 req/min per service-role key)
- [ ] Batch inserts dla POST (jeśli high RPS)
- [ ] Retention job (auto-delete po 30 dniach)
- [ ] Monitoring dashboard (Grafana?) dla kosztów AI
- [ ] Alerting dla high latency lub high cost
- [ ] Export do CSV/JSON dla admin
