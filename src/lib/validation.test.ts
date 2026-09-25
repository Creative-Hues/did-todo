import { describe, expect, it } from 'vitest';
import { normalizeName, parseEveryNDays } from './validation';

describe('名前のチェック', () => {
  it('前後の空白を取り除く', () => {
    expect(normalizeName('  人格A  ')).toBe('人格A');
  });

  it('空欄や空白だけは null になる', () => {
    expect(normalizeName('')).toBeNull();
    expect(normalizeName('   ')).toBeNull();
    expect(normalizeName('　')).toBeNull(); // 全角スペース
  });
});

describe('「○日ごと」の日数のチェック', () => {
  it('2以上の整数は受け付ける', () => {
    expect(parseEveryNDays('2')).toBe(2);
    expect(parseEveryNDays(' 10 ')).toBe(10);
  });

  it('1以下・小数・空欄・数字以外は null になる', () => {
    expect(parseEveryNDays('1')).toBeNull();
    expect(parseEveryNDays('0')).toBeNull();
    expect(parseEveryNDays('-3')).toBeNull();
    expect(parseEveryNDays('2.5')).toBeNull();
    expect(parseEveryNDays('')).toBeNull();
    expect(parseEveryNDays('abc')).toBeNull();
  });
});
