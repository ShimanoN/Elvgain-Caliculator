import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Load module under test
const dbModule = await import('../js/db.js');

describe('db.js error branches', () => {
  let originalIndexedDB;

  beforeEach(() => {
    originalIndexedDB = global.indexedDB;
    // ensure internal db state resets between tests
    if (global.__resetDB) global.__resetDB();
  });

  afterEach(() => {
    global.indexedDB = originalIndexedDB;
    vi.restoreAllMocks();
    if (global.__resetDB) global.__resetDB();
  });

  it('initDB rejects when indexedDB.open triggers onerror', async () => {
    // Stub indexedDB.open to return a request that errors
    global.indexedDB = {
      open: function () {
        const req = {};
        setTimeout(() => {
          if (typeof req.onerror === 'function') {
            req.onerror({ target: { error: new Error('open failed') } });
          }
        }, 0);
        return req;
      },
    };

    await expect(dbModule.initDB()).rejects.toThrow('open failed');
  });

  it('getDayLog rejects when store.get triggers onerror', async () => {
    // Provide fake DB whose store.get triggers onerror
    const fakeDb = {
      transaction: () => ({
        objectStore: () => ({
          get: () => {
            const req = {};
            setTimeout(() => {
              if (typeof req.onerror === 'function') {
                req.onerror({ target: { error: new Error('get failed') } });
              }
            }, 0);
            return req;
          },
        }),
      }),
    };

    // Stub indexedDB.open to return the fakeDb via onsuccess
    global.indexedDB = {
      open: function () {
        const req = {};
        setTimeout(() => {
          if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } });
        }, 0);
        return req;
      },
    };

    await expect(dbModule.getDayLog('2026-02-09')).rejects.toThrow('get failed');
  });

  it('saveDayLog rejects when store.put triggers onerror', async () => {
    const fakeDb = {
      transaction: () => ({
        objectStore: () => ({
          put: () => {
            const req = {};
            setTimeout(() => {
              if (typeof req.onerror === 'function') req.onerror({ target: { error: new Error('put failed') } });
            }, 0);
            return req;
          },
        }),
      }),
    };

    global.indexedDB = {
      open: function () {
        const req = {};
        setTimeout(() => {
          if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } });
        }, 0);
        return req;
      },
    };

    await expect(dbModule.saveDayLog({ date: '2026-02-09' })).rejects.toThrow('put failed');
  });

  it('getDayLogsByWeek rejects when index.getAll triggers onerror', async () => {
    const fakeDb = {
      transaction: () => ({
        objectStore: () => ({
          index: () => ({
            getAll: () => {
              const req = {};
              setTimeout(() => {
                if (typeof req.onerror === 'function') req.onerror({ target: { error: new Error('getAll failed') } });
              }, 0);
              return req;
            },
          }),
        }),
      }),
    };

    global.indexedDB = {
      open: function () {
        const req = {};
        setTimeout(() => {
          if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } });
        }, 0);
        return req;
      },
    };

    await expect(dbModule.getDayLogsByWeek(2026, 7)).rejects.toThrow('getAll failed');
  });
});
