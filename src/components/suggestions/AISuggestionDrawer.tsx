import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { AISuggestionViewModel } from "../../types/suggestions";
import { transformAISuggestion } from "../../types/suggestions";
import type { TrainingTypeDto } from "../../types";
import {
  generateSuggestion,
  acceptSuggestion,
  regenerateSuggestion,
  ApiError,
} from "../../lib/api/aiSuggestionsClient";
import { AISuggestionForm } from "./AISuggestionForm";
import { SuggestionPreview } from "./SuggestionPreview";
import { SuggestionControls } from "./SuggestionControls";
import { ExpiredSuggestionState } from "./ExpiredSuggestionState";
import { ConflictDialog } from "./ConflictDialog";

interface AISuggestionDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialData: {
    plannedDate: Date;
    trainingTypeCode?: string;
  };
  trainingTypes: TrainingTypeDto[];
  onSuggestionAccepted?: () => void; // Callback do odświeżenia kalendarza
}

/**
 * Główny komponent panelu sugestii AI
 * Zarządza stanem i orkiestruje przepływ między formularzem, podglądem i kontrolkami
 */
export function AISuggestionDrawer({
  isOpen,
  onOpenChange,
  initialData,
  trainingTypes,
  onSuggestionAccepted,
}: AISuggestionDrawerProps) {
  // Stan główny
  const [suggestion, setSuggestion] = useState<AISuggestionViewModel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [regenerationCount, setRegenerationCount] = useState<number>(0);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  // Reset stanu przy zamknięciu panelu
  useEffect(() => {
    if (!isOpen) {
      setSuggestion(null);
      setError(null);
      setRegenerationCount(0);
      setIsConflictDialogOpen(false);
    }
  }, [isOpen]);

  // Formatuje Date do YYYY-MM-DD dla API
  const formatDateForApi = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Handler generowania nowej sugestii
  const handleGenerate = async (data: { plannedDate: Date; trainingTypeCode: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateSuggestion({
        planned_date: formatDateForApi(data.plannedDate),
        training_type_code: data.trainingTypeCode,
      });

      const viewModel = transformAISuggestion(result);
      setSuggestion(viewModel);
      setRegenerationCount(0); // Reset licznika przy nowej sugestii
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(new Error("Wystąpił nieoczekiwany błąd podczas generowania sugestii"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handler akceptacji sugestii
  const handleAccept = async () => {
    if (!suggestion) return;

    setIsLoading(true);
    setError(null);

    try {
      await acceptSuggestion(suggestion.id, { position: 1 });

      // Wywołaj callback odświeżenia kalendarza
      onSuggestionAccepted?.();

      // Zamknij panel
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        // Jeśli konflikt pozycji - otwórz dialog
        if (err.isPositionConflict()) {
          setIsConflictDialogOpen(true);
        } else {
          setError(err);
        }
      } else {
        setError(new Error("Wystąpił nieoczekiwany błąd podczas akceptacji sugestii"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handler regeneracji sugestii
  const handleRegenerate = async () => {
    if (!suggestion || regenerationCount >= 3) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await regenerateSuggestion(suggestion.id, {
        reason: "User requested regeneration",
      });

      const viewModel = transformAISuggestion(result);
      setSuggestion(viewModel);
      setRegenerationCount((prev) => prev + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(new Error("Wystąpił nieoczekiwany błąd podczas regeneracji sugestii"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handler potwierdzenia zmiany pozycji (z ConflictDialog)
  const handleConflictConfirm = async (newPosition: number) => {
    if (!suggestion) return;

    setIsConfirming(true);
    setError(null);

    try {
      await acceptSuggestion(suggestion.id, { position: newPosition });

      // Zamknij dialog
      setIsConflictDialogOpen(false);

      // Wywołaj callback odświeżenia kalendarza
      onSuggestionAccepted?.();

      // Zamknij panel
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(new Error("Wystąpił nieoczekiwany błąd podczas akceptacji sugestii"));
      }
      // Zamknij dialog nawet jeśli błąd
      setIsConflictDialogOpen(false);
    } finally {
      setIsConfirming(false);
    }
  };

  // Formatuj datę dla nagłówka
  const formattedDate = initialData.plannedDate.toLocaleDateString("pl-PL", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Znajdź nazwę typu treningu (jeśli sugestia istnieje)
  const trainingTypeName = suggestion
    ? trainingTypes.find((t) => t.code === suggestion.trainingTypeCode)?.name
    : undefined;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Sugestia treningu AI</SheetTitle>
            <SheetDescription className="capitalize">{formattedDate}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 px-4">
            {/* Error state */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error.message}</p>
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              </div>
            )}

            {/* Formularz - pokazuj gdy nie ma sugestii */}
            {!suggestion && !isLoading && (
              <AISuggestionForm
                trainingTypes={trainingTypes}
                onSubmit={handleGenerate}
                isSubmitting={isLoading}
                initialData={initialData}
              />
            )}

            {/* Podgląd sugestii - pokazuj gdy mamy sugestię */}
            {suggestion && !isLoading && (
              <div className="space-y-4">
                <SuggestionPreview suggestion={suggestion} trainingTypeName={trainingTypeName} />

                {/* Kontrolki lub expired state */}
                {suggestion.isExpired ? (
                  <ExpiredSuggestionState
                    onGenerateNew={() => {
                      setSuggestion(null);
                      setRegenerationCount(0);
                    }}
                    isGenerating={isLoading}
                  />
                ) : (
                  <SuggestionControls
                    onAccept={handleAccept}
                    onRegenerate={handleRegenerate}
                    regenerationCount={regenerationCount}
                    isAccepting={isLoading}
                    isRegenerating={isLoading}
                  />
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Conflict Dialog */}
      <ConflictDialog
        isOpen={isConflictDialogOpen}
        onOpenChange={setIsConflictDialogOpen}
        onConfirm={handleConflictConfirm}
        isConfirming={isConfirming}
      />
    </>
  );
}
