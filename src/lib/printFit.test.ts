import { describe, expect, it } from 'vitest';
import { chooseScale, scaleCandidates } from './printFit';

describe('scaleCandidates', () => {
  it('1 から下限まで、大きい順に並ぶ(最後は必ず下限)', () => {
    expect(scaleCandidates(0.9, 0.05)).toEqual([1, 0.95, 0.9]);
    expect(scaleCandidates(0.82, 0.05)).toEqual([1, 0.95, 0.9, 0.85, 0.82]);
  });

  it('下限が 1 なら 1 だけ', () => {
    expect(scaleCandidates(1, 0.05)).toEqual([1]);
  });
});

describe('chooseScale', () => {
  // 高さが倍率に比例する、ということにして試す
  const heightOf = (base: number) => (scale: number) => base * scale;
  const options = { limit: 100, minScale: 0.8, step: 0.05 };

  it('ふつうの大きさで収まるなら、縮めない', () => {
    expect(chooseScale(heightOf(90), options)).toEqual({ scale: 1, fits: true });
  });

  it('はみ出すなら、収まるいちばん大きい倍率まで縮める', () => {
    // 110 × 0.9 = 99 で収まる(0.95 だと 104.5 ではみ出す)
    expect(chooseScale(heightOf(110), options)).toEqual({ scale: 0.9, fits: true });
  });

  it('下限ちょうどで収まるなら、下限を使う', () => {
    expect(chooseScale(heightOf(125), options)).toEqual({ scale: 0.8, fits: true });
  });

  it('下限でも収まらないなら、ふつうの大きさに戻して「収まらない」を返す', () => {
    expect(chooseScale(heightOf(200), options)).toEqual({ scale: 1, fits: false });
  });
});
