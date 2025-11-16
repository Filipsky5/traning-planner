# Plan implementacji widoku: Szczegóły treningu

## 1. Przegląd

Widok szczegółów treningu stanowi centralny punkt do zarządzania pojedynczą jednostką treningową. Umożliwia użytkownikowi wgląd w zaplanowane i zrealizowane metryki, strukturę treningu (kroki) oraz wykonanie kluczowych akcji, takich jak oznaczenie treningu jako ukończony, pominięty, anulowany czy jego ocena. Widok jest w pełni dynamiczny i dostosowuje dostępne akcje do aktualnego statusu treningu.

## 2. Routing widoku

Widok będzie dostępny pod dynamiczną ścieżką:
- **Ścieżka**: `/workouts/[id]`
- **Plik**: `src/pages/workouts/[id].astro`

Strona Astro będzie odpowiedzialna za przechwycenie `id` z URL i przekazanie go jako prop do głównego komponentu React, który będzie renderowany po stronie klienta.

## 3. Struktura komponentów

Komponenty zostaną zaimplementowane w React z użyciem TypeScript, a ich stylizacja będzie oparta na Tailwind CSS i komponentach `shadcn/ui`.

```
src/pages/workouts/[id].astro
└── src/components/views/WorkoutDetailView.tsx (client:load)
    ├── hooks/useWorkoutDetail.ts
    ├── WorkoutMetrics.tsx
    ├── WorkoutSteps.tsx
    ├── WorkoutActions.tsx
    │   ├── CompleteWorkoutDialog.tsx
    │   └── RateWorkoutDialog.tsx
    └── ui/
        ├── Skeleton.tsx
        ├── Card.tsx
        ├── Button.tsx
        └── Dialog.tsx
```

## 4. Szczegóły komponentów

### `WorkoutDetailView.tsx`
- **Opis**: Główny kontener widoku. Odpowiada za pobranie danych treningu za pomocą `id`, zarządzanie stanem (ładowanie, błąd, dane) i renderowanie komponentów podrzędnych.
- **Główne elementy**:
  - Wykorzystuje hook `useWorkoutDetail` do logiki biznesowej.
  - Renderuje `Skeleton` w stanie ładowania.
  - Wyświetla komunikat o błędzie w przypadku problemów z API.
  - Renderuje `WorkoutMetrics`, `WorkoutSteps` i `WorkoutActions`, przekazując do nich przetworzone dane treningu (`WorkoutViewModel`) oraz handlery akcji.
- **Obsługiwane interakcje**: Brak bezpośrednich. Deleguje akcje do komponentów-dzieci.
- **Typy**: `WorkoutViewModel`
- **Propsy**: `{ workoutId: string }`

### `WorkoutMetrics.tsx`
- **Opis**: Prezentuje kluczowe metryki treningu, porównując wartości planowane z rzeczywistymi (jeśli dostępne).
- **Główne elementy**:
  - Komponent `Card` z `CardHeader` i `CardContent`.
  - Sekcje "Plan" i "Realizacja".
  - Wyświetla numerycznie: dystans (km), czas (hh:mm:ss), średnie tętno, średnie tempo (min/km), ocenę.
- **Obsługiwane interakcje**: Brak.
- **Typy**: `WorkoutViewModel`
- **Propsy**: `{ workout: WorkoutViewModel }`

### `WorkoutSteps.tsx`
- **Opis**: Wyświetla listę kroków treningu (rozgrzewka, część główna, schłodzenie).
- **Główne elementy**:
  - Komponent `Card`.
  - Lista kroków, gdzie każdy element pokazuje `part`, `duration_s` i/lub `distance_m`.
- **Obsługiwane interakcje**: Brak.
- **Typy**: `WorkoutStepDto[]`
- **Propsy**: `{ steps: WorkoutStepDto[] }`

### `WorkoutActions.tsx`
- **Opis**: Panel z przyciskami akcji. Przyciski są renderowane warunkowo, w zależności od statusu treningu.
- **Główne elementy**:
  - `Button` z `shadcn/ui` dla każdej akcji.
  - Przycisk "Ukończ" (`Complete`) otwiera `CompleteWorkoutDialog`.
  - Przycisk "Oceń" (`Rate`) otwiera `RateWorkoutDialog`.
  - Przyciski "Pomiń" (`Skip`) i "Anuluj" (`Cancel`) wywołują akcje natychmiastowo.
- **Obsługiwane interakcje**: `onComplete`, `onRate`, `onSkip`, `onCancel`.
- **Warunki walidacji**:
  - "Ukończ", "Pomiń", "Anuluj" widoczne tylko dla `status === 'planned'`.
  - "Oceń" widoczne tylko dla `status === 'completed'`.
- **Typy**: `WorkoutViewModel`
- **Propsy**: `{ workout: WorkoutViewModel, onComplete: (data) => void, onRate: (data) => void, onSkip: () => void, onCancel: () => void }`

