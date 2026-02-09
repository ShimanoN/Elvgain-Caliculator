import { test, expect } from '@playwright/test';

test('週目標ページの基本表示', async ({ page }) => {
  await page.goto('/week-target.html');

  await expect(page.locator('#week-number')).not.toBeEmpty();
  await expect(page.locator('#target-input')).toBeVisible();
  await expect(page.locator('#schedule-body')).toBeVisible();
});
