import { useState } from "react";
import { toast } from "sonner";
import type { UserGoalDto, UserGoalUpsertCommand } from "../../../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface GoalFormProps {
  initialGoal: UserGoalDto | null;
  isSubmitting: boolean;
  onSave: (data: UserGoalUpsertCommand) => Promise<void>;
  onDelete: () => Promise<void>;
}

/**
 * Formularz zarządzania celem użytkownika
 * Obsługuje cel dystansowy oraz opcję "biegam dla zdrowia"
 */
export function GoalForm({ initialGoal, isSubmitting, onSave, onDelete }: GoalFormProps) {
  // Stan formularza
  const [goalChoice, setGoalChoice] = useState<"distance" | "health">(initialGoal ? "distance" : "health");
  const [targetDistanceKm, setTargetDistanceKm] = useState<string>(
    initialGoal ? (initialGoal.target_distance_m / 1000).toString() : ""
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialGoal ? new Date(initialGoal.due_date + "T00:00:00") : undefined
  );
  const [notes, setNotes] = useState<string>(initialGoal?.notes || "");

  // Stan dla modala potwierdzającego usunięcie
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Stan błędów walidacji
  const [errors, setErrors] = useState<{
    distance?: string;
    date?: string;
    notes?: string;
  }>({});

  // Walidacja formularza
  const validate = (): boolean => {
    if (goalChoice === "health") {
      return true; // Brak walidacji dla opcji "dla zdrowia"
    }

    const newErrors: typeof errors = {};

    // Walidacja dystansu
    const distance = parseFloat(targetDistanceKm);
    if (isNaN(distance) || distance <= 0 || distance > 1000) {
      newErrors.distance = "Dystans musi być w przedziale 0.1 - 1000 km";
    }

    // Walidacja daty
    if (!dueDate) {
      newErrors.date = "Data jest wymagana";
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        newErrors.date = "Data nie może być z przeszłości";
      }
    }

    // Walidacja notatek
    if (notes.length > 500) {
      newErrors.notes = "Notatki mogą mieć maksymalnie 500 znaków";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handler zapisu
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Jeśli użytkownik wybrał "dla zdrowia" i cel istniał - usuń cel
    if (goalChoice === "health" && initialGoal) {
      try {
        await onDelete();
        toast.success("Cel został usunięty!");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Nie udało się usunąć celu";
        toast.error(errorMessage);
        console.error("Error deleting goal:", err);
      }
      return;
    }

    // Jeśli użytkownik wybrał "dla zdrowia" i cel nie istniał - nic nie rób
    if (goalChoice === "health") {
      return;
    }

    // Walidacja
    if (!validate()) {
      return;
    }

    // Transformacja danych (km → metry)
    const data: UserGoalUpsertCommand = {
      goal_type: "distance_by_date",
      target_distance_m: parseFloat(targetDistanceKm) * 1000,
      due_date: dueDate!.toISOString().split("T")[0],
      notes: notes.trim() || undefined,
    };

    try {
      await onSave(data);
      toast.success("Cel został zapisany!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Nie udało się zapisać celu";
      toast.error(errorMessage);
      console.error("Error saving goal:", err);
    }
  };

  // Handler usunięcia
  const handleDelete = async () => {
    try {
      await onDelete();
      setIsDeleteDialogOpen(false);
      toast.success("Cel został usunięty!");

      // Zresetuj formularz
      setGoalChoice("health");
      setTargetDistanceKm("");
      setDueDate(undefined);
      setNotes("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Nie udało się usunąć celu";
      toast.error(errorMessage);
      console.error("Error deleting goal:", err);
    }
  };

  // Formatowanie daty dla wyświetlenia
  const formatDate = (date: Date | undefined): string => {
    if (!date) return "Wybierz datę";
    return date.toLocaleDateString("pl-PL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Mój cel treningowy</CardTitle>
          <CardDescription>Zdefiniuj swój cel lub powiedz nam, że biegasz dla zdrowia</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* RadioGroup - wybór typu celu */}
            <div className="space-y-3">
              <Label>Co Cię motywuje do biegania?</Label>
              <RadioGroup
                value={goalChoice}
                onValueChange={(value) => {
                  setGoalChoice(value as "distance" | "health");
                  setErrors({}); // Wyczyść błędy przy zmianie
                }}
                disabled={isSubmitting}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="distance" id="distance" />
                  <Label htmlFor="distance" className="font-normal cursor-pointer">
                    Mam konkretny cel (dystans do przebieżenia)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="health" id="health" />
                  <Label htmlFor="health" className="font-normal cursor-pointer">
                    Biegam dla zdrowia i dobrego samopoczucia
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Pola formularza - widoczne tylko dla celu dystansowego */}
            {goalChoice === "distance" && (
              <div className="space-y-4 border-t pt-4">
                {/* Dystans */}
                <div className="space-y-2">
                  <Label htmlFor="distance-input">
                    Dystans do przebiegnięcia (km) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="distance-input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="1000"
                    value={targetDistanceKm}
                    onChange={(e) => {
                      setTargetDistanceKm(e.target.value);
                      setErrors((prev) => ({ ...prev, distance: undefined }));
                    }}
                    disabled={isSubmitting}
                    placeholder="np. 42.195"
                    className={errors.distance ? "border-red-500" : ""}
                  />
                  {errors.distance && <p className="text-sm text-red-600">{errors.distance}</p>}
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <Label>
                    Data, do której chcę osiągnąć cel <span className="text-red-500">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal ${
                          !dueDate && "text-muted-foreground"
                        } ${errors.date ? "border-red-500" : ""}`}
                        disabled={isSubmitting}
                      >
                        {formatDate(dueDate)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={(date) => {
                          setDueDate(date);
                          setErrors((prev) => ({ ...prev, date: undefined }));
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return date < today;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
                </div>

                {/* Notatki */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notatki (opcjonalnie)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setErrors((prev) => ({ ...prev, notes: undefined }));
                    }}
                    disabled={isSubmitting}
                    placeholder="np. Chcę przebiec maraton w Warszawie"
                    maxLength={500}
                    rows={3}
                    className={errors.notes ? "border-red-500" : ""}
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{notes.length}/500 znaków</span>
                    {errors.notes && <span className="text-red-600">{errors.notes}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Przyciski akcji */}
            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Zapisywanie...
                  </>
                ) : (
                  "Zapisz"
                )}
              </Button>

              {initialGoal && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSubmitting}
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  Usuń cel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dialog potwierdzający usunięcie */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Czy na pewno chcesz usunąć cel?</DialogTitle>
            <DialogDescription>
              Ta operacja jest nieodwracalna. Twój cel treningowy zostanie trwale usunięty.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isSubmitting}>
              Anuluj
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Usuwanie...
                </>
              ) : (
                "Usuń"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
