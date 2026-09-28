// バケットの項目の入力・編集画面(SPEC.md 9.1)
// 上に「人格Aのリスト」を出す。追加・変更は、保存の前に本人確認を出す(何も変えていなければ出さずに戻る)
import { useState } from 'react';
import { BucketItemForm } from '../components/bucket/BucketItemForm';
import { OwnerHeading } from '../components/bucket/OwnerHeading';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { db } from '../db/db';
import { addBucketItem, updateBucketItem } from '../db/bucketRepo';
import { addConfirmMessage, editConfirmMessage, isBucketItemChanged } from '../lib/bucket';
import { showSaveError } from '../lib/showError';
import { formatMonthDay } from '../lib/timeFormat';
import type { Alter, BucketItem } from '../lib/types';

interface Props {
  /** 誰のリストか */
  owner: Alter;
  /** 編集する項目(追加のときは undefined) */
  item?: BucketItem;
  onBack: () => void;
}

export function BucketItemEditScreen({ owner, item, onBack }: Props) {
  // 本人確認を待っている内容(確認を出していないときは null)
  const [pendingBody, setPendingBody] = useState<string | null>(null);

  const handleSubmit = (body: string) => {
    if (item && !isBucketItemChanged(item, body, item.helperAlterIds)) {
      onBack();
      return;
    }
    setPendingBody(body);
  };

  const handleConfirm = async (body: string) => {
    try {
      if (item) {
        await updateBucketItem(db, item.id, { body, helperAlterIds: item.helperAlterIds });
      } else {
        await addBucketItem(db, owner.id, body, new Date());
      }
      onBack();
    } catch (error) {
      setPendingBody(null);
      showSaveError(error);
    }
  };

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>{item ? '項目を編集' : '項目を追加'}</h1>
      </header>
      <OwnerHeading owner={owner} />
      {item && <p className="settings-note">書いた日:{formatMonthDay(item.createdAt)}</p>}
      <BucketItemForm initialBody={item?.body} onSubmit={handleSubmit} onCancel={onBack} />
      {pendingBody !== null && (
        <ConfirmDialog
          message={item ? editConfirmMessage(owner.name) : addConfirmMessage(owner.name)}
          confirmLabel={item ? '変更する' : '追加する'}
          danger={false}
          onConfirm={() => handleConfirm(pendingBody)}
          onCancel={() => setPendingBody(null)}
        />
      )}
    </main>
  );
}
