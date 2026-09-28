// 入力値のチェック(設定画面の名前・日数・錠数)

/** 名前の前後の空白を取り除く。空になったら null(入力エラー) */
export function normalizeName(input: string): string | null {
  const trimmed = input.trim();
  return trimmed === '' ? null : trimmed;
}

/** 「○日ごと」の日数を読み取る。2以上の整数でなければ null(入力エラー) */
export function parseEveryNDays(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const n = Number(trimmed);
  return Number.isSafeInteger(n) && n >= 2 ? n : null;
}

/**
 * 錠数を読み取る(SPEC.md 7.1・7.2)。0.5錠単位で min 以上でなければ null(入力エラー)。
 * 例:「1」「0.5」「2.5」は正しい、「0.3」「-1」「1/2」はエラー
 * @param min 最小値(1回の錠数は 0.5、残り・補充・数え直しは 0)
 */
export function parseTabletCount(input: string, min: number): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const count = Number(trimmed);
  return Number.isFinite(count) && Number.isInteger(count * 2) && count >= min ? count : null;
}
