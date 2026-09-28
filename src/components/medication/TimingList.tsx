// 服薬の時間帯の一覧(並び替え・追加・編集画面を開く。SPEC.md 7.8)
// 並び順が記録画面の欄の順番になる。非表示の時間帯は一覧の下に分けて表示し、並び替えない
import { db } from '../../db/db';
import { reorderMedicationTimings } from '../../db/medicationTimingRepo';
import { sortForSettings } from '../../lib/ordering';
import type { MedicationTiming } from '../../lib/types';
import { SortableList } from '../common/SortableList';
import { ItemRow } from '../settings/ItemRow';

interface Props {
  timings: MedicationTiming[];
  onAdd: () => void;
  onOpen: (timing: MedicationTiming) => void;
}

export function TimingList({ timings, onAdd, onOpen }: Props) {
  const { visible, hidden } = sortForSettings(timings);

  const renderRow = (timing: MedicationTiming) => (
    <ItemRow name={timing.name} hidden={timing.hidden} onOpen={() => onOpen(timing)} />
  );

  return (
    <section className="settings-section">
      <h2>時間帯</h2>
      <p className="settings-note">この並び順が、記録画面の欄の順番になります。</p>
      <button type="button" className="add-button" onClick={onAdd}>
        ＋ 時間帯を追加
      </button>
      {visible.length === 0 && <p className="empty">表示中の時間帯はありません</p>}
      <SortableList
        className="item-list"
        items={visible}
        onReorder={(ids) => reorderMedicationTimings(db, ids)}
        renderItem={renderRow}
        getLabel={(timing) => timing.name}
      />
      {hidden.length > 0 && (
        <>
          <h3 className="hidden-heading">非表示の時間帯</h3>
          <ul className="item-list">
            {hidden.map((timing) => (
              <li key={timing.id} className="plain-row">
                {renderRow(timing)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
