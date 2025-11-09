# Plan Implementacji Usługi OpenRouter

## 1. Opis Usługi

Usługa OpenRouter to klasa TypeScript zapewniająca integrację z API OpenRouter do generowania sugestii treningowych wspomaganych przez AI. Obsługuje budowanie promptów, komunikację z API, parsowanie odpowiedzi, obsługę błędów oraz śledzenie wykorzystania. Usługa integruje się z istniejącą infrastrukturą logowania AI i stosuje ustalone wzorce serwisów w kodzie projektu.

### Kluczowe Odpowiedzialności:
- Generowanie sugestii treningowych przy użyciu LLM poprzez API OpenRouter
- Zapewnienie strukturyzowanych odpowiedzi JSON poprzez walidację schematu
- Śledzenie metryk wykorzystania (tokeny, koszty, opóźnienia)
- Elegancka obsługa błędów z ponawianiem prób i rozwiązaniami awaryjnymi
- Integracja z logowaniem AI dla analityki

### Lokalizacja pliku: `src/lib/services/openrouter.ts`

## 2. Opis Konstruktora

### Sygnatura
```typescript
constructor(options?: OpenRouterOptions)
```

### Parametry
- `options` (opcjonalny): Obiekt konfiguracyjny
  - `apiKey?: string` - Klucz API OpenRouter (domyślnie ze zmiennej środowiskowej)
  - `baseUrl?: string` - Bazowy URL API (domyślnie: "https://openrouter.ai/api/v1")
  - `defaultModel?: string` - Domyślny model do użycia (domyślnie: "x-ai/grok-code-fast-1")
  - `timeout?: number` - Timeout żądania w ms (domyślnie: 30000)
  - `maxRetries?: number` - Maksymalna liczba prób (domyślnie: 3)
  - `retryDelay?: number` - Początkowe opóźnienie ponawiania w ms (domyślnie: 1000)

### Szczegóły Implementacji
```typescript
export interface OpenRouterOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor(options: OpenRouterOptions = {}) {
    // Załaduj klucz API ze środowiska jeśli nie podano
    this.apiKey = options.apiKey || import.meta.env.OPENROUTER_API_KEY;

    // Walidacja obecności klucza API
    if (!this.apiKey) {
      throw new Error("Klucz API OpenRouter jest wymagany");
    }

    // Ustaw domyślne wartości dla pozostałych opcji
    this.baseUrl = options.baseUrl || "https://openrouter.ai/api/v1";
    this.defaultModel = options.defaultModel || "x-ai/grok-code-fast-1";
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }
}
```

## 3. Publiczne Metody i Pola

### 3.1 generateTrainingSuggestion

**Cel:** Generowanie sugestii treningowej na podstawie kontekstu i wymagań użytkownika.

**Sygnatura:**
```typescript
async generateTrainingSuggestion(
  params: GenerateTrainingParams
): Promise<TrainingSuggestionResponse>
```

**Parametry:**
```typescript
interface GenerateTrainingParams {
  userId: string;
  trainingTypeCode: string;
  plannedDate: string; // YYYY-MM-DD
  userGoal?: {
    goalType: "marathon" | "half_marathon" | "5k" | "10k" | "custom";
    targetDistanceM?: number;
    dueDate?: string;
  };
  recentWorkouts?: Array<{
    trainingTypeCode: string;
    completedAt: string;
    distanceM: number;
    durationS: number;
    rating?: "too_easy" | "just_right" | "too_hard";
  }>;
  context?: Record<string, unknown>;
  model?: string; // Nadpisuje domyślny model
  temperature?: number; // Kontrola kreatywności (0.0-1.0)
}
```

**Zwraca:**
```typescript
interface TrainingSuggestionResponse {
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
```

**Przykład Implementacji:**
```typescript
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
        { role: "user", content: userPrompt }
      ],
      response_format: responseFormat,
      temperature: params.temperature ?? 0.7,
      max_tokens: 1000
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
        planned_date: params.plannedDate
      }
    });

    return {
      steps: suggestion.steps,
      metadata: {
        model: response.model,
        provider: "openrouter",
        tokensUsed: {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens
        },
        costUsd,
        latencyMs,
        generatedAt: new Date().toISOString()
      }
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
        training_type: params.trainingTypeCode
      }
    });

    throw this.mapError(error);
  }
}
```

