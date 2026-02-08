// Dependencies (global scope):
// - getWeekTarget, saveWeekTarget, getDayLog, saveDayLog, getDayLogsByWeek (from db.js)
// - getISOWeekInfo (from iso-week.js)
// - calculateWeekTotal (from calculations.js)

const weekNumberSpan = document.getElementById('week-number');
const weekRangeSpan = document.getElementById('week-range');
const targetInput = document.getElementById('target-input');
const currentTotalSpan = document.getElementById('current-total');
const forecastTotalSpan = document.getElementById('forecast-total');
const weeklyPlanTotalSpan = document.getElementById('weekly-plan-total');
const forecastDiffSpan = document.getElementById('forecast-diff');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const scheduleBody = document.getElementById('schedule-body');

// 表示中の週の基準日（初期値は今日）
let currentDate = new Date();

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
 * UIを現在の基準日で更新
 */
async function loadData() {
    const weekInfo = getISOWeekInfo(currentDate);
    const targetKey = `${weekInfo.iso_year}-W${String(weekInfo.week_number).padStart(2, '0')}`;

    // 週情報の表示更新
    weekNumberSpan.textContent = `${weekInfo.iso_year}-W${String(weekInfo.week_number).padStart(2, '0')}`;
    weekRangeSpan.textContent = `${weekInfo.start_date.replace(/-/g, '/')} - ${weekInfo.end_date.replace(/-/g, '/')}`;

    // 目標値の読み込み
    const targetRecord = await getWeekTarget(targetKey);
    const targetElevation = targetRecord?.target_elevation ?? null;
    if (targetRecord) {
        targetInput.value = targetRecord.target_elevation ?? '';
    } else {
        targetInput.value = '';
    }

    // 現在の実績値の読み込み (週合計)
    const currentTotal = await calculateWeekTotal(weekInfo.iso_year, weekInfo.week_number);
    currentTotalSpan.textContent = currentTotal;

    // 週間スケジュールの生成 (初回または週変更時のみ)
    // 既存の行があり、かつ週が変わっていなければ再生成しない判定を入れると良いが、
    // ここではシンプルに毎回作り直す (loadDataは週変更時と初期ロード時のみ呼ばれる前提にする)
    await renderSchedule(weekInfo, currentTotal, targetElevation);
}

/**
 * 週間スケジュールの描画
 */
async function renderSchedule(weekInfo, currentTotal, targetElevation) {
    scheduleBody.innerHTML = '';

    // 週の開始日(月曜)から7日間ループ
    const [sy, sm, sd] = weekInfo.start_date.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);

    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = formatDateLocal(d);
        const dayName = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];

        const tr = document.createElement('tr');
        tr.dataset.date = dateStr; // 行に日付データを持たせる

        // 日付セル
        const tdDate = document.createElement('td');
        tdDate.textContent = `${d.getMonth() + 1}/${d.getDate()} (${dayName})`;
        tr.appendChild(tdDate);

        // 予定セル (1部)
        const tdPlan1 = document.createElement('td');
        const planInput1 = document.createElement('input');
        planInput1.type = 'number';
        planInput1.min = '0';
        planInput1.step = '100';
        planInput1.className = 'plan-part1';
        planInput1.dataset.date = dateStr;
        planInput1.addEventListener('blur', (e) => saveDailyPlan(dateStr, 'part1', e.target.value));
        tdPlan1.appendChild(planInput1);
        tr.appendChild(tdPlan1);

        // 予定セル (2部)
        const tdPlan2 = document.createElement('td');
        const planInput2 = document.createElement('input');
        planInput2.type = 'number';
        planInput2.min = '0';
        planInput2.step = '100';
        planInput2.className = 'plan-part2';
        planInput2.dataset.date = dateStr;
        planInput2.addEventListener('blur', (e) => saveDailyPlan(dateStr, 'part2', e.target.value));
        tdPlan2.appendChild(planInput2);
        tr.appendChild(tdPlan2);

        // 予定合計セル (表示のみ)
        const tdPlanTotal = document.createElement('td');
        tdPlanTotal.className = 'plan-total-val';
        tdPlanTotal.textContent = '-';
        tr.appendChild(tdPlanTotal);

        // 実績セル (読み取り専用)
        const tdActual = document.createElement('td');
        tdActual.className = 'actual-val';
        tdActual.textContent = '-';
        tr.appendChild(tdActual);

        // 差異セル (読み取り専用)
        const tdDiff = document.createElement('td');
        tdDiff.className = 'diff-val';
        tdDiff.textContent = '-';
        tr.appendChild(tdDiff);

        scheduleBody.appendChild(tr);
    }

    // 値を埋める
    await updateScheduleValues(weekInfo, targetElevation);
}

/**
 * スケジュールの値を更新 (DOM再構築なし)
 */
