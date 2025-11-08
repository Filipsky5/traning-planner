/**
 * AI Logs Client - helper do logowania interakcji z AI
 *
 * Ten moduł dostarcza utility functions do wysyłania logów AI do internal endpoint.
 * Używany przez AI Engine (aiEngine.ts) do śledzenia kosztów i diagnostyki.
 *
 * WAŻNE: Funkcje w tym module wywołują internal endpoint z service-role key.
 * NIE wolno używać tych funkcji w kodzie client-side (tylko server-side)!
 */

import type { AiLogIngestCommand } from "../../types";

/**
 * Wysyła log AI do internal endpoint.
 *
 * Używane do logowania interakcji z AI (OpenRouter) w celach:
 * - Diagnostyki (śledzenie błędów i problemów)
 * - Cost tracking (monitorowanie kosztów tokenów)
 * - Audytu (historia wywołań per użytkownik)
 *
 * BEZPIECZEŃSTWO:
 * - Funkcja używa SUPABASE_SERVICE_ROLE_KEY z import.meta.env
 * - Tylko server-side! NIE eksponować service-role key w client-side
 * - Payload może zawierać PII - unikaj logowania wrażliwych danych
 *
 * @param command - Dane loga AI (event, level, model, metryki, etc.)
 * @returns Promise<void> - Nie rzuca błędów (fire-and-forget)
 *
 * @example
 * ```typescript
 * // W aiEngine.ts - po wywołaniu OpenRouter:
 * await logAiInteraction({
 *   event: "suggestion.generate",
 *   level: "info",
 *   model: "gpt-4o-mini",
 *   provider: "openrouter",
 *   latency_ms: 450,
 *   input_tokens: 1200,
 *   output_tokens: 300,
 *   cost_usd: 0.015,
 *   payload: { user_id: userId, suggestion_id: suggestionId }
 * });
 * ```
 */
export async function logAiInteraction(command: AiLogIngestCommand): Promise<void> {
  try {
    // Pobierz service-role key z environment
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error("[aiLogsClient] SUPABASE_SERVICE_ROLE_KEY not set - skipping AI log");
      return;
    }

    // Pobierz base URL (localhost dla dev, production URL dla prod)
    const baseUrl = import.meta.env.PUBLIC_API_URL || "http://localhost:3000";

    // Wyślij POST do internal endpoint
    const response = await fetch(`${baseUrl}/api/v1/internal/ai/logs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    // Fire-and-forget: nie blokuj głównego flow jeśli logging failed
    if (!response.ok) {
      console.error(
        `[aiLogsClient] Failed to log AI interaction: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    // Fire-and-forget: nie rzucaj błędu jeśli logging failed
    // Logowanie nie powinno powodować crashu głównej logiki
    console.error("[aiLogsClient] Failed to log AI interaction:", error);
  }
}

/**
 * Helper do logowania sukcesu wywołania AI.
 *
 * @param event - Typ zdarzenia (np. "suggestion.generate")
 * @param model - Nazwa modelu AI
 * @param provider - Provider AI (np. "openrouter")
 * @param latency_ms - Czas odpowiedzi w ms
 * @param input_tokens - Liczba tokenów wejściowych
 * @param output_tokens - Liczba tokenów wyjściowych
 * @param cost_usd - Koszt wywołania w USD
 * @param payload - Dodatkowy kontekst (user_id, suggestion_id, etc.)
 *
 * @example
 * ```typescript
 * await logAiSuccess(
 *   "suggestion.generate",
 *   "gpt-4o-mini",
 *   "openrouter",
 *   450,
 *   1200,
 *   300,
 *   0.015,
 *   { user_id: userId, suggestion_id: suggestionId }
 * );
 * ```
 */
export async function logAiSuccess(
  event: string,
  model: string,
  provider: string,
  latency_ms: number,
  input_tokens: number,
  output_tokens: number,
  cost_usd: number,
  payload?: Record<string, unknown>
): Promise<void> {
  await logAiInteraction({
    event,
    level: "info",
    model,
    provider,
    latency_ms,
    input_tokens,
    output_tokens,
    cost_usd,
    payload,
  });
}

/**
 * Helper do logowania błędu wywołania AI.
 *
 * @param event - Typ zdarzenia (np. "suggestion.generate")
 * @param error - Obiekt błędu
 * @param payload - Dodatkowy kontekst (user_id, provider, etc.)
 *
 * @example
 * ```typescript
 * try {
 *   const response = await callOpenRouter(prompt);
 * } catch (error) {
 *   await logAiError("suggestion.generate", error, {
 *     user_id: userId,
 *     provider: "openrouter"
 *   });
 *   throw error;
 * }
 * ```
 */
export async function logAiError(
  event: string,
  error: unknown,
  payload?: Record<string, unknown>
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : "UnknownError";

  await logAiInteraction({
    event,
    level: "error",
    payload: {
      ...payload,
      error: errorMessage,
      error_name: errorName,
    },
  });
}
