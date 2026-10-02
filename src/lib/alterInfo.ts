// 人格情報タブ(SPEC.md 10章)。すべて純粋関数(同じ入力なら同じ結果)。
import type { FormResult } from './clinicNotes';
import { formatCalendarDateSlash } from './timeFormat';
import type { Alter, AlterCategory, ProfileSection } from './types';
import { normalizeName } from './validation';
import { DEFAULT_TERM, withTerm } from './term';

/** 区分を選んでいない人格(区分が見つからない人格も)をまとめる見出し */
export const UNCATEGORIZED_NAME = '未分類';

function byOrder(a: { order: number }, b: { order: number }): number {
  return a.order - b.order;
}

/** 区分ごとのまとまり。categoryId が null なら「未分類」 */
export interface AlterGroup {
  categoryId: string | null;
  name: string;
  alters: Alter[];
}

/**
 * 表示中の人格を区分ごとにまとめる(SPEC.md 10.1)。
 * 区分の並び順 → 人格の並び順。「未分類」は区分の最後。人格が1人もいない区分は出さない。
 * 非表示の人格は区分ごとに分けず、並び順で hidden に入れる
 */
export function groupAltersByCategory(
  alters: readonly Alter[],
  categories: readonly AlterCategory[],
): { groups: AlterGroup[]; hidden: Alter[] } {
  const knownIds = new Set(categories.map((category) => category.id));
  const visible = alters.filter((alter) => !alter.hidden).sort(byOrder);
  const hidden = alters.filter((alter) => alter.hidden).sort(byOrder);
  const categoryIdOf = (alter: Alter) =>
    alter.categoryId !== null && knownIds.has(alter.categoryId) ? alter.categoryId : null;

  const groups: AlterGroup[] = [...categories].sort(byOrder).map((category) => ({
    categoryId: category.id,
    name: category.name,
    alters: visible.filter((alter) => categoryIdOf(alter) === category.id),
  }));
  groups.push({
    categoryId: null,
    name: UNCATEGORIZED_NAME,
    alters: visible.filter((alter) => categoryIdOf(alter) === null),
  });
  return { groups: groups.filter((group) => group.alters.length > 0), hidden };
}

/** 人格の区分の名前。選んでいない・見つからないときは null */
function findCategoryName(alter: Alter, categories: readonly AlterCategory[]): string | null {
  return categories.find((category) => category.id === alter.categoryId)?.name ?? null;
}

/** 画面に出す区分の名前(選んでいない・見つからないときは「未分類」) */
export function categoryLabel(alter: Alter, categories: readonly AlterCategory[]): string {
  return findCategoryName(alter, categories) ?? UNCATEGORIZED_NAME;
}

/** 基本情報の1項目 */
export interface InfoItem {
  label: string;
  value: string;
}

/**
 * 基本情報の項目(SPEC.md 10.3)。読み/区分/体感年齢/性別(感)/見分け方の順。
 * 画面ではすべての項目を出す(空欄は空のまま。区分がないときは「未分類」)
 */
export function basicInfoItems(alter: Alter, categories: readonly AlterCategory[]): InfoItem[] {
  return [
    { label: '読み', value: alter.reading },
    { label: '区分', value: categoryLabel(alter, categories) },
    { label: '体感年齢', value: alter.age },
    { label: '性別(感)', value: alter.gender },
    { label: '見分け方', value: alter.identify },
  ];
}

/** PDF に出す基本情報(空の項目と、区分を選んでいないときの区分は出さない。SPEC.md 10.7) */
export function printableBasicInfoItems(alter: Alter, categories: readonly AlterCategory[]): InfoItem[] {
  const categoryName = findCategoryName(alter, categories);
  return basicInfoItems(alter, categories)
    .map((item) => (item.label === '区分' ? { ...item, value: categoryName ?? '' } : item))
    .filter((item) => item.value.trim() !== '');
}

/** 早見表の1行(SPEC.md 10.6) */
export interface QuickTableRow {
  alterId: string;
  name: string;
  color: string;
  category: string;
  age: string;
  gender: string;
  identify: string;
}

/** 早見表の行。表示中の人格だけを、区分の並び順 → 人格の並び順で(未分類は最後) */
export function buildQuickTableRows(alters: readonly Alter[], categories: readonly AlterCategory[]): QuickTableRow[] {
  return groupAltersByCategory(alters, categories).groups.flatMap((group) =>
    group.alters.map((alter) => ({
      alterId: alter.id,
      name: alter.name,
      color: alter.color,
      // 早見表では「未分類」も書く(区分の列が空だと、書き忘れと区別できないため)
      category: group.name,
      age: alter.age,
      gender: alter.gender,
      identify: alter.identify,
    })),
  );
}

