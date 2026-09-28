// 薬の登録・編集フォームの入力チェック(SPEC.md 7.1)。純粋関数。
import type { MedicationInput } from '../db/medicationRepo';
import { normalizeTimings } from './medication';
import { normalizeName, parseDosePerTake, parseStockCount } from './validation';
import type { Medication, MedicationTiming, MedicationTimingId } from './types';

/** フォームに入っている値(入力欄の文字のまま) */
export interface MedicationFormValues {
  name: string;
  kind: Medication['kind'];
  /** チェックした時間帯のID(頓服のときは見ない) */
  timings: readonly MedicationTimingId[];
  doseText: string;
  /** 残りの錠数の入力。編集のとき(入力欄を出さない)は null */
  remainingText: string | null;
}

export type MedicationFormResult =
  | {
      ok: true;
      input: MedicationInput;
      /** 登録のときの残りの錠数(編集のときは null) */
      remaining: number | null;
    }
  | { ok: false; error: string };

/**
 * 入力をチェックする。
 * 時間帯のチェックは「決まった時間」のときだけ行い、頓服のときは時間帯を空にする
 * @param timingList 時間帯の一覧(非表示のものも含む。並び順をそろえるのに使う)
 */
export function validateMedicationForm(
  values: MedicationFormValues,
  timingList: readonly MedicationTiming[],
): MedicationFormResult {
  const name = normalizeName(values.name);
  if (name === null) {
    return { ok: false, error: '薬の名前を入力してください' };
  }
  const timings = values.kind === 'scheduled' ? normalizeTimings(values.timings, timingList) : [];
  if (values.kind === 'scheduled' && timings.length === 0) {
    return { ok: false, error: '時間帯を1つ以上選んでください' };
  }
  const dosePerTake = parseDosePerTake(values.doseText);
  if (dosePerTake === null) {
    return { ok: false, error: '1回の錠数は0.5錠単位で、0.5以上の数を入力してください' };
  }
  let remaining: number | null = null;
  if (values.remainingText !== null) {
    remaining = parseStockCount(values.remainingText);
    if (remaining === null) {
      return { ok: false, error: '残りの錠数は0.5錠単位で、0以上の数を入力してください' };
    }
  }
  return { ok: true, input: { name, kind: values.kind, timings, dosePerTake }, remaining };
}
