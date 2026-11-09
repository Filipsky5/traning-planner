# Authentication Journey - Mermaid Diagrams

## 1. Main User Journey

```mermaid
journey
    title User Journey - Authentication System
    section New User
      Visit page: 3: User
      Redirect to /login: 5: System
      Click "Sign up": 5: User
      Complete registration form: 4: User
      Data validation (client): 5: System
      Submit form: 5: User
      Create account in Supabase: 5: System
      Send verification email: 5: System
      Verification notice: 4: User
      Click email link: 5: User
      Email verification: 5: System
      Automatic login: 5: System
      Redirect to /onboarding: 5: System
      Add 3 workouts: 3: User
      Redirect to calendar: 5: System
      Use application: 5: User
    section Returning User
      Visit page: 5: User
      Redirect to /login: 5: System
      Complete login form: 5: User
      Data validation: 5: System
      Submit form: 5: User
      Verification in Supabase: 5: System
      Check onboarding status: 5: System
      Redirect to calendar: 5: System
      Use application: 5: User
    section Password Recovery
      Click "Forgot password": 3: User
      Enter email address: 4: User
      Send reset link: 5: System
      Click email link: 5: User
      Enter new password: 4: User
      Update password: 5: System
      Automatic login: 5: System
      Check onboarding status: 5: System
      Redirect to appropriate page: 5: System
```

## 2. Registration Flow

```mermaid
sequenceDiagram
    actor U as User
    participant LP as /login
    participant RP as /register
    participant RF as RegisterForm.tsx
    participant API as POST /api/v1/auth/register
    participant SB as Supabase Auth
    participant DB as PostgreSQL (RLS)
    participant Email as Email Service
    participant OB as /onboarding

    U->>LP: Visit home page
    LP->>U: Display login page
    U->>LP: Click "Sign up"
    LP->>RP: Redirect to /register
    RP->>RF: Render form
    RF->>U: Display registration form

    U->>RF: Enter data (email, password, confirmation)
    RF->>RF: Client-side validation (Zod schema)
    RF->>RF: Check password match

    U->>RF: Click "Sign up"
    RF->>RF: Show loading state
    RF->>API: POST {email, password, metadata}
    API->>API: Data validation (Zod schema)
    API->>SB: signUp(email, password, options)

    alt Email already exists
        SB-->>API: Error: email_already_exists
        API-->>RF: 422 Unprocessable Entity
        RF->>RF: Hide loading state
        RF->>U: Message: "Email is already registered"
    else Registration successful
        SB->>DB: INSERT INTO auth.users
        DB->>DB: Trigger: handle_new_user()
        DB->>DB: INSERT INTO user_profiles
        SB->>Email: Send verification email
        SB-->>API: Success {user, session}
        API-->>RF: 201 Created
        RF->>RF: Hide loading state
        RF->>RF: Change step: 'form' → 'verification'
        RF->>U: Message: "Check your email to verify your account"

        Note over U,Email: User opens email and clicks link

        U->>Email: Click verification link
        Email->>SB: Verify token
        SB->>SB: Update email_confirmed_at
        SB->>LP: Redirect + session cookies
        LP->>LP: Middleware: detect logged-in user
        LP->>OB: Redirect to /onboarding
        OB->>U: Display onboarding process
    end
```

## 3. Login Flow

```mermaid
sequenceDiagram
    actor U as User
    participant LP as /login
    participant LF as LoginForm.tsx
    participant API as POST /api/v1/auth/login
    participant SB as Supabase Auth
    participant MW as Middleware
    participant CAL as / (Calendar)
    participant OB as /onboarding

    U->>LP: Visit page (logged out)
    LP->>LF: Render form
    LF->>U: Display login form

    U->>LF: Enter email and password
    LF->>LF: Client-side validation (Zod)

    U->>LF: Click "Log in"
    LF->>LF: Show loading state
    LF->>API: POST {email, password}
    API->>API: Data validation (Zod schema)
    API->>API: Rate limiting check (5 attempts / 15 min)

    alt Rate limit exceeded
        API-->>LF: 429 Too Many Requests
        LF->>U: Message: "Too many attempts. Try again in X minutes"
    else Rate limit OK
        API->>SB: signInWithPassword(email, password)

        alt Invalid login credentials
            SB-->>API: Error: Invalid login credentials
            API-->>LF: 401 Unauthorized
            LF->>LF: Hide loading state
            LF->>U: Message: "Invalid email or password"
            LF->>LF: Focus email field
        else Login successful
            SB-->>API: Success {user, session}
            API->>API: Set session cookies
            API-->>LF: 200 OK {user, session}
            LF->>CAL: window.location.href = '/'

            CAL->>MW: Request to / (with cookies)
            MW->>MW: Read session from cookies
            MW->>SB: Verify session
            MW->>MW: Check workout count

            alt User has < 3 workouts
                MW->>OB: Redirect to /onboarding
                OB->>U: Display onboarding process
            else User has >= 3 workouts
                MW->>CAL: Continue to /
                CAL->>U: Display calendar
            end
        end
    end
```

