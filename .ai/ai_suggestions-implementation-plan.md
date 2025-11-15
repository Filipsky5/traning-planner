## Plan wdrożenia punktów końcowych API: AI Suggestions

### 1. Przegląd punktu końcowego

Zestaw endpointów do zarządzania propozycjami treningów generowanymi przez AI (AI Suggestions). Obejmuje listowanie, tworzenie, pobieranie detali oraz akcje: akceptacja (tworzy trening), odrzucenie i regeneracja (nowa propozycja na bazie istniejącej). Wygasanie propozycji jest obliczane jako `created_at + 24h` (bez kolumny w DB). Limit regeneracji/tworzenia wynosi 3/dzień na użytkownika per planned_date.

Zakres:
- GET `/api/v1/ai/suggestions` — listowanie (z filtrami)
- POST `/api/v1/ai/suggestions` — utworzenie nowej propozycji
- GET `/api/v1/ai/suggestions/{id}` — szczegóły propozycji
- POST `/api/v1/ai/suggestions/{id}/accept` — akceptacja i utworzenie treningu
- POST `/api/v1/ai/suggestions/{id}/reject` — odrzucenie propozycji
- POST `/api/v1/ai/suggestions/{id}/regenerate` — regeneracja nowej propozycji

Realizacja: Astro 5 (API routes), TypeScript 5, Supabase (RLS), Zod (walidacja), React nie dotyczy warstwy API. Używać `context.locals.supabase` oraz `export const prerender = false` w endpointach.


### 2. Szczegóły żądania

- Metody HTTP: GET, POST (zgodnie ze specyfikacją)
- Struktury URL:
  - `/api/v1/ai/suggestions` (GET, POST)
  - `/api/v1/ai/suggestions/[id]` (GET)
  - `/api/v1/ai/suggestions/[id]/accept` (POST)
  - `/api/v1/ai/suggestions/[id]/reject` (POST)
  - `/api/v1/ai/suggestions/[id]/regenerate` (POST)

- Parametry i body per endpoint:
  - GET `/api/v1/ai/suggestions`
    - Query (opcjonalne): `status`, `created_after`, `created_before`, `page` (domyślnie 1), `per_page` (domyślnie 20, max 100), `sort` (domyślnie `created_at:desc`)
  - POST `/api/v1/ai/suggestions`
    - Body (wymagane): `planned_date` (YYYY-MM-DD), `training_type_code` (string, istniejący typ)
    - Body (opcjonalne): `context` (Record<string, unknown>)
  - GET `/api/v1/ai/suggestions/{id}`
    - Query (opcjonalne): `include_expired` (bool, domyślnie false)
  - POST `/api/v1/ai/suggestions/{id}/accept`
    - Body (wymagane): `position` (number, >=1, unikalna per `user_id+planned_date`)
  - POST `/api/v1/ai/suggestions/{id}/reject`
    - Body: brak
  - POST `/api/v1/ai/suggestions/{id}/regenerate`
    - Body (opcjonalne): `reason` (string), `adjustment_hint` (string)


### 3. Wykorzystywane typy

Z `src/types.ts` (już istniejące):
- DTO:
  - `AiSuggestionDto` — obiekt odpowiedzi (z polami `steps: WorkoutStepDto[]` i `expires_at: string`, `planned_date: string`)
  - `AiSuggestionEventDto` — zdarzenia audytowe (wewnętrzne)
  - `ApiListResponse<T>`, `ApiResponse<T>` — koperty odpowiedzi
- Commands (wejścia API):
  - `AiSuggestionCreateCommand`
  - `AiSuggestionAcceptCommand`
  - `AiSuggestionRejectCommand` (alias pusty)
  - `AiSuggestionRegenerateCommand`
- Kroki treningu: `WorkoutStepDto`, `StepPart`

Uwagi: Walidację runtime realizujemy Zod-em (schematy lustrzane wobec powyższych typów i ograniczeń domenowych).


### 4. Szczegóły odpowiedzi

- GET `/ai/suggestions` → 200 + `ApiListResponse<AiSuggestionDto>`
- POST `/ai/suggestions` → 201 + `ApiResponse<AiSuggestionDto>`
- GET `/ai/suggestions/{id}` → 200 + `ApiResponse<AiSuggestionDto>` (404 lub 410 gdy wygasła i `include_expired=false`)
- POST `/ai/suggestions/{id}/accept` → 201 + `ApiResponse<WorkoutDetailDto>` (tworzy trening z `origin='ai'` i linkiem 1–1)
- POST `/ai/suggestions/{id}/reject` → 200 + `ApiResponse<AiSuggestionDto>`
- POST `/ai/suggestions/{id}/regenerate` → 201 + `ApiResponse<AiSuggestionDto>`

Kody błędów (przykładowe): 400 (walidacja), 401 (brak auth), 404 (brak zasobu), 409 (konflikt / już zaakceptowana / kolizja pozycji), 410 (wygasła), 429 (limit dzienny), 500 (błąd serwera).


