import type { AiSuggestionCreateCommand, WorkoutStepDto } from "../../types";
// TODO: Uncomment when implementing real OpenRouter integration
// import { logAiSuccess, logAiError } from "./aiLogsClient";

export interface AiGeneratedSuggestion {
  steps: WorkoutStepDto[];
  metadata?: Record<string, unknown>;
}

/**
 * Generuje sugestię treningu za pomocą AI (OpenRouter).
 *
 * OBECNIE: Placeholder zwracający hardcoded dane.
 * TODO: Zaimplementować prawdziwą integrację z OpenRouter API.
 *
 * Gdy będziesz implementować prawdziwą integrację:
 * 1. Dodaj wywołanie OpenRouter API
 * 2. Zmierz latency (Date.now() przed i po wywołaniu)
 * 3. Zaloguj sukces: await logAiSuccess(event, model, provider, latency, tokens, cost, payload)
 * 4. Zaloguj błąd: await logAiError(event, error, payload) w catch block
 *
 * @example
 * ```typescript
 * export async function generateSuggestion(
 *   userId: string,
 *   input: AiSuggestionCreateCommand
 * ): Promise<AiGeneratedSuggestion> {
 *   const startTime = Date.now();
 *
 *   try {
 *     // Wywołaj OpenRouter API
 *     const response = await callOpenRouter(prompt);
 *     const latency = Date.now() - startTime;
 *
 *     // Zaloguj sukces
 *     await logAiSuccess(
 *       "suggestion.generate",
 *       response.model,
 *       "openrouter",
 *       latency,
 *       response.usage.prompt_tokens,
 *       response.usage.completion_tokens,
 *       response.usage.total_cost,
 *       { user_id: userId, training_type: input.training_type_code }
 *     );
 *
 *     return parseResponse(response);
 *   } catch (error) {
 *     // Zaloguj błąd
 *     await logAiError("suggestion.generate", error, {
 *       user_id: userId,
 *       provider: "openrouter"
 *     });
 *     throw error;
 *   }
 * }
 * ```
 */
export async function generateSuggestion(
  _userId: string,
  _input: AiSuggestionCreateCommand
): Promise<AiGeneratedSuggestion> {
  // PLACEHOLDER: Zwraca hardcoded dane
  // TODO: Zastąp prawdziwym wywołaniem OpenRouter API
  return {
    steps: [
      {
        part: "warmup",
        duration_s: 600,
        notes: "Lekki trucht na rozgrzewkę",
      },
      {
        part: "main",
        distance_m: 5000,
        notes: "Bieg w tempie konwersacyjnym",
      },
      {
        part: "cooldown",
        duration_s: 300,
        notes: "Marsz i rozciąganie",
      },
    ],
    metadata: {
      placeholder: true,
      generatedAt: new Date().toISOString(),
    },
  };
}
