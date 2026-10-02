// 交代のきっかけの保存・更新・削除(SPEC.md 17.2)
import type { AppDatabase } from './db';
import { nextOrder, reorderSubset } from '../lib/ordering';
import { isDuplicateTagName } from '../lib/switchLog';
import type { SwitchTag } from '../lib/types';

/** 追加・名前の変更の結果。同じ名前のきっかけがあるときは保存しない */
export type SaveSwitchTagResult = { ok: true; tag: SwitchTag } | { ok: false; reason: 'duplicateName' };

/**
 * きっかけを一覧の最後に追加する。同じ名前のきっかけ(非表示のものも含む)があれば追加しない
 * @param name normalizeName 済みの名前
 */
export async function addSwitchTag(database: AppDatabase, name: string, now: Date): Promise<SaveSwitchTagResult> {
  return database.transaction('rw', database.switchTags, async () => {
    const all = await database.switchTags.toArray();
    if (isDuplicateTagName(name, all)) {
      return { ok: false, reason: 'duplicateName' } as const;
    }
    const tag: SwitchTag = {
      id: crypto.randomUUID(),
      name,
      hidden: false,
      order: nextOrder(all),
      createdAt: now.toISOString(),
    };
    await database.switchTags.add(tag);
    return { ok: true, tag } as const;
  });
}

/**
 * きっかけの名前を変える(過去の記録の表示も変わる)。
 * ほかに同じ名前のきっかけがあれば変えない。きっかけが見つからないときは null
 * @param name normalizeName 済みの名前
 */
export async function renameSwitchTag(
  database: AppDatabase,
  id: string,
  name: string,
): Promise<SaveSwitchTagResult | null> {
  return database.transaction('rw', database.switchTags, async () => {
    const all = await database.switchTags.toArray();
    const target = all.find((tag) => tag.id === id);
    if (!target) {
      return null;
    }
    if (isDuplicateTagName(name, all, id)) {
      return { ok: false, reason: 'duplicateName' } as const;
    }
    await database.switchTags.update(id, { name });
    return { ok: true, tag: { ...target, name } } as const;
  });
}

/** 非表示/再表示を切り替える(非表示のきっかけは、記録のときに選べなくなる) */
export async function setSwitchTagHidden(database: AppDatabase, id: string, hidden: boolean): Promise<void> {
  await database.switchTags.update(id, { hidden });
}

/**
 * きっかけを並べ替える。
 * @param orderedIds 並べ替えた後の順番に並んだきっかけのID(対象でないきっかけの順番は変えない)
 */
export async function reorderSwitchTags(database: AppDatabase, orderedIds: readonly string[]): Promise<void> {
  await database.transaction('rw', database.switchTags, async () => {
    const changes = reorderSubset(await database.switchTags.toArray(), orderedIds);
    for (const change of changes) {
      await database.switchTags.update(change.id, { order: change.order });
    }
  });
}

/** そのきっかけを使っている記録の件数 */
export async function countSwitchTagUsage(database: AppDatabase, id: string): Promise<number> {
  return database.switchLogs.filter((log) => log.tagIds.includes(id)).count();
}

/** きっかけを削除する。使っている記録が1件でもあれば削除せず false を返す(削除したら true) */
export async function deleteSwitchTag(database: AppDatabase, id: string): Promise<boolean> {
  return database.transaction('rw', [database.switchTags, database.switchLogs], async () => {
    if ((await countSwitchTagUsage(database, id)) > 0) {
      return false;
    }
    await database.switchTags.delete(id);
    return true;
  });
}
