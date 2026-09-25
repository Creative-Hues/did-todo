import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // テストのタイムゾーンを日本時間に固定する(どの環境でも同じ結果になるように)
    env: { TZ: 'Asia/Tokyo' },
  },
});
