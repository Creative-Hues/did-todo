// 受診メモの分類の追加・編集画面(SPEC.md 8.1)
// 編集のときは、削除もここから行う(使っているメモがない分類だけ)
import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { db } from '../db/db';
import {
  addClinicNoteCategory,
  countClinicNoteCategoryUsage,
  deleteClinicNoteCategory,
  renameClinicNoteCategory,
  type SaveCategoryResult,
} from '../db/clinicNoteCategoryRepo';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { showSaveError } from '../lib/showError';
import type { ClinicNoteCategory } from '../lib/types';
import { normalizeName } from '../lib/validation';

interface Props {
  /** 編集する分類(追加のときは undefined) */
  category?: ClinicNoteCategory;
  onBack: () => void;
}

export function CategoryEditScreen({ category, onBack }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // その分類を使っているメモの件数(話したメモも含む。1件以上あると削除できない)
  const usage = useLiveQuery(
    () => (category ? countClinicNoteCategoryUsage(db, category.id) : Promise.resolve(0)),
    [category?.id],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeName(name);
    if (normalized === null) {
      setError('分類の名前を入力してください');
      return;
    }
    try {
      const result: SaveCategoryResult | null = category
        ? await renameClinicNoteCategory(db, category.id, normalized)
        : await addClinicNoteCategory(db, normalized, new Date());
      if (result && !result.ok) {
        setError('同じ名前の分類があります');
        return;
      }
      onBack();
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  const handleDelete = async (target: ClinicNoteCategory) => {
    try {
      const deleted = await deleteClinicNoteCategory(db, target.id);
      setConfirmingDelete(false);
      // 確認中にメモが増えて削除できなかった場合は、この画面に残って理由を表示する
      if (deleted) {
        onBack();
      }
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
        <h1>{category ? '分類を編集' : '分類を追加'}</h1>
      </header>
      <form className="edit-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="field">
          <span>名前</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
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
      {category && (
        <section className="edit-actions">
          <button
            type="button"
            className="danger-button"
            // 件数を読み込み中のときも押せないようにする
            disabled={usage !== 0}
            onClick={() => setConfirmingDelete(true)}
          >
            この分類を削除する
          </button>
          {usage !== undefined && usage > 0 && (
            <p className="edit-actions__note">この分類を使っているメモがあるため削除できません。</p>
          )}
        </section>
      )}
      {category && confirmingDelete && (
        <ConfirmDialog
          message={`「${category.name}」を削除しますか?`}
          confirmLabel="削除する"
          onConfirm={() => handleDelete(category)}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}
