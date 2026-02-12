/**
 * Migration Adapter - Bridge between legacy IndexedDB and new Firestore storage
 *
 * This module provides adapters to convert between:
 * - Legacy DayLog (IndexedDB) ↔ DailyLogEntry (Firestore)
 * - Legacy WeekData ↔ New WeekData
 *
 * Use these during the migration period to maintain compatibility
 */

import type { DayLog, WeekTarget } from './db.js';
import type { WeekData, DailyLogEntry, WeekDataWithMeta } from './types.js';

/**
 * Convert legacy DayLog to DailyLogEntry
 */
export function dayLogToEntry(dayLog: DayLog): DailyLogEntry {
  const total = dayLog.elevation_total ?? 0;
  const memo = dayLog.subjective_condition
    ? `Condition: ${dayLog.subjective_condition}`
    : undefined;

  return {
    date: dayLog.date,
    value: total,
    memo,
  };
}

/**
 * Convert DailyLogEntry to legacy DayLog format
 * This allows UI components to continue working with DayLog temporarily
 */
export function entryToDayLog(
  entry: DailyLogEntry,
  isoYear: number,
  isoWeek: number
): DayLog {
  // Parse condition from memo if present
  const conditionMatch = entry.memo?.match(/Condition: (good|normal|bad)/);
  const condition = conditionMatch?.[1] as 'good' | 'normal' | 'bad' | null;

  return {
    date: entry.date,
    elevation_part1: null, // Not tracked in new system
    elevation_part2: null, // Not tracked in new system
    elevation_total: entry.value,
    subjective_condition: condition || null,
    iso_year: isoYear,
    week_number: isoWeek,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Convert new WeekDataWithMeta to legacy format for UI compatibility
 * This is a temporary shim during migration
 */
export function weekDataToLegacy(weekData: WeekDataWithMeta): {
  target: WeekTarget | null;
  dailyLogs: DayLog[];
} {
  const targetKey = `${weekData.isoYear}-W${String(weekData.isoWeek).padStart(2, '0')}`;

  const target: WeekTarget | null = weekData.target.value
    ? {
        key: targetKey,
        iso_year: weekData.isoYear,
        week_number: weekData.isoWeek,
        start_date: weekData.start_date,
        end_date: weekData.end_date,
        target_elevation: weekData.target.value,
        created_at: weekData.createdAt.toString(),
        updated_at: weekData.updatedAt.toString(),
      }
    : null;

  const dailyLogs = weekData.dailyLogs.map((entry) =>
    entryToDayLog(entry, weekData.isoYear, weekData.isoWeek)
  );

  return { target, dailyLogs };
}

/**
 * Convert legacy WeekData to new format
 */
export function legacyToWeekData(
  isoYear: number,
  isoWeek: number,
  target: WeekTarget | null,
  dailyLogs: DayLog[]
): Omit<WeekData, 'createdAt' | 'updatedAt'> {
  return {
    isoYear,
    isoWeek,
    target: {
      value: target?.target_elevation ?? 0,
      unit: 'm',
    },
    dailyLogs: dailyLogs.map(dayLogToEntry),
  };
}

/**
 * Migrate all legacy IndexedDB data to Firestore
 * This should be called once during the migration
 */
export async function migrateAllData(): Promise<{
  success: boolean;
  migratedWeeks: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migratedWeeks = 0;

  try {
    // Import here to avoid circular dependencies
    const { getAllDayLogs, getAllWeekTargets } = await import('./db.js');
    const { saveWeekData } = await import('./storage.js');

    const [allDayLogs, allWeekTargets] = await Promise.all([
      getAllDayLogs(),
      getAllWeekTargets(),
    ]);

    // Group day logs by week
    const weekGroups = new Map<string, DayLog[]>();
    for (const dayLog of allDayLogs) {
      const weekKey = `${dayLog.iso_year}-W${String(dayLog.week_number).padStart(2, '0')}`;
      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, []);
      }
      weekGroups.get(weekKey)!.push(dayLog);
    }

    // Create a map of targets
    const targetsMap = new Map<string, WeekTarget>();
    for (const target of allWeekTargets) {
      targetsMap.set(target.key, target);
    }

    // Migrate each week
    for (const [weekKey, logs] of weekGroups) {
      const target = targetsMap.get(weekKey);
      const isoYear = logs[0].iso_year;
      const isoWeek = logs[0].week_number;

      const weekData = legacyToWeekData(isoYear, isoWeek, target || null, logs);

      const result = await saveWeekData(weekData);
      if (result.ok) {
        migratedWeeks++;
      } else {
        errors.push(`Failed to migrate ${weekKey}: ${result.error.message}`);
      }
    }

    // Migrate weeks with only targets (no logs)
    for (const [weekKey, target] of targetsMap) {
      if (!weekGroups.has(weekKey) && target.iso_year && target.week_number) {
        const weekData = legacyToWeekData(
          target.iso_year,
          target.week_number,
          target,
          []
        );

        const result = await saveWeekData(weekData);
        if (result.ok) {
          migratedWeeks++;
        } else {
          errors.push(`Failed to migrate ${weekKey}: ${result.error.message}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      migratedWeeks,
      errors,
    };
  } catch (error) {
    errors.push(
      `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return {
      success: false,
      migratedWeeks,
      errors,
    };
  }
}
