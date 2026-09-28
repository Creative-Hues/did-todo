// 完了時刻の表示(SPEC.md 6.1)。純粋関数。
// 曜日・日付は論理日ではなく、実際の日時(端末のローカル時刻)で表示する。
import type { SectionKey } from './home';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** 「9:12」形式(時はゼロ埋めなし、分は2桁) */
function formatClock(date: Date): string {
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** 「2026/9/28 21:30」形式(実際の日時) */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${formatClock(date)}`;
}

/**
 * 完了時刻を欄に合わせた形式で表す。
 * - 今日:「9:12」
 * - 今週:「水 9:12」
 * - 今月:「9/3 9:12」
 * @param completedAt 完了日時(ISO形式)
 */
export function formatCompletionTime(completedAt: string, section: SectionKey): string {
  const date = new Date(completedAt);
  const clock = formatClock(date);
  switch (section) {
    case 'today':
      return clock;
    case 'week':
      return `${WEEKDAYS[date.getDay()]} ${clock}`;
    case 'month':
      return `${date.getMonth() + 1}/${date.getDate()} ${clock}`;
  }
}
