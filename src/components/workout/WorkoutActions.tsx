import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CompleteWorkoutDialog } from "./CompleteWorkoutDialog";
import { RateWorkoutDialog } from "./RateWorkoutDialog";
import type { WorkoutViewModel } from "../hooks/useWorkoutDetail";
import type { WorkoutCompleteCommand, WorkoutRateCommand } from "../../types";

interface WorkoutActionsProps {
  workout: WorkoutViewModel;
  onComplete: (data: WorkoutCompleteCommand) => Promise<void>;
  onRate: (data: WorkoutRateCommand) => Promise<void>;
  onSkip: () => Promise<void>;
  onCancel: () => Promise<void>;
}

/**
 * Panel z przyciskami akcji treningu
 * Przyciski są renderowane warunkowo w zależności od statusu treningu
 */
export function WorkoutActions({ workout, onComplete, onRate, onSkip, onCancel }: WorkoutActionsProps) {
  // State dla dialogów
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);

  /**
   * Obsługa ukończenia treningu
   */
  const handleComplete = async (data: WorkoutCompleteCommand) => {
    try {
      await onComplete(data);
      toast.success("Trening został ukończony!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się ukończyć treningu");
      throw error; // Re-throw aby dialog wiedział o błędzie
    }
  };

  /**
   * Obsługa oceny treningu
   */
  const handleRate = async (data: WorkoutRateCommand) => {
    try {
      await onRate(data);
      toast.success("Ocena została zapisana!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać oceny");
      throw error; // Re-throw aby dialog wiedział o błędzie
    }
  };

  /**
   * Obsługa pominięcia treningu
   */
  const handleSkip = async () => {
    if (!confirm("Czy na pewno chcesz pominąć ten trening?")) {
      return;
    }

    try {
      await onSkip();
      toast.success("Trening został pominięty");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się pominąć treningu");
    }
  };

  /**
   * Obsługa anulowania treningu
   */
  const handleCancel = async () => {
    if (!confirm("Czy na pewno chcesz anulować ten trening?")) {
      return;
    }

    try {
      await onCancel();
      toast.success("Trening został anulowany");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się anulować treningu");
    }
  };

  // Sprawdź czy są dostępne jakiekolwiek akcje
  const hasAnyAction = workout.canBeCompleted || workout.canBeRated || workout.canBeSkipped || workout.canBeCanceled;

  if (!hasAnyAction) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Brak dostępnych akcji dla tego treningu</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Akcje</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {/* Przycisk: Ukończ (tylko dla statusu 'planned') */}
          {workout.canBeCompleted && (
            <Button onClick={() => setIsCompleteDialogOpen(true)} size="lg" className="flex-1 min-w-[150px]">
              ✓ Ukończ trening
            </Button>
          )}

          {/* Przycisk: Oceń (tylko dla statusu 'completed') */}
          {workout.canBeRated && (
            <Button
              onClick={() => setIsRateDialogOpen(true)}
              size="lg"
              variant="default"
              className="flex-1 min-w-[150px]"
            >
              ⭐ Oceń trening
            </Button>
          )}

          {/* Przycisk: Pomiń (tylko dla statusu 'planned') */}
          {workout.canBeSkipped && (
            <Button onClick={handleSkip} size="lg" variant="outline" className="flex-1 min-w-[150px]">
              ⏩ Pomiń
            </Button>
          )}

          {/* Przycisk: Anuluj (tylko dla statusu 'planned') */}
          {workout.canBeCanceled && (
            <Button onClick={handleCancel} size="lg" variant="destructive" className="flex-1 min-w-[150px]">
              ✕ Anuluj
            </Button>
          )}
        </div>

        {/* Dialogi */}
        <CompleteWorkoutDialog
          open={isCompleteDialogOpen}
          onOpenChange={setIsCompleteDialogOpen}
          onSubmit={handleComplete}
        />

        <RateWorkoutDialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen} onSubmit={handleRate} />

        {/* Informacja pomocnicza */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            {workout.canBeCompleted && <span>💡 Ukończ trening, aby zapisać swoje wyniki i metryki.</span>}
            {workout.canBeRated && <span>💡 Oceń trening, aby pomóc AI w lepszym dostosowaniu przyszłych planów.</span>}
            {workout.canBeSkipped && !workout.canBeCompleted && (
              <span>💡 Pomiń trening, jeśli nie możesz go wykonać.</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
