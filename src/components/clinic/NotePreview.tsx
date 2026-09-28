// コメントの入力・編集画面の上に出す、元のメモ(SPEC.md 8.4)
// 交代して別の人格が画面を見ても、何のメモへのコメントかがすぐわかるようにする
// 入力欄と区別できるよう、薄い背景の枠に入れる
import { resolveRecordAlter } from '../../lib/completionLabel';
import { UNKNOWN_CATEGORY_NAME } from '../../lib/clinicNotes';
import type { Alter, ClinicNote, ClinicNoteCategory } from '../../lib/types';

interface Props {
  note: ClinicNote;
  alterById: ReadonlyMap<string, Alter>;
  categoryById: ReadonlyMap<string, ClinicNoteCategory>;
}

export function NotePreview({ note, alterById, categoryById }: Props) {
  const author = resolveRecordAlter(note, alterById);
  return (
    <div className="note-preview">
      <span className="note-item__meta">
        <span className="item-name" style={author.color ? { color: author.color } : undefined}>
          {author.name}
        </span>
        <span>{categoryById.get(note.categoryId)?.name ?? UNKNOWN_CATEGORY_NAME}</span>
      </span>
      {/* 内容は全文。改行もそのまま出す */}
      <span className="note-item__text">{note.body}</span>
    </div>
  );
}
