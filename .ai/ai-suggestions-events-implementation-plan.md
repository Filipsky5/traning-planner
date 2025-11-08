# API Endpoint Implementation Plan: AI Suggestion Events

## 1. Przegląd punktu końcowego

Endpoint służy do pobierania listy zdarzeń (events) powiązanych z konkretną sugestią AI. W MVP głównym rodzajem zdarzenia jest `regenerate`, które rejestruje akcje regeneracji sugestii przez użytkownika. Endpoint umożliwia audyt historii zmian sugestii oraz służy do egzekwowania limitów (np. liczby regeneracji).

**Funkcjonalność:**
- Pobieranie historii zdarzeń dla pojedynczej sugestii AI
- Paginacja wyników
- Sortowanie po dacie wystąpienia (najnowsze pierwsze)
- Weryfikacja ownership (tylko eventy własnych sugestii)

**Zakres:** GET `/api/v1/ai/suggestions/{id}/events`

## 2. Szczegóły żądania

**Metoda HTTP:** GET

**Struktura URL:** `/api/v1/ai/suggestions/{id}/events`

**Parametry:**

**Wymagane (Path):**
- `id` (string, UUID) - ID sugestii AI, której eventy chcemy pobrać

**Opcjonalne (Query):**
- `page` (number, default: 1, min: 1) - Numer strony wyników
- `per_page` (number, default: 20, min: 1, max: 100) - Liczba wyników na stronę

**Request Headers:**
- `Authorization: Bearer {token}` - Supabase session token (wymagany)

**Request Body:** Brak (metoda GET)

**Przykładowe zapytania:**
```http
GET /api/v1/ai/suggestions/550e8400-e29b-41d4-a716-446655440000/events
GET /api/v1/ai/suggestions/550e8400-e29b-41d4-a716-446655440000/events?page=1&per_page=10
```

## 3. Wykorzystywane typy

**Istniejące w `src/types.ts`:**

```typescript
// DTO odpowiedzi
export type AiSuggestionEventDto = Pick<
  AiSuggestionEventRow,
  "id" | "kind" | "occurred_at" | "metadata"
>;

// Koperta odpowiedzi z paginacją
export interface ApiListResponse<T> {
  data: T[];
  page: number;
  per_page: number;
  total: number;
}
```

**Nowe (do utworzenia w `src/lib/validation/aiSuggestions.ts`):**

```typescript
// Schema walidacji query params dla eventów
export const eventsQuerySchema = z.object({
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(
      z.number().int("page must be an integer").min(1, "page must be >= 1")
    )
    .default(1),
  per_page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => (value === undefined ? undefined : Number(value)))
    .pipe(
      z
        .number()
        .int("per_page must be an integer")
        .min(1, "per_page must be >= 1")
        .max(100, "per_page must be <= 100")
    )
    .default(20),
});

export type EventsQueryParams = z.infer<typeof eventsQuerySchema>;
```

## 4. Szczegóły odpowiedzi

**Sukces (200 OK):**

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

**Struktura odpowiedzi:**
- `data` - Array obiektów `AiSuggestionEventDto`
- `page` - Aktualny numer strony
- `per_page` - Liczba wyników na stronę
- `total` - Całkowita liczba eventów dla tej sugestii

**Kody statusu:**
- `200 OK` - Pomyślne pobranie eventów (może być pusta lista)
- `400 Bad Request` - Nieprawidłowy format UUID lub query params
- `401 Unauthorized` - Brak autentykacji
- `404 Not Found` - Sugestia nie istnieje lub należy do innego użytkownika
- `500 Internal Server Error` - Błąd serwera/bazy danych

## 5. Przepływ danych

```
1. Request → Astro API Route Handler
   ↓
2. Walidacja path param (id: UUID)
   ↓
3. Walidacja query params (page, per_page)
   ↓
4. Autentykacja (requireUserId)
   ↓
5. Weryfikacja ownership sugestii
   │  └─ fetchSuggestionRow(supabase, userId, id)
   │     ├─ 404 jeśli nie istnieje lub nie należy do usera
   │     └─ OK - kontynuuj
   ↓
6. Service: listSuggestionEvents(supabase, userId, suggestionId, pagination)
   │  ├─ SELECT z ai_suggestion_events
   │  ├─ WHERE user_id = userId AND ai_suggestion_id = suggestionId
   │  ├─ ORDER BY occurred_at DESC
   │  ├─ LIMIT/OFFSET dla paginacji
   │  └─ COUNT(*) dla total
   ↓
7. Mapowanie do AiSuggestionEventDto[]
   ↓
8. Konstrukcja ApiListResponse
   ↓
9. Response 200 + JSON
```

