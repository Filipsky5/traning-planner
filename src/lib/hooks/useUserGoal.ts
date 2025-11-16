import { useState, useEffect, useCallback } from "react";
import type { UserGoalDto, UserGoalUpsertCommand, ApiResponse } from "../../types";

/**
 * Custom hook do zarządzania celem użytkownika
 * Obsługuje pobieranie, zapisywanie i usuwanie celu treningowego
 */
export function useUserGoal() {
  // Stan celu:
  // - undefined = ładowanie początkowe
  // - null = brak celu
  // - UserGoalDto = cel istnieje
  const [goal, setGoal] = useState<UserGoalDto | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Funkcja do pobierania celu z API
  const fetchGoal = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/user-goal");

      if (!response.ok) {
        // 404 oznacza brak celu - to nie jest błąd
        if (response.status === 404) {
          setGoal(null);
          setIsLoading(false);
          return;
        }

        throw new Error(`Failed to fetch goal: ${response.status}`);
      }

      const data: ApiResponse<UserGoalDto | null> = await response.json();
      setGoal(data.data);
    } catch (err) {
      console.error("Error fetching goal:", err);

      // Obsługa błędów sieciowych
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        setError(new Error("Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie."));
      } else {
        setError(err as Error);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pobierz cel przy pierwszym renderowaniu
  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  // Funkcja do zapisywania celu (PUT)
  const saveGoal = useCallback(async (data: UserGoalUpsertCommand): Promise<void> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/user-goal", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to save goal: ${response.status}`);
      }

      const result: ApiResponse<UserGoalDto> = await response.json();
      setGoal(result.data);
    } catch (err) {
      console.error("Error saving goal:", err);

      // Obsługa błędów sieciowych
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        throw new Error("Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.");
      }

      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Funkcja do usuwania celu (DELETE)
  const deleteGoal = useCallback(async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/user-goal", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Failed to delete goal: ${response.status}`);
      }

      // 204 No Content - cel został usunięty
      setGoal(null);
    } catch (err) {
      console.error("Error deleting goal:", err);

      // Obsługa błędów sieciowych
      if (err instanceof TypeError && err.message === "Failed to fetch") {
        throw new Error("Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie.");
      }

      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  // Funkcja do ponownego pobrania danych
  const refetch = useCallback(() => {
    fetchGoal();
  }, [fetchGoal]);

  return {
    goal,
    isLoading,
    isSubmitting,
    error,
    saveGoal,
    deleteGoal,
    refetch,
  };
}
