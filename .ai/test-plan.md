## Plan testów – AI Running Training Planner (MVP)

### 1. Wprowadzenie i cele testowania

Celem tego planu testów jest zapewnienie, że aplikacja **AI Running Training Planner**:
- poprawnie wspiera główne scenariusze użytkownika (onboarding, planowanie i wykonywanie treningów, korzystanie z sugestii AI),
- jest stabilna funkcjonalnie przy typowych i brzegowych danych użytkownika,
- bezpiecznie zarządza sesją użytkownika oraz danymi treningowymi (Supabase + RLS),
- dostarcza spójne doświadczenie UI na kluczowych przeglądarkach i rozdzielczościach,
- posiada minimalny, ale sensowny poziom automatyzacji testów (E2E + wybrane testy jednostkowe / integracyjne).

Plan obejmuje zarówno **testy manualne eksploracyjne**, jak i **testy automatyczne** (głównie E2E w Playwright), z uwzględnieniem technicznej specyfiki: Astro 5 (SSR), React 19, Tailwind 4, Supabase oraz warstwy API pod `src/pages/api`.

### 2. Zakres testów

#### 2.1 Funkcjonalności w zakresie

- **Autentykacja i zarządzanie kontem**
  - Rejestracja użytkownika (`RegisterForm`, API `POST /api/v1/auth/register`).
  - Logowanie (`LoginForm`, `POST /api/v1/auth/login`).
  - Wylogowanie (`UserMenu` → `POST /api/v1/auth/logout`).
  - Reset hasła: „zapomniałem hasła” (`ForgotPasswordForm`, `POST /api/v1/auth/forgot-password`) i ustawienie nowego hasła (`ResetPasswordForm`, `POST /api/v1/auth/reset-password`).
  - Obsługa sesji (cookies, middleware `src/middleware/index.ts`) i przekierowania (np. na `/login`).

- **Onboarding użytkownika**
  - 3‑krokowy proces wprowadzania ostatnich treningów (`OnboardingView`, `WorkoutOnboardingForm`, `DurationInput`).
  - Walidacje pól (dystans, czas, tętno, data z przeszłości).
  - Przejście po ukończeniu kroku 3 do dalszej części aplikacji (np. kalendarz).

- **Kalendarz i zarządzanie treningami**
  - Widok kalendarza (`CalendarView`, `useCalendar`, `CalendarHeader`, `CalendarGrid`, `DayCell`).
  - Widoki „miesiąc” / „tydzień” i nawigacja datami.
  - Widok dzienny (`DayDrawer`, `DayDrawerContent`, `WorkoutList`, `WorkoutItem`, `QuickActions`).
  - Szczegóły treningu (`WorkoutDetailDrawer`, `WorkoutDetailView`, `WorkoutMetrics`, `WorkoutSteps`, `WorkoutActions`).
  - Akcje na treningu: ukończenie, ocena (`CompleteWorkoutDialog`, `RateWorkoutDialog`), pominięcie, anulowanie.

- **Sugestie AI**
  - Generowanie sugestii (`AISuggestionDrawer`, `AISuggestionForm`, API `POST /api/v1/ai/suggestions`).
  - Podgląd sugestii (`SuggestionPreview`, `SuggestionMeta`, `SuggestionSteps`).
  - Akceptacja, odrzucanie z regeneracją (limit 3/dzień) i obsługa konfliktu pozycji (`SuggestionControls`, `ConflictDialog`).
  - Obsługa wygaśnięcia sugestii po 24h (`ExpiredSuggestionState`).

- **Cel użytkownika (user goal)**
  - Widok celu (`GoalView`, `GoalForm`, hook `useUserGoal`).
  - Ustawianie celu dystansowego (dystans + data) z walidacją.
  - Tryb „biegam dla zdrowia” (brak aktywnego celu).
  - Edycja i usuwanie celu.

- **Preferencje użytkownika**
  - Jednostka tempa (`PaceUnitProvider`, `PaceUnitToggle`, `UserMenu`).
  - Zapisywanie i odtwarzanie z `localStorage`.

- **Warstwa API i logika domenowa**
  - Endpoints pod `src/pages/api/v1` (auth, workouts, training-types, calendar, ai-suggestions, goals).
  - Serwisy w `src/lib/services`, utilsy w `src/lib/utils` oraz walidacje w `src/lib/validation`.
  - Integracja z Supabase (`src/db/supabase.client.ts`, `src/db/database.types.ts`, migracje w `supabase/migrations`).

