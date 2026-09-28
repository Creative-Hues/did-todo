// 服薬の時間帯の一覧(SPEC.md 7.8)。すべて純粋関数。
import type { MedicationTiming, MedicationTimingId } from './types';
import { isDuplicateName } from './validation';

/**
 * 最初の4つの時間帯(SPEC.md 3.5・7.8)。
 * ID は、時間帯を自分で作れるようになる前から薬・服薬記録に入っていた値をそのまま使う。
 * これで、薬と服薬記録のデータを書き換えずに引き継げる(この ID は変えないこと)
 */
export const DEFAULT_MEDICATION_TIMINGS: readonly { id: MedicationTimingId; name: string }[] = [
  { id: 'morning', name: '朝食後' },
  { id: 'noon', name: '昼食後' },
  { id: 'evening', name: '夕食後' },
  { id: 'bedtime', name: '寝る前' },
];

/** 最初の4つの時間帯を作る(データベースの版上げ・新規インストール・古いバックアップの読み込みで使う) */
export function buildInitialMedicationTimings(createdAt: string): MedicationTiming[] {
  return DEFAULT_MEDICATION_TIMINGS.map(({ id, name }, index) => ({ id, name, hidden: false, order: index, createdAt }));
}

/** 時間帯が見つからないときの表示名(ふつうは起きない。使っている時間帯は削除できないため) */
export const UNKNOWN_TIMING_NAME = '(不明な時間帯)';

/** 非表示のものも含めて、並び順(記録画面の欄の順番)に並べる */
export function sortTimingsByOrder(timings: readonly MedicationTiming[]): MedicationTiming[] {
  return [...timings].sort((a, b) => a.order - b.order);
}

/** 時間帯の名前。見つからないときは「(不明な時間帯)」 */
export function timingNameOf(id: MedicationTimingId, timingById: ReadonlyMap<string, MedicationTiming>): string {
  return timingById.get(id)?.name ?? UNKNOWN_TIMING_NAME;
}

/**
 * 同じ名前の時間帯がほかにあるか(非表示のものとも比べる。SPEC.md 7.8)
 * @param name normalizeName 済みの名前
 * @param exceptId 名前を変えている時間帯自身のID(追加のときは渡さない)
 */
export function isDuplicateTimingName(
  name: string,
  timings: readonly MedicationTiming[],
  exceptId?: MedicationTimingId,
): boolean {
  return isDuplicateName(name, timings, exceptId);
}

/**
 * 薬の登録・編集で選択肢に出す時間帯を、一覧の並び順で返す(SPEC.md 7.8)。
 * 非表示でない時間帯に加えて、その薬がすでに使っている非表示の時間帯も出す(チェックを外して欄をなくせるように)
 * @param savedIds 編集する薬に保存されている時間帯のID(登録のときは空)。
 *   チェックを外しても選択肢から消えないよう、入力中の値ではなく保存されている値を渡す
 */
export function selectableTimingsFor(
  timingList: readonly MedicationTiming[],
  savedIds: readonly MedicationTimingId[],
): MedicationTiming[] {
  return sortTimingsByOrder(timingList).filter((timing) => !timing.hidden || savedIds.includes(timing.id));
}
