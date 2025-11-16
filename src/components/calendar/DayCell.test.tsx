/**
 * Unit Tests for DayCell Component
 * Priority: HIGH - Core calendar cell logic and interactions
 *
 * Tests cover:
 * - MAX_VISIBLE_WORKOUTS logic (hasMoreWorkouts, visibleWorkouts, hiddenCount)
 * - Styling conditions (isToday, isCurrentMonth)
 * - Accessibility (aria-label construction)
 * - Click interactions (workout card, +N więcej button, dropdown)
 * - Event propagation (stopPropagation)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { DayCell } from "./DayCell";
import type { DayCellViewModel, WorkoutViewModel } from "../../types/calendar";

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button data-testid="dropdown-item" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("./WorkoutCard", () => ({
  WorkoutCard: ({ workout, onWorkoutClick }: any) => (
    <div
      data-testid={`workout-card-${workout.id}`}
      onClick={(e) => {
        e.stopPropagation();
        onWorkoutClick?.(workout.id);
      }}
    >
      {workout.trainingType.name}
    </div>
  ),
}));

describe("DayCell", () => {
  // Helper to create mock WorkoutViewModel
  const createMockWorkout = (id: string, name: string, status = "planned"): WorkoutViewModel => ({
    id,
    status,
    training_type_code: "easy_run",
    planned_date: "2024-01-15",
    trainingType: {
      id: "1",
      code: "easy_run",
      name,
      description: "",
      default_color: "#3B82F6",
    },
    color: "bg-blue-500",
  });

  // Helper to create mock DayCellViewModel
  const createMockDay = (overrides?: Partial<DayCellViewModel>): DayCellViewModel => ({
    date: new Date(2024, 0, 15), // January 15, 2024
    dateString: "2024-01-15",
    isToday: false,
    isCurrentMonth: true,
    workouts: [],
    ...overrides,
  });

  const defaultProps = {
    day: createMockDay(),
    index: 0,
    onAddWorkout: vi.fn(),
    onAddWorkoutManual: vi.fn(),
    onOpenDay: vi.fn(),
    onWorkoutClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering - Basic Structure", () => {
    it("should render day number", () => {
      render(<DayCell {...defaultProps} />);

      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("should render with correct role and data-day-index", () => {
      const { container } = render(<DayCell {...defaultProps} />);

      const cell = container.querySelector('[role="gridcell"]');
      expect(cell).toHaveAttribute("data-day-index", "0");
    });

    it("should always render add workout dropdown", () => {
      render(<DayCell {...defaultProps} />);

      expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
      expect(screen.getByText("+")).toBeInTheDocument();
    });
  });

  describe("MAX_VISIBLE_WORKOUTS Logic", () => {
    it("should show all workouts when count <= 2", () => {
      const workouts = [createMockWorkout("1", "Easy Run"), createMockWorkout("2", "Tempo Run")];
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} />);

      expect(screen.getByTestId("workout-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("workout-card-2")).toBeInTheDocument();
      expect(screen.queryByText(/więcej/)).not.toBeInTheDocument();
    });

    it("should show only first 2 workouts when count > 2", () => {
      const workouts = [
        createMockWorkout("1", "Easy Run"),
        createMockWorkout("2", "Tempo Run"),
        createMockWorkout("3", "Long Run"),
      ];
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} />);

      expect(screen.getByTestId("workout-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("workout-card-2")).toBeInTheDocument();
      expect(screen.queryByTestId("workout-card-3")).not.toBeInTheDocument();
    });

    it('should display "+1 więcej" button when 3 workouts exist', () => {
      const workouts = [
        createMockWorkout("1", "Easy Run"),
        createMockWorkout("2", "Tempo Run"),
        createMockWorkout("3", "Long Run"),
      ];
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} />);

      expect(screen.getByText("+1 więcej")).toBeInTheDocument();
    });

    it('should display "+3 więcej" button when 5 workouts exist', () => {
      const workouts = Array.from({ length: 5 }, (_, i) => createMockWorkout(`${i + 1}`, `Workout ${i + 1}`));
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} />);

      expect(screen.getByText("+3 więcej")).toBeInTheDocument();
    });

    it('should not show "+N więcej" when exactly 2 workouts', () => {
      const workouts = [createMockWorkout("1", "Easy Run"), createMockWorkout("2", "Tempo Run")];
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} />);

      expect(screen.queryByText(/więcej/)).not.toBeInTheDocument();
    });

    it('should not show "+N więcej" when 1 workout', () => {
      const workouts = [createMockWorkout("1", "Easy Run")];
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} />);

      expect(screen.queryByText(/więcej/)).not.toBeInTheDocument();
    });

    it('should not show "+N więcej" when 0 workouts', () => {
      const day = createMockDay({ workouts: [] });

      render(<DayCell {...defaultProps} day={day} />);

      expect(screen.queryByText(/więcej/)).not.toBeInTheDocument();
    });
  });

  describe("Styling Conditions", () => {
    it('should apply "today" styling when isToday is true', () => {
      const day = createMockDay({ isToday: true });
      const { container } = render(<DayCell {...defaultProps} day={day} />);

      const cell = container.querySelector('[role="gridcell"]');
      expect(cell?.className).toContain("ring-2");
      expect(cell?.className).toContain("ring-blue-500");
      expect(cell?.className).toContain("bg-blue-50/30");
    });

    it("should display day number in blue circle when isToday", () => {
      const day = createMockDay({ isToday: true });
      render(<DayCell {...defaultProps} day={day} />);

      const dayNumber = screen.getByText("15");
      expect(dayNumber.className).toContain("bg-blue-500");
      expect(dayNumber.className).toContain("text-white");
      expect(dayNumber.className).toContain("rounded-full");
    });

    it("should apply muted styling when isCurrentMonth is false", () => {
      const day = createMockDay({ isCurrentMonth: false });
      const { container } = render(<DayCell {...defaultProps} day={day} />);

      const cell = container.querySelector('[role="gridcell"]');
      expect(cell?.className).toContain("bg-gray-50");
      expect(cell?.className).toContain("text-gray-400");
      expect(cell?.className).toContain("opacity-60");
    });

    it("should not apply special styling when isToday=false and isCurrentMonth=true", () => {
      const day = createMockDay({ isToday: false, isCurrentMonth: true });
      const { container } = render(<DayCell {...defaultProps} day={day} />);

      const cell = container.querySelector('[role="gridcell"]');
      expect(cell?.className).not.toContain("ring-blue-500");
      expect(cell?.className).toContain("bg-white");
      // Note: bg-gray-50 appears in hover state (hover:bg-gray-50), which is expected
      expect(cell?.className).toContain("hover:bg-gray-50");
    });

    it("should set tabIndex=0 only when isToday", () => {
      const todayDay = createMockDay({ isToday: true });
      const { container: todayContainer } = render(<DayCell {...defaultProps} day={todayDay} />);

      const todayCell = todayContainer.querySelector('[role="gridcell"]');
      expect(todayCell).toHaveAttribute("tabindex", "0");

      const normalDay = createMockDay({ isToday: false });
      const { container: normalContainer } = render(<DayCell {...defaultProps} day={normalDay} />);

      const normalCell = normalContainer.querySelector('[role="gridcell"]');
      expect(normalCell).toHaveAttribute("tabindex", "-1");
    });
  });

  describe("Accessibility - aria-label", () => {
    it("should construct aria-label with day, month, and weekday", () => {
      const day = createMockDay();
      const { container } = render(<DayCell {...defaultProps} day={day} />);

      const cell = container.querySelector('[role="gridcell"]');
      const ariaLabel = cell?.getAttribute("aria-label");

      expect(ariaLabel).toContain("poniedziałek"); // Weekday
      expect(ariaLabel).toContain("15"); // Day
      expect(ariaLabel).toContain("stycznia"); // Month
      // Polish locale format may or may not include year depending on browser
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel!.length).toBeGreaterThan(10);
    });

    it("should include workout count in aria-label when 1 workout", () => {
      const workouts = [createMockWorkout("1", "Easy Run")];
      const day = createMockDay({ workouts });
      const { container } = render(<DayCell {...defaultProps} day={day} />);

      const cell = container.querySelector('[role="gridcell"]');
      const ariaLabel = cell?.getAttribute("aria-label");

      expect(ariaLabel).toContain("1 trening");
    });

    it('should use "treningi" plural for 2-4 workouts', () => {
      const workouts = [
        createMockWorkout("1", "Easy Run"),
        createMockWorkout("2", "Tempo Run"),
        createMockWorkout("3", "Long Run"),
      ];
      const day = createMockDay({ workouts });
      const { container } = render(<DayCell {...defaultProps} day={day} />);

      const cell = container.querySelector('[role="gridcell"]');
      const ariaLabel = cell?.getAttribute("aria-label");

      expect(ariaLabel).toContain("3 treningi");
    });

    it("should not include workout count when 0 workouts", () => {
      const day = createMockDay({ workouts: [] });
      const { container } = render(<DayCell {...defaultProps} day={day} />);

      const cell = container.querySelector('[role="gridcell"]');
      const ariaLabel = cell?.getAttribute("aria-label");

      expect(ariaLabel).not.toContain("trening");
    });
  });

  describe("Click Interactions - Workout Card", () => {
    it("should call onWorkoutClick when workout card is clicked", async () => {
      const user = userEvent.setup();
      const onWorkoutClick = vi.fn();
      const workouts = [createMockWorkout("workout-123", "Easy Run")];
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} onWorkoutClick={onWorkoutClick} />);

      const workoutCard = screen.getByTestId("workout-card-workout-123");
      await user.click(workoutCard);

      expect(onWorkoutClick).toHaveBeenCalledTimes(1);
      expect(onWorkoutClick).toHaveBeenCalledWith("workout-123");
    });

    it("should not call onOpenDay when workout card is clicked", async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      const workouts = [createMockWorkout("1", "Easy Run")];
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} onOpenDay={onOpenDay} />);

      const workoutCard = screen.getByTestId("workout-card-1");
      await user.click(workoutCard);

      expect(onOpenDay).not.toHaveBeenCalled();
    });
  });

  describe("Click Interactions - +N więcej Button", () => {
    it('should call onOpenDay when "+N więcej" button is clicked', async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      const workouts = Array.from({ length: 3 }, (_, i) => createMockWorkout(`${i + 1}`, `Workout ${i + 1}`));
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} onOpenDay={onOpenDay} />);

      const moreButton = screen.getByText("+1 więcej");
      await user.click(moreButton);

      expect(onOpenDay).toHaveBeenCalledTimes(1);
      expect(onOpenDay).toHaveBeenCalledWith(day);
    });

    it('should stop event propagation when "+N więcej" is clicked', async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      const workouts = Array.from({ length: 4 }, (_, i) => createMockWorkout(`${i + 1}`, `Workout ${i + 1}`));
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} onOpenDay={onOpenDay} />);

      const moreButton = screen.getByText("+2 więcej");
      await user.click(moreButton);

      // onOpenDay should be called exactly once (not bubbled to cell)
      expect(onOpenDay).toHaveBeenCalledTimes(1);
    });
  });

  describe("Click Interactions - Dropdown Menu", () => {
    it("should render both dropdown options", () => {
      render(<DayCell {...defaultProps} />);

      expect(screen.getByText("Generuj z AI")).toBeInTheDocument();
      expect(screen.getByText("Dodaj ręcznie")).toBeInTheDocument();
    });

    it('should call onAddWorkout when "Generuj z AI" is clicked', async () => {
      const user = userEvent.setup();
      const onAddWorkout = vi.fn();
      const day = createMockDay();

      render(<DayCell {...defaultProps} day={day} onAddWorkout={onAddWorkout} />);

      const aiOption = screen.getByText("Generuj z AI");
      await user.click(aiOption);

      expect(onAddWorkout).toHaveBeenCalledTimes(1);
      expect(onAddWorkout).toHaveBeenCalledWith(day.date);
    });

    it('should call onAddWorkoutManual when "Dodaj ręcznie" is clicked', async () => {
      const user = userEvent.setup();
      const onAddWorkoutManual = vi.fn();
      const day = createMockDay();

      render(<DayCell {...defaultProps} day={day} onAddWorkoutManual={onAddWorkoutManual} />);

      const manualOption = screen.getByText("Dodaj ręcznie");
      await user.click(manualOption);

      expect(onAddWorkoutManual).toHaveBeenCalledTimes(1);
      expect(onAddWorkoutManual).toHaveBeenCalledWith(day.date);
    });

    it("should not call onOpenDay when dropdown is clicked", async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();

      render(<DayCell {...defaultProps} onOpenDay={onOpenDay} />);

      const dropdown = screen.getByTestId("dropdown-trigger");
      await user.click(dropdown);

      expect(onOpenDay).not.toHaveBeenCalled();
    });
  });

  describe("Click Interactions - Cell Background", () => {
    it("should call onOpenDay when cell with >2 workouts is clicked", async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      const workouts = Array.from({ length: 3 }, (_, i) => createMockWorkout(`${i + 1}`, `Workout ${i + 1}`));
      const day = createMockDay({ workouts });

      const { container } = render(<DayCell {...defaultProps} day={day} onOpenDay={onOpenDay} />);

      const cell = container.querySelector('[role="gridcell"]') as HTMLElement;
      await user.click(cell);

      expect(onOpenDay).toHaveBeenCalledTimes(1);
      expect(onOpenDay).toHaveBeenCalledWith(day);
    });

    it("should not call onOpenDay when cell with <=2 workouts is clicked", async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      const workouts = [createMockWorkout("1", "Easy Run")];
      const day = createMockDay({ workouts });

      const { container } = render(<DayCell {...defaultProps} day={day} onOpenDay={onOpenDay} />);

      const cell = container.querySelector('[role="gridcell"]') as HTMLElement;
      await user.click(cell);

      expect(onOpenDay).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined onWorkoutClick gracefully", async () => {
      const user = userEvent.setup();
      const workouts = [createMockWorkout("1", "Easy Run")];
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} onWorkoutClick={undefined} />);

      const workoutCard = screen.getByTestId("workout-card-1");

      // Should not throw error
      await expect(user.click(workoutCard)).resolves.not.toThrow();
    });

    it("should handle undefined onAddWorkoutManual gracefully", async () => {
      const user = userEvent.setup();
      render(<DayCell {...defaultProps} onAddWorkoutManual={undefined} />);

      const manualOption = screen.getByText("Dodaj ręcznie");

      // Should not throw error
      await expect(user.click(manualOption)).resolves.not.toThrow();
    });

    it("should handle very large workout counts", () => {
      const workouts = Array.from({ length: 100 }, (_, i) => createMockWorkout(`${i + 1}`, `Workout ${i + 1}`));
      const day = createMockDay({ workouts });

      render(<DayCell {...defaultProps} day={day} />);

      // Should show only first 2
      expect(screen.getByTestId("workout-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("workout-card-2")).toBeInTheDocument();

      // Should show +98 więcej
      expect(screen.getByText("+98 więcej")).toBeInTheDocument();
    });
  });
});
