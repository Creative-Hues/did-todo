// データベースの版を上げても、今のデータが消えないことを確かめる(SPEC.md 3.5)
import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import type { AlterV1 } from './initialData';
import type { CompletionRecord, Task } from '../lib/types';

const DB_NAME = 'did-todo-test-migration';

/** 版1のときの定義(db.ts の version(1) と同じ) */
function openV1(): Dexie {
  const v1 = new Dexie(DB_NAME);
  v1.version(1).stores({
    alters: 'id, order',
    tasks: 'id, order',
    records: 'id, taskId, completedAt, [taskId+completedAt]',
  });
  return v1;
}

const alterA: AlterV1 = {
  id: 'alter-a',
  name: '人格A',
  color: '#4a90d9',
  hidden: false,
  order: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
};
const alterB: AlterV1 = {
  id: 'alter-b',
  name: '人格B',
  color: '#d94a4a',
  hidden: true,
  order: 1,
  createdAt: '2026-09-02T00:00:00.000Z',
};
const task: Task = {
  id: 'task-1',
  name: '植物に水やり',
  cycle: { type: 'everyNDays', n: 3 },
  careAlterIds: ['alter-a', 'alter-b'],
  hidden: false,
  order: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
};
const records: CompletionRecord[] = [
  { id: 'r1', taskId: 'task-1', alterId: 'alter-a', completedAt: '2026-09-20T01:00:00.000Z' },
  { id: 'r2', taskId: 'task-1', alterId: null, completedAt: '2026-09-23T12:00:00.000Z' },
  // タスクを削除したあとも残っている記録
  { id: 'r3', taskId: 'deleted-task', alterId: 'alter-b', completedAt: '2026-09-24T12:00:00.000Z' },
];

describe('データベースの版を上げる', () => {
  let database: AppDatabase | undefined;

  afterEach(async () => {
    database?.close();
    await Dexie.delete(DB_NAME);
  });

  it('版1の人格・タスク・完了記録が消えずに残り、人格に基本情報の初期値が入る', async () => {
    const v1 = openV1();
    await v1.table('alters').bulkAdd([alterA, alterB]);
    await v1.table('tasks').add(task);
    await v1.table('records').bulkAdd(records);
    v1.close();

    database = new AppDatabase(DB_NAME);
    await database.open();

    expect(database.verno).toBe(2);
    expect(await database.alters.orderBy('order').toArray()).toEqual([
      { ...alterA, reading: '', categoryId: null, age: '', gender: '', identify: '' },
      { ...alterB, reading: '', categoryId: null, age: '', gender: '', identify: '' },
    ]);
    expect(await database.tasks.toArray()).toEqual([task]);
    expect(await database.records.orderBy('id').toArray()).toEqual(records);
    // 古い記録には careAlterIdsAtCompletion を足さない(SPEC.md 3.3)
    expect((await database.records.get('r1'))?.careAlterIdsAtCompletion).toBeUndefined();
  });

  it('版を上げたとき、最初の区分と受診メモの分類が入る', async () => {
    const v1 = openV1();
    await v1.table('alters').add(alterA);
    v1.close();

    database = new AppDatabase(DB_NAME);
    const categories = await database.categories.orderBy('order').toArray();
    expect(categories.map((c) => c.name)).toEqual(['主人格', 'よく前に出る', '状況によって出る', '最近出現・詳細確認中']);
    const noteCategories = await database.clinicNoteCategories.orderBy('order').toArray();
    expect(noteCategories.map((c) => c.name)).toEqual(['体調', '薬', '睡眠', '気分', '人格のこと', '生活', 'その他']);
  });

  it('新しく入れたときも、最初の区分と受診メモの分類が1回だけ入る', async () => {
    database = new AppDatabase(DB_NAME);
    await database.open();
    database.close();
    // 開き直しても、もう一度は入らない
    database = new AppDatabase(DB_NAME);
    expect(await database.categories.count()).toBe(4);
    expect(await database.clinicNoteCategories.count()).toBe(7);
    expect(await database.alters.count()).toBe(0);
    expect(await database.meta.count()).toBe(0);
  });

  it('新しいテーブルに保存でき、開き直しても残る', async () => {
    database = new AppDatabase(DB_NAME);
    await database.medications.add({
      id: 'med-1',
      name: '薬A',
      kind: 'scheduled',
      timings: ['morning', 'bedtime'],
      dosePerTake: 0.5,
      remaining: 14,
      status: 'active',
      order: 0,
      createdAt: '2026-09-28T00:00:00.000Z',
    });
    await database.meta.put({ key: 'lastBackupExportedAt', value: '2026-09-28T00:00:00.000Z' });
    database.close();

    database = new AppDatabase(DB_NAME);
    expect((await database.medications.get('med-1'))?.dosePerTake).toBe(0.5);
    expect((await database.meta.get('lastBackupExportedAt'))?.value).toBe('2026-09-28T00:00:00.000Z');
  });
});
