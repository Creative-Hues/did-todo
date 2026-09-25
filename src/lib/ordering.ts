// 設定画面の並び順(人格・タスク共通)

/** 並び替えできる項目(人格・タスクに共通する部分) */
export interface Orderable {
  id: string;
  hidden: boolean;
  order: number;
}

export type MoveDirection = 'up' | 'down';

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
 * 表示中の項目の中で、指定した項目を隣と入れ替える。
 * 戻り値は order を書き換える2件。端にある・見つからない・非表示の場合は null
 */
export function computeSwap(
  items: readonly Orderable[],
  id: string,
  direction: MoveDirection,
): [OrderChange, OrderChange] | null {
  const { visible } = sortForSettings(items);
  const index = visible.findIndex((item) => item.id === id);
  if (index === -1) {
    return null;
  }
  const otherIndex = direction === 'up' ? index - 1 : index + 1;
  const other = visible[otherIndex];
  if (!other) {
    return null;
  }
  const target = visible[index];
  return [
    { id: target.id, order: other.order },
    { id: other.id, order: target.order },
  ];
}

/** 新しく追加する項目の order(いちばん最後) */
export function nextOrder(items: readonly Orderable[]): number {
  return items.reduce((max, item) => Math.max(max, item.order + 1), 0);
}
