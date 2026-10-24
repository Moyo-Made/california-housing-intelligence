import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  // Uses installed Google Chrome rather than Playwright's bundled Chromium, which
  // is not available for macOS 13. In CI, install it with `npx playwright install chrome`.
  projects: [
    { name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Point the app at a closed port so tests never depend on a locally running
    // API: browser tests mock /api/predict and /api/sweep themselves, and
    // `npm run test:contract` covers the real API.
    env: { BACKEND_URL: "http://127.0.0.1:9" },
  },
});
