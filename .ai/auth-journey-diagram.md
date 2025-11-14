# Authentication Journey - Mermaid Diagrams

## 1. Główny Przepływ Użytkownika (User Journey)

```mermaid
journey
    title Podróż Użytkownika - System Autentykacji
    section Nowy Użytkownik
      Wejście na stronę: 3: Użytkownik
      Przekierowanie na /login: 5: System
      Kliknięcie "Zarejestruj się": 5: Użytkownik
      Wypełnienie formularza rejestracji: 4: Użytkownik
      Weryfikacja danych (client): 5: System
      Submit formularza: 5: Użytkownik
      Tworzenie konta w Supabase: 5: System
      Wysłanie emaila weryfikacyjnego: 5: System
      Komunikat o weryfikacji: 4: Użytkownik
      Kliknięcie linku w emailu: 5: Użytkownik
      Weryfikacja email: 5: System
      Automatyczne logowanie: 5: System
      Przekierowanie na /onboarding: 5: System
      Dodanie 3 treningów: 3: Użytkownik
      Przekierowanie na kalendarz: 5: System
      Korzystanie z aplikacji: 5: Użytkownik
    section Powracający Użytkownik
      Wejście na stronę: 5: Użytkownik
      Przekierowanie na /login: 5: System
      Wypełnienie formularza logowania: 5: Użytkownik
      Walidacja danych: 5: System
      Submit formularza: 5: Użytkownik
      Weryfikacja w Supabase: 5: System
      Sprawdzenie statusu onboardingu: 5: System
      Przekierowanie na kalendarz: 5: System
      Korzystanie z aplikacji: 5: Użytkownik
    section Odzyskiwanie Hasła
      Kliknięcie "Zapomniałem hasła": 3: Użytkownik
      Podanie adresu email: 4: Użytkownik
      Wysłanie linku resetującego: 5: System
      Kliknięcie linku w emailu: 5: Użytkownik
      Wprowadzenie nowego hasła: 4: Użytkownik
      Aktualizacja hasła: 5: System
      Automatyczne logowanie: 5: System
      Sprawdzenie statusu onboardingu: 5: System
      Przekierowanie na odpowiednią stronę: 5: System
```

## 2. Przepływ Rejestracji (Registration Flow)

```mermaid
sequenceDiagram
    actor U as Użytkownik
    participant LP as /login
    participant RP as /register
    participant RF as RegisterForm.tsx
    participant API as POST /api/v1/auth/register
    participant SB as Supabase Auth
    participant DB as PostgreSQL (RLS)
    participant Email as Email Service
    participant OB as /onboarding

    U->>LP: Wejście na stronę główną
    LP->>U: Wyświetlenie strony logowania
    U->>LP: Kliknięcie "Zarejestruj się"
    LP->>RP: Przekierowanie na /register
    RP->>RF: Renderowanie formularza
    RF->>U: Wyświetlenie formularza rejestracji

    U->>RF: Wypełnienie danych (email, hasło, potwierdzenie)
    RF->>RF: Walidacja client-side (Zod schema)
    RF->>RF: Sprawdzenie zgodności haseł

    U->>RF: Kliknięcie "Zarejestruj się"
    RF->>RF: Wyświetlenie loading state
    RF->>API: POST {email, password, metadata}
    API->>API: Walidacja danych (Zod schema)
    API->>SB: signUp(email, password, options)

    alt Email już istnieje
        SB-->>API: Error: email_already_exists
        API-->>RF: 422 Unprocessable Entity
        RF->>RF: Ukrycie loading state
        RF->>U: Komunikat: "Email jest już zarejestrowany"
    else Sukces rejestracji
        SB->>DB: INSERT INTO auth.users
        DB->>DB: Trigger: handle_new_user()
        DB->>DB: INSERT INTO user_profiles
        SB->>Email: Wysłanie emaila weryfikacyjnego
        SB-->>API: Success {user, session}
        API-->>RF: 201 Created
        RF->>RF: Ukrycie loading state
        RF->>RF: Zmiana step: 'form' → 'verification'
        RF->>U: Komunikat: "Sprawdź email aby zweryfikować konto"

        Note over U,Email: Użytkownik otwiera email i klika link

        U->>Email: Kliknięcie linku weryfikacyjnego
        Email->>SB: Weryfikacja tokenu
        SB->>SB: Aktualizacja email_confirmed_at
        SB->>LP: Przekierowanie + session cookies
        LP->>LP: Middleware: wykrycie zalogowanego użytkownika
        LP->>OB: Przekierowanie na /onboarding
        OB->>U: Wyświetlenie procesu onboardingu
    end
```

