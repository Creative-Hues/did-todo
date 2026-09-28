import { describe, expect, it } from 'vitest';
import { normalizeName, parseEveryNDays, parseTabletCount } from './validation';

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

describe('錠数のチェック', () => {
  it('0.5錠単位の数は受け付ける', () => {
    expect(parseTabletCount('1', 0.5)).toBe(1);
    expect(parseTabletCount(' 0.5 ', 0.5)).toBe(0.5);
    expect(parseTabletCount('2.5', 0)).toBe(2.5);
    expect(parseTabletCount('14.0', 0)).toBe(14);
  });

  it('最小値より小さい数は null になる', () => {
    expect(parseTabletCount('0', 0.5)).toBeNull();
    expect(parseTabletCount('0', 0)).toBe(0);
  });

  it('0.5錠単位でない数や、数でない入力は null になる', () => {
    expect(parseTabletCount('0.3', 0)).toBeNull();
    expect(parseTabletCount('1.25', 0)).toBeNull();
    expect(parseTabletCount('-1', 0)).toBeNull();
    expect(parseTabletCount('1/2', 0)).toBeNull();
    expect(parseTabletCount('', 0)).toBeNull();
    expect(parseTabletCount('.5', 0)).toBeNull();
    expect(parseTabletCount('abc', 0)).toBeNull();
  });
});
