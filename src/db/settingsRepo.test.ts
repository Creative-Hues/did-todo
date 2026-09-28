// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import { readAllData, replaceAllData } from './backupRepo';
import { getShowStats, setShowStats } from './settingsRepo';
import { buildBackup, serializeBackup } from '../lib/backup';

describe('集計の表示の設定', () => {
  let database: AppDatabase;
  const now = new Date(2026, 8, 28, 21, 30);

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-settings');
  });

  afterEach(async () => {
    await database.delete();
  });

  it('最初はオフ', async () => {
    expect(await getShowStats(database)).toBe(false);
  });

  it('オンにしたら、開き直してもオンのまま。オフにも戻せる', async () => {
    await setShowStats(database, true);
    const reopened = new AppDatabase('did-todo-test-settings');
    expect(await getShowStats(reopened)).toBe(true);
    reopened.close();

    await setShowStats(database, false);
    expect(await getShowStats(database)).toBe(false);
  });

  it('バックアップの書き出しに入らず、読み込んでも変わらない', async () => {
    await setShowStats(database, true);
    const data = await readAllData(database);
    expect(serializeBackup(buildBackup(data, now))).not.toContain('showStats');

    await replaceAllData(database, data);
    expect(await getShowStats(database)).toBe(true);
  });
});