### `CompleteWorkoutDialog.tsx`
- **Opis**: Okno dialogowe z formularzem do wprowadzania metryk ukończonego treningu.
- **Główne elementy**:
  - Komponent `Dialog` z `DialogContent`, `DialogHeader`, `DialogFooter`.
  - Formularz (`react-hook-form`) z polami: `distance_m`, `duration_s`, `avg_hr_bpm`, `completed_at`, `rating`.
- **Obsługiwane interakcje**: `onSubmit`.
- **Warunki walidacji**: Wszystkie pola formularza są wymagane (`zod` schema `completeWorkoutSchema`).
- **Typy**: `CompleteWorkoutCommand`
- **Propsy**: `{ open: boolean, onOpenChange: (open) => void, onSubmit: (data) => void }`

### `RateWorkoutDialog.tsx`
- **Opis**: Okno dialogowe do oceniania ukończonego treningu.
- **Główne elementy**:
  - `Dialog` z `DialogContent`.
  - Przyciski lub `RadioGroup` do wyboru oceny: `too_easy`, `just_right`, `too_hard`.
- **Obsługiwane interakcje**: `onRateSelect`.
- **Warunki walidacji**: Musi zostać wybrana jedna z trzech opcji oceny.
- **Typy**: `WorkoutRateCommand`
- **Propsy**: `{ open: boolean, onOpenChange: (open) => void, onSubmit: (data) => void }`

## 5. Typy

### DTO (Data Transfer Object)
- **`WorkoutDetailDto`**: Bezpośrednio z `src/types.ts`. Odzwierciedla odpowiedź z `GET /api/v1/workouts/{id}`.

### ViewModel
- **`WorkoutViewModel`**: Obiekt tworzony na froncie w celu ułatwienia wyświetlania danych.
```typescript
interface WorkoutViewModel {
  id: string;
  status: 'planned' | 'completed' | 'skipped' | 'canceled';
  origin: 'manual' | 'ai' | 'import';
  rating: 'too_easy' | 'just_right' | 'too_hard' | null;
  
  // Pola sformatowane do wyświetlania
  plannedDateFormatted: string; // "DD.MM.YYYY"
  completedAtFormatted: string | null; // "DD.MM.YYYY HH:mm"
  plannedDistanceFormatted: string; // "X.XX km"
  distanceFormatted: string | null; // "X.XX km"
  plannedDurationFormatted: string; // "HH:mm:ss"
  durationFormatted: string | null; // "HH:mm:ss"
  avgPaceFormatted: string | null; // "X:XX min/km"
  avgHr: number | null;
  
  // Pola do logiki
  steps: WorkoutStepDto[];
  canBeCompleted: boolean;
  canBeRated: boolean;
  canBeSkipped: boolean;
  canBeCanceled: boolean;
}
```

## 6. Zarządzanie stanem

Logika biznesowa zostanie zamknięta w customowym hooku `useWorkoutDetail`.

### `useWorkoutDetail(workoutId: string)`
- **Cel**: Hermetyzacja logiki pobierania danych, zarządzania stanem ładowania/błędu oraz wykonywania akcji na treningu.
- **Zwraca**:
  ```typescript
  {
    workout: WorkoutViewModel | null;
    isLoading: boolean;
    error: Error | null;
    completeWorkout: (data: CompleteWorkoutCommand) => Promise<void>;
    rateWorkout: (data: WorkoutRateCommand) => Promise<void>;
    skipWorkout: () => Promise<void>;
    cancelWorkout: () => Promise<void>;
    refetch: () => void;
  }
  ```
- **Logika**:
  - Używa `useEffect` do pobrania danych przy inicjalizacji.
  - Przechowuje stan `workout`, `isLoading`, `error` za pomocą `useState`.
  - Po każdej pomyślnej akcji modyfikującej (np. `completeWorkout`), wywołuje `refetch` w celu synchronizacji danych z serwerem.

## 7. Integracja API

Integracja będzie realizowana przez `fetch` API wewnątrz hooka `useWorkoutDetail`.

- **Pobieranie danych**:
  - `GET /api/v1/workouts/{id}`
  - **Odpowiedź**: `ApiResponse<WorkoutDetailDto>`
- **Ukończenie treningu**:
  - `POST /api/v1/workouts/{id}/complete`
  - **Żądanie**: `CompleteWorkoutCommand` (`{ distance_m, duration_s, avg_hr_bpm, completed_at, rating }`)
  - **Odpowiedź**: `ApiResponse<WorkoutDetailDto>`
- **Ocena treningu**:
  - `POST /api/v1/workouts/{id}/rate`
  - **Żądanie**: `WorkoutRateCommand` (`{ rating }`)
  - **Odpowiedź**: `ApiResponse<WorkoutDetailDto>`
- **Pominięcie treningu**:
  - `POST /api/v1/workouts/{id}/skip`
  - **Żądanie**: Brak (puste body)
  - **Odpowiedź**: `ApiResponse<WorkoutDetailDto>`
