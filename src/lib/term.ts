// 「人格」という呼び方を、自分たちの言葉に変える(SPEC.md 14章③)。すべて純粋関数。
// 画面の文は「人格」で書いておき、表示の直前に withTerm で呼び方に置き換える。
// 利用者が付けた名前(人格・区分・分類・きっかけの名前)は置き換えないこと:
// 名前を入れた後の文に withTerm を使わず、名前を入れる前の決まった文だけに使う

/** 最初の呼び方 */
export const DEFAULT_TERM = '人格';

/** 呼び方の選択肢(この中にないものは「自分で入力」) */
export const TERM_PRESETS: readonly string[] = ['人格', 'メンバー', 'パーツ', 'オルター'];

/** 自由に入力するときの最大文字数 */
export const TERM_MAX_LENGTH = 10;

/** 呼び方の入力を整える(前後の空白を取り除く)。空や長すぎるときは null */
export function normalizeTerm(input: string): string | null {
  const trimmed = input.trim();
  // 絵文字なども1文字と数える
  const length = [...trimmed].length;
  return length >= 1 && length <= TERM_MAX_LENGTH ? trimmed : null;
}

/** 決まった文の中の「人格」を、呼び方に置き換える */
export function withTerm(text: string, term: string): string {
  return term === DEFAULT_TERM ? text : text.replaceAll(DEFAULT_TERM, term);
}
