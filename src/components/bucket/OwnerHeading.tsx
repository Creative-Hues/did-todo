// 入力・編集画面の上に出す「人格Aのリスト」(SPEC.md 9.1)。人格の名前だけ色を付ける
// バケットは「その人格の願い」なので、誰のリストを触っているかがわかるようにする
import type { Alter } from '../../lib/types';

interface Props {
  owner: Alter;
}

export function OwnerHeading({ owner }: Props) {
  return (
    <p className="author-heading">
      <span style={{ color: owner.color }}>{owner.name}</span>のリスト
    </p>
  );
}
