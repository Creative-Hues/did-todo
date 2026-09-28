// 頓服を記録するシート(SPEC.md 7.5)。下から出る
// 飲んだ理由(空欄可)を入れて、人格を選ぶと記録する
import { useState } from 'react';
import type { Alter, Medication } from '../../lib/types';
import { AlterButtons } from '../common/AlterButtons';

interface Props {
  medication: Medication;
  /** 選択肢に出す人格(非表示でない人格を order 順に並べたもの) */
  alters: Alter[];
  /** 人格を選んだとき。「わからない」は null */
  onSelect: (alterId: string | null, reason: string) => void;
  onCancel: () => void;
}

export function AsNeededIntakeSheet({ medication, alters, onSelect, onCancel }: Props) {
  const [reason, setReason] = useState('');

  return (
    <div className="overlay overlay--bottom">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="as-needed-title">
        <h2 id="as-needed-title" className="sheet__title">
          「{medication.name}」を飲んだのは?
        </h2>
        <label className="field">
          <span>飲んだ理由(空欄でもかまいません)</span>
          <input type="text" value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        <AlterButtons alters={alters} onSelect={(alterId) => onSelect(alterId, reason)} />
        <button type="button" className="sheet__cancel" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  );
}
