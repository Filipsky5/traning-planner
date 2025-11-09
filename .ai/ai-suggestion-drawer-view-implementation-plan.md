# Plan implementacji widoku: AI Suggestion Drawer

## 1. Przegląd

Widok "AI Suggestion Drawer" to wysuwany panel (drawer), który umożliwia użytkownikowi interakcję z silnikiem AI w celu wygenerowania, przeglądania, akceptacji lub odrzucenia spersonalizowanej propozycji treningowej na konkretny dzień. Widok jest kluczowym elementem pętli feedbacku, pozwalając na dostosowanie przyszłych sugestii na podstawie historii użytkownika i jego preferencji.

## 2. Routing widoku

- **Ścieżka**: Widok jest nakładką (overlay) na głównym widoku kalendarza (`/`). Nie posiada własnego, dedykowanego URL.
- **Aktywacja**: Otwarcie panelu jest inicjowane przez akcję użytkownika w widoku kalendarza, np. kliknięcie przycisku "Generuj" na pustym dniu.

## 3. Struktura komponentów

Komponenty zostaną zaimplementowane w React i umieszczone w `src/components/suggestions/`.

```
<AISuggestionDrawer> (Komponent główny, kontener)
|
├── <AISuggestionForm>
|   ├── <Select> (dla training_type_code)
|   └── <DatePicker> (dla planned_date)
|
├── <SuggestionPreview>
|   ├── <SuggestionMeta> (dystans/czas, typ)
|   ├── <SuggestionSteps> (rozgrzewka, część główna, schłodzenie)
|   └── <Badge> (dla statusu)
|
├── <SuggestionControls>
|   ├── <Button> (Akceptuj)
|   ├── <Button> (Odrzuć i wygeneruj nowy)
|   └── <p> (Licznik regeneracji: X/3)
|
├── <ExpiredSuggestionState>
|   ├── <p> (Informacja o wygaśnięciu)
|   └── <Button> (Wygeneruj nową)
|
└── <ConflictDialog>
    ├── <DialogHeader>
    ├── <DialogDescription>
    └── <DialogFooter>
        └── <Button> (Zmień pozycję i akceptuj)
```

## 4. Szczegóły komponentów

### `AISuggestionDrawer` (Komponent Kontener)

- **Opis**: Główny komponent zarządzający stanem całego widoku. Odpowiada za orkiestrację przepływu danych między formularzem, podglądem i kontrolkami, a także za komunikację z API.
- **Główne elementy**: Wykorzystuje komponent `Sheet` z `shadcn/ui` jako bazę. Renderuje warunkowo komponenty-dzieci (`AISuggestionForm`, `SuggestionPreview`, `SuggestionControls`, `ExpiredSuggestionState`) w zależności od aktualnego stanu (`loading`, `error`, `data`).
- **Obsługiwane zdarzenia**: `onGenerate`, `onAccept`, `onRegenerate`.
- **Typy**: `AISuggestionViewModel`, `TrainingType`.
- **Propsy**:
  - `isOpen: boolean`: Kontroluje widoczność panelu.
  - `onOpenChange: (isOpen: boolean) => void`: Handler do zamykania panelu.
  - `initialData: { plannedDate: Date; trainingTypeCode?: string }`: Dane do pre-fillowania formularza.

### `AISuggestionForm`

- **Opis**: Formularz do wprowadzania danych dla nowej sugestii.
- **Główne elementy**: Pola `<Select>` i `<DatePicker>` z `shadcn/ui`. Przycisk "Generuj sugestię".
- **Obsługiwane zdarzenia**: `onSubmit: (data: { plannedDate: Date; trainingTypeCode: string }) => void`.
- **Warunki walidacji**:
  - `trainingTypeCode`: Musi być wybraną, niepustą wartością.
  - `plannedDate`: Musi być wybraną, prawidłową datą.
- **Typy**: `TrainingType`.
- **Propsy**:
  - `trainingTypes: TrainingType[]`: Lista dostępnych typów treningów.
  - `onSubmit: (data: ...) => void`: Funkcja zwrotna wywoływana po zwalidowaniu i wysłaniu formularza.
  - `isSubmitting: boolean`: Blokuje formularz na czas generowania sugestii.
  - `initialData: { plannedDate: Date; trainingTypeCode?: string }`: Wartości początkowe.

### `SuggestionPreview`

- **Opis**: Wyświetla szczegóły wygenerowanej lub istniejącej sugestii AI.
- **Główne elementy**: Komponenty `Card` do wizualizacji metadanych (`SuggestionMeta`) i kroków (`SuggestionSteps`). `Badge` do pokazania statusu.
- **Typy**: `AISuggestionViewModel`.
- **Propsy**:
  - `suggestion: AISuggestionViewModel`: Obiekt sugestii do wyświetlenia.

