/**
 * Week target management page logic (week-target.html)
 * Handles weekly target setting and daily plan scheduling
 */

import { initFirebase } from './firebase-config.js';
import { getWeekTarget, getDayLog } from './db.js';
import type { DayLog, WeekTarget } from './db.js';
import { getISOWeekInfo } from './iso-week.js';
import { calculateWeekTotal } from './calculations.js';
import { formatDateLocal, parseDateLocal } from './date-utils.js';
import {
  formatISOWeekKey,
  formatDateRangeDisplay,
  getJPDayName,
} from './formatters.js';
import type { ISOWeekInfo } from './iso-week.js';
// Import side effects for backup and export functionality
import { saveDayLogWithBackup, saveWeekTargetWithBackup } from './backup.js';
import { setSelectedWeek, getSelectedWeek } from './storage.js';
import './export-image.js';

// ============================================================
// Firebase Initialization
// ============================================================

// Initialize Firebase early to ensure emulator connections are established
// before any data operations (especially important for E2E tests)
initFirebase();

// ============================================================
// DOM Element References
// ============================================================

const weekNumberSpan = document.getElementById(
  'week-number'
) as HTMLSpanElement;
const weekRangeSpan = document.getElementById('week-range') as HTMLSpanElement;
const targetInput = document.getElementById('target-input') as HTMLInputElement;
const currentTotalSpan = document.getElementById(
  'current-total'
) as HTMLSpanElement;
const forecastTotalSpan = document.getElementById(
  'forecast-total'
) as HTMLSpanElement;
const weeklyPlanTotalSpan = document.getElementById(
  'weekly-plan-total'
) as HTMLSpanElement;
const forecastDiffSpan = document.getElementById(
  'forecast-diff'
) as HTMLSpanElement;
const prevWeekBtn = document.getElementById('prev-week') as HTMLButtonElement;
const nextWeekBtn = document.getElementById('next-week') as HTMLButtonElement;
const scheduleBody = document.getElementById(
  'schedule-body'
) as HTMLTableSectionElement;
const presetButtons =
  document.querySelectorAll<HTMLButtonElement>('.preset-btn');

// ============================================================
// Application State
// ============================================================

// Current display week (initially today)
let currentDate = new Date();

// ============================================================
// Data Loading
// ============================================================

/**
 * Load and display data for the current week
 */
async function loadData(): Promise<void> {
  try {
    const weekInfo = getISOWeekInfo(currentDate);
    const targetKey = formatISOWeekKey(weekInfo.iso_year, weekInfo.week_number);

    // Update week info display
    weekNumberSpan.textContent = formatISOWeekKey(
      weekInfo.iso_year,
      weekInfo.week_number
    );
    weekRangeSpan.textContent = formatDateRangeDisplay(
      weekInfo.start_date,
      weekInfo.end_date
    );

    // Load target value
    const targetRecord = await getWeekTarget(targetKey);
    const targetElevation = targetRecord?.target_elevation ?? null;
    if (targetRecord) {
      targetInput.value =
        targetRecord.target_elevation !== null
          ? String(targetRecord.target_elevation)
          : '';
    } else {
      targetInput.value = '';
    }

    // Load current actual total for the week
    const currentTotal = await calculateWeekTotal(
      weekInfo.iso_year,
      weekInfo.week_number
    );
    currentTotalSpan.textContent = String(currentTotal);

    // Render weekly schedule
    await renderSchedule(weekInfo, currentTotal, targetElevation);

    // Save selected week for sync with other pages
    setSelectedWeek(targetKey);

    // Dispatch custom event for load completion
    document.dispatchEvent(
      new CustomEvent('week-target-loaded', {
        detail: {
          iso_year: weekInfo.iso_year,
          week_number: weekInfo.week_number,
          start_date: weekInfo.start_date,
          end_date: weekInfo.end_date,
        },
      })
    );

    // Update export week input if present and not user-edited
    const exportWeekInput = document.getElementById(
      'export-week-input'
    ) as HTMLInputElement;
    if (exportWeekInput && !exportWeekInput.dataset.userEdited) {
      exportWeekInput.value = targetKey;
    }
  } catch (error) {
    console.error('Error loading week target data:', error);
  }
}

