import { useState, useEffect, useCallback, useMemo } from "react";
import type { TrainingTypeDto, CalendarDto, ApiResponse, ApiListResponse } from "../types";
import type { DayCellViewModel, WorkoutViewModel } from "../types/calendar";

/**
 * Helper: oblicza zakres dat dla widoku miesiąca
 * Zwraca pierwszy i ostatni dzień miesiąca w formacie YYYY-MM-DD
 */
function getMonthRange(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // ostatni dzień miesiąca

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

/**
 * Helper: oblicza zakres dat dla widoku tygodnia
 * Zwraca poniedziałek i niedzielę tygodnia w formacie YYYY-MM-DD
 */
function getWeekRange(date: Date): { start: string; end: string } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // poniedziałek

  const start = new Date(date);
  start.setDate(diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6); // niedziela

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

/**
 * Helper: formatuje datę do YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Helper: parsuje datę z YYYY-MM-DD do Date
 */
function parseDate(dateString: string): Date {
  return new Date(dateString + "T00:00:00");
}

/**
 * Helper: sprawdza czy dwie daty to ten sam dzień
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Helper: generuje listę dni dla widoku kalendarza
 * W widoku miesiąca: dodaje dni z poprzedniego/następnego miesiąca aby wypełnić tygodnie
 * W widoku tygodnia: zwraca tylko dni wybranego tygodnia
 */
function generateCalendarDays(
  range: { start: string; end: string },
  viewMode: "month" | "week",
  calendarData: CalendarDto | null,
  trainingTypes: TrainingTypeDto[]
): DayCellViewModel[] {
  const days: DayCellViewModel[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = parseDate(range.start);
  const end = parseDate(range.end);

  // Dla widoku miesiąca: dodaj dni z poprzedniego miesiąca aby zacząć od poniedziałku
  if (viewMode === "month") {
    const firstDayOfWeek = start.getDay();
    const daysToAdd = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; // poniedziałek = 0

    for (let i = daysToAdd; i > 0; i--) {
      const date = new Date(start);
      date.setDate(date.getDate() - i);
      days.push(createDayCell(date, false, today, calendarData, trainingTypes));
    }
  }

  // Dodaj dni z zakresu
  const current = new Date(start);
  while (current <= end) {
    days.push(createDayCell(new Date(current), true, today, calendarData, trainingTypes));
    current.setDate(current.getDate() + 1);
  }

  // Dla widoku miesiąca: dodaj dni z następnego miesiąca aby wypełnić ostatni tydzień
  if (viewMode === "month") {
    const lastDayOfWeek = end.getDay();
    const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;

    for (let i = 1; i <= daysToAdd; i++) {
      const date = new Date(end);
      date.setDate(date.getDate() + i);
      days.push(createDayCell(date, false, today, calendarData, trainingTypes));
    }
  }

  return days;
}

/**
 * Helper: tworzy DayCellViewModel dla pojedynczego dnia
 */
function createDayCell(
  date: Date,
  isCurrentMonth: boolean,
  today: Date,
  calendarData: CalendarDto | null,
  trainingTypes: TrainingTypeDto[]
): DayCellViewModel {
  const dateString = formatDate(date);
  const isToday = isSameDay(date, today);

  // Znajdź dane dnia w calendarData
  const dayData = calendarData?.days.find((d) => d.date === dateString);

  // Mapuj workouts na WorkoutViewModel
  const workouts: WorkoutViewModel[] =
    dayData?.workouts.map((workout) => {
      const trainingType = trainingTypes.find((t) => t.code === workout.training_type_code);
      return {
        ...workout,
        trainingType: trainingType || {
          code: workout.training_type_code,
          name: workout.training_type_code,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        color: getColorForTrainingType(workout.training_type_code),
      };
    }) || [];

  return {
    date,
    dateString,
    isToday,
    isCurrentMonth,
    workouts,
  };
}

/**
 * Helper: mapuje kod typu treningu na kolor Tailwind
 * TODO: to powinno być konfigurowane z API lub stałych
 */
function getColorForTrainingType(code: string): string {
  const colorMap: Record<string, string> = {
    easy_run: "bg-blue-500",
    tempo_run: "bg-orange-500",
    interval: "bg-red-500",
    long_run: "bg-purple-500",
    recovery: "bg-green-500",
  };
  return colorMap[code] || "bg-gray-500";
}

/**
 * Custom hook do zarządzania stanem i logiką widoku kalendarza
 */
export function useCalendar(initialDate: Date = new Date()) {
  const [viewDate, setViewDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarDto | null>(null);
  const [trainingTypes, setTrainingTypes] = useState<TrainingTypeDto[]>([]);

  // Stan dla drawerów
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState<boolean>(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null); // YYYY-MM-DD dla DayDrawer
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // Date dla AISuggestionDrawer

  // Oblicz zakres dat na podstawie viewDate i viewMode
  const range = useMemo(() => {
    return viewMode === "month" ? getMonthRange(viewDate) : getWeekRange(viewDate);
  }, [viewDate, viewMode]);

  // Generuj listę dni kalendarza
  const calendarDays = useMemo(() => {
    return generateCalendarDays(range, viewMode, calendarData, trainingTypes);
  }, [range, viewMode, calendarData, trainingTypes]);

  // Pobierz typy treningów (jednorazowo)
  useEffect(() => {
    async function fetchTrainingTypes() {
      try {
        const response = await fetch("/api/v1/training-types");
        if (!response.ok) {
          throw new Error(`Failed to fetch training types: ${response.status}`);
        }
        const data: ApiListResponse<TrainingTypeDto> = await response.json();
        setTrainingTypes(data.data);
      } catch (err) {
        console.error("Error fetching training types:", err);
        setError(err as Error);
      }
    }

    fetchTrainingTypes();
  }, []);

  // Pobierz dane kalendarza przy zmianie zakresu
  useEffect(() => {
    async function fetchCalendarData() {
      setIsLoading(true);
      setError(null);

      try {
        const url = `/api/v1/calendar?start=${range.start}&end=${range.end}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch calendar: ${response.status}`);
        }

        const data: ApiResponse<CalendarDto> = await response.json();
        setCalendarData(data.data);
      } catch (err) {
        console.error("Error fetching calendar:", err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    // Pobierz tylko jeśli mamy typy treningów
    if (trainingTypes.length > 0) {
      fetchCalendarData();
    }
  }, [range, trainingTypes]);

  // Funkcje publiczne
  const setPeriod = useCallback(
    (direction: "prev" | "next") => {
      setViewDate((current) => {
        const newDate = new Date(current);
        if (viewMode === "month") {
          newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
        } else {
          newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
        }
        return newDate;
      });
    },
    [viewMode]
  );

  const changeViewMode = useCallback((mode: "month" | "week") => {
    setViewMode(mode);
  }, []);

  const setDate = useCallback((date: Date) => {
    setViewDate(date);
  }, []);

  const openDayDrawer = useCallback((day: DayCellViewModel) => {
    setSelectedDayDate(day.dateString); // Ustaw datę w formacie YYYY-MM-DD
    setIsDayDrawerOpen(true);
  }, []);

  const closeDayDrawer = useCallback(() => {
    setIsDayDrawerOpen(false);
    setSelectedDayDate(null);
  }, []);

  const openAiDrawer = useCallback((date: Date) => {
    setSelectedDate(date);
    setIsAiDrawerOpen(true);
  }, []);

  const closeAiDrawer = useCallback(() => {
    setIsAiDrawerOpen(false);
    setSelectedDate(null);
  }, []);

  const refetch = useCallback(() => {
    // Wymusi ponowne pobranie danych przez zmianę zakresu (hack)
    setViewDate((current) => new Date(current));
  }, []);

  return {
    // Stan
    viewDate,
    viewMode,
    calendarDays,
    isLoading,
    error,
    range,
    trainingTypes,

    // Stan drawerów
    isDayDrawerOpen,
    isAiDrawerOpen,
    selectedDayDate, // YYYY-MM-DD dla DayDrawer
    selectedDate, // Date dla AISuggestionDrawer

    // Akcje
    setPeriod,
    setViewMode: changeViewMode,
    setDate,
    openDayDrawer,
    closeDayDrawer,
    openAiDrawer,
    closeAiDrawer,
    refetch,
  };
}
