# Plan implementacji widoku Cel Użytkownika

## 1. Przegląd

Widok "Cel Użytkownika" (`/goal`) umożliwia użytkownikom definiowanie, edytowanie i usuwanie swojego głównego celu treningowego. W wersji MVP, jedynym wspieranym typem celu jest przebiegnięcie określonego dystansu do konkretnej daty (`distance_by_date`). Widok ma również na celu zbieranie informacji o użytkownikach, którzy nie mają sprecyzowanego celu i "biegają dla zdrowia", co w przyszłości posłuży do personalizacji aplikacji.

Interfejs składa się z formularza, który jest inicjalnie wypełniany danymi z API. Użytkownik może zaktualizować swój cel, usunąć go, lub zadeklarować brak konkretnego celu.

## 2. Routing widoku

Widok będzie dostępny pod następującą ścieżką:
- **Ścieżka**: `/goal`
- **Plik**: `src/pages/goal.astro`

## 3. Struktura komponentów

Widok zostanie zaimplementowany jako wyspa React (`client:load`) wewnątrz strony Astro. Hierarchia komponentów będzie wyglądać następująco:

```
src/layouts/Layout.astro
└── src/pages/goal.astro
    └── src/components/views/GoalView.tsx (Główny komponent React)
        ├── Common/LoadingSpinner.tsx (Wskaźnik ładowania)
        ├── Common/ErrorMessage.tsx (Komunikat o błędzie)
        └── features/goal/GoalForm.tsx (Formularz celu)
            ├── ui/RadioGroup.tsx (Wybór typu celu)
            ├── ui/Input.tsx (Dystans, Notatki)
            ├── ui/DatePicker.tsx (Data)
            └── ui/Button.tsx (Zapisz, Usuń)
```

## 4. Szczegóły komponentów

### `GoalView.tsx`

- **Opis komponentu**: Główny kontener widoku. Odpowiada za komunikację z API, zarządzanie stanem (ładowanie, błędy, dane celu) i renderowanie odpowiednich komponentów podrzędnych (`LoadingSpinner`, `ErrorMessage`, `GoalForm`).
- **Główne elementy**: Wykorzystuje hook `useUserGoal` do pobrania danych. Renderuje warunkowo: wskaźnik ładowania, komunikat o błędzie lub komponent `GoalForm`.
- **Obsługiwane interakcje**: Brak bezpośrednich interakcji. Przekazuje funkcje do zapisu i usunięcia celu do komponentu `GoalForm`.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `UserGoalDto`, `ApiError`.
- **Propsy**: Brak.

### `GoalForm.tsx`

- **Opis komponentu**: Formularz do zarządzania celem użytkownika. Umożliwia wybór między celem dystansowym a ogólnym ("bieganie dla zdrowia"), edycję szczegółów celu i jego usunięcie.
- **Główne elementy**:
    - `Card` (Shadcn) jako kontener.
    - `RadioGroup` do wyboru: "Mam konkretny cel (dystans)" vs "Biegam dla zdrowia".
    - Pola formularza (`Input`, `DatePicker`, `Textarea` z Shadcn) dla dystansu, daty i notatek, widoczne warunkowo.
    - `Button` do zapisu i `Button` (wariant `destructive`) do usunięcia celu.
- **Obsługiwane interakcje**:
    - `onSubmit`: Waliduje dane i wywołuje funkcję `saveGoal` lub `deleteGoal` z `GoalView`.
    - `onDelete`: Wyświetla modal z potwierdzeniem, a następnie wywołuje funkcję `deleteGoal`.
    - Zmiana w `RadioGroup`: Pokazuje lub ukrywa pola formularza celu dystansowego.
- **Obsługiwana walidacja**:
    - **Dystans**: Musi być liczbą dodatnią, mniejszą lub równą 1000 km. Komunikat: "Dystans musi być w przedziale 0.1 - 1000 km".
    - **Data**: Musi być datą dzisiejszą lub w przyszłości. Komunikat: "Data nie może być z przeszłości".
    - **Notatki**: Maksymalnie 500 znaków. Komunikat: "Notatki mogą mieć maksymalnie 500 znaków".
- **Typy**: `GoalFormViewModel`, `UserGoalDto`, `UserGoalUpsertDto`.
- **Propsy**:
    ```typescript
    interface GoalFormProps {
      initialGoal: UserGoalDto | null;
      isSubmitting: boolean;
      onSave: (data: UserGoalUpsertDto) => Promise<void>;
      onDelete: () => Promise<void>;
    }
    ```

## 5. Typy

Do implementacji widoku wymagane będą istniejące typy DTO oraz nowy typ ViewModel dla formularza.