## 3. Przepływ Logowania (Login Flow)

```mermaid
sequenceDiagram
    actor U as Użytkownik
    participant LP as /login
    participant LF as LoginForm.tsx
    participant API as POST /api/v1/auth/login
    participant SB as Supabase Auth
    participant MW as Middleware
    participant CAL as / (Kalendarz)
    participant OB as /onboarding

    U->>LP: Wejście na stronę (niezalogowany)
    LP->>LF: Renderowanie formularza
    LF->>U: Wyświetlenie formularza logowania

    U->>LF: Wypełnienie email i hasła
    LF->>LF: Walidacja client-side (Zod)

    U->>LF: Kliknięcie "Zaloguj się"
    LF->>LF: Wyświetlenie loading state
    LF->>API: POST {email, password}
    API->>API: Walidacja danych (Zod schema)
    API->>API: Rate limiting check (5 prób / 15 min)

    alt Rate limit exceeded
        API-->>LF: 429 Too Many Requests
        LF->>U: Komunikat: "Zbyt wiele prób. Spróbuj za X minut"
    else Rate limit OK
        API->>SB: signInWithPassword(email, password)

        alt Nieprawidłowe dane logowania
            SB-->>API: Error: Invalid login credentials
            API-->>LF: 401 Unauthorized
            LF->>LF: Ukrycie loading state
            LF->>U: Komunikat: "Nieprawidłowy email lub hasło"
            LF->>LF: Focus na polu email
        else Sukces logowania
            SB-->>API: Success {user, session}
            API->>API: Ustawienie session cookies
            API-->>LF: 200 OK {user, session}
            LF->>CAL: window.location.href = '/'

            CAL->>MW: Request do / (z cookies)
            MW->>MW: Pobranie sesji z cookies
            MW->>SB: Weryfikacja sesji
            MW->>MW: Sprawdzenie liczby treningów

            alt Użytkownik ma < 3 treningi
                MW->>OB: Przekierowanie na /onboarding
                OB->>U: Wyświetlenie procesu onboardingu
            else Użytkownik ma >= 3 treningi
                MW->>CAL: Kontynuacja do /
                CAL->>U: Wyświetlenie kalendarza
            end
        end
    end
```

## 4. Przepływ Odzyskiwania Hasła (Password Recovery Flow)

