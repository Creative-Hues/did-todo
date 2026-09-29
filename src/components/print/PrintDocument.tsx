// 印刷(PDF)用の中身(SPEC.md 10.6・10.7)。画面には出さず、印刷のときだけ出す(index.css の @media print)
// 中身の組み立ては lib/alterInfo.ts の純粋関数で行い、ここでは描くだけにする
// 1ページに収めたい部分は .print-fit で囲む。倍率は印刷の直前に lib/printMeasure.ts が決める
import type { PrintContent } from '../../lib/alterInfo';
import { QuickTable } from '../profile/QuickTable';

/**
 * 縮めてよい下限の倍率。
 * 全体のこと:本文 11pt → 9pt まで。早見表:表の文字 10pt → 9pt まで
 */
const COMMON_MIN_SCALE = 0.82;
const QUICK_TABLE_MIN_SCALE = 0.9;

interface Props {
  content: PrintContent;
  /** 印刷用の中身を見つけるための目印(印刷するときだけ付ける) */
  id?: string;
}

export function PrintDocument({ content, id }: Props) {
  // 1人分・早見表だけのときは表題がその名前なので、部分ごとの見出しを重ねて出さない
  const isAll = content.common !== null;
  const hasCommon = content.common !== null && content.common.length > 0;
  const hasQuickTable = content.quickTable !== null && content.quickTable.length > 0;

  const header = (
    <header className="print-doc__header">
      <h1>{content.title}</h1>
      <p>作成日:{content.dateText}</p>
    </header>
  );

  const quickTable = hasQuickTable && content.quickTable !== null && (
    <section className="print-part">
      {isAll && <h2>早見表</h2>}
      <QuickTable rows={content.quickTable} />
    </section>
  );

  return (
    <div className="print-doc" id={id}>
      {isAll ? (
        <>
          {/* 1ページ目:表題・作成日と「全体のこと」 */}
          <div className="print-fit" data-fit="common" data-min-scale={COMMON_MIN_SCALE}>
            {header}
            {hasCommon && content.common !== null && (
              <section className="print-part">
                <h2>全体のこと</h2>
                {content.common.map((section, index) => (
                  <PrintSection key={index} title={section.title} body={section.body} />
                ))}
              </section>
            )}
          </div>
          {/* 早見表は新しいページから(全体のことが空なら、表題のすぐあとに続ける) */}
          {hasQuickTable && (
            <div
              className={hasCommon ? 'print-fit print-part--new-page' : 'print-fit'}
              data-fit="quickTable"
              data-min-scale={QUICK_TABLE_MIN_SCALE}
            >
              {quickTable}
            </div>
          )}
        </>
      ) : hasQuickTable ? (
        // 早見表だけ:表題・作成日と表を1ページに
        <div className="print-fit" data-fit="quickTable" data-min-scale={QUICK_TABLE_MIN_SCALE}>
          {header}
          {quickTable}
        </div>
      ) : (
        header
      )}

      {content.alterPages.map((page) => (
        // 全員分では、人格ごとに新しいページから始める
        <section key={page.alterId} className={isAll ? 'print-part print-part--new-page' : 'print-part'}>
          {isAll && <h2>{page.name}</h2>}
          {page.basicInfo.length > 0 && (
            <dl className="print-basic-info">
              {page.basicInfo.map((item) => (
                <div key={item.label} className="print-basic-info__row">
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {page.sections.map((section, index) => (
            <PrintSection key={index} title={section.title} body={section.body} />
          ))}
        </section>
      ))}
    </div>
  );
}

function PrintSection({ title, body }: { title: string; body: string }) {
  return (
    <div className="print-section">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
