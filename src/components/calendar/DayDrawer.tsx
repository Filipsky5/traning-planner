import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDayWorkouts } from "../hooks/useDayWorkouts";
import { DayDrawerContent } from "./DayDrawerContent";
import { skipWorkout, cancelWorkout, ApiError } from "../../lib/api/workoutsClient";

import type { TrainingTypeDto } from "../../types";

interface DayDrawerProps {
  selectedDate: string | null;
  trainingTypes?: TrainingTypeDto[]; // Opcjonalna lista typów treningów
  onOpenChange: (isOpen: boolean) => void;
  onAddWorkout?: (date: string) => void;
}

/**
 * Panel boczny wyświetlający wszystkie treningi dla wybranego dnia
 * Pobiera dane z API za pomocą useDayWorkouts hook
 * Obsługuje akcje: Skip, Cancel
 */
export function DayDrawer({ selectedDate, trainingTypes, onOpenChange, onAddWorkout }: DayDrawerProps) {
  // Hook pobierający treningi dla wybranego dnia
  const { workouts, isLoading, error, refetch, updateWorkoutStatus, removeWorkout } = useDayWorkouts(selectedDate);

  // Stan dla ładowania akcji
  const [actionInProgress, setActionInProgress] = useState(false);

  // Nie renderuj jeśli nie ma wybranej daty
  const isOpen = selectedDate !== null;

  // Formatuj datę do wyświetlenia
  const formattedDate = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("pl-PL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Sprawdź czy wybrana data to dzisiaj
  const isToday = selectedDate ? selectedDate === new Date().toISOString().split("T")[0] : false;

  // Handler zamknięcia drawera
  const handleClose = () => {
    onOpenChange(false);
  };

  // Handler dodawania treningu
  const handleAddWorkout = () => {
    if (selectedDate && onAddWorkout) {
      onAddWorkout(selectedDate);
      handleClose();
    }
  };

  // Handler pomijania treningu
  const handleSkip = async (workoutId: string) => {
    setActionInProgress(true);
    try {
      await skipWorkout(workoutId);

      // Optymistyczna aktualizacja UI
      updateWorkoutStatus(workoutId, "skipped");
    } catch (err) {
      console.error("Error skipping workout:", err);

      // Obsługa różnych typów błędów
      if (err instanceof ApiError) {
        if (err.isUnauthorized()) {
          alert("Sesja wygasła. Zaloguj się ponownie.");
          window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
        } else if (err.isNotFound()) {
          alert("Trening nie został znaleziony.");
        } else {
          alert(err.message || "Nie udało się pominąć treningu. Spróbuj ponownie.");
        }
      } else {
        alert("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      }
    } finally {
      setActionInProgress(false);
    }
  };

  // Handler anulowania treningu
  const handleCancel = async (workoutId: string) => {
    setActionInProgress(true);
    try {
      await cancelWorkout(workoutId);

      // Usuń trening z listy (canceled treningi są usuwane)
      removeWorkout(workoutId);
    } catch (err) {
      console.error("Error canceling workout:", err);

      // Obsługa różnych typów błędów
      if (err instanceof ApiError) {
        if (err.isUnauthorized()) {
          alert("Sesja wygasła. Zaloguj się ponownie.");
          window.location.href = `/login?redirectTo=${encodeURIComponent(window.location.pathname)}`;
        } else if (err.isNotFound()) {
          alert("Trening nie został znaleziony.");
        } else {
          alert(err.message || "Nie udało się anulować treningu. Spróbuj ponownie.");
        }
      } else {
        alert("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      }
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="capitalize">{formattedDate}</SheetTitle>
            {isToday && (
              <Badge variant="default" className="text-xs">
                Dzisiaj
              </Badge>
            )}
          </div>
          <SheetDescription>
            {isLoading
              ? "Ładowanie..."
              : workouts.length === 0
                ? "Brak zaplanowanych treningów"
                : `${workouts.length} ${workouts.length === 1 ? "trening" : workouts.length < 5 ? "treningi" : "treningów"}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Przycisk dodawania treningu */}
          {onAddWorkout && (
            <Button
              onClick={handleAddWorkout}
              disabled={actionInProgress}
              className="w-full transition-colors duration-200"
              variant="outline"
            >
              + Dodaj trening
            </Button>
          )}

          {/* Zawartość drawera */}
          <DayDrawerContent
            date={selectedDate || ""}
            workouts={workouts}
            trainingTypes={trainingTypes}
            isLoading={isLoading}
            error={error}
            onSkip={handleSkip}
            onCancel={handleCancel}
            onRetry={refetch}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
