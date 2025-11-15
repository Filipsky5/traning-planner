import type { WorkoutStepDto, StepPart } from "../../types";
import { logAiSuccess, logAiError } from "./aiLogsClient";

// ==================== TYPY I INTERFEJSY ====================

/**
 * Opcje konfiguracyjne dla serwisu OpenRouter
 */
export interface OpenRouterOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Parametry generowania sugestii treningowej
 */
export interface GenerateTrainingParams {
  userId: string;
  trainingTypeCode: string;
  plannedDate: string; // YYYY-MM-DD
  userGoal?: {
    goalType: "marathon" | "half_marathon" | "5k" | "10k" | "custom";
    targetDistanceM?: number;
    dueDate?: string;
  };
  recentWorkouts?: {
    trainingTypeCode: string;
    completedAt: string;
    distanceM: number;
    durationS: number;
    rating?: "too_easy" | "just_right" | "too_hard";
  }[];
  context?: Record<string, unknown>;
  model?: string; // Nadpisuje domyślny model
  temperature?: number; // Kontrola kreatywności (0.0-1.0)
}

/**
 * Odpowiedź z wygenerowaną sugestią treningową
 */
export interface TrainingSuggestionResponse {
  steps: WorkoutStepDto[];
  metadata: {
    model: string;
    provider: string;
    tokensUsed: {
      prompt: number;
      completion: number;
      total: number;
    };
    costUsd: number;
    latencyMs: number;
    generatedAt: string; // ISO 8601
  };
}

/**
 * Informacje o modelu AI
 */
export interface ModelInfo {
  id: string; // np. "openai/gpt-4o-mini"
  name: string;
  pricing: {
    prompt: number; // Koszt za 1M tokenów
    completion: number; // Koszt za 1M tokenów
  };
  contextLength: number;
  maxOutput?: number;
}

/**
 * Format odpowiedzi strukturyzowanej OpenRouter
 */
interface OpenRouterResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

/**
 * Żądanie do API OpenRouter
 */
interface OpenRouterRequest {
  model: string;
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[];
  response_format?: OpenRouterResponseFormat;
  temperature?: number;
  max_tokens?: number;
}

/**
 * Odpowiedź z API OpenRouter
 */
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Wykorzystanie tokenów
 */
interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Sparsowana sugestia z odpowiedzi AI
 */
interface ParsedSuggestion {
  steps: WorkoutStepDto[];
  reasoning?: string;
}