/** その人格(null なら「全体のこと」)の見出しを、並び順で返す */
export function sectionsOf(sections: readonly ProfileSection[], alterId: string | null): ProfileSection[] {
  return sections.filter((section) => section.alterId === alterId).sort(byOrder);
}

/** PDF に出す見出し(「自分たちだけ」と、中身が空の見出しを除く。SPEC.md 10.4・10.7) */
export function printableSections(sections: readonly ProfileSection[], alterId: string | null): ProfileSection[] {
  return sectionsOf(sections, alterId).filter((section) => section.includeInPdf && section.body.trim() !== '');
}

/** PDF の人格1人分のページ */
export interface PrintAlterPage {
  alterId: string;
  name: string;
  basicInfo: InfoItem[];
  sections: { title: string; body: string }[];
}

/** PDF(印刷)の中身。表題・作成日のあとに、ある部分だけを順に出す(SPEC.md 10.7) */
export interface PrintContent {
  title: string;
  /** 作成日(実際の日付。例:2026/9/28) */
  dateText: string;
  /** 全体のこと(全員分のときだけ) */
  common: { title: string; body: string }[] | null;
  /** 早見表(全員分・早見表だけのとき) */
  quickTable: QuickTableRow[] | null;
  alterPages: PrintAlterPage[];
}

function toPrintSection(section: ProfileSection): { title: string; body: string } {
  return { title: section.title, body: section.body };
}

function buildAlterPage(
  alter: Alter,
  categories: readonly AlterCategory[],
  sections: readonly ProfileSection[],
): PrintAlterPage {
  return {
    alterId: alter.id,
    name: alter.name,
    basicInfo: printableBasicInfoItems(alter, categories),
    sections: printableSections(sections, alter.id).map(toPrintSection),
  };
}

/**
 * 全員分の PDF(SPEC.md 10.7)。
 * 表題「人格について」・作成日 → 全体のこと → 早見表 → 人格ごとのページ(区分の並び順 → 人格の並び順)。
 * 非表示の人格は入れない
 */
export function buildAllPrint(
  alters: readonly Alter[],
  categories: readonly AlterCategory[],
  sections: readonly ProfileSection[],
  now: Date,
  /** 「人格」の呼び方(SPEC.md 14章③) */
  term: string = DEFAULT_TERM,
): PrintContent {
  const ordered = groupAltersByCategory(alters, categories).groups.flatMap((group) => group.alters);
  return {
    title: withTerm('人格について', term),
    dateText: formatCalendarDateSlash(now),
    common: printableSections(sections, null).map(toPrintSection),
    quickTable: buildQuickTableRows(alters, categories),
    alterPages: ordered.map((alter) => buildAlterPage(alter, categories, sections)),
  };
}

/** 1人分の PDF(表題はその人格の名前。非表示の人格でも出せる。SPEC.md 10.7) */
export function buildAlterPrint(
  alter: Alter,
  categories: readonly AlterCategory[],
  sections: readonly ProfileSection[],
  now: Date,
): PrintContent {
  return {
    title: alter.name,
    dateText: formatCalendarDateSlash(now),
    common: null,
    quickTable: null,
    alterPages: [buildAlterPage(alter, categories, sections)],
  };
}

/** 早見表だけの PDF(SPEC.md 10.6) */
export function buildQuickTablePrint(alters: readonly Alter[], categories: readonly AlterCategory[], now: Date): PrintContent {
  return {
    title: '早見表',
    dateText: formatCalendarDateSlash(now),
    common: null,
    quickTable: buildQuickTableRows(alters, categories),
    alterPages: [],
  };
}

/** 見出しの入力内容(見出し・中身とも前後の空白を取り除いたもの) */
export interface ProfileSectionInput {
  title: string;
  body: string;
}

/** 見出しの入力をチェックする(SPEC.md 10.4)。見出しは空だと保存できない。中身は空でもよい */
export function validateProfileSectionForm(values: { title: string; body: string }): FormResult<ProfileSectionInput> {
  const title = normalizeName(values.title);
  if (title === null) {
    return { ok: false, error: '見出しを入力してください' };
  }
  return { ok: true, input: { title, body: values.body.trim() } };
}

/**
 * 人格の削除の確認文(SPEC.md 3.1)。
 * 例:「「人格A」を削除しますか?プロフィールの見出し2件も一緒に削除されます。」
 * @param filledSectionCount 中身が空でない見出しの件数
 */
export function deleteAlterConfirmMessage(name: string, filledSectionCount: number): string {
  const sections =
    filledSectionCount > 0 ? `プロフィールの見出し${filledSectionCount}件も一緒に削除されます。` : '';
  return `「${name}」を削除しますか?${sections}`;
}
