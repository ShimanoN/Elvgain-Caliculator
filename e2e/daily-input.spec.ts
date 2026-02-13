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

  // Prepare to wait for the save-complete event in the page context with timeout and cleanup
  const savedPromise = page.evaluate((timeout) => {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const listener = (e: Event) => {
        if (timeoutId !== null) clearTimeout(timeoutId);
        resolve((e as CustomEvent).detail);
      };
      document.addEventListener('day-log-saved', listener, { once: true });
      timeoutId = setTimeout(() => {
        document.removeEventListener('day-log-saved', listener);
        reject(new Error('Timed out waiting for day-log-saved event'));
      }, timeout);
    });
  }, 20_000);

  // blur to trigger save
  await page.click('body');

  // Wait for event (or throw on timeout)
  const savedDetail = await savedPromise;
  console.log('E2E: received day-log-saved detail:', savedDetail);

  // Now the UI should reflect the saved values
  await expect(page.locator('#daily-total')).toHaveText('1500', {
    timeout: 10_000,
  });

  // additionally ensure values are persisted after reload
  await page.reload();
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#part1')).toHaveValue('800', { timeout: 10_000 });
  await expect(page.locator('#part2')).toHaveValue('700', { timeout: 10_000 });
});
