# Specyfikacja Architektury Modułu Autentykacji i Uwierzytelniania

## Przegląd Systemu

System autentykacji i uwierzytelniania dla aplikacji Training Planner bazuje na Supabase Auth jako głównym mechanizmie zarządzania użytkownikami i sesjami. Integracja z Astro w trybie SSR (Server-Side Rendering) zapewnia bezpieczeństwo i optymalną wydajność.

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1 Struktura Stron i Komponentów

#### A. Strony Publiczne (Non-Auth)

**`src/pages/login.astro`**
- **GŁÓWNA STRONA APLIKACJI dla niezalogowanych użytkowników**
- Strona logowania dostępna publicznie
- Renderowana server-side dla szybkiego ładowania
- Automatyczne przekierowanie zalogowanych użytkowników na dashboard (/)
- Komponenty:
  - `LoginForm.tsx` (client:load) - formularz logowania
  - Link do rejestracji
  - Link do odzyskiwania hasła

**`src/pages/register.astro`**
- Strona rejestracji nowych użytkowników
- Renderowana server-side
- Automatyczne przekierowanie zalogowanych użytkowników
- **Po pomyślnej rejestracji i weryfikacji email → przekierowanie na /onboarding**
- Komponenty:
  - `RegisterForm.tsx` (client:load) - formularz rejestracji
  - Link do logowania

**`src/pages/forgot-password.astro`**
- Strona inicjowania procesu odzyskiwania hasła
- Komponenty:
  - `ForgotPasswordForm.tsx` (client:load) - formularz z polem email

**`src/pages/reset-password.astro`**
- Strona resetowania hasła (dostępna przez link z emaila)
- Weryfikacja tokenu z URL
- Komponenty:
  - `ResetPasswordForm.tsx` (client:load) - formularz z nowymi hasłami

#### B. Strony Chronione (Auth Required)

**Modyfikacja istniejących stron:**
- `src/pages/index.astro` - główny kalendarz (wymaga auth)
- `src/pages/goal.astro` - zarządzanie celem (wymaga auth)
- `src/pages/onboarding.astro` - proces onboardingu (wymaga auth)
- `src/pages/workouts/[id].astro` - szczegóły treningu (wymaga auth)

### 1.2 Komponenty React (Client-Side)

#### A. Formularze Autentykacji

**`src/components/auth/LoginForm.tsx`**
```typescript
interface LoginFormProps {
  redirectTo?: string;
}

// Pola formularza:
- email: string (walidacja: email format)
- password: string (walidacja: min 8 znaków)

// Stan komponentu:
- loading: boolean
- error: string | null
- fieldErrors: Record<string, string>
```

**`src/components/auth/RegisterForm.tsx`**
```typescript
interface RegisterFormProps {
  redirectTo?: string;
}

// Pola formularza:
- email: string (walidacja: email format, uniqueness)
- password: string (walidacja: min 8 znaków, zawiera cyfry i litery)
- confirmPassword: string (walidacja: zgodność z password)
- acceptTerms: boolean (walidacja: wymagane)

// Stan komponentu:
- loading: boolean
- error: string | null
- fieldErrors: Record<string, string>
- step: 'form' | 'verification'
```

**`src/components/auth/ForgotPasswordForm.tsx`**
```typescript
// Pola formularza:
- email: string (walidacja: email format)

// Stan komponentu:
- loading: boolean
- error: string | null
- success: boolean
```

**`src/components/auth/ResetPasswordForm.tsx`**
```typescript
interface ResetPasswordFormProps {
  token: string;
}

// Pola formularza:
- newPassword: string (walidacja: min 8 znaków)
- confirmPassword: string (walidacja: zgodność)

// Stan komponentu:
- loading: boolean
- error: string | null
- success: boolean
```

#### B. Komponenty Pomocnicze

