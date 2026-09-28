// 集計(SPEC.md 11章)。すべて純粋関数(同じ入力なら同じ結果)。
// 月は論理月('YYYY-MM')で分ける。日付の計算は period.ts の関数を通す
import { toLogicalDate, toLogicalMonth } from './period';
import type { Alter, BucketItem, CompletionRecord, MedicationIntake, Task } from './types';

/** 人格と回数(「その人格のためにしてくれたこと」の1行) */
export interface AlterCount {
  alter: Alter;
  count: number;
}

/** 1人の人格の、1か月分の集計 */
export interface AlterStats {
  /** その人格がしたこと(11.1) */
  did: {
    /** ToDo をやった回数 */
    todo: number;
    /** そのうち代行の回数 */
    todoProxy: number;
    /** 服薬の記録をした回数(決まった時間の記録。論理日×時間帯で1回) */
    medication: number;
    /** バケットで協力した回数 */
    bucketHelp: number;
  };
  /** その人格のためにしてくれたこと:ToDo の代行(11.2。人格の並び順、0回の人格は入れない) */
  receivedTodoProxy: AlterCount[];
  /** その人格のためにしてくれたこと:バケットの協力(11.2。人格の並び順、0回の人格は入れない) */
  receivedBucketHelp: AlterCount[];
}

/**
 * 代行の判断に使う「気にしている人格」(SPEC.md 3.3)。
 * - 記録に careAlterIdsAtCompletion があれば、それを使う(空配列でも、今のタスクの値に置き換えない)
 * - ない古い記録は、タスクが残っていれば今の careAlterIds、削除されていれば「0人」(代行に数えない)
 */
export function effectiveCareAlterIds(
  record: CompletionRecord,
  taskById: ReadonlyMap<string, Pick<Task, 'careAlterIds'>>,
): readonly string[] {
  if (record.careAlterIdsAtCompletion !== undefined) {
    return record.careAlterIdsAtCompletion;
  }
  return taskById.get(record.taskId)?.careAlterIds ?? [];
}

/**
 * 代行の記録か(SPEC.md 11.3)。
 * やった人格がわかっていて、気にしている人格が1人以上いて、やった人格がその中にいない記録
 */
export function isProxyRecord(
  record: CompletionRecord,
  taskById: ReadonlyMap<string, Pick<Task, 'careAlterIds'>>,
): boolean {
  if (record.alterId === null) {
    return false;
  }
  const careIds = effectiveCareAlterIds(record, taskById);
  return careIds.length > 0 && !careIds.includes(record.alterId);
}

/** 人格IDごとの回数を、人格の並び順の一覧にする(見つからない人格と0回は入れない) */
function toAlterCounts(counts: ReadonlyMap<string, number>, alters: readonly Alter[]): AlterCount[] {
  return alters
    .filter((alter) => (counts.get(alter.id) ?? 0) > 0)
    .sort((a, b) => a.order - b.order)
    .map((alter) => ({ alter, count: counts.get(alter.id) ?? 0 }));
}

function increment(counts: Map<string, number>, id: string): void {
  counts.set(id, (counts.get(id) ?? 0) + 1);
}

export interface AlterStatsInput {
  /** 集計する人格 */
  alterId: string;
  /** 集計する論理月('YYYY-MM') */
  month: string;
  /** すべての人格(非表示も含む) */
  alters: readonly Alter[];
  /** 今あるタスク(削除したタスクは入っていない) */
  tasks: readonly Task[];
  records: readonly CompletionRecord[];
  intakes: readonly MedicationIntake[];
  /** バケットの項目(削除済みも含む) */
  bucketItems: readonly BucketItem[];
}

/**
 * 1人の人格の、1か月分の集計を作る(SPEC.md 11章)。
 * - 「わからない」の記録は、どの人格にも数えない
 * - 削除したタスクの記録も数える
 * - 削除したバケットの項目(deletedAt あり)の協力も数える
 * - 頓服・受診メモは数えない
 */
export function buildAlterStats(input: AlterStatsInput): AlterStats {
  const { alterId, month, alters } = input;
  const taskById = new Map(input.tasks.map((task) => [task.id, task]));

  // ToDo(月は完了日時の論理月)
  let todo = 0;
  let todoProxy = 0;
  const proxyByDoer = new Map<string, number>();
  for (const record of input.records) {
    if (record.alterId === null || toLogicalMonth(new Date(record.completedAt)) !== month) {
      continue;
    }
    const proxy = isProxyRecord(record, taskById);
    if (record.alterId === alterId) {
      todo += 1;
      if (proxy) {
        todoProxy += 1;
      }
    }
    // 気にしている人格が複数いれば、その全員のページに数える
    if (proxy && effectiveCareAlterIds(record, taskById).includes(alterId)) {
      increment(proxyByDoer, record.alterId);
    }
  }

  // 服薬(決まった時間の記録だけ。同じ論理日の同じ時間帯は1回。月は飲んだ日時の論理月)
  const medicationSlots = new Set<string>();
  for (const intake of input.intakes) {
    if (intake.alterId !== alterId || intake.timing === null) {
      continue;
    }
    const date = new Date(intake.takenAt);
    if (toLogicalMonth(date) !== month) {
      continue;
    }
    medicationSlots.add(`${toLogicalDate(date)}|${intake.timing}`);
  }

  // バケット(叶った項目だけ。削除済みも数える。月は叶った日時の論理月)
  let bucketHelp = 0;
  const helpByHelper = new Map<string, number>();
  for (const item of input.bucketItems) {
    if (item.achievedAt === null || toLogicalMonth(new Date(item.achievedAt)) !== month) {
      continue;
    }
    if (item.alterId === alterId) {
      for (const helperId of new Set(item.helperAlterIds)) {
        if (helperId !== alterId) {
          increment(helpByHelper, helperId);
        }
      }
    } else if (item.helperAlterIds.includes(alterId)) {
      bucketHelp += 1;
    }
  }

  return {
    did: { todo, todoProxy, medication: medicationSlots.size, bucketHelp },
    receivedTodoProxy: toAlterCounts(proxyByDoer, alters),
    receivedBucketHelp: toAlterCounts(helpByHelper, alters),
  };
}

/** その月に数えるものが1つもないか(全部の項目が0回。画面では「この月の記録はありません」だけを出す) */
export function isStatsEmpty(stats: AlterStats): boolean {
  return (
    didLines(stats.did).length === 0 && stats.receivedTodoProxy.length === 0 && stats.receivedBucketHelp.length === 0
  );
}

/** 回数の表示(「3回」) */
export function countText(count: number): string {
  return `${count}回`;
}

/** 集計の月の見出し(「2026年9月」) */
export function statsMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${year}年${m}月`;
}

/** 「その人格がしたこと」の1行 */
export interface DidLine {
  label: string;
  value: string;
}

/**
 * 「その人格がしたこと」の行(SPEC.md 11.1)。0回の行は出さない。「うち代行」も0回なら出さない。
 * 全部0なら空の配列(画面では「この月の記録はありません」を出す)
 */
export function didLines(did: AlterStats['did']): DidLine[] {
  const lines: DidLine[] = [];
  if (did.todo > 0) {
    const proxy = did.todoProxy > 0 ? `(うち代行 ${countText(did.todoProxy)})` : '';
    lines.push({ label: 'ToDo', value: `${countText(did.todo)}${proxy}` });
  }
  if (did.medication > 0) {
    lines.push({ label: '服薬の記録', value: countText(did.medication) });
  }
  if (did.bucketHelp > 0) {
    lines.push({ label: 'バケットの協力', value: countText(did.bucketHelp) });
  }
  return lines;
}
