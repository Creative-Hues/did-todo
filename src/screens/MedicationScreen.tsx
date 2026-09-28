// 服薬タブの最初の画面(SPEC.md 7章):記録画面
// 上に時間帯ごと(朝食後/昼食後/夕食後/寝る前)の欄、その下に頓服。中止した薬は出さない(7.7)
// 「記録の一覧」は段階Dで足す
import { useState } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { AsNeededIntakeSheet } from '../components/medication/AsNeededIntakeSheet';
import { AsNeededItem } from '../components/medication/AsNeededItem';
import { ScheduledIntakeSheet } from '../components/medication/ScheduledIntakeSheet';
import { TimingSectionItem } from '../components/medication/TimingSectionItem';
import { db } from '../db/db';
import { recordAsNeededIntake, recordScheduledIntakes, undoScheduledIntakes } from '../db/medicationRepo';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNow } from '../hooks/useNow';
import {
  TIMING_LABELS,
  buildTimingSections,
  findLastAsNeeded,
  intakeLabelText,
  sortMedications,
  type TimingSection,
} from '../lib/medication';
import { sortForSettings } from '../lib/ordering';
import { toLogicalDate } from '../lib/period';
import { showSaveError } from '../lib/showError';
import type { Medication, MedicationTiming } from '../lib/types';

/** 開いているシート・確認:なし / 時間帯の記録 / 時間帯の取り消しの確認 / 頓服の記録 */
type Modal =
  | null
  | { kind: 'scheduled'; timing: MedicationTiming }
  | { kind: 'undo'; timing: MedicationTiming; labelText: string }
  | { kind: 'asNeeded'; medicationId: string };

interface Props {
  onOpenSettings: () => void;
}

export function MedicationScreen({ onOpenSettings }: Props) {
  const alters = useLiveQuery(() => db.alters.toArray());
  const medications = useLiveQuery(() => db.medications.toArray());
  const intakes = useLiveQuery(() => db.medicationIntakes.toArray());
  const now = useNow();
  const [modal, setModal] = useState<Modal>(null);

  const alterById = new Map((alters ?? []).map((alter) => [alter.id, alter]));
  const pickerAlters = sortForSettings(alters ?? []).visible;
  const sections = medications && intakes ? buildTimingSections(medications, intakes, now) : [];
  const asNeeded = sortMedications(medications ?? []).active.filter((m) => m.kind === 'asNeeded');

  const handleTapSection = (section: TimingSection) => {
    if (section.latestToday) {
      setModal({
        kind: 'undo',
        timing: section.timing,
        labelText: intakeLabelText(section.latestToday, alterById),
      });
    } else {
      setModal({ kind: 'scheduled', timing: section.timing });
    }
  };

  // 記録・取り消しの時刻は、ボタンを押した瞬間の時刻を使う
  const handleRecordScheduled = async (timing: MedicationTiming, medicationIds: string[], alterId: string | null) => {
    try {
      // 別の人格が先に記録していたときは記録されない(null)。どちらでもシートは閉じる
      await recordScheduledIntakes(db, timing, medicationIds, alterId, new Date());
      setModal(null);
    } catch (error) {
      showSaveError(error);
    }
  };

  const handleUndoScheduled = async (timing: MedicationTiming) => {
    try {
      await undoScheduledIntakes(db, timing, toLogicalDate(new Date()));
      setModal(null);
    } catch (error) {
      showSaveError(error);
    }
  };

  const handleRecordAsNeeded = async (medication: Medication, alterId: string | null, reason: string) => {
    try {
      await recordAsNeededIntake(db, medication.id, alterId, reason, new Date());
      setModal(null);
    } catch (error) {
      showSaveError(error);
    }
  };

  const renderContent = () => {
    if (!alters || !medications || !intakes) {
      return <p>読み込み中…</p>;
    }
    if (sections.length === 0 && asNeeded.length === 0) {
      return <p className="empty">使用中の薬はありません。「薬の設定」から登録できます</p>;
    }
    return (
      <>
        {sections.map((section) => (
          <section key={section.timing} className="home-section">
            <h2>{TIMING_LABELS[section.timing]}</h2>
            <TimingSectionItem section={section} alterById={alterById} onTap={handleTapSection} />
          </section>
        ))}
        {asNeeded.length > 0 && (
          <section className="home-section">
            <h2>頓服</h2>
            <ul className="task-list">
              {asNeeded.map((medication) => (
                <li key={medication.id}>
                  <AsNeededItem
                    medication={medication}
                    last={findLastAsNeeded(medication.id, intakes)}
                    now={now}
                    alterById={alterById}
                    onTap={() => setModal({ kind: 'asNeeded', medicationId: medication.id })}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  };

  // シートを開いている間に薬が中止・削除されたら、シートを出さない
  const scheduledSection =
    modal?.kind === 'scheduled' ? sections.find((section) => section.timing === modal.timing) : undefined;
  const asNeededMedication =
    modal?.kind === 'asNeeded' ? asNeeded.find((medication) => medication.id === modal.medicationId) : undefined;

  return (
    <main className="app">
      <header className="screen-header">
        <h1>服薬</h1>
        <div className="header-buttons">
          <button type="button" onClick={onOpenSettings}>
            薬の設定
          </button>
        </div>
      </header>
      {renderContent()}
      {scheduledSection && (
        <ScheduledIntakeSheet
          timing={scheduledSection.timing}
          medications={scheduledSection.medications}
          alters={pickerAlters}
          onSelect={(medicationIds, alterId) => handleRecordScheduled(scheduledSection.timing, medicationIds, alterId)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === 'undo' && (
        <ConfirmDialog
          message={`${TIMING_LABELS[modal.timing]}の「${modal.labelText}」の記録を取り消しますか?この時間帯の薬の記録がまとめて取り消され、残りの錠数も戻ります。`}
          confirmLabel="取り消す"
          onConfirm={() => handleUndoScheduled(modal.timing)}
          onCancel={() => setModal(null)}
        />
      )}
      {asNeededMedication && (
        <AsNeededIntakeSheet
          medication={asNeededMedication}
          alters={pickerAlters}
          onSelect={(alterId, reason) => handleRecordAsNeeded(asNeededMedication, alterId, reason)}
          onCancel={() => setModal(null)}
        />
      )}
    </main>
  );
}