**`src/components/auth/AuthGuard.tsx`**
```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

// Komponent wrapper sprawdzający stan autoryzacji
// Pokazuje loading state podczas weryfikacji
// Przekierowuje lub pokazuje fallback dla niezalogowanych
```

**`src/components/auth/ProtectedRoute.tsx`**
```typescript
// Komponent HOC do ochrony tras client-side
// Używany dla dynamicznych komponentów React
```

### 1.3 Modyfikacje Istniejących Komponentów

**`src/layouts/Layout.astro`**
```astro
---
import { isAuthenticated } from '../lib/auth/server';

const authenticated = await isAuthenticated(Astro);
const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password']
  .includes(Astro.url.pathname);

// Usunięto logikę przekierowania, która została przeniesiona do middleware
---
```

**`src/components/Header.astro`**
```astro
---
import { isAuthenticated } from '../lib/auth/server';
const authenticated = await isAuthenticated(Astro);
const userEmail = Astro.locals.user?.email ?? null;
---

<!-- Warunkowe renderowanie elementów menu -->
{authenticated ? (
  <UserMenu client:load userEmail={userEmail} />
) : (
  <AuthButtons />
)}
```

**`src/components/UserMenu.tsx`** (rozszerzenie)
- Przyjmuje dane użytkownika (email) przez props z Astro.locals.user (server-side)
- Logout przez fetch API (POST /api/v1/auth/logout)
- Dodanie obsługi błędów sesji
- Graceful degradation przy braku połączenia

### 1.4 Walidacja i Komunikaty Błędów

#### A. Walidacja Client-Side

**Reguły walidacji:**
- Email: regex pattern, sprawdzanie domeny
- Hasło: minimum 8 znaków, kombinacja liter i cyfr
- Potwierdzenie hasła: identyczność z hasłem
- Pola wymagane: oznaczone czerwoną gwiazdką

**Komunikaty błędów:**
```typescript
const errorMessages = {
  'auth/invalid-email': 'Nieprawidłowy adres email',
  'auth/user-not-found': 'Nie znaleziono użytkownika z tym adresem email',
  'auth/wrong-password': 'Nieprawidłowe hasło',
  'auth/email-already-in-use': 'Ten adres email jest już zarejestrowany',
  'auth/weak-password': 'Hasło jest zbyt słabe. Użyj minimum 8 znaków',
  'auth/network-error': 'Błąd połączenia. Sprawdź swoje połączenie internetowe',
  'auth/too-many-requests': 'Zbyt wiele prób. Spróbuj ponownie za chwilę',
  'validation/email-required': 'Adres email jest wymagany',
  'validation/password-required': 'Hasło jest wymagane',
  'validation/password-mismatch': 'Hasła nie są identyczne',
  'validation/terms-required': 'Musisz zaakceptować regulamin',
};
```

#### B. Feedback Wizualny

- Loading states: spinner podczas przetwarzania
- Success states: zielone powiadomienia
- Error states: czerwone obramowania pól, komunikaty pod polami
- Disabled states: szare przyciski podczas ładowania

### 1.5 Obsługa Scenariuszy UX

#### A. Scenariusz Rejestracji

1. Użytkownik wypełnia formularz rejestracji
2. Walidacja real-time podczas pisania (debounced)
3. Submit → loading state
4. Sukces → komunikat o wysłaniu emaila weryfikacyjnego
5. Przekierowanie na stronę weryfikacji emaila
6. Po weryfikacji → automatyczne logowanie → **OBOWIĄZKOWE przekierowanie na /onboarding**
7. Po ukończeniu onboardingu (dodanie 3 treningów) → przekierowanie na główny kalendarz (/)

#### B. Scenariusz Logowania

1. Użytkownik wprowadza dane
2. Submit → loading state
3. Sprawdzenie czy użytkownik ukończył onboarding:
   - Jeśli NIE → przekierowanie na /onboarding
   - Jeśli TAK → przekierowanie na główny kalendarz (/) lub poprzednią stronę