### `SuggestionControls`

- **Opis**: Zestaw przycisków akcji dla aktywnej (niewygasłej) sugestii.
- **Główne elementy**: Dwa przyciski `Button`: "Akceptuj" i "Odrzuć i wygeneruj nowy". Wyświetla licznik dostępnych regeneracji.
- **Obsługiwane zdarzenia**: `onAccept: () => void`, `onRegenerate: () => void`.
- **Warunki walidacji**: Przycisk "Odrzuć i wygeneruj nowy" jest nieaktywny, jeśli `regenerationCount >= 3`.
- **Propsy**:
  - `onAccept: () => void`.
  - `onRegenerate: () => void`.
  - `regenerationCount: number`.
  - `isAccepting: boolean`.
  - `isRegenerating: boolean`.

## 5. Typy

### `AISuggestionDTO` (Data Transfer Object)
Odzwierciedla strukturę danych zwracaną przez API.
```typescript
interface AISuggestionDTO {
  id: string; // uuid
  user_id: string; // uuid
  training_type_code: string;
  planned_date: string; // YYYY-MM-DD
  steps: Array<{
    part: 'warmup' | 'main' | 'cooldown';
    duration_s?: number;
    distance_m?: number;
    description: string;
  }>;
  status: 'shown' | 'accepted' | 'rejected' | 'expired';
  accepted_workout_id: string | null;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
  expires_at: string; // ISO 8601
}
```

### `AISuggestionViewModel` (Model widoku)
Typ dostosowany do potrzeb UI, z przetworzonymi polami.
```typescript
interface AISuggestionViewModel {
  id: string;
  trainingTypeCode: string;
  plannedDate: Date;
  totalDurationSec: number;
  totalDistanceMeters: number;
  steps: Array<{
    part: 'warmup' | 'main' | 'cooldown';
    label: string; // "Rozgrzewka", "Główny", "Schłodzenie"
    details: string; // np. "10 min" lub "5 km"
  }>;
  status: 'shown' | 'accepted' | 'rejected' | 'expired';
  isExpired: boolean;
  expiresAt: Date;
}
```

## 6. Zarządzanie stanem

Zarządzanie stanem będzie scentralizowane w komponencie `AISuggestionDrawer` przy użyciu hooka `useState`. Główne zmienne stanu:

- `suggestion: AISuggestionViewModel | null`: Przechowuje aktualnie wyświetlaną sugestię.
- `isLoading: boolean`: Wskazuje na proces ładowania (generowania, akceptacji, etc.).
- `error: Error | null`: Przechowuje błędy z API.
- `regenerationCount: number`: Licznik wykonanych regeneracji (limit 3).
- `isConflictDialogOpen: boolean`: Kontroluje widoczność modala konfliktu pozycji.

Nie ma potrzeby tworzenia dedykowanego custom hooka (`useAISuggestion`), ponieważ logika jest związana bezpośrednio z cyklem życia pojedynczego komponentu `AISuggestionDrawer`.

## 7. Integracja API

Integracja z API będzie realizowana przez dedykowane funkcje-serwisy w `src/lib/services/aiSuggestionsService.ts`.

- **Generowanie sugestii**: `POST /api/v1/ai/suggestions`
  - **Request Body**: `{ planned_date: string; training_type_code: string; }`
  - **Response (201)**: `{ data: AISuggestionDTO }`
  - **Akcja frontendowa**: Wywołanie po submicie `AISuggestionForm`. Wynik zasila stan `suggestion`.
- **Akceptacja sugestii**: `POST /api/v1/ai/suggestions/{id}/accept`
  - **Request Body**: `{ position: number }` (domyślnie `1`)
  - **Response (201)**: `{ data: WorkoutDTO }`
  - **Akcja frontendowa**: Po kliknięciu "Akceptuj". Po sukcesie, zamyka panel i odświeża dane kalendarza.
- **Regeneracja sugestii**: `POST /api/v1/ai/suggestions/{id}/regenerate`
  - **Request Body**: (puste)
  - **Response (201)**: `{ data: AISuggestionDTO }` (nowa sugestia)
  - **Akcja frontendowa**: Po kliknięciu "Odrzuć i wygeneruj nowy". Zastępuje starą sugestię nową i inkrementuje `regenerationCount`.

## 8. Interakcje użytkownika

