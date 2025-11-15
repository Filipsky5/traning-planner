# Plan implementacji widoku Ustawień Użytkownika

## 1. Przegląd

Celem jest implementacja menu użytkownika w formie rozwijanego panelu (popover/dropdown), dostępnego globalnie w nagłówku aplikacji. Menu to umożliwi użytkownikowi wylogowanie się, nawigację do widoku celu (`/goal`) oraz zmianę preferowanej jednostki tempa (`min/km` vs `km/h`). Wybrana jednostka tempa będzie zapisywana w `localStorage` i udostępniana globalnie w aplikacji w celu spójnej prezentacji danych.

## 2. Routing widoku

Komponent nie będzie posiadał własnej, dedykowanej ścieżki (route). Zostanie zaimplementowany jako globalnie dostępny komponent `UserMenu`, umieszczony w głównym nagłówku aplikacji (`Header.astro`) i renderowany na każdej stronie.

## 3. Struktura komponentów

Hierarchia komponentów zostanie oparta o React Context w celu globalnego zarządzania stanem jednostki tempa. Główne komponenty interaktywne będą wyspami Astro (`Astro Islands`).

```
src/layouts/Layout.astro
└── PaceUnitProvider.tsx (client:load)
    └── src/components/Header.astro
        └── UserMenu.tsx (client:load)
            └── shadcn/ui DropdownMenu
                ├── DropdownMenuLabel (Nazwa użytkownika)
                ├── DropdownMenuItem (Link do /goal)
                ├── PaceUnitToggle.tsx
                │   └── shadcn/ui Switch
                └── DropdownMenuItem (Przycisk wylogowania)
```

## 4. Szczegóły komponentów

### `PaceUnitProvider`
- **Opis komponentu**: Niewizualny komponent typu "Provider" (dostawca kontekstu), który zarządza globalnym stanem jednostki tempa. Odczytuje on początkową wartość z `localStorage` (lub ustawia domyślną), a następnie udostępnia stan i funkcję do jego aktualizacji wszystkim komponentom-dzieciom. Będzie to wyspa Astro (`client:load`) opakowująca główny layout aplikacji.
- **Główne elementy**: Wykorzystuje `React.createContext` i `useState`/`useEffect` do zarządzania stanem.
- **Obsługiwane interakcje**: Brak.
- **Obsługiwana walidacja**: Sprawdza, czy wartość w `localStorage` jest poprawna (`'min/km'` lub `'km/h'`). W przypadku niepoprawnej wartości, ustawia domyślną.
- **Typy**: `PaceUnit`, `PaceUnitContextType`
- **Propsy**: `children: React.ReactNode`

### `UserMenu`
- **Opis komponentu**: Główny, widoczny dla użytkownika komponent, renderowany w nagłówku. Będzie wyświetlał awatar lub ikonę użytkownika. Kliknięcie w niego otworzy menu kontekstowe. Zostanie zaimplementowany przy użyciu komponentu `DropdownMenu` z biblioteki `shadcn/ui`.
- **Główne elementy**: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator` z `shadcn/ui`. Komponent `PaceUnitToggle` zostanie umieszczony wewnątrz.
- **Obsługiwane interakcje**:
    - Otwarcie/zamknięcie menu po kliknięciu.
    - Nawigacja po kliknięciu w element "Cel".
    - Wywołanie funkcji wylogowania po kliknięciu "Wyloguj".
- **Obsługiwana walidacja**: Brak.
- **Typy**: `UserMenuProps`
- **Propsy**:
    - `userEmail: string | null` - email użytkownika przekazany z Header.astro (Astro.locals.user)

### `PaceUnitToggle`
- **Opis komponentu**: Komponent osadzony w `UserMenu`, odpowiedzialny za przełączanie jednostki tempa. Wyświetla etykietę oraz przełącznik (`Switch` z `shadcn/ui`), który odzwierciedla i pozwala modyfikować bieżące ustawienie.
- **Główne elementy**: `div` (wrapper), `Label` (etykieta), `Switch` (przełącznik).
- **Obsługiwane interakcje**: Zmiana stanu przełącznika (`onCheckedChange`).
- **Obsługiwana walidacja**: Brak.
- **Typy**: `PaceUnit`
- **Propsy**: Brak (stan pobierany z kontekstu).

## 5. Typy

Wymagane będzie zdefiniowanie następujących typów, np. w nowym pliku `src/lib/types/ui.ts`:

```typescript
/**
 * Definiuje dostępne jednostki tempa.
 * 'min/km' - minuty na kilometr
 * 'km/h' - kilometry na godzinę
 */
export type PaceUnit = 'min/km' | 'km/h';

/**
 * Struktura kontekstu React dla jednostki tempa.
 */
