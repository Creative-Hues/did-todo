import { describe, expect, it } from 'vitest';
import { EMPTY_ALTER_PROFILE } from '../db/initialData';
import {
  buildAlterStats,
  didLines,
  effectiveCareAlterIds,
  isProxyRecord,
  isStatsEmpty,
  statsMonthLabel,
  type AlterStatsInput,
} from './stats';
import type { Alter, BucketItem, CompletionRecord, MedicationIntake, Task } from './types';

/** 2026年のローカル時刻を作る(month は 1〜12) */
function at(month: number, day: number, hour = 12, minute = 0): Date {
  return new Date(2026, month - 1, day, hour, minute);
}

function alter(id: string, order: number, hidden = false): Alter {
  return {
    id,
    name: `人格${id.toUpperCase()}`,
    color: '#4a90d9',
    hidden,
    order,
    createdAt: at(1, 1).toISOString(),
    ...EMPTY_ALTER_PROFILE,
  };
}

// 並び順は c → a → b(IDの順とわざと変えておく)
const alters = [alter('a', 1), alter('b', 2), alter('c', 0, true)];

function task(id: string, careAlterIds: string[]): Task {
  return {
    id,
    name: `タスク${id}`,
    cycle: { type: 'daily' },
    careAlterIds,
    hidden: false,
    order: 0,
    createdAt: at(1, 1).toISOString(),
  };
}

let seq = 0;
/** 完了記録。careAlterIdsAtCompletion を渡さなければ「古い記録」になる */
function rec(
  taskId: string,
  alterId: string | null,
  date: Date,
  careAlterIdsAtCompletion?: string[],
): CompletionRecord {
  seq += 1;
  const record: CompletionRecord = { id: `r${seq}`, taskId, alterId, completedAt: date.toISOString() };
  return careAlterIdsAtCompletion === undefined ? record : { ...record, careAlterIdsAtCompletion };
}

function intake(alterId: string | null, date: Date, timing: string | null, medicationId = 'm1'): MedicationIntake {
  seq += 1;
  return { id: `i${seq}`, medicationId, alterId, takenAt: date.toISOString(), timing, deducted: 1, reason: '' };
}

function bucket(
  ownerId: string,
  achievedAt: Date | null,
  helperAlterIds: string[],
  deletedAt?: Date,
): BucketItem {
  seq += 1;
  const item: BucketItem = {
    id: `b${seq}`,
    alterId: ownerId,
    body: '願い',
    order: 0,
    createdAt: at(1, 1).toISOString(),
    achievedAt: achievedAt?.toISOString() ?? null,
    helperAlterIds,
  };
  return deletedAt ? { ...item, deletedAt: deletedAt.toISOString() } : item;
}

/** 9月分の集計を作る(渡さなかったデータは空) */
function stats(alterId: string, data: Partial<AlterStatsInput>, month = '2026-09') {
  return buildAlterStats({
    alterId,
    month,
    alters,
    tasks: [],
    records: [],
    intakes: [],
    bucketItems: [],
    ...data,
  });
}

/** 11.2 の一覧を「ID:回数」の配列にする(比べやすくするため) */
function ids(list: { alter: Alter; count: number }[]): string[] {
  return list.map(({ alter: a, count }) => `${a.id}:${count}`);
}

describe('代行の判定', () => {
  const tasks = new Map([['t', task('t', ['a'])]]);

  it('やった人格が気にしている人格に入っていなければ代行', () => {
    expect(isProxyRecord(rec('t', 'b', at(9, 10), ['a']), tasks)).toBe(true);
  });

  it('やった人格が気にしている人格に入っていれば代行でない', () => {
    expect(isProxyRecord(rec('t', 'a', at(9, 10), ['a']), tasks)).toBe(false);
    expect(isProxyRecord(rec('t', 'a', at(9, 10), ['a', 'b']), tasks)).toBe(false);
  });

  it('気にしている人格が0人なら代行でない', () => {
    expect(isProxyRecord(rec('t', 'b', at(9, 10), []), tasks)).toBe(false);
  });

  it('「わからない」の記録は代行でない', () => {
    expect(isProxyRecord(rec('t', null, at(9, 10), ['a']), tasks)).toBe(false);
  });
});

describe('careAlterIdsAtCompletion がない古い記録', () => {
  it('タスクが残っていれば、今の careAlterIds で判断する', () => {
    const tasks = new Map([['t', task('t', ['a'])]]);
    const old = rec('t', 'b', at(9, 10));
    expect(effectiveCareAlterIds(old, tasks)).toEqual(['a']);
    expect(isProxyRecord(old, tasks)).toBe(true);
    expect(isProxyRecord(rec('t', 'a', at(9, 10)), tasks)).toBe(false);
  });

  it('タスクが削除されていれば、代行に数えない', () => {
    const old = rec('deleted', 'b', at(9, 10));
    expect(effectiveCareAlterIds(old, new Map())).toEqual([]);
    expect(isProxyRecord(old, new Map())).toBe(false);

    const result = stats('b', { records: [old] });
    // やった回数には数えるが、代行には数えない
    expect(result.did).toMatchObject({ todo: 1, todoProxy: 0 });
  });

  it('写しがある記録は、タスクの今の careAlterIds が変わっても写しで判断する', () => {
    // 記録したときは人格Aが気にしていた → 今は人格Bだけが気にしている
    const tasks = new Map([['t', task('t', ['b'])]]);
    expect(isProxyRecord(rec('t', 'b', at(9, 10), ['a']), tasks)).toBe(true);
    expect(isProxyRecord(rec('t', 'a', at(9, 10), ['a']), tasks)).toBe(false);
  });

  it('空の写しは「0人」として扱い、今の careAlterIds に置き換えない', () => {
    const tasks = new Map([['t', task('t', ['a'])]]);
    const record = rec('t', 'b', at(9, 10), []);
    expect(effectiveCareAlterIds(record, tasks)).toEqual([]);
    expect(isProxyRecord(record, tasks)).toBe(false);
  });
});

