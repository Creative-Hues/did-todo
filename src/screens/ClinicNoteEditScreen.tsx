// 受診メモの入力・編集画面(SPEC.md 8.1)
// 編集のときは、上に「人格Aが書いたメモ」を出し、削除もここから行う
import { useState } from 'react';
import { AuthorHeading } from '../components/clinic/AuthorHeading';
import { ClinicNoteForm } from '../components/clinic/ClinicNoteForm';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { db } from '../db/db';
import { addClinicNote, countClinicNoteComments, deleteClinicNote, updateClinicNote } from '../db/clinicNoteRepo';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { deleteConfirmMessage, type ClinicNoteInput } from '../lib/clinicNotes';
import { showSaveError } from '../lib/showError';
import type { Alter, ClinicNote, ClinicNoteCategory } from '../lib/types';

interface Props {
  /** 編集するメモ(新しく書くときは undefined) */
  note?: ClinicNote;
  alters: Alter[];
  categories: ClinicNoteCategory[];
  onBack: () => void;
}

export function ClinicNoteEditScreen({ note, alters, categories, onBack }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // 削除の確認文に「コメント○件も一緒に削除されます」を出すため
  const commentCount = useLiveQuery(
    () => (note ? countClinicNoteComments(db, note.id) : Promise.resolve(0)),
    [note?.id],
  );
  const alterById = new Map(alters.map((alter) => [alter.id, alter]));

  const handleSubmit = async (input: ClinicNoteInput) => {
    try {
      if (note) {
        await updateClinicNote(db, note.id, input);
      } else {
        await addClinicNote(db, input, new Date());
      }
      onBack();
    } catch (error) {
      showSaveError(error);
    }
  };

  const handleDelete = async (target: ClinicNote) => {
    try {
      await deleteClinicNote(db, target.id);
      onBack();
    } catch (error) {
      showSaveError(error);
    }
  };

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>{note ? 'メモを編集' : 'メモを書く'}</h1>
      </header>
      {note && <AuthorHeading alterId={note.alterId} kind="メモ" alterById={alterById} />}
      <ClinicNoteForm initial={note} alters={alters} categories={categories} onSubmit={handleSubmit} onCancel={onBack} />
      {note && (
        <section className="edit-actions">
          <button
            type="button"
            className="danger-button"
            // コメントの件数を読み込み中は押せないようにする(確認文に件数を出すため)
            disabled={commentCount === undefined}
            onClick={() => setConfirmingDelete(true)}
          >
            このメモを削除する
          </button>
        </section>
      )}
      {note && confirmingDelete && (
        <ConfirmDialog
          message={deleteConfirmMessage(note.alterId, 'メモ', alterById, commentCount ?? 0)}
          confirmLabel="削除する"
          onConfirm={() => handleDelete(note)}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}
