import { test, expect } from '@playwright/test';

test('週目標を入力して再読み込みで保持される', async ({ page }) => {
  await page.goto('/week-target.html');

  // 入力に値を入れて保存動作を誘発
  await page.fill('#target-input', '3000');
  await page.click('body');

  // 再読み込みして値が残っていることを確認
  await page.reload();
  await expect(page.locator('#target-input')).toHaveValue('3000');
});
