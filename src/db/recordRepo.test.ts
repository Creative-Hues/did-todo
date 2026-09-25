// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import { addRecord, undoCurrentRecord } from './recordRepo';
import type { Task } from '../lib/types';

/** 2026年のローカル時刻を作る(month は 1〜12) */
function at(month: number, day: number, hour = 12, minute = 0): Date {
  return new Date(2026, month - 1, day, hour, minute);
}

const daily: Task = {
  id: 'daily',
  name: '植物に水やり',
  cycle: { type: 'daily' },
  careAlterIds: [],
  hidden: false,
  order: 0,
  createdAt: at(9, 1).toISOString(),
};

describe('完了記録の追加・取り消し', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-records');
  });

  afterEach(async () => {
    await database.delete();
  });

  it('人格と時刻が記録される', async () => {
    const now = at(9, 25, 9, 12);
    const saved = await addRecord(database, daily, 'alter-1', now);
    expect(await database.records.toArray()).toEqual([
      { id: saved?.id, taskId: 'daily', alterId: 'alter-1', completedAt: now.toISOString() },
    ]);
  });

  it('「わからない」は alterId が null で記録される', async () => {
    await addRecord(database, daily, null, at(9, 25));
    expect((await database.records.toArray())[0].alterId).toBeNull();
  });

  it('同じ期間に2回目は記録されない', async () => {
    await addRecord(database, daily, 'alter-1', at(9, 25, 9));
    expect(await addRecord(database, daily, 'alter-2', at(9, 25, 20))).toBeNull();
    expect(await database.records.count()).toBe(1);
  });

  it('取り消すと今の期間の記録だけ消え、もう一度記録できる', async () => {
    const old = await addRecord(database, daily, 'alter-1', at(9, 24, 9));
    await addRecord(database, daily, 'alter-1', at(9, 25, 9));

    expect(await undoCurrentRecord(database, daily, at(9, 25, 20))).toBe(1);
    expect((await database.records.toArray()).map((r) => r.id)).toEqual([old?.id]);

    expect(await addRecord(database, daily, 'alter-2', at(9, 25, 21))).not.toBeNull();
    expect(await database.records.count()).toBe(2);
  });

  it('ほかのタスクの記録は消えない', async () => {
    const other: Task = { ...daily, id: 'other' };
    await addRecord(database, daily, null, at(9, 25, 9));
    await addRecord(database, other, null, at(9, 25, 9));
    await undoCurrentRecord(database, daily, at(9, 25, 20));
    expect((await database.records.toArray()).map((r) => r.taskId)).toEqual(['other']);
  });
});
