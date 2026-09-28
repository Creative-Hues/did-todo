// 受診メモの入力・編集フォーム(SPEC.md 8.1)
// 書いた人格・分類は最初は何も選ばれておらず、選ばないと保存できない
import { useState, type FormEvent } from 'react';
import {
  CLINIC_NOTE_HINT,
  selectableAuthors,
  validateClinicNoteForm,
  type AuthorSelection,
  type ClinicNoteInput,
} from '../../lib/clinicNotes';
import type { Alter, ClinicNote, ClinicNoteCategory } from '../../lib/types';
import { AuthorChoices } from './AuthorChoices';

interface Props {
  /** 編集するときの元のメモ(新しく書くときは undefined) */
  initial?: ClinicNote;
  alters: Alter[];
  categories: ClinicNoteCategory[];
  onSubmit: (input: ClinicNoteInput) => Promise<void>;
  onCancel: () => void;
}

export function ClinicNoteForm({ initial, alters, categories, onSubmit, onCancel }: Props) {
  const [author, setAuthor] = useState<AuthorSelection>(initial ? { alterId: initial.alterId } : null);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [body, setBody] = useState(initial?.body ?? '');
  // 入力のヒントは、ボタンを押したときだけ出す(SPEC.md 8.1)
  const [showingHint, setShowingHint] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authorChoices = selectableAuthors(alters, initial?.alterId);
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateClinicNoteForm({ author, categoryId, body });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    void onSubmit(result.input);
  };

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <AuthorChoices alters={authorChoices} selection={author} onChange={setAuthor} />

      <fieldset className="field">
        <legend>分類</legend>
        {sortedCategories.map((category) => (
          <label key={category.id} className="choice">
            <input
              type="radio"
              name="category"
              checked={categoryId === category.id}
              onChange={() => setCategoryId(category.id)}
            />
            {category.name}
          </label>
        ))}
      </fieldset>

      <label className="field">
        <span>内容</span>
        <textarea className="note-textarea" value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      <button type="button" className="hint-button" onClick={() => setShowingHint((current) => !current)}>
        {showingHint ? '入力のヒントを隠す' : '入力のヒントを表示'}
      </button>
      {showingHint && <p className="settings-note">{CLINIC_NOTE_HINT}</p>}

      {error && <p className="form-error">{error}</p>}
      <div className="form-buttons">
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
        <button type="submit" className="primary">
          保存
        </button>
      </div>
    </form>
  );
}
