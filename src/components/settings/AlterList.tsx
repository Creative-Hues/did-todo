// 人格の一覧(並び替え・追加・編集画面を開く)
import { db } from '../../db/db';
import { reorderAlters } from '../../db/alterRepo';
import { sortForSettings } from '../../lib/ordering';
import type { Alter } from '../../lib/types';
import { SortableList } from '../common/SortableList';
import { ItemRow } from './ItemRow';

interface Props {
  alters: Alter[];
  onAdd: () => void;
  onOpen: (alter: Alter) => void;
}

export function AlterList({ alters, onAdd, onOpen }: Props) {
  const { visible, hidden } = sortForSettings(alters);

  const renderRow = (alter: Alter) => (
    <ItemRow
      name={alter.name}
      hidden={alter.hidden}
      leading={<span className="color-dot" style={{ backgroundColor: alter.color }} />}
      onOpen={() => onOpen(alter)}
    />
  );

  return (
    <section className="settings-section">
      <h2>人格</h2>
      <button type="button" className="add-button" onClick={onAdd}>
        ＋ 人格を追加
      </button>
      {visible.length === 0 && <p className="empty">人格がまだ登録されていません</p>}
      <SortableList
        className="item-list"
        items={visible}
        onReorder={(ids) => reorderAlters(db, ids)}
        renderItem={renderRow}
        getLabel={(alter) => alter.name}
      />
      {hidden.length > 0 && (
        <>
          <h3 className="hidden-heading">非表示の人格</h3>
          {/* 非表示の一覧は並び替えない */}
          <ul className="item-list">
            {hidden.map((alter) => (
              <li key={alter.id} className="plain-row">
                {renderRow(alter)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
