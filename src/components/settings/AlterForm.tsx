// 人格の追加・編集フォーム
import { useState, type FormEvent } from 'react';
import type { AlterInput } from '../../db/alterRepo';
import { normalizeName } from '../../lib/validation';
import type { Alter } from '../../lib/types';

/** 新しく追加するときの色の初期値 */
const DEFAULT_COLOR = '#4a90d9';

interface Props {
  /** 編集するときの元の人格(追加のときは undefined) */
  initial?: Alter;
  onSubmit: (input: AlterInput) => Promise<void>;
  onCancel: () => void;
}

export function AlterForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeName(name);
    if (normalized === null) {
      setError('名前を入力してください');
      return;
    }
    void onSubmit({ name: normalized, color });
  };

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <h3>{initial ? '人格を編集' : '人格を追加'}</h3>
      <label className="field">
        <span>名前</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>色</span>
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
      </label>
      {error && <p className="form-error">{error}</p>}
      <div className="form-buttons">
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
        <button type="submit" className="primary">
          保存
        </button>
      </div>
    </form>
  );
}
