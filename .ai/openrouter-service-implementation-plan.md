# OpenRouter Service Implementation Plan

## 1. Service Description

The OpenRouter service is a TypeScript class integrating with the OpenRouter API to generate AI-assisted workout suggestions. It handles prompt construction, API communication, response parsing, errors, and usage tracking. It integrates with existing AI logging infrastructure and follows established service patterns in the codebase.

### Key Responsibilities:

- Generate workout suggestions using LLMs through OpenRouter
- Ensure structured JSON responses through schema validation
- Track usage metrics (tokens, costs, latency)
- Handle errors gracefully with retries and fallbacks
- Integrate AI logging for analytics

### File Location: `src/lib/services/openrouter.ts`

## 2. Constructor Description

### Signature

```typescript
constructor(options?: OpenRouterOptions)
```

### Parameters

- `options` (optional): Configuration object
  - `apiKey?: string` - OpenRouter API key (defaults to environment variable)
  - `baseUrl?: string` - API base URL (default: "https://openrouter.ai/api/v1")
  - `defaultModel?: string` - Default model (default: "x-ai/grok-code-fast-1")
  - `timeout?: number` - Request timeout in ms (default: 30000)
  - `maxRetries?: number` - Maximum attempts (default: 3)
  - `retryDelay?: number` - Initial retry delay in ms (default: 1000)

### Implementation Details

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
    // Load API key from environment if not provided
    this.apiKey = options.apiKey || import.meta.env.OPENROUTER_API_KEY;

    // Validate API key presence
    if (!this.apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    // Set defaults for remaining options
    this.baseUrl = options.baseUrl || "https://openrouter.ai/api/v1";
    this.defaultModel = options.defaultModel || "x-ai/grok-code-fast-1";
    this.timeout = options.timeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }
}
```

## 3. Public Methods and Fields

### 3.1 generateTrainingSuggestion

**Goal:** Generate a workout suggestion based on user context and requirements.

**Signature:**

```typescript
async generateTrainingSuggestion(
  params: GenerateTrainingParams
): Promise<TrainingSuggestionResponse>
```

**Parameters:**

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
  model?: string; // Overrides the default model
  temperature?: number; // Creativity control (0.0-1.0)
}
```

**Returns:**

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

**Implementation Example:**

```typescript
async generateTrainingSuggestion(params: GenerateTrainingParams): Promise<TrainingSuggestionResponse> {
  const startTime = Date.now();

  try {
    // Build prompt from context
    const { systemPrompt, userPrompt } = this.buildPrompts(params);

    // Define response schema
    const responseFormat = this.getResponseFormat();

    // Call API with retries
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

    // Parse and validate response
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
    // Log error (fire-and-forget)
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

**Goal:** Validate API key format and optionally verify it with OpenRouter.

**Signature:**

```typescript
async validateApiKey(checkRemote?: boolean): Promise<boolean>
```

**Implementation:**

```typescript
async validateApiKey(checkRemote = false): Promise<boolean> {
  // Basic format validation
  if (!this.apiKey || !this.apiKey.startsWith("sk-or-")) {
    return false;
  }

  // Optional remote validation
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

**Goal:** Retrieve available models from OpenRouter.

**Signature:**

```typescript
async getAvailableModels(): Promise<ModelInfo[]>
```

**Returns:**

```typescript
interface ModelInfo {
  id: string; // np. "openai/gpt-4o-mini"
  name: string;
  pricing: {
    prompt: number; // Cost per 1M tokens
    completion: number; // Cost per 1M tokens
  };
  contextLength: number;
  maxOutput?: number;
}
```

## 4. Private Methods and Fields

### 4.1 buildPrompts

**Goal:** Construct system and user prompts from workout context.

```typescript
private buildPrompts(params: GenerateTrainingParams): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an experienced running coach creating personalized training plans.
Your goal is to generate a structured workout plan suited to the runner's fitness level and goals.

Key rules:
- Warm-up should account for 10-15% of total workout time
- The main part should match the workout type (easy, tempo, intervals, long run, recovery)
- Cool-down should account for 5-10% of total workout time
- Include specific guidance for each workout part
- Consider the runner's recent performance and feedback

Respond with a valid JSON object matching the provided schema.`;

  const userPrompt = this.buildUserPrompt(params);

  return { systemPrompt, userPrompt };
}

