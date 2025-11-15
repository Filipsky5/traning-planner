## Plan implementacji widoku: Drawer „Dodaj ręcznie”

### 1. Przegląd

Widok **„Drawer: Dodaj ręcznie”** to wysuwany panel używany na głównym widoku kalendarza (`/`), który pozwala użytkownikowi **ręcznie dodać nowy trening** – jako czysto zaplanowany albo od razu oznaczony jako ukończony. Użytkownik wybiera typ treningu, datę oraz buduje strukturę treningu z segmentów (rozgrzewka / część główna / schłodzenie / segmenty), a **łączny dystans i czas trwania są wyliczane automatycznie na podstawie kroków**. Widok integruje się z API `POST /api/v1/workouts`, wykorzystuje słownik `training_types` oraz po udanej operacji odświeża dane kalendarza i zamyka panel.

### 2. Routing widoku

- **Ścieżka routingu**: brak dedykowanej ścieżki URL – drawer jest **overlayem na widoku kalendarza** dostępnego pod `/`.
- **Aktywacja**:
  - Z poziomu `DayCell` (pusty dzień): kliknięcie `+` → `Dropdown` → **„Dodaj ręcznie”**.
  - Potencjalnie z innych miejsc (np. globalny przycisk „Dodaj” w mobile bottom nav) – użyją tego samego komponentu `ManualWorkoutDrawer` z przekazaną datą.
- **Zamykanie**:
  - Zmiana `isOpen` na `false` (kliknięcie X, kliknięcie w tło, sukces zapisu).
  - Po zamknięciu panel resetuje swój stan formularza.

### 3. Struktura komponentów

Rekomendowane umiejscowienie komponentów:
- Kontener widoku: `src/components/calendar/ManualWorkoutDrawer.tsx`
- Komponenty formularza: `src/components/workout/WorkoutPlanForm.tsx`, `src/components/workout/StepsEditor.tsx`, `src/components/workout/OptionalRealizationSection.tsx`

Proponowane drzewo komponentów:

```text
CalendarView.tsx
  └── ManualWorkoutDrawer (nowy)
        └── WorkoutPlanForm
              ├── WorkoutPlanBasicsSection
              │     ├── TrainingTypeSelect
              │     ├── PlannedDatePicker
              │     └── PositionInput (+ podgląd zagregowanych wartości: dystans/czas)
              ├── StepsEditor
              │     ├── StepRow[] (dynamiczna lista)
              │     │     ├── SegmentTypeSelect (warmup/main/cooldown/segment)
              │     │     ├── DistanceInput (km)
              │     │     ├── DurationInput (mm:ss / hh:mm:ss)
              │     │     └── TargetHrInput + NotesInput (opcjonalne)
              └── OptionalRealizationSection
                    ├── CompletedToggle („Trening już wykonany”)
                    ├── RealizedDistanceInput (km)
                    ├── RealizedDurationInput (czas)
                    ├── AvgHrInput
                    ├── CompletedAtDateTimePicker
                    └── RatingSelect (too_easy / just_right / too_hard)
```

### 4. Szczegóły komponentów

#### 4.1 `ManualWorkoutDrawer`

- **Opis komponentu**: Kontener drawera oparty o `Sheet` z `shadcn/ui`. Odpowiada za:
  - sterowanie widocznością panelu,
  - przekazanie danych wejściowych (domyślna data, domyślny typ, dostępne `trainingTypes`),
  - integrację z kalendarzem (`refetch` po sukcesie),
  - bazową obsługę błędów (komunikaty na poziomie całego widoku).
- **Główne elementy**:
  - `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`.
  - W środku `WorkoutPlanForm` jako jedyny child.
- **Obsługiwane interakcje**:
  - `onOpenChange(isOpen: boolean)` – zamykanie panelu.
  - Callback `onSubmitSuccess` – wywoływany po udanym utworzeniu treningu (z `WorkoutDetailDto`).