describe('ToDo の集計', () => {
  it('やった回数と、そのうちの代行の回数', () => {
    const records = [
      rec('t', 'b', at(9, 1), ['a']), // 代行
      rec('t', 'b', at(9, 2), ['b']), // 自分のタスク
      rec('t', 'b', at(9, 3), []), // 誰も気にしていない
      rec('t', 'a', at(9, 4), ['a']), // ほかの人格
    ];
    expect(stats('b', { records }).did).toMatchObject({ todo: 3, todoProxy: 1 });
  });

  it('代行は、してもらった人格のページに、やった人格ごとの回数で出る', () => {
    const records = [
      rec('t', 'b', at(9, 1), ['a']),
      rec('t', 'b', at(9, 2), ['a']),
      rec('t', 'c', at(9, 3), ['a']),
      rec('t', 'a', at(9, 4), ['a']), // 本人がやった → 代行でない
    ];
    // 人格の並び順(c → b)。人格C は非表示でも出る
    expect(ids(stats('a', { records }).receivedTodoProxy)).toEqual(['c:1', 'b:2']);
  });

  it('気にしている人格が複数いるタスクの代行は、その全員のページに数える', () => {
    const records = [rec('t', 'c', at(9, 1), ['a', 'b'])];
    expect(ids(stats('a', { records }).receivedTodoProxy)).toEqual(['c:1']);
    expect(ids(stats('b', { records }).receivedTodoProxy)).toEqual(['c:1']);
    expect(stats('c', { records }).did).toMatchObject({ todo: 1, todoProxy: 1 });
  });

  it('やった人格が気にしている人格の1人なら、ほかの人格の代行にもならない', () => {
    const records = [rec('t', 'b', at(9, 1), ['a', 'b'])];
    expect(stats('a', { records }).receivedTodoProxy).toEqual([]);
    expect(stats('b', { records }).did).toMatchObject({ todo: 1, todoProxy: 0 });
  });

  it('「わからない」の記録は、したことにも、代行される側にも数えない', () => {
    const records = [rec('t', null, at(9, 1), ['a']), rec('t', null, at(9, 2), [])];
    for (const id of ['a', 'b', 'c']) {
      const result = stats(id, { records });
      expect(result.did).toMatchObject({ todo: 0, todoProxy: 0 });
      expect(result.receivedTodoProxy).toEqual([]);
    }
  });

  it('削除したタスクの記録も数える(写しがあれば代行も数える)', () => {
    // tasks にはどのタスクもない = すべて削除済み
    const records = [rec('deleted', 'b', at(9, 1), ['a']), rec('deleted', 'b', at(9, 2), ['b'])];
    expect(stats('b', { records }).did).toMatchObject({ todo: 2, todoProxy: 1 });
    expect(ids(stats('a', { records }).receivedTodoProxy)).toEqual(['b:1']);
  });

  it('月は論理月で分ける(1日 4:59 は前の月、1日 5:00 は新しい月)', () => {
    const records = [rec('t', 'b', at(10, 1, 4, 59), ['a']), rec('t', 'b', at(10, 1, 5, 0), ['a'])];
    expect(stats('b', { records }, '2026-09').did.todo).toBe(1);
    expect(stats('b', { records }, '2026-10').did.todo).toBe(1);
    expect(ids(stats('a', { records }, '2026-09').receivedTodoProxy)).toEqual(['b:1']);
  });

  it('ほかの月の記録は数えない', () => {
    const records = [rec('t', 'b', at(8, 15), ['a']), rec('t', 'b', at(10, 15), ['a'])];
    expect(stats('b', { records }).did.todo).toBe(0);
    expect(stats('a', { records }).receivedTodoProxy).toEqual([]);
  });
});

