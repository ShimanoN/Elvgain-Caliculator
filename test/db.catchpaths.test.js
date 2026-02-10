import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('db.js initDB rejection paths', () => {
  let origIndexedDB;

  beforeEach(() => {
    origIndexedDB = global.indexedDB;
    if (typeof globalThis.__resetDB === 'function') globalThis.__resetDB();
  });

  afterEach(() => {
    global.indexedDB = origIndexedDB;
    vi.restoreAllMocks();
    if (typeof globalThis.__resetDB === 'function') globalThis.__resetDB();
  });

  const makeOpenError = (msg) => () => {
    const req = {};
    setTimeout(() => {
      if (typeof req.onerror === 'function') req.onerror({ target: { error: new Error(msg) } });
    }, 0);
    return req;
  };

  it('getDayLog propagates initDB rejection', async () => {
    const db = await import('../js/db.js');
    global.indexedDB = { open: makeOpenError('init fail getDay') };
    await expect(db.getDayLog('2026-02-11')).rejects.toThrow('init fail getDay');
  });

  it('saveDayLog propagates initDB rejection', async () => {
    const db = await import('../js/db.js');
    global.indexedDB = { open: makeOpenError('init fail save') };
    await expect(db.saveDayLog({ date: '2026-02-11' })).rejects.toThrow('init fail save');
  });

  it('getAllDayLogs propagates initDB rejection', async () => {
    const db = await import('../js/db.js');
    global.indexedDB = { open: makeOpenError('init fail getAllD') };
    await expect(db.getAllDayLogs()).rejects.toThrow('init fail getAllD');
  });

  it('getWeekTarget propagates initDB rejection', async () => {
    const db = await import('../js/db.js');
    global.indexedDB = { open: makeOpenError('init fail getWeek') };
    await expect(db.getWeekTarget('2026-W01')).rejects.toThrow('init fail getWeek');
  });

  it('getAllWeekTargets propagates initDB rejection', async () => {
    const db = await import('../js/db.js');
    global.indexedDB = { open: makeOpenError('init fail getAllW') };
    await expect(db.getAllWeekTargets()).rejects.toThrow('init fail getAllW');
  });
});