```mermaid
sequenceDiagram
    actor U as Użytkownik
    participant LP as /login
    participant FP as /forgot-password
    participant FPF as ForgotPasswordForm.tsx
    participant API1 as POST /api/v1/auth/forgot-password
    participant SB as Supabase Auth
    participant Email as Email Service
    participant RP as /reset-password
    participant RPF as ResetPasswordForm.tsx
    participant API2 as POST /api/v1/auth/reset-password
    participant MW as Middleware
    participant CAL as / (Kalendarz)

    U->>LP: Wejście na /login
    U->>LP: Kliknięcie "Zapomniałem hasła"
    LP->>FP: Przekierowanie na /forgot-password
    FP->>FPF: Renderowanie formularza
    FPF->>U: Wyświetlenie formularza (pole email)

    U->>FPF: Wprowadzenie adresu email
    FPF->>FPF: Walidacja email (Zod)
    U->>FPF: Kliknięcie "Wyślij link"
    FPF->>FPF: Wyświetlenie loading state
    FPF->>API1: POST {email}
    API1->>API1: Walidacja (Zod)
    API1->>API1: Rate limiting (3 próby / 1h)

    alt Rate limit exceeded
        API1-->>FPF: 429 Too Many Requests
        FPF->>U: Komunikat: "Zbyt wiele prób. Spróbuj za godzinę"
    else Rate limit OK
        API1->>SB: resetPasswordForEmail(email, redirectTo)
        SB->>Email: Wysłanie emaila z linkiem
        SB-->>API1: Success (zawsze, nawet jeśli email nie istnieje)
        API1-->>FPF: 200 OK
        FPF->>FPF: success = true
        FPF->>U: Komunikat: "Jeśli email istnieje, wysłaliśmy link resetujący"

        Note over U,Email: Użytkownik otwiera email i klika link

        U->>Email: Kliknięcie linku resetującego
        Email->>RP: Przekierowanie na /reset-password?token=XXX
        RP->>RP: Wyciągnięcie tokenu z URL
        RP->>RPF: Renderowanie formularza z tokenem
        RPF->>U: Wyświetlenie formularza (nowe hasło, potwierdzenie)

        U->>RPF: Wprowadzenie nowego hasła
        RPF->>RPF: Walidacja client-side (Zod)
        RPF->>RPF: Sprawdzenie zgodności haseł
        U->>RPF: Kliknięcie "Zresetuj hasło"
        RPF->>RPF: Wyświetlenie loading state
        RPF->>API2: POST {token, newPassword}
        API2->>API2: Walidacja (Zod)
        API2->>SB: updateUser({password: newPassword})

        alt Token nieprawidłowy/wygasły
            SB-->>API2: Error: Invalid token
            API2-->>RPF: 401 Unauthorized
            RPF->>U: Komunikat: "Link wygasł. Zażądaj nowego"
        else Sukces
            SB->>SB: Aktualizacja hasła
            SB-->>API2: Success {session}
            API2->>API2: Ustawienie session cookies
            API2-->>RPF: 200 OK
            RPF->>CAL: window.location.href = '/'

            CAL->>MW: Request do / (z cookies)
            MW->>MW: Sprawdzenie statusu onboardingu

            alt Użytkownik nie ukończył onboardingu
                MW->>U: Przekierowanie na /onboarding
            else Użytkownik ukończył onboarding
                MW->>CAL: Kontynuacja
                CAL->>U: Wyświetlenie kalendarza
            end
        end
    end
```

## 5. Przepływ Onboardingu (Onboarding Flow)

```mermaid
sequenceDiagram
    actor U as Użytkownik
    participant OB as /onboarding
    participant MW as Middleware
    participant API as POST /api/v1/workouts
    participant DB as PostgreSQL
    participant CAL as / (Kalendarz)

    Note over U,OB: Użytkownik został przekierowany po rejestracji/logowaniu

    U->>OB: Wejście na /onboarding
    OB->>MW: Request (z session cookies)
    MW->>MW: Weryfikacja autentykacji
    MW->>DB: COUNT workouts WHERE user_id = ?

    alt Użytkownik ma >= 3 treningi
        MW->>CAL: Przekierowanie na /
    else Użytkownik ma < 3 treningi
        MW->>OB: Kontynuacja
        OB->>U: Wyświetlenie interfejsu onboardingu
        OB->>U: Informacja: "Dodaj 3 ostatnie treningi"

        loop Dodawanie treningów (max 3)
            U->>OB: Wypełnienie formularza treningu
            OB->>OB: Walidacja (dystans, czas, data)
            U->>OB: Kliknięcie "Dodaj trening"
            OB->>API: POST /api/v1/workouts
            API->>API: requireUserId(context)
            API->>API: Walidacja (Zod)
            API->>DB: INSERT INTO workouts (user_id, ...)
            DB-->>API: Success {workout}
            API-->>OB: 201 Created
            OB->>OB: Aktualizacja licznika (treningi: X/3)

            alt Dodano 3 treningi
                OB->>OB: Wyświetlenie przycisku "Zakończ"
            end
        end

        U->>OB: Kliknięcie "Zakończ onboarding"
        OB->>CAL: window.location.href = '/'
        CAL->>MW: Request (z cookies)
        MW->>DB: COUNT workouts WHERE user_id = ?
        MW->>MW: workouts >= 3 ✓
        MW->>CAL: Kontynuacja
        CAL->>U: Wyświetlenie kalendarza
    end
```

## 6. Przepływ Wylogowania (Logout Flow)

