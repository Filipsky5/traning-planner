import { useState, useEffect, useCallback } from 'react';
import type { WorkoutDetailDto, WorkoutCompleteCommand, WorkoutRateCommand, ApiResponse } from '../../types';

/**
 * ViewModel treningu z polami sformatowanymi do wyświetlania
 */
export interface WorkoutViewModel {
  id: string;
  status: 'planned' | 'completed' | 'skipped' | 'canceled';
  origin: 'manual' | 'ai' | 'import';
  rating: 'too_easy' | 'just_right' | 'too_hard' | null;
  trainingTypeCode: string;

  // Pola sformatowane do wyświetlania
  plannedDateFormatted: string; // "DD.MM.YYYY"
  completedAtFormatted: string | null; // "DD.MM.YYYY HH:mm"
  plannedDistanceFormatted: string; // "X.XX km"
  distanceFormatted: string | null; // "X.XX km"
  plannedDurationFormatted: string; // "HH:mm:ss"
  durationFormatted: string | null; // "HH:mm:ss"
  avgPaceFormatted: string | null; // "X:XX min/km"
  avgHr: number | null;

  // Kroki treningu
  steps: Array<{
    part: 'warmup' | 'main' | 'cooldown' | 'segment';
    distance_m?: number;
    duration_s?: number;
    notes?: string;
  }>;

  // Flagi do logiki warunkowej
  canBeCompleted: boolean;
  canBeRated: boolean;
  canBeSkipped: boolean;
  canBeCanceled: boolean;
}

interface UseWorkoutDetailReturn {
  workout: WorkoutViewModel | null;
  isLoading: boolean;
  error: Error | null;
  completeWorkout: (data: WorkoutCompleteCommand) => Promise<void>;
  rateWorkout: (data: WorkoutRateCommand) => Promise<void>;
  skipWorkout: () => Promise<void>;
  cancelWorkout: () => Promise<void>;
  refetch: () => void;
}

/**
 * Hook zarządzający szczegółami treningu i akcjami na nim
 */
export function useWorkoutDetail(workoutId: string): UseWorkoutDetailReturn {
  const [workout, setWorkout] = useState<WorkoutViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Formatuje sekundy na format HH:mm:ss
   */
  const formatDuration = (seconds: number | null | undefined): string | null => {
    if (seconds === null || seconds === undefined) return null;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Formatuje metry na kilometry
   */
  const formatDistance = (meters: number | null | undefined): string | null => {
    if (meters === null || meters === undefined) return null;
    return `${(meters / 1000).toFixed(2)} km`;
  };

  /**
   * Formatuje tempo (sekundy na km) na format mm:ss min/km
   */
  const formatPace = (secondsPerKm: number | null | undefined): string | null => {
    if (secondsPerKm === null || secondsPerKm === undefined) return null;

    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
  };

  /**
   * Formatuje datę na format DD.MM.YYYY
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  /**
   * Formatuje datę i czas na format DD.MM.YYYY HH:mm
   */
  const formatDateTime = (dateString: string | null | undefined): string | null => {
    if (!dateString) return null;

    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  /**
   * Transformuje DTO z API na ViewModel
   */
  const transformToViewModel = useCallback((dto: WorkoutDetailDto): WorkoutViewModel => {
    const isPlanned = dto.status === 'planned';
    const isCompleted = dto.status === 'completed';

    return {
      id: dto.id,
      status: dto.status,
      origin: dto.origin,
      rating: dto.rating,
      trainingTypeCode: dto.training_type_code,

      plannedDateFormatted: formatDate(dto.planned_date),
      completedAtFormatted: formatDateTime(dto.completed_at),
      plannedDistanceFormatted: formatDistance(dto.planned_distance_m) ?? '-',
      distanceFormatted: formatDistance(dto.distance_m),
      plannedDurationFormatted: formatDuration(dto.planned_duration_s) ?? '-',
      durationFormatted: formatDuration(dto.duration_s),
      avgPaceFormatted: formatPace(dto.avg_pace_s_per_km),
      avgHr: dto.avg_hr_bpm ?? null,

      steps: dto.steps,

      canBeCompleted: isPlanned,
      canBeRated: isCompleted,
      canBeSkipped: isPlanned,
      canBeCanceled: isPlanned,
    };
  }, []);

  /**
   * Pobiera dane treningu z API
   */
  const fetchWorkout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/workouts/${workoutId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Nie znaleziono treningu');
        }
        throw new Error(`Błąd pobierania danych: ${response.status}`);
      }

      const result: ApiResponse<WorkoutDetailDto> = await response.json();
      const viewModel = transformToViewModel(result.data);
      setWorkout(viewModel);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Nieznany błąd'));
    } finally {
      setIsLoading(false);
    }
  }, [workoutId, transformToViewModel]);

  /**
   * Odświeża dane treningu
   */
  const refetch = useCallback(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  /**
   * Ukończ trening
   */
  const completeWorkout = useCallback(async (data: WorkoutCompleteCommand) => {
    try {
      const response = await fetch(`/api/v1/workouts/${workoutId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `Błąd: ${response.status}`);
      }

      await refetch();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Nie udało się ukończyć treningu');
    }
  }, [workoutId, refetch]);

  /**
   * Oceń trening
   */
  const rateWorkout = useCallback(async (data: WorkoutRateCommand) => {
    try {
      const response = await fetch(`/api/v1/workouts/${workoutId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `Błąd: ${response.status}`);
      }

      await refetch();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Nie udało się ocenić treningu');
    }
  }, [workoutId, refetch]);

  /**
   * Pomiń trening
   */
  const skipWorkout = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/workouts/${workoutId}/skip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `Błąd: ${response.status}`);
      }

      await refetch();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Nie udało się pominąć treningu');
    }
  }, [workoutId, refetch]);

  /**
   * Anuluj trening
   */
  const cancelWorkout = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/workouts/${workoutId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || `Błąd: ${response.status}`);
      }

      await refetch();
    } catch (err) {
      throw err instanceof Error ? err : new Error('Nie udało się anulować treningu');
    }
  }, [workoutId, refetch]);

  // Pobierz dane przy montowaniu komponentu
  useEffect(() => {
    fetchWorkout();
  }, [fetchWorkout]);

  return {
    workout,
    isLoading,
    error,
    completeWorkout,
    rateWorkout,
    skipWorkout,
    cancelWorkout,
    refetch,
  };
}
