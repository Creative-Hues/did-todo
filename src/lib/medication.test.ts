import { describe, expect, it } from 'vitest';
import {
  applyIntake,
  buildTimingSections,
  dailyDose,
  daysLeft,
  findLastAsNeeded,
  groupIntakesByLogicalDay,
  isLowStock,
  needsRecount,
  normalizeTimings,
  sortMedications,
  sortStockLogs,
  medicationKindLabel,
  stockLogAmountText,
  stockText,
  intakeLabelText,
  toLastAsNeededLabel,
  toYesterdayLabel,
} from './medication';
import type { Alter, Medication, MedicationIntake, MedicationTiming } from './types';

/** 2026年のローカル時刻を作る(month は 1〜12) */
function at(month: number, day: number, hour = 12, minute = 0): Date {
  return new Date(2026, month - 1, day, hour, minute);
}

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    name: '薬A',
    kind: 'scheduled',
    timings: ['morning', 'bedtime'],
    dosePerTake: 1,
    remaining: 14,
    status: 'active',
    order: 0,
    createdAt: at(9, 1).toISOString(),
    ...overrides,
  };
}

function intake(
  id: string,
  takenAt: Date,
  timing: MedicationTiming | null,
  overrides: Partial<MedicationIntake> = {},
): MedicationIntake {
  return {
    id,
    medicationId: 'med-1',
    alterId: 'alter-a',
    takenAt: takenAt.toISOString(),
    timing,
    deducted: 1,
    reason: '',
    ...overrides,
  };
}

describe('飲んだ記録で残りを減らす', () => {
  it('1回の錠数ぶん減る', () => {
    expect(applyIntake(14, 1)).toEqual({ remaining: 13, deducted: 1 });
    expect(applyIntake(3, 0.5)).toEqual({ remaining: 2.5, deducted: 0.5 });
  });

  it('1回分に足りないときは0で止まり、実際に減らした数だけ記録する', () => {
    expect(applyIntake(0.5, 1)).toEqual({ remaining: 0, deducted: 0.5 });
    expect(applyIntake(0, 1)).toEqual({ remaining: 0, deducted: 0 });
  });
});

describe('あと何日分', () => {
  it('1日の量 = 1回の錠数 × 時間帯の数', () => {
    expect(dailyDose(med({ dosePerTake: 0.5, timings: ['morning', 'noon', 'evening'] }))).toBe(1.5);
  });

  it('残り ÷ 1日の量 を切り捨てる', () => {
    expect(daysLeft(med({ remaining: 14 }))).toBe(7);
    expect(daysLeft(med({ remaining: 15 }))).toBe(7);
    expect(daysLeft(med({ remaining: 1 }))).toBe(0);
    expect(daysLeft(med({ remaining: 10, dosePerTake: 1.5, timings: ['morning'] }))).toBe(6);
  });

  it('頓服は出さない', () => {
    expect(daysLeft(med({ kind: 'asNeeded', timings: [] }))).toBeNull();
  });

  it('あと7日分以下で目立たせる', () => {
    expect(isLowStock(med({ remaining: 16 }))).toBe(false); // 8日分
    expect(isLowStock(med({ remaining: 15 }))).toBe(true); // 7日分
    expect(isLowStock(med({ kind: 'asNeeded', timings: [], remaining: 1 }))).toBe(false);
  });
});

describe('残りの数を確認してください', () => {
  it('残りが1回分未満のときだけ出す', () => {
    expect(needsRecount(med({ remaining: 1, dosePerTake: 1 }))).toBe(false);
    expect(needsRecount(med({ remaining: 0.5, dosePerTake: 1 }))).toBe(true);
    expect(needsRecount(med({ remaining: 0, dosePerTake: 0.5 }))).toBe(true);
  });
});

describe('並び順', () => {
  it('時間帯は朝食後→昼食後→夕食後→寝る前にそろえ、重なりを除く', () => {
    expect(normalizeTimings(['bedtime', 'morning', 'bedtime'])).toEqual(['morning', 'bedtime']);
  });

  it('使用中と中止に分け、order 順に並べる', () => {
    const result = sortMedications([
      med({ id: 'b', order: 2 }),
      med({ id: 's', order: 0, status: 'stopped' }),
      med({ id: 'a', order: 1 }),
    ]);
    expect(result.active.map((m) => m.id)).toEqual(['a', 'b']);
    expect(result.stopped.map((m) => m.id)).toEqual(['s']);
  });
});

