import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for TeeVents e2e suite.
 *
 * Environment:
 *   BASE_URL                          – app URL under test (default http://localhost:8080)
 *   VITE_SUPABASE_URL                 – read by tests that call resolve_public_tournament
 *   VITE_SUPABASE_PUBLISHABLE_KEY     – anon key for the same project
 *   TEST_PUBLISHED_SLUG               – a published tournament's `slug` used in slug tests
 *   TEST_PUBLISHED_CUSTOM_SLUG        – a different published tournament whose `custom_slug` equals TEST_PUBLISHED_SLUG (optional, for collision test)
 *   TEST_PLAYER_AUTH_CODE             – 6-char auth code for live-scoring write tests (optional; tests that need it are skipped if missing)
 *
 * In CI these come from GitHub Action secrets.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8080",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  webServer: process.env.CI
    ? {
        command: "npm run build && npm run preview -- --port 8080 --strictPort",
        url: "http://localhost:8080",
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : undefined,
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