#### 2.2 Funkcjonalności poza zakresem (dla MVP)

- Import plików .FIT / .GPX, integracje zewnętrzne (Garmin, Strava).
- Zaawansowane wizualizacje wykresowe.
- Funkcje społecznościowe.
- Aplikacje natywne mobilne (testujemy tylko w przeglądarce mobilnej/responsywnej).

### 3. Typy testów

#### 3.1 Testy statyczne

- **Linting i formatowanie**
  - `npm run lint`, `npm run lint:fix`, `npm run format` jako część pipeline’u CI.
  - Cel: brak błędów lint i poważnych ostrzeżeń przed merge do `master`.

- **Analiza typów**
  - Kompilacja TypeScript (`tsc` via Astro config / CI).
  - Brak błędów typów, szczególnie na granicy API (`src/types.ts`, `src/types/*`, `src/lib/api/*`).

#### 3.2 Testy jednostkowe

Zakłada się dodanie frameworka (np. **Vitest** lub **Jest**) do testów jednostkowych.

Obszary priorytetowe:
- **Funkcje utili** (`src/lib/utils`, `src/lib/utils/workout.ts`):
  - formatowanie dystansu/czasu/tempa,
  - mapowanie typów treningów na kolory.
- **Walidacje** (`src/lib/validation/*`):
  - poprawność reguł i komunikatów błędów.
- **Hooks domenowe**:
  - `useCalendar` – generowanie zakresów dat, mapowanie danych API na `DayCellViewModel`.
  - `useDayWorkouts` – filtrowanie, sortowanie, obsługa błędów sieci.
  - `useWorkoutDetail` – transformacje DTO → `WorkoutViewModel`, flagi `canBe*`.
- **Transformacje AI** (`src/lib/services/aiSuggestionsService.ts`, `src/types/suggestions.ts`):
  - obliczanie łącznego czasu/dystansu, status `isExpired`, mapowanie kroków.
- **Logika AI** (jeśli zaimplementowana jako osobne moduły):
  - tryb kalibracji (pierwsze 3 treningi – bardziej zachowawcze sugestie),
  - logika progresji (10% zwiększenie po 3 pozytywnych ocenach),
  - accuracy sugestii tempa na podstawie historii użytkownika.

#### 3.3 Testy integracyjne (backend i frontend)

- **API integracyjne (HTTP)**
  - Testy endpointów `src/pages/api/v1/*` uruchamianych na testowym serwerze Astro (Node adapter).
  - Narzędzie: np. **supertest** lub czysty `fetch` w środowisku testowym.
  - Weryfikacja RLS i poprawności filtrów (np. zakres dat, filtrowanie po użytkowniku).

- **Integracje frontend–API**
  - Testy komponentów React z użyciem **React Testing Library**:
    - `CalendarView` + `useCalendar` – poprawne renderowanie dni na podstawie danych z API (mock fetch).
    - `DayDrawer` + `useDayWorkouts` – poprawne stany ładowania/błędu i aktualizacja po akcjach.
    - `AISuggestionDrawer` – poprawne przejścia stanów (formularz → sugestia → akceptacja/regeneracja).

#### 3.4 Testy E2E (Playwright)

Kluczowy filar automatyzacji:
- Uruchamiane przeciwko zbudowanemu SSR (`npm run build`, `npm run preview`).
- Scenariusze opisane w rozdziale 4 dla krytycznych przepływów:
  - autentykacja i zarządzanie sesją (TC-AUTH-*),
  - onboarding z przykładowymi danymi (TC-ONB-*),
  - kalendarz i zarządzanie treningami (TC-CAL-*, TC-WRK-*),
  - sugestie AI - podstawowe flow i zaawansowana logika (tryb kalibracji, progresja, accuracy tempa) (TC-AI-*),
  - cele użytkownika (TC-GOAL-*),
  - preferencje użytkownika (TC-PACE-*).
- Testy w min. 2 przeglądarkach (Chromium, WebKit) i responsywności (desktop + mobile viewport).

#### 3.5 Testy niefunkcjonalne

