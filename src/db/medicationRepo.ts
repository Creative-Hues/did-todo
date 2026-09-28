// 薬・服薬記録・在庫の履歴の保存(SPEC.md 7章)
import type { AppDatabase } from './db';
import { applyIntake, findTimingIntakes, normalizeTimings } from '../lib/medication';
import { nextOrder, reorderSubset } from '../lib/ordering';
import { addLogicalDays, startOfLogicalDate, toLogicalDate, type LogicalDate } from '../lib/period';
import type { Medication, MedicationIntake, MedicationTiming, StockLog } from '../lib/types';

/** 薬の入力内容(名前は normalizeName 済み、錠数は parseTabletCount 済みのもの) */
export interface MedicationInput {
  name: string;
  kind: Medication['kind'];
  /** 決まった時間のときの時間帯(頓服のときは無視する) */
  timings: MedicationTiming[];
  dosePerTake: number;
}

/** 頓服なら時間帯を空にし、決まった時間なら時間帯を並び順にそろえる */
function toStoredFields(input: MedicationInput): Pick<Medication, 'name' | 'kind' | 'timings' | 'dosePerTake'> {
  return {
    name: input.name,
    kind: input.kind,
    timings: input.kind === 'scheduled' ? normalizeTimings(input.timings) : [],
    dosePerTake: input.dosePerTake,
  };
}

function stockLogOf(medicationId: string, kind: StockLog['kind'], amount: number, now: Date): StockLog {
  return { id: crypto.randomUUID(), medicationId, kind, amount, at: now.toISOString() };
}

/**
 * 薬を一覧の最後に追加する。登録したときの錠数を、在庫の履歴に「登録」として残す(SPEC.md 7.2)
 * @param remaining 登録したときの残りの錠数
 */
export async function addMedication(
  database: AppDatabase,
  input: MedicationInput,
  remaining: number,
  now: Date,
): Promise<Medication> {
  return database.transaction('rw', [database.medications, database.stockLogs], async () => {
    const medication: Medication = {
      id: crypto.randomUUID(),
      ...toStoredFields(input),
      remaining,
      status: 'active',
      order: nextOrder(await database.medications.toArray()),
      createdAt: now.toISOString(),
    };
    await database.medications.add(medication);
    await database.stockLogs.add(stockLogOf(medication.id, 'initial', remaining, now));
    return medication;
  });
}

/** 名前・飲み方・時間帯・1回の錠数を変更する(残りは補充・数え直しでだけ変える) */
export async function updateMedication(database: AppDatabase, id: string, input: MedicationInput): Promise<void> {
  await database.medications.update(id, toStoredFields(input));
}

/** 中止/再開を切り替える(SPEC.md 7.7) */
export async function setMedicationStatus(
  database: AppDatabase,
  id: string,
  status: Medication['status'],
): Promise<void> {
  await database.medications.update(id, { status });
}

/**
 * 薬を並べ替える。
 * @param orderedIds 並べ替えた後の順番に並んだ薬のID(対象でない薬の順番は変えない)
 */
export async function reorderMedications(database: AppDatabase, orderedIds: readonly string[]): Promise<void> {
  await database.transaction('rw', database.medications, async () => {
    const changes = reorderSubset(await database.medications.toArray(), orderedIds);
    for (const change of changes) {
      await database.medications.update(change.id, { order: change.order });
    }
  });
}

/** その薬の服薬記録の件数 */
export async function countMedicationIntakes(database: AppDatabase, id: string): Promise<number> {
  return database.medicationIntakes.where('medicationId').equals(id).count();
}

/**
 * 薬を削除し、その薬の在庫の履歴も消す。
 * 服薬記録が1件でもある薬は削除せず false を返す(削除したら true。SPEC.md 7.7)
 */
export async function deleteMedication(database: AppDatabase, id: string): Promise<boolean> {
  return database.transaction(
    'rw',
    [database.medications, database.medicationIntakes, database.stockLogs],
    async () => {
      if ((await countMedicationIntakes(database, id)) > 0) {
        return false;
      }
      await database.medications.delete(id);
      await database.stockLogs.where('medicationId').equals(id).delete();
      return true;
    },
  );
}

/**
 * 補充:もらってきた錠数を残りに足し、履歴に残す(SPEC.md 7.2)。
 * 薬が見つからないときは何もしない
 */
export async function refillMedication(database: AppDatabase, id: string, amount: number, now: Date): Promise<void> {
  await database.transaction('rw', [database.medications, database.stockLogs], async () => {
    const medication = await database.medications.get(id);
    if (!medication) {
      return;
    }
    await database.medications.update(id, { remaining: medication.remaining + amount });
    await database.stockLogs.add(stockLogOf(id, 'refill', amount, now));
  });
}

/**
 * 数え直し:実際に数えた数に残りを直し、履歴に残す(SPEC.md 7.2)。
 * 薬が見つからないときは何もしない
 */
export async function recountMedication(database: AppDatabase, id: string, amount: number, now: Date): Promise<void> {
  await database.transaction('rw', [database.medications, database.stockLogs], async () => {
    if (!(await database.medications.get(id))) {
      return;
    }
    await database.medications.update(id, { remaining: amount });
    await database.stockLogs.add(stockLogOf(id, 'recount', amount, now));
  });
}

