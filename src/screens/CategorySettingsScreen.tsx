// 受診メモの分類の設定(SPEC.md 8.1):受診メモタブの「分類の設定」から開く一覧と編集画面
import { useState } from 'react';
import { CategoryList } from '../components/clinic/CategoryList';
import { db } from '../db/db';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { CategoryEditScreen } from './CategoryEditScreen';

/** 表示中の画面:一覧 / 分類の編集(id が null なら新規追加) */
type View = { kind: 'list' } | { kind: 'category'; id: string | null };

interface Props {
  onBack: () => void;
}

export function CategorySettingsScreen({ onBack }: Props) {
  const categories = useLiveQuery(() => db.clinicNoteCategories.toArray());
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
    // 新規追加か、編集する分類が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || category) {
      return <CategoryEditScreen key={view.id ?? 'new'} category={category} onBack={backToList} />;
    }
  }

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>分類の設定</h1>
      </header>
      <CategoryList
        categories={categories}
        onAdd={() => open({ kind: 'category', id: null })}
        onOpen={(category) => open({ kind: 'category', id: category.id })}
      />
    </main>
  );
}
