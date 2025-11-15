import { Page, Locator } from '@playwright/test';

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

  constructor(page: Page) {
    this.page = page;
    this.calendarView = page.getByTestId('calendar-view');
    this.calendarGrid = page.locator('[role="grid"]');
    this.dayCells = page.locator('[role="gridcell"]');
    this.addWorkoutButtons = page.locator('button:has-text("+")');
    this.monthHeader = page.locator('h2');
    this.nextMonthButton = page.locator('button[aria-label*="Następny"]');
    this.prevMonthButton = page.locator('button[aria-label*="Poprzedni"]');
    this.todayButton = page.locator('button:has-text("Dzisiaj")');
  }

  async goto() {
    await this.page.goto('/');
  }

  async waitForCalendarLoad() {
    await this.calendarView.waitFor({ state: 'visible' });
    await this.calendarGrid.waitFor({ state: 'visible' });
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
