## Backend – plan testów jednostkowych dla widoku kalendarza

### 1. Kontekst i cele

Celem tego planu jest zaprojektowanie **zestawu testów jednostkowych (Vitest)** dla backendowej części widoku kalendarza, tak aby:
- kluczowe reguły biznesowe dla zakresu dat i filtrowania po statusie były stabilne,
- błędy walidacji były konsekwentnie mapowane na odpowiednie kody HTTP,
- struktura `CalendarDto` była spójna niezależnie od danych wejściowych (0+ treningów, wiele dni, różne statusy).

Zakres obejmuje **trzy poziomy**:
- walidacja parametrów (`calendarQuerySchema`),
- logika serwisu (`getCalendar`),
- handler HTTP (`GET /api/v1/calendar`).

### 2. Ogólne założenia (@testing-unit-vitest.mdc)

- **Framework**: Vitest (`describe` / `it` / `expect`).
- **Wzorzec**: AAA (Arrange – Act – Assert) w każdym teście.
- **Struktura**: czytelne bloki `describe` per funkcja / warstwa (schema, service, handler).
- **Mocki**:
  - `vi.fn()` / ręczne stuby dla `SupabaseClient`,
  - `vi.spyOn()` dla `getCalendar` w testach handlera.
- **Zasięg**:
  - walidacja → testujemy **rzeczywisty** `calendarQuerySchema` (bez mokowania Zod),
  - serwis → izolujemy się od realnego Supabase, stubując metody łańcuchowe (`from().select().eq().gte()...`),
  - handler → traktujemy jako „unit/integration”, mockując tylko serwis (`getCalendar`), nie ruszając schematu.

Rekomendowane uruchamianie:

```bash
npm run test:unit -- src/lib/validation/workouts.calendarQuerySchema.test.ts
npm run test:unit -- src/lib/services/workoutsService.calendar.test.ts
npm run test:unit -- src/pages/api/v1/calendar.test.ts
```

---

## 3. `src/lib/validation/workouts.ts` – `calendarQuerySchema`

### 3.1. Proponowana lokalizacja testów

- Plik: `src/lib/validation/workouts.calendarQuerySchema.test.ts`
- `describe("calendarQuerySchema", () => { ... })`

### 3.2. Reguły biznesowe do pokrycia

- `start` i `end` są **wymagane**.
- `start` i `end` muszą mieć format **`YYYY-MM-DD`** (regex).
- `status` jest **opcjonalny**, ale jeśli obecny – musi być jednym z:
  - `"planned" | "completed" | "skipped" | "canceled"`.
- Reguła zakresu: \(`new Date(end) >= new Date(start)`\) – dopuszczalne:
  - `start < end`,
  - `start === end`,
  - niedopuszczalne: `end < start`.
- Zachowanie dla **semantycznie niepoprawnych dat** (np. `2025-13-01`) – w aktualnej implementacji `new Date()` zwróci `Invalid Date`, więc refine powinien zrzucić błąd.

### 3.3. Scenariusze „happy path”

1. **Poprawny zakres miesięczny, bez statusu**
   - Wejście: `{ start: "2025-01-01", end: "2025-01-31" }`.
   - Oczekiwane:
     - `parse()` zwraca obiekt z tymi samymi wartościami,
     - `status` jest `undefined`.

2. **Poprawny zakres jednodniowy (start === end)**
   - Wejście: `{ start: "2025-02-15", end: "2025-02-15" }`.
   - Oczekiwane: brak błędu, poprawny wynik.

3. **Poprawny zakres z każdym dozwolonym statusem**
   - Dane testowe: status ∈ `["planned", "completed", "skipped", "canceled"]`.
   - Dla każdego statusu:
     - Wejście: `{ start: "2025-03-01", end: "2025-03-31", status }`.
     - Oczekiwane: brak błędu; wynik ma `status` dokładnie równy wejściu.

### 3.4. Scenariusze walidacji i warunki brzegowe (negatywne)

4. **Brak `start`**
   - Wejście: `{ end: "2025-01-31" }`.
   - Oczekiwane:
     - `parse()` rzuca `ZodError`,
     - w `issues` informacja o brakującym `start`.

5. **Brak `end`**
   - Wejście: `{ start: "2025-01-01" }`.
   - Oczekiwane: analogicznie jak wyżej, dla pola `end`.

6. **Niepoprawny format daty – `start`**
   - Przykłady: `"2025/01/01"`, `"2025-1-1"`, `"01-01-2025"`.
   - Oczekiwane:
     - `parse()` rzuca `ZodError`,
     - komunikat błędu pochodzi z regexa (`Invalid` / `Expected string to match`).