describe('服薬の集計', () => {
  it('同じ論理日・同じ時間帯の薬3つは1回と数える', () => {
    const intakes = [
      intake('a', at(9, 10, 8), 'morning', 'm1'),
      intake('a', at(9, 10, 8), 'morning', 'm2'),
      intake('a', at(9, 10, 8), 'morning', 'm3'),
    ];
    expect(stats('a', { intakes }).did.medication).toBe(1);
  });

  it('別の時間帯・別の日なら別に数える', () => {
    const intakes = [
      intake('a', at(9, 10, 8), 'morning'),
      intake('a', at(9, 10, 20), 'evening'),
      intake('a', at(9, 11, 8), 'morning'),
    ];
    expect(stats('a', { intakes }).did.medication).toBe(3);
  });

  it('頓服は数えない', () => {
    const intakes = [intake('a', at(9, 10, 8), null), intake('a', at(9, 10, 9), null)];
    expect(stats('a', { intakes }).did.medication).toBe(0);
  });

  it('ほかの人格・「わからない」の記録は数えない', () => {
    const intakes = [intake('b', at(9, 10, 8), 'morning'), intake(null, at(9, 11, 8), 'morning')];
    expect(stats('a', { intakes }).did.medication).toBe(0);
  });

  it('夜中(朝5時前)の「寝る前」は、前の論理日・前の論理月に数える', () => {
    const intakes = [
      intake('a', at(9, 30, 23), 'bedtime', 'm1'),
      intake('a', at(10, 1, 1), 'bedtime', 'm2'), // 論理日は 9/30 → 上と同じ回
    ];
    expect(stats('a', { intakes }, '2026-09').did.medication).toBe(1);
    expect(stats('a', { intakes }, '2026-10').did.medication).toBe(0);
  });
});

describe('バケットの集計', () => {
  it('ほかの人格の願いが叶ったときに協力者に選ばれた回数', () => {
    const bucketItems = [bucket('a', at(9, 5), ['b']), bucket('c', at(9, 6), ['b', 'a']), bucket('a', at(9, 7), [])];
    expect(stats('b', { bucketItems }).did.bucketHelp).toBe(2);
  });

  it('その人格の願いに協力してくれた人格ごとの回数(人格の並び順)', () => {
    const bucketItems = [bucket('a', at(9, 5), ['b']), bucket('a', at(9, 6), ['b', 'c']), bucket('b', at(9, 7), ['a'])];
    expect(ids(stats('a', { bucketItems }).receivedBucketHelp)).toEqual(['c:1', 'b:2']);
  });

  it('削除した項目(deletedAt あり)の協力も数える', () => {
    const bucketItems = [bucket('a', at(9, 5), ['b'], at(9, 20))];
    expect(stats('b', { bucketItems }).did.bucketHelp).toBe(1);
    expect(ids(stats('a', { bucketItems }).receivedBucketHelp)).toEqual(['b:1']);
  });

  it('叶っていない項目は数えない', () => {
    const bucketItems = [bucket('a', null, [])];
    expect(stats('a', { bucketItems }).receivedBucketHelp).toEqual([]);
  });

  it('叶った日時の論理月で分ける', () => {
    const bucketItems = [bucket('a', at(10, 1, 4, 59), ['b']), bucket('a', at(10, 1, 5, 0), ['b'])];
    expect(stats('b', { bucketItems }, '2026-09').did.bucketHelp).toBe(1);
    expect(stats('b', { bucketItems }, '2026-10').did.bucketHelp).toBe(1);
  });
});

describe('「その人格のためにしてくれたこと」の一覧', () => {
  it('見つからない人格(削除済み)は出さない', () => {
    const records = [rec('t', 'gone', at(9, 1), ['a'])];
    expect(stats('a', { records }).receivedTodoProxy).toEqual([]);
  });
});

describe('表示の文言', () => {
  it('0回の行は出さず、「うち代行」も0回なら出さない', () => {
    expect(didLines({ todo: 12, todoProxy: 3, medication: 0, bucketHelp: 1 })).toEqual([
      { label: 'ToDo', value: '12回(うち代行 3回)' },
      { label: 'バケットの協力', value: '1回' },
    ]);
    expect(didLines({ todo: 2, todoProxy: 0, medication: 5, bucketHelp: 0 })).toEqual([
      { label: 'ToDo', value: '2回' },
      { label: '服薬の記録', value: '5回' },
    ]);
  });

  it('全部0なら空', () => {
    expect(didLines({ todo: 0, todoProxy: 0, medication: 0, bucketHelp: 0 })).toEqual([]);
  });

  it('全部の項目が0回の月だけ「記録なし」になる', () => {
    expect(isStatsEmpty(stats('a', {}))).toBe(true);
    // 「わからない」の記録・頓服・ほかの月の記録だけなら、0回のまま
    expect(
      isStatsEmpty(
        stats('a', {
          records: [rec('t', null, at(9, 1), ['a']), rec('t', 'a', at(8, 1), ['a'])],
          intakes: [intake('a', at(9, 1, 8), null)],
        }),
      ),
    ).toBe(true);
    // してくれたことだけがある月は「記録なし」にならない
    expect(isStatsEmpty(stats('a', { records: [rec('t', 'b', at(9, 1), ['a'])] }))).toBe(false);
    expect(isStatsEmpty(stats('a', { intakes: [intake('a', at(9, 1, 8), 'morning')] }))).toBe(false);
  });

  it('月の見出し', () => {
    expect(statsMonthLabel('2026-09')).toBe('2026年9月');
    expect(statsMonthLabel('2026-10')).toBe('2026年10月');
  });
});
