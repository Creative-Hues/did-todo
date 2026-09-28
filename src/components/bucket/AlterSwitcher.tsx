// バケットの画面上部の人格の切り替え(SPEC.md 9.1)
// 非表示でない人格を、並び順で色つきのボタンで並べる。選んでいる人格は色で塗る
import type { Alter } from '../../lib/types';

interface Props {
  /** 切り替えに出す人格(switchableAlters で作ったもの) */
  alters: Alter[];
  selectedId: string;
  onSelect: (alterId: string) => void;
}

export function AlterSwitcher({ alters, selectedId, onSelect }: Props) {
  return (
    <div className="alter-switcher" role="group" aria-label="誰のリストを見るか">
      {alters.map((alter) => {
        const selected = alter.id === selectedId;
        return (
          <button
            key={alter.id}
            type="button"
            className={selected ? 'alter-switcher__button alter-switcher__button--selected' : 'alter-switcher__button'}
            // 選んでいる人格は色で塗り、ほかは色の枠だけにする
            style={selected ? { backgroundColor: alter.color, borderColor: alter.color } : { borderColor: alter.color }}
            aria-pressed={selected}
            onClick={() => onSelect(alter.id)}
          >
            {alter.name}
          </button>
        );
      })}
    </div>
  );
}
