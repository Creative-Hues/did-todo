// テスト用の疑似データベース(fake-indexeddb)を使う
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppDatabase } from './db';
import { addAlter, setAlterHidden } from './alterRepo';
import { addRecord } from './recordRepo';
import { addTask, deleteTask, reorderTasks, setTaskHidden, updateTask } from './taskRepo';
import { mergeCareAlterIds } from '../lib/careAlters';

describe('タスクの保存', () => {
  let database: AppDatabase;
  const now = new Date(2026, 8, 25, 10, 0);

  beforeEach(() => {
    database = new AppDatabase('did-todo-test-tasks');
  });

  afterEach(async () => {
    await database.delete();
  });

  it('追加したタスクが保存される', async () => {
    const task = await addTask(
      database,
      { name: '植物に水やり', cycle: { type: 'everyNDays', n: 3 }, careAlterIds: ['x'] },
      now,
    );

    // 別の接続で開き直しても残っている(再起動の代わり)
    const reopened = new AppDatabase('did-todo-test-tasks');
    const saved = await reopened.tasks.get(task.id);
    reopened.close();
    expect(saved).toEqual({
      id: task.id,
      name: '植物に水やり',
      cycle: { type: 'everyNDays', n: 3 },
      careAlterIds: ['x'],
      hidden: false,
      order: 0,
      createdAt: now.toISOString(),
    });
  });

  it('すべての項目を変更できる', async () => {
    const task = await addTask(database, { name: '掃除', cycle: { type: 'daily' }, careAlterIds: [] }, now);
    await updateTask(database, task.id, { name: '風呂掃除', cycle: { type: 'weekly' }, careAlterIds: ['a'] });
    const saved = await database.tasks.get(task.id);
    expect(saved?.name).toBe('風呂掃除');
    expect(saved?.cycle).toEqual({ type: 'weekly' });
    expect(saved?.careAlterIds).toEqual(['a']);
  });

  it('非表示にしても削除されず、再表示できる', async () => {
    const task = await addTask(database, { name: '掃除', cycle: { type: 'monthly' }, careAlterIds: [] }, now);
    await setTaskHidden(database, task.id, true);
    expect((await database.tasks.get(task.id))?.hidden).toBe(true);
    await setTaskHidden(database, task.id, false);
    expect((await database.tasks.get(task.id))?.hidden).toBe(false);
  });

  it('並べ替えても、対象でないタスクの順番は変わらない', async () => {
    const a = await addTask(database, { name: 'A', cycle: { type: 'daily' }, careAlterIds: [] }, now);
    const h = await addTask(database, { name: 'H', cycle: { type: 'daily' }, careAlterIds: [] }, now);
    const b = await addTask(database, { name: 'B', cycle: { type: 'daily' }, careAlterIds: [] }, now);
    await setTaskHidden(database, h.id, true);
    // 表示中の A・B だけを入れ替える
    await reorderTasks(database, [b.id, a.id]);
    expect((await database.tasks.get(b.id))?.order).toBe(0);
    expect((await database.tasks.get(h.id))?.order).toBe(1);
    expect((await database.tasks.get(a.id))?.order).toBe(2);
  });

  it('削除するとタスクは消えるが、完了記録は残る', async () => {
    const task = await addTask(database, { name: '掃除', cycle: { type: 'daily' }, careAlterIds: [] }, now);
    const other = await addTask(database, { name: '洗濯', cycle: { type: 'daily' }, careAlterIds: [] }, now);
    await addRecord(database, task, 'x', now);
    await addRecord(database, other, 'x', now);

    await deleteTask(database, task.id);
    expect(await database.tasks.get(task.id)).toBeUndefined();
    expect(await database.tasks.get(other.id)).toBeDefined();
    expect(await database.records.where('taskId').equals(task.id).count()).toBe(1);
  });

  it('編集して保存しても、非表示の人格は気にしている人格に残る', async () => {
    const visible = await addAlter(database, { name: '人格A', color: '#4a90d9' }, now);
    const hiddenAlter = await addAlter(database, { name: '人格B', color: '#d94a4a' }, now);
    const task = await addTask(
      database,
      { name: '掃除', cycle: { type: 'daily' }, careAlterIds: [visible.id, hiddenAlter.id] },
      now,
    );
    await setAlterHidden(database, hiddenAlter.id, true);

    // 画面では表示中の人格だけが選べる。人格Aのチェックを外して保存した場合
    const careAlterIds = mergeCareAlterIds(task.careAlterIds, [], [visible.id]);
    await updateTask(database, task.id, { name: '掃除', cycle: { type: 'daily' }, careAlterIds });
    expect((await database.tasks.get(task.id))?.careAlterIds).toEqual([hiddenAlter.id]);
  });
});
