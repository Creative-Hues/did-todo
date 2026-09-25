// タスクの一覧(並び替え・追加・編集画面を開く)
import { db } from '../../db/db';
import { reorderTasks } from '../../db/taskRepo';
import { cycleLabel } from '../../lib/cycleLabel';
import { sortForSettings } from '../../lib/ordering';
import type { Alter, Task } from '../../lib/types';
import { SortableList } from '../common/SortableList';
import { ItemRow } from './ItemRow';

interface Props {
  tasks: Task[];
  alters: Alter[];
  onAdd: () => void;
  onOpen: (task: Task) => void;
}

export function TaskList({ tasks, alters, onAdd, onOpen }: Props) {
  const { visible, hidden } = sortForSettings(tasks);
  const alterById = new Map(alters.map((alter) => [alter.id, alter]));

  const renderRow = (task: Task) => (
    <ItemRow
      name={task.name}
      hidden={task.hidden}
      sub={
        <>
          <span className="item-sub">{cycleLabel(task.cycle)}</span>
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
        </>
      }
      onOpen={() => onOpen(task)}
    />
  );

  return (
    <section className="settings-section">
      <h2>タスク</h2>
      <button type="button" className="add-button" onClick={onAdd}>
        ＋ タスクを追加
      </button>
      {visible.length === 0 && <p className="empty">タスクがまだ登録されていません</p>}
      <SortableList
        className="item-list"
        items={visible}
        onReorder={(ids) => reorderTasks(db, ids)}
        renderItem={renderRow}
        getLabel={(task) => task.name}
      />
      {hidden.length > 0 && (
        <>
          <h3 className="hidden-heading">非表示のタスク</h3>
          {/* 非表示の一覧は並び替えない */}
          <ul className="item-list">
            {hidden.map((task) => (
              <li key={task.id} className="plain-row">
                {renderRow(task)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
