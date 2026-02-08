// Dependencies (global scope):
// - getWeekTarget, saveWeekTarget, getDayLog, saveDayLog, getDayLogsByWeek (from db.js)
// - getISOWeekInfo (from iso-week.js)
// - calculateWeekTotal (from calculations.js)

const weekNumberSpan = document.getElementById('week-number');
const weekRangeSpan = document.getElementById('week-range');
const targetInput = document.getElementById('target-input');
const currentTotalSpan = document.getElementById('current-total');
const forecastTotalSpan = document.getElementById('forecast-total');
const forecastDiffSpan = document.getElementById('forecast-diff');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');
const scheduleBody = document.getElementById('schedule-body');

// 表示中の週の基準日（初期値は今日）
let currentDate = new Date();

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

    // 週間スケジュールの生成と予実計算
    await renderSchedule(weekInfo, currentTotal, targetElevation);
}

/**
 * 週間スケジュールの描画と見込み計算
 * @param {Object} weekInfo 
 * @param {number} currentTotal 
 * @param {number|null} targetElevation 
 */
async function renderSchedule(weekInfo, currentTotal, targetElevation) {
    scheduleBody.innerHTML = '';
    let forecastTotal = 0;

    // 週の開始日(月曜)から7日間ループ
    const startDate = new Date(weekInfo.start_date); // YYYY-MM-DD string is parseable

    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];

        const log = await getDayLog(dateStr);
        const plan = log?.daily_plan ?? null;
        const actual = log?.elevation_total ?? null;

        // 見込み計算ロジック:
        // 実績があれば実績を、なければ予定を加算。
        // もし両方なければ0。
        // ※「未来」か「過去」かで判定を変える手もあるが、シンプルに「実績優先」とする。
        //   実績が0の場合は「休み」なのか「これから」なのか不明だが、
        //   MVPでは「実績入力済みなら実績、未入力なら予定」とみなす。
        //   ただし、0mの実績も「入力済み」とみなすかどうか。
        //   ここでは、actualがnullでなければ(0含む)実績採用、nullなら予定採用とする。

        let valueForForecast = 0;
        if (actual !== null) {
            valueForForecast = actual;
        } else if (plan !== null) {
            valueForForecast = plan;
        }
        forecastTotal += valueForForecast;

        const tr = document.createElement('tr');

        // 日付セル
        const tdDate = document.createElement('td');
        tdDate.textContent = `${d.getMonth() + 1}/${d.getDate()} (${dayName})`;
        tr.appendChild(tdDate);

        // 予定セル (入力可能)
        const tdPlan = document.createElement('td');
        const planInput = document.createElement('input');
        planInput.type = 'number';
        planInput.min = '0';
        planInput.step = '100';
        planInput.value = plan ?? '';
        planInput.dataset.date = dateStr;
        planInput.addEventListener('blur', (e) => saveDailyPlan(dateStr, e.target.value));
        tdPlan.appendChild(planInput);
        tr.appendChild(tdPlan);

        // 実績セル (読み取り専用)
        const tdActual = document.createElement('td');
        tdActual.textContent = actual !== null ? `${actual}m` : '-';
        tr.appendChild(tdActual);

        scheduleBody.appendChild(tr);
    }

    // 見込み合計表示更新
    forecastTotalSpan.textContent = forecastTotal;

    if (targetElevation !== null && targetElevation > 0) {
        const diff = forecastTotal - targetElevation;
        const sign = diff >= 0 ? '+' : '';
        const percentage = Math.round((forecastTotal / targetElevation) * 100);
        forecastDiffSpan.textContent = `(目標比: ${sign}${diff}m / ${percentage}%)`;

        // 色分けなどはCSSで行うが、MVPではテキストのみ
    } else {
        forecastDiffSpan.textContent = '';
    }
}

/**
 * 日次予定の保存
 * @param {string} dateStr 
 * @param {string} value 
 */
async function saveDailyPlan(dateStr, value) {
    const numValue = value === '' ? null : Number(value);

    const existing = await getDayLog(dateStr);
    const weekInfo = getISOWeekInfo(new Date(dateStr));

    const record = {
        date: dateStr,
        elevation_part1: existing?.elevation_part1 ?? null,
        elevation_part2: existing?.elevation_part2 ?? null,
        elevation_total: existing?.elevation_total ?? 0, // 既存ロジック維持
        subjective_condition: existing?.subjective_condition ?? null,
        daily_plan: numValue, // 新規フィールド更新
        iso_year: weekInfo.iso_year,
        week_number: weekInfo.week_number,
        timezone: "Asia/Tokyo",
        created_at: existing?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await saveDayLog(record);

    // 再計算のために画面更新 (フォーカスが外れるためUX注意だが、集計更新のために必要)
    // ただし全リロードは重いので、データ部分のみ更新したいが、
    // ここではシンプルにloadData()を呼ぶ。
    // ※入力欄のフォーカスが外れたタイミングなので問題ないはず。
    await loadData();
}


/**
 * 目標の保存
 */
async function saveTarget() {
    // 画面遷移などでcurrentDateが変わる前に、現在の入力値を保存する必要があるため
    // 現在表示されている週の情報を再取得してキーを生成する
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
    await loadData(); // 再計算
}

/**
 * 週の変更
 * @param {number} offset 
 */
async function changeWeek(offset) {
    // 遷移前に保存（念のためtargetInputのblurが発火していない場合も考慮したいが、
    // ボタンクリックでblurが先に走るはずなので、ここでは明示的にsaveTargetを呼ばなくても良いが、
    // 安全のために呼ぶと二重保存になる可能性がある。
    // ここではUXを優先し、明示的保存はしない（blurに任せる）。

    // 日付を移動 (7日単位)
    currentDate.setDate(currentDate.getDate() + (offset * 7));
    await loadData();
}

// イベントリスナー
targetInput.addEventListener('blur', saveTarget);

prevWeekBtn.addEventListener('click', () => changeWeek(-1));
nextWeekBtn.addEventListener('click', () => changeWeek(1));

// 初期ロード
loadData();
