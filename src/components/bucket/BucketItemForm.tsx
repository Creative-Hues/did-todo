// バケットの項目の入力・編集フォーム(SPEC.md 9.1)
// 叶った項目の編集では、協力してくれた人格も直せる(SPEC.md 9.2)
// 保存を押したら内容をチェックして渡すだけ。本人確認は画面の側で出す
import { useState, type FormEvent } from 'react';
import { validateBucketBody } from '../../lib/bucket';
import type { Alter } from '../../lib/types';
import { HelperChoices } from './HelperChoices';

interface Props {
  /** 編集するときの元の内容(追加のときは空) */
  initialBody?: string;
  /** 協力者の選択肢(叶った項目の編集のときだけ渡す) */
  helperOptions?: Alter[];
  /** 元の協力者 */
  initialHelperIds?: readonly string[];
  /** チェック済みの内容と、協力者を受け取る */
  onSubmit: (body: string, helperIds: string[]) => void;
  onCancel: () => void;
  /** 内容を元から書き換えているかが変わったとき(まだ保存していない書き換えがあるか) */
  onDirtyChange?: (dirty: boolean) => void;
}

export function BucketItemForm({
  initialBody = '',
  helperOptions,
  initialHelperIds = [],
  onSubmit,
  onCancel,
  onDirtyChange,
}: Props) {
  const [body, setBody] = useState(initialBody);
  const [helperIds, setHelperIds] = useState<string[]>([...initialHelperIds]);
  const [error, setError] = useState<string | null>(null);

  const handleBodyChange = (next: string) => {
    setBody(next);
    onDirtyChange?.(next !== initialBody);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateBucketBody(body);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    onSubmit(result.input, helperIds);
  };

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>内容</span>
        <textarea className="note-textarea" value={body} onChange={(event) => handleBodyChange(event.target.value)} />
      </label>
      {helperOptions && <HelperChoices alters={helperOptions} selectedIds={helperIds} onChange={setHelperIds} />}
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