4. Błąd → wyświetlenie komunikatu, focus na błędnym polu

#### C. Scenariusz Odzyskiwania Hasła

1. Użytkownik podaje email
2. System wysyła link resetowania
3. Komunikat o wysłaniu emaila (bez ujawniania czy email istnieje)
4. Użytkownik klika link → strona reset-password z tokenem
5. Wprowadzenie nowego hasła
6. Sukces → automatyczne logowanie → sprawdzenie onboardingu jak w scenariuszu B

#### D. Scenariusz Wylogowania

1. Kliknięcie "Wyloguj" w UserMenu (prawy górny róg)
2. Czyszczenie sesji i cache
3. Przekierowanie na stronę logowania (/login)

## 2. LOGIKA BACKENDOWA

### 2.1 Struktura Endpointów API

#### A. Endpointy Autentykacji

**`POST /api/v1/auth/login`**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
    metadata?: Record<string, any>;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}
```

**`POST /api/v1/auth/register`**
```typescript
interface RegisterRequest {
  email: string;
  password: string;
  metadata?: {
    acceptedTermsAt?: string;
  };
}

interface RegisterResponse {
  user: {
    id: string;
    email: string;
  };
  requiresEmailVerification: boolean;
}
```

**`POST /api/v1/auth/logout`**
```typescript
// Wymaga Authorization header
interface LogoutResponse {
  success: boolean;
}
```

**`POST /api/v1/auth/forgot-password`**
```typescript
interface ForgotPasswordRequest {
  email: string;
}

interface ForgotPasswordResponse {
  message: string;
}
```

**`POST /api/v1/auth/reset-password`**
```typescript
interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

interface ResetPasswordResponse {
  success: boolean;
}
```

**`POST /api/v1/auth/refresh`**
```typescript
interface RefreshRequest {
  refresh_token: string;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}
```

**`GET /api/v1/auth/me`**
```typescript
// Wymaga Authorization header
interface MeResponse {
  user: {
    id: string;
    email: string;
    metadata?: Record<string, any>;
    created_at: string;
  };
}
```

### 2.2 Mechanizm Walidacji Danych

#### A. Walidacja z Zod

**`src/lib/validation/auth.ts`**
```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string()
    .email('Nieprawidłowy format adresu email')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Hasło musi mieć minimum 8 znaków'),
});

export const registerSchema = z.object({
  email: z.string()
    .email('Nieprawidłowy format adresu email')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .regex(/[A-Za-z]/, 'Hasło musi zawierać litery')
    .regex(/[0-9]/, 'Hasło musi zawierać cyfry'),
  metadata: z.object({
    acceptedTermsAt: z.string().datetime().optional(),
  }).optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Nieprawidłowy format adresu email')
    .toLowerCase()
    .trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token jest wymagany'),
  newPassword: z.string()
    .min(8, 'Hasło musi mieć minimum 8 znaków')
    .regex(/[A-Za-z]/, 'Hasło musi zawierać litery')
    .regex(/[0-9]/, 'Hasło musi zawierać cyfry'),
});
```

#### B. Middleware Walidacji

**`src/lib/middleware/validation.ts`**
```typescript
import type { APIContext } from 'astro';
import { ZodSchema } from 'zod';

export async function validateRequest<T>(
  context: APIContext,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await context.request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw createApiError(422, 'validation_error', 'Invalid request data', {
        errors: error.errors,
      });
    }
    throw error;
  }
}
```

### 2.3 Obsługa Wyjątków

#### A. Hierarchia Błędów

**`src/lib/errors/auth.ts`**
```typescript
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super('invalid_credentials', 'Invalid email or password', 401);
  }
}

export class EmailNotVerifiedError extends AuthError {
  constructor() {
    super('email_not_verified', 'Please verify your email first', 403);
  }
}

export class SessionExpiredError extends AuthError {
  constructor() {
    super('session_expired', 'Your session has expired', 401);
  }
}

