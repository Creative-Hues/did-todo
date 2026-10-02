// 端末の設定の読み書き。バックアップには含めない(SPEC.md 12章。呼び方だけはバックアップに入れる)
import type { AppDatabase } from './db';
import { DEFAULT_TERM, normalizeTerm } from '../lib/term';

/** 人格ごとのページに集計を表示するか(SPEC.md 11章)。設定がないときはオフ */
export async function getShowStats(database: AppDatabase): Promise<boolean> {
  return (await database.meta.get('showStats'))?.value === 'on';
}

/** 「人格」の呼び方(SPEC.md 14章③)。設定がない・正しくないときは「人格」 */
export async function getAltersTerm(database: AppDatabase): Promise<string> {
  const saved = (await database.meta.get('altersTerm'))?.value;
  return saved === undefined ? DEFAULT_TERM : (normalizeTerm(saved) ?? DEFAULT_TERM);
}

/** 呼び方を保存する(normalizeTerm 済みの値を渡す) */
export async function setAltersTerm(database: AppDatabase, term: string): Promise<void> {
  await database.meta.put({ key: 'altersTerm', value: term });
}

export async function setShowStats(database: AppDatabase, show: boolean): Promise<void> {
  await database.meta.put({ key: 'showStats', value: show ? 'on' : 'off' });
}
