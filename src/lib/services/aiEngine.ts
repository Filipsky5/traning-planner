import type { AiSuggestionCreateCommand, WorkoutStepDto } from "../../types";
import { OpenRouterService } from "./openrouter";

export interface AiGeneratedSuggestion {
  steps: WorkoutStepDto[];
  metadata?: Record<string, unknown>;
}

// Singleton instancja serwisu OpenRouter z konfiguracją z env
const openrouter = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: import.meta.env.OPENROUTER_DEFAULT_MODEL,
  timeout: import.meta.env.OPENROUTER_TIMEOUT_MS
    ? parseInt(import.meta.env.OPENROUTER_TIMEOUT_MS, 10)
    : undefined,
  maxRetries: import.meta.env.OPENROUTER_MAX_RETRIES
    ? parseInt(import.meta.env.OPENROUTER_MAX_RETRIES, 10)
    : undefined,
});

/**
 * Generuje sugestię treningu za pomocą AI (OpenRouter).
 *
 * Funkcja integruje się z OpenRouter API i automatycznie loguje metryki użycia.
 * Obsługuje błędy z retry logic i wykładniczym cofaniem.
 *
 * @param userId - ID użytkownika dla którego generowana jest sugestia
 * @param input - Parametry wejściowe sugestii (data, typ treningu, kontekst)
 * @returns Wygenerowana sugestia z krokami treningu i metadanymi
 * @throws Error w przypadku niepowodzenia generowania
 */
export async function generateSuggestion(
  userId: string,
  input: AiSuggestionCreateCommand
): Promise<AiGeneratedSuggestion> {
  // Wywołaj serwis OpenRouter
  const result = await openrouter.generateTrainingSuggestion({
    userId,
    trainingTypeCode: input.training_type_code,
    plannedDate: input.planned_date,
    context: input.context,
  });

  return {
    steps: result.steps,
    metadata: result.metadata,
  };
}
