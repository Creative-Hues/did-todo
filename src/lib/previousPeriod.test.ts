import { describe, expect, it } from 'vitest';
import { EMPTY_ALTER_PROFILE } from '../db/initialData';
import {
  getPreviousPeriodResult,
  previousPeriodLabelText,
  toPreviousPeriodLabel,
  type PreviousPeriodResult,
} from './previousPeriod';
import type { Alter, CompletionRecord, Cycle, Task } from './types';

/** 2026年のローカル時刻を作る(month は 1〜12) */
function at(month: number, day: number, hour = 12, minute = 0): Date {
  return new Date(2026, month - 1, day, hour, minute);
}

/** 9/1 に作ったタスク */
function task(cycle: Cycle, createdAt = at(9, 1)): Pick<Task, 'cycle' | 'createdAt'> {
  return { cycle, createdAt: createdAt.toISOString() };
}

let seq = 0;
function rec(date: Date, alterId: string | null = 'alter-a'): CompletionRecord {
  seq += 1;
  return { id: `r${seq}`, taskId: 't', alterId, completedAt: date.toISOString() };
}

const alterA: Alter = {
  id: 'alter-a',
  name: '人格A',
  color: '#4a90d9',
  hidden: true, // 非表示の人格でも名前と色で出る
  order: 0,
  createdAt: at(9, 1).toISOString(),
  ...EMPTY_ALTER_PROFILE,
};
const alterById = new Map([[alterA.id, alterA]]);

/** 結果を画面の1行の文字にする(何も出さないときは null) */
function text(cycle: Cycle, result: PreviousPeriodResult): string | null {
  const label = toPreviousPeriodLabel(result, cycle, alterById);
  return label ? previousPeriodLabelText(label) : null;
}

describe('前の期間の表示:毎日', () => {
  const daily: Cycle = { type: 'daily' };

  it('昨日の記録があれば「昨日:人格A・21:30」', () => {
    const result = getPreviousPeriodResult(task(daily), [rec(at(9, 27, 21, 30))], at(9, 28, 9));
    expect(text(daily, result)).toBe('昨日:人格A・21:30');
  });

  it('昨日の記録がなければ「昨日は記録なし」', () => {
    const result = getPreviousPeriodResult(task(daily), [rec(at(9, 26, 21))], at(9, 28, 9));
    expect(text(daily, result)).toBe('昨日は記録なし');
  });

  it('朝5時の境界:4:59 はまだ「今日」が前日なので、その前日の記録を見る', () => {
    // 9/28 2:00 の記録は論理日 9/27
    const records = [rec(at(9, 28, 2))];
    // 9/28 4:59(論理日 9/27)から見た昨日は 9/26 → 記録なし
    expect(text(daily, getPreviousPeriodResult(task(daily), records, at(9, 28, 4, 59)))).toBe('昨日は記録なし');
    // 9/28 5:00(論理日 9/28)から見た昨日は 9/27 → 記録あり。時刻は実際の時刻
    expect(text(daily, getPreviousPeriodResult(task(daily), records, at(9, 28, 5, 0)))).toBe('昨日:人格A・2:00');
  });

  it('同じ期間に複数の記録があれば、最後の記録を出す', () => {
    const records = [rec(at(9, 27, 21)), rec(at(9, 27, 8))];
    expect(text(daily, getPreviousPeriodResult(task(daily), records, at(9, 28, 9)))).toBe('昨日:人格A・21:00');
  });

  it('「わからない」の記録', () => {
    const result = getPreviousPeriodResult(task(daily), [rec(at(9, 27, 21, 30), null)], at(9, 28, 9));
    expect(text(daily, result)).toBe('昨日:わからない・21:30');
  });

  it('今日作ったタスクは何も出さない', () => {
    const result = getPreviousPeriodResult(task(daily, at(9, 28, 8)), [], at(9, 28, 9));
    expect(result).toEqual({ kind: 'none' });
    expect(text(daily, result)).toBeNull();
  });

  it('昨日のうちに作ったタスクは「昨日は記録なし」を出す', () => {
    // 9/28 4:00 は論理日 9/27(昨日)
    const result = getPreviousPeriodResult(task(daily, at(9, 28, 4)), [], at(9, 28, 9));
    expect(text(daily, result)).toBe('昨日は記録なし');
  });
});