// ============================================================
// Schedule Rendering
// ============================================================

/**
 * Render the weekly schedule table
 * @param weekInfo - ISO week information
 * @param currentTotal - Current actual total for the week
 * @param targetElevation - Target elevation for the week (nullable)
 */
async function renderSchedule(
  weekInfo: ISOWeekInfo,
  _currentTotal: number,
  targetElevation: number | null
): Promise<void> {
  scheduleBody.innerHTML = '';

  // Loop through 7 days starting from Monday
  const [sy, sm, sd] = weekInfo.start_date.split('-').map(Number);
  const startDate = new Date(sy, sm - 1, sd);

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = formatDateLocal(d);
    const dayName = getJPDayName(d.getDay());

    const tr = document.createElement('tr');
    tr.dataset.date = dateStr;

    // Date cell
    const tdDate = document.createElement('td');
    tdDate.textContent = `${d.getMonth() + 1}/${d.getDate()} (${dayName})`;
    tr.appendChild(tdDate);

    // Plan Part 1 cell
    const tdPlan1 = document.createElement('td');
    const planInput1 = document.createElement('input');
    planInput1.type = 'number';
    planInput1.min = '0';
    planInput1.max = '10000';
    planInput1.step = '100';
    planInput1.className = 'plan-part1';
    planInput1.dataset.date = dateStr;
    planInput1.setAttribute(
      'aria-label',
      `${d.getMonth() + 1}/${d.getDate()} 1部予定`
    );
    planInput1.addEventListener('blur', (e) =>
      saveDailyPlan(dateStr, 'part1', (e.target as HTMLInputElement).value)
    );
    tdPlan1.appendChild(planInput1);
    tr.appendChild(tdPlan1);

    // Plan Part 2 cell
    const tdPlan2 = document.createElement('td');
    const planInput2 = document.createElement('input');
    planInput2.type = 'number';
    planInput2.min = '0';
    planInput2.max = '10000';
    planInput2.step = '100';
    planInput2.className = 'plan-part2';
    planInput2.dataset.date = dateStr;
    planInput2.setAttribute(
      'aria-label',
      `${d.getMonth() + 1}/${d.getDate()} 2部予定`
    );
    planInput2.addEventListener('blur', (e) =>
      saveDailyPlan(dateStr, 'part2', (e.target as HTMLInputElement).value)
    );
    tdPlan2.appendChild(planInput2);
    tr.appendChild(tdPlan2);

    // Plan Total cell (display only)
    const tdPlanTotal = document.createElement('td');
    tdPlanTotal.className = 'plan-total-val';
    tdPlanTotal.textContent = '-';
    tr.appendChild(tdPlanTotal);

    // Actual cell (read-only)
    const tdActual = document.createElement('td');
    tdActual.className = 'actual-val';
    tdActual.textContent = '-';
    tr.appendChild(tdActual);

    // Diff cell (read-only)
    const tdDiff = document.createElement('td');
    tdDiff.className = 'diff-val';
    tdDiff.textContent = '-';
    tr.appendChild(tdDiff);

    scheduleBody.appendChild(tr);
  }

  // Fill in values
  await updateScheduleValues(weekInfo, targetElevation);
}

/**
 * Update schedule values without rebuilding DOM
 * @param weekInfo - ISO week information
 * @param targetElevation - Target elevation for the week (nullable)
 */
