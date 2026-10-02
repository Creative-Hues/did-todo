// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import {
  addAlterCategory,
  countAlterCategoryUsage,
  deleteAlterCategory,
  renameAlterCategory,
  reorderAlterCategories,
} from './alterCategoryRepo';
import { addAlter, setAlterHidden } from './alterRepo';
import { buildInitialCategories } from './initialData';

describe('人格の区分の保存(SPEC.md 10.2)', () => {
  let database: AppDatabase;
  const now = new Date(2026, 8, 28, 9, 0);

  // 新しくインストールしたときは区分が空なので(SPEC.md 14章③)、すでに使っている人と同じ最初の4つを入れておく
  beforeEach(async () => {
    database = new AppDatabase('did-todo-test-alter-categories');
    await database.categories.bulkAdd(buildInitialCategories(now, () => crypto.randomUUID()));
  });

  afterEach(async () => {
    await database.delete();
  });

  const names = async () => (await database.categories.orderBy('order').toArray()).map((c) => c.name);
  const idOf = async (name: string) => (await database.categories.toArray()).find((c) => c.name === name)?.id ?? '';

  it('最初の4つのあとに追加され、同じ名前は追加できない', async () => {
    expect(await names()).toEqual(['主人格', 'よく前に出る', '状況によって出る', '最近出現・詳細確認中']);
    expect((await addAlterCategory(database, '子ども', now)).ok).toBe(true);
    expect(await addAlterCategory(database, '主人格', now)).toEqual({ ok: false, reason: 'duplicateName' });
    expect(await names()).toEqual(['主人格', 'よく前に出る', '状況によって出る', '最近出現・詳細確認中', '子ども']);
  });

  it('名前を変えられる。ほかと同じ名前には変えられないが、自分と同じ名前は保存できる', async () => {
    const often = await idOf('よく前に出る');
    expect((await renameAlterCategory(database, often, 'よく出る'))?.ok).toBe(true);
    expect(await renameAlterCategory(database, often, '主人格')).toEqual({ ok: false, reason: 'duplicateName' });
    expect((await renameAlterCategory(database, often, 'よく出る'))?.ok).toBe(true);
    expect(await renameAlterCategory(database, 'none', '何か')).toBeNull();
    expect((await names())[1]).toBe('よく出る');
  });

  it('並べ替えた順番で保存される', async () => {
    const ids = (await database.categories.orderBy('order').toArray()).map((c) => c.id);
    await reorderAlterCategories(database, [ids[3], ...ids.slice(0, 3)]);
    expect(await names()).toEqual(['最近出現・詳細確認中', '主人格', 'よく前に出る', '状況によって出る']);
  });

  it('人格のいない区分は削除でき、人格(非表示の人格も含む)がいる区分は削除できない', async () => {
    const main = await idOf('主人格');
    const often = await idOf('よく前に出る');
    const recent = await idOf('最近出現・詳細確認中');
    await addAlter(database, { name: '人格A', color: '#111111', categoryId: main }, now);
    const b = await addAlter(database, { name: '人格B', color: '#222222', categoryId: often }, now);
    await setAlterHidden(database, b.id, true);

    expect(await countAlterCategoryUsage(database, main)).toBe(1);
    expect(await deleteAlterCategory(database, main)).toBe(false);
    expect(await countAlterCategoryUsage(database, often)).toBe(1);
    expect(await deleteAlterCategory(database, often)).toBe(false);
    expect(await countAlterCategoryUsage(database, recent)).toBe(0);
    expect(await deleteAlterCategory(database, recent)).toBe(true);
    expect(await names()).toEqual(['主人格', 'よく前に出る', '状況によって出る']);
  });
});
