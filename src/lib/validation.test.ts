import { describe, expect, it } from 'vitest';
import {
  isDuplicateName,
  normalizeName,
  parseDosePerTake,
  parseEveryNDays,
  parseStockCount,
  parseTabletCount,
} from './validation';

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

describe('薬の錠数の入力チェック', () => {
  it('0.5錠単位でない数(例:1.3)は、どの入力欄でもはじかれる', () => {
    expect(parseDosePerTake('1.3')).toBeNull();
    expect(parseStockCount('1.3')).toBeNull();
    expect(parseStockCount('10.7')).toBeNull();
  });

  it('1回の錠数は0.5以上', () => {
    expect(parseDosePerTake('0.5')).toBe(0.5);
    expect(parseDosePerTake('1.5')).toBe(1.5);
    expect(parseDosePerTake('0')).toBeNull();
    expect(parseDosePerTake('0.0')).toBeNull();
  });

  it('残り・補充・数え直しは0以上', () => {
    expect(parseStockCount('0')).toBe(0);
    expect(parseStockCount('0.5')).toBe(0.5);
    expect(parseStockCount('28')).toBe(28);
    expect(parseStockCount('-0.5')).toBeNull();
  });
});

describe('同じ名前のチェック(服薬の時間帯・受診メモの分類)', () => {
  const items = [
    { id: 'a', name: '体調' },
    { id: 'b', name: '睡眠 ' },
  ];

  it('ほかの項目と同じ名前なら true(保存されている名前の前後の空白は無視する)', () => {
    expect(isDuplicateName('体調', items)).toBe(true);
    expect(isDuplicateName('睡眠', items)).toBe(true);
    expect(isDuplicateName('気分', items)).toBe(false);
  });

  it('名前を変えている項目自身とは比べない', () => {
    expect(isDuplicateName('体調', items, 'a')).toBe(false);
    expect(isDuplicateName('睡眠', items, 'a')).toBe(true);
  });
});