7. **Niepoprawny format daty – `end`**
   - Analogicznie jak pkt 6, ale dla pola `end`.

8. **`end` < `start` – naruszenie reguły zakresu**
   - Wejście: `{ start: "2025-02-10", end: "2025-02-01" }`.
   - Oczekiwane:
     - `parse()` rzuca `ZodError`,
     - w `issues` obecny błąd z `refine` z komunikatem `"End date must be >= start date"`.

9. **Niepoprawny status**
   - Wejście: `{ start: "2025-01-01", end: "2025-01-31", status: "archived" as any }`.
   - Oczekiwane: `ZodError` z informacją o niedozwolonej wartości enum.

10. **Semantycznie niepoprawne daty (np. 13. miesiąc)**
    - Wejście: `{ start: "2025-13-01", end: "2025-13-10" }`.
    - Oczekiwane:
      - Regex przepuszcza, ale `refine` powinien odrzucić, bo `new Date(...)` daje `Invalid Date` → porównanie zwraca `false`.
      - `ZodError` z komunikatem z `refine`.

11. **Minimalny zestaw pól – nadmiarowe pola ignorowane**
    - Wejście: `{ start: "2025-01-01", end: "2025-01-31", foo: "bar" } as any`.
    - Oczekiwane:
      - W aktualnej implementacji schema *nie jest* `strict()`, więc nadmiarowe pola są przepuszczane.
      - Test ma to udokumentować (świadome zachowanie), niekoniecznie wymuszać zmianę.

---

## 4. `src/lib/services/workoutsService.ts` – `getCalendar`

### 4.1. Proponowana lokalizacja testów

- Plik: `src/lib/services/workoutsService.calendar.test.ts`
- `describe("getCalendar", () => { ... })`

### 4.2. Założenia dotyczące mocka Supabase

- Tworzymy lekki stub `supabase` z łańcuchem:
  - `.from("workouts")` → zwraca obiekt query,
  - `.select()` → zapisuje wybrane kolumny, zwraca `this`,
  - `.eq()` / `.gte()` / `.lte()` / `.order()` → zapisują wywołania w tablicy (dla asercji), zwracają `this`,
  - „terminalne” wywołanie: funkcja `execute()` wywołana przez testy i przypięta do `.then()`-like:
    - najprościej: `.order()` kończy łańcuch, a test ustawia na query pole `__resolve` (`{ data, error }`), a sam `getCalendar` użyje `await query;` – stub implementuje `then`/`[Symbol.toStringTag]` lub po prostu zwraca `{ data, error }` z ostatniej metody (`order`).
- **Prostsza opcja** (pref.): zamiast wiernie emulować asynchroniczny klient, stub `select()` bezpośrednio zwraca `{ data, error }`, a kolejne `.eq()/.gte()/.lte()/.order()` są no-op; testy wtedy skupiają się na **grupowaniu** i **kształcie zwrotki**, a poprawność filtrów dat/statusu sprawdzamy na poziomie handlera (przez parametry).
- Plan zakłada **dwa typy testów**:
  1. testy „kształtu” i grupowania – stub kontroluje `data`,
  2. (opcjonalnie) test budowy zapytania – stub rejestruje wywołania `eq/gte/lte/order`.

### 4.3. Reguły biznesowe do pokrycia

- Filtracja po użytkowniku: zawsze `user_id = userId`.
- Filtracja po **zakresie dat**:
  - `planned_date >= start`,
  - `planned_date <= end`.
- Opcjonalna filtracja po statusie:
  - jeśli `status` jest przekazany → `eq("status", status)`,
  - jeśli `status` jest `undefined` → żadnego `eq("status", ...)`.
- Sortowanie:
  - `order("planned_date", { ascending: true })`,
  - następnie `order("position", { ascending: true })`.
- **Grupowanie po dacie**:
  - wszystkie rekordy o tej samej `planned_date` trafiają do tego samego dnia,
  - workouts w danym dniu zachowują kolejność wg `position`,
  - `days` zawiera tylko daty, które faktycznie pojawiły się w danych.
- Struktura wyniku:
  - `range: { start, end }` identyczne jak parametry wejściowe,
  - `days: CalendarDayDto[]` z polami `{ date, workouts }`,
  - pojedynczy `workout` ma tylko pola: `id`, `training_type_code`, `status`, `position`.

### 4.4. Scenariusze testowe – grupowanie i shape

1. **Brak treningów w zakresie**
   - Stub `data: []`, `error: null`.
   - Wejście: `start = "2025-01-01"`, `end = "2025-01-31"`, `status = undefined`.
   - Oczekiwane:
     - `result.range` dokładnie `{ start, end }`,
     - `result.days` pustą tablicą.

