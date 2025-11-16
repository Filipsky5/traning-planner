/* eslint-disable no-console */
import { test as setup, expect, type Page } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { CalendarPage } from "../pages/CalendarPage";

const authFile = "playwright/.auth/user.json";

/**
 * Helper function to cleanup all workouts for test user
 * Used before setup to ensure clean slate (idempotent tests)
 */
async function cleanupTestUserWorkouts(page: Page) {
  try {
    console.log("Cleaning up existing test user workouts...");

    const workoutsResponse = await page.request.get("/api/v1/workouts", {
      failOnStatusCode: false,
    });

    if (!workoutsResponse.ok()) {
      console.log("  No workouts to cleanup or user not authenticated");
      return 0;
    }

    const workoutsData = await workoutsResponse.json();
    const workouts = workoutsData.data || [];

    console.log(`  Found ${workouts.length} workout(s) to delete`);

    for (const workout of workouts) {
      try {
        const result = await page.evaluate(async (workoutId: string) => {
          const response = await fetch(`/api/v1/workouts/${workoutId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          return { ok: response.ok, status: response.status };
        }, workout.id);

        if (result.ok) {
          console.log(`  ✓ Deleted workout ${workout.id}`);
        }
      } catch (error) {
        console.warn(`  ✗ Failed to delete workout ${workout.id}:`, error);
      }
    }

    console.log(`✓ Cleanup complete: deleted ${workouts.length} workout(s)`);
    return workouts.length;
  } catch (error) {
    console.warn("Cleanup failed (non-critical):", error);
    return 0;
  }
}

/**
 * Global Setup: Prepare authenticated user with completed onboarding
 * This runs once before all tests to ensure calendar tests have a valid user
 */
setup("authenticate and complete onboarding", async ({ page }) => {
  const loginPage = new LoginPage(page);
  const onboardingPage = new OnboardingPage(page);
  const calendarPage = new CalendarPage(page);

  // Step 1: Login
  await loginPage.goto();
  await loginPage.login(process.env.E2E_USERNAME || "test@example.com", process.env.E2E_PASSWORD || "password123");
  await loginPage.waitForNavigation();

  // Step 2: Cleanup existing workouts (ensures idempotent tests)
  await cleanupTestUserWorkouts(page);

  // Step 3: Check if we're redirected to onboarding (user has <3 workouts)
  const currentUrl = page.url();

  if (currentUrl.includes("/onboarding")) {
    console.log("User needs onboarding - completing 3 workouts...");

    // Complete onboarding flow
    await onboardingPage.waitForOnboardingView();

    // Workout 1
    await onboardingPage.fillWorkoutForm({
      distanceKm: "5.0",
      hours: "0",
      minutes: "25",
      seconds: "0",
      avgHr: "145",
      date: "2024-11-01",
    });
    await onboardingPage.submitForm();

    // Workout 2
    await onboardingPage.expectStep(2);
    await onboardingPage.fillWorkoutForm({
      distanceKm: "8.0",
      hours: "0",
      minutes: "42",
      seconds: "30",
      avgHr: "152",
      date: "2024-11-03",
    });
    await onboardingPage.submitForm();

    // Workout 3
    await onboardingPage.expectStep(3);
    await onboardingPage.fillWorkoutForm({
      distanceKm: "10.0",
      hours: "0",
      minutes: "55",
      seconds: "0",
      avgHr: "150",
      date: "2024-11-05",
    });
    await onboardingPage.submitForm();

    // Wait for redirect to calendar
    await onboardingPage.waitForRedirectToCalendar();
    await calendarPage.waitForCalendarLoad();

    console.log("✓ Onboarding completed successfully");
  } else {
    console.log("✓ User already has completed onboarding");
  }

  // Verify we're on calendar view
  await expect(calendarPage.calendarView).toBeVisible();

  // Save authenticated state
  await page.context().storageState({ path: authFile });
  console.log(`✓ Auth state saved to ${authFile}`);
});
