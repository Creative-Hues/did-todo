// 最初から入れておくデータ(SPEC.md 3.5)と、データベースの版を上げるときの変換。純粋関数。
import type { Alter, AlterCategory, ClinicNoteCategory, ProfileSection } from '../lib/types';

/** 最初の区分(SPEC.md 10.2) */
const INITIAL_CATEGORY_NAMES = ['主人格', 'よく前に出る', '状況によって出る', '最近出現・詳細確認中'];

/** 最初の受診メモの分類(SPEC.md 8.1)。版2に上げたとき(すでに使っている人)に入れたもの */
const INITIAL_CLINIC_NOTE_CATEGORY_NAMES = ['体調', '薬', '睡眠', '気分', '人格のこと', '生活', 'その他'];

/**
 * 新しくインストールしたときの最初の受診メモの分類(SPEC.md 14章③)。
 * 分類の名前は利用者のデータとして保存され、呼び方に合わせて変わらないので、呼び方を使わない名前にする
 */
const NEW_INSTALL_CLINIC_NOTE_CATEGORY_NAMES = ['体調', '薬', '睡眠', '気分', '交代のこと', '生活', 'その他'];

/** 新しい人格に最初から入れるプロフィールの見出し(SPEC.md 10.4)。「経緯」だけ「自分たちだけ」 */
const DEFAULT_PROFILE_TITLES = ['機能・役割', '特徴', '記憶', '身体・感覚', '対応のお願い', '交代の傾向', '経緯', 'その他'];
const PRIVATE_DEFAULT_TITLES: readonly string[] = ['経緯'];

/** 「全体のこと」の最初の見出し(SPEC.md 10.5) */
const INITIAL_COMMON_TITLES = ['みんなに共通の配慮', '交代のときの様子', '誰が出ているかわからないとき'];

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

export function buildNewInstallClinicNoteCategories(now: Date, newId: () => string): ClinicNoteCategory[] {
  return buildNamedItems(NEW_INSTALL_CLINIC_NOTE_CATEGORY_NAMES, now, newId);
}

/** 見出しの一覧から、中身が空の見出しを並び順どおりに作る */
function buildSections(
  alterId: string | null,
  titles: readonly string[],
  now: Date,
  newId: () => string,
): ProfileSection[] {
  return titles.map((title, index) => ({
    id: newId(),
    alterId,
    title,
    body: '',
    includeInPdf: !PRIVATE_DEFAULT_TITLES.includes(title),
    order: index,
    createdAt: now.toISOString(),
  }));
}

/** 人格の基本の見出し(SPEC.md 10.4) */
export function buildDefaultProfileSections(alterId: string, now: Date, newId: () => string): ProfileSection[] {
  return buildSections(alterId, DEFAULT_PROFILE_TITLES, now, newId);
}

/** 「全体のこと」の最初の見出し(SPEC.md 10.5。すべて「PDFに入れる」) */
export function buildInitialCommonSections(now: Date, newId: () => string): ProfileSection[] {
  return buildSections(null, INITIAL_COMMON_TITLES, now, newId);
}

/**
 * 版5に上げるときに足す見出し(SPEC.md 3.5)。
 * 見出しが1つもない人格に基本の見出しを、「全体のこと」の見出しがなければ最初の見出しを作る
 */
export function buildMissingProfileSections(
  alters: readonly Pick<Alter, 'id'>[],
  sections: readonly Pick<ProfileSection, 'alterId'>[],
  now: Date,
  newId: () => string,
): ProfileSection[] {
  const owners = new Set(sections.map((section) => section.alterId));
  const forAlters = alters
    .filter((alter) => !owners.has(alter.id))
    .flatMap((alter) => buildDefaultProfileSections(alter.id, now, newId));
  const forCommon = owners.has(null) ? [] : buildInitialCommonSections(now, newId);
  return [...forCommon, ...forAlters];
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