- **Otwarcie panelu z danymi**: Użytkownik klika na dzień w kalendarzu. Panel się otwiera, `AISuggestionForm` jest pre-fillowany datą.
- **Generowanie sugestii**: Użytkownik wypełnia formularz i klika "Generuj". `AISuggestionForm` jest blokowany, `isLoading`=true. Po otrzymaniu odpowiedzi, `SuggestionPreview` i `SuggestionControls` są renderowane.
- **Akceptacja sugestii**: Użytkownik klika "Akceptuj". `isLoading`=true. Jeśli API zwróci 201, panel się zamyka, a widok kalendarza jest odświeżany.
- **Regeneracja sugestii**: Użytkownik klika "Odrzuć i wygeneruj nowy". `isLoading`=true. Nowa sugestia jest ładowana i zastępuje starą. Licznik regeneracji jest aktualizowany.
- **Zamknięcie panelu**: Użytkownik klika przycisk zamknięcia lub klika poza panelem. Stan jest resetowany.

## 9. Warunki i walidacja

- **Limit regeneracji**: W `SuggestionControls`, przycisk regeneracji jest wyszarzony i nieaktywny, jeśli `regenerationCount >= 3`. Komponent `AISuggestionDrawer` weryfikuje ten stan przed wysłaniem żądania do API.
- **Wygasła sugestia**: Jeśli `suggestion.isExpired` jest `true`, `SuggestionControls` są ukryte, a `ExpiredSuggestionState` jest pokazywany z przyciskiem do generowania nowej sugestii. Wszystkie akcje (akceptacja, regeneracja) są zablokowane.
- **Walidacja formularza**: `AISuggestionForm` waliduje, czy typ treningu i data zostały wybrane przed wysłaniem.

## 10. Obsługa błędów

- **404 Not Found**: Wyświetla ogólny komunikat błędu "Nie znaleziono sugestii".
- **409 Conflict (Position)**: Po próbie akceptacji, `AISuggestionDrawer` ustawia `isConflictDialogOpen` na `true`, otwierając `ConflictDialog`. Dialog pozwala użytkownikowi podjąć decyzję o zmianie pozycji.
- **410 Gone (Expired)**: Traktowany jako stan wygaśnięcia. Widok przechodzi w tryb `read-only` (`ExpiredSuggestionState`).
- **429 Too Many Requests (Regeneration Limit)**: Wyświetla komunikat błędu "Przekroczono limit regeneracji na dziś." i blokuje przycisk regeneracji.
- **Inne błędy (500, błędy sieci)**: Wyświetlany jest ogólny komunikat o błędzie z opcją ponownej próby.

## 11. Kroki implementacji

1. **Struktura plików**: Utwórz folder `src/components/suggestions` oraz pliki dla komponentów: `AISuggestionDrawer.tsx`, `AISuggestionForm.tsx`, `SuggestionPreview.tsx`, `SuggestionControls.tsx`, itd.
2. **Definicje typów**: Zdefiniuj typy `AISuggestionDTO` i `AISuggestionViewModel` w `src/types.ts` lub w dedykowanym pliku w `src/components/suggestions`.
3. **Implementacja `AISuggestionDrawer`**: Zbuduj główny komponent z logiką zarządzania stanem (`useState`), obsługą propsów `isOpen` i `initialData`. Zintegruj `Sheet` z `shadcn/ui`.
4. **Implementacja `AISuggestionForm`**: Zbuduj formularz z walidacją i obsługą `onSubmit`.
5. **Implementacja `SuggestionPreview`**: Zaimplementuj komponent do wyświetlania danych `AISuggestionViewModel`, dbając o formatowanie czasu/dystansu.
6. **Implementacja `SuggestionControls` i `ExpiredSuggestionState`**: Dodaj logikę warunkową do wyświetlania kontrolek lub informacji o wygaśnięciu na podstawie `suggestion.isExpired` i `regenerationCount`.
7. **Integracja z API**: Stwórz lub zaktualizuj `aiSuggestionsService.ts` o funkcje `generateSuggestion`, `acceptSuggestion`, `regenerateSuggestion`.
8. **Połączenie logiki**: Zintegruj wywołania API w `AISuggestionDrawer` w odpowiedzi na zdarzenia z komponentów-dzieci. Zaimplementuj pełną obsługę stanów `loading` i `error`.
9. **Obsługa błędów**: Zaimplementuj logikę obsługi poszczególnych kodów błędów API (409, 410, 429). Stwórz komponent `ConflictDialog`.
10. **Finalne testy i stylowanie**: Przetestuj cały przepływ manualnie, dostosuj style i upewnij się, że komponenty są w pełni responsywne.
