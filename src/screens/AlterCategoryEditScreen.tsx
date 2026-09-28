// 人格の区分の追加・編集画面(SPEC.md 10.2)
// 編集のときは、削除もここから行う(その区分の人格がいないときだけ)
import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { db } from '../db/db';
import {
  addAlterCategory,
  countAlterCategoryUsage,
  deleteAlterCategory,
  renameAlterCategory,
  type SaveAlterCategoryResult,
} from '../db/alterCategoryRepo';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { showSaveError } from '../lib/showError';
import type { AlterCategory } from '../lib/types';
import { normalizeName } from '../lib/validation';

interface Props {
  /** 編集する区分(追加のときは undefined) */
  category?: AlterCategory;
  onBack: () => void;
}

export function AlterCategoryEditScreen({ category, onBack }: Props) {
  const [name, setName] = useState(category?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // その区分の人格の人数(非表示の人格も含む。1人以上いると削除できない)
  const usage = useLiveQuery(
    () => (category ? countAlterCategoryUsage(db, category.id) : Promise.resolve(0)),
    [category?.id],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeName(name);
    if (normalized === null) {
      setError('区分の名前を入力してください');
      return;
    }
    try {
      const result: SaveAlterCategoryResult | null = category
        ? await renameAlterCategory(db, category.id, normalized)
        : await addAlterCategory(db, normalized, new Date());
      if (result && !result.ok) {
        setError('同じ名前の区分があります');
        return;
      }
      onBack();
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  const handleDelete = async (target: AlterCategory) => {
    try {
      const deleted = await deleteAlterCategory(db, target.id);
      setConfirmingDelete(false);
      // 確認中にこの区分の人格が増えて削除できなかった場合は、この画面に残って理由を表示する
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
        <h1>{category ? '区分を編集' : '区分を追加'}</h1>
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
            // 人数を読み込み中のときも押せないようにする
            disabled={usage !== 0}
            onClick={() => setConfirmingDelete(true)}
          >
            この区分を削除する
          </button>
          {usage !== undefined && usage > 0 && (
            <p className="edit-actions__note">この区分の人格がいるため削除できません。</p>
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
