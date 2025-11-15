## Architektura UI dla Traning Planner

### 1. Przegląd struktury UI

- **Stack i podejście renderowania**
  - Astro 5 (SSR + wyspy React 19).
  - TanStack Query do stanu serwerowego z SSR prefetch i de/rehydracją.
  - Lokalne stany UI w React (drawery, formularze, selekcje).
- **Widok główny**
  - Kalendarz tygodniowy (domyślny), przełącznik na miesiąc (siatka pełnych tygodni).
  - SSR dla tygodnia + prefetch sąsiedniego tygodnia.
- **Nawigacja**
  - Mobile: bottom nav („Kalendarz”, „Dodaj”, „Cel”).
  - Desktop: layout 2-kolumnowy (lewy sidebar: nawigacja + pasek postępu celu; Main: widoki i panele).
- **Interakcje modalowe**
  - Drawer jako główny kontener interakcji: Drawer Dnia (lista treningów), Drawer AI (generowanie/akceptacja), Drawer „Dodaj ręcznie”.
  - Bez routowania parametrów w URL dla drawerów (overlay na bieżącym widoku).
- **Dane i cache**
  - Klucze TanStack Query: 
    - ["training-types"] (ETag, staleTime 1h), 
    - ["calendar", start, end, status] (staleTime 1h), 
    - ["workout", id], 
    - ["workouts","last3", type?] (staleTime 30s),
    - ["ai","suggestions", date?, type?] (staleTime 30s).
  - refetchOnWindowFocus: always; retry: 2 (z wyjątkiem 4xx).
  - Optimistic updates: accept/regenerate, rate/skip/cancel + natychmiastowa invalidacja powiązanych kluczy.
- **A11y**
  - Grid kalendarza: role="grid"/"row"/"gridcell", strzałki zmieniają fokus, etykiety dni.
  - shadcn/ui (Radix) z focus trap; "Skip to content"; :focus-visible; nie polegać wyłącznie na kolorze (ikona + tekst).
- **Bezpieczeństwo**
  - Supabase Auth; 401 → SSR redirect do `/login?next=...`; 403 → toast (brak danych wrażliwych).
  - Brak użycia service-role z klienta. CSRF ograniczany przez nagłówek `Content-Type: application/json` i same-site cookies w SSR.
- **Jednostki i prezentacja**
  - Dystans: km (konwersja ↔ m dla API).
  - Czas: segmentowany (mm:ss / h:mm:ss).
  - Tempo: globalny przełącznik min/km ↔ km/h (w menu użytkownika).

### 2. Lista widoków

#### Widok: Kalendarz
- **Ścieżka**: `/`
- **Główny cel**: Przegląd planu i szybkie akcje na treningach w kontekście dnia/tygodnia/miesiąca.
- **Kluczowe informacje**:
  - Siatka dni z treningami, status (planned/completed/skipped/canceled), typ treningu, pochodzenie (badge AI), „+” dla pustych dni.
  - Przełącznik „Tydzień/Miesiąc”; na desktopie stały sidebar z postępem celu.
- **Kluczowe komponenty widoku**:
  - CalendarHeader (nawigacja tygodni/miesięcy, przełącznik zakresu, DatePicker).
  - CalendarGrid (role="grid"), DayCell (role="gridcell", „+”).
  - WorkoutCard (status, typ, badge AI, akcje skrótowe).
  - DayDrawer (lista dnia, „+2 więcej”).
  - AISuggestionDrawer (uruchamiany z „+” lub przycisku AI).
- **UX, dostępność, bezpieczeństwo**:
  - Skeletony ładowania siatki; spinnery tylko dla akcji.
  - Klawiatura: strzałki między komórkami, Enter otwiera Drawer, Esc zamyka.
  - 401 → redirect; 403 → toast; 410 („Wygasła”) → blokada z tooltipem; 429 → blokada + Retry-After.
- **Powiązane API**:
  - GET `/api/v1/calendar?start=&end=&status?`
  - GET `/api/v1/training-types` (If-None-Match, ETag, 304)