async function updateScheduleValues(weekInfo, targetElevation) {
    let forecastTotal = 0;
    let weeklyPlanTotal = 0;

    // 行をイテレート
    const rows = scheduleBody.querySelectorAll('tr');

    for (const tr of rows) {
        const dateStr = tr.dataset.date;
        const log = await getDayLog(dateStr);

        const plan1 = log?.daily_plan_part1 ?? null;
        const plan2 = log?.daily_plan_part2 ?? null;
        const actual = log?.elevation_total ?? null;

        // Input値更新
        const input1 = tr.querySelector('.plan-part1');
        if (document.activeElement !== input1) {
            input1.value = plan1 ?? '';
        }

        const input2 = tr.querySelector('.plan-part2');
        if (document.activeElement !== input2) {
            input2.value = plan2 ?? '';
        }

        // 予定合計の計算と表示
        const p1 = plan1 ?? 0;
        const p2 = plan2 ?? 0;
        const planSum = p1 + p2;

        // 週の予定合計に加算（単純合計）
        weeklyPlanTotal += planSum;

        const tdPlanTotal = tr.querySelector('.plan-total-val');
        tdPlanTotal.textContent = planSum > 0 ? `${planSum}m` : '-';

        const tdActual = tr.querySelector('.actual-val');
        tdActual.textContent = actual !== null ? `${actual}m` : '-';

        // 差異計算 (実績がある場合のみ)
        const tdDiff = tr.querySelector('.diff-val');
        if (actual !== null) {
            const diff = actual - planSum;
            const sign = diff >= 0 ? '+' : ''; // 0は+0と表示するか、単に0とするか。ここでは+をつける
            tdDiff.textContent = `${sign}${diff}m`;
            // 色付けたい場合はクラス操作など
        } else {
            tdDiff.textContent = '-';
        }

        // 見込み計算
        let valueForForecast = 0;
        if (actual !== null) {
            valueForForecast = actual;
        } else {
            valueForForecast = planSum;
        }
        forecastTotal += valueForForecast;
    }

    // 見込み合計表示更新
    forecastTotalSpan.textContent = forecastTotal;
    weeklyPlanTotalSpan.textContent = weeklyPlanTotal;

    if (targetElevation !== null && targetElevation > 0) {
        const diff = forecastTotal - targetElevation;
        const sign = diff >= 0 ? '+' : '';
        const percentage = Math.round((forecastTotal / targetElevation) * 100);
        forecastDiffSpan.textContent = `(目標比: ${sign}${diff}m / ${percentage}%)`;
    } else {
        forecastDiffSpan.textContent = '';
    }
}

/**
 * 日次予定の保存
 */
async function saveDailyPlan(dateStr, part, value) {
    const numValue = value === '' ? null : Number(value);

    const existing = await getDayLog(dateStr);
    const weekInfo = getISOWeekInfo(new Date(dateStr)); // ここはLocal DateでOK

    const record = {
        date: dateStr,
        elevation_part1: existing?.elevation_part1 ?? null,
        elevation_part2: existing?.elevation_part2 ?? null,
        elevation_total: existing?.elevation_total ?? 0,
        subjective_condition: existing?.subjective_condition ?? null,

        daily_plan_part1: part === 'part1' ? numValue : (existing?.daily_plan_part1 ?? null),
        daily_plan_part2: part === 'part2' ? numValue : (existing?.daily_plan_part2 ?? null),

        iso_year: weekInfo.iso_year,
        week_number: weekInfo.week_number,
        timezone: "Asia/Tokyo",
        created_at: existing?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await saveDayLog(record);

    // 再描画ではなく値のみ更新
    // targetRecordが必要だが... グローバルにキャッシュするか、再取得するか。
    // targetInputから読み取るのが早い。
    const targetVal = targetInput.value === '' ? null : Number(targetInput.value);

    // 現在表示中の週のコンテキストで更新
    const currentWeekInfo = getISOWeekInfo(currentDate);
    await updateScheduleValues(currentWeekInfo, targetVal);
}


/**
 * 目標の保存
 */
async function saveTarget() {
    const weekInfo = getISOWeekInfo(currentDate);
    const targetKey = `${weekInfo.iso_year}-W${String(weekInfo.week_number).padStart(2, '0')}`;

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
    await loadData();
}

/**
 * 週の変更
 * @param {number} offset 
 */
async function changeWeek(offset) {
    currentDate.setDate(currentDate.getDate() + (offset * 7));
    await loadData();
}

// イベントリスナー
targetInput.addEventListener('blur', saveTarget);

prevWeekBtn.addEventListener('click', () => changeWeek(-1));
nextWeekBtn.addEventListener('click', () => changeWeek(1));

// 初期ロード
loadData();
