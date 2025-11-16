import type { WorkoutSummaryDto, TrainingTypeDto } from "../../types";
import { WorkoutList } from "./WorkoutList";
import { Button } from "@/components/ui/button";

interface DayDrawerContentProps {
  date: string;
  workouts: WorkoutSummaryDto[];
  trainingTypes?: TrainingTypeDto[]; // Opcjonalna lista typów treningów
  isLoading: boolean;
  error: Error | null;
  onSkip?: (workoutId: string) => void;
  onCancel?: (workoutId: string) => void;
  onRetry?: () => void;
}

/**
 * Zawartość drawera - renderuje stan ładowania, błędu lub listę treningów
 * Wyświetla odpowiedni komunikat w zależności od stanu
 */
export function DayDrawerContent({
  date: _date,
  workouts,
  trainingTypes,
  isLoading,
  error,
  onSkip,
  onCancel,
  onRetry,
}: DayDrawerContentProps) {
  // Stan ładowania
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-sm text-gray-600">Ładowanie treningów...</p>
        </div>
      </div>
    );
  }

  // Stan błędu
  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-6">
        <div className="text-center space-y-3">
          {/* Ikona błędu */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Komunikat błędu */}
          <div>
            <p className="text-sm font-medium text-red-800">Nie udało się wczytać treningów</p>
            <p className="mt-1 text-xs text-red-700">{error.message || "Spróbuj ponownie później."}</p>
          </div>

          {/* Przycisk ponowienia */}
          {onRetry && (
            <Button onClick={onRetry} variant="outline" size="sm">
              Spróbuj ponownie
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Stan sukcesu - wyświetl listę treningów
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Informacja o dacie */}
      <div className="text-sm text-gray-600">
        {workouts.length === 0
          ? "Brak zaplanowanych treningów"
          : `${workouts.length} ${workouts.length === 1 ? "trening" : workouts.length < 5 ? "treningi" : "treningów"}`}
      </div>

      {/* Lista treningów */}
      <WorkoutList workouts={workouts} trainingTypes={trainingTypes} onSkip={onSkip} onCancel={onCancel} />
    </div>
  );
}
