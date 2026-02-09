/**
 * 指定週の獲得標高合計を計算
 * @param {number} iso_year 
 * @param {number} week_number 
 * @returns {Promise<number>}
 */
async function calculateWeekTotal(iso_year, week_number) {
    try {
        // Validate inputs
        if (!Number.isInteger(iso_year) || iso_year < 2000 || iso_year > 2100) {
            console.error('Invalid iso_year:', iso_year);
            return 0;
        }
        if (!Number.isInteger(week_number) || week_number < 1 || week_number > 53) {
            console.error('Invalid week_number:', week_number);
            return 0;
        }
        
        // getDayLogsByWeek is globally available from db.js
        const logs = await getDayLogsByWeek(iso_year, week_number);
        if (!Array.isArray(logs)) {
            console.error('Invalid logs data:', logs);
            return 0;
        }
        return logs.reduce((sum, log) => sum + (log.elevation_total || 0), 0);
    } catch (error) {
        console.error('Error calculating week total:', error);
        return 0;
    }
}

/**
 * 週目標との差分計算
 * @param {number} current_total 現在の週合計
 * @param {number|null} target 週目標
 * @returns {{ diff: number|null, percentage: number|null }}
 */
function calculateWeekProgress(current_total, target) {
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
