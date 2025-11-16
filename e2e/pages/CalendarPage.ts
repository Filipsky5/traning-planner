import { Page, Locator } from "@playwright/test";

/**
 * Page Object Model for Calendar Page
 * Main application view with training calendar
 */
export class CalendarPage {
  readonly page: Page;
  readonly calendarView: Locator;
  readonly calendarGrid: Locator;
  readonly dayCells: Locator;
  readonly addWorkoutButtons: Locator;
  readonly monthHeader: Locator;
  readonly nextMonthButton: Locator;
  readonly prevMonthButton: Locator;
  readonly todayButton: Locator;
  readonly todayCell: Locator;

  constructor(page: Page) {
    this.page = page;
    this.calendarView = page.getByTestId("calendar-view");
    this.calendarGrid = page.locator('[role="grid"]');
    this.dayCells = page.locator('[role="gridcell"]');
    this.addWorkoutButtons = page.locator('button:has-text("+")');
    this.monthHeader = page.locator("h2");
    this.nextMonthButton = page.locator('button[aria-label*="Następny"]');
    this.prevMonthButton = page.locator('button[aria-label*="Poprzedni"]');
    this.todayButton = page.locator('button:has-text("Dzisiaj")');
    this.todayCell = page.locator('[role="gridcell"].ring-blue-500');
  }

  async goto() {
    await this.page.goto("/");
  }

  async waitForCalendarLoad() {
    await this.calendarView.waitFor({ state: "visible" });
    await this.calendarGrid.waitFor({ state: "visible" });
    // Wait for skeleton loaders to disappear (loading complete)
    await this.waitForSkeletonsToDisappear();
  }

  /**
   * Wait for all skeleton loading animations to disappear
   * This indicates that the calendar data has finished loading
   */
  async waitForSkeletonsToDisappear() {
    // First wait for skeleton to appear (loading starts)
    await this.page
      .locator('[data-slot="skeleton"]')
      .first()
      .waitFor({ state: "attached", timeout: 2000 })
      .catch(() => {
        // If no skeletons appear, loading was instant - that's fine
      });

    // Then wait for all skeletons to disappear (loading complete)
    await this.page
      .locator('[data-slot="skeleton"]')
      .first()
      .waitFor({ state: "detached", timeout: 5000 })
      .catch(() => {
        // If no skeletons found, that's fine - already loaded
      });
  }

  async clickAddWorkout(dayIndex: number) {
    const dayCell = this.dayCells.nth(dayIndex);
    const addButton = dayCell.locator('button:has-text("+")');
    await addButton.click();
  }

  async navigateToNextMonth() {
    await this.nextMonthButton.click();
  }

  async navigateToPrevMonth() {
    await this.prevMonthButton.click();
  }

  async goToToday() {
    await this.todayButton.click();
  }

  async getDayCellCount() {
    return await this.dayCells.count();
  }

  async getMonthTitle() {
    return await this.monthHeader.textContent();
  }
}
