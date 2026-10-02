import { describe, expect, it } from 'vitest';
import { installGuideKind } from './install';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD_AS_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const ANDROID_FIREFOX = 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0';
const PC_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const PC_EDGE = `${PC_CHROME} Edg/130.0.0.0`;
const PC_FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0';

const device = (userAgent: string, maxTouchPoints = 0, standalone = false) => ({ userAgent, maxTouchPoints, standalone });

describe('ホーム画面への追加の案内(SPEC.md 14章⑤)', () => {
  it('ホーム画面から開いているときは案内しない', () => {
    expect(installGuideKind(device(IPHONE, 5, true))).toBe('none');
    expect(installGuideKind(device(PC_CHROME, 0, true))).toBe('none');
  });

  it('端末ごとに案内を選ぶ', () => {
    expect(installGuideKind(device(IPHONE, 5))).toBe('ios');
    expect(installGuideKind(device(IPAD_AS_MAC, 5))).toBe('ios');
    expect(installGuideKind(device(ANDROID_CHROME, 5))).toBe('android');
    expect(installGuideKind(device(ANDROID_FIREFOX, 5))).toBe('other');
    expect(installGuideKind(device(PC_CHROME))).toBe('desktop');
    expect(installGuideKind(device(PC_EDGE))).toBe('desktop');
    expect(installGuideKind(device(PC_FIREFOX))).toBe('other');
    // パソコンの Safari(指で触れない Mac)
    expect(installGuideKind(device(IPAD_AS_MAC, 0))).toBe('other');
  });
});