#### Widok: Onboarding (3 ostatnie treningi)
- **Ścieżka**: `/onboarding`
- **Główny cel**: Wprowadzenie dokładnie 3 zrealizowanych treningów startowych.
- **Kluczowe informacje**:
  - Krok 1–3: dystans (km), czas (segmenty), śr. tętno, data/godzina; przykładowe podpowiedzi.
  - Komunikat o celu aplikacji i możliwości dodania celu później.
- **Kluczowe komponenty widoku**:
  - Stepper (3 kroki), WorkoutCompletedForm (segmentowany czas, walidacje).
  - CTA „Zakończ” → redirect do `next` lub `/`.
- **UX, dostępność, bezpieczeństwo**:
  - SSR gating na `/`: gdy <3, redirect do `/onboarding?next=/`.
  - A11y: czytelne etykiety pól, kolejność Tab, walidacje z komunikatami.
- **Powiązane API**:
  - POST `/api/v1/workouts` (status=completed, wymagane metryki)

#### Widok: Szczegóły treningu
- **Ścieżka**: `/workouts/[id]`
- **Główny cel**: Pełny wgląd i operacje na pojedynczym treningu.
- **Kluczowe informacje**:
  - Plan vs realizacja, kroki (warmup/main/cooldown), tempo, rating.
  - Pochodzenie (AI/manual/import), powiązana sugestia AI (jeśli dotyczy).
- **Kluczowe komponenty widoku**:
  - WorkoutDetailPanel (w Main na desktopie; pełnoekran na mobile).
  - Actions: Complete, Skip, Cancel, Rate; Edit (metryki/plan – ograniczone).
- **UX, dostępność, bezpieczeństwo**:
  - Natychmiastowe akcje Skip/Cancel (nieodwracalne w MVP) + toast.
  - Rating dostępny wyłącznie dla completed.
- **Powiązane API**:
  - GET `/api/v1/workouts/{id}`; POST `/complete`, `/skip`, `/cancel`, `/rate`

#### Widok: Cel użytkownika
- **Ścieżka**: `/goal`
- **Główny cel**: Ustawienie/edytowanie pojedynczego celu użytkownika (MVP).
- **Kluczowe informacje**:
  - Typ celu (np. distance_by_date), target_distance_m, due_date, notatki.
  - Pasek postępu w sidebarze bazujący na ukończonych treningach.
- **Kluczowe komponenty widoku**:
  - GoalForm (GET/PUT), GoalProgress (w sidebarze + rozwijany szczegół).
- **UX, dostępność, bezpieczeństwo**:
  - Proste walidacje (wartości dodatnie, data w przyszłości).
- **Powiązane API**:
  - GET/PUT/DELETE `/api/v1/user-goal`

#### Drawer: Dzienny przegląd (lista dnia)
- **Ścieżka**: overlay na `/` (brak zmiany URL)
- **Główny cel**: Przegląd i zarządzanie treningami danego dnia.
- **Kluczowe informacje**:
  - Lista treningów (zwinęty/rozwinięty), „+2 więcej” → pełna lista w Drawerze.
- **Kluczowe komponenty widoku**:
  - DayDrawerList, WorkoutCard (kompaktowy), QuickActions (skip/cancel).
- **Powiązane API**:
  - GET `/api/v1/workouts?planned_date_*`

#### Drawer: Sugestia AI
- **Ścieżka**: overlay na `/` (brak zmiany URL)
- **Główny cel**: Wygenerowanie i akceptacja sugestii AI dla wybranego dnia/typu.
- **Kluczowe informacje**:
  - Formularz typu i daty (prefill z komórki dnia), wynikowa propozycja (kroki, łączny dystans/czas), badge „Wygasła” jeśli dotyczy.
  - Licznik regeneracji (max 3/dzień UTC).
- **Kluczowe komponenty widoku**:
  - AISuggestionForm (POST generate), SuggestionPreview (meta + steps), AcceptControls (position).
  - RegenerateControls z limitem; ExpiredBadge; ConflictDialog (409).
- **UX, dostępność, bezpieczeństwo**:
  - 410 → stan read-only + CTA „Wygeneruj nową”.
  - 409 (konflikt position) → dialog z wyborem nowej pozycji lub anulowanie.