```mermaid
sequenceDiagram
    actor U as Użytkownik
    participant CAL as / (Kalendarz)
    participant UM as UserMenu.tsx
    participant SB as Supabase Client
    participant API as POST /api/v1/auth/logout
    participant Store as Auth Store
    participant LP as /login

    U->>CAL: Korzystanie z aplikacji (zalogowany)
    CAL->>UM: Renderowanie UserMenu (prawy górny róg)
    UM->>U: Wyświetlenie menu użytkownika

    U->>UM: Kliknięcie "Wyloguj"
    UM->>UM: Wyświetlenie loading state

    par Czyszczenie sesji client-side
        UM->>SB: signOut()
        SB->>SB: Czyszczenie localStorage
        SB->>SB: Czyszczenie cookies
        SB-->>UM: Success
    and Czyszczenie store
        UM->>Store: authStore.clear()
        Store->>Store: userAtom = null
        Store->>Store: sessionAtom = null
    end

    UM->>API: POST /api/v1/auth/logout (opcjonalne)
    API->>API: Unieważnienie tokenu server-side
    API-->>UM: 200 OK

    UM->>LP: window.location.href = '/login'
    LP->>MW: Request (bez cookies)
    MW->>MW: Brak sesji → dozwolony dostęp do /login
    LP->>U: Wyświetlenie strony logowania
```

## 7. Diagram Stanów Użytkownika (User State Diagram)

```mermaid
stateDiagram-v2
    [*] --> Anonymous: Wejście na stronę

    Anonymous --> Registering: Kliknięcie "Zarejestruj się"
    Registering --> EmailVerificationPending: Wypełnienie formularza
    EmailVerificationPending --> Authenticated: Weryfikacja emaila
    EmailVerificationPending --> Anonymous: Anulowanie/Timeout

    Anonymous --> Authenticating: Kliknięcie "Zaloguj się"
    Authenticating --> Authenticated: Poprawne dane
    Authenticating --> Anonymous: Błędne dane

    Anonymous --> PasswordRecovery: "Zapomniałem hasła"
    PasswordRecovery --> EmailSent: Wysłanie emaila
    EmailSent --> ResettingPassword: Kliknięcie linku
    ResettingPassword --> Authenticated: Nowe hasło
    ResettingPassword --> Anonymous: Token wygasł

    Authenticated --> OnboardingCheck: Po zalogowaniu

    state OnboardingCheck <<choice>>
    OnboardingCheck --> Onboarding: workouts < 3
    OnboardingCheck --> Active: workouts >= 3

    Onboarding --> OnboardingInProgress: Dodawanie treningów
    OnboardingInProgress --> OnboardingInProgress: trening dodany (< 3)
    OnboardingInProgress --> Active: 3 treningi dodane

    Active --> UsingApp: Pełny dostęp
    UsingApp --> UsingApp: Korzystanie z funkcji
    UsingApp --> Anonymous: Wylogowanie

    Active --> SessionExpired: Token wygasł
    SessionExpired --> Anonymous: Przekierowanie na /login

    note right of Anonymous
        - Dostęp tylko do stron publicznych
        - /login, /register, /forgot-password
    end note

    note right of Active
        - Pełny dostęp do aplikacji
        - Kalendarz, treningi, AI
    end note

    note right of Onboarding
        - Ograniczony dostęp
        - Tylko /onboarding dostępne
    end note
```

## 8. Architektura Middleware i Ochrony Tras (Route Protection)

```mermaid
flowchart TD
    Start([Request]) --> MW[Middleware]
    MW --> CheckPath{Sprawdź ścieżkę}

    CheckPath -->|/api/v1/auth/*| AllowAPI[Zezwól na API auth]
    CheckPath -->|/login, /register, etc.| CheckPublic{Czy zalogowany?}
    CheckPath -->|Inne ścieżki| CheckAuth{Czy zalogowany?}

    CheckPublic -->|Tak| RedirectHome[Przekieruj na /]
    CheckPublic -->|Nie| AllowPublic[Renderuj stronę publiczną]

    CheckAuth -->|Nie| RedirectLogin[Przekieruj na /login?redirectTo=...]
    CheckAuth -->|Tak| CheckOnboarding{Sprawdź onboarding}

    CheckOnboarding -->|Ścieżka = /onboarding| AllowOnboarding[Renderuj /onboarding]
    CheckOnboarding -->|Inna ścieżka| CountWorkouts[COUNT workouts]

    CountWorkouts --> WorkoutsCheck{workouts >= 3?}
    WorkoutsCheck -->|Nie| RedirectOnboarding[Przekieruj na /onboarding]
    WorkoutsCheck -->|Tak| SetContext[Ustaw context.locals]

    SetContext --> AddUser[context.locals.user]
    AddUser --> AddSupabase[context.locals.supabase]
    AddSupabase --> Next[next()]

    AllowAPI --> Next
    AllowPublic --> Next
    AllowOnboarding --> Next
    RedirectHome --> End([Response])
    RedirectLogin --> End
    RedirectOnboarding --> End
    Next --> Handler[Route Handler]
    Handler --> End

    style MW fill:#4A90E2,color:#fff
    style CheckAuth fill:#F5A623,color:#fff
    style CheckOnboarding fill:#F5A623,color:#fff
    style RedirectLogin fill:#E74C3C,color:#fff
    style RedirectOnboarding fill:#E74C3C,color:#fff
    style Next fill:#27AE60,color:#fff
```

