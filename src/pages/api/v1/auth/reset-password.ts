/**
 * POST /api/v1/auth/reset-password - Resetowanie hasła
 *
 * Endpoint SSR dla resetowania hasła po kliknięciu linku z emaila.
 *
 * Flow:
 * 1. Walidacja input (newPassword) przez Zod
 * 2. Wywołanie supabase.auth.updateUser({ password: newPassword })
 * 3. Supabase weryfikuje session z tokenu w cookies
 * 4. Return success
 *
 * WAŻNE:
 * - Token pochodzi z cookies (ustawiony przez Supabase po kliknięciu linku)
 * - NIE przekazuj tokenu w body - Supabase SDK automatycznie go używa
 * - Po successful reset, user jest auto-logged in (session w cookies)
 *
 * Response:
 * - 200: { success: true }
 * - 401: { error: { code, message } } - Invalid/expired token
 * - 422: { error: { code, message } } - Validation error (Zod)
 *
 * Security:
 * - Token w httpOnly cookies (nie dostępne dla JS)
 * - Password strength validation (min 8 chars, litery + cyfry)
 * - Token one-time use (Supabase invalidates after use)
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { resetPasswordSchema } from "../../../../lib/validation/auth";
import { handleSupabaseAuthError, createAuthErrorResponse } from "../../../../lib/errors/authErrors";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Parse i walidacja request body
    const body = await request.json();
    const { newPassword } = resetPasswordSchema.parse(body);

    // 2. Utwórz Supabase server client (token w cookies)
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // 3. Sprawdź czy user ma valid session (z reset token)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return createAuthErrorResponse(
        "invalid_token",
        "Link resetujący wygasł lub jest nieprawidłowy. Zażądaj nowego linku",
        401
      );
    }

    // 4. Wywołaj Supabase Auth updateUser
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    // 5. Handle error
    if (error) {
      return handleSupabaseAuthError(error, "password_reset_failed", 400);
    }

    // 6. Success - user jest teraz zalogowany z nowym hasłem
    return new Response(
      JSON.stringify({
        success: true,
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
      return createAuthErrorResponse("validation_error", error.errors[0].message, 422);
    }

    // Handle unexpected errors
    console.error("[POST /api/v1/auth/reset-password] Unexpected error:", error);
    return createAuthErrorResponse("internal_error", "Wystąpił nieoczekiwany błąd. Spróbuj ponownie", 500);
  }
};
