import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT_VERSION,
  backupFileName,
  backupReminderText,
  buildBackup,
  isBackupOverdue,
  parseBackup,
  serializeBackup,
  type BackupData,
} from './backup';

function emptyData(): BackupData {
  return {
    alters: [],
    categories: [],
    profileSections: [],
    tasks: [],
    records: [],
    medications: [],
    medicationIntakes: [],
    stockLogs: [],
    clinicNotes: [],
    clinicNoteCategories: [],
    bucketItems: [],
  };
}

const now = new Date(2026, 8, 28, 21, 30);

/** 書き出した JSON を、手で書き換えられるオブジェクトに戻す */
function exportedJson(data: BackupData = emptyData()): Record<string, unknown> {
  return JSON.parse(serializeBackup(buildBackup(data, now))) as Record<string, unknown>;
}

describe('バックアップのファイル名', () => {
  it('実際の日付を使う(朝5時前でも前日にしない)', () => {
    expect(backupFileName(new Date(2026, 8, 28, 4, 59))).toBe('minna-todo-backup-2026-09-28.json');
    expect(backupFileName(new Date(2026, 0, 5, 12, 0))).toBe('minna-todo-backup-2026-01-05.json');
  });
});

describe('バックアップの読み取り', () => {
  it('書き出したものは、そのまま読み取れる', () => {
    const data = emptyData();
    data.alters.push({
      id: 'alter-a',
      name: '人格A',
      color: '#4a90d9',
      hidden: false,
      order: 0,
      createdAt: '2026-09-01T00:00:00.000Z',
      reading: 'じんかくえー',
      categoryId: null,
      age: '',
      gender: '',
      identify: '',
    });
    data.tasks.push({
      id: 'task-1',
      name: '植物に水やり',
      cycle: { type: 'everyNDays', n: 3 },
      careAlterIds: ['alter-a'],
      hidden: false,
      order: 0,
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    // careAlterIdsAtCompletion がある記録とない記録
    data.records.push(
      { id: 'r1', taskId: 'task-1', alterId: 'alter-a', completedAt: '2026-09-20T01:00:00.000Z' },
      {
        id: 'r2',
        taskId: 'task-1',
        alterId: null,
        completedAt: '2026-09-23T01:00:00.000Z',
        careAlterIdsAtCompletion: ['alter-a'],
      },
    );
    const result = parseBackup(serializeBackup(buildBackup(data, now)));
    expect(result).toEqual({
      ok: true,
      backup: { app: 'minna-todo', formatVersion: BACKUP_FORMAT_VERSION, exportedAt: now.toISOString(), data },
    });
  });

  it('JSON でないファイルは読み込まない', () => {
    expect(parseBackup('こんにちは')).toMatchObject({ ok: false });
  });

  it('ほかのアプリのファイルは読み込まない', () => {
    const json = exportedJson();
    json.app = 'other-app';
    expect(parseBackup(JSON.stringify(json))).toEqual({
      ok: false,
      reason: 'このアプリのバックアップファイルではありません',
    });
  });

  it('版番号が合わないファイルは読み込まない', () => {
    const json = exportedJson();
    json.formatVersion = BACKUP_FORMAT_VERSION + 1;
    expect(parseBackup(JSON.stringify(json))).toMatchObject({ ok: false });
  });

  it('テーブルが欠けているファイルは読み込まない', () => {
    const json = exportedJson();
    delete (json.data as Record<string, unknown>).medications;
    expect(parseBackup(JSON.stringify(json))).toEqual({ ok: false, reason: '「薬」のデータがありません' });
  });

  it('項目の形が違うデータがあれば読み込まない', () => {
    const json = exportedJson();
    (json.data as Record<string, unknown>).tasks = [
      { id: 't', name: '掃除', cycle: { type: 'everyNDays', n: 1 }, careAlterIds: [], hidden: false, order: 0, createdAt: '' },
    ];
    expect(parseBackup(JSON.stringify(json))).toEqual({
      ok: false,
      reason: '「タスク」の1件目の形が正しくありません',
    });
  });

  it('同じIDのデータが2つあれば読み込まない', () => {
    const json = exportedJson();
    const category = { id: 'c', name: '主人格', order: 0, createdAt: '' };
    (json.data as Record<string, unknown>).categories = [category, category];
    expect(parseBackup(JSON.stringify(json))).toMatchObject({ ok: false });
  });

  it('知らない項目は取り除いて読み込む', () => {
    const json = exportedJson();
    (json.data as Record<string, unknown>).categories = [{ id: 'c', name: '主人格', order: 0, createdAt: '', extra: 1 }];
    const result = parseBackup(JSON.stringify(json));
    expect(result.ok && result.backup.data.categories).toEqual([{ id: 'c', name: '主人格', order: 0, createdAt: '' }]);
  });
});

describe('書き出しのすすめ', () => {
  it('一度も書き出していなければすすめる', () => {
    expect(isBackupOverdue(null, now)).toBe(true);
    expect(backupReminderText(null, now)).toContain('まだバックアップを書き出していません');
  });

  it('30日目(論理日)からすすめる', () => {
    const last = new Date(2026, 7, 29, 21, 0).toISOString(); // 8/29
    expect(isBackupOverdue(last, new Date(2026, 8, 28, 4, 59))).toBe(false); // 論理日は 9/27 → 29日
    expect(isBackupOverdue(last, new Date(2026, 8, 28, 5, 0))).toBe(true); // 9/28 → 30日
    expect(backupReminderText(last, new Date(2026, 8, 28, 5, 0))).toContain('30日以上');
    expect(backupReminderText(last, new Date(2026, 8, 28, 4, 59))).toBeNull();
  });
});