### 3.2 validateApiKey

**Cel:** Walidacja formatu klucza API i opcjonalne sprawdzenie poprawności z OpenRouter.

**Sygnatura:**
```typescript
async validateApiKey(checkRemote?: boolean): Promise<boolean>
```

**Implementacja:**
```typescript
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
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": import.meta.env.PUBLIC_SITE_URL || "http://localhost:3000"
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  return true;
}
```

### 3.3 getAvailableModels

**Cel:** Pobranie listy dostępnych modeli z OpenRouter.

**Sygnatura:**
```typescript
async getAvailableModels(): Promise<ModelInfo[]>
```

**Zwraca:**
```typescript
interface ModelInfo {
  id: string; // np. "openai/gpt-4o-mini"
  name: string;
  pricing: {
    prompt: number; // Koszt za 1M tokenów
    completion: number; // Koszt za 1M tokenów
  };
  contextLength: number;
  maxOutput?: number;
}
```

## 4. Prywatne Metody i Pola

### 4.1 buildPrompts

**Cel:** Konstruowanie promptów systemowych i użytkownika z kontekstu treningowego.

```typescript
private buildPrompts(params: GenerateTrainingParams): { systemPrompt: string; userPrompt: string } {
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
    recent.forEach(w => {
      const pace = w.distanceM > 0 ? (w.durationS / (w.distanceM / 1000)) : 0;
      const paceMin = Math.floor(pace / 60);
      const paceSec = Math.round(pace % 60);
      parts.push(`- ${w.trainingTypeCode}: ${(w.distanceM/1000).toFixed(1)}km w ${Math.round(w.durationS/60)}min (${paceMin}:${paceSec.toString().padStart(2, '0')}/km) - ${w.rating || 'bez oceny'}`);
    });
  }

  // Dodaj niestandardowy kontekst
  if (params.context) {
    parts.push(`\nDodatkowy kontekst: ${JSON.stringify(params.context)}`);
  }

  return parts.join("\n");
}
```

### 4.2 getResponseFormat

**Cel:** Definiowanie schematu JSON dla strukturyzowanej odpowiedzi.

```typescript
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
                  enum: ["warmup", "main", "cooldown", "segment"]
                },
                distance_m: {
                  type: "integer",
                  minimum: 0
                },
                duration_s: {
                  type: "integer",
                  minimum: 0
                },
                notes: {
                  type: "string",
                  maxLength: 500
                }
              },
              required: ["part"],
              anyOf: [
                { required: ["distance_m"] },
                { required: ["duration_s"] }
              ]
            },
            minItems: 1,
            maxItems: 10
          },
          reasoning: {
            type: "string",
            description: "Krótkie wyjaśnienie projektu treningu",
            maxLength: 500
          }
        },
        required: ["steps"]
      }
    }
  };
}
```

### 4.3 callOpenRouterWithRetry

**Cel:** Wykonanie wywołania API z logiką ponawiania z wykładniczym cofaniem.

```typescript
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
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Przekroczono maksymalną liczbę prób");
}
```

### 4.4 callOpenRouter

**Cel:** Bezpośrednia komunikacja API z OpenRouter.

