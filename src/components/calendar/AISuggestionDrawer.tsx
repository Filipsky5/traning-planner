import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface AISuggestionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
}

/**
 * Panel boczny do generowania sugestii treningowych przez AI
 * Pozwala użytkownikowi wybrać typ treningu i wygenerować propozycję
 *
 * TODO: Pełna implementacja z integracją API /ai/suggestions
 * - Lista typów treningów do wyboru
 * - Wywołanie API do generowania sugestii
 * - Wyświetlanie wygenerowanej sugestii (steps, dystans, czas)
 * - Akcje: Zaakceptuj, Odrzuć, Regeneruj
 */
export function AISuggestionDrawer({
  isOpen,
  onClose,
  selectedDate,
}: AISuggestionDrawerProps) {
  if (!selectedDate) return null;

  // Formatuj datę do wyświetlenia
  const formattedDate = selectedDate.toLocaleDateString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Sugestia treningu AI</SheetTitle>
          <SheetDescription className="capitalize">
            {formattedDate}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Placeholder - pełna implementacja w kolejnym kroku */}
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">
              Funkcja generowania sugestii AI będzie dostępna wkrótce.
            </p>
            <p className="text-sm text-gray-400">
              Tutaj będzie można:
            </p>
            <ul className="text-sm text-gray-400 list-disc list-inside mt-2">
              <li>Wybrać typ treningu</li>
              <li>Wygenerować propozycję od AI</li>
              <li>Zaakceptować lub odrzucić sugestię</li>
              <li>Poprosić o regenerację z korektą</li>
            </ul>
          </div>

          <Button onClick={onClose} variant="outline" className="w-full">
            Zamknij
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
