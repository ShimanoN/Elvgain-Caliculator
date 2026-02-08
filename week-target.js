// Dependencies (global scope):
// - getWeekTarget, saveWeekTarget (from db.js)
// - getISOWeekInfo (from iso-week.js)
// - calculateWeekTotal (from calculations.js)

const weekNumberSpan = document.getElementById('week-number');
const weekRangeSpan = document.getElementById('week-range');
const targetInput = document.getElementById('target-input');
const currentTotalSpan = document.getElementById('current-total');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');

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
    if (targetRecord) {
        targetInput.value = targetRecord.target_elevation ?? '';
    } else {
        targetInput.value = '';
    }

    // 現在の実績値の読み込み
    const currentTotal = await calculateWeekTotal(weekInfo.iso_year, weekInfo.week_number);
    currentTotalSpan.textContent = currentTotal;
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
}

/**
 * 週の変更
 * @param {number} offset 
 */
async function changeWeek(offset) {
    // 遷移前に保存
    await saveTarget();

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
