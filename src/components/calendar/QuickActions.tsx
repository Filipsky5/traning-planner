import { useState } from "react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  workoutId: string;
  status: "planned" | "completed" | "skipped" | "canceled";
  onSkip?: (workoutId: string) => void;
  onCancel?: (workoutId: string) => void;
}

/**
 * Przyciski szybkich akcji dla treningu
 * Renderowane tylko dla treningów ze statusem 'planned'
 */
export function QuickActions({ workoutId, status, onSkip, onCancel }: QuickActionsProps) {
  const [isSkipping, setIsSkipping] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  // Nie renderuj akcji jeśli trening nie jest w statusie 'planned'
  if (status !== "planned") {
    return null;
  }

  const handleSkip = async () => {
    if (!onSkip || !workoutId) return;

    setIsSkipping(true);
    try {
      await onSkip(workoutId);
    } finally {
      setIsSkipping(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel || !workoutId) return;

    setIsCanceling(true);
    try {
      await onCancel(workoutId);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <div className="flex gap-2 mt-2">
      <Button
        onClick={handleSkip}
        disabled={isSkipping || isCanceling}
        variant="outline"
        size="sm"
        className="flex-1 text-xs transition-all duration-200 hover:bg-gray-100"
      >
        {isSkipping ? (
          <>
            <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></div>
            Pomijanie...
          </>
        ) : (
          "Pomiń"
        )}
      </Button>
      <Button
        onClick={handleCancel}
        disabled={isSkipping || isCanceling}
        variant="destructive"
        size="sm"
        className="flex-1 text-xs transition-all duration-200"
      >
        {isCanceling ? (
          <>
            <div className="mr-1 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            Anulowanie...
          </>
        ) : (
          "Anuluj"
        )}
      </Button>
    </div>
  );
}
