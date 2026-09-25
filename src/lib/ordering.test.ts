import { describe, expect, it } from 'vitest';
import { nextOrder, reorderSubset, sortForSettings, type Orderable } from './ordering';

const items: Orderable[] = [
  { id: 'c', hidden: false, order: 2 },
  { id: 'a', hidden: false, order: 0 },
  { id: 'h', hidden: true, order: 1 },
  { id: 'd', hidden: false, order: 3 },
];

describe('設定画面の並べ方', () => {
  it('表示中と非表示に分け、それぞれ order 順に並べる', () => {
    const { visible, hidden } = sortForSettings(items);
    expect(visible.map((item) => item.id)).toEqual(['a', 'c', 'd']);
    expect(hidden.map((item) => item.id)).toEqual(['h']);
  });
});

describe('並べ替え(reorderSubset)', () => {
  it('表示中の一覧を並べ替えると、非表示の項目の order は変わらない', () => {
    // a(0) c(2) d(3) → d c a
    expect(reorderSubset(items, ['d', 'c', 'a'])).toEqual([
      { id: 'd', order: 0 },
      { id: 'a', order: 3 },
    ]);
  });

  it('一部の項目だけ並べ替えると、その項目が使っていた席の中で入れ替わる', () => {
    // a(0) と d(3) だけを入れ替える。c と h は動かない
    expect(reorderSubset(items, ['d', 'a'])).toEqual([
      { id: 'd', order: 0 },
      { id: 'a', order: 3 },
    ]);
  });

  it('順番が変わらなければ、変更はない', () => {
    expect(reorderSubset(items, ['a', 'c', 'd'])).toEqual([]);
  });

  it('存在しないIDと重複したIDは無視する', () => {
    expect(reorderSubset(items, ['c', 'zzz', 'a', 'c'])).toEqual([
      { id: 'c', order: 0 },
      { id: 'a', order: 2 },
    ]);
  });
});

describe('追加するときの order', () => {
  it('空なら 0、あれば最大 + 1(非表示も含めて数える)', () => {
    expect(nextOrder([])).toBe(0);
    expect(nextOrder(items)).toBe(4);
  });
});