export class RateLimitError extends AuthError {
  constructor(retryAfter: number) {
    super('rate_limit', `Too many attempts. Try again in ${retryAfter} seconds`, 429);
  }
}
```

#### B. Global Error Handler

**`src/lib/middleware/errorHandler.ts`**
```typescript
export function handleAuthError(error: unknown): Response {
  console.error('[Auth Error]:', error);

  if (error instanceof AuthError) {
    return jsonResponse(error.statusCode, {
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (error instanceof SupabaseError) {
    return jsonResponse(401, {
      error: {
        code: 'supabase_error',
        message: 'Authentication service error',
      },
    });
  }

  return jsonResponse(500, {
    error: {
      code: 'internal_error',
      message: 'An unexpected error occurred',
    },
  });
}
```

### 2.4 Server-Side Rendering z Astro

#### A. Middleware Autentykacji

**`src/middleware/index.ts`**
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type MiddlewareHandler } from 'astro';

const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/api/auth/callback'];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { url, cookies, redirect } = context;
  const isPublicPath = publicPaths.some(path => url.pathname.startsWith(path));
  const isApiAuthPath = url.pathname.startsWith('/api/v1/auth');

  // Przekieruj główną stronę na login dla niezalogowanych
  if (url.pathname === '/' && !isAuthenticated) {
    return redirect('/login');
  }

  // Utwórz klienta Supabase dla żądania po stronie serwera
  const supabase = createServerClient(import.meta.env.SUPABASE_URL!, import.meta.env.SUPABASE_ANON_KEY!, {
    cookies: {
      get: (key) => cookies.get(key)?.value,
      set: (key, value, options) => cookies.set(key, value, options as CookieOptions & { path: string }),
      remove: (key, options) => cookies.delete(key, options as CookieOptions & { path: string }),
    },
  });

  // Pobierz sesję użytkownika
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  // Przekieruj zalogowanych użytkowników ze stron publicznych do strony głównej
  if (user && isPublicPath) {
    return redirect('/');
  }

  // Zezwól na dostęp do publicznych ścieżek i endpointów API autentykacji
  if (!user && !isPublicPath && !isApiAuthPath) {
    return redirect('/login?redirectTo=' + encodeURIComponent(url.pathname));
  }

  // Udostępnij klienta Supabase i sesję w kontekście Astro
  context.locals.supabase = supabase;
  context.locals.session = session;
  context.locals.user = user;

  return next();
};
```

#### B. Helpery Server-Side

**`src/lib/auth/server.ts`**
```typescript
import type { AstroGlobal } from 'astro';
import { supabaseServer } from '../supabase/server';

export async function isAuthenticated(astro: AstroGlobal): Promise<boolean> {
  const accessToken = astro.cookies.get('sb-access-token');
  if (!accessToken) return false;

  const { data, error } = await supabaseServer.auth.getUser(accessToken.value);
  return !error && !!data.user;
}

export async function getUser(astro: AstroGlobal) {
  const accessToken = astro.cookies.get('sb-access-token');
  if (!accessToken) return null;

  const { data, error } = await supabaseServer.auth.getUser(accessToken.value);
  if (error) return null;

  return data.user;
}

export async function requireAuth(astro: AstroGlobal) {
  const user = await getUser(astro);

  if (!user) {
    return astro.redirect('/login?redirectTo=' + encodeURIComponent(astro.url.pathname));
  }

  return user;
}
```

## 3. SYSTEM AUTENTYKACJI - INTEGRACJA Z SUPABASE

### 3.1 Konfiguracja Supabase Auth

#### A. Inicjalizacja Klientów

**`src/lib/supabase/client.ts`** (Browser)
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../../db/database.types';

export const supabaseClient = createBrowserClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: localStorage, // Uproszczone dla MVP - zawsze używaj localStorage
    },
  }
);
```

**`src/lib/supabase/server.ts`** (Server)
```typescript
import { createServerClient } from '@supabase/ssr';
import type { Database } from '../../db/database.types';
import type { AstroGlobal } from 'astro';

