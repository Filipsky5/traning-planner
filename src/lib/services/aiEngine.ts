import type { AiSuggestionCreateCommand, WorkoutStepDto } from "../../types";
import {
  OPENROUTER_API_KEY,
  OPENROUTER_DEFAULT_MODEL,
  OPENROUTER_TIMEOUT_MS,
  OPENROUTER_MAX_RETRIES,
} from "astro:env/server";
import { OpenRouterService } from "./openrouter";

export interface AiGeneratedSuggestion {
  steps: WorkoutStepDto[];
  metadata?: Record<string, unknown>;
}

/**
 * Lazy-initialized OpenRouter service singleton.
 * Instancja jest tworzona dopiero przy pierwszym wywołaniu getOpenRouterService().
 *
 * Dlaczego lazy initialization:
 * - W Cloudflare Workers zmienne środowiskowe nie są dostępne w module scope
 * - Muszą być odczytane w runtime (gdy wywołujesz funkcję)
 */
let _openrouter: OpenRouterService | null = null;

function getOpenRouterService(): OpenRouterService {
  if (!_openrouter) {
    _openrouter = new OpenRouterService({
      apiKey: OPENROUTER_API_KEY,
      defaultModel: OPENROUTER_DEFAULT_MODEL,
      timeout: OPENROUTER_TIMEOUT_MS,
      maxRetries: OPENROUTER_MAX_RETRIES,
    });
  }
  return _openrouter;
}

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
  // Wywołaj serwis OpenRouter (lazy initialization)
  const openrouter = getOpenRouterService();
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
