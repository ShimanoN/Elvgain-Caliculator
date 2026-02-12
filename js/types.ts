/**
 * Core domain model types for Elevation Loom application
 * This file contains the authoritative type definitions used throughout the app.
 */

import type { DayLog } from './db.js';

// ============================================================
// Core Domain Model
// ============================================================

/**
 * Complete weekly data state
 * Represents all data associated with a specific ISO week
 */
export interface WeekData {
  /** ISO year */
  iso_year: number;
  /** ISO week number (1-53) */
  week_number: number;
  /** Week start date in YYYY-MM-DD format */
  start_date: string;
  /** Week end date in YYYY-MM-DD format */
  end_date: string;
  /** Weekly target elevation (nullable) */
  target_elevation: number | null;
  /** Daily logs for the week (up to 7 days) */
  daily_logs: DayLog[];
  /** Last update timestamp in milliseconds */
  updated_at: number;
}

/**
 * Re-export DB types for convenience
 */
export type { DayLog, WeekTarget } from './db.js';
