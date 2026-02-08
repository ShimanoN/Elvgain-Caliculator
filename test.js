import { getISOWeekInfo } from './iso-week.js';

export function runISOWeekTests() {
    console.log("Starting ISO Week tests...");

    // Test Case 1: 2025-12-29 (Should be Week 1 of 2026)
    const test1 = getISOWeekInfo(new Date("2025-12-29"));
    console.assert(test1.iso_year === 2026, `FAIL: 2025-12-29 year expected 2026, got ${test1.iso_year}`);
    console.assert(test1.week_number === 1, `FAIL: 2025-12-29 week expected 1, got ${test1.week_number}`);

    // Test Case 2: 2026-02-05 (Should be Week 6 of 2026)
    const test2 = getISOWeekInfo(new Date("2026-02-05"));
    console.assert(test2.iso_year === 2026, `FAIL: 2026-02-05 year expected 2026, got ${test2.iso_year}`);
    console.assert(test2.week_number === 6, `FAIL: 2026-02-05 week expected 6, got ${test2.week_number}`);
    console.assert(test2.start_date === "2026-02-02", `FAIL: 2026-02-05 start_date expected 2026-02-02, got ${test2.start_date}`);
    console.assert(test2.end_date === "2026-02-08", `FAIL: 2026-02-05 end_date expected 2026-02-08, got ${test2.end_date}`);

    console.log("ISO Week tests completed ✓");
}

// Global exposure for console execution
if (typeof window !== 'undefined') {
    window.runISOWeekTests = runISOWeekTests;
}
