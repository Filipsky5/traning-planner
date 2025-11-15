/**
 * Helpery do mapowania typów formularza na typy API
 *
 * Konwertują jednostki UI-friendly (km, Date) na formaty API (m, ISO string)
 */

import type { ManualWorkoutStepForm, ManualWorkoutFormValues } from "../../types/workoutForms";
import type { WorkoutStepDto } from "../../types";
import type { CreateWorkoutInput } from "../validation/workouts";

/**
 * Formatuje Date do formatu YYYY-MM-DD
 */
function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Mapuje pojedynczy krok z formularza na DTO API
 *
 * - Konwertuje km -> metry
 * - Konwertuje minuty+sekundy -> łączne sekundy
 * - Dodaje targetHrBpm do notes jeśli podane
 */
export function mapStepFormToDto(step: ManualWorkoutStepForm): WorkoutStepDto {
  const dto: WorkoutStepDto = {
    part: step.part,
  };

  // Dystans: km -> metry (zaokrąglone do int)
  if (step.distanceKm !== undefined && step.distanceKm > 0) {
    dto.distance_m = Math.round(step.distanceKm * 1000);
  }

  // Czas: minuty + sekundy -> łączne sekundy
  const minutes = step.durationMinutes ?? 0;
  const seconds = step.durationSeconds ?? 0;
  const totalSeconds = minutes * 60 + seconds;

  if (totalSeconds > 0) {
    dto.duration_s = totalSeconds;
  }

  // Notes: połącz targetHrBpm + notes użytkownika
  const notesParts: string[] = [];

  if (step.targetHrBpm !== undefined && step.targetHrBpm > 0) {
    notesParts.push(`HR: ${step.targetHrBpm} bpm`);
  }

  if (step.notes && step.notes.trim().length > 0) {
    notesParts.push(step.notes.trim());
  }

  if (notesParts.length > 0) {
    dto.notes = notesParts.join("; ");
  }

  return dto;
}

/**
 * Mapuje wartości formularza na input dla API POST /api/v1/workouts
 *
 * - Konwertuje wszystkie jednostki UI -> API
 * - Obsługuje zarówno planned jak i completed workouts
 * - Waliduje wymagane pola w zależności od isCompleted
 */
export function mapFormValuesToCreateWorkoutInput(
  values: ManualWorkoutFormValues
): CreateWorkoutInput {
  // Podstawowe pola (zawsze wymagane)
  const input: CreateWorkoutInput = {
    training_type_code: values.trainingTypeCode,
    planned_date: formatDateToYYYYMMDD(values.plannedDate),
    position: values.position,
    planned_distance_m: Math.round(values.totalPlannedDistanceKm * 1000),
    planned_duration_s: values.totalPlannedDurationSec,
    steps: values.steps.map(mapStepFormToDto),
  };

  // Jeśli trening jest już ukończony, dodaj pola realizacji
  if (values.isCompleted) {
    input.status = "completed";
    input.distance_m = values.realizedDistanceKm
      ? Math.round(values.realizedDistanceKm * 1000)
      : undefined;
    input.duration_s = values.realizedDurationSec;
    input.avg_hr_bpm = values.avgHrBpm;
    input.completed_at = values.completedAt?.toISOString();
    input.rating = values.rating;
  }

  return input;
}

/**
 * Oblicza łączny dystans (w km) ze wszystkich kroków
 */
export function calculateTotalDistanceKm(steps: ManualWorkoutStepForm[]): number {
  return steps.reduce((sum, step) => {
    return sum + (step.distanceKm ?? 0);
  }, 0);
}

/**
 * Oblicza łączny czas (w sekundach) ze wszystkich kroków
 */
export function calculateTotalDurationSec(steps: ManualWorkoutStepForm[]): number {
  return steps.reduce((sum, step) => {
    const minutes = step.durationMinutes ?? 0;
    const seconds = step.durationSeconds ?? 0;
    return sum + (minutes * 60 + seconds);
  }, 0);
}

/**
 * Formatuje sekundy do formatu hh:mm:ss lub mm:ss
 */
export function formatDurationDisplay(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