2. **Pojedynczy trening jednego dnia**
   - `data` zawiera 1 rekord:
     - `{ id: "w1", training_type_code: "easy_run", status: "planned", position: 1, planned_date: "2025-01-10" }`.
   - Oczekiwane:
     - `days.length === 1`,
     - `days[0].date === "2025-01-10"`,
     - `days[0].workouts` ma 1 element, pola odpowiadają wejściu.

3. **Wiele treningów tego samego dnia – sortowanie po pozycji**
   - `data` zawiera 3 rekordy z tą samą `planned_date`, ale w losowej kolejności pozycji.
   - Oczekiwane:
     - wszystkie 3 w `days[0].workouts`,
     - kolejność **w wynikowym DTO** odpowiada `position` (tu można polegać na ORDER BY po stronie DB – test zakłada, że `data` już jest posortowane, więc sprawdzamy, że **my nie zmieniamy kolejności**).

4. **Wiele dni – poprawne grupowanie**
   - `data` zawiera:
     - 2 treningi dla `"2025-01-10"`,
     - 1 trening dla `"2025-01-11"`,
     - 1 trening dla `"2025-01-15"`.
   - Oczekiwane:
     - `days.length === 3`,
     - daty w `days` odpowiadają trzem różnym dniom,
     - liczba workouts w każdym dniu odpowiada wejściu.

5. **Różne statusy – status przepisywany bez zmian**
   - `data` zawiera treningi z `status` ∈ `["planned", "completed", "skipped", "canceled"]`.
   - Oczekiwane:
     - dla każdego rekordu `result.days[*].workouts[*].status` równe wejściu (brak mapowania / zmiany).

6. **Zakres jednodniowy**
   - `start === end`, w danych treningi tylko tego dnia.
   - Oczekiwane: `range` jak wyżej, `days.length === 1`.

### 4.5. Scenariusze – obsługa błędów

7. **Błąd po stronie Supabase – error nie-null**
   - Stub zwraca `{ data: null, error: { message: "db error" } }`.
   - Oczekiwane:
     - `getCalendar(...)` rzuca ten sam `error` (nie opakowujemy go),
     - test używa `await expect(getCalendar(...)).rejects.toThrow("db error")`.

### 4.6. (Opcjonalnie) Scenariusze – weryfikacja budowy zapytania

8. **Filtr `user_id` + zakres dat**
   - Stub query rejestruje wywołania `eq/gte/lte/order` (np. w tablicy `calls`).
   - Wywołanie: `getCalendar(supabaseStub, "user-123", "2025-01-01", "2025-01-31")`.
   - Oczekiwane:
     - `eq("user_id", "user-123")` wywołane raz,
     - `gte("planned_date", "2025-01-01")`,
     - `lte("planned_date", "2025-01-31")`.

9. **Opcjonalny status – gdy obecny**
   - Wywołanie: `getCalendar(supabaseStub, "user-123", "2025-01-01", "2025-01-31", "planned")`.
   - Oczekiwane:
     - w zarejestrowanych wywołaniach jest `eq("status", "planned")`.

10. **Opcjonalny status – gdy brak**
    - Wywołanie z `status = undefined`.
    - Oczekiwane:
      - brak wywołania `eq("status", ...)` (np. asercja na brak takiego wpisu w `calls`).

11. **Sortowanie**
    - Dla dowolnych parametrów, oczekiwane:
      - `order("planned_date", { ascending: true })` wywołane przed `order("position", { ascending: true })`.

---

## 5. `src/pages/api/v1/calendar.ts` – handler `GET`

### 5.1. Proponowana lokalizacja testów

- Plik: `src/pages/api/v1/calendar.test.ts`
- `describe("GET /api/v1/calendar", () => { ... })`

### 5.2. Konfiguracja testów

- Importujemy bezpośrednio `GET` z modułu:
  - `import { GET } from "./calendar";`
- Tworzymy lekkie obiekty `APIContext`:
  - `request`: `new Request("http://localhost/api/v1/calendar?start=...&end=...&status=...")`,
  - `locals`: `{ user: { id: "user-123" }, supabase: {} as any }`.
- Mockujemy `getCalendar`:
  - `vi.spyOn(workoutsService, "getCalendar")`.
- Nie mockujemy `calendarQuerySchema` – używamy realnej walidacji, dzięki czemu testujemy też reguły Zod.

### 5.3. Reguły biznesowe do pokrycia

