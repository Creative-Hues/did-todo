// 人格の区分の設定(SPEC.md 10.2):人格情報タブの「区分の設定」から開く一覧と編集画面
import { useState } from 'react';
import { AlterCategoryList } from '../components/settings/AlterCategoryList';
import { db } from '../db/db';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { AlterCategoryEditScreen } from './AlterCategoryEditScreen';

/** 表示中の画面:一覧 / 区分の編集(id が null なら新規追加) */
type View = { kind: 'list' } | { kind: 'category'; id: string | null };

interface Props {
  onBack: () => void;
}

export function AlterCategorySettingsScreen({ onBack }: Props) {
  const categories = useLiveQuery(() => db.categories.toArray());
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    rememberScroll();
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!categories) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  if (view.kind === 'category') {
    const category = categories.find((c) => c.id === view.id);
    // 新規追加か、編集する区分が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || category) {
      return <AlterCategoryEditScreen key={view.id ?? 'new'} category={category} onBack={backToList} />;
    }
  }

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>区分の設定</h1>
      </header>
      <AlterCategoryList
        categories={categories}
        onAdd={() => open({ kind: 'category', id: null })}
        onOpen={(category) => open({ kind: 'category', id: category.id })}
      />
    </main>
  );
}
