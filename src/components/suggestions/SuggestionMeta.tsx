import { Card } from "@/components/ui/card";
import type { AISuggestionViewModel } from "../../types/suggestions";
import { formatSuggestionMeta } from "../../types/suggestions";

interface SuggestionMetaProps {
  suggestion: AISuggestionViewModel;
  trainingTypeName?: string;
}

/**
 * Wyświetla metadane sugestii: typ treningu, łączny czas i dystans
 */
export function SuggestionMeta({ suggestion, trainingTypeName }: SuggestionMetaProps) {
  const meta = formatSuggestionMeta(suggestion);

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Typ treningu */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Typ treningu</p>
          <p className="text-lg font-semibold text-gray-900">{trainingTypeName || suggestion.trainingTypeCode}</p>
        </div>

        {/* Łączny czas i dystans */}
        <div className="grid grid-cols-2 gap-4">
          {/* Czas */}
          {suggestion.totalDurationSec > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Czas</p>
              <p className="text-base font-medium text-gray-900">{meta.duration}</p>
            </div>
          )}

          {/* Dystans */}
          {suggestion.totalDistanceMeters > 0 && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Dystans</p>
              <p className="text-base font-medium text-gray-900">{meta.distance}</p>
            </div>
          )}
        </div>

        {/* Data planowana */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Data</p>
          <p className="text-sm text-gray-700">
            {suggestion.plannedDate.toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>
    </Card>
  );
}