async function updateScheduleValues(
  _weekInfo: ISOWeekInfo,
  targetElevation: number | null
): Promise<void> {
  let forecastTotal = 0;
  let weeklyPlanTotal = 0;

  // Get all rows
  const rows = scheduleBody.querySelectorAll('tr');

  // Fetch all day logs in parallel for performance
  const dateStrings = Array.from(rows).map((tr) => tr.dataset.date!);
  const logResults = await Promise.all(
    dateStrings.map((dateStr) =>
      getDayLog(dateStr).catch((e) => {
        console.error(
          `[updateScheduleValues] Error getting day log for ${dateStr}:`,
          e
        );
        return undefined;
      })
    )
  );

  let rowIndex = 0;
  for (const tr of rows) {
    const log = logResults[rowIndex++] ?? null;

    const plan1 = log?.daily_plan_part1 ?? null;
    const plan2 = log?.daily_plan_part2 ?? null;
    const actual = log?.elevation_total ?? null;

    // Update input values
    const input1 = tr.querySelector('.plan-part1') as HTMLInputElement;
    if (document.activeElement !== input1) {
      input1.value = plan1 !== null ? String(plan1) : '';
    }

    const input2 = tr.querySelector('.plan-part2') as HTMLInputElement;
    if (document.activeElement !== input2) {
      input2.value = plan2 !== null ? String(plan2) : '';
    }

    // Calculate and display plan total
    const p1 = plan1 ?? 0;
    const p2 = plan2 ?? 0;
    const planSum = p1 + p2;

    // Add to weekly plan total (simple sum)
    weeklyPlanTotal += planSum;

    const tdPlanTotal = tr.querySelector('.plan-total-val')!;
    tdPlanTotal.textContent = planSum > 0 ? `${planSum}m` : '-';

    const tdActual = tr.querySelector('.actual-val')!;
    tdActual.textContent = actual !== null ? `${actual}m` : '-';

    // Calculate diff (only if actual exists)
    const tdDiff = tr.querySelector('.diff-val')!;
    if (actual !== null) {
      const diff = actual - planSum;
      const sign = diff >= 0 ? '+' : '';
      tdDiff.textContent = `${sign}${diff}m`;
    } else {
      tdDiff.textContent = '-';
    }

    // Forecast calculation
    // Check if actual data exists (either part1 or part2 has value)
    const hasActual =
      log?.elevation_part1 !== null || log?.elevation_part2 !== null;
    let valueForForecast = 0;

    if (hasActual) {
      // Use actual total if data exists
      valueForForecast = actual ?? 0;
    } else {
      // Use plan total if no actual data
      valueForForecast = planSum;
    }
    forecastTotal += valueForForecast;
  }

  // Update forecast total display
  forecastTotalSpan.textContent = String(forecastTotal);
  weeklyPlanTotalSpan.textContent = String(weeklyPlanTotal);

  if (targetElevation !== null && targetElevation > 0) {
    const diff = forecastTotal - targetElevation;
    const sign = diff >= 0 ? '+' : '';
    const percentage = Math.round((forecastTotal / targetElevation) * 100);
    forecastDiffSpan.textContent = `(目標比: ${sign}${diff}m / ${percentage}%)`;
  } else {
    forecastDiffSpan.textContent = '';
  }
}

// ============================================================
// Data Saving
// ============================================================

/**
 * Save daily plan values
 * @param dateStr - Date in YYYY-MM-DD format
 * @param part - Part identifier ('part1' or 'part2')
 * @param value - Input value (string)
 */