### 5. Przepływ danych

Wspólne zasady:
- Autentykacja: `const supabase = locals.supabase` i `const user = await supabase.auth.getUser()` (lub z helpers), RLS zapewnia izolację per `user_id`.
- Wygasanie: `expires_at = created_at + 24h` obliczane w API. Operacje mutujące (accept/reject/regenerate) blokowane po wygaśnięciu (410).
- Limity: 3/dzień na użytkownika per planned_date (tworzenie i regeneracja liczone łącznie). Liczenie: COUNT gdzie `created_at::date = current_date` AND `planned_date = target_date`.
- Zdarzenia: wpis do `ai_suggestion_events` dla `created|accepted|rejected|regenerated` (metadane).

Per endpoint:
- GET list
  1) Walidacja query (Zod), mapowanie sortu na białą listę kolumn (`created_at`, `planned_date`, `status`).
  2) Select po `user_id`, filtry status/dat, sort, paginacja (COUNT + LIMIT/OFFSET).
  3) `expires_at` obliczane w API; zwrot w `ApiListResponse`.
  4) (Opcjonalnie) ETag na bazie sumy `id+updated_at` (util `src/lib/http/etag.ts`).
- POST create
  1) Walidacja body (Zod); sprawdzenie istnienia `training_type_code` (service: `trainingTypesService`).
  2) Sprawdzenie limitu dziennego (COUNT w `ai_suggestions` dla usera, dzisiaj).
  3) Wywołanie `aiEngine.generateSuggestion(...)` (stub w MVP) ⇒ kroki `steps_jsonb`, sugestia w statusie `shown`.
  4) INSERT do `ai_suggestions` w transakcji; EVENT `created`.
  5) Zwrot 201 + obiekt z `expires_at`.
- GET detail
  1) Pobranie wiersza `id+user_id`; jeśli brak → 404.
  2) Jeśli wygasła i `include_expired=false` → 410. Inaczej 200 z `expires_at`.
- POST accept
  1) Pobranie sugestii; weryfikacja usera, statusu `shown`, braku wygaśnięcia.
  2) W transakcji:
     - Spójność typu/dat: trening ma mieć `training_type_code` i `planned_date` zgodne z sugerowanymi.
     - Unikalność `(user_id, planned_date, position)` w `workouts` (DB constraint).
     - INSERT `workouts` z `origin='ai'` i `ai_suggestion_id = suggestion.id` (DB wymusi 1–1 przez UNIQUE).
     - UPDATE `ai_suggestions.status='accepted'`, `accepted_workout_id=workout.id`.
     - EVENT `accepted`.
  3) Zwrot 201 + `WorkoutDetailDto`.
  4) Konflikty → 409; wygaśnięcie → 410.
- POST reject
  1) Pobranie sugestii; jeśli nie `shown` albo wygasła → 409/410.
  2) UPDATE `status='rejected'`; EVENT `rejected`; 200 z obiektem.
- POST regenerate
  1) Pobranie bazowej sugestii; blokada gdy wygasła, user mismatch, status `accepted` → 409/410/403 (403 przez RLS rzadkie).
  2) Sprawdzenie limitu dziennego (jak przy create).
  3) Generacja nowej sugestii (AI), INSERT nowej w statusie `shown`, EVENT `regenerated` (z linkiem do źródła w `metadata`).
  4) Zwrot 201 + nowa sugestia.


### 6. Względy bezpieczeństwa

- Uwierzytelnianie i RLS: wyłącznie `locals.supabase` (bez globalnego klienta), zapytania oparte o `user_id` — RLS egzekwuje dostęp.
- Autoryzacja: wszystkie operacje po stronie DB muszą filtrować po `user_id`. Brak możliwości enumeracji cudzych `id` (RLS).
- Walidacja wejścia: Zod + biała lista sortowania, limity paginacji (max 100), sanity-check dat (`YYYY-MM-DD`, zakres ±2 lata).
- Odporność na konflikt: transakcje dla accept/regenerate (atomowość), rely on DB constraints (UNIQUE, FK).
- Rate limiting domenowy: limit 3/dzień na usera per planned_date (429). Opcjonalnie w przyszłości per-IP (middleware).
- Brak wycieków danych: odpowiedzi tylko z polami zdefiniowanymi w DTO. Brak surowych błędów DB w odpowiedzi.
- CORS: dziedziczone z ustawień Astro (wewnętrzny SSR).


### 7. Obsługa błędów

Mapowanie (przykłady):
- 400: niepoprawne body/query (ZodError), nieistniejący `training_type_code`, nieprawidłowy `position`
- 401: brak sesji użytkownika
- 404: brak sugestii o podanym `id`
- 409: już zaakceptowana, kolizja `(planned_date, position)`, status inny niż `shown`
- 410: sugestia wygasła (dla GET detail bez `include_expired`, i dla mutacji)
- 429: przekroczony limit 3/dzień dla danego planned_date
- 500: wyjątek serwerowy, błąd transakcji

