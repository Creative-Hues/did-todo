import { describe, expect, it } from 'vitest';
import { computeSwap, nextOrder, sortForSettings, type Orderable } from './ordering';

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

describe('上へ・下へ', () => {
  it('表示中の項目どうしで order を入れ替える(非表示は飛ばす)', () => {
    expect(computeSwap(items, 'c', 'up')).toEqual([
      { id: 'c', order: 0 },
      { id: 'a', order: 2 },
    ]);
    expect(computeSwap(items, 'c', 'down')).toEqual([
      { id: 'c', order: 3 },
      { id: 'd', order: 2 },
    ]);
  });

  it('端にある項目は動かせない', () => {
    expect(computeSwap(items, 'a', 'up')).toBeNull();
    expect(computeSwap(items, 'd', 'down')).toBeNull();
  });

  it('非表示や存在しない項目は動かせない', () => {
    expect(computeSwap(items, 'h', 'up')).toBeNull();
    expect(computeSwap(items, 'zzz', 'down')).toBeNull();
  });
});

describe('追加するときの order', () => {
  it('空なら 0、あれば最大 + 1(非表示も含めて数える)', () => {
    expect(nextOrder([])).toBe(0);
    expect(nextOrder(items)).toBe(4);
  });
});
