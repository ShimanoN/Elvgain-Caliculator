import { describe, it, expect, beforeEach } from 'vitest';

describe('calculateWeekTotal error branches', () => {
  beforeEach(() => {
    global.getDayLogsByWeek = async () => [];
  });

  it('week_number の範囲外は 0 を返す (大きすぎる)', async () => {
    const res = await calculateWeekTotal(2026, 54);
    expect(res).toBe(0);
  });

  it('week_number が整数でない場合は 0 を返す', async () => {
    const res = await calculateWeekTotal(2026, 7.5);
    expect(res).toBe(0);
  });

  it('getDayLogsByWeek が配列を返さなければ 0 を返す', async () => {
    global.getDayLogsByWeek = async () => null;
    const res = await calculateWeekTotal(2026, 7);
    expect(res).toBe(0);
  });

  it('getDayLogsByWeek が例外を投げた場合は 0 を返す', async () => {
    global.getDayLogsByWeek = async () => {
      throw new Error('db error');
    };
    const res = await calculateWeekTotal(2026, 7);
    expect(res).toBe(0);
  });
});
