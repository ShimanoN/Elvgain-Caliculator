import { test } from '@playwright/test';

test('デバッグ: IndexedDB キャッシュの persistence を確認', async ({
  page,
}) => {
  await page.addInitScript(() => { window.__E2E__ = true; });

  await page.goto('/');

  // Open DevTools console to log cache state
  const consoleMessages: string[] = [];
  page.on('console', (msg) => consoleMessages.push(msg.text()));

  // Wait for page to be ready
  await page.waitForSelector('#part1', { timeout: 10_000 });
  await page.waitForSelector('#part2', { timeout: 10_000 });

  // Check initial cache state
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open('ElevationLoomCache', 1);
      req.onupgradeneeded = () => {};
      req.onsuccess = () => resolve(req.result);
    });
    const tx = db.transaction(['weekData'], 'readonly');
    const store = tx.objectStore('weekData');
    const allReq = store.getAll();
    allReq.onsuccess = () => {
      console.log('Initial cache:', JSON.stringify(allReq.result));
    };
  });

  await page.waitForTimeout(500);

  // Fill and save
  await page.fill('#part1', '800');
  await page.fill('#part2', '700');
  await page.click('body');

  // Check cache after save
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open('ElevationLoomCache', 1);
      req.onsuccess = () => resolve(req.result);
    });
    const tx = db.transaction(['weekData'], 'readonly');
    const store = tx.objectStore('weekData');
    const allReq = store.getAll();
    allReq.onsuccess = () => {
      console.log('After save cache:', JSON.stringify(allReq.result));
    };
  });

  await page.waitForTimeout(500);
  console.log('Console before reload:', consoleMessages);

  // Reload
  await page.reload();

  // Check cache after reload
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const req = indexedDB.open('ElevationLoomCache', 1);
      req.onsuccess = () => resolve(req.result);
    });
    const tx = db.transaction(['weekData'], 'readonly');
    const store = tx.objectStore('weekData');
    const allReq = store.getAll();
    allReq.onsuccess = () => {
      console.log('After reload cache:', JSON.stringify(allReq.result));
    };
  });

  await page.waitForTimeout(500);

  // Check form values
  const part1 = await page.locator('#part1').inputValue();
  const part2 = await page.locator('#part2').inputValue();
  console.log('Form values after reload:', { part1, part2 });

  console.log('Console after reload:', consoleMessages);
});
