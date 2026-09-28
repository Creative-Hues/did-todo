// 設定の一覧の1行の中身(人格・タスク共通)。タップすると編集画面を開く
// selected を渡すと、チェックボックス付きの「選択」の行になる(タップで選択を切り替える)
import type { ReactNode } from 'react';

interface Props {
  name: string;
  hidden: boolean;
  /** 名前の左に出すもの(人格の色など) */
  leading?: ReactNode;
  /** 名前の下の段に出すもの(周期・人格ラベル) */
  sub?: ReactNode;
  /** 選択中のとき、この行が選ばれているか(選択中でなければ渡さない) */
  selected?: boolean;
  /** タップしたとき(ふだんは編集画面を開く。選択中は選択を切り替える) */
  onOpen: () => void;
}

export function ItemRow({ name, hidden, leading, sub, selected, onOpen }: Props) {
  const className = hidden ? 'item-row item-row--hidden' : 'item-row';
  const content = (
    <>
      <span className="item-row__main">
        {leading}
        {/* 長い名前は1行で「…」に省略し、行の形を崩さない */}
        <span className="item-name item-row__name">{name}</span>
      </span>
      {sub && <span className="item-row__sub">{sub}</span>}
    </>
  );

  if (selected !== undefined) {
    return (
      <label className={`${className} item-row--selectable`}>
        <input type="checkbox" className="item-row__checkbox" checked={selected} onChange={onOpen} />
        <span className="item-row__content">{content}</span>
      </label>
    );
  }
  return (
    <button type="button" className={className} onClick={onOpen}>
      {content}
    </button>
  );
}
