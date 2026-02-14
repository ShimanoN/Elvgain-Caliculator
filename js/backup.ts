/**
 * Automatic backup system for Elevation Loom application
 * Provides automatic backup to LocalStorage with configurable intervals
 */

import {
  getAllDayLogs,
  getAllWeekTargets,
  saveDayLog,
  saveWeekTarget,
} from './db.js';
import type { DayLog, WeekTarget } from './db.js';
import { BACKUP_CONFIG } from './constants.js';

// ============================================================
// Type Definitions
// ============================================================

/**
 * Backup metadata stored in LocalStorage
 */
interface BackupMeta {
  /** Key of the last backup */
  lastKey?: string;
  /** Timestamp of the last backup */
  lastAt?: string;
  /** History of backup keys (newest first) */
  history?: string[];
  /** Whether the last backup was automatic */
  lastAuto?: boolean;
}

/**
 * Backup snapshot structure
 */
interface BackupSnapshot {
  /** Timestamp when backup was generated */
  generated_at: string;
  /** All day log records */
  day_logs: DayLog[];
  /** All week target records */
  week_targets: WeekTarget[];
}

/**
 * Result of backup creation
 */
interface BackupResult {
  /** LocalStorage key of the created backup */
  key: string;
  /** Number of day logs backed up */
  count: number;
}

/**
 * Result of backup restoration
 */
interface RestoreResult {
  /** Number of day logs restored */
  day_logs: number;
  /** Number of week targets restored */
  week_targets: number;
}

// ============================================================
// Module State
// ============================================================

let pendingTimer: number | null = null;
let _restoring = false;

// ============================================================
// Helper Functions
// ============================================================

/**
 * Format timestamp for backup key
 * @param ts - Timestamp in milliseconds
 * @returns Formatted timestamp string
 */
function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().replace(/[:.]/g, '-');
}

/**
 * Read backup metadata from LocalStorage
 * @returns Backup metadata object
 */
function readMeta(): BackupMeta {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_CONFIG.metaKey) || '{}');
  } catch (_e) {
    return {};
  }
}

/**
 * Write backup metadata to LocalStorage
 * @param meta - Backup metadata to write
 */
function writeMeta(meta: BackupMeta): void {
  localStorage.setItem(BACKUP_CONFIG.metaKey, JSON.stringify(meta));
}

/**
 * Build a snapshot of current database state
 * @returns Promise resolving to backup snapshot
 */
async function buildSnapshot(): Promise<BackupSnapshot> {
  const dayLogs = await getAllDayLogs();
  const weekTargets = await getAllWeekTargets();
  return {
    generated_at: new Date().toISOString(),
    day_logs: dayLogs,
    week_targets: weekTargets,
  };
}

/**
 * Prune old backups to stay within MAX_BACKUPS limit
 * @param history - Array of backup keys
 * @returns Trimmed array of backup keys
 */
function pruneBackups(history: string[]): string[] {
  const kept = history.slice(0, BACKUP_CONFIG.maxBackups);
  const removed = history.slice(BACKUP_CONFIG.maxBackups);
  removed.forEach((key) => localStorage.removeItem(key));
  return kept;
}

// ============================================================
// Public API
// ============================================================

/**
 * Create a backup of current database state
 * @param options - Backup options
 * @param options.auto - Whether this is an automatic backup
 * @returns Promise resolving to backup result
 */
export async function createBackup(
  options: { auto?: boolean } = {}
): Promise<BackupResult> {
  const snapshot = await buildSnapshot();
  const key = BACKUP_CONFIG.prefix + formatTimestamp(Date.now());
  localStorage.setItem(key, JSON.stringify(snapshot));

  const meta = readMeta();
  const history = Array.isArray(meta.history) ? meta.history : [];
  history.unshift(key);

  const trimmed = pruneBackups(history);
  writeMeta({
    lastKey: key,
    lastAt: snapshot.generated_at,
    history: trimmed,
    lastAuto: options.auto,
  });

  return { key, count: snapshot.day_logs.length };
}

/**
 * List all available backups
 * @returns Array of backup keys (newest first)
 */
