// バケットの項目の入力・編集画面(SPEC.md 9.1・9.2)
// 上に「人格Aのリスト」を出す。追加・変更は、保存の前に本人確認を出す(何も変えていなければ出さずに戻る)
// 編集では、「まだ」の項目は「叶ったことにする」、叶った項目は協力者の修正と「「まだ」に戻す」ができる
// 削除もここから1件ずつできる(本人確認は複数選択の削除と同じ。SPEC.md 9.3)
import { useState } from 'react';
import { BucketItemForm } from '../components/bucket/BucketItemForm';
import { OwnerHeading } from '../components/bucket/OwnerHeading';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { db } from '../db/db';
import { addBucketItem, deleteBucketItems, unachieveBucketItem, updateBucketItem } from '../db/bucketRepo';
import {
  achieveConfirmMessage,
  addConfirmMessage,
  deleteConfirmMessage,
  editConfirmMessage,
  helperChoices,
  isBucketItemChanged,
  unachieveConfirmMessage,
} from '../lib/bucket';
import { showSaveError } from '../lib/showError';
import { formatMonthDay } from '../lib/timeFormat';
import type { Alter, BucketItem } from '../lib/types';

interface Props {
  /** 誰のリストか */
  owner: Alter;
  /** 編集する項目(追加のときは undefined) */
  item?: BucketItem;
  alters: Alter[];
  onBack: () => void;
  /** 叶ったことにするの本人確認が済んだとき(協力者を選ぶ画面を開く) */
  onAchieve: (item: BucketItem) => void;
}

/** 出している本人確認:保存(追加・変更)/ 叶ったことにする / 「まだ」に戻す / 削除 */
type Confirming =
  | { kind: 'save'; body: string; helperIds: string[] }
  | { kind: 'achieve' }
  | { kind: 'unachieve' }
  | { kind: 'delete' };

export function BucketItemEditScreen({ owner, item, alters, onBack, onAchieve }: Props) {
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  // 内容を書き換えて、まだ保存していないか(そのあいだは「叶ったことにする」を押せなくする)
  const [dirty, setDirty] = useState(false);
  const achieved = item !== undefined && item.achievedAt !== null;

  const handleSubmit = (body: string, helperIds: string[]) => {
    if (item && !isBucketItemChanged(item, body, achieved ? helperIds : item.helperAlterIds)) {
      onBack();
      return;
    }
    setConfirming({ kind: 'save', body, helperIds });
  };

  const handleSave = async (body: string, helperIds: string[]) => {
    try {
      if (item) {
        await updateBucketItem(db, item.id, { body, helperAlterIds: helperIds });
      } else {
        await addBucketItem(db, owner.id, body, new Date());
      }
      onBack();
    } catch (error) {
      setConfirming(null);
      showSaveError(error);
    }
  };

  const handleUnachieve = async (target: BucketItem) => {
    try {
      await unachieveBucketItem(db, target.id);
      onBack();
    } catch (error) {
      setConfirming(null);
      showSaveError(error);
    }
  };

  const handleDelete = async (target: BucketItem) => {
    try {
      await deleteBucketItems(db, [target.id], new Date());
      onBack();
    } catch (error) {
      setConfirming(null);
      showSaveError(error);
    }
  };

  const renderConfirm = () => {
    if (confirming === null) {
      return null;
    }
    const cancel = () => setConfirming(null);
    switch (confirming.kind) {
      case 'save':
        return (
          <ConfirmDialog
            message={item ? editConfirmMessage(owner.name) : addConfirmMessage(owner.name)}
            confirmLabel={item ? '変更する' : '追加する'}
            danger={false}
            onConfirm={() => handleSave(confirming.body, confirming.helperIds)}
            onCancel={cancel}
          />
        );
      case 'achieve':
        return (
          item && (
            <ConfirmDialog
              message={achieveConfirmMessage(owner.name)}
              confirmLabel="叶ったことにする"
              danger={false}
              onConfirm={() => onAchieve(item)}
              onCancel={cancel}
            />
          )
        );
      case 'unachieve':
        return (
          item && (
            <ConfirmDialog
              message={unachieveConfirmMessage(owner.name)}
              confirmLabel="「まだ」に戻す"
              onConfirm={() => handleUnachieve(item)}
              onCancel={cancel}
            />
          )
        );
      case 'delete':
        return (
          item && (
            <ConfirmDialog
              message={deleteConfirmMessage(owner.name, 1)}
              confirmLabel="削除する"
              onConfirm={() => handleDelete(item)}
              onCancel={cancel}
            />
          )
        );
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
      {item && (
        <p className="settings-note">
          書いた日:{formatMonthDay(item.createdAt)}
          {item.achievedAt !== null && ` ・ 叶った日:${formatMonthDay(item.achievedAt)}`}
        </p>
      )}
      <BucketItemForm
        initialBody={item?.body}
        // 叶った項目だけ、協力者を直せる
        helperOptions={achieved ? helperChoices(alters, owner.id, item.helperAlterIds) : undefined}
        initialHelperIds={item?.helperAlterIds}
        onSubmit={handleSubmit}
        onCancel={onBack}
        onDirtyChange={setDirty}
      />
      {item && (
        <section className="edit-actions">
          {achieved ? (
            <button type="button" onClick={() => setConfirming({ kind: 'unachieve' })}>
              「まだ」に戻す
            </button>
          ) : (
            <>
              {/* 書き換えたまま叶ったことにすると、書き換えが気づかないうちに消えるため、先に保存してもらう */}
              <button type="button" disabled={dirty} onClick={() => setConfirming({ kind: 'achieve' })}>
                叶ったことにする
              </button>
              {dirty && <p className="edit-actions__note">先に「保存」を押してください</p>}
            </>
          )}
          <button type="button" className="danger-button" onClick={() => setConfirming({ kind: 'delete' })}>
            この項目を削除する
          </button>
        </section>
      )}
      {renderConfirm()}
    </main>
  );
}
