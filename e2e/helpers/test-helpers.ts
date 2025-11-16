import { Page } from "@playwright/test";

/**
 * Test Helper Functions
 * Reusable utilities for E2E tests
 */

/**
 * Wait for network idle (no pending requests for 500ms)
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Fill form field by label text
 */
export async function fillByLabel(page: Page, label: string, value: string) {
  const input = page.locator(`label:has-text("${label}") + input, label:has-text("${label}") input`);
  await input.fill(value);
}

/**
 * Click button by text
 */
export async function clickButton(page: Page, text: string) {
  await page.locator(`button:has-text("${text}")`).click();
}

/**
 * Wait for toast notification (if using sonner)
 */
export async function waitForToast(page: Page, message?: string) {
  const toast = message
    ? page.locator(`[data-sonner-toast]:has-text("${message}")`)
    : page.locator("[data-sonner-toast]");
  await toast.waitFor({ state: "visible", timeout: 5000 });
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  await page.screenshot({ path: `test-results/${name}-${timestamp}.png`, fullPage: true });
}

/**
 * Mock API response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mockApiResponse(page: Page, endpoint: string, response: any, status = 200) {
  await page.route(endpoint, (route) => {
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(response),
    });
  });
}

/**
 * Format date to YYYY-MM-DD (for date inputs)
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get today's date cell in calendar
 */
export async function getTodayCell(page: Page) {
  return page.locator('[role="gridcell"].ring-blue-500').first();
}
