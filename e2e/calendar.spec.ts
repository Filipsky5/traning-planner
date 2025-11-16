import { test, expect } from "@playwright/test";
import { CalendarPage } from "./pages/CalendarPage";

/**
 * E2E Tests for Calendar View
 * Main user flow: viewing and navigating the training calendar
 */
test.describe("Calendar View", () => {
  let calendarPage: CalendarPage;

  test.beforeEach(async ({ page }) => {
    calendarPage = new CalendarPage(page);
    await calendarPage.goto();
  });

  test("should display calendar grid", async () => {
    // Wait for calendar to load (includes waiting for skeletons to disappear)
    await calendarPage.waitForCalendarLoad();

    // Verify calendar grid is visible
    await expect(calendarPage.calendarGrid).toBeVisible();

    // Calendar should have day cells (typically 35 or 42 days)
    const cellCount = await calendarPage.getDayCellCount();
    expect(cellCount).toBeGreaterThanOrEqual(28);
    expect(cellCount).toBeLessThanOrEqual(42);
  });

  test("should display current month title", async () => {
    await calendarPage.waitForCalendarLoad();
    const title = await calendarPage.getMonthTitle();
    expect(title).toBeTruthy();
    expect(title?.length).toBeGreaterThan(0);
  });

  test("should navigate to next month", async () => {
    await calendarPage.waitForCalendarLoad();
    const initialTitle = await calendarPage.getMonthTitle();
    await calendarPage.navigateToNextMonth();

    // Wait for calendar to reload (grid visible + skeletons disappear)
    await calendarPage.waitForCalendarLoad();

    const newTitle = await calendarPage.getMonthTitle();
    expect(newTitle).not.toBe(initialTitle);
  });

  test("should navigate to previous month", async () => {
    await calendarPage.waitForCalendarLoad();
    const initialTitle = await calendarPage.getMonthTitle();
    await calendarPage.navigateToPrevMonth();

    // Wait for calendar to reload (grid visible + skeletons disappear)
    await calendarPage.waitForCalendarLoad();

    const newTitle = await calendarPage.getMonthTitle();
    expect(newTitle).not.toBe(initialTitle);
  });

  test("should navigate back to today", async () => {
    await calendarPage.waitForCalendarLoad();
    // Navigate to next month
    await calendarPage.navigateToNextMonth();
    await calendarPage.waitForCalendarLoad();

    // Go back to today
    await calendarPage.goToToday();
    await calendarPage.waitForCalendarLoad();

    // Verify we're back (check for today indicator)
    await expect(calendarPage.todayCell).toBeVisible();
  });

  test("should show add workout button on day cells", async () => {
    await calendarPage.waitForCalendarLoad();
    // Check if at least one add workout button is visible
    const buttonCount = await calendarPage.addWorkoutButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});
