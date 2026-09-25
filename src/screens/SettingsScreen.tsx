// 設定画面(SPEC.md 5.4):「人格」と「タスク」の2つの一覧
import { AlterList } from '../components/settings/AlterList';
import { TaskList } from '../components/settings/TaskList';
import { db } from '../db/db';
import { useLiveQuery } from '../hooks/useLiveQuery';

interface Props {
  onBack: () => void;
}

export function SettingsScreen({ onBack }: Props) {
  const alters = useLiveQuery(() => db.alters.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>設定</h1>
      </header>
      {alters && tasks ? (
        <>
          <AlterList alters={alters} />
          <TaskList tasks={tasks} alters={alters} />
        </>
      ) : (
        <p>読み込み中…</p>
      )}
    </main>
  );
}
