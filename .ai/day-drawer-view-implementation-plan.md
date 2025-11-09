# Plan implementacji widoku Day Drawer

## 1. Przegląd
Widok "Day Drawer" to wysuwany panel (drawer/sheet), który służy do wyświetlania i zarządzania wszystkimi treningami zaplanowanymi na konkretny, wybrany przez użytkownika dzień. Celem jest zapewnienie szybkiego dostępu do listy treningów bez opuszczania głównego widoku kalendarza, co jest kluczowe, gdy na jeden dzień przypada więcej niż jeden trening. Widok ten umożliwi również wykonywanie szybkich akcji, takich jak pominięcie lub anulowanie treningu.

## 2. Routing widoku
Widok nie będzie posiadał dedykowanej ścieżki URL. Będzie renderowany jako komponent-nakładka (overlay) na głównym widoku kalendarza, dostępnym pod ścieżką `/`. Jego widoczność będzie kontrolowana stanem w komponencie nadrzędnym.

## 3. Struktura komponentów
Hierarchia komponentów zostanie zbudowana w oparciu o React i `shadcn/ui`, aby zapewnić spójność z resztą aplikacji.

```
- CalendarView (komponent nadrzędny, zarządzający stanem)
  - DayDrawer (komponent kontenerowy oparty na `shadcn/ui/Sheet`)
    - DayDrawerContent (komponent prezentacyjny)
      - Header (tytuł z datą)
      - LoadingSpinner (wyświetlany podczas ładowania danych)
      - ErrorMessage (wyświetlany w przypadku błędu API)
      - WorkoutList (lista treningów)
        - WorkoutCard (kompaktowa wersja karty treningu)
          - QuickActions (przyciski szybkich akcji)
```

## 4. Szczegóły komponentów

### DayDrawer
- **Opis komponentu:** Główny kontener widoku, zbudowany przy użyciu `Sheet` z `shadcn/ui`. Odpowiada za zarządzanie stanem otwarcia/zamknięcia, przyjmowanie wybranej daty i inicjowanie pobierania danych z API za pomocą customowego hooka `useDayWorkouts`.
- **Główne elementy:** `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` z `shadcn/ui`.
- **Obsługiwane interakcje:** Otwarcie panelu, zamknięcie panelu (przez przycisk, gest lub kliknięcie na zewnątrz).
- **Obsługiwana walidacja:** Brak.
- **Typy:** `WorkoutSummaryDto` (dla listy treningów).
- **Propsy:**
  - `selectedDate: string | null` - Wybrana data w formacie `YYYY-MM-DD`. Drawer jest widoczny, gdy data nie jest `null`.
  - `onOpenChange: (isOpen: boolean) => void` - Funkcja zwrotna do kontrolowania widoczności z poziomu komponentu nadrzędnego.

### DayDrawerContent
- **Opis komponentu:** Komponent odpowiedzialny za renderowanie zawartości wewnątrz drawera. Wyświetla nagłówek z datą, a w zależności od stanu (ładowanie, błąd, sukces) pokazuje odpowiednio: spinner, komunikat błędu lub listę treningów.
- **Główne elementy:** `div` z logiką warunkową, komponenty `LoadingSpinner`, `ErrorMessage` oraz `WorkoutList`.
- **Obsługiwane interakcje:** Brak.
- **Obsługiwana walidacja:** Brak.
- **Typy:** `WorkoutSummaryDto[]`.
- **Propsy:**
  - `date: string`
  - `workouts: WorkoutSummaryDto[]`
  - `isLoading: boolean`
  - `error: Error | null`

### WorkoutList
- **Opis komponentu:** Renderuje listę komponentów `WorkoutCard` na podstawie przekazanej tablicy treningów.
- **Główne elementy:** `ul`, `li` lub `div` mapujący po tablicy treningów.
- **Obsługiwane interakcje:** Brak (deleguje obsługę do `WorkoutCard`).
- **Obsługiwana walidacja:** Brak.
- **Typy:** `WorkoutSummaryDto[]`.
- **Propsy:**
  - `workouts: WorkoutSummaryDto[]`

