// ホーム画面の欄(今日・今週・今月)
import type { HomeItem, HomeSection } from '../../lib/home';
import type { Alter } from '../../lib/types';
import { TaskItem } from './TaskItem';

interface Props {
  section: HomeSection;
  alters: Alter[];
  alterById: ReadonlyMap<string, Alter>;
  onTap: (item: HomeItem, section: HomeSection) => void;
}

export function TaskSection({ section, alters, alterById, onTap }: Props) {
  return (
    <section className="home-section">
      <h2>{section.title}</h2>
      <ul className="task-list">
        {section.items.map((item) => (
          <TaskItem
            key={item.task.id}
            item={item}
            section={section.key}
            alters={alters}
            alterById={alterById}
            onTap={(tapped) => onTap(tapped, section)}
          />
        ))}
      </ul>
    </section>
  );
}
