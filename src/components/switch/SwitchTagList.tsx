// 交代のきっかけの一覧(並び替え・追加・編集画面を開く。SPEC.md 17.2)
// 並び順が、記録のときのタグの順番になる。非表示のきっかけは一覧の下に分けて表示し、並び替えない
import { db } from '../../db/db';
import { reorderSwitchTags } from '../../db/switchTagRepo';
import { sortForSettings } from '../../lib/ordering';
import type { SwitchTag } from '../../lib/types';
import { SortableList } from '../common/SortableList';
import { ItemRow } from '../settings/ItemRow';

interface Props {
  tags: SwitchTag[];
  onAdd: () => void;
  onOpen: (tag: SwitchTag) => void;
}

export function SwitchTagList({ tags, onAdd, onOpen }: Props) {
  const { visible, hidden } = sortForSettings(tags);

  const renderRow = (tag: SwitchTag) => <ItemRow name={tag.name} hidden={tag.hidden} onOpen={() => onOpen(tag)} />;

  return (
    <section className="settings-section">
      <h2>きっかけ</h2>
      <p className="settings-note">この並び順が、記録のときのきっかけの順番になります。</p>
      <button type="button" className="add-button" onClick={onAdd}>
        ＋ きっかけを追加
      </button>
      {visible.length === 0 && <p className="empty">表示中のきっかけはありません</p>}
      <SortableList
        className="item-list"
        items={visible}
        onReorder={(ids) => reorderSwitchTags(db, ids)}
        renderItem={renderRow}
        getLabel={(tag) => tag.name}
      />
      {hidden.length > 0 && (
        <>
          <h3 className="hidden-heading">非表示のきっかけ</h3>
          <ul className="item-list">
            {hidden.map((tag) => (
              <li key={tag.id} className="plain-row">
                {renderRow(tag)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
