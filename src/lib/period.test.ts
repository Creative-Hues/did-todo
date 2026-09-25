import { describe, expect, it } from 'vitest';
import { diffLogicalDays, toLogicalDate, toLogicalMonth, toLogicalWeek } from './period';

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

describe('論理日どうしの日数差', () => {
  it('月をまたいでも正しく数える', () => {
    expect(diffLogicalDays('2026-09-29', '2026-10-02')).toBe(3);
  });

  it('前の日付ならマイナスになる', () => {
    expect(diffLogicalDays('2026-09-25', '2026-09-24')).toBe(-1);
  });
});