## 4. Password Recovery Flow

```mermaid
sequenceDiagram
    actor U as User
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
    participant CAL as / (Calendar)

    U->>LP: Visit /login
    U->>LP: Click "Forgot password"
    LP->>FP: Redirect to /forgot-password
    FP->>FPF: Render form
    FPF->>U: Display form (email field)

    U->>FPF: Enter email address
    FPF->>FPF: Email validation (Zod)
    U->>FPF: Click "Send link"
    FPF->>FPF: Show loading state
    FPF->>API1: POST {email}
    API1->>API1: Validation (Zod)
    API1->>API1: Rate limiting (3 attempts / 1h)

    alt Rate limit exceeded
        API1-->>FPF: 429 Too Many Requests
        FPF->>U: Message: "Too many attempts. Try again in an hour"
    else Rate limit OK
        API1->>SB: resetPasswordForEmail(email, redirectTo)
        SB->>Email: Send email with link
        SB-->>API1: Success (always, even if email does not exist)
        API1-->>FPF: 200 OK
        FPF->>FPF: success = true
        FPF->>U: Message: "If the email exists, we have sent a reset link"

        Note over U,Email: User opens email and clicks link

        U->>Email: Click reset link
        Email->>RP: Redirect to /reset-password?token=XXX
        RP->>RP: Extract token from URL
        RP->>RPF: Render form with token
        RPF->>U: Display form (new password, confirmation)

        U->>RPF: Enter new password
        RPF->>RPF: Client-side validation (Zod)
        RPF->>RPF: Check password match
        U->>RPF: Click "Reset password"
        RPF->>RPF: Show loading state
        RPF->>API2: POST {token, newPassword}
        API2->>API2: Validation (Zod)
        API2->>SB: updateUser({password: newPassword})

        alt Token invalid/expired
            SB-->>API2: Error: Invalid token
            API2-->>RPF: 401 Unauthorized
            RPF->>U: Message: "Link expired. Request a new one"
        else Success
            SB->>SB: Update password
            SB-->>API2: Success {session}
            API2->>API2: Set session cookies
            API2-->>RPF: 200 OK
            RPF->>CAL: window.location.href = '/'

            CAL->>MW: Request to / (with cookies)
            MW->>MW: Check onboarding status

            alt User has not completed onboarding
                MW->>U: Redirect to /onboarding
            else User completed onboarding
                MW->>CAL: Continue
                CAL->>U: Display calendar
            end
        end
    end
```

## 5. Onboarding Flow

```mermaid
sequenceDiagram
    actor U as User
    participant OB as /onboarding
    participant MW as Middleware
    participant API as POST /api/v1/workouts
    participant DB as PostgreSQL
    participant CAL as / (Calendar)

    Note over U,OB: User redirected after registration/login

    U->>OB: Visit /onboarding
    OB->>MW: Request (with session cookies)
    MW->>MW: Verify authentication
    MW->>DB: COUNT workouts WHERE user_id = ?

    alt User has >= 3 workouts
        MW->>CAL: Redirect to /
    else User has < 3 workouts
        MW->>OB: Continue
        OB->>U: Display onboarding interface
        OB->>U: Notice: "Add your 3 recent workouts"

        loop Adding workouts (max 3)
            U->>OB: Complete workout form
            OB->>OB: Validation (distance, time, date)
            U->>OB: Click "Add workout"
            OB->>API: POST /api/v1/workouts
            API->>API: requireUserId(context)
            API->>API: Validation (Zod)
            API->>DB: INSERT INTO workouts (user_id, ...)
            DB-->>API: Success {workout}
            API-->>OB: 201 Created
            OB->>OB: Update counter (workouts: X/3)

            alt 3 workouts added
                OB->>OB: Display "Finish" button
            end
        end

        U->>OB: Click "Finish onboarding"
        OB->>CAL: window.location.href = '/'
        CAL->>MW: Request (with cookies)
        MW->>DB: COUNT workouts WHERE user_id = ?
        MW->>MW: workouts >= 3 ✓
        MW->>CAL: Continue
        CAL->>U: Display calendar
    end
```

## 6. Logout Flow

