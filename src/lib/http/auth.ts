import type { APIContext } from "astro";

import { createApiError } from "./errors";

/**
 * Wymaga prawidłowej sesji użytkownika (JWT token).
 *
 * Używane w endpointach dostępnych dla zalogowanych użytkowników (user-facing API).
 *
 * Analogia do iOS: Podobne do Firebase Auth.currentUser - weryfikacja że użytkownik
 * jest zalogowany przed dostępem do chronionych zasobów.
 *
 * @param context - Astro APIContext (zawiera context.locals.supabase)
 * @returns Promise<{ userId: string }> - ID zalogowanego użytkownika
 * @throws ApiError(401) - Jeśli brak sesji lub token wygasł
 *
 * @example
 * ```typescript
 * // W endpoint API:
 * export async function GET(context: APIContext) {
 *   const { userId } = await requireUserId(context);
 *   // ... użyj userId do pobrania danych użytkownika
 * }
 * ```
 */
export async function requireUserId(context: APIContext): Promise<{ userId: string }> {
  const supabase = context.locals.supabase;
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw createApiError(401, "unauthorized", "Invalid or expired session", { cause: error });
  }

  const user = data?.user;
  if (!user) {
    throw createApiError(401, "unauthorized", "User session is required");
  }

  return { userId: user.id };
}

/**
 * Wymaga prawidłowego service-role key (internal-only endpoints).
 *
 * KRYTYCZNE: Endpoint dostępny TYLKO dla service-role key, NIE dla user JWT tokens!
 * Używane w internal endpoints (np. /api/v1/internal/ai/logs).
 *
 * Bezpieczeństwo:
 * - Service-role key ma pełny dostęp do bazy danych (omija RLS)
 * - NIE wolno używać service-role key w kodzie client-side (tylko server-side!)
 * - Token jest porównywany z import.meta.env.SUPABASE_SERVICE_ROLE_KEY
 *
 * Analogia do iOS: Podobne do weryfikacji API key w backend-only endpoints
 * (np. admin panel, internal tools). W Swift nie ma odpowiednika, bo to koncept
 * server-side security.
 *
 * @param context - Astro APIContext (zawiera context.request.headers)
 * @returns void - Funkcja nic nie zwraca, tylko rzuca błąd jeśli auth niepoprawny
 * @throws ApiError(401) - Jeśli brak Authorization header
 * @throws ApiError(403) - Jeśli service-role key niepoprawny
 * @throws ApiError(500) - Jeśli SUPABASE_SERVICE_ROLE_KEY nie ustawiony w environment
 *
 * @example
 * ```typescript
 * // W internal endpoint:
 * export async function POST(context: APIContext) {
 *   requireServiceRole(context); // Guard clause - sprawdź auth przed dalszą logiką
 *   // ... reszta logiki endpoint'u
 * }
 * ```
 */
export function requireServiceRole(context: APIContext): void {
  // Guard clause 1: Sprawdź czy Authorization header istnieje
  const authHeader = context.request.headers.get("authorization");

  if (!authHeader) {
    throw createApiError(401, "unauthorized", "Missing service-role credentials");
  }

  // Wyciągnij token z header'a (format: "Bearer <token>")
  const token = authHeader.replace("Bearer ", "");

  // Guard clause 2: Sprawdź czy SUPABASE_SERVICE_ROLE_KEY jest ustawiony
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    // To powinno być wykryte na etapie deploymentu, ale lepiej być bezpiecznym
    console.error("SUPABASE_SERVICE_ROLE_KEY not set in environment");
    throw createApiError(500, "internal_error", "Server configuration error");
  }

  // Guard clause 3: Sprawdź czy token zgadza się z service-role key
  if (token !== serviceRoleKey) {
    throw createApiError(403, "forbidden", "Invalid service-role key");
  }

  // Auth poprawny - funkcja zwraca void (brak throw = success)
}
