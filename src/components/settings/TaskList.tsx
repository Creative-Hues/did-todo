// タスクの設定(一覧+追加・編集)
import { useState } from 'react';
import { db } from '../../db/db';
import { addTask, reorderTasks, setTaskHidden, updateTask, type TaskInput } from '../../db/taskRepo';
import { cycleLabel } from '../../lib/cycleLabel';
import { sortForSettings } from '../../lib/ordering';
import { showSaveError } from '../../lib/showError';
import type { Alter, Task } from '../../lib/types';
import { ItemRow, swapIds } from './ItemRow';
import { TaskForm } from './TaskForm';

/** 編集中の状態:なし / 新規追加 / 既存のタスクの編集 */
type Editing = null | { mode: 'new' } | { mode: 'edit'; task: Task };

interface Props {
  tasks: Task[];
  alters: Alter[];
}

export function TaskList({ tasks, alters }: Props) {
  const [editing, setEditing] = useState<Editing>(null);
  const { visible, hidden } = sortForSettings(tasks);
  const selectableAlters = sortForSettings(alters).visible;
  const alterById = new Map(alters.map((alter) => [alter.id, alter]));

  const handleSubmit = async (input: TaskInput) => {
    try {
      if (editing?.mode === 'edit') {
        await updateTask(db, editing.task.id, input);
      } else {
        await addTask(db, input, new Date());
      }
      setEditing(null);
    } catch (error) {
      showSaveError(error);
    }
  };

  const renderRow = (task: Task, index: number, list: Task[]) => (
    <ItemRow
      key={task.id}
      hidden={task.hidden}
      canMoveUp={index > 0}
      canMoveDown={index < list.length - 1}
      onMoveUp={() => reorderTasks(db, swapIds(list, index, index - 1)).catch(showSaveError)}
      onMoveDown={() => reorderTasks(db, swapIds(list, index, index + 1)).catch(showSaveError)}
      onEdit={() => setEditing({ mode: 'edit', task })}
      onToggleHidden={() => setTaskHidden(db, task.id, !task.hidden).catch(showSaveError)}
    >
      <span className="item-name">{task.name}</span>
      <span className="item-sub">{cycleLabel(task.cycle)}</span>
      <span className="alter-labels">
        {task.careAlterIds.map((id) => {
          const alter = alterById.get(id);
          return (
            alter && (
              <span key={id} className="alter-label" style={{ backgroundColor: alter.color }}>
                {alter.name}
              </span>
            )
          );
        })}
      </span>
    </ItemRow>
  );

  return (
    <section className="settings-section">
      <h2>タスク</h2>
      {editing ? (
        <TaskForm
          // 編集対象が変わったら入力欄を作り直す
          key={editing.mode === 'edit' ? editing.task.id : 'new'}
          initial={editing.mode === 'edit' ? editing.task : undefined}
          selectableAlters={selectableAlters}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button type="button" className="add-button" onClick={() => setEditing({ mode: 'new' })}>
          ＋ タスクを追加
        </button>
      )}
      {visible.length === 0 && <p className="empty">タスクがまだ登録されていません</p>}
      <ul className="item-list">{visible.map(renderRow)}</ul>
      {hidden.length > 0 && (
        <>
          <h3 className="hidden-heading">非表示のタスク</h3>
          <ul className="item-list">{hidden.map(renderRow)}</ul>
        </>
      )}
    </section>
  );
}
