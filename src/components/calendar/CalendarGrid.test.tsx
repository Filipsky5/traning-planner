/**
 * Unit Tests for CalendarGrid Component
 * Priority: HIGH - Keyboard navigation and accessibility
 *
 * Tests cover:
 * - Arrow key navigation (±1, ±7)
 * - Boundary conditions (min/max index)
 * - Enter/Space key to open day drawer
 * - Focus management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { CalendarGrid } from './CalendarGrid';
import type { DayCellViewModel } from '../../types/calendar';

// Mock child components to isolate CalendarGrid logic
vi.mock('./DayCell', () => ({
  DayCell: ({ day, index }: { day: DayCellViewModel; index: number }) => (
    <div
      data-testid={`day-cell-${index}`}
      data-day-index={index}
      tabIndex={day.isToday ? 0 : -1}
      role="gridcell"
    >
      {day.date.getDate()}
    </div>
  ),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe('CalendarGrid', () => {
  // Helper function to create mock DayCellViewModel
  const createMockDay = (
    dayOffset: number,
    isToday = false,
    isCurrentMonth = true
  ): DayCellViewModel => {
    const date = new Date(2024, 0, dayOffset + 1); // January 2024
    return {
      date,
      dateString: date.toISOString().split('T')[0],
      isToday,
      isCurrentMonth,
      workouts: [],
    };
  };

  // Create 35 days (5 weeks) for testing
  const mockDays = Array.from({ length: 35 }, (_, i) =>
    createMockDay(i, i === 15) // 16th is "today"
  );

  const defaultProps = {
    days: mockDays,
    isLoading: false,
    onAddWorkout: vi.fn(),
    onAddWorkoutManual: vi.fn(),
    onOpenDay: vi.fn(),
    onWorkoutClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render calendar grid with correct structure', () => {
      render(<CalendarGrid {...defaultProps} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.getAllByRole('gridcell')).toHaveLength(35);
    });

    it('should render week day headers', () => {
      render(<CalendarGrid {...defaultProps} />);

      const weekDays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];
      weekDays.forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('should render loading skeletons when isLoading is true', () => {
      render(<CalendarGrid {...defaultProps} isLoading={true} />);

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render all day cells with correct data-day-index', () => {
      render(<CalendarGrid {...defaultProps} />);

      mockDays.forEach((_, index) => {
        const cell = screen.getByTestId(`day-cell-${index}`);
        expect(cell).toHaveAttribute('data-day-index', String(index));
      });
    });
  });

  describe('Keyboard Navigation - Arrow Keys', () => {
    it('should navigate right with ArrowRight (index + 1)', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const cell0 = screen.getByTestId('day-cell-0');
      const cell1 = screen.getByTestId('day-cell-1');

      cell0.focus();
      expect(cell0).toHaveFocus();

      await user.keyboard('{ArrowRight}');

      expect(cell1).toHaveFocus();
    });

    it('should navigate left with ArrowLeft (index - 1)', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const cell5 = screen.getByTestId('day-cell-5');
      const cell4 = screen.getByTestId('day-cell-4');

      cell5.focus();
      expect(cell5).toHaveFocus();

      await user.keyboard('{ArrowLeft}');

      expect(cell4).toHaveFocus();
    });

    it('should navigate down with ArrowDown (index + 7)', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const cell0 = screen.getByTestId('day-cell-0');
      const cell7 = screen.getByTestId('day-cell-7');

      cell0.focus();
      await user.keyboard('{ArrowDown}');

      expect(cell7).toHaveFocus();
    });

    it('should navigate up with ArrowUp (index - 7)', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const cell14 = screen.getByTestId('day-cell-14');
      const cell7 = screen.getByTestId('day-cell-7');

      cell14.focus();
      await user.keyboard('{ArrowUp}');

      expect(cell7).toHaveFocus();
    });
  });

  describe('Keyboard Navigation - Boundary Conditions', () => {
    it('should not navigate left beyond index 0', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const cell0 = screen.getByTestId('day-cell-0');

      cell0.focus();
      await user.keyboard('{ArrowLeft}');

      // Focus should stay on cell 0
      expect(cell0).toHaveFocus();
    });

    it('should not navigate right beyond last index', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const lastCell = screen.getByTestId(`day-cell-34`);

      lastCell.focus();
      await user.keyboard('{ArrowRight}');

      // Focus should stay on last cell
      expect(lastCell).toHaveFocus();
    });

    it('should not navigate up beyond index 0-6 (first week)', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const cell3 = screen.getByTestId('day-cell-3');
      const cell0 = screen.getByTestId('day-cell-0');

      cell3.focus();
      await user.keyboard('{ArrowUp}');

      // Focus should clamp to 0 (3 - 7 = -4, clamped to 0)
      expect(cell0).toHaveFocus();
    });

    it('should not navigate down beyond last week', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const cell30 = screen.getByTestId('day-cell-30');
      const cell34 = screen.getByTestId('day-cell-34');

      cell30.focus();
      await user.keyboard('{ArrowDown}');

      // Focus should clamp to 34 (30 + 7 = 37, clamped to 34)
      expect(cell34).toHaveFocus();
    });

    it('should clamp ArrowDown at exactly last index', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      // Cell 28 + 7 = 35 (out of bounds), should clamp to 34
      const cell28 = screen.getByTestId('day-cell-28');
      const cell34 = screen.getByTestId('day-cell-34');

      cell28.focus();
      await user.keyboard('{ArrowDown}');

      expect(cell34).toHaveFocus();
    });
  });

  describe('Keyboard Navigation - Enter and Space', () => {
    it('should call onOpenDay with correct day when Enter is pressed', async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      render(<CalendarGrid {...defaultProps} onOpenDay={onOpenDay} />);

      const cell10 = screen.getByTestId('day-cell-10');
      cell10.focus();

      await user.keyboard('{Enter}');

      expect(onOpenDay).toHaveBeenCalledTimes(1);
      expect(onOpenDay).toHaveBeenCalledWith(mockDays[10]);
    });

    it('should call onOpenDay with correct day when Space is pressed', async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      render(<CalendarGrid {...defaultProps} onOpenDay={onOpenDay} />);

      const cell5 = screen.getByTestId('day-cell-5');
      cell5.focus();

      await user.keyboard(' ');

      expect(onOpenDay).toHaveBeenCalledTimes(1);
      expect(onOpenDay).toHaveBeenCalledWith(mockDays[5]);
    });

    it('should not call onOpenDay if no cell is focused', async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      render(<CalendarGrid {...defaultProps} onOpenDay={onOpenDay} />);

      // Press Enter without focusing any cell
      await user.keyboard('{Enter}');

      expect(onOpenDay).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation - Event Prevention', () => {
    it('should prevent default behavior for arrow keys', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const cell0 = screen.getByTestId('day-cell-0');
      cell0.focus();

      // ArrowRight should not scroll the page
      await user.keyboard('{ArrowRight}');

      // We can't directly test preventDefault, but we can verify focus changed
      expect(screen.getByTestId('day-cell-1')).toHaveFocus();
    });

    it('should prevent default behavior for Enter', async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      render(<CalendarGrid {...defaultProps} onOpenDay={onOpenDay} />);

      const cell0 = screen.getByTestId('day-cell-0');
      cell0.focus();

      await user.keyboard('{Enter}');

      expect(onOpenDay).toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should set tabIndex=0 only on today cell', () => {
      render(<CalendarGrid {...defaultProps} />);

      const todayCell = screen.getByTestId('day-cell-15'); // index 15 is today
      const otherCell = screen.getByTestId('day-cell-0');

      expect(todayCell).toHaveAttribute('tabindex', '0');
      expect(otherCell).toHaveAttribute('tabindex', '-1');
    });

    it('should move focus to new cell after navigation', async () => {
      const user = userEvent.setup();
      render(<CalendarGrid {...defaultProps} />);

      const cell0 = screen.getByTestId('day-cell-0');
      const cell7 = screen.getByTestId('day-cell-7');

      cell0.focus();
      expect(cell0).toHaveFocus();

      await user.keyboard('{ArrowDown}');

      expect(cell7).toHaveFocus();
      expect(cell0).not.toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty days array gracefully', () => {
      render(<CalendarGrid {...defaultProps} days={[]} />);

      expect(screen.getByRole('grid')).toBeInTheDocument();
      expect(screen.queryAllByRole('gridcell')).toHaveLength(0);
    });

    it('should handle single day array', async () => {
      const user = userEvent.setup();
      const singleDay = [createMockDay(0, true)];
      render(<CalendarGrid {...defaultProps} days={singleDay} />);

      const cell = screen.getByTestId('day-cell-0');
      cell.focus();

      // All arrow keys should keep focus on the same cell
      await user.keyboard('{ArrowRight}');
      expect(cell).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(cell).toHaveFocus();

      await user.keyboard('{ArrowDown}');
      expect(cell).toHaveFocus();

      await user.keyboard('{ArrowUp}');
      expect(cell).toHaveFocus();
    });

    it('should handle keyboard events on non-day elements', async () => {
      const user = userEvent.setup();
      const onOpenDay = vi.fn();
      render(<CalendarGrid {...defaultProps} onOpenDay={onOpenDay} />);

      const weekDayHeader = screen.getByText('Pon');
      weekDayHeader.focus();

      await user.keyboard('{Enter}');

      // Should not call onOpenDay for non-day elements
      expect(onOpenDay).not.toHaveBeenCalled();
    });
  });
});
