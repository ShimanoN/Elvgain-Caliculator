(function () {
  const BACKUP_PREFIX = 'elv_backup_';
  const META_KEY = 'elv_backup_meta';
  const MAX_BACKUPS = 10;
  const AUTO_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const DEBOUNCE_MS = 2000;

  let pendingTimer = null;
  let _restoring = false;

  function formatTimestamp(ts) {
    return new Date(ts).toISOString().replace(/[:.]/g, '-');
  }

  function readMeta() {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || '{}');
    } catch (_e) {
      return {};
    }
  }

  function writeMeta(meta) {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }

  async function buildSnapshot() {
    const dayLogs =
      typeof getAllDayLogs === 'function' ? await getAllDayLogs() : [];
    const weekTargets =
      typeof getAllWeekTargets === 'function' ? await getAllWeekTargets() : [];
    return {
      generated_at: new Date().toISOString(),
      day_logs: dayLogs,
      week_targets: weekTargets,
    };
  }

  function pruneBackups(history) {
    const kept = history.slice(0, MAX_BACKUPS);
    const removed = history.slice(MAX_BACKUPS);
    removed.forEach((key) => localStorage.removeItem(key));
    return kept;
  }

  async function createBackup({ auto = false } = {}) {
    const snapshot = await buildSnapshot();
    const key = BACKUP_PREFIX + formatTimestamp(Date.now());
    localStorage.setItem(key, JSON.stringify(snapshot));

    const meta = readMeta();
    const history = Array.isArray(meta.history) ? meta.history : [];
    history.unshift(key);

    const trimmed = pruneBackups(history);
    writeMeta({
      lastKey: key,
      lastAt: snapshot.generated_at,
      history: trimmed,
      lastAuto: auto,
    });

    return { key, count: snapshot.day_logs.length };
  }

  function listBackups() {
    const meta = readMeta();
    return Array.isArray(meta.history) ? meta.history.slice() : [];
  }

  async function restoreBackup(key) {
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('Backup not found: ' + key);
    let snapshot;
    try {
      snapshot = JSON.parse(raw);
    } catch (_e) {
      throw new Error('Invalid JSON in backup');
    }
    if (!snapshot || typeof snapshot !== 'object')
      throw new Error('Invalid backup format');
    if (!Array.isArray(snapshot.day_logs))
      throw new Error('Missing or invalid day_logs');
    if (!Array.isArray(snapshot.week_targets))
      throw new Error('Missing or invalid week_targets');

    _restoring = true;
    let restoredLogs = 0;
    let restoredTargets = 0;
    try {
      for (const log of snapshot.day_logs) {
        if (!log.date || typeof log.date !== 'string') continue;
        await saveDayLog(log);
        restoredLogs++;
      }
      for (const wt of snapshot.week_targets) {
        if (!wt.key || typeof wt.key !== 'string') continue;
        await saveWeekTarget(wt);
        restoredTargets++;
      }
    } finally {
      _restoring = false;
    }
    return { day_logs: restoredLogs, week_targets: restoredTargets };
  }

  function shouldAutoBackup() {
    const meta = readMeta();
    if (!meta.lastAt) return true;
    const lastAt = new Date(meta.lastAt).getTime();
    if (Number.isNaN(lastAt)) return true;
    return Date.now() - lastAt >= AUTO_INTERVAL_MS;
  }

  function scheduleBackup() {
    if (_restoring) return;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      createBackup({ auto: true }).catch((e) =>
        console.error('Auto backup failed', e)
      );
      pendingTimer = null;
    }, DEBOUNCE_MS);
  }

  function wrapSave(fnName) {
    const original = window[fnName];
    if (typeof original !== 'function') return;
    window[fnName] = async function (...args) {
      const result = await original.apply(this, args);
      scheduleBackup();
      return result;
    };
  }

  function initAutoBackup() {
    if (shouldAutoBackup()) {
      createBackup({ auto: true }).catch((e) =>
        console.error('Auto backup failed', e)
      );
    }
    wrapSave('saveDayLog');
    wrapSave('saveWeekTarget');
  }

  window.elvBackup = {
    createBackup,
    scheduleBackup,
    listBackups,
    restoreBackup,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutoBackup);
  } else {
    initAutoBackup();
  }
})();