```mermaid
sequenceDiagram
    actor U as User
    participant CAL as / (Calendar)
    participant UM as UserMenu.tsx
    participant SB as Supabase Client
    participant API as POST /api/v1/auth/logout
    participant Store as Auth Store
    participant LP as /login

    U->>CAL: Use application (logged in)
    CAL->>UM: Render UserMenu (top-right corner)
    UM->>U: Display user menu

    U->>UM: Click "Log out"
    UM->>UM: Show loading state

    par Clear client-side session
        UM->>SB: signOut()
        SB->>SB: Clear localStorage
        SB->>SB: Clear cookies
        SB-->>UM: Success
    and Clear store
        UM->>Store: authStore.clear()
        Store->>Store: userAtom = null
        Store->>Store: sessionAtom = null
    end

    UM->>API: POST /api/v1/auth/logout (optional)
    API->>API: Invalidate server-side token
    API-->>UM: 200 OK

    UM->>LP: window.location.href = '/login'
    LP->>MW: Request (without cookies)
    MW->>MW: No session → allow access to /login
    LP->>U: Display login page
```

## 7. User State Diagram

```mermaid
stateDiagram-v2
    [*] --> Anonymous: Visit page

    Anonymous --> Registering: Click "Sign up"
    Registering --> EmailVerificationPending: Complete form
    EmailVerificationPending --> Authenticated: Email verification
    EmailVerificationPending --> Anonymous: Cancel/Timeout

    Anonymous --> Authenticating: Click "Log in"
    Authenticating --> Authenticated: Valid credentials
    Authenticating --> Anonymous: Invalid credentials

    Anonymous --> PasswordRecovery: "Forgot password"
    PasswordRecovery --> EmailSent: Send email
    EmailSent --> ResettingPassword: Click link
    ResettingPassword --> Authenticated: New password
    ResettingPassword --> Anonymous: Token expired

    Authenticated --> OnboardingCheck: After login

    state OnboardingCheck <<choice>>
    OnboardingCheck --> Onboarding: workouts < 3
    OnboardingCheck --> Active: workouts >= 3

    Onboarding --> OnboardingInProgress: Adding workouts
    OnboardingInProgress --> OnboardingInProgress: workout added (< 3)
    OnboardingInProgress --> Active: 3 workouts added

    Active --> UsingApp: Full access
    UsingApp --> UsingApp: Use features
    UsingApp --> Anonymous: Logout

    Active --> SessionExpired: Token expired
    SessionExpired --> Anonymous: Redirect to /login

    note right of Anonymous
        - Public pages only
        - /login, /register, /forgot-password
    end note

    note right of Active
        - Full application access
        - Calendar, workouts, AI
    end note

    note right of Onboarding
        - Limited access
        - Only /onboarding available
    end note
```

## 8. Middleware and Route Protection Architecture

```mermaid
flowchart TD
    Start([Request]) --> MW[Middleware]
    MW --> CheckPath{Check path}

    CheckPath -->|/api/v1/auth/*| AllowAPI[Allow auth API]
    CheckPath -->|/login, /register, etc.| CheckPublic{Logged in?}
    CheckPath -->|Other paths| CheckAuth{Logged in?}

    CheckPublic -->|Yes| RedirectHome[Redirect to /]
    CheckPublic -->|No| AllowPublic[Render public page]

    CheckAuth -->|No| RedirectLogin[Redirect to /login?redirectTo=...]
    CheckAuth -->|Yes| CheckOnboarding{Check onboarding}

    CheckOnboarding -->|Path = /onboarding| AllowOnboarding[Render /onboarding]
    CheckOnboarding -->|Other path| CountWorkouts[COUNT workouts]

    CountWorkouts --> WorkoutsCheck{workouts >= 3?}
    WorkoutsCheck -->|No| RedirectOnboarding[Redirect to /onboarding]
    WorkoutsCheck -->|Yes| SetContext[Set context.locals]

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

## 9. Row Level Security (RLS) Integration

```mermaid
flowchart LR
    subgraph Client ["Client (Browser)"]
        User[User]
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

    User -->|Completes form| Form
    Form -->|signInWithPassword| SBClient
    SBClient -->|HTTP + JWT| Auth
    Auth -->|Returns session| SBClient
    SBClient -->|Saves to localStorage| SBClient

    User -->|Request to /api/v1/workouts| MW
    MW -->|Authorization: Bearer TOKEN| API
    API -->|createServerClient with JWT| SBServer
    SBServer -->|Query with JWT| Auth
    Auth -->|Verifies JWT| Auth

    Auth -.->|auth.uid = user_id| RLS1
    Auth -.->|auth.uid = user_id| RLS2
    Auth -.->|auth.uid = user_id| RLS3

    SBServer -->|SELECT * FROM workouts| WorkoutsTable
    WorkoutsTable -->|RLS filters| RLS1
    RLS1 -->|Own records only| SBServer
    SBServer -->|Response| API
    API -->|JSON| User

    style Auth fill:#3ECF8E,color:#fff
    style RLS1 fill:#FF6B6B,color:#fff
    style RLS2 fill:#FF6B6B,color:#fff
    style RLS3 fill:#FF6B6B,color:#fff
    style SBClient fill:#4A90E2,color:#fff
    style SBServer fill:#4A90E2,color:#fff
