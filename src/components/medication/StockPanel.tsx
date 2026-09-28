// 薬の編集画面の「残りの錠数」:今の残り、補充・数え直し、在庫の履歴(SPEC.md 7.2・7.3)
import { useState, type FormEvent } from 'react';
import { db } from '../../db/db';
import { recountMedication, refillMedication } from '../../db/medicationRepo';
import { useLiveQuery } from '../../hooks/useLiveQuery';
import {
  STOCK_LOG_LABELS,
  isLowStock,
  needsRecount,
  sortStockLogs,
  stockLogAmountText,
  stockText,
} from '../../lib/medication';
import { showSaveError } from '../../lib/showError';
import { formatDateTime } from '../../lib/timeFormat';
import { parseStockCount } from '../../lib/validation';
import type { Medication } from '../../lib/types';

/** 補充 / 数え直し */
type StockAction = 'refill' | 'recount';

const ACTIONS: { action: StockAction; label: string; hint: string }[] = [
  { action: 'refill', label: '補充', hint: 'もらってきた錠数' },
  { action: 'recount', label: '数え直し', hint: '実際に数えた錠数' },
];

interface Props {
  medication: Medication;
}

export function StockPanel({ medication }: Props) {
  const logs = useLiveQuery(
    () => db.stockLogs.where('medicationId').equals(medication.id).toArray(),
    [medication.id],
  );
  const [texts, setTexts] = useState<Record<StockAction, string>>({ refill: '', recount: '' });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent, action: StockAction) => {
    event.preventDefault();
    const amount = parseStockCount(texts[action]);
    if (amount === null) {
      setError('錠数は0.5錠単位で、0以上の数を入力してください');
      return;
    }
    try {
      const save = action === 'refill' ? refillMedication : recountMedication;
      await save(db, medication.id, amount, new Date());
      setError(null);
      setTexts((current) => ({ ...current, [action]: '' }));
    } catch (saveError) {
      showSaveError(saveError);
    }
  };

  return (
    <section className="stock-panel">
      <h2>残りの錠数</h2>
      <p className={isLowStock(medication) ? 'stock-text stock-text--low' : 'stock-text'}>{stockText(medication)}</p>
      {needsRecount(medication) && <p className="stock-notice">残りの数を確認してください</p>}

      {ACTIONS.map(({ action, label, hint }) => (
        <form key={action} className="stock-form" onSubmit={(event) => void handleSubmit(event, action)}>
          <label className="stock-form__label">
            <span>
              {label}({hint})
            </span>
            <span className="choice">
              <input
                type="text"
                inputMode="decimal"
                className="days-input"
                value={texts[action]}
                onChange={(event) => setTexts((current) => ({ ...current, [action]: event.target.value }))}
              />
              錠
            </span>
          </label>
          <button type="submit">{label}する</button>
        </form>
      ))}
      {error && <p className="form-error">{error}</p>}

      <h3 className="hidden-heading">在庫の履歴</h3>
      {logs && logs.length === 0 && <p className="empty">履歴はありません</p>}
      <ul className="stock-log-list">
        {sortStockLogs(logs ?? []).map((log) => (
          <li key={log.id} className="stock-log">
            <span className="stock-log__at">{formatDateTime(log.at)}</span>
            <span>{STOCK_LOG_LABELS[log.kind]}</span>
            <span>{stockLogAmountText(log)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
