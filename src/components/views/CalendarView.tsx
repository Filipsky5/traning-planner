import { useState } from "react";
import { useCalendar } from "../hooks/useCalendar";
import { CalendarHeader } from "../calendar/CalendarHeader";
import { CalendarGrid } from "../calendar/CalendarGrid";
import { DayDrawer } from "../calendar/DayDrawer";
import { AISuggestionDrawer } from "../suggestions/AISuggestionDrawer";
import { WorkoutDetailDrawer } from "../calendar/WorkoutDetailDrawer";
import { ManualWorkoutDrawer } from "../calendar/ManualWorkoutDrawer";

/**
 * Główny komponent widoku kalendarza
 * Zarządza stanem za pomocą hooka useCalendar i renderuje komponenty podrzędne
 */
export function CalendarView() {
  const {
    viewDate,
    viewMode,
    calendarDays,
    isLoading,
    error,
    trainingTypes,
    setPeriod,
    setViewMode,
    setDate,
    openDayDrawer,
    closeDayDrawer,
    openAiDrawer,
    closeAiDrawer,
    isDayDrawerOpen,
    isAiDrawerOpen,
    selectedDayDate,
    selectedDate,
    refetch,
  } = useCalendar();

  // State dla workout detail drawer
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);

  const handleWorkoutClick = (workoutId: string) => {
    setSelectedWorkoutId(workoutId);
  };

  const closeWorkoutDrawer = () => {
    setSelectedWorkoutId(null);
  };

  // State dla manual workout drawer
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false);
  const [selectedManualDate, setSelectedManualDate] = useState<Date | null>(null);

  const handleAddWorkoutManual = (date: Date) => {
    setSelectedManualDate(date);
    setIsManualDrawerOpen(true);
  };

  const closeManualDrawer = () => {
    setIsManualDrawerOpen(false);
    setSelectedManualDate(null);
  };

  // Obsługa błędów
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Wystąpił błąd</h2>
          <p className="text-gray-600">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Odśwież stronę
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4" data-testid="calendar-view">
      <div className="max-w-7xl mx-auto">
        {/* Nagłówek kalendarza */}
        <CalendarHeader
          currentDate={viewDate}
          viewMode={viewMode}
          onPeriodChange={setPeriod}
          onViewModeChange={setViewMode}
          onDateSelect={setDate}
        />

        {/* Siatka kalendarza */}
        <div className="mt-4">
          <CalendarGrid
            days={calendarDays}
            isLoading={isLoading}
            onAddWorkout={(date) => openAiDrawer(date)}
            onAddWorkoutManual={handleAddWorkoutManual}
            onOpenDay={openDayDrawer}
            onWorkoutClick={handleWorkoutClick}
          />
        </div>

        {/* Panel z treningami dnia */}
        <DayDrawer
          selectedDate={selectedDayDate}
          trainingTypes={trainingTypes}
          onOpenChange={(isOpen) => !isOpen && closeDayDrawer()}
          onAddWorkout={(dateString) => {
            // Konwertuj YYYY-MM-DD string na Date object
            const date = new Date(dateString + "T00:00:00");
            openAiDrawer(date);
          }}
        />

        {/* Panel generowania sugestii AI */}
        {selectedDate && (
          <AISuggestionDrawer
            isOpen={isAiDrawerOpen}
            onOpenChange={(open) => !open && closeAiDrawer()}
            initialData={{
              plannedDate: selectedDate,
            }}
            trainingTypes={trainingTypes}
            onSuggestionAccepted={refetch}
          />
        )}

        {/* Panel szczegółów treningu */}
        <WorkoutDetailDrawer
          workoutId={selectedWorkoutId}
          trainingTypes={trainingTypes}
          onOpenChange={(open) => !open && closeWorkoutDrawer()}
          onWorkoutCompleted={refetch}
        />

        {/* Panel ręcznego dodawania treningu */}
        {selectedManualDate && (
          <ManualWorkoutDrawer
            isOpen={isManualDrawerOpen}
            onOpenChange={(open) => !open && closeManualDrawer()}
            initialDate={selectedManualDate}
            trainingTypes={trainingTypes}
            onWorkoutCreated={() => {
              // Odśwież dane kalendarza po dodaniu treningu
              refetch();
            }}
          />
        )}
      </div>
    </div>
  );
}
