// 書いた人格の選択(SPEC.md 8.1・8.4)。色つきの人格と「わからない」から1つ選ぶ
// 最初は何も選ばれていない(選ばないと保存できない)
import { UNKNOWN_ALTER_NAME } from '../../lib/completionLabel';
import type { AuthorSelection } from '../../lib/clinicNotes';
import type { Alter } from '../../lib/types';
import { useTerm } from '../../hooks/useTerm';

interface Props {
  /** 選択肢に出す人格(selectableAuthors で作ったもの) */
  alters: Alter[];
  selection: AuthorSelection;
  onChange: (selection: AuthorSelection) => void;
}

export function AuthorChoices({ alters, selection, onChange }: Props) {
  const { t } = useTerm();
  return (
    <fieldset className="field">
      <legend>{t('書いた人格')}</legend>
      {alters.map((alter) => (
        <label key={alter.id} className="choice">
          <input
            type="radio"
            name="author"
            checked={selection?.alterId === alter.id}
            onChange={() => onChange({ alterId: alter.id })}
          />
          <span className="color-dot" style={{ backgroundColor: alter.color }} />
          {alter.name}
          {alter.hidden && '(非表示)'}
        </label>
      ))}
      <label className="choice">
        <input
          type="radio"
          name="author"
          checked={selection !== null && selection.alterId === null}
          onChange={() => onChange({ alterId: null })}
        />
        {UNKNOWN_ALTER_NAME}
      </label>
    </fieldset>
  );
}
