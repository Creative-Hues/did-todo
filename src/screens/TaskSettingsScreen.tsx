// タスクの設定(SPEC.md 6.4):ToDo 画面の「タスク設定」から開く一覧と編集画面、複数選択+削除
import { useState } from 'react';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TaskList } from '../components/settings/TaskList';
import { db } from '../db/db';
import { deleteTasks } from '../db/taskRepo';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { showSaveError } from '../lib/showError';
import type { Task } from '../lib/types';
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
  // 選択中なら、選んだタスクのID。選択中でなければ null
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string> | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

  // 選んだもののうち、今もあるタスクだけを数える(ほかの画面で消えた場合に備える)
  const selectedTasks = selectedIds ? tasks.filter((task) => selectedIds.has(task.id)) : [];

  const toggle = (task: Task) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(task.id)) {
        next.delete(task.id);
      } else {
        next.add(task.id);
      }
      return next;
    });
  };

  const handleDelete = async () => {
    try {
      await deleteTasks(
        db,
        selectedTasks.map((task) => task.id),
      );
      setConfirmingDelete(false);
      setSelectedIds(null);
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
        <h1>タスク設定</h1>
        {selectedIds ? (
          <button type="button" onClick={() => setSelectedIds(null)}>
            キャンセル
          </button>
        ) : (
          <button type="button" disabled={tasks.length === 0} onClick={() => setSelectedIds(new Set())}>
            選択
          </button>
        )}
      </header>
      {selectedIds && (
        // 選択中の操作。一覧が長くても押せるよう、上に貼り付けて表示する
        <div className="selection-bar">
          <span>{selectedTasks.length}件を選択中</span>
          <button
            type="button"
            className="danger-button"
            disabled={selectedTasks.length === 0}
            onClick={() => setConfirmingDelete(true)}
          >
            {selectedTasks.length}件を削除
          </button>
        </div>
      )}
      <TaskList
        tasks={tasks}
        alters={alters}
        onAdd={() => open({ kind: 'task', id: null })}
        onOpen={(task) => open({ kind: 'task', id: task.id })}
        selectedIds={selectedIds ?? undefined}
        onToggle={toggle}
      />
      {confirmingDelete && (
        <ConfirmDialog
          message={`${selectedTasks.length}件のタスクを削除しますか?これまでの完了記録は残ります。`}
          confirmLabel="削除する"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </main>
  );
}
