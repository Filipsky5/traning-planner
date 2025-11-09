import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ConflictDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (newPosition: number) => void;
  isConfirming: boolean;
}

/**
 * Dialog wyświetlany gdy pozycja treningu jest już zajęta (konflikt 409)
 * Pozwala użytkownikowi wybrać nową pozycję i ponownie zaakceptować sugestię
 */
export function ConflictDialog({
  isOpen,
  onOpenChange,
  onConfirm,
  isConfirming,
}: ConflictDialogProps) {
  const [selectedPosition, setSelectedPosition] = useState<number>(2);

  // Dostępne pozycje (1-5)
  const availablePositions = [1, 2, 3, 4, 5];

  const handleConfirm = () => {
    onConfirm(selectedPosition);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Konflikt pozycji</DialogTitle>
          <DialogDescription>
            Na wybrany dzień istnieje już trening na pozycji 1. Wybierz inną
            pozycję, aby dodać ten trening.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informacja */}
          <div className="rounded-md bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Pozycja</span> określa kolejność
              treningu w ciągu dnia. Możesz mieć do 5 treningów dziennie.
            </p>
          </div>

          {/* Wybór pozycji */}
          <div className="space-y-3">
            <Label htmlFor="position-select">Wybierz nową pozycję</Label>
            <RadioGroup
              id="position-select"
              value={String(selectedPosition)}
              onValueChange={(value) => setSelectedPosition(Number(value))}
              disabled={isConfirming}
            >
              {availablePositions.map((position) => (
                <div
                  key={position}
                  className="flex items-center space-x-2 rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                >
                  <RadioGroupItem value={String(position)} id={`position-${position}`} />
                  <Label
                    htmlFor={`position-${position}`}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    <span className="font-medium">Pozycja {position}</span>
                    {position === 1 && (
                      <span className="ml-2 text-xs text-red-600">(zajęta)</span>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-x-2 sm:space-y-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
            className="w-full sm:w-auto"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConfirming || selectedPosition === 1}
            className="w-full sm:w-auto"
          >
            {isConfirming ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Zapisywanie...
              </>
            ) : (
              "Zmień pozycję i zaakceptuj"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
