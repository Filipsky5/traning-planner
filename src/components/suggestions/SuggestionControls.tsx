import { Button } from "@/components/ui/button";

interface SuggestionControlsProps {
  onAccept: () => void;
  onRegenerate: () => void;
  regenerationCount: number;
  isAccepting: boolean;
  isRegenerating: boolean;
}

const MAX_REGENERATIONS = 3;

/**
 * Kontrolki akcji dla sugestii AI
 * Pozwala zaakceptować lub wygenerować nową sugestię (z limitem 3 regeneracji)
 */
export function SuggestionControls({
  onAccept,
  onRegenerate,
  regenerationCount,
  isAccepting,
  isRegenerating,
}: SuggestionControlsProps) {
  const canRegenerate = regenerationCount < MAX_REGENERATIONS;
  const remainingRegenerations = MAX_REGENERATIONS - regenerationCount;

  return (
    <div className="space-y-4">
      {/* Przycisk akceptacji */}
      <Button onClick={onAccept} disabled={isAccepting || isRegenerating} className="w-full">
        {isAccepting ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Akceptowanie...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-4 w-4"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Zaakceptuj sugestię
          </>
        )}
      </Button>

      {/* Przycisk regeneracji */}
      <Button
        onClick={onRegenerate}
        disabled={!canRegenerate || isAccepting || isRegenerating}
        variant="outline"
        className="w-full"
      >
        {isRegenerating ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent"></div>
            Generowanie...
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2 h-4 w-4"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            Odrzuć i wygeneruj nową
          </>
        )}
      </Button>

      {/* Licznik regeneracji */}
      <div className="rounded-md bg-gray-50 p-3">
        <p className="text-center text-sm text-gray-600">
          {canRegenerate ? (
            <>
              Pozostałe regeneracje:{" "}
              <span className="font-semibold text-gray-900">
                {remainingRegenerations}/{MAX_REGENERATIONS}
              </span>
            </>
          ) : (
            <span className="font-medium text-red-600">
              Osiągnięto limit regeneracji ({MAX_REGENERATIONS}/{MAX_REGENERATIONS})
            </span>
          )}
        </p>
        {canRegenerate && (
          <p className="mt-1 text-center text-xs text-gray-500">
            Możesz wygenerować nową sugestię maksymalnie {remainingRegenerations}{" "}
            {remainingRegenerations === 1 ? "raz" : "razy"}
          </p>
        )}
      </div>
    </div>
  );
}
