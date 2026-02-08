// Dependencies (global scope):
// - getDayLog, saveDayLog, getWeekTarget (from db.js)
// - getISOWeekInfo (from iso-week.js)
// - calculateWeekTotal, calculateWeekProgress (from calculations.js)

const dateInput = document.getElementById('current-date');
const part1Input = document.getElementById('part1');
const part2Input = document.getElementById('part2');
const dailyTotalSpan = document.getElementById('daily-total');
const conditionRadios = document.getElementsByName('condition');
const weekRangeSpan = document.getElementById('week-range');
const weekTargetSpan = document.getElementById('weekly-target');
const weekCurrentSpan = document.getElementById('weekly-total');
const weekProgressSpan = document.getElementById('weekly-progress');
const weekRemainingSpan = document.getElementById('weekly-remaining');
const weekProgressBar = document.getElementById('weekly-progress-bar');
const condGoodCount = document.getElementById('cond-good-count');
const condNormalCount = document.getElementById('cond-normal-count');
const condBadCount = document.getElementById('cond-bad-count');
const conditionStrip = document.getElementById('condition-strip');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');

const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');

let weekBaseDate = new Date();

/**
 * 日付をローカルタイムで YYYY-MM-DD 文字列に変換
 */
function formatDateLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * "YYYY-MM-DD" 文字列をローカルタイム Date に変換
 * (new Date("YYYY-MM-DD") は UTC として解釈されるため使わない)
 */
function parseDateLocal(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// 今日の日付を初期値として保持 (ローカルタイム)
const TODAY_STR = formatDateLocal(new Date());
dateInput.value = TODAY_STR;

/**
 * 30日制限のチェックとボタンの無効化
 */
function updateNavButtons() {
    const current = parseDateLocal(dateInput.value);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 30);

    // 前日ボタンの制限
    if (current <= minDate) {
        prevDayBtn.disabled = true;
    } else {
        prevDayBtn.disabled = false;
    }
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
    const weekInfo = getISOWeekInfo(parseDateLocal(date));
    const total = (part1 ?? 0) + (part2 ?? 0);

    const record = {
        date: date,
        elevation_part1: part1,
        elevation_part2: part2,
        elevation_total: total,
        subjective_condition: condition,
        daily_plan_part1: existing?.daily_plan_part1 ?? null,
        daily_plan_part2: existing?.daily_plan_part2 ?? null,
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
    const current = parseDateLocal(dateInput.value);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 30);

    if (offset < 0 && current <= minDate) {
        updateNavButtons();
        return; // 30日制限
    }
    current.setDate(current.getDate() + offset);

    const nextDateStr = formatDateLocal(current);

    // データ保存 (自動保存)
    // ※実際にはinputのchangeイベントやblurで保存されるが、念のため画面遷移前に保存するロジックを入れる場合はここ
    // 今回の仕様では「入力中に移動」はない前提（input外をクリックしてから移動）だが、
    // 安全策として、移動前に現在の値を保存する処理は blur イベントに任せる（UX上も自然）

    // 日付更新
    dateInput.value = nextDateStr;
    weekBaseDate = parseDateLocal(nextDateStr);

    // データ再読み込み
    await loadData();

    // ナビゲーションボタン状態更新
    updateNavButtons();
}

/**
 * 週進捗エリアの更新
 */
