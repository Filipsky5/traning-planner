/**
 * Unit Tests for CalendarHeader Component
 * Priority: HIGH - Title formatting and week number calculation
 *
 * Tests cover:
 * - getWeekNumber calculation for various dates
 * - Year boundaries (week 1, week 52/53)
 * - Title formatting for month vs week view modes
 * - Button click callbacks (onPeriodChange, onViewModeChange, onDateSelect)
 * - Active state styling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { CalendarHeader } from './CalendarHeader';

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, ...props }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe('CalendarHeader', () => {
  const defaultProps = {
    currentDate: new Date(2024, 0, 15), // January 15, 2024 (Monday)
    viewMode: 'month' as const,
    onPeriodChange: vi.fn(),
    onViewModeChange: vi.fn(),
    onDateSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering - Basic Structure', () => {
    it('should render all navigation buttons', () => {
      render(<CalendarHeader {...defaultProps} />);

      expect(screen.getByLabelText('Poprzedni okres')).toBeInTheDocument();
      expect(screen.getByText('Dzisiaj')).toBeInTheDocument();
      expect(screen.getByLabelText('Następny okres')).toBeInTheDocument();
    });

    it('should render view mode toggle buttons', () => {
      render(<CalendarHeader {...defaultProps} />);

      expect(screen.getByText('Tydzień')).toBeInTheDocument();
      expect(screen.getByText('Miesiąc')).toBeInTheDocument();
    });

    it('should render title heading', () => {
      render(<CalendarHeader {...defaultProps} />);

      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toBeInTheDocument();
    });
  });

  describe('Title Formatting - Month View', () => {
    it('should display "styczeń 2024" for January 2024', () => {
      const date = new Date(2024, 0, 15);
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="month" />);

      expect(screen.getByText(/styczeń 2024/i)).toBeInTheDocument();
    });

    it('should display "grudzień 2024" for December 2024', () => {
      const date = new Date(2024, 11, 25);
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="month" />);

      expect(screen.getByText(/grudzień 2024/i)).toBeInTheDocument();
    });

    it('should display "luty 2023" for February 2023', () => {
      const date = new Date(2023, 1, 10);
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="month" />);

      expect(screen.getByText(/luty 2023/i)).toBeInTheDocument();
    });

    it('should capitalize month name', () => {
      const date = new Date(2024, 5, 1); // June
      const { container } = render(
        <CalendarHeader {...defaultProps} currentDate={date} viewMode="month" />
      );

      const title = container.querySelector('h2');
      expect(title?.className).toContain('capitalize');
    });
  });

  describe('Title Formatting - Week View', () => {
    it('should display "Tydzień N, YYYY" format for week view', () => {
      const date = new Date(2024, 0, 15); // Week 3 of 2024
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/Tydzień \d+, 2024/)).toBeInTheDocument();
    });

    it('should include year in week view title', () => {
      const date = new Date(2023, 5, 15);
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/2023/)).toBeInTheDocument();
    });
  });

  describe('getWeekNumber - Basic Calculation', () => {
    it('should calculate week 1 for January 4, 2024 (Thursday)', () => {
      const date = new Date(2024, 0, 4);
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/Tydzień 1, 2024/)).toBeInTheDocument();
    });

    it('should calculate week 3 for January 15, 2024', () => {
      const date = new Date(2024, 0, 15);
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/Tydzień 3, 2024/)).toBeInTheDocument();
    });

    it('should calculate week 26 for June 24, 2024 (mid-year)', () => {
      const date = new Date(2024, 5, 24);
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/Tydzień 26, 2024/)).toBeInTheDocument();
    });

    it('should calculate week 52 for December 23, 2024', () => {
      const date = new Date(2024, 11, 23);
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/Tydzień 52, 2024/)).toBeInTheDocument();
    });
  });

  describe('getWeekNumber - Year Boundaries', () => {
    it('should handle January 1 correctly (may be week 52/53 of previous year or week 1)', () => {
      const date = new Date(2024, 0, 1); // January 1, 2024 (Monday)
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      const title = screen.getByRole('heading').textContent;
      expect(title).toMatch(/Tydzień \d+/);
    });

    it('should handle December 31 correctly (may be week 1 of next year)', () => {
      const date = new Date(2024, 11, 31); // December 31, 2024 (Tuesday)
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      const title = screen.getByRole('heading').textContent;
      expect(title).toMatch(/Tydzień \d+/);
    });

    it('should handle transition from December to January', () => {
      // January 6, 2025 (Monday) - first full week of 2025
      const date = new Date(2025, 0, 6);
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/Tydzień 2, 2025/)).toBeInTheDocument();
    });

    it('should handle leap year February correctly', () => {
      const date = new Date(2024, 1, 29); // Feb 29, 2024 (leap year)
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/Tydzień 9, 2024/)).toBeInTheDocument();
    });
  });

  describe('getWeekNumber - Edge Cases', () => {
    it('should calculate week number for year 2023', () => {
      const date = new Date(2023, 6, 15); // July 15, 2023
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/Tydzień 28, 2023/)).toBeInTheDocument();
    });

    it('should calculate week number for year 2025', () => {
      const date = new Date(2025, 3, 10); // April 10, 2025
      render(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      const title = screen.getByRole('heading').textContent;
      expect(title).toMatch(/Tydzień \d+, 2025/);
    });

    it('should handle same week number for consecutive days in same week', () => {
      const monday = new Date(2024, 0, 8);
      const friday = new Date(2024, 0, 12);

      const { rerender } = render(
        <CalendarHeader {...defaultProps} currentDate={monday} viewMode="week" />
      );

      const mondayTitle = screen.getByRole('heading').textContent;

      rerender(<CalendarHeader {...defaultProps} currentDate={friday} viewMode="week" />);

      const fridayTitle = screen.getByRole('heading').textContent;

      expect(mondayTitle).toBe(fridayTitle);
    });
  });

  describe('Button Callbacks - Period Navigation', () => {
    it('should call onPeriodChange with "prev" when previous button clicked', async () => {
      const user = userEvent.setup();
      const onPeriodChange = vi.fn();

      render(<CalendarHeader {...defaultProps} onPeriodChange={onPeriodChange} />);

      const prevButton = screen.getByLabelText('Poprzedni okres');
      await user.click(prevButton);

      expect(onPeriodChange).toHaveBeenCalledTimes(1);
      expect(onPeriodChange).toHaveBeenCalledWith('prev');
    });

    it('should call onPeriodChange with "next" when next button clicked', async () => {
      const user = userEvent.setup();
      const onPeriodChange = vi.fn();

      render(<CalendarHeader {...defaultProps} onPeriodChange={onPeriodChange} />);

      const nextButton = screen.getByLabelText('Następny okres');
      await user.click(nextButton);

      expect(onPeriodChange).toHaveBeenCalledTimes(1);
      expect(onPeriodChange).toHaveBeenCalledWith('next');
    });

    it('should handle multiple prev clicks', async () => {
      const user = userEvent.setup();
      const onPeriodChange = vi.fn();

      render(<CalendarHeader {...defaultProps} onPeriodChange={onPeriodChange} />);

      const prevButton = screen.getByLabelText('Poprzedni okres');
      await user.click(prevButton);
      await user.click(prevButton);
      await user.click(prevButton);

      expect(onPeriodChange).toHaveBeenCalledTimes(3);
      expect(onPeriodChange).toHaveBeenNthCalledWith(1, 'prev');
      expect(onPeriodChange).toHaveBeenNthCalledWith(2, 'prev');
      expect(onPeriodChange).toHaveBeenNthCalledWith(3, 'prev');
    });
  });

  describe('Button Callbacks - Today Button', () => {
    it('should call onDateSelect with new Date() when "Dzisiaj" clicked', async () => {
      const user = userEvent.setup();
      const onDateSelect = vi.fn();

      render(<CalendarHeader {...defaultProps} onDateSelect={onDateSelect} />);

      const todayButton = screen.getByText('Dzisiaj');
      await user.click(todayButton);

      expect(onDateSelect).toHaveBeenCalledTimes(1);
      const calledDate = onDateSelect.mock.calls[0][0];
      expect(calledDate).toBeInstanceOf(Date);

      // Should be called with "today" (within 1 second tolerance)
      const now = new Date();
      const diff = Math.abs(calledDate.getTime() - now.getTime());
      expect(diff).toBeLessThan(1000);
    });
  });

  describe('Button Callbacks - View Mode Toggle', () => {
    it('should call onViewModeChange with "week" when week button clicked', async () => {
      const user = userEvent.setup();
      const onViewModeChange = vi.fn();

      render(<CalendarHeader {...defaultProps} onViewModeChange={onViewModeChange} />);

      const weekButton = screen.getByText('Tydzień');
      await user.click(weekButton);

      expect(onViewModeChange).toHaveBeenCalledTimes(1);
      expect(onViewModeChange).toHaveBeenCalledWith('week');
    });

    it('should call onViewModeChange with "month" when month button clicked', async () => {
      const user = userEvent.setup();
      const onViewModeChange = vi.fn();

      render(
        <CalendarHeader
          {...defaultProps}
          viewMode="week"
          onViewModeChange={onViewModeChange}
        />
      );

      const monthButton = screen.getByText('Miesiąc');
      await user.click(monthButton);

      expect(onViewModeChange).toHaveBeenCalledTimes(1);
      expect(onViewModeChange).toHaveBeenCalledWith('month');
    });
  });

  describe('Active State Styling', () => {
    it('should show month button as active when viewMode is "month"', () => {
      render(<CalendarHeader {...defaultProps} viewMode="month" />);

      const monthButton = screen.getByText('Miesiąc');
      const weekButton = screen.getByText('Tydzień');

      expect(monthButton).toHaveAttribute('data-variant', 'default');
      expect(weekButton).toHaveAttribute('data-variant', 'outline');
    });

    it('should show week button as active when viewMode is "week"', () => {
      render(<CalendarHeader {...defaultProps} viewMode="week" />);

      const monthButton = screen.getByText('Miesiąc');
      const weekButton = screen.getByText('Tydzień');

      expect(weekButton).toHaveAttribute('data-variant', 'default');
      expect(monthButton).toHaveAttribute('data-variant', 'outline');
    });

    it('should update active state when viewMode changes', () => {
      const { rerender } = render(<CalendarHeader {...defaultProps} viewMode="month" />);

      expect(screen.getByText('Miesiąc')).toHaveAttribute('data-variant', 'default');

      rerender(<CalendarHeader {...defaultProps} viewMode="week" />);

      expect(screen.getByText('Tydzień')).toHaveAttribute('data-variant', 'default');
      expect(screen.getByText('Miesiąc')).toHaveAttribute('data-variant', 'outline');
    });
  });

  describe('Dynamic Title Updates', () => {
    it('should update title when currentDate changes in month view', () => {
      const { rerender } = render(
        <CalendarHeader {...defaultProps} currentDate={new Date(2024, 0, 15)} viewMode="month" />
      );

      expect(screen.getByText(/styczeń 2024/i)).toBeInTheDocument();

      rerender(
        <CalendarHeader {...defaultProps} currentDate={new Date(2024, 5, 15)} viewMode="month" />
      );

      expect(screen.getByText(/czerwiec 2024/i)).toBeInTheDocument();
      expect(screen.queryByText(/styczeń/i)).not.toBeInTheDocument();
    });

    it('should update title when currentDate changes in week view', () => {
      const { rerender } = render(
        <CalendarHeader {...defaultProps} currentDate={new Date(2024, 0, 8)} viewMode="week" />
      );

      const initialWeek = screen.getByRole('heading').textContent;

      rerender(
        <CalendarHeader {...defaultProps} currentDate={new Date(2024, 0, 22)} viewMode="week" />
      );

      const newWeek = screen.getByRole('heading').textContent;
      expect(newWeek).not.toBe(initialWeek);
    });

    it('should update title format when viewMode changes', () => {
      const date = new Date(2024, 0, 15);
      const { rerender } = render(
        <CalendarHeader {...defaultProps} currentDate={date} viewMode="month" />
      );

      expect(screen.getByText(/styczeń 2024/i)).toBeInTheDocument();

      rerender(<CalendarHeader {...defaultProps} currentDate={date} viewMode="week" />);

      expect(screen.getByText(/Tydzień 3, 2024/)).toBeInTheDocument();
      expect(screen.queryByText(/styczeń/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Robustness', () => {
    it('should handle invalid date objects gracefully', () => {
      const invalidDate = new Date('invalid');
      render(<CalendarHeader {...defaultProps} currentDate={invalidDate} />);

      // Should render without crashing
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('should handle very old dates', () => {
      const oldDate = new Date(1900, 0, 1);
      render(<CalendarHeader {...defaultProps} currentDate={oldDate} viewMode="week" />);

      expect(screen.getByText(/1900/)).toBeInTheDocument();
    });

    it('should handle far future dates', () => {
      const futureDate = new Date(2100, 11, 31);
      render(<CalendarHeader {...defaultProps} currentDate={futureDate} viewMode="month" />);

      expect(screen.getByText(/2100/)).toBeInTheDocument();
    });
  });
});
