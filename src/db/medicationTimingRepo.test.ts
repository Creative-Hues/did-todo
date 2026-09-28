// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import { addMedication, recordScheduledIntakes } from './medicationRepo';
import {
  addMedicationTiming,
  countMedicationTimingUsage,
  deleteMedicationTiming,
  renameMedicationTiming,
  reorderMedicationTimings,
  setMedicationTimingHidden,
} from './medicationTimingRepo';

describe('服薬の時間帯の保存(SPEC.md 7.8)', () => {
  let database: AppDatabase;
  const now = new Date(2026, 8, 28, 9, 0);

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-timings');
  });

  afterEach(async () => {
    await database.delete();
  });

  const names = async () => (await database.medicationTimings.orderBy('order').toArray()).map((t) => t.name);

  it('最初は4つ入っていて、追加した時間帯は一覧の最後に入る', async () => {
    expect(await names()).toEqual(['朝食後', '昼食後', '夕食後', '寝る前']);
    const result = await addMedicationTiming(database, '朝食前', now);
    expect(result).toEqual({
      ok: true,
      timing: { id: expect.any(String), name: '朝食前', hidden: false, order: 4, createdAt: now.toISOString() },
    });
    expect(await names()).toEqual(['朝食後', '昼食後', '夕食後', '寝る前', '朝食前']);
  });

  it('同じ名前の時間帯は追加できない(非表示のものとも比べる)', async () => {
    expect(await addMedicationTiming(database, '朝食後', now)).toEqual({ ok: false, reason: 'duplicateName' });
    await setMedicationTimingHidden(database, 'noon', true);
    expect(await addMedicationTiming(database, '昼食後', now)).toEqual({ ok: false, reason: 'duplicateName' });
    expect(await database.medicationTimings.count()).toBe(4);
  });

  it('名前を変えられる。ほかと同じ名前には変えられないが、自分と同じ名前はそのまま保存できる', async () => {
    expect((await renameMedicationTiming(database, 'noon', '食間'))?.ok).toBe(true);
    expect(await renameMedicationTiming(database, 'evening', '食間')).toEqual({ ok: false, reason: 'duplicateName' });
    expect((await renameMedicationTiming(database, 'evening', '夕食後'))?.ok).toBe(true);
    expect(await names()).toEqual(['朝食後', '食間', '夕食後', '寝る前']);
    expect(await renameMedicationTiming(database, 'none', '朝食前')).toBeNull();
  });

  it('非表示と再表示ができる', async () => {
    await setMedicationTimingHidden(database, 'noon', true);
    expect((await database.medicationTimings.get('noon'))?.hidden).toBe(true);
    await setMedicationTimingHidden(database, 'noon', false);
    expect((await database.medicationTimings.get('noon'))?.hidden).toBe(false);
  });

  it('並べ替えた順番で保存される', async () => {
    const added = await addMedicationTiming(database, '朝食前', now);
    const id = added.ok ? added.timing.id : '';
    await reorderMedicationTimings(database, [id, 'morning', 'noon', 'evening', 'bedtime']);
    expect(await names()).toEqual(['朝食前', '朝食後', '昼食後', '夕食後', '寝る前']);
  });

  describe('削除', () => {
    const noonMedication = { name: '薬A', kind: 'scheduled' as const, timings: ['noon'], dosePerTake: 1 };

    it('使っている薬も服薬記録もない時間帯は削除できる', async () => {
      expect(await countMedicationTimingUsage(database, 'noon')).toEqual({ medications: 0, intakes: 0 });
      expect(await deleteMedicationTiming(database, 'noon')).toBe(true);
      expect(await names()).toEqual(['朝食後', '夕食後', '寝る前']);
    });

    it('中止した薬が使っている時間帯は削除できない', async () => {
      const med = await addMedication(database, noonMedication, 10, now);
      await database.medications.update(med.id, { status: 'stopped' });
      expect(await countMedicationTimingUsage(database, 'noon')).toEqual({ medications: 1, intakes: 0 });
      expect(await deleteMedicationTiming(database, 'noon')).toBe(false);
      expect(await database.medicationTimings.get('noon')).toBeDefined();
    });

    it('服薬記録だけが残っている時間帯も削除できない', async () => {
      const med = await addMedication(database, noonMedication, 10, now);
      await recordScheduledIntakes(database, 'noon', [med.id], null, now);
      // 薬からはその時間帯を外した
      await database.medications.update(med.id, { timings: ['morning'] });
      expect(await countMedicationTimingUsage(database, 'noon')).toEqual({ medications: 0, intakes: 1 });
      expect(await deleteMedicationTiming(database, 'noon')).toBe(false);
    });
  });
});
