// 記録の一覧の1行(SPEC.md 7.6)。誰が・いつ・何を・頓服の理由
// 決まった時間は時間帯ごとにまとめて1行、頓服は1件ずつ。タップすると取り消しの確認
import { resolveRecordAlter } from '../../lib/completionLabel';
import { TIMING_LABELS, type HistoryEntry } from '../../lib/medication';
import { formatClockOf } from '../../lib/timeFormat';
import type { Alter, Medication, MedicationIntake } from '../../lib/types';

/** 薬が見つからないとき(ふつうは起きない。記録のある薬は削除できないため)の表示名 */
export const UNKNOWN_MEDICATION_NAME = '(不明な薬)';

interface Props {
  entry: HistoryEntry;
  medicationById: ReadonlyMap<string, Medication>;
  alterById: ReadonlyMap<string, Alter>;
  onTap: (entry: HistoryEntry) => void;
}

export function HistoryEntryItem({ entry, medicationById, alterById, onTap }: Props) {
  const intakes: MedicationIntake[] = entry.kind === 'scheduled' ? entry.intakes : [entry.intake];
  // 時間帯の記録はまとめて記録するので、人格と時刻は最後の記録のものを出す
  const latest = intakes[intakes.length - 1];
  const alter = resolveRecordAlter(latest, alterById);
  const nameOf = (intake: MedicationIntake) => medicationById.get(intake.medicationId)?.name ?? UNKNOWN_MEDICATION_NAME;

  return (
    <button type="button" className="task-item history-entry" onClick={() => onTap(entry)}>
      <span className="history-entry__time">{formatClockOf(entry.takenAt)}</span>
      <span className="task-item__body">
        <span className="history-entry__head">
          <span className="item-name">{entry.kind === 'scheduled' ? TIMING_LABELS[entry.timing] : '頓服'}</span>
          <span className="task-item__done-by" style={alter.color ? { color: alter.color } : undefined}>
            {alter.name}
          </span>
        </span>
        {intakes.map((intake) => (
          <span key={intake.id} className="item-row__name history-entry__medication">
            {nameOf(intake)}
          </span>
        ))}
        {entry.kind === 'asNeeded' && entry.intake.reason !== '' && (
          <span className="history-entry__reason">理由:{entry.intake.reason}</span>
        )}
      </span>
    </button>
  );
}
