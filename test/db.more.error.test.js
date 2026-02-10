import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const makeFakeDbWith = (methods) => ({
  transaction: () => ({
    objectStore: () => methods,
  }),
});

describe('db.js additional error branches', () => {
  let originalIndexedDB;

  beforeEach(() => {
    originalIndexedDB = global.indexedDB;
  });

  afterEach(() => {
    global.indexedDB = originalIndexedDB;
    if (global.__resetDB) global.__resetDB();
  });

  it('deleteDayLog rejects when delete request errors', async () => {
    const fakeDb = makeFakeDbWith({
      delete: () => {
        const req = {};
        setTimeout(() => {
          if (typeof req.onerror === 'function') req.onerror({ target: { error: new Error('delete failed') } });
        }, 0);
        return req;
      },
    });

    global.indexedDB = {
      open: () => {
        const req = {};
        setTimeout(() => { if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } }); }, 0);
        return req;
      },
    };

    await expect(deleteDayLog('2026-02-10')).rejects.toThrow('delete failed');
  });

  it('getAllDayLogs rejects when getAll errors', async () => {
    const fakeDb = makeFakeDbWith({
      getAll: () => {
        const req = {};
        setTimeout(() => { if (typeof req.onerror === 'function') req.onerror({ target: { error: new Error('getAllD failed') } }); }, 0);
        return req;
      },
    });

    global.indexedDB = {
      open: () => {
        const req = {};
        setTimeout(() => { if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } }); }, 0);
        return req;
      },
    };

    await expect(getAllDayLogs()).rejects.toThrow('getAllD failed');
  });

  it('getWeekTarget rejects when store.get errors', async () => {
    const fakeDb = makeFakeDbWith({
      get: () => {
        const req = {};
        setTimeout(() => { if (typeof req.onerror === 'function') req.onerror({ target: { error: new Error('week get failed') } }); }, 0);
        return req;
      },
    });
    global.indexedDB = {
      open: () => {
        const req = {};
        setTimeout(() => { if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } }); }, 0);
        return req;
      },
    };

    await expect(getWeekTarget('2026-W01')).rejects.toThrow('week get failed');
  });

  it('saveWeekTarget rejects when put errors', async () => {
    const fakeDb = makeFakeDbWith({
      put: () => {
        const req = {};
        setTimeout(() => { if (typeof req.onerror === 'function') req.onerror({ target: { error: new Error('week put failed') } }); }, 0);
        return req;
      },
    });

    global.indexedDB = {
      open: () => {
        const req = {};
        setTimeout(() => { if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } }); }, 0);
        return req;
      },
    };

    await expect(saveWeekTarget({ key: '2026-W02' })).rejects.toThrow('week put failed');
  });

  it('getAllWeekTargets rejects when getAll errors', async () => {
    const fakeDb = makeFakeDbWith({
      getAll: () => {
        const req = {};
        setTimeout(() => { if (typeof req.onerror === 'function') req.onerror({ target: { error: new Error('getAllW failed') } }); }, 0);
        return req;
      },
    });

    global.indexedDB = {
      open: () => {
        const req = {};
        setTimeout(() => { if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } }); }, 0);
        return req;
      },
    };

    await expect(getAllWeekTargets()).rejects.toThrow('getAllW failed');
  });
});
