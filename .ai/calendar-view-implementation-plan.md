# Plan implementacji widoku Kalendarza

## 1. Przegląd
Widok kalendarza jest głównym ekranem aplikacji, przeznaczonym do przeglądania planu treningowego. Umożliwia użytkownikom wizualizację zaplanowanych i ukończonych treningów w ujęciu tygodniowym lub miesięcznym. Widok ten pozwala na szybkie dodawanie nowych treningów generowanych przez AI oraz zarządzanie istniejącymi.

## 2. Routing widoku
Widok powinien być dostępny pod główną ścieżką aplikacji:
- **Ścieżka**: `/`
- **Komponent Astro**: `src/pages/index.astro`
- **Komponent React**: `src/components/views/CalendarView.tsx` (jako wyspa `client:load`)

## 3. Struktura komponentów
Hierarchia komponentów dla widoku kalendarza będzie następująca:

```
src/pages/index.astro
└── CalendarView.tsx (React Island)
    ├── useCalendar.ts (Custom Hook)
    ├── CalendarHeader.tsx
    │   ├── Button (Poprzedni okres)
    │   ├── Button (Następny okres)
    │   ├── DatePicker (Wybór daty)
    │   └── Switch (Tydzień/Miesiąc)
    ├── CalendarGrid.tsx
    │   └── DayCell.tsx[]
    │       ├── DropdownMenu (+)
    │       │   ├── MenuItem (Generuj z AI)
    │       │   └── MenuItem (Dodaj ręcznie)
    │       └── WorkoutCard.tsx[]
    ├── DayDrawer.tsx (renderowany warunkowo)
    │   └── WorkoutCard.tsx[]
    └── AISuggestionDrawer.tsx (renderowany warunkowo)
```

## 4. Szczegóły komponentów

### `CalendarView.tsx`
- **Opis komponentu**: Główny komponent-kontener dla widoku kalendarza. Zarządza całym stanem za pomocą hooka `useCalendar`, pobiera dane i renderuje komponenty podrzędne.
- **Główne elementy**: `<CalendarHeader />`, `<CalendarGrid />`, `<DayDrawer />`, `<AISuggestionDrawer />`.
- **Obsługiwane interakcje**: Brak bezpośrednich interakcji, deleguje obsługę do komponentów podrzędnych.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `CalendarViewModel`, `TrainingTypeDto[]`.
- **Propsy**: Brak.

### `CalendarHeader.tsx`
- **Opis komponentu**: Pasek nawigacyjny kalendarza zawierający przyciski do zmiany okresu, przełącznik widoku oraz selektor daty.
- **Główne elementy**: Komponenty `Button`, `Switch`, `DatePicker` z biblioteki `shadcn/ui`.
- **Obsługiwane interakcje**:
  - Kliknięcie przycisków "Poprzedni"/"Następny" (`onPeriodChange`).
  - Zmiana widoku "Tydzień"/"Miesiąc" (`onViewModeChange`).
  - Wybór daty w `DatePicker` (`onDateSelect`).
- **Obsługiwana walidacja**: `DatePicker` waliduje poprawność formatu daty.
- **Typy**: Brak specyficznych typów.
- **Propsy**:
  ```typescript
  interface CalendarHeaderProps {
    currentDate: Date;
    viewMode: 'month' | 'week';
    onPeriodChange: (direction: 'prev' | 'next') => void;
    onViewModeChange: (mode: 'month' | 'week') => void;
    onDateSelect: (date: Date) => void;
  }
  ```

### `CalendarGrid.tsx`
- **Opis komponentu**: Siatka wyświetlająca komórki dni dla wybranego okresu (tydzień/miesiąc). Odpowiada za logikę renderowania wszystkich dni w danym zakresie.
- **Główne elementy**: `<div>` z rolą `grid`, dynamicznie generowana lista komponentów `<DayCell />`.
- **Obsługiwane interakcje**: Nawigacja klawiaturą (strzałki) między komórkami.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `DayCellViewModel[]`.
- **Propsy**:
  ```typescript
  interface CalendarGridProps {
    days: DayCellViewModel[];
    onAddWorkout: (date: Date) => void;
    onAddWorkoutManual?: (date: Date) => void;
    onOpenDay: (day: DayCellViewModel) => void;
  }
  ```

