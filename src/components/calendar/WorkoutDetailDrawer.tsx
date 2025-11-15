import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getWorkoutById, completeWorkout, ApiError } from "../../lib/api/workoutsClient";
import { RateWorkoutDialog } from "../workout/RateWorkoutDialog";
import type { WorkoutDetailDto, TrainingTypeDto } from "../../types";

interface WorkoutDetailDrawerProps {
  workoutId: string | null;
  trainingTypes?: TrainingTypeDto[];
  onOpenChange: (isOpen: boolean) => void;
  onWorkoutCompleted?: () => void;
}

/**
 * Panel boczny wyświetlający szczegóły pojedynczego treningu
 * Pobiera dane z API za pomocą getWorkoutById
 */
export function WorkoutDetailDrawer({
  workoutId,
  trainingTypes,
  onOpenChange,
  onWorkoutCompleted,
}: WorkoutDetailDrawerProps) {
  const [workout, setWorkout] = useState<WorkoutDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // State dla formularza ukończenia treningu
  const [isCompleting, setIsCompleting] = useState<boolean>(false);
  const [showCompleteForm, setShowCompleteForm] = useState<boolean>(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState<boolean>(false);
  const [completeForm, setCompleteForm] = useState({
    distance_m: "",
    duration_s: "",
    avg_hr_bpm: "",
    rating: "" as "" | "too_easy" | "just_right" | "too_hard",
  });

  const isOpen = workoutId !== null;

  // Fetch workout details when workoutId changes
  useEffect(() => {
    if (!workoutId) {
      setWorkout(null);
      setError(null);
      setShowCompleteForm(false);
      return;
    }

    const fetchWorkout = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getWorkoutById(workoutId);
        setWorkout(data);

        // Inicjalizuj formularz wartościami planowanymi
        setCompleteForm({
          distance_m: data.planned_distance_m?.toString() || "",
          duration_s: data.planned_duration_s?.toString() || "",
          avg_hr_bpm: "",
          rating: "",
        });
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err);
        } else {
          setError(new Error("Nie udało się pobrać szczegółów treningu"));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkout();
  }, [workoutId]);

  // Handler oznaczania jako ukończony
  const handleComplete = async () => {
    if (!workout) return;

    // Walidacja formularza
    const distance = parseInt(completeForm.distance_m);
    const duration = parseInt(completeForm.duration_s);
    const hr = parseInt(completeForm.avg_hr_bpm);

    if (!distance || distance < 100 || distance > 100000) {
      alert("Dystans musi być między 100m a 100km");
      return;
    }

    if (!duration || duration < 300 || duration > 21600) {
      alert("Czas musi być między 5 min a 6 godzin");
      return;
    }

    if (!hr || hr < 0 || hr > 240) {
      alert("Tętno musi być między 0 a 240 bpm");
      return;
    }

    setIsCompleting(true);
    setError(null);

    try {
      const updatedWorkout = await completeWorkout(workout.id, {
        distance_m: distance,
        duration_s: duration,
        avg_hr_bpm: hr,
        completed_at: new Date().toISOString(),
        rating: completeForm.rating || undefined,
      });

      // Zaktualizuj workout w state
      setWorkout(updatedWorkout);
      setShowCompleteForm(false);

      // Wywołaj callback
      onWorkoutCompleted?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(new Error("Nie udało się oznaczyć treningu jako ukończony"));
      }
    } finally {
      setIsCompleting(false);
    }
  };

  // Find training type name
  const trainingTypeName =
    workout && trainingTypes ? trainingTypes.find((t) => t.code === workout.training_type_code)?.name : undefined;

  // Format date
  const formattedDate = workout
    ? new Date(workout.planned_date + "T00:00:00").toLocaleDateString("pl-PL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Status config
  const statusConfig = {
    planned: { label: "Zaplanowany", variant: "outline" as const },
    completed: { label: "Ukończony", variant: "default" as const },
    skipped: { label: "Pominięty", variant: "secondary" as const },
    cancelled: { label: "Anulowany", variant: "destructive" as const },
  };

  const status = workout ? statusConfig[workout.status as keyof typeof statusConfig] || statusConfig.planned : null;

  // Format distance
  const formatDistance = (meters?: number | null) => {
    if (!meters) return "—";
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  // Format duration
  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "—";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min ${secs}s`;
  };

  // Format pace
  const formatPace = (secondsPerKm?: number | null) => {
    if (!secondsPerKm) return "—";
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.floor(secondsPerKm % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")} min/km`;
  };

  // Step part labels
  const stepPartLabels = {
    warmup: "Rozgrzewka",
    main: "Część główna",
    cooldown: "Cool-down",
    segment: "Segment",
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Szczegóły treningu</SheetTitle>
            <SheetDescription className="capitalize">{formattedDate}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-4">
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error.message}</p>
                <Button
                  onClick={() => workoutId && getWorkoutById(workoutId)}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Spróbuj ponownie
                </Button>
              </div>
            )}

            {/* Workout details */}
            {workout && !isLoading && (
              <div className="space-y-4">
                {/* Training type and status */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{trainingTypeName || workout.training_type_code}</h3>
                  {status && <Badge variant={status.variant}>{status.label}</Badge>}
                </div>

                {/* Basic info */}
                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-medium text-sm text-gray-700">Informacje podstawowe</h4>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Pozycja:</span>
                      <span className="ml-2 font-medium">{workout.position}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Pochodzenie:</span>
                      <span className="ml-2 font-medium">{workout.origin === "ai" ? "AI" : "Ręczne"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Planowany dystans:</span>
                      <span className="ml-2 font-medium">{formatDistance(workout.planned_distance_m)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Planowany czas:</span>
                      <span className="ml-2 font-medium">{formatDuration(workout.planned_duration_s)}</span>
                    </div>
                  </div>
                </div>

                {/* Completed data (if status is completed) */}
                {workout.status === "completed" && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-medium text-sm text-gray-700">Dane z wykonania</h4>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Dystans:</span>
                        <span className="ml-2 font-medium">{formatDistance(workout.distance_m)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Czas:</span>
                        <span className="ml-2 font-medium">{formatDuration(workout.duration_s)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Tempo średnie:</span>
                        <span className="ml-2 font-medium">{formatPace(workout.avg_pace_s_per_km)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Średnie HR:</span>
                        <span className="ml-2 font-medium">
                          {workout.avg_hr_bpm ? `${workout.avg_hr_bpm} bpm` : "—"}
                        </span>
                      </div>
                    </div>

                    {workout.rating && (
                      <div className="text-sm">
                        <span className="text-gray-500">Ocena:</span>
                        <span className="ml-2 font-medium capitalize">{workout.rating}</span>
                      </div>
                    )}

                    {workout.completed_at && (
                      <div className="text-sm">
                        <span className="text-gray-500">Ukończono:</span>
                        <span className="ml-2 font-medium">
                          {new Date(workout.completed_at).toLocaleString("pl-PL")}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Steps */}
                {workout.steps && workout.steps.length > 0 && (
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="font-medium text-sm text-gray-700">Plan treningu</h4>

                    <div className="space-y-2">
                      {workout.steps.map((step, index) => (
                        <div key={index} className="rounded-md border bg-gray-50 p-3 text-sm">
                          <div className="font-medium text-gray-900">
                            {stepPartLabels[step.part as keyof typeof stepPartLabels] || step.part}
                          </div>
                          <div className="mt-1 space-y-1 text-gray-600">
                            {step.distance_m && <div>Dystans: {formatDistance(step.distance_m)}</div>}
                            {step.duration_s && <div>Czas: {formatDuration(step.duration_s)}</div>}
                            {step.notes && <div className="mt-1 text-xs italic">{step.notes}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formularz ukończenia treningu - pokazuj tylko dla planned workouts */}
                {workout.status === "planned" && (
                  <div className="space-y-4 border-t pt-4">
                    {!showCompleteForm ? (
                      <Button onClick={() => setShowCompleteForm(true)} className="w-full" variant="default">
                        Oznacz jako ukończony
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-gray-700">Dane z wykonania</h4>

                        {/* Dystans */}
                        <div className="space-y-2">
                          <Label htmlFor="distance">Dystans (metry)</Label>
                          <Input
                            id="distance"
                            type="number"
                            value={completeForm.distance_m}
                            onChange={(e) => setCompleteForm({ ...completeForm, distance_m: e.target.value })}
                            placeholder="np. 5000"
                            disabled={isCompleting}
                          />
                        </div>

                        {/* Czas */}
                        <div className="space-y-2">
                          <Label htmlFor="duration">Czas (sekundy)</Label>
                          <Input
                            id="duration"
                            type="number"
                            value={completeForm.duration_s}
                            onChange={(e) => setCompleteForm({ ...completeForm, duration_s: e.target.value })}
                            placeholder="np. 1800"
                            disabled={isCompleting}
                          />
                        </div>

                        {/* Średnie HR */}
                        <div className="space-y-2">
                          <Label htmlFor="hr">Średnie tętno (bpm)</Label>
                          <Input
                            id="hr"
                            type="number"
                            value={completeForm.avg_hr_bpm}
                            onChange={(e) => setCompleteForm({ ...completeForm, avg_hr_bpm: e.target.value })}
                            placeholder="np. 145"
                            disabled={isCompleting}
                          />
                        </div>

                        {/* Ocena */}
                        <div className="space-y-2">
                          <Label>Ocena (opcjonalnie)</Label>
                          {completeForm.rating ? (
                            <div className="flex items-center justify-between rounded-md border p-3">
                              <span className="text-sm">
                                {completeForm.rating === "too_easy" && "😊 Za łatwy"}
                                {completeForm.rating === "just_right" && "👍 W sam raz"}
                                {completeForm.rating === "too_hard" && "😓 Za trudny"}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsRateDialogOpen(true)}
                                disabled={isCompleting}
                              >
                                Zmień
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsRateDialogOpen(true)}
                              disabled={isCompleting}
                              className="w-full"
                            >
                              Dodaj ocenę
                            </Button>
                          )}
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2">
                          <Button onClick={handleComplete} disabled={isCompleting} className="flex-1">
                            {isCompleting ? "Zapisywanie..." : "Zapisz"}
                          </Button>
                          <Button
                            onClick={() => setShowCompleteForm(false)}
                            disabled={isCompleting}
                            variant="outline"
                            className="flex-1"
                          >
                            Anuluj
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog oceny treningu */}
      <RateWorkoutDialog
        open={isRateDialogOpen}
        onOpenChange={setIsRateDialogOpen}
        onSubmit={async (data) => {
          setCompleteForm({ ...completeForm, rating: data.rating });
          setIsRateDialogOpen(false);
        }}
      />
    </>
  );
}
