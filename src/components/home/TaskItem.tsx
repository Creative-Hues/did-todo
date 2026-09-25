// ホーム画面のタスク1件。タップで記録(未完了)または取り消し(完了)
import { resolveCareAlters } from '../../lib/careAlters';
import { toCompletionLabel } from '../../lib/completionLabel';
import type { HomeItem, SectionKey } from '../../lib/home';
import type { Alter } from '../../lib/types';

interface Props {
  item: HomeItem;
  section: SectionKey;
  alters: Alter[];
  alterById: ReadonlyMap<string, Alter>;
  onTap: (item: HomeItem) => void;
}

export function TaskItem({ item, section, alters, alterById, onTap }: Props) {
  const careAlters = resolveCareAlters(item.task.careAlterIds, alters);
  const done = item.status === 'done' && item.currentRecord !== null;
  const label = item.currentRecord ? toCompletionLabel(item.currentRecord, section, alterById) : null;

  return (
    <li>
      <button
        type="button"
        className={done ? 'task-item task-item--done' : 'task-item'}
        onClick={() => onTap(item)}
      >
        <span className="task-item__status" aria-hidden="true">
          {done ? '✓' : '○'}
        </span>
        <span className="task-item__body">
          <span className="item-name">{item.task.name}</span>
          {careAlters.length > 0 && (
            <span className="alter-labels">
              {careAlters.map((alter) => (
                <span key={alter.id} className="alter-label" style={{ backgroundColor: alter.color }}>
                  {alter.name}
                </span>
              ))}
            </span>
          )}
          {done && label && (
            <span className="task-item__done-by">
              <span style={label.color ? { color: label.color } : undefined}>{label.name}</span>・{label.time}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