private buildUserPrompt(params: GenerateTrainingParams): string {
  const parts: string[] = [];

  // Basic request
  parts.push(`Create a ${params.trainingTypeCode} workout session for ${params.plannedDate}.`);

  // Add goal context
  if (params.userGoal) {
    parts.push(`Runner's goal: ${params.userGoal.goalType} by ${params.userGoal.dueDate}.`);
  }

  // Add recent workout context
  if (params.recentWorkouts && params.recentWorkouts.length > 0) {
    const recent = params.recentWorkouts.slice(0, 3);
    parts.push("\nRecent workouts:");
    recent.forEach(w => {
      const pace = w.distanceM > 0 ? (w.durationS / (w.distanceM / 1000)) : 0;
      const paceMin = Math.floor(pace / 60);
      const paceSec = Math.round(pace % 60);
      parts.push(`- ${w.trainingTypeCode}: ${(w.distanceM/1000).toFixed(1)}km in ${Math.round(w.durationS/60)}min (${paceMin}:${paceSec.toString().padStart(2, '0')}/km) - ${w.rating || 'unrated'}`);
    });
  }

  // Add custom context
  if (params.context) {
    parts.push(`\nAdditional context: ${JSON.stringify(params.context)}`);
  }

  return parts.join("\n");
}
```

### 4.2 getResponseFormat

**Goal:** Define the JSON schema for structured responses.

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
            description: "Brief explanation of the workout design",
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

**Goal:** Execute an API call with exponential backoff retries.

```typescript
private async callOpenRouterWithRetry(params: OpenRouterRequest): Promise<OpenRouterResponse> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < this.maxRetries; attempt++) {
    try {
      return await this.callOpenRouter(params);
    } catch (error) {
      lastError = error as Error;

      // Do not retry client errors (4xx except 429)
      if (error instanceof OpenRouterError && error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = this.retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Maximum attempts exceeded");
}
```

### 4.4 callOpenRouter

**Goal:** Direct API communication with OpenRouter.

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
        stream: false // Always use non-streaming mode for structured responses
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new OpenRouterError(
        error.error?.message || "OpenRouter API error",
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

**Goal:** Parse and validate OpenRouter responses.

```typescript
private parseResponse(response: OpenRouterResponse): ParsedSuggestion {
  // Extract JSON from response
  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response content");
  }

  // Sparsuj JSON
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in response: ${content.substring(0, 100)}...`);
  }

  // Validate structure
  if (!parsed.steps || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error("Invalid response structure: missing or empty steps array");
  }

  // Validate each step
  const validatedSteps: WorkoutStepDto[] = parsed.steps.map((step: any, index: number) => {
    if (!step.part) {
      throw new Error(`Step ${index} is missing required field 'part'`);
    }

    if (!step.distance_m && !step.duration_s) {
      throw new Error(`Step ${index} must have distance_m or duration_s`);
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

**Goal:** Calculate usage cost from model and tokens.

```typescript
private calculateCost(usage: TokenUsage, model: string): number {
  // Model pricing per 1M tokens (USD)
  const pricing: Record<string, { prompt: number; completion: number }> = {
    "openai/gpt-4o-mini": { prompt: 0.15, completion: 0.60 },
    "openai/gpt-3.5-turbo": { prompt: 0.50, completion: 1.50 },
    "anthropic/claude-3-haiku": { prompt: 0.25, completion: 1.25 },
    "anthropic/claude-3-sonnet": { prompt: 3.00, completion: 15.00 },
    "google/gemini-flash-1.5": { prompt: 0.075, completion: 0.30 },
    "google/gemini-flash-1.5-8b": { prompt: 0.0375, completion: 0.15 },
    "meta-llama/llama-3.1-8b-instruct": { prompt: 0.06, completion: 0.06 }
  };

  const modelPricing = pricing[model] || { prompt: 0.50, completion: 1.50 }; // Default fallback

  const promptCost = (usage.prompt_tokens / 1_000_000) * modelPricing.prompt;
  const completionCost = (usage.completion_tokens / 1_000_000) * modelPricing.completion;

  return Math.round((promptCost + completionCost) * 10000) / 10000; // Round to 4 decimal places
}
```

### 4.7 mapError

**Goal:** Convert different error types into user-friendly messages.

```typescript
private mapError(error: unknown): Error {
  if (error instanceof OpenRouterError) {
    switch (error.status) {
      case 401:
        return new Error("Invalid API key. Check your OpenRouter configuration.");
      case 402:
        return new Error("Insufficient credits. Add funds to your OpenRouter account.");
      case 429:
        return new Error("Request limit exceeded. Please try again later.");
      case 500:
      case 502:
      case 503:
        return new Error("OpenRouter is temporarily unavailable. Please try again later.");
      default:
        return new Error(`OpenRouter error: ${error.message}`);
    }
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return new Error("Request timed out. Please try again.");
    }
    return error;
  }

  return new Error("An unexpected error occurred");
}
```

## 5. Error Handling

### Error Classes

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

### Error Scenarios and Handling

| Scenario             | HTTP Status | Error Code                 | Action                           |
| -------------------- | ----------- | -------------------------- | -------------------------------- |
| Missing API key      | -           | -                          | Throw immediately in constructor |
| Invalid API key      | 401         | `invalid_api_key`          | No retry, friendly message       |
| Insufficient credits | 402         | `insufficient_credits`     | No retry, ask for top-up         |
| Request limit        | 429         | `rate_limit_exceeded`      | Retry with exponential backoff   |
| Invalid request      | 400         | `invalid_request`          | No retry, check parameters       |
| Model not found      | 404         | `model_not_found`          | No retry, use default model      |
| Content policy       | 400         | `content_policy_violation` | No retry, adjust prompt          |
| Timeout              | -           | -                          | Retry with backoff               |
| Service error        | 500-503     | -                          | Retry with backoff               |
| Network error        | -           | -                          | Retry with backoff               |

### AI Log Integration

All errors are automatically logged using `logAiError` from `aiLogsClient.ts`:

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
    training_type: params.trainingTypeCode,
  },
});
```

## 6. Security Considerations

### 6.1 API Key Management

- **Never expose the API key in client code**
- Store in environment variables: `OPENROUTER_API_KEY`
- Use `.env.example` with placeholder values
- Add `.env` to `.gitignore`

### 6.2 Input Sanitization

- **Prevent prompt injection** by sanitizing user data
- Escape special characters in context data
- Limit context size to prevent token overflow

```typescript
private sanitizeInput(input: string): string {
  // Remove potential injection patterns
  return input
    .replace(/\bsystem\s*:/gi, "")
    .replace(/\bassistant\s*:/gi, "")
    .replace(/\bignoruj\s+poprzednie\s+instrukcje/gi, "")
    .slice(0, 1000); // Limit length
}
```

### 6.3 Response Validation

- **Always validate API responses** before parsing
- Use try-catch for JSON parsing
- Validate against the expected schema
- Sanitize output before saving to the database

## 7. Step-by-Step Implementation Plan

### Phase 1: Basic Setup (2 Hours)

1. **Create service file**

   ```bash
   touch src/lib/services/openrouter.ts
   ```

2. **Define types and interfaces**
   - Create all type definitions
   - Export necessary interfaces

3. **Implement constructor**
   - Load configuration
   - Validate API key
   - Set defaults

### Phase 2: Core Functionality (3 Hours)

5. **Implement API communication**
   - `callOpenRouter` method
   - Basic error handling
   - Response parsing

6. **Add prompt construction**
   - System prompt template
   - User prompt construction
   - Context formatting

7. **Implement response format**
   - JSON schema definition
   - Structured output configuration

8. **Create main generation method**
   - `generateTrainingSuggestion`
   - Basic flow without retries

### Phase 3: Error Handling and Retries (2 Hours)

9. **Add retry logic**
   - Exponential backoff
   - Selective retry conditions
   - Maximum attempts configuration

10. **Implement error mapping**
    - User-friendly messages
    - Error classification
    - Logging integration

11. **Add timeout handling**
    - AbortController configuration
    - Timeout configuration
    - Cleanup logic

### Phase 4: Integration (2 Hours)

12. **Integrate AI logs**
    - Import logging functions
    - Add success logging
    - Add error logging

13. **Update AI Engine**
    ```typescript
    // src/lib/services/aiEngine.ts
    import { OpenRouterService } from "./openrouter";

    const openrouter = new OpenRouterService();

    export async function generateSuggestion(
      userId: string,
      input: AiSuggestionCreateCommand
    ): Promise<AiGeneratedSuggestion> {
      // Call OpenRouter service
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
    ```

### Phase 5: Testing and Optimization (1 Hour)

18. **Documentation**
    - API documentation
    - Usage examples
    - Configuration guide

## Usage Examples

### Basic Usage

```typescript
import { OpenRouterService } from "./lib/services/openrouter";

// Inicjalizacja serwisu
const openrouter = new OpenRouterService();

// Generate a workout suggestion
const suggestion = await openrouter.generateTrainingSuggestion({
  userId: "user-123",
  trainingTypeCode: "easy",
  plannedDate: "2025-11-15",
  userGoal: {
    goalType: "marathon",
    dueDate: "2025-05-01",
  },
});

console.log(suggestion.steps);
// Result: Array of workout steps with warm-up, main part, and cool-down
```

### With Recent Workout Context

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
      rating: "too_easy",
    },
    {
      trainingTypeCode: "interval",
      completedAt: "2025-11-11T18:00:00Z",
      distanceM: 8000,
      durationS: 2400,
      rating: "just_right",
    },
  ],
  model: "anthropic/claude-3-haiku", // Use a specific model
  temperature: 0.8, // Higher creativity
});
```

### Error Handling

```typescript
try {
  const suggestion = await openrouter.generateTrainingSuggestion(params);
  // Use suggestion
} catch (error) {
  if (error.message.includes("Invalid API key")) {
    // Ask user to check configuration
  } else if (error.message.includes("Request limit")) {
    // Show retry message
  } else {
    // General error handling
  }
}
```

## Environment Variables

Add to `.env`:

```bash

