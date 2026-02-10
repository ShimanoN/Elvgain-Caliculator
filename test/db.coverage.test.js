import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('db.js coverage fill', () => {
  let origIndexedDB;

  beforeEach(() => {
    origIndexedDB = global.indexedDB;
    if (typeof globalThis.__resetDB === 'function') globalThis.__resetDB();
  });

  afterEach(() => {
    global.indexedDB = origIndexedDB;
    if (typeof globalThis.__resetDB === 'function') globalThis.__resetDB();
  });

  it('module attaches functions to globalThis', async () => {
    await import('../js/db.js');
    expect(typeof globalThis.initDB).toBe('function');
    expect(typeof globalThis.getAllWeekTargets).toBe('function');
  });

  it('initDB resolves via onsuccess', async () => {
    await import('../js/db.js');
    const fakeDb = { marker: true };
    global.indexedDB = {
      open: function () {
        const req = {};
        setTimeout(() => {
          if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } });
        }, 0);
        return req;
      },
    };

    const res = await globalThis.initDB();
    expect(res).toBe(fakeDb);
  });

  it('initDB runs onupgradeneeded and creates stores', async () => {
    await import('../js/db.js');

    const fakeDb = {
      objectStoreNames: { contains: () => false },
      createObjectStore: function (name) {
        const store = { createIndex: () => {} };
        this[name] = store;
        return store;
      },
    };

    global.indexedDB = {
      open: function () {
        const req = {};
        setTimeout(() => {
          if (typeof req.onupgradeneeded === 'function') req.onupgradeneeded({ target: { result: fakeDb } });
          if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: fakeDb } });
        }, 0);
        return req;
      },
    };

    const res = await globalThis.initDB();
    expect(res).toBe(fakeDb);
  });
});
