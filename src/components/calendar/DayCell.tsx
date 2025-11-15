import type { DayCellViewModel } from "../../types/calendar";
import { WorkoutCard } from "./WorkoutCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DayCellProps {
  day: DayCellViewModel;
  index: number;
  onAddWorkout: (date: Date) => void;
  onAddWorkoutManual?: (date: Date) => void;
  onOpenDay: (day: DayCellViewModel) => void;
  onWorkoutClick?: (workoutId: string) => void;
}

/**
 * Reprezentuje pojedynczy dzień w siatce kalendarza
 * Wyświetla karty treningów lub przycisk + do dodawania nowego treningu
 * Obsługuje nawigację klawiaturą przez atrybuty data-day-index i tabIndex
 */
export function DayCell({
  day,
  index,
  onAddWorkout,
  onAddWorkoutManual,
  onOpenDay,
  onWorkoutClick,
}: DayCellProps) {
  const MAX_VISIBLE_WORKOUTS = 2;
  const hasMoreWorkouts = day.workouts.length > MAX_VISIBLE_WORKOUTS;
  const visibleWorkouts = day.workouts.slice(0, MAX_VISIBLE_WORKOUTS);
  const hiddenCount = day.workouts.length - MAX_VISIBLE_WORKOUTS;

  // Style dla komórki
  const cellClasses = [
    'bg-white p-2 min-h-[100px] cursor-pointer transition-all duration-200',
    'hover:bg-gray-50 hover:shadow-sm',
    day.isToday && 'ring-2 ring-blue-500 ring-inset bg-blue-50/30',
    !day.isCurrentMonth && 'bg-gray-50 text-gray-400 opacity-60',
  ].filter(Boolean).join(' ');

  // ARIA label dla accessibility
  const ariaLabel = `${day.date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })}${day.workouts.length > 0 ? `, ${day.workouts.length} ${day.workouts.length === 1 ? 'trening' : 'treningi'}` : ''}`;

  return (
    <div
      className={cellClasses}
      role="gridcell"
      data-day-index={index}
      tabIndex={day.isToday ? 0 : -1}
      aria-label={ariaLabel}
      onClick={() => hasMoreWorkouts && onOpenDay(day)}
    >
      {/* Numer dnia */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={`text-sm font-medium ${
            day.isToday
              ? 'bg-blue-500 text-white rounded-full w-7 h-7 flex items-center justify-center'
              : ''
          }`}
        >
          {day.date.getDate()}
        </span>

        {/* Dropdown dodawania treningu */}
        {day.workouts.length === 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                aria-label="Dodaj trening"
                onClick={(e) => e.stopPropagation()}
              >
                +
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAddWorkout(day.date);
                }}
              >
                Generuj z AI
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAddWorkoutManual?.(day.date);
                }}
              >
                Dodaj ręcznie
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Lista treningów */}
      <div className="space-y-1">
        {visibleWorkouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            workout={workout}
            onWorkoutClick={onWorkoutClick}
          />
        ))}

        {/* Wskaźnik "+N więcej" */}
        {hasMoreWorkouts && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDay(day);
            }}
            className="text-xs text-blue-600 hover:underline w-full text-left"
          >
            +{hiddenCount} więcej
          </button>
        )}
      </div>
    </div>
  );
}
