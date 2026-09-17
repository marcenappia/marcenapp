import { defineConfig, devices } from '@playwright/test';

const SUPABASE_URL = 'https://uzhqhieqlcyncelltfjw.supabase.co';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  webServer: {
    // The CI workflow already performs the production build immediately
    // before Playwright. Reuse that build instead of compiling the app again.
    command: `VITE_SUPABASE_URL=${SUPABASE_URL} npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.2,
    },
  },
  projects: [
    {
      name: 'chromium',
      grepInvert: /@yara/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      grepInvert: /@yara/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      grepInvert: /@yara/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      grepInvert: /@yara/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      grepInvert: /@yara/,
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'YARA Chromium',
      grep: /@yara/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
