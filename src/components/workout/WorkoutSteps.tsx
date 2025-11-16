import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface WorkoutStep {
  part: "warmup" | "main" | "cooldown" | "segment";
  distance_m?: number;
  duration_s?: number;
  notes?: string;
}

interface WorkoutStepsProps {
  steps: WorkoutStep[];
}

/**
 * Komponent wyświetlający listę kroków treningu
 * (rozgrzewka, część główna, schłodzenie)
 */
export function WorkoutSteps({ steps }: WorkoutStepsProps) {
  // Mapowanie nazw części na polskie etykiety
  const partLabels: Record<string, string> = {
    warmup: "Rozgrzewka",
    main: "Część główna",
    cooldown: "Schłodzenie",
    segment: "Segment",
  };

  // Kolory dla różnych części treningu
  const partColors: Record<string, string> = {
    warmup: "bg-yellow-50 border-yellow-200",
    main: "bg-blue-50 border-blue-200",
    cooldown: "bg-green-50 border-green-200",
    segment: "bg-gray-50 border-gray-200",
  };

  // Ikony dla różnych części (emoji jako placeholder)
  const partIcons: Record<string, string> = {
    warmup: "🔥",
    main: "💪",
    cooldown: "❄️",
    segment: "📍",
  };

  /**
   * Formatuje czas w sekundach na czytelny format
   */
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes < 60) {
      return secs > 0 ? `${minutes} min ${secs}s` : `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins > 0) {
      return `${hours}h ${mins} min`;
    }

    return `${hours}h`;
  };

  /**
   * Formatuje dystans w metrach na km
   */
  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${meters} m`;
    }

    return `${(meters / 1000).toFixed(2)} km`;
  };

  if (steps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Kroki treningu</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">Brak zdefiniowanych kroków treningu</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kroki treningu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className={`p-4 rounded-lg border-2 ${partColors[step.part] || partColors.segment}`}>
              <div className="flex items-start gap-3">
                {/* Ikona i numer */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl border-2 border-current">
                    {partIcons[step.part] || partIcons.segment}
                  </div>
                </div>

                {/* Treść */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {index + 1}. {partLabels[step.part] || step.part}
                    </h4>
                  </div>

                  {/* Metryki */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {step.distance_m !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Dystans:</span>
                        <span className="font-medium text-gray-900">{formatDistance(step.distance_m)}</span>
                      </div>
                    )}

                    {step.duration_s !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Czas:</span>
                        <span className="font-medium text-gray-900">{formatDuration(step.duration_s)}</span>
                      </div>
                    )}
                  </div>

                  {/* Notatki */}
                  {step.notes && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-500">Notatki: </span>
                      <span className="text-gray-700">{step.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Podsumowanie */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Liczba kroków:</span>
            <span className="font-semibold">{steps.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
