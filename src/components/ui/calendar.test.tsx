import { fireEvent, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Calendar } from "./calendar";

describe("Calendar with DayPicker 10", () => {
  const selectedDate = new Date(2026, 10, 8);

  it("returns the selected day when a user clicks it", () => {
    const onSelect = vi.fn();
    const { container } = render(<Calendar mode="single" defaultMonth={selectedDate} onSelect={onSelect} />);
    const day = container.querySelector<HTMLButtonElement>(`button[data-day="${selectedDate.toLocaleDateString()}"]`);

    expect(day).not.toBeNull();
    if (!day) throw new Error("The expected calendar day was not rendered");
    fireEvent.click(day);
    expect(onSelect.mock.calls[0][0]).toEqual(selectedDate);
  });

  it("focuses the selected day when a date popover requests autoFocus", async () => {
    const { container } = render(
      <Calendar mode="single" defaultMonth={selectedDate} selected={selectedDate} autoFocus />
    );
    const day = container.querySelector<HTMLButtonElement>(`button[data-day="${selectedDate.toLocaleDateString()}"]`);

    await waitFor(() => expect(day).toHaveFocus());
  });
});
