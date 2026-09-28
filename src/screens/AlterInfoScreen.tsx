// 人格情報タブ(SPEC.md 10.1):「全体のこと」の入口、区分ごとの人格の一覧、区分の設定、バックアップの入口
// 人格の行をタップすると人格ごとのページ(10.3)が開き、そこから各編集画面を開く
// 早見表・PDF は、フェーズ12の段階Dで足す
import { useLayoutEffect, useRef, useState } from 'react';
import { AlterList } from '../components/settings/AlterList';
import { db } from '../db/db';
import { getLastExportedAt } from '../db/backupRepo';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { useNow } from '../hooks/useNow';
import { sectionsOf } from '../lib/alterInfo';
import { backupReminderText } from '../lib/backup';
import { AlterBasicInfoEditScreen } from './AlterBasicInfoEditScreen';
import { AlterCategorySettingsScreen } from './AlterCategorySettingsScreen';
import { AlterEditScreen } from './AlterEditScreen';
import { AlterPageScreen } from './AlterPageScreen';
import { BackupScreen } from './BackupScreen';
import { CommonInfoScreen } from './CommonInfoScreen';
import { ProfileSectionEditScreen } from './ProfileSectionEditScreen';

/**
 * 表示中の画面
 * - list:一覧
 * - page:人格ごとのページ
 * - alterEdit:人格の編集(id が null なら新規追加)
 * - basicInfo:基本情報の編集
 * - common:全体のこと
 * - section:見出しの編集(ownerId が null なら「全体のこと」、sectionId が null なら追加)
 * - categories:区分の設定
 * - backup:バックアップ
 */
type View =
  | { kind: 'list' }
  | { kind: 'page'; id: string }
  | { kind: 'alterEdit'; id: string | null }
  | { kind: 'basicInfo'; id: string }
  | { kind: 'common' }
  | { kind: 'section'; ownerId: string | null; sectionId: string | null }
  | { kind: 'categories' }
  | { kind: 'backup' };

export function AlterInfoScreen() {
  const alters = useLiveQuery(() => db.alters.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const sections = useLiveQuery(() => db.profileSections.toArray());
  const lastExportedAt = useLiveQuery(() => getLastExportedAt(db));
  const now = useNow();
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');
  // 人格のページ・全体のことから編集画面を開いたときの、ページのスクロール位置(戻ったら元の位置に戻す)
  const pageScrollY = useRef<number | null>(null);

  // 一覧以外の画面に切り替わったら、一番上を出す(ページに戻ったときは覚えた位置へ)
  // 一覧のスクロール位置は useListScroll が戻す
  const viewKey = JSON.stringify(view);
  useLayoutEffect(() => {
    if (view.kind === 'list') {
      return;
    }
    const isPage = view.kind === 'page' || view.kind === 'common';
    window.scrollTo(0, isPage && pageScrollY.current !== null ? pageScrollY.current : 0);
    if (isPage) {
      pageScrollY.current = null;
    }
    // viewKey は view の中身が変わったときだけ変わる
  }, [viewKey]);

  /** 一覧から別の画面を開く */
  const open = (next: View) => {
    rememberScroll();
    pageScrollY.current = null;
    setView(next);
  };
  /** 人格のページ・全体のことから編集画面を開く */
  const openFromPage = (next: View) => {
    pageScrollY.current = window.scrollY;
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!alters || !categories || !sections) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  const findAlter = (id: string | null) => alters.find((a) => a.id === id);
  /** 見出しの持ち主のページ(人格のページ、または「全体のこと」)に戻る */
  const backToOwner = (ownerId: string | null) =>
    setView(ownerId === null ? { kind: 'common' } : { kind: 'page', id: ownerId });

  switch (view.kind) {
    case 'backup':
      return <BackupScreen onBack={backToList} />;
    case 'categories':
      return <AlterCategorySettingsScreen onBack={backToList} />;
    case 'common':
      return (
        <CommonInfoScreen
          sections={sectionsOf(sections, null)}
          onBack={backToList}
          onOpenSection={(section) => openFromPage({ kind: 'section', ownerId: null, sectionId: section.id })}
          onAddSection={() => openFromPage({ kind: 'section', ownerId: null, sectionId: null })}
        />
      );
    case 'page': {
      const alter = findAlter(view.id);
      // 削除済みなら一覧を出す
      if (!alter) {
        break;
      }
      return (
        <AlterPageScreen
          alter={alter}
          categories={categories}
          sections={sectionsOf(sections, alter.id)}
          onBack={backToList}
          onEditAlter={() => openFromPage({ kind: 'alterEdit', id: alter.id })}
          onEditBasicInfo={() => openFromPage({ kind: 'basicInfo', id: alter.id })}
          onOpenSection={(section) => openFromPage({ kind: 'section', ownerId: alter.id, sectionId: section.id })}
          onAddSection={() => openFromPage({ kind: 'section', ownerId: alter.id, sectionId: null })}
        />
      );
    }
    case 'alterEdit': {
      const alter = findAlter(view.id);
      // 新規追加か、編集する人格が見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
      if (view.id !== null && !alter) {
        break;
      }
      return (
        <AlterEditScreen
          key={view.id ?? 'new'}
          alter={alter}
          categories={categories}
          // 編集はその人格のページへ、追加のキャンセルは一覧へ戻る
          onBack={() => (alter ? setView({ kind: 'page', id: alter.id }) : backToList())}
          onAdded={(added) => setView({ kind: 'page', id: added.id })}
          onDeleted={backToList}
        />
      );
    }
    case 'basicInfo': {
      const alter = findAlter(view.id);
      if (!alter) {
        break;
      }
      return <AlterBasicInfoEditScreen alter={alter} onBack={() => setView({ kind: 'page', id: alter.id })} />;
    }
    case 'section': {
      const owner = view.ownerId === null ? null : findAlter(view.ownerId);
      const section = sections.find((s) => s.id === view.sectionId);
      // 持ち主の人格や、編集する見出しが見つからない(削除済み)なら一覧を出す
      if (owner === undefined || (view.sectionId !== null && !section)) {
        break;
      }
      return (
        <ProfileSectionEditScreen
          key={view.sectionId ?? 'new'}
          owner={owner}
          section={section}
          onBack={() => backToOwner(view.ownerId)}
        />
      );
    }
    case 'list':
      break;
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
        onAdd={() => open({ kind: 'alterEdit', id: null })}
        onOpen={(alter) => open({ kind: 'page', id: alter.id })}
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
