// 薬の登録・編集フォーム(SPEC.md 7.1)
// 通院の帰りにすぐ登録できるよう、1画面で全部入れられるようにする
// 残りの錠数は登録のときだけ入れる(登録したあとは補充・数え直しで変える。SPEC.md 7.2)
import { useState, type FormEvent } from 'react';
import type { MedicationInput } from '../../db/medicationRepo';
import { formatTablets } from '../../lib/medication';
import { validateMedicationForm } from '../../lib/medicationForm';
import { selectableTimingsFor } from '../../lib/medicationTimings';
import type { Medication, MedicationTiming, MedicationTimingId } from '../../lib/types';

interface Props {
  /** 編集するときの元の薬(登録のときは undefined) */
  initial?: Medication;
  /** 時間帯の一覧(非表示のものも含む) */
  timingList: MedicationTiming[];
  /**
   * 保存するとき
   * @param remaining 登録のときの残りの錠数(編集のときは null)
   */
  onSubmit: (input: MedicationInput, remaining: number | null) => Promise<void>;
  onCancel: () => void;
}

export function MedicationForm({ initial, timingList, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<Medication['kind']>(initial?.kind ?? 'scheduled');
  const [timings, setTimings] = useState<MedicationTimingId[]>(initial?.timings ?? []);
  const [doseText, setDoseText] = useState(initial ? formatTablets(initial.dosePerTake) : '1');
  const [remainingText, setRemainingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 選択肢は非表示でない時間帯を、一覧の並び順で出す。その薬がすでに使っている非表示の時間帯も
  // 「(非表示)」を付けて出し、チェックを外せるようにする(SPEC.md 7.1・7.8)
  const selectableTimings = selectableTimingsFor(timingList, initial?.timings ?? []);

  const toggleTiming = (timing: MedicationTimingId) => {
    setTimings((current) => (current.includes(timing) ? current.filter((t) => t !== timing) : [...current, timing]));
  };

  // 飲み方を切り替えたら、前に出たエラーは消す
  // (「決まった時間」で出た時間帯のエラーが、頓服に切り替えたあとも残らないように)
  // 選んでいた時間帯は残しておき、「決まった時間」に戻したときにそのまま出す
  const changeKind = (next: Medication['kind']) => {
    setKind(next);
    setError(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateMedicationForm(
      { name, kind, timings, doseText, remainingText: initial ? null : remainingText },
      timingList,
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    void onSubmit(result.input, result.remaining);
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
          <input type="radio" name="kind" checked={kind === 'scheduled'} onChange={() => changeKind('scheduled')} />
          決まった時間
        </label>
        <label className="choice">
          <input type="radio" name="kind" checked={kind === 'asNeeded'} onChange={() => changeKind('asNeeded')} />
          頓服
        </label>
      </fieldset>

      {kind === 'scheduled' && (
        <fieldset className="field">
          <legend>時間帯(複数選べます)</legend>
          {selectableTimings.map((timing) => (
            <label key={timing.id} className="choice">
              <input
                type="checkbox"
                checked={timings.includes(timing.id)}
                onChange={() => toggleTiming(timing.id)}
              />
              {timing.name}
              {timing.hidden && '(非表示)'}
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
