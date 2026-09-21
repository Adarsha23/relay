import { defineConfig, devices } from "@playwright/test";

// Tests run on a dedicated port with a fresh server every time, so they always reflect
// the current code (never a stale `pnpm dev` left running on :3000).
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  // One shared local backend, so run specs serially to avoid cross-test interference.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
