import { test, expect } from '@playwright/test';

test('週間スケジュール画像エクスポートが動作する（html2canvasをスタブ）', async ({
  page,
}) => {
  // html2canvas を簡易スタブして高速に完了させる
  await page.addInitScript(() => {
    window.html2canvas = async (el, opts) => {
      const c = document.createElement('canvas');
      c.width = 200;
      c.height = 100;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      return c;
    };
  });

  await page.goto('/week-target.html');

  const btn = page.locator('#btn-export-schedule');
  await expect(btn).toBeVisible();

  // クリックしてエラーが出ないことを確認（ダウンロードはブラウザ側で処理）
  await btn.click();

  // ボタンが元に戻るのを待つ
  await expect(btn).toHaveText(/週間スケジュールを画像で出力/);
});
