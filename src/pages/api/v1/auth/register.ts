/**
 * POST /api/v1/auth/register - Rejestracja nowego użytkownika
 *
 * Endpoint SSR dla rejestracji użytkownika z email verification.
 *
 * Flow:
 * 1. Walidacja input (email, password, metadata) przez Zod
 * 2. Wywołanie supabase.auth.signUp()
 * 3. Supabase wysyła email weryfikacyjny
 * 4. Return user data (email_confirmed: false)
 *
 * Email Verification:
 * - Supabase automatycznie wysyła email z linkiem weryfikacyjnym
 * - Po kliknięciu linku, user jest przekierowany na /login
 * - Email confirmation nie jest wymagany do zalogowania (można zmienić w Supabase settings)
 *
 * Response:
 * - 200: { user: { id, email, ... }, requiresEmailVerification: true }
 * - 400: { error: { code, message } } - Supabase error
 * - 422: { error: { code, message } } - Validation error (Zod)
 *
 * Security:
 * - Password strength validation (min 8 chars, litery + cyfry)
 * - Email uniqueness check przez Supabase
 * - Terms acceptance timestamp w metadata
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { registerSchema } from "../../../../lib/validation/auth";
import {
  handleSupabaseAuthError,
  createAuthErrorResponse,
} from "../../../../lib/errors/authErrors";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Parse i walidacja request body
    const body = await request.json();
    const { email, password, metadata } = registerSchema.parse(body);

    // 2. Utwórz Supabase server client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // 3. Wywołaj Supabase Auth signUp
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        // Email redirect URL (po weryfikacji email)
        emailRedirectTo: `${new URL(request.url).origin}/login`,
      },
    });

    // 4. Handle auth error
    if (error) {
      return handleSupabaseAuthError(error, "registration_failed", 400);
    }

    // 5. Success
    // UWAGA: User może być auto-confirmed (zależy od Supabase settings)
    const requiresEmailVerification = !data.user?.email_confirmed_at;

    return new Response(
      JSON.stringify({
        user: {
          id: data.user?.id,
          email: data.user?.email,
          created_at: data.user?.created_at,
        },
        requiresEmailVerification,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return createAuthErrorResponse(
        "validation_error",
        error.errors[0].message,
        422
      );
    }

    // Handle unexpected errors
    console.error("[POST /api/v1/auth/register] Unexpected error:", error);
    return createAuthErrorResponse(
      "internal_error",
      "Wystąpił nieoczekiwany błąd. Spróbuj ponownie",
      500
    );
  }
};
