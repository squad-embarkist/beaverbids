import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";
import { assertLocalDatabase } from "./e2e/db";

// End-to-end tests for the four M3 screens. They create and delete real
// accounts, so they refuse to run against anything but the local database
// (docker compose, or the CI service): see e2e/db.ts.
assertLocalDatabase();

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  reporter: CI ? "github" : "list",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // 375 px wide, the narrowest layout the UI guide requires.
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: !CI,
      timeout: 120_000,
      stdout: "ignore",
    },
    {
      // The worker scores a new profile within seconds of a save. It has no
      // port, so readiness is its first log line. A worker already running
      // locally is fine: the stately queues keep the two from colliding.
      command: "npm run worker",
      wait: { stdout: /worker started/ },
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
