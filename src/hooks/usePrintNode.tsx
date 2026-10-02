// 自由な中身を印刷する仕組み(SPEC.md 17.6)。usePrint(人格情報の PDF)と同じく、
// 印刷用の中身(.print-doc)を body の直下に描いてから window.print() を呼ぶ
import { useState, type ReactNode } from 'react';
import { createPortal, flushSync } from 'react-dom';

/**
 * @returns print:印刷を始める関数(中身は .print-doc の要素にすること)
 *          printView:印刷用の中身(画面のどこかに置く。画面には見えない)
 */
export function usePrintNode(): { print: (node: ReactNode) => void; printView: ReactNode } {
  const [node, setNode] = useState<ReactNode>(null);

  const print = (next: ReactNode) => {
    // ボタンを押した流れのまま印刷を始められるよう、描き終わるのを待ってから window.print() を呼ぶ
    flushSync(() => setNode(next));
    window.print();
  };

  // 印刷が終わったあとも中身はすぐには消さない(印刷画面が中身を読み終える前に消えないようにするため)。
  // この画面を閉じると一緒に片付く
  return { print, printView: node === null ? null : createPortal(node, document.body) };
}
