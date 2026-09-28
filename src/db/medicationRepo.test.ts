// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import {
  addMedication,
  countMedicationIntakes,
  deleteMedication,
  recordAsNeededIntake,
  recordScheduledIntakes,
  recountMedication,
  refillMedication,
  reorderMedications,
  setMedicationStatus,
  undoAsNeededIntake,
  undoScheduledIntakes,
  updateMedication,
  type MedicationInput,
} from './medicationRepo';

/** 2026年のローカル時刻を作る(month は 1〜12) */
function at(month: number, day: number, hour = 12, minute = 0): Date {
  return new Date(2026, month - 1, day, hour, minute);
}

const scheduled: MedicationInput = { name: '薬A', kind: 'scheduled', timings: ['bedtime', 'morning'], dosePerTake: 1 };
const asNeeded: MedicationInput = { name: '頓服A', kind: 'asNeeded', timings: ['morning'], dosePerTake: 0.5 };

describe('服薬の保存', () => {
  let database: AppDatabase;
  const now = at(9, 28, 9);

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-medications');
  });

  afterEach(async () => {
    await database.delete();
  });

  const remainingOf = async (id: string) => (await database.medications.get(id))?.remaining;

  describe('薬の登録・変更', () => {
    it('登録すると使用中で保存され、登録したときの錠数が在庫の履歴の最初に残る', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      const b = await addMedication(database, asNeeded, 10, now);

      expect(await database.medications.get(a.id)).toEqual({
        id: a.id,
        name: '薬A',
        kind: 'scheduled',
        timings: ['morning', 'bedtime'], // 決まった並び順にそろう
        dosePerTake: 1,
        remaining: 14,
        status: 'active',
        order: 0,
        createdAt: now.toISOString(),
      });
      expect(b.order).toBe(1);
      expect(b.timings).toEqual([]); // 頓服は時間帯を持たない
      expect(await database.stockLogs.where('medicationId').equals(a.id).toArray()).toEqual([
        { id: expect.any(String), medicationId: a.id, kind: 'initial', amount: 14, at: now.toISOString() },
      ]);
    });

    it('変更しても残りは変わらない', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      await updateMedication(database, a.id, { ...asNeeded, name: '薬A2' });
      const saved = await database.medications.get(a.id);
      expect(saved).toMatchObject({ name: '薬A2', kind: 'asNeeded', timings: [], dosePerTake: 0.5, remaining: 14 });
    });

    it('中止と再開ができる', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      await setMedicationStatus(database, a.id, 'stopped');
      expect((await database.medications.get(a.id))?.status).toBe('stopped');
      await setMedicationStatus(database, a.id, 'active');
      expect((await database.medications.get(a.id))?.status).toBe('active');
    });

    it('並べ替えた順番で保存される', async () => {
      const a = await addMedication(database, scheduled, 1, now);
      const b = await addMedication(database, scheduled, 1, now);
      const c = await addMedication(database, scheduled, 1, now);
      await reorderMedications(database, [c.id, a.id, b.id]);
      const ordered = await database.medications.orderBy('order').toArray();
      expect(ordered.map((m) => m.id)).toEqual([c.id, a.id, b.id]);
    });
  });

  describe('補充・数え直し', () => {
    it('補充は残りに足し、数え直しは残りを直す。どちらも履歴に残る', async () => {
      const a = await addMedication(database, scheduled, 3, at(9, 1));
      await refillMedication(database, a.id, 28, at(9, 10));
      expect(await remainingOf(a.id)).toBe(31);
      await recountMedication(database, a.id, 29.5, at(9, 20));
      expect(await remainingOf(a.id)).toBe(29.5);

      const logs = await database.stockLogs.where('medicationId').equals(a.id).sortBy('at');
      expect(logs.map((log) => [log.kind, log.amount])).toEqual([
        ['initial', 3],
        ['refill', 28],
        ['recount', 29.5],
      ]);
    });

    it('薬が見つからないときは何もしない', async () => {
      await refillMedication(database, 'none', 10, now);
      await recountMedication(database, 'none', 10, now);
      expect(await database.stockLogs.count()).toBe(0);
    });
  });

  describe('決まった時間の記録', () => {
    it('記録で残りが減り、取り消しで戻る', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      const b = await addMedication(database, { ...scheduled, dosePerTake: 0.5 }, 10, now);

      const saved = await recordScheduledIntakes(database, 'bedtime', [a.id, b.id], 'alter-a', at(9, 28, 21, 30));
      expect(saved).toHaveLength(2);
      expect(saved?.[0]).toMatchObject({
        medicationId: a.id,
        alterId: 'alter-a',
        timing: 'bedtime',
        takenAt: at(9, 28, 21, 30).toISOString(),
        deducted: 1,
        reason: '',
      });
      expect(await remainingOf(a.id)).toBe(13);
      expect(await remainingOf(b.id)).toBe(9.5);

      expect(await undoScheduledIntakes(database, 'bedtime', '2026-09-28')).toBe(2);
      expect(await remainingOf(a.id)).toBe(14);
      expect(await remainingOf(b.id)).toBe(10);
      expect(await database.medicationIntakes.count()).toBe(0);
    });

    it('チェックした薬だけ記録される', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      const b = await addMedication(database, scheduled, 14, now);
      await recordScheduledIntakes(database, 'morning', [b.id], null, now);
      expect(await remainingOf(a.id)).toBe(14);
      expect(await remainingOf(b.id)).toBe(13);
      expect((await database.medicationIntakes.toArray()).map((i) => [i.medicationId, i.alterId])).toEqual([
        [b.id, null],
      ]);
    });

    it('同じ論理日の同じ時間帯には2回記録できない(翌日の朝5時からはできる)', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      await recordScheduledIntakes(database, 'bedtime', [a.id], 'alter-a', at(9, 28, 21));
      // 夜中2時はまだ同じ論理日
      expect(await recordScheduledIntakes(database, 'bedtime', [a.id], 'alter-b', at(9, 29, 2))).toBeNull();
      expect(await remainingOf(a.id)).toBe(13);
      // ほかの時間帯は記録できる
      expect(await recordScheduledIntakes(database, 'morning', [a.id], 'alter-b', at(9, 29, 2))).toHaveLength(1);
      // 翌日の朝5時からは記録できる
      expect(await recordScheduledIntakes(database, 'bedtime', [a.id], 'alter-b', at(9, 29, 5))).toHaveLength(1);
      expect(await remainingOf(a.id)).toBe(11);
    });

    it('時間帯の取り消しで、その時間帯の全部の薬が戻り、記録し直せる', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      const b = await addMedication(database, scheduled, 14, now);
      // b を飲んでいないのに記録してしまった
      await recordScheduledIntakes(database, 'bedtime', [a.id, b.id], 'alter-a', at(9, 28, 21));
      await undoScheduledIntakes(database, 'bedtime', '2026-09-28');
      // a だけで記録し直す
      expect(await recordScheduledIntakes(database, 'bedtime', [a.id], 'alter-a', at(9, 28, 21, 5))).toHaveLength(1);
      expect(await remainingOf(a.id)).toBe(13);
      expect(await remainingOf(b.id)).toBe(14);
    });

    it('取り消しは、その日のその時間帯だけ', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      await recordScheduledIntakes(database, 'bedtime', [a.id], null, at(9, 27, 21));
      await recordScheduledIntakes(database, 'morning', [a.id], null, at(9, 28, 8));
      await recordScheduledIntakes(database, 'bedtime', [a.id], null, at(9, 29, 1)); // 論理日 9/28
      expect(await undoScheduledIntakes(database, 'bedtime', '2026-09-28')).toBe(1);
      const left = (await database.medicationIntakes.toArray()).map((i) => i.takenAt).sort();
      expect(left).toEqual([at(9, 27, 21).toISOString(), at(9, 28, 8).toISOString()]);
      expect(await remainingOf(a.id)).toBe(12);
    });

    it('残りが1回分に足りないときも記録でき、0で止まる。取り消しで実際に減らした数だけ戻る', async () => {
      const a = await addMedication(database, scheduled, 0.5, now);
      const saved = await recordScheduledIntakes(database, 'morning', [a.id], 'alter-a', now);
      expect(saved?.[0].deducted).toBe(0.5);
      expect(await remainingOf(a.id)).toBe(0);
      // 残り0でも記録できる
      await recordScheduledIntakes(database, 'bedtime', [a.id], 'alter-a', at(9, 28, 21));
      expect(await remainingOf(a.id)).toBe(0);

      await undoScheduledIntakes(database, 'bedtime', '2026-09-28');
      expect(await remainingOf(a.id)).toBe(0);
      await undoScheduledIntakes(database, 'morning', '2026-09-28');
      expect(await remainingOf(a.id)).toBe(0.5);
    });

    it('記録後に数え直しても、取り消しは減らした数を足す', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      await recordScheduledIntakes(database, 'morning', [a.id], null, now);
      await recountMedication(database, a.id, 20, at(9, 28, 10));
      await undoScheduledIntakes(database, 'morning', '2026-09-28');
      expect(await remainingOf(a.id)).toBe(21);
    });
  });

  describe('頓服の記録', () => {
    it('何回でも記録でき、理由の前後の空白は取り除く', async () => {
      const p = await addMedication(database, asNeeded, 5, now);
      await recordAsNeededIntake(database, p.id, 'alter-a', ' 頭痛 ', at(9, 28, 9));
      await recordAsNeededIntake(database, p.id, null, '', at(9, 28, 10));
      const intakes = await database.medicationIntakes.orderBy('takenAt').toArray();
      expect(intakes.map((i) => [i.alterId, i.timing, i.reason, i.deducted])).toEqual([
        ['alter-a', null, '頭痛', 0.5],
        [null, null, '', 0.5],
      ]);
      expect(await remainingOf(p.id)).toBe(4);
    });

    it('1件ずつ取り消せて、残りが戻る', async () => {
      const p = await addMedication(database, asNeeded, 5, now);
      const first = await recordAsNeededIntake(database, p.id, null, '', at(9, 28, 9));
      await recordAsNeededIntake(database, p.id, null, '', at(9, 28, 10));
      expect(await undoAsNeededIntake(database, first?.id ?? '')).toBe(true);
      expect(await database.medicationIntakes.count()).toBe(1);
      expect(await remainingOf(p.id)).toBe(4.5);
    });

    it('決まった時間の記録は、1件ずつは取り消せない', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      const saved = await recordScheduledIntakes(database, 'morning', [a.id], null, now);
      expect(await undoAsNeededIntake(database, saved?.[0].id ?? '')).toBe(false);
      expect(await database.medicationIntakes.count()).toBe(1);
      expect(await remainingOf(a.id)).toBe(13);
    });

    it('薬が見つからないときは記録しない', async () => {
      expect(await recordAsNeededIntake(database, 'none', null, '', now)).toBeNull();
      expect(await database.medicationIntakes.count()).toBe(0);
    });
  });

  describe('削除', () => {
    it('服薬記録がない薬は削除でき、在庫の履歴も一緒に消える', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      const b = await addMedication(database, scheduled, 14, now);
      await refillMedication(database, a.id, 10, now);

      expect(await countMedicationIntakes(database, a.id)).toBe(0);
      expect(await deleteMedication(database, a.id)).toBe(true);
      expect(await database.medications.get(a.id)).toBeUndefined();
      // ほかの薬の履歴は残る
      expect((await database.stockLogs.toArray()).map((log) => log.medicationId)).toEqual([b.id]);
    });

    it('服薬記録がある薬は削除されない', async () => {
      const a = await addMedication(database, scheduled, 14, now);
      await recordScheduledIntakes(database, 'morning', [a.id], null, now);
      expect(await countMedicationIntakes(database, a.id)).toBe(1);
      expect(await deleteMedication(database, a.id)).toBe(false);
      expect(await database.medications.get(a.id)).toBeDefined();
      expect(await database.stockLogs.count()).toBe(1);
    });
  });
});
