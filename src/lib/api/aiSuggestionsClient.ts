import type {
  ApiResponse,
  AiSuggestionDto,
  AiSuggestionCreateCommand,
  AiSuggestionAcceptCommand,
  AiSuggestionRegenerateCommand,
  WorkoutDetailDto,
} from "../../types";

/**
 * Client-side API wrapper dla sugestii AI
 * Wywołuje endpointy HTTP z frontendu
 */

interface GenerateSuggestionResponse {
  suggestion: AiSuggestionDto;
}

interface AcceptSuggestionResponse {
  suggestion: AiSuggestionDto;
  workout: WorkoutDetailDto;
}

interface RegenerateSuggestionResponse {
  suggestion: AiSuggestionDto;
}

/**
 * Generuje nową sugestię AI
 * POST /api/v1/ai/suggestions
 */
export async function generateSuggestion(
  command: AiSuggestionCreateCommand
): Promise<AiSuggestionDto> {
  const response = await fetch("/api/v1/ai/suggestions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data: ApiResponse<GenerateSuggestionResponse> = await response.json();
  return data.data.suggestion;
}

/**
 * Akceptuje sugestię AI i tworzy trening
 * POST /api/v1/ai/suggestions/{id}/accept
 */
export async function acceptSuggestion(
  suggestionId: string,
  command: AiSuggestionAcceptCommand
): Promise<{ suggestion: AiSuggestionDto; workout: WorkoutDetailDto }> {
  const response = await fetch(`/api/v1/ai/suggestions/${suggestionId}/accept`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data: ApiResponse<AcceptSuggestionResponse> = await response.json();
  return data.data;
}

/**
 * Regeneruje sugestię AI (tworzy nową na podstawie starej)
 * POST /api/v1/ai/suggestions/{id}/regenerate
 */
export async function regenerateSuggestion(
  suggestionId: string,
  command?: AiSuggestionRegenerateCommand
): Promise<AiSuggestionDto> {
  const response = await fetch(`/api/v1/ai/suggestions/${suggestionId}/regenerate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command || {}),
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  const data: ApiResponse<RegenerateSuggestionResponse> = await response.json();
  return data.data.suggestion;
}

/**
 * Obsługa błędów API
 * Rzuca własny Error z kontekstem błędu
 */
async function handleApiError(response: Response): Promise<never> {
  let errorData: any;

  try {
    errorData = await response.json();
  } catch {
    // Jeśli nie możemy sparsować JSON, rzucamy generyczny błąd
    throw new ApiError(response.status, "Wystąpił błąd podczas komunikacji z serwerem");
  }

  const message = errorData?.error?.message || "Wystąpił nieoczekiwany błąd";
  const details = errorData?.error?.details;

  throw new ApiError(response.status, message, details);
}

/**
 * Klasa błędu API z dodatkowymi metadanymi
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Sprawdza czy błąd jest konfliktem pozycji (409)
   */
  isPositionConflict(): boolean {
    return this.status === 409 && this.message.includes("position");
  }

  /**
   * Sprawdza czy sugestia wygasła (410)
   */
  isExpired(): boolean {
    return this.status === 410;
  }

  /**
   * Sprawdza czy przekroczono limit regeneracji (429)
   */
  isTooManyRequests(): boolean {
    return this.status === 429;
  }
}