describe('前の期間の表示:毎週', () => {
  const weekly: Cycle = { type: 'weekly' };
  // 2026/9/28 は月曜日

  it('先週の記録があれば「先週:人格A・水 14:20」', () => {
    const result = getPreviousPeriodResult(task(weekly), [rec(at(9, 23, 14, 20))], at(9, 30, 9));
    expect(text(weekly, result)).toBe('先週:人格A・水 14:20');
  });

  it('月曜5時の境界', () => {
    // 9/21(月)10:00 の記録 = 9/21 の週
    const records = [rec(at(9, 21, 10))];
    // 9/28(月)4:59 はまだ 9/21 の週 → 先週(9/14 の週)は記録なし
    expect(text(weekly, getPreviousPeriodResult(task(weekly), records, at(9, 28, 4, 59)))).toBe('先週は記録なし');
    // 9/28(月)5:00 から新しい週 → 先週(9/21 の週)に記録あり
    expect(text(weekly, getPreviousPeriodResult(task(weekly), records, at(9, 28, 5, 0)))).toBe('先週:人格A・月 10:00');
  });

  it('今週作ったタスクは何も出さない', () => {
    const result = getPreviousPeriodResult(task(weekly, at(9, 28, 6)), [], at(9, 30, 9));
    expect(result).toEqual({ kind: 'none' });
  });
});

describe('前の期間の表示:毎月', () => {
  const monthly: Cycle = { type: 'monthly' };

  it('先月の記録があれば「先月:人格A・9/3」', () => {
    const result = getPreviousPeriodResult(task(monthly, at(8, 1)), [rec(at(9, 3, 9, 12))], at(10, 10));
    expect(text(monthly, result)).toBe('先月:人格A・9/3');
  });

  it('1日5時の境界', () => {
    // 10/1 3:00 の記録は論理日 9/30 → 9月の記録。表示は実際の日付(10/1)
    const records = [rec(at(10, 1, 3))];
    // 10/1 4:59 はまだ9月 → 先月(8月)は記録なし
    expect(text(monthly, getPreviousPeriodResult(task(monthly, at(8, 1)), records, at(10, 1, 4, 59)))).toBe(
      '先月は記録なし',
    );
    // 10/1 5:00 から10月 → 先月(9月)に記録あり
    expect(text(monthly, getPreviousPeriodResult(task(monthly, at(8, 1)), records, at(10, 1, 5, 0)))).toBe(
      '先月:人格A・10/1',
    );
  });

  it('今月作ったタスクは何も出さない', () => {
    const result = getPreviousPeriodResult(task(monthly, at(9, 1, 6)), [], at(9, 28));
    expect(result).toEqual({ kind: 'none' });
  });
});

describe('前の期間の表示:○日ごと', () => {
  const every3: Cycle = { type: 'everyNDays', n: 3 };

  it('記録が一度もなければ何も出さない', () => {
    expect(getPreviousPeriodResult(task(every3), [], at(9, 28))).toEqual({ kind: 'none' });
  });

  it('予定日の当日は「前回:人格A・9/20」', () => {
    // 9/20 + 3日 = 9/23 が予定日
    const result = getPreviousPeriodResult(task(every3), [rec(at(9, 20, 21))], at(9, 23, 9));
    expect(text(every3, result)).toBe('前回:人格A・9/20');
  });

  it('予定日をすぎていれば「予定日から○日」', () => {
    const records = [rec(at(9, 20, 21))];
    expect(text(every3, getPreviousPeriodResult(task(every3), records, at(9, 24, 9)))).toBe('予定日から1日');
    expect(text(every3, getPreviousPeriodResult(task(every3), records, at(9, 25, 9)))).toBe('予定日から2日');
  });

  it('日数は論理日で数える(朝5時前はまだ前の日)', () => {
    const records = [rec(at(9, 20, 21))];
    // 9/24 4:59 は論理日 9/23(予定日の当日)
    expect(text(every3, getPreviousPeriodResult(task(every3), records, at(9, 24, 4, 59)))).toBe('前回:人格A・9/20');
  });

  it('今日やったら「予定日から○日」は出さず、今日より前の最後の記録を出す', () => {
    const records = [rec(at(9, 20, 21)), rec(at(9, 25, 8))];
    expect(text(every3, getPreviousPeriodResult(task(every3), records, at(9, 25, 20)))).toBe('前回:人格A・9/20');
  });

  it('今日が初めての記録なら、何も出さない', () => {
    expect(getPreviousPeriodResult(task(every3), [rec(at(9, 25, 8))], at(9, 25, 20))).toEqual({ kind: 'none' });
  });

  it('「前回」の日付は実際の日付(朝5時前の記録でも、その日の日付)', () => {
    // 9/21 2:00 の記録は論理日 9/20。表示は実際の日付 9/21
    const result = getPreviousPeriodResult(task(every3), [rec(at(9, 21, 2))], at(9, 22, 9));
    expect(text(every3, result)).toBe('前回:人格A・9/21');
  });
});
