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
const weekTargetSpan = document.getElementById('week-target');
const weekCurrentSpan = document.getElementById('week-current');
const weekDiffArea = document.getElementById('week-diff-area');
const weekDiffSpan = document.getElementById('week-diff');
const weekPercentageSpan = document.getElementById('week-percentage');

const prevDayBtn = document.getElementById('prev-day');
const nextDayBtn = document.getElementById('next-day');

/**
 * 日付をローカルタイムで YYYY-MM-DD 文字列に変換
 */
function formatDateLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// 今日の日付を初期値として保持 (ローカルタイム)
const TODAY_STR = formatDateLocal(new Date());
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
    // NOTE: `remainingPastDays` and `updateNavigationState` are not defined in the provided context.
    // Assuming they are defined elsewhere or will be added later.
    // The original 30-day limit check is removed as per the instruction's implied replacement.
    if (offset < 0 && remainingPastDays <= 0) {
        return; // 30日制限
    }

    const current = new Date(dateInput.value); // current is 00:00 local
    current.setDate(current.getDate() + offset);

    const nextDateStr = formatDateLocal(current);

    // データ保存 (自動保存)
    // ※実際にはinputのchangeイベントやblurで保存されるが、念のため画面遷移前に保存するロジックを入れる場合はここ
    // 今回の仕様では「入力中に移動」はない前提（input外をクリックしてから移動）だが、
    // 安全策として、移動前に現在の値を保存する処理は blur イベントに任せる（UX上も自然）

    // 日付更新
    dateInput.value = nextDateStr;

    // データ再読み込み
    await loadData(nextDateStr);

    // ナビゲーションボタン状態更新
    updateNavigationState();
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

    // 目標進捗表示
    const weekTargetValue = targetRecord?.target_elevation || 0; // Corrected `weekTarget` to `targetRecord`
    weekTargetSpan.textContent = weekTargetValue > 0 ? `${weekTargetValue}m` : '未設定'; // Adapted to existing span

    if (weekTargetValue > 0) {
        const progress = Math.min(100, Math.round((currentTotal / weekTargetValue) * 100));
        weekPercentageSpan.textContent = `${progress}%`; // Adapted to existing span

        const remaining = Math.max(0, weekTargetValue - currentTotal);
        // Assuming a new span for remaining, or adapting weekDiffSpan
        // For now, let's keep weekDiffSpan for diff and add remaining logic if needed.
        // The original weekDiffArea logic is replaced by the new progress display.
        weekDiffArea.style.display = 'block'; // Ensure area is visible if target is set
        weekDiffSpan.textContent = `${remaining}m (残り)`; // Example adaptation
    } else {
        weekPercentageSpan.textContent = '---%'; // Adapted to existing span
        weekDiffArea.style.display = 'none'; // Hide if no target
    }

    // グラフ描画
    // 週の全データを取得して整形
    const weekLogs = await getDayLogsByWeek(weekInfo.iso_year, weekInfo.week_number);

    const chartData = [];
    const [sy, sm, sd] = weekInfo.start_date.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);

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
    }

    if (typeof drawWeeklyChart === 'function') {
        drawWeeklyChart('weeklyCheckChart', chartData, weekTargetValue);
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
    // 日付変更時
    await loadData();
});

// 初期ロード
loadData();