## 9. Integracja z Row Level Security (RLS)

```mermaid
flowchart LR
    subgraph Client ["Client (Browser)"]
        User[Użytkownik]
        Form[LoginForm/RegisterForm]
        SBClient[Supabase Client]
    end

    subgraph Server ["Astro Server (SSR)"]
        MW[Middleware]
        API[API Routes]
        SBServer[Supabase Server Client]
    end

    subgraph Supabase ["Supabase Backend"]
        Auth[Supabase Auth]

        subgraph Database ["PostgreSQL + RLS"]
            AuthSchema[(auth.users)]
            WorkoutsTable[(workouts)]
            SuggestionsTable[(ai_suggestions)]
            ProfilesTable[(user_profiles)]

            RLS1[RLS: user_id = auth.uid]
            RLS2[RLS: user_id = auth.uid]
            RLS3[RLS: user_id = auth.uid]
        end
    end

    User -->|Wypełnia formularz| Form
    Form -->|signInWithPassword| SBClient
    SBClient -->|HTTP + JWT| Auth
    Auth -->|Zwraca session| SBClient
    SBClient -->|Zapisuje do localStorage| SBClient

    User -->|Request do /api/v1/workouts| MW
    MW -->|Authorization: Bearer TOKEN| API
    API -->|createServerClient z JWT| SBServer
    SBServer -->|Query z JWT| Auth
    Auth -->|Weryfikuje JWT| Auth

    Auth -.->|auth.uid = user_id| RLS1
    Auth -.->|auth.uid = user_id| RLS2
    Auth -.->|auth.uid = user_id| RLS3

    SBServer -->|SELECT * FROM workouts| WorkoutsTable
    WorkoutsTable -->|RLS filtruje| RLS1
    RLS1 -->|Tylko własne rekordy| SBServer
    SBServer -->|Response| API
    API -->|JSON| User

    style Auth fill:#3ECF8E,color:#fff
    style RLS1 fill:#FF6B6B,color:#fff
    style RLS2 fill:#FF6B6B,color:#fff
    style RLS3 fill:#FF6B6B,color:#fff
    style SBClient fill:#4A90E2,color:#fff
    style SBServer fill:#4A90E2,color:#fff
```

## 10. Podsumowanie - Kluczowe Elementy Systemu

```mermaid
mindmap
  root((System<br/>Autentykacji))
    Frontend
      Strony publiczne
        /login
        /register
        /forgot-password
        /reset-password
      Komponenty React
        LoginForm.tsx
        RegisterForm.tsx
        ForgotPasswordForm.tsx
        ResetPasswordForm.tsx
        UserMenu.tsx
        AuthProvider.tsx
      Walidacja client-side
        Zod schemas
        Real-time validation
        Error messages
    Backend
      API Endpoints
        POST /api/v1/auth/login
        POST /api/v1/auth/register
        POST /api/v1/auth/logout
        POST /api/v1/auth/forgot-password
        POST /api/v1/auth/reset-password
        GET /api/v1/auth/me
      Middleware
        Weryfikacja JWT
        Sprawdzanie onboardingu
        Przekierowania
        context.locals
      Utilities
        requireUserId
        requireServiceRole
        Rate limiting
    Supabase
      Auth Service
        signUp
        signInWithPassword
        signOut
        resetPasswordForEmail
        updateUser
      Session Management
        JWT tokens
        Refresh tokens
        Auto refresh
      Email Service
        Weryfikacja email
        Reset hasła
    Database
      auth.users
        Zarządzane przez Supabase
        Email verification
      user_profiles
        Trigger: handle_new_user
        onboarding_completed
        RLS policies
      RLS Policies
        user_id = auth.uid
        Ochrona wszystkich tabel
    Security
      Rate Limiting
        Login: 5/15min
        Password reset: 3/1h
      Validation
        Email format
        Password strength
        CSRF protection
      Session
        HttpOnly cookies
        Secure flag
        SameSite: Lax
```

