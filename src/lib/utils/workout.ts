/**
 * Mapuje kod typu treningu na kolor Tailwind
 * TODO: to powinno być konfigurowane z API lub stałych
 */
export function getColorForTrainingType(code: string): string {
  const colorMap: Record<string, string> = {
    easy_run: "bg-blue-500",
    tempo_run: "bg-orange-500",
    interval: "bg-red-500",
    long_run: "bg-purple-500",
    recovery: "bg-green-500",
  };
  return colorMap[code] || "bg-gray-500";
}

/**
 * Formatuje dystans z metrów na kilometry
 */
export function formatDistance(meters: number | null): string {
  if (meters === null || meters === 0) return "";
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

/**
 * Formatuje czas trwania z sekund na format MM:SS lub HH:MM:SS
 */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return "";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formatuje tempo (s/km) na format MM:SS/km
 */
export function formatPace(secondsPerKm: number | null): string {
  if (secondsPerKm === null || secondsPerKm === 0) return "";

  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}/km`;
}