- **Wydajność (lekki poziom)**
  - Czas TTFB i renderowania głównych widoków (Onboarding, Kalendarz).
  - Sprawdzenie, że SSR działa poprawnie, a ilość JS na kliencie jest rozsądna.
- **Bezpieczeństwo**
  - Sprawdzenie ograniczenia dostępu przez middleware (niezalogowany użytkownik).
  - Weryfikacja braku możliwości dostępu do cudzych danych (Supabase RLS – testy API).
  - Sprawdzenie przechowywania sesji w cookies (httpOnly, secure na prod).
- **Dostępność**
  - Podstawowe testy z wykorzystaniem Playwright + axe (lub manualnie).
  - Sprawdzenie focus management (modale, drawery, dialogi).

### 4. Scenariusze testowe dla kluczowych funkcjonalności

Poniżej zestaw scenariuszy, które powinny być pokryte testami E2E (wysoki priorytet) oraz uzupełnione testami jednostkowymi/integracyjnymi tam, gdzie to zasadne.

#### 4.1 Autentykacja

- **TC-AUTH-01 – Rejestracja nowego użytkownika (happy path)**
  - Wejście na `/register`.
  - Wypełnienie poprawnych danych (unikalny email, silne hasło, zgoda na regulamin).
  - Oczekiwane: brak błędów walidacji, wyświetlenie ekranu potwierdzenia weryfikacji emaila.

- **TC-AUTH-02 – Walidacja formularza rejestracji**
  - Puste pola, niepoprawny email, za krótkie hasło, brak cyfr/liter, różne hasła, brak zgody na regulamin.
  - Oczekiwane: poprawne komunikaty błędów pod polami.

- **TC-AUTH-03 – Logowanie poprawnymi danymi**
  - Wejście na `/login`, logowanie poprawnym kontem.
  - Oczekiwane: przekierowanie na `/` (kalendarz), widoczny `UserMenu` z emailem.

- **TC-AUTH-04 – Logowanie błędnymi danymi**
  - Nieistniejący email, złe hasło.
  - Oczekiwane: sensowny komunikat błędu globalnego (np. „Błąd logowania”).

- **TC-AUTH-05 – Zapomniane hasło**
  - Wejście na `/forgot-password`, podanie poprawnego oraz nieistniejącego maila.
  - Oczekiwane: zawsze komunikat sukcesu, brak przecieku czy konto istnieje.

- **TC-AUTH-06 – Reset hasła**
  - Symulacja wejścia na `/reset-password?token=...`.
  - Ustawienie nowego hasła, potwierdzenie.
  - Oczekiwane: komunikat o sukcesie, możliwość zalogowania nowym hasłem.

- **TC-AUTH-07 – Wylogowanie**
  - Kliknięcie „Wyloguj” w `UserMenu`.
  - Oczekiwane: wywołanie `/api/v1/auth/logout`, redirect na `/login`, brak dostępu do `/` bez logowania.

#### 4.2 Onboarding (3 ostatnie treningi)

- **TC-ONB-01 – Przejście całego procesu onboardingowego**
  - Nowe konto → automatyczny redirect na `/onboarding`.
  - Wypełnienie poprawnych danych dla 3 treningów z przeszłości.
  - Oczekiwane: każdy krok zapisuje dane, po kroku 3 redirect na `nextUrl` (np. `/`), komunikaty sukcesu.

- **TC-ONB-02 – Walidacje formularza treningu**
  - Dystans < 0.1 km, czas < 60s, tętno poza zakresem 40–220, data w przyszłości.
  - Oczekiwane: odpowiednie komunikaty błędów, zablokowanie przejścia dalej.

- **TC-ONB-03 – Przerwanie i powrót**
  - Rozpoczęcie onboarding, odświeżenie strony / wylogowanie w trakcie.
  - Oczekiwane: po zalogowaniu użytkownik wraca do odpowiedniego kroku lub ponownie do onboarding (wg założeń backendu).

- **TC-ONB-04 – Weryfikacja przykładowych danych**
  - Sprawdzenie, czy interfejs onboardingu wyświetla przykładowe dane (np. „Spacer 30 min", „Lekki trucht 15 min").
  - Możliwość użycia przykładowych danych poprzez kliknięcie lub autouzupełnienie.
  - Oczekiwane: przyciski/linki z przykładowymi danymi są widoczne i funkcjonalne, obniżają barierę wejścia dla nowych użytkowników.

