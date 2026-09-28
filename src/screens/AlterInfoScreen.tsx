// 人格情報タブ(SPEC.md 10.1):「全体のこと」の入口、区分ごとの人格の一覧と編集画面、区分の設定、バックアップの入口
// 全体のことの中身・人格ごとのページ・早見表・PDF は、フェーズ12の段階C・Dで足す
import { useState } from 'react';
import { AlterList } from '../components/settings/AlterList';
import { db } from '../db/db';
import { getLastExportedAt } from '../db/backupRepo';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNow } from '../hooks/useNow';
import { backupReminderText } from '../lib/backup';
import { AlterCategorySettingsScreen } from './AlterCategorySettingsScreen';
import { AlterEditScreen } from './AlterEditScreen';
import { BackupScreen } from './BackupScreen';

/** 表示中の画面:一覧 / 人格の編集(id が null なら新規追加) / 全体のこと / 区分の設定 / バックアップ */
type View =
  | { kind: 'list' }
  | { kind: 'alter'; id: string | null }
  | { kind: 'common' }
  | { kind: 'categories' }
  | { kind: 'backup' };

export function AlterInfoScreen() {
  const alters = useLiveQuery(() => db.alters.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const lastExportedAt = useLiveQuery(() => getLastExportedAt(db));
  const now = useNow();
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    rememberScroll();
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!alters || !categories) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  if (view.kind === 'backup') {
    return <BackupScreen onBack={backToList} />;
  }
  if (view.kind === 'common') {
    // 「全体のこと」の中身は段階Cで作る
    return (
      <main className="app">
        <header className="screen-header">
          <button type="button" onClick={backToList}>
            ‹ 戻る
          </button>
          <h1>全体のこと</h1>
        </header>
        <p>この画面は準備中です</p>
      </main>
    );
  }
  if (view.kind === 'categories') {
    return <AlterCategorySettingsScreen onBack={backToList} />;
  }
  if (view.kind === 'alter') {
    const alter = alters.find((a) => a.id === view.id);
    // 新規追加か、編集する人格が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || alter) {
      return (
        <AlterEditScreen key={view.id ?? 'new'} alter={alter} categories={categories} onBack={backToList} />
      );
    }
  }

  // 書き出しをすすめる表示(読み込み中は出さない)
  const reminder = lastExportedAt === undefined ? null : backupReminderText(lastExportedAt, now);

  return (
    <main className="app">
      <header className="screen-header">
        <h1>人格情報</h1>
      </header>
      {/* 特定の人格ではない情報のページへの入口(SPEC.md 10.1・10.5) */}
      <button type="button" className="add-button common-entry" onClick={() => open({ kind: 'common' })}>
        <span>全体のこと</span>
        <span aria-hidden="true">›</span>
      </button>
      <AlterList
        alters={alters}
        categories={categories}
        onAdd={() => open({ kind: 'alter', id: null })}
        onOpen={(alter) => open({ kind: 'alter', id: alter.id })}
      />
      <section className="settings-section">
        <h2>区分</h2>
        <button type="button" className="add-button" onClick={() => open({ kind: 'categories' })}>
          区分の設定
        </button>
      </section>
      <section className="settings-section">
        <h2>バックアップ</h2>
        {reminder && <p className="backup-reminder">{reminder}</p>}
        <button type="button" className="add-button" onClick={() => open({ kind: 'backup' })}>
          バックアップを開く
        </button>
      </section>
    </main>
  );
}
