import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { WorkoutViewModel } from "../hooks/useWorkoutDetail";

interface WorkoutMetricsProps {
  workout: WorkoutViewModel;
}

/**
 * Komponent prezentujący kluczowe metryki treningu
 * Porównuje wartości planowane z rzeczywistymi (jeśli dostępne)
 */
export function WorkoutMetrics({ workout }: WorkoutMetricsProps) {
  const isCompleted = workout.status === "completed";

  // Mapowanie statusów na polskie etykiety
  const statusLabels: Record<string, string> = {
    planned: "Zaplanowany",
    completed: "Ukończony",
    skipped: "Pominięty",
    canceled: "Anulowany",
  };

  // Mapowanie ocen na polskie etykiety
  const ratingLabels: Record<string, string> = {
    too_easy: "Za łatwy",
    just_right: "W sam raz",
    too_hard: "Za trudny",
  };

  // Kolory dla statusów
  const statusColors: Record<string, string> = {
    planned: "text-blue-600 bg-blue-50",
    completed: "text-green-600 bg-green-50",
    skipped: "text-gray-600 bg-gray-50",
    canceled: "text-red-600 bg-red-50",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Metryki treningu</CardTitle>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[workout.status]}`}>
            {statusLabels[workout.status] || workout.status}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Sekcja: Informacje podstawowe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Data planowana</p>
              <p className="text-lg font-semibold">{workout.plannedDateFormatted}</p>
            </div>
            {workout.completedAtFormatted && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Data ukończenia</p>
                <p className="text-lg font-semibold">{workout.completedAtFormatted}</p>
              </div>
            )}
          </div>

          {/* Sekcja: Plan vs Realizacja */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kolumna: Plan */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-900 mb-3">Plan</h3>

                <div>
                  <p className="text-sm text-gray-500">Dystans</p>
                  <p className="text-xl font-bold text-blue-600">{workout.plannedDistanceFormatted}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Czas</p>
                  <p className="text-xl font-bold text-blue-600">{workout.plannedDurationFormatted}</p>
                </div>
              </div>

              {/* Kolumna: Realizacja (tylko dla ukończonych) */}
              {isCompleted && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">Realizacja</h3>

                  <div>
                    <p className="text-sm text-gray-500">Dystans</p>
                    <p className="text-xl font-bold text-green-600">{workout.distanceFormatted || "-"}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Czas</p>
                    <p className="text-xl font-bold text-green-600">{workout.durationFormatted || "-"}</p>
                  </div>

                  {workout.avgPaceFormatted && (
                    <div>
                      <p className="text-sm text-gray-500">Średnie tempo</p>
                      <p className="text-xl font-bold text-green-600">{workout.avgPaceFormatted}</p>
                    </div>
                  )}

                  {workout.avgHr && (
                    <div>
                      <p className="text-sm text-gray-500">Średnie tętno</p>
                      <p className="text-xl font-bold text-green-600">{workout.avgHr} bpm</p>
                    </div>
                  )}

                  {workout.rating && (
                    <div>
                      <p className="text-sm text-gray-500">Ocena</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {ratingLabels[workout.rating] || workout.rating}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sekcja: Pochodzenie treningu */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-500">
              Źródło:{" "}
              <span className="font-medium text-gray-900">
                {workout.origin === "ai" && "Sugestia AI"}
                {workout.origin === "manual" && "Ręczne"}
                {workout.origin === "import" && "Import"}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
