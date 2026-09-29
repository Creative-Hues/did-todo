// 印刷の仕組み(SPEC.md 10.7):印刷用の中身を body の直下に描いてから window.print() を呼ぶ
// 印刷のときは、印刷用 CSS(index.css の @media print)でアプリ本体を隠し、印刷用の中身だけを出す
// iPhone では、印刷画面から PDF として共有する
import { useState, type ReactNode } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { PrintDocument } from '../components/print/PrintDocument';
import type { PrintContent } from '../lib/alterInfo';
import { fitPrintBlocks } from '../lib/printMeasure';

/** 印刷用の中身の目印(body の直下の、この印刷の中身を見つけるため) */
const PRINT_ROOT_ID = 'print-root';

/**
 * @returns print:印刷を始める関数(ボタンを押したときに呼ぶ)
 *          printView:印刷用の中身(画面のどこかに置く。画面には見えない)
 *          clearPrint:印刷用の中身を片付ける関数
 */
export function usePrint(): { print: (content: PrintContent) => void; printView: ReactNode; clearPrint: () => void } {
  const [content, setContent] = useState<PrintContent | null>(null);

  const print = (next: PrintContent) => {
    // ボタンを押した流れのまま印刷を始められるよう、描き終わるのを待ってから window.print() を呼ぶ
    flushSync(() => setContent(next));
    // 印刷の直前に高さを測り、1ページに収めたい部分の文字の大きさを決める。
    // iPhone では印刷前のイベント(beforeprint)が当てにならないので、ボタンを押した流れの中で測る
    const doc = document.getElementById(PRINT_ROOT_ID);
    if (doc) {
      fitPrintBlocks(doc);
    }
    window.print();
  };

  // 印刷が終わったあとも中身はすぐには消さない(印刷画面が中身を読み終える前に消えないようにするため)。
  // 別の画面に移ったときに clearPrint で片付ける
  const printView =
    content === null ? null : createPortal(<PrintDocument content={content} id={PRINT_ROOT_ID} />, document.body);

  return { print, printView, clearPrint: () => setContent(null) };
}
