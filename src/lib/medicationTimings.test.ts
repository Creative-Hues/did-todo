import { describe, expect, it } from 'vitest';
import {
  UNKNOWN_TIMING_NAME,
  buildInitialMedicationTimings,
  isDuplicateTimingName,
  selectableTimingsFor,
  sortTimingsByOrder,
  timingNameOf,
} from './medicationTimings';

const createdAt = '2026-09-28T00:00:00.000Z';

describe('服薬の時間帯の一覧(SPEC.md 7.8)', () => {
  it('最初の4つは、それまで薬と服薬記録に入っていた値をそのまま ID にする', () => {
    expect(buildInitialMedicationTimings(createdAt)).toEqual([
      { id: 'morning', name: '朝食後', hidden: false, order: 0, createdAt },
      { id: 'noon', name: '昼食後', hidden: false, order: 1, createdAt },
      { id: 'evening', name: '夕食後', hidden: false, order: 2, createdAt },
      { id: 'bedtime', name: '寝る前', hidden: false, order: 3, createdAt },
    ]);
  });

  it('非表示のものも含めて並び順に並べる', () => {
    const list = buildInitialMedicationTimings(createdAt).map((t) =>
      t.id === 'bedtime' ? { ...t, order: -1, hidden: true } : t,
    );
    expect(sortTimingsByOrder(list).map((t) => t.id)).toEqual(['bedtime', 'morning', 'noon', 'evening']);
  });

  it('名前を引く。見つからないときは「(不明な時間帯)」', () => {
    const byId = new Map(buildInitialMedicationTimings(createdAt).map((t) => [t.id, t]));
    expect(timingNameOf('bedtime', byId)).toBe('寝る前');
    expect(timingNameOf('unknown', byId)).toBe(UNKNOWN_TIMING_NAME);
  });

  it('同じ名前の判定:非表示のものとも比べ、自分自身は除く', () => {
    const list = buildInitialMedicationTimings(createdAt).map((t) => (t.id === 'noon' ? { ...t, hidden: true } : t));
    expect(isDuplicateTimingName('昼食後', list)).toBe(true);
    expect(isDuplicateTimingName('朝食前', list)).toBe(false);
    expect(isDuplicateTimingName('昼食後', list, 'noon')).toBe(false);
  });
});

describe('薬の登録・編集で選べる時間帯', () => {
  const list = buildInitialMedicationTimings(createdAt).map((t) =>
    t.id === 'noon' || t.id === 'evening' ? { ...t, hidden: true } : t,
  );

  it('登録のときは、非表示でない時間帯だけを並び順で出す', () => {
    expect(selectableTimingsFor(list, []).map((t) => t.id)).toEqual(['morning', 'bedtime']);
  });

  it('編集のときは、その薬がすでに使っている非表示の時間帯も出す(外せるように)', () => {
    expect(selectableTimingsFor(list, ['noon', 'bedtime']).map((t) => t.id)).toEqual(['morning', 'noon', 'bedtime']);
  });
});
