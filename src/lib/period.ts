// 論理日・週・月の計算(SPEC.md 4章)
// 日付の計算は必ずこのファイルの関数を通すこと。すべて純粋関数(同じ入力なら同じ結果)。

/** 1日の始まり(朝5時) */
export const DAY_START_HOUR = 5;

/** 論理日を 'YYYY-MM-DD' 形式の文字列で表す */
export type LogicalDate = string;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDate(year: number, month: number, day: number): LogicalDate {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** 'YYYY-MM-DD' を年・月・日の数値に分ける */
function parseLogicalDate(logicalDate: LogicalDate): { year: number; month: number; day: number } {
  const [year, month, day] = logicalDate.split('-').map(Number);
  return { year, month, day };
}

/** 論理日を UTC の日数(1970-01-01 からの日数)に変換する。時差の影響を受けない */
function toDayNumber(logicalDate: LogicalDate): number {
  const { year, month, day } = parseLogicalDate(logicalDate);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

/**
 * 日時から論理日を求める。
 * 端末のローカル時刻から5時間引いた日時の「日付」。
 * 例:9/26 4:59 → 9/25、9/26 5:00 → 9/26
 */
export function toLogicalDate(date: Date): LogicalDate {
  const shifted = new Date(date.getTime());
  shifted.setHours(shifted.getHours() - DAY_START_HOUR);
  return formatDate(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate());
}

/** 論理日どうしの日数差(to − from)。to が from より前ならマイナスになる */
export function diffLogicalDays(from: LogicalDate, to: LogicalDate): number {
  return toDayNumber(to) - toDayNumber(from);
}

/**
 * 日時が属する週を、その週の月曜日の論理日で表す。
 * 週は論理日で月曜〜日曜。
 */
export function toLogicalWeek(date: Date): LogicalDate {
  const dayNumber = toDayNumber(toLogicalDate(date));
  const utc = new Date(dayNumber * 86_400_000);
  // getUTCDay:日曜=0, 月曜=1 … 土曜=6 → 月曜からの日数に直す
  const daysSinceMonday = (utc.getUTCDay() + 6) % 7;
  const monday = new Date((dayNumber - daysSinceMonday) * 86_400_000);
  return formatDate(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
}

/** 日時が属する月を 'YYYY-MM' 形式で表す(論理日の年月) */
export function toLogicalMonth(date: Date): string {
  return toLogicalDate(date).slice(0, 7);
}
