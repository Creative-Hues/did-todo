// データベースの定義(Dexie = IndexedDB を使いやすくするライブラリ)
import { Dexie, type EntityTable } from 'dexie';
import type { Alter, CompletionRecord, Task } from '../lib/types';

export class AppDatabase extends Dexie {
  alters!: EntityTable<Alter, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  records!: EntityTable<CompletionRecord, 'id'>;

  constructor(name = 'did-todo') {
    super(name);
    // 最初の項目が主キー、以降は検索に使う項目(インデックス)
    this.version(1).stores({
      alters: 'id, order',
      tasks: 'id, order',
      records: 'id, taskId, completedAt, [taskId+completedAt]',
    });
  }
}

/** アプリ全体で使うデータベース */
export const db = new AppDatabase();
