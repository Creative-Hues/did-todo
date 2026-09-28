// 薬の一覧(並び替え・追加・編集画面を開く。SPEC.md 7章・7.7)
// 中止した薬は一覧の下に分けて表示し、並び替えない
import { db } from '../../db/db';
import { reorderMedications } from '../../db/medicationRepo';
import { medicationKindLabel, sortMedications, stockText } from '../../lib/medication';
import type { Medication } from '../../lib/types';
import { SortableList } from '../common/SortableList';
import { ItemRow } from '../settings/ItemRow';

interface Props {
  medications: Medication[];
  onAdd: () => void;
  onOpen: (medication: Medication) => void;
}

export function MedicationList({ medications, onAdd, onOpen }: Props) {
  const { active, stopped } = sortMedications(medications);

  const renderRow = (medication: Medication) => (
    <ItemRow
      name={medication.name}
      hidden={medication.status === 'stopped'}
      sub={
        <>
          <span className="item-sub">{medicationKindLabel(medication)}</span>
          <span className="item-sub">{stockText(medication)}</span>
        </>
      }
      onOpen={() => onOpen(medication)}
    />
  );

  return (
    <section className="settings-section">
      <h2>薬</h2>
      <button type="button" className="add-button" onClick={onAdd}>
        ＋ 薬を登録
      </button>
      {active.length === 0 && <p className="empty">使用中の薬はありません</p>}
      <SortableList
        className="item-list"
        items={active}
        onReorder={(ids) => reorderMedications(db, ids)}
        renderItem={renderRow}
        getLabel={(medication) => medication.name}
      />
      {stopped.length > 0 && (
        <>
          <h3 className="hidden-heading">中止した薬</h3>
          <ul className="item-list">
            {stopped.map((medication) => (
              <li key={medication.id} className="plain-row">
                {renderRow(medication)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
