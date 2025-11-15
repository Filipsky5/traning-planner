import { Button } from "@/components/ui/button";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: "month" | "week";
  onPeriodChange: (direction: "prev" | "next") => void;
  onViewModeChange: (mode: "month" | "week") => void;
  onDateSelect: (date: Date) => void;
}

/**
 * Pasek nawigacyjny kalendarza
 * Zawiera przyciski do zmiany okresu, przełącznik widoku oraz selektor daty
 */
export function CalendarHeader({
  currentDate,
  viewMode,
  onPeriodChange,
  onViewModeChange,
  onDateSelect,
}: CalendarHeaderProps) {
  // Formatuj tytuł na podstawie viewMode i currentDate
  const title =
    viewMode === "month"
      ? currentDate.toLocaleDateString("pl-PL", { month: "long", year: "numeric" })
      : `Tydzień ${getWeekNumber(currentDate)}, ${currentDate.getFullYear()}`;

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
      {/* Nawigacja poprzedni/następny */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPeriodChange("prev")} aria-label="Poprzedni okres">
          ←
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDateSelect(new Date())} className="min-w-[100px]">
          Dzisiaj
        </Button>
        <Button variant="outline" size="sm" onClick={() => onPeriodChange("next")} aria-label="Następny okres">
          →
        </Button>
      </div>

      {/* Tytuł */}
      <h2 className="text-xl font-semibold capitalize">{title}</h2>

      {/* Przełącznik widoku */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("week")}
        >
          Tydzień
        </Button>
        <Button
          variant={viewMode === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("month")}
        >
          Miesiąc
        </Button>
      </div>
    </div>
  );
}

/**
 * Helper: oblicza numer tygodnia w roku
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