### `DayCell.tsx`
- **Opis komponentu**: Reprezentuje pojedynczy dzień w siatce. Wyświetla karty treningów (`WorkoutCard`) lub menu `+` do wyboru sposobu dodawania nowego treningu.
- **Główne elementy**: `<div>` z rolą `gridcell`, lista `<WorkoutCard />`, `<DropdownMenu />` (`+`) z opcjami "Generuj z AI" i "Dodaj ręcznie", wskaźnik `+N więcej`.
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku `+` otwiera menu dropdown z opcjami:
    - "Generuj z AI" (`onAddWorkout`) - otwiera panel sugestii AI
    - "Dodaj ręcznie" (`onAddWorkoutManual`) - otwiera formularz ręcznego dodawania (w trakcie implementacji)
  - Kliknięcie komórki lub wskaźnika `+N więcej` w celu otwarcia `DayDrawer` (`onOpenDay`).
- **Obsługiwana walidacja**: Sprawdza liczbę treningów, aby zdecydować, czy wyświetlić wskaźnik `+N więcej`.
- **Typy**: `DayCellViewModel`.
- **Propsy**:
  ```typescript
  interface DayCellProps {
    day: DayCellViewModel;
    onAddWorkout: (date: Date) => void;
    onAddWorkoutManual?: (date: Date) => void;
    onOpenDay: (day: DayCellViewModel) => void;
  }
  ```

### `WorkoutCard.tsx`
- **Opis komponentu**: Mała karta reprezentująca pojedynczy trening. Pokazuje typ treningu (za pomocą koloru i nazwy), status oraz odznakę, jeśli pochodzi od AI.
- **Główne elementy**: Komponent `<Card />`, `<Badge />` z `shadcn/ui`.
- **Obsługiwane interakcje**: Kliknięcie karty może w przyszłości otwierać widok szczegółów. Zawiera menu kontekstowe (`DropdownMenu`) z akcjami (np. "Ukończ", "Pomiń").
- **Obsługiwana walidacja**: Brak.
- **Typy**: `WorkoutViewModel`.
- **Propsy**:
  ```typescript
  interface WorkoutCardProps {
    workout: WorkoutViewModel;
  }
  ```

## 5. Typy

### DTO (Data Transfer Objects) - typy z API
- `CalendarDto`: `{ range: { start: string; end: string }; days: CalendarDayDto[] }`
- `CalendarDayDto`: `{ date: string; workouts: CalendarWorkoutItemDto[] }`
- `CalendarWorkoutItemDto`: `{ id: string; training_type_code: string; status: "planned" | "completed" | ...; position: number }`
- `TrainingTypeDto`: `{ code: string; name: string; ... }`

### ViewModels - typy na potrzeby widoku
- **`WorkoutViewModel`**: Rozszerza `CalendarWorkoutItemDto` o pełne dane typu treningu i przypisany kolor.
  ```typescript
  interface WorkoutViewModel extends CalendarWorkoutItemDto {
    trainingType: TrainingTypeDto;
    color: string; // np. 'bg-blue-500', 'text-green-500'
  }
  ```
- **`DayCellViewModel`**: Agreguje dane dla pojedynczej komórki siatki kalendarza.
  ```typescript
  interface DayCellViewModel {
    date: Date;
    dateString: string; // YYYY-MM-DD
    isToday: boolean;
    isCurrentMonth: boolean;
    workouts: WorkoutViewModel[];
  }
  ```

## 6. Zarządzanie stanem
Do zarządzania logiką i stanem widoku kalendarza zostanie stworzony customowy hook `useCalendar`.

