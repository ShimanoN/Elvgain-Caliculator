/**
 * Global constants for Elevation Loom application
 * This file contains all magic numbers and configuration values
 * used throughout the application.
 */

// ============================================================
// Day Names and Labels
// ============================================================

/**
 * Japanese day names (starting from Sunday)
 */
export const DAY_NAMES_JP: readonly string[] = [
  '日',
  '月',
  '火',
  '水',
  '木',
  '金',
  '土',
] as const;

/**
 * English day names (starting from Sunday)
 */
export const DAY_NAMES_EN: readonly string[] = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;

/**
 * Japanese day names for chart labels (Monday to Sunday)
 */
export const DAY_LABELS_CHART: readonly string[] = [
  '月',
  '火',
  '水',
  '木',
  '金',
  '土',
  '日',
] as const;

/**
 * Mapping from Japanese to English day names
 */
export const DAY_NAME_JP_TO_EN: Readonly<Record<string, string>> = {
  日: 'Sun',
  月: 'Mon',
  火: 'Tue',
  水: 'Wed',
  木: 'Thu',
  金: 'Fri',
  土: 'Sat',
} as const;

// ============================================================
// Time Constants
// ============================================================

/**
 * Milliseconds per week (7 days)
 */
export const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Milliseconds per day
 */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Maximum days of history to keep or display
 */
export const MAX_DAYS_HISTORY = 30;

// ============================================================
// Chart Configuration
// ============================================================

/**
 * Chart padding configuration
 */
export const CHART_PADDING = {
  top: 48,
  right: 64,
  bottom: 56,
  left: 64,
} as const;

/**
 * Chart bar width configuration
 */
export const CHART_BAR_WIDTH_RATIO = 0.32;

/**
 * Y-axis scale configuration
 */
export const Y_AXIS_CONFIG = {
  dailyScaleFactor: 1.2,
  dailyMinValue: 200,
  dailyRoundTo: 100,
  cumulativeScaleFactor: 1.1,
  cumulativeMinValue: 1000,
  cumulativeRoundTo: 200,
} as const;

/**
 * Grid configuration
 */
export const CHART_GRID_LINES = 4;

// ============================================================
// Input Validation Ranges
// ============================================================

/**
 * Elevation input validation ranges
 */
export const ELEVATION_INPUT = {
  min: 0,
  max: 10000,
  step: 100,
} as const;

/**
 * Weekly target validation ranges
 */
export const WEEKLY_TARGET_INPUT = {
  min: 0,
  max: 10000,
  step: 100,
} as const;

// ============================================================
// Backup Configuration
// ============================================================

/**
 * Backup system configuration
 * Note: These values are already well-defined in backup.js
 */
export const BACKUP_CONFIG = {
  prefix: 'elv_backup_',
  metaKey: 'elv_backup_meta',
  maxBackups: 10,
  autoIntervalMs: 24 * 60 * 60 * 1000,
  debounceMs: 2000,
} as const;

// ============================================================
// ISO Week Configuration
// ============================================================

/**
 * Valid ISO year range (aligned with test expectations)
 */
export const ISO_YEAR_RANGE = {
  min: 2000,
  max: 2100,
} as const;

/**
 * Valid ISO week number range
 */
export const ISO_WEEK_RANGE = {
  min: 1,
  max: 53,
} as const;

// ============================================================
// Application Defaults
// ============================================================

/**
 * Default timezone for records
 */
export const DEFAULT_TIMEZONE = 'Asia/Tokyo';

/**
 * Default elevation unit
 */
export const DEFAULT_ELEVATION_UNIT = 'm';

/**
 * Epoch sentinel Date — indicates a document that has not yet been persisted
 */
export const EPOCH_SENTINEL = new Date(0);
