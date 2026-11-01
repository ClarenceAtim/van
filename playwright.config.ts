import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /purchase/ },
  ],
  // Uses an already-running server if there is one (e.g. `npm run build && npm start`).
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run start", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
