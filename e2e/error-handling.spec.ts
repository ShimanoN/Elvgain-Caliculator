import { test, expect } from '@playwright/test';

/**
 * E2Eテスト: 無効なデータ入力のエラーハンドリング
 * 目的: 無効なデータが入力された場合の挙動を確認
 */
test('無効なデータ入力のエラーハンドリング', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  page.on('console', (msg) => console.log('Browser:', msg.text()));

  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // 負の値を入力
  await page.fill('#part1', '-100');
  await page.click('body');
  await page.waitForTimeout(1000);

  // 値が0にリセットされるか、または負の値が保存されないことを確認
  const part1Value = await page.locator('#part1').inputValue();
  const numValue = parseFloat(part1Value);
  expect(numValue).toBeGreaterThanOrEqual(0);
  console.log(`Negative value handled: ${part1Value}`);

  // 非数値を入力
  await page.fill('#part2', 'abc');
  await page.click('body');
  await page.waitForTimeout(1000);

  const part2Value = await page.locator('#part2').inputValue();
  console.log(`Non-numeric value handled: ${part2Value}`);
  // NaNでないことを確認（0または前の値を保持）
  expect(isNaN(parseFloat(part2Value))).toBeFalsy();
});

/**
 * E2Eテスト: データベース接続エラーのリカバリー
 * 目的: データベース操作が失敗した場合のエラーハンドリングを確認
 */
test('データベースエラーのリカバリー', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error')) {
      console.log('Error logged:', text);
    }
  });

  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // IndexedDBを一時的に無効化（エラーをシミュレート）
  await page.evaluate(() => {
    // @ts-ignore
    const originalIDB = window.indexedDB;
    // @ts-ignore
    window.indexedDB = undefined;
    
    // 1秒後に復元
    setTimeout(() => {
      // @ts-ignore
      window.indexedDB = originalIDB;
    }, 1000);
  });

  // データを入力（IndexedDBが無効な状態）
  await page.fill('#part1', '500');
  await page.click('body');
  await page.waitForTimeout(2000);

  // ページがクラッシュしていないことを確認
  const isVisible = await page.locator('#part1').isVisible();
  expect(isVisible).toBeTruthy();
  console.log('Page recovered from database error');
});

/**
 * E2Eテスト: ネットワークエラーのハンドリング
 * 目的: Firebase接続エラー時の挙動を確認
 */
test('ネットワークエラーのハンドリング', async ({ page, context }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  // ネットワークリクエストをブロック
  await context.route('**/*firestore*/**', route => route.abort());
  await context.route('**/*googleapis.com/**', route => route.abort());

  page.on('console', (msg) => {
    const text = msg.text();
    if (text.includes('error') || text.includes('Error') || text.includes('failed')) {
      console.log('Network error logged:', text);
    }
  });

  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // データを入力（Firestoreへの接続が失敗する）
  await page.fill('#part1', '800');
  await page.fill('#part2', '600');
  await page.click('body');
  await page.waitForTimeout(3000);

  // アプリケーションが応答し続けることを確認
  const dailyTotal = await page.locator('#daily-total').textContent();
  expect(dailyTotal).toBeTruthy();
  console.log(`App continues to work despite network error: ${dailyTotal}`);
});

/**
 * E2Eテスト: 極端な値の入力
 * 目的: 極端に大きい/小さい値が正しく処理されることを確認
 */
test('極端な値の入力処理', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // 非常に大きな値を入力
  await page.fill('#part1', '999999');
  await page.click('body');
  await page.waitForTimeout(1500);

  const dailyTotal = await page.locator('#daily-total').textContent();
  console.log(`Large value handling: ${dailyTotal}`);
  
  // 値が保存されるか、または適切な上限でクリップされることを確認
  expect(dailyTotal).toBeTruthy();
  if (dailyTotal) {
    const total = parseFloat(dailyTotal.replace(/[^0-9.]/g, ''));
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(10000000); // 現実的な上限
  }

  // 小数点を含む値を入力
  await page.fill('#part2', '123.456');
  await page.click('body');
  await page.waitForTimeout(1500);

  const part2Value = await page.locator('#part2').inputValue();
  console.log(`Decimal value handling: ${part2Value}`);
  
  // 小数点が適切に処理されることを確認
  const decimalValue = parseFloat(part2Value);
  expect(decimalValue).toBeGreaterThan(0);
});

/**
 * E2Eテスト: 同時編集のハンドリング
 * 目的: 複数のタブで同時に編集した場合の挙動を確認
 */
test('複数タブでの同時編集', async ({ browser }) => {
  // 2つのページを作成
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  await page1.addInitScript(() => { window.__E2E__ = true; });
  await page2.addInitScript(() => { window.__E2E__ = true; });

  // 両方のページをロード
  await Promise.all([
    page1.goto('/'),
    page2.goto('/')
  ]);

  await Promise.all([
    page1.waitForSelector('#part1', { timeout: 10_000 }),
    page2.waitForSelector('#part1', { timeout: 10_000 })
  ]);

  // タブ1でデータを入力
  await page1.fill('#part1', '500');
  await page1.click('body');
  await page1.waitForTimeout(2000);

  // タブ2でも異なるデータを入力
  await page2.fill('#part1', '300');
  await page2.click('body');
  await page2.waitForTimeout(2000);

  // タブ1をリロードして最新データを確認
  await page1.reload();
  await page1.waitForSelector('#part1', { timeout: 10_000 });
  await page1.waitForTimeout(2000);

  const tab1Value = await page1.locator('#part1').inputValue();
  console.log(`Tab1 value after reload: ${tab1Value}`);

  // どちらかの値が保存されていることを確認（最後に保存された方）
  const finalValue = parseFloat(tab1Value);
  expect(finalValue === 500 || finalValue === 300).toBeTruthy();

  await context1.close();
  await context2.close();
});

/**
 * E2Eテスト: ページリロード後のデータ永続性
 * 目的: データが正しく保存され、リロード後も維持されることを確認
 */
test('ページリロード後のデータ永続性', async ({ page }) => {
  await page.addInitScript(() => {
    window.__E2E__ = true;
  });

  await page.goto('/');
  await page.waitForSelector('#part1', { timeout: 10_000 });

  // データを入力
  const testValue1 = '750';
  const testValue2 = '450';
  await page.fill('#part1', testValue1);
  await page.fill('#part2', testValue2);
  await page.click('body');
  await page.waitForTimeout(3000); // 保存を十分に待つ

  // ページをリロード
  await page.reload();
  await page.waitForSelector('#part1', { timeout: 10_000 });
  await page.waitForTimeout(2000);

  // データが保持されていることを確認
  const reloadedValue1 = await page.locator('#part1').inputValue();
  const reloadedValue2 = await page.locator('#part2').inputValue();

  expect(reloadedValue1).toBe(testValue1);
  expect(reloadedValue2).toBe(testValue2);
  console.log(`Data persisted after reload: ${reloadedValue1}, ${reloadedValue2}`);
});
