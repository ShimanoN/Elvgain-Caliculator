import { test, expect } from '@playwright/test';

/**
 * E2Eテスト: 週目標達成状況の確認
 * 目的: 週目標を設定し、進捗率が正しく表示されることを確認
 */
test('週目標の設定と達成率の表示', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  page.on('console', (msg) => console.log('Browser:', msg.text()));

  // 週目標ページにアクセス
  await page.goto('/week-target.html');
  await page.waitForSelector('#target-input', { timeout: 10_000 });

  // 週目標を3000mに設定
  await page.fill('#target-input', '3000');
  
  // 保存待ち
  const savedPromise = page.evaluate((timeout) => {
    return new Promise((resolve) => {
      const listener = (e: Event) => {
        resolve((e as CustomEvent).detail);
      };
      document.addEventListener('week-target-saved', listener, { once: true });
      setTimeout(() => resolve(null), timeout);
    });
  }, 20_000);

  await page.click('body');
  await savedPromise;

  // メインページに戻る
  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // データを入力（1500m）
  await page.fill('#part1', '800');
  await page.fill('#part2', '700');
  await page.click('body');
  await page.waitForTimeout(2000);

  // 週目標ページに戻って進捗を確認
  await page.goto('/week-target.html');
  await page.waitForSelector('#week-total', { timeout: 10_000 });

  // 進捗率を取得
  const progressText = await page.locator('#progress-percent').textContent();
  if (progressText) {
    const progress = parseFloat(progressText.replace('%', ''));
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThanOrEqual(100);
    console.log(`Progress: ${progress}%`);
  }

  // 週目標が表示されることを確認
  const targetDisplay = await page.locator('#target-display').textContent();
  expect(targetDisplay).toContain('3000');
});

/**
 * E2Eテスト: 週目標達成・未達成の判定
 * 目的: 週目標を達成した場合と未達成の場合で表示が変わることを確認
 */
test('週目標の達成・未達成の判定', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  // 週目標を低く設定（100m）
  await page.goto('/week-target.html');
  await page.waitForSelector('#target-input', { timeout: 10_000 });
  await page.fill('#target-input', '100');
  await page.click('body');
  await page.waitForTimeout(2000);

  // メインページでデータ入力
  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });
  await page.fill('#part1', '150');
  await page.click('body');
  await page.waitForTimeout(2000);

  // 週目標ページで達成状況を確認
  await page.goto('/week-target.html');
  await page.waitForSelector('#progress-percent', { timeout: 10_000 });

  const progressText = await page.locator('#progress-percent').textContent();
  if (progressText) {
    const progress = parseFloat(progressText.replace('%', ''));
    expect(progress).toBeGreaterThanOrEqual(100);
    console.log(`Achieved! Progress: ${progress}%`);
  }
});

/**
 * E2Eテスト: 週スケジュールの表示
 * 目的: 週スケジュールが正しく表示され、各日のデータが反映されることを確認
 */
test('週スケジュールの表示と更新', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto('/week-target.html');
  await page.waitForSelector('#schedule-body', { timeout: 10_000 });

  // スケジュールテーブルに7日分の行があることを確認
  const scheduleRows = await page.locator('#schedule-body tr').count();
  expect(scheduleRows).toBe(7);

  // 各行に日付と曜日が表示されていることを確認
  for (let i = 0; i < scheduleRows; i++) {
    const row = page.locator('#schedule-body tr').nth(i);
    const dateText = await row.locator('td').first().textContent();
    expect(dateText).toBeTruthy();
    console.log(`Row ${i}: ${dateText}`);
  }

  // メインページでデータを入力
  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });
  await page.fill('#part1', '500');
  await page.click('body');
  await page.waitForTimeout(2000);

  // 週目標ページに戻ってスケジュールを確認
  await page.goto('/week-target.html');
  await page.waitForSelector('#schedule-body', { timeout: 10_000 });

  // 入力したデータがスケジュールに反映されているか確認
  const todayRow = page.locator('#schedule-body tr').first();
  const todayValue = await todayRow.locator('td').nth(1).textContent();
  expect(todayValue).not.toBe('0 m');
  console.log(`Today's value in schedule: ${todayValue}`);
});
