// タスクの設定(SPEC.md 6.4):ToDo 画面の「タスク設定」から開く一覧と編集画面
import { useState } from 'react';
import { TaskList } from '../components/settings/TaskList';
import { db } from '../db/db';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { TaskEditScreen } from './TaskEditScreen';

/** 表示中の画面:一覧 / タスクの編集(id が null なら新規追加) */
type View = { kind: 'list' } | { kind: 'task'; id: string | null };

interface Props {
  onBack: () => void;
}

export function TaskSettingsScreen({ onBack }: Props) {
  const alters = useLiveQuery(() => db.alters.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    rememberScroll();
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

  if (view.kind === 'task') {
    const task = tasks.find((t) => t.id === view.id);
    // 新規追加か、編集するタスクが見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
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
        <h1>タスク設定</h1>
      </header>
      <TaskList
        tasks={tasks}
        alters={alters}
        onAdd={() => open({ kind: 'task', id: null })}
        onOpen={(task) => open({ kind: 'task', id: task.id })}
      />
    </main>
  );
}