#### 4.3 Kalendarz i treningi

- **TC-CAL-01 – Widok kalendarza (miesiąc)**
  - Wejście na `/` po zalogowaniu.
  - Oczekiwane: poprawnie wyświetlony miesiąc, wyróżniony dzisiejszy dzień, oznaczenie dni spoza bieżącego miesiąca.

- **TC-CAL-02 – Nawigacja po okresach i trybach**
  - Zmiana widoku na „Tydzień”, nawigacja `Poprzedni / Następny`, przycisk „Dzisiaj”.
  - Oczekiwane: poprawne przeliczanie zakresów dat, numer tygodnia.

- **TC-CAL-03 – Wyświetlanie treningów w komórkach**
  - Dni z 0, 1, 2 i >2 treningami.
  - Oczekiwane: limit 2 kart w komórce + link „+N więcej” otwierający `DayDrawer`.

- **TC-CAL-04 – Klawiaturowa nawigacja po kalendarzu**
  - Fokus na komórce, użycie strzałek i Enter/spacja.
  - Oczekiwane: przesuwanie fokusu, otwarcie dnia dla Enter/space.

- **TC-CAL-05 – Widok dnia (`DayDrawer`)**
  - Otwarcie dnia z różnymi statusami treningów.
  - Oczekiwane: liczba treningów, poprawne etykiety statusów, dostępne `QuickActions` tylko dla `planned`.

- **TC-CAL-06 – Quick actions: „Pomiń” i „Anuluj”**
  - Dla treningu `planned` użycie „Pomiń” / „Anuluj”.
  - Oczekiwane: aktualizacja statusu/ usunięcie z listy, odpowiednie komunikaty (alerty / toast), odświeżenie danych.

- **TC-CAL-07 – Szczegóły treningu z kalendarza**
  - Kliknięcie treningu otwiera `WorkoutDetailDrawer`.
  - Oczekiwane: poprawne dane planowane, ewentualne dane wykonania, lista kroków.

#### 4.4 Sugestie AI

- **TC-AI-01 – Generowanie sugestii AI**
  - Z `DayCell` wybór „Generuj z AI” → otwarcie `AISuggestionDrawer`.
  - Wybór typu treningu i daty, klik „Generuj sugestię AI”.
  - Oczekiwane: spinner, potem podgląd treningu z podsumowaniem i krokami.

- **TC-AI-02 – Walidacje formularza sugestii**
  - Brak wyboru typu treningu / daty.
  - Oczekiwane: komunikaty błędów pod polami.

- **TC-AI-03 – Akceptacja sugestii**
  - Dla wygenerowanej sugestii klik „Zaakceptuj sugestię”.
  - Oczekiwane: wywołanie API, zamknięcie drawer, pojawienie się treningu w kalendarzu na odpowiedniej pozycji.

- **TC-AI-04 – Konflikt pozycji (409)**
  - Wymuszenie sytuacji z już istniejącym treningiem na pozycji 1.
  - Oczekiwane: otwarcie `ConflictDialog`, wybór pozycji 2–5, ponowna akceptacja, dodanie treningu w wybranej pozycji.

- **TC-AI-05 – Regeneracja sugestii (limit 3)**
  - Kilkukrotne użycie „Odrzuć i wygeneruj nową”.
  - Oczekiwane: licznik pozostałych regeneracji, blokada przy 3 użyciach, komunikat o limicie.

- **TC-AI-06 – Wygasanie sugestii**
  - Symulacja sugestii starszej niż 24h (`isExpired = true`).
  - Oczekiwane: stan „Sugestia wygasła", brak możliwości akceptacji, możliwość wygenerowania nowej.

- **TC-AI-07 – Tryb kalibracji (pierwsze 3 treningi AI)**
  - Weryfikacja, że pierwsze 3 treningi wygenerowane przez AI są bardziej zachowawcze i zróżnicowane.
  - Dla nowego użytkownika po onboardingu wygenerowanie 3 sugestii AI różnych typów.
  - Oczekiwane:
    - Sugestie są zróżnicowane pod względem typu (np. nie 3x ten sam typ).
    - Dystans/czas są bardziej zachowawcze niż średnia z onboardingu (np. nie >120% średniego dystansu).
    - Komunikat/wskazówka informująca o trybie kalibracji (opcjonalnie, jeśli UI to przewiduje).

