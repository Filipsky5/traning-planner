import { useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { WorkoutPlanForm } from "../workout/WorkoutPlanForm";
import type { TrainingTypeDto, WorkoutDetailDto } from "../../types";

interface ManualWorkoutDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: Date;
  trainingTypes: TrainingTypeDto[];
  onWorkoutCreated?: (workout: WorkoutDetailDto) => void;
}

/**
 * Panel boczny do ręcznego dodawania treningu
 * Wykorzystuje WorkoutPlanForm z obsługą zarówno planned jak i completed workouts
 */
export function ManualWorkoutDrawer({
  isOpen,
  onOpenChange,
  initialDate,
  trainingTypes,
  onWorkoutCreated,
}: ManualWorkoutDrawerProps) {
  // Formatuj datę dla nagłówka
  const formattedDate = initialDate.toLocaleDateString("pl-PL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Reset przy zamknięciu (opcjonalnie)
  useEffect(() => {
    if (!isOpen) {
      // Drawer zamknięty - stan formularza zostanie zresetowany przy kolejnym otwarciu
      // dzięki key w WorkoutPlanForm lub remountowaniu
    }
  }, [isOpen]);

  // Handler zamknięcia
  const handleClose = () => {
    onOpenChange(false);
  };

  // Handler sukcesu - zamknij drawer i wywołaj callback
  const handleSubmitSuccess = (workout: WorkoutDetailDto) => {
    // Wywołaj callback (CalendarView odświeży dane)
    onWorkoutCreated?.(workout);

    // Zamknij drawer
    handleClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-[600px]">
        <SheetHeader>
          <SheetTitle>Dodaj trening ręcznie</SheetTitle>
          <SheetDescription className="capitalize">
            {formattedDate}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {/* Formularz z kluczem opartym o datę - wymusza remount przy zmianie daty */}
          <WorkoutPlanForm
            key={initialDate.toISOString()}
            trainingTypes={trainingTypes}
            initialDate={initialDate}
            onCancel={handleClose}
            onSubmitSuccess={handleSubmitSuccess}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
