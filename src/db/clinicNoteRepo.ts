// 受診メモとコメントの保存・更新・削除(SPEC.md 8.1・8.2・8.4)
import type { AppDatabase } from './db';
import type { ClinicNoteCommentInput, ClinicNoteInput } from '../lib/clinicNotes';
import type { ClinicNote, ClinicNoteComment } from '../lib/types';

/** メモを追加する(まだ話していないメモになる) */
export async function addClinicNote(database: AppDatabase, input: ClinicNoteInput, now: Date): Promise<ClinicNote> {
  const note: ClinicNote = { id: crypto.randomUUID(), ...input, createdAt: now.toISOString(), discussedAt: null };
  await database.clinicNotes.add(note);
  return note;
}

/** 書いた人格・分類・内容を変える(書いた日時は変えない) */
export async function updateClinicNote(database: AppDatabase, id: string, input: ClinicNoteInput): Promise<void> {
  await database.clinicNotes.update(id, { alterId: input.alterId, categoryId: input.categoryId, body: input.body });
}

/**
 * 話した/まだを切り替える(SPEC.md 8.2)。
 * 話したにすると話した日時を残し、まだに戻すと消す
 */
export async function setClinicNoteDiscussed(
  database: AppDatabase,
  id: string,
  discussed: boolean,
  now: Date,
): Promise<void> {
  await database.clinicNotes.update(id, { discussedAt: discussed ? now.toISOString() : null });
}

/** そのメモのコメントの件数 */
export async function countClinicNoteComments(database: AppDatabase, noteId: string): Promise<number> {
  return database.clinicNoteComments.where('noteId').equals(noteId).count();
}

/**
 * メモを削除し、そのメモのコメントも一緒に消す(SPEC.md 8.4)。
 * 1つのトランザクション(まとめて1回の処理)で行うので、途中で失敗したら何も消えない
 * @returns 一緒に消したコメントの件数
 */
export async function deleteClinicNote(database: AppDatabase, id: string): Promise<number> {
  return database.transaction('rw', [database.clinicNotes, database.clinicNoteComments], async () => {
    const deleted = await database.clinicNoteComments.where('noteId').equals(id).delete();
    await database.clinicNotes.delete(id);
    return deleted;
  });
}

/**
 * コメントを追加する(SPEC.md 8.4)。
 * メモが見つからない(ほかの画面で削除された)ときは追加せず null を返す
 */
export async function addClinicNoteComment(
  database: AppDatabase,
  noteId: string,
  input: ClinicNoteCommentInput,
  now: Date,
): Promise<ClinicNoteComment | null> {
  return database.transaction('rw', [database.clinicNotes, database.clinicNoteComments], async () => {
    if (!(await database.clinicNotes.get(noteId))) {
      return null;
    }
    const comment: ClinicNoteComment = { id: crypto.randomUUID(), noteId, ...input, createdAt: now.toISOString() };
    await database.clinicNoteComments.add(comment);
    return comment;
  });
}

/** コメントの書いた人格・内容を変える(書いた日時は変えない) */
export async function updateClinicNoteComment(
  database: AppDatabase,
  id: string,
  input: ClinicNoteCommentInput,
): Promise<void> {
  await database.clinicNoteComments.update(id, { alterId: input.alterId, body: input.body });
}

/** コメントを削除する */
export async function deleteClinicNoteComment(database: AppDatabase, id: string): Promise<void> {
  await database.clinicNoteComments.delete(id);
}
