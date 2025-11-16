import { test as teardown, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";

/**
 * Teardown for onboarding tests
 * Cleans up all workouts created by the onboarding test user
 * Runs after all onboarding-flow tests complete
 *
 * NOTE: This is a "best effort" cleanup. If teardown fails (timeout, crash),
 * the setup phase in auth.setup.ts will cleanup on next run (idempotent tests).
 */
teardown("cleanup onboarding test user workouts", async ({ page }) => {
  console.log("Starting teardown: cleaning up onboarding test user workouts...");

  try {
    // Step 1: Login as test user
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.E2E_USERNAME || "test@example.com", process.env.E2E_PASSWORD || "password123");
    await loginPage.waitForNavigation();

    console.log("✓ Logged in as onboarding test user");

    // Step 2: Fetch all workouts for this user (use page.request to inherit cookies)
    const workoutsResponse = await page.request.get("/api/v1/workouts", {
      failOnStatusCode: false,
    });

    if (workoutsResponse.status() === 401) {
      console.warn("⚠ User not authenticated - skipping cleanup");
      return;
    }

    expect(workoutsResponse.ok()).toBeTruthy();

    const workoutsData = await workoutsResponse.json();
    const workouts = workoutsData.data || [];

    console.log(`Found ${workouts.length} workout(s) to delete`);

    // Step 3: Delete each workout
    let deletedCount = 0;
    let failedCount = 0;

    for (const workout of workouts) {
      try {
        // Use page.evaluate to call DELETE from page context (same-origin)
        const result = await page.evaluate(async (workoutId) => {
          const response = await fetch(`/api/v1/workouts/${workoutId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          });
          return {
            ok: response.ok,
            status: response.status,
            body: response.ok ? null : await response.text(),
          };
        }, workout.id);

        if (result.ok) {
          deletedCount++;
          console.log(`  ✓ Deleted workout ${workout.id}`);
        } else {
          failedCount++;
          console.warn(`  ✗ Failed to delete workout ${workout.id}: ${result.status} - ${result.body || "no body"}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`  ✗ Error deleting workout ${workout.id}:`, error);
      }
    }

    console.log(`Teardown complete: ${deletedCount} deleted, ${failedCount} failed`);

    // Don't fail the teardown if some deletions failed
    // (tests already passed, cleanup is best-effort)
    if (deletedCount > 0) {
      console.log("✓ Test user workouts cleaned up successfully");
    }
  } catch (error) {
    console.error("❌ Teardown failed (non-critical, setup will cleanup on next run):", error);
    // Don't throw - teardown failures should not fail the test run
  }
});