- **TC-AI-08 – Logika progresji AI (10% zwiększenie)**
  - Weryfikacja logiki progresji po 3 pozytywnych ocenach tego samego typu treningu.
  - Przygotowanie: użytkownik ma w historii 3 ostatnie treningi typu „Bieg Spokojny", wszystkie ocenione jako „W sam raz" lub „Za łatwy".
  - Wygenerowanie nowej sugestii typu „Bieg Spokojny".
  - Oczekiwane:
    - Sugerowany dystans jest większy o ~10% (±2%) niż średnia z 3 ostatnich treningów tego typu.
    - Alternatywnie: czas jest większy o ~10% (jeśli logika opiera się na czasie).

- **TC-AI-09 – Accuracy sugestii tempa na podstawie historii**
  - Weryfikacja, że sugerowane tempo jest realistyczne na podstawie historii użytkownika.
  - Przygotowanie: użytkownik ma w historii kilka treningów z różnym średnim tempem (np. 5:30 min/km, 6:00 min/km, 5:45 min/km).
  - Wygenerowanie sugestii AI.
  - Oczekiwane:
    - Sugerowane tempo w krokach treningu mieści się w rozsądnym zakresie względem średniego tempa użytkownika (np. ±15%).
    - Tempo dla rozgrzewki jest wolniejsze niż dla części głównej.
    - Tempo dla schłodzenia jest wolniejsze niż dla części głównej.

#### 4.5 Cele użytkownika

- **TC-GOAL-01 – Ustawienie celu dystansowego**
  - Wejście na `/goal`, wybór opcji „Mam konkretny cel”.
  - Wprowadzenie dystansu w km, daty w przyszłości, notatek.
  - Oczekiwane: walidacja, zapis celu, komunikat sukcesu (toast).

- **TC-GOAL-02 – Walidacje celu**
  - Dystans spoza zakresu 0.1–1000 km, data w przeszłości, >500 znaków notatek.
  - Oczekiwane: komunikaty błędów, zablokowanie zapisu.

- **TC-GOAL-03 – Tryb „biegam dla zdrowia”**
  - Wybór opcji „biegam dla zdrowia”, zapis.
  - Dla istniejącego celu – oczekiwane usunięcie celu z backendu.

- **TC-GOAL-04 – Usunięcie celu**
  - Kliknięcie „Usuń cel” i potwierdzenie w `Dialog`.
  - Oczekiwane: usunięcie z backendu, reset formularza, komunikat sukcesu.

#### 4.6 Akcje na treningu i rating

- **TC-WRK-01 – Ukończenie treningu z poziomu widoku szczegółów**
  - Dla treningu `planned` klik „✓ Ukończ trening”.
  - Wypełnienie dystansu (0.1–100 km), czasu (5 min–6 h), tętna (0–240), daty i godziny (nie w przyszłości).
  - Oczekiwane: walidacje, zapis, status `completed`, uzupełnione metryki.

- **TC-WRK-02 – Ocena treningu**
  - Dla `completed` klik „⭐ Oceń trening”.
  - Wybór jednej z opcji („Za łatwy/W sam raz/Za trudny”).
  - Oczekiwane: zapis ratingu, odświeżenie metryk z polską etykietą.

- **TC-WRK-03 – Skip/Cancel z widoku szczegółów**
  - Dla `planned` użycie przycisków „Pomiń” i „Anuluj” (z potwierdzeniem).
  - Oczekiwane: zmiana statusu w UI i odpowiednia aktualizacja danych.

#### 4.7 Preferencje – jednostka tempa

- **TC-PACE-01 – Zmiana jednostki tempa w menu użytkownika**
  - Otworzenie `UserMenu`, przełącznik `PaceUnitToggle`.
  - Oczekiwane: zapis w `localStorage`, ponowne wejście do aplikacji zachowuje wybór.

- **TC-PACE-02 – Brak dostępu do localStorage**
  - Tryb incognito / przeglądarka z blokadą storage.
  - Oczekiwane: brak crasha, użycie wartości domyślnej, ostrzeżenie w konsoli.

#### 4.8 Błędy, stany brzegowe i dostępność

