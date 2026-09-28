// 服薬の時間帯の保存・更新・削除(SPEC.md 7.8)
import type { AppDatabase } from './db';
import { isDuplicateTimingName } from '../lib/medicationTimings';
import { nextOrder, reorderSubset } from '../lib/ordering';
import type { MedicationTiming } from '../lib/types';

/** 追加・名前の変更の結果。同じ名前の時間帯があるときは保存しない */
export type SaveTimingResult = { ok: true; timing: MedicationTiming } | { ok: false; reason: 'duplicateName' };

/**
 * 時間帯を一覧の最後に追加する。
 * 同じ名前の時間帯(非表示のものも含む)があれば追加しない
 * @param name normalizeName 済みの名前
 */
export async function addMedicationTiming(database: AppDatabase, name: string, now: Date): Promise<SaveTimingResult> {
  return database.transaction('rw', database.medicationTimings, async () => {
    const all = await database.medicationTimings.toArray();
    if (isDuplicateTimingName(name, all)) {
      return { ok: false, reason: 'duplicateName' } as const;
    }
    const timing: MedicationTiming = {
      id: crypto.randomUUID(),
      name,
      hidden: false,
      order: nextOrder(all),
      createdAt: now.toISOString(),
    };
    await database.medicationTimings.add(timing);
    return { ok: true, timing } as const;
  });
}

/**
 * 時間帯の名前を変える(記録画面・記録の一覧の名前も変わる)。
 * ほかに同じ名前の時間帯があれば変えない。時間帯が見つからないときは何もしない
 * @param name normalizeName 済みの名前
 */
export async function renameMedicationTiming(
  database: AppDatabase,
  id: string,
  name: string,
): Promise<SaveTimingResult | null> {
  return database.transaction('rw', database.medicationTimings, async () => {
    const all = await database.medicationTimings.toArray();
    const target = all.find((timing) => timing.id === id);
    if (!target) {
      return null;
    }
    if (isDuplicateTimingName(name, all, id)) {
      return { ok: false, reason: 'duplicateName' } as const;
    }
    await database.medicationTimings.update(id, { name });
    return { ok: true, timing: { ...target, name } } as const;
  });
}

/** 非表示/再表示を切り替える(非表示の時間帯は、薬の登録で新しく選べなくなる) */
export async function setMedicationTimingHidden(database: AppDatabase, id: string, hidden: boolean): Promise<void> {
  await database.medicationTimings.update(id, { hidden });
}

/**
 * 時間帯を並べ替える(記録画面の欄の順番になる)。
 * @param orderedIds 並べ替えた後の順番に並んだ時間帯のID(対象でない時間帯の順番は変えない)
 */
export async function reorderMedicationTimings(database: AppDatabase, orderedIds: readonly string[]): Promise<void> {
  await database.transaction('rw', database.medicationTimings, async () => {
    const changes = reorderSubset(await database.medicationTimings.toArray(), orderedIds);
    for (const change of changes) {
      await database.medicationTimings.update(change.id, { order: change.order });
    }
  });
}

/** その時間帯を使っている薬(中止した薬も含む)と、服薬記録の件数 */
export async function countMedicationTimingUsage(
  database: AppDatabase,
  id: string,
): Promise<{ medications: number; intakes: number }> {
  const [medications, intakes] = await Promise.all([
    database.medications.filter((medication) => medication.timings.includes(id)).count(),
    database.medicationIntakes.filter((intake) => intake.timing === id).count(),
  ]);
  return { medications, intakes };
}

/**
 * 時間帯を削除する。使っている薬(中止した薬も含む)か服薬記録が1件でもあれば削除せず false を返す
 * (削除したら true。SPEC.md 7.8)
 */
export async function deleteMedicationTiming(database: AppDatabase, id: string): Promise<boolean> {
  const tables = [database.medicationTimings, database.medications, database.medicationIntakes];
  return database.transaction('rw', tables, async () => {
    const usage = await countMedicationTimingUsage(database, id);
    if (usage.medications > 0 || usage.intakes > 0) {
      return false;
    }
    await database.medicationTimings.delete(id);
    return true;
  });
}