```typescript
private async callOpenRouter(params: OpenRouterRequest): Promise<OpenRouterResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), this.timeout);

  try {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": import.meta.env.PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": "AI Running Training Planner"
      },
      body: JSON.stringify({
        ...params,
        stream: false // Zawsze używaj trybu bez streamowania dla strukturyzowanych odpowiedzi
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new OpenRouterError(
        error.error?.message || "Błąd API OpenRouter",
        response.status,
        error.error?.code
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 4.5 parseResponse

**Cel:** Parsowanie i walidacja odpowiedzi OpenRouter.

```typescript
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
      notes: step.notes ? String(step.notes) : undefined
    };
  });

  return { steps: validatedSteps, reasoning: parsed.reasoning };
}
```

### 4.6 calculateCost

**Cel:** Obliczanie kosztu użycia na podstawie modelu i tokenów.

```typescript
private calculateCost(usage: TokenUsage, model: string): number {
  // Cennik modeli za 1M tokenów (w USD)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    "openai/gpt-4o-mini": { prompt: 0.15, completion: 0.60 },
    "openai/gpt-3.5-turbo": { prompt: 0.50, completion: 1.50 },
    "anthropic/claude-3-haiku": { prompt: 0.25, completion: 1.25 },
    "anthropic/claude-3-sonnet": { prompt: 3.00, completion: 15.00 },
    "google/gemini-flash-1.5": { prompt: 0.075, completion: 0.30 },
    "google/gemini-flash-1.5-8b": { prompt: 0.0375, completion: 0.15 },
    "meta-llama/llama-3.1-8b-instruct": { prompt: 0.06, completion: 0.06 }
  };

  const modelPricing = pricing[model] || { prompt: 0.50, completion: 1.50 }; // Domyślny fallback

  const promptCost = (usage.prompt_tokens / 1_000_000) * modelPricing.prompt;
  const completionCost = (usage.completion_tokens / 1_000_000) * modelPricing.completion;

  return Math.round((promptCost + completionCost) * 10000) / 10000; // Zaokrąglij do 4 miejsc po przecinku
}
```

### 4.7 mapError

**Cel:** Konwersja różnych typów błędów na przyjazne komunikaty dla użytkownika.

```typescript
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
```

## 5. Obsługa Błędów

### Klasy Błędów

```typescript
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
```

### Scenariusze Błędów i Obsługa

| Scenariusz | Status HTTP | Kod błędu | Akcja |
|------------|-------------|-----------|-------|
| Brak klucza API | - | - | Rzuć błąd natychmiast w konstruktorze |
| Nieprawidłowy klucz API | 401 | `invalid_api_key` | Bez ponowienia, przyjazny komunikat |
| Niewystarczające środki | 402 | `insufficient_credits` | Bez ponowienia, poproś o doładowanie |
| Limit żądań | 429 | `rate_limit_exceeded` | Ponów z wykładniczym cofaniem |
| Nieprawidłowe żądanie | 400 | `invalid_request` | Bez ponowienia, sprawdź parametry |
| Model nie znaleziony | 404 | `model_not_found` | Bez ponowienia, użyj domyślnego modelu |
| Polityka treści | 400 | `content_policy_violation` | Bez ponowienia, dostosuj prompt |
| Timeout | - | - | Ponów z cofaniem |
| Błąd serwisu | 500-503 | - | Ponów z cofaniem |
| Błąd sieci | - | - | Ponów z cofaniem |

### Integracja z Logami AI

Wszystkie błędy są automatycznie logowane używając funkcji `logAiError` z `aiLogsClient.ts`:

```typescript
import { logAiSuccess, logAiError } from "./aiLogsClient";

