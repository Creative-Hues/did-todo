// 叶ったことにするときに「協力してくれた人格」を選ぶ画面(SPEC.md 9.2)
// 本人確認が済んだあとに開く。「保存」で叶った日時と協力者を記録し、「キャンセル」なら何も記録しない
import { useState } from 'react';
import { HelperChoices } from '../components/bucket/HelperChoices';
import { OwnerHeading } from '../components/bucket/OwnerHeading';
import { db } from '../db/db';
import { achieveBucketItem } from '../db/bucketRepo';
import { helperChoices } from '../lib/bucket';
import { showSaveError } from '../lib/showError';
import type { Alter, BucketItem } from '../lib/types';

interface Props {
  owner: Alter;
  item: BucketItem;
  alters: Alter[];
  /** 保存したとき */
  onDone: () => void;
  /** 何も記録せずにやめたとき */
  onCancel: () => void;
}

export function BucketHelperScreen({ owner, item, alters, onDone, onCancel }: Props) {
  const [helperIds, setHelperIds] = useState<string[]>([]);

  const handleSave = async () => {
    try {
      // 叶った日時は「保存」を押した日時
      await achieveBucketItem(db, item.id, helperIds, new Date());
      onDone();
    } catch (error) {
      showSaveError(error);
    }
  };

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onCancel}>
          ‹ 戻る
        </button>
        <h1>叶ったことにする</h1>
      </header>
      <OwnerHeading owner={owner} />
      {/* どの願いを叶ったことにするのかがわかるよう、内容を出す */}
      <div className="note-preview">
        <span className="note-item__text">{item.body}</span>
      </div>
      <div className="edit-form">
        <HelperChoices alters={helperChoices(alters, owner.id)} selectedIds={helperIds} onChange={setHelperIds} />
        <div className="form-buttons">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </main>
  );
}
