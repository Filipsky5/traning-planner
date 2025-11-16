/**
 * Unit Tests for WorkoutDetailDrawer Component
 * Testing completion form validation, submission, and error handling
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { WorkoutDetailDrawer } from "./WorkoutDetailDrawer";
import * as useWorkoutDetailHook from "../hooks/useWorkoutDetail";
import type { WorkoutViewModel } from "../hooks/useWorkoutDetail";
import type { TrainingTypeDto, WorkoutDetailDto } from "@/types";

// Mock the useWorkoutDetail hook
vi.mock("../hooks/useWorkoutDetail", () => ({
  useWorkoutDetail: vi.fn(),
}));

// Mock UI components
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: any) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: any) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: any) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children }: any) => <h2>{children}</h2>,
  SheetDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, type }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} data-testid="button">
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, ...props }: any) => <input id={id} data-testid={`input-${id}`} {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("../workout/RateWorkoutDialog", () => ({
  RateWorkoutDialog: ({ open, onSubmit }: any) =>
    open ? (
      <div data-testid="rate-dialog">
        <button onClick={() => onSubmit({ rating: "just_right" })}>Submit Rating</button>
      </div>
    ) : null,
}));

describe("WorkoutDetailDrawer", () => {
  const mockTrainingTypes: TrainingTypeDto[] = [
    { code: "easy_run", name: "Bieg łatwy", is_active: true },
    { code: "tempo_run", name: "Bieg tempo", is_active: true },
  ];

  const mockWorkoutDetail: WorkoutDetailDto = {
    id: "workout-1",
    user_id: "user-1",
    training_type_code: "easy_run",
    planned_date: "2024-01-15",
    position: 1,
    planned_distance_m: 5000,
    planned_duration_s: 1800,
    distance_m: null,
    duration_s: null,
    avg_hr_bpm: null,
    avg_pace_s_per_km: null,
    rating: null,
    status: "planned",
    origin: "manual",
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
    completed_at: null,
    steps: [],
  };

  const mockWorkoutViewModel: WorkoutViewModel = {
    id: "workout-1",
    status: "planned",
    origin: "manual",
    rating: null,
    trainingTypeCode: "easy_run",
    detail: mockWorkoutDetail,
    plannedDateFormatted: "15.01.2024",
    completedAtFormatted: null,
    distanceFormatted: "5.00 km",
    durationFormatted: "30min 0s",
    paceFormatted: null,
  };

  const mockCompleteWorkout = vi.fn();
  const mockRefetch = vi.fn();

  const defaultProps = {
    workoutId: "workout-1",
    trainingTypes: mockTrainingTypes,
    onOpenChange: vi.fn(),
    onWorkoutCompleted: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkoutDetailHook.useWorkoutDetail).mockReturnValue({
      workout: mockWorkoutViewModel,
      isLoading: false,
      error: null,
      completeWorkout: mockCompleteWorkout,
      refetch: mockRefetch,
    });
  });

  describe("Rendering", () => {
    it("should render when workoutId is provided", () => {
      render(<WorkoutDetailDrawer {...defaultProps} />);

      expect(screen.getByTestId("sheet")).toBeInTheDocument();
      expect(screen.getByText("Szczegóły treningu")).toBeInTheDocument();
    });

    it("should not render when workoutId is null", () => {
      render(<WorkoutDetailDrawer {...defaultProps} workoutId={null} />);

      expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
    });

    it("should show loading state", () => {
      vi.mocked(useWorkoutDetailHook.useWorkoutDetail).mockReturnValue({
        workout: null,
        isLoading: true,
        error: null,
        completeWorkout: mockCompleteWorkout,
        refetch: mockRefetch,
      });

      render(<WorkoutDetailDrawer {...defaultProps} />);

      expect(screen.getByTestId("sheet")).toBeInTheDocument();
    });

    it("should show error state with retry button", () => {
      const mockError = new Error("Failed to load");
      vi.mocked(useWorkoutDetailHook.useWorkoutDetail).mockReturnValue({
        workout: null,
        isLoading: false,
        error: mockError,
        completeWorkout: mockCompleteWorkout,
        refetch: mockRefetch,
      });

      render(<WorkoutDetailDrawer {...defaultProps} />);

      expect(screen.getByText("Failed to load")).toBeInTheDocument();
      expect(screen.getByText("Spróbuj ponownie")).toBeInTheDocument();
    });
  });

  describe("CompletionForm - Display", () => {
    it('should show "Oznacz jako ukończony" button for planned workout', () => {
      render(<WorkoutDetailDrawer {...defaultProps} />);

      expect(screen.getByText("Oznacz jako ukończony")).toBeInTheDocument();
    });

    it("should not show completion button for completed workout", () => {
      const completedWorkout = {
        ...mockWorkoutViewModel,
        status: "completed" as const,
        detail: { ...mockWorkoutDetail, status: "completed" as const },
      };

      vi.mocked(useWorkoutDetailHook.useWorkoutDetail).mockReturnValue({
        workout: completedWorkout,
        isLoading: false,
        error: null,
        completeWorkout: mockCompleteWorkout,
        refetch: mockRefetch,
      });

      render(<WorkoutDetailDrawer {...defaultProps} />);

      expect(screen.queryByText("Oznacz jako ukończony")).not.toBeInTheDocument();
    });

    it('should show form when "Oznacz jako ukończony" is clicked', async () => {
      const user = userEvent.setup();
      render(<WorkoutDetailDrawer {...defaultProps} />);

      const button = screen.getByText("Oznacz jako ukończony");
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByLabelText(/Dystans \(metry\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Czas \(sekundy\)/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Średnie tętno \(bpm\)/i)).toBeInTheDocument();
      });
    });
  });

  describe("CompletionForm - Validation", () => {
    it("should reject distance below 100m", async () => {
      const user = userEvent.setup();
      render(<WorkoutDetailDrawer {...defaultProps} />);

      await user.click(screen.getByText("Oznacz jako ukończony"));

      const distanceInput = screen.getByTestId("input-distance");
      await user.clear(distanceInput);
      await user.type(distanceInput, "50");

      const submitButton = screen.getByText("Zapisz");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Dystans musi być większy lub równy 100 m/i)).toBeInTheDocument();
      });

      expect(mockCompleteWorkout).not.toHaveBeenCalled();
    });

    it("should reject distance above 100km", async () => {
      const user = userEvent.setup();
      render(<WorkoutDetailDrawer {...defaultProps} />);

      await user.click(screen.getByText("Oznacz jako ukończony"));

      const distanceInput = screen.getByTestId("input-distance");
      await user.clear(distanceInput);
      await user.type(distanceInput, "150000");

      const submitButton = screen.getByText("Zapisz");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Dystans nie może przekraczać 100 km/i)).toBeInTheDocument();
      });

      expect(mockCompleteWorkout).not.toHaveBeenCalled();
    });

    it("should reject duration below 5 minutes", async () => {
      const user = userEvent.setup();
      render(<WorkoutDetailDrawer {...defaultProps} />);

      await user.click(screen.getByText("Oznacz jako ukończony"));

      const durationInput = screen.getByTestId("input-duration");
      await user.clear(durationInput);
      await user.type(durationInput, "200");

      const submitButton = screen.getByText("Zapisz");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Czas musi wynosić co najmniej 5 minut/i)).toBeInTheDocument();
      });

      expect(mockCompleteWorkout).not.toHaveBeenCalled();
    });

    it("should reject duration above 6 hours", async () => {
      const user = userEvent.setup();
      render(<WorkoutDetailDrawer {...defaultProps} />);

      await user.click(screen.getByText("Oznacz jako ukończony"));

      const durationInput = screen.getByTestId("input-duration");
      await user.clear(durationInput);
      await user.type(durationInput, "25000");

      const submitButton = screen.getByText("Zapisz");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Czas nie może przekraczać 6 godzin/i)).toBeInTheDocument();
      });

      expect(mockCompleteWorkout).not.toHaveBeenCalled();
    });

    it("should reject heart rate above 240 bpm", async () => {
      const user = userEvent.setup();
      render(<WorkoutDetailDrawer {...defaultProps} />);

      await user.click(screen.getByText("Oznacz jako ukończony"));

      const hrInput = screen.getByTestId("input-hr");
      await user.clear(hrInput);
      await user.type(hrInput, "250");

      const submitButton = screen.getByText("Zapisz");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Tętno nie może przekraczać 240 bpm/i)).toBeInTheDocument();
      });

      expect(mockCompleteWorkout).not.toHaveBeenCalled();
    });

    it("should accept valid values", async () => {
      const user = userEvent.setup();
      mockCompleteWorkout.mockResolvedValue(undefined);

      render(<WorkoutDetailDrawer {...defaultProps} />);

      await user.click(screen.getByText("Oznacz jako ukończony"));

      const distanceInput = screen.getByTestId("input-distance");
      const durationInput = screen.getByTestId("input-duration");
      const hrInput = screen.getByTestId("input-hr");

      await user.clear(distanceInput);
      await user.type(distanceInput, "5000");

      await user.clear(durationInput);
      await user.type(durationInput, "1800");

      await user.clear(hrInput);
      await user.type(hrInput, "145");

      const submitButton = screen.getByText("Zapisz");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCompleteWorkout).toHaveBeenCalledWith(
          expect.objectContaining({
            distance_m: 5000,
            duration_s: 1800,
            avg_hr_bpm: 145,
          })
        );
      });
    });
  });

  describe("CompletionForm - Submission", () => {
    it("should hide form and show button after cancel", async () => {
      const user = userEvent.setup();

      render(<WorkoutDetailDrawer {...defaultProps} />);

      await user.click(screen.getByText("Oznacz jako ukończony"));

      expect(screen.getByText("Anuluj")).toBeInTheDocument();

      await user.click(screen.getByText("Anuluj"));

      await waitFor(() => {
        expect(screen.getByText("Oznacz jako ukończony")).toBeInTheDocument();
        expect(screen.queryByText("Anuluj")).not.toBeInTheDocument();
      });
    });
  });

  describe("CompletionForm - Default Values", () => {
    it("should prefill form with planned values", async () => {
      const user = userEvent.setup();

      render(<WorkoutDetailDrawer {...defaultProps} />);

      await user.click(screen.getByText("Oznacz jako ukończony"));

      await waitFor(() => {
        const distanceInput = screen.getByTestId("input-distance") as HTMLInputElement;
        const durationInput = screen.getByTestId("input-duration") as HTMLInputElement;

        expect(distanceInput.value).toBe("5000");
        expect(durationInput.value).toBe("1800");
      });
    });
  });
});
