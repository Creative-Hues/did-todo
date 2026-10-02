import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import { DB_VERSION } from './src/db/dbVersion';
import { buildVersionInfo, VERSION_FILE_NAME } from './src/lib/updateNotice';
import { formatAppVersion } from './src/lib/appVersion';

// GitHub Pages の公開先(https://creative-hues.github.io/hitotsuyane/)に合わせる(SPEC.md 19章)
const base = '/hitotsuyane/';

/**
 * 公開のときに version.json(新しい版のデータベースの版)を書き出す(SPEC.md 18.3)。
 * 古い版のアプリが、新しい版を見つけたときに読んで、データの形が変わる更新かを知る
 */
function versionFilePlugin(): Plugin {
  return {
    name: 'hitotsuyane-version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: VERSION_FILE_NAME,
        source: JSON.stringify(buildVersionInfo(DB_VERSION)),
      });
    },
  };
}

/**
 * 変更の目印(コミットの番号)。GitHub Actions が入れる GITHUB_SHA を読む。手元のビルドなどで読めなければ null。
 * Node の型定義を入れていないので、process は globalThis から型を付けて読む
 */
function currentCommit(): string | null {
  const nodeProcess = (globalThis as { process?: { env: Record<string, string | undefined> } }).process;
  return nodeProcess?.env.GITHUB_SHA ?? null;
}

export default defineConfig({
  base,
  // アプリの版(SPEC.md 14章⑥)。公開した日付と変更の目印を、ビルドのときに入れる
  define: {
    __APP_VERSION__: JSON.stringify(formatAppVersion(new Date(), currentCommit())),
  },
  plugins: [
    react(),
    versionFilePlugin(),
    VitePWA({
      // 新しい版を公開しても自動では切り替えず、利用者が「更新する」を押したら切り替える(SPEC.md 18.2)
      // 登録は src/hooks/useUpdateNotice.ts で行う
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'ひとつやね',
        short_name: 'ひとつやね',
        description: '人格交代があっても日々のToDoを共有管理するアプリ',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // オフラインでも開けるよう、これらのファイルを端末に保存する
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
});