- **TC-ERR-01 – Brak połączenia z API kalendarza**
  - Symulacja błędu network dla `/api/v1/calendar`.
  - Oczekiwane: komunikat błędu w widoku kalendarza z przyciskiem „Odśwież”.

- **TC-ERR-02 – Nieautoryzowany dostęp**
  - Dostęp do `/`, `/goal`, `/onboarding` bez sesji.
  - Oczekiwane: redirect do `/login`.

- **TC-ACC-01 – Podstawowa dostępność**
  - Sprawdzenie etykiet ARIA, kolejek focusu w dialogach i sheetach (`Dialog`, `Sheet`).
  - Oczekiwane: możliwość przejścia głównych scenariuszy wyłącznie klawiaturą.

### 5. Środowisko testowe

- **Konfiguracja aplikacji**
  - Node.js: `22.14.0` (zgodnie z `.nvmrc`).
  - Aplikacja uruchamiana w trybie:
    - `npm run dev` – szybka weryfikacja lokalna.
    - `npm run build` + `npm run preview` – środowisko dla E2E / regresji.

- **Baza danych (Supabase / Postgres)**
  - Dedykowany **testowy projekt Supabase** lub lokalny Postgres z zastosowanymi migracjami:
    - `supabase/migrations/*`, `supabase/seed.sql` do inicjalizacji danych.
  - Osobne dane dostępowe w `.env.test` (brak użycia produkcyjnych kluczy).

- **Konfiguracja AI (OpenRouter)**
  - Dla testów E2E rekomendowane:
    - środowisko z mockowanymi odpowiedziami (np. przez warstwę usług w `src/lib/services/aiSuggestionsService.ts` i / lub MSW),
    - lub osobny klucz z twardymi limitami i deterministycznymi modelami.

- **Przeglądarki**
  - Playwright: Chromium, WebKit (opcjonalnie Firefox).
  - Rozdzielczości:
    - desktop: 1440×900,
    - mobile: 390×844 (iPhone 13).

### 6. Narzędzia do testowania

- **Automatyczne testy E2E**
  - **Playwright** (`tests/e2e/*`):
    - scenariusze zgodne z rozdziałem 4,
    - uruchamiane w CI po `npm run build`.

- **Testy jednostkowe/integracyjne**
  - Propozycja: **Vitest** + **React Testing Library**:
    - testy logiki w hooks (`useCalendar`, `useDayWorkouts`, `useWorkoutDetail`),
    - testy walidacji i utilsów (formatowanie, logika AI).

- **Testy API**
  - `supertest` lub `node-fetch` w środowisku testowym Astro Node.
  - Alternatywnie: Playwright API testy (APIRequestContext).

- **Inne**
  - **ESLint**, **Prettier**, Husky, lint-staged – gate jakościowy.
  - **Supabase CLI** – migracje, seedy.
  - **MSW** (opcjonalnie) – mockowanie wybranych endpointów w testach komponentów.

### 7. Harmonogram testów

Odwołując się do ogólnego harmonogramu (5 tygodni):

- **Tydzień 1–2**
  - Przygotowanie środowiska testowego (Supabase test, CI).
  - Ustalenie frameworka unit/integration tests (Vitest/Jest).
  - Projekt przypadków testowych (rozpisanie TC z rozdziału 4 w narzędziu do managementu testów).

- **Tydzień 2–3**
  - Implementacja kluczowych testów E2E:
    - scenariusze autentykacji (TC-AUTH-01 do TC-AUTH-07),
    - onboarding z przykładowymi danymi (TC-ONB-01 do TC-ONB-04),
    - podstawowy kalendarz (TC-CAL-01 do TC-CAL-03).
  - Implementacja testów jednostkowych utilsów i walidacji.

- **Tydzień 3–4**
  - Rozszerzenie E2E o:
    - sugestie AI - podstawowe flow (TC-AI-01 do TC-AI-06),
    - zaawansowana logika AI: kalibracja, progresja, tempo (TC-AI-07 do TC-AI-09),
    - cele użytkownika (TC-GOAL-01 do TC-GOAL-04),
    - akcje na treningu (TC-WRK-01 do TC-WRK-03).
  - Dodanie integracyjnych testów API (workouts, calendar, ai-suggestions, goals).
  - Podstawowe testy wydajności/dostępności.

