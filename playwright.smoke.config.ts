import { defineConfig, devices } from "@playwright/test";

// Public-page checks use a clean browser and never run the authenticated suite's data teardown.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "auth-smoke.spec.ts",
  fullyParallel: true,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "HOST=127.0.0.1 PORT=4173 node --env-file-if-exists=.env dist/server/entry.mjs",
    url: "http://127.0.0.1:4173/login",
    reuseExistingServer: false,
    timeout: 30000,
  },
});
