/**
 * Weekly chart rendering on HTML Canvas
 * Draws dual-axis chart with daily bars and cumulative lines
 */

import {
  CHART_PADDING,
  Y_AXIS_CONFIG,
  CHART_GRID_LINES,
  CHART_BAR_WIDTH_RATIO,
  DAY_NAME_JP_TO_EN,
} from './constants.js';

// ============================================================
// Type Definitions
// ============================================================

/**
 * Chart data for a single day
 */
export interface ChartDayData {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Japanese day name */
  dayName: string;
  /** Planned elevation for the day */
  plan: number;
  /** Actual elevation (null if not yet recorded) */
  actual: number | null;
}

/**
 * Internal chart data with cumulative values
 */
interface ChartDataInternal extends ChartDayData {
  /** Day index in week (0-6) */
  index: number;
  /** Cumulative planned elevation */
  cumPlan: number;
  /** Cumulative actual elevation (null if day not recorded) */
  cumActual: number | null;
}

/**
 * Canvas setup result
 */
interface CanvasSetup {
  /** Canvas rendering context */
  ctx: CanvasRenderingContext2D;
  /** Canvas logical width */
  width: number;
  /** Canvas logical height */
  height: number;
}

/**
 * Color palette for chart rendering
 */
interface ChartPalette {
  backgroundTop: string;
  backgroundBottom: string;
  grid: string;
  axis: string;
  text: string;
  textMuted: string;
  planFill: string;
  planStroke: string;
  actualFill: string;
  actualStroke: string;
  planLine: string;
  actualLine: string;
  targetLine: string;
}

/**
 * Legend item configuration
 */
interface LegendItem {
  label: string;
  type: 'bar' | 'line';
  fill?: string;
  stroke?: string;
  color?: string;
  dashed?: boolean;
}

// ============================================================
// Main Chart Drawing Function
// ============================================================

/**
 * Draw weekly chart on canvas
 * @param canvasId - Canvas element ID
 * @param weekData - Array of 7 days of chart data
 * @param weekTarget - Weekly target value (optional)
 */
