import { test, expect } from '@playwright/test';

test('週目標を入力して再読み込みで保持される', async ({ page }) => {
  await page.goto('/week-target.html');

  // 入力に値を入れて保存動作を誘発
  await page.fill('#target-input', '3000');

  // saveTarget() は async なので、保存+再読込完了を示すカスタムイベントを待つ
  const savedPromise = page.evaluate(() => {
    return new Promise((resolve) => {
      document.addEventListener('week-target-loaded', () => resolve(), {
        once: true,
      });
    });
  });
  await page.click('body');
  await savedPromise;

  // 再読み込みして値が残っていることを確認
  await page.reload();
  await expect(page.locator('#target-input')).toHaveValue('3000');
});