- **Powiązane API**:
  - POST `/api/v1/ai/suggestions`, GET `/ai/suggestions/{id}`
  - POST `/ai/suggestions/{id}/accept`, `/reject`, `/regenerate`

#### Drawer: Dodaj ręcznie
- **Ścieżka**: overlay na `/` (brak zmiany URL)
- **Główny cel**: Dodanie planowanego lub zrealizowanego treningu ręcznie.
- **Kluczowe informacje**:
  - Pola planu: typ, data, position, planned_distance_m, planned_duration_s, kroki (opcjonalnie).
  - Pola realizacji (opcjonalnie): distance_m, duration_s, avg_hr_bpm, completed_at, rating.
- **Kluczowe komponenty widoku**:
  - WorkoutPlanForm, StepsEditor (min. schema), OptionalRealizationSection.
- **Powiązane API**:
  - POST `/api/v1/workouts`

#### Widok: Ustawienia (menu użytkownika)
- **Ścieżka**: overlay/popover (menu), dostępne globalnie
- **Główny cel**: Przełącznik prezentacji tempa (min/km ↔ km/h), link do „Cel”.
- **Kluczowe informacje**:
  - Bieżąca jednostka tempa (persist w localStorage).
- **Kluczowe komponenty widoku**:
  - UserMenu, PaceUnitToggle.

### 3. Mapa podróży użytkownika

1) Nowy użytkownik (Onboarding)
- Wejście na `/` → SSR gating → redirect do `/onboarding?next=/`.
- Krok 1–3: wprowadza 3 ukończone treningi → POST `/workouts`.
- Po zakończeniu → redirect do `next` (zwykle `/`).

2) Planowanie z AI (główny przypadek)
- Na `/` wybiera dzień → „+” → Drawer AI.
- Wybiera typ (prefill z popularnych / last3), data prefill → POST `/ai/suggestions`.
- Ogląda propozycję (steps, meta, badge AI). Jeśli za trudna → POST `/regenerate` (limit 3/dzień per data).
- Akceptuje z wyborem `position` (domyślnie najbliższe wolne) → POST `/accept`.
  - W razie 409 → ConflictDialog z przeplanowaniem pozycji.
- Po akceptacji: invalidacja kalendarza + sugestii; brak opcji „Dostosuj” (MVP).

2) Planowanie Reczne
- Na `/` wybiera dzień → „+” → Drop down z opcją Dodaj recznie.
- Mozliwość wyboru typu treningu (tabela `training_types`), oraz daty i czas trwania jest zliczany automatycznie
- Sekcja plan treningu ma guzik + który dodaje segment w segmencie trzy wybrać jakiego jest typu `warmup` | `main` | `cooldown`, czas jego trwania, oraz ilosc kilometrów do przebiegnięcia
- Po akceptacji: invalidacja kalendarza + sugestii; brak opcji „Dostosuj” (MVP).

3) Realizacja i ocena
- Po wykonaniu → z widoku szczegółów `/workouts/[id]` → Complete/Rate lub Skip/Cancel z kart w kalendarzu/Drawerze dnia.
- Rate (too_easy/just_right/too_hard) → natychmiastowa aktualizacja i invalidacja last3, kalendarza.

4) Cel użytkownika
- Z bottom nav / sidebar przechodzi do `/goal`.
- Ustawia cel → PUT `/user-goal`; widzi postęp w sidebarze.

5) Błędy i stany wyjątkowe
- 401 → redirect `/login?next=...`.
- 403 → toast „Brak uprawnień”.
- 410 (sugestia wygasła) → blokada akcji w Drawerze AI + CTA „Wygeneruj nową”.
- 429 → blokada akcji i honorowanie `Retry-After`.

### 4. Układ i struktura nawigacji

- **Mobile**
  - Header: logo, przycisk menu użytkownika (Settings/Logout).
  - Bottom nav: 
    - Kalendarz (`/`), 
    - Dodaj (otwiera wybór: Ręczny/AI; jeśli <3 → `/onboarding?next=/`), 
    - Cel (`/goal`).
  - Drawery pełnoekranowe (AI, Dzień, Dodaj).