export function createSupabaseServer(context: AstroGlobal) {
  return createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key) {
          return context.cookies.get(key)?.value;
        },
        set(key, value, options) {
          context.cookies.set(key, value, {
            ...options,
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
          });
        },
        remove(key) {
          context.cookies.delete(key);
        },
      },
    }
  );
}
```

### 3.2 Serwisy Autentykacji

#### A. AuthService

**`src/lib/services/authService.ts`**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';

export class AuthService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new InvalidCredentialsError();
      }
      throw error;
    }

    return data;
  }

  async register(email: string, password: string, metadata?: Record<string, any>) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes('User already registered')) {
        throw new AuthError('email_already_exists', 'Email already registered', 422);
      }
      throw error;
    }

    return data;
  }

  async logout() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async forgotPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  }

  async resetPassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  }

  async refreshSession() {
    const { data, error } = await this.supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  }

  async getSession() {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async getUser() {
    const { data, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }
}
```

### 3.3 Session Management

#### A. Session Store

**`src/lib/stores/authStore.ts`**
```typescript
import { atom, computed } from 'nanostores';
import type { User, Session } from '@supabase/supabase-js';

export const userAtom = atom<User | null>(null);
export const sessionAtom = atom<Session | null>(null);
export const loadingAtom = atom<boolean>(true);

export const isAuthenticatedAtom = computed(userAtom, (user) => !!user);

export const authStore = {
  setUser: (user: User | null) => userAtom.set(user),
  setSession: (session: Session | null) => sessionAtom.set(session),
  setLoading: (loading: boolean) => loadingAtom.set(loading),

  clear: () => {
    userAtom.set(null);
    sessionAtom.set(null);
    loadingAtom.set(false);
  },

  initialize: async (authService: AuthService) => {
    try {
      loadingAtom.set(true);
      const session = await authService.getSession();

      if (session) {
        sessionAtom.set(session);
        userAtom.set(session.user);
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      authStore.clear();
    } finally {
      loadingAtom.set(false);
    }
  },
};
```

#### B. Auth Provider

**`src/components/providers/AuthProvider.tsx`**
```typescript
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { authStore, loadingAtom } from '../../lib/stores/authStore';
import { authService } from '../../lib/services/authService';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const loading = useStore(loadingAtom);

  useEffect(() => {
    // Inicjalizuj stan autentykacji
    authStore.initialize(authService);

    // Subskrybuj zmiany stanu
    const { data: subscription } = authService.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);

      switch (event) {
        case 'SIGNED_IN':
          authStore.setSession(session);
          authStore.setUser(session?.user ?? null);
          break;

        case 'SIGNED_OUT':
          authStore.clear();
          window.location.href = '/login';
          break;

        case 'TOKEN_REFRESHED':
          authStore.setSession(session);
          break;

        case 'USER_UPDATED':
          authStore.setUser(session?.user ?? null);
          break;
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner" />
      </div>
    );
  }

  return <>{children}</>;
}
```

### 3.4 Rate Limiting i Bezpieczeństwo

#### A. Rate Limiter

**`src/lib/services/rateLimiter.ts`**
```typescript
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export class RateLimiter {
  private attempts = new Map<string, number[]>();

  constructor(private config: RateLimitConfig) {}

  check(identifier: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];

    // Usuń stare próby
    const validAttempts = attempts.filter(
      (timestamp) => now - timestamp < this.config.windowMs
    );

    if (validAttempts.length >= this.config.maxAttempts) {
      const oldestAttempt = validAttempts[0];
      const retryAfter = Math.ceil((oldestAttempt + this.config.windowMs - now) / 1000);

      return { allowed: false, retryAfter };
    }

    // Zapisz nową próbę
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);

    return { allowed: true };
  }

  reset(identifier: string) {
    this.attempts.delete(identifier);
  }
}

// Konfiguracja dla różnych operacji
export const loginRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minut
});

export const forgotPasswordRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 godzina
});
```

