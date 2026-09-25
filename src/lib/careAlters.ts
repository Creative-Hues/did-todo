// 「気にしている人格」の扱い(保存内容の決定と、ホーム画面での表示)
import type { Alter } from './types';

/**
 * タスク編集の保存時に使う。
 * 画面で選べるのは非表示でない人格だけなので、元々入っていた「選択肢にない人格」(非表示の人格)は
 * そのまま残し、画面で選ばれた人格と合わせる。
 */
export function mergeCareAlterIds(
  original: readonly string[],
  selected: readonly string[],
  selectableAlterIds: readonly string[],
): string[] {
  const selectable = new Set(selectableAlterIds);
  const kept = original.filter((id) => !selectable.has(id));
  const chosen = selected.filter((id) => selectable.has(id));
  return [...new Set([...kept, ...chosen])];
}

/**
 * ホーム画面の「気にしている人格」のラベルに使う人格を、人格の order 順で返す。
 * 非表示の人格も含める(SPEC.md 5.1)。見つからないIDは飛ばす。
 */
export function resolveCareAlters(careAlterIds: readonly string[], alters: readonly Alter[]): Alter[] {
  const ids = new Set(careAlterIds);
  return alters.filter((alter) => ids.has(alter.id)).sort((a, b) => a.order - b.order);
}
