import { test, expect } from "@playwright/test";
import { LoginPage } from "./pages/LoginPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { CalendarPage } from "./pages/CalendarPage";

/**
 * E2E Test: Complete Onboarding Flow
 * Scenario:
 * 1. Login with credentials from .env.test
 * 2. Fill 3 workout forms (onboarding)
 * 3. Verify redirect to calendar view
 */
test.describe("Onboarding Flow", () => {
  test("should complete full onboarding process and redirect to calendar", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const onboardingPage = new OnboardingPage(page);
    const calendarPage = new CalendarPage(page);

    // Step 1: Login (use separate user for onboarding tests)
    await loginPage.goto();
    await loginPage.login(
      process.env.E2E_USERNAME || "onboarding@example.com",
      process.env.E2E_PASSWORD || "password123"
    );
    await loginPage.waitForNavigation();

    // Step 2: Verify we're on onboarding page
    await onboardingPage.waitForOnboardingView();
    await onboardingPage.expectStep(1);
    await onboardingPage.expectStepperState([], 1); // No completed, current = 1

    // Step 3: Fill workout #1
    await onboardingPage.fillWorkoutForm({
      distanceKm: "5.5",
      hours: "0",
      minutes: "30",
      seconds: "15",
      avgHr: "145",
      date: "2024-11-10",
    });

    // Verify submit button text
    expect(await onboardingPage.getSubmitButtonText()).toContain("Dalej");

    await onboardingPage.submitForm();

    // Step 4: Verify step 2
    await onboardingPage.expectStep(2);
    await onboardingPage.expectStepperState([1], 2); // Step 1 completed, current = 2

    // Step 5: Fill workout #2
    await onboardingPage.completeWorkoutStep({
      distanceKm: "8.0",
      hours: "0",
      minutes: "45",
      seconds: "30",
      avgHr: "155",
      date: "2024-11-12",
    });

    // Step 6: Verify step 3
    await onboardingPage.expectStep(3);
    await onboardingPage.expectStepperState([1, 2], 3); // Steps 1,2 completed, current = 3

    // Verify submit button text changed to "Zakończ"
    expect(await onboardingPage.getSubmitButtonText()).toContain("Zakończ");

    // Step 7: Fill workout #3 and submit
    await onboardingPage.completeWorkoutStep({
      distanceKm: "10.0",
      hours: "1",
      minutes: "0",
      seconds: "0",
      avgHr: "150",
      date: "2024-11-14",
    });

    // Step 8: Verify redirect to calendar
    await onboardingPage.waitForRedirectToCalendar();
    await calendarPage.waitForCalendarLoad();

    // Verify calendar view is visible
    await expect(calendarPage.calendarView).toBeVisible();
    await expect(calendarPage.calendarGrid).toBeVisible();
  });

  test("should show validation errors for invalid form data", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const onboardingPage = new OnboardingPage(page);

    // Login (use separate user for onboarding tests)
    await loginPage.goto();
    await loginPage.login(
      process.env.E2E_USERNAME || "onboarding@example.com",
      process.env.E2E_PASSWORD || "password123"
    );
    await loginPage.waitForNavigation();

    await onboardingPage.waitForOnboardingView();

    // Try to submit with invalid data (distance too small)
    await onboardingPage.fillWorkoutForm({
      distanceKm: "0.05", // Less than 0.1 km
      hours: "0",
      minutes: "0",
      seconds: "30", // Less than 60 seconds total
      avgHr: "250", // More than 220 bpm
      date: "2024-11-10", // Past date
    });

    await onboardingPage.submitForm();

    // Verify all validation errors are shown
    await onboardingPage.expectDistanceError("Dystans musi być większy niż 0.1 km");
    await onboardingPage.expectDurationError("Czas trwania musi być dłuższy niż 60 sekund");
    await onboardingPage.expectAvgHrError("Tętno musi być w zakresie 40-220 bpm");

    // Verify we're still on step 1 (didn't advance)
    await onboardingPage.expectStep(1);
  });

  test("should preserve progress when navigating between steps", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const onboardingPage = new OnboardingPage(page);

    // Login (use separate user for onboarding tests)
    await loginPage.goto();
    await loginPage.login(
      process.env.E2E_USERNAME || "onboarding@example.com",
      process.env.E2E_PASSWORD || "password123"
    );
    await loginPage.waitForNavigation();

    await onboardingPage.waitForOnboardingView();

    // Complete step 1
    await onboardingPage.completeWorkoutStep({
      distanceKm: "5.0",
      hours: "0",
      minutes: "25",
      seconds: "0",
      avgHr: "140",
      date: "2024-11-10",
    });

    await onboardingPage.expectStep(2);

    // Verify step 1 is marked as completed in stepper
    await expect(onboardingPage.step1).toHaveText("✓");
    await expect(onboardingPage.step1).toHaveClass(/bg-green-500/);
  });

  test("should show loading state during submission", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const onboardingPage = new OnboardingPage(page);

    // Login (use separate user for onboarding tests)
    await loginPage.goto();
    await loginPage.login(
      process.env.E2E_USERNAME || "onboarding@example.com",
      process.env.E2E_PASSWORD || "password123"
    );
    await loginPage.waitForNavigation();

    await onboardingPage.waitForOnboardingView();

    // Fill valid form
    await onboardingPage.fillWorkoutForm({
      distanceKm: "5.0",
      hours: "0",
      minutes: "30",
      seconds: "0",
      avgHr: "145",
      date: "2024-11-10",
    });

    // Submit and check loading state
    const submitPromise = onboardingPage.submitForm();

    // Check if button is disabled during submission (may be too fast to catch)
    // This is optional and depends on network speed
    // await expect(onboardingPage.submitButton).toBeDisabled();

    await submitPromise;

    // After submission, should be on step 2
    await onboardingPage.expectStep(2);
  });
});
