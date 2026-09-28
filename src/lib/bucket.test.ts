import { describe, expect, it } from 'vitest';
import {
  achieveConfirmMessage,
  addConfirmMessage,
  deleteConfirmMessage,
  editConfirmMessage,
  helperChoices,
  isBucketItemChanged,
  normalizeHelperIds,
  resolveSelectedOwner,
  splitBucketItems,
  switchableAlters,
  unachieveConfirmMessage,
  validateBucketBody,
} from './bucket';
import type { Alter, BucketItem } from './types';

function alterOf(id: string, order: number, hidden = false): Alter {
  return {
    id,
    name: `人格${id}`,
    color: '#4a90d9',
    hidden,
    order,
    createdAt: '2026-09-01T00:00:00.000Z',
    reading: '',
    categoryId: null,
    age: '',
    gender: '',
    identify: '',
  };
}

function itemOf(id: string, overrides: Partial<BucketItem> = {}): BucketItem {
  return {
    id,
    alterId: 'A',
    body: `願い${id}`,
    order: 0,
    createdAt: '2026-09-01T00:00:00.000Z',
    achievedAt: null,
    helperAlterIds: [],
    ...overrides,
  };
}

describe('リストの分け方(SPEC.md 9.1)', () => {
  it('その人格の項目を「まだ」と「叶ったこと」に分け、それぞれ order 順に並べる', () => {
    const items = [
      itemOf('p2', { order: 3 }),
      itemOf('a1', { order: 1, achievedAt: '2026-09-20T00:00:00.000Z' }),
      itemOf('p1', { order: 2 }),
      itemOf('a2', { order: 0, achievedAt: '2026-09-25T00:00:00.000Z' }),
      // ほかの人格の項目は入れない
      itemOf('other', { alterId: 'B', order: -1 }),
    ];
    const { pending, achieved } = splitBucketItems(items, 'A');
    expect(pending.map((item) => item.id)).toEqual(['p1', 'p2']);
    expect(achieved.map((item) => item.id)).toEqual(['a2', 'a1']);
  });

  it('削除済みの項目は、どちらにも入れない', () => {
    const items = [
      itemOf('p', { deletedAt: '2026-09-27T00:00:00.000Z' }),
      itemOf('a', { achievedAt: '2026-09-20T00:00:00.000Z', deletedAt: '2026-09-27T00:00:00.000Z' }),
      itemOf('keep'),
    ];
    const { pending, achieved } = splitBucketItems(items, 'A');
    expect(pending.map((item) => item.id)).toEqual(['keep']);
    expect(achieved).toEqual([]);
  });
});

describe('人格の切り替え(SPEC.md 9.1)', () => {
  const alters = [alterOf('C', 2), alterOf('A', 0), alterOf('H', 1, true), alterOf('B', 1)];

  it('非表示でない人格を並び順で出す', () => {
    expect(switchableAlters(alters).map((alter) => alter.id)).toEqual(['A', 'B', 'C']);
  });

  it('選んでいた人格が出せればその人格、非表示・削除なら先頭の人格', () => {
    expect(resolveSelectedOwner(alters, 'B')).toBe('B');
    expect(resolveSelectedOwner(alters, null)).toBe('A');
    expect(resolveSelectedOwner(alters, 'H')).toBe('A');
    expect(resolveSelectedOwner(alters, 'deleted')).toBe('A');
  });

  it('人格が1人もいない(非表示だけの)ときは null', () => {
    expect(resolveSelectedOwner([], null)).toBeNull();
    expect(resolveSelectedOwner([alterOf('H', 0, true)], 'H')).toBeNull();
  });
});

describe('協力してくれた人格(SPEC.md 9.2)', () => {
  const alters = [alterOf('C', 2), alterOf('A', 0), alterOf('H', 1, true), alterOf('B', 1)];

  it('本人と非表示の人格は選択肢に出さない', () => {
    expect(helperChoices(alters, 'A').map((alter) => alter.id)).toEqual(['B', 'C']);
  });

  it('すでに選ばれている非表示の人格は、並び順の位置に出す', () => {
    expect(helperChoices(alters, 'A', ['H']).map((alter) => alter.id)).toEqual(['H', 'B', 'C']);
  });

  it('保存する協力者から本人と重複を除く', () => {
    expect(normalizeHelperIds(['B', 'A', 'C', 'B'], 'A')).toEqual(['B', 'C']);
  });
});

describe('入力と変更のチェック(SPEC.md 9.1)', () => {
  it('内容の前後の空白を除く。空なら保存できない', () => {
    expect(validateBucketBody('  海を見に行く\n夏に  ')).toEqual({ ok: true, input: '海を見に行く\n夏に' });
    expect(validateBucketBody(' \n ')).toEqual({ ok: false, error: '内容を入力してください' });
  });

  it('内容か協力者が変わったときだけ「変わった」とする(協力者の並びの違いは変更ではない)', () => {
    const item = itemOf('1', { achievedAt: '2026-09-20T00:00:00.000Z', helperAlterIds: ['B', 'C'] });
    expect(isBucketItemChanged(item, item.body, ['C', 'B'])).toBe(false);
    expect(isBucketItemChanged(item, '別の願い', ['B', 'C'])).toBe(true);
    expect(isBucketItemChanged(item, item.body, ['B'])).toBe(true);
    expect(isBucketItemChanged(item, item.body, ['B', 'D'])).toBe(true);
  });
});

describe('本人確認の文(SPEC.md 9章)', () => {
  it('追加・変更・叶った・「まだ」に戻す・削除', () => {
    expect(addConfirmMessage('人格A')).toBe('これは人格Aのリストです。人格A本人として追加しますか?');
    expect(editConfirmMessage('人格A')).toBe('これは人格Aのリストです。人格A本人として、変更しますか?');
    expect(achieveConfirmMessage('人格A')).toBe('これは人格Aのリストです。人格A本人として、叶ったことにしますか?');
    expect(unachieveConfirmMessage('人格A')).toBe(
      'これは人格Aのリストです。人格A本人として、「まだ」に戻しますか?叶った日と協力してくれた人格の記録は消えます。',
    );
    expect(deleteConfirmMessage('人格A', 3)).toBe('これは人格Aのリストです。人格A本人として、3件を削除しますか?');
  });
});
