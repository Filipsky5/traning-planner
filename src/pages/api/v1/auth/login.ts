/**
 * POST /api/v1/auth/login - Logowanie użytkownika
 *
 * Endpoint SSR (Server-Side Rendering) dla autentykacji użytkownika.
 * Używa cookies-based authentication z @supabase/ssr.
 *
 * Flow:
 * 1. Walidacja input (email, password) przez Zod
 * 2. Wywołanie supabase.auth.signInWithPassword()
 * 3. Supabase SDK automatycznie zapisuje session w cookies (setAll)
 * 4. Return user data lub error
 *
 * Response:
 * - 200: { user: { id, email, ... } }
 * - 400: { error: { code, message } } - Validation error
 * - 401: { error: { code, message } } - Invalid credentials
 * - 422: { error: { code, message } } - Validation error (Zod)
 *
 * Security:
 * - Session tokens w httpOnly cookies (nie dostępne dla JS)
 * - Rate limiting przez Supabase (5 attempts / 15 min)
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { loginSchema } from "../../../../lib/validation/auth";
import {
  handleSupabaseAuthError,
  createAuthErrorResponse,
} from "../../../../lib/errors/authErrors";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Parse i walidacja request body
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // 2. Utwórz Supabase server client z cookies
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // 3. Wywołaj Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // 4. Handle auth error
    if (error) {
      return handleSupabaseAuthError(error, "invalid_credentials", 401);
    }

    // 5. Success - session automatycznie zapisany w cookies przez Supabase SDK
    return new Response(
      JSON.stringify({
        user: {
          id: data.user.id,
          email: data.user.email,
          created_at: data.user.created_at,
        },
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
    console.error("[POST /api/v1/auth/login] Unexpected error:", error);
    return createAuthErrorResponse(
      "internal_error",
      "Wystąpił nieoczekiwany błąd. Spróbuj ponownie",
      500
    );
  }
};
