// 服薬の時間帯の追加・編集画面(SPEC.md 7.8)
// 編集のときは、非表示/再表示と削除もここから行う
import { useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { db } from '../db/db';
import {
  addMedicationTiming,
  countMedicationTimingUsage,
  deleteMedicationTiming,
  renameMedicationTiming,
  setMedicationTimingHidden,
  type SaveTimingResult,
} from '../db/medicationTimingRepo';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { showSaveError } from '../lib/showError';
import type { MedicationTiming } from '../lib/types';
import { normalizeName } from '../lib/validation';

interface Props {
  /** 編集する時間帯(追加のときは undefined) */
  timing?: MedicationTiming;
  onBack: () => void;
}

export function TimingEditScreen({ timing, onBack }: Props) {
  const [name, setName] = useState(timing?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // 使っている薬(中止した薬も含む)と服薬記録の件数(どちらかが1件以上あると削除できない)
  const usage = useLiveQuery(
    () => (timing ? countMedicationTimingUsage(db, timing.id) : Promise.resolve({ medications: 0, intakes: 0 })),
    [timing?.id],
  );
  const inUse = usage === undefined || usage.medications > 0 || usage.intakes > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeName(name);
    if (normalized === null) {
      setError('時間帯の名前を入力してください');
      return;
    }
    try {
      const result: SaveTimingResult | null = timing
        ? await renameMedicationTiming(db, timing.id, normalized)
        : await addMedicationTiming(db, normalized, new Date());
      if (result && !result.ok) {
        setError('同じ名前の時間帯があります');
        return;
      }
      onBack();
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  const handleToggleHidden = async (target: MedicationTiming) => {
    try {
      await setMedicationTimingHidden(db, target.id, !target.hidden);
      onBack();
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  const handleDelete = async (target: MedicationTiming) => {
    try {
      const deleted = await deleteMedicationTiming(db, target.id);
      setConfirmingDelete(false);
      // 確認中に薬や記録が増えて削除できなかった場合は、この画面に残って理由を表示する
      if (deleted) {
        onBack();
      }
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>{timing ? '時間帯を編集' : '時間帯を追加'}</h1>
      </header>
      <form className="edit-form" onSubmit={(event) => void handleSubmit(event)}>
        <label className="field">
          <span>名前</span>
          <input
            type="text"
            value={name}
            placeholder="例:朝食前、食間"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-buttons">
          <button type="button" onClick={onBack}>
            キャンセル
          </button>
          <button type="submit" className="primary">
            保存
          </button>
        </div>
      </form>
      {timing && (
        <section className="edit-actions">
          <button type="button" onClick={() => handleToggleHidden(timing)}>
            {timing.hidden ? '再表示する' : '非表示にする'}
          </button>
          <p className="edit-actions__note">非表示にすると、薬の登録で選べなくなります。記録はそのまま残ります。</p>
          <button
            type="button"
            className="danger-button"
            // 件数を読み込み中のときも押せないようにする
            disabled={inUse}
            onClick={() => setConfirmingDelete(true)}
          >
            この時間帯を削除する
          </button>
          {usage !== undefined && inUse && (
            <p className="edit-actions__note">
              この時間帯を使っている薬か服薬記録があるため削除できません。非表示にはできます。
            </p>
          )}
        </section>
      )}
      {timing && confirmingDelete && (
        <ConfirmDialog
          message={`「${timing.name}」を削除しますか?`}
          confirmLabel="削除する"
          onConfirm={() => handleDelete(timing)}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}
