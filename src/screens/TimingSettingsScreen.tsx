// 時間帯の設定(SPEC.md 7.8):「薬の設定」から開く一覧と編集画面
import { useState } from 'react';
import { TimingList } from '../components/medication/TimingList';
import { db } from '../db/db';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { TimingEditScreen } from './TimingEditScreen';

/** 表示中の画面:一覧 / 時間帯の編集(id が null なら新規追加) */
type View = { kind: 'list' } | { kind: 'timing'; id: string | null };

interface Props {
  onBack: () => void;
}

export function TimingSettingsScreen({ onBack }: Props) {
  const timings = useLiveQuery(() => db.medicationTimings.toArray());
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    rememberScroll();
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!timings) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  if (view.kind === 'timing') {
    const timing = timings.find((t) => t.id === view.id);
    // 新規追加か、編集する時間帯が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || timing) {
      return <TimingEditScreen key={view.id ?? 'new'} timing={timing} onBack={backToList} />;
    }
  }

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>時間帯の設定</h1>
      </header>
      <TimingList
        timings={timings}
        onAdd={() => open({ kind: 'timing', id: null })}
        onOpen={(timing) => open({ kind: 'timing', id: timing.id })}
      />
    </main>
  );
}
