// 人格の設定(一覧+追加・編集)
import { useState } from 'react';
import { db } from '../../db/db';
import { addAlter, moveAlter, setAlterHidden, updateAlter, type AlterInput } from '../../db/alterRepo';
import { sortForSettings } from '../../lib/ordering';
import { showSaveError } from '../../lib/showError';
import type { Alter } from '../../lib/types';
import { AlterForm } from './AlterForm';
import { ItemRow } from './ItemRow';

/** 編集中の状態:なし / 新規追加 / 既存の人格の編集 */
type Editing = null | { mode: 'new' } | { mode: 'edit'; alter: Alter };

interface Props {
  alters: Alter[];
}

export function AlterList({ alters }: Props) {
  const [editing, setEditing] = useState<Editing>(null);
  const { visible, hidden } = sortForSettings(alters);

  const handleSubmit = async (input: AlterInput) => {
    try {
      if (editing?.mode === 'edit') {
        await updateAlter(db, editing.alter.id, input);
      } else {
        await addAlter(db, input, new Date());
      }
      setEditing(null);
    } catch (error) {
      showSaveError(error);
    }
  };

  const renderRow = (alter: Alter, index: number, list: Alter[]) => (
    <ItemRow
      key={alter.id}
      hidden={alter.hidden}
      canMoveUp={index > 0}
      canMoveDown={index < list.length - 1}
      onMoveUp={() => moveAlter(db, alter.id, 'up').catch(showSaveError)}
      onMoveDown={() => moveAlter(db, alter.id, 'down').catch(showSaveError)}
      onEdit={() => setEditing({ mode: 'edit', alter })}
      onToggleHidden={() => setAlterHidden(db, alter.id, !alter.hidden).catch(showSaveError)}
    >
      <span className="color-dot" style={{ backgroundColor: alter.color }} />
      <span className="item-name">{alter.name}</span>
    </ItemRow>
  );

  return (
    <section className="settings-section">
      <h2>人格</h2>
      {editing ? (
        <AlterForm
          // 編集対象が変わったら入力欄を作り直す
          key={editing.mode === 'edit' ? editing.alter.id : 'new'}
          initial={editing.mode === 'edit' ? editing.alter : undefined}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button type="button" className="add-button" onClick={() => setEditing({ mode: 'new' })}>
          ＋ 人格を追加
        </button>
      )}
      {visible.length === 0 && <p className="empty">人格がまだ登録されていません</p>}
      <ul className="item-list">{visible.map(renderRow)}</ul>
      {hidden.length > 0 && (
        <>
          <h3 className="hidden-heading">非表示の人格</h3>
          <ul className="item-list">{hidden.map(renderRow)}</ul>
        </>
      )}
    </section>
  );
}
