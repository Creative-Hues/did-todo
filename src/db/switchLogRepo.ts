// 交代の記録の保存・更新・削除(SPEC.md 17.1・17.3・17.4)
import type { AppDatabase } from './db';
import type { SwitchLog } from '../lib/types';

/** 記録の入力内容(交代した時刻は resolveSwitchedAt で決めたもの) */
export interface SwitchLogInput {
  alterId: string | null;
  switchedAt: string | null;
  tagIds: string[];
}

/**
 * 交代の記録を足して、足した記録を返す
 * @param noticedAt 気づいた時刻(「変わったことに気づいた」ボタンを押した時刻)
 */
export async function addSwitchLog(database: AppDatabase, input: SwitchLogInput, noticedAt: Date): Promise<SwitchLog> {
  const log: SwitchLog = {
    id: crypto.randomUUID(),
    alterId: input.alterId,
    noticedAt: noticedAt.toISOString(),
    switchedAt: input.switchedAt,
    tagIds: [...new Set(input.tagIds)],
  };
  await database.switchLogs.add(log);
  return log;
}

/** 人格・交代した時刻・きっかけを直す(気づいた時刻は変えない) */
export async function updateSwitchLog(database: AppDatabase, id: string, input: SwitchLogInput): Promise<void> {
  await database.switchLogs.update(id, {
    alterId: input.alterId,
    switchedAt: input.switchedAt,
    tagIds: [...new Set(input.tagIds)],
  });
}

export async function deleteSwitchLog(database: AppDatabase, id: string): Promise<void> {
  await database.switchLogs.delete(id);
}
