// 受診メモのコメントの入力・編集画面(SPEC.md 8.4)
// ほかの人格が書いたメモを直す代わりに、コメントで書き足す
// 編集のときは、上に「人格Bが書いたコメント」を出し、削除もここから行う
import { useState, type FormEvent } from 'react';
import { AuthorChoices } from '../components/clinic/AuthorChoices';
import { AuthorHeading } from '../components/clinic/AuthorHeading';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { db } from '../db/db';
import { addClinicNoteComment, deleteClinicNoteComment, updateClinicNoteComment } from '../db/clinicNoteRepo';
import {
  deleteConfirmMessage,
  selectableAuthors,
  validateClinicNoteCommentForm,
  type AuthorSelection,
} from '../lib/clinicNotes';
import { showSaveError } from '../lib/showError';
import type { Alter, ClinicNoteComment } from '../lib/types';

interface Props {
  /** どのメモへのコメントか */
  noteId: string;
  /** 編集するコメント(新しく書くときは undefined) */
  comment?: ClinicNoteComment;
  alters: Alter[];
  onBack: () => void;
}

export function ClinicNoteCommentEditScreen({ noteId, comment, alters, onBack }: Props) {
  const [author, setAuthor] = useState<AuthorSelection>(comment ? { alterId: comment.alterId } : null);
  const [body, setBody] = useState(comment?.body ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const alterById = new Map(alters.map((alter) => [alter.id, alter]));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const result = validateClinicNoteCommentForm({ author, body });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    try {
      if (comment) {
        await updateClinicNoteComment(db, comment.id, result.input);
      } else {
        // メモがほかの画面で削除されていたら追加されない(一覧に戻るだけ)
        await addClinicNoteComment(db, noteId, result.input, new Date());
      }
      onBack();
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  const handleDelete = async (target: ClinicNoteComment) => {
    try {
      await deleteClinicNoteComment(db, target.id);
      onBack();
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>{comment ? 'コメントを編集' : 'コメントを書く'}</h1>
      </header>
      {comment && <AuthorHeading alterId={comment.alterId} kind="コメント" alterById={alterById} />}
      <form className="edit-form" onSubmit={(event) => void handleSubmit(event)}>
        <AuthorChoices alters={selectableAuthors(alters, comment?.alterId)} selection={author} onChange={setAuthor} />
        <label className="field">
          <span>内容</span>
          <textarea className="note-textarea" value={body} onChange={(event) => setBody(event.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-buttons">
          <button type="button" onClick={onBack}>
            キャンセル
          </button>
          <button type="submit" className="primary">
            保存
          </button>
        </div>
      </form>
      {comment && (
        <section className="edit-actions">
          <button type="button" className="danger-button" onClick={() => setConfirmingDelete(true)}>
            このコメントを削除する
          </button>
        </section>
      )}
      {comment && confirmingDelete && (
        <ConfirmDialog
          message={deleteConfirmMessage(comment.alterId, 'コメント', alterById)}
          confirmLabel="削除する"
          onConfirm={() => handleDelete(comment)}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}
