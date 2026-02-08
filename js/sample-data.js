(function () {
    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function weightedPick(items, weights) {
        const sum = weights.reduce((a, b) => a + b, 0);
        const r = Math.random() * sum;
        let acc = 0;
        for (let i = 0; i < items.length; i++) {
            acc += weights[i];
            if (r <= acc) return items[i];
        }
        return items[items.length - 1];
    }

    async function generate(weeks = 8, options = {}) {
        const days = weeks * 7;
        const today = new Date();
        const activityProb = options.activityProb ?? 0.6;
        const logs = [];

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            if (Math.random() > activityProb) continue;

            const weekday = d.getDay();
            const weekendBoost = (weekday === 0 || weekday === 6) ? 200 : 0;
            const elevation = Math.max(0, randInt(100, 1200) + weekendBoost + randInt(-50, 150));

            let weights;
            if (elevation > 1000) weights = [0.6, 0.3, 0.1];
            else if (elevation > 400) weights = [0.4, 0.45, 0.15];
            else weights = [0.2, 0.6, 0.2];

            const condition = weightedPick(['good', 'normal', 'bad'], weights);
            const part1 = randInt(0, Math.round(elevation * 0.6));
            const part2 = Math.max(0, elevation - part1);

            const weekInfo = getISOWeekInfo(d);
            logs.push({
                date: formatDate(d),
                elevation_part1: part1,
                elevation_part2: part2,
                elevation_total: part1 + part2,
                subjective_condition: condition,
                iso_year: weekInfo.iso_year,
                week_number: weekInfo.week_number,
                timezone: 'Asia/Tokyo',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }

        for (const log of logs) {
            await saveDayLog(log);
        }

        return { generated: logs.length, weeks };
    }

    window.sampleData = { generate };
})();
