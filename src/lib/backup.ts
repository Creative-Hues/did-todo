// バックアップの書き出し・読み込みの中身づくり(SPEC.md 12章)。純粋関数。
import { parseBackupData, type BackupData } from './backupSchema';
import { diffLogicalDays, toCalendarDate, toLogicalDate } from './period';

export type { BackupData } from './backupSchema';

/**
 * このアプリのバックアップであることを示す印(ファイル名にも使う)。
 * アプリの名前は「ひとつやね」に変わったが、今までのバックアップを読み込めるよう、以前の名前のまま変えない(SPEC.md 12章)
 */
const APP_ID = 'minna-todo';

/**
 * データの形の版番号。データの形を変えたら上げる。
 * 版番号が違うファイルは読み込まない(SPEC.md 12章)
 */
export const BACKUP_FORMAT_VERSION = 1;

/** 書き出しをすすめるまでの日数 */
export const BACKUP_REMIND_DAYS = 30;

/** バックアップファイルの中身 */
export interface BackupFile {
  app: typeof APP_ID;
  formatVersion: number;
  /** 書き出した日時(ISO形式) */
  exportedAt: string;
  data: BackupData;
}

export function buildBackup(data: BackupData, now: Date): BackupFile {
  return { app: APP_ID, formatVersion: BACKUP_FORMAT_VERSION, exportedAt: now.toISOString(), data };
}

/** バックアップを JSON の文字列にする */
export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

/** ファイル名(例:minna-todo-backup-2026-09-28.json)。日付は実際の日付 */
export function backupFileName(now: Date): string {
  return `${APP_ID}-backup-${toCalendarDate(now)}.json`;
}

export type ParseBackupResult = { ok: true; backup: BackupFile } | { ok: false; reason: string };

/** ファイルの中身(文字列)を読み取り、形と版番号を確かめる */
export function parseBackup(text: string): ParseBackupResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'ファイルを読み取れません(JSON の形ではありません)' };
  }
  if (typeof json !== 'object' || json === null || (json as { app?: unknown }).app !== APP_ID) {
    return { ok: false, reason: 'このアプリのバックアップファイルではありません' };
  }
  const { formatVersion, exportedAt, data } = json as Record<string, unknown>;
  if (formatVersion !== BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      reason: `バックアップの版が合いません(ファイル:版${String(formatVersion)}、このアプリ:版${BACKUP_FORMAT_VERSION})`,
    };
  }
  if (typeof exportedAt !== 'string' || Number.isNaN(Date.parse(exportedAt))) {
    return { ok: false, reason: '書き出した日時が正しくありません' };
  }
  const parsed = parseBackupData(data, exportedAt);
  if (typeof parsed === 'string') {
    return { ok: false, reason: parsed };
  }
  return { ok: true, backup: { app: APP_ID, formatVersion, exportedAt, data: parsed } };
}

/**
 * 書き出しをすすめるか。一度も書き出していないか、最後の書き出しから30日以上たっていれば true。
 * 日数は論理日で数える。
 */
export function isBackupOverdue(lastExportedAt: string | null, now: Date): boolean {
  if (lastExportedAt === null) {
    return true;
  }
  return diffLogicalDays(toLogicalDate(new Date(lastExportedAt)), toLogicalDate(now)) >= BACKUP_REMIND_DAYS;
}

/** 書き出しをすすめる文言。すすめる必要がなければ null */
export function backupReminderText(lastExportedAt: string | null, now: Date): string | null {
  if (!isBackupOverdue(lastExportedAt, now)) {
    return null;
  }
  return lastExportedAt === null
    ? 'まだバックアップを書き出していません。書き出しておくと安心です。'
    : `${BACKUP_REMIND_DAYS}日以上バックアップを書き出していません。書き出しておくと安心です。`;
}
