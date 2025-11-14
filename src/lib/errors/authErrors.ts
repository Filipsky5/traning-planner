import type { AuthError as SupabaseAuthError } from "@supabase/supabase-js";

/**
 * Mapowanie błędów Supabase Auth na polskie, user-friendly komunikaty.
 *
 * Używane w API endpoints aby zwrócić zrozumiałe komunikaty błędów.
 *
 * Pattern:
 * - Klucze: Supabase error messages (angielskie)
 * - Wartości: Polskie komunikaty dla użytkownika
 *
 * Security best practices:
 * - Nie ujawniaj czy email istnieje w systemie (forgot password)
 * - Ogólne komunikaty dla failed login (nie precyzuj czy email czy hasło)
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  // Login errors
  "Invalid login credentials": "Nieprawidłowy email lub hasło",
  "Email not confirmed": "Email nie został zweryfikowany. Sprawdź swoją skrzynkę pocztową",
  "Invalid email or password": "Nieprawidłowy email lub hasło",

  // Registration errors
  "User already registered": "Ten adres email jest już zarejestrowany",
  "Email already registered": "Ten adres email jest już zarejestrowany",
  "Password should be at least 6 characters": "Hasło musi mieć minimum 8 znaków",
  "Signup requires a valid password": "Hasło jest wymagane",

  // Password reset errors
  "Password reset link expired": "Link do resetowania hasła wygasł. Zażądaj nowego linku",
  "Invalid or expired token": "Link resetujący wygasł lub jest nieprawidłowy",
  "New password should be different from the old password":
    "Nowe hasło musi być inne niż poprzednie",

  // Rate limiting
  "Email rate limit exceeded": "Zbyt wiele prób. Spróbuj ponownie za chwilę",
  "For security purposes, you can only request this once every 60 seconds":
    "Ze względów bezpieczeństwa możesz wysłać żądanie raz na 60 sekund",

  // Session errors
  "refresh_token_not_found": "Sesja wygasła. Zaloguj się ponownie",
  "Session expired": "Sesja wygasła. Zaloguj się ponownie",
  "Invalid Refresh Token": "Sesja wygasła. Zaloguj się ponownie",

  // Network errors
  "Failed to fetch": "Błąd połączenia. Sprawdź swoje połączenie internetowe",
  "Network request failed": "Błąd połączenia. Sprawdź swoje połączenie internetowe",
};

/**
 * Struktura błędu API dla authentication.
 *
 * Spójna z resztą API (zgodnie z ApiError format).
 */
export interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Mapuje błąd Supabase na user-friendly polską wiadomość.
 *
 * @param error - Błąd z Supabase Auth
 * @returns Polską wiadomość dla użytkownika
 *
 * @example
 * const error = new Error("Invalid login credentials");
 * mapAuthError(error); // => "Nieprawidłowy email lub hasło"
 */
export function mapAuthError(error: SupabaseAuthError | Error): string {
  const message = error.message;

  // Sprawdź czy mamy mapping dla tego błędu
  if (message in AUTH_ERROR_MESSAGES) {
    return AUTH_ERROR_MESSAGES[message];
  }

  // Fallback dla nieznanych błędów
  console.error("[Auth Error] Unmapped error:", message);
  return "Wystąpił błąd podczas logowania. Spróbuj ponownie";
}

/**
 * Tworzy error response dla API endpoint.
 *
 * @param code - Kod błędu (snake_case)
 * @param message - Wiadomość dla użytkownika (po polsku)
 * @param status - HTTP status code (default: 400)
 * @returns Response z JSON error
 *
 * @example
 * // W API endpoint:
 * if (error) {
 *   return createAuthErrorResponse("invalid_credentials", "Nieprawidłowy email lub hasło", 401);
 * }
 */
export function createAuthErrorResponse(
  code: string,
  message: string,
  status: number = 400
): Response {
  const body: AuthErrorResponse = {
    error: {
      code,
      message,
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Helper do obsługi błędów Supabase w API endpoints.
 *
 * Mapuje błąd Supabase na polską wiadomość i zwraca Response.
 *
 * @param error - Błąd z Supabase
 * @param defaultCode - Domyślny kod błędu (default: "auth_error")
 * @param defaultStatus - Domyślny HTTP status (default: 400)
 * @returns Response z zmapowanym błędem
 *
 * @example
 * const { error } = await supabase.auth.signInWithPassword({ email, password });
 * if (error) {
 *   return handleSupabaseAuthError(error, "invalid_credentials", 401);
 * }
 */
export function handleSupabaseAuthError(
  error: SupabaseAuthError | Error,
  defaultCode: string = "auth_error",
  defaultStatus: number = 400
): Response {
  const message = mapAuthError(error);

  // Określ kod błędu na podstawie message lub użyj defaultCode
  let code = defaultCode;
  if (message.includes("zarejestrowany")) {
    code = "email_already_exists";
  } else if (message.includes("wygasł")) {
    code = "token_expired";
  } else if (message.includes("Nieprawidłowy")) {
    code = "invalid_credentials";
  }

  return createAuthErrorResponse(code, message, defaultStatus);
}
