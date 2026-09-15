// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the LMS client.
 *
 * The suite is API-stubbed by default (see e2e/helpers/api.js), so it needs
 * only the Vite dev server — no backend and no MongoDB. That keeps runs fast,
 * deterministic and safe to run in CI.
 *
 * Override the target with E2E_BASE_URL to run against a deployed environment.
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  /* `list` for live terminal feedback, `html` for the browsable report. */
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],

  /* Start Vite automatically unless we're pointed at an external environment. */
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
});
