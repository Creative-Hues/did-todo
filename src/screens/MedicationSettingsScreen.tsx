// 薬の設定(SPEC.md 7章):服薬タブの「薬の設定」から開く一覧と編集画面、「時間帯の設定」(7.8)の入口
import { useState } from 'react';
import { MedicationList } from '../components/medication/MedicationList';
import { db } from '../db/db';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { MedicationEditScreen } from './MedicationEditScreen';
import { TimingSettingsScreen } from './TimingSettingsScreen';

/** 表示中の画面:一覧 / 薬の編集(id が null なら新規登録) / 時間帯の設定 */
type View = { kind: 'list' } | { kind: 'medication'; id: string | null } | { kind: 'timings' };

interface Props {
  onBack: () => void;
}

export function MedicationSettingsScreen({ onBack }: Props) {
  const medications = useLiveQuery(() => db.medications.toArray());
  const timings = useLiveQuery(() => db.medicationTimings.toArray());
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    rememberScroll();
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!medications || !timings) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  if (view.kind === 'timings') {
    return <TimingSettingsScreen onBack={backToList} />;
  }
  if (view.kind === 'medication') {
    const medication = medications.find((m) => m.id === view.id);
    // 新規登録か、編集する薬が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || medication) {
      return (
        <MedicationEditScreen key={view.id ?? 'new'} medication={medication} timingList={timings} onBack={backToList} />
      );
    }
  }

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>薬の設定</h1>
      </header>
      <MedicationList
        medications={medications}
        timingList={timings}
        onAdd={() => open({ kind: 'medication', id: null })}
        onOpen={(medication) => open({ kind: 'medication', id: medication.id })}
      />
      <section className="settings-section">
        <h2>時間帯</h2>
        <button type="button" className="add-button" onClick={() => open({ kind: 'timings' })}>
          時間帯の設定
        </button>
      </section>
    </main>
  );
}
