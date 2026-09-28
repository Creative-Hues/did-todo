// 記録の保持期間(SPEC.md 3.3・3.4・7.2・7.6)。
// 完了記録・服薬記録・在庫の履歴は1年間保持し、それより古いものを削除する。
import type { AppDatabase } from '../db/db';

/**
 * 保持期間の境界を求める(ちょうど1年前の同時刻)。
 * この時刻より前の記録が削除対象。境界ちょうどの記録は残す。
 */
export function getRetentionCutoff(now: Date): Date {
  const cutoff = new Date(now.getTime());
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return cutoff;
}

/**
 * 1年より古い完了記録・服薬記録・在庫の履歴を削除し、削除した件数の合計を返す。
 * 日時は toISOString() 形式なので、文字列の大小比較で時刻の前後を判定できる。
 */
export async function deleteExpiredRecords(database: AppDatabase, now: Date): Promise<number> {
  const cutoffIso = getRetentionCutoff(now).toISOString();
  const counts = await Promise.all([
    database.records.where('completedAt').below(cutoffIso).delete(),
    database.medicationIntakes.where('takenAt').below(cutoffIso).delete(),
    database.stockLogs.where('at').below(cutoffIso).delete(),
  ]);
  return counts.reduce((sum, count) => sum + count, 0);
}
