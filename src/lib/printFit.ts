// 印刷(PDF)で、決めた部分を1ページに収めるための計算(SPEC.md 10.7)
// ここは純粋関数だけにする。実際の高さの測り方(DOM)は lib/printMeasure.ts

/** 収める計算の設定 */
export interface FitOptions {
  /** 1ページに入る高さ(px) */
  limit: number;
  /** これより小さくは縮めない倍率(例:0.82 なら 11pt の文字が 9pt まで) */
  minScale: number;
  /** 1回に縮める幅(例:0.02) */
  step: number;
}

/** 計算の結果 */
export interface FitResult {
  /** 使う倍率(1 がふつうの大きさ) */
  scale: number;
  /** 1ページに収まったか */
  fits: boolean;
}

/** 試す倍率の一覧を、大きい順に作る(1 → … → minScale。最後は必ず minScale) */
export function scaleCandidates(minScale: number, step: number): number[] {
  const list: number[] = [];
  // 小数の誤差がたまらないよう、毎回 1 から計算し直して丸める
  for (let i = 0; ; i++) {
    const scale = Math.round((1 - step * i) * 1000) / 1000;
    if (scale <= minScale) {
      break;
    }
    list.push(scale);
  }
  list.push(minScale);
  return list;
}

/**
 * 1ページに収まる、いちばん大きい倍率を選ぶ。
 * 下限まで縮めても収まらないときは、無理に縮めず、ふつうの大きさ(1)に戻して fits: false を返す
 * (どうせ2ページになるので、読みやすさを優先し、区切りのよいところで次のページに分ける)
 * @param heightAt その倍率で描いたときの高さ(px)を返す関数
 */
export function chooseScale(heightAt: (scale: number) => number, options: FitOptions): FitResult {
  for (const scale of scaleCandidates(options.minScale, options.step)) {
    if (heightAt(scale) <= options.limit) {
      return { scale, fits: true };
    }
  }
  return { scale: 1, fits: false };
}
