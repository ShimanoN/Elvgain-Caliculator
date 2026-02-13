/**
 * Main application logic for daily elevation tracking page (index.html)
 * Handles daily input, weekly progress display, and chart rendering
 */

import { initFirebase } from './firebase-config.js';
import { getDayLog, getDayLogsByWeek, getWeekTarget } from './db.js';
import type { DayLog } from './db.js';
import { getISOWeekInfo } from './iso-week.js';
import { calculateWeekTotal } from './calculations.js';
import { formatDateLocal, parseDateLocal } from './date-utils.js';
import {
  formatISOWeekKey,
  formatDateRangeDisplay,
  getJPDayName,
} from './formatters.js';
import { DAY_LABELS_CHART, MAX_DAYS_HISTORY } from './constants.js';
import { drawWeeklyChart } from './chart.js';
import type { ChartDayData } from './chart.js';
// Import side effects for backup and export functionality
import { saveDayLogWithBackup } from './backup.js';
import { setSelectedWeek } from './storage.js';
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

const dateInput = document.getElementById('current-date') as HTMLInputElement;
const part1Input = document.getElementById('part1') as HTMLInputElement;
const part2Input = document.getElementById('part2') as HTMLInputElement;
const dailyTotalSpan = document.getElementById(
  'daily-total'
) as HTMLSpanElement;
const conditionRadios = document.getElementsByName(
  'condition'
) as NodeListOf<HTMLInputElement>;
const weekRangeSpan = document.getElementById('week-range') as HTMLSpanElement;
const weekTargetSpan = document.getElementById(
  'weekly-target'
) as HTMLSpanElement;
const weekCurrentSpan = document.getElementById(
  'weekly-total'
) as HTMLSpanElement;
const weekProgressSpan = document.getElementById(
  'weekly-progress'
) as HTMLSpanElement;
const weekRemainingSpan = document.getElementById(
  'weekly-remaining'
) as HTMLSpanElement;
const weekProgressBar = document.getElementById(
  'weekly-progress-bar'
) as HTMLElement;
const condGoodCount = document.getElementById(
  'cond-good-count'
) as HTMLSpanElement;
const condNormalCount = document.getElementById(
  'cond-normal-count'
) as HTMLSpanElement;
const condBadCount = document.getElementById(
  'cond-bad-count'
) as HTMLSpanElement;
const conditionStrip = document.getElementById(
  'condition-strip'
) as HTMLElement;
const prevWeekBtn = document.getElementById('prev-week') as HTMLButtonElement;
const nextWeekBtn = document.getElementById('next-week') as HTMLButtonElement;
const prevDayBtn = document.getElementById('prev-day') as HTMLButtonElement;
const nextDayBtn = document.getElementById('next-day') as HTMLButtonElement;

// ============================================================
// Application State
// ============================================================

let weekBaseDate = new Date();

// Set initial date to today (local time)
const TODAY_STR = formatDateLocal(new Date());
dateInput.value = TODAY_STR;

// ============================================================
// Navigation Functions
// ============================================================

/**
 * Update navigation button states based on 30-day history limit
 */
function updateNavButtons(): void {
  const current = parseDateLocal(dateInput.value);
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - MAX_DAYS_HISTORY);

  // Disable previous day button if at limit
  if (current <= minDate) {
    prevDayBtn.disabled = true;
  } else {
    prevDayBtn.disabled = false;
  }
}

// ============================================================
// Data Loading and Saving
// ============================================================

/**
 * Load data for the current date and update UI
 */