**Interakcje z bazą danych:**

1. **Weryfikacja ownership:**
   - Tabela: `ai_suggestions`
   - Query: `SELECT id FROM ai_suggestions WHERE id = ? AND user_id = ?`
   - RLS: Automatycznie filtruje po `user_id = auth.uid()`

2. **Pobieranie eventów:**
   - Tabela: `ai_suggestion_events`
   - Query:
     ```sql
     SELECT id, kind, occurred_at, metadata, COUNT(*) OVER() as total_count
     FROM ai_suggestion_events
     WHERE user_id = ? AND ai_suggestion_id = ?
     ORDER BY occurred_at DESC
     LIMIT ? OFFSET ?
     ```
   - RLS: Automatycznie filtruje po `user_id = auth.uid()`

**Indeksy (już istniejące w DB):**
- `idx_ai_suggestion_events_user_suggestion` na `(user_id, ai_suggestion_id, occurred_at DESC)` - dla wydajności queries

## 6. Względy bezpieczeństwa

### Autentykacja
- **Wymagana:** Token Supabase w header `Authorization: Bearer {token}`
- **Implementacja:** Użyj `requireUserId(context)` z `src/lib/http/auth.ts`
- **Failure mode:** 401 Unauthorized

### Autoryzacja (Ownership Verification)
- **Wymaganie:** User może widzieć tylko eventy swoich sugestii
- **Implementacja dwuwarstwowa:**
  1. **Application layer:** Najpierw `fetchSuggestionRow(supabase, userId, id)` - weryfikuje czy suggestion należy do usera
  2. **Database layer:** RLS na `ai_suggestion_events` z policy `user_id = auth.uid()`
- **Failure mode:** 404 Not Found (nie ujawniamy czy sugestia istnieje ale należy do kogoś innego)

### Walidacja danych wejściowych
- **UUID format:** Zod schema `z.string().uuid()` dla parametru `id`
- **Query params:** Zod schema z limitami (page >= 1, per_page 1-100)
- **Sanitization:** Nie potrzebna - używamy parametryzowanych queries przez Supabase client

### Rate Limiting
- **Nie implementowane w MVP** - można dodać w przyszłości:
  - Limit requestów per user per minute
  - Implementacja przez middleware lub Supabase Edge Functions

### Information Disclosure Prevention
- **404 dla wszystkich niepowodzeń access:** Nie ujawniaj czy resource istnieje, jeśli user nie ma do niego dostępu
- **Konsystentny timing:** Unikaj timing attacks (weryfikacja ownership przed query eventów)

### SQL Injection
- **Mitigation:** Supabase client używa parametryzowanych queries (prepared statements)
- **No raw SQL:** Nie używamy `supabase.rpc()` z surowym SQL

## 7. Obsługa błędów

### Scenariusze błędów i kody statusu:

| Kod | Scenariusz | Warunek | Response Body |
|-----|-----------|---------|---------------|
| 400 | Invalid UUID | `id` nie jest prawidłowym UUID | `{"error": {"code": "validation_error", "message": "Invalid suggestion ID format"}}` |
| 400 | Invalid pagination | `page < 1` lub `per_page > 100` | `{"error": {"code": "validation_error", "message": "Invalid query parameters", "details": [...]}}` |
| 401 | Unauthorized | Brak lub invalid session token | `{"error": {"code": "unauthorized", "message": "Authentication required"}}` |
| 404 | Not Found | Suggestion nie istnieje LUB należy do innego usera | `{"error": {"code": "not_found", "message": "AI suggestion not found"}}` |
| 500 | Database Error | Supabase query failure | `{"error": {"code": "internal_error", "message": "Failed to load events"}}` |

### Implementacja error handling:

```typescript
function handleError(error: unknown): Response {
  // Zod validation error
  if (error instanceof Error && error.name === "ZodError") {
    return errorResponse(
      createApiError(400, "validation_error", "Invalid query parameters", { cause: error })
    );
  }

  // API errors (from service layer)
  if (isApiError(error)) {
    return errorResponse(error);
  }

  // Unexpected errors
  console.error("AI suggestion events endpoint failed", error);
  return errorResponse(
    createApiError(500, "internal_error", "Failed to load events", { cause: error })
  );
}
```

