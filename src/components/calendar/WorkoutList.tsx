import type { WorkoutSummaryDto, TrainingTypeDto } from "../../types";
import { WorkoutItem } from "./WorkoutItem";

interface WorkoutListProps {
  workouts: WorkoutSummaryDto[];
  trainingTypes?: TrainingTypeDto[]; // Opcjonalna lista typów treningów
  onSkip?: (workoutId: string) => void;
  onCancel?: (workoutId: string) => void;
}

/**
 * Renderuje listę treningów dla wybranego dnia
 * Każdy trening to kompaktowa karta z Quick Actions
 */
export function WorkoutList({ workouts, trainingTypes, onSkip, onCancel }: WorkoutListProps) {
  if (workouts.length === 0) {
    return (
      <div className="rounded-md bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-600">Brak zaplanowanych treningów na ten dzień.</p>
      </div>
    );
  }

  // Helper do znajdowania nazwy typu treningu
  const getTrainingTypeName = (code: string): string | undefined => {
    return trainingTypes?.find((t) => t.code === code)?.name;
  };

  return (
    <div className="space-y-3">
      {workouts.map((workout) => (
        <WorkoutItem
          key={workout.id}
          workout={workout}
          trainingTypeName={getTrainingTypeName(workout.training_type_code)}
          onSkip={onSkip}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
