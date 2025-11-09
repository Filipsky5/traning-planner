import { useState, useEffect, useCallback } from "react";
import type { WorkoutSummaryDto, ApiListResponse } from "../../types";

/**
 * Custom hook do zarządzania treningami dla wybranego dnia
 * Pobiera dane z API i zarządza stanami ładowania i błędów
 */
export function useDayWorkouts(date: string | null) {
  const [workouts, setWorkouts] = useState<WorkoutSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Funkcja do pobierania danych z API
  const fetchWorkouts = useCallback(async (dateString: string) => {
    // Walidacja formatu daty (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      console.error("Invalid date format:", dateString);
      setError(new Error("Nieprawidłowy format daty"));
      setWorkouts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Buduj URL z parametrami query
      const params = new URLSearchParams({
        planned_date_gte: dateString,
        planned_date_lte: dateString,
        per_page: "50", // Pobierz wszystkie treningi z dnia
      });

      const url = `/api/v1/workouts?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch workouts: ${response.status}`);
      }

      const data: ApiListResponse<WorkoutSummaryDto> = await response.json();

      // Sortuj treningi po pozycji
      const sortedWorkouts = data.data.sort((a, b) => a.position - b.position);
      setWorkouts(sortedWorkouts);
    } catch (err) {
      console.error("Error fetching workouts:", err);
      // Obsługa błędów sieciowych
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError(new Error("Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie."));
      } else {
        setError(err as Error);
      }
      setWorkouts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pobierz dane gdy zmieni się data
  useEffect(() => {
    if (date) {
      fetchWorkouts(date);
    } else {
      // Zresetuj stan gdy nie ma wybranej daty
      setWorkouts([]);
      setError(null);
    }
  }, [date, fetchWorkouts]);

  // Funkcja do odświeżania danych (np. po wykonaniu akcji)
  const refetch = useCallback(() => {
    if (date) {
      fetchWorkouts(date);
    }
  }, [date, fetchWorkouts]);

  // Optymistyczna aktualizacja UI - usuń trening z listy
  const removeWorkout = useCallback((workoutId: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
  }, []);

  // Optymistyczna aktualizacja UI - zaktualizuj status treningu
  const updateWorkoutStatus = useCallback(
    (workoutId: string, status: WorkoutSummaryDto["status"]) => {
      setWorkouts((prev) =>
        prev.map((w) => (w.id === workoutId ? { ...w, status } : w))
      );
    },
    []
  );

  return {
    workouts,
    isLoading,
    error,
    refetch,
    removeWorkout,
    updateWorkoutStatus,
  };
}
