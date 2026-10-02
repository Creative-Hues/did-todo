// きっかけの設定(SPEC.md 17.2):「交代の記録」の画面から開く一覧と編集画面
import { useState } from 'react';
import { SwitchTagList } from '../components/switch/SwitchTagList';
import { db } from '../db/db';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { SwitchTagEditScreen } from './SwitchTagEditScreen';

/** 表示中の画面:一覧 / きっかけの編集(id が null なら新規追加) */
type View = { kind: 'list' } | { kind: 'tag'; id: string | null };

interface Props {
  onBack: () => void;
}

export function SwitchTagSettingsScreen({ onBack }: Props) {
  const tags = useLiveQuery(() => db.switchTags.toArray());
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    rememberScroll();
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!tags) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  if (view.kind === 'tag') {
    const tag = tags.find((t) => t.id === view.id);
    // 新規追加か、編集するきっかけが見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || tag) {
      return <SwitchTagEditScreen key={view.id ?? 'new'} tag={tag} onBack={backToList} />;
    }
  }

  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>きっかけの設定</h1>
      </header>
      <SwitchTagList
        tags={tags}
        onAdd={() => open({ kind: 'tag', id: null })}
        onOpen={(tag) => open({ kind: 'tag', id: tag.id })}
      />
    </main>
  );
}