- **Obsługiwana walidacja**: brak szczegółowej walidacji – deleguje walidację do `WorkoutPlanForm`.
- **Typy wykorzystywane**:
  - `TrainingTypeDto` – lista typów treningów.
  - `WorkoutDetailDto` – odpowiedź z API po utworzeniu treningu (do ewentualnego wykorzystania w UI).
  - `ManualWorkoutFormValues` (ViewModel formularza – opisany w sekcji 5).
- **Propsy**:
  - `isOpen: boolean` – czy drawer jest aktualnie otwarty.
  - `onOpenChange: (open: boolean) => void` – obsługa zamknięcia (ustawiana z `CalendarView`).
  - `initialDate: Date` – data z wybranej komórki kalendarza.
  - `trainingTypes: TrainingTypeDto[]` – lista aktywnych typów treningów (przekazana z `useCalendar`).
  - `onWorkoutCreated?: (workout: WorkoutDetailDto) => void` – opcjonalny callback (np. do pokazania toast + `refetch` kalendarza).

#### 4.2 `WorkoutPlanForm`

- **Opis komponentu**: Główny formularz React (z `react-hook-form` + `zodResolver`), który obsługuje całą logikę:
  - lokalny ViewModel formularza (`ManualWorkoutFormValues`),
  - dynamiczną listę kroków (`steps`),
  - przeliczanie łącznego dystansu/czasu na wartości dla API (`planned_distance_m`, `planned_duration_s`),
  - warunkowe pola realizacji (sekcja „Trening już wykonany”),
  - submit – wywołanie `POST /api/v1/workouts`.
- **Główne elementy HTML / UI**:
  - Grupa podstawowych pól planu (`WorkoutPlanBasicsSection`),
  - `StepsEditor` (lista segmentów),
  - `OptionalRealizationSection` (pola realizacji),
  - Pasek błędów globalnych (np. `Alert` z komunikatem z API),
  - Przyciski „Zapisz” (primary) i „Anuluj”.
- **Obsługiwane interakcje**:
  - Zmiana wartości pól formularza (typ, data, pozycja, kroki, sekcja realizacji).
  - Dodawanie/usuwanie segmentu.
  - Zatwierdzenie formularza (`onSubmit`).
  - Anulowanie – zamknięcie panelu bez zapisu.
- **Warunki walidacji (zgodne z API)**:
  - `trainingTypeCode`:
    - wymagane, niepuste, musi pochodzić z listy `trainingTypes` (dropdown → praktycznie eliminuje błędne wartości).
  - `plannedDate`:
    - wymagane, przekształcane do stringa `YYYY-MM-DD` (np. przy pomocy helpera `formatDate` używanego w `useCalendar`).
  - `position`:
    - liczba całkowita `>= 1`,
    - domyślnie `max(existingPositions) + 1` dla danego dnia (wyliczane w komponencie nadrzędnym lub w helperze),
    - nie ma możliwości sprawdzenia unikalności na froncie – ewentualny konflikt (`409 duplicate_position`) obsługuje się jako błąd API.
  - `steps`:
    - minimum 1 krok,
    - każdy krok: `part` w `["warmup", "main", "cooldown", "segment"]`,
    - każdy krok musi mieć **co najmniej jedną** z wartości: dystans lub czas (w UI wymagane: dystans _lub_ czas; oba też można podać),
    - docelowo mapowane do `WorkoutStepDto` (`distance_m?: number`, `duration_s?: number`, `notes?: string`).
  - **Zagregowany plan**:
    - `planned_distance_m` = suma `distance_m` ze wszystkich kroków (pomijając `undefined`),
    - `planned_duration_s` = suma `duration_s` ze wszystkich kroków,
    - walidacja sum:
      - `planned_distance_m` w zakresie `[100, 100000]`,
      - `planned_duration_s` w zakresie `[300, 21600]`,
      - jeśli sumy wypadają poza zakres, formularz blokuje submit (komunikat np. „Łączny dystans musi być między 0.1 km a 100 km”).
  - **Realizacja (sekcja opcjonalna)**:
    - jeśli `isCompleted === false`:
      - pola realizacji są ignorowane, nie wysyłamy `status` ani metryk realizacji → API traktuje trening jako `planned`.
    - jeśli `isCompleted === true`:
      - wymagane pola realizacji zgodnie z `completeWorkoutSchema` / `createWorkoutSchema`:
        - `distance_m` (tegowane w UI jako km, konwersja do m, zakres `[100, 100000]`),
        - `duration_s` (czas w sekundach, UI jako hh:mm:ss, zakres `[300, 21600]`),
        - `avg_hr_bpm` (liczba całkowita `[0, 240]`),
        - `completed_at` (ISO 8601, UI: `DateTime` lokalna, zamieniana na UTC),
      - `rating` opcjonalne (enum `too_easy | just_right | too_hard`), zgodne z `WorkoutRateCommand`.
