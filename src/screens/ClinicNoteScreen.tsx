// 受診メモタブ(SPEC.md 8章):メモの一覧と、入力・編集画面
// 「まだ話していないもの」を上、「話したもの」を下に分ける(8.2)
// 各メモの下にコメント(8.4)を古い順に並べる
// 分類の設定・診察用の表示は、このあとの段階で足す
import { useState } from 'react';
import { ClinicNoteItem } from '../components/clinic/ClinicNoteItem';
import { CommentList } from '../components/clinic/CommentList';
import { db } from '../db/db';
import { setClinicNoteDiscussed } from '../db/clinicNoteRepo';
import { useListScroll } from '../hooks/useListScroll';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { groupCommentsByNote, splitClinicNotes } from '../lib/clinicNotes';
import { showSaveError } from '../lib/showError';
import type { ClinicNote } from '../lib/types';
import { ClinicNoteCommentEditScreen } from './ClinicNoteCommentEditScreen';
import { ClinicNoteEditScreen } from './ClinicNoteEditScreen';

/** 表示中の画面:一覧 / メモの編集 / コメントの編集(id が null なら新しく書く) */
type View =
  | { kind: 'list' }
  | { kind: 'note'; id: string | null }
  | { kind: 'comment'; noteId: string; id: string | null };

export function ClinicNoteScreen() {
  const alters = useLiveQuery(() => db.alters.toArray());
  const categories = useLiveQuery(() => db.clinicNoteCategories.toArray());
  const notes = useLiveQuery(() => db.clinicNotes.toArray());
  const comments = useLiveQuery(() => db.clinicNoteComments.toArray());
  const [view, setView] = useState<View>({ kind: 'list' });
  const rememberScroll = useListScroll(view.kind === 'list');

  const open = (next: View) => {
    rememberScroll();
    setView(next);
  };
  const backToList = () => setView({ kind: 'list' });

  if (!alters || !categories || !notes || !comments) {
    return (
      <main className="app">
        <p>読み込み中…</p>
      </main>
    );
  }

  if (view.kind === 'note') {
    const note = notes.find((n) => n.id === view.id);
    // 新しく書くか、編集するメモが見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || note) {
      return (
        <ClinicNoteEditScreen
          key={view.id ?? 'new'}
          note={note}
          alters={alters}
          categories={categories}
          onBack={backToList}
        />
      );
    }
  }

  if (view.kind === 'comment') {
    const comment = comments.find((c) => c.id === view.id);
    // 新しく書くか、編集するコメントが見つかるときだけ編集画面を出す(削除済みなら一覧を出す)
    if (view.id === null || comment) {
      return (
        <ClinicNoteCommentEditScreen
          key={view.id ?? `new-${view.noteId}`}
          noteId={view.noteId}
          comment={comment}
          alters={alters}
          onBack={backToList}
        />
      );
    }
  }

  const alterById = new Map(alters.map((alter) => [alter.id, alter]));
  const commentsByNote = groupCommentsByNote(comments);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const { pending, discussed } = splitClinicNotes(notes);

  // 話した日時は、チェックを押した瞬間の時刻を使う
  const handleToggleDiscussed = async (note: ClinicNote, checked: boolean) => {
    try {
      await setClinicNoteDiscussed(db, note.id, checked, new Date());
    } catch (error) {
      showSaveError(error);
    }
  };

  const renderList = (items: ClinicNote[]) => (
    <ul className="task-list">
      {items.map((note) => (
        <li key={note.id} className="note-entry">
          <ClinicNoteItem
            note={note}
            alterById={alterById}
            categoryById={categoryById}
            onToggleDiscussed={handleToggleDiscussed}
            onOpen={() => open({ kind: 'note', id: note.id })}
          />
          <CommentList
            comments={commentsByNote.get(note.id) ?? []}
            alterById={alterById}
            onOpen={(comment) => open({ kind: 'comment', noteId: note.id, id: comment.id })}
            onAdd={() => open({ kind: 'comment', noteId: note.id, id: null })}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <main className="app">
      <header className="screen-header">
        <h1>受診メモ</h1>
      </header>
      <button type="button" className="add-button" onClick={() => open({ kind: 'note', id: null })}>
        ＋ メモを書く
      </button>
      {notes.length === 0 ? (
        <p className="empty">メモはまだありません</p>
      ) : (
        <>
          <section className="home-section">
            <h2>まだ話していないもの</h2>
            {pending.length === 0 ? <p className="empty">ありません</p> : renderList(pending)}
          </section>
          {discussed.length > 0 && (
            <section className="home-section">
              <h2>話したもの</h2>
              {renderList(discussed)}
            </section>
          )}
        </>
      )}
    </main>
  );
}
