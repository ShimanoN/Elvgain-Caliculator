import { getDayLogsByWeek } from './db.js';

/**
 * 指定週の獲得標高合計を計算
 * @param {number} iso_year 
 * @param {number} week_number 
 * @returns {Promise<number>}
 */
export async function calculateWeekTotal(iso_year, week_number) {
    const logs = await getDayLogsByWeek(iso_year, week_number);
    return logs.reduce((sum, log) => sum + (log.elevation_total || 0), 0);
}

/**
 * 週目標との差分計算
 * @param {number} current_total 現在の週合計
 * @param {number|null} target 週目標
 * @returns {{ diff: number|null, percentage: number|null }}
 */
export function calculateWeekProgress(current_total, target) {
    if (target === null || target === undefined || target === 0) {
        if (target === 0) {
            return { diff: current_total, percentage: 100 };
        }
        return { diff: null, percentage: null };
    }
    const diff = current_total - target;
    const percentage = Math.round((current_total / target) * 100);
    return { diff, percentage };
}
