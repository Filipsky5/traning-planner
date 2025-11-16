import { memo, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RateWorkoutDialog } from "../workout/RateWorkoutDialog";
import { useWorkoutDetail } from "../hooks/useWorkoutDetail";
import type {
  TrainingTypeDto,
  WorkoutCompleteCommand,
  WorkoutDetailDto,
  WorkoutRateCommand,
} from "../../types";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatWorkoutDate,
  workoutStatusConfig,
  workoutStepPartLabels,
  type WorkoutStatusDisplay,
} from "@/lib/formatters/constants";

interface WorkoutDetailDrawerProps {
  workoutId: string | null;
  trainingTypes?: TrainingTypeDto[];
  onOpenChange: (isOpen: boolean) => void;
  onWorkoutCompleted?: () => void;
}

export function WorkoutDetailDrawer({
  workoutId,
  trainingTypes,
  onOpenChange,
  onWorkoutCompleted,
}: WorkoutDetailDrawerProps) {
  const { workout, isLoading, error, completeWorkout, refetch } = useWorkoutDetail(workoutId);
  const detail = workout?.detail ?? null;
  const isOpen = workoutId !== null;

  const trainingTypeName = useMemo(() => {
    if (!detail || !trainingTypes?.length) {
      return undefined;
    }

    return trainingTypes.find((type) => type.code === detail.training_type_code)?.name;
  }, [detail, trainingTypes]);

  const formattedDate = useMemo(() => formatWorkoutDate(detail?.planned_date), [detail?.planned_date]);
  const status = useMemo<WorkoutStatusDisplay | undefined>(() => {
    if (!workout) return undefined;
    return workoutStatusConfig[workout.status] ?? workoutStatusConfig.planned;
  }, [workout]);

  const handleCompleted = () => {
    onWorkoutCompleted?.();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Szczegóły treningu</SheetTitle>
          {formattedDate && <SheetDescription className="capitalize">{formattedDate}</SheetDescription>}
        </SheetHeader>

          <div className="mt-6 space-y-6 px-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error.message}</p>
                <Button onClick={refetch} variant="outline" size="sm" className="mt-2">
                  Spróbuj ponownie
                </Button>
              </div>
            )}

            {detail && !isLoading && !error && (
              <div className="space-y-6">
                <WorkoutSummary
                  workout={detail}
                  trainingTypeName={trainingTypeName}
                  status={status ?? workoutStatusConfig.planned}
                />

                <WorkoutSteps steps={detail.steps} />

                {detail.status === "planned" && (
                  <CompletionForm workout={detail} onSubmit={completeWorkout} onCompleted={handleCompleted} />
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
  );
}

interface WorkoutSummaryProps {
  workout: WorkoutDetailDto;
  trainingTypeName?: string;
  status: WorkoutStatusDisplay;
}

const WorkoutSummary = memo(function WorkoutSummary({
  workout,
  trainingTypeName,
  status,
}: WorkoutSummaryProps) {
  const isCompleted = workout.status === "completed";

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{trainingTypeName || workout.training_type_code}</h3>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <div className="space-y-2 border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700">Informacje podstawowe</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Pozycja:</span>
            <span className="ml-2 font-medium">{workout.position}</span>
          </div>
          <div>
            <span className="text-gray-500">Pochodzenie:</span>
            <span className="ml-2 font-medium">
              {workout.origin === "ai" ? "AI" : workout.origin === "manual" ? "Ręczne" : "Import"}
            </span>
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

      {isCompleted && (
        <div className="space-y-2 border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700">Dane z wykonania</h4>
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
              <span className="ml-2 font-medium">{workout.avg_hr_bpm ? `${workout.avg_hr_bpm} bpm` : "—"}</span>
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
    </div>
  );
});

interface WorkoutStepsProps {
  steps: WorkoutDetailDto["steps"];
}

const WorkoutSteps = memo(function WorkoutSteps({ steps }: WorkoutStepsProps) {
  if (!steps.length) {
    return null;
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <h4 className="text-sm font-medium text-gray-700">Plan treningu</h4>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="rounded-md border bg-gray-50 p-3 text-sm">
            <div className="font-medium text-gray-900">
              {workoutStepPartLabels[step.part] || step.part}
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
  );
});

const numericField = (min: number, max: number, messages: { min: string; max: string }) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      if (typeof value === "string") {
        return Number(value);
      }
      return value;
    },
    z
      .number({
        required_error: messages.min,
        invalid_type_error: "Podaj liczbę",
      })
      .int("Wartość musi być liczbą całkowitą")
      .min(min, messages.min)
      .max(max, messages.max)
  );

const completionSchema = z.object({
  distance_m: numericField(100, 100000, {
    min: "Dystans musi być większy lub równy 100 m",
    max: "Dystans nie może przekraczać 100 km",
  }),
  duration_s: numericField(300, 21600, {
    min: "Czas musi wynosić co najmniej 5 minut",
    max: "Czas nie może przekraczać 6 godzin",
  }),
  avg_hr_bpm: numericField(1, 240, {
    min: "Tętno musi być większe od 0",
    max: "Tętno nie może przekraczać 240 bpm",
  }),
  rating: z.enum(["too_easy", "just_right", "too_hard"]).optional(),
});

type CompletionFormValues = z.infer<typeof completionSchema>;

const getCompletionDefaults = (workout: WorkoutDetailDto): CompletionFormValues => ({
  distance_m: workout.planned_distance_m ?? undefined,
  duration_s: workout.planned_duration_s ?? undefined,
  avg_hr_bpm: undefined,
  rating: undefined,
});

interface CompletionFormProps {
  workout: WorkoutDetailDto;
  onSubmit: (data: WorkoutCompleteCommand) => Promise<void>;
  onCompleted?: () => void;
}

function CompletionForm({ workout, onSubmit, onCompleted }: CompletionFormProps) {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
    setValue,
  } = useForm<CompletionFormValues>({
    resolver: zodResolver(completionSchema),
    defaultValues: getCompletionDefaults(workout),
  });

  useEffect(() => {
    reset(getCompletionDefaults(workout));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout]);

  const ratingValue = watch("rating");

  const onFormSubmit = async (values: CompletionFormValues) => {
    setServerError(null);

    // Runtime validation (should never happen due to Zod, but adds type safety)
    if (!values.distance_m || !values.duration_s || !values.avg_hr_bpm) {
      setServerError("Wszystkie pola są wymagane");
      return;
    }

    try {
      await onSubmit({
        distance_m: values.distance_m,
        duration_s: values.duration_s,
        avg_hr_bpm: values.avg_hr_bpm,
        completed_at: new Date().toISOString(),
        rating: values.rating,
      });

      setIsFormVisible(false);
      reset(getCompletionDefaults(workout));
      onCompleted?.();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Nie udało się oznaczyć treningu jako ukończonego."
      );
    }
  };

  const handleRatingSubmit = async ({ rating }: WorkoutRateCommand) => {
    setValue("rating", rating);
  };

  if (!isFormVisible) {
    return (
      <div className="space-y-4 border-t pt-4 pb-6">
        <Button onClick={() => setIsFormVisible(true)} className="w-full">
          Oznacz jako ukończony
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t pt-4">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Dane z wykonania</h4>

        {serverError && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="distance">Dystans (metry)</Label>
          <Input
            id="distance"
            type="number"
            placeholder="np. 5000"
            disabled={isSubmitting}
            {...register("distance_m")}
          />
          {errors.distance_m && <p className="text-sm text-destructive">{errors.distance_m.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Czas (sekundy)</Label>
          <Input
            id="duration"
            type="number"
            placeholder="np. 1800"
            disabled={isSubmitting}
            {...register("duration_s")}
          />
          {errors.duration_s && <p className="text-sm text-destructive">{errors.duration_s.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="hr">Średnie tętno (bpm)</Label>
          <Input
            id="hr"
            type="number"
            placeholder="np. 145"
            disabled={isSubmitting}
            {...register("avg_hr_bpm")}
          />
          {errors.avg_hr_bpm && <p className="text-sm text-destructive">{errors.avg_hr_bpm.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Ocena (opcjonalnie)</Label>
          {ratingValue ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm">
                {ratingValue === "too_easy" && "😊 Za łatwy"}
                {ratingValue === "just_right" && "👍 W sam raz"}
                {ratingValue === "too_hard" && "😓 Za trudny"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsRateDialogOpen(true)}
                disabled={isSubmitting}
              >
                Zmień
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsRateDialogOpen(true)}
              disabled={isSubmitting}
            >
              Dodaj ocenę
            </Button>
          )}
        </div>

        <div className="flex gap-2 pb-6">
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? "Zapisywanie..." : "Zapisz"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
            onClick={() => setIsFormVisible(false)}
          >
            Anuluj
          </Button>
        </div>
      </form>

      <RateWorkoutDialog
        open={isRateDialogOpen}
        onOpenChange={setIsRateDialogOpen}
        onSubmit={async (data: WorkoutRateCommand) => {
          await handleRatingSubmit(data);
          setIsRateDialogOpen(false);
        }}
      />
    </div>
  );
}
