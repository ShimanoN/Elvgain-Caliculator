import { test, expect } from '@playwright/test';

test('週間スケジュール画像エクスポートが動作する（html2canvasをスタブ）', async ({
  page,
}) => {
  await page.addInitScript(() => { window.__E2E__ = true; });

  // html2canvas を簡易スタブして高速に完了させる
  await page.addInitScript(() => {
    window.html2canvas = async (_el: HTMLElement, _opts?: any) => {
      const c = document.createElement('canvas');
      c.width = 200;
      c.height = 100;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Failed to get 2d context');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      return c;
    };
  });

  await page.goto('/week-target.html');

  const btn = page.locator('#btn-export-schedule');
  await page.waitForSelector('#btn-export-schedule', { timeout: 10_000 });
  await expect(btn).toBeVisible();

  // クリックしてエラーが出ないことを確認（ダウンロードはブラウザ側で処理）
  await btn.click();
});