### `useCalendar(initialDate: Date)`
- **Cel**: Hermetyzacja logiki pobierania danych, zarządzania stanem widoku (data, tryb) oraz obsługi błędów.
- **Zarządzany stan**:
  - `viewDate: Date`: Data referencyjna dla aktualnie wyświetlanego widoku.
  - `viewMode: 'month' | 'week'`: Aktualny tryb wyświetlania.
  - `calendarDays: DayCellViewModel[]`: Przetworzona lista dni do wyświetlenia w siatce.
  - `isLoading: boolean`: Flaga informująca o stanie ładowania danych z API.
  - `error: ApiError | null`: Obiekt błędu w przypadku problemów z API.
  - `isDayDrawerOpen`, `isAiDrawerOpen`: Flagi do zarządzania widocznością paneli bocznych.
  - `selectedDay: DayCellViewModel | null`: Dane dla dnia otwartego w `DayDrawer`.
- **Funkcje publiczne**:
  - `setPeriod(direction: 'prev' | 'next')`: Zmienia okres na poprzedni/następny.
  - `setViewMode(mode: 'month' | 'week')`: Zmienia tryb widoku.
  - `setDate(date: Date)`: Ustawia konkretną datę.
  - `openDayDrawer(day: DayCellViewModel)`: Otwiera panel z listą treningów dnia.
  - `openAiDrawer(date: Date)`: Otwiera panel do generowania sugestii AI.
  - `refetch()`: Umożliwia ręczne odświeżenie danych.

## 7. Integracja API
- **Pobieranie danych kalendarza**:
  - **Endpoint**: `GET /api/v1/calendar`
  - **Akcja**: Wywoływane przy inicjalizacji komponentu oraz przy każdej zmianie `viewDate` lub `viewMode`.
  - **Request Query Params**: `{ start: string; end: string; }` (np. `start=2025-11-01&end=2025-11-30`).
  - **Response Body**: `ApiResponse<CalendarDto>`.
- **Pobieranie typów treningów**:
  - **Endpoint**: `GET /api/v1/training-types`
  - **Akcja**: Wywoływane jednorazowo przy inicjalizacji hooka `useCalendar`.
  - **Request Headers**: Frontend powinien zaimplementować `If-None-Match` z `ETag` w celu cache'owania odpowiedzi.
  - **Response Body**: `ApiListResponse<TrainingTypeDto>`.

## 8. Interakcje użytkownika
- **Zmiana okresu**: Kliknięcie strzałek w `CalendarHeader` wywołuje `setPeriod` z `useCalendar`, co powoduje przeliczenie zakresu dat i ponowne pobranie danych.
- **Zmiana widoku**: Wybór "Tydzień" lub "Miesiąc" w `CalendarHeader` wywołuje `setViewMode`, zmieniając tryb i pobierając dane dla nowego zakresu.
- **Dodawanie treningu**: Kliknięcie przycisku `+` w `DayCell` otwiera menu dropdown z dwoma opcjami:
  - **"Generuj z AI"**: Wywołuje `openAiDrawer` z `useCalendar`, otwierając `AISuggestionDrawer` dla wybranej daty.
  - **"Dodaj ręcznie"**: Wywołuje `handleAddWorkoutManual`, która obecnie wyświetla placeholder alert (formularz ręcznego dodawania w trakcie implementacji).
- **Przeglądanie dnia**: Kliknięcie komórki dnia z wieloma treningami (`+N więcej`) wywołuje `openDayDrawer`, co otwiera `DayDrawer` z listą wszystkich treningów danego dnia.
- **Nawigacja klawiaturą**: Użycie klawiszy strzałek w `CalendarGrid` powoduje zmianę focusu na sąsiednie komórki `DayCell`.

