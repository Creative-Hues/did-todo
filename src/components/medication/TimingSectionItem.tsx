// 記録画面の時間帯の欄(SPEC.md 7.4)。欄をタップすると、未記録なら記録のシート、記録済みなら取り消しの確認
import { resolveRecordAlter } from '../../lib/completionLabel';
import { toYesterdayLabel, type TimingSection } from '../../lib/medication';
import { formatClockOf } from '../../lib/timeFormat';
import type { Alter } from '../../lib/types';
import { PreviousPeriodLine } from '../common/PreviousPeriodLine';
import { StockLine } from './StockLine';

interface Props {
  section: TimingSection;
  alterById: ReadonlyMap<string, Alter>;
  onTap: (section: TimingSection) => void;
}

export function TimingSectionItem({ section, alterById, onTap }: Props) {
  const latest = section.latestToday;
  const doneBy = latest ? resolveRecordAlter(latest, alterById) : null;
  const yesterday = toYesterdayLabel(section.yesterday, alterById);

  return (
    <button type="button" className={latest ? 'task-item task-item--done' : 'task-item'} onClick={() => onTap(section)}>
      <span className="task-item__status" aria-hidden="true">
        {latest ? '✓' : '○'}
      </span>
      <span className="task-item__body">
        {section.medications.map((medication) => (
          <span key={medication.id} className="intake-medication">
            <span className="item-name item-row__name">{medication.name}</span>
            <StockLine medication={medication} />
          </span>
        ))}
        {/* 完了表示「人格A・21:30」 */}
        {latest && doneBy && (
          <span className="task-item__done-by">
            <span style={doneBy.color ? { color: doneBy.color } : undefined}>{doneBy.name}</span>・
            {formatClockOf(latest.takenAt)}
          </span>
        )}
        {yesterday && <PreviousPeriodLine label={yesterday} />}
      </span>
    </button>
  );
}
