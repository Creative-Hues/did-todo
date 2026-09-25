// 設定の一覧の1行の中身(人格・タスク共通)。タップすると編集画面を開く
import type { ReactNode } from 'react';

interface Props {
  name: string;
  hidden: boolean;
  /** 名前の左に出すもの(人格の色など) */
  leading?: ReactNode;
  /** 名前の下の段に出すもの(周期・人格ラベル) */
  sub?: ReactNode;
  onOpen: () => void;
}

export function ItemRow({ name, hidden, leading, sub, onOpen }: Props) {
  return (
    <button type="button" className={hidden ? 'item-row item-row--hidden' : 'item-row'} onClick={onOpen}>
      <span className="item-row__main">
        {leading}
        {/* 長い名前は1行で「…」に省略し、行の形を崩さない */}
        <span className="item-name item-row__name">{name}</span>
      </span>
      {sub && <span className="item-row__sub">{sub}</span>}
    </button>
  );
}