- **Typy wykorzystywane**:
  - `WorkoutStepDto` – docelowy format kroków.
  - `WorkoutCreatePlannedCommand` / `WorkoutCreateCompletedCommand` – koncepcyjna baza do mapowania (ale formalnie używamy `CreateWorkoutInput` z walidacji).
  - `ManualWorkoutFormValues` – ViewModel formularza (sekcja 5).
- **Propsy**:
  - `trainingTypes: TrainingTypeDto[]`
  - `initialDate: Date`
  - `onCancel: () => void`
  - `onSubmitSuccess: (workout: WorkoutDetailDto) => void`

#### 4.3 `WorkoutPlanBasicsSection`

- **Opis komponentu**: Sekcja formularza z polami ogólnymi planu – typ, data, pozycja + podgląd automatycznie zliczanego dystansu i czasu.
- **Główne elementy**:
  - `Select` (`shadcn/ui`) z listą `trainingTypes` (etykieta = `name`, `value` = `code`).
  - `DatePicker` (np. bazujący na `react-day-picker`) – domyślnie wybrana data z `initialDate`.
  - `Input` (numeric) dla `position` (domyślnie `1` lub `nextPosition` obliczony na podstawie day cell).
  - `Read-only` label/tekst pokazujący `Łączny dystans` i `Łączny czas` (liczone w `WorkoutPlanForm` i przekazywane tu jako propsy).
- **Obsługiwane interakcje**:
  - Zmiana typu treningu.
  - Zmiana daty (w razie potrzeby użytkownik może przeplanować trening na inny dzień).
  - Zmiana pozycji (np. z 1 na 2, jeśli w danym dniu będzie więcej treningów).
- **Walidacja**:
  - Zgodnie z regułami `WorkoutPlanForm` – sekcja jest „głupym” komponentem prezentacyjnym, otrzymuje błędy z `react-hook-form` i wyświetla komunikaty.
- **Typy**:
  - Props: fragment `ManualWorkoutFormValues` (`trainingTypeCode`, `plannedDate`, `position`) oraz zagregowane `totalPlannedDistanceKm`, `totalPlannedDurationFormatted`.

#### 4.4 `StepsEditor`

- **Opis komponentu**: Edytor dynamicznej listy kroków treningu. Każdy krok opisuje jedną część treningu (rozgrzewka / główna / schłodzenie / segment).
- **Główne elementy**:
  - Lista `StepRow` (użycie `useFieldArray` z `react-hook-form`), każdy w osobnej karcie/wierszu.
  - Przycisk **„Dodaj segment”** (`Button`), dodający nowy krok z domyślnymi wartościami (np. part=`main`).
  - (Opcjonalnie) przyciski przesuwania segmentów w górę/dół, jeśli w przyszłości będzie potrzeba reordering.
- **Obsługiwane interakcje**:
  - Dodawanie nowego kroku.
  - Usuwanie kroku (z walidacją, że musi pozostać co najmniej jeden).
  - Zmiana typu segmentu (`warmup` | `main` | `cooldown` | `segment`).
  - Zmiana dystansu (w km) i/lub czasu (minuty/seundy).
  - Zmiana „zaplanowanego tętna” (pole numeryczne) oraz `notes` (np. dodatkowy opis).
