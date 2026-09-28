// 服薬の計算(SPEC.md 7章)。すべて純粋関数(同じ入力なら同じ結果)。
// 日付の計算は period.ts の関数を通す。現在時刻は引数で受け取る。
import { resolveRecordAlter } from './completionLabel';
import { addLogicalDays, startOfLogicalDate, toLogicalDate, type LogicalDate } from './period';
import type { PreviousPeriodLabel } from './previousPeriod';
import { formatClockOf, formatElapsed } from './timeFormat';
import type { Alter, Medication, MedicationIntake, MedicationTiming, StockLog } from './types';

/** 時間帯の並び順(画面の上から) */
export const TIMINGS: readonly MedicationTiming[] = ['morning', 'noon', 'evening', 'bedtime'];

/** 時間帯の表示名 */
export const TIMING_LABELS: Record<MedicationTiming, string> = {
  morning: '朝食後',
  noon: '昼食後',
  evening: '夕食後',
  bedtime: '寝る前',
};

/** 「あと何日分」がこの日数以下なら目立たせる(SPEC.md 7.3) */
export const LOW_STOCK_DAYS = 7;

/** 時間帯を決まった並び順にそろえ、重なりを除く */
export function normalizeTimings(timings: readonly MedicationTiming[]): MedicationTiming[] {
  return TIMINGS.filter((timing) => timings.includes(timing));
}

/**
 * 飲んだ記録で残りを減らす(SPEC.md 7.2)。
 * 残りが1回分に足りないときは0で止める。deducted は実際に減らした数(取り消しで戻す数)。
 */
export function applyIntake(remaining: number, dosePerTake: number): { remaining: number; deducted: number } {
  const deducted = Math.max(0, Math.min(remaining, dosePerTake));
  return { remaining: remaining - deducted, deducted };
}

/** 1日の量 = 1回の錠数 × 時間帯の数(決まった時間の薬だけ) */
export function dailyDose(medication: Pick<Medication, 'dosePerTake' | 'timings'>): number {
  return medication.dosePerTake * medication.timings.length;
}

/**
 * あと何日分(残り ÷ 1日の量、小数点以下切り捨て。SPEC.md 7.3)。
 * 頓服や、1日の量が0のときは null(「残り○錠」だけ表示する)
 */
export function daysLeft(medication: Pick<Medication, 'kind' | 'dosePerTake' | 'timings' | 'remaining'>): number | null {
  const perDay = dailyDose(medication);
  if (medication.kind !== 'scheduled' || perDay <= 0) {
    return null;
  }
  return Math.floor(medication.remaining / perDay);
}

/** あと7日分以下か(目立つ色にする) */
export function isLowStock(medication: Pick<Medication, 'kind' | 'dosePerTake' | 'timings' | 'remaining'>): boolean {
  const days = daysLeft(medication);
  return days !== null && days <= LOW_STOCK_DAYS;
}

/** 残りが1回分未満か(「残りの数を確認してください」を出す) */
export function needsRecount(medication: Pick<Medication, 'dosePerTake' | 'remaining'>): boolean {
  return medication.remaining < medication.dosePerTake;
}

function byOrder(a: Medication, b: Medication): number {
  return a.order - b.order;
}

/** 使用中と中止に分け、それぞれ order 順に並べる */
export function sortMedications(medications: readonly Medication[]): { active: Medication[]; stopped: Medication[] } {
  return {
    active: medications.filter((m) => m.status === 'active').sort(byOrder),
    stopped: medications.filter((m) => m.status === 'stopped').sort(byOrder),
  };
}

/** 記録のうち、いちばん新しいもの(なければ null) */
function findLatestIntake(intakes: readonly MedicationIntake[]): MedicationIntake | null {
  return intakes.reduce<MedicationIntake | null>(
    (latest, intake) => (latest === null || intake.takenAt > latest.takenAt ? intake : latest),
    null,
  );
}