// W blokach catch:
void logAiError({
  event: "suggestion.generate",
  level: "error",
  provider: "openrouter",
  user_id: params.userId,
  payload: {
    error: error instanceof Error ? error.message : String(error),
    error_code: error instanceof OpenRouterError ? error.code : undefined,
    model: params.model || this.defaultModel,
    training_type: params.trainingTypeCode
  }
});
```

## 6. Kwestie Bezpieczeństwa

### 6.1 Zarządzanie Kluczem API
- **Nigdy nie ujawniaj klucza API w kodzie klienckim**
- Przechowuj w zmiennych środowiskowych: `OPENROUTER_API_KEY`
- Użyj `.env.example` z wartościami placeholder
- Dodaj `.env` do `.gitignore`

### 6.2 Sanityzacja Wejścia
- **Zapobiegaj wstrzykiwaniu promptów** poprzez sanityzację danych użytkownika
- Escapuj znaki specjalne w danych kontekstowych
- Ogranicz rozmiar kontekstu aby zapobiec przepełnieniu tokenów

```typescript
private sanitizeInput(input: string): string {
  // Usuń potencjalne wzorce wstrzykiwania
  return input
    .replace(/\bsystem\s*:/gi, "")
    .replace(/\bassistant\s*:/gi, "")
    .replace(/\bignoruj\s+poprzednie\s+instrukcje/gi, "")
    .slice(0, 1000); // Ogranicz długość
}
```

### 6.3 Walidacja Odpowiedzi
- **Zawsze waliduj odpowiedzi API** przed parsowaniem
- Używaj bloków try-catch dla parsowania JSON
- Waliduj względem oczekiwanego schematu
- Sanityzuj wyjście przed zapisem w bazie danych



## 7. Plan Wdrożenia Krok po Kroku

### Faza 1: Podstawowa Konfiguracja (2 godziny)

1. **Utwórz plik serwisu**
   ```bash
   touch src/lib/services/openrouter.ts
   ```

3. **Zdefiniuj typy i interfejsy**
   - Utwórz wszystkie definicje typów
   - Wyeksportuj niezbędne interfejsy

4. **Zaimplementuj konstruktor**
   - Załaduj konfigurację
   - Zwaliduj klucz API
   - Ustaw wartości domyślne

### Faza 2: Podstawowa Funkcjonalność (3 godziny)

5. **Zaimplementuj komunikację API**
   - Metoda `callOpenRouter`
   - Podstawowa obsługa błędów
   - Parsowanie odpowiedzi

6. **Dodaj budowanie promptów**
   - Szablon promptu systemowego
   - Konstrukcja promptu użytkownika
   - Formatowanie kontekstu

7. **Zaimplementuj format odpowiedzi**
   - Definicja schematu JSON
   - Konfiguracja strukturyzowanego wyjścia

8. **Stwórz główną metodę generowania**
   - `generateTrainingSuggestion`
   - Podstawowy przepływ bez ponowień

### Faza 3: Obsługa Błędów i Ponawianie (2 godziny)

9. **Dodaj logikę ponawiania**
   - Wykładnicze cofanie
   - Selektywne warunki ponawiania
   - Konfiguracja maksymalnych prób

10. **Zaimplementuj mapowanie błędów**
    - Przyjazne komunikaty dla użytkownika
    - Klasyfikacja błędów
    - Integracja z logowaniem

11. **Dodaj obsługę timeoutów**
    - Konfiguracja AbortController
    - Konfiguracja timeout
    - Logika czyszczenia

### Faza 4: Integracja (2 godziny)

12. **Zintegruj z logami AI**
    - Importuj funkcje logowania
    - Dodaj logowanie sukcesów
    - Dodaj logowanie błędów

13. **Zaktualizuj AI Engine**
    ```typescript
    // src/lib/services/aiEngine.ts
    import { OpenRouterService } from "./openrouter";

    const openrouter = new OpenRouterService();

    export async function generateSuggestion(
      userId: string,
      input: AiSuggestionCreateCommand
    ): Promise<AiGeneratedSuggestion> {
      // Wywołaj serwis OpenRouter
      const result = await openrouter.generateTrainingSuggestion({
        userId,
        trainingTypeCode: input.training_type_code,
        plannedDate: input.planned_date,
        context: input.context
      });

      return {
        steps: result.steps,
        metadata: result.metadata
      };
    }
    ```


### Faza 5: Testowanie i Optymalizacja (1 godzina)



18. **Dokumentacja**
    - Dokumentacja API
    - Przykłady użycia
    - Przewodnik konfiguracji

## Przykłady Użycia

### Podstawowe Użycie

```typescript
import { OpenRouterService } from "./lib/services/openrouter";

// Inicjalizacja serwisu
const openrouter = new OpenRouterService();

// Wygeneruj sugestię treningową
const suggestion = await openrouter.generateTrainingSuggestion({
  userId: "user-123",
  trainingTypeCode: "easy",
  plannedDate: "2025-11-15",
  userGoal: {
    goalType: "marathon",
    dueDate: "2025-05-01"
  }
});

