// 最初から入れておくデータ(SPEC.md 3.5)と、データベースの版を上げるときの変換。純粋関数。
import type { Alter, AlterCategory, ClinicNoteCategory } from '../lib/types';

/** 最初の区分(SPEC.md 10.2) */
const INITIAL_CATEGORY_NAMES = ['主人格', 'よく前に出る', '状況によって出る', '最近出現・詳細確認中'];

/** 最初の受診メモの分類(SPEC.md 8.1) */
const INITIAL_CLINIC_NOTE_CATEGORY_NAMES = ['体調', '薬', '睡眠', '気分', '人格のこと', '生活', 'その他'];

/** 名前の一覧から、並び順どおりの項目を作る */
function buildNamedItems(names: readonly string[], now: Date, newId: () => string) {
  return names.map((name, index) => ({ id: newId(), name, order: index, createdAt: now.toISOString() }));
}

export function buildInitialCategories(now: Date, newId: () => string): AlterCategory[] {
  return buildNamedItems(INITIAL_CATEGORY_NAMES, now, newId);
}

export function buildInitialClinicNoteCategories(now: Date, newId: () => string): ClinicNoteCategory[] {
  return buildNamedItems(INITIAL_CLINIC_NOTE_CATEGORY_NAMES, now, newId);
}

/** 版1の人格(基本情報の項目がない) */
export type AlterV1 = Omit<Alter, 'reading' | 'categoryId' | 'age' | 'gender' | 'identify'>;

/** 人格の基本情報の初期値(空欄・未分類) */
export const EMPTY_ALTER_PROFILE = {
  reading: '',
  categoryId: null,
  age: '',
  gender: '',
  identify: '',
} as const satisfies Pick<Alter, 'reading' | 'categoryId' | 'age' | 'gender' | 'identify'>;

/** 版1の人格に、基本情報の初期値を足す(今の項目はそのまま) */
export function upgradeAlterToV2(alter: AlterV1): Alter {
  return { ...EMPTY_ALTER_PROFILE, ...alter };
}
