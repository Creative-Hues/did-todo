import { describe, expect, it } from 'vitest';
import {
  basicInfoItems,
  buildAllPrint,
  buildAlterPrint,
  buildQuickTablePrint,
  buildQuickTableRows,
  deleteAlterConfirmMessage,
  groupAltersByCategory,
  printableBasicInfoItems,
  printableSections,
  validateProfileSectionForm,
} from './alterInfo';
import type { Alter, AlterCategory, ProfileSection } from './types';

const now = new Date(2026, 8, 28, 4, 30);

function alter(id: string, order: number, categoryId: string | null, extra: Partial<Alter> = {}): Alter {
  return {
    id,
    name: `人格${id.toUpperCase()}`,
    color: '#4a90d9',
    hidden: false,
    order,
    createdAt: '2026-09-01T00:00:00.000Z',
    reading: '',
    categoryId,
    age: '',
    gender: '',
    identify: '',
    ...extra,
  };
}

// 区分の並び順は配列の順と逆にしておく(並び順で並べることを確かめるため)
const categories: AlterCategory[] = [
  { id: 'often', name: 'よく前に出る', order: 1, createdAt: '' },
  { id: 'main', name: '主人格', order: 0, createdAt: '' },
  { id: 'empty', name: '状況によって出る', order: 2, createdAt: '' },
];

const alters: Alter[] = [
  alter('c', 0, 'often'),
  alter('a', 3, 'main'),
  alter('d', 1, null),
  // 削除された区分を指す人格は「未分類」
  alter('e', 2, 'gone'),
  alter('b', 4, 'often'),
  alter('h', 5, 'main', { hidden: true }),
  alter('g', 6, null, { hidden: true }),
];

function section(id: string, alterId: string | null, order: number, extra: Partial<ProfileSection> = {}): ProfileSection {
  return { id, alterId, title: `見出し${id}`, body: `中身${id}`, includeInPdf: true, order, createdAt: '', ...extra };
}

describe('区分ごとのまとめ(SPEC.md 10.1)', () => {
  it('区分の並び順 → 人格の並び順。未分類は最後、人格のいない区分は出さず、非表示は別にする', () => {
    const { groups, hidden } = groupAltersByCategory(alters, categories);
    expect(groups.map((g) => [g.categoryId, g.name, g.alters.map((a) => a.id)])).toEqual([
      ['main', '主人格', ['a']],
      ['often', 'よく前に出る', ['c', 'b']],
      [null, '未分類', ['d', 'e']],
    ]);
    expect(hidden.map((a) => a.id)).toEqual(['h', 'g']);
  });

  it('人格がいなければ、まとまりもない', () => {
    expect(groupAltersByCategory([], categories)).toEqual({ groups: [], hidden: [] });
  });
});

describe('基本情報(SPEC.md 10.3・10.7)', () => {
  const filled = alter('a', 0, 'main', { reading: 'えー', age: '', gender: '女性', identify: '左利き' });

  it('画面では全項目を出し、区分がなければ「未分類」', () => {
    expect(basicInfoItems(filled, categories)).toEqual([
      { label: '読み', value: 'えー' },
      { label: '区分', value: '主人格' },
      { label: '体感年齢', value: '' },
      { label: '性別(感)', value: '女性' },
      { label: '見分け方', value: '左利き' },
    ]);
    expect(basicInfoItems(alter('d', 0, null), categories)[1]).toEqual({ label: '区分', value: '未分類' });
  });

  it('PDF では空の項目と、選んでいない区分を出さない', () => {
    expect(printableBasicInfoItems(filled, categories).map((i) => i.label)).toEqual([
      '読み',
      '区分',
      '性別(感)',
      '見分け方',
    ]);
    expect(printableBasicInfoItems(alter('e', 0, 'gone', { age: ' ' }), categories)).toEqual([]);
  });
});

