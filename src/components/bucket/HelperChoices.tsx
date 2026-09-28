// 「協力してくれた人格」のチェックボックス(SPEC.md 9.2)。複数選べて、選ばなくてもよい
// 選択肢は helperChoices で作ったもの(本人は出さない。選ばれている非表示の人格は「(非表示)」付きで出す)
import type { Alter } from '../../lib/types';

interface Props {
  alters: Alter[];
  selectedIds: readonly string[];
  onChange: (selectedIds: string[]) => void;
}

export function HelperChoices({ alters, selectedIds, onChange }: Props) {
  const toggle = (id: string, checked: boolean) => {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((selected) => selected !== id));
  };

  return (
    <fieldset className="field">
      <legend>協力してくれた人格(選ばなくてもよい)</legend>
      {alters.length === 0 && <p className="empty">選べる人格がいません</p>}
      {alters.map((alter) => (
        <label key={alter.id} className="choice">
          <input
            type="checkbox"
            checked={selectedIds.includes(alter.id)}
            onChange={(event) => toggle(alter.id, event.target.checked)}
          />
          <span className="color-dot" style={{ backgroundColor: alter.color }} />
          {alter.name}
          {alter.hidden && '(非表示)'}
        </label>
      ))}
    </fieldset>
  );
}
