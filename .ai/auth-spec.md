# Authentication and Authorization Module Architecture Specification

## System Overview

Training Planner's authentication and authorization system uses Supabase Auth to manage users and sessions. Integration with Astro in SSR (Server-Side Rendering) mode provides security and optimal performance.

## 1. USER INTERFACE ARCHITECTURE

### 1.1 Page and Component Structure

#### A. Public Pages (Non-Auth)

**`src/pages/login.astro`**

- **MAIN APPLICATION PAGE for logged-out users**
- Public login page
- Server-rendered for fast loading
- Automatically redirects logged-in users to the dashboard (/)
- Components:
  - `LoginForm.tsx` (client:load) - login form
  - Registration link
  - Password recovery link

**`src/pages/register.astro`**

- New user registration page
- Server-rendered
- Automatically redirects logged-in users
- **After successful registration and email verification → redirect to /onboarding**
- Components:
  - `RegisterForm.tsx` (client:load) - registration form
  - Login link

**`src/pages/forgot-password.astro`**

- Page initiating password recovery
- Components:
  - `ForgotPasswordForm.tsx` (client:load) - email form

**`src/pages/reset-password.astro`**

- Password reset page (accessed through an email link)
- URL token verification
- Components:
  - `ResetPasswordForm.tsx` (client:load) - new password form

#### B. Protected Pages (Auth Required)

**Changes to existing pages:**

- `src/pages/index.astro` - main calendar (requires auth)
- `src/pages/goal.astro` - goal management (requires auth)
- `src/pages/onboarding.astro` - onboarding process (requires auth)
- `src/pages/workouts/[id].astro` - workout details (requires auth)

### 1.2 React Components (Client-Side)

#### A. Authentication Forms

**`src/components/auth/LoginForm.tsx`**

```typescript
interface LoginFormProps {
  redirectTo?: string;
}

// Form fields:
- email: string (validation: email format)
- password: string (validation: min 8 characters)

// Component state:
- loading: boolean
- error: string | null
- fieldErrors: Record<string, string>
```

**`src/components/auth/RegisterForm.tsx`**

```typescript
interface RegisterFormProps {
  redirectTo?: string;
}

// Form fields:
- email: string (validation: email format, uniqueness)
- password: string (validation: min 8 characters, contains numbers and letters)
- confirmPassword: string (validation: matches password)
- acceptTerms: boolean (validation: required)

// Component state:
- loading: boolean
- error: string | null
- fieldErrors: Record<string, string>
- step: 'form' | 'verification'
```

**`src/components/auth/ForgotPasswordForm.tsx`**

```typescript
// Form fields:
- email: string (validation: email format)

// Component state:
- loading: boolean
- error: string | null
- success: boolean
```

**`src/components/auth/ResetPasswordForm.tsx`**

```typescript
interface ResetPasswordFormProps {
  token: string;
}

// Form fields:
- newPassword: string (validation: min 8 characters)
- confirmPassword: string (validation: matching)

// Component state:
- loading: boolean
- error: string | null
- success: boolean
```

#### B. Helper Components

**`src/components/auth/AuthGuard.tsx`**

```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

// Wrapper component checking authorization state
// Shows loading state during verification
// Redirects or shows fallback for logged-out users
```

**`src/components/auth/ProtectedRoute.tsx`**

```typescript
// HOC component protecting client-side routes
// Used for dynamic React components
```

### 1.3 Changes to Existing Components

**`src/layouts/Layout.astro`**

```astro
---
import { isAuthenticated } from "../lib/auth/server";

const authenticated = await isAuthenticated(Astro);
const isAuthPage = ["/login", "/register", "/forgot-password", "/reset-password"].includes(Astro.url.pathname);

// Redirect logic removed and moved to middleware
---
```

**`src/components/Header.astro`**

```astro
---
import { isAuthenticated } from "../lib/auth/server";
const authenticated = await isAuthenticated(Astro);
const userEmail = Astro.locals.user?.email ?? null;
---

<!-- Conditional menu item rendering -->
{authenticated ? <UserMenu client:load userEmail={userEmail} /> : <AuthButtons />}
```

