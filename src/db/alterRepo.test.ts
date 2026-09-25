// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import { addAlter, moveAlter, setAlterHidden, updateAlter } from './alterRepo';

describe('人格の保存', () => {
  let database: AppDatabase;
  const now = new Date(2026, 8, 25, 10, 0);

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-alters');
  });

  afterEach(async () => {
    await database.delete();
  });

  it('追加した人格が保存され、順番に order が付く', async () => {
    const a = await addAlter(database, { name: '人格A', color: '#4a90d9' }, now);
    const b = await addAlter(database, { name: '人格B', color: '#d94a4a' }, now);

    // 別の接続で開き直しても残っている(再起動の代わり)
    const reopened = new AppDatabase('did-todo-test-alters');
    const saved = await reopened.alters.get(a.id);
    reopened.close();
    expect(saved).toEqual({
      id: a.id,
      name: '人格A',
      color: '#4a90d9',
      hidden: false,
      order: 0,
      createdAt: now.toISOString(),
    });
    expect(b.order).toBe(1);
  });

  it('名前と色を変更できる', async () => {
    const a = await addAlter(database, { name: '人格A', color: '#4a90d9' }, now);
    await updateAlter(database, a.id, { name: '人格A2', color: '#000000' });
    const saved = await database.alters.get(a.id);
    expect(saved?.name).toBe('人格A2');
    expect(saved?.color).toBe('#000000');
  });

  it('非表示にしても削除されず、再表示できる', async () => {
    const a = await addAlter(database, { name: '人格A', color: '#4a90d9' }, now);
    await setAlterHidden(database, a.id, true);
    expect((await database.alters.get(a.id))?.hidden).toBe(true);
    await setAlterHidden(database, a.id, false);
    expect((await database.alters.get(a.id))?.hidden).toBe(false);
  });

  it('上へ・下へで隣と入れ替わる', async () => {
    const a = await addAlter(database, { name: 'A', color: '#111111' }, now);
    const b = await addAlter(database, { name: 'B', color: '#222222' }, now);
    await moveAlter(database, b.id, 'up');
    const ordered = await database.alters.orderBy('order').toArray();
    expect(ordered.map((alter) => alter.id)).toEqual([b.id, a.id]);

    await moveAlter(database, b.id, 'up'); // 先頭なので何も起きない
    const again = await database.alters.orderBy('order').toArray();
    expect(again.map((alter) => alter.id)).toEqual([b.id, a.id]);
  });
});
