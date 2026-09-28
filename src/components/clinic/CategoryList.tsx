// 受診メモの分類の一覧(並び替え・追加・編集画面を開く。SPEC.md 8.1)
// 分類には非表示がないので、すべてを1つの一覧で並び替える
import { db } from '../../db/db';
import { reorderClinicNoteCategories } from '../../db/clinicNoteCategoryRepo';
import type { ClinicNoteCategory } from '../../lib/types';
import { SortableList } from '../common/SortableList';
import { ItemRow } from '../settings/ItemRow';

interface Props {
  categories: ClinicNoteCategory[];
  onAdd: () => void;
  onOpen: (category: ClinicNoteCategory) => void;
}

export function CategoryList({ categories, onAdd, onOpen }: Props) {
  const sorted = [...categories].sort((a, b) => a.order - b.order);

  return (
    <section className="settings-section">
      <h2>分類</h2>
      <button type="button" className="add-button" onClick={onAdd}>
        ＋ 分類を追加
      </button>
      {sorted.length === 0 && <p className="empty">分類はまだありません</p>}
      <SortableList
        className="item-list"
        items={sorted}
        onReorder={(ids) => reorderClinicNoteCategories(db, ids)}
        renderItem={(category) => <ItemRow name={category.name} hidden={false} onOpen={() => onOpen(category)} />}
        getLabel={(category) => category.name}
      />
    </section>
  );
}
