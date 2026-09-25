// タスクの保存・更新(削除はしない。SPEC.md 3.2)
import type { AppDatabase } from './db';
import { computeSwap, nextOrder, type MoveDirection } from '../lib/ordering';
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

/** 表示中のタスクの中で、上へ・下へ動かす */
export async function moveTask(database: AppDatabase, id: string, direction: MoveDirection): Promise<void> {
  await database.transaction('rw', database.tasks, async () => {
    const swap = computeSwap(await database.tasks.toArray(), id, direction);
    if (!swap) {
      return;
    }
    for (const change of swap) {
      await database.tasks.update(change.id, { order: change.order });
    }
  });
}
