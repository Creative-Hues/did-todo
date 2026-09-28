// 受診メモの分類の保存・更新・削除(SPEC.md 8.1)
import type { AppDatabase } from './db';
import { nextOrder, reorderSubset } from '../lib/ordering';
import type { ClinicNoteCategory } from '../lib/types';
import { isDuplicateName } from '../lib/validation';

/** 追加・名前の変更の結果。同じ名前の分類があるときは保存しない */
export type SaveCategoryResult = { ok: true; category: ClinicNoteCategory } | { ok: false; reason: 'duplicateName' };

/**
 * 分類を一覧の最後に追加する。同じ名前の分類があれば追加しない
 * @param name normalizeName 済みの名前
 */
export async function addClinicNoteCategory(
  database: AppDatabase,
  name: string,
  now: Date,
): Promise<SaveCategoryResult> {
  return database.transaction('rw', database.clinicNoteCategories, async () => {
    const all = await database.clinicNoteCategories.toArray();
    if (isDuplicateName(name, all)) {
      return { ok: false, reason: 'duplicateName' } as const;
    }
    const category: ClinicNoteCategory = {
      id: crypto.randomUUID(),
      name,
      order: nextOrder(all),
      createdAt: now.toISOString(),
    };
    await database.clinicNoteCategories.add(category);
    return { ok: true, category } as const;
  });
}

/**
 * 分類の名前を変える。ほかに同じ名前の分類があれば変えない。分類が見つからないときは null
 * @param name normalizeName 済みの名前
 */
export async function renameClinicNoteCategory(
  database: AppDatabase,
  id: string,
  name: string,
): Promise<SaveCategoryResult | null> {
  return database.transaction('rw', database.clinicNoteCategories, async () => {
    const all = await database.clinicNoteCategories.toArray();
    const target = all.find((category) => category.id === id);
    if (!target) {
      return null;
    }
    if (isDuplicateName(name, all, id)) {
      return { ok: false, reason: 'duplicateName' } as const;
    }
    await database.clinicNoteCategories.update(id, { name });
    return { ok: true, category: { ...target, name } } as const;
  });
}

/**
 * 分類を並べ替える。
 * @param orderedIds 並べ替えた後の順番に並んだ分類のID(対象でない分類の順番は変えない)
 */
export async function reorderClinicNoteCategories(database: AppDatabase, orderedIds: readonly string[]): Promise<void> {
  await database.transaction('rw', database.clinicNoteCategories, async () => {
    const changes = reorderSubset(await database.clinicNoteCategories.toArray(), orderedIds);
    for (const change of changes) {
      await database.clinicNoteCategories.update(change.id, { order: change.order });
    }
  });
}

/** その分類を使っているメモの件数(話したメモも含む) */
export async function countClinicNoteCategoryUsage(database: AppDatabase, id: string): Promise<number> {
  return database.clinicNotes.filter((note) => note.categoryId === id).count();
}

/** 分類を削除する。使っているメモが1件でもあれば削除せず false を返す(削除したら true) */
export async function deleteClinicNoteCategory(database: AppDatabase, id: string): Promise<boolean> {
  return database.transaction('rw', [database.clinicNoteCategories, database.clinicNotes], async () => {
    if ((await countClinicNoteCategoryUsage(database, id)) > 0) {
      return false;
    }
    await database.clinicNoteCategories.delete(id);
    return true;
  });
}
