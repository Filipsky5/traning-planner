# Plan implementacji widoku Onboarding

## 1. Przegląd
Widok Onboarding ma na celu zebranie od nowego użytkownika danych o jego trzech ostatnich aktywnościach treningowych. Informacje te posłużą jako początkowa baza dla AI do generowania przyszłych sugestii treningowych. Widok składa się z 3-krokowego formularza, w którym użytkownik wprowadza podstawowe metryki każdego z treningów: dystans, czas trwania, średnie tętno oraz datę. Proces ten jest obowiązkowy dla nowych użytkowników i stanowi warunek dostępu do głównej części aplikacji.

## 2. Routing widoku
- **Ścieżka**: `/onboarding`
- **Logika dostępu**:
    - Nowi użytkownicy (mający mniej niż 3 zarejestrowane treningi) próbujący uzyskać dostęp do ścieżki `/` (strona główna) powinni być automatycznie przekierowani do `/onboarding`.
    - Przekierowanie powinno zachować oryginalny cel w URL, np. `/onboarding?next=/calendar`.
    - Logika przekierowania zostanie zaimplementowana w middleware aplikacji (`src/middleware/index.ts`).

## 3. Struktura komponentów
Komponenty zostaną zaimplementowane w React i osadzone na stronie Astro jako "wyspa" (island).

```
/src/pages/onboarding.astro
└── /src/components/views/OnboardingView.tsx (client:load)
    ├── /src/components/onboarding/Stepper.tsx
    ├── <h2> (tytuł kroku, np. "Trening 1 z 3")
    └── /src/components/onboarding/WorkoutOnboardingForm.tsx
        ├── /src/components/ui/input.tsx (dystans)
        ├── /src/components/onboarding/DurationInput.tsx (czas trwania HH:MM:SS)
        ├── /src/components/ui/input.tsx (średnie tętno)
        ├── /src/components/ui/datepicker.tsx (data treningu)
        ├── /src/components/ui/button.tsx (przycisk "Dalej" / "Zakończ")
        └── /src/components/ui/sonner.tsx (komunikaty o błędach API)
```

## 4. Szczegóły komponentów

### `OnboardingView.tsx`
- **Opis**: Główny komponent-kontener zarządzający całym procesem onboardingu. Odpowiada za stan formularza, nawigację między krokami oraz komunikację z API.
- **Główne elementy**: Wyświetla komponent `Stepper` oraz `WorkoutOnboardingForm` dla aktualnego kroku.
- **Obsługiwane interakcje**: Przechwycenie zdarzenia `onSubmit` z formularza `WorkoutOnboardingForm`.
- **Typy**: `WorkoutOnboardingFormViewModel`, `CreateCompletedWorkoutDto`.
- **Propsy**: `nextUrl: string` (opcjonalny, do przekierowania po zakończeniu).

### `Stepper.tsx`
- **Opis**: Prosty komponent wizualny wskazujący postęp w procesie (np. "Krok 2 z 3").
- **Główne elementy**: Seria elementów `<div>` lub `<span>` stylizowanych w zależności od tego, czy krok jest aktywny, ukończony, czy oczekujący.
- **Obsługiwane interakcje**: Brak.
- **Typy**: Brak.
- **Propsy**: `currentStep: number`, `totalSteps: number`.

### `WorkoutOnboardingForm.tsx`
- **Opis**: Formularz do wprowadzenia danych pojedynczego treningu. Będzie reużywany dla każdego z trzech kroków.
- **Główne elementy**: Pola `<Input>` dla dystansu i tętna, niestandardowy komponent `DurationInput` dla czasu, `DatePicker` dla daty i przycisk `Button` do przesyłania danych.
- **Obsługiwane interakcje**: `onSubmit` (wysyła dane do rodzica `OnboardingView`), `onChange` na polach formularza.
- **Warunki walidacji**:
    - `dystans`: musi być liczbą dodatnią, większą od 0.1 km.
    - `czas trwania`: co najmniej jedna z wartości (godziny, minuty, sekundy) musi być większa od 0. Całkowity czas musi być większy niż 60 sekund.
    - `średnie tętno`: musi być liczbą całkowitą w zakresie 40-220.
    - `data treningu`: musi być datą z przeszłości.
- **Typy**: `WorkoutOnboardingFormViewModel`.
- **Propsy**: `onSubmit: (data: WorkoutOnboardingFormViewModel) => void`, `isLoading: boolean`, `stepNumber: number`.

