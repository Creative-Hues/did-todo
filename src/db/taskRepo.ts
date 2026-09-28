// タスクの保存・更新・削除(削除しても完了記録は残す。SPEC.md 3.2)
import type { AppDatabase } from './db';
import { nextOrder, reorderSubset } from '../lib/ordering';
import type { Cycle, Task } from '../lib/types';

/** タスクの入力内容(名前・日数はチェック済みのもの) */
export interface TaskInput {
  name: string;
  cycle: Cycle;
  careAlterIds: string[];
}

/** タスクを一覧の最後に追加し、追加したタスクを返す */
export async function addTask(database: AppDatabase, input: TaskInput, now: Date): Promise<Task> {
  return database.transaction('rw', database.tasks, async () => {
    const all = await database.tasks.toArray();
    const task: Task = {
      id: crypto.randomUUID(),
      name: input.name,
      cycle: input.cycle,
      careAlterIds: input.careAlterIds,
      hidden: false,
      order: nextOrder(all),
      createdAt: now.toISOString(),
    };
    await database.tasks.add(task);
    return task;
  });
}

/** 名前・周期・気にしている人格を変更する */
export async function updateTask(database: AppDatabase, id: string, input: TaskInput): Promise<void> {
  await database.tasks.update(id, {
    name: input.name,
    cycle: input.cycle,
    careAlterIds: input.careAlterIds,
  });
}

/** 非表示/再表示を切り替える */
export async function setTaskHidden(database: AppDatabase, id: string, hidden: boolean): Promise<void> {
  await database.tasks.update(id, { hidden });
}

/**
 * タスクを並べ替える(設定画面・ホーム画面の両方から使う)。
 * @param orderedIds 並べ替えた後の順番に並んだタスクのID(対象でないタスクの順番は変えない)
 */
export async function reorderTasks(database: AppDatabase, orderedIds: readonly string[]): Promise<void> {
  await database.transaction('rw', database.tasks, async () => {
    const changes = reorderSubset(await database.tasks.toArray(), orderedIds);
    for (const change of changes) {
      await database.tasks.update(change.id, { order: change.order });
    }
  });
}

/** タスクを削除する。そのタスクの完了記録は、月ごとの集計のために消さずに残す */
export async function deleteTask(database: AppDatabase, id: string): Promise<void> {
  await database.tasks.delete(id);
}

/**
 * 選んだタスクをまとめて削除する(SPEC.md 6.4 複数選択+削除)。
 * 1件ずつの削除と同じく、完了記録は消さずに残す
 */
export async function deleteTasks(database: AppDatabase, ids: readonly string[]): Promise<void> {
  await database.tasks.bulkDelete([...ids]);
}
