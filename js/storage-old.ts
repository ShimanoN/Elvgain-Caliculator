/**
 * Persistence layer for Elevation Loom application
 * Provides a unified interface for loading and saving weekly data.
 *
 * This layer isolates storage implementation details from the rest of the app.
 * Currently uses localStorage internally, but can be swapped for Firebase or
 * other backends without changing application code.
 */

import type { WeekData } from './types.js';
import { getISOWeekInfo } from './iso-week.js';
import { formatISOWeekKey } from './formatters.js';
import { getDayLogsByWeek, getWeekTarget } from './db.js';

// ============================================================
// LocalStorage Keys
// ============================================================

const STORAGE_KEY_PREFIX = 'elv_';
const SELECTED_WEEK_KEY = `${STORAGE_KEY_PREFIX}selected_week`;

// ============================================================
// Week Data Operations
// ============================================================

/**
 * Load complete week data for a specific ISO week
 * @param iso_year - ISO year
 * @param week_number - ISO week number (1-53)
 * @returns Promise resolving to WeekData
 */
export async function loadWeekData(
  iso_year: number,
  week_number: number
): Promise<WeekData> {
  try {
    // Get week date range
    const jan4 = new Date(iso_year, 0, 4);
    const jan4DayNum = (jan4.getDay() + 6) % 7;
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setDate(jan4.getDate() - jan4DayNum);

    const targetDate = new Date(mondayOfWeek1);
    targetDate.setDate(mondayOfWeek1.getDate() + (week_number - 1) * 7);

    const weekInfo = getISOWeekInfo(targetDate);

    // Load week target
    const targetKey = formatISOWeekKey(iso_year, week_number);
    const targetRecord = await getWeekTarget(targetKey);

    // Load daily logs
    const dailyLogs = await getDayLogsByWeek(iso_year, week_number);

    return {
      iso_year,
      week_number,
      start_date: weekInfo.start_date,
      end_date: weekInfo.end_date,
      target_elevation: targetRecord?.target_elevation ?? null,
      daily_logs: dailyLogs || [],
      updated_at: Date.now(),
    };
  } catch (error) {
    console.error('Error loading week data:', error);
    throw error;
  }
}

/**
 * Save complete week data
 *
 * @deprecated Not yet implemented - use saveDayLog() and saveWeekTarget() directly
 * @internal This is a placeholder for future Firebase integration
 *
 * Note: This function is currently not used as the app saves DayLog and WeekTarget
 * separately through the existing db.js functions. This is here for future use
 * when transitioning to a unified save operation.
 *
 * @param data - WeekData to save
 * @returns Promise that resolves when save is complete
 */
export async function saveWeekData(_data: WeekData): Promise<void> {
  // This function is a placeholder for future Firebase integration
  // Currently, the app uses saveDayLog() and saveWeekTarget() directly
  throw new Error(
    'saveWeekData not yet implemented - use saveDayLog/saveWeekTarget'
  );
}

// ============================================================
// Selected Week Persistence
// ============================================================

/**
 * Get the currently selected week from storage
 * @returns Week key in YYYY-Wnn format or null if not set
 */
export function getSelectedWeek(): string | null {
  try {
    return localStorage.getItem(SELECTED_WEEK_KEY);
  } catch (e) {
    console.warn('Could not read selected week from localStorage', e);
    return null;
  }
}

/**
 * Save the currently selected week to storage
 * @param weekKey - Week key in YYYY-Wnn format
 */
export function setSelectedWeek(weekKey: string): void {
  try {
    localStorage.setItem(SELECTED_WEEK_KEY, weekKey);
  } catch (e) {
    console.warn('Could not write selected week to localStorage', e);
  }
}
