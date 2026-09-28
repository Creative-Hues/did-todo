// 決まった時間の薬を記録するシート(SPEC.md 7.4)。下から出る
// その時間帯の薬がチェック付きで並び(最初は全部チェック済み)、人格を選ぶとチェックした薬をまとめて記録する
import { useState } from 'react';
import { TIMING_LABELS } from '../../lib/medication';
import type { Alter, Medication, MedicationTiming } from '../../lib/types';
import { AlterButtons } from '../common/AlterButtons';

interface Props {
  timing: MedicationTiming;
  /** その時間帯の使用中の薬(order 順) */
  medications: Medication[];
  /** 選択肢に出す人格(非表示でない人格を order 順に並べたもの) */
  alters: Alter[];
  /** 人格を選んだとき。「わからない」は null */
  onSelect: (medicationIds: string[], alterId: string | null) => void;
  onCancel: () => void;
}

export function ScheduledIntakeSheet({ timing, medications, alters, onSelect, onCancel }: Props) {
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(() => new Set(medications.map((m) => m.id)));
  // シートを開いている間に薬が中止・削除されたときに備え、今ある薬だけを数える
  const checked = medications.filter((m) => checkedIds.has(m.id));

  const toggle = (id: string) => {
    setCheckedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="overlay overlay--bottom">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="intake-title">
        <h2 id="intake-title" className="sheet__title">
          {TIMING_LABELS[timing]}の薬を飲んだのは?
        </h2>
        <fieldset className="field intake-checks">
          <legend>飲んだ薬(飲んでいない薬はチェックを外す)</legend>
          {medications.map((medication) => (
            <label key={medication.id} className="choice">
              <input type="checkbox" checked={checkedIds.has(medication.id)} onChange={() => toggle(medication.id)} />
              <span className="item-name item-row__name">{medication.name}</span>
            </label>
          ))}
        </fieldset>
        {checked.length === 0 && <p className="form-error">薬を1つ以上選んでください</p>}
        <AlterButtons
          alters={alters}
          disabled={checked.length === 0}
          onSelect={(alterId) =>
            onSelect(
              checked.map((m) => m.id),
              alterId,
            )
          }
        />
        <button type="button" className="sheet__cancel" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  );
}
