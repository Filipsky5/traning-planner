/* eslint-disable no-console */
import { chromium, type FullConfig } from "@playwright/test";

/**
 * Global Teardown - runs ALWAYS after all tests complete
 * Cleans up test user workouts regardless of test results
 *
 * This function runs even if tests fail, ensuring clean state for next run
 */
async function globalTeardown(config: FullConfig) {
  console.log("\n🧹 Global Teardown: Cleaning up test data...");

  const baseURL = config.projects[0].use.baseURL || "http://localhost:3000";
  const username = process.env.E2E_USERNAME || "test@example.com";
  const password = process.env.E2E_PASSWORD || "password123";

  // Launch browser for cleanup
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    // Step 1: Login to get auth cookies
    console.log("  Logging in as test user...");
    await page.goto("/auth/login");
    await page.fill('input[type="email"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL((url) => !url.pathname.includes("/auth/login"), {
      timeout: 10000,
    });

    console.log("  ✓ Logged in successfully");

    // Step 2: Fetch all workouts
    const workoutsResponse = await page.request.get("/api/v1/workouts", {
      failOnStatusCode: false,
    });

    if (!workoutsResponse.ok()) {
      console.log("  ⚠ No workouts to cleanup or user not authenticated");
      return;
    }

    const workoutsData = await workoutsResponse.json();
    const workouts = workoutsData.data || [];

    console.log(`  Found ${workouts.length} workout(s) to delete`);

    // Step 3: Delete each workout
    let deletedCount = 0;
    let failedCount = 0;

    for (const workout of workouts) {
      try {
        const result = await page.evaluate(
          async (workoutId: string) => {
            const response = await fetch(`/api/v1/workouts/${workoutId}`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
            });
            return {
              ok: response.ok,
              status: response.status,
              body: response.ok ? null : await response.text(),
            };
          },
          workout.id
        );

        if (result.ok) {
          deletedCount++;
          console.log(`    ✓ Deleted workout ${workout.id}`);
        } else {
          failedCount++;
          console.warn(
            `    ✗ Failed to delete workout ${workout.id}: ${result.status}`
          );
        }
      } catch (error) {
        failedCount++;
        console.error(`    ✗ Error deleting workout ${workout.id}:`, error);
      }
    }

    console.log(
      `\n✅ Teardown complete: ${deletedCount} deleted, ${failedCount} failed`
    );
  } catch (error) {
    console.error("❌ Global teardown failed (non-critical):", error);
    // Don't throw - teardown failures should not fail the test run
  } finally {
    await browser.close();
  }
}

export default globalTeardown;