- **Anulowanie treningu**:
  - `POST /api/v1/workouts/{id}/cancel`
  - **Żądanie**: Brak (puste body)
  - **Odpowiedź**: `ApiResponse<WorkoutDetailDto>`

## 8. Interakcje użytkownika

- **Wejście na stronę**: Wyświetla się `Skeleton`, następuje pobranie danych. Po załadowaniu, widoczne są metryki i odpowiednie przyciski akcji.
- **Kliknięcie "Ukończ"**: Otwiera się `CompleteWorkoutDialog`. Użytkownik wypełnia formularz i zatwierdza. Po pomyślnej odpowiedzi API, widok jest odświeżany, status zmienia się na "completed", a metryki realizacji są widoczne.
- **Kliknięcie "Oceń"**: Otwiera się `RateWorkoutDialog`. Użytkownik wybiera ocenę. Po pomyślnej odpowiedzi API, ocena pojawia się w metrykach.
- **Kliknięcie "Pomiń" / "Anuluj"**: Akcja jest wykonywana natychmiast. Wyświetlany jest toast z potwierdzeniem, a widok odświeża się, pokazując nowy status.

## 9. Warunki i walidacja

- **`WorkoutActions.tsx`**: Logika `canBeCompleted`, `canBeRated` itd. z `WorkoutViewModel` jest używana do warunkowego renderowania przycisków. Zapewnia to, że użytkownik nie może wykonać nieprawidłowej akcji.
- **`CompleteWorkoutDialog.tsx`**: Formularz użyje `zod` i `react-hook-form` do walidacji pól zgodnie ze schemą `completeWorkoutSchema` z `src/lib/validation/workouts.ts`. Walidacja obejmuje:
  - `distance_m`, `duration_s`, `avg_hr_bpm`, `completed_at` są wymagane.
  - Wartości numeryczne muszą być w określonych przedziałach (np. `min`, `max`).
- **`RateWorkoutDialog.tsx`**: Walidacja zapewnia, że wybrana ocena jest jedną z dozwolonych wartości enum.

## 10. Obsługa błędów

- **Błąd 404 (Not Found)**: Jeśli API zwróci 404, `WorkoutDetailView` wyświetli komunikat "Nie znaleziono treningu" z przyciskiem powrotu do kalendarza.
- **Błąd 401 (Unauthorized)**: Globalny mechanizm powinien przechwycić ten błąd i przekierować na stronę logowania.
- **Błąd 409 (Conflict)**: Wystąpi, gdy użytkownik spróbuje wykonać akcję na treningu w nieprawidłowym stanie (np. ukończyć już ukończony). Hook `useWorkoutDetail` przechwyci błąd, a UI poinformuje użytkownika o problemie za pomocą komponentu Toast (np. "Trening nie jest już w stanie 'planowany'").
- **Błąd 422 (Validation)**: Błędy walidacji z formularza `CompleteWorkoutDialog` będą wyświetlane bezpośrednio pod odpowiednimi polami formularza.
- **Inne błędy serwera (5xx)**: Wyświetlony zostanie ogólny komunikat o błędzie z przyciskiem "Spróbuj ponownie", który wywoła funkcję `refetch` z hooka `useWorkoutDetail`.

## 11. Kroki implementacji

1. **Stworzenie plików**: Utworzenie wszystkich wymaganych plików komponentów, hooka i strony Astro w odpowiednich katalogach (`src/pages/workouts/`, `src/components/views/`, `src/components/hooks/`).
2. **Implementacja strony Astro**: Stworzenie `src/pages/workouts/[id].astro`, która pobiera `id` z URL i renderuje `WorkoutDetailView` z `client:load`.
3. **Implementacja hooka `useWorkoutDetail`**: Zaimplementowanie logiki pobierania danych (`GET`), stanów `loading`/`error` oraz przygotowanie pustych funkcji do obsługi akcji.
4. **Implementacja `WorkoutDetailView`**: Połączenie hooka z komponentem, wyświetlanie `Skeleton`, obsługa stanu błędu.
5. **Implementacja `WorkoutMetrics` i `WorkoutSteps`**: Stworzenie komponentów czysto prezentacyjnych, które przyjmują dane z `WorkoutViewModel`.
6. **Implementacja `WorkoutActions`**: Stworzenie przycisków akcji z logiką warunkowego renderowania.
7. **Implementacja `CompleteWorkoutDialog`**: Zbudowanie formularza z walidacją `react-hook-form` i `zod`.
8. **Implementacja `RateWorkoutDialog`**: Zbudowanie prostego dialogu do wyboru oceny.
9. **Integracja API w hooku**: Zaimplementowanie logiki wywołań API dla akcji `complete`, `rate`, `skip`, `cancel`. Po każdej udanej operacji, wywołanie `refetch`.
10. **Obsługa błędów i toastów**: Dodanie obsługi błędów API i wyświetlanie toastów informujących o sukcesie lub porażce akcji.
11. **Finalne stylowanie i testy**: Dopracowanie wyglądu za pomocą Tailwind CSS i manualne przetestowanie wszystkich ścieżek użytkownika.