- **Walidacja (per krok)**:
  - `part` – wymagany, jeden z enumeracji.
  - `distanceKm` – opcjonalny, ale jeśli podany, po konwersji do metrów musi spełniać zakres `[100, 100000]`.
  - `durationTotalSeconds` – opcjonalny, ale jeśli podany, musi być w zakresie `[60, 21600]` (podstawowy krok może być krótszy niż cały trening).
  - Walidacja „anyOf”: **co najmniej jedno z** `distance` lub `duration` musi być podane. Jeśli oba puste – błąd na wierszu.
  - `targetHrBpm` – opcjonalne pole liczbowe `[0, 240]`. Technicznie nie istnieje w `WorkoutStepDto`, więc w mapowaniu zapisujemy je do `notes` (np. jako `HR: 140 bpm;` + ewentualny opis).
- **Mapowanie do DTO**:
  - Każdy `StepRow` mapuje się na:
    - `part`: `StepPart`
    - `distance_m`: `distanceKm * 1000` (zaokrąglone do `int`), lub `undefined`.
    - `duration_s`: suma sekund (z kontrolki czasu), lub `undefined`.
    - `notes`: string z opcjonalną informacją o tętnie + dowolny dodatkowy tekst.
- **Typy**:
  - `ManualWorkoutStepForm` (ViewModel w sekcji 5).

#### 4.5 `OptionalRealizationSection`

- **Opis komponentu**: Sekcja pozwalająca opcjonalnie od razu wprowadzić dane z wykonania treningu (dystans, czas, średnie HR, rating). Odpowiada za częściowe pokrycie user story o ręcznym dodawaniu ukończonych treningów.
- **Główne elementy**:
  - `Switch` / `Checkbox`: **„Ten trening jest już wykonany”** → ustawia `isCompleted`.
  - Grupa pól widoczna tylko przy `isCompleted === true`:
    - `Input` dystansu (km) – domyślnie prefill z `totalPlannedDistanceKm`.
    - `TimeInput` (np. trzy pola `hh:mm:ss` lub jeden kontroler czasu) – domyślnie prefill z `totalPlannedDurationSec`.
    - `Input` `avg_hr_bpm` (bpm).
    - `DateTimePicker` dla `completed_at` (domyślnie `now`).
    - `RatingSelect` (np. `RadioGroup` z trzema opcjami).
- **Obsługiwane interakcje**:
  - Włączenie/wyłączenie sekcji realizacji.
  - Edycja pól realizacji.
- **Walidacja**:
  - Jak w `WorkoutPlanForm`:
    - jeżeli `isCompleted === true`, wszystkie pola realizacji (oprócz rating) są wymagane i muszą spełniać zakresy.
    - jeżeli `isCompleted === false`, sekcja nie generuje błędów i pola nie są wysyłane do API.
- **Typy**:
  - Podzbiór `ManualWorkoutFormValues`: `isCompleted`, `realizedDistanceKm`, `realizedDurationSec`, `avgHrBpm`, `completedAt`, `rating`.

### 5. Typy

#### 5.1 Istniejące typy z `src/types.ts`

- **`WorkoutStepDto`**:
  - `part: "warmup" | "main" | "cooldown" | "segment"`
  - `distance_m?: number`
  - `duration_s?: number`
  - `notes?: string`
- **`WorkoutCreatePlannedCommand` / `WorkoutCreateCompletedCommand`**:
  - Służą jako model docelowy dla danych wysyłanych z formularza (zgodnie z `createWorkoutSchema`).
- **`WorkoutDetailDto`**:
  - Używany jako wynik żądania `POST /api/v1/workouts` (z polami takimi jak `id`, `planned_date`, `status`, `steps`, itp.).
- **`TrainingTypeDto`**:
  - `code`, `name`, `is_active`, `created_at`.