<!-- CSRF Protection - pominięte w MVP, Supabase zapewnia podstawową ochronę -->

### 3.5 Integracja z Onboardingiem

#### A. Post-Registration Flow

**`src/lib/flows/onboardingFlow.ts`**
```typescript
export class OnboardingFlow {
  static async initiate(userId: string) {
    // Sprawdź czy użytkownik już przeszedł onboarding
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('onboarding_completed')
      .eq('user_id', userId)
      .single();

    if (profile?.onboarding_completed) {
      return { redirect: '/' };
    }

    // Ustaw flagę w sesji
    sessionStorage.setItem('onboarding_required', 'true');

    return { redirect: '/onboarding' };
  }

  static async complete(userId: string) {
    // Oznacz onboarding jako ukończony
    await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    sessionStorage.removeItem('onboarding_required');
  }
}
```

## 4. MIGRACJE BAZY DANYCH

### 4.1 Tabela Profili Użytkowników

**`supabase/migrations/[timestamp]_create_user_profiles.sql`**
```sql
-- Tabela rozszerzeń profilu użytkownika
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  accepted_terms_at TIMESTAMPTZ,
  pace_unit VARCHAR(10) DEFAULT 'min/km',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id),
  UNIQUE(email)
);

-- Indeksy
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

-- RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Polityki RLS
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger na automatyczne tworzenie profilu
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger na aktualizację updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
```

<!-- Audit Log - pominięte w MVP, może być dodane w przyszłości -->

## 5. TESTY I MONITORING

### 5.1 Testy E2E

**`tests/e2e/auth.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('/register');

    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123');
    await page.fill('[name="confirmPassword"]', 'TestPassword123');
    await page.check('[name="acceptTerms"]');

    await page.click('button[type="submit"]');

    // Powinien pokazać komunikat o weryfikacji emaila
    await expect(page.locator('.success-message')).toContainText('verification email');
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'existing@example.com');
    await page.fill('[name="password"]', 'Password123');

    await page.click('button[type="submit"]');

    // Powinien przekierować na dashboard
    await expect(page).toHaveURL('/');
  });

  test('should handle wrong credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('[name="email"]', 'wrong@example.com');
    await page.fill('[name="password"]', 'WrongPassword');

    await page.click('button[type="submit"]');

    // Powinien pokazać błąd
    await expect(page.locator('.error-message')).toBeVisible();
  });
});
```

<!-- Monitoring - uproszczony dla MVP, wykorzystuje wbudowane logi Supabase -->

## 6. PODSUMOWANIE

System autentykacji zapewnia kompletne rozwiązanie dla zarządzania użytkownikami w aplikacji Training Planner MVP:

1. **Bezpieczeństwo**: Wykorzystanie Supabase Auth z podstawową ochroną (rate limiting)
2. **UX**: Intuicyjne formularze z walidacją real-time i przejrzystymi komunikatami błędów
3. **Flow**: Jasny przepływ: Login → Sprawdzenie onboardingu → Kalendarz lub Onboarding
4. **Główna strona**: `/login` dla niezalogowanych, `/` (kalendarz) dla zalogowanych
5. **Integracja z PRD**: Pełna zgodność z wymaganiami certyfikacyjnymi

### Kluczowe flow użytkownika:
- **Nowy użytkownik**: Rejestracja → Weryfikacja email → Login → Onboarding (3 treningi) → Kalendarz
- **Istniejący użytkownik**: Login → Kalendarz (jeśli ukończył onboarding)
- **Wylogowanie**: Przycisk w prawym górnym rogu → Przekierowanie na /login

System jest gotowy do implementacji zgodnie z wymaganiami MVP i certyfikacji.