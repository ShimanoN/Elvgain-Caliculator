import { getWeekTarget, saveWeekTarget } from './db.js';
import { getISOWeekInfo } from './iso-week.js';
import { calculateWeekTotal } from './calculations.js';

const weekNumberSpan = document.getElementById('week-number');
const weekRangeSpan = document.getElementById('week-range');
const targetInput = document.getElementById('target-input');
const currentTotalSpan = document.getElementById('current-total');

// 今日の日付から週情報を取得
const today = new Date();
const weekInfo = getISOWeekInfo(today);
const targetKey = `${weekInfo.iso_year}-W${String(weekInfo.week_number).padStart(2, '0')}`;

/**
 * UIの初期化
 */
async function init() {
    weekNumberSpan.textContent = `${weekInfo.iso_year}-W${String(weekInfo.week_number).padStart(2, '0')}`;
    weekRangeSpan.textContent = `${weekInfo.start_date.replace(/-/g, '/')} - ${weekInfo.end_date.replace(/-/g, '/')}`;

    const targetRecord = await getWeekTarget(targetKey);
    if (targetRecord) {
        targetInput.value = targetRecord.target_elevation ?? '';
    }

    const currentTotal = await calculateWeekTotal(weekInfo.iso_year, weekInfo.week_number);
    currentTotalSpan.textContent = currentTotal;
}

/**
 * 目標の保存
 */
async function saveTarget() {
    const targetValue = targetInput.value === '' ? null : Number(targetInput.value);

    const existing = await getWeekTarget(targetKey);

    const record = {
        key: targetKey,
        iso_year: weekInfo.iso_year,
        week_number: weekInfo.week_number,
        start_date: weekInfo.start_date,
        end_date: weekInfo.end_date,
        target_elevation: targetValue,
        created_at: existing?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await saveWeekTarget(record);
}

// イベントリスナー
targetInput.addEventListener('blur', saveTarget);

// 実行
init();