### WorkoutCard (wariant kompaktowy)
- **Opis komponentu:** Wyświetla podsumowanie pojedynczego treningu w kompaktowej formie, zawierające jego typ (nazwa i kolor), planowany dystans/czas, status oraz komponent `QuickActions`.
- **Główne elementy:** `Card` z `shadcn/ui`, `div`, `span`, komponenty `Badge` i `Button`.
- **Obsługiwane interakcje:** Kliknięcie karty (nawigacja do szczegółów), kliknięcie akcji w `QuickActions`.
- **Obsługiwana walidacja:** Dostępność szybkich akcji zależy od statusu treningu (np. `status === 'planned'`).
- **Typy:** `WorkoutSummaryDto`.
- **Propsy:**
  - `workout: WorkoutSummaryDto`

## 5. Typy
Widok będzie korzystał bezpośrednio z istniejącego typu `WorkoutSummaryDto` zdefiniowanego w `src/types.ts`. Nie ma potrzeby tworzenia nowych typów ani modeli `ViewModel`.

- **`WorkoutSummaryDto`**:
  - `id: string` - Unikalny identyfikator.
  - `training_type_code: string` - Kod typu treningu (np. "easy", "long_run").
  - `planned_date: string` - Data w formacie `YYYY-MM-DD`.
  - `position: number` - Kolejność treningu w danym dniu.
  - `planned_distance_m: number | null` - Planowany dystans.
  - `planned_duration_s: number | null` - Planowany czas.
  - `status: 'planned' | 'completed' | 'skipped' | 'canceled'` - Status treningu.
  - `origin: 'manual' | 'ai' | 'import'` - Źródło pochodzenia treningu.
  - `rating: 'too_easy' | 'just_right' | 'too_hard' | null` - Ocena.
  - `avg_pace_s_per_km: number | null` - Średnie tempo.

## 6. Zarządzanie stanem
Do enkapsulacji logiki pobierania danych, stanu ładowania i obsługi błędów zostanie stworzony dedykowany custom hook `useDayWorkouts`.

- **`useDayWorkouts(date: string | null)`**:
  - **Cel:** Abstrakcja logiki biznesowej związanej z pobieraniem treningów na dany dzień.
  - **Zarządzany stan:** `workouts: WorkoutSummaryDto[]`, `isLoading: boolean`, `error: Error | null`.
  - **Logika:** Używa `useEffect` do wywołania API, gdy prop `date` ulegnie zmianie. Zarządza stanami ładowania i błędów. Może również udostępniać funkcje do optymistycznego uaktualniania UI (np. usunięcie treningu z listy po anulowaniu).

Stan widoczności samego drawera (`isOpen`) oraz wybrana data (`selectedDate`) będą zarządzane w komponencie nadrzędnym (np. `CalendarView`), aby umożliwić interakcję między kalendarzem a drawerem.

## 7. Integracja API
Komponent będzie komunikował się z jednym endpointem API.

- **Endpoint:** `GET /api/v1/workouts`
- **Typ żądania:**
  - **Metoda:** `GET`
  - **Parametry zapytania (query params):**
    - `planned_date_gte`: `YYYY-MM-DD` (wybrana data)
    - `planned_date_lte`: `YYYY-MM-DD` (ta sama wybrana data)
    - `per_page`: `50` (ustawienie dużej wartości, aby pobrać wszystkie treningi z dnia bez paginacji)
- **Typ odpowiedzi (sukces):** `ApiListResponse<WorkoutSummaryDto>`
- **Typ odpowiedzi (błąd):** `{ error: { code: string, message: string } }`