#### 5.2 Nowe typy ViewModel dla widoku

> Uwaga: typy ViewModel są lokalne dla frontendu i służą do wygodnej pracy z jednostkami (km, minuty, Date). Funkcje mapujące skonwertują je do typów API.

- **`ManualWorkoutStepForm`** – typ pojedynczego kroku w formularzu:

```typescript
type StepPart = "warmup" | "main" | "cooldown" | "segment";

interface ManualWorkoutStepForm {
  id: string;               // lokalny identyfikator w UI (np. uuid)
  part: StepPart;
  distanceKm?: number;      // dystans w km (np. 1.0, 5.0)
  durationMinutes?: number; // czas w minutach (opcjonalne, do budowy duration_s)
  durationSeconds?: number; // dodatkowe sekundy (0–59)
  targetHrBpm?: number;     // opcjonalnie: planowane tętno 0–240
  notes?: string;           // dodatkowy opis użytkownika
}
```

- **`ManualWorkoutFormValues`** – główny ViewModel formularza:

```typescript
interface ManualWorkoutFormValues {
  trainingTypeCode: string;      // z TrainingTypeDto.code
  plannedDate: Date;             // UI używa Date, mapowanie do YYYY-MM-DD
  position: number;              // kolejność treningu w dniu

  steps: ManualWorkoutStepForm[]; // dynamiczna lista kroków

  // Pola pochodne tylko do prezentacji (nie wysyłane do API bezpośrednio)
  totalPlannedDistanceKm: number;   // suma distanceKm
  totalPlannedDurationSec: number;  // suma seconds

  // Sekcja realizacji (opcjonalna)
  isCompleted: boolean;
  realizedDistanceKm?: number;
  realizedDurationSec?: number;
  avgHrBpm?: number;
  completedAt?: Date;
  rating?: "too_easy" | "just_right" | "too_hard";
}
```

- **Mapowanie `ManualWorkoutFormValues` → `CreateWorkoutInput` (API)**:
  - `training_type_code = trainingTypeCode`
  - `planned_date = plannedDate` w formacie `YYYY-MM-DD` (helper).
  - `position = position`
  - `planned_distance_m = Math.round(totalPlannedDistanceKm * 1000)`
  - `planned_duration_s = totalPlannedDurationSec`
  - `steps = ManualWorkoutStepForm[]` zmapowane na `WorkoutStepDto[]`
  - jeśli `isCompleted === true`:
    - `status = "completed"`
    - `distance_m = Math.round(realizedDistanceKm * 1000)`
    - `duration_s = realizedDurationSec`
    - `avg_hr_bpm = avgHrBpm`
    - `completed_at = completedAt.toISOString()`
    - `rating` – jeśli ustawione
  - jeśli `isCompleted === false`:
    - nie ustawiamy `status` ani pól realizacji (API przyjmie domyślnie `status="planned"`).

### 6. Zarządzanie stanem

- **Stan w `CalendarView`**:
  - Nowe zmienne:
    - `isManualDrawerOpen: boolean`
    - `selectedManualDate: Date | null`
  - Nowe handlery:
    - `openManualDrawer(date: Date)` – ustawienie `selectedManualDate` i otwarcie.
    - `closeManualDrawer()` – reset stanu i zamknięcie.
  - `DayCell` już przyjmuje `onAddWorkoutManual` – podpiąć `openManualDrawer`.

- **Stan w `ManualWorkoutDrawer`**:
  - Nie trzyma długotrwałego stanu – korzysta z wewnętrznego stanu `react-hook-form` w `WorkoutPlanForm`.
  - Może przechowywać:
    - `apiError: string | null` – komunikat błędu z serwera.
    - `isSubmitting: boolean` – blokada formularza podczas wysyłki.

- **Stan w `WorkoutPlanForm`**:
  - Zarządzany przez `useForm<ManualWorkoutFormValues>()`:
    - `steps` jako `useFieldArray`.
    - Obserwacja `steps` (`watch`) w celu przeliczania `totalPlannedDistanceKm` i `totalPlannedDurationSec`.
    - Obserwacja `isCompleted` do walidacji sekcji realizacji.