async function updateWeekProgress(dateOverride) {
    const baseDate = dateOverride || parseDateLocal(dateInput.value);
    const weekInfo = getISOWeekInfo(baseDate);

    // 表示更新
    if (weekRangeSpan) {
        weekRangeSpan.textContent = `${weekInfo.start_date.replace(/-/g, '/')} - ${weekInfo.end_date.replace(/-/g, '/')}`;
    }

    const targetKey = `${weekInfo.iso_year}-W${String(weekInfo.week_number).padStart(2, '0')}`;

    // 同期用の選択キーを保存（他ページと週選択を共有）
    try {
        localStorage.setItem('elv_selected_week', targetKey);
    } catch (e) {
        console.warn('Could not write elv_selected_week to localStorage', e);
    }

    const targetRecord = await getWeekTarget(targetKey);
    const currentTotal = await calculateWeekTotal(weekInfo.iso_year, weekInfo.week_number);

    weekCurrentSpan.textContent = currentTotal;

    // 目標進捗表示
    const weekTargetValue = targetRecord?.target_elevation || 0;
    weekTargetSpan.textContent = weekTargetValue > 0 ? `${weekTargetValue}` : '---';

    if (weekTargetValue > 0) {
        const progress = Math.min(100, Math.round((currentTotal / weekTargetValue) * 100));
        weekProgressSpan.textContent = `${progress}%`;
        if (weekProgressBar) {
            weekProgressBar.style.width = `${progress}%`;
        }

        const remaining = Math.max(0, weekTargetValue - currentTotal);
        weekRemainingSpan.textContent = remaining;
    } else {
        weekProgressSpan.textContent = '---%';
        weekRemainingSpan.textContent = '---';
        if (weekProgressBar) {
            weekProgressBar.style.width = '0%';
        }
    }

    // グラフ描画
    try {
        if (typeof getDayLogsByWeek !== 'function') {
            console.error('getDayLogsByWeek is not defined');
            return;
        }

        // 週の全データを取得して整形
        const logs = await getDayLogsByWeek(weekInfo.iso_year, weekInfo.week_number);
        const weekLogs = Array.isArray(logs) ? logs : [];

        const conditionStats = {
            good: { count: 0, total: 0 },
            normal: { count: 0, total: 0 },
            bad: { count: 0, total: 0 }
        };

        for (const log of weekLogs) {
            if (!log || !log.subjective_condition) continue;
            const key = log.subjective_condition;
            if (!conditionStats[key]) continue;
            if (log.elevation_total === null || log.elevation_total === undefined) continue;
            conditionStats[key].count += 1;
            conditionStats[key].total += log.elevation_total;
        }

        const chartData = [];
        const [sy, sm, sd] = weekInfo.start_date.split('-').map(Number);
        const startDate = new Date(sy, sm - 1, sd);

        const dayLabels = ['月', '火', '水', '木', '金', '土', '日'];

        if (conditionStrip) {
            conditionStrip.innerHTML = '';
        }

        for (let i = 0; i < 7; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = formatDateLocal(d);
            const dayName = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];

            // weekLogs is array, find by date
            const log = weekLogs.find(l => l.date === dateStr);

            chartData.push({
                date: dateStr,
                dayName: dayName,
                plan: (log?.daily_plan_part1 || 0) + (log?.daily_plan_part2 || 0),
                actual: log?.elevation_total ?? null // nullなら実績なし(未到来)
            });

            if (conditionStrip) {
                const label = dayLabels[i];
                const segment = document.createElement('div');
                segment.className = 'condition-segment';
                segment.setAttribute('data-day', label);
                const condition = log?.subjective_condition ?? null;
                if (condition === 'good') segment.classList.add('condition-good');
                else if (condition === 'normal') segment.classList.add('condition-normal');
                else if (condition === 'bad') segment.classList.add('condition-bad');
                else segment.classList.add('condition-empty');
                conditionStrip.appendChild(segment);
            }
        }

            if (typeof drawWeeklyChart === 'function') {
                drawWeeklyChart('weeklyCheckChart', chartData, weekTargetValue);
            } else {
                console.error('drawWeeklyChart is not defined');
            }

            if (condGoodCount && condNormalCount && condBadCount) {
                condGoodCount.textContent = conditionStats.good.count;
                condNormalCount.textContent = conditionStats.normal.count;
                condBadCount.textContent = conditionStats.bad.count;
            }
    } catch (e) {
        console.error('Error drawing chart:', e);
    }
}

function changeWeek(offset) {
    const next = new Date(weekBaseDate);
    next.setDate(next.getDate() + (offset * 7));
    weekBaseDate = next;
    updateWeekProgress(weekBaseDate);
}

// イベントリスナー
part1Input.addEventListener('blur', saveData);
part2Input.addEventListener('blur', saveData);
for (const radio of conditionRadios) {
    radio.addEventListener('change', saveData);
}

prevDayBtn.addEventListener('click', () => changeDate(-1));
nextDayBtn.addEventListener('click', () => changeDate(1));
if (prevWeekBtn && nextWeekBtn) {
    prevWeekBtn.addEventListener('click', () => changeWeek(-1));
    nextWeekBtn.addEventListener('click', () => changeWeek(1));
}
dateInput.addEventListener('change', async () => {
    // 日付変更時
    weekBaseDate = parseDateLocal(dateInput.value);
    await loadData();
});

// 初期ロード
weekBaseDate = parseDateLocal(dateInput.value);
loadData();
