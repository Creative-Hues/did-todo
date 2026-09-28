import { describe, expect, it } from 'vitest';
import {
  addLogicalDays,
  diffLogicalDays,
  nextLogicalMonth,
  previousLogicalMonth,
  statsMonthRange,
  startOfLogicalDate,
  startOfLogicalMonth,
  toCalendarDate,
  toLogicalDate,
  toLogicalMonth,
  toLogicalWeek,
} from './period';

describe('前の期間の計算に使う関数', () => {
  it('論理日に日数を足す(月・年をまたぐ)', () => {
    expect(addLogicalDays('2026-09-01', -1)).toBe('2026-08-31');
    expect(addLogicalDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addLogicalDays('2026-09-28', -7)).toBe('2026-09-21');
  });

  it('前の月(年をまたぐ)', () => {
    expect(previousLogicalMonth('2026-09')).toBe('2026-08');
    expect(previousLogicalMonth('2026-01')).toBe('2025-12');
  });

  it('次の月(年をまたぐ)', () => {
    expect(nextLogicalMonth('2026-09')).toBe('2026-10');
    expect(nextLogicalMonth('2026-12')).toBe('2027-01');
  });

  it('論理日・論理月が始まる日時は朝5時', () => {
    expect(startOfLogicalDate('2026-09-28')).toEqual(new Date(2026, 8, 28, 5, 0));
    expect(startOfLogicalMonth('2026-09')).toEqual(new Date(2026, 8, 1, 5, 0));
  });

  it('実際の日付は朝5時で区切らない', () => {
    expect(toCalendarDate(new Date(2026, 8, 28, 4, 59))).toBe('2026-09-28');
  });
});

// new Date(年, 月-1, 日, 時, 分) は端末のローカル時刻として作られる

describe('テスト環境', () => {
  it('タイムゾーンが日本時間に固定されている', () => {
    expect(new Date(2026, 8, 25).getTimezoneOffset()).toBe(-540);
  });
});

describe('論理日(朝5時区切り)', () => {
  it('4:59 は前日扱いになる', () => {
    expect(toLogicalDate(new Date(2026, 8, 26, 4, 59))).toBe('2026-09-25');
  });

  it('5:00 は当日扱いになる', () => {
    expect(toLogicalDate(new Date(2026, 8, 26, 5, 0))).toBe('2026-09-26');
  });

  it('年をまたぐ場合も前日扱いになる', () => {
    expect(toLogicalDate(new Date(2027, 0, 1, 4, 59))).toBe('2026-12-31');
  });
});

describe('週(論理日で月曜〜日曜)', () => {
  // 2026/9/28 は月曜日
  it('月曜 4:59 は前の週になる', () => {
    expect(toLogicalWeek(new Date(2026, 8, 28, 4, 59))).toBe('2026-09-21');
  });

  it('月曜 5:00 は新しい週になる', () => {
    expect(toLogicalWeek(new Date(2026, 8, 28, 5, 0))).toBe('2026-09-28');
  });

  it('日曜は同じ週の月曜にまとまる', () => {
    expect(toLogicalWeek(new Date(2026, 9, 4, 23, 0))).toBe('2026-09-28');
  });
});

describe('月(論理日の年月)', () => {
  it('1日 4:59 は前の月になる', () => {
    expect(toLogicalMonth(new Date(2026, 9, 1, 4, 59))).toBe('2026-09');
  });

  it('1日 5:00 は新しい月になる', () => {
    expect(toLogicalMonth(new Date(2026, 9, 1, 5, 0))).toBe('2026-10');
  });
});

describe('集計で見られる月の範囲(過去11か月〜今月)', () => {
  it('今月から11か月前まで(年をまたぐ)', () => {
    expect(statsMonthRange(new Date(2026, 8, 28, 12, 0))).toEqual({ oldest: '2025-10', latest: '2026-09' });
  });

  it('1日 4:59 はまだ前の月が「今月」', () => {
    expect(statsMonthRange(new Date(2026, 9, 1, 4, 59))).toEqual({ oldest: '2025-10', latest: '2026-09' });
  });

  it('1日 5:00 で範囲が1か月進む', () => {
    expect(statsMonthRange(new Date(2026, 9, 1, 5, 0))).toEqual({ oldest: '2025-11', latest: '2026-10' });
  });

  it('1月は前の年の2月から', () => {
    expect(statsMonthRange(new Date(2027, 0, 15, 12, 0))).toEqual({ oldest: '2026-02', latest: '2027-01' });
  });
});

describe('論理日どうしの日数差', () => {
  it('月をまたいでも正しく数える', () => {
    expect(diffLogicalDays('2026-09-29', '2026-10-02')).toBe(3);
  });

  it('前の日付ならマイナスになる', () => {
    expect(diffLogicalDays('2026-09-25', '2026-09-24')).toBe(-1);
  });
});