## 8. Interakcje użytkownika
- **Użytkownik klika na dzień w kalendarzu:** Otwiera `DayDrawer`, przekazując do niego klikniętą datę.
- **Użytkownik klika przycisk zamknięcia lub tło:** Zamyka `DayDrawer`.
- **Użytkownik klika na kartę treningu:** Nawigacja do pełnego widoku szczegółów tego treningu (implementacja poza zakresem tego planu).
- **Użytkownik klika przycisk "Pomiń" (`Skip`) na karcie treningu:** Wywołanie API `POST /api/v1/workouts/{id}/skip`, a następnie aktualizacja statusu treningu w UI.
- **Użytkownik klika przycisk "Anuluj" (`Cancel`) na karcie treningu:** Wywołanie API `POST /api/v1/workouts/{id}/cancel`, a następnie usunięcie treningu z listy w UI.

## 9. Warunki i walidacja
- **Warunek:** `selectedDate` musi być poprawną datą w formacie `YYYY-MM-DD`, aby zapytanie API było prawidłowe. Jest to zapewnione przez komponent kalendarza.
- **Walidacja w UI:** Komponent `QuickActions` (zawierający przyciski "Pomiń", "Anuluj") będzie renderował te przyciski tylko wtedy, gdy `workout.status === 'planned'`. Dla innych statusów przyciski te będą ukryte.

## 10. Obsługa błędów
- **Błąd sieci lub serwera (np. 500):** Hook `useDayWorkouts` przechwyci błąd. Komponent `DayDrawerContent` wyświetli generyczny komunikat o błędzie (np. "Nie udało się wczytać treningów. Spróbuj ponownie później.") wraz z przyciskiem do ponowienia próby.
- **Brak autoryzacji (401):** Aplikacja powinna posiadać globalny mechanizm obsługi błędu 401, który przekierowuje użytkownika do strony logowania.
- **Brak treningów:** Jeśli API zwróci pustą listę (`total: 0`), komponent `DayDrawerContent` wyświetli komunikat informacyjny, np. "Brak zaplanowanych treningów na ten dzień."

## 11. Kroki implementacji
1.  **Stworzenie custom hooka `useDayWorkouts`:** Zaimplementowanie logiki pobierania danych z `GET /api/v1/workouts` z odpowiednimi parametrami (`planned_date_gte`, `planned_date_lte`), zarządzanie stanem ładowania i błędów.
2.  **Stworzenie komponentów prezentacyjnych:** Zbudowanie komponentów `DayDrawerContent`, `WorkoutList` i kompaktowego wariantu `WorkoutCard` z użyciem `shadcn/ui` i Tailwind CSS.
3.  **Implementacja `QuickActions`:** Dodanie do `WorkoutCard` przycisków "Pomiń" i "Anuluj", które będą warunkowo renderowane na podstawie statusu treningu.
4.  **Stworzenie komponentu kontenera `DayDrawer`:** Zintegrowanie `shadcn/ui/Sheet`, hooka `useDayWorkouts` oraz komponentów prezentacyjnych w jedną całość.
5.  **Integracja z widokiem kalendarza:** W komponencie nadrzędnym (np. `CalendarView`) dodać logikę do zarządzania stanem `selectedDate`. Po kliknięciu dnia w kalendarzu, data powinna być ustawiana, co spowoduje otwarcie i wypełnienie danymi `DayDrawer`. Zapewnić obsługę zamykania drawera (ustawienie `selectedDate` na `null`).
6.  **Implementacja logiki akcji:** Podpięcie wywołań API (`skip`, `cancel`) do przycisków w `QuickActions` i dodanie logiki aktualizacji UI po pomyślnej odpowiedzi.
7.  **Obsługa przypadków brzegowych:** Upewnienie się, że UI poprawnie obsługuje stany ładowania, błędu oraz braku treningów.
8.  **Stylowanie i dopracowanie wizualne:** Finalne dopasowanie stylów komponentów do reszty aplikacji, w tym kolorystyki typów treningów.
9.  **Testowanie manualne:** Przetestowanie całego przepływu: otwieranie, zamykanie, ładowanie danych, działanie szybkich akcji oraz responsywność widoku.
