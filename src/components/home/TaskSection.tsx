// ホーム画面の欄(今日・今週・今月)
// 並び替えモード中は order 順だけで並べ、≡ のドラッグで欄の中だけ並び替える
import { db } from '../../db/db';
import { reorderTasks } from '../../db/taskRepo';
import { sortSectionByOrder, type HomeItem, type HomeSection } from '../../lib/home';
import type { Alter } from '../../lib/types';
import { SortableList } from '../common/SortableList';
import { TaskItem } from './TaskItem';

interface Props {
  section: HomeSection;
  alters: Alter[];
  alterById: ReadonlyMap<string, Alter>;
  /** 並び替えモード中か */
  reordering: boolean;
  onTap: (item: HomeItem, section: HomeSection) => void;
}

export function TaskSection({ section, alters, alterById, reordering, onTap }: Props) {
  if (reordering) {
    // SortableList は id を持つ項目を扱うので、タスクのIDを付けて渡す
    const rows = sortSectionByOrder(section).items.map((item) => ({ id: item.task.id, item }));
    return (
      <section className="home-section">
        <h2>{section.title}</h2>
        <SortableList
          className="task-list"
          items={rows}
          // 欄に出ているタスクの順番だけを変え、ほかのタスクの順番は変えない
          onReorder={(ids) => reorderTasks(db, ids)}
          renderItem={(row) => (
            <TaskItem item={row.item} section={section.key} alters={alters} alterById={alterById} />
          )}
          getLabel={(row) => row.item.task.name}
        />
      </section>
    );
  }

  return (
    <section className="home-section">
      <h2>{section.title}</h2>
      <ul className="task-list">
        {section.items.map((item) => (
          <li key={item.task.id}>
            <TaskItem
              item={item}
              section={section.key}
              alters={alters}
              alterById={alterById}
              onTap={(tapped) => onTap(tapped, section)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