describe('記録画面の時間帯の欄', () => {
  const now = at(9, 28, 21);

  it('使用中の決まった時間の薬がある時間帯だけ、決まった順に出す', () => {
    const sections = buildTimingSections(
      [
        med({ id: 'a', timings: ['bedtime', 'morning'] }),
        med({ id: 'b', timings: ['noon'], status: 'stopped' }),
        med({ id: 'c', kind: 'asNeeded', timings: [] }),
      ],
      [],
      now,
    );
    expect(sections.map((s) => s.timing)).toEqual(['morning', 'bedtime']);
    expect(sections[0].medications.map((m) => m.id)).toEqual(['a']);
  });

  it('今日(論理日)のその時間帯の記録だけを今日の記録にする', () => {
    const sections = buildTimingSections(
      [med()],
      [
        intake('today', at(9, 28, 21, 30), 'bedtime'),
        intake('yesterday', at(9, 27, 21, 30), 'bedtime'),
        intake('other-timing', at(9, 28, 8), 'morning'),
      ],
      now,
    );
    const bedtime = sections.find((s) => s.timing === 'bedtime');
    expect(bedtime?.todayIntakes.map((i) => i.id)).toEqual(['today']);
    expect(bedtime?.latestToday?.id).toBe('today');
  });

  it('夜中2時の「寝る前」の記録は、前の日の記録になる', () => {
    const sections = buildTimingSections([med()], [intake('late', at(9, 29, 2), 'bedtime')], at(9, 29, 4, 59));
    expect(sections.find((s) => s.timing === 'bedtime')?.todayIntakes.map((i) => i.id)).toEqual(['late']);
    const nextDay = buildTimingSections([med()], [intake('late', at(9, 29, 2), 'bedtime')], at(9, 29, 5));
    expect(nextDay.find((s) => s.timing === 'bedtime')?.todayIntakes).toEqual([]);
  });

  describe('昨日の結果', () => {
    const bedtimeOf = (medications: Medication[], intakes: MedicationIntake[], time: Date) =>
      buildTimingSections(medications, intakes, time).find((s) => s.timing === 'bedtime');

    it('昨日の最後の記録を出す', () => {
      const section = bedtimeOf(
        [med()],
        [intake('y1', at(9, 27, 21, 30), 'bedtime'), intake('y2', at(9, 27, 21, 40), 'bedtime')],
        now,
      );
      expect(section?.yesterday).toEqual({ kind: 'record', intake: expect.objectContaining({ id: 'y2' }) });
    });

    it('昨日の記録がなければ「記録なし」', () => {
      expect(bedtimeOf([med()], [intake('old', at(9, 26, 21), 'bedtime')], now)?.yesterday).toEqual({
        kind: 'noRecord',
      });
    });

    it('朝5時の境界:昨日の4:59までの記録は昨日、5:00からは今日', () => {
      // 9/28 4:59 は論理日 9/27(= 9/28 21時から見て昨日)
      expect(bedtimeOf([med()], [intake('x', at(9, 28, 4, 59), 'bedtime')], now)?.yesterday.kind).toBe('record');
      // 9/28 5:00 は今日の記録なので、昨日は記録なし
      expect(bedtimeOf([med()], [intake('x', at(9, 28, 5, 0), 'bedtime')], now)?.yesterday.kind).toBe('noRecord');
    });

    it('その時間帯の薬がすべて今日登録したものなら何も出さない', () => {
      const newMed = med({ createdAt: at(9, 28, 5).toISOString() });
      expect(bedtimeOf([newMed], [], now)?.yesterday).toEqual({ kind: 'none' });
      // 今日の4:59に登録した薬は「昨日」に登録したもの
      const earlier = med({ createdAt: at(9, 28, 4, 59).toISOString() });
      expect(bedtimeOf([earlier], [], now)?.yesterday).toEqual({ kind: 'noRecord' });
      // 1つでも前からある薬があれば出す
      expect(bedtimeOf([newMed, med({ id: 'old' })], [], now)?.yesterday).toEqual({ kind: 'noRecord' });
    });
  });
});

describe('頓服の前回の記録', () => {
  it('その薬の頓服の記録のうち、最後のもの', () => {
    const intakes = [
      intake('a1', at(9, 27, 10), null),
      intake('a2', at(9, 28, 9), null),
      intake('other', at(9, 28, 11), null, { medicationId: 'med-2' }),
    ];
    expect(findLastAsNeeded('med-1', intakes)?.id).toBe('a2');
    expect(findLastAsNeeded('med-3', intakes)).toBeNull();
  });
});