- **Potencjalny custom hook**:
  - `useManualWorkoutForm(initialDate: Date, initialTrainingTypeCode?: string)`:
    - Inicjalizuje `useForm` z sensownymi defaultami:
      - `plannedDate = initialDate`,
      - `steps` z jednym krokiem `warmup` lub `main`,
      - `position` = `1` lub `nextPosition`.
    - Zapewnia funkcje `handleSubmit`, `addStep`, `removeStep`, przelicza sumy.
    - Może być zaimplementowany w tym samym pliku co `WorkoutPlanForm` lub w `src/components/hooks`.

### 7. Integracja API

- **Endpointy wykorzystywane przez widok**:
  - `GET /api/v1/training-types`
    - Nie jest wywoływany z `ManualWorkoutDrawer` – lista typów jest już pobierana w `useCalendar` i przekazywana jako `trainingTypes`.
    - Typ odpowiedzi: `ApiListResponse<TrainingTypeDto>`.
  - `POST /api/v1/workouts`
    - Wywoływany z `WorkoutPlanForm` przy submit.
    - **Body (planned)** – mapowane z `ManualWorkoutFormValues`:
      - `training_type_code`
      - `planned_date`
      - `position`
      - `planned_distance_m`
      - `planned_duration_s`
      - `steps`
    - **Body (completed)** – dodatkowo:
      - `status: "completed"`
      - `distance_m`
      - `duration_s`
      - `avg_hr_bpm`
      - `completed_at`
      - `rating?`
    - **Typ żądania**: `CreateWorkoutInput` (Zod z `src/lib/validation/workouts.ts` – w JS wystarczy upewnić się, że pola spełniają zakresy).
    - **Typ odpowiedzi (sukces)**: `ApiResponse<WorkoutDetailDto>`.
    - **Kody błędów**:
      - `401 unauthorized` – globalny redirect do `/login` (obsługiwany przez middleware).
      - `404 not_found` (`INVALID_TRAINING_TYPE`) – teoretycznie nie powinien wystąpić przy dropdownie.
      - `409 duplicate_position` – konflikt pozycji w danym dniu.
      - `422 validation_error` – błędy walidacji danych.
      - `500 internal_error` – nieoczekiwany błąd serwera.

- **Warstwa klienta**:
  - Można dodać helper w `src/lib/api/workoutsClient.ts`, np. `createWorkout(request: CreateWorkoutInput): Promise<WorkoutDetailDto>`, na wzór istniejących klientów (`getWorkoutById`, `completeWorkout`).
  - `WorkoutPlanForm` używa tego helpera zamiast gołego `fetch`, zachowując spójny handling błędów (`ApiError`).

- **Odświeżanie kalendarza po sukcesie**:
  - Po udanym `POST /workouts`, `ManualWorkoutDrawer` wywołuje:
    - `onWorkoutCreated(workout)` → w `CalendarView`:
      - pokazanie toast „Trening dodany”,
      - wywołanie `refetch()` z `useCalendar()` w celu ponownego pobrania `/api/v1/calendar`.

### 8. Interakcje użytkownika

- **Kliknięcie `+` → „Dodaj ręcznie” w pustej komórce dnia**:
  - `DayCell` wywołuje `onAddWorkoutManual(day.date)`.
  - `CalendarView`:
    - ustawia `selectedManualDate = date`,
    - `isManualDrawerOpen = true`.
  - Drawer otwiera się z formularzem, `plannedDate` domyślnie ustawione na wybraną datę.

- **Wypełnianie formularza**:
  - Użytkownik:
    - wybiera typ treningu,
    - ewentualnie zmienia datę/pozycję,
    - dodaje segmenty (kroki) z odpowiednimi częściami, czasem, dystansem i planowanym tętnem,
    - opcjonalnie zaznacza „Trening już wykonany” i wpisuje metryki realizacji.
  - UI:
    - automatycznie aktualizuje łączny dystans i czas w sekcji planu,
    - natychmiast pokazuje błędy walidacji przy niepoprawnych wartościach (np. brak dystansu/czasu w kroku, przekroczone zakresy).

