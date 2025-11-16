/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Unit Tests for WorkoutCard Component
 * Priority: HIGH - Status mapping and click interactions
 *
 * Tests cover:
 * - Status mapping to label and badge variant
 * - Click handler with correct workout.id
 * - Event stopPropagation
 * - AI badge display (future: origin === 'ai')
 * - Edge cases (unknown status, missing callback)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { WorkoutCard } from "./WorkoutCard";
import type { WorkoutViewModel } from "../../types/calendar";

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className, onClick }: any) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

describe("WorkoutCard", () => {
  // Helper to create mock WorkoutViewModel
  const createMockWorkout = (overrides?: Partial<WorkoutViewModel>): WorkoutViewModel => ({
    id: "workout-123",
    status: "planned",
    training_type_code: "easy_run",
    planned_date: "2024-01-15",
    trainingType: {
      id: "1",
      code: "easy_run",
      name: "Easy Run",
      description: "",
      default_color: "#3B82F6",
    },
    color: "bg-blue-500",
    ...overrides,
  });

  const defaultProps = {
    workout: createMockWorkout(),
    onWorkoutClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering - Basic Structure", () => {
    it("should render workout card with training type name", () => {
      render(<WorkoutCard {...defaultProps} />);

      expect(screen.getByText("Easy Run")).toBeInTheDocument();
    });

    it("should render with cursor-pointer and hover styles", () => {
      render(<WorkoutCard {...defaultProps} />);

      const card = screen.getByTestId("card");
      expect(card.className).toContain("cursor-pointer");
      expect(card.className).toContain("hover:shadow-md");
    });

    it("should render color bar with workout color", () => {
      const workout = createMockWorkout({ color: "bg-red-500" });
      const { container } = render(<WorkoutCard {...defaultProps} workout={workout} />);

      const colorBar = container.querySelector(".bg-red-500");
      expect(colorBar).toBeInTheDocument();
      expect(colorBar?.className).toContain("w-1");
    });

    it("should display training type name truncated", () => {
      render(<WorkoutCard {...defaultProps} />);

      const nameElement = screen.getByText("Easy Run");
      expect(nameElement.className).toContain("truncate");
      expect(nameElement.className).toContain("font-medium");
    });
  });

  describe("Status Mapping - Labels and Variants", () => {
    it('should not show badge for "planned" status', () => {
      const workout = createMockWorkout({ status: "planned" });
      render(<WorkoutCard {...defaultProps} workout={workout} />);

      // planned has empty label, so no badge should be rendered
      const badges = screen.queryAllByTestId("badge");
      expect(badges).toHaveLength(0);
    });

    it('should show "Ukończony" badge with default variant for "completed" status', () => {
      const workout = createMockWorkout({ status: "completed" });
      render(<WorkoutCard {...defaultProps} workout={workout} />);

      const badge = screen.getByText("Ukończony");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-variant", "default");
    });

    it('should show "Pominięty" badge with secondary variant for "skipped" status', () => {
      const workout = createMockWorkout({ status: "skipped" });
      render(<WorkoutCard {...defaultProps} workout={workout} />);

      const badge = screen.getByText("Pominięty");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-variant", "secondary");
    });

    it('should show "Anulowany" badge with destructive variant for "cancelled" status', () => {
      const workout = createMockWorkout({ status: "cancelled" });
      render(<WorkoutCard {...defaultProps} workout={workout} />);

      const badge = screen.getByText("Anulowany");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-variant", "destructive");
    });

    it("should handle unknown status by falling back to planned (no badge)", () => {
      const workout = createMockWorkout({ status: "unknown_status" as any });
      render(<WorkoutCard {...defaultProps} workout={workout} />);

      const badges = screen.queryAllByTestId("badge");
      expect(badges).toHaveLength(0);
    });
  });

  describe("AI Badge Display", () => {
    it("should not show AI badge when isAiGenerated is false", () => {
      // Currently hardcoded to false in component
      render(<WorkoutCard {...defaultProps} />);

      expect(screen.queryByText("AI")).not.toBeInTheDocument();
    });

    // Future test when origin field is added to WorkoutViewModel
    it.skip('should show AI badge when workout.origin === "ai"', () => {
      const workout = createMockWorkout({ status: "planned" } as any);
      // @ts-ignore - origin field doesn't exist yet
      workout.origin = "ai";

      render(<WorkoutCard {...defaultProps} workout={workout} />);

      const aiBadge = screen.getByText("AI");
      expect(aiBadge).toBeInTheDocument();
      expect(aiBadge).toHaveAttribute("data-variant", "outline");
      expect(aiBadge.className).toContain("border-purple-300");
      expect(aiBadge.className).toContain("text-purple-700");
    });

    it.skip("should show both status and AI badge when both apply", () => {
      const workout = createMockWorkout({ status: "completed" } as any);
      // @ts-ignore
      workout.origin = "ai";

      render(<WorkoutCard {...defaultProps} workout={workout} />);

      expect(screen.getByText("Ukończony")).toBeInTheDocument();
      expect(screen.getByText("AI")).toBeInTheDocument();
    });
  });

  describe("Click Interactions", () => {
    it("should call onWorkoutClick with correct workout.id when clicked", async () => {
      const user = userEvent.setup();
      const onWorkoutClick = vi.fn();
      const workout = createMockWorkout({ id: "workout-456" });

      render(<WorkoutCard {...defaultProps} workout={workout} onWorkoutClick={onWorkoutClick} />);

      const card = screen.getByTestId("card");
      await user.click(card);

      expect(onWorkoutClick).toHaveBeenCalledTimes(1);
      expect(onWorkoutClick).toHaveBeenCalledWith("workout-456");
    });

    it("should call onWorkoutClick for different workouts", async () => {
      const user = userEvent.setup();
      const onWorkoutClick = vi.fn();

      const workout1 = createMockWorkout({ id: "workout-1" });
      const workout2 = createMockWorkout({ id: "workout-2" });

      const { rerender } = render(<WorkoutCard {...defaultProps} workout={workout1} onWorkoutClick={onWorkoutClick} />);

      await user.click(screen.getByTestId("card"));
      expect(onWorkoutClick).toHaveBeenCalledWith("workout-1");

      rerender(<WorkoutCard {...defaultProps} workout={workout2} onWorkoutClick={onWorkoutClick} />);

      await user.click(screen.getByTestId("card"));
      expect(onWorkoutClick).toHaveBeenCalledWith("workout-2");
      expect(onWorkoutClick).toHaveBeenCalledTimes(2);
    });

    it("should not call onWorkoutClick when callback is undefined", async () => {
      const user = userEvent.setup();
      render(<WorkoutCard {...defaultProps} onWorkoutClick={undefined} />);

      const card = screen.getByTestId("card");

      // Should not throw error
      await expect(user.click(card)).resolves.not.toThrow();
    });

    it("should stop event propagation on click", async () => {
      const user = userEvent.setup();
      const onWorkoutClick = vi.fn();
      const onParentClick = vi.fn();

      const { container } = render(
        <div onClick={onParentClick}>
          <WorkoutCard {...defaultProps} onWorkoutClick={onWorkoutClick} />
        </div>
      );

      const card = screen.getByTestId("card");
      await user.click(card);

      expect(onWorkoutClick).toHaveBeenCalledTimes(1);
      // Parent click should not be triggered due to stopPropagation
      expect(onParentClick).not.toHaveBeenCalled();
    });
  });

  describe("Visual Styling", () => {
    it("should apply correct badge height for all status badges", () => {
      const statuses = ["completed", "skipped", "cancelled"] as const;

      statuses.forEach((status) => {
        const workout = createMockWorkout({ status });
        const { container } = render(<WorkoutCard {...defaultProps} workout={workout} />);

        const badge = screen.getByTestId("badge");
        expect(badge.className).toContain("text-xs");
        expect(badge.className).toContain("h-5");

        container.remove();
      });
    });

    it("should render color bar with flex-shrink-0 and self-stretch", () => {
      const { container } = render(<WorkoutCard {...defaultProps} />);

      const colorBar = container.querySelector(".w-1");
      expect(colorBar?.className).toContain("flex-shrink-0");
      expect(colorBar?.className).toContain("self-stretch");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long training type names with truncation", () => {
      const workout = createMockWorkout({
        trainingType: {
          id: "1",
          code: "custom",
          name: "Very Long Training Type Name That Should Be Truncated Because It Is Too Long",
          description: "",
          default_color: "#000000",
        },
      });

      render(<WorkoutCard {...defaultProps} workout={workout} />);

      const nameElement = screen.getByText(/Very Long Training Type/);
      expect(nameElement.className).toContain("truncate");
    });

    it("should handle missing trainingType name gracefully", () => {
      const workout = createMockWorkout({
        trainingType: {
          id: "1",
          code: "test",
          name: "",
          description: "",
          default_color: "#000000",
        },
      });

      render(<WorkoutCard {...defaultProps} workout={workout} />);

      // Should render without error, empty name should be in DOM
      expect(screen.getByTestId("card")).toBeInTheDocument();
    });

    it("should handle rapid consecutive clicks", async () => {
      const user = userEvent.setup();
      const onWorkoutClick = vi.fn();

      render(<WorkoutCard {...defaultProps} onWorkoutClick={onWorkoutClick} />);

      const card = screen.getByTestId("card");

      // Click 5 times rapidly
      await user.click(card);
      await user.click(card);
      await user.click(card);
      await user.click(card);
      await user.click(card);

      expect(onWorkoutClick).toHaveBeenCalledTimes(5);
      expect(onWorkoutClick).toHaveBeenCalledWith("workout-123");
    });

    it("should maintain correct status mapping after re-renders", () => {
      const workout = createMockWorkout({ status: "planned" });
      const { rerender } = render(<WorkoutCard {...defaultProps} workout={workout} />);

      expect(screen.queryByTestId("badge")).not.toBeInTheDocument();

      const completedWorkout = createMockWorkout({ status: "completed" });
      rerender(<WorkoutCard {...defaultProps} workout={completedWorkout} />);

      expect(screen.getByText("Ukończony")).toBeInTheDocument();
      expect(screen.getByTestId("badge")).toHaveAttribute("data-variant", "default");
    });
  });

  describe("Accessibility", () => {
    it("should have appropriate interactive styles", () => {
      render(<WorkoutCard {...defaultProps} />);

      const card = screen.getByTestId("card");
      expect(card.className).toContain("cursor-pointer");
      expect(card.className).toContain("transition-all");
    });

    it("should be clickable for all status types", async () => {
      const user = userEvent.setup();
      const statuses = ["planned", "completed", "skipped", "cancelled"] as const;

      for (const status of statuses) {
        const onWorkoutClick = vi.fn();
        const workout = createMockWorkout({ status, id: `workout-${status}` });

        const { container } = render(
          <WorkoutCard {...defaultProps} workout={workout} onWorkoutClick={onWorkoutClick} />
        );

        await user.click(screen.getByTestId("card"));

        expect(onWorkoutClick).toHaveBeenCalledWith(`workout-${status}`);

        container.remove();
      }
    });
  });
});
