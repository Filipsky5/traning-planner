import type { WorkoutSummaryDto } from "../../types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickActions } from "./QuickActions";
import { getColorForTrainingType, formatDistance, formatDuration } from "../../lib/utils/workout";

interface WorkoutItemProps {
  workout: WorkoutSummaryDto;
  trainingTypeName?: string; // Opcjonalna nazwa typu treningu z API
  onSkip?: (workoutId: string) => void;
  onCancel?: (workoutId: string) => void;
}

/**
 * Kompaktowa karta pojedynczego treningu
 * Wyświetla typ treningu, planowane parametry, status i Quick Actions
 */
export function WorkoutItem({ workout, trainingTypeName, onSkip, onCancel }: WorkoutItemProps) {
  // Mapowanie statusu na czytelną nazwę i wariant Badge
  const statusConfig = {
    planned: { label: "Zaplanowany", variant: "outline" as const },
    completed: { label: "Ukończony", variant: "default" as const },
    skipped: { label: "Pominięty", variant: "secondary" as const },
    canceled: { label: "Anulowany", variant: "destructive" as const },
  };

  const status = statusConfig[workout.status as keyof typeof statusConfig] || statusConfig.planned;

  // Kolor dla typu treningu
  const color = getColorForTrainingType(workout.training_type_code);

  // Formatowanie dystansu i czasu
  const distance = formatDistance(workout.planned_distance_m);
  const duration = formatDuration(workout.planned_duration_s);

  // Sprawdź czy trening pochodzi z AI
  const isAiGenerated = workout.origin === "ai";

  // Złóż opis (dystans i/lub czas)
  const details = [distance, duration].filter(Boolean).join(" • ");

  return (
    <Card className="p-3 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
      <div className="space-y-2">
        {/* Nagłówek z paskiem koloru */}
        <div className="flex items-start gap-2">
          {/* Pasek koloru typu treningu */}
          <div className={`w-1 ${color} rounded flex-shrink-0 self-stretch`} />

          {/* Treść */}
          <div className="flex-1 min-w-0">
            {/* Nazwa typu treningu i pozycja */}
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-sm text-gray-900">
                {trainingTypeName || workout.training_type_code}
                <span className="ml-2 text-xs text-gray-500">#{workout.position}</span>
              </div>
            </div>

            {/* Planowane parametry */}
            {details && <p className="text-xs text-gray-600 mt-1">{details}</p>}

            {/* Odznaki (Status, AI, Rating) */}
            <div className="flex gap-1 flex-wrap mt-2">
              {/* Status */}
              <Badge variant={status.variant} className="text-xs py-0 h-5">
                {status.label}
              </Badge>

              {/* Odznaka AI */}
              {isAiGenerated && (
                <Badge variant="outline" className="text-xs py-0 h-5 border-purple-300 text-purple-700">
                  AI
                </Badge>
              )}

              {/* Rating (opcjonalnie) */}
              {workout.rating && (
                <Badge variant="secondary" className="text-xs py-0 h-5">
                  {workout.rating === "too_easy"
                    ? "Za łatwy"
                    : workout.rating === "just_right"
                      ? "W sam raz"
                      : "Za trudny"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions workoutId={workout.id} status={workout.status} onSkip={onSkip} onCancel={onCancel} />
      </div>
    </Card>
  );
}
