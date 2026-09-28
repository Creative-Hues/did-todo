// 記録する人格を選ぶシート(SPEC.md 6.2)。下から出る
import type { Alter, Task } from '../../lib/types';
import { AlterButtons } from '../common/AlterButtons';

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
        <AlterButtons alters={alters} onSelect={onSelect} />
        <button type="button" className="sheet__cancel" onClick={onCancel}>
          キャンセル
        </button>
      </div>
    </div>
  );
}