- **`UserGoalDto` (z `src/types.ts`)**: Reprezentuje obiekt celu pobrany z API.
    ```typescript
    export interface UserGoalDto {
      id: string;
      user_id: string;
      goal_type: "distance_by_date";
      target_distance_m: number;
      due_date: string; // Format: YYYY-MM-DD
      notes: string | null;
      created_at: string;
    }
    ```
- **`UserGoalUpsertDto` (z `src/lib/validation/userGoals.ts`)**: Reprezentuje obiekt wysyłany do API (`PUT`).
    ```typescript
    export interface UserGoalUpsertDto {
      goal_type: "distance_by_date";
      target_distance_m: number;
      due_date: string; // Format: YYYY-MM-DD
      notes?: string;
    }
    ```
- **`GoalFormViewModel` (nowy typ)**: Reprezentuje stan wewnętrzny formularza `GoalForm`.
    ```typescript
    interface GoalFormViewModel {
      // Określa, którą opcję w RadioGroup wybrał użytkownik
      goalChoice: 'distance' | 'health';
      
      // Przechowywany jako string dla łatwiejszej walidacji i obsługi inputu
      target_distance_km: string; 
      
      // Używa typu Date dla kompatybilności z komponentem DatePicker
      due_date: Date | undefined;
      
      // Notatki jako string
      notes: string;
    }
    ```

## 6. Zarządzanie stanem

Zarządzanie stanem zostanie scentralizowane w niestandardowym hooku `useUserGoal`, aby oddzielić logikę pobierania danych i komunikacji z API od komponentów UI.

- **`useUserGoal.ts`**:
    - **Cel**: Abstrakcja logiki biznesowej związanej z celem użytkownika.
    - **Stan wewnętrzny**:
        - `goal: UserGoalDto | null | undefined` (`undefined` - stan początkowy/ładowanie, `null` - brak celu, `UserGoalDto` - cel istnieje)
        - `isLoading: boolean`
        - `error: ApiError | null`
    - **Funkcje zwracane**:
        - `goal`, `isLoading`, `error`
        - `saveGoal(data: UserGoalUpsertDto): Promise<void>`: Wykonuje `PUT /api/v1/user-goal`.
        - `deleteGoal(): Promise<void>`: Wykonuje `DELETE /api/v1/user-goal`.
    - **Logika**: Wewnątrz hooka, `useEffect` będzie odpowiedzialny za pobranie początkowych danych (`GET`). Funkcje `saveGoal` i `deleteGoal` będą opakowywać wywołania `fetch`, zarządzać stanem `isLoading` i `error`, oraz aktualizować stan `goal` po pomyślnej operacji.

## 7. Integracja API

Integracja będzie realizowana przez `useUserGoal` i obejmie trzy endpointy:

- **`GET /api/v1/user-goal`**:
    - **Akcja**: Wywoływany przy pierwszym renderowaniu `GoalView` do pobrania aktualnego celu.
    - **Typ odpowiedzi**: `ApiResponse<UserGoalDto | null>`.
- **`PUT /api/v1/user-goal`**:
    - **Akcja**: Wywoływany przez `saveGoal` po zatwierdzeniu formularza z wybranym celem dystansowym.
    - **Typ żądania (body)**: `UserGoalUpsertDto`.
    - **Typ odpowiedzi**: `ApiResponse<UserGoalDto>`.
- **`DELETE /api/v1/user-goal`**:
    - **Akcja**: Wywoływany przez `deleteGoal` po zatwierdzeniu usunięcia lub po zapisaniu formularza z opcją "Biegam dla zdrowia" (gdy cel istniał wcześniej).
    - **Typ odpowiedzi**: `204 No Content`.

## 8. Interakcje użytkownika

- **Użytkownik wchodzi na stronę `/goal`**:
    1. Aplikacja wyświetla `LoadingSpinner`.
    2. Wykonywane jest żądanie `GET /api/v1/user-goal`.
    3. Po otrzymaniu odpowiedzi formularz `GoalForm` jest wypełniany danymi (jeśli cel istnieje) lub wyświetlany z domyślnymi wartościami.
- **Użytkownik wybiera "Biegam dla zdrowia"**:
    - Pola formularza (dystans, data, notatki) są ukrywane lub wyłączane.
    - Jeśli użytkownik zapisze ten stan, a wcześniej istniał cel, zostanie wysłane żądanie `DELETE`.
- **Użytkownik wybiera "Mam konkretny cel (dystans)"**:
    - Pola formularza stają się widoczne i aktywne.
- **Użytkownik klika "Zapisz"**:
    1. Uruchamiana jest walidacja po stronie klienta.
    2. Jeśli walidacja nie powiedzie się, wyświetlane są komunikaty o błędach przy odpowiednich polach.
    3. Jeśli walidacja się powiedzie, dane z `GoalFormViewModel` są transformowane do `UserGoalUpsertDto` (np. konwersja km na metry).
    4. Wysyłane jest żądanie `PUT`. Przycisk "Zapisz" jest w stanie `disabled` z `LoadingSpinner`.
    5. Po sukcesie wyświetlany jest toast "Cel został zapisany!", a stan lokalny jest aktualizowany.
