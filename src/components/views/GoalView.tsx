import { LoadingSpinner } from "../common/LoadingSpinner";
import { ErrorMessage } from "../common/ErrorMessage";
import { GoalForm } from "../features/goal/GoalForm";
import { Toaster } from "../ui/sonner";
import { useUserGoal } from "../../lib/hooks/useUserGoal";

/**
 * Główny widok zarządzania celem użytkownika
 * Obsługuje pobieranie, zapisywanie i usuwanie celu treningowego
 */
export function GoalView() {
  const { goal, isLoading, error, saveGoal, deleteGoal, isSubmitting, refetch } = useUserGoal();

  // Stan ładowania - wyświetl spinner
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Stan błędu - wyświetl komunikat z możliwością ponowienia
  if (error) {
    return <ErrorMessage message="Nie udało się wczytać celu. Spróbuj odświeżyć stronę." onRetry={refetch} />;
  }

  // Stan sukcesu - wyświetl formularz
  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <GoalForm initialGoal={goal} isSubmitting={isSubmitting} onSave={saveGoal} onDelete={deleteGoal} />
        </div>
      </div>
    </>
  );
}
