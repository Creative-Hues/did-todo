// アプリの版の表示(SPEC.md 14章⑥)。純粋関数。
// このファイルはビルドの設定(vite.config.ts)からも読むので、ほかのファイルを import しないこと

/**
 * 版の文字「2026.10.02(92104c7)」を作る。
 * 日付は公開した(ビルドした)日の日本時間、かっこの中は変更の目印(コミットの短い番号)
 * @param builtAt ビルドした日時
 * @param commit コミットの番号(長くても先頭7文字だけ使う)。わからないときは null
 */
export function formatAppVersion(builtAt: Date, commit: string | null): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(builtAt);
  const part = (type: 'year' | 'month' | 'day') => parts.find((p) => p.type === type)?.value ?? '';
  const date = `${part('year')}.${part('month')}.${part('day')}`;
  return commit ? `${date}(${commit.slice(0, 7)})` : date;
}
