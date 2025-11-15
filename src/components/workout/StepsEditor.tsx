import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ManualWorkoutFormValues, ManualWorkoutStepForm } from "../../types/workoutForms";
import type { StepPart } from "../../types";

/**
 * Edytor dynamicznej listy kroków treningu
 * Używa useFieldArray z react-hook-form do zarządzania krokami
 */
export function StepsEditor() {
  const {
    control,
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<ManualWorkoutFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "steps",
  });

  // Dodaj nowy krok z domyślnymi wartościami
  const handleAddStep = () => {
    const newStep: ManualWorkoutStepForm = {
      id: crypto.randomUUID(),
      part: "main",
      distanceKm: undefined,
      durationMinutes: undefined,
      durationSeconds: undefined,
      targetHrBpm: undefined,
      notes: "",
    };
    append(newStep);
  };

  // Usuń krok (tylko jeśli jest więcej niż 1)
  const handleRemoveStep = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Etykiety dla typów segmentów
  const stepPartLabels: Record<StepPart, string> = {
    warmup: "Rozgrzewka",
    main: "Część główna",
    cooldown: "Schłodzenie",
    segment: "Segment",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Kroki treningu</Label>
        <Button type="button" onClick={handleAddStep} variant="outline" size="sm">
          + Dodaj segment
        </Button>
      </div>

      {fields.map((field, index) => {
        const stepErrors = errors.steps?.[index];

        return (
          <Card key={field.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Krok {index + 1}</Label>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveStep(index)}
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Usuń
                </Button>
              )}
            </div>

            {/* Typ segmentu */}
            <div className="space-y-1">
              <Label htmlFor={`steps.${index}.part`}>Typ segmentu</Label>
              <Select
                value={watch(`steps.${index}.part`)}
                onValueChange={(value) => setValue(`steps.${index}.part`, value as StepPart)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(stepPartLabels) as StepPart[]).map((part) => (
                    <SelectItem key={part} value={part}>
                      {stepPartLabels[part]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {stepErrors?.part && (
                <p className="text-sm text-red-600">{stepErrors.part.message}</p>
              )}
            </div>

            {/* Dystans */}
            <div className="space-y-1">
              <Label htmlFor={`steps.${index}.distanceKm`}>Dystans (km)</Label>
              <Input
                id={`steps.${index}.distanceKm`}
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                placeholder="np. 5.0"
                {...register(`steps.${index}.distanceKm`, {
                  valueAsNumber: true,
                })}
              />
              {stepErrors?.distanceKm && (
                <p className="text-sm text-red-600">{stepErrors.distanceKm.message}</p>
              )}
            </div>

            {/* Czas (minuty i sekundy) */}
            <div className="space-y-1">
              <Label>Czas</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id={`steps.${index}.durationMinutes`}
                    type="number"
                    min="0"
                    max="360"
                    placeholder="Min"
                    {...register(`steps.${index}.durationMinutes`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    id={`steps.${index}.durationSeconds`}
                    type="number"
                    min="0"
                    max="59"
                    placeholder="Sek"
                    {...register(`steps.${index}.durationSeconds`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
              </div>
              {(stepErrors?.durationMinutes || stepErrors?.durationSeconds) && (
                <p className="text-sm text-red-600">
                  {stepErrors?.durationMinutes?.message || stepErrors?.durationSeconds?.message}
                </p>
              )}
            </div>

            {/* Planowane tętno (opcjonalne) */}
            <div className="space-y-1">
              <Label htmlFor={`steps.${index}.targetHrBpm`}>
                Planowane tętno (bpm) - opcjonalne
              </Label>
              <Input
                id={`steps.${index}.targetHrBpm`}
                type="number"
                min="0"
                max="240"
                placeholder="np. 140"
                {...register(`steps.${index}.targetHrBpm`, {
                  valueAsNumber: true,
                })}
              />
              {stepErrors?.targetHrBpm && (
                <p className="text-sm text-red-600">{stepErrors.targetHrBpm.message}</p>
              )}
            </div>

            {/* Notatki (opcjonalne) */}
            <div className="space-y-1">
              <Label htmlFor={`steps.${index}.notes`}>Notatki - opcjonalne</Label>
              <Input
                id={`steps.${index}.notes`}
                type="text"
                maxLength={500}
                placeholder="Dodatkowe informacje..."
                {...register(`steps.${index}.notes`)}
              />
              {stepErrors?.notes && (
                <p className="text-sm text-red-600">{stepErrors.notes.message}</p>
              )}
            </div>
          </Card>
        );
      })}

      {/* Komunikat o wymaganiu przynajmniej dystansu lub czasu */}
      {errors.steps && typeof errors.steps.message === "string" && (
        <p className="text-sm text-red-600">{errors.steps.message}</p>
      )}
    </div>
  );
}
