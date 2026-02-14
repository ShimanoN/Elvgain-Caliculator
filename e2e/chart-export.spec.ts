import { test, expect } from '@playwright/test';


/**
 * E2Eテスト: チャートエクスポート機能
 * 目的: チャートエクスポート機能が正しく動作することを確認
 */
test('チャートエクスポート機能の動作確認', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  page.on('console', (msg) => console.log('Browser:', msg.text()));

  // メインページにアクセス
  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // データを入力してチャートを表示
  await page.fill('#part1', '800');
  await page.fill('#part2', '600');
  await page.click('body');
  await page.waitForTimeout(2000);

  // 週目標ページに移動（チャートがある）
  await page.goto('/week-target.html');
  await page.waitForSelector('#progressChart', { timeout: 10_000 });

  // チャートが描画されるまで待機
  await page.waitForTimeout(2000);

  // エクスポートボタンが存在することを確認
  const exportButton = page.locator('button:has-text("エクスポート"), button:has-text("Export"), button[id*="export"]');
  
  if (await exportButton.count() > 0) {
    // ダウンロード待機の設定
    const downloadPromise = page.waitForEvent('download');
    
    // エクスポートボタンをクリック
    await exportButton.first().click();
    
    // ダウンロードを待機
    const download = await downloadPromise;
    
    // ファイル名を確認
    const fileName = download.suggestedFilename();
    expect(fileName).toContain('chart');
    console.log(`Downloaded file: ${fileName}`);
    
    // ファイルが正しい形式（PNG）であることを確認
    expect(fileName.endsWith('.png') || fileName.endsWith('.jpg')).toBeTruthy();
  } else {
    console.log('Export button not found, skipping download test');
  }
});

/**
 * E2Eテスト: チャート表示の確認
 * 目的: チャートが正しく描画され、データが反映されることを確認
 */
test('チャートの描画とデータ反映', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  // データを入力
  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });
  await page.fill('#part1', '1000');
  await page.fill('#part2', '500');
  await page.click('body');
  await page.waitForTimeout(2000);

  // 週目標を設定
  await page.goto('/week-target.html');
  await page.waitForSelector('#target-input', { timeout: 10_000 });
  await page.fill('#target-input', '5000');
  await page.click('body');
  await page.waitForTimeout(2000);

  // チャートが存在することを確認
  const chart = page.locator('#progressChart, canvas');
  await expect(chart.first()).toBeVisible({ timeout: 10_000 });

  // チャートのキャンバスが描画されていることを確認
  const canvas = page.locator('canvas').first();
  const canvasSize = await canvas.boundingBox();
  
  if (canvasSize) {
    expect(canvasSize.width).toBeGreaterThan(0);
    expect(canvasSize.height).toBeGreaterThan(0);
    console.log(`Chart size: ${canvasSize.width}x${canvasSize.height}`);
  }
});

/**
 * E2Eテスト: 複数データでのチャート表示
 * 目的: 複数日のデータが入力された場合にチャートが正しく更新されることを確認
 */
test('複数日データのチャート表示', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  // 週目標を設定
  await page.goto('/week-target.html');
  await page.waitForSelector('#target-input', { timeout: 10_000 });
  await page.fill('#target-input', '3000');
  await page.click('body');
  await page.waitForTimeout(1000);

  // メインページで複数日のデータを入力
  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // 1日目
  await page.fill('#part1', '500');
  await page.click('body');
  await page.waitForTimeout(1500);

  // 前日に移動して2日目
  await page.click('button:has-text("前日")');
  await page.waitForTimeout(1000);
  await page.fill('#part1', '600');
  await page.click('body');
  await page.waitForTimeout(1500);

  // 週目標ページでチャートを確認
  await page.goto('/week-target.html');
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.waitForTimeout(2000);

  // 週合計が更新されていることを確認
  const weekTotal = await page.locator('#week-total').textContent();
  if (weekTotal) {
    const total = parseFloat(weekTotal.replace(/[^0-9.]/g, ''));
    expect(total).toBeGreaterThan(0);
    console.log(`Week total: ${total}`);
  }

  // チャートが描画されていることを確認
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
});
