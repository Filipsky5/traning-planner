import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

/**
 * Public paths - dostępne bez autentykacji.
 *
 * Zawiera:
 * - Strony auth: /login, /register, /forgot-password, /reset-password
 * - API endpoints auth: /api/v1/auth/*
 * - Static assets: /api/v1/training-types (public reference data)
 */
const PUBLIC_PATHS = [
  // Auth pages
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  // Auth API endpoints
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/logout",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/me",
  // Public reference data
  "/api/v1/training-types",
];

/**
 * Authentication & Authorization Middleware.
 *
 * Przepływ:
 * 1. Tworzy Supabase server client z cookies (getAll/setAll pattern)
 * 2. Weryfikuje session użytkownika (supabase.auth.getUser())
 * 3. Jeśli user zalogowany:
 *    - Zapisuje user w context.locals.user
 *    - Sprawdza onboarding status (< 3 workouts → redirect /onboarding)
 * 4. Jeśli user niezalogowany:
 *    - Public paths → allow
 *    - Protected paths → redirect /login?redirectTo=...
 * 5. Jeśli user zalogowany na public auth pages → redirect /
 *
 * Analogia do iOS:
 * - Jak URLProtocol interceptor w URLSession
 * - Każde request przechodzi przez middleware (jak interceptor pattern)
 *
 * WAŻNE: Ten middleware używa cookies-based authentication (@supabase/ssr).
 * Session tokens są przechowywane w httpOnly cookies (bezpieczne, nie dostępne dla JS).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, request, redirect } = context;
  const pathname = new URL(request.url).pathname;

  // Sprawdź czy to public path
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isStaticAsset =
    pathname.startsWith("/_") || /\.(js|css|png|jpg|jpeg|svg|ico|webp|woff|woff2|ttf|eot)$/.test(pathname);

  // Skip middleware dla static assets
  if (isStaticAsset) {
    return next();
  }

  // Utwórz Supabase server client z cookies
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // WAŻNE: Zawsze wywołaj getUser() aby Supabase SDK mógł odświeżyć session
  // (nawet dla public paths - może być redirect po email verification)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Zapisz user i supabase w context.locals
  context.locals.supabase = supabase;
  if (user) {
    context.locals.user = user;
  }

  // === REDIRECT LOGIC ===

  // 1. Jeśli user zalogowany na auth pages → redirect /
  const authPages = ["/login", "/register", "/forgot-password"];
  if (user && authPages.includes(pathname)) {
    return redirect("/");
  }

  // 2. Jeśli user niezalogowany na protected page → redirect /login
  if (!user && !isPublicPath) {
    const redirectTo = pathname !== "/" ? `?redirectTo=${encodeURIComponent(pathname)}` : "";
    return redirect(`/login${redirectTo}`);
  }

  // 3. Onboarding check (tylko dla zalogowanych, nie dla /onboarding ani API)
  const shouldSkipOnboardingCheck = pathname.startsWith("/onboarding") || pathname.startsWith("/api") || isStaticAsset;

  if (user && !shouldSkipOnboardingCheck) {
    // Sprawdź czy user ma >= 3 completed workouts
    const { count, error: countError } = await supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed");

    if (!countError && count !== null && count < 3) {
      // User potrzebuje onboardingu
      const nextUrl = pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      return redirect(`/onboarding${nextUrl}`, 307);
    }
  }

  // Allow request
  return next();
});