### Logging błędów:

```typescript
// Server-side logging dla 500 errors
console.error("AI suggestion events endpoint failed", {
  suggestionId: id,
  userId,
  error: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
});
```

**Nie używamy `ai_logs` tabeli** - to endpoint tylko do odczytu, nie wywołujący AI.

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła:

1. **N+1 Query Problem:** ❌ Nie występuje - single query dla eventów
2. **Large result sets:** Mitigation poprzez paginację (max 100 per request)
3. **Database indexing:** Indeks już istnieje: `(user_id, ai_suggestion_id, occurred_at DESC)`

### Strategie optymalizacji:

**Database:**
- ✅ Indeks na `ai_suggestion_events(user_id, ai_suggestion_id, occurred_at DESC)` - pokrywa sorting + WHERE clause
- ✅ RLS z indexed columns - wydajne filtrowanie po `user_id`
- ✅ Pagination zamiast pełnego load

**Application:**
- ✅ Streaming response dla dużych result sets (Astro automatycznie)
- ✅ Lazy evaluation przez Supabase client
- 🔄 **Opcjonalnie:** HTTP caching (ETag) jeśli eventy rzadko się zmieniają

**Monitoring:**
- Metric: Response time (target: < 200ms dla p95)
- Metric: Database query time
- Alert: Jeśli > 500ms dla p99

### Oszacowanie wydajności:

- **Expected load:** Low (audyt / debugging, nie critical path)
- **Query complexity:** O(log n) dzięki indeksowi + O(k) dla LIMIT k
- **Typical response size:** < 5KB (20 eventów * ~200B)
- **Database round trips:** 2 (ownership check + events query)

**Optymalizacja przyszłości (jeśli potrzebna):**
- Combine ownership check + events fetch w jeden query (JOIN)
- Add Redis caching dla często odczytywanych suggestion events
- Implement GraphQL DataLoader pattern dla batch requests

## 9. Etapy wdrożenia

### Krok 1: Walidacja (Zod schemas)
**Plik:** `src/lib/validation/aiSuggestions.ts`

```typescript
// Dodaj nowy schema dla query params eventów
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

### Krok 2: Service Layer - Paginacja eventów
**Plik:** `src/lib/services/aiSuggestionsService.ts`

```typescript
// Dodaj nową funkcję obok istniejącej fetchSuggestionEvents
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
- Weryfikuj że paginacja działa (offset/limit poprawne)
- Weryfikuj że count jest accurate
- Weryfikuj że sortowanie DESC po occurred_at

---