- **Desktop**
  - Layout 2 kolumny:
    - Sidebar (lewo): nawigacja (Kalendarz, Cel), GoalProgress (rozwijany).
    - Main (prawo): kalendarz/treści + panele szczegółów.
  - Drawery jako panele boczne (AI, Dzień, Dodaj).
- **Routowanie**
  - Widoki routowane: `/`, `/onboarding`, `/workouts/[id]`, `/goal`.
  - Interakcje: Drawery bez zmiany URL (state UI).

### 5. Kluczowe komponenty (wielokrotnego użytku)

- **CalendarHeader**: nawigacja dat, przełącznik trybu, wpięty DatePicker (react-day-picker).
- **CalendarGrid / DayCell**: role="grid"/"gridcell", obsługa klawiatury, wskaźniki stanu dnia.
- **WorkoutCard**: status, typ, badge AI, skrótowe akcje (skip/cancel), ikony + tekst.
- **DayDrawer**: lista treningów dnia, „+2 więcej”, dostęp do akcji i szczegółów.
- **AISuggestionDrawer**: formularz (typ, data), podgląd steps, Accept/Regenerate (limit 3/dzień per data), ExpiredBadge, ConflictDialog.
- **WorkoutPlanForm**: planowane pola, walidacje zakresów (zgodnie z API).
- **WorkoutCompletedForm**: metryki realizacji, rating.
- **StepsEditor**: prosty edytor kroków (warmup/main/cooldown/segment) zgodnie z minimalnym schematem.
- **GoalForm / GoalProgress**: CRUD celu + wizualizacja progresu (suma dystansu ukończonych vs target).
- **DatePicker**: ujednolicony picker (react-day-picker) we wszystkich miejscach.
- **UserMenu / PaceUnitToggle**: globalne ustawienie tempa (persist).
- **ToastManager**: komunikaty błędów i sukcesów (403/409/410/429 – zgodnie z polityką).
- **QueryBoundary**: skeletony i retry stanu danych.

### Zgodność z planem API i wymaganiami

- Wszystkie operacje UI mapują się 1:1 na endpointy REST przewidziane w planie API (w tym akceptacja/regeneracja AI, akcje domenowe treningów, ETag dla `training-types`).
- Stany błędów i komunikaty odpowiadają kodom: 401/403/409/410/429; UI honoruje nagłówki (If-None-Match/ETag, Cache-Control, Retry-After).
- Logika progresji/kalibracji realizowana po stronie backendu; UI zapewnia poprawny kontekst (ostatnie 3, typ, data) i prezentację wyników.

### Mapowanie historyjek z PRD → elementy UI

- Onboarding 3 treningów → `/onboarding` + Stepper + WorkoutCompletedForm.
- Generowanie AI → AISuggestionDrawer (uruchamiany z DayCell „+”).
- Akceptacja/Odrzucenie/Regeneracja → AcceptControls/RegenerateControls + limit 3/dzień per planned_date.
- Zarządzanie treningami → Drawer Dnia, `/workouts/[id]`, akcje domenowe (complete/skip/cancel/rate).
- Kalendarz główny → `/` z tygodniem/miesiącem, ikony/kolory typów, „+” dla pustych dni.
- System ocen → Rating w szczegółach/completed; wpływ na kolejne sugestie (backend).
- Cel użytkownika → `/goal` + GoalProgress w sidebarze.

### Przypadki brzegowe i stany błędów

- <3 treningów → gating do `/onboarding`.
- Sugestia wygasła (24h) → badge „Wygasła”, akcje zablokowane, CTA „Wygeneruj nową”.
- Konflikt `position` → dialog z przestawieniem/wyborem pozycji; informacja naprawcza.
- 429 → zablokuj CTA, pokaż czas wg `Retry-After`, automatyczny enable po czasie/odświeżeniu.
- 304 dla `training-types` → nie podmieniaj danych; tanie odświeżenie.
- Brak treningów w dniu → wyraźny stan pusty + „Dodaj”/„AI”.


