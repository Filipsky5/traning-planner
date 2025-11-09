import type { AiSuggestionDto, WorkoutStepDto } from "../types";

/**
 * ViewModel dla kroku treningu w sugestii AI
 * Rozszerza podstawowy WorkoutStepDto o czytelne labelki i szczegóły dla UI
 */
export interface SuggestionStepViewModel {
  part: "warmup" | "main" | "cooldown";
  label: string; // "Rozgrzewka", "Część główna", "Schłodzenie"
  details: string; // np. "10 min" lub "5 km" lub "10 min, 5 km"
  description?: string; // Opis z DTO
}

/**
 * ViewModel dla sugestii AI
 * Transformuje AiSuggestionDto do formatu przyjaznego dla UI
 */
export interface AISuggestionViewModel {
  id: string;
  trainingTypeCode: string;
  trainingTypeName?: string; // Dodane gdy mamy dostęp do pełnych danych typu
  plannedDate: Date;
  totalDurationSec: number;
  totalDistanceMeters: number;
  steps: SuggestionStepViewModel[];
  status: "shown" | "accepted" | "rejected" | "expired";
  isExpired: boolean;
  expiresAt: Date;
}

/**
 * Mapuje część treningu na polską etykietę
 */
function getPartLabel(part: "warmup" | "main" | "cooldown"): string {
  const labels = {
    warmup: "Rozgrzewka",
    main: "Część główna",
    cooldown: "Schłodzenie",
  };
  return labels[part];
}

/**
 * Formatuje dystans w metry na czytelny string (np. "5.2 km" lub "800 m")
 */
function formatDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
  }
  return `${meters} m`;
}

/**
 * Formatuje czas w sekundy na czytelny string (np. "45 min" lub "1 godz 30 min")
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours} godz ${minutes} min` : `${hours} godz`;
  }
  return `${minutes} min`;
}

/**
 * Transformuje WorkoutStepDto do SuggestionStepViewModel
 */
function transformStep(step: WorkoutStepDto): SuggestionStepViewModel {
  const part = step.part === "segment" ? "main" : step.part;
  const label = getPartLabel(part);

  // Buduj szczegóły na podstawie dostępnych danych
  const parts: string[] = [];
  if (step.duration_s) {
    parts.push(formatDuration(step.duration_s));
  }
  if (step.distance_m) {
    parts.push(formatDistance(step.distance_m));
  }
  const details = parts.join(", ") || "Brak danych";

  return {
    part,
    label,
    details,
    description: step.notes,
  };
}

/**
 * Transformuje AiSuggestionDto do AISuggestionViewModel
 */
export function transformAISuggestion(dto: AiSuggestionDto): AISuggestionViewModel {
  // Oblicz totale
  const totalDurationSec = dto.steps.reduce((sum, step) => sum + (step.duration_s || 0), 0);
  const totalDistanceMeters = dto.steps.reduce((sum, step) => sum + (step.distance_m || 0), 0);

  // Sprawdź czy sugestia wygasła
  const expiresAt = new Date(dto.expires_at);
  const now = new Date();
  const isExpired = now > expiresAt || dto.status === "expired";

  return {
    id: dto.id,
    trainingTypeCode: dto.training_type_code,
    plannedDate: new Date(dto.planned_date),
    totalDurationSec,
    totalDistanceMeters,
    steps: dto.steps.map(transformStep),
    status: isExpired ? "expired" : dto.status,
    isExpired,
    expiresAt,
  };
}

/**
 * Formatuje łączny czas i dystans dla wyświetlenia w meta info
 */
export function formatSuggestionMeta(suggestion: AISuggestionViewModel): {
  duration: string;
  distance: string;
} {
  return {
    duration: formatDuration(suggestion.totalDurationSec),
    distance: formatDistance(suggestion.totalDistanceMeters),
  };
}