describe('早見表(SPEC.md 10.6)', () => {
  it('表示中の人格だけを、区分の並び順 → 人格の並び順で並べる(未分類は最後)', () => {
    const rows = buildQuickTableRows(alters, categories);
    expect(rows.map((r) => [r.alterId, r.category])).toEqual([
      ['a', '主人格'],
      ['c', 'よく前に出る'],
      ['b', 'よく前に出る'],
      ['d', '未分類'],
      ['e', '未分類'],
    ]);
  });

  it('早見表だけの PDF は、表題「早見表」と実際の日付(朝5時前でも前の日にしない)', () => {
    const content = buildQuickTablePrint(alters, categories, now);
    expect(content.title).toBe('早見表');
    expect(content.dateText).toBe('2026/9/28');
    expect(content.common).toBeNull();
    expect(content.alterPages).toEqual([]);
    expect(content.quickTable).toHaveLength(5);
  });
});

describe('PDF に出す見出し(SPEC.md 10.4・10.7)', () => {
  const sections: ProfileSection[] = [
    section('2', 'a', 2),
    section('1', 'a', 1, { includeInPdf: false }),
    section('0', 'a', 0),
    section('3', 'a', 3, { body: ' \n ' }),
    section('4', 'b', 0),
    section('5', null, 0),
  ];

  it('「自分たちだけ」と中身が空の見出しを除き、並び順で出す', () => {
    expect(printableSections(sections, 'a').map((s) => s.id)).toEqual(['0', '2']);
    expect(printableSections(sections, null).map((s) => s.id)).toEqual(['5']);
  });

  it('全員分:表題「人格について」→ 全体のこと → 早見表 → 人格ごと(区分の順。非表示の人格は入れない)', () => {
    const content = buildAllPrint(alters, categories, sections, now);
    expect(content.title).toBe('人格について');
    expect(content.dateText).toBe('2026/9/28');
    expect(content.common).toEqual([{ title: '見出し5', body: '中身5' }]);
    expect(content.quickTable?.map((r) => r.alterId)).toEqual(['a', 'c', 'b', 'd', 'e']);
    expect(content.alterPages.map((p) => p.alterId)).toEqual(['a', 'c', 'b', 'd', 'e']);
    expect(content.alterPages[0]).toEqual({
      alterId: 'a',
      name: '人格A',
      basicInfo: [{ label: '区分', value: '主人格' }],
      sections: [
        { title: '見出し0', body: '中身0' },
        { title: '見出し2', body: '中身2' },
      ],
    });
  });

  it('1人分:表題はその人格の名前で、非表示の人格でも出せる', () => {
    const hiddenAlter = alters.find((a) => a.id === 'h') as Alter;
    const content = buildAlterPrint(hiddenAlter, categories, [section('9', 'h', 0)], now);
    expect(content.title).toBe('人格H');
    expect(content.common).toBeNull();
    expect(content.quickTable).toBeNull();
    expect(content.alterPages).toEqual([
      {
        alterId: 'h',
        name: '人格H',
        basicInfo: [{ label: '区分', value: '主人格' }],
        sections: [{ title: '見出し9', body: '中身9' }],
      },
    ]);
  });
});

describe('見出しの入力(SPEC.md 10.4)', () => {
  it('見出しが空なら保存できない。中身は空でもよく、前後の空白を取り除く', () => {
    expect(validateProfileSectionForm({ title: '  ', body: '中身' })).toEqual({
      ok: false,
      error: '見出しを入力してください',
    });
    expect(validateProfileSectionForm({ title: ' 特徴 ', body: '' })).toEqual({
      ok: true,
      input: { title: '特徴', body: '' },
    });
    expect(validateProfileSectionForm({ title: '特徴', body: '\n明るい\n静か\n' })).toEqual({
      ok: true,
      input: { title: '特徴', body: '明るい\n静か' },
    });
  });
});

describe('人格の削除の確認文(SPEC.md 3.1)', () => {
  it('中身のある見出しがあるときだけ、一緒に消える件数を足す', () => {
    expect(deleteAlterConfirmMessage('人格A', 0)).toBe('「人格A」を削除しますか?');
    expect(deleteAlterConfirmMessage('人格A', 2)).toBe(
      '「人格A」を削除しますか?プロフィールの見出し2件も一緒に削除されます。',
    );
  });
});
