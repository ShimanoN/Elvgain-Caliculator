import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { calculateWeekTotal } from '../js/calculations.ts';
import * as db from '../js/db.ts';

describe('calculateWeekTotal', () => {
  let getDayLogsByWeekSpy;

  beforeEach(() => {
    // Spy on getDayLogsByWeek and provide default implementation
    getDayLogsByWeekSpy = vi.spyOn(db, 'getDayLogsByWeek').mockResolvedValue([]);
  });

  afterEach(() => {
    // Restore original implementation
    getDayLogsByWeekSpy.mockRestore();
  });

  it('無効な年は0を返す', async () => {
    const result = await calculateWeekTotal(1999, 1);
    expect(result).toBe(0);
  });

  it('単一データの合計', async () => {
    getDayLogsByWeekSpy.mockResolvedValue([
      { 
        date: '2026-02-09',
        elevation_part1: 1500,
        elevation_part2: 0,
        elevation_total: 1500,
        subjective_condition: 'good',
        iso_year: 2026,
        week_number: 7
      }
    ]);
    const result = await calculateWeekTotal(2026, 7);
    expect(result).toBe(1500);
  });

  it('複数データの合計', async () => {
    getDayLogsByWeekSpy.mockResolvedValue([
      {
        date: '2026-02-09',
        elevation_part1: 500,
        elevation_part2: 500,
        elevation_total: 1000,
        subjective_condition: 'good',
        iso_year: 2026,
        week_number: 7
      },
      {
        date: '2026-02-10',
        elevation_part1: 700,
        elevation_part2: 800,
        elevation_total: 1500,
        subjective_condition: 'good',
        iso_year: 2026,
        week_number: 7
      },
      {
        date: '2026-02-11',
        elevation_part1: 400,
        elevation_part2: 400,
        elevation_total: 800,
        subjective_condition: 'normal',
        iso_year: 2026,
        week_number: 7
      },
    ]);
    const result = await calculateWeekTotal(2026, 7);
    expect(result).toBe(3300);
  });
});
