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
  const authFile = "playwright/.auth/user.json";

  // Launch browser for cleanup with saved auth state
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL,
    storageState: authFile, // Use the same auth state as tests
  });
  const page = await context.newPage();

  try {
    // Step 1: Navigate to any page to establish page context for fetch
    console.log("  Using saved authentication state...");
    await page.goto("/");

    // Step 2: Fetch all workouts
    const fetchResult = await page.evaluate(async () => {
      const response = await fetch("/api/v1/workouts");
      const contentType = response.headers.get("content-type") || "";

      return {
        ok: response.ok,
        status: response.status,
        contentType,
        data: response.ok && contentType.includes("application/json") ? await response.json() : null,
        preview: !contentType.includes("application/json") ? (await response.text()).substring(0, 100) : null,
      };
    });

    if (!fetchResult.ok) {
      console.log(`  ⚠ Failed to fetch workouts (status ${fetchResult.status})`);
      return;
    }

    if (!fetchResult.contentType.includes("application/json")) {
      console.log(`  ⚠ Unexpected response format: ${fetchResult.contentType}. Skipping cleanup.`);
      console.log(`  Response preview: ${fetchResult.preview}...`);
      return;
    }

    const workouts = fetchResult.data?.data || [];

    console.log(`  Found ${workouts.length} workout(s) to delete`);

    // Step 3: Delete each workout
    let deletedCount = 0;
    let failedCount = 0;

    for (const workout of workouts) {
      try {
        const result = await page.evaluate(async (workoutId: string) => {
          const response = await fetch(`/api/v1/workouts/${workoutId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });
          return {
            ok: response.ok,
            status: response.status,
            body: response.ok ? null : await response.text(),
          };
        }, workout.id);

        if (result.ok) {
          deletedCount++;
          console.log(`    ✓ Deleted workout ${workout.id}`);
        } else {
          failedCount++;
          console.warn(`    ✗ Failed to delete workout ${workout.id}: ${result.status}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`    ✗ Error deleting workout ${workout.id}:`, error);
      }
    }

    console.log(`\n✅ Teardown complete: ${deletedCount} deleted, ${failedCount} failed`);
  } catch (error) {
    console.error("❌ Global teardown failed (non-critical):", error);
    // Don't throw - teardown failures should not fail the test run
  } finally {
    await browser.close();
  }
}

export default globalTeardown;
