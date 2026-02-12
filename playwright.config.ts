import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:8000',
  },
  webServer: {
    command: 'npm run dev',
    port: 8000,
    reuseExistingServer: false,
    // Increase timeout to allow dev server to fully start on CI
    timeout: 120_000,
    // Pass E2E env flag so app can use test-friendly behavior (mock backends etc.)
    env: {
      E2E: '1',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
  ],
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
});
