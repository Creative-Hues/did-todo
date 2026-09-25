// 設定の一覧の1行(人格・タスク共通)。上へ・下へ・編集・非表示/再表示のボタンを持つ
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  hidden: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onToggleHidden: () => void;
}

export function ItemRow(props: Props) {
  return (
    <li className={props.hidden ? 'item-row item-row--hidden' : 'item-row'}>
      <div className="item-row__content">{props.children}</div>
      <div className="item-row__buttons">
        {/* 並び替えは表示中の項目だけ */}
        {!props.hidden && (
          <>
            <button type="button" onClick={props.onMoveUp} disabled={!props.canMoveUp} aria-label="上へ">
              ↑
            </button>
            <button type="button" onClick={props.onMoveDown} disabled={!props.canMoveDown} aria-label="下へ">
              ↓
            </button>
          </>
        )}
        <button type="button" onClick={props.onEdit}>
          編集
        </button>
        <button type="button" onClick={props.onToggleHidden}>
          {props.hidden ? '再表示' : '非表示'}
        </button>
      </div>
    </li>
  );
}
