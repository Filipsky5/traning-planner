import { useWorkoutDetail } from "../hooks/useWorkoutDetail";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Toaster } from "../ui/sonner";
import { WorkoutMetrics } from "../workout/WorkoutMetrics";
import { WorkoutSteps } from "../workout/WorkoutSteps";
import { WorkoutActions } from "../workout/WorkoutActions";

interface WorkoutDetailViewProps {
  workoutId: string;
}

/**
 * Główny widok szczegółów treningu
 * Zarządza stanem ładowania i błędów oraz renderuje komponenty podrzędne
 */
export function WorkoutDetailView({ workoutId }: WorkoutDetailViewProps) {
  const { workout, isLoading, error, completeWorkout, rateWorkout, skipWorkout, cancelWorkout, refetch } =
    useWorkoutDetail(workoutId);

  // Stan ładowania
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-6">
          {/* Skeleton dla metryk */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>

          {/* Skeleton dla kroków */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>

          {/* Skeleton dla akcji */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  // Stan błędu
  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-red-600">Wystąpił błąd</h2>
              <p className="text-gray-600">{error.message}</p>
              <div className="flex gap-4 justify-center">
                <Button onClick={refetch} variant="outline">
                  Spróbuj ponownie
                </Button>
                <Button onClick={() => window.history.back()} variant="ghost">
                  Powrót
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Brak danych
  if (!workout) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold">Nie znaleziono treningu</h2>
              <Button onClick={() => window.history.back()}>Powrót</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Główny widok
  return (
    <>
      <Toaster />
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="space-y-6">
          {/* Nagłówek */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Szczegóły treningu</h1>
            <Button variant="ghost" onClick={() => window.history.back()}>
              ← Powrót
            </Button>
          </div>

          {/* Metryki treningu */}
          <WorkoutMetrics workout={workout} />

          {/* Kroki treningu */}
          <WorkoutSteps steps={workout.steps} />

          {/* Akcje */}
          <WorkoutActions
            workout={workout}
            onComplete={completeWorkout}
            onRate={rateWorkout}
            onSkip={skipWorkout}
            onCancel={cancelWorkout}
          />
        </div>
      </div>
    </>
  );
}
