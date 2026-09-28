// 完了記録の追加・取り消し(SPEC.md 4.4、6.2、6.3)
import type { AppDatabase } from './db';
import { getCurrentPeriodRecords, getTaskStatus } from '../lib/status';
import type { CompletionRecord, Task } from '../lib/types';

/**
 * 完了を記録する。同じ期間に完了済みなら記録せず null を返す(1期間に1回)。
 * @param alterId やった人格のID。「わからない」は null
 * @param now 現在時刻(記録する時刻)
 */
export async function addRecord(
  database: AppDatabase,
  task: Task,
  alterId: string | null,
  now: Date,
): Promise<CompletionRecord | null> {
  return database.transaction('rw', database.records, async () => {
    const records = await database.records.where('taskId').equals(task.id).toArray();
    if (getTaskStatus(task.cycle, records, now).status === 'done') {
      return null;
    }
    const record: CompletionRecord = {
      id: crypto.randomUUID(),
      taskId: task.id,
      alterId,
      completedAt: now.toISOString(),
    };
    await database.records.add(record);
    return record;
  });
}

/** 今の期間の記録をすべて削除し、未完了に戻す。削除した件数を返す */
export async function undoCurrentRecord(database: AppDatabase, task: Task, now: Date): Promise<number> {
  return database.transaction('rw', database.records, async () => {
    const records = await database.records.where('taskId').equals(task.id).toArray();
    const targets = getCurrentPeriodRecords(task.cycle, records, now);
    await database.records.bulkDelete(targets.map((r) => r.id));
    return targets.length;
  });
}
