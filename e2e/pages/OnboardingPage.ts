import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Onboarding Page
 * Handles the 3-step workout collection process for new users
 */
export class OnboardingPage {
  readonly page: Page;

  // Main container
  readonly onboardingView: Locator;
  readonly stepTitle: Locator;

  // Stepper indicators
  readonly stepper: Locator;
  readonly step1: Locator;
  readonly step2: Locator;
  readonly step3: Locator;

  // Workout form
  readonly workoutForm: Locator;
  readonly distanceInput: Locator;
  readonly durationHoursInput: Locator;
  readonly durationMinutesInput: Locator;
  readonly durationSecondsInput: Locator;
  readonly avgHrInput: Locator;
  readonly dateInput: Locator;
  readonly submitButton: Locator;

  // Error messages
  readonly distanceError: Locator;
  readonly durationError: Locator;
  readonly avgHrError: Locator;
  readonly dateError: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main elements
    this.onboardingView = page.getByTestId('onboarding-view');
    this.stepTitle = page.getByTestId('onboarding-step-title');

    // Stepper
    this.stepper = page.getByTestId('onboarding-stepper');
    this.step1 = page.getByTestId('onboarding-step-1');
    this.step2 = page.getByTestId('onboarding-step-2');
    this.step3 = page.getByTestId('onboarding-step-3');

    // Form inputs
    this.workoutForm = page.getByTestId('workout-onboarding-form');
    this.distanceInput = page.getByTestId('workout-distance-input');
    this.durationHoursInput = page.getByTestId('duration-hours-input');
    this.durationMinutesInput = page.getByTestId('duration-minutes-input');
    this.durationSecondsInput = page.getByTestId('duration-seconds-input');
    this.avgHrInput = page.getByTestId('workout-avghr-input');
    this.dateInput = page.getByTestId('workout-date-input');
    this.submitButton = page.getByTestId('workout-submit-button');

    // Error messages
    this.distanceError = page.getByTestId('workout-error-distance');
    this.durationError = page.getByTestId('workout-error-duration');
    this.avgHrError = page.getByTestId('workout-error-avghr');
    this.dateError = page.getByTestId('workout-error-date');
  }

  async goto() {
    await this.page.goto('/onboarding');
  }

  async waitForOnboardingView() {
    await this.onboardingView.waitFor({ state: 'visible' });
  }

  /**
   * Get current step number from title (e.g., "Trening 1 z 3" -> 1)
   */
  async getCurrentStep(): Promise<number> {
    const titleText = await this.stepTitle.textContent();
    const match = titleText?.match(/Trening (\d+) z \d+/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Verify that we're on the expected step
   */
  async expectStep(stepNumber: 1 | 2 | 3) {
    await expect(this.stepTitle).toHaveText(`Trening ${stepNumber} z 3`);
  }

  /**
   * Verify stepper visual state
   */
  async expectStepperState(completedSteps: number[], currentStep: number) {
    // Check completed steps (green with checkmark)
    for (const stepNum of completedSteps) {
      const stepLocator = this.page.getByTestId(`onboarding-step-${stepNum}`);
      await expect(stepLocator).toHaveClass(/bg-green-500/);
      await expect(stepLocator).toHaveText('✓');
    }

    // Check current step (blue with number)
    const currentStepLocator = this.page.getByTestId(`onboarding-step-${currentStep}`);
    await expect(currentStepLocator).toHaveClass(/bg-blue-600/);
    await expect(currentStepLocator).toHaveText(currentStep.toString());

    // Check pending steps (gray with number)
    for (let stepNum = currentStep + 1; stepNum <= 3; stepNum++) {
      const pendingStepLocator = this.page.getByTestId(`onboarding-step-${stepNum}`);
      await expect(pendingStepLocator).toHaveClass(/bg-gray-300/);
      await expect(pendingStepLocator).toHaveText(stepNum.toString());
    }
  }

  /**
   * Fill workout form with all required fields
   */
  async fillWorkoutForm(workout: {
    distanceKm: string;
    hours: string;
    minutes: string;
    seconds: string;
    avgHr: string;
    date: string; // YYYY-MM-DD format
  }) {
    await this.distanceInput.fill(workout.distanceKm);
    await this.durationHoursInput.fill(workout.hours);
    await this.durationMinutesInput.fill(workout.minutes);
    await this.durationSecondsInput.fill(workout.seconds);
    await this.avgHrInput.fill(workout.avgHr);
    await this.dateInput.fill(workout.date);
  }

  /**
   * Submit the workout form (click "Dalej" or "Zakończ")
   */
  async submitForm() {
    await this.submitButton.click();
  }

  /**
   * Complete a single workout step (fill + submit)
   */
  async completeWorkoutStep(workout: {
    distanceKm: string;
    hours: string;
    minutes: string;
    seconds: string;
    avgHr: string;
    date: string;
  }) {
    await this.fillWorkoutForm(workout);
    await this.submitForm();
  }

  /**
   * Verify form validation errors are displayed
   */
  async expectDistanceError(message: string) {
    await expect(this.distanceError).toBeVisible();
    await expect(this.distanceError).toHaveText(message);
  }

  async expectDurationError(message: string) {
    await expect(this.durationError).toBeVisible();
    await expect(this.durationError).toHaveText(message);
  }

  async expectAvgHrError(message: string) {
    await expect(this.avgHrError).toBeVisible();
    await expect(this.avgHrError).toHaveText(message);
  }

  async expectDateError(message: string) {
    await expect(this.dateError).toBeVisible();
    await expect(this.dateError).toHaveText(message);
  }

  /**
   * Verify no validation errors are visible
   */
  async expectNoErrors() {
    await expect(this.distanceError).not.toBeVisible();
    await expect(this.durationError).not.toBeVisible();
    await expect(this.avgHrError).not.toBeVisible();
    await expect(this.dateError).not.toBeVisible();
  }

  /**
   * Wait for redirect after completing all 3 workouts
   */
  async waitForRedirectToCalendar() {
    await this.page.waitForURL('/');
  }

  /**
   * Get submit button text (changes based on step: "Dalej" or "Zakończ")
   */
  async getSubmitButtonText(): Promise<string | null> {
    return await this.submitButton.textContent();
  }

  /**
   * Check if submit button is disabled (during loading)
   */
  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }
}
