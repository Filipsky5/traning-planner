import { useRef, useCallback } from "react";
import type React from "react";
import type { DayCellViewModel } from "../../types/calendar";
import { DayCell } from "./DayCell";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarGridProps {
  days: DayCellViewModel[];
  isLoading: boolean;
  onAddWorkout: (date: Date) => void;
  onAddWorkoutManual?: (date: Date) => void;
  onOpenDay: (day: DayCellViewModel) => void;
  onWorkoutClick?: (workoutId: string) => void;
}

/**
 * Siatka wyświetlająca komórki dni dla wybranego okresu
 * Odpowiada za logikę renderowania wszystkich dni w danym zakresie
 * Obsługuje nawigację klawiaturą (strzałki)
 */
export function CalendarGrid({
  days,
  isLoading,
  onAddWorkout,
  onAddWorkoutManual,
  onOpenDay,
  onWorkoutClick,
}: CalendarGridProps) {
  // Nazwy dni tygodnia
  const weekDays = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nie"];
  const gridRef = useRef<HTMLDivElement>(null);

  /**
   * Obsługuje nawigację klawiaturą po siatce kalendarza
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (!target || !target.hasAttribute("data-day-index")) return;

      const currentIndex = parseInt(target.getAttribute("data-day-index") || "0", 10);
      let newIndex = currentIndex;

      switch (event.key) {
        case "ArrowLeft":
          newIndex = Math.max(0, currentIndex - 1);
          event.preventDefault();
          break;
        case "ArrowRight":
          newIndex = Math.min(days.length - 1, currentIndex + 1);
          event.preventDefault();
          break;
        case "ArrowUp":
          newIndex = Math.max(0, currentIndex - 7);
          event.preventDefault();
          break;
        case "ArrowDown":
          newIndex = Math.min(days.length - 1, currentIndex + 7);
          event.preventDefault();
          break;
        case "Enter":
        case " ":
          // Otwórz DayDrawer dla wybranego dnia
          if (days[currentIndex]) {
            onOpenDay(days[currentIndex]);
            event.preventDefault();
          }
          break;
        default:
          return;
      }

      // Przenieś focus na nową komórkę
      if (newIndex !== currentIndex && gridRef.current) {
        const cells = gridRef.current.querySelectorAll("[data-day-index]");
        const newCell = cells[newIndex] as HTMLElement;
        if (newCell) {
          newCell.focus();
        }
      }
    },
    [days, onOpenDay]
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow" role="grid">
        {/* Nagłówki dni tygodnia */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border-b">
          {weekDays.map((day) => (
            <div key={day} className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Skeletony dla dni */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="bg-white p-2 min-h-[100px]">
              <Skeleton className="h-4 w-6 mb-2" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow" role="grid" ref={gridRef}>
      {/* Nagłówki dni tygodnia */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border-b">
        {weekDays.map((day) => (
          <div key={day} className="bg-gray-50 p-2 text-center text-sm font-semibold text-gray-700">
            {day}
          </div>
        ))}
      </div>

      {/* Siatka dni */}
      <div className="grid grid-cols-7 gap-px bg-gray-200" onKeyDown={handleKeyDown}>
        {days.map((day, index) => (
          <DayCell
            key={day.dateString}
            day={day}
            index={index}
            onAddWorkout={onAddWorkout}
            onAddWorkoutManual={onAddWorkoutManual}
            onOpenDay={onOpenDay}
            onWorkoutClick={onWorkoutClick}
          />
        ))}
      </div>
    </div>
  );
}