```

## 10. Summary - Key System Elements

```mermaid
mindmap
  root((Authentication<br/>System))
    Frontend
      Public pages
        /login
        /register
        /forgot-password
        /reset-password
      React components
        LoginForm.tsx
        RegisterForm.tsx
        ForgotPasswordForm.tsx
        ResetPasswordForm.tsx
        UserMenu.tsx
        AuthProvider.tsx
      Client-side validation
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
        JWT verification
        Onboarding check
        Redirects
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
        Email verification
        Password reset
    Database
      auth.users
        Managed by Supabase
        Email verification
      user_profiles
        Trigger: handle_new_user
        onboarding_completed
        RLS policies
      RLS Policies
        user_id = auth.uid
        Protect all tables
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

## Implementation Notes

### Implementation Status in the Codebase

#### ✅ IMPLEMENTED:

1. **Middleware** - `/src/middleware/index.ts`
   - JWT verification from Authorization header
   - Per-request Supabase client (RLS support)
   - Onboarding status check
   - Redirects to /onboarding

2. **Auth Utilities** - `/src/lib/http/auth.ts`
   - `requireUserId()` - requires user JWT
   - `requireServiceRole()` - requires service-role key

3. **Supabase Client** - `/src/db/supabase.client.ts`
   - Browser-side Supabase client
   - Configuration from env variables

4. **UserMenu Component** - `/src/components/UserMenu.tsx`
   - Logout functionality
   - Redirects to /login after logout

5. **Database RLS**
   - All tables have RLS enabled
   - Policies: `user_id = auth.uid()`
   - Foreign keys to `auth.users(id)`

6. **Test Script** - `/.curls/auth-test-user.sh`
   - Create/log in test user
   - Returns JWT token

#### ❌ NOT IMPLEMENTED (from this specification):

1. Pages: `/login`, `/register`, `/forgot-password`, `/reset-password`
2. Components: `LoginForm`, `RegisterForm`, etc.
3. API endpoints: `/api/v1/auth/*`
4. Validation schemas (Zod)
5. AuthService class
6. Auth Store (nanostores)
7. Rate limiting
8. E2E tests for auth flows

### Implementation Order (Recommended)

1. **Phase 1: Basic pages and forms**
   - `/login.astro` + `LoginForm.tsx`
   - `/register.astro` + `RegisterForm.tsx`
   - Zod validation for both forms

2. **Phase 2: API endpoints**
   - `POST /api/v1/auth/login`
   - `POST /api/v1/auth/register`
   - `POST /api/v1/auth/logout`

3. **Phase 3: Password recovery**
   - `/forgot-password.astro` + `ForgotPasswordForm.tsx`
   - `/reset-password.astro` + `ResetPasswordForm.tsx`
   - `POST /api/v1/auth/forgot-password`
   - `POST /api/v1/auth/reset-password`

4. **Phase 4: Auth store and session management**
   - `authStore.ts` (nanostores)
   - `AuthProvider.tsx`
   - Auto refresh logic

5. **Phase 5: Security and polish**
   - Rate limiting
   - Error handling improvements
   - E2E tests
   - User profiles migration

### PRD Compliance

All diagrams comply with `.ai/prd.md` requirements:

- ✅ **Secure access** (Lines 60-73)
  - Dedicated login and registration pages
  - Email + password required
  - No external login services
  - Password recovery
  - Logout with redirect

- ✅ **Onboarding** (Lines 32-36)
  - 3 workouts required before accessing the main application
  - Automatic redirect after registration
  - Status check in middleware

- ✅ **Protected features** (Lines 68)
  - Workout generation: requires auth
  - Workout management: requires auth
  - Calendar: requires auth
  - Detail view: requires auth

### Technologies and Integrations

- **Framework**: Astro 5 (SSR mode)
- **Auth Provider**: Supabase Auth
- **Database**: PostgreSQL (Supabase)
- **Validation**: Zod
- **State Management**: nanostores
- **UI Components**: React 19 + Tailwind 4
- **Testing**: Playwright (E2E)
