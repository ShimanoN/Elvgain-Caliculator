(function () {
    const BACKUP_PREFIX = 'elv_backup_';
    const META_KEY = 'elv_backup_meta';
    const MAX_BACKUPS = 10;
    const AUTO_INTERVAL_MS = 24 * 60 * 60 * 1000;
    const DEBOUNCE_MS = 2000;

    let pendingTimer = null;

    function formatTimestamp(ts) {
        return new Date(ts).toISOString().replace(/[:.]/g, '-');
    }

    function readMeta() {
        try {
            return JSON.parse(localStorage.getItem(META_KEY) || '{}');
        } catch (e) {
            return {};
        }
    }

    function writeMeta(meta) {
        localStorage.setItem(META_KEY, JSON.stringify(meta));
    }

    async function buildSnapshot() {
        const dayLogs = typeof getAllDayLogs === 'function' ? await getAllDayLogs() : [];
        const weekTargets = typeof getAllWeekTargets === 'function' ? await getAllWeekTargets() : [];
        return {
            generated_at: new Date().toISOString(),
            day_logs: dayLogs,
            week_targets: weekTargets
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
            lastAuto: auto
        });

        return { key, count: snapshot.day_logs.length };
    }

    function listBackups() {
        const meta = readMeta();
        return Array.isArray(meta.history) ? meta.history.slice() : [];
    }

    function shouldAutoBackup() {
        const meta = readMeta();
        if (!meta.lastAt) return true;
        const lastAt = new Date(meta.lastAt).getTime();
        if (Number.isNaN(lastAt)) return true;
        return Date.now() - lastAt >= AUTO_INTERVAL_MS;
    }

    function scheduleBackup() {
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => {
            createBackup({ auto: true }).catch((e) => console.error('Auto backup failed', e));
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
            createBackup({ auto: true }).catch((e) => console.error('Auto backup failed', e));
        }
        wrapSave('saveDayLog');
        wrapSave('saveWeekTarget');
    }

    window.elvBackup = {
        createBackup,
        scheduleBackup,
        listBackups
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAutoBackup);
    } else {
        initAutoBackup();
    }
})();