**`src/components/UserMenu.tsx`** (extension)

- Receives user data (email) through props from Astro.locals.user (server-side)
- Logout through fetch API (POST /api/v1/auth/logout)
- Add session error handling
- Graceful degradation without a connection

### 1.4 Validation and Error Messages

#### A. Client-Side Validation

**Validation rules:**

- Email: regex pattern, domain check
- Password: minimum 8 characters, letters and numbers
- Password confirmation: identical to password
- Required fields: marked with a red asterisk

**Error messages:**

```typescript
const errorMessages = {
  "auth/invalid-email": "Invalid email address",
  "auth/user-not-found": "No user found with this email address",
  "auth/wrong-password": "Incorrect password",
  "auth/email-already-in-use": "This email address is already registered",
  "auth/weak-password": "Password is too weak. Use at least 8 characters",
  "auth/network-error": "Connection error. Check your internet connection",
  "auth/too-many-requests": "Too many attempts. Please try again shortly",
  "validation/email-required": "Email address is required",
  "validation/password-required": "Password is required",
  "validation/password-mismatch": "Passwords do not match",
  "validation/terms-required": "You must accept the terms",
};
```

#### B. Visual Feedback

- Loading states: spinner during processing
- Success states: green notifications
- Error states: red field borders, messages below fields
- Disabled states: gray buttons while loading

### 1.5 UX Scenario Handling

#### A. Registration Scenario

1. User completes registration form
2. Real-time validation while typing (debounced)
3. Submit → loading state
4. Success → email verification sent message
5. Redirect to email verification page
6. After verification → automatic login → **MANDATORY redirect to /onboarding**
7. After onboarding (adding 3 workouts) → redirect to main calendar (/)

#### B. Login Scenario

1. User enters credentials
2. Submit → loading state
3. Check whether user completed onboarding:
   - If NO → redirect to /onboarding
   - If YES → redirect to main calendar (/) or previous page
4. Error → display message, focus invalid field

#### C. Password Recovery Scenario

1. User enters email
2. System sends reset link
3. Email sent message (without revealing whether the email exists)
4. User clicks link → reset-password page with token
5. Enter new password
6. Success → automatic login → onboarding check as in scenario B

#### D. Logout Scenario

1. Click "Log out" in UserMenu (top-right corner)
2. Clear session and cache
3. Redirect to login (/login)

## 2. BACKEND LOGIC

### 2.1 API Endpoint Structure

#### A. Authentication Endpoints

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

### 2.2 Data Validation Mechanism

#### A. Validation with Zod

**`src/lib/validation/auth.ts`**

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address format").toLowerCase().trim(),
  password: z.string().min(8, "Password must contain at least 8 characters"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address format").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain letters")
    .regex(/[0-9]/, "Password must contain numbers"),
  metadata: z
    .object({
      acceptedTermsAt: z.string().datetime().optional(),
    })
    .optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address format").toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain letters")
    .regex(/[0-9]/, "Password must contain numbers"),
});
```

#### B. Validation Middleware

**`src/lib/middleware/validation.ts`**

```typescript
import type { APIContext } from "astro";
import { ZodSchema } from "zod";

export async function validateRequest<T>(context: APIContext, schema: ZodSchema<T>): Promise<T> {
  try {
    const body = await context.request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw createApiError(422, "validation_error", "Invalid request data", {
        errors: error.errors,
      });
    }
    throw error;
  }
}
```

### 2.3 Exception Handling

#### A. Error Hierarchy

**`src/lib/errors/auth.ts`**

```typescript
export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super("invalid_credentials", "Invalid email or password", 401);
  }
}

export class EmailNotVerifiedError extends AuthError {
  constructor() {
    super("email_not_verified", "Please verify your email first", 403);
  }
}

export class SessionExpiredError extends AuthError {
  constructor() {
    super("session_expired", "Your session has expired", 401);
  }
}

