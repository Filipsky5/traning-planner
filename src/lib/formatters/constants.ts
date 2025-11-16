import type { StepPart } from "@/types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

export interface WorkoutStatusDisplay {
  label: string;
  variant: BadgeVariant;
}

export const workoutStatusConfig: Record<string, WorkoutStatusDisplay> = {
  planned: { label: "Zaplanowany", variant: "outline" },
  completed: { label: "Ukończony", variant: "default" },
  skipped: { label: "Pominięty", variant: "secondary" },
  cancelled: { label: "Anulowany", variant: "destructive" },
};

export const workoutStepPartLabels: Record<StepPart, string> = {
  warmup: "Rozgrzewka",
  main: "Część główna",
  cooldown: "Cool-down",
  segment: "Segment",
};

export const formatDistance = (meters?: number | null): string => {
  if (meters == null || meters < 0) return "—";
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
};

export const formatDuration = (seconds?: number | null): string => {
  if (seconds == null || seconds < 0) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  return `${minutes}min ${secs}s`;
};

export const formatPace = (secondsPerKm?: number | null): string => {
  if (secondsPerKm == null || secondsPerKm < 0) return "—";
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.floor(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} min/km`;
};

export const formatWorkoutDate = (dateString?: string | null): string => {
  if (!dateString) return "";

  return new Date(`${dateString}T00:00:00`).toLocaleDateString("pl-PL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
