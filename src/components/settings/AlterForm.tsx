// 人格の追加・編集フォーム(名前・色・区分。SPEC.md 10.1・10.2)
import { useState, type FormEvent } from 'react';
import type { AlterInput } from '../../db/alterRepo';
import { UNCATEGORIZED_NAME } from '../../lib/alterInfo';
import { normalizeName } from '../../lib/validation';
import type { Alter, AlterCategory } from '../../lib/types';

/** 新しく追加するときの色の初期値 */
const DEFAULT_COLOR = '#4a90d9';

interface Props {
  /** 編集するときの元の人格(追加のときは undefined) */
  initial?: Alter;
  categories: AlterCategory[];
  onSubmit: (input: AlterInput) => Promise<void>;
  onCancel: () => void;
}

export function AlterForm({ initial, categories, onSubmit, onCancel }: Props) {
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? DEFAULT_COLOR);
  // 見つからない区分を指しているときは「未分類」として選んでおく
  const [categoryId, setCategoryId] = useState<string | null>(
    sortedCategories.some((category) => category.id === initial?.categoryId) ? (initial?.categoryId ?? null) : null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeName(name);
    if (normalized === null) {
      setError('名前を入力してください');
      return;
    }
    void onSubmit({ name: normalized, color, categoryId });
  };

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>名前</span>
        <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field">
        <span>色</span>
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
      </label>
      <fieldset className="field">
        <legend>区分</legend>
        {sortedCategories.map((category) => (
          <label key={category.id} className="choice">
            <input
              type="radio"
              name="alter-category"
              checked={categoryId === category.id}
              onChange={() => setCategoryId(category.id)}
            />
            {category.name}
          </label>
        ))}
        {/* 選ばなくてもよい(SPEC.md 10.2) */}
        <label className="choice">
          <input type="radio" name="alter-category" checked={categoryId === null} onChange={() => setCategoryId(null)} />
          {UNCATEGORIZED_NAME}
        </label>
      </fieldset>
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
