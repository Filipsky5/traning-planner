/**
 * POST /api/v1/auth/logout - Wylogowanie użytkownika
 *
 * Endpoint SSR dla wylogowania użytkownika.
 * Usuwa session cookies i invalidates Supabase session.
 *
 * Flow:
 * 1. Wywołanie supabase.auth.signOut()
 * 2. Supabase SDK automatycznie usuwa session cookies (setAll)
 * 3. Return success
 *
 * Response:
 * - 200: { success: true }
 * - 400: { error: { code, message } } - Supabase error
 *
 * UWAGA: Endpoint nie wymaga autentykacji (może być wywołany nawet gdy session wygasła).
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import {
  handleSupabaseAuthError,
  createAuthErrorResponse,
} from "../../../../lib/errors/authErrors";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Utwórz Supabase server client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // 2. Wywołaj Supabase Auth signOut
    const { error } = await supabase.auth.signOut();

    // 3. Handle error (opcjonalne - signOut zwykle nie failuje)
    if (error) {
      return handleSupabaseAuthError(error, "logout_failed", 400);
    }

    // 4. Success
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
    // Handle unexpected errors
    console.error("[POST /api/v1/auth/logout] Unexpected error:", error);
    return createAuthErrorResponse(
      "internal_error",
      "Wystąpił nieoczekiwany błąd. Spróbuj ponownie",
      500
    );
  }
};
