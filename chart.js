/**
 * 週次進捗グラフを描画する
 * @param {string} canvasId 
 * @param {Array} weekData Array of { date: string, dayName: string, plan: number, actual: number }
 * @param {number|null} weekTarget 
 */
function drawWeeklyChart(canvasId, weekData, weekTarget) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // パディング（余白）
    const padding = { top: 40, right: 40, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // データ準備（累積値計算）
    let cumulativePlan = 0;
    let cumulativeActual = 0;
    const data = weekData.map(d => {
        const p = d.plan || 0;
        const a = d.actual || 0; // nullは0扱い
        cumulativePlan += p;
        if (d.actual !== null) {
            cumulativeActual += a;
        }
        return {
            ...d,
            plan: p,
            actual: d.actual, // null保持
            cumPlan: cumulativePlan,
            cumActual: d.actual !== null ? cumulativeActual : null
        };
    });

    // スケール計算（最大値を求める）
    const maxDaily = Math.max(
        ...data.map(d => d.plan),
        ...data.map(d => d.actual || 0)
    );
    const maxCumulative = Math.max(
        cumulativePlan,
        cumulativeActual,
        weekTarget || 0
    );

    // Y軸（左）：日次値用、Y軸（右）：累積値用 と分けるのが一般的だが、
    // ここではシンプルに「累積値」に合わせてスケールする（日次バーは小さくなるが対比は可能）
    // もしくは、2軸にするか。
    // 「累積プロットも必要」という要望なので、同じY軸で累積を表示すると日次バーが小さくなりすぎる可能性がある。
    // 今回は「2軸（左：日次、右：累積）」で実装する。

    // Y軸最大値（少し余裕を持たせる）
    const yMaxLeft = Math.ceil(maxDaily * 1.2) || 1000;
    const yMaxRight = Math.ceil(maxCumulative * 1.1) || 5000;

    // クリア
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // 軸描画
    ctx.beginPath();
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;

    // X軸
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);

    // Y軸（左）
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);

    // Y軸（右）
    ctx.moveTo(width - padding.right, padding.top);
    ctx.lineTo(width - padding.right, height - padding.bottom);

    ctx.stroke();

    // 目盛りとラベル（左Y軸 - 日次）
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = '12px sans-serif';

    for (let i = 0; i <= 5; i++) {
        const yVal = Math.round(yMaxLeft * (i / 5));
        const yPos = height - padding.bottom - (chartHeight * (i / 5));

        ctx.fillText(yVal, padding.left - 10, yPos);

        // グリッド線（薄く）
        if (i > 0) {
            ctx.beginPath();
            ctx.strokeStyle = '#eeeeee';
            ctx.moveTo(padding.left, yPos);
            ctx.lineTo(width - padding.right, yPos);
            ctx.stroke();
        }
    }

    // 目盛りとラベル（右Y軸 - 累積）
    ctx.textAlign = 'left';
    for (let i = 0; i <= 5; i++) {
        const yVal = Math.round(yMaxRight * (i / 5));
        const yPos = height - padding.bottom - (chartHeight * (i / 5));

        ctx.fillText(yVal, width - padding.right + 10, yPos);
    }

    // 軸タイトル
    ctx.save();
    ctx.textAlign = 'center';

    // 左
    ctx.translate(padding.left - 40, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('日次獲得標高 (m)', 0, 0);
    ctx.restore();

    // 右
    ctx.save();
    ctx.translate(width - padding.right + 45, height / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('累積獲得標高 (m)', 0, 0);
    ctx.restore();


    // グラフ描画
    const barWidth = (chartWidth / 7) * 0.3;
    const categoryWidth = chartWidth / 7;

    data.forEach((d, i) => {
        const xCenter = padding.left + (categoryWidth * i) + (categoryWidth / 2);

        // --- 棒グラフ（日次） 左軸使用 ---

        // 予定（薄いグレー）
        if (d.plan > 0) {
            const barHeight = (d.plan / yMaxLeft) * chartHeight;
            ctx.fillStyle = '#eeeeee';
            ctx.fillRect(xCenter - barWidth, height - padding.bottom - barHeight, barWidth, barHeight);
            ctx.strokeStyle = '#cccccc';
            ctx.strokeRect(xCenter - barWidth, height - padding.bottom - barHeight, barWidth, barHeight);
        }

        // 実績（黒）
        if (d.actual !== null && d.actual > 0) {
            const barHeight = (d.actual / yMaxLeft) * chartHeight;
            ctx.fillStyle = '#000000';
            ctx.fillRect(xCenter, height - padding.bottom - barHeight, barWidth, barHeight);
        }

        // ラベル（日付）
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(d.dayName, xCenter, height - padding.bottom + 10);

        const dateLabel = d.date.split('-').slice(1).join('/'); // MM/DD
        ctx.font = '10px sans-serif';
        ctx.fillText(dateLabel, xCenter, height - padding.bottom + 25);
        ctx.font = '12px sans-serif';
    });

    // --- 折れ線グラフ（累積） 右軸使用 ---

    // 予定累積（点線・グレー）
    ctx.beginPath();
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // 点線

    data.forEach((d, i) => {
        const xCenter = padding.left + (categoryWidth * i) + (categoryWidth / 2);
        const yPos = height - padding.bottom - ((d.cumPlan / yMaxRight) * chartHeight);

        if (i === 0) ctx.moveTo(xCenter, yPos);
        else ctx.lineTo(xCenter, yPos);
    });
    ctx.stroke();
    ctx.setLineDash([]); // 実線に戻す


    // 実績累積（実線・黒）
    // 実績があるところまで描画
    const actualDataPoints = data.filter(d => d.cumActual !== null);
    if (actualDataPoints.length > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        actualDataPoints.forEach((d, i) => {
            // 元データのインデックスを探す（X座標計算のため）
            const originalIndex = data.indexOf(d);
            const xCenter = padding.left + (categoryWidth * originalIndex) + (categoryWidth / 2);
            const yPos = height - padding.bottom - ((d.cumActual / yMaxRight) * chartHeight);

            if (i === 0) ctx.moveTo(xCenter, yPos);
            else ctx.lineTo(xCenter, yPos);

            // ポイント描画
            ctx.fillStyle = '#000000';
            ctx.fillRect(xCenter - 3, yPos - 3, 6, 6);
        });
        ctx.stroke();
    }

    // 週目標ライン（右軸基準）
    if (weekTarget) {
        const yPosTarget = height - padding.bottom - ((weekTarget / yMaxRight) * chartHeight);
        if (yPosTarget >= padding.top) { // 描画範囲内なら
            ctx.beginPath();
            ctx.strokeStyle = '#ff0000'; // 目標だけ赤で見やすく（ミニマリズム的にはグレーだが、目標線は重要）
            // 黒推奨なら #000000 Dash等。ここではわかりやすさ優先で、スタイルガイド違反回避のため濃いグレーにする
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);

            ctx.moveTo(padding.left, yPosTarget);
            ctx.lineTo(width - padding.right, yPosTarget);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#666666';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`Target: ${weekTarget}m`, width - padding.right - 5, yPosTarget - 5);
        }
    }

    // 凡例
    const legendTop = padding.top / 2;
    const legendRight = width - 40;

    // 日次凡例
    ctx.fillStyle = '#eeeeee'; ctx.fillRect(legendRight - 280, legendTop, 15, 10);
    ctx.strokeStyle = '#cccccc'; ctx.strokeRect(legendRight - 280, legendTop, 15, 10);
    ctx.fillStyle = '#000000'; ctx.textAlign = 'left'; ctx.fillText('予定(日)', legendRight - 260, legendTop + 5);

    ctx.fillStyle = '#000000'; ctx.fillRect(legendRight - 200, legendTop, 15, 10);
    ctx.fillStyle = '#000000'; ctx.fillText('実績(日)', legendRight - 180, legendTop + 5);

    // 累積凡例
    ctx.beginPath(); ctx.strokeStyle = '#999999'; ctx.setLineDash([5, 5]);
    ctx.moveTo(legendRight - 120, legendTop + 5); ctx.lineTo(legendRight - 100, legendTop + 5); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#000000'; ctx.fillText('予定(累)', legendRight - 95, legendTop + 5);

    ctx.beginPath(); ctx.strokeStyle = '#000000';
    ctx.moveTo(legendRight - 40, legendTop + 5); ctx.lineTo(legendRight - 20, legendTop + 5); ctx.stroke();
    ctx.fillRect(legendRight - 32, legendTop + 3, 4, 4); // point
    ctx.fillStyle = '#000000'; ctx.fillText('実績(累)', legendRight - 15, legendTop + 5);

}
