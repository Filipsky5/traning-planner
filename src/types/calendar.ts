import type { CalendarWorkoutItemDto, TrainingTypeDto } from "../types";

/**
 * ViewModel dla pojedynczego treningu w kalendarzu
 * Rozszerza DTO o pełne dane typu treningu i przypisany kolor
 */
export interface WorkoutViewModel extends CalendarWorkoutItemDto {
  trainingType: TrainingTypeDto;
  color: string; // np. 'bg-blue-500', 'text-green-500'
}

/**
 * ViewModel dla pojedynczej komórki dnia w siatce kalendarza
 * Agreguje dane potrzebne do renderowania DayCell
 */
export interface DayCellViewModel {
  date: Date;
  dateString: string; // YYYY-MM-DD
  isToday: boolean;
  isCurrentMonth: boolean;
  workouts: WorkoutViewModel[];
}

/**
 * ViewModel dla całego widoku kalendarza
 */
export interface CalendarViewModel {
  days: DayCellViewModel[];
  range: { start: string; end: string };
}
