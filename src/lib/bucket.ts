// バケット(SPEC.md 9章)。すべて純粋関数(同じ入力なら同じ結果)。
// バケットは「その人格の願い」なので、項目を変える操作はどれも本人確認の文を出す
import type { FormResult } from './clinicNotes';
import type { Alter, BucketItem } from './types';
import { DEFAULT_TERM, withTerm } from './term';

function byOrder(a: { order: number }, b: { order: number }): number {
  return a.order - b.order;
}

/** 削除済み(deletedAt あり)の項目か。deletedAt がない項目は「削除していない」 */
export function isBucketItemDeleted(item: BucketItem): boolean {
  return item.deletedAt !== undefined;
}

/**
 * その人格のリスト(SPEC.md 9.1)を「まだ」と「叶ったこと」に分け、それぞれ order 順に並べる。
 * 削除済みの項目は、どちらにも入れない
 */
export function splitBucketItems(
  items: readonly BucketItem[],
  ownerId: string,
): { pending: BucketItem[]; achieved: BucketItem[] } {
  const own = items.filter((item) => item.alterId === ownerId && !isBucketItemDeleted(item));
  return {
    pending: own.filter((item) => item.achievedAt === null).sort(byOrder),
    achieved: own.filter((item) => item.achievedAt !== null).sort(byOrder),
  };
}

/**
 * 画面上部の人格の切り替えに出す人格(SPEC.md 9.1)。非表示でない人格を並び順で
 */
export function switchableAlters(alters: readonly Alter[]): Alter[] {
  return alters.filter((alter) => !alter.hidden).sort(byOrder);
}

/**
 * 表示するリストの人格のID。選んでいた人格が非表示・削除になったら先頭の人格に戻す。
 * 人格が1人もいなければ null
 */
export function resolveSelectedOwner(alters: readonly Alter[], selectedId: string | null): string | null {
  const candidates = switchableAlters(alters);
  return candidates.find((alter) => alter.id === selectedId)?.id ?? candidates[0]?.id ?? null;
}

/**
 * 「協力してくれた人格」の選択肢(SPEC.md 9.2)。本人を除いた、非表示でない人格を並び順で出す。
 * すでに選ばれている非表示の人格も、並び順の位置に出す(チェック済みのまま外せるようにするため)
 * @param currentHelperIds 編集する項目に保存されている協力者(叶ったことにするときは渡さない)
 */
export function helperChoices(
  alters: readonly Alter[],
  ownerId: string,
  currentHelperIds: readonly string[] = [],
): Alter[] {
  return alters
    .filter((alter) => alter.id !== ownerId && (!alter.hidden || currentHelperIds.includes(alter.id)))
    .sort(byOrder);
}

/** 保存する協力者のID:本人を除き、同じIDを1つにまとめる */
export function normalizeHelperIds(helperIds: readonly string[], ownerId: string): string[] {
  return [...new Set(helperIds)].filter((id) => id !== ownerId);
}

/** 内容をチェックする。前後の空白を取り除き、空なら保存できない(途中の改行はそのまま) */
export function validateBucketBody(body: string): FormResult<string> {
  const trimmed = body.trim();
  if (trimmed === '') {
    return { ok: false, error: '内容を入力してください' };
  }
  return { ok: true, input: trimmed };
}

/**
 * 編集で何か変わったか(SPEC.md 9.1)。何も変えていなければ本人確認を出さずに戻るため。
 * 協力者は並びの違いを変更とみなさない
 */
export function isBucketItemChanged(item: BucketItem, body: string, helperIds: readonly string[]): boolean {
  const before = new Set(item.helperAlterIds);
  const after = new Set(helperIds);
  const helpersChanged = before.size !== after.size || [...after].some((id) => !before.has(id));
  return item.body !== body || helpersChanged;
}

/** 本人確認の文の最初の部分「これは人格Aのリストです。人格A本人として、」 */
function ownerPrefix(ownerName: string): string {
  return `これは${ownerName}のリストです。${ownerName}本人として、`;
}

/** 追加の本人確認(SPEC.md 9.1。この文だけ「本人として」のあとに読点がない) */
export function addConfirmMessage(ownerName: string): string {
  return `これは${ownerName}のリストです。${ownerName}本人として追加しますか?`;
}

/** 編集の本人確認(SPEC.md 9.1) */
export function editConfirmMessage(ownerName: string): string {
  return `${ownerPrefix(ownerName)}変更しますか?`;
}

/** 叶ったことにするときの本人確認(SPEC.md 9.2) */
export function achieveConfirmMessage(ownerName: string): string {
  return `${ownerPrefix(ownerName)}叶ったことにしますか?`;
}

/** 「まだ」に戻すときの本人確認(SPEC.md 9.2) */
export function unachieveConfirmMessage(ownerName: string, term: string = DEFAULT_TERM): string {
  // 名前を入れる前の決まった文だけを、呼び方に置き換える(SPEC.md 14章③)
  return `${ownerPrefix(ownerName)}${withTerm('「まだ」に戻しますか?叶った日と協力してくれた人格の記録は消えます。', term)}`;
}

/** 削除の本人確認(SPEC.md 9.3)。1件の削除でも同じ形 */
export function deleteConfirmMessage(ownerName: string, count: number): string {
  return `${ownerPrefix(ownerName)}${count}件を削除しますか?`;
}
