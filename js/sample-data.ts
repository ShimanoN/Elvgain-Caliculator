/**
 * Sample data generation for testing and demonstration
 */

import { saveDayLog } from './db.js';
import type { DayLog } from './db.js';
import { getISOWeekInfo } from './iso-week.js';
import { formatDateLocal } from './date-utils.js';
import { DEFAULT_TIMEZONE } from './constants.js';

// ============================================================
// Type Definitions
// ============================================================

/**
 * Options for sample data generation
 */
interface GenerateOptions {
  /** Probability that a day has activity (0-1) */
  activityProb?: number;
}

/**
 * Result of sample data generation
 */
interface GenerateResult {
  /** Number of logs generated */
  generated: number;
  /** Number of weeks generated */
  weeks: number;
}

// ============================================================
// Helper Functions
// ============================================================

// formatDate is now provided by date-utils.ts as formatDateLocal

/**
 * Generate random integer in range [min, max]
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer
 */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Weighted random selection from array
 * @param items - Array of items to choose from
 * @param weights - Array of weights (same length as items)
 * @returns Selected item
 */
function weightedPick<T>(items: T[], weights: number[]): T {
  const sum = weights.reduce((a, b) => a + b, 0);
  const r = Math.random() * sum;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r <= acc) return items[i];
  }
  return items[items.length - 1];
}

// ============================================================
// Public API
// ============================================================

/**
 * Generate sample elevation data for testing
 * @param weeks - Number of weeks to generate (default: 8)
 * @param options - Generation options
 * @returns Promise resolving to generation result
 */
export async function generate(
  weeks: number = 8,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const days = weeks * 7;
  const today = new Date();
  const activityProb = options.activityProb ?? 0.6;
  const logs: DayLog[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (Math.random() > activityProb) continue;

    const weekday = d.getDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 200 : 0;
    const elevation = Math.max(
      0,
      randInt(100, 1200) + weekendBoost + randInt(-50, 150)
    );

    let weights: number[];
    if (elevation > 1000) weights = [0.6, 0.3, 0.1];
    else if (elevation > 400) weights = [0.4, 0.45, 0.15];
    else weights = [0.2, 0.6, 0.2];

    const condition = weightedPick(['good', 'normal', 'bad'] as const, weights);
    const part1 = randInt(0, Math.round(elevation * 0.6));
    const part2 = Math.max(0, elevation - part1);

    const weekInfo = getISOWeekInfo(d);
    logs.push({
      date: formatDateLocal(d),
      elevation_part1: part1,
      elevation_part2: part2,
      elevation_total: part1 + part2,
      subjective_condition: condition,
      iso_year: weekInfo.iso_year,
      week_number: weekInfo.week_number,
      timezone: DEFAULT_TIMEZONE,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  for (const log of logs) {
    await saveDayLog(log);
  }

  return { generated: logs.length, weeks };
}
