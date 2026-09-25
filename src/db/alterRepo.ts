// 人格の保存・更新(削除はしない。SPEC.md 3.1)
import type { AppDatabase } from './db';
import { computeSwap, nextOrder, type MoveDirection } from '../lib/ordering';
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

/** 表示中の人格の中で、上へ・下へ動かす */
export async function moveAlter(database: AppDatabase, id: string, direction: MoveDirection): Promise<void> {
  await database.transaction('rw', database.alters, async () => {
    const swap = computeSwap(await database.alters.toArray(), id, direction);
    if (!swap) {
      return;
    }
    for (const change of swap) {
      await database.alters.update(change.id, { order: change.order });
    }
  });
}
