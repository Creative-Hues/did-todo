// アプリ起動時の処理
import { db } from './db/db';
import { deleteExpiredRecords } from './lib/retention';
import { requestPersistentStorage } from './lib/storage';

/** 永続ストレージの要求と、1年より古い記録の削除を行う */
export async function runStartup(now: Date): Promise<void> {
  await Promise.all([requestPersistentStorage(), deleteExpiredRecords(db, now)]);
}
