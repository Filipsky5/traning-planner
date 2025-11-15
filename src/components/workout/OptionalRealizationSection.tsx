import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import type { ManualWorkoutFormValues } from "../../types/workoutForms";

/**
 * Sekcja opcjonalna pozwalająca oznaczyć trening jako już wykonany
 * i wprowadzić dane z realizacji
 */
export function OptionalRealizationSection() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<ManualWorkoutFormValues>();

  const isCompleted = watch("isCompleted");
  const totalPlannedDistanceKm = watch("totalPlannedDistanceKm");
  const totalPlannedDurationSec = watch("totalPlannedDurationSec");

  // Formatuj czas (sekundy -> minuty dla domyślnej wartości)
  const defaultDurationMinutes = Math.floor(totalPlannedDurationSec / 60);
  const defaultDurationSeconds = totalPlannedDurationSec % 60;

  // Handler dla przełącznika - prefill wartościami z planu
  const handleCompletedToggle = (checked: boolean) => {
    setValue("isCompleted", checked);

    if (checked) {
      // Prefill wartościami z planu
      if (!watch("realizedDistanceKm")) {
        setValue("realizedDistanceKm", totalPlannedDistanceKm);
      }
      if (!watch("realizedDurationSec")) {
        setValue("realizedDurationSec", totalPlannedDurationSec);
      }
      if (!watch("completedAt")) {
        setValue("completedAt", new Date());
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="isCompleted" className="text-base font-semibold">
            Trening już wykonany
          </Label>
          <p className="text-sm text-gray-500">
            Zaznacz jeśli chcesz od razu wprowadzić dane z wykonania
          </p>
        </div>
        <Switch
          id="isCompleted"
          checked={isCompleted}
          onCheckedChange={handleCompletedToggle}
        />
      </div>

      {isCompleted && (
        <Card className="p-4 space-y-4">
          {/* Zrealizowany dystans */}
          <div className="space-y-1">
            <Label htmlFor="realizedDistanceKm">
              Dystans (km) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="realizedDistanceKm"
              type="number"
              step="0.1"
              min="0.1"
              max="100"
              placeholder="np. 5.0"
              {...register("realizedDistanceKm", {
                valueAsNumber: true,
                required: isCompleted ? "Dystans jest wymagany" : false,
                min: { value: 0.1, message: "Dystans musi być >= 0.1 km" },
                max: { value: 100, message: "Dystans musi być <= 100 km" },
              })}
            />
            {errors.realizedDistanceKm && (
              <p className="text-sm text-red-600">{errors.realizedDistanceKm.message}</p>
            )}
          </div>

          {/* Zrealizowany czas */}
          <div className="space-y-1">
            <Label htmlFor="realizedDurationSec">
              Czas (sekundy) <span className="text-red-600">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="realizedDurationMinutes"
                  type="number"
                  min="0"
                  max="360"
                  placeholder="Minuty"
                  defaultValue={defaultDurationMinutes}
                  onChange={(e) => {
                    const minutes = parseInt(e.target.value) || 0;
                    const currentSec = watch("realizedDurationSec") || 0;
                    const currentSecOnly = currentSec % 60;
                    setValue("realizedDurationSec", minutes * 60 + currentSecOnly);
                  }}
                />
              </div>
              <div className="flex-1">
                <Input
                  id="realizedDurationSeconds"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Sekundy"
                  defaultValue={defaultDurationSeconds}
                  onChange={(e) => {
                    const seconds = parseInt(e.target.value) || 0;
                    const currentSec = watch("realizedDurationSec") || 0;
                    const currentMinutes = Math.floor(currentSec / 60);
                    setValue("realizedDurationSec", currentMinutes * 60 + seconds);
                  }}
                />
              </div>
            </div>
            <input
              id="realizedDurationSec"
              type="hidden"
              {...register("realizedDurationSec", {
                required: isCompleted ? "Czas jest wymagany" : false,
                min: { value: 300, message: "Czas musi być >= 5 minut (300s)" },
                max: { value: 21600, message: "Czas musi być <= 6 godzin (21600s)" },
              })}
            />
            {errors.realizedDurationSec && (
              <p className="text-sm text-red-600">{errors.realizedDurationSec.message}</p>
            )}
          </div>

          {/* Średnie tętno */}
          <div className="space-y-1">
            <Label htmlFor="avgHrBpm">
              Średnie tętno (bpm) <span className="text-red-600">*</span>
            </Label>
            <Input
              id="avgHrBpm"
              type="number"
              min="0"
              max="240"
              placeholder="np. 140"
              {...register("avgHrBpm", {
                valueAsNumber: true,
                required: isCompleted ? "Tętno jest wymagane" : false,
                min: { value: 0, message: "Tętno musi być >= 0 bpm" },
                max: { value: 240, message: "Tętno musi być <= 240 bpm" },
              })}
            />
            {errors.avgHrBpm && (
              <p className="text-sm text-red-600">{errors.avgHrBpm.message}</p>
            )}
          </div>

          {/* Data i czas ukończenia */}
          <div className="space-y-1">
            <Label htmlFor="completedAt">
              Data i czas ukończenia <span className="text-red-600">*</span>
            </Label>
            <Input
              id="completedAt"
              type="datetime-local"
              {...register("completedAt", {
                required: isCompleted ? "Data ukończenia jest wymagana" : false,
                setValueAs: (value) => (value ? new Date(value) : undefined),
              })}
              defaultValue={new Date().toISOString().slice(0, 16)}
            />
            {errors.completedAt && (
              <p className="text-sm text-red-600">{errors.completedAt.message}</p>
            )}
          </div>

          {/* Ocena treningu */}
          <div className="space-y-2">
            <Label>Ocena treningu (opcjonalna)</Label>
            <RadioGroup
              value={watch("rating") || ""}
              onValueChange={(value) =>
                setValue("rating", value as "too_easy" | "just_right" | "too_hard")
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="too_easy" id="rating-easy" />
                <Label htmlFor="rating-easy" className="font-normal cursor-pointer">
                  😊 Za łatwy
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="just_right" id="rating-right" />
                <Label htmlFor="rating-right" className="font-normal cursor-pointer">
                  👍 W sam raz
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="too_hard" id="rating-hard" />
                <Label htmlFor="rating-hard" className="font-normal cursor-pointer">
                  😓 Za trudny
                </Label>
              </div>
            </RadioGroup>
          </div>
        </Card>
      )}
    </div>
  );
}
