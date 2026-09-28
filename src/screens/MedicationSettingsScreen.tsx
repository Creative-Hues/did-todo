// 薬の設定(SPEC.md 7章):服薬タブの「薬の設定」から開く一覧と編集画面
import { useState } from 'react';
import { MedicationList } from '../components/medication/MedicationList';
import { db } from '../db/db';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { MedicationEditScreen } from './MedicationEditScreen';

/** 表示中の画面:一覧 / 薬の編集(id が null なら新規登録) */
type View = { kind: 'list' } | { kind: 'medication'; id: string | null };

interface Props {
  onBack: () => void;
}

export function MedicationSettingsScreen({ onBack }: Props) {
  const medications = useLiveQuery(() => db.medications.toArray());
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    rememberScroll();
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!medications) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  if (view.kind === 'medication') {
    const medication = medications.find((m) => m.id === view.id);
    // 新規登録か、編集する薬が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || medication) {
      return <MedicationEditScreen key={view.id ?? 'new'} medication={medication} onBack={backToList} />;
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
        onAdd={() => open({ kind: 'medication', id: null })}
        onOpen={(medication) => open({ kind: 'medication', id: medication.id })}
      />
    </main>
  );
}
