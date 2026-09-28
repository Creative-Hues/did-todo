// 薬の登録・編集画面(SPEC.md 7.1・7.2・7.7)
// 編集のときは、残りの錠数(補充・数え直し・履歴)、中止/再開、削除もここから行う
import { useState } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { MedicationForm } from '../components/medication/MedicationForm';
import { StockPanel } from '../components/medication/StockPanel';
import { db } from '../db/db';
import {
  addMedication,
  countMedicationIntakes,
  deleteMedication,
  setMedicationStatus,
  updateMedication,
  type MedicationInput,
} from '../db/medicationRepo';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { showSaveError } from '../lib/showError';
import type { Medication } from '../lib/types';

interface Props {
  /** 編集する薬(登録のときは undefined) */
  medication?: Medication;
  onBack: () => void;
}

export function MedicationEditScreen({ medication, onBack }: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // 服薬記録の件数(1件以上あると削除できない。SPEC.md 7.7)
  const intakeCount = useLiveQuery(
    () => (medication ? countMedicationIntakes(db, medication.id) : Promise.resolve(0)),
    [medication?.id],
  );

  const handleSubmit = async (input: MedicationInput, remaining: number | null) => {
    try {
      if (medication) {
        await updateMedication(db, medication.id, input);
      } else {
        await addMedication(db, input, remaining ?? 0, new Date());
      }
      onBack();
    } catch (error) {
      showSaveError(error);
    }
  };

  const handleToggleStatus = async (target: Medication) => {
    try {
      await setMedicationStatus(db, target.id, target.status === 'active' ? 'stopped' : 'active');
      onBack();
    } catch (error) {
      showSaveError(error);
    }
  };

  const handleDelete = async (target: Medication) => {
    try {
      const deleted = await deleteMedication(db, target.id);
      setConfirmingDelete(false);
      // 確認中に記録が増えて削除できなかった場合は、この画面に残って理由を表示する
      if (deleted) {
        onBack();
      }
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
        <h1>{medication ? '薬を編集' : '薬を登録'}</h1>
      </header>
      <MedicationForm initial={medication} onSubmit={handleSubmit} onCancel={onBack} />
      {medication && (
        <>
          <StockPanel medication={medication} />
          <section className="edit-actions">
            <button type="button" onClick={() => handleToggleStatus(medication)}>
              {medication.status === 'active' ? '中止する' : '再開する'}
            </button>
            <button
              type="button"
              className="danger-button"
              // 件数を読み込み中のときも押せないようにする
              disabled={intakeCount !== 0}
              onClick={() => setConfirmingDelete(true)}
            >
              この薬を削除する
            </button>
            {intakeCount !== undefined && intakeCount > 0 && (
              <p className="edit-actions__note">服薬記録があるため削除できません。中止にはできます。</p>
            )}
          </section>
        </>
      )}
      {medication && confirmingDelete && (
        <ConfirmDialog
          message={`「${medication.name}」を削除しますか?在庫の履歴も消えます。`}
          confirmLabel="削除する"
          onConfirm={() => handleDelete(medication)}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}