console.log(suggestion.steps);
// Wynik: Tablica kroków treningu z rozgrzewką, częścią główną i schładzaniem
```

### Z Kontekstem Ostatnich Treningów

```typescript
const suggestion = await openrouter.generateTrainingSuggestion({
  userId: "user-123",
  trainingTypeCode: "tempo",
  plannedDate: "2025-11-15",
  recentWorkouts: [
    {
      trainingTypeCode: "easy",
      completedAt: "2025-11-13T18:00:00Z",
      distanceM: 5000,
      durationS: 1800,
      rating: "too_easy"
    },
    {
      trainingTypeCode: "interval",
      completedAt: "2025-11-11T18:00:00Z",
      distanceM: 8000,
      durationS: 2400,
      rating: "just_right"
    }
  ],
  model: "anthropic/claude-3-haiku", // Użyj konkretnego modelu
  temperature: 0.8 // Wyższa kreatywność
});
```

### Obsługa Błędów

```typescript
try {
  const suggestion = await openrouter.generateTrainingSuggestion(params);
  // Użyj sugestii
} catch (error) {
  if (error.message.includes("Nieprawidłowy klucz API")) {
    // Poproś użytkownika o sprawdzenie konfiguracji
  } else if (error.message.includes("limit żądań")) {
    // Pokaż komunikat o ponowieniu
  } else {
    // Ogólna obsługa błędów
  }
}
```

## Zmienne Środowiskowe

Dodaj do `.env`:

```bash

# Opcjonalne: Nadpisz domyślne
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=x-ai/grok-code-fast-1
OPENROUTER_TIMEOUT_MS=30000
OPENROUTER_MAX_RETRIES=3

# URL strony dla nagłówka HTTP-Referer
PUBLIC_SITE_URL=https://twoja-domena.com
```

Dodaj do `.env.example`:

```bash

# Opcjonalna konfiguracja
OPENROUTER_DEFAULT_MODEL=x-ai/grok-code-fast-1
OPENROUTER_TIMEOUT_MS=30000
```

##

## Uwagi Wydajnościowe

3. **Dostrajanie Timeoutu**: Dostosuj timeout na podstawie modelu i złożoności
4. **Przetwarzanie Wsadowe**: Wspieraj wiele sugestii w jednym żądaniu
5. **Ponowne Użycie Połączenia**: Utrzymuj połączenia HTTP przy życiu

## Migracja z Placeholdera

Aby migrować z obecnej implementacji placeholder:

1. Zaimplementuj OpenRouterService jak opisano
2. Zaktualizuj `aiEngine.ts` aby używał nowego serwisu
3. Usuń kod placeholder i TODO
4. Przetestuj z prawdziwym kluczem API
5. Monitoruj koszty i wydajność poprzez logi AI
6. Dostosuj parametry na podstawie rzeczywistego użycia

## Uwagi dla Developera iOS

### Analogie do Konceptów iOS/Swift

| Koncept OpenRouter | Analogia iOS/Swift |
|--------------------|-------------------|
| Klasa serwisu | Klasa Swift z dependency injection |
| Async/await | Takie same jak Swift async/await |
| Mapowanie błędów | Protokół Error w Swift z niestandardowymi typami |
| Logika ponawiania | URLSession retry z URLSessionTaskDelegate |
| Parsowanie JSON | Protokół Codable |
| Zmienne środowiskowe | Konfiguracja Info.plist |
| AbortController | URLSessionTask.cancel() |
| Walidacja odpowiedzi | Instrukcje guard w Swift |

### Kluczowe Różnice od Developmentu iOS

1. **Brak sprawdzania typów w czasie kompilacji dla odpowiedzi API** - Musisz walidować w runtime
2. **Zmienne środowiskowe zamiast Info.plist** - Użyj pliku `.env`
3. **Fetch API zamiast URLSession** - Podobne koncepty, inna składnia
4. **Walidacja schematu JSON** - Bardziej jawna niż Codable
5. **Logowanie fire-and-forget** - Użyj operatora void aby zignorować Promise

### Częste Pułapki do Uniknięcia

1. **Nie czekaj na wywołania logowania** - Użyj `void` dla fire-and-forget
2. **Zawsze obsługuj timeouty sieci** - Sieci są mniej niezawodne niż iOS
3. **Waliduj wszystkie zewnętrzne dane** - Brak gwarancji w czasie kompilacji
4. **Sprawdzaj undefined/null** - Częstsze niż opcjonalne w Swift
5. **Używaj try-catch intensywnie** - Wyjątki częstsze niż typy Result