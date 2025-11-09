interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Komponent wyświetlający komunikat o błędzie
 * Opcjonalnie może zawierać przycisk "Spróbuj ponownie"
 */
export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4 max-w-md px-4">
        {/* Ikona błędu */}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
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
          <p className="text-base font-medium text-red-800">Wystąpił błąd</p>
          <p className="mt-2 text-sm text-red-700">{message}</p>
        </div>

        {/* Przycisk retry (opcjonalny) */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Spróbuj ponownie
          </button>
        )}
      </div>
    </div>
  );
}
