/**
 * Playwright global setup
 * Sets window.__E2E__ flag for all tests
 */
import { chromium, firefox, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Global E2E setup: Starting...');

  // Environment variable is already set via playwright.config.ts webServer.env
  // This is just to log confirmation
  console.log('E2E mode enabled');

  return async () => {
    console.log('Global E2E teardown: Complete');
  };
}

export default globalSetup;
