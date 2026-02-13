/**
 * Core domain model types for Elevation Loom application
 * This file contains the authoritative type definitions used throughout the app.
 */

import type { Timestamp, FieldValue } from 'firebase/firestore';

// ============================================================
// Core Domain Model (Firestore-Authoritative)
// ============================================================

/**
 * Daily log entry within a week
 * This is stored as part of the WeekData document, not separately
 */
export interface DailyLogEntry {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Total elevation gained for this day */
  value: number;
  /** Optional memo/note for this day */
  memo?: string;
  /** Part 1 elevation (morning) - optional, newly added field */
  part1?: number | null;
  /** Part 2 elevation (afternoon) - optional, newly added field */
  part2?: number | null;
}

/**
 * Target elevation configuration
 */
export interface TargetConfig {
  /** Target value */
  value: number;
  /** Unit of measurement (m, ft, etc) */
  unit: string;
}

/**
 * Week data as stored in Firestore documents.
 * Timestamps are Firestore Timestamp objects after persistence.
 */
export interface WeekDataFirestore {
  /** ISO year */
  isoYear: number;
  /** ISO week number (1-53) */
  isoWeek: number;
  /** Weekly target configuration */
  target: TargetConfig;
  /** Daily logs for the week (up to 7 entries) */
  dailyLogs: DailyLogEntry[];
  /** Document creation timestamp (Firestore Timestamp) */
  createdAt: Timestamp;
  /** Document last update timestamp (Firestore Timestamp) */
  updatedAt: Timestamp;
}

/**
 * Week data for Firestore write operations.
 * Timestamps can be Date objects or FieldValue sentinels (like serverTimestamp()).
 */
export interface WeekDataForWrite {
  /** ISO year */
  isoYear: number;
  /** ISO week number (1-53) */
  isoWeek: number;
  /** Weekly target configuration */
  target: TargetConfig;
  /** Daily logs for the week (up to 7 entries) */
  dailyLogs: DailyLogEntry[];
  /** Document creation timestamp (Date or FieldValue sentinel) */
  createdAt: Date | FieldValue;
  /** Document last update timestamp (Date or FieldValue sentinel) */
  updatedAt: Date | FieldValue;
}

/**
 * Week data for application/UI use.
 * Timestamps are always JavaScript Date objects.
 */
export interface WeekData {
  /** ISO year */
  isoYear: number;
  /** ISO week number (1-53) */
  isoWeek: number;
  /** Weekly target configuration */
  target: TargetConfig;
  /** Daily logs for the week (up to 7 entries) */
  dailyLogs: DailyLogEntry[];
  /** Document creation timestamp (JavaScript Date) */
  createdAt: Date;
  /** Document last update timestamp (JavaScript Date) */
  updatedAt: Date;
}

/**
 * WeekData with computed fields for UI display
 * These fields are derived from WeekData and not stored
 */
export interface WeekDataWithMeta extends WeekData {
  /** Week start date in YYYY-MM-DD format (computed) */
  start_date: string;
  /** Week end date in YYYY-MM-DD format (computed) */
  end_date: string;
  /** Legacy compatibility - ISO year */
  iso_year: number;
  /** Legacy compatibility - ISO week number */
  week_number: number;
  /** Legacy compatibility - target elevation value */
  target_elevation: number | null;
}

// ============================================================
// Legacy Types (for backward compatibility during migration)
// ============================================================

/**
 * Legacy DayLog interface (IndexedDB)
 * @deprecated Use DailyLogEntry in WeekData instead
 */
export interface DayLog {
  date: string;
  elevation_part1: number | null;
  elevation_part2: number | null;
  elevation_total: number | null;
  subjective_condition: 'good' | 'normal' | 'bad' | null;
  daily_plan_part1?: number | null;
  daily_plan_part2?: number | null;
  iso_year: number;
  week_number: number;
  timezone?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Legacy WeekTarget interface (IndexedDB)
 * @deprecated Use target field in WeekData instead
 */
export interface WeekTarget {
  key: string;
  iso_year?: number;
  week_number?: number;
  start_date?: string;
  end_date?: string;
  target_elevation: number | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Re-export legacy types from db.js for backward compatibility
 */
export type {
  DayLog as LegacyDayLog,
  WeekTarget as LegacyWeekTarget,
} from './db.js';
