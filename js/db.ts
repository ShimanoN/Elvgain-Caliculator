/**
 * Data access layer for Elevation Loom application
 *
 * IMPORTANT: This module now acts as a facade over the new Firestore-authoritative
 * storage layer. All operations go through storage.ts which handles:
 * - Firestore as source of truth
 * - IndexedDB as read-through/write-through cache
 * - Result-based error handling
 *
 * The API is maintained for backward compatibility with existing UI code.
 */

// ============================================================
// Type Definitions (Exported for compatibility)
// ============================================================

/**
 * Daily elevation log record
 */
export interface DayLog {
  /** Date in YYYY-MM-DD format (primary key) */
  date: string;
  /** Elevation gained in part 1 (nullable) */
  elevation_part1: number | null;
  /** Elevation gained in part 2 (nullable) */
  elevation_part2: number | null;
  /** Total elevation gained (sum of part1 and part2) */
  elevation_total: number | null;
  /** Subjective condition rating */
  subjective_condition: 'good' | 'normal' | 'bad' | null;
  /** Planned elevation for part 1 (optional, added in v3.2) */
  daily_plan_part1?: number | null;
  /** Planned elevation for part 2 (optional, added in v3.2) */
  daily_plan_part2?: number | null;
  /** ISO year for indexing */
  iso_year: number;
  /** ISO week number for indexing */
  week_number: number;
  /** Timezone for record */
  timezone?: string;
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
}

/**
 * Weekly target elevation record
 */
export interface WeekTarget {
  /** Week identifier in YYYY-Wnn format (primary key) */
  key: string;
  /** ISO year */
  iso_year?: number;
  /** ISO week number */
  week_number?: number;
  /** Week start date in YYYY-MM-DD format */
  start_date?: string;
  /** Week end date in YYYY-MM-DD format */
  end_date?: string;
  /** Target elevation for the week (nullable) */
  target_elevation: number | null;
  /** Creation timestamp */
  created_at?: string;
  /** Last update timestamp */
  updated_at?: string;
}

// ============================================================
// Import compatibility functions from storage layer
// ============================================================

import {
  getDayLogCompat,
  getDayLogsByWeekCompat,
  getWeekTargetCompat,
  saveDayLogCompat,
  saveWeekTargetCompat,
  deleteDayLogCompat,
} from './storage-compat.js';

// ============================================================
// DayLog Operations (Facade)
// ============================================================

/**
 * Gets a DayLog by date
 * @param date - Date in YYYY-MM-DD format
 * @returns Promise resolving to DayLog or undefined if not found
 */
export async function getDayLog(date: string): Promise<DayLog | undefined> {
  return getDayLogCompat(date);
}

/**
 * Saves a DayLog record
 * @param data - DayLog record to save
 */
export async function saveDayLog(data: DayLog): Promise<void> {
  return saveDayLogCompat(data);
}

/**
 * Deletes a DayLog by date
 * @param date - Date in YYYY-MM-DD format
 */
export async function deleteDayLog(date: string): Promise<void> {
  return deleteDayLogCompat(date);
}

/**
 * Gets all DayLogs for a specific week
 * @param iso_year - ISO year
 * @param week_number - ISO week number (1-53)
 * @returns Promise resolving to array of DayLog records
 */
export async function getDayLogsByWeek(
  iso_year: number,
  week_number: number
): Promise<DayLog[]> {
  return getDayLogsByWeekCompat(iso_year, week_number);
}

/**
 * Gets all DayLogs from the database
 * @returns Promise resolving to array of all DayLog records
 */
export async function getAllDayLogs(): Promise<DayLog[]> {
  // This would require fetching all weeks from Firestore
  // For now, we'll return an empty array and log a warning
  // This function should be deprecated as it's not scalable
  console.warn(
    'getAllDayLogs is not implemented in Firestore-authoritative architecture'
  );
  return [];
}

// ============================================================
// WeekTarget Operations (Facade)
// ============================================================

/**
 * Gets a WeekTarget by key
 * @param key - Week key in YYYY-Wnn format
 * @returns Promise resolving to WeekTarget or undefined if not found
 */
export async function getWeekTarget(
  key: string
): Promise<WeekTarget | undefined> {
  return getWeekTargetCompat(key);
}

/**
 * Saves a WeekTarget record
 * @param data - WeekTarget record to save
 */
export async function saveWeekTarget(data: WeekTarget): Promise<void> {
  return saveWeekTargetCompat(data);
}

/**
 * Gets all WeekTargets from the database
 * @returns Promise resolving to array of all WeekTarget records
 */
export async function getAllWeekTargets(): Promise<WeekTarget[]> {
  // This would require fetching all weeks from Firestore
  // For now, we'll return an empty array and log a warning
  // This function should be deprecated as it's not scalable
  console.warn(
    'getAllWeekTargets is not implemented in Firestore-authoritative architecture'
  );
  return [];
}

// ============================================================
// Database Initialization (Legacy - No longer needed)
// ============================================================

/**
 * Initializes the database connection
 * @returns Promise resolving to null (compatibility only)
 * @deprecated No longer needed - storage layer handles initialization
 */
export async function initDB(): Promise<null> {
  // No-op - storage layer handles initialization
  return null;
}

/**
 * Reset internal db reference for testing purposes
 * @internal
 * @deprecated No longer needed - storage layer manages its own state
 */
export function __resetDB(): void {
  // No-op - storage layer manages its own state
}
