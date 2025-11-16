/**
 * POST /api/v1/auth/forgot-password - Inicjowanie resetowania hasła
 *
 * Endpoint SSR dla inicjowania procesu resetowania hasła.
 * Wysyła email z linkiem resetującym.
 *
 * Flow:
 * 1. Walidacja input (email) przez Zod
 * 2. Wywołanie supabase.auth.resetPasswordForEmail()
 * 3. Supabase wysyła email z linkiem resetującym
 * 4. Return success (zawsze, nawet jeśli email nie istnieje - security best practice)
 *
 * Security Best Practice:
 * - Endpoint ZAWSZE zwraca success, nawet jeśli email nie istnieje
 * - To zapobiega information disclosure (czy email jest w systemie)
 * - Rate limiting przez Supabase (3 attempts / 1 hour)
 *
 * Response:
 * - 200: { message: "Jeśli email istnieje..." }
 * - 422: { error: { code, message } } - Validation error (Zod)
 *
 * Email Link:
 * - Redirect do: /reset-password?token=XXX
 * - Token ważny przez 1 godzinę (Supabase default)
 */
export const prerender = false;

import type { APIRoute } from "astro";
import { ZodError } from "zod";
import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { forgotPasswordSchema } from "../../../../lib/validation/auth";
import { createAuthErrorResponse } from "../../../../lib/errors/authErrors";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 1. Parse i walidacja request body
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // 2. Utwórz Supabase server client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // 3. Wywołaj Supabase Auth resetPasswordForEmail
    const origin = new URL(request.url).origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    // 4. WAŻNE: Ignoruj error i zawsze zwróć success
    // (Security best practice - nie ujawniaj czy email istnieje)
    if (error) {
      console.warn("[POST /api/v1/auth/forgot-password] Supabase error (ignored):", error.message);
    }

    // 5. Success response (zawsze)
    return new Response(
      JSON.stringify({
        message: "Jeśli konto z tym adresem email istnieje, wysłaliśmy link do resetowania hasła",
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
    console.error("[POST /api/v1/auth/forgot-password] Unexpected error:", error);
    return createAuthErrorResponse("internal_error", "Wystąpił nieoczekiwany błąd. Spróbuj ponownie", 500);
  }
};
