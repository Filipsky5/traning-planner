import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { TrainingTypeDto } from "../../types";

interface AISuggestionFormProps {
  trainingTypes: TrainingTypeDto[];
  onSubmit: (data: { plannedDate: Date; trainingTypeCode: string }) => void;
  isSubmitting: boolean;
  initialData: {
    plannedDate: Date;
    trainingTypeCode?: string;
  };
}

/**
 * Formularz do generowania sugestii AI
 * Pozwala wybrać typ treningu i datę planowaną
 */
export function AISuggestionForm({ trainingTypes, onSubmit, isSubmitting, initialData }: AISuggestionFormProps) {
  const [trainingTypeCode, setTrainingTypeCode] = useState<string>(initialData.trainingTypeCode || "");
  const [plannedDate, setPlannedDate] = useState<Date>(initialData.plannedDate);
  const [errors, setErrors] = useState<{
    trainingTypeCode?: string;
    plannedDate?: string;
  }>({});

  // Walidacja formularza
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!trainingTypeCode) {
      newErrors.trainingTypeCode = "Wybierz typ treningu";
    }

    if (!plannedDate) {
      newErrors.plannedDate = "Wybierz datę";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler submita
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit({
      plannedDate,
      trainingTypeCode,
    });
  };

  // Filtruj tylko aktywne typy treningów
  const activeTrainingTypes = trainingTypes.filter((type) => type.is_active);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Wybór typu treningu */}
      <div className="space-y-2">
        <label htmlFor="training-type" className="text-sm font-medium text-gray-700">
          Typ treningu
        </label>
        <Select
          value={trainingTypeCode}
          onValueChange={(value) => {
            setTrainingTypeCode(value);
            setErrors((prev) => ({ ...prev, trainingTypeCode: undefined }));
          }}
          disabled={isSubmitting}
        >
          <SelectTrigger
            id="training-type"
            className={cn(errors.trainingTypeCode && "border-red-500 focus:ring-red-500")}
          >
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
        {errors.trainingTypeCode && <p className="text-sm text-red-600">{errors.trainingTypeCode}</p>}
      </div>

      {/* Wybór daty */}
      <div className="space-y-2">
        <label htmlFor="planned-date" className="text-sm font-medium text-gray-700">
          Data treningu
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="planned-date"
              variant="outline"
              disabled={isSubmitting}
              className={cn(
                "w-full justify-start text-left font-normal",
                !plannedDate && "text-muted-foreground",
                errors.plannedDate && "border-red-500 focus:ring-red-500"
              )}
            >
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
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              {plannedDate ? (
                plannedDate.toLocaleDateString("pl-PL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              ) : (
                <span>Wybierz datę</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={plannedDate}
              onSelect={(date) => {
                if (date) {
                  setPlannedDate(date);
                  setErrors((prev) => ({ ...prev, plannedDate: undefined }));
                }
              }}
              disabled={isSubmitting}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.plannedDate && <p className="text-sm text-red-600">{errors.plannedDate}</p>}
      </div>

      {/* Przycisk submita */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Generowanie...
          </>
        ) : (
          "Generuj sugestię AI"
        )}
      </Button>
    </form>
  );
}
