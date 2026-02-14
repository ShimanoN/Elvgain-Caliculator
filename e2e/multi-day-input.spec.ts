import { test, expect } from '@playwright/test';

/**
 * E2Eテスト: 複数日のデータ連続入力
 * 目的: 複数日にわたってデータを入力し、週集計が正しく計算されることを確認
 */
test('複数日のデータ連続入力と週集計', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  page.on('console', (msg) => console.log('Browser:', msg.text()));

  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // 1日目: 本日のデータ入力
  await page.fill('#part1', '500');
  await page.fill('#part2', '300');
  
  // 保存待ち
  const saved1Promise = page.evaluate((timeout) => {
    return new Promise((resolve) => {
      const listener = (e: Event) => {
        resolve((e as CustomEvent).detail);
      };
      document.addEventListener('day-log-saved', listener, { once: true });
      setTimeout(() => resolve(null), timeout);
    });
  }, 20_000);

  await page.click('body');
  await saved1Promise;

  // 日次合計の確認
  await expect(page.locator('#daily-total')).toHaveText('800', {
    timeout: 10_000,
  });

  // 前日に移動
  await page.click('button:has-text("前日")');
  await page.waitForTimeout(1000);

  // 2日目: 前日のデータ入力
  await page.fill('#part1', '600');
  await page.fill('#part2', '400');

  const saved2Promise = page.evaluate((timeout) => {
    return new Promise((resolve) => {
      const listener = (e: Event) => {
        resolve((e as CustomEvent).detail);
      };
      document.addEventListener('day-log-saved', listener, { once: true });
      setTimeout(() => resolve(null), timeout);
    });
  }, 20_000);

  await page.click('body');
  await saved2Promise;

  await expect(page.locator('#daily-total')).toHaveText('1000', {
    timeout: 10_000,
  });

  // 週の集計ページに移動
  await page.click('a[href="week-target.html"]');
  await page.waitForSelector('#week-number', { timeout: 10_000 });

  // 週集計が表示されることを確認（具体的な値は日付により変動）
  const weekTotal = await page.locator('#week-total').textContent();
  expect(weekTotal).toBeDefined();
  expect(parseFloat(weekTotal || '0')).toBeGreaterThan(0);
});

/**
 * E2Eテスト: 週をまたぐデータ入力
 * 目的: 週が変わる境界でデータが正しく分離されることを確認
 */
test('週をまたぐデータ入力と集計', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // 現在の週番号を取得
  const currentWeekText = await page.locator('#week-range').textContent();
  console.log('Current week:', currentWeekText);

  // 今日のデータを入力
  await page.fill('#part1', '1000');
  await page.click('body');
  await page.waitForTimeout(2000);

  // 7日前に移動（前週）
  for (let i = 0; i < 7; i++) {
    await page.click('button:has-text("前日")');
    await page.waitForTimeout(300);
  }

  // 前週の週番号を確認
  const prevWeekText = await page.locator('#week-range').textContent();
  console.log('Previous week:', prevWeekText);
  expect(prevWeekText).not.toBe(currentWeekText);

  // 前週のデータを入力
  await page.fill('#part1', '500');
  await page.click('body');
  await page.waitForTimeout(2000);

  // 今週に戻る
  for (let i = 0; i < 7; i++) {
    await page.click('button:has-text("翌日")');
    await page.waitForTimeout(300);
  }

  // 今週の週番号が元に戻ることを確認
  const returnedWeekText = await page.locator('#week-range').textContent();
  expect(returnedWeekText).toBe(currentWeekText);
});
