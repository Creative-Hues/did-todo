// バケットタブ(SPEC.md 9章):人格ごとの「いつかやりたいこと」のリストと、入力・編集画面
// 画面上部で人格を切り替える。「まだ」を上、「叶ったこと」を下に分け、どちらも ≡ で並び替える
import { useState } from 'react';
import { AlterSwitcher } from '../components/bucket/AlterSwitcher';
import { BucketItemRow } from '../components/bucket/BucketItemRow';
import { SortableList } from '../components/common/SortableList';
import { db } from '../db/db';
import { reorderBucketItems } from '../db/bucketRepo';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { resolveSelectedOwner, splitBucketItems, switchableAlters } from '../lib/bucket';
import type { BucketItem } from '../lib/types';
import { BucketItemEditScreen } from './BucketItemEditScreen';

/** 表示中の画面:一覧 / 項目の編集(id が null なら追加) */
type View = { kind: 'list' } | { kind: 'item'; ownerId: string; id: string | null };

export function BucketScreen() {
  const alters = useLiveQuery(() => db.alters.toArray());
  const items = useLiveQuery(() => db.bucketItems.toArray());
  // 選んだ人格のID(まだ選んでいなければ null。表示するのは resolveSelectedOwner で決めた人格)
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    rememberScroll();
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

  if (view.kind === 'item') {
    const owner = alterById.get(view.ownerId);
    const item = items.find((i) => i.id === view.id && i.deletedAt === undefined);
    // 人格がいて、追加するか編集する項目が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (owner && (view.id === null || item)) {
      return <BucketItemEditScreen key={view.id ?? 'new'} owner={owner} item={item} onBack={backToList} />;
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

  const renderSection = (title: string, sectionItems: BucketItem[]) => (
    <section className="home-section">
      <h2>{title}</h2>
      {sectionItems.length === 0 ? (
        <p className="empty">まだありません</p>
      ) : (
        <SortableList
          className="item-list"
          items={sectionItems}
          onReorder={(ids) => reorderBucketItems(db, ids)}
          renderItem={(item) => <BucketItemRow item={item} alterById={alterById} onOpen={openItem} />}
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
      {renderSection('まだ', pending)}
      {renderSection('叶ったこと', achieved)}
    </main>
  );
}
