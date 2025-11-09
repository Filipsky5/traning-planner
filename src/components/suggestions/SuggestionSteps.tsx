import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SuggestionStepViewModel } from "../../types/suggestions";

interface SuggestionStepsProps {
  steps: SuggestionStepViewModel[];
}

/**
 * Wyświetla listę kroków treningu (rozgrzewka, część główna, schłodzenie)
 */
export function SuggestionSteps({ steps }: SuggestionStepsProps) {
  // Mapowanie części na kolory badge'a
  const getPartVariant = (
    part: "warmup" | "main" | "cooldown"
  ): "default" | "secondary" | "outline" => {
    const variants = {
      warmup: "secondary" as const,
      main: "default" as const,
      cooldown: "outline" as const,
    };
    return variants[part];
  };

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Plan treningu</h3>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-md border border-gray-200 bg-gray-50 p-3"
          >
            {/* Numer kroku */}
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
              {index + 1}
            </div>

            {/* Treść kroku */}
            <div className="flex-1 space-y-1">
              {/* Label i badge części */}
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900">{step.label}</p>
                <Badge variant={getPartVariant(step.part)} className="text-xs">
                  {step.part}
                </Badge>
              </div>

              {/* Szczegóły (czas/dystans) */}
              <p className="text-sm text-gray-600">{step.details}</p>

              {/* Opis (jeśli dostępny) */}
              {step.description && (
                <p className="text-xs text-gray-500 italic">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
