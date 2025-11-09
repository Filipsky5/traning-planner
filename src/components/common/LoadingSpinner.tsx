/**
 * Komponent wyświetlający spinner ładowania
 * Używany do informowania użytkownika o trwającym ładowaniu danych
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-3">
        <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
        <p className="text-sm text-gray-600">Ładowanie...</p>
      </div>
    </div>
  );
}
