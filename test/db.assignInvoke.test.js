import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const makeReqWithSetter = (opts = {}) => {
  const req = {};
  Object.defineProperty(req, 'onsuccess', {
    configurable: true,
    enumerable: true,
    set(fn) {
      this._onsuccess = fn;
      if (typeof opts !== 'undefined') this.result = opts.result;
      setTimeout(() => {
        try {
          if (typeof opts !== 'undefined') this.result = opts.result;
          fn({ target: { result: opts.result } });
        } catch (e) {
          // ignore
        }
      }, 0);
    },
    get() {
      return this._onsuccess;
    },
  });
  Object.defineProperty(req, 'onerror', {
    configurable: true,
    enumerable: true,
    set(fn) {
      this._onerror = fn;
      if (typeof opts !== 'undefined') this.error = opts.error;
      setTimeout(() => {
        try {
          if (typeof opts !== 'undefined') this.error = opts.error;
          fn({ target: { error: opts.error } });
        } catch (e) {}
      }, 0);
    },
    get() {
      return this._onerror;
    },
  });
  return req;
};

describe('db.js assignment-invoke tests', () => {
  let origIndexedDB;

  beforeEach(() => {
    origIndexedDB = global.indexedDB;
    if (typeof globalThis.__resetDB === 'function') globalThis.__resetDB();
  });
  afterEach(() => {
    global.indexedDB = origIndexedDB;
  });

  it('getAllWeekTargets invokes onsuccess assignment', async () => {
    const dbModule = await import('../js/db.js');
    const fakeDb = {
      transaction: () => ({
        objectStore: () => ({
          getAll: () => makeReqWithSetter({ result: [{ key: '2026-W01', target_elevation: 1000 }] }),
        }),
      }),
    };
    global.indexedDB = {
      open: () => makeReqWithSetter({ result: fakeDb }),
    };

    // ensure initDB sets internal db reference
    await dbModule.initDB();

    // exercise getAllWeekTargets to trigger assignment and handler execution
    await dbModule.getAllWeekTargets();
  });

  it('saveWeekTarget invokes onsuccess assignment', async () => {
    const dbModule = await import('../js/db.js');
    const fakeDb = {
      transaction: () => ({
        objectStore: () => ({
          put: () => makeReqWithSetter({ result: null }),
        }),
      }),
    };
    global.indexedDB = {
      open: () => makeReqWithSetter({ result: fakeDb }),
    };

    await expect(dbModule.saveWeekTarget({ key: '2026-W02', target_elevation: 2000 })).resolves.toBeUndefined();
  });
});
