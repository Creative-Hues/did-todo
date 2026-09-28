// ホーム画面の欄の組み立て(SPEC.md 6.1)。純粋関数。
import { getTaskStatus, type TaskStatus } from './status';
import type { CompletionRecord, Cycle, Task } from './types';

/** 欄の種類:今日 / 今週 / 今月 */
export type SectionKey = 'today' | 'week' | 'month';

/** ホーム画面に並べるタスク1件 */
export interface HomeItem {
  task: Task;
  /** 完了 / 未完了(お休みは欄に入らない) */
  status: Exclude<TaskStatus, 'rest'>;
  /** 今の期間の完了記録(完了のときだけ入る) */
  currentRecord: CompletionRecord | null;
}

export interface HomeSection {
  key: SectionKey;
  title: string;
  items: HomeItem[];
}

const SECTION_TITLES: Record<SectionKey, string> = {
  today: '今日',
  week: '今週',
  month: '今月',
};

const SECTION_ORDER: readonly SectionKey[] = ['today', 'week', 'month'];

/** 周期からどの欄に入るかを決める */
function sectionOf(cycle: Cycle): SectionKey {
  switch (cycle.type) {
    case 'daily':
    case 'everyNDays':
      return 'today';
    case 'weekly':
      return 'week';
    case 'monthly':
      return 'month';
  }
}

/** 未完了を上、完了を下。それぞれの中は order 順 */
function compareItems(a: HomeItem, b: HomeItem): number {
  if (a.status !== b.status) {
    return a.status === 'todo' ? -1 : 1;
  }
  return a.task.order - b.task.order;
}

/**
 * 並び替えモード用に、欄の中を未完了・完了の区別なく order 順だけで並べ直す(SPEC.md 6.1)。
 * 欄に入るタスクは buildHomeSections で決めたものから変えない
 */
export function sortSectionByOrder(section: HomeSection): HomeSection {
  return { ...section, items: [...section.items].sort((a, b) => a.task.order - b.task.order) };
}

/**
 * ホーム画面の欄を作る。
 * - 非表示のタスクと、○日ごとで「お休み」のタスクは入れない
 * - タスクが1つもない欄は返さない
 * @param records すべての完了記録
 * @param now 現在時刻(テストで任意の時刻を渡せるよう引数にしている)
 */
export function buildHomeSections(
  tasks: readonly Task[],
  records: readonly CompletionRecord[],
  now: Date,
): HomeSection[] {
  const recordsByTask = new Map<string, CompletionRecord[]>();
  for (const record of records) {
    const list = recordsByTask.get(record.taskId) ?? [];
    list.push(record);
    recordsByTask.set(record.taskId, list);
  }

  const itemsBySection = new Map<SectionKey, HomeItem[]>(SECTION_ORDER.map((key) => [key, []]));
  for (const task of tasks) {
    if (task.hidden) {
      continue;
    }
    const { status, currentRecord } = getTaskStatus(task.cycle, recordsByTask.get(task.id) ?? [], now);
    if (status === 'rest') {
      continue;
    }
    itemsBySection.get(sectionOf(task.cycle))?.push({ task, status, currentRecord });
  }

  return SECTION_ORDER.map((key) => ({
    key,
    title: SECTION_TITLES[key],
    items: (itemsBySection.get(key) ?? []).sort(compareItems),
  })).filter((section) => section.items.length > 0);
}
