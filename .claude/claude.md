# Claude Context - AI Running Training Planner

## Developer Background

**Filip Jabłoński** - iOS Developer z 12-letnim doświadczeniem komercyjnym w Swift/Objective-C.

### Doświadczenie Techniczne:
- **iOS Development**: 12 lat doświadczenia w Swift, SwiftUI, UIKit
- **Mobile**: Doświadczenie z React Native
- **Async/Concurrency**: Biegłość w async/await, promises (Swift + JavaScript)
- **Bazy danych**: Podstawowa wiedza SQL (studia, 10 lat temu), wymaga odświeżenia
- **JavaScript/TypeScript**: Uczy się (ale koncepty async są znane)
- **Web Development**: Początkujący w web (Astro, React web)
- **Docker/DevOps**: Nauka od podstaw

### Poziom znajomości technologii w projekcie:
- ✅ **TypeScript/JavaScript koncepty** - async/await, promises (znane ze Swift)
- ✅ **React koncepty** - hooks, komponenty (znane z React Native)
- ✅ **Client/Server architecture** - rozumie dyrektywy Astro (`client:load`, `server:defer`)
- ⚠️ **Astro SSR** - nauka w trakcie
- ⚠️ **Docker** - początkujący
- ⚠️ **CI/CD pipelines** - nauka w trakcie
- ⚠️ **PostgreSQL/Supabase** - wymaga odświeżenia wiedzy SQL

## Analogie iOS -> Web (dla lepszego zrozumienia):

| iOS/Swift | Web (ten projekt) | Uwagi |
|-----------|-------------------|-------|
| SwiftUI | React | Podobne koncepty: state, props, lifecycle |
| async/await (Swift) | async/await (JS) | Niemal identyczna składnia |
| Firebase | Supabase | BaaS z autentykacją i real-time DB |
| Xcode | VS Code + extensions | IDE |
| Swift Package Manager | npm/pnpm | Zarządzanie zależnościami |
| Codable | TypeScript types | Type safety |
| XCTest | Vitest + Playwright | Testy jednostkowe + E2E |
| Xcode Cloud / Fastlane | GitHub Actions | CI/CD |

## Styl komunikacji:

- **Preferuj prostotę** - deweloper uczy się web developmentu
- **Używaj analogii do iOS** gdy możliwe (SwiftUI ↔ React, Firebase ↔ Supabase)
- **Wyjaśniaj koncepty web-specific** (SSR, hydration, client vs server)
- **Praktyczne przykłady** zamiast teorii
- **Ostrzegaj przed typowymi pułapkami** w przejściu iOS → Web

## Kontekst projektu:

### Cel:
Projekt certyfikacyjny - musi spełniać konkretne wymagania do 16 listopada 2024.

### Czas:
- 5 tygodni (do 16.11.2024)
- 8 godzin/tydzień na projekt
- Równolegle: kurs online
- **Realny czas na kod: ~25-30 godzin**

### Wymagania certyfikacyjne (OBOWIĄZKOWE):
- ✅ Mechanizm kontroli dostępu (login)
- ✅ CRUD operations
- ✅ Logika biznesowa z AI
- ✅ PRD i dokumentacja
- ✅ Min. 1 test E2E
- ✅ Pipeline CI/CD (build + testy)
- ⭐ Deploy pod publicznym URL (opcjonalne, ale wymagane)

### Specyficzne wymagania techniczne:
- **Deployment**: DigitalOcean VPS (wymagane dla certyfikatu)
- **CI/CD**: GitHub Actions z ręcznym triggerem
- **Docker**: Wymagany (deployment na VPS)

## Priorytety w sugestiach:

1. **Prostota** > Elegancja - priorytet: działający projekt w terminie
2. **Sprawdzone rozwiązania** > Bleeding edge - chyba że kurs rekomenduje (np. Tailwind 4)
3. **Dokumentacja** - deweloper uczy się, więc linki do docsów są cenne
4. **Bezpieczeństwo** - RLS w Supabase, env variables, RODO
5. **Time-savers** - gotowe komponenty (shadcn/ui), BaaS (Supabase), managed services

## Znane problemy do unikania:

- Overengineering - MVP ma spełnić wymagania, nie być dziełem sztuki
- Zbyt długi setup Docker/DevOps - to może zjeść 30% czasu
- Nauka za dużo na raz - trzymać się jednego stacku

## Pomocne wskazówki:

- Gdy sugerujesz kod, dodaj komentarze wyjaśniające koncepty web-specific
- Dla konfiguracji (Docker, nginx, CI/CD) - podawaj gotowe snippety
- Ostrzegaj gdy coś może zająć dużo czasu
- Sugeruj alternatywy jeśli coś blokuje (Plan B)

## Preferowane narzędzia:

- **Editor**: VS Code (zakładam)
- **Terminal**: Standardowy (macOS)
- **Git**: Znany (używany w iOS dev)
- **Package manager**: npm (już w projekcie)

## TESTOWANIE

### Wytyczne dla testów jednostkowych

#### VITEST

