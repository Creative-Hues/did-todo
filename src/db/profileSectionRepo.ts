// プロフィールの見出しの保存・更新・削除(SPEC.md 10.4・10.5)
// alterId が null の見出しは「全体のこと」
import type { AppDatabase } from './db';
import type { ProfileSectionInput } from '../lib/alterInfo';
import { nextOrder, reorderSubset } from '../lib/ordering';
import type { ProfileSection } from '../lib/types';

/**
 * その人格(null なら「全体のこと」)の見出しを、並び順に関係なく全部読む。
 * null は検索に使えない(IndexedDB の制限)ので、「全体のこと」は全件から絞り込む
 */
export async function listProfileSections(database: AppDatabase, alterId: string | null): Promise<ProfileSection[]> {
  if (alterId === null) {
    return database.profileSections.filter((section) => section.alterId === null).toArray();
  }
  return database.profileSections.where('alterId').equals(alterId).toArray();
}

/** 見出しを、その人格(または「全体のこと」)の一番最後に追加する。新しい見出しは「PDFに入れる」 */
export async function addProfileSection(
  database: AppDatabase,
  alterId: string | null,
  input: ProfileSectionInput,
  now: Date,
): Promise<ProfileSection> {
  return database.transaction('rw', database.profileSections, async () => {
    const siblings = await listProfileSections(database, alterId);
    const section: ProfileSection = {
      id: crypto.randomUUID(),
      alterId,
      title: input.title,
      body: input.body,
      includeInPdf: true,
      order: nextOrder(siblings),
      createdAt: now.toISOString(),
    };
    await database.profileSections.add(section);
    return section;
  });
}

/** 見出しと中身を変更する */
export async function updateProfileSection(database: AppDatabase, id: string, input: ProfileSectionInput): Promise<void> {
  await database.profileSections.update(id, { title: input.title, body: input.body });
}

/** 「PDFに入れる/自分たちだけ」を切り替える */
export async function setProfileSectionIncludeInPdf(
  database: AppDatabase,
  id: string,
  includeInPdf: boolean,
): Promise<void> {
  await database.profileSections.update(id, { includeInPdf });
}

/** 見出しを削除する */
export async function deleteProfileSection(database: AppDatabase, id: string): Promise<void> {
  await database.profileSections.delete(id);
}

/**
 * 見出しを並べ替える。
 * @param orderedIds 並べ替えた後の順番に並んだ見出しのID(1人分、または「全体のこと」の分)
 */
export async function reorderProfileSections(database: AppDatabase, orderedIds: readonly string[]): Promise<void> {
  await database.transaction('rw', database.profileSections, async () => {
    const targets = await database.profileSections.bulkGet([...orderedIds]);
    const changes = reorderSubset(
      targets.flatMap((section) => (section ? [section] : [])),
      orderedIds,
    );
    for (const change of changes) {
      await database.profileSections.update(change.id, { order: change.order });
    }
  });
}
