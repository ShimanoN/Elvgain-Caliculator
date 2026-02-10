import { describe, it, beforeEach, afterEach, expect } from 'vitest';

const makeReqWithSetter = (opts = {}) => {
  const req = {};
  Object.defineProperty(req, 'onsuccess', {
    configurable: true,
    set(fn) {
      this._onsuccess = fn;
      if (typeof opts !== 'undefined') this.result = opts.result;
      setTimeout(() => { try { if (typeof opts !== 'undefined') this.result = opts.result; fn({ target: { result: opts.result } }); } catch (e) {} }, 0);
    },
    get() { return this._onsuccess; },
  });
  Object.defineProperty(req, 'onerror', {
    configurable: true,
    set(fn) {
      this._onerror = fn;
      if (typeof opts !== 'undefined') this.error = opts.error;
      setTimeout(() => { try { if (typeof opts !== 'undefined') this.error = opts.error; fn({ target: { error: opts.error } }); } catch (e) {} }, 0);
    },
    get() { return this._onerror; },
  });
  return req;
};

describe('db.js cover more handlers', () => {
  let origIndexedDB;
  beforeEach(() => {
    origIndexedDB = global.indexedDB;
    if (typeof globalThis.__resetDB === 'function') globalThis.__resetDB();
  });
  afterEach(() => { global.indexedDB = origIndexedDB; });

  it('getAllDayLogs and getWeekTarget success via setter', async () => {
    const db = await import('../js/db.js');
    const fakeDb = {
      transaction: () => ({
        objectStore: () => ({
          getAll: () => makeReqWithSetter({ result: [{ date: '2026-02-01' }] }),
          get: () => makeReqWithSetter({ result: { key: '2026-W01' } }),
        }),
      }),
    };
    global.indexedDB = { open: () => makeReqWithSetter({ result: fakeDb }) };
    await db.initDB();
    await db.getAllDayLogs();
    await db.getWeekTarget('2026-W01');
  });

  it('getWeekTarget and saveWeekTarget onerror invoked', async () => {
    const db = await import('../js/db.js');
    const fakeDbErr = {
      transaction: () => ({ objectStore: () => ({ get: () => makeReqWithSetter({ error: new Error('gerr') }) }) }),
    };
    global.indexedDB = { open: () => makeReqWithSetter({ result: fakeDbErr }) };
    await db.initDB();
    try { await db.getWeekTarget('x'); } catch (e) { /* ignore - exercise handler */ }

    const fakeDbErr2 = {
      transaction: () => ({ objectStore: () => ({ put: () => makeReqWithSetter({ error: new Error('puterr') }) }) }),
    };
    global.indexedDB = { open: () => makeReqWithSetter({ result: fakeDbErr2 }) };
    await db.initDB();
    try { await db.saveWeekTarget({ key: 'x' }); } catch (e) { /* ignore - exercise handler */ }
  });
});
