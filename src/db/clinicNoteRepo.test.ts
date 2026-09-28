// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import {
  addClinicNote,
  addClinicNoteComment,
  countClinicNoteComments,
  deleteClinicNote,
  deleteClinicNoteComment,
  setClinicNoteDiscussed,
  updateClinicNote,
  updateClinicNoteComment,
} from './clinicNoteRepo';

/** 2026年のローカル時刻を作る(month は 1〜12) */
function at(month: number, day: number, hour = 12): Date {
  return new Date(2026, month - 1, day, hour);
}

describe('受診メモとコメントの保存(SPEC.md 8章)', () => {
  let database: AppDatabase;

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-clinic-notes');
  });

  afterEach(async () => {
    await database.delete();
  });

  const input = { alterId: 'alter-a', categoryId: 'nc-1', body: '朝起きると頭が痛い' };

  it('メモを追加すると、書いた日時が入り、まだ話していないメモになる', async () => {
    const saved = await addClinicNote(database, input, at(9, 28));
    expect(await database.clinicNotes.get(saved.id)).toEqual({
      id: saved.id,
      ...input,
      createdAt: at(9, 28).toISOString(),
      discussedAt: null,
    });
  });

  it('変更しても書いた日時は変わらない', async () => {
    const saved = await addClinicNote(database, input, at(9, 28));
    await updateClinicNote(database, saved.id, { alterId: null, categoryId: 'nc-2', body: '直した内容' });
    expect(await database.clinicNotes.get(saved.id)).toEqual({
      ...saved,
      alterId: null,
      categoryId: 'nc-2',
      body: '直した内容',
    });
  });

  it('話したにすると話した日時が入り、まだに戻すと消える', async () => {
    const saved = await addClinicNote(database, input, at(9, 28));
    await setClinicNoteDiscussed(database, saved.id, true, at(10, 5));
    expect((await database.clinicNotes.get(saved.id))?.discussedAt).toBe(at(10, 5).toISOString());
    await setClinicNoteDiscussed(database, saved.id, false, at(10, 6));
    expect((await database.clinicNotes.get(saved.id))?.discussedAt).toBeNull();
  });

  describe('コメント', () => {
    it('追加・変更・削除ができ、変更しても書いた日時は変わらない', async () => {
      const saved = await addClinicNote(database, input, at(9, 28));
      const added = await addClinicNoteComment(database, saved.id, { alterId: 'alter-b', body: '私も同じ' }, at(9, 29));
      expect(added).toEqual({
        id: expect.any(String),
        noteId: saved.id,
        alterId: 'alter-b',
        body: '私も同じ',
        createdAt: at(9, 29).toISOString(),
      });
      await updateClinicNoteComment(database, added?.id ?? '', { alterId: null, body: '直した' });
      expect(await database.clinicNoteComments.get(added?.id ?? '')).toEqual({ ...added, alterId: null, body: '直した' });
      await deleteClinicNoteComment(database, added?.id ?? '');
      expect(await database.clinicNoteComments.count()).toBe(0);
    });

    it('メモが見つからないときは追加しない', async () => {
      expect(await addClinicNoteComment(database, 'none', { alterId: null, body: '私も' }, at(9, 29))).toBeNull();
      expect(await database.clinicNoteComments.count()).toBe(0);
    });
  });

  it('メモを削除すると、そのメモのコメントも一緒に消え、ほかのメモのコメントは残る', async () => {
    const target = await addClinicNote(database, input, at(9, 28));
    const other = await addClinicNote(database, input, at(9, 28));
    await addClinicNoteComment(database, target.id, { alterId: null, body: '1' }, at(9, 29));
    await addClinicNoteComment(database, target.id, { alterId: null, body: '2' }, at(9, 30));
    await addClinicNoteComment(database, other.id, { alterId: null, body: 'ほか' }, at(9, 30));
    expect(await countClinicNoteComments(database, target.id)).toBe(2);

    expect(await deleteClinicNote(database, target.id)).toBe(2);
    expect(await database.clinicNotes.get(target.id)).toBeUndefined();
    expect((await database.clinicNoteComments.toArray()).map((c) => c.body)).toEqual(['ほか']);
  });
});
