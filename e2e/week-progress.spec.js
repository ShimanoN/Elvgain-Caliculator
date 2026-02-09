import { test, expect } from '@playwright/test';

test('週進捗セクションが表示される', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.week-progress-section')).toBeVisible();
  await expect(page.locator('#week-range')).not.toBeEmpty();
});