export interface PaceUnitContextType {
  paceUnit: PaceUnit;
  setPaceUnit: (unit: PaceUnit) => void;
}
```

## 6. Zarządzanie stanem

Stan jednostki tempa (`paceUnit`) będzie zarządzany globalnie przy użyciu **React Context API**.

- **`PaceUnitProvider`**: Komponent dostawcy, który będzie przechowywał stan. Przy pierwszym renderowaniu na kliencie (`useEffect`), odczyta wartość z `localStorage`. Jeśli wartość nie istnieje lub jest nieprawidłowa, ustawi domyślną (`'min/km'`). Każda zmiana stanu będzie również zapisywana w `localStorage`.
- **`usePaceUnit`**: Custom hook, który uprości dostęp do kontekstu. Komponenty, które potrzebują odczytać lub zmienić jednostkę tempa, użyją tego hooka.

```typescript
// Przykład użycia hooka
const { paceUnit, setPaceUnit } = usePaceUnit();
```

Logika dostępu do `localStorage` będzie zabezpieczona przed uruchomieniem po stronie serwera (SSR) poprzez umieszczenie jej wewnątrz hooka `useEffect`.

## 7. Integracja API

Ta funkcjonalność jest w pełni po stronie klienta. **Nie jest wymagana żadna integracja z API.** Stan jest utrwalany w `localStorage` przeglądarki użytkownika.

## 8. Interakcje użytkownika

- **Kliknięcie ikony użytkownika**: Otwiera `DropdownMenu`.
- **Kliknięcie poza otwartym menu**: Zamyka `DropdownMenu`.
- **Kliknięcie przełącznika "Jednostka tempa"**: Zmienia wartość `paceUnit` w kontekście i `localStorage`. Zmiana jest natychmiast widoczna na przełączniku.
- **Kliknięcie "Twój cel"**: Przekierowuje użytkownika na stronę `/goal`.
- **Kliknięcie "Wyloguj"**: Uruchamia logikę wylogowania (np. wywołanie metody z Supabase Auth i przekierowanie na stronę logowania).

## 9. Warunki i walidacja

- Jedyna walidacja odbywa się w `PaceUnitProvider` podczas odczytu danych z `localStorage`.
- **Warunek**: Wartość odczytana z klucza `paceUnit` musi być równa `'min/km'` lub `'km/h'`.
- **Obsługa**: Jeśli warunek nie jest spełniony, stan jest inicjowany wartością domyślną `'min/km'`.

## 10. Obsługa błędów

- **Błąd**: `localStorage` jest niedostępny (np. w trybie prywatnym przeglądarki).
- **Obsługa**: Dostęp do `localStorage` zostanie opakowany w blok `try...catch`. W przypadku błędu, stan `paceUnit` będzie zarządzany tylko w pamięci na czas trwania sesji. Funkcjonalność będzie działać, ale ustawienie nie zostanie zapamiętane po odświeżeniu strony. Jest to akceptowalne dla tej funkcji.

## 11. Kroki implementacji

1.  **Stworzenie typów**: W pliku `src/lib/types/ui.ts` zdefiniować typy `PaceUnit` i `PaceUnitContextType`.
2.  **Implementacja `PaceUnitProvider`**:
    - Stworzyć plik `src/components/providers/PaceUnitProvider.tsx`.
    - Zaimplementować w nim kontekst, stan, logikę odczytu/zapisu do `localStorage` (wewnątrz `useEffect`) oraz hook `usePaceUnit`.
3.  **Integracja `PaceUnitProvider`**:
    - W głównym pliku layoutu (`src/layouts/Layout.astro`), zaimportować i opakować tag `<slot />` komponentem `<PaceUnitProvider client:load>`.
4.  **Implementacja `PaceUnitToggle`**:
    - Stworzyć plik `src/components/PaceUnitToggle.tsx`.
    - Użyć hooka `usePaceUnit` do pobrania stanu i funkcji aktualizującej.
    - Zbudować interfejs przy użyciu komponentów `Label` i `Switch` z `shadcn/ui`.
5.  **Implementacja `UserMenu`**:
    - Stworzyć plik `src/components/UserMenu.tsx`.
    - Zbudować strukturę menu przy użyciu `DropdownMenu` z `shadcn/ui`.
    - Osadzić komponent `PaceUnitToggle` wewnątrz menu.
    - Dodać pozostałe elementy: link do celu i przycisk wylogowania.
6.  **Dodanie `UserMenu` do nagłówka**:
    - W pliku `src/components/Header.astro` (lub odpowiedniku), zaimportować i umieścić komponent `<UserMenu client:load />`.
7.  **Weryfikacja**:
    - Sprawdzić, czy menu poprawnie się otwiera i zamyka.
    - Zweryfikować, czy przełącznik działa i czy jego stan jest poprawnie zapisywany w `localStorage` i odczytywany po odświeżeniu strony.
    - Upewnić się, że link do celu i przycisk wylogowania działają zgodnie z oczekiwaniami.

