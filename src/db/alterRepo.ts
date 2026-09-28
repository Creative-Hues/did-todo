// 人格の保存・更新・削除(削除は完了記録がない人格だけ。SPEC.md 3.1)
import type { AppDatabase } from './db';
import { EMPTY_ALTER_PROFILE } from './initialData';
import { nextOrder, reorderSubset } from '../lib/ordering';
import type { Alter } from '../lib/types';

/** 人格の入力内容(名前は normalizeName 済みのもの) */
export interface AlterInput {
  name: string;
  color: string;
}

/** 人格を一覧の最後に追加し、追加した人格を返す */
export async function addAlter(database: AppDatabase, input: AlterInput, now: Date): Promise<Alter> {
  return database.transaction('rw', database.alters, async () => {
    const all = await database.alters.toArray();
    const alter: Alter = {
      id: crypto.randomUUID(),
      name: input.name,
      color: input.color,
      hidden: false,
      order: nextOrder(all),
      createdAt: now.toISOString(),
      ...EMPTY_ALTER_PROFILE,
    };
    await database.alters.add(alter);
    return alter;
  });
}

/** 名前と色を変更する */
export async function updateAlter(database: AppDatabase, id: string, input: AlterInput): Promise<void> {
  await database.alters.update(id, { name: input.name, color: input.color });
}

/** 非表示/再表示を切り替える */
export async function setAlterHidden(database: AppDatabase, id: string, hidden: boolean): Promise<void> {
  await database.alters.update(id, { hidden });
}

/**
 * 人格を並べ替える。
 * @param orderedIds 並べ替えた後の順番に並んだ人格のID(対象でない人格の順番は変えない)
 */
export async function reorderAlters(database: AppDatabase, orderedIds: readonly string[]): Promise<void> {
  await database.transaction('rw', database.alters, async () => {
    const changes = reorderSubset(await database.alters.toArray(), orderedIds);
    for (const change of changes) {
      await database.alters.update(change.id, { order: change.order });
    }
  });
}

/** その人格の完了記録の件数(記録は1年分だけなので、全件を見て数える) */
export async function countAlterRecords(database: AppDatabase, id: string): Promise<number> {
  return database.records.filter((record) => record.alterId === id).count();
}

/**
 * 人格を削除し、すべてのタスクの「気にしている人格」からも外す。
 * 完了記録が1件でもある人格は削除せず false を返す(削除したら true)
 */
export async function deleteAlter(database: AppDatabase, id: string): Promise<boolean> {
  return database.transaction('rw', [database.alters, database.tasks, database.records], async () => {
    if ((await countAlterRecords(database, id)) > 0) {
      return false;
    }
    await database.alters.delete(id);
    const tasks = await database.tasks.filter((task) => task.careAlterIds.includes(id)).toArray();
    for (const task of tasks) {
      await database.tasks.update(task.id, {
        careAlterIds: task.careAlterIds.filter((alterId) => alterId !== id),
      });
    }
    return true;
  });
}
