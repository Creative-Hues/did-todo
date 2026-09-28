// 人格の区分の保存・更新・削除(SPEC.md 10.2)
import type { AppDatabase } from './db';
import { nextOrder, reorderSubset } from '../lib/ordering';
import type { AlterCategory } from '../lib/types';
import { isDuplicateName } from '../lib/validation';

/** 追加・名前の変更の結果。同じ名前の区分があるときは保存しない */
export type SaveAlterCategoryResult = { ok: true; category: AlterCategory } | { ok: false; reason: 'duplicateName' };

/**
 * 区分を一覧の最後に追加する。同じ名前の区分があれば追加しない
 * @param name normalizeName 済みの名前
 */
export async function addAlterCategory(database: AppDatabase, name: string, now: Date): Promise<SaveAlterCategoryResult> {
  return database.transaction('rw', database.categories, async () => {
    const all = await database.categories.toArray();
    if (isDuplicateName(name, all)) {
      return { ok: false, reason: 'duplicateName' } as const;
    }
    const category: AlterCategory = {
      id: crypto.randomUUID(),
      name,
      order: nextOrder(all),
      createdAt: now.toISOString(),
    };
    await database.categories.add(category);
    return { ok: true, category } as const;
  });
}

/**
 * 区分の名前を変える。ほかに同じ名前の区分があれば変えない。区分が見つからないときは null
 * @param name normalizeName 済みの名前
 */
export async function renameAlterCategory(
  database: AppDatabase,
  id: string,
  name: string,
): Promise<SaveAlterCategoryResult | null> {
  return database.transaction('rw', database.categories, async () => {
    const all = await database.categories.toArray();
    const target = all.find((category) => category.id === id);
    if (!target) {
      return null;
    }
    if (isDuplicateName(name, all, id)) {
      return { ok: false, reason: 'duplicateName' } as const;
    }
    await database.categories.update(id, { name });
    return { ok: true, category: { ...target, name } } as const;
  });
}

/**
 * 区分を並べ替える。
 * @param orderedIds 並べ替えた後の順番に並んだ区分のID(対象でない区分の順番は変えない)
 */
export async function reorderAlterCategories(database: AppDatabase, orderedIds: readonly string[]): Promise<void> {
  await database.transaction('rw', database.categories, async () => {
    const changes = reorderSubset(await database.categories.toArray(), orderedIds);
    for (const change of changes) {
      await database.categories.update(change.id, { order: change.order });
    }
  });
}

/** その区分の人格の人数(非表示の人格も含む) */
export async function countAlterCategoryUsage(database: AppDatabase, id: string): Promise<number> {
  return database.alters.filter((alter) => alter.categoryId === id).count();
}

/** 区分を削除する。その区分の人格が1人でもいれば削除せず false を返す(削除したら true) */
export async function deleteAlterCategory(database: AppDatabase, id: string): Promise<boolean> {
  return database.transaction('rw', [database.categories, database.alters], async () => {
    if ((await countAlterCategoryUsage(database, id)) > 0) {
      return false;
    }
    await database.categories.delete(id);
    return true;
  });
}
