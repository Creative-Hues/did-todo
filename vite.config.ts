import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import { DB_VERSION } from './src/db/dbVersion';
import { buildVersionInfo, VERSION_FILE_NAME } from './src/lib/updateNotice';

// GitHub Pages の公開先(https://creative-hues.github.io/did-todo/)に合わせる
const base = '/did-todo/';

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

export default defineConfig({
  base,
  plugins: [
    react(),
    versionFilePlugin(),
    VitePWA({
      // 新しい版を公開したら、自動で更新する
      registerType: 'autoUpdate',
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
