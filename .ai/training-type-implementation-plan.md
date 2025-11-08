## Plan wdrożenia API: GET /api/v1/training-types

### 1. Przegląd punktu końcowego
- **Cel**: Zwraca listę typów treningów. Domyślnie tylko aktywne (`is_active=true`). Dla zapytań serwisowych/admin możliwe zwrócenie wszystkich (`include_inactive=true`).
- **Cache**: Wsparcie ETag + nagłówki `Cache-Control: private, max-age=3600, stale-while-revalidate=86400`.
- **Idempotencja/bez zmian**: Jeżeli klient dostarczy `If-None-Match` zgodny z aktualnym ETag, serwer zwraca `304 Not Modified` bez ciała.

### 2. Szczegóły żądania
- **Metoda**: GET
- **URL**: `/api/v1/training-types`
- **Parametry zapytania (query)**:
  - `include_inactive` (boolean, opcjonalny, domyślnie `false`): wymaga uprawnień serwisowych/admin.
- **Nagłówki żądania**:
  - `If-None-Match` (opcjonalny): ETag z poprzedniej odpowiedzi do walidacji cache.
  - `X-Internal-Token` (opcjonalny, serwisowy): wewnętrzny token do odblokowania `include_inactive=true` w MVP (bez profili admin).
- **Body**: brak

### 3. Wykorzystywane typy
- Z `src/types.ts`:
  - `TrainingTypeDto = { code: string; name: string; is_active: boolean; created_at: string }`
  - `ApiListResponse<TrainingTypeDto>`: `{ data: TrainingTypeDto[]; page: number; per_page: number; total: number }`

### 4. Szczegóły odpowiedzi
- **200 OK**:
  - Body (JSON): `ApiListResponse<TrainingTypeDto>`
  - Nagłówki: `ETag`, `Cache-Control: private, max-age=3600, stale-while-revalidate=86400`
- **304 Not Modified**: bez ciała; zwraca `ETag` i `Cache-Control` (rekomendowane)
- **401 Unauthorized**: gdy żądanie używa `include_inactive=true` bez ważnych poświadczeń (np. brak/niepoprawny token wewnętrzny)
- **403 Forbidden**: gdy klient jest uwierzytelniony, ale nie posiada uprawnień do `include_inactive=true`
- **500 Internal Server Error**: błąd serwerowy/DB

Przykład 200:

```json
{
  "data": [
    { "code": "easy", "name": "Easy Run", "is_active": true, "created_at": "2025-10-11T00:00:00Z" }
  ],
  "page": 1,
  "per_page": 20,
  "total": 6
}
```

### 5. Przepływ danych
1) Klient wywołuje `GET /api/v1/training-types` z opcjonalnym `?include_inactive=true` i/lub nagłówkiem `If-None-Match`.
2) Endpoint (Astro API Route) parsuje i waliduje query przez Zod.
3) Jeżeli `include_inactive=true`, endpoint wykonuje kontrolę uprawnień:
   - MVP: sprawdzenie nagłówka `X-Internal-Token` wobec `import.meta.env.INTERNAL_ADMIN_TOKEN`.
   - (Opcjonalnie, rozszerzenie): jeżeli w przyszłości wprowadzimy adminów użytkowników, sprawdzenie roli/allowlisty (np. `ADMIN_EMAILS`) przed 403.
4) Service `trainingTypesService.list` pobiera rekordy z `public.training_types` przez `context.locals.supabase` (kolumny: `code,name,is_active,created_at`), sortuje po `code` dla deterministycznego porządku.
5) Endpoint buduje stabilny payload (tablica DTO) i wylicza ETag z kanonicznej reprezentacji (np. JSON.stringify posortowanych DTO) poprzez SHA-256.
6) Jeżeli nagłówek `If-None-Match` jest równy wyliczonemu `ETag`, zwróć `304 Not Modified`.
7) W przeciwnym razie zwróć `200 OK` z ciałem, `ETag` i `Cache-Control`.

