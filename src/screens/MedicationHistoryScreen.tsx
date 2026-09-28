// 服薬の記録の一覧(SPEC.md 7.6):論理日ごと(新しい日が上、1日の中は古い順)に、誰が・いつ・何を・頓服の理由
// 朝5時前の記録は、時刻の前に「翌」を付ける(行の時刻と、取り消しの確認文の時刻)
// 決まった時間の記録はタップで時間帯ごとまとめて取り消し(7.4)、頓服は1件ずつ取り消す(7.5)
import { useState } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { HistoryEntryItem, UNKNOWN_MEDICATION_NAME } from '../components/medication/HistoryEntryItem';
import { db } from '../db/db';
import { undoAsNeededIntake, undoScheduledIntakes } from '../db/medicationRepo';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { groupIntakesByLogicalDay, intakeLabelText, type HistoryEntry } from '../lib/medication';
import { timingNameOf } from '../lib/medicationTimings';
import type { LogicalDate } from '../lib/period';
import { showSaveError } from '../lib/showError';
import { formatLogicalDateHeading } from '../lib/timeFormat';

/** 取り消しの確認を出している記録 */
interface Undoing {
  logicalDate: LogicalDate;
  entry: HistoryEntry;
  message: string;
}

interface Props {
  onBack: () => void;
}

export function MedicationHistoryScreen({ onBack }: Props) {
  const alters = useLiveQuery(() => db.alters.toArray());
  const medications = useLiveQuery(() => db.medications.toArray());
  const intakes = useLiveQuery(() => db.medicationIntakes.toArray());
  const timings = useLiveQuery(() => db.medicationTimings.toArray());
  const [undoing, setUndoing] = useState<Undoing | null>(null);

  if (!alters || !medications || !timings || !intakes) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  const alterById = new Map(alters.map((alter) => [alter.id, alter]));
  const medicationById = new Map(medications.map((medication) => [medication.id, medication]));
  const timingById = new Map(timings.map((timing) => [timing.id, timing]));
  const days = groupIntakesByLogicalDay(intakes);

  const handleTap = (logicalDate: LogicalDate, entry: HistoryEntry) => {
    const heading = formatLogicalDateHeading(logicalDate);
    if (entry.kind === 'scheduled') {
      const label = intakeLabelText(entry.intakes[entry.intakes.length - 1], alterById, logicalDate);
      setUndoing({
        logicalDate,
        entry,
        message: `${heading}の${timingNameOf(entry.timing, timingById)}の「${label}」の記録を取り消しますか?この時間帯の薬の記録がまとめて取り消され、残りの錠数も戻ります。`,
      });
    } else {
      const name = medicationById.get(entry.intake.medicationId)?.name ?? UNKNOWN_MEDICATION_NAME;
      const label = intakeLabelText(entry.intake, alterById, logicalDate);
      setUndoing({
        logicalDate,
        entry,
        message: `${heading}の「${name}」の「${label}」の記録を取り消しますか?残りの錠数も戻ります。`,
      });
    }
  };

  const handleUndo = async ({ logicalDate, entry }: Undoing) => {
    try {
      if (entry.kind === 'scheduled') {
        await undoScheduledIntakes(db, entry.timing, logicalDate);
      } else {
        await undoAsNeededIntake(db, entry.intake.id);
      }
      setUndoing(null);
    } catch (error) {
      showSaveError(error);
    }
  };

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>記録の一覧</h1>
      </header>
      {days.length === 0 && <p className="empty">服薬の記録はありません</p>}
      {days.map((day) => (
        <section key={day.logicalDate} className="home-section">
          <h2>{formatLogicalDateHeading(day.logicalDate)}</h2>
          <ul className="task-list">
            {day.entries.map((entry) => (
              <li key={entry.kind === 'scheduled' ? `${entry.timing}` : entry.intake.id}>
                <HistoryEntryItem
                  entry={entry}
                  logicalDate={day.logicalDate}
                  medicationById={medicationById}
                  timingById={timingById}
                  alterById={alterById}
                  onTap={(tapped) => handleTap(day.logicalDate, tapped)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {undoing && (
        <ConfirmDialog
          message={undoing.message}
          confirmLabel="取り消す"
          onConfirm={() => handleUndo(undoing)}
          onCancel={() => setUndoing(null)}
        />
      )}
    </main>
  );
}