### `DurationInput.tsx`
- **Opis**: Niestandardowy komponent do wprowadzania czasu trwania w segmentach (godziny, minuty, sekundy), ułatwiający użytkownikowi wprowadzanie danych.
- **Główne elementy**: Trzy pola `<Input type="number">` dla HH, MM, SS z odpowiednimi etykietami.
- **Obsługiwane interakcje**: `onChange` na każdym polu, przekazując obiekt `{ hours, minutes, seconds }` do formularza.
- **Typy**: `DurationState = { hours: string; minutes: string; seconds: string; }`.
- **Propsy**: `value: DurationState`, `onChange: (value: DurationState) => void`, `disabled: boolean`.

## 5. Typy

### `WorkoutOnboardingFormViewModel` (ViewModel)
Typ reprezentujący stan formularza w komponencie `WorkoutOnboardingForm`.

```typescript
interface WorkoutOnboardingFormViewModel {
  distanceKm: string;
  duration: {
    hours: string;
    minutes: string;
    seconds: string;
  };
  avgHr: string;
  completedAt: Date;
}
```

### `CreateCompletedWorkoutDto` (DTO)
Obiekt transferu danych, który zostanie wysłany do API. Będzie on tworzony na podstawie `WorkoutOnboardingFormViewModel`. Pola, których nie podaje użytkownik, zostaną uzupełnione domyślnymi wartościami.

```typescript
// Zgodny z createWorkoutSchema w /src/lib/validation/workouts.ts
interface CreateCompletedWorkoutDto {
  training_type_code: string;       // Uzupełnione: 'easy'
  planned_date: string;             // Uzupełnione: data z completed_at (format YYYY-MM-DD)
  position: number;                 // Uzupełnione: 1
  planned_distance_m: number;       // Uzupełnione: równe distance_m
  planned_duration_s: number;       // Uzupełnione: równe duration_s
  steps: Array<{                    // Uzupełnione: jeden krok 'main'
    part: 'main';
    distance_m: number;
    duration_s: number;
  }>;
  status: 'completed';              // Uzupełnione: stała wartość
  distance_m: number;               // Z formularza
  duration_s: number;               // Z formularza
  avg_hr_bpm: number;               // Z formularza
  completed_at: string;             // Z formularza (format ISO)
  rating: 'just_right';             // Uzupełnione: domyślna ocena dla treningów startowych
}
```

## 6. Zarządzanie stanem
Do zarządzania logiką wieloetapowego formularza zostanie stworzony niestandardowy hook `useOnboarding`.

### `useOnboarding(nextUrl?: string)`
- **Cel**: Hermetyzacja logiki stanu, nawigacji między krokami i wysyłania danych.
- **Zarządzany stan**:
    - `currentStep: number`: Aktualny krok (1-3).
    - `workouts: CreateCompletedWorkoutDto[]`: Tablica przechowująca dane trzech treningów.
    - `isLoading: boolean`: Flaga informująca o trwającym procesie wysyłania danych do API.
- **Zwracane funkcje**:
    - `handleFormSubmit(data: WorkoutOnboardingFormViewModel)`: Funkcja wywoływana po zatwierdzeniu formularza. Waliduje dane, transformuje je do DTO, dodaje do tablicy `workouts` i przechodzi do kolejnego kroku. W ostatnim kroku inicjuje wysyłkę wszystkich trzech treningów.
    - `currentWorkoutData: WorkoutOnboardingFormViewModel`: Dane do pre-populacji formularza (gdybyśmy chcieli wracać do kroków).

## 7. Integracja API
- **Endpoint**: `POST /api/v1/workouts`
- **Proces**:
    1. Po ukończeniu trzeciego kroku, funkcja `handleFormSubmit` z haka `useOnboarding` zostanie wywołana.
    2. Hook zainicjuje wysłanie trzech żądań `POST` do `/api/v1/workouts`, używając `Promise.all` do ich równoległego wykonania. Każde żądanie będzie zawierało DTO jednego treningu.
    3. Na czas trwania operacji, flaga `isLoading` będzie ustawiona na `true`, co spowoduje zablokowanie przycisku w formularzu.
- **Typy żądania**: `CreateCompletedWorkoutDto` (zgodnie z `createWorkoutSchema`).
- **Typy odpowiedzi**: `ApiResponse<WorkoutDetailDto>` (status `201 Created`).