# Optional: Override defaults
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=x-ai/grok-code-fast-1
OPENROUTER_TIMEOUT_MS=30000
OPENROUTER_MAX_RETRIES=3

# Site URL for HTTP-Referer header
PUBLIC_SITE_URL=https://twoja-domena.com
```

Add to `.env.example`:

```bash

# Optional configuration
OPENROUTER_DEFAULT_MODEL=x-ai/grok-code-fast-1
OPENROUTER_TIMEOUT_MS=30000
```

##

## Performance Notes

3. **Timeout Tuning**: Adjust based on model and complexity
4. **Batch Processing**: Support multiple suggestions in one request
5. **Connection Reuse**: Keep HTTP connections alive

## Migration from Placeholder

To migrate from the current placeholder implementation:

1. Implement OpenRouterService as described
2. Update `aiEngine.ts` to use the new service
3. Remove placeholder code and TODOs
4. Test with a real API key
5. Monitor costs and performance through AI logs
6. Adjust parameters based on actual usage

## Notes for the iOS Developer

### iOS/Swift Concept Analogies

| OpenRouter Concept    | iOS/Swift Analogy                            |
| --------------------- | -------------------------------------------- |
| Service class         | Swift class with dependency injection        |
| Async/await           | Same as Swift async/await                    |
| Error mapping         | Swift Error protocol with custom types       |
| Retry logic           | URLSession retry with URLSessionTaskDelegate |
| JSON parsing          | Codable protocol                             |
| Environment variables | Info.plist configuration                     |
| AbortController       | URLSessionTask.cancel()                      |
| Response validation   | Swift guard statements                       |

### Key Differences from iOS Development

1. **No compile-time type checking for API responses** - Validate at runtime
2. **Environment variables instead of Info.plist** - Use `.env`
3. **Fetch API instead of URLSession** - Similar concepts, different syntax
4. **JSON schema validation** - More explicit than Codable
5. **Fire-and-forget logging** - Use void to ignore the Promise

### Common Pitfalls to Avoid

1. **Do not await logging calls** - Use `void` for fire-and-forget
2. **Always handle network timeouts** - Networks are less reliable than iOS
3. **Validate all external data** - No compile-time guarantees
4. **Check undefined/null** - More common than Swift optionals
5. **Use try-catch extensively** - Exceptions are more common than Result types
