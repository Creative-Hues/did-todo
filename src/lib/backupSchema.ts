// バックアップの中身の形のチェック(SPEC.md 12章)。純粋関数。
// ライブラリを使わず、テーブルごとに「項目名 → チェック関数」の表で確かめる。
// 表は Record<keyof 型, …> なので、型に項目を足したら、ここも直さないとビルドが通らない。
import type {
  Alter,
  AlterCategory,
  BucketItem,
  ClinicNote,
  ClinicNoteCategory,
  CompletionRecord,
  Cycle,
  Medication,
  MedicationIntake,
  MedicationTiming,
  ProfileSection,
  StockLog,
  Task,
} from './types';

/** 1つの値をチェックする関数 */
type Check = (value: unknown) => boolean;

/** 型 T の全項目についてのチェック表 */
type Schema<T> = { [K in keyof T]-?: Check };

const isString: Check = (value) => typeof value === 'string';
const isNumber: Check = (value) => typeof value === 'number' && Number.isFinite(value);
const isBoolean: Check = (value) => typeof value === 'boolean';
const isNullableString: Check = (value) => value === null || typeof value === 'string';
const isStringArray: Check = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');

function oneOf(...allowed: readonly unknown[]): Check {
  return (value) => allowed.includes(value);
}

/** 項目がないことも許す(古い記録にない項目用) */
function optional(check: Check): Check {
  return (value) => value === undefined || check(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const TIMINGS: readonly MedicationTiming[] = ['morning', 'noon', 'evening', 'bedtime'];

const isCycle: Check = (value) => {
  if (!isRecord(value)) {
    return false;
  }
  const cycle = value as Partial<Cycle>;
  switch (cycle.type) {
    case 'daily':
    case 'weekly':
    case 'monthly':
      return true;
    case 'everyNDays':
      return Number.isSafeInteger(cycle.n) && (cycle.n ?? 0) >= 2;
    default:
      return false;
  }
};

const alterSchema: Schema<Alter> = {
  id: isString,
  name: isString,
  color: isString,
  hidden: isBoolean,
  order: isNumber,
  createdAt: isString,
  reading: isString,
  categoryId: isNullableString,
  age: isString,
  gender: isString,
  identify: isString,
};

const namedItemSchema: Schema<AlterCategory & ClinicNoteCategory> = {
  id: isString,
  name: isString,
  order: isNumber,
  createdAt: isString,
};

const taskSchema: Schema<Task> = {
  id: isString,
  name: isString,
  cycle: isCycle,
  careAlterIds: isStringArray,
  hidden: isBoolean,
  order: isNumber,
  createdAt: isString,
};

const recordSchema: Schema<CompletionRecord> = {
  id: isString,
  taskId: isString,
  alterId: isNullableString,
  completedAt: isString,
  careAlterIdsAtCompletion: optional(isStringArray),
};

const profileSectionSchema: Schema<ProfileSection> = {
  id: isString,
  alterId: isNullableString,
  title: isString,
  body: isString,
  includeInPdf: isBoolean,
  order: isNumber,
  createdAt: isString,
};

const medicationSchema: Schema<Medication> = {
  id: isString,
  name: isString,
  kind: oneOf('scheduled', 'asNeeded'),
  timings: (value) => Array.isArray(value) && value.every((item) => TIMINGS.includes(item)),
  dosePerTake: isNumber,
  remaining: isNumber,
  status: oneOf('active', 'stopped'),
  order: isNumber,
  createdAt: isString,
};

const medicationIntakeSchema: Schema<MedicationIntake> = {
  id: isString,
  medicationId: isString,
  alterId: isNullableString,
  takenAt: isString,
  timing: (value) => value === null || TIMINGS.includes(value as MedicationTiming),
  deducted: isNumber,
  reason: isString,
};

const stockLogSchema: Schema<StockLog> = {
  id: isString,
  medicationId: isString,
  kind: oneOf('initial', 'refill', 'recount'),
  amount: isNumber,
  at: isString,
};

const clinicNoteSchema: Schema<ClinicNote> = {
  id: isString,
  alterId: isNullableString,
  categoryId: isString,
  body: isString,
  createdAt: isString,
  discussedAt: isNullableString,
};

const bucketItemSchema: Schema<BucketItem> = {
  id: isString,
  alterId: isString,
  body: isString,
  order: isNumber,
  createdAt: isString,
  achievedAt: isNullableString,
  helperAlterIds: isStringArray,
};

/** バックアップに入れるデータ(端末の設定は入れない) */
export interface BackupData {
  alters: Alter[];
  categories: AlterCategory[];
  profileSections: ProfileSection[];
  tasks: Task[];
  records: CompletionRecord[];
  medications: Medication[];
  medicationIntakes: MedicationIntake[];
  stockLogs: StockLog[];
  clinicNotes: ClinicNote[];
  clinicNoteCategories: ClinicNoteCategory[];
  bucketItems: BucketItem[];
}

/** テーブルごとのチェック表と、エラー表示用の名前 */
const TABLES: { [K in keyof BackupData]: { label: string; schema: Schema<BackupData[K][number]> } } = {
  alters: { label: '人格', schema: alterSchema },
  categories: { label: '区分', schema: namedItemSchema },
  profileSections: { label: 'プロフィール', schema: profileSectionSchema },
  tasks: { label: 'タスク', schema: taskSchema },
  records: { label: '完了記録', schema: recordSchema },
  medications: { label: '薬', schema: medicationSchema },
  medicationIntakes: { label: '服薬記録', schema: medicationIntakeSchema },
  stockLogs: { label: '在庫の履歴', schema: stockLogSchema },
  clinicNotes: { label: '受診メモ', schema: clinicNoteSchema },
  clinicNoteCategories: { label: '受診メモの分類', schema: namedItemSchema },
  bucketItems: { label: 'バケット', schema: bucketItemSchema },
};

/** バックアップに入れるテーブルの名前(並び順は書き出しの順) */
export const BACKUP_TABLE_NAMES = Object.keys(TABLES) as (keyof BackupData)[];

/**
 * 1件分をチェックし、決まった項目だけを取り出す(知らない項目は捨てる)。
 * 形が正しくなければ null。
 */
function pickValid<T>(value: unknown, schema: Schema<T>): T | null {
  if (!isRecord(value)) {
    return null;
  }
  const picked: Record<string, unknown> = {};
  for (const [key, check] of Object.entries(schema) as [string, Check][]) {
    if (!check(value[key])) {
      return null;
    }
    // 値がない任意の項目は、項目ごと入れない
    if (value[key] !== undefined) {
      picked[key] = value[key];
    }
  }
  return picked as T;
}

/** 1つのテーブル分をチェックする。だめなときは理由の文字列を返す */
function parseTable<K extends keyof BackupData>(name: K, rows: unknown): BackupData[K] | string {
  const { label, schema } = TABLES[name];
  if (!Array.isArray(rows)) {
    return `「${label}」のデータがありません`;
  }
  const result: BackupData[K][number][] = [];
  const ids = new Set<string>();
  for (const [index, row] of rows.entries()) {
    const item = pickValid(row, schema);
    if (item === null) {
      return `「${label}」の${index + 1}件目の形が正しくありません`;
    }
    if (ids.has(item.id)) {
      return `「${label}」に同じIDのデータが2つあります`;
    }
    ids.add(item.id);
    result.push(item);
  }
  return result as BackupData[K];
}

/** データ部分全体をチェックする。だめなときは理由の文字列を返す */
export function parseBackupData(value: unknown): BackupData | string {
  if (!isRecord(value)) {
    return 'データがありません';
  }
  const data: Partial<Record<keyof BackupData, unknown>> = {};
  for (const name of BACKUP_TABLE_NAMES) {
    const parsed = parseTable(name, value[name]);
    if (typeof parsed === 'string') {
      return parsed;
    }
    data[name] = parsed;
  }
  return data as BackupData;
}
