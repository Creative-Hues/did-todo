// 並び順(人格・タスク共通。設定画面とホーム画面の並び替えで使う)

/** 並び替えできる項目(人格・タスクに共通する部分) */
export interface Orderable {
  id: string;
  hidden: boolean;
  order: number;
}

/** order の変更内容 */
export interface OrderChange {
  id: string;
  order: number;
}

function byOrder<T extends Orderable>(a: T, b: T): number {
  return a.order - b.order;
}

/** 表示中の項目と非表示の項目に分け、それぞれ order 順に並べる */
export function sortForSettings<T extends Orderable>(items: readonly T[]): { visible: T[]; hidden: T[] } {
  const visible = items.filter((item) => !item.hidden).sort(byOrder);
  const hidden = items.filter((item) => item.hidden).sort(byOrder);
  return { visible, hidden };
}

/**
 * 一部の項目(ホームの1欄や、設定画面の表示中の一覧)を並べ替えたときの order の変更を求める。
 * 並べ替えた項目どうしで、元々使っていた order の「席」を新しい順に座り直す。
 * そのため、並べ替えの対象でない項目(非表示・お休み・ほかの欄)の order は変わらない。
 * @param items すべての項目
 * @param orderedIds 並べ替えた後の順番に並んだID(見つからないIDは無視する)
 * @returns order が変わる項目だけ
 */
export function reorderSubset(items: readonly Orderable[], orderedIds: readonly string[]): OrderChange[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const targets = [...new Set(orderedIds)].flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const slots = targets.map((item) => item.order).sort((a, b) => a - b);
  return targets
    .map((item, index) => ({ id: item.id, order: slots[index] }))
    .filter((change, index) => change.order !== targets[index].order);
}

/** 新しく追加する項目の order(いちばん最後) */
export function nextOrder(items: readonly Orderable[]): number {
  return items.reduce((max, item) => Math.max(max, item.order + 1), 0);
}