### 6. Względy bezpieczeństwa
- **Autoryzacja parametru**: `include_inactive=true` dostępne wyłącznie z wewnętrznym tokenem (`X-Internal-Token` = `INTERNAL_ADMIN_TOKEN`) w MVP, aby nie polegać na nieistniejących profilach admin.
- **Brak nadmiernych uprawnień**: Korzystamy z `context.locals.supabase` (anon client) tylko do SELECT słownika; tabela słownikowa nie zawiera danych użytkownika.
- **Nagłówki cache**: `private` zapobiega współdzieleniu zawartości przez CDN między użytkownikami.
- **Walidacja danych wejściowych**: Zod + defensywny parser booleana, odrzucanie nieznanych parametrów.
- **Nagłówki**: sanityzacja odczytywanych nagłówków (stała lista wspieranych), brak echo niezweryfikowanych wartości.
- **Sekrety**: `INTERNAL_ADMIN_TOKEN` trzymany w env; nigdy nie wysyłany do klienta; walidacja po stronie serwera.

### 7. Obsługa błędów
- 400 Bad Request: nieprawidłowy format query (np. nieparsowalny boolean) — komunikat z listą błędów walidacji.
- 401 Unauthorized: `include_inactive=true` bez poprawnych poświadczeń (brak/niepoprawny `X-Internal-Token`).
- 403 Forbidden: `include_inactive=true` przy obecnych poświadczeniach, ale bez uprawnień (scenariusz przyszły, gdy dojdą role użytkowników).
- 500 Internal Server Error: błędy zapytań do DB/nieoczekiwane wyjątki.

Format błędu (spójny, minimalny):

```json
{ "error": { "code": "<string>", "message": "<string>" } }
```

Logowanie:
- Błędy walidacji: `warn` z `requestId` (jeżeli dostępny), parametrami i kodem 400.
- Błędy autoryzacji: `info`/`warn` z kodem 401/403 (bez wrażliwych danych).
- Błędy serwerowe/DB: `error` z kontekstem (bez danych osobowych). Brak trwałego logowania do `ai_logs` (dotyczy AI), tylko standardowy logger serwerowy.

### 8. Rozważania dotyczące wydajności
- Słownik ma mały rozmiar — jedno zapytanie `select` po stałych kolumnach, indeks nie jest krytyczny.
- Deterministyczne sortowanie (`order by code`) zapewnia stabilny ETag.
- ETag + `stale-while-revalidate` znacząco zmniejsza obciążenie.
- Minimalny payload: tylko kolumny wymagane przez `TrainingTypeDto`.

### 9. Kroki implementacji
1) Struktura plików
   - Endpoint: `src/pages/api/v1/training-types.ts`
   - Service: `src/lib/services/trainingTypesService.ts`
   - Walidacja: `src/lib/validation/trainingTypes.ts`
   - Util ETag: `src/lib/http/etag.ts`
   - (Opcjonalnie) Util odpowiedzi/błędów: `src/lib/http/responses.ts`

2) Zod – walidacja query

```ts
// src/lib/validation/trainingTypes.ts
import { z } from "zod";

export const listQuerySchema = z.object({
  include_inactive: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => (typeof v === "string" ? v.toLowerCase() : v))
    .transform((v) => (v === "true" || v === true ? true : false)),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
```

3) Service – pobranie danych z Supabase

```ts
// src/lib/services/trainingTypesService.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { TrainingTypeDto } from "../../types";

export async function listTrainingTypes(
  supabase: SupabaseClient<Database>,
  includeInactive: boolean
): Promise<TrainingTypeDto[]> {
  const base = supabase
    .from("training_types")
    .select("code,name,is_active,created_at")
    .order("code", { ascending: true });

  const query = includeInactive ? base : base.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as TrainingTypeDto[];
}
```

4) Util – ETag

