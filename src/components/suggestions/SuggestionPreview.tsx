import { Badge } from "@/components/ui/badge";
import { SuggestionMeta } from "./SuggestionMeta";
import { SuggestionSteps } from "./SuggestionSteps";
import type { AISuggestionViewModel } from "../../types/suggestions";

interface SuggestionPreviewProps {
  suggestion: AISuggestionViewModel;
  trainingTypeName?: string;
}

/**
 * Podgląd wygenerowanej sugestii AI
 * Wyświetla metadane, kroki i status sugestii
 */
export function SuggestionPreview({ suggestion, trainingTypeName }: SuggestionPreviewProps) {
  // Mapowanie statusu na badge
  const getStatusBadge = () => {
    const statusConfig = {
      shown: { label: "Do akceptacji", variant: "outline" as const },
      accepted: { label: "Zaakceptowana", variant: "default" as const },
      rejected: { label: "Odrzucona", variant: "secondary" as const },
      expired: { label: "Wygasła", variant: "destructive" as const },
    };

    const config = statusConfig[suggestion.status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Status sugestii */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Sugestia od AI</h3>
        {getStatusBadge()}
      </div>

      {/* Metadane */}
      <SuggestionMeta suggestion={suggestion} trainingTypeName={trainingTypeName} />

      {/* Kroki */}
      <SuggestionSteps steps={suggestion.steps} />

      {/* Informacja o wygaśnięciu */}
      {suggestion.isExpired && (
        <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
          <p className="font-medium">Uwaga: Ta sugestia wygasła</p>
          <p className="mt-1 text-xs">
            Sugestie są ważne przez 24 godziny od wygenerowania. Możesz wygenerować nową sugestię poniżej.
          </p>
        </div>
      )}
    </div>
  );
}
