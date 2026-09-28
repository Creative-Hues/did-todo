// バケットタブ(SPEC.md 9章):人格ごとの「いつかやりたいこと」のリストと、入力・編集画面
// 画面上部で人格を切り替える。「まだ」を上、「叶ったこと」を下に分け、どちらも ≡ で並び替える
// 叶ったことにするときは、本人確認 → 協力者を選ぶ画面 → 保存(SPEC.md 9.2)
import { useState } from 'react';
import { AlterSwitcher } from '../components/bucket/AlterSwitcher';
import { BucketItemRow } from '../components/bucket/BucketItemRow';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SortableList } from '../components/common/SortableList';
import { db } from '../db/db';
import { reorderBucketItems } from '../db/bucketRepo';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { achieveConfirmMessage, resolveSelectedOwner, splitBucketItems, switchableAlters } from '../lib/bucket';
import type { BucketItem } from '../lib/types';
import { BucketHelperScreen } from './BucketHelperScreen';
import { BucketItemEditScreen } from './BucketItemEditScreen';

/** 項目の編集画面(id が null なら追加) */
type ItemView = { kind: 'item'; ownerId: string; id: string | null };

/**
 * 表示中の画面:一覧 / 項目の編集 / 協力者を選ぶ画面
 * 協力者を選ぶ画面の returnTo は、「キャンセル」で戻る先(一覧か、開いていた編集画面)
 */
type View = { kind: 'list' } | ItemView | { kind: 'helpers'; ownerId: string; id: string; returnTo: View };

export function BucketScreen() {
  const alters = useLiveQuery(() => db.alters.toArray());
  const items = useLiveQuery(() => db.bucketItems.toArray());
  // 選んだ人格のID(まだ選んでいなければ null。表示するのは resolveSelectedOwner で決めた人格)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'list' });
  // 一覧の「叶った」で本人確認を出している項目
  const [achieving, setAchieving] = useState<BucketItem | null>(null);
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    if (view.kind === 'list') {
      rememberScroll();
    }
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!alters || !items) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  const alterById = new Map(alters.map((alter) => [alter.id, alter]));
  // 削除済みの項目は開かない
  const findItem = (id: string | null) => items.find((i) => i.id === id && i.deletedAt === undefined);

  if (view.kind === 'helpers') {
    const owner = alterById.get(view.ownerId);
    const item = findItem(view.id);
    // まだ叶っていない項目のときだけ出す(ほかの画面で叶った・削除されたなら一覧を出す)
    if (owner && item && item.achievedAt === null) {
      return (
        <BucketHelperScreen
          key={item.id}
          owner={owner}
          item={item}
          alters={alters}
          onDone={backToList}
          onCancel={() => setView(view.returnTo)}
        />
      );
    }
  }

  if (view.kind === 'item') {
    const owner = alterById.get(view.ownerId);
    const item = findItem(view.id);
    // 人格がいて、追加するか編集する項目が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (owner && (view.id === null || item)) {
      return (
        <BucketItemEditScreen
          // 叶った/まだが変わったら、フォームを作り直す(協力者の欄を出し分けるため)
          key={`${view.id ?? 'new'}-${item?.achievedAt ?? ''}`}
          owner={owner}
          item={item}
          alters={alters}
          onBack={backToList}
          onAchieve={(target) => open({ kind: 'helpers', ownerId: owner.id, id: target.id, returnTo: view })}
        />
      );
    }
  }

  const ownerId = resolveSelectedOwner(alters, selectedId);
  const owner = ownerId === null ? undefined : alterById.get(ownerId);

  if (!owner) {
    return (
      <main className="app">
        <header className="screen-header">
          <h1>バケット</h1>
        </header>
        <p className="empty">人格がまだ登録されていません。人格情報タブで追加できます</p>
      </main>
    );
  }

  const { pending, achieved } = splitBucketItems(items, owner.id);
  const openItem = (item: BucketItem) => open({ kind: 'item', ownerId: owner.id, id: item.id });

  const renderSection = (title: string, sectionItems: BucketItem[], canAchieve: boolean) => (
    <section className="home-section">
      <h2>{title}</h2>
      {sectionItems.length === 0 ? (
        <p className="empty">まだありません</p>
      ) : (
        <SortableList
          className="item-list"
          items={sectionItems}
          onReorder={(ids) => reorderBucketItems(db, ids)}
          renderItem={(item) => (
            <BucketItemRow
              item={item}
              alterById={alterById}
              onOpen={openItem}
              onAchieve={canAchieve ? setAchieving : undefined}
            />
          )}
          getLabel={(item) => item.body}
        />
      )}
    </section>
  );

  return (
    <main className="app">
      <header className="screen-header">
        <h1>バケット</h1>
      </header>
      <AlterSwitcher alters={switchableAlters(alters)} selectedId={owner.id} onSelect={setSelectedId} />
      <button type="button" className="add-button" onClick={() => open({ kind: 'item', ownerId: owner.id, id: null })}>
        ＋ 追加
      </button>
      {renderSection('まだ', pending, true)}
      {renderSection('叶ったこと', achieved, false)}
      {achieving && (
        <ConfirmDialog
          message={achieveConfirmMessage(owner.name)}
          confirmLabel="叶ったことにする"
          danger={false}
          onConfirm={() => {
            setAchieving(null);
            open({ kind: 'helpers', ownerId: owner.id, id: achieving.id, returnTo: { kind: 'list' } });
          }}
          onCancel={() => setAchieving(null)}
        />
      )}
    </main>
  );
}
