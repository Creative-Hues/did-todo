// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import {
  addClinicNoteCategory,
  countClinicNoteCategoryUsage,
  deleteClinicNoteCategory,
  renameClinicNoteCategory,
  reorderClinicNoteCategories,
} from './clinicNoteCategoryRepo';
import { addClinicNote, setClinicNoteDiscussed } from './clinicNoteRepo';

describe('受診メモの分類の保存(SPEC.md 8.1)', () => {
  let database: AppDatabase;
  const now = new Date(2026, 8, 28, 9, 0);

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-clinic-categories');
  });

  afterEach(async () => {
    await database.delete();
  });

  const names = async () => (await database.clinicNoteCategories.orderBy('order').toArray()).map((c) => c.name);
  const idOf = async (name: string) =>
    (await database.clinicNoteCategories.toArray()).find((c) => c.name === name)?.id ?? '';

  it('最初の7つのあとに追加され、同じ名前は追加できない', async () => {
    expect(await names()).toEqual(['体調', '薬', '睡眠', '気分', '交代のこと', '生活', 'その他']);
    expect((await addClinicNoteCategory(database, '仕事', now)).ok).toBe(true);
    expect(await addClinicNoteCategory(database, '体調', now)).toEqual({ ok: false, reason: 'duplicateName' });
    expect(await names()).toEqual(['体調', '薬', '睡眠', '気分', '交代のこと', '生活', 'その他', '仕事']);
  });

  it('名前を変えられる。ほかと同じ名前には変えられないが、自分と同じ名前は保存できる', async () => {
    const sleep = await idOf('睡眠');
    expect((await renameClinicNoteCategory(database, sleep, '眠り'))?.ok).toBe(true);
    expect(await renameClinicNoteCategory(database, sleep, '体調')).toEqual({ ok: false, reason: 'duplicateName' });
    expect((await renameClinicNoteCategory(database, sleep, '眠り'))?.ok).toBe(true);
    expect(await renameClinicNoteCategory(database, 'none', '何か')).toBeNull();
    expect((await names())[2]).toBe('眠り');
  });

  it('並べ替えた順番で保存される', async () => {
    const ids = (await database.clinicNoteCategories.orderBy('order').toArray()).map((c) => c.id);
    await reorderClinicNoteCategories(database, [ids[6], ...ids.slice(0, 6)]);
    expect((await names())[0]).toBe('その他');
  });

  it('メモがない分類は削除でき、メモ(話したメモも含む)がある分類は削除できない', async () => {
    const other = await idOf('その他');
    const health = await idOf('体調');
    const note = await addClinicNote(database, { alterId: null, categoryId: health, body: '頭痛' }, now);
    await setClinicNoteDiscussed(database, note.id, true, now);

    expect(await countClinicNoteCategoryUsage(database, health)).toBe(1);
    expect(await deleteClinicNoteCategory(database, health)).toBe(false);
    expect(await countClinicNoteCategoryUsage(database, other)).toBe(0);
    expect(await deleteClinicNoteCategory(database, other)).toBe(true);
    expect(await names()).toEqual(['体調', '薬', '睡眠', '気分', '交代のこと', '生活']);
  });
});