- Wykorzystuj obiekt `vi` do tworzenia dubli testowych - Używaj `vi.fn()` dla mocków funkcji, `vi.spyOn()` do monitorowania istniejących funkcji, oraz `vi.stubGlobal()` dla mocków globalnych. Preferuj spy zamiast mocków gdy chcesz tylko weryfikować interakcje bez zmiany zachowania.
- Opanuj wzorce fabryczne `vi.mock()` - Umieszczaj funkcje fabryczne mocków na najwyższym poziomie pliku testowego, zwracaj typowane implementacje mocków, i używaj `mockImplementation()` lub `mockReturnValue()` dla dynamicznej kontroli podczas testów. Pamiętaj że fabryka uruchamia się przed przetworzeniem importów.
- Twórz pliki setup dla konfiguracji wielokrotnego użytku - Definiuj globalne mocki, niestandardowe matchery i konfigurację środowiska w dedykowanych plikach wskazanych w `vitest.config.ts`. Utrzymuje to pliki testowe w czystości zapewniając jednocześnie spójne środowisko testowe.
- Używaj inline snapshots dla czytelnych asercji - Zastępuj skomplikowane sprawdzenia równości przez `expect(value).toMatchInlineSnapshot()` aby przechwycić oczekiwany output bezpośrednio w pliku testowym, czyniąc zmiany bardziej widocznymi w code review.
- Monitoruj pokrycie testami z sensem i tylko gdy zostaniesz poproszony - Konfiguruj progi pokrycia w `vitest.config.ts` aby zapewnić testowanie krytycznych ścieżek kodu, ale skupiaj się na sensownych testach zamiast arbitralnych procentów pokrycia.
- Uczyń tryb watch częścią swojego workflow - Uruchamiaj `vitest --watch` podczas developmentu dla natychmiastowego feedbacku gdy modyfikujesz kod, filtrując testy z `-t` aby skupić się na konkretnych obszarach w trakcie developmentu.
- Eksploruj tryb UI dla złożonych zestawów testów - Używaj `vitest --ui` do wizualnej nawigacji po dużych zestawach testów, inspekcji wyników testów i debugowania błędów bardziej efektywnie podczas developmentu.
- Obsługuj opcjonalne zależności z inteligentnymi mockami - Używaj warunkowego mockowania do testowania kodu z opcjonalnymi zależnościami implementując `vi.mock()` ze wzorcem fabrycznym dla modułów które mogą nie być dostępne we wszystkich środowiskach.
- Konfiguruj jsdom dla testów DOM - Ustaw `environment: 'jsdom'` w konfiguracji dla testów komponentów frontendowych i łącz z narzędziami testing-library dla realistycznej symulacji interakcji użytkownika.
- Strukturyzuj testy dla łatwości utrzymania - Grupuj powiązane testy z opisowymi blokami `describe`, używaj jawnych komunikatów asercji i podążaj za wzorcem Arrange-Act-Assert aby uczynić testy samodokumentującymi się.
- Wykorzystuj sprawdzanie typów TypeScript w testach - Włącz ścisłe typowanie w testach aby wyłapać błędy typów wcześnie, używaj `expectTypeOf()` dla asercji na poziomie typów i upewnij się że mocki zachowują oryginalne sygnatury typów.

#### REACT TESTING LIBRARY

- Testuj komponenty z perspektywy użytkownika - Używaj queries jak `getByRole`, `getByLabelText` zamiast `getByTestId` gdzie to możliwe
- Testuj hooki domenowe - `useCalendar`, `useDayWorkouts`, `useWorkoutDetail` z wykorzystaniem `renderHook` z `@testing-library/react`
- Symuluj interakcje użytkownika - Używaj `userEvent` zamiast `fireEvent` dla bardziej realistycznych testów
- Czekaj na asynchroniczne zmiany - Używaj `waitFor`, `findBy*` queries dla operacji asynchronicznych

### Wytyczne dla testów E2E

#### PLAYWRIGHT

- Inicjalizuj konfigurację z Chromium i WebKit - Testy powinny działać w min. 2 przeglądarkach (zgodnie z wymaganiami projektu)
- Używaj kontekstów przeglądarki do izolacji środowisk testowych - Każdy test powinien mieć czysty stan
- Implementuj wzorzec Page Object Model dla łatwych w utrzymaniu testów - Oddziel logikę lokalizatorów od logiki testowej
- Używaj lokalizatorów dla odpornego wyboru elementów - Preferuj `page.getByRole()`, `page.getByLabel()` zamiast selektorów CSS
- Wykorzystuj testy API dla walidacji backendu - Testuj endpointy `src/pages/api/v1/*` z użyciem `request` fixture
- Implementuj porównania wizualne z `expect(page).toHaveScreenshot()` - Dla krytycznych widoków (kalendarz, formularze)
- Używaj narzędzia codegen do nagrywania testów - `npx playwright codegen` jako punkt startowy
- Wykorzystuj trace viewer do debugowania błędów testów - `npx playwright show-trace` dla szczegółowej analizy
- Implementuj hooki testowe dla setup i teardown - `beforeEach`, `afterEach` dla czyszczenia stanu bazy danych
- Używaj asercji expect z specyficznymi matcherami - `toBeVisible()`, `toHaveText()`, `toBeEnabled()` zamiast ogólnych
- Wykorzystuj wykonywanie równoległe dla szybszych testów - Konfiguruj `workers` w `playwright.config.ts`

### Środowisko testowe (z test-plan.md)

- **Testy E2E**: Uruchamiane przeciwko production build (`npm run build` + `npm run preview`)
- **Przeglądarki**: Chromium, WebKit (min. 2)
- **Viewports**: Desktop (1440×900), Mobile (390×844)
- **Baza danych**: Dedykowany testowy projekt Supabase lub lokalny Postgres
- **AI**: Mockowane odpowiedzi lub osobny klucz z limitami dla deterministycznych testów
- **Pokrycie**: Min. 60-70% dla `src/lib/utils`, `src/lib/validation`, `src/lib/services`


