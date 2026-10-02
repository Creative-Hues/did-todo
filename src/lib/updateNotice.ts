// 更新のお知らせ(SPEC.md 18章)。すべて純粋関数(同じ入力なら同じ結果)。
// このファイルはビルドの設定(vite.config.ts)からも読むので、ほかのファイルを import しないこと

/**
 * 新しい版の情報を知らせるファイルの名前。公開のときにサイトの一番上(index.html と同じ場所)に置く。
 * 端末に保存しない(オフライン用の保存の対象外。拡張子 .json は保存する種類に入っていない)ので、
 * 読むといつもサイトに置いてある一番新しい版の情報が返る
 */
export const VERSION_FILE_NAME = 'version.json';

/** version.json の中身 */
export interface VersionInfo {
  /** その版のデータベースの版(SPEC.md 3.5) */
  dbVersion: number;
}

/** version.json の中身を作る(ビルドのときに使う) */
export function buildVersionInfo(dbVersion: number): VersionInfo {
  return { dbVersion };
}

/** version.json の中身を読み取る。形が正しくなければ null */
export function parseVersionInfo(value: unknown): VersionInfo | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const { dbVersion } = value as { dbVersion?: unknown };
  return typeof dbVersion === 'number' && Number.isSafeInteger(dbVersion) && dbVersion > 0 ? { dbVersion } : null;
}

/**
 * お知らせの種類
 * - normal:ふつうのお知らせ
 * - dataChange:データの形が変わる(データベースの版が上がる)更新。強めのお知らせ(SPEC.md 18.3)
 */
export type UpdateNoticeKind = 'normal' | 'dataChange';

/**
 * お知らせの種類を決める。
 * 新しい版のデータベースの版が、今のアプリの版より大きいときだけ dataChange。
 * 新しい版の情報が読めなかったとき(null。オフラインなど)は normal
 * @param currentDbVersion 今動いているアプリのデータベースの版
 * @param latest サイトに置いてある新しい版の情報
 */
export function updateNoticeKind(currentDbVersion: number, latest: VersionInfo | null): UpdateNoticeKind {
  return latest !== null && latest.dbVersion > currentDbVersion ? 'dataChange' : 'normal';
}

/** お知らせの文(SPEC.md 18.2・18.3) */
export function updateNoticeText(kind: UpdateNoticeKind): string {
  return kind === 'dataChange'
    ? '今回の更新では、データの形が変わります。必ずバックアップを書き出してから更新してください。'
    : '新しい版があります。更新の前に、バックアップの書き出しをおすすめします。';
}
