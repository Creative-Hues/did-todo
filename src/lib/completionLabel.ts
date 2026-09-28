// 完了の表示内容「人格A・9:12」を作る(SPEC.md 6.1、6.3)。純粋関数。
import type { SectionKey } from './home';
import { formatCompletionTime } from './timeFormat';
import type { Alter, CompletionRecord } from './types';

/** 人格が「わからない」ときの表示名 */
export const UNKNOWN_ALTER_NAME = 'わからない';

export interface CompletionLabel {
  /** やった人格の名前(「わからない」を含む) */
  name: string;
  /** 人格の色。「わからない」のときは null */
  color: string | null;
  /** 欄に合わせた時刻(例:「水 9:12」) */
  time: string;
}

/**
 * 記録した人格の名前と色。非表示の人格も名前と色で表示する(SPEC.md 3.1)。
 * 人格が見つからないときは「わからない」として扱う。
 */
export function resolveRecordAlter(
  record: CompletionRecord,
  alterById: ReadonlyMap<string, Alter>,
): Pick<CompletionLabel, 'name' | 'color'> {
  const alter = record.alterId === null ? undefined : alterById.get(record.alterId);
  return { name: alter?.name ?? UNKNOWN_ALTER_NAME, color: alter?.color ?? null };
}

/** 完了記録から表示内容を作る */
export function toCompletionLabel(
  record: CompletionRecord,
  section: SectionKey,
  alterById: ReadonlyMap<string, Alter>,
): CompletionLabel {
  return { ...resolveRecordAlter(record, alterById), time: formatCompletionTime(record.completedAt, section) };
}

/** 「人格A・9:12」形式の文字列 */
export function completionLabelText(label: CompletionLabel): string {
  return `${label.name}・${label.time}`;
}