export class RateLimitError extends AuthError {
  constructor(retryAfter: number) {
    super("rate_limit", `Too many attempts. Try again in ${retryAfter} seconds`, 429);
  }
}
```

#### B. Global Error Handler

**`src/lib/middleware/errorHandler.ts`**

```typescript
export function handleAuthError(error: unknown): Response {
  console.error("[Auth Error]:", error);

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
        code: "supabase_error",
        message: "Authentication service error",
      },
    });
  }

  return jsonResponse(500, {
    error: {
      code: "internal_error",
      message: "An unexpected error occurred",
    },
  });
}
```

### 2.4 Server-Side Rendering with Astro

#### A. Authentication Middleware

**`src/middleware/index.ts`**

```typescript
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type MiddlewareHandler } from "astro";

const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/api/auth/callback"];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { url, cookies, redirect } = context;
  const isPublicPath = publicPaths.some((path) => url.pathname.startsWith(path));
  const isApiAuthPath = url.pathname.startsWith("/api/v1/auth");

  // Redirect root page to login for logged-out users
  if (url.pathname === "/" && !isAuthenticated) {
    return redirect("/login");
  }

  // Create a server-side Supabase client for the request
  const supabase = createServerClient(import.meta.env.SUPABASE_URL!, import.meta.env.SUPABASE_ANON_KEY!, {
    cookies: {
      get: (key) => cookies.get(key)?.value,
      set: (key, value, options) => cookies.set(key, value, options as CookieOptions & { path: string }),
      remove: (key, options) => cookies.delete(key, options as CookieOptions & { path: string }),
    },
  });

  // Retrieve user session
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;

  // Redirect logged-in users from public pages to the home page
  if (user && isPublicPath) {
    return redirect("/");
  }

  // Allow access to public paths and authentication API endpoints
  if (!user && !isPublicPath && !isApiAuthPath) {
    return redirect("/login?redirectTo=" + encodeURIComponent(url.pathname));
  }

  // Expose Supabase client and session in Astro context
  context.locals.supabase = supabase;
  context.locals.session = session;
  context.locals.user = user;

  return next();
};
```

#### B. Server-Side Helpers

**`src/lib/auth/server.ts`**

```typescript
import type { AstroGlobal } from "astro";
import { supabaseServer } from "../supabase/server";

export async function isAuthenticated(astro: AstroGlobal): Promise<boolean> {
  const accessToken = astro.cookies.get("sb-access-token");
  if (!accessToken) return false;

  const { data, error } = await supabaseServer.auth.getUser(accessToken.value);
  return !error && !!data.user;
}

export async function getUser(astro: AstroGlobal) {
  const accessToken = astro.cookies.get("sb-access-token");
  if (!accessToken) return null;

  const { data, error } = await supabaseServer.auth.getUser(accessToken.value);
  if (error) return null;

  return data.user;
}

export async function requireAuth(astro: AstroGlobal) {
  const user = await getUser(astro);

  if (!user) {
    return astro.redirect("/login?redirectTo=" + encodeURIComponent(astro.url.pathname));
  }

  return user;
}
```

## 3. AUTHENTICATION SYSTEM - SUPABASE INTEGRATION

### 3.1 Supabase Auth Configuration

#### A. Client Initialization

**`src/lib/supabase/client.ts`** (Browser)

```typescript
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../../db/database.types";

export const supabaseClient = createBrowserClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: localStorage, // Simplified for MVP - always use localStorage
    },
  }
);
```

**`src/lib/supabase/server.ts`** (Server)

```typescript
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../../db/database.types";
import type { AstroGlobal } from "astro";

export function createSupabaseServer(context: AstroGlobal) {
  return createServerClient<Database>(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_ANON_KEY, {
    cookies: {
      get(key) {
        return context.cookies.get(key)?.value;
      },
      set(key, value, options) {
        context.cookies.set(key, value, {
          ...options,
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        });
      },
      remove(key) {
        context.cookies.delete(key);
      },
    },
  });
}
```

### 3.2 Authentication Services

#### A. AuthService

**`src/lib/services/authService.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

