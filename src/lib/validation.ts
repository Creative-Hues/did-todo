// 入力値のチェック(設定画面の名前・日数)

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
