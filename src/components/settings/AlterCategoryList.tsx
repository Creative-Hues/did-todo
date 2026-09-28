// 人格の区分の一覧(並び替え・追加・編集画面を開く。SPEC.md 10.2)
// 区分には非表示がないので、すべてを1つの一覧で並び替える
import { db } from '../../db/db';
import { reorderAlterCategories } from '../../db/alterCategoryRepo';
import type { AlterCategory } from '../../lib/types';
import { SortableList } from '../common/SortableList';
import { ItemRow } from './ItemRow';

interface Props {
  categories: AlterCategory[];
  onAdd: () => void;
  onOpen: (category: AlterCategory) => void;
}

export function AlterCategoryList({ categories, onAdd, onOpen }: Props) {
  const sorted = [...categories].sort((a, b) => a.order - b.order);

  return (
    <section className="settings-section">
      <h2>区分</h2>
      <button type="button" className="add-button" onClick={onAdd}>
        ＋ 区分を追加
      </button>
      {sorted.length === 0 && <p className="empty">区分はまだありません</p>}
      <SortableList
        className="item-list"
        items={sorted}
        onReorder={(ids) => reorderAlterCategories(db, ids)}
        renderItem={(category) => <ItemRow name={category.name} hidden={false} onOpen={() => onOpen(category)} />}
        getLabel={(category) => category.name}
      />
    </section>
  );
}
