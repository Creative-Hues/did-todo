// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from '../db/db';
import { deleteExpiredRecords, getRetentionCutoff } from './retention';
import type { CompletionRecord } from './types';

function record(id: string, completedAt: Date): CompletionRecord {
  return { id, taskId: 't1', alterId: null, completedAt: completedAt.toISOString() };
}

describe('保持期間の境界', () => {
  it('ちょうど1年前の同時刻になる', () => {
    const now = new Date(2026, 8, 25, 10, 0);
    expect(getRetentionCutoff(now)).toEqual(new Date(2025, 8, 25, 10, 0));
  });
});

describe('1年より古い記録の削除', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = new AppDatabase('did-todo-test');
  });

  afterEach(async () => {
    await database.delete();
  });

  it('1年より古い記録だけが削除される', async () => {
    const now = new Date(2026, 8, 25, 10, 0);
    await database.records.bulkAdd([
      record('old-far', new Date(2024, 0, 1, 12, 0)),
      record('old-just', new Date(2025, 8, 25, 9, 59)), // 境界の1分前 → 削除
      record('boundary', new Date(2025, 8, 25, 10, 0)), // 境界ちょうど → 残す
      record('recent', new Date(2025, 8, 25, 10, 1)), // 境界の1分後 → 残す
      record('today', new Date(2026, 8, 25, 9, 0)),
    ]);

    const deleted = await deleteExpiredRecords(database, now);

    expect(deleted).toBe(2);
    const remainingIds = (await database.records.toArray()).map((r) => r.id).sort();
    expect(remainingIds).toEqual(['boundary', 'recent', 'today']);
  });

  it('削除対象がなければ何も消さない', async () => {
    const now = new Date(2026, 8, 25, 10, 0);
    await database.records.add(record('today', new Date(2026, 8, 25, 9, 0)));

    expect(await deleteExpiredRecords(database, now)).toBe(0);
    expect(await database.records.count()).toBe(1);
  });
});
