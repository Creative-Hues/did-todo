// バケットの一覧の1件(SPEC.md 9.1)。タップすると編集画面を開く
// 内容は全文(改行もそのまま)。叶った項目には「叶った日:9/28」と協力してくれた人格のラベルを出す
import { formatMonthDay } from '../../lib/timeFormat';
import type { Alter, BucketItem } from '../../lib/types';

interface Props {
  item: BucketItem;
  alterById: ReadonlyMap<string, Alter>;
  onOpen: (item: BucketItem) => void;
}

export function BucketItemRow({ item, alterById, onOpen }: Props) {
  return (
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
}