async function saveDailyPlan(
  dateStr: string,
  part: 'part1' | 'part2',
  value: string
): Promise<void> {
  try {
    const numValue = value === '' ? null : Number(value);

    // Input validation
    if (numValue !== null && (isNaN(numValue) || numValue < 0)) {
      console.error('Invalid plan value:', value);
      return;
    }

    const existing = await getDayLog(dateStr);
    const weekInfo = getISOWeekInfo(parseDateLocal(dateStr));

    const record: DayLog = {
      date: dateStr,
      elevation_part1: existing?.elevation_part1 ?? null,
      elevation_part2: existing?.elevation_part2 ?? null,
      elevation_total: existing?.elevation_total ?? null,
      subjective_condition: existing?.subjective_condition ?? null,

      daily_plan_part1:
        part === 'part1' ? numValue : (existing?.daily_plan_part1 ?? null),
      daily_plan_part2:
        part === 'part2' ? numValue : (existing?.daily_plan_part2 ?? null),

      iso_year: weekInfo.iso_year,
      week_number: weekInfo.week_number,
      timezone: 'Asia/Tokyo',
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveDayLogWithBackup(record);

    const targetVal =
      targetInput.value === '' ? null : Number(targetInput.value);

    // Update schedule values for currently displayed week
    const currentWeekInfo = getISOWeekInfo(currentDate);
    await updateScheduleValues(currentWeekInfo, targetVal);
  } catch (error) {
    console.error('Error saving daily plan:', error);
    // Display user-friendly error message when save fails
    alert(
      'デイリープランの保存に失敗しました。\nネットワーク接続を確認してください。\n\nFailed to save daily plan. Please check your network connection.'
    );
  }
}

/**
 * Save weekly target
 */
async function saveTarget(): Promise<void> {
  try {
    const weekInfo = getISOWeekInfo(currentDate);
    const targetKey = formatISOWeekKey(weekInfo.iso_year, weekInfo.week_number);

    const targetValue =
      targetInput.value === '' ? null : Number(targetInput.value);

    // Input validation
    if (targetValue !== null && (isNaN(targetValue) || targetValue < 0)) {
      console.error('Invalid target value:', targetInput.value);
      return;
    }

    const existing = await getWeekTarget(targetKey);

    const record: WeekTarget = {
      key: targetKey,
      iso_year: weekInfo.iso_year,
      week_number: weekInfo.week_number,
      start_date: weekInfo.start_date,
      end_date: weekInfo.end_date,
      target_elevation: targetValue,
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveWeekTargetWithBackup(record);
    await loadData();
  } catch (error) {
    console.error('Error saving week target:', error);
    // Display user-friendly error message when save fails
    alert(
      '週間目標の保存に失敗しました。\nネットワーク接続を確認してください。\n\nFailed to save week target. Please check your network connection.'
    );
  }
}

/**
 * Apply a preset target value
 * @param value - Preset value to apply
 */
function applyPreset(value: number): void {
  targetInput.value = String(value);
  saveTarget();
}

// ============================================================
// Navigation
// ============================================================

/**
 * Change displayed week
 * @param offset - Number of weeks to move (positive or negative)
 */
async function changeWeek(offset: number): Promise<void> {
  try {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + offset * 7);
    currentDate = next;
    await loadData();
  } catch (error) {
    console.error('Error changing week:', error);
  }
}

/**
 * Set week by ISO year and week number
 * @param isoYear - ISO year
 * @param weekNumber - ISO week number
 */
async function setWeekByISO(
  isoYear: number,
  weekNumber: number
): Promise<void> {
  // Calculate Monday of the specified ISO week
  const jan4 = new Date(isoYear, 0, 4);
  const jan4DayNum = (jan4.getDay() + 6) % 7; // 0=Mon..6=Sun
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - jan4DayNum);

  const targetDate = new Date(mondayOfWeek1);
  targetDate.setDate(mondayOfWeek1.getDate() + (weekNumber - 1) * 7);

  currentDate = targetDate;
  await loadData();
}

// Export to global scope for external access (e.g., export-image.ts)
window.setWeekByISO = setWeekByISO;

// ============================================================
// Event Listeners
// ============================================================

targetInput.addEventListener('blur', saveTarget);

for (const btn of presetButtons) {
  btn.addEventListener('click', () => {
    const value = Number(btn.dataset.value);
    if (!Number.isNaN(value)) {
      applyPreset(value);
    }
  });
}

prevWeekBtn.addEventListener('click', () => changeWeek(-1));
nextWeekBtn.addEventListener('click', () => changeWeek(1));

// ============================================================
// Initial Load
// ============================================================

(function initialLoad() {
  const saved = getSelectedWeek();

  if (saved) {
    const m = saved.match(/(\d{4})-W(\d{2})/i);
    if (m) {
      const isoYear = Number(m[1]);
      const weekNumber = Number(m[2]);
      // Use setWeekByISO to load the saved week
      setWeekByISO(isoYear, weekNumber).catch((e) => {
        console.warn('setWeekByISO failed, falling back to loadData', e);
        loadData();
      });
      return;
    }
  }

  // Fallback to loading current date
  loadData();
})();
