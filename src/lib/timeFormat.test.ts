import { describe, expect, it } from 'vitest';
import { formatCompletionTime } from './timeFormat';

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