- **Tydzień 4–5**
  - Regresja pełna przed release.
  - Stabilizacja flaków w E2E (jeśli wystąpią).
  - Przegląd pokrycia i uzupełnienie brakujących przypadków dla krytycznych ścieżek.

### 8. Kryteria akceptacji testów

- **Funkcjonalne**
  - 100% przejścia testów E2E dla scenariuszy:
    - rejestracja/logowanie/reset hasła (TC-AUTH-01 do TC-AUTH-07),
    - onboarding 3 treningów z weryfikacją przykładowych danych (TC-ONB-01 do TC-ONB-04),
    - przeglądanie kalendarza i treningów (TC-CAL-01 do TC-CAL-07),
    - co najmniej jedno pełne użycie sugestii AI (generacja–akceptacja) (TC-AI-01 do TC-AI-06),
    - weryfikacja logiki AI: tryb kalibracji, progresja, accuracy tempa (TC-AI-07 do TC-AI-09),
    - ustawienie/edycja/usunięcie celu użytkownika (TC-GOAL-01 do TC-GOAL-04).
  - Brak otwartych błędów o **priorytecie krytycznym** i **wysokim** blokujących główne flow.

- **Jakościowe**
  - Brak błędów lint (`npm run lint`) w gałęzi release.
  - Brak błędów typów (TypeScript) w buildzie.
  - Brak oczywistych naruszeń dostępności (np. brak fokusa w dialogach, nieopisane przyciski).

- **Pokrycie (orientacyjne)**
  - Testy jednostkowe:
    - min. 60–70% pokrycia linii dla modułów w `src/lib/utils`, `src/lib/validation`, `src/lib/services/aiSuggestionsService.ts`.
  - E2E:
    - pokrycie wszystkich głównych ścieżek opisanych w rozdziale 4.

### 9. Role i odpowiedzialności

- **QA Engineer**
  - Przygotowanie i utrzymywanie planu testów oraz przypadków testowych.
  - Implementacja i utrzymanie testów E2E (Playwright).
  - Raportowanie defektów, wsparcie w reprodukcji.

- **Developerzy**
  - Implementacja testów jednostkowych/integracyjnych dla nowych funkcjonalności.
  - Utrzymanie jakości kodu (lint, typy, refaktoryzacja).
  - Współpraca przy analizie przyczyn błędów.

- **Tech Lead / Architekt**
  - Akceptacja strategii testowania.
  - Priorytetyzacja napraw defektów.
  - Nadzór nad integracją testów w CI/CD.

- **Product Owner**
  - Definiowanie kryteriów akceptacji funkcjonalności.
  - Udział w UAT (user acceptance testing) dla krytycznych zmian.

### 10. Procedury raportowania błędów

- **System śledzenia**: GitHub Issues (lub inne wybrane narzędzie).

- **Minimalne pola zgłoszenia**
  - Tytuł: krótki opis problemu (np. „[Calendar] Błędna liczba treningów w DayDrawer”).
  - Środowisko: wersja aplikacji (commit/branch), przeglądarka, typ środowiska (dev/preview/prod).
  - Kroki do odtworzenia (numerowana lista).
  - Oczekiwany rezultat.
  - Rzeczywisty rezultat (zrzuty ekranu / logi konsoli / network trace, jeśli dostępne).
  - Ciężkość (Severity): Blocker / High / Medium / Low.
  - Priorytet (Priority): P1 / P2 / P3.
  - Powiązane test case ID (np. TC-AI-03).

- **Workflow obsługi defektu**
  - Zgłoszenie: QA / Developer tworzy issue z pełnym opisem.
  - Triaging: Tech Lead + PO nadają priorytet i przypisują do sprintu.
  - Naprawa: developer tworzy PR z odniesieniem do numeru issue.
  - Weryfikacja: QA przeprowadza retest oraz, jeśli konieczne, test regresji.
  - Zamknięcie: po pozytywnej weryfikacji issue oznaczane jako „Done”.

- **Raportowanie zbiorcze**
  - Po każdym większym cyklu testowym (np. przed release) przygotowywany jest krótki raport:
    - liczba wykonanych przypadków testowych,
    - liczba i status defektów (per severity),
    - otwarte ryzyka i rekomendacje.


