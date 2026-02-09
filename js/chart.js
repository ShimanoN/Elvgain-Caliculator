function drawWeeklyChart(canvasId, weekData, weekTarget) {
  const canvas = document.getElementById(canvasId);
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

  const padding = { top: 48, right: 64, bottom: 56, left: 64 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  let cumulativePlan = 0;
  let cumulativeActual = 0;
  const data = weekData.map((d, index) => {
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

  const yMaxLeft = Math.max(200, roundTo(maxDaily * 1.2, 100));
  const yMaxRight = Math.max(1000, roundTo(maxCumulative * 1.1, 200));

  drawBackground(ctx, width, height, palette);
  drawAxes(ctx, width, height, padding, palette);
  drawGrid(ctx, width, height, padding, chartHeight, 4, palette);

  ctx.fillStyle = palette.text;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `12px ${fontFamily}`;

  for (let i = 0; i <= 4; i++) {
    const yVal = Math.round(yMaxLeft * (i / 4));
    const yPos = height - padding.bottom - chartHeight * (i / 4);
    ctx.fillText(formatNumber(yVal), padding.left - 10, yPos);
  }

  ctx.textAlign = 'left';
  for (let i = 0; i <= 4; i++) {
    const yVal = Math.round(yMaxRight * (i / 4));
    const yPos = height - padding.bottom - chartHeight * (i / 4);
    ctx.fillText(formatNumber(yVal), width - padding.right + 6, yPos);
  }

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

  const categoryWidth = chartWidth / 7;
  const barWidth = categoryWidth * 0.32;

  data.forEach((d, i) => {
    const xCenter = padding.left + categoryWidth * i + categoryWidth / 2;
    const baseY = height - padding.bottom;

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

    const dayMap = {
      日: 'Sun',
      月: 'Mon',
      火: 'Tue',
      水: 'Wed',
      木: 'Thu',
      金: 'Fri',
      土: 'Sat',
    };
    const dayEn = dayMap[d.dayName];
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

    // Format date for display using helper function
    const dateLabel = formatDateLabel(d.date);
    ctx.fillStyle = palette.textMuted;
    ctx.font = `11px ${fontFamily}`;
    ctx.fillText(dateLabel, xCenter, height - padding.bottom + 26);
  });

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
}

function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

function getPalette() {
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

function drawBackground(ctx, width, height, palette) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, palette.backgroundTop);
  gradient.addColorStop(1, palette.backgroundBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawAxes(ctx, width, height, padding, palette) {
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

function drawGrid(ctx, width, height, padding, chartHeight, steps, palette) {
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

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
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

function drawCumulativeLine(
  ctx,
  data,
  padding,
  chartHeight,
  width,
  height,
  categoryWidth,
  yMaxRight,
  valueKey,
  color,
  dashed
) {
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

function drawLegend(ctx, width, padding, palette, fontFamily) {
  const legendTop = 18;
  const items = [
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
        item.fill,
        item.stroke
      );
    } else {
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2.5;
      if (item.dashed) ctx.setLineDash([6, 6]);
      ctx.moveTo(lx, legendTop);
      ctx.lineTo(lx + 16, legendTop);
      ctx.stroke();
      ctx.setLineDash([]);
      if (!item.dashed) {
        ctx.fillStyle = item.color;
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

function roundTo(value, step) {
  if (value <= 0) return step;
  return Math.ceil(value / step) * step;
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-US');
}

/**
 * Format date string for chart label display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date label (MM/DD)
 */
function formatDateLabel(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    console.warn('Invalid date string for label:', dateString);
    return '';
  }
  return dateString.split('-').slice(1).join('/');
}
