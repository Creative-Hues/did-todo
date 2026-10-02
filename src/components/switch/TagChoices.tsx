// きっかけのタグの選択(SPEC.md 17.1・17.4)。押すたびに選ぶ/外すが切り替わる。複数選べる
import type { SwitchTag } from '../../lib/types';

interface Props {
  /** 選択肢に出すきっかけ(並び順に並べたもの) */
  tags: SwitchTag[];
  selectedIds: readonly string[];
  onChange: (selectedIds: string[]) => void;
}

export function TagChoices({ tags, selectedIds, onChange }: Props) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id]);
  };

  if (tags.length === 0) {
    return <p className="empty">きっかけがまだありません(「きっかけの設定」で追加できます)</p>;
  }
  return (
    <div className="tag-choices">
      {tags.map((tag) => {
        const selected = selectedIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            className={selected ? 'tag-chip tag-chip--selected' : 'tag-chip'}
            aria-pressed={selected}
            onClick={() => toggle(tag.id)}
          >
            {selected && <span aria-hidden="true">✓ </span>}
            {tag.name}
            {tag.hidden && '(非表示)'}
          </button>
        );
      })}
    </div>
  );
}
