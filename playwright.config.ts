import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  globalSetup: './e2e/global-setup.ts',
  // Launch options to reduce CORS issues when running emulators in-browser
  // Tests run in a controlled environment; disabling web security helps
  // the browser reach local emulator endpoints during E2E runs.
  use: {
    baseURL: 'http://localhost:8000',
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    },
  },
  webServer: {
    command: 'npm run dev',
    port: 8000,
    reuseExistingServer: true,
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
