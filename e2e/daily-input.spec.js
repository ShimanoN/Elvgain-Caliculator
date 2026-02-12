import { test, expect } from '@playwright/test';

test('日次入力の基本フロー', async ({ page }) => {
  // mark E2E so app can switch to test-friendly behavior
  await page.addInitScript(() => { window.__E2E__ = true; });

  // Collect browser console for diagnostics
  page.on('console', (msg) => console.log('Browser:', msg.text()));

  await page.goto('/');

  // Wait for inputs to be present
  await page.waitForSelector('#part1', { timeout: 10_000 });
  await page.waitForSelector('#part2', { timeout: 10_000 });

  await page.fill('#part1', '800');
  await page.fill('#part2', '700');

  // blur to trigger save
  await page.click('body');

  // Wait for calculated total to appear (allow some timeout)
  await expect(page.locator('#daily-total')).toHaveText('1500', { timeout: 10_000 });

  await page.reload();
  // Wait for page to finish loading and initialize
  await page.waitForLoadState('networkidle');

  // Ensure inputs re-populated
  await expect(page.locator('#part1')).toHaveValue('800', { timeout: 10_000 });
  await expect(page.locator('#part2')).toHaveValue('700', { timeout: 10_000 });
});
