import { test as teardown, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Teardown for onboarding tests
 * Cleans up all workouts created by the onboarding test user
 * Runs after all onboarding-flow tests complete
 */
teardown('cleanup onboarding test user workouts', async ({ page }) => {
  console.log('Starting teardown: cleaning up onboarding test user workouts...');

  // Step 1: Login as test user
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(
    process.env.E2E_USERNAME || 'test@example.com',
    process.env.E2E_PASSWORD || 'password123'
  );
  await loginPage.waitForNavigation();

  console.log('✓ Logged in as onboarding test user');

  // Step 2: Fetch all workouts for this user (use page.request to inherit cookies)
  const workoutsResponse = await page.request.get('/api/v1/workouts', {
    failOnStatusCode: false,
  });

  if (workoutsResponse.status() === 401) {
    console.warn('⚠ User not authenticated - skipping cleanup');
    return;
  }

  expect(workoutsResponse.ok()).toBeTruthy();

  const workoutsData = await workoutsResponse.json();
  const workouts = workoutsData.data || [];

  console.log(`Found ${workouts.length} workout(s) to delete`);

  // Step 3: Delete each workout (best-effort cleanup)
  let deletedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  for (const workout of workouts) {
    try {
      const deleteResponse = await page.request.delete(`/api/v1/workouts/${workout.id}`, {
        failOnStatusCode: false,
      });

      if (deleteResponse.ok()) {
        deletedCount++;
        console.log(`  ✓ Deleted workout ${workout.id}`);
      } else if (deleteResponse.status() === 403) {
        // 403 = workout belongs to different user (from previous test run)
        skippedCount++;
        console.log(`  ⊘ Skipped workout ${workout.id} (belongs to different user)`);
      } else {
        failedCount++;
        console.warn(`  ✗ Failed to delete workout ${workout.id}: ${deleteResponse.status()}`);
      }
    } catch (error) {
      failedCount++;
      console.error(`  ✗ Error deleting workout ${workout.id}:`, error);
    }
  }

  console.log(`Teardown complete: ${deletedCount} deleted, ${skippedCount} skipped (other user), ${failedCount} failed`);

  // Don't fail the teardown if some deletions failed
  // (tests already passed, cleanup is best-effort)
  if (deletedCount > 0 || skippedCount > 0) {
    console.log('✓ Teardown finished (workouts from other users were skipped)');
  }
});
