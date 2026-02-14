/**
 * Storage Adapter - Compatibility layer for UI components
 *
 * This module provides backward-compatible functions that UI components
 * can use without modification. It translates between:
 * - Legacy DayLog operations → New atomic WeekData operations
 * - Legacy WeekTarget operations → New atomic WeekData operations
 *
 * This allows the UI to continue working while the storage layer
 * uses the new Firestore-authoritative architecture.
 */

import type { DayLog, WeekTarget } from './db.js';
import { getISOWeekInfo } from './iso-week.js';
import {
  loadWeekData,
  saveDayLog as saveNewDayLog,
  saveWeekTarget as saveNewWeekTarget,
} from './storage.js';
import { dayLogToEntry, entryToDayLog } from './migration-adapter.js';

/**
 * Get a DayLog by date (compatibility wrapper)
 * Loads the week data and extracts the specific day
 */
export async function getDayLogCompat(
  date: string
): Promise<DayLog | undefined> {
  try {
    const dateObj = new Date(date + 'T00:00:00');
    const weekInfo = getISOWeekInfo(dateObj);

    const result = await loadWeekData(weekInfo.iso_year, weekInfo.week_number);
    if (!result.ok) {
      console.error('Failed to load week data:', result.error);
      return undefined;
    }

    const weekData = result.value;
    const dayEntry = weekData.dailyLogs.find((log) => log.date === date);

    if (!dayEntry) {
      return undefined;
    }

    return entryToDayLog(dayEntry, weekData.isoYear, weekData.isoWeek);
  } catch (error) {
    console.error('Error getting day log:', error);
    return undefined;
  }
}

/**
 * Get all DayLogs for a specific week (compatibility wrapper)
 */
export async function getDayLogsByWeekCompat(
  isoYear: number,
  isoWeek: number
): Promise<DayLog[]> {
  try {
    const result = await loadWeekData(isoYear, isoWeek);
    if (!result.ok) {
      console.error('Failed to load week data:', result.error);
      return [];
    }

    const weekData = result.value;
    return weekData.dailyLogs.map((entry) =>
      entryToDayLog(entry, weekData.isoYear, weekData.isoWeek)
    );
  } catch (error) {
    console.error('Error getting day logs by week:', error);
    return [];
  }
}

/**
 * Get a WeekTarget by key (compatibility wrapper)
 */
export async function getWeekTargetCompat(
  key: string
): Promise<WeekTarget | undefined> {
  try {
    // Parse key format: YYYY-Wnn
    const match = key.match(/^(\d{4})-W(\d{2})$/);
    if (!match) {
      console.error('Invalid week key format:', key);
      return undefined;
    }

    const isoYear = parseInt(match[1], 10);
    const isoWeek = parseInt(match[2], 10);

    const result = await loadWeekData(isoYear, isoWeek);
    if (!result.ok) {
      console.error('Failed to load week data:', result.error);
      return undefined;
    }

    const weekData = result.value;

    if (!weekData.target.value) {
      return undefined;
    }

    return {
      key,
      iso_year: weekData.isoYear,
      week_number: weekData.isoWeek,
      start_date: weekData.start_date,
      end_date: weekData.end_date,
      target_elevation: weekData.target.value,
      created_at: weekData.createdAt.toString(),
      updated_at: weekData.updatedAt.toString(),
    };
  } catch (error) {
    console.error('Error getting week target:', error);
    return undefined;
  }
}

/**
 * Save a DayLog (compatibility wrapper)
 * Converts to new format and saves atomically
 */
export async function saveDayLogCompat(data: DayLog): Promise<void> {
  console.log('saveDayLogCompat: called with date:', data.date);
  const entry = dayLogToEntry(data);
  console.log('saveDayLogCompat: calling saveNewDayLog');
  const result = await saveNewDayLog(data.date, entry);
  console.log('saveDayLogCompat: saveNewDayLog result:', result);

  if (!result.ok) {
    // BREAKING CHANGE: Now throws on failure instead of silently continuing
    // This ensures users see explicit errors instead of false success
    console.error('saveDayLogCompat: Failed to save day log:', result.error);
    throw result.error;
  }
  console.log('saveDayLogCompat: save succeeded');

  // Dispatch E2E-only event to signal save completion
  try {
    if (
      typeof window !== 'undefined' &&
      window.__E2E__ === true &&
      typeof document !== 'undefined'
    ) {
      document.dispatchEvent(
        new CustomEvent('day-log-saved', { detail: { date: data.date } })
      );
    }
  } catch (e) {
    // E2E event dispatch or environment-related errors should not affect save
    console.warn('Failed to dispatch day-log-saved event:', e);
  }
}

/**
 * Save a WeekTarget (compatibility wrapper)
 * Converts to new format and saves atomically
 */
export async function saveWeekTargetCompat(data: WeekTarget): Promise<void> {
  if (!data.iso_year || !data.week_number) {
    throw new Error('WeekTarget must have iso_year and week_number');
  }

  const targetValue = data.target_elevation ?? 0;
  const result = await saveNewWeekTarget(
    data.iso_year,
    data.week_number,
    targetValue
  );

  if (!result.ok) {
    // BREAKING CHANGE: Now throws on failure instead of silently continuing
    // This ensures users see explicit errors instead of false success
    console.error(
      'saveWeekTargetCompat: Failed to save week target:',
      result.error
    );
    throw result.error;
  }

  console.log('saveWeekTargetCompat: save succeeded');

  // Dispatch E2E-only event to signal save completion
  try {
    if (
      typeof window !== 'undefined' &&
      window.__E2E__ === true &&
      typeof document !== 'undefined'
    ) {
      document.dispatchEvent(
        new CustomEvent('week-target-saved', {
          detail: {
            iso_year: data.iso_year,
            week_number: data.week_number,
          },
        })
      );
    }
  } catch (e) {
    // E2E event dispatch or environment-related errors should not affect save
    console.warn('Failed to dispatch week-target-saved event:', e);
  }
}

/**
 * Delete a DayLog (compatibility wrapper)
 * Removes the day from the week's dailyLogs array
 */
export async function deleteDayLogCompat(date: string): Promise<void> {
  try {
    const dateObj = new Date(date + 'T00:00:00');
    const weekInfo = getISOWeekInfo(dateObj);

    const result = await loadWeekData(weekInfo.iso_year, weekInfo.week_number);
    if (!result.ok) {
      throw result.error;
    }

    const weekData = result.value;
    const filteredLogs = weekData.dailyLogs.filter((log) => log.date !== date);

    // If no change, return early
    if (filteredLogs.length === weekData.dailyLogs.length) {
      return;
    }

    // Save updated week with day removed
    const { saveWeekData } = await import('./storage.js');
    const saveResult = await saveWeekData({
      isoYear: weekData.isoYear,
      isoWeek: weekData.isoWeek,
      target: weekData.target,
      dailyLogs: filteredLogs,
    });

    if (!saveResult.ok) {
      throw saveResult.error;
    }
  } catch (error) {
    console.error('Error deleting day log:', error);
    throw error;
  }
}
