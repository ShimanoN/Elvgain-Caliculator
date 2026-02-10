// Load via CommonJS to exercise module.exports branch
const modPath = require.resolve('../js/db.js');
delete require.cache[modPath];
const db = require(modPath);

describe('db.js CommonJS export', () => {
  it('module.exports exposes expected functions', () => {
    expect(typeof db.initDB).toBe('function');
    expect(typeof db.getAllWeekTargets).toBe('function');
  });
});
