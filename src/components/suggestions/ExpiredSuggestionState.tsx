import { Button } from "@/components/ui/button";

interface ExpiredSuggestionStateProps {
  onGenerateNew: () => void;
  isGenerating: boolean;
}

/**
 * Stan wyświetlany gdy sugestia wygasła
 * Informuje użytkownika o wygaśnięciu i pozwala wygenerować nową sugestię
 */
export function ExpiredSuggestionState({
  onGenerateNew,
  isGenerating,
}: ExpiredSuggestionStateProps) {
  return (
    <div className="space-y-4">
      {/* Informacja o wygaśnięciu */}
      <div className="rounded-md bg-yellow-50 p-4 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6 text-yellow-600"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>
        <p className="text-base font-semibold text-yellow-900">
          Sugestia wygasła
        </p>
        <p className="mt-2 text-sm text-yellow-800">
          Ta sugestia jest już nieaktualna. Sugestie AI są ważne przez 24 godziny
          od wygenerowania.
        </p>
      </div>

      {/* Informacja dodatkowa */}
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Co dalej?</span>
        </p>
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Możesz wygenerować nową sugestię dla tego dnia</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Nowa sugestia będzie uwzględniać Twoją aktualną historię treningów</span>
          </li>
        </ul>
      </div>

      {/* Przycisk generowania nowej */}
      <Button
        onClick={onGenerateNew}
        disabled={isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
            Wygeneruj nową sugestię
          </>
        )}
      </Button>
    </div>
  );
}
