// 記録画面の薬1つ分の残りの表示(SPEC.md 7.2・7.3)
// 「残り14錠・あと7日分」(7日分以下は目立つ色)。残りが1回分未満なら「残りの数を確認してください」
// 記録済みの欄でも、目立つ色と「残りの数を確認してください」は薄くしない(SPEC.md 7.4。CSS で行う)
import { isLowStock, needsRecount, stockText } from '../../lib/medication';
import type { Medication } from '../../lib/types';

export function StockLine({ medication }: { medication: Medication }) {
  const className = isLowStock(medication) ? 'intake-stock__text stock-text--low' : 'intake-stock__text';
  return (
    <span className="intake-stock">
      <span className={className}>{stockText(medication)}</span>
      {needsRecount(medication) && <span className="stock-notice">残りの数を確認してください</span>}
    </span>
  );
}
