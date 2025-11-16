import type { WorkoutViewModel } from "../../types/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WorkoutCardProps {
  workout: WorkoutViewModel;
  onWorkoutClick?: (workoutId: string) => void;
}

/**
 * Mała karta reprezentująca pojedynczy trening
 * Pokazuje typ treningu (za pomocą koloru i nazwy), status oraz odznakę AI
 */
export function WorkoutCard({ workout, onWorkoutClick }: WorkoutCardProps) {
  // Mapowanie statusu na czytelną nazwę i styl
  const statusConfig = {
    planned: { label: "", variant: "outline" as const },
    completed: { label: "Ukończony", variant: "default" as const },
    skipped: { label: "Pominięty", variant: "secondary" as const },
    cancelled: { label: "Anulowany", variant: "destructive" as const },
  };

  const status = statusConfig[workout.status as keyof typeof statusConfig] || statusConfig.planned;

  // Sprawdź czy trening pochodzi z AI (origin === 'ai')
  // TODO: dodać pole origin do WorkoutViewModel gdy będzie dostępne w API
  const isAiGenerated = false; // workout.origin === 'ai';

  return (
    <Card
      className="p-2 text-xs cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onWorkoutClick?.(workout.id);
      }}
    >
      <div className="flex items-start gap-2">
        {/* Pasek koloru typu treningu */}
        <div className={`w-1 ${workout.color} rounded flex-shrink-0 self-stretch`} />

        {/* Treść */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="font-medium truncate text-sm">{workout.trainingType.name}</div>

          {/* Odznaki */}
          <div className="flex gap-1 flex-wrap">
            {/* Status */}
            {status.label && (
              <Badge variant={status.variant} className="text-xs py-0 h-5">
                {status.label}
              </Badge>
            )}

            {/* Odznaka AI */}
            {isAiGenerated && (
              <Badge variant="outline" className="text-xs py-0 h-5 border-purple-300 text-purple-700">
                AI
              </Badge>
            )}
          </div>
        </div>

        {/* TODO: Dropdown menu z akcjami (Ukończ, Pomiń, etc.) */}
      </div>
    </Card>
  );
}