async function loadData(): Promise<void> {
  try {
    const date = dateInput.value;
    const log = await getDayLog(date);

    if (log) {
      part1Input.value =
        log.elevation_part1 !== null ? String(log.elevation_part1) : '';
      part2Input.value =
        log.elevation_part2 !== null ? String(log.elevation_part2) : '';
      dailyTotalSpan.textContent = String(log.elevation_total || 0);

      for (const radio of conditionRadios) {
        radio.checked = log.subjective_condition === radio.value;
      }
    } else {
      part1Input.value = '';
      part2Input.value = '';
      dailyTotalSpan.textContent = '0';
      for (const radio of conditionRadios) {
        radio.checked = false;
      }
    }

    await updateWeekProgress();
    updateNavButtons();
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

/**
 * Save current input data to database
 */
async function saveData(): Promise<void> {
  try {
    const date = dateInput.value;
    const part1Value = part1Input.value;
    const part2Value = part2Input.value;

    // Input validation
    const part1 = part1Value === '' ? null : Number(part1Value);
    const part2 = part2Value === '' ? null : Number(part2Value);

    if (part1 !== null && (isNaN(part1) || part1 < 0)) {
      console.error('Invalid value for part1:', part1Value);
      return;
    }
    if (part2 !== null && (isNaN(part2) || part2 < 0)) {
      console.error('Invalid value for part2:', part2Value);
      return;
    }

    let condition: 'good' | 'normal' | 'bad' | null = null;
    for (const radio of conditionRadios) {
      if (radio.checked) {
        condition = radio.value as 'good' | 'normal' | 'bad';
        break;
      }
    }

    const existing = await getDayLog(date);
    const weekInfo = getISOWeekInfo(parseDateLocal(date));
    const total = (part1 ?? 0) + (part2 ?? 0);

    const record: DayLog = {
      date: date,
      elevation_part1: part1,
      elevation_part2: part2,
      elevation_total: total,
      subjective_condition: condition,
      daily_plan_part1: existing?.daily_plan_part1 ?? null,
      daily_plan_part2: existing?.daily_plan_part2 ?? null,
      iso_year: weekInfo.iso_year,
      week_number: weekInfo.week_number,
      timezone: 'Asia/Tokyo',
      created_at: existing?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await saveDayLogWithBackup(record);
    dailyTotalSpan.textContent = String(total);
    await updateWeekProgress();
  } catch (error) {
    console.error('Error saving data:', error);
  }
}

/**
 * Change date by offset
 * @param offset - Number of days to move (positive or negative)
 */
async function changeDate(offset: number): Promise<void> {
  const current = parseDateLocal(dateInput.value);
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - MAX_DAYS_HISTORY);

  if (offset < 0 && current <= minDate) {
    updateNavButtons();
    return; // 30-day limit reached
  }
  current.setDate(current.getDate() + offset);

  const nextDateStr = formatDateLocal(current);

  // Update date input
  dateInput.value = nextDateStr;
  weekBaseDate = parseDateLocal(nextDateStr);

  // Reload data
  await loadData();

  // Update navigation buttons
  updateNavButtons();
}

// ============================================================
// Week Progress Display
// ============================================================

/**
 * Update weekly progress display and chart
 * @param dateOverride - Optional date to use instead of current input
 */
async function updateWeekProgress(dateOverride?: Date): Promise<void> {
  const baseDate = dateOverride || parseDateLocal(dateInput.value);
  const weekInfo = getISOWeekInfo(baseDate);

  // Update week range display
  if (weekRangeSpan) {
    weekRangeSpan.textContent = formatDateRangeDisplay(
      weekInfo.start_date,
      weekInfo.end_date
    );
  }

  const targetKey = formatISOWeekKey(weekInfo.iso_year, weekInfo.week_number);

  // Save selected week for sync with other pages
  setSelectedWeek(targetKey);

  const targetRecord = await getWeekTarget(targetKey);
  const currentTotal = await calculateWeekTotal(
    weekInfo.iso_year,
    weekInfo.week_number
  );

  weekCurrentSpan.textContent = String(currentTotal);

  // Display target progress
  const weekTargetValue = targetRecord?.target_elevation || 0;
  weekTargetSpan.textContent =
    weekTargetValue > 0 ? `${weekTargetValue}` : '---';

  if (weekTargetValue > 0) {
    const progress = Math.min(
      100,
      Math.round((currentTotal / weekTargetValue) * 100)
    );
    weekProgressSpan.textContent = `${progress}%`;
    if (weekProgressBar) {
      weekProgressBar.style.width = `${progress}%`;
    }

    const remaining = Math.max(0, weekTargetValue - currentTotal);
    weekRemainingSpan.textContent = String(remaining);
  } else {
    weekProgressSpan.textContent = '---%';
    weekRemainingSpan.textContent = '---';
    if (weekProgressBar) {
      weekProgressBar.style.width = '0%';
    }
  }

  // Draw chart
  try {
    // Get all data for the week
    const logs = await getDayLogsByWeek(
      weekInfo.iso_year,
      weekInfo.week_number
    );
    const weekLogs = Array.isArray(logs) ? logs : [];

    const conditionStats = {
      good: { count: 0, total: 0 },
      normal: { count: 0, total: 0 },
      bad: { count: 0, total: 0 },
    };

    for (const log of weekLogs) {
      if (!log || !log.subjective_condition) continue;
      const key = log.subjective_condition;
      if (!conditionStats[key]) continue;
      if (log.elevation_total === null || log.elevation_total === undefined)
        continue;
      conditionStats[key].count += 1;
      conditionStats[key].total += log.elevation_total;
    }

    const chartData: ChartDayData[] = [];
    const [sy, sm, sd] = weekInfo.start_date.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);

    const dayLabels = DAY_LABELS_CHART;

    if (conditionStrip) {
      conditionStrip.innerHTML = '';
    }

    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = formatDateLocal(d);
      const dayName = getJPDayName(d.getDay());

      // Find log for this date
      const log = weekLogs.find((l) => l.date === dateStr);

      chartData.push({
        date: dateStr,
        dayName: dayName,
        plan: (log?.daily_plan_part1 || 0) + (log?.daily_plan_part2 || 0),
        actual: log?.elevation_total ?? null,
      });

      if (conditionStrip) {
        const label = dayLabels[i];
        const segment = document.createElement('div');
        segment.className = 'condition-segment';
        segment.setAttribute('data-day', label);
        const condition = log?.subjective_condition ?? null;
        if (condition === 'good') segment.classList.add('condition-good');
        else if (condition === 'normal')
          segment.classList.add('condition-normal');
        else if (condition === 'bad') segment.classList.add('condition-bad');
        else segment.classList.add('condition-empty');
        conditionStrip.appendChild(segment);
      }
    }

    drawWeeklyChart('weeklyCheckChart', chartData, weekTargetValue);

    if (condGoodCount && condNormalCount && condBadCount) {
      condGoodCount.textContent = String(conditionStats.good.count);
      condNormalCount.textContent = String(conditionStats.normal.count);
      condBadCount.textContent = String(conditionStats.bad.count);
    }
  } catch (e) {
    console.error('Error drawing chart:', e);
  }
}

/**
 * Change week display by offset
 * @param offset - Number of weeks to move (positive or negative)
 */
function changeWeek(offset: number): void {
  const next = new Date(weekBaseDate);
  next.setDate(next.getDate() + offset * 7);
  weekBaseDate = next;
  updateWeekProgress(weekBaseDate);
}

// ============================================================
// Event Listeners
// ============================================================

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
  // Date changed via input
  weekBaseDate = parseDateLocal(dateInput.value);
  await loadData();
});

// ============================================================
// Initial Load
// ============================================================

weekBaseDate = parseDateLocal(dateInput.value);
loadData();