describe('記録の一覧(論理日ごと)', () => {
  it('新しい日が上。決まった時間は時間帯ごとにまとめ、頓服は1件ずつ。1日の中も新しい順', () => {
    const days = groupIntakesByLogicalDay([
      intake('m1', at(9, 27, 8), 'morning'),
      intake('m2', at(9, 27, 8, 1), 'morning', { medicationId: 'med-2' }),
      intake('p1', at(9, 27, 15), null, { reason: '頭痛' }),
      intake('b1', at(9, 28, 2), 'bedtime'), // 朝5時前なので 9/27 の記録
      intake('m3', at(9, 28, 8), 'morning'),
    ]);
    expect(days.map((d) => d.logicalDate)).toEqual(['2026-09-28', '2026-09-27']);
    const day27 = days[1].entries.map((e) =>
      e.kind === 'scheduled' ? `${e.timing}:${e.intakes.map((i) => i.id).join(',')}` : `頓服:${e.intake.id}`,
    );
    expect(day27).toEqual(['bedtime:b1', '頓服:p1', 'morning:m1,m2']);
  });

  it('記録がなければ空', () => {
    expect(groupIntakesByLogicalDay([])).toEqual([]);
  });
});

describe('表示の文言', () => {
  it('飲み方:決まった時間は時間帯を決まった順で、頓服は「頓服」', () => {
    expect(medicationKindLabel(med({ timings: ['bedtime', 'morning'] }))).toBe('決まった時間・朝食後/寝る前');
    expect(medicationKindLabel(med({ kind: 'asNeeded', timings: [] }))).toBe('頓服');
  });

  it('残り:決まった時間は「残り14錠・あと7日分」、頓服は「残り○錠」', () => {
    expect(stockText(med({ remaining: 14 }))).toBe('残り14錠・あと7日分');
    expect(stockText(med({ remaining: 13.5 }))).toBe('残り13.5錠・あと6日分');
    expect(stockText(med({ kind: 'asNeeded', timings: [], remaining: 3 }))).toBe('残り3錠');
  });

  it('在庫の履歴:補充は「+」を付け、新しい順に並べる', () => {
    expect(stockLogAmountText({ kind: 'refill', amount: 28 })).toBe('+28錠');
    expect(stockLogAmountText({ kind: 'recount', amount: 29.5 })).toBe('29.5錠');
    expect(stockLogAmountText({ kind: 'initial', amount: 14 })).toBe('14錠');
    const logs = sortStockLogs([
      { id: 'a', medicationId: 'm', kind: 'initial', amount: 1, at: at(9, 1).toISOString() },
      { id: 'b', medicationId: 'm', kind: 'refill', amount: 1, at: at(9, 20).toISOString() },
      { id: 'c', medicationId: 'm', kind: 'recount', amount: 1, at: at(9, 10).toISOString() },
    ]);
    expect(logs.map((log) => log.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('記録画面の表示', () => {
  const alterA = { id: 'alter-a', name: '人格A', color: '#4a90d9' } as Alter;
  const alterById = new Map([[alterA.id, alterA]]);

  it('完了表示は「人格A・21:30」、人格が「わからない」ときは「わからない・21:30」', () => {
    expect(intakeLabelText(intake('i', at(9, 28, 21, 30), 'bedtime'), alterById)).toBe('人格A・21:30');
    expect(intakeLabelText(intake('i', at(9, 28, 21, 30), 'bedtime', { alterId: null }), alterById)).toBe(
      'わからない・21:30',
    );
  });

  it('昨日の表示:記録ありは「昨日:人格A・21:40」、なしは「昨日は記録なし」、none は出さない', () => {
    expect(toYesterdayLabel({ kind: 'record', intake: intake('i', at(9, 27, 21, 40), 'bedtime') }, alterById)).toEqual({
      kind: 'record',
      prefix: '昨日',
      name: '人格A',
      color: '#4a90d9',
      time: '21:40',
    });
    expect(toYesterdayLabel({ kind: 'noRecord' }, alterById)).toEqual({ kind: 'missing', text: '昨日は記録なし' });
    expect(toYesterdayLabel({ kind: 'none' }, alterById)).toBeNull();
  });

  it('頓服の前回:「前回:人格A・3時間前」、記録がなければ出さない', () => {
    const last = intake('i', at(9, 28, 9), null);
    expect(toLastAsNeededLabel(last, at(9, 28, 12, 30), alterById)).toEqual({
      kind: 'record',
      prefix: '前回',
      name: '人格A',
      color: '#4a90d9',
      time: '3時間前',
    });
    expect(toLastAsNeededLabel(null, at(9, 28, 12), alterById)).toBeNull();
  });
});
