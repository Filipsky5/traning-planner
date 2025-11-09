import type { DayCellViewModel } from "../../types/calendar";
import { WorkoutCard } from "./WorkoutCard";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface DayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  day: DayCellViewModel | null;
  onAddWorkout: (date: Date) => void;
}

/**
 * Panel boczny wyświetlający wszystkie treningi dla wybranego dnia
 * Pozwala na dodawanie nowych treningów i przeglądanie szczegółów
 */
export function DayDrawer({
  isOpen,
  onClose,
  day,
  onAddWorkout,
}: DayDrawerProps) {
  if (!day) return null;

  // Formatuj datę do wyświetlenia
  const formattedDate = day.date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="capitalize">{formattedDate}</SheetTitle>
          <SheetDescription>
            {day.workouts.length === 0
              ? 'Brak zaplanowanych treningów'
              : `${day.workouts.length} ${day.workouts.length === 1 ? 'trening' : 'treningi'}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Przycisk dodawania treningu */}
          <Button
            onClick={() => {
              onAddWorkout(day.date);
              onClose();
            }}
            className="w-full"
            variant="outline"
          >
            + Dodaj trening
          </Button>

          {/* Lista treningów */}
          {day.workouts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Treningi
              </h3>
              {day.workouts.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
