// 印刷すると1ページに収まらなくなったことを、編集する画面で知らせる(SPEC.md 10.7)
// 画面の外に印刷用の中身を描いて高さを測る(印刷のときは .print-measure ごと隠す)
import { useLayoutEffect, useRef, useState } from 'react';
import type { PrintContent } from '../../lib/alterInfo';
import { fitPrintBlocks } from '../../lib/printMeasure';
import { PrintDocument } from './PrintDocument';

interface Props {
  /** 測る印刷用の中身 */
  content: PrintContent;
  /** 見る部分(PrintDocument の data-fit の値) */
  part: 'common' | 'quickTable';
  /** 知らせの文に入れる名前(例:「全体のこと」) */
  label: string;
}

export function PrintOverflowNotice({ content, part, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  // 中身が変わったときだけ測り直す
  const contentKey = JSON.stringify(content);

  useLayoutEffect(() => {
    const doc = ref.current?.querySelector<HTMLElement>('.print-doc');
    if (!doc) {
      return;
    }
    setOverflow(fitPrintBlocks(doc)[part] === false);
    // contentKey は content の中身が変わったときだけ変わる
  }, [contentKey, part]);

  return (
    <>
      {overflow && (
        <p className="print-overflow-notice">
          {label}は、印刷すると1ページに収まらず、2ページ以上になります(区切りのよいところで次のページに分かれます)
        </p>
      )}
      <div ref={ref} className="print-measure" aria-hidden="true">
        <PrintDocument content={content} />
      </div>
    </>
  );
}
