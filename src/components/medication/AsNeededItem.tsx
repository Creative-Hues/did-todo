// 記録画面の頓服1つ分(SPEC.md 7.5)。タップすると記録のシート。何回でも記録できる
// 「前回:人格B・3時間前」を出す(飲んでいいかどうかの判断はしない)
import { toLastAsNeededLabel } from '../../lib/medication';
import type { Alter, Medication, MedicationIntake } from '../../lib/types';
import { PreviousPeriodLine } from '../common/PreviousPeriodLine';
import { StockLine } from './StockLine';

interface Props {
  medication: Medication;
  /** 前回の記録(なければ null) */
  last: MedicationIntake | null;
  now: Date;
  alterById: ReadonlyMap<string, Alter>;
  onTap: (medication: Medication) => void;
}

export function AsNeededItem({ medication, last, now, alterById, onTap }: Props) {
  const previous = toLastAsNeededLabel(last, now, alterById);
  return (
    <button type="button" className="task-item" onClick={() => onTap(medication)}>
      <span className="task-item__status" aria-hidden="true">
        ○
      </span>
      <span className="task-item__body">
        <span className="intake-medication">
          <span className="item-name item-row__name">{medication.name}</span>
          <StockLine medication={medication} />
        </span>
        {previous && <PreviousPeriodLine label={previous} />}
      </span>
    </button>
  );
}
