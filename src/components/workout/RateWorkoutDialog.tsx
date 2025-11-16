/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import type { WorkoutRateCommand } from "../../types";

interface RateWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WorkoutRateCommand) => Promise<void>;
}

/**
 * Dialog do oceny ukończonego treningu
 * Prosty wybór jednej z trzech opcji: too_easy, just_right, too_hard
 */
export function RateWorkoutDialog({ open, onOpenChange, onSubmit }: RateWorkoutDialogProps) {
  const [rating, setRating] = useState<"too_easy" | "just_right" | "too_hard" | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  /**
   * Obsługa wysyłania formularza
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja: musi być wybrana ocena
    if (!rating) {
      setError("Proszę wybrać ocenę treningu");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await onSubmit({ rating });

      // Reset po sukcesie
      setRating("");
      onOpenChange(false);
    } catch (error) {
      // Błąd będzie obsłużony przez parent component
      console.error("Error in RateWorkoutDialog:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resetuj formularz przy zamknięciu
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      setRating("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Oceń trening</DialogTitle>
          <DialogDescription>
            Jak oceniasz trudność tego treningu? Twoja ocena pomoże AI w lepszym dostosowaniu przyszłych planów.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-6">
            <RadioGroup
              value={rating}
              onValueChange={(val) => {
                setRating(val as any);
                setError("");
              }}
            >
              {/* Opcja: Za łatwy */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors cursor-pointer">
                <RadioGroupItem value="too_easy" id="rate_too_easy" disabled={isSubmitting} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="rate_too_easy" className="font-semibold cursor-pointer block">
                    😊 Za łatwy
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">Trening był zbyt łatwy, możesz więcej</p>
                </div>
              </div>

              {/* Opcja: W sam raz */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer mt-3">
                <RadioGroupItem value="just_right" id="rate_just_right" disabled={isSubmitting} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="rate_just_right" className="font-semibold cursor-pointer block">
                    👍 W sam raz
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">Trening był odpowiedni dla twojego poziomu</p>
                </div>
              </div>

              {/* Opcja: Za trudny */}
              <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-colors cursor-pointer mt-3">
                <RadioGroupItem value="too_hard" id="rate_too_hard" disabled={isSubmitting} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="rate_too_hard" className="font-semibold cursor-pointer block">
                    😓 Za trudny
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">Trening był zbyt wymagający</p>
                </div>
              </div>
            </RadioGroup>

            {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Zapisywanie..." : "Zapisz ocenę"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