/** その論理日の、その時間帯の記録 */
export function findTimingIntakes(
  intakes: readonly MedicationIntake[],
  timing: MedicationTiming,
  logicalDate: LogicalDate,
): MedicationIntake[] {
  return intakes.filter((i) => i.timing === timing && toLogicalDate(new Date(i.takenAt)) === logicalDate);
}

/**
 * 時間帯の「昨日」の結果(SPEC.md 7.4)
 * - none:何も出さない(その時間帯の薬が、すべて今日になってから登録されたもの)
 * - record:昨日の最後の記録
 * - noRecord:昨日は記録なし
 */
export type YesterdayResult = { kind: 'none' } | { kind: 'record'; intake: MedicationIntake } | { kind: 'noRecord' };

/** 記録画面の時間帯の欄 */
export interface TimingSection {
  timing: MedicationTiming;
  /** その時間帯の使用中の薬(order 順) */
  medications: Medication[];
  /** 今日のその時間帯の記録(空なら未記録) */
  todayIntakes: MedicationIntake[];
  /** 今日の記録のうち最後のもの(完了表示「人格A・21:30」に使う) */
  latestToday: MedicationIntake | null;
  yesterday: YesterdayResult;
}

/**
 * 記録画面の時間帯の欄を作る。使用中の決まった時間の薬がない時間帯は出さない。
 * @param now 現在時刻(テストで任意の時刻を渡せるよう引数にしている)
 */
export function buildTimingSections(
  medications: readonly Medication[],
  intakes: readonly MedicationIntake[],
  now: Date,
): TimingSection[] {
  const today = toLogicalDate(now);
  const yesterday = addLogicalDays(today, -1);
  const todayStart = startOfLogicalDate(today).getTime();
  const scheduled = sortMedications(medications).active.filter((m) => m.kind === 'scheduled');

  return TIMINGS.flatMap((timing) => {
    const inTiming = scheduled.filter((m) => m.timings.includes(timing));
    if (inTiming.length === 0) {
      return [];
    }
    const todayIntakes = findTimingIntakes(intakes, timing, today);
    const allCreatedToday = inTiming.every((m) => new Date(m.createdAt).getTime() >= todayStart);
    const latestYesterday = findLatestIntake(findTimingIntakes(intakes, timing, yesterday));
    const yesterdayResult: YesterdayResult = allCreatedToday
      ? { kind: 'none' }
      : latestYesterday
        ? { kind: 'record', intake: latestYesterday }
        : { kind: 'noRecord' };
    return [
      {
        timing,
        medications: inTiming,
        todayIntakes,
        latestToday: findLatestIntake(todayIntakes),
        yesterday: yesterdayResult,
      },
    ];
  });
}

/** 頓服の前回の記録(SPEC.md 7.5)。なければ null */
export function findLastAsNeeded(medicationId: string, intakes: readonly MedicationIntake[]): MedicationIntake | null {
  return findLatestIntake(intakes.filter((i) => i.medicationId === medicationId && i.timing === null));
}

/** 記録の一覧の1行(SPEC.md 7.6) */
export type HistoryEntry =
  /** 決まった時間:日・時間帯ごとにまとめる(取り消しもまとめて行う) */
  | { kind: 'scheduled'; timing: MedicationTiming; intakes: MedicationIntake[]; takenAt: string }
  /** 頓服:1件ずつ */
  | { kind: 'asNeeded'; intake: MedicationIntake; takenAt: string };

/** 記録の一覧の1日分 */
export interface HistoryDay {
  logicalDate: LogicalDate;
  entries: HistoryEntry[];
}

/**
 * 記録を論理日ごとに分ける。新しい日を上に、1日の中も新しい順に並べる。
 * 決まった時間の記録は、時間帯ごとに1行にまとめる(中の記録は時刻の古い順)。
 */
