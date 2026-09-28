import { describe, expect, it } from 'vitest';
import { validateMedicationForm, type MedicationFormValues } from './medicationForm';
import { buildInitialMedicationTimings } from './medicationTimings';

/** 最初の4つの時間帯 */
const TIMING_LIST = buildInitialMedicationTimings('2026-09-01T00:00:00.000Z');

/** 最初の4つの時間帯でチェックする */
function validate(values: MedicationFormValues) {
  return validateMedicationForm(values, TIMING_LIST);
}

const base: MedicationFormValues = {
  name: '薬A',
  kind: 'scheduled',
  timings: ['bedtime', 'morning'],
  doseText: '1',
  remainingText: '14',
};

describe('薬のフォームの入力チェック', () => {
  it('正しい入力なら、時間帯を決まった順にそろえて返す', () => {
    expect(validate(base)).toEqual({
      ok: true,
      input: { name: '薬A', kind: 'scheduled', timings: ['morning', 'bedtime'], dosePerTake: 1 },
      remaining: 14,
    });
  });

  it('決まった時間で時間帯が0個なら「時間帯を1つ以上選んでください」', () => {
    expect(validate({ ...base, timings: [] })).toEqual({
      ok: false,
      error: '時間帯を1つ以上選んでください',
    });
  });

  it('頓服は時間帯を選ばなくても保存でき、時間帯のエラーは出ない', () => {
    expect(validate({ ...base, kind: 'asNeeded', timings: [] })).toEqual({
      ok: true,
      input: { name: '薬A', kind: 'asNeeded', timings: [], dosePerTake: 1 },
      remaining: 14,
    });
  });

  it('頓服に切り替える前に選んでいた時間帯は、頓服では保存しない', () => {
    const result = validate({ ...base, kind: 'asNeeded' });
    expect(result.ok && result.input.timings).toEqual([]);
  });

  it('名前が空ならエラー', () => {
    expect(validate({ ...base, name: '  ' })).toEqual({ ok: false, error: '薬の名前を入力してください' });
  });

  it('1回の錠数は0.5錠単位で0.5以上', () => {
    const error = '1回の錠数は0.5錠単位で、0.5以上の数を入力してください';
    expect(validate({ ...base, doseText: '1.3' })).toEqual({ ok: false, error });
    expect(validate({ ...base, doseText: '0' })).toEqual({ ok: false, error });
    expect(validate({ ...base, doseText: '0.5' }).ok).toBe(true);
  });

  it('残りの錠数は登録のときだけ見る(0.5錠単位で0以上)', () => {
    const error = '残りの錠数は0.5錠単位で、0以上の数を入力してください';
    expect(validate({ ...base, remainingText: '1.3' })).toEqual({ ok: false, error });
    expect(validate({ ...base, remainingText: '' })).toEqual({ ok: false, error });
    expect(validate({ ...base, remainingText: '0' }).ok).toBe(true);
    // 編集のときは入力欄がないので見ない
    const edited = validate({ ...base, remainingText: null });
    expect(edited.ok && edited.remaining).toBeNull();
  });
});