export class AuthService {
  constructor(private supabase: SupabaseClient<Database>) {}

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
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
      if (error.message.includes("User already registered")) {
        throw new AuthError("email_already_exists", "Email already registered", 422);
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
import { atom, computed } from "nanostores";
import type { User, Session } from "@supabase/supabase-js";

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
      console.error("Failed to initialize auth:", error);
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
    // Initialize authentication state
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

### 3.4 Rate Limiting and Security

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

    // Remove old attempts
    const validAttempts = attempts.filter((timestamp) => now - timestamp < this.config.windowMs);

    if (validAttempts.length >= this.config.maxAttempts) {
      const oldestAttempt = validAttempts[0];
      const retryAfter = Math.ceil((oldestAttempt + this.config.windowMs - now) / 1000);

      return { allowed: false, retryAfter };
    }

    // Record new attempt
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);

    return { allowed: true };
  }

  reset(identifier: string) {
    this.attempts.delete(identifier);
  }
}

// Configuration for different operations
export const loginRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

export const forgotPasswordRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 godzina
});
```

<!-- CSRF Protection - omitted in MVP; Supabase provides basic protection -->

### 3.5 Onboarding Integration

#### A. Post-Registration Flow

**`src/lib/flows/onboardingFlow.ts`**

```typescript
export class OnboardingFlow {
  static async initiate(userId: string) {
    // Check whether the user has completed onboarding
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("onboarding_completed")
      .eq("user_id", userId)
      .single();

    if (profile?.onboarding_completed) {
      return { redirect: "/" };
    }

    // Set session flag
    sessionStorage.setItem("onboarding_required", "true");

    return { redirect: "/onboarding" };
  }

  static async complete(userId: string) {
    // Mark onboarding completed
    await supabase
      .from("user_profiles")
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    sessionStorage.removeItem("onboarding_required");
  }
}
```

## 4. DATABASE MIGRATIONS

### 4.1 User Profiles Table

**`supabase/migrations/[timestamp]_create_user_profiles.sql`**

```sql
-- User profile extension table
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

-- Trigger to automatically create a profile
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

-- Trigger to update updated_at
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

<!-- Audit Log - omitted in MVP; may be added in the future -->

## 5. TESTS AND MONITORING

### 5.1 E2E Tests

**`tests/e2e/auth.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should register new user", async ({ page }) => {
    await page.goto("/register");

    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "TestPassword123");
    await page.fill('[name="confirmPassword"]', "TestPassword123");
    await page.check('[name="acceptTerms"]');

    await page.click('button[type="submit"]');

    // Should display an email verification message
    await expect(page.locator(".success-message")).toContainText("verification email");
  });

  test("should login existing user", async ({ page }) => {
    await page.goto("/login");

    await page.fill('[name="email"]', "existing@example.com");
    await page.fill('[name="password"]', "Password123");

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/");
  });

  test("should handle wrong credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('[name="email"]', "wrong@example.com");
    await page.fill('[name="password"]', "WrongPassword");

    await page.click('button[type="submit"]');

    // Should display an error
    await expect(page.locator(".error-message")).toBeVisible();
  });
});
```

<!-- Monitoring - simplified for MVP, uses built-in Supabase logs -->

## 6. SUMMARY

The authentication system provides a complete user management solution for Training Planner MVP:

1. **Security**: Supabase Auth with basic protection (rate limiting)
2. **UX**: Intuitive forms with real-time validation and clear error messages
3. **Flow**: Clear flow: Login → Onboarding check → Calendar or Onboarding
4. **Home page**: `/login` for logged-out users, `/` (calendar) for logged-in users
5. **PRD integration**: Full certification requirement compliance

### Key User Flows:

- **New user**: Registration → Email verification → Login → Onboarding (3 workouts) → Calendar
- **Existing user**: Login → Calendar (if onboarding completed)
- **Logout**: Top-right button → Redirect to /login

The system is ready for implementation according to MVP and certification requirements.
