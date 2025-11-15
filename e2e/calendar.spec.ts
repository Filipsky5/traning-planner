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

  test("should display calendar grid", async ({ page }) => {
    // Wait for calendar to load
    await calendarPage.waitForCalendarLoad();

    // Verify calendar grid is visible
    await expect(calendarPage.calendarGrid).toBeVisible();
    // Wait for content to load
    await page.waitForTimeout(500);

    // Calendar should have day cells (typically 35 or 42 days)
    const cellCount = await calendarPage.getDayCellCount();
    expect(cellCount).toBeGreaterThanOrEqual(28);
    expect(cellCount).toBeLessThanOrEqual(42);
  });

  test("should display current month title", async ({ page }) => {
    await calendarPage.waitForCalendarLoad();
    // Wait for content to load
    await page.waitForTimeout(500);
    const title = await calendarPage.getMonthTitle();
    expect(title).toBeTruthy();
    expect(title?.length).toBeGreaterThan(0);
  });

  test("should navigate to next month", async ({ page }) => {
    await calendarPage.waitForCalendarLoad();
    // Wait for content to load
    await page.waitForTimeout(500);
    const initialTitle = await calendarPage.getMonthTitle();
    await calendarPage.navigateToNextMonth();

    // Wait for content to update
    await page.waitForTimeout(500);

    const newTitle = await calendarPage.getMonthTitle();
    expect(newTitle).not.toBe(initialTitle);
  });

  test("should navigate to previous month", async ({ page }) => {
    await calendarPage.waitForCalendarLoad();
    // Wait for content to load
    await page.waitForTimeout(500);
    const initialTitle = await calendarPage.getMonthTitle();
    await calendarPage.navigateToPrevMonth();

    // Wait for content to update
    await page.waitForTimeout(500);

    const newTitle = await calendarPage.getMonthTitle();
    expect(newTitle).not.toBe(initialTitle);
  });

  test("should navigate back to today", async ({ page }) => {
    await calendarPage.waitForCalendarLoad();
    // Wait for content to load
    await page.waitForTimeout(500);
    // Navigate to next month
    await calendarPage.navigateToNextMonth();
    await page.waitForTimeout(500);

    // Go back to today
    await calendarPage.goToToday();
    await page.waitForTimeout(500);

    // Verify we're back (check for today indicator)
    const todayCell = page.locator('[role="gridcell"].ring-blue-500');
    await expect(todayCell).toBeVisible();
  });

  test("should show add workout button on day cells", async ({ page }) => {
    await calendarPage.waitForCalendarLoad();
    // Wait for content to load
    await page.waitForTimeout(500);
    // Check if at least one add workout button is visible
    const buttonCount = await calendarPage.addWorkoutButtons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("should take screenshot of calendar view", async ({ page }) => {
    await calendarPage.waitForCalendarLoad();
    // Wait for content to load
    await page.waitForTimeout(500);
    // Visual regression test (snapshot saved to test-results)
    await expect(page).toHaveScreenshot("calendar-view.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
