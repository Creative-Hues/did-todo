// ホーム画面のタスク1件の中身。タップで記録(未完了)または取り消し(完了)
// 並び替えモード中は onTap を渡さず、タップしても何もしない表示だけにする
import { resolveCareAlters } from '../../lib/careAlters';
import { toCompletionLabel } from '../../lib/completionLabel';
import type { HomeItem, SectionKey } from '../../lib/home';
import { toPreviousPeriodLabel, type PreviousPeriodLabel } from '../../lib/previousPeriod';
import type { Alter } from '../../lib/types';

/**
 * 前の期間の結果の1行(SPEC.md 6.5)。
 * 記録ありは小さく薄い文字、記録なし・予定日から○日は小さい文字でふつうの文字色(警告の色は使わない)
 */
function PreviousPeriodLine({ label }: { label: PreviousPeriodLabel }) {
  if (label.kind === 'missing') {
    return <span className="task-item__previous task-item__previous--missing">{label.text}</span>;
  }
  return (
    <span className="task-item__previous">
      {label.prefix}:<span style={label.color ? { color: label.color } : undefined}>{label.name}</span>・{label.time}
    </span>
  );
}

interface Props {
  item: HomeItem;
  section: SectionKey;
  alters: Alter[];
  alterById: ReadonlyMap<string, Alter>;
  /** 渡さないとタップできない表示になる(並び替えモード) */
  onTap?: (item: HomeItem) => void;
}

export function TaskItem({ item, section, alters, alterById, onTap }: Props) {
  const careAlters = resolveCareAlters(item.task.careAlterIds, alters);
  const done = item.status === 'done' && item.currentRecord !== null;
  const label = item.currentRecord ? toCompletionLabel(item.currentRecord, section, alterById) : null;
  const className = done ? 'task-item task-item--done' : 'task-item';
  const previous = toPreviousPeriodLabel(item.previous, item.task.cycle, alterById);

  const content = (
    <>
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
        {previous && <PreviousPeriodLine label={previous} />}
      </span>
    </>
  );

  if (!onTap) {
    return <div className={className}>{content}</div>;
  }
  return (
    <button type="button" className={className} onClick={() => onTap(item)}>
      {content}
    </button>
  );
}