## 8. Interakcje użytkownika
- **Wypełnianie formularza**: Użytkownik wprowadza dane w polach. Walidacja odbywa się na bieżąco po utracie fokusu lub przy próbie przejścia dalej.
- **Kliknięcie "Dalej"**: Dane są walidowane. Jeśli są poprawne, stan `currentStep` jest inkrementowany, a formularz jest czyszczony i gotowy na dane kolejnego treningu. Jeśli nie, wyświetlane są błędy walidacji.
- **Kliknięcie "Zakończ" (w ostatnim kroku)**: Dane są walidowane. Jeśli są poprawne, rozpoczyna się wysyłka do API. Przycisk jest blokowany. Po pomyślnym zakończeniu, użytkownik jest przekierowywany na stronę główną (`/`) lub pod adres z parametru `next`.
- **Błąd API**: Jeśli którakolwiek z operacji `POST` zakończy się błędem, użytkownik zobaczy komunikat (np. toast/sonner) z informacją o problemie i możliwością ponowienia próby.

## 9. Warunki i walidacja
- **Poziom komponentu**: `WorkoutOnboardingForm` będzie używać biblioteki `zod` do walidacji `WorkoutOnboardingFormViewModel` przed wysłaniem go do rodzica. Błędy będą wyświetlane pod odpowiednimi polami.
- **Mapowanie na DTO**: Frontend zapewni, że wszystkie wymagane przez `createWorkoutSchema` pola zostaną poprawnie uzupełnione, nawet jeśli użytkownik ich nie podał (np. `planned_distance_m` przyjmie wartość `distance_m`).
    - `distanceKm` zostanie przeliczone na `distance_m` (km * 1000).
    - `{ hours, minutes, seconds }` zostaną przeliczone na `duration_s`.
- **Warunki biznesowe**: Aplikacja wymusza dodanie dokładnie 3 treningów poprzez mechanizm kroków.

## 10. Obsługa błędów
- **Błędy walidacji formularza**: Wyświetlanie komunikatów o błędach bezpośrednio pod polami formularza, które nie przeszły walidacji. Stan błędu będzie zarządzany wewnątrz `WorkoutOnboardingForm`.
- **Błędy sieciowe / serwera (API)**: W przypadku błędu podczas wysyłania danych (np. status 500, brak połączenia), komponent `OnboardingView` wyświetli globalny komunikat za pomocą `sonner` (toast) z prośbą o ponowienie próby. Flaga `isLoading` zostanie ustawiona na `false`, odblokowując przycisk "Zakończ".
- **Błąd walidacji po stronie serwera (422)**: Chociaż walidacja po stronie klienta powinna temu zapobiegać, w razie wystąpienia zostanie obsłużony jak standardowy błąd serwera, z komunikatem dla użytkownika.

## 11. Kroki implementacji
1.  **Modyfikacja Middleware**: Zaktualizuj plik `src/middleware/index.ts`, dodając logikę sprawdzającą liczbę treningów użytkownika. Jeśli jest ich mniej niż 3, a żądanie nie dotyczy `/onboarding` (ani powiązanych zasobów statycznych/api), wykonaj przekierowanie `307 Temporary Redirect` do `/onboarding`.
2.  **Stworzenie strony i komponentów szkieletowych**: Utwórz plik `src/pages/onboarding.astro` oraz pliki dla komponentów React: `OnboardingView.tsx`, `Stepper.tsx`, `WorkoutOnboardingForm.tsx`, `DurationInput.tsx`.
3.  **Implementacja `DurationInput`**: Zbuduj niestandardowy, w pełni funkcjonalny komponent do wprowadzania czasu w segmentach.
4.  **Implementacja `WorkoutOnboardingForm`**: Zbuduj formularz z polami, walidacją po stronie klienta przy użyciu `zod` oraz obsługą stanu `isLoading`.
5.  **Implementacja haka `useOnboarding`**: Stwórz logikę zarządzania stanem, krokami oraz transformacją danych z `ViewModel` na `DTO`.
6.  **Implementacja `OnboardingView`**: Zintegruj wszystkie komponenty, użyj haka `useOnboarding` i obsłuż logikę wysyłania danych do API za pomocą `Promise.all`. Dodaj obsługę błędów API za pomocą `sonner`.
7.  **Stylowanie**: Ostyluj wszystkie komponenty za pomocą Tailwind CSS, zgodnie z systemem designu aplikacji (shadcn/ui).
8.  **Testowanie manualne**: Przetestuj cały przepływ:
    - Przekierowanie dla nowego użytkownika.
    - Walidację formularza na każdym kroku.
    - Poprawne działanie przycisku "Dalej" i "Zakończ".
    - Obsługę błędów API.
    - Poprawne przekierowanie po pomyślnym zakończeniu onboardingu.

