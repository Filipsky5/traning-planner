/**
 * Klient API dla operacji na treningach
 * Obsługuje akcje: skip, cancel, complete
 */

/**
 * Klasa błędu API z dodatkowymi informacjami
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Sprawdza czy błąd to brak autoryzacji
   */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * Sprawdza czy błąd to nie znaleziono zasobu
   */
  isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Sprawdza czy błąd to błąd serwera
   */
  isServerError(): boolean {
    return this.status >= 500;
  }
}

/**
 * Pomija trening (zmienia status na 'skipped')
 * @param workoutId - ID treningu do pominięcia
 */
export async function skipWorkout(workoutId: string): Promise<void> {
  try {
    const response = await fetch(`/api/v1/workouts/${workoutId}/skip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || `Failed to skip workout: ${response.status}`,
        response.status,
        errorData.error?.code
      );
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Obsługa błędów sieciowych (offline, timeout, etc.)
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error("Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.");
    }
    throw new Error(`Unexpected error while skipping workout: ${err}`);
  }
}

/**
 * Anuluje trening (zmienia status na 'canceled')
 * @param workoutId - ID treningu do anulowania
 */
export async function cancelWorkout(workoutId: string): Promise<void> {
  try {
    const response = await fetch(`/api/v1/workouts/${workoutId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || `Failed to cancel workout: ${response.status}`,
        response.status,
        errorData.error?.code
      );
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Obsługa błędów sieciowych (offline, timeout, etc.)
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error("Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.");
    }
    throw new Error(`Unexpected error while canceling workout: ${err}`);
  }
}

/**
 * Oznacza trening jako ukończony (zmienia status na 'completed')
 * @param workoutId - ID treningu do oznaczenia jako ukończony
 */
export async function completeWorkout(workoutId: string): Promise<void> {
  try {
    const response = await fetch(`/api/v1/workouts/${workoutId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || `Failed to complete workout: ${response.status}`,
        response.status,
        errorData.error?.code
      );
    }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Obsługa błędów sieciowych (offline, timeout, etc.)
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error("Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.");
    }
    throw new Error(`Unexpected error while completing workout: ${err}`);
  }
}
