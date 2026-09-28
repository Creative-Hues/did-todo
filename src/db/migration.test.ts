// データベースの版を上げても、今のデータが消えないことを確かめる(SPEC.md 3.5)
import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import type { AlterV1 } from './initialData';
import type { CompletionRecord, Medication, MedicationIntake, StockLog, Task } from '../lib/types';

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

/** 版2のときの定義(db.ts の version(1)・version(2) と同じ) */
function openV2(): Dexie {
  const v2 = new Dexie(DB_NAME);
  v2.version(1).stores({
    alters: 'id, order',
    tasks: 'id, order',
    records: 'id, taskId, completedAt, [taskId+completedAt]',
  });
  v2.version(2).stores({
    categories: 'id, order',
    profileSections: 'id, alterId, order',
    medications: 'id, order',
    medicationIntakes: 'id, medicationId, takenAt',
    stockLogs: 'id, medicationId, at',
    clinicNotes: 'id, createdAt',
    clinicNoteCategories: 'id, order',
    bucketItems: 'id, alterId, order',
    meta: 'key',
  });
  return v2;
}

/** 最初の4つの時間帯の ID・名前・並び順・非表示(作成日時は版を上げた時刻なので比べない) */
const DEFAULT_TIMING_ROWS = [
  ['morning', '朝食後', 0, false],
  ['noon', '昼食後', 1, false],
  ['evening', '夕食後', 2, false],
  ['bedtime', '寝る前', 3, false],
];

async function timingRows(database: AppDatabase) {
  return (await database.medicationTimings.orderBy('order').toArray()).map((t) => [t.id, t.name, t.order, t.hidden]);
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

    expect(database.verno).toBe(3);
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

  describe('版2 → 版3(服薬の時間帯の一覧。SPEC.md 3.5・7.8)', () => {
    const medications: Medication[] = [
      {
        id: 'med-1',
        name: '薬A',
        kind: 'scheduled',
        timings: ['morning', 'bedtime'],
        dosePerTake: 1,
        remaining: 13,
        status: 'active',
        order: 0,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
      {
        id: 'med-2',
        name: '薬B',
        kind: 'scheduled',
        timings: ['noon'],
        dosePerTake: 0.5,
        remaining: 3.5,
        status: 'stopped',
        order: 1,
        createdAt: '2026-09-02T00:00:00.000Z',
      },
      {
        id: 'med-3',
        name: '頓服C',
        kind: 'asNeeded',
        timings: [],
        dosePerTake: 1,
        remaining: 5,
        status: 'active',
        order: 2,
        createdAt: '2026-09-03T00:00:00.000Z',
      },
    ];
    const intakes: MedicationIntake[] = [
      {
        id: 'i1',
        medicationId: 'med-1',
        alterId: 'alter-a',
        takenAt: '2026-09-27T12:00:00.000Z',
        timing: 'bedtime',
        deducted: 1,
        reason: '',
      },
      {
        id: 'i2',
        medicationId: 'med-3',
        alterId: null,
        takenAt: '2026-09-27T06:00:00.000Z',
        timing: null,
        deducted: 1,
        reason: '頭痛',
      },
    ];
    const stockLogs: StockLog[] = [
      { id: 's1', medicationId: 'med-1', kind: 'initial', amount: 14, at: '2026-09-01T00:00:00.000Z' },
    ];

    it('薬・服薬記録・在庫の履歴が1文字も変わらず、最初の4つの時間帯が入り、薬の時間帯とつながる', async () => {
      const v2 = openV2();
      await v2.open();
      await v2.table('medications').bulkAdd(medications);
      await v2.table('medicationIntakes').bulkAdd(intakes);
      await v2.table('stockLogs').bulkAdd(stockLogs);
      v2.close();

      database = new AppDatabase(DB_NAME);
      await database.open();

      expect(database.verno).toBe(3);
      expect(await timingRows(database)).toEqual(DEFAULT_TIMING_ROWS);
      expect(await database.medications.orderBy('order').toArray()).toEqual(medications);
      expect(await database.medicationIntakes.orderBy('id').toArray()).toEqual(intakes);
      expect(await database.stockLogs.toArray()).toEqual(stockLogs);
      // 薬と服薬記録が指している時間帯が、すべて一覧にある
      const timingIds = new Set((await database.medicationTimings.toArray()).map((t) => t.id));
      const referenced = [...medications.flatMap((m) => m.timings), ...intakes.flatMap((i) => (i.timing ? [i.timing] : []))];
      expect(referenced.every((id) => timingIds.has(id))).toBe(true);
    });

    it('版1から開いても、最初の4つの時間帯が1回だけ入る', async () => {
      const v1 = openV1();
      await v1.table('alters').add(alterA);
      v1.close();

      database = new AppDatabase(DB_NAME);
      await database.open();
      expect(database.verno).toBe(3);
      expect(await timingRows(database)).toEqual(DEFAULT_TIMING_ROWS);
    });

    it('新しく入れたときも最初の4つが入り、開き直しても増えない', async () => {
      database = new AppDatabase(DB_NAME);
      await database.open();
      database.close();
      database = new AppDatabase(DB_NAME);
      expect(await timingRows(database)).toEqual(DEFAULT_TIMING_ROWS);
    });
  });
});