export function drawWeeklyChart(
  canvasId: string,
  weekData: ChartDayData[],
  weekTarget?: number | null
): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas element not found:', canvasId);
    return;
  }

  // Validate input data
  if (!Array.isArray(weekData)) {
    console.error('Invalid weekData: expected array');
    return;
  }

  const { ctx, width, height } = setupCanvas(canvas);
  const palette = getPalette();
  const fontFamily =
    "'Avenir Next', 'Avenir', 'Futura', 'Gill Sans', 'Trebuchet MS', sans-serif";

  const padding = CHART_PADDING;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  let cumulativePlan = 0;
  let cumulativeActual = 0;
  const data: ChartDataInternal[] = weekData.map((d, index) => {
    const plan = d.plan || 0;
    cumulativePlan += plan;
    if (d.actual !== null) {
      cumulativeActual += d.actual || 0;
    }
    return {
      ...d,
      index,
      plan,
      actual: d.actual,
      cumPlan: cumulativePlan,
      cumActual: d.actual !== null ? cumulativeActual : null,
    };
  });

  const maxDaily = Math.max(
    0,
    ...data.map((d) => Math.max(d.plan, d.actual || 0))
  );
  const maxCumulative = Math.max(
    0,
    cumulativePlan,
    cumulativeActual,
    weekTarget || 0
  );

  const yMaxLeft = Math.max(
    Y_AXIS_CONFIG.dailyMinValue,
    roundTo(
      maxDaily * Y_AXIS_CONFIG.dailyScaleFactor,
      Y_AXIS_CONFIG.dailyRoundTo
    )
  );
  const yMaxRight = Math.max(
    Y_AXIS_CONFIG.cumulativeMinValue,
    roundTo(
      maxCumulative * Y_AXIS_CONFIG.cumulativeScaleFactor,
      Y_AXIS_CONFIG.cumulativeRoundTo
    )
  );

  drawBackground(ctx, width, height, palette);
  drawAxes(ctx, width, height, padding, palette);
  drawGrid(ctx, width, height, padding, chartHeight, CHART_GRID_LINES, palette);

  // Draw Y-axis labels (left side - daily)
  ctx.fillStyle = palette.text;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `12px ${fontFamily}`;

  for (let i = 0; i <= 4; i++) {
    const yVal = Math.round(yMaxLeft * (i / 4));
    const yPos = height - padding.bottom - chartHeight * (i / 4);
    ctx.fillText(formatNumber(yVal), padding.left - 10, yPos);
  }

  // Draw Y-axis labels (right side - cumulative)
  ctx.textAlign = 'left';
  for (let i = 0; i <= 4; i++) {
    const yVal = Math.round(yMaxRight * (i / 4));
    const yPos = height - padding.bottom - chartHeight * (i / 4);
    ctx.fillText(formatNumber(yVal), width - padding.right + 6, yPos);
  }

  // Draw Y-axis titles
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.textMuted;
  ctx.font = `600 12px ${fontFamily}`;
  ctx.translate(padding.left - 44, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Daily Elevation (m)', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.textMuted;
  ctx.font = `600 12px ${fontFamily}`;
  ctx.translate(width - padding.right + 52, height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('Cumulative (m)', 0, 0);
  ctx.restore();

  // Calculate bar dimensions
  const categoryWidth = chartWidth / 7;
  const barWidth = categoryWidth * CHART_BAR_WIDTH_RATIO;

  // Draw bars and labels for each day
  data.forEach((d) => {
    const xCenter = padding.left + categoryWidth * d.index + categoryWidth / 2;
    const baseY = height - padding.bottom;

    // Draw plan bar (left side)
    if (d.plan > 0) {
      const barHeight = (d.plan / yMaxLeft) * chartHeight;
      drawRoundedRect(
        ctx,
        xCenter - barWidth - 2,
        baseY - barHeight,
        barWidth,
        barHeight,
        6,
        palette.planFill,
        palette.planStroke
      );
    }

    // Draw actual bar (right side)
    if (d.actual !== null && d.actual > 0) {
      const barHeight = (d.actual / yMaxLeft) * chartHeight;
      drawRoundedRect(
        ctx,
        xCenter + 2,
        baseY - barHeight,
        barWidth,
        barHeight,
        6,
        palette.actualFill,
        palette.actualStroke
      );
    }

    // Draw day name label
    const dayEn = DAY_NAME_JP_TO_EN[d.dayName];
    if (!dayEn) {
      console.warn('Unexpected day name:', d.dayName);
    }
    ctx.fillStyle = palette.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = `600 12px ${fontFamily}`;
    ctx.fillText(
      dayEn || d.dayName || '',
      xCenter,
      height - padding.bottom + 10
    );

    // Draw date label
    const dateLabel = formatDateLabel(d.date);
    ctx.fillStyle = palette.textMuted;
    ctx.font = `11px ${fontFamily}`;
    ctx.fillText(dateLabel, xCenter, height - padding.bottom + 26);
  });

  // Draw cumulative lines
  drawCumulativeLine(
    ctx,
    data,
    padding,
    chartHeight,
    width,
    height,
    categoryWidth,
    yMaxRight,
    'cumPlan',
    palette.planLine,
    true
  );
  drawCumulativeLine(
    ctx,
    data.filter((d) => d.cumActual !== null),
    padding,
    chartHeight,
    width,
    height,
    categoryWidth,
    yMaxRight,
    'cumActual',
    palette.actualLine,
    false
  );

  // Draw target line
  if (weekTarget) {
    const yPosTarget =
      height - padding.bottom - (weekTarget / yMaxRight) * chartHeight;
    if (yPosTarget >= padding.top) {
      ctx.beginPath();
      ctx.strokeStyle = palette.targetLine;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.moveTo(padding.left, yPosTarget);
      ctx.lineTo(width - padding.right, yPosTarget);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawLegend(ctx, width, padding, palette, fontFamily);

  // Notify listeners (tests) that the chart has been drawn
  try {
    const ev = new CustomEvent('chart:drawn', { detail: { canvasId } });
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(ev);
    }
  } catch (_e) {
    /* ignore event errors */
  }
}

// ============================================================
// Canvas Setup
// ============================================================

/**
 * Set up canvas for high-DPI rendering
 * @param canvas - Canvas element to configure
 * @returns Canvas context and dimensions
 */
function setupCanvas(canvas: HTMLCanvasElement): CanvasSetup {
  const ctx = canvas.getContext('2d')!;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

/**
 * Get the color palette for chart rendering
 * @returns Color palette object
 */
function getPalette(): ChartPalette {
  return {
    backgroundTop: '#f6f4ef',
    backgroundBottom: '#ffffff',
    grid: '#ece8df',
    axis: '#cfc7ba',
    text: '#1f1e1b',
    textMuted: '#6f6a60',
    planFill: '#e6e1d7',
    planStroke: '#cdbfae',
    actualFill: '#1f1e1b',
    actualStroke: '#1f1e1b',
    planLine: '#4c8f8a',
    actualLine: '#1f1e1b',
    targetLine: '#a07b3b',
  };
}

// ============================================================
// Drawing Primitives
// ============================================================

/**
 * Draw gradient background on canvas
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param palette - Color palette
 */
function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: ChartPalette
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palette.backgroundTop);
  gradient.addColorStop(1, palette.backgroundBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Draw chart axes (bottom, left, right)
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param padding - Chart padding configuration
 * @param palette - Color palette
 */
function drawAxes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: typeof CHART_PADDING,
  palette: ChartPalette
): void {
  ctx.beginPath();
  ctx.strokeStyle = palette.axis;
  ctx.lineWidth = 1;
  ctx.moveTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.moveTo(width - padding.right, padding.top);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();
}

/**
 * Draw horizontal grid lines
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param height - Canvas height
 * @param padding - Chart padding configuration
 * @param chartHeight - Drawable chart height
 * @param steps - Number of grid lines
 * @param palette - Color palette
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  padding: typeof CHART_PADDING,
  chartHeight: number,
  steps: number,
  palette: ChartPalette
): void {
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  for (let i = 1; i <= steps; i++) {
    const yPos = height - padding.bottom - chartHeight * (i / steps);
    ctx.beginPath();
    ctx.moveTo(padding.left, yPos);
    ctx.lineTo(width - padding.right, yPos);
    ctx.stroke();
  }
}

/**
 * Draw a rectangle with rounded top corners
 * @param ctx - Canvas context
 * @param x - X position
 * @param y - Y position
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @param radius - Corner radius
 * @param fill - Fill color
 * @param stroke - Stroke color (optional)
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke?: string
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/**
 * Draw cumulative line on the chart
 * @param ctx - Canvas context
 * @param data - Data points to draw
 * @param padding - Chart padding configuration
 * @param chartHeight - Drawable chart height
 * @param width - Canvas width
 * @param height - Canvas height
 * @param categoryWidth - Width per day category
 * @param yMaxRight - Maximum value for right Y-axis
 * @param valueKey - Key to read cumulative value from data
 * @param color - Line color
 * @param dashed - Whether line should be dashed
 */
function drawCumulativeLine(
  ctx: CanvasRenderingContext2D,
  data: ChartDataInternal[],
  padding: typeof CHART_PADDING,
  chartHeight: number,
  _width: number,
  height: number,
  categoryWidth: number,
  yMaxRight: number,
  valueKey: 'cumPlan' | 'cumActual',
  color: string,
  dashed: boolean
): void {
  if (!data.length) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (dashed) ctx.setLineDash([6, 6]);

  data.forEach((d, i) => {
    const xCenter = padding.left + categoryWidth * d.index + categoryWidth / 2;
    const value = d[valueKey] || 0;
    const yPos = height - padding.bottom - (value / yMaxRight) * chartHeight;
    if (i === 0) ctx.moveTo(xCenter, yPos);
    else ctx.lineTo(xCenter, yPos);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  if (!dashed) {
    data.forEach((d) => {
      const xCenter =
        padding.left + categoryWidth * d.index + categoryWidth / 2;
      const value = d[valueKey] || 0;
      const yPos = height - padding.bottom - (value / yMaxRight) * chartHeight;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(xCenter, yPos, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/**
 * Draw chart legend
 * @param ctx - Canvas context
 * @param width - Canvas width
 * @param padding - Chart padding configuration
 * @param palette - Color palette
 * @param fontFamily - Font family string
 */
function drawLegend(
  ctx: CanvasRenderingContext2D,
  width: number,
  padding: typeof CHART_PADDING,
  palette: ChartPalette,
  fontFamily: string
): void {
  const legendTop = 18;
  const items: LegendItem[] = [
    {
      label: 'Plan (Daily)',
      type: 'bar',
      fill: palette.planFill,
      stroke: palette.planStroke,
    },
    {
      label: 'Actual (Daily)',
      type: 'bar',
      fill: palette.actualFill,
      stroke: palette.actualStroke,
    },
    {
      label: 'Plan (Cum)',
      type: 'line',
      color: palette.planLine,
      dashed: true,
    },
    {
      label: 'Actual (Cum)',
      type: 'line',
      color: palette.actualLine,
      dashed: false,
    },
    { label: 'Target', type: 'line', color: palette.targetLine, dashed: true },
  ];

  ctx.font = `12px ${fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = palette.text;

  const totalWidth = items.length * 120 - 10;
  let lx = width - padding.right - totalWidth;
  if (lx < padding.left) {
    lx = padding.left;
  }
  items.forEach((item) => {
    if (item.type === 'bar') {
      drawRoundedRect(
        ctx,
        lx,
        legendTop - 6,
        16,
        12,
        3,
        item.fill!,
        item.stroke
      );
    } else {
      ctx.beginPath();
      ctx.strokeStyle = item.color!;
      ctx.lineWidth = 2.5;
      if (item.dashed) ctx.setLineDash([6, 6]);
      ctx.moveTo(lx, legendTop);
      ctx.lineTo(lx + 16, legendTop);
      ctx.stroke();
      ctx.setLineDash([]);
      if (!item.dashed) {
        ctx.fillStyle = item.color!;
        ctx.beginPath();
        ctx.arc(lx + 8, legendTop, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = palette.text;
    ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 22, legendTop);
    lx += 120;
  });
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Round a value up to the nearest step
 * @param value - Value to round
 * @param step - Step size
 * @returns Rounded value
 */
function roundTo(value: number, step: number): number {
  if (value <= 0) return step;
  return Math.ceil(value / step) * step;
}

/**
 * Format a number with locale-appropriate separators
 * @param value - Number to format
 * @returns Formatted number string
 */
function formatNumber(value: number): string {
  return Number(value).toLocaleString('en-US');
}

/**
 * Format date string for chart label display
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date label (MM/DD)
 */
function formatDateLabel(dateString: string): string {
  if (!dateString || typeof dateString !== 'string') {
    console.warn('Invalid date string for label:', dateString);
    return '';
  }
  return dateString.split('-').slice(1).join('/');
}
