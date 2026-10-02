// 交代のきっかけ・交代の記録の保存(SPEC.md 17.2・17.3)
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import { addSwitchLog, deleteSwitchLog, updateSwitchLog } from './switchLogRepo';
import {
  addSwitchTag,
  countSwitchTagUsage,
  deleteSwitchTag,
  renameSwitchTag,
  reorderSwitchTags,
  setSwitchTagHidden,
} from './switchTagRepo';

describe('交代のきっかけと記録', () => {
  let database: AppDatabase;
  const now = new Date(2026, 9, 2, 21, 0);

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-switch');
  });

  afterEach(async () => {
    await database.delete();
  });

  it('新しく入れたときは、最初のきっかけが6つある', async () => {
    expect((await database.switchTags.orderBy('order').toArray()).map((t) => t.name)).toEqual([
      '音',
      'におい',
      '人との会話',
      '疲れ',
      '体調',
      '夢',
    ]);
  });

  it('きっかけを最後に追加でき、同じ名前(非表示のものも含む)は保存できない', async () => {
    const added = await addSwitchTag(database, '人混み', now);
    expect(added.ok && added.tag.order).toBe(6);
    if (!added.ok) {
      return;
    }
    await setSwitchTagHidden(database, added.tag.id, true);
    expect(await addSwitchTag(database, '人混み', now)).toEqual({ ok: false, reason: 'duplicateName' });
    expect(await renameSwitchTag(database, 'switch-tag-sound', '人混み')).toEqual({
      ok: false,
      reason: 'duplicateName',
    });
    // 自分と同じ名前のままの保存はできる
    expect((await renameSwitchTag(database, added.tag.id, '人混み'))?.ok).toBe(true);
  });

  it('並べ替えた順番で保存される', async () => {
    await reorderSwitchTags(database, ['switch-tag-dream', 'switch-tag-sound']);
    const ordered = (await database.switchTags.orderBy('order').toArray()).map((t) => t.id);
    expect(ordered.indexOf('switch-tag-dream')).toBeLessThan(ordered.indexOf('switch-tag-sound'));
  });

  it('使っている記録があるきっかけは削除できず、記録を消せば削除できる', async () => {
    const log = await addSwitchLog(
      database,
      { alterId: null, switchedAt: null, tagIds: ['switch-tag-sound', 'switch-tag-sound'] },
      now,
    );
    // 同じきっかけは1つにまとめて保存する
    expect(log.tagIds).toEqual(['switch-tag-sound']);
    expect(await countSwitchTagUsage(database, 'switch-tag-sound')).toBe(1);
    expect(await deleteSwitchTag(database, 'switch-tag-sound')).toBe(false);
    expect(await database.switchTags.get('switch-tag-sound')).toBeDefined();

    await deleteSwitchLog(database, log.id);
    expect(await deleteSwitchTag(database, 'switch-tag-sound')).toBe(true);
    expect(await database.switchTags.get('switch-tag-sound')).toBeUndefined();
  });

  it('記録を直しても、気づいた時刻は変わらない', async () => {
    const log = await addSwitchLog(database, { alterId: 'alter-a', switchedAt: now.toISOString(), tagIds: [] }, now);
    await updateSwitchLog(database, log.id, { alterId: null, switchedAt: null, tagIds: ['switch-tag-dream'] });
    expect(await database.switchLogs.get(log.id)).toEqual({
      id: log.id,
      alterId: null,
      noticedAt: now.toISOString(),
      switchedAt: null,
      tagIds: ['switch-tag-dream'],
    });
  });
});
