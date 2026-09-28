// 端末の設定の読み書き。バックアップには含めない(SPEC.md 12章)
import type { AppDatabase } from './db';

/** 人格ごとのページに集計を表示するか(SPEC.md 11章)。設定がないときはオフ */
export async function getShowStats(database: AppDatabase): Promise<boolean> {
  return (await database.meta.get('showStats'))?.value === 'on';
}

export async function setShowStats(database: AppDatabase, show: boolean): Promise<void> {
  await database.meta.put({ key: 'showStats', value: show ? 'on' : 'off' });
}
