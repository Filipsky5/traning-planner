import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Playwright E2E Test Configuration
 * According to tech-stack.md: Chromium only, Desktop + Mobile viewports
 */

export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: process.env.CI ? [["html"], ["list"], ["github"]] : [["html"], ["list"]],

  // Shared settings for all projects
  use: {
    // Base URL for tests (local dev server)
    baseURL: "http://localhost:3000",

    // Collect trace on failure for debugging
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",
  },

  // Projects configuration - Chromium only per guidelines
  projects: [
    // Setup project - prepares authenticated user with completed onboarding
    {
      name: "setup",
      testMatch: /.*auth\.setup\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    // Desktop tests - use authenticated state
    {
      name: "chromium-desktop",
      dependencies: ["setup"],
      testIgnore: [/.*auth\.setup\.ts/, /.*onboarding-flow\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // Use saved auth state for calendar and other authenticated tests
        storageState: "playwright/.auth/user.json",
      },
    },
    // Mobile tests - use authenticated state
    {
      name: "chromium-mobile",
      dependencies: ["setup"],
      testIgnore: [/.*auth\.setup\.ts/, /.*onboarding-flow\.spec\.ts/],
      use: {
        ...devices["iPhone 12"],
        viewport: { width: 390, height: 844 },
        // Use saved auth state for calendar and other authenticated tests
        storageState: "playwright/.auth/user.json",
      },
    },
    // Onboarding flow tests - test fresh user (no auth state)
    {
      name: "onboarding-flow",
      testMatch: /.*onboarding-flow\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        // NO storageState - tests fresh user experience
      },
    },
  ],

  // Web server configuration
  // Run production build before tests (npm run build + npm run preview:test)
  webServer: {
    command: "npm run preview:test",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    // Pass environment variables from .env.test to the preview server
    env: {
      ...process.env,
    },
  },
});
