// バケットの一覧の1件(SPEC.md 9.1)。タップすると編集画面を開く
// 内容は全文(改行もそのまま)。叶った項目には「叶った日:9/28」と協力してくれた人格のラベルを出す
// 「まだ」の項目は、右に「叶った」ボタンを出す(SPEC.md 9.2)
import { formatMonthDay } from '../../lib/timeFormat';
import type { Alter, BucketItem } from '../../lib/types';

interface Props {
  item: BucketItem;
  alterById: ReadonlyMap<string, Alter>;
  onOpen: (item: BucketItem) => void;
  /** 「叶った」ボタンを押したとき(渡したときだけボタンを出す) */
  onAchieve?: (item: BucketItem) => void;
}

export function BucketItemRow({ item, alterById, onOpen, onAchieve }: Props) {
  const body = (
    <button type="button" className="bucket-item" onClick={() => onOpen(item)}>
      <span className="note-item__text">{item.body}</span>
      {item.achievedAt !== null && (
        <span className="bucket-item__achieved">
          {/* 叶った日(実際の日付) */}
          <span>叶った日:{formatMonthDay(item.achievedAt)}</span>
          {item.helperAlterIds.map((id) => {
            const helper = alterById.get(id);
            return (
              helper && (
                <span key={id} className="alter-label" style={{ backgroundColor: helper.color }}>
                  {helper.name}
                </span>
              )
            );
          })}
        </span>
      )}
    </button>
  );

  if (!onAchieve) {
    return body;
  }
  // ボタンの中にボタンは入れられないので、中身と「叶った」を横に並べる
  return (
    <div className="bucket-row">
      {body}
      <button
        type="button"
        className="bucket-row__achieve"
        onClick={() => onAchieve(item)}
        aria-label={`「${item.body}」を叶ったことにする`}
      >
        叶った
      </button>
    </div>
  );
}