Format błędu (spójny):
```json
{ "error": { "code": "string", "message": "string" } }
```

Logowanie błędów:
- Minimalnie: `console.error` (stack trace).
- (Opcjonalnie) wpis do `ai_logs` z `level='error'`, `event='api.ai_suggestions.<action>'`, `payload` (kontekst bez danych wrażliwych).


### 8. Rozważania dotyczące wydajności

- Indeksy DB (zalecane, jeśli nie ma w migracjach):
  - `ai_suggestions (user_id, created_at DESC)`
  - `ai_suggestions (user_id, status, created_at DESC)`
  - `workouts (user_id, planned_date, position)` UNIQUE
- Paginacja: LIMIT/OFFSET, `per_page <= 100`.
- ETag dla GET list/detail (opcjonalne; `src/lib/http/etag.ts`).
- JSONB `steps_jsonb`: walidacja długości (np. max 50 kroków) i rozmiaru payloadu.
- Transakcje: tylko dla operacji mutujących, możliwie krótkie.
- Selektywne kolumny w SELECT (bez nadmiarowych pól).


### 9. Kroki implementacji

1) Struktura plików (Astro API):
   - `src/pages/api/v1/ai/suggestions/index.ts` (GET, POST)
   - `src/pages/api/v1/ai/suggestions/[id].ts` (GET)
   - `src/pages/api/v1/ai/suggestions/[id]/accept.ts` (POST)
   - `src/pages/api/v1/ai/suggestions/[id]/reject.ts` (POST)
   - `src/pages/api/v1/ai/suggestions/[id]/regenerate.ts` (POST)
   - Każdy plik: `export const prerender = false`, `export async function GET/POST(...) {}`

2) Serwis domenowy:
   - `src/lib/services/aiSuggestionsService.ts`
     - `listSuggestions(supabase, userId, filters)`
     - `createSuggestion(supabase, userId, cmd)`
     - `getSuggestion(supabase, userId, id, includeExpired)`
     - `acceptSuggestion(supabase, userId, id, cmd)`
     - `rejectSuggestion(supabase, userId, id)`
     - `regenerateSuggestion(supabase, userId, id, cmd)`
   - `src/lib/services/aiSuggestionEventsService.ts` — zapisy zdarzeń
   - `src/lib/services/aiEngine.ts` — stub generujący `steps_jsonb` (kalibracja w przyszłości)

3) Walidacja (Zod) — `src/lib/validation/aiSuggestions.ts`:
   - Schematy dla: query listy, create, accept, regenerate
   - Reużycie schematów kroków (`WorkoutStepDto`) z `workouts` jeśli/ gdy powstaną

4) Implementacja endpointów:
   - Pobranie `supabase` z `locals`, weryfikacja sesji (401)
   - Walidacja wejścia (Zod → 400)
   - Delegacja do serwisu, mapowanie wyników do DTO
   - Obliczanie `expires_at` po stronie API
   - Koperty odpowiedzi `ApiResponse`/`ApiListResponse`, statusy 200/201

5) Transakcje:
   - `acceptSuggestion` oraz procesy tworzące nowe rekordy wykonywać w jednej transakcji
   - Egzekwować spójność: typ/dat/pozycja/1–1 `ai_suggestion_id`

6) Błędy i kody:
   - Spójne mapowanie wyjątków na kody (400/401/404/409/410/429/500)
   - Jednolity payload błędu

7) Testy (E2E w Playwright — w II etapie):
   - Scenariusze: create→detail, accept (konflikt pozycji), reject, regenerate (limit), list filters
   - Stuby AI (deterministyczne wyniki `aiEngine`)

8) Jakość:
   - `npm run lint` / `npm run lint:fix`, `npm run format`
   - Przegląd PR: zrzuty JSON odpowiedzi, opis testów

9) Dokumentacja:
   - Uzupełnić `.ai/api-plan.md` w razie zmian kontraktu
   - Zaktualizować `.ai/prd.md` jeśli wpływa na przepływy użytkownika


### 10. Uwagi implementacyjne (konkretne detale)

- `expires_at`: `new Date(new Date(row.created_at).getTime() + 24*60*60*1000).toISOString()`
- Limit dzienny: `count(*) from ai_suggestions where user_id = $1 and created_at::date = current_date`
- Sort parsing: dopuszczone pola i kierunki `asc|desc`, domyślnie `created_at:desc`
- Statusy dopuszczone: `shown|accepted|rejected|expired` (wartość `expired` tylko w odczycie; mutacje blokowane gdy `now() > created_at + 24h`)
- Accept: weryfikować `(user_id, planned_date, position)` zanim INSERT, ale polegać finalnie na UNIQUE + obsłużyć 409
- Reuse: `trainingTypesService` do walidacji `training_type_code`
- ETag (opcjonalnie): zwrócić `ETag` i obsłużyć `If-None-Match` → 304



