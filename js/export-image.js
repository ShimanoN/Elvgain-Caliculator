document.addEventListener('DOMContentLoaded', () => {
    // 支持: data-export-target 属性 または .btn-export-image クラスを持つボタンを検出
    const buttons = Array.from(document.querySelectorAll('.btn-export-image, [data-export-target]'));
    if (!buttons.length) return;

    async function exportElementAsImage(el, filenamePrefix) {
        try {
            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            const dataUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            a.href = dataUrl;
            a.download = `${filenamePrefix}_${ts}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            console.error('Image export failed', err);
            alert('画像出力に失敗しました（コンソールを確認）');
        }
    }

    buttons.forEach((btn) => {
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            const original = btn.textContent;
            btn.textContent = '作成中...';

            // 1) もしボタンが data-get-week-from を持つ場合、そこから週指定を読み取って setWeekByISO を呼ぶ
            let weekSpec = btn.dataset.exportWeek || null;
            const getWeekFrom = btn.dataset.getWeekFrom || null;
            if (!weekSpec && getWeekFrom) {
                const input = document.getElementById(getWeekFrom);
                if (input) {
                    weekSpec = input.value;
                }
            }

            if (weekSpec) {
                // 期待形式: YYYY-Wnn
                const m = weekSpec.match(/(\d{4})-W(\d{2})/i);
                if (m) {
                    const isoYear = Number(m[1]);
                    const weekNumber = Number(m[2]);
                    if (typeof window.setWeekByISO === 'function') {
                        await window.setWeekByISO(isoYear, weekNumber);
                        // setWeekByISO は await 完了時に loadData も完了済み
                    } else {
                        console.warn('setWeekByISO not available on this page');
                    }
                }
            }

            const targetId = btn.dataset.exportTarget || btn.getAttribute('data-export-target') || 'weekly-progress-section';
            const el = document.getElementById(targetId) || document.body;
            const prefix = (btn.dataset.filenamePrefix || 'Elevation_Loom_' + (targetId || 'export'));

            await exportElementAsImage(el, prefix);

            btn.disabled = false;
            btn.textContent = original;
        });
    });
});