- **Zatwierdzenie formularza („Zapisz”)**:
  - `WorkoutPlanForm` wykonuje walidację lokalną.
  - Przy braku błędów:
    - konstruuje `CreateWorkoutInput`,
    - wysyła `POST /api/v1/workouts`,
    - pokazuje stan `isSubmitting` (disabled przyciski, spinner w przycisku).
  - Po udanym zapisie:
    - wywoływany jest `onSubmitSuccess(workout)`,
    - `ManualWorkoutDrawer` zamyka panel (`onOpenChange(false)`),
    - `CalendarView` refetchuje dane kalendarza.

- **Anulowanie**:
  - Kliknięcie „Anuluj” zamyka drawer (`onOpenChange(false)`), bez wywoływania API.
  - Stan formularza resetuje się przy kolejnym otwarciu.

### 9. Warunki i walidacja

- **Walidacja formularza na froncie**:
  - Oparta o `zod` (lokalny schema) lub reguły `react-hook-form` odzwierciedlające `createWorkoutSchema`:
    - wszystkie pola planu (`trainingTypeCode`, `plannedDate`, `position`, `steps`) wymagane,
    - walidacja zakresów dla dystansu/czasu/HR,
    - walidacja `steps` (anyOf distance lub duration, min 1 element),
    - walidacja warunkowa sekcji realizacji (tylko gdy `isCompleted === true`).
- **Zależności między polami**:
  - zmiana kroków automatycznie zmienia `totalPlannedDistanceKm` oraz `totalPlannedDurationSec`; jeśli sumy wychodzą poza zakres, pojawia się błąd globalny (np. nad przyciskiem „Zapisz”).
  - `position` pozostaje edytowalne, ale UI może ostrzec (tooltip) o potencjalnym konflikcie przy powtórzeniu pozycji.
- **Walidacja zgodna z API**:
  - przed wysłaniem do API konwersja do jednostek (m, s) oraz formatów (`YYYY-MM-DD`, ISO 8601).
  - brak pól, których API nie rozumie (np. `targetHrBpm` – „spłaszczone” do `notes`).

### 10. Obsługa błędów

- **Walidacja po stronie serwera (422)**:
  - `ApiError` zawiera `error.details` z listą błędów Zod.
  - `WorkoutPlanForm`:
    - mapuje błędy do odpowiadających im pól (jeśli to możliwe),
    - wyświetla ogólny komunikat na górze formularza (np. „Nieprawidłowe dane treningu”).

- **Konflikt pozycji (409 `duplicate_position`)**:
  - Wyświetlić toast lub baner w formularzu: „Istnieje już trening z taką pozycją dla danej daty. Zmień pozycję lub usuń istniejący trening.”
  - Podświetlić pole `position` jako błędne.

- **Błąd 401 / brak sesji**:
  - Globalnie obsługiwany przez middleware – użytkownik zostanie przekierowany do `/login`.

- **Błędy sieci/500**:
  - Pokazać komunikat „Wystąpił nieoczekiwany błąd serwera. Spróbuj ponownie później.”
  - Pozostawić dane formularza, aby użytkownik mógł ponowić zapis bez utraty wpisanych pól.

- **Edge cases**:
  - Brak dostępnych `trainingTypes` (np. błąd pobierania w `useCalendar`):
    - nie otwierać drawera lub pokazać w nim komunikat „Nie udało się załadować typów treningów” z przyciskiem ponownej próby.
  - `selectedManualDate` w przeszłości – nadal dozwolone (użytkownik może dodać retro-trening), ale UI może pokazać delikatny hint.

### 11. Kroki implementacji