- Gdy brak `user` w `context.locals` → **401 Unauthorized**.
- Gdy walidacja Zod rzuci błąd (`ZodError`) → **422 Unprocessable Entity** z kodem `"validation_error"`.
- Gdy wszystko jest poprawne:
  - handler wywołuje `getCalendar` z:
    - `context.locals.supabase`,
    - `user.id`,
    - `start`, `end`, opcjonalnie `status`,
  - zwraca **200 OK** z `ApiResponse<CalendarDto>`.
- Gdy `getCalendar` rzuci dowolny inny błąd → **500 Internal Server Error** z kodem `"internal_error"`.

### 5.4. Scenariusze testowe

1. **401 – brak użytkownika w locals**
   - Kontekst:
     - `locals.user = undefined`,
     - `request` z poprawnymi query params (start/end).
   - Wywołanie: `const res = await GET(ctx as any);`.
   - Oczekiwane:
     - `res.status === 401`,
     - nagłówek `content-type` zawiera `"application/json"`,
     - body parsowane jako JSON zawiera:
       - `error.code === "unauthorized"`,
       - `error.message === "Authentication required"`.

2. **422 – błąd walidacji Zod (np. `end` < `start`)**
   - Kontekst:
     - `locals.user = { id: "user-123" }`,
     - `request` z URL:
       - `/api/v1/calendar?start=2025-02-10&end=2025-02-01`.
   - Oczekiwane:
     - `res.status === 422`,
     - `error.code === "validation_error"`,
     - `error.message === "Invalid query parameters"`,
     - `error.details` jest tablicą (`ZodError["errors"]`).
   - Dodatkowo (opcjonalnie):
     - można sprawdzić, że `getCalendar` **nie został** wywołany.

3. **200 – happy path bez statusu**
   - Kontekst:
     - `locals.user = { id: "user-123" }`,
     - `locals.supabase = {}` (mock),
     - `request` z URL:
       - `/api/v1/calendar?start=2025-01-01&end=2025-01-31`.
   - Mock:
     - `getCalendar` zwraca `Promise.resolve(mockCalendarDto)`.
   - Oczekiwane:
     - `res.status === 200`,
     - nagłówek `content-type` poprawny,
     - body JSON:
       - ma pole `data` równe `mockCalendarDto`,
     - `getCalendar` został wywołany dokładnie raz z parametrami:
       - `(locals.supabase, "user-123", "2025-01-01", "2025-01-31", undefined)`.

4. **200 – happy path ze statusem**
   - Jak wyżej, ale URL:
     - `/api/v1/calendar?start=2025-01-01&end=2025-01-31&status=planned`.
   - Oczekiwane:
     - `getCalendar` wywołany z `status = "planned"`,
     - treść odpowiedzi nadal `{ data: mockCalendarDto }`.

5. **500 – nieoczekiwany błąd z serwisu**
   - Kontekst: jak w happy path (user + poprawne query).
   - Mock:
     - `getCalendar` rzuca `new Error("DB down")`.
   - Oczekiwane:
     - `res.status === 500`,
     - JSON error:
       - `error.code === "internal_error"`,
       - `error.message === "Unexpected server error"`.

6. **422 – niepoprawny format daty (np. użycie `/` zamiast `-`)**
   - URL:
     - `/api/v1/calendar?start=2025/01/01&end=2025/01/31`.
   - Oczekiwane:
     - status 422,
     - `error.code === "validation_error"`,
     - brak wywołania `getCalendar`.

7. **422 – brak wymaganych parametrów**
   - Przypadki:
     - brak `start`,
     - brak `end`,
     - oba brak.
   - Dla każdego:
     - Oczekiwane: 422 + `validation_error`.

### 5.5. Dodatkowe asercje (opcjonalne)

- Sprawdzenie, że:
  - przy ścieżce 422 handler wywołuje `console.warn` z opisem błędu walidacji,
  - przy ścieżce 500 handler wywołuje `console.error` z informacją o wyjątku.
- Te asercje pomagają egzekwować standard logowania, ale są opcjonalne (nie muszą blokować refaktoru).

---

## 6. Podsumowanie i target pokrycia

- **Pliki w zakresie**:
  - `src/lib/validation/workouts.ts` – `calendarQuerySchema`,
  - `src/lib/services/workoutsService.ts` – `getCalendar`,
  - `src/pages/api/v1/calendar.ts` – handler `GET`.
- **Docelowe pokrycie backendu kalendarza**:
  - ≥ 80% linii i gałęzi dla powyższych funkcji (łatwe do osiągnięcia dzięki deterministycznej logice),
  - wszystkie wymienione ścieżki (401/422/200/500) pokryte co najmniej jednym testem.
- **Następny krok**:
  - utworzenie wskazanych plików testowych,
  - implementacja scenariuszy zgodnie z tym planem,
  - włączenie testów do istniejących skryptów `npm run test:unit`.


