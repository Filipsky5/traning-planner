/**
 * Typy ViewModels dla formularzy treningowych
 *
 * Te typy są używane w UI i operują na jednostkach przyjaznych użytkownikowi
 * (km zamiast metrów, Date zamiast string, etc.)
 * Są mapowane do typów API przed wysłaniem żądania
 */

import type { StepPart } from "../types";

/**
 * Pojedynczy krok treningu w formularzu
 * Używa jednostek UI-friendly (km, minuty+sekundy)
 */
export interface ManualWorkoutStepForm {
  /** Lokalny identyfikator w UI (dla react-hook-form) */
  id: string;

  /** Typ segmentu */
  part: StepPart;

  /** Dystans w kilometrach (opcjonalny) */
  distanceKm?: number;

  /** Czas - minuty (opcjonalny) */
  durationMinutes?: number;

  /** Czas - sekundy (0-59, opcjonalny) */
  durationSeconds?: number;

  /** Planowane tętno (opcjonalne, będzie zapisane w notes) */
  targetHrBpm?: number;

  /** Dodatkowe notatki użytkownika */
  notes?: string;
}

/**
 * Główny ViewModel formularza ręcznego dodawania treningu
 */
export interface ManualWorkoutFormValues {
  // Podstawowe pola planu
  /** Kod typu treningu z TrainingTypeDto */
  trainingTypeCode: string;

  /** Data planowana (UI używa Date) */
  plannedDate: Date;

  /** Pozycja w dniu (min 1) */
  position: number;

  /** Dynamiczna lista kroków */
  steps: ManualWorkoutStepForm[];

  // Pola pochodne (tylko do prezentacji, nie wysyłane bezpośrednio)
  /** Suma dystansów ze wszystkich kroków (w km) */
  totalPlannedDistanceKm: number;

  /** Suma czasów ze wszystkich kroków (w sekundach) */
  totalPlannedDurationSec: number;

  // Sekcja realizacji (opcjonalna)
  /** Czy trening jest już wykonany */
  isCompleted: boolean;

  /** Zrealizowany dystans w km (wymagane gdy isCompleted=true) */
  realizedDistanceKm?: number;

  /** Zrealizowany czas w sekundach (wymagane gdy isCompleted=true) */
  realizedDurationSec?: number;

  /** Średnie tętno (wymagane gdy isCompleted=true) */
  avgHrBpm?: number;

  /** Data i czas ukończenia (wymagane gdy isCompleted=true) */
  completedAt?: Date;

  /** Ocena treningu (opcjonalna) */
  rating?: "too_easy" | "just_right" | "too_hard";
}
