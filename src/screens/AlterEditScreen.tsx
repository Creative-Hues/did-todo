// 人格の追加・編集画面(SPEC.md 5.4)。編集のときは非表示/再表示と削除もここから行う
import { useState } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { AlterForm } from '../components/settings/AlterForm';
import { db } from '../db/db';
import { addAlter, countAlterRecords, deleteAlter, setAlterHidden, updateAlter, type AlterInput } from '../db/alterRepo';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { showSaveError } from '../lib/showError';
import type { Alter } from '../lib/types';

interface Props {
  /** 編集する人格(追加のときは undefined) */
  alter?: Alter;
  onBack: () => void;
}

export function AlterEditScreen({ alter, onBack }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // 完了記録の件数(1件以上あると削除できない。SPEC.md 3.1)
  const recordCount = useLiveQuery(
    () => (alter ? countAlterRecords(db, alter.id) : Promise.resolve(0)),
    [alter?.id],
  );

  const handleSubmit = async (input: AlterInput) => {
    try {
      if (alter) {
        await updateAlter(db, alter.id, input);
      } else {
        await addAlter(db, input, new Date());
      }
      onBack();
    } catch (error) {
      showSaveError(error);
    }
  };

  const handleToggleHidden = async (target: Alter) => {
    try {
      await setAlterHidden(db, target.id, !target.hidden);
      onBack();
    } catch (error) {
      showSaveError(error);
    }
  };

  const handleDelete = async (target: Alter) => {
    try {
      const deleted = await deleteAlter(db, target.id);
      setConfirmingDelete(false);
      // 確認中に記録が増えて削除できなかった場合は、この画面に残って理由を表示する
      if (deleted) {
        onBack();
      }
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
        <h1>{alter ? '人格を編集' : '人格を追加'}</h1>
      </header>
      <AlterForm initial={alter} onSubmit={handleSubmit} onCancel={onBack} />
      {alter && (
        <section className="edit-actions">
          <button type="button" onClick={() => handleToggleHidden(alter)}>
            {alter.hidden ? '再表示する' : '非表示にする'}
          </button>
          <button
            type="button"
            className="danger-button"
            // 件数を読み込み中のときも押せないようにする
            disabled={recordCount !== 0}
            onClick={() => setConfirmingDelete(true)}
          >
            この人格を削除する
          </button>
          {recordCount !== undefined && recordCount > 0 && (
            <p className="edit-actions__note">完了記録があるため削除できません。非表示にはできます。</p>
          )}
        </section>
      )}
      {alter && confirmingDelete && (
        <ConfirmDialog
          message={`「${alter.name}」を削除しますか?`}
          confirmLabel="削除する"
          onConfirm={() => handleDelete(alter)}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}
