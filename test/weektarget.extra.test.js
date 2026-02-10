import { describe, it, expect, beforeEach } from 'vitest';

describe('WeekTarget DB operations', () => {
  beforeEach(async () => {
    // ensure clean DB
    try {
      const opened = await initDB();
      try { opened.close(); } catch (e) {}
    } catch (e) {}

    await new Promise((res, rej) => {
      const req = indexedDB.deleteDatabase('TrainingMirrorDB');
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
      req.onblocked = () => res();
    });

    if (typeof globalThis.__resetDB === 'function') globalThis.__resetDB();
  });

  it('saveWeekTarget と getWeekTarget が動作する', async () => {
    await initDB();
    const target = {
      key: '2026-W07',
      target_elevation: 3000,
      iso_year: 2026,
      week_number: 7,
    };

    await saveWeekTarget(target);
    const got = await getWeekTarget('2026-W07');

    expect(got).toBeDefined();
    expect(got.key).toBe('2026-W07');
    expect(got.target_elevation).toBe(3000);
  });

  it('getAllWeekTargets は全件を返す', async () => {
    await initDB();
    const a = { key: '2026-W05', target_elevation: 2000, iso_year: 2026, week_number: 5 };
    const b = { key: '2026-W06', target_elevation: 2500, iso_year: 2026, week_number: 6 };
    await saveWeekTarget(a);
    await saveWeekTarget(b);

    const all = await getAllWeekTargets();
    const keys = all.map((r) => r.key).sort();
    expect(keys).toEqual(['2026-W05', '2026-W06']);
  });
});
