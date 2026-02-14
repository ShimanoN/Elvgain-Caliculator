import { test, expect } from '@playwright/test';

test('週目標を入力して再読み込みで保持される', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto('/week-target.html');

  // Ensure input exists
  await page.waitForSelector('#target-input', { timeout: 10_000 });

  // 入力に値を入れて保存動作を誘発
  await page.fill('#target-input', '3000');

  // Prepare to wait for the save-complete event
  const savedPromise = page.evaluate((timeout) => {
    return new Promise((resolve, reject) => {
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const listener = (e: Event) => {
        if (timeoutId !== null) clearTimeout(timeoutId);
        resolve((e as CustomEvent).detail);
      };
      document.addEventListener('week-target-saved', listener, { once: true });
      timeoutId = setTimeout(() => {
        document.removeEventListener('week-target-saved', listener);
        reject(new Error('Timed out waiting for week-target-saved event'));
      }, timeout);
    });
  }, 20_000);

  // Trigger blur to save
  await page.click('body');

  // Wait for save event (or throw on timeout)
  const savedDetail = await savedPromise;
  console.log('E2E: received week-target-saved detail:', savedDetail);

  // Wait for save operation to complete
  await page.waitForTimeout(1000);

  // 再読み込みして値が残っていることを確認
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Wait for the input to be populated with the saved value
  await page.waitForFunction(
    () => {
      const input = document.querySelector(
        '#target-input'
      ) as HTMLInputElement | null;
      return input && input.value === '3000';
    },
    { timeout: 10_000 }
  );

  await expect(page.locator('#target-input')).toHaveValue('3000', {
    timeout: 10_000,
  });
});