## 9. Warunki i walidacja
- **Zakres dat**: Hook `useCalendar` jest odpowiedzialny za generowanie poprawnego zakresu dat (`start`, `end` w formacie `YYYY-MM-DD`) na podstawie `viewDate` i `viewMode`.
- **Wyświetlanie `+N więcej`**: Komponent `DayCell` sprawdza, czy `workouts.length` przekracza zdefiniowany limit (np. 2). Jeśli tak, renderuje skróconą listę i wskaźnik.
- **Puste dni**: `DayCell` renderuje menu dropdown `+` z opcjami dodawania treningu, jeśli `workouts.length === 0`.
- **Dni poza miesiącem**: `DayCell` otrzymuje flagę `isCurrentMonth` i na jej podstawie renderuje się w stylu "wyszarzonym".
- **Dzisiejszy dzień**: `DayCell` otrzymuje flagę `isToday` i na jej podstawie renderuje wyróżnienie (np. obwódka lub tło).

## 10. Obsługa błędów
- **Ładowanie danych**: Podczas pobierania danych (`isLoading === true`) na siatce kalendarza wyświetlane są komponenty typu `Skeleton` (z `shadcn/ui`), aby zasygnalizować ładowanie.
- **Błędy API**:
  - **401 Unauthorized**: Aplikacja powinna globalnie przechwycić ten błąd i przekierować użytkownika na stronę logowania.
  - **403 Forbidden**: Wyświetlony zostanie komunikat typu `Toast` z informacją o braku uprawnień.
  - **422 Unprocessable Entity**: Błąd walidacji (np. nieprawidłowy format daty) powinien być logowany w konsoli deweloperskiej, a użytkownikowi można pokazać subtelny komunikat o błędzie.
  - **5xx Server Error**: Wyświetlony zostanie ogólny komunikat o błędzie (np. `Toast` lub dedykowany komponent błędu) z prośbą o spróbowanie ponownie później.
- **Brak danych**: Jeśli API zwróci pustą listę treningów, kalendarz po prostu wyświetli puste komórki z przyciskami `+`, co jest oczekiwanym zachowaniem.

## 11. Kroki implementacji
1. **Stworzenie struktury plików**: Utwórz pliki `src/pages/index.astro`, `src/components/views/CalendarView.tsx` oraz podkomponenty (`CalendarHeader`, `CalendarGrid`, `DayCell`, `WorkoutCard`) i hook `src/hooks/useCalendar.ts`.
2. **Implementacja `useCalendar`**: Zaimplementuj logikę zarządzania stanem, funkcje do zmiany daty/widoku oraz pobieranie i cachowanie danych z `/api/v1/training-types` i `/api/v1/calendar`.
3. **Budowa `CalendarView`**: Zintegruj hook `useCalendar` z głównym komponentem i przekaż stan oraz akcje do komponentów podrzędnych.
4. **Budowa `CalendarHeader`**: Stwórz komponent nagłówka z nawigacją, podpinając interakcje użytkownika do funkcji z hooka `useCalendar`.
5. **Budowa `CalendarGrid` i `DayCell`**: Zaimplementuj logikę renderowania siatki dni. `DayCell` powinien poprawnie wyświetlać treningi, przycisk `+` lub wskaźnik `+N więcej` na podstawie propsów.
6. **Budowa `WorkoutCard`**: Stwórz komponent karty treningu, który wyświetla dane na podstawie `WorkoutViewModel` i mapuje `training_type_code` na odpowiedni kolor.
7. **Obsługa paneli bocznych (`Drawer`)**: Dodaj logikę otwierania `DayDrawer` i `AISuggestionDrawer` na podstawie stanu zarządzanego w `useCalendar`.
8. **Styling i UX**: Zastosuj style TailwindCSS, dodaj skeletony ładowania, wyróżnienie dzisiejszego dnia oraz dni spoza miesiąca.
9. **Nawigacja klawiaturą**: Zaimplementuj obsługę klawiszy strzałek do poruszania się po `CalendarGrid`.
10. **Testowanie i poprawki**: Przetestuj wszystkie interakcje, obsługę błędów i przypadki brzegowe (np. miesiąc bez treningów, dzień z dużą liczbą treningów).