### Krok 3: API Route Handler
**Plik:** `src/pages/api/v1/ai/suggestions/[id]/events.ts`

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

    const payload: ApiListResponse<typeof result.data[number]> = {
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
- Verify 401 bez auth token
- Verify 404 dla nieistniejącej sugestii
- Verify 404 dla sugestii innego usera (security)

---

### Krok 4: Testy integracyjne
**Plik:** `.curls/ai-suggestions-events.sh`

```bash
#!/bin/bash

# Test Suite dla GET /api/v1/ai/suggestions/{id}/events

BASE_URL="http://localhost:3000"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🔐 Pobieranie tokena autoryzacyjnego..."
AUTH_TOKEN=$("${SCRIPT_DIR}/auth-test-user.sh")

if [[ -z "$AUTH_TOKEN" ]]; then
  echo "❌ Nie udało się uzyskać tokena."
  exit 1
fi

echo "✅ Token uzyskany"
echo ""

# Najpierw stwórz sugestię (potrzebna do testów eventów)
echo "🆕 Tworzenie testowej sugestii..."
CREATE_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  "${BASE_URL}/api/v1/ai/suggestions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{"planned_date":"2025-11-10","training_type_code":"easy"}')

CREATE_BODY=$(echo "$CREATE_RESPONSE" | sed '$d')
CREATE_STATUS=$(echo "$CREATE_RESPONSE" | tail -n1)

if [[ "$CREATE_STATUS" != "201" ]]; then
  echo "❌ Nie udało się stworzyć sugestii (status: $CREATE_STATUS)"
  exit 1
fi

SUGGESTION_ID=$(echo "$CREATE_BODY" | jq -r '.data.id')
echo "✅ Sugestia utworzona: $SUGGESTION_ID"
echo ""

# Test 1: GET events bez parametrów
echo "📋 Test 1: GET /events bez parametrów (default pagination)"
curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/ai/suggestions/${SUGGESTION_ID}/events" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | \
  (read body; read status; echo "$body" | jq '.'; echo "Status: $status")
echo ""

# Test 2: GET events z custom pagination
echo "📋 Test 2: GET /events?page=1&per_page=5"
curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/ai/suggestions/${SUGGESTION_ID}/events?page=1&per_page=5" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | \
  (read body; read status; echo "$body" | jq '.'; echo "Status: $status")
echo ""

# Test 3: GET events bez auth (expect 401)
echo "🔒 Test 3: GET /events bez auth (expect 401)"
curl -s -w "\n%{http_code}" \
  -X GET \
  "${BASE_URL}/api/v1/ai/suggestions/${SUGGESTION_ID}/events" | \
  (read body; read status; echo "$body" | jq '.'; echo "Status: $status")
echo ""

# Test 4: GET events dla nieistniejącej sugestii (expect 404)
echo "❌ Test 4: GET /events dla nieistniejącej sugestii (expect 404)"
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

echo "✅ Test suite zakończony"
```

**Uruchomienie:**
```bash
chmod +x .curls/ai-suggestions-events.sh
./.curls/ai-suggestions-events.sh > .curls/ai-suggestions-events-results.log 2>&1
```

---

### Krok 5: Dokumentacja
**Plik:** Aktualizacja `README.md` lub API docs

```markdown
### GET /api/v1/ai/suggestions/{id}/events

Pobiera listę zdarzeń (events) dla konkretnej sugestii AI.

**Autentykacja:** Wymagana (Bearer token)

**Parametry:**
- `id` (path, UUID) - ID sugestii AI
- `page` (query, number, optional, default: 1) - Numer strony
- `per_page` (query, number, optional, default: 20, max: 100) - Liczba wyników na stronę

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
```

---

### Krok 6: Weryfikacja i testy manualne

1. **Uruchom serwer dev:**
   ```bash
   npm run dev
   ```

2. **Uruchom test suite:**
   ```bash
   ./.curls/ai-suggestions-events.sh
   ```

3. **Weryfikuj responses:**
   - ✅ 200 dla valid requests z pustą listą (nowa sugestia nie ma eventów)
   - ✅ 200 z eventami po wykonaniu regenerate
   - ✅ 401 bez auth
   - ✅ 404 dla nieistniejącej sugestii
   - ✅ 400 dla invalid pagination

4. **Performance test:**
   ```bash
   # Apache Bench - 100 requests, 10 concurrent
   ab -n 100 -c 10 -H "Authorization: Bearer {token}" \
     http://localhost:3000/api/v1/ai/suggestions/{id}/events
   ```

5. **Security test:**
   - Próba dostępu do sugestii innego usera → 404
   - Próba z invalid/expired token → 401
   - SQL injection attempts → Blocked by Supabase

---

### Checklist końcowy

- [ ] Zod schema dla query params (`eventsQuerySchema`)
- [ ] Service function z paginacją (`listSuggestionEvents`)
- [ ] API route handler (`/api/v1/ai/suggestions/[id]/events.ts`)
- [ ] Error handling dla wszystkich scenariuszy
- [ ] Test suite bash script
- [ ] Weryfikacja ownership (security)
- [ ] Response format zgodny ze specyfikacją
- [ ] Dokumentacja endpoint
- [ ] Performance test (< 200ms p95)
- [ ] Security test (cross-user access blocked)

---

## 10. Potencjalne rozszerzenia (poza MVP)

1. **Filtrowanie po `kind`:**
   - Query param: `kind=regenerate`
   - Przydatne gdy będzie więcej typów eventów (create, accept, reject)

2. **Sortowanie:**
   - Query param: `sort=occurred_at:asc|desc`
   - Default: `desc` (najnowsze pierwsze)

3. **HTTP Caching:**
   - ETag based on last event `occurred_at`
   - Cache-Control: `private, max-age=60`

4. **Batch endpoint:**
   - POST `/api/v1/ai/suggestions/events/batch`
   - Body: `{ suggestion_ids: [...] }`
   - Zwraca eventy dla wielu sugestii naraz

5. **Real-time updates:**
   - WebSocket/SSE dla live event stream
   - Supabase Realtime subscriptions

6. **Aggregations:**
   - Count per event kind
   - Timeline/histogram eventów
