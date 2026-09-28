import { describe, expect, it } from 'vitest';
import { formatClockInLogicalDay, formatCompletionTime, formatElapsed, formatLogicalDateHeading } from './timeFormat';

/** 2026年のローカル時刻を ISO 形式で作る(month は 1〜12) */
function iso(month: number, day: number, hour: number, minute: number): string {
  return new Date(2026, month - 1, day, hour, minute).toISOString();
}

describe('完了時刻の表示', () => {
  it('今日の欄:「9:12」', () => {
    expect(formatCompletionTime(iso(9, 23, 9, 12), 'today')).toBe('9:12');
  });

  it('今週の欄:「水 9:12」', () => {
    // 2026/9/23 は水曜
    expect(formatCompletionTime(iso(9, 23, 9, 12), 'week')).toBe('水 9:12');
  });

  it('今月の欄:「9/3 9:12」', () => {
    expect(formatCompletionTime(iso(9, 3, 9, 12), 'month')).toBe('9/3 9:12');
  });

  it('分は2桁、時はゼロ埋めしない', () => {
    expect(formatCompletionTime(iso(9, 23, 0, 5), 'today')).toBe('0:05');
    expect(formatCompletionTime(iso(9, 23, 23, 59), 'today')).toBe('23:59');
  });

  it('朝5時前でも、曜日・日付は実際の日時で表示する', () => {
    // 2026/9/24(木)2:30 は論理日では水曜だが、表示は木曜
    expect(formatCompletionTime(iso(9, 24, 2, 30), 'week')).toBe('木 2:30');
    // 10/1 2:30 は論理日では 9/30 だが、表示は 10/1
    expect(formatCompletionTime(iso(10, 1, 2, 30), 'month')).toBe('10/1 2:30');
  });
});

describe('前回からの経過時間', () => {
  const now = new Date(2026, 8, 28, 12, 0);
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString();

  it('1時間未満は「○分前」(切り捨て)', () => {
    expect(formatElapsed(minutesAgo(0), now)).toBe('0分前');
    expect(formatElapsed(new Date(now.getTime() - 25 * 60_000 - 59_000).toISOString(), now)).toBe('25分前');
    expect(formatElapsed(minutesAgo(59), now)).toBe('59分前');
  });

  it('24時間未満は「○時間前」(切り捨て)', () => {
    expect(formatElapsed(minutesAgo(60), now)).toBe('1時間前');
    expect(formatElapsed(minutesAgo(3 * 60 + 59), now)).toBe('3時間前');
    expect(formatElapsed(minutesAgo(24 * 60 - 1), now)).toBe('23時間前');
  });

  it('24時間以上は「○日前」(切り捨て)', () => {
    expect(formatElapsed(minutesAgo(24 * 60), now)).toBe('1日前');
    expect(formatElapsed(minutesAgo(2 * 24 * 60 + 23 * 60), now)).toBe('2日前');
  });

  it('未来の記録は「0分前」として扱う', () => {
    expect(formatElapsed(minutesAgo(-10), now)).toBe('0分前');
  });
});

describe('記録の一覧の日の見出し', () => {
  it('論理日の月日と曜日「9/28(月)」', () => {
    expect(formatLogicalDateHeading('2026-09-28')).toBe('9/28(月)');
    expect(formatLogicalDateHeading('2026-10-04')).toBe('10/4(日)');
    expect(formatLogicalDateHeading('2027-01-01')).toBe('1/1(金)');
  });
});

describe('記録の一覧の時刻', () => {
  it('見出しの論理日と実際の日付が同じなら、そのままの時刻', () => {
    expect(formatClockInLogicalDay(iso(9, 27, 8, 0), '2026-09-27')).toBe('8:00');
    expect(formatClockInLogicalDay(iso(9, 27, 23, 59), '2026-09-27')).toBe('23:59');
  });

  it('朝5時前の記録(前の日の見出しの下に入る)には「翌」を付ける', () => {
    expect(formatClockInLogicalDay(iso(9, 28, 0, 0), '2026-09-27')).toBe('翌0:00');
    expect(formatClockInLogicalDay(iso(9, 28, 2, 0), '2026-09-27')).toBe('翌2:00');
    expect(formatClockInLogicalDay(iso(9, 28, 4, 59), '2026-09-27')).toBe('翌4:59');
    // 月をまたいでも同じ
    expect(formatClockInLogicalDay(iso(10, 1, 2, 30), '2026-09-30')).toBe('翌2:30');
  });

  it('朝5時からは、その日の見出しの下に入るので「翌」は付かない', () => {
    expect(formatClockInLogicalDay(iso(9, 28, 5, 0), '2026-09-28')).toBe('5:00');
  });
});