export function groupIntakesByLogicalDay(intakes: readonly MedicationIntake[]): HistoryDay[] {
  const byDate = new Map<LogicalDate, MedicationIntake[]>();
  for (const intake of intakes) {
    const date = toLogicalDate(new Date(intake.takenAt));
    byDate.set(date, [...(byDate.get(date) ?? []), intake]);
  }
  const days = [...byDate.entries()].map(([logicalDate, dayIntakes]): HistoryDay => {
    const entries: HistoryEntry[] = [];
    for (const timing of TIMINGS) {
      const group = dayIntakes
        .filter((i) => i.timing === timing)
        .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
      if (group.length > 0) {
        entries.push({ kind: 'scheduled', timing, intakes: group, takenAt: group[group.length - 1].takenAt });
      }
    }
    for (const intake of dayIntakes.filter((i) => i.timing === null)) {
      entries.push({ kind: 'asNeeded', intake, takenAt: intake.takenAt });
    }
    entries.sort((a, b) => b.takenAt.localeCompare(a.takenAt));
    return { logicalDate, entries };
  });
  return days.sort((a, b) => b.logicalDate.localeCompare(a.logicalDate));
}

/** 錠数の表示(「14」「0.5」「13.5」) */
export function formatTablets(count: number): string {
  return String(count);
}

/** 飲み方の表示(「決まった時間・朝食後/寝る前」「頓服」) */
export function medicationKindLabel(medication: Pick<Medication, 'kind' | 'timings'>): string {
  if (medication.kind === 'asNeeded') {
    return '頓服';
  }
  const timings = normalizeTimings(medication.timings).map((timing) => TIMING_LABELS[timing]);
  return timings.length > 0 ? `決まった時間・${timings.join('/')}` : '決まった時間';
}

/** 残りの表示(決まった時間:「残り14錠・あと7日分」、頓服:「残り14錠」。SPEC.md 7.3) */
export function stockText(medication: Pick<Medication, 'kind' | 'dosePerTake' | 'timings' | 'remaining'>): string {
  const remaining = `残り${formatTablets(medication.remaining)}錠`;
  const days = daysLeft(medication);
  return days === null ? remaining : `${remaining}・あと${days}日分`;
}

/** 在庫の履歴の種類の表示名 */
export const STOCK_LOG_LABELS: Record<StockLog['kind'], string> = {
  initial: '登録',
  refill: '補充',
  recount: '数え直し',
};

/** 在庫の履歴の中身の表示(補充は「+28錠」、登録・数え直しは「14錠」) */
export function stockLogAmountText(log: Pick<StockLog, 'kind' | 'amount'>): string {
  const amount = `${formatTablets(log.amount)}錠`;
  return log.kind === 'refill' ? `+${amount}` : amount;
}

/** 在庫の履歴を新しい順に並べる */
export function sortStockLogs(logs: readonly StockLog[]): StockLog[] {
  return [...logs].sort((a, b) => b.at.localeCompare(a.at));
}

/** 服薬記録の完了表示「人格A・21:30」(時刻は実際の時刻。SPEC.md 7.4) */
export function intakeLabelText(intake: MedicationIntake, alterById: ReadonlyMap<string, Alter>): string {
  return `${resolveRecordAlter(intake, alterById).name}・${formatClockOf(intake.takenAt)}`;
}

/** 時間帯の「昨日」の表示(「昨日:人格B・21:40」「昨日は記録なし」)。何も出さないときは null */
export function toYesterdayLabel(
  result: YesterdayResult,
  alterById: ReadonlyMap<string, Alter>,
): PreviousPeriodLabel | null {
  switch (result.kind) {
    case 'none':
      return null;
    case 'record':
      return {
        kind: 'record',
        prefix: '昨日',
        ...resolveRecordAlter(result.intake, alterById),
        time: formatClockOf(result.intake.takenAt),
      };
    case 'noRecord':
      return { kind: 'missing', text: '昨日は記録なし' };
  }
}

/** 頓服の「前回:人格B・3時間前」(SPEC.md 7.5)。記録がなければ null */
export function toLastAsNeededLabel(
  intake: MedicationIntake | null,
  now: Date,
  alterById: ReadonlyMap<string, Alter>,
): PreviousPeriodLabel | null {
  if (intake === null) {
    return null;
  }
  return { kind: 'record', prefix: '前回', ...resolveRecordAlter(intake, alterById), time: formatElapsed(intake.takenAt, now) };
}