/**
 * Niestandardowa klasa błędu dla OpenRouter API
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

// ==================== GŁÓWNA KLASA SERWISU ====================

/**
 * Serwis integracji z OpenRouter API do generowania sugestii treningowych wspomaganych AI.
 *
 * Odpowiedzialności:
 * - Generowanie sugestii treningowych przy użyciu LLM poprzez API OpenRouter
 * - Zapewnienie strukturyzowanych odpowiedzi JSON poprzez walidację schematu
 * - Śledzenie metryk wykorzystania (tokeny, koszty, opóźnienia)
 * - Elegancka obsługa błędów z ponawianiem prób i rozwiązaniami awaryjnymi
 * - Integracja z logowaniem AI dla analityki
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  /**
   * Tworzy instancję serwisu OpenRouter
   *
   * @param options - Konfiguracja serwisu (apiKey i defaultModel są wymagane)
   * @throws Error jeśli klucz API nie jest dostępny
   */
  constructor(options: OpenRouterOptions = {}) {
    // Walidacja obecności klucza API
    this.apiKey = options.apiKey || "";
    if (!this.apiKey) {
      throw new Error("Klucz API OpenRouter jest wymagany (przekaż przez options.apiKey)");
    }

    // Ustaw pozostałe wartości z options lub użyj domyślnych
    this.baseUrl = options.baseUrl || "https://openrouter.ai/api/v1";
    this.defaultModel = options.defaultModel || "x-ai/grok-code-fast-1";
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  // ==================== METODY PUBLICZNE ====================

  /**
   * Generuje sugestię treningową na podstawie kontekstu i wymagań użytkownika
   *
   * @param params - Parametry generowania sugestii
   * @returns Wygenerowana sugestia treningowa z metadanymi
   * @throws Error w przypadku niepowodzenia generowania
   */
  async generateTrainingSuggestion(params: GenerateTrainingParams): Promise<TrainingSuggestionResponse> {
    const startTime = Date.now();

    try {
      // Zbuduj prompt z kontekstu
      const { systemPrompt, userPrompt } = this.buildPrompts(params);

      // Zdefiniuj schemat odpowiedzi
      const responseFormat = this.getResponseFormat();

      // Wykonaj wywołanie API z ponawianiem
      const response = await this.callOpenRouterWithRetry({
        model: params.model || this.defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: responseFormat,
        temperature: params.temperature ?? 0.7,
        max_tokens: 1000,
      });

      // Sparsuj i zwaliduj odpowiedź
      const suggestion = this.parseResponse(response);

      // Oblicz metryki
      const latencyMs = Date.now() - startTime;
      const costUsd = this.calculateCost(response.usage, params.model || this.defaultModel);

      // Zaloguj sukces (fire-and-forget)
      void logAiSuccess({
        event: "suggestion.generate",
        level: "info",
        model: response.model,
        provider: "openrouter",
        latency_ms: latencyMs,
        input_tokens: response.usage.prompt_tokens,
        output_tokens: response.usage.completion_tokens,
        cost_usd: costUsd,
        user_id: params.userId,
        payload: {
          training_type: params.trainingTypeCode,
          planned_date: params.plannedDate,
        },
      });

      return {
        steps: suggestion.steps,
        metadata: {
          model: response.model,
          provider: "openrouter",
          tokensUsed: {
            prompt: response.usage.prompt_tokens,
            completion: response.usage.completion_tokens,
            total: response.usage.total_tokens,
          },
          costUsd,
          latencyMs,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      // Zaloguj błąd (fire-and-forget)
      void logAiError({
        event: "suggestion.generate",
        level: "error",
        provider: "openrouter",
        user_id: params.userId,
        payload: {
          error: error instanceof Error ? error.message : String(error),
          training_type: params.trainingTypeCode,
        },
      });

      throw this.mapError(error);
    }
  }

  /**
   * Waliduje format klucza API i opcjonalnie sprawdza poprawność z OpenRouter
   *
   * @param checkRemote - Czy sprawdzić klucz zdalnie w API OpenRouter
   * @returns true jeśli klucz jest prawidłowy
   */
  async validateApiKey(checkRemote = false): Promise<boolean> {
    // Podstawowa walidacja formatu
    if (!this.apiKey || !this.apiKey.startsWith("sk-or-")) {
      return false;
    }

    // Opcjonalna zdalna walidacja
    if (checkRemote) {
      try {
        const response = await fetch(`${this.baseUrl}/models`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": import.meta.env.PUBLIC_SITE_URL || "http://localhost:3000",
          },
        });
        return response.ok;
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Pobiera listę dostępnych modeli z OpenRouter
   *
   * @returns Lista informacji o dostępnych modelach
   * @throws Error w przypadku niepowodzenia pobierania
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": import.meta.env.PUBLIC_SITE_URL || "http://localhost:3000",
        },
      });

      if (!response.ok) {
        throw new OpenRouterError("Nie udało się pobrać listy modeli", response.status);
      }

      const data = await response.json();

      // Mapuj odpowiedź API na nasz interfejs ModelInfo
      return (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        pricing: {
          prompt: parseFloat(model.pricing?.prompt || "0"),
          completion: parseFloat(model.pricing?.completion || "0"),
        },
        contextLength: model.context_length || 0,
        maxOutput: model.top_provider?.max_completion_tokens,
      }));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  // ==================== METODY PRYWATNE ====================

  /**
   * Buduje prompty systemowe i użytkownika z kontekstu treningowego
   */
  private buildPrompts(params: GenerateTrainingParams): {
    systemPrompt: string;
    userPrompt: string;
  } {
    const systemPrompt = `Jesteś doświadczonym trenerem biegania tworzącym spersonalizowane plany treningowe.
Twoim celem jest wygenerowanie ustrukturyzowanego planu treningu odpowiedniego dla poziomu sprawności i celów biegacza.

Kluczowe zasady:
- Rozgrzewka powinna stanowić 10-15% całkowitego czasu treningu
- Główny trening powinien odpowiadać typowi treningu (łatwy, tempo, interwałowy, długi, regeneracyjny)
- Schładzanie powinno stanowić 5-10% całkowitego czasu treningu
- Dołącz konkretne wskazówki dla każdej części treningu
- Weź pod uwagę ostatnie wyniki i opinie biegacza

Odpowiedz poprawnym obiektem JSON zgodnym z podanym schematem.`;

    const userPrompt = this.buildUserPrompt(params);

    return { systemPrompt, userPrompt };
  }

  /**
   * Buduje prompt użytkownika z parametrów generowania
   */
  private buildUserPrompt(params: GenerateTrainingParams): string {
    const parts: string[] = [];

    // Podstawowe żądanie
    parts.push(`Stwórz sesję treningową typu ${params.trainingTypeCode} na ${params.plannedDate}.`);

    // Dodaj kontekst celu
    if (params.userGoal) {
      parts.push(`Cel biegacza: ${params.userGoal.goalType} w dniu ${params.userGoal.dueDate}.`);
    }

    // Dodaj kontekst ostatnich treningów
    if (params.recentWorkouts && params.recentWorkouts.length > 0) {
      const recent = params.recentWorkouts.slice(0, 3);
      parts.push("\nOstatnie treningi:");
      recent.forEach((w) => {
        const pace = w.distanceM > 0 ? w.durationS / (w.distanceM / 1000) : 0;
        const paceMin = Math.floor(pace / 60);
        const paceSec = Math.round(pace % 60);
        parts.push(
          `- ${w.trainingTypeCode}: ${(w.distanceM / 1000).toFixed(1)}km w ${Math.round(w.durationS / 60)}min (${paceMin}:${paceSec.toString().padStart(2, "0")}/km) - ${w.rating || "bez oceny"}`
        );
      });
    }

    // Dodaj niestandardowy kontekst
    if (params.context) {
      parts.push(`\nDodatkowy kontekst: ${JSON.stringify(params.context)}`);
    }

    return parts.join("\n");
  }

  /**
   * Definiuje schemat JSON dla strukturyzowanej odpowiedzi
   */
  private getResponseFormat(): OpenRouterResponseFormat {
    return {
      type: "json_schema",
      json_schema: {
        name: "training_suggestion",
        strict: true,
        schema: {
          type: "object",
          properties: {
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  part: {
                    type: "string",
                    enum: ["warmup", "main", "cooldown", "segment"],
                  },
                  distance_m: {
                    type: "integer",
                    minimum: 0,
                  },
                  duration_s: {
                    type: "integer",
                    minimum: 0,
                  },
                  notes: {
                    type: "string",
                    maxLength: 500,
                  },
                },
                required: ["part"],
                anyOf: [{ required: ["distance_m"] }, { required: ["duration_s"] }],
              },
              minItems: 1,
              maxItems: 10,
            },
            reasoning: {
              type: "string",
              description: "Krótkie wyjaśnienie projektu treningu",
              maxLength: 500,
            },
          },
          required: ["steps"],
        },
      },
    };
  }

  /**
   * Wykonuje wywołanie API z logiką ponawiania z wykładniczym cofaniem
   */
  private async callOpenRouterWithRetry(params: OpenRouterRequest): Promise<OpenRouterResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await this.callOpenRouter(params);
      } catch (error) {
        lastError = error as Error;

        // Nie ponawiaj przy błędach klienta (4xx oprócz 429)
        if (error instanceof OpenRouterError && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Oblicz opóźnienie z wykładniczym cofaniem
        const delay = this.retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("Przekroczono maksymalną liczbę prób");
  }

  /**
   * Wykonuje bezpośrednie wywołanie API OpenRouter
   */
  private async callOpenRouter(params: OpenRouterRequest): Promise<OpenRouterResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": import.meta.env.PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "AI Running Training Planner",
        },
        body: JSON.stringify({
          ...params,
          stream: false, // Zawsze używaj trybu bez streamowania dla strukturyzowanych odpowiedzi
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new OpenRouterError(error.error?.message || "Błąd API OpenRouter", response.status, error.error?.code);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parsuje i waliduje odpowiedź OpenRouter
   */
  private parseResponse(response: OpenRouterResponse): ParsedSuggestion {
    // Wyciągnij JSON z odpowiedzi
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Brak zawartości w odpowiedzi");
    }

    // Sparsuj JSON
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Nieprawidłowy JSON w odpowiedzi: ${content.substring(0, 100)}...`);
    }

    // Zwaliduj strukturę
    if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
      throw new Error("Nieprawidłowa struktura odpowiedzi: brak lub pusta tablica kroków");
    }

    // Zwaliduj każdy krok
    const validatedSteps: WorkoutStepDto[] = parsed.steps.map((step: any, index: number) => {
      if (!step.part) {
        throw new Error(`Krok ${index} nie ma wymaganego pola 'part'`);
      }

      if (!step.distance_m && !step.duration_s) {
        throw new Error(`Krok ${index} musi mieć distance_m lub duration_s`);
      }

      return {
        part: step.part as StepPart,
        distance_m: step.distance_m ? Number(step.distance_m) : undefined,
        duration_s: step.duration_s ? Number(step.duration_s) : undefined,
        notes: step.notes ? String(step.notes) : undefined,
      };
    });

    return { steps: validatedSteps, reasoning: parsed.reasoning };
  }

  /**
   * Oblicza koszt użycia na podstawie modelu i tokenów
   */
  private calculateCost(usage: TokenUsage, model: string): number {
    // Cennik modeli za 1M tokenów (w USD)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      "openai/gpt-4o-mini": { prompt: 0.15, completion: 0.6 },
      "openai/gpt-3.5-turbo": { prompt: 0.5, completion: 1.5 },
      "anthropic/claude-3-haiku": { prompt: 0.25, completion: 1.25 },
      "anthropic/claude-3-sonnet": { prompt: 3.0, completion: 15.0 },
      "google/gemini-flash-1.5": { prompt: 0.075, completion: 0.3 },
      "google/gemini-flash-1.5-8b": { prompt: 0.0375, completion: 0.15 },
      "meta-llama/llama-3.1-8b-instruct": { prompt: 0.06, completion: 0.06 },
      "x-ai/grok-code-fast-1": { prompt: 5.0, completion: 15.0 },
    };

    const modelPricing = pricing[model] || { prompt: 0.5, completion: 1.5 }; // Domyślny fallback

    const promptCost = (usage.prompt_tokens / 1_000_000) * modelPricing.prompt;
    const completionCost = (usage.completion_tokens / 1_000_000) * modelPricing.completion;

    return Math.round((promptCost + completionCost) * 10000) / 10000; // Zaokrąglij do 4 miejsc po przecinku
  }

  /**
   * Konwertuje różne typy błędów na przyjazne komunikaty dla użytkownika
   */
  private mapError(error: unknown): Error {
    if (error instanceof OpenRouterError) {
      switch (error.status) {
        case 401:
          return new Error("Nieprawidłowy klucz API. Sprawdź konfigurację OpenRouter.");
        case 402:
          return new Error("Niewystarczające środki. Dodaj fundusze na koncie OpenRouter.");
        case 429:
          return new Error("Przekroczono limit żądań. Spróbuj ponownie później.");
        case 500:
        case 502:
        case 503:
          return new Error("Usługa OpenRouter tymczasowo niedostępna. Spróbuj ponownie później.");
        default:
          return new Error(`Błąd OpenRouter: ${error.message}`);
      }
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return new Error("Żądanie przekroczyło limit czasu. Spróbuj ponownie.");
      }
      return error;
    }

    return new Error("Wystąpił nieoczekiwany błąd");
  }
}
