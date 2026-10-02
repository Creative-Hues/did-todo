// 交代のきっかけの追加・編集画面(SPEC.md 17.2)
// 編集のときは、非表示/再表示と削除(使っている記録がないきっかけだけ)もここから行う
import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { db } from '../db/db';
import {
  addSwitchTag,
  countSwitchTagUsage,
  deleteSwitchTag,
  renameSwitchTag,
  setSwitchTagHidden,
  type SaveSwitchTagResult,
} from '../db/switchTagRepo';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { showSaveError } from '../lib/showError';
import type { SwitchTag } from '../lib/types';
import { normalizeName } from '../lib/validation';

interface Props {
  /** 編集するきっかけ(追加のときは undefined) */
  tag?: SwitchTag;
  onBack: () => void;
}

export function SwitchTagEditScreen({ tag, onBack }: Props) {
  const [name, setName] = useState(tag?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // そのきっかけを使っている記録の件数(1件以上あると削除できない)
  const usage = useLiveQuery(() => (tag ? countSwitchTagUsage(db, tag.id) : Promise.resolve(0)), [tag?.id]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeName(name);
    if (normalized === null) {
      setError('きっかけの名前を入力してください');
      return;
    }
    try {
      const result: SaveSwitchTagResult | null = tag
        ? await renameSwitchTag(db, tag.id, normalized)
        : await addSwitchTag(db, normalized, new Date());
      if (result && !result.ok) {
        setError('同じ名前のきっかけがあります');
        return;
      }
      onBack();
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  const handleToggleHidden = async (target: SwitchTag) => {
    try {
      await setSwitchTagHidden(db, target.id, !target.hidden);
      onBack();
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  const handleDelete = async (target: SwitchTag) => {
    try {
      const deleted = await deleteSwitchTag(db, target.id);
      setConfirmingDelete(false);
      // 確認中に記録が増えて削除できなかった場合は、この画面に残って理由を表示する
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
        <h1>{tag ? 'きっかけを編集' : 'きっかけを追加'}</h1>
      </header>
      <form className="edit-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="field">
          <span>名前</span>
          <input
            type="text"
            value={name}
            placeholder="例:人混み、光"
            onChange={(event) => setName(event.target.value)}
          />
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
      {tag && (
        <section className="edit-actions">
          <button type="button" onClick={() => void handleToggleHidden(tag)}>
            {tag.hidden ? '再表示する' : '非表示にする'}
          </button>
          <p className="edit-actions__note">非表示にすると、記録のときに選べなくなります。過去の記録はそのまま残ります。</p>
          <button
            type="button"
            className="danger-button"
            // 件数を読み込み中のときも押せないようにする
            disabled={usage !== 0}
            onClick={() => setConfirmingDelete(true)}
          >
            このきっかけを削除する
          </button>
          {usage !== undefined && usage > 0 && (
            <p className="edit-actions__note">このきっかけを使っている記録があるため削除できません。非表示にはできます。</p>
          )}
        </section>
      )}
      {tag && confirmingDelete && (
        <ConfirmDialog
          message={`「${tag.name}」を削除しますか?`}
          confirmLabel="削除する"
          onConfirm={() => void handleDelete(tag)}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}
