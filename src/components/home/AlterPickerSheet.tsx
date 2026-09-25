// 記録する人格を選ぶシート(SPEC.md 5.2)。下から出る
import { UNKNOWN_ALTER_NAME } from '../../lib/completionLabel';
import type { Alter, Task } from '../../lib/types';

interface Props {
  task: Task;
  /** 選択肢に出す人格(非表示でない人格を order 順に並べたもの) */
  alters: Alter[];
  /** 人格を選んだとき。「わからない」は null */
  onSelect: (alterId: string | null) => void;
  onCancel: () => void;
}

export function AlterPickerSheet({ task, alters, onSelect, onCancel }: Props) {
  return (
    <div className="overlay overlay--bottom">
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="picker-title">
        <h2 id="picker-title" className="sheet__title">
          「{task.name}」をやったのは?
        </h2>
        <div className="picker-buttons">
          {alters.map((alter) => (
            <button
              key={alter.id}
              type="button"
              className="picker-button"
              style={{ backgroundColor: alter.color }}
              onClick={() => onSelect(alter.id)}
            >
              {alter.name}
            </button>
          ))}
          <button type="button" className="picker-button picker-button--unknown" onClick={() => onSelect(null)}>
            {UNKNOWN_ALTER_NAME}
          </button>
        </div>
        <button type="button" className="sheet__cancel" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  );
}
