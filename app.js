import { getDayLog, saveDayLog, getWeekTarget } from './db.js';
import { getISOWeekInfo } from './iso-week.js';
import { calculateWeekTotal, calculateWeekProgress } from './calculations.js';

const dateInput = document.getElementById('current-date');
const part1Input = document.getElementById('part1');
const part2Input = document.getElementById('part2');
const dailyTotalSpan = document.getElementById('daily-total');
const conditionRadios = document.getElementsByName('condition');
const weekRangeSpan = document.getElementById('week-range');
const weekTargetSpan = document.getElementById('week-target');
const weekCurrentSpan = document.getElementById('week-current');
const weekDiffArea = document.getElementById('week-diff-area');
const weekDiffSpan = document.getElementById('week-diff');
const weekPercentageSpan = document.getElementById('week-percentage');

// 今日の日付を初期値として設定
const today = new Date();
dateInput.value = today.toISOString().split('T')[0];

const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');

// 今日の日付を初期値として保持
const TODAY_STR = new Date().toISOString().split('T')[0];
dateInput.value = TODAY_STR;

/**
 * 30日制限のチェックとボタンの無効化
 */
function updateNavButtons() {
    const current = new Date(dateInput.value);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 30);

    // 前日ボタンの制限
    if (current <= minDate) {
        prevDayBtn.disabled = true;
    } else {
        prevDayBtn.disabled = false;
    }

    // 翌日ボタン（未来日には制限なしだが、指示に従いボタン自体の動作は実装）
    // 特記なき場合は未来日も入力可能とするが、翌日ボタンは常に有効とする。
}

/**
 * UIを現在のデータで更新
 */
async function loadData() {
    const date = dateInput.value;
    const log = await getDayLog(date);

    if (log) {
        part1Input.value = log.elevation_part1 ?? '';
        part2Input.value = log.elevation_part2 ?? '';
        dailyTotalSpan.textContent = log.elevation_total || 0;

        for (const radio of conditionRadios) {
            radio.checked = log.subjective_condition === radio.value;
        }
    } else {
        part1Input.value = '';
        part2Input.value = '';
        dailyTotalSpan.textContent = 0;
        for (const radio of conditionRadios) {
            radio.checked = false;
        }
    }

    await updateWeekProgress();
    updateNavButtons();
}

/**
 * 現在の入力を保存
 */
async function saveData() {
    const date = dateInput.value;
    const part1Value = part1Input.value;
    const part2Value = part2Input.value;

    const part1 = part1Value === '' ? null : Number(part1Value);
    const part2 = part2Value === '' ? null : Number(part2Value);

    let condition = null;
    for (const radio of conditionRadios) {
        if (radio.checked) {
            condition = radio.value;
            break;
        }
    }

    const existing = await getDayLog(date);
    const weekInfo = getISOWeekInfo(new Date(date));
    const total = (part1 ?? 0) + (part2 ?? 0);

    const record = {
        date: date,
        elevation_part1: part1,
        elevation_part2: part2,
        elevation_total: total,
        subjective_condition: condition,
        iso_year: weekInfo.iso_year,
        week_number: weekInfo.week_number,
        timezone: "Asia/Tokyo",
        created_at: existing?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await saveDayLog(record);
    dailyTotalSpan.textContent = total;
    await updateWeekProgress();
}

/**
 * 日付変更処理
 * @param {number} offset 
 */
async function changeDate(offset) {
    // 遷移前に保存
    await saveData();

    const current = new Date(dateInput.value);
    current.setDate(current.getDate() + offset);

    // 30日制限チェック (前日のみ)
    if (offset < 0) {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() - 30);
        if (current < minDate) return;
    }

    dateInput.value = current.toISOString().split('T')[0];
    await loadData();
}

/**
 * 週進捗エリアの更新
 */
async function updateWeekProgress() {
    const date = new Date(dateInput.value);
    const weekInfo = getISOWeekInfo(date);

    // 表示更新
    weekRangeSpan.textContent = `${weekInfo.start_date.replace(/-/g, '/')} - ${weekInfo.end_date.replace(/-/g, '/')}`;

    const targetKey = `${weekInfo.iso_year}-W${String(weekInfo.week_number).padStart(2, '0')}`;
    const targetRecord = await getWeekTarget(targetKey);
    const currentTotal = await calculateWeekTotal(weekInfo.iso_year, weekInfo.week_number);

    weekCurrentSpan.textContent = currentTotal;

    if (targetRecord && targetRecord.target_elevation !== null) {
        weekTargetSpan.textContent = `${targetRecord.target_elevation}m`;
        const progress = calculateWeekProgress(currentTotal, targetRecord.target_elevation);

        weekDiffArea.style.display = 'block';
        weekDiffSpan.textContent = `${progress.diff >= 0 ? '+' : ''}${progress.diff}m`;
        weekPercentageSpan.textContent = `${progress.percentage}%`;
    } else {
        weekTargetSpan.textContent = '未設定';
        weekDiffArea.style.display = 'none';
    }
}

// イベントリスナー
part1Input.addEventListener('blur', saveData);
part2Input.addEventListener('blur', saveData);
for (const radio of conditionRadios) {
    radio.addEventListener('change', saveData);
}

prevDayBtn.addEventListener('click', () => changeDate(-1));
nextDayBtn.addEventListener('click', () => changeDate(1));
dateInput.addEventListener('change', async () => {
    // 変更前の日付がわからないため、現在の入力値を保存してからロード
    // ただし通常changeイベントが発火した時点ではvalueは変更後。
    // そのため、UI上の「保存」はblur等で行うことが前提。
    // 日付入力そのものの変更時もカレンダー等からの遷移前に保存したいが、
    // Date inputの仕組み上、直前の値を保持しておく必要がある。
    await loadData();
});

// 初期ロード
loadData();
