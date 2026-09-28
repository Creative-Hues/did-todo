// ファイルを端末に保存する(バックアップの書き出し。SPEC.md 12章)
// スマホでは共有シート、PC ではダウンロードを使う。
// 共有が使えない・エラーになったときはダウンロードに切り替える。

/** 保存の結果:共有シートで渡した / ダウンロードした / 利用者がキャンセルした */
export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

/** 保存に使う機能(テストでは偽物を渡す) */
export interface SaveFileDeps<F> {
  /** 共有シートを先に試すか(スマホ・タブレットなら true) */
  preferShare: boolean;
  canShare: (file: F) => boolean;
  share: (file: F) => Promise<void>;
  download: (file: F) => void;
}

/** 利用者が共有シートを自分で閉じたときのエラーか */
function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError';
}

/**
 * ファイルを保存する。
 * - 共有シートを使える端末では、まず共有シートを試す
 *   - 利用者がキャンセルしたら、何もせず 'cancelled'
 *   - それ以外のエラー(例:Chrome は .json の共有を許さず NotAllowedError になる)はダウンロードに切り替える
 * - それ以外はダウンロード
 * ダウンロードに失敗したときは、エラーをそのまま投げる
 */
export async function saveFile<F>(file: F, deps: SaveFileDeps<F>): Promise<SaveResult> {
  if (deps.preferShare && deps.canShare(file)) {
    try {
      await deps.share(file);
      return 'shared';
    } catch (error) {
      if (isAbortError(error)) {
        return 'cancelled';
      }
      console.warn('共有シートを使えなかったため、ダウンロードで保存します', error);
    }
  }
  deps.download(file);
  return 'downloaded';
}

/**
 * スマホ・タブレットか(共有シートを先に試すか)を、ブラウザの情報から判断する。
 * iPad は PC 向け表示のとき「Macintosh」を名乗るため、タッチ点の数でも見分ける。
 */
export function isMobileDevice(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod|Android/i.test(userAgent)) {
    return true;
  }
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

/** ダウンロードとして保存する */
function downloadInBrowser(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  // ダウンロードが始まるまで少し待ってから片付ける
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** ブラウザの本物の機能を使う設定 */
export function browserSaveDeps(): SaveFileDeps<File> {
  return {
    preferShare: isMobileDevice(navigator.userAgent, navigator.maxTouchPoints),
    canShare: (file) => typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] }),
    share: (file) => navigator.share({ files: [file] }),
    download: downloadInBrowser,
  };
}