- **Użytkownik klika "Usuń cel"**:
    1. Wyświetlany jest modal z prośbą o potwierdzenie.
    2. Po potwierdzeniu wysyłane jest żądanie `DELETE`.
    3. Po sukcesie wyświetlany jest toast "Cel został usunięty!", a formularz jest czyszczony.

## 9. Warunki i walidacja

Walidacja po stronie klienta będzie realizowana w komponencie `GoalForm`, najprawdopodobniej z użyciem biblioteki `react-hook-form` z resolverem `Zod`, aby zapewnić spójność z backendem.

- **Warunek 1: Dystans** (`target_distance_km`)
    - **Sprawdzenie**: `value > 0 && value <= 1000`.
    - **UI**: Jeśli warunek nie jest spełniony, pole input otrzymuje czerwoną ramkę, a pod nim pojawia się komunikat błędu. Przycisk "Zapisz" jest nieaktywny.
- **Warunek 2: Data** (`due_date`)
    - **Sprawdzenie**: `value >= today`.
    - **UI**: Komponent `DatePicker` uniemożliwia wybranie dat z przeszłości. Jeśli data jest nieprawidłowa, pole otrzymuje czerwoną ramkę, a pod nim pojawia się komunikat.
- **Warunek 3: Notatki** (`notes`)
    - **Sprawdzenie**: `value.length <= 500`.
    - **UI**: Pod polem `Textarea` może znajdować się licznik znaków. W przypadku przekroczenia limitu, wyświetlany jest komunikat błędu.

## 10. Obsługa błędów

- **Błąd pobierania danych (GET)**: Jeśli `useUserGoal` zwróci błąd, `GoalView` wyświetli komponent `ErrorMessage` z komunikatem "Nie udało się wczytać celu. Spróbuj odświeżyć stronę."
- **Błąd zapisu/usunięcia (PUT/DELETE)**:
    - **Błąd serwera (5xx)**: `useUserGoal` ustawi stan błędu. `GoalView` wyświetli globalny toast z komunikatem: "Wystąpił błąd serwera. Spróbuj ponownie później."
    - **Błąd walidacji (422)**: Teoretycznie nie powinien wystąpić przy poprawnej walidacji frontendu, ale w razie czego zostanie obsłużony jak błąd serwera.
    - **Brak połączenia sieciowego**: `fetch` rzuci błąd, który zostanie złapany przez `useUserGoal`. Zostanie wyświetlony toast: "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."

## 11. Kroki implementacji

1.  **Utworzenie strony Astro**: Stworzyć plik `src/pages/goal.astro`, który importuje i renderuje `GoalView` z atrybutem `client:load`.
2.  **Stworzenie `GoalView`**: Stworzyć plik `src/components/views/GoalView.tsx`. Dodać podstawową strukturę do renderowania warunkowego (ładowanie, błąd, formularz).
3.  **Implementacja hooka `useUserGoal`**: Stworzyć plik `src/lib/hooks/useUserGoal.ts`. Zaimplementować logikę pobierania (`GET`), zapisu (`PUT`) i usuwania (`DELETE`) celu, wraz z zarządzaniem stanem ładowania i błędów.
4.  **Stworzenie `GoalForm`**: Stworzyć plik `src/components/features/goal/GoalForm.tsx`. Zbudować layout formularza używając komponentów Shadcn/ui (`Card`, `RadioGroup`, `Input`, `DatePicker`, `Button`).
5.  **Integracja `react-hook-form`**: Dodać `react-hook-form` i `zod` do `GoalForm` w celu zarządzania stanem formularza i walidacją. Zdefiniować schemat walidacji Zod dla `GoalFormViewModel`.
6.  **Połączenie komponentów**: W `GoalView` użyć hooka `useUserGoal` i przekazać dane oraz funkcje `saveGoal` i `deleteGoal` jako propsy do `GoalForm`.
7.  **Implementacja logiki interakcji**: Dodać obsługę przełączania `RadioGroup`, logikę `onSubmit` transformującą dane z ViewModel na DTO, oraz obsługę modala potwierdzającego usunięcie.
8.  **Styling i UX**: Dopracować style za pomocą Tailwind CSS. Dodać toasty (np. używając `sonner` z Shadcn) dla potwierdzenia operacji (zapis, usunięcie) i dla błędów. Upewnić się, że stany ładowania na przyciskach są poprawnie zaimplementowane.
9.  **Testowanie manualne**: Przetestować wszystkie scenariusze: ładowanie strony, brak celu, istnienie celu, tworzenie, aktualizacja, usuwanie, walidacja pól i obsługa błędów API.

