// 設定画面(SPEC.md 5.4):「人格」と「タスク」の2つの一覧と、それぞれの編集画面
import { useLayoutEffect, useRef, useState } from 'react';
import { AlterList } from '../components/settings/AlterList';
import { TaskList } from '../components/settings/TaskList';
import { db } from '../db/db';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { AlterEditScreen } from './AlterEditScreen';
import { TaskEditScreen } from './TaskEditScreen';

/** 表示中の画面:一覧 / 人格の編集 / タスクの編集(id が null なら新規追加) */
type View = { kind: 'list' } | { kind: 'alter'; id: string | null } | { kind: 'task'; id: string | null };

interface Props {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: Props) {
  const alters = useLiveQuery(() => db.alters.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const [view, setView] = useState<View>({ kind: 'list' });
  // 編集画面から戻ったとき、一覧の元のスクロール位置に戻す
  const listScrollY = useRef(0);

  useLayoutEffect(() => {
    window.scrollTo(0, view.kind === 'list' ? listScrollY.current : 0);
  }, [view.kind]);

  const open = (next: View) => {
    listScrollY.current = window.scrollY;
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!alters || !tasks) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  if (view.kind === 'alter') {
    const alter = alters.find((a) => a.id === view.id);
    // 新規追加か、編集する人格が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || alter) {
      return <AlterEditScreen key={view.id ?? 'new'} alter={alter} onBack={backToList} />;
    }
  }
  if (view.kind === 'task') {
    const task = tasks.find((t) => t.id === view.id);
    if (view.id === null || task) {
      return <TaskEditScreen key={view.id ?? 'new'} task={task} alters={alters} onBack={backToList} />;
    }
  }

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>設定</h1>
      </header>
      <AlterList
        alters={alters}
        onAdd={() => open({ kind: 'alter', id: null })}
        onOpen={(alter) => open({ kind: 'alter', id: alter.id })}
      />
      <TaskList
        tasks={tasks}
        alters={alters}
        onAdd={() => open({ kind: 'task', id: null })}
        onOpen={(task) => open({ kind: 'task', id: task.id })}
      />
    </main>
  );
}
