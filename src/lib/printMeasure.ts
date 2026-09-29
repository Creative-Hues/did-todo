// 印刷用の中身の高さを実際に測り、決めた部分(.print-fit)を1ページに収める(SPEC.md 10.7)
// 倍率の選び方は lib/printFit.ts の純粋関数で行う
import { chooseScale } from './printFit';

/**
 * iPhone の印刷で使える範囲(A4)。実際に書き出した PDF から測った値(横 約181mm・縦 約249mm)より
 * 少し小さめにして、はみ出しにくくしている
 */
const PAGE_WIDTH_MM = 180;
const PAGE_HEIGHT_MM = 240;
/** 1mm あたりの px(CSS では 1in = 96px = 25.4mm) */
const PX_PER_MM = 96 / 25.4;
/** 1回に縮める幅 */
const STEP = 0.02;

/** 部分ごとの結果(キーは data-fit の値。例:common・quickTable) */
export type FitReport = Record<string, boolean>;

/**
 * 印刷用の中身(.print-doc)の中の .print-fit を、1つずつ1ページに収まる倍率にする。
 * 測るあいだだけ、画面の外に印刷と同じ横幅で描く(.print-doc--measuring)
 * @returns 部分ごとに、1ページに収まったか
 */
export function fitPrintBlocks(doc: HTMLElement): FitReport {
  const report: FitReport = {};
  doc.classList.add('print-doc--measuring');
  doc.style.setProperty('--print-page-width', `${PAGE_WIDTH_MM}mm`);
  try {
    doc.querySelectorAll<HTMLElement>('.print-fit').forEach((block) => {
      const minScale = Number(block.dataset.minScale ?? '1');
      const result = chooseScale(
        (scale) => {
          block.style.setProperty('--print-scale', String(scale));
          return block.getBoundingClientRect().height;
        },
        { limit: PAGE_HEIGHT_MM * PX_PER_MM, minScale, step: STEP },
      );
      block.style.setProperty('--print-scale', String(result.scale));
      report[block.dataset.fit ?? ''] = result.fits;
    });
  } finally {
    doc.classList.remove('print-doc--measuring');
  }
  return report;
}
