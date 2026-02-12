import { test, expect } from '@playwright/test';

test('週進捗セクションが表示される', async ({ page }) => {
  await page.addInitScript(() => { window.__E2E__ = true; });

  await page.goto('/');

  await page.waitForSelector('.week-progress-section', { timeout: 10_000 });
  await page.waitForSelector('#week-range', { timeout: 10_000 });

  await expect(page.locator('.week-progress-section')).toBeVisible();
  await expect(page.locator('#week-range')).not.toBeEmpty();
});