export function listBackups(): string[] {
  const meta = readMeta();
  return Array.isArray(meta.history) ? meta.history.slice() : [];
}

/**
 * Restore database from a backup
 * @param key - Backup key to restore from
 * @returns Promise resolving to restoration result
 * @throws Error if backup not found or invalid
 */
export async function restoreBackup(key: string): Promise<RestoreResult> {
  const raw = localStorage.getItem(key);
  if (!raw) throw new Error('Backup not found: ' + key);

  let snapshot: BackupSnapshot;
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

/**
 * Check if automatic backup should be triggered
 * @returns True if automatic backup is needed
 */
function shouldAutoBackup(): boolean {
  const meta = readMeta();
  if (!meta.lastAt) return true;
  const lastAt = new Date(meta.lastAt).getTime();
  if (Number.isNaN(lastAt)) return true;
  return Date.now() - lastAt >= BACKUP_CONFIG.autoIntervalMs;
}

/**
 * Schedule a backup to run after debounce period
 */
export function scheduleBackup(): void {
  if (_restoring) return;
  if (pendingTimer) clearTimeout(pendingTimer);
  pendingTimer = window.setTimeout(() => {
    createBackup({ auto: true }).catch((e) =>
      console.error('Auto backup failed', e)
    );
    pendingTimer = null;
  }, BACKUP_CONFIG.debounceMs);
}

// ============================================================
// Wrapped Save Functions with Auto-Backup
// ============================================================

/**
 * Wrapped version of saveDayLog that triggers auto-backup
 */
export async function saveDayLogWithBackup(data: DayLog): Promise<void> {
  await saveDayLog(data);
  scheduleBackup();
}

/**
 * Wrapped version of saveWeekTarget that triggers auto-backup
 */
export async function saveWeekTargetWithBackup(
  data: WeekTarget
): Promise<void> {
  await saveWeekTarget(data);
  scheduleBackup();
}

// ============================================================
// Auto-Backup Initialization
// ============================================================

/**
 * Initialize automatic backup system
 * Performs initial backup check if needed
 */
function initAutoBackup(): void {
  if (shouldAutoBackup()) {
    createBackup({ auto: true }).catch((e) =>
      console.error('Auto backup failed', e)
    );
  }
}

// Initialize auto-backup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoBackup);
} else {
  initAutoBackup();
}

// Expose E2E backup API on window for Playwright tests
try {
  if (typeof window !== 'undefined') {
    // export/import operate on snapshot objects (buildSnapshot/restore logic)
    window.elvBackup = {
      exportBackup: async () => {
        try {
          const snapshot = await buildSnapshot();
          try {
            const ev = new CustomEvent('backup:done', { detail: { snapshot } });
            window.dispatchEvent(ev);
          } catch (_e) {
            /* ignore dispatch errors */
          }
          return snapshot;
        } catch (e) {
          console.error('exportBackup failed:', e);
          return null;
        }
      },
      importBackup: async (snapshot: unknown) => {
        try {
          if (!snapshot || typeof snapshot !== 'object') return false;

          const data = snapshot as Record<string, unknown>;
          let restoredLogs = 0;
          let restoredTargets = 0;

          // Restore day logs
          if (Array.isArray(data.day_logs)) {
            for (const log of data.day_logs) {
              try {
                await saveDayLog(log as DayLog);
                restoredLogs++;
              } catch (err) {
                console.error('importBackup: saveDayLog failed:', err);
              }
            }
          }

          // Restore week targets
          if (Array.isArray(data.week_targets)) {
            for (const wt of data.week_targets) {
              try {
                await saveWeekTarget(wt as WeekTarget);
                restoredTargets++;
              } catch (err) {
                console.error('importBackup: saveWeekTarget failed:', err);
              }
            }
          }

          try {
            const ev = new CustomEvent('backup:imported', {
              detail: { restoredLogs, restoredTargets },
            });
            window.dispatchEvent(ev);
          } catch (_e) {
            /* ignore */
          }

          return true;
        } catch (e) {
          console.error('importBackup failed:', e);
          return false;
        }
      },
    };
  }
} catch (_e) {
  /* ignore attach errors */
}
