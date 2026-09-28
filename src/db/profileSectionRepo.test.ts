// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import { addAlter } from './alterRepo';
import {
  addProfileSection,
  deleteProfileSection,
  listProfileSections,
  reorderProfileSections,
  setProfileSectionIncludeInPdf,
  updateProfileSection,
} from './profileSectionRepo';

describe('プロフィールの見出しの保存(SPEC.md 10.4・10.5)', () => {
  let database: AppDatabase;
  const now = new Date(2026, 8, 28, 9, 0);

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-profile-sections');
  });

  afterEach(async () => {
    await database.delete();
  });

  const titles = async (alterId: string | null) =>
    (await listProfileSections(database, alterId)).sort((a, b) => a.order - b.order).map((s) => s.title);

  it('新しく入れたとき、「全体のこと」に最初の3つの見出しが「PDFに入れる」で入っている', async () => {
    const common = (await listProfileSections(database, null)).sort((a, b) => a.order - b.order);
    expect(common.map((s) => [s.title, s.body, s.includeInPdf])).toEqual([
      ['みんなに共通の配慮', '', true],
      ['交代のときの様子', '', true],
      ['誰が出ているかわからないとき', '', true],
    ]);
  });

  it('追加した見出しは、その人格の一番最後に「PDFに入れる」で入り、ほかの人格には入らない', async () => {
    const a = await addAlter(database, { name: '人格A', color: '#111111', categoryId: null }, now);
    const b = await addAlter(database, { name: '人格B', color: '#222222', categoryId: null }, now);
    const added = await addProfileSection(database, a.id, { title: '好きなもの', body: '海\n猫' }, now);

    expect(added).toMatchObject({ alterId: a.id, title: '好きなもの', body: '海\n猫', includeInPdf: true, order: 8 });
    expect((await titles(a.id)).at(-1)).toBe('好きなもの');
    expect(await titles(b.id)).toHaveLength(8);
    expect(await titles(null)).toHaveLength(3);
  });

  it('「全体のこと」にも追加できる', async () => {
    await addProfileSection(database, null, { title: '連絡先の人', body: '' }, now);
    expect(await titles(null)).toEqual([
      'みんなに共通の配慮',
      '交代のときの様子',
      '誰が出ているかわからないとき',
      '連絡先の人',
    ]);
  });

  it('見出し・中身を変更でき、PDF の切り替えも保存される', async () => {
    const a = await addAlter(database, { name: '人格A', color: '#111111', categoryId: null }, now);
    const [first] = (await listProfileSections(database, a.id)).sort((x, y) => x.order - y.order);
    await updateProfileSection(database, first.id, { title: '役割', body: '家事をする' });
    await setProfileSectionIncludeInPdf(database, first.id, false);
    expect(await database.profileSections.get(first.id)).toEqual({
      ...first,
      title: '役割',
      body: '家事をする',
      includeInPdf: false,
    });
  });

  it('並べ替えた順番で保存され、ほかの人格の見出しの順番は変わらない', async () => {
    const a = await addAlter(database, { name: '人格A', color: '#111111', categoryId: null }, now);
    const b = await addAlter(database, { name: '人格B', color: '#222222', categoryId: null }, now);
    const before = await titles(b.id);
    const ids = (await listProfileSections(database, a.id)).sort((x, y) => x.order - y.order).map((s) => s.id);
    await reorderProfileSections(database, [ids[7], ...ids.slice(0, 7)]);
    expect(await titles(a.id)).toEqual([
      'その他',
      '機能・役割',
      '特徴',
      '記憶',
      '身体・感覚',
      '対応のお願い',
      '交代の傾向',
      '経緯',
    ]);
    expect(await titles(b.id)).toEqual(before);
  });

  it('見出しを削除できる', async () => {
    const a = await addAlter(database, { name: '人格A', color: '#111111', categoryId: null }, now);
    const [first] = (await listProfileSections(database, a.id)).sort((x, y) => x.order - y.order);
    await deleteProfileSection(database, first.id);
    expect(await titles(a.id)).not.toContain('機能・役割');
    expect(await titles(a.id)).toHaveLength(7);
  });
});
