// 印刷(PDF)用の中身(SPEC.md 10.6・10.7)。画面には出さず、印刷のときだけ出す(index.css の @media print)
// 中身の組み立ては lib/alterInfo.ts の純粋関数で行い、ここでは描くだけにする
import type { PrintContent } from '../../lib/alterInfo';
import { QuickTable } from '../profile/QuickTable';

interface Props {
  content: PrintContent;
}

export function PrintDocument({ content }: Props) {
  // 1人分・早見表だけのときは表題がその名前なので、部分ごとの見出しを重ねて出さない
  const isAll = content.common !== null;

  return (
    <div className="print-doc">
      <header className="print-doc__header">
        <h1>{content.title}</h1>
        <p>作成日:{content.dateText}</p>
      </header>

      {content.common !== null && content.common.length > 0 && (
        <section className="print-part">
          <h2>全体のこと</h2>
          {content.common.map((section, index) => (
            <PrintSection key={index} title={section.title} body={section.body} />
          ))}
        </section>
      )}

      {content.quickTable !== null && content.quickTable.length > 0 && (
        <section className="print-part">
          {isAll && <h2>早見表</h2>}
          <QuickTable rows={content.quickTable} />
        </section>
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
