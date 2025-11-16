import { test as base, Page } from "@playwright/test";

/**
 * Authentication Fixture
 * Provides authenticated page state for tests requiring login
 *
 * Usage:
 * import { test } from './fixtures/auth';
 *
 * test('authenticated test', async ({ authenticatedPage }) => {
 *   // Page is already logged in
 * });
 */

interface AuthFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // TODO: Implement actual login flow
    // This is a placeholder - replace with actual auth implementation

    // Option 1: Use stored auth state (faster)
    // await page.context().addCookies([...]);

    // Option 2: Login via UI
    // await page.goto('/login');
    // await page.fill('input[type="email"]', 'test@example.com');
    // await page.fill('input[type="password"]', 'password123');
    // await page.click('button[type="submit"]');
    // await page.waitForURL(/\/(onboarding|$)/);

    // Option 3: Login via API (fastest)
    // await page.request.post('/api/auth/login', {
    //   data: { email: 'test@example.com', password: 'password123' }
    // });

    await page.goto("/");

    // Use the authenticated page
    await use(page);
  },
});

export { expect } from "@playwright/test";