```ts
// src/lib/http/etag.ts
import { createHash } from "node:crypto";

export function computeEtag(value: unknown): string {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  const hash = createHash("sha256").update(json).digest("hex");
  return `"${hash}"`; // strong ETag
}
```

5) Endpoint – Astro API Route

```ts
// src/pages/api/v1/training-types.ts
export const prerender = false;

import type { APIContext } from "astro";
import { listQuerySchema } from "../../../lib/validation/trainingTypes";
import { listTrainingTypes } from "../../../lib/services/trainingTypesService";
import { computeEtag } from "../../../lib/http/etag";
import type { ApiListResponse, TrainingTypeDto } from "../../../types";

export async function GET(context: APIContext) {
  try {
    const url = new URL(context.request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const { include_inactive = false } = listQuerySchema.parse(params);

    // Autoryzacja parametru (MVP: token wewnętrzny)
    if (include_inactive) {
      const token = context.request.headers.get("x-internal-token");
      const allowed = token && token === import.meta.env.INTERNAL_ADMIN_TOKEN;
      if (!token) {
        return new Response(
          JSON.stringify({ error: { code: "unauthorized", message: "Missing credentials" } }),
          { status: 401, headers: { "content-type": "application/json" } }
        );
      }
      if (!allowed) {
        return new Response(
          JSON.stringify({ error: { code: "forbidden", message: "Insufficient privileges" } }),
          { status: 403, headers: { "content-type": "application/json" } }
        );
      }
    }

    const items: TrainingTypeDto[] = await listTrainingTypes(context.locals.supabase, include_inactive);

    // Stała paginacja (słownik mały) – zgodnie z ApiListResponse
    const page = 1;
    const per_page = 20;
    const total = items.length;
    const payload: ApiListResponse<TrainingTypeDto> = { data: items, page, per_page, total };

    // ETag + 304
    const etag = computeEtag(items); // tylko dane listy wpływają na ETag
    const ifNoneMatch = context.request.headers.get("if-none-match");
    const cacheHeaders = {
      ETag: etag,
      "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
      "content-type": "application/json",
    } as const;

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new Response(null, { status: 304, headers: cacheHeaders });
    }

    return new Response(JSON.stringify(payload), { status: 200, headers: cacheHeaders });
  } catch (err: any) {
    console.error("GET /api/v1/training-types failed", { err });
    return new Response(
      JSON.stringify({ error: { code: "internal_error", message: "Unexpected server error" } }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
```

6) Konfiguracja środowiska
- Dodać `INTERNAL_ADMIN_TOKEN` do `.env.local` (i środowisk deployu) – tajny token serwisowy dla MVP.
- Zostawić istniejący `SUPABASE_URL`, `SUPABASE_KEY` (anon) jak w projekcie.

7) Testy (wysoki poziom)
- 200 (aktywny słownik): bez tokenu, bez query ⇒ lista aktywnych.
- 200 (include_inactive): z poprawnym `X-Internal-Token` i `?include_inactive=true` ⇒ lista pełna.
- 401: `?include_inactive=true` bez tokenu.
- 403: `?include_inactive=true` z błędnym tokenem.
- 304: drugie żądanie z `If-None-Match`=ETag z poprzedniego 200.
- 500: zasymulować błąd DB (np. tymczasowo wymusić error w serwisie) ⇒ struktura błędu.

8) Uwagi dot. DB i RLS
- `training_types` to słownik globalny; brak danych per użytkownik. Wystarczy SELECT z anon klienta.
- Spójność historyczna: usuwanie RESTRICT (obsługiwane w migracjach). Inaktywacja przez `is_active=false`.
- Indeksacja niekrytyczna dla małej tabeli; `order by code` zapewnia stabilność ETag.

9) Operacyjność i monitorowanie
- Dodać lekkie logowanie (start/stop requestu, ścieżka, status, czas) – pomoc w diagnozie.
- W razie potrzeby dodać rate-limit na poziomie reverse proxy/adaptera (poza MVP).


