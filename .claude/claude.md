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
| XCTest | Playwright | Testing framework |
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