---

## Notatki Implementacyjne

### Status Implementacji w Codebase

#### ✅ ZAIMPLEMENTOWANE:
1. **Middleware** - `/src/middleware/index.ts`
   - Weryfikacja JWT z Authorization header
   - Per-request Supabase client (RLS support)
   - Sprawdzanie statusu onboardingu
   - Przekierowania do /onboarding

2. **Auth Utilities** - `/src/lib/http/auth.ts`
   - `requireUserId()` - wymaga user JWT
   - `requireServiceRole()` - wymaga service-role key

3. **Supabase Client** - `/src/db/supabase.client.ts`
   - Browser-side Supabase client
   - Konfiguracja z env variables

4. **UserMenu Component** - `/src/components/UserMenu.tsx`
   - Logout functionality
   - Redirects to /login after logout

5. **Database RLS**
   - Wszystkie tabele mają RLS enabled
   - Polityki: `user_id = auth.uid()`
   - Foreign keys do `auth.users(id)`

6. **Test Script** - `/.curls/auth-test-user.sh`
   - Tworzenie/logowanie test usera
   - Zwraca JWT token

#### ❌ NIE ZAIMPLEMENTOWANE (z tej specyfikacji):
1. Strony: `/login`, `/register`, `/forgot-password`, `/reset-password`
2. Komponenty: `LoginForm`, `RegisterForm`, etc.
3. API endpoints: `/api/v1/auth/*`
4. Validation schemas (Zod)
5. AuthService class
6. Auth Store (nanostores)
7. Rate limiting
8. E2E tests dla auth flows

### Kolejność Implementacji (Zalecana)

1. **Faza 1: Podstawowe strony i formularze**
   - `/login.astro` + `LoginForm.tsx`
   - `/register.astro` + `RegisterForm.tsx`
   - Walidacja Zod dla obu formularzy

2. **Faza 2: API endpoints**
   - `POST /api/v1/auth/login`
   - `POST /api/v1/auth/register`
   - `POST /api/v1/auth/logout`

3. **Faza 3: Password recovery**
   - `/forgot-password.astro` + `ForgotPasswordForm.tsx`
   - `/reset-password.astro` + `ResetPasswordForm.tsx`
   - `POST /api/v1/auth/forgot-password`
   - `POST /api/v1/auth/reset-password`

4. **Faza 4: Auth store i session management**
   - `authStore.ts` (nanostores)
   - `AuthProvider.tsx`
   - Auto refresh logic

5. **Faza 5: Security i polish**
   - Rate limiting
   - Error handling improvements
   - E2E tests
   - User profiles migration

### Zgodność z PRD

Wszystkie diagramy są zgodne z wymaganiami z `.ai/prd.md`:

- ✅ **Bezpieczny dostęp** (Punkt 60-73)
  - Dedykowane strony logowania i rejestracji
  - Wymaganie email + hasło
  - Brak zewnętrznych serwisów logowania
  - Odzyskiwanie hasła
  - Wylogowanie z przekierowaniem

- ✅ **Onboarding** (Punkt 32-36)
  - Wymagane 3 treningi przed dostępem do głównej aplikacji
  - Automatyczne przekierowanie po rejestracji
  - Sprawdzanie statusu w middleware

- ✅ **Chronione funkcjonalności** (Punkt 68)
  - Generowanie treningów: wymaga auth
  - Zarządzanie treningami: wymaga auth
  - Kalendarz: wymaga auth
  - Widok detali: wymaga auth

### Technologie i Integracje

- **Framework**: Astro 5 (SSR mode)
- **Auth Provider**: Supabase Auth
- **Database**: PostgreSQL (Supabase)
- **Validation**: Zod
- **State Management**: nanostores
- **UI Components**: React 19 + Tailwind 4
- **Testing**: Playwright (E2E)
