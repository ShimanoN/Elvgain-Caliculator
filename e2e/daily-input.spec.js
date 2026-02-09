import { test, expect } from '@playwright/test';

test('日次入力の基本フロー', async ({ page }) => {
  await page.goto('/');

  await page.fill('#part1', '800');
  await page.fill('#part2', '700');

  // blur to trigger save
  await page.click('body');

  await expect(page.locator('#daily-total')).toHaveText('1500');

  await page.reload();

  await expect(page.locator('#part1')).toHaveValue('800');
  await expect(page.locator('#part2')).toHaveValue('700');
});
