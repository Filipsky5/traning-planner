import { useForm, FormProvider } from "react-hook-form";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StepsEditor } from "./StepsEditor";
import { OptionalRealizationSection } from "./OptionalRealizationSection";
import { createWorkout, ApiError } from "../../lib/api/workoutsClient";
import {
  mapFormValuesToCreateWorkoutInput,
  calculateTotalDistanceKm,
  calculateTotalDurationSec,
  formatDurationDisplay,
} from "../../lib/utils/workoutFormMappers";
import type { ManualWorkoutFormValues } from "../../types/workoutForms";
import type { TrainingTypeDto, WorkoutDetailDto } from "../../types";
import { cn } from "@/lib/utils";

interface WorkoutPlanFormProps {
  trainingTypes: TrainingTypeDto[];
  initialDate: Date;
  onCancel: () => void;
  onSubmitSuccess: (workout: WorkoutDetailDto) => void;
}

/**
 * Główny formularz do ręcznego dodawania treningu
 * Obsługuje zarówno planowane jak i ukończone treningi
 */
export function WorkoutPlanForm({ trainingTypes, initialDate, onCancel, onSubmitSuccess }: WorkoutPlanFormProps) {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicjalizacja formularza z domyślnymi wartościami
  const methods = useForm<ManualWorkoutFormValues>({
    mode: "onChange", // Triggeruj walidację i watch przy każdej zmianie
    defaultValues: {
      trainingTypeCode: "",
      plannedDate: initialDate,
      position: 1,
      steps: [
        {
          id: crypto.randomUUID(),
          part: "main",
          distanceKm: undefined,
          durationMinutes: undefined,
          durationSeconds: undefined,
          targetHrBpm: undefined,
          notes: "",
        },
      ],
      totalPlannedDistanceKm: 0,
      totalPlannedDurationSec: 0,
      isCompleted: false,
      realizedDistanceKm: undefined,
      realizedDurationSec: undefined,
      avgHrBpm: undefined,
      completedAt: undefined,
      rating: undefined,
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = methods;

  // Obserwuj wszystkie wartości formularza (deep watching)
  const formValues = watch();
  const plannedDate = watch("plannedDate");
  const trainingTypeCode = watch("trainingTypeCode");

  // Oblicz łączne wartości bezpośrednio z kroków (recalculated on every render when steps change)
  const totalDistance = calculateTotalDistanceKm(formValues.steps);
  const totalDuration = calculateTotalDurationSec(formValues.steps);

  // Synchronizuj obliczone wartości z polami formularza
  useEffect(() => {
    setValue("totalPlannedDistanceKm", totalDistance, { shouldValidate: false });
    setValue("totalPlannedDurationSec", totalDuration, { shouldValidate: false });
  }, [totalDistance, totalDuration, setValue]);

  // Walidacja przed submitem
  const validateForm = (values: ManualWorkoutFormValues): string | null => {
    // Sprawdź czy typ treningu wybrany
    if (!values.trainingTypeCode) {
      return "Wybierz typ treningu";
    }

    // Sprawdź czy są kroki
    if (values.steps.length === 0) {
      return "Dodaj przynajmniej jeden krok treningu";
    }

    // Sprawdź czy każdy krok ma dystans LUB czas
    const invalidSteps = values.steps.filter(
      (step) =>
        (!step.distanceKm || step.distanceKm <= 0) &&
        (!step.durationMinutes || step.durationMinutes <= 0) &&
        (!step.durationSeconds || step.durationSeconds <= 0)
    );

    if (invalidSteps.length > 0) {
      return "Każdy krok musi mieć podany dystans lub czas";
    }

    // Sprawdź zakresy łącznych wartości
    if (values.totalPlannedDistanceKm < 0.1 || values.totalPlannedDistanceKm > 100) {
      return "Łączny dystans musi być między 0.1 km a 100 km";
    }

    if (values.totalPlannedDurationSec < 300 || values.totalPlannedDurationSec > 21600) {
      return "Łączny czas musi być między 5 minut a 6 godzin";
    }

    // Jeśli trening ukończony, sprawdź pola realizacji
    if (values.isCompleted) {
      if (!values.realizedDistanceKm || !values.realizedDurationSec || !values.avgHrBpm || !values.completedAt) {
        return "Wszystkie pola realizacji są wymagane dla ukończonego treningu";
      }
    }

    return null;
  };

  // Handler submitu
  const onSubmit = async (values: ManualWorkoutFormValues) => {
    setApiError(null);

    // Walidacja
    const validationError = validateForm(values);
    if (validationError) {
      setApiError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Mapuj wartości formularza na format API
      const input = mapFormValuesToCreateWorkoutInput(values);

      // Wyślij request
      const workout = await createWorkout(input);

      // Sukces - wywołaj callback
      onSubmitSuccess(workout);
    } catch (err) {
      if (err instanceof ApiError) {
        // Obsługa specyficznych błędów API
        if (err.status === 409) {
          setApiError("Istnieje już trening z taką pozycją dla danej daty. Zmień pozycję lub usuń istniejący trening.");
        } else if (err.status === 422) {
          setApiError("Nieprawidłowe dane treningu. Sprawdź wszystkie pola.");
        } else if (err.status === 404) {
          setApiError("Wybrany typ treningu nie istnieje.");
        } else {
          setApiError(err.message || "Nie udało się utworzyć treningu. Spróbuj ponownie.");
        }
      } else {
        setApiError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtruj tylko aktywne typy treningów
  const activeTrainingTypes = trainingTypes.filter((type) => type.is_active);

  // Formatuj czas do wyświetlenia
  const formattedDuration = formatDurationDisplay(totalDuration);

  // Formatuj datę do wyświetlenia
  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Komunikat błędu globalny */}
        {apiError && (
          <Alert variant="destructive">
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}

        {/* Podstawowe pola planu */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Podstawowe informacje</h3>

          {/* Typ treningu */}
          <div className="space-y-1">
            <Label htmlFor="trainingType">
              Typ treningu <span className="text-red-600">*</span>
            </Label>
            <Select
              value={trainingTypeCode}
              onValueChange={(value) => setValue("trainingTypeCode", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="trainingType">
                <SelectValue placeholder="Wybierz typ treningu" />
              </SelectTrigger>
              <SelectContent>
                {activeTrainingTypes.map((type) => (
                  <SelectItem key={type.code} value={type.code}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.trainingTypeCode && <p className="text-sm text-red-600">{errors.trainingTypeCode.message}</p>}
          </div>

          {/* Data planowana */}
          <div className="space-y-1">
            <Label>
              Data planowana <span className="text-red-600">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !plannedDate && "text-muted-foreground")}
                  type="button"
                  disabled={isSubmitting}
                >
                  {plannedDate ? formatDateDisplay(plannedDate) : "Wybierz datę"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={plannedDate}
                  onSelect={(date) => date && setValue("plannedDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Pozycja */}
          <div className="space-y-1">
            <Label htmlFor="position">
              Pozycja w dniu <span className="text-red-600">*</span>
            </Label>
            <Input
              id="position"
              type="number"
              min="1"
              {...register("position", {
                valueAsNumber: true,
                required: "Pozycja jest wymagana",
                min: { value: 1, message: "Pozycja musi być >= 1" },
              })}
              disabled={isSubmitting}
            />
            {errors.position && <p className="text-sm text-red-600">{errors.position.message}</p>}
          </div>

          {/* Podgląd sum */}
          <div className="rounded-md bg-gray-50 p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Łączny dystans:</span>
              <span className="font-medium">{totalDistance.toFixed(2)} km</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Łączny czas:</span>
              <span className="font-medium">{formattedDuration}</span>
            </div>
          </div>
        </div>

        {/* Edytor kroków */}
        <StepsEditor />

        {/* Sekcja realizacji (opcjonalna) */}
        <OptionalRealizationSection />

        {/* Przyciski akcji */}
        <div className="flex gap-3 pt-4 pb-6">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting} className="flex-1">
            Anuluj
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Zapisywanie..." : "Zapisz trening"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
