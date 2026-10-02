import { describe, expect, it } from 'vitest';
import { formatAppVersion } from './appVersion';

describe('版の表示(SPEC.md 14章⑥)', () => {
  it('日本時間の日付と、コミットの短い番号', () => {
    // 2026-10-01T16:00Z は日本時間では 10/2 1:00
    expect(formatAppVersion(new Date('2026-10-01T16:00:00Z'), '92104c7aa1b2')).toBe('2026.10.02(92104c7)');
    expect(formatAppVersion(new Date('2026-01-05T03:00:00Z'), null)).toBe('2026.01.05');
  });
});