/** その論理日に飲んだ記録(takenAt の範囲で取り出す) */
async function intakesOnLogicalDate(database: AppDatabase, logicalDate: LogicalDate): Promise<MedicationIntake[]> {
  const start = startOfLogicalDate(logicalDate).toISOString();
  const end = startOfLogicalDate(addLogicalDays(logicalDate, 1)).toISOString();
  return database.medicationIntakes.where('takenAt').between(start, end, true, false).toArray();
}

/**
 * 飲んだ記録を1件足し、残りを減らす(残りが足りなければ0で止める)。
 * 薬が見つからないときは記録しない
 */
async function addIntake(
  database: AppDatabase,
  medicationId: string,
  fields: Pick<MedicationIntake, 'alterId' | 'timing' | 'reason'>,
  now: Date,
): Promise<MedicationIntake | null> {
  const medication = await database.medications.get(medicationId);
  if (!medication) {
    return null;
  }
  const { remaining, deducted } = applyIntake(medication.remaining, medication.dosePerTake);
  const intake: MedicationIntake = {
    id: crypto.randomUUID(),
    medicationId,
    takenAt: now.toISOString(),
    deducted,
    ...fields,
  };
  await database.medications.update(medicationId, { remaining });
  await database.medicationIntakes.add(intake);
  return intake;
}

/** 記録を消し、それぞれ実際に減らした数だけ残りを戻す(薬が削除済みなら戻さない) */
async function removeIntakes(database: AppDatabase, intakes: readonly MedicationIntake[]): Promise<void> {
  for (const intake of intakes) {
    const medication = await database.medications.get(intake.medicationId);
    if (medication) {
      await database.medications.update(medication.id, { remaining: medication.remaining + intake.deducted });
    }
  }
  await database.medicationIntakes.bulkDelete(intakes.map((i) => i.id));
}

/**
 * 決まった時間の薬を、時間帯ごとにまとめて記録する(SPEC.md 7.4)。
 * 同じ論理日の同じ時間帯に記録があれば、記録せず null を返す。
 * @param medicationIds シートでチェックした薬のID
 * @param alterId 飲んだ人格のID。「わからない」は null
 * @param now 現在時刻(記録する時刻)
 */
export async function recordScheduledIntakes(
  database: AppDatabase,
  timing: MedicationTiming,
  medicationIds: readonly string[],
  alterId: string | null,
  now: Date,
): Promise<MedicationIntake[] | null> {
  return database.transaction('rw', [database.medications, database.medicationIntakes], async () => {
    const today = toLogicalDate(now);
    if (findTimingIntakes(await intakesOnLogicalDate(database, today), timing, today).length > 0) {
      return null;
    }
    const saved: MedicationIntake[] = [];
    for (const medicationId of new Set(medicationIds)) {
      const intake = await addIntake(database, medicationId, { alterId, timing, reason: '' }, now);
      if (intake) {
        saved.push(intake);
      }
    }
    return saved;
  });
}

/**
 * 決まった時間の記録を、時間帯ごとにまとめて取り消し、残りを戻す(SPEC.md 7.4)。
 * 薬1つずつは取り消さない(1つだけ消すと「記録済み」のまま記録し直せなくなるため)。
 * @param logicalDate 取り消す日(記録画面からは今日、記録の一覧からはその日)
 * @returns 取り消した記録の件数
 */
export async function undoScheduledIntakes(
  database: AppDatabase,
  timing: MedicationTiming,
  logicalDate: LogicalDate,
): Promise<number> {
  return database.transaction('rw', [database.medications, database.medicationIntakes], async () => {
    const targets = findTimingIntakes(await intakesOnLogicalDate(database, logicalDate), timing, logicalDate);
    await removeIntakes(database, targets);
    return targets.length;
  });
}

/**
 * 頓服を記録する。何回でも記録できる(SPEC.md 7.5)。
 * 薬が見つからないときは記録せず null を返す
 * @param reason 飲んだ理由(空欄可。前後の空白は取り除く)
 */
export async function recordAsNeededIntake(
  database: AppDatabase,
  medicationId: string,
  alterId: string | null,
  reason: string,
  now: Date,
): Promise<MedicationIntake | null> {
  return database.transaction('rw', [database.medications, database.medicationIntakes], async () =>
    addIntake(database, medicationId, { alterId, timing: null, reason: reason.trim() }, now),
  );
}

/**
 * 頓服の記録を1件取り消し、残りを戻す(記録の一覧から。SPEC.md 7.5)。
 * 決まった時間の記録は、ここでは取り消さない(false を返す)
 */
export async function undoAsNeededIntake(database: AppDatabase, intakeId: string): Promise<boolean> {
  return database.transaction('rw', [database.medications, database.medicationIntakes], async () => {
    const intake = await database.medicationIntakes.get(intakeId);
    if (!intake || intake.timing !== null) {
      return false;
    }
    await removeIntakes(database, [intake]);
    return true;
  });
}
