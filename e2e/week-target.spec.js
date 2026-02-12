import { test, expect } from '@playwright/test';

test('週目標ページの基本表示', async ({ page }) => {
  await page.addInitScript(() => { window.__E2E__ = true; });

  await page.goto('/week-target.html');

  await page.waitForSelector('#week-number', { timeout: 10_000 });
  await page.waitForSelector('#target-input', { timeout: 10_000 });
  await page.waitForSelector('#schedule-body', { timeout: 10_000 });

  await expect(page.locator('#week-number')).not.toBeEmpty();
  await expect(page.locator('#target-input')).toBeVisible();
  await expect(page.locator('#schedule-body')).toBeVisible();
});
