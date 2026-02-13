import { test, expect } from '@playwright/test';

test('日次入力の基本フロー', async ({ page }) => {
  // mark E2E so app can switch to test-friendly behavior
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  // Collect browser console for diagnostics
  page.on('console', (msg) => console.log('Browser:', msg.text()));

  await page.goto('/');

  // Wait for inputs to be present
  await page.waitForSelector('#part1', { timeout: 10_000 });
  await page.waitForSelector('#part2', { timeout: 10_000 });

  // Fill both inputs
  await page.fill('#part1', '800');
  await page.fill('#part2', '700');

  // blur to trigger save and wait for day-log-saved event
  await page.click('body');

  // Wait for day-log-saved event instead of polling
  await page.evaluate(() => {
    return new Promise((resolve) => {
      document.addEventListener('day-log-saved', () => resolve(), {
        once: true,
      });
      // Timeout safety fallback
      setTimeout(() => resolve(), 20_000);
    });
  });

  // Verify the total is updated
  const dailyTotal = await page.locator('#daily-total').textContent();
  expect(dailyTotal).toBe('1500');

  // additionally ensure values are persisted after reload
  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#part1')).toHaveValue('800', { timeout: 10_000 });
  await expect(page.locator('#part2')).toHaveValue('700', { timeout: 10_000 });
});
