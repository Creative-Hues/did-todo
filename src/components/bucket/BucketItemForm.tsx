// バケットの項目の入力・編集フォーム(SPEC.md 9.1)
// 保存を押したら内容をチェックして渡すだけ。本人確認は画面の側で出す
import { useState, type FormEvent } from 'react';
import { validateBucketBody } from '../../lib/bucket';

interface Props {
  /** 編集するときの元の内容(追加のときは空) */
  initialBody?: string;
  /** チェック済みの内容を受け取る */
  onSubmit: (body: string) => void;
  onCancel: () => void;
}

export function BucketItemForm({ initialBody = '', onSubmit, onCancel }: Props) {
  const [body, setBody] = useState(initialBody);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateBucketBody(body);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onSubmit(result.input);
  };

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>内容</span>
        <textarea className="note-textarea" value={body} onChange={(event) => setBody(event.target.value)} />
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
