// 薬の登録・編集フォーム(SPEC.md 7.1)
// 通院の帰りにすぐ登録できるよう、1画面で全部入れられるようにする
// 残りの錠数は登録のときだけ入れる(登録したあとは補充・数え直しで変える。SPEC.md 7.2)
import { useState, type FormEvent } from 'react';
import type { MedicationInput } from '../../db/medicationRepo';
import { TIMING_LABELS, TIMINGS, formatTablets } from '../../lib/medication';
import { normalizeName, parseDosePerTake, parseStockCount } from '../../lib/validation';
import type { Medication, MedicationTiming } from '../../lib/types';

interface Props {
  /** 編集するときの元の薬(登録のときは undefined) */
  initial?: Medication;
  /**
   * 保存するとき
   * @param remaining 登録のときの残りの錠数(編集のときは null)
   */
  onSubmit: (input: MedicationInput, remaining: number | null) => Promise<void>;
  onCancel: () => void;
}

export function MedicationForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<Medication['kind']>(initial?.kind ?? 'scheduled');
  const [timings, setTimings] = useState<MedicationTiming[]>(initial?.timings ?? []);
  const [doseText, setDoseText] = useState(initial ? formatTablets(initial.dosePerTake) : '1');
  const [remainingText, setRemainingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const toggleTiming = (timing: MedicationTiming) => {
    setTimings((current) => (current.includes(timing) ? current.filter((t) => t !== timing) : [...current, timing]));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeName(name);
    if (normalized === null) {
      setError('薬の名前を入力してください');
      return;
    }
    if (kind === 'scheduled' && timings.length === 0) {
      setError('時間帯を1つ以上選んでください');
      return;
    }
    const dosePerTake = parseDosePerTake(doseText);
    if (dosePerTake === null) {
      setError('1回の錠数は0.5錠単位で、0.5以上の数を入力してください');
      return;
    }
    let remaining: number | null = null;
    if (!initial) {
      remaining = parseStockCount(remainingText);
      if (remaining === null) {
        setError('残りの錠数は0.5錠単位で、0以上の数を入力してください');
        return;
      }
    }
    void onSubmit({ name: normalized, kind, timings, dosePerTake }, remaining);
  };

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>名前</span>
        <input
          type="text"
          value={name}
          placeholder="例:○○錠 5mg"
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <fieldset className="field">
        <legend>飲み方</legend>
        <label className="choice">
          <input type="radio" name="kind" checked={kind === 'scheduled'} onChange={() => setKind('scheduled')} />
          決まった時間
        </label>
        <label className="choice">
          <input type="radio" name="kind" checked={kind === 'asNeeded'} onChange={() => setKind('asNeeded')} />
          頓服
        </label>
      </fieldset>

      {kind === 'scheduled' && (
        <fieldset className="field">
          <legend>時間帯(複数選べます)</legend>
          {TIMINGS.map((timing) => (
            <label key={timing} className="choice">
              <input type="checkbox" checked={timings.includes(timing)} onChange={() => toggleTiming(timing)} />
              {TIMING_LABELS[timing]}
            </label>
          ))}
        </fieldset>
      )}

      <label className="field">
        <span>1回の錠数(0.5錠単位)</span>
        <span className="choice">
          <input
            type="text"
            inputMode="decimal"
            className="days-input"
            value={doseText}
            onChange={(event) => setDoseText(event.target.value)}
          />
          錠
        </span>
      </label>

      {!initial && (
        <label className="field">
          <span>残りの錠数(0.5錠単位)</span>
          <span className="choice">
            <input
              type="text"
              inputMode="decimal"
              className="days-input"
              value={remainingText}
              onChange={(event) => setRemainingText(event.target.value)}
            />
            錠
          </span>
        </label>
      )}

      {error && <p className="form-error">{error}</p>}
      <div className="form-buttons">
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
        <button type="submit" className="primary">
          保存
        </button>
      </div>
    </form>
  );
}
