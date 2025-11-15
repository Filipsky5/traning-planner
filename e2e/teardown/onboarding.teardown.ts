import { test as teardown, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

/**
 * Teardown for onboarding tests
 * Cleans up all workouts created by the onboarding test user
 * Runs after all onboarding-flow tests complete
 */
teardown('cleanup onboarding test user workouts', async ({ page, request }) => {
  console.log('Starting teardown: cleaning up onboarding test user workouts...');

  // Step 1: Login as onboarding test user
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login(
    process.env.E2E_ONBOARDING_USERNAME || 'onboarding@example.com',
    process.env.E2E_ONBOARDING_PASSWORD || 'password123'
  );
  await loginPage.waitForNavigation();

  console.log('✓ Logged in as onboarding test user');

  // Step 2: Fetch all workouts for this user
  const workoutsResponse = await request.get('/api/v1/workouts', {
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

  // Step 3: Delete each workout
  let deletedCount = 0;
  let failedCount = 0;

  for (const workout of workouts) {
    try {
      const deleteResponse = await request.delete(`/api/v1/workouts/${workout.id}`, {
        failOnStatusCode: false,
      });

      if (deleteResponse.ok()) {
        deletedCount++;
        console.log(`  ✓ Deleted workout ${workout.id}`);
      } else {
        failedCount++;
        console.warn(`  ✗ Failed to delete workout ${workout.id}: ${deleteResponse.status()}`);
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
    console.log('✓ Onboarding test user is ready for next test run');
  }
});