1. **Przygotowanie typów**  
   - Dodać typy `ManualWorkoutStepForm` i `ManualWorkoutFormValues` (np. do `src/types/workoutForms.ts` lub lokalnie w pliku `WorkoutPlanForm.tsx`).  
   - Upewnić się, że importy `TrainingTypeDto`, `WorkoutDetailDto`, `WorkoutStepDto` są poprawnie dostępne z `src/types.ts`.

2. **Implementacja helperów mapujących**  
   - Stworzyć funkcje:
     - `mapStepFormToDto(step: ManualWorkoutStepForm): WorkoutStepDto`
     - `mapFormValuesToCreateWorkoutInput(values: ManualWorkoutFormValues): CreateWorkoutInput`  
   - Funkcje powinny odpowiedzialnie konwertować jednostki (km → m, hh:mm:ss → s) oraz wstrzykiwać `targetHrBpm` do `notes`.

3. **Implementacja `WorkoutPlanForm`**  
   - Utworzyć komponent z `react-hook-form` (`useForm`, `useFieldArray`) i lokalnym schema walidacji.  
   - Zaimplementować obliczanie sum (`totalPlannedDistanceKm`, `totalPlannedDurationSec`) na podstawie `steps`.  
   - Obsłużyć submit: wywołać klienta API `createWorkout`, przekazać wynik do `onSubmitSuccess`.  
   - Dodać prezentację błędów pod polami oraz ogólny baner błędu.

4. **Implementacja `StepsEditor` i `StepRow`**  
   - Wykorzystać `useFieldArray` do renderowania listy kroków z przyciskami dodawania/usuwania.  
   - Każdy krok powinien oferować wybór typu segmentu oraz pola do edycji dystansu, czasu i HR.

5. **Implementacja `OptionalRealizationSection`**  
   - Dodać przełącznik `isCompleted` oraz pola realizacji, z domyślnym wypełnieniem z sum planu.  
   - Zapewnić walidację warunkową oraz mapowanie pól przy submit.

6. **Implementacja `ManualWorkoutDrawer`**  
   - Oprzeć się na `Sheet` z `shadcn/ui` (podobnie jak `AISuggestionDrawer` i `WorkoutDetailDrawer`).  
   - Wewnątrz renderować `WorkoutPlanForm` z przekazaniem `trainingTypes` i `initialDate`.  
   - Obsłużyć `onSubmitSuccess` (zamknięcie + callback do `CalendarView`).

7. **Integracja z `CalendarView`**  
   - Dodać stan `isManualDrawerOpen` i `selectedManualDate`.  
   - Zaimplementować `handleAddWorkoutManual(date: Date)` otwierający drawer zamiast `alert`.  
   - Dodać `<ManualWorkoutDrawer>` obok istniejących drawerów (Day, AI, WorkoutDetail), przekazując `trainingTypes` i `refetch`.

8. **Obsługa błędów i toastów**  
   - Wykorzystać istniejący mechanizm toastów (jeśli jest) lub dodać prosty `ToastManager` (jeśli brak) do komunikatów sukcesu/błędów.  
   - Obsłużyć szczególnie przypadek `409 duplicate_position` oraz ogólne błędy serwera.

9. **Testy manualne i UX**  
   - Sprawdzić przepływy:
     - dodanie prostego planowanego treningu (1 krok),
     - dodanie treningu z wieloma krokami (sumowanie dystansu/czasu),
     - dodanie treningu ukończonego (z HR i ratingiem),
     - błędne wartości (za duży dystans/czas, brak dystansu/czasu w kroku),
     - konflikt pozycji (wymuszenie przez ręczną zmianę `position`).  
   - Upewnić się, że po sukcesie trening pojawia się w kalendarzu w poprawnym dniu i pozycji.

10. **Refaktoryzacja i reużycie (opcjonalne)**  
    - Rozważyć użycie `WorkoutPlanForm` / `StepsEditor` również w widokach edycji treningu lub onboardingu, jeśli zostanie to zaplanowane w przyszłości, aby uniknąć duplikacji logiki formularzy.


