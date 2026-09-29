// 早見表の表(SPEC.md 10.6)。画面(QuickTableScreen)と印刷(PrintDocument)で共通
import type { QuickTableRow } from '../../lib/alterInfo';

interface Props {
  rows: QuickTableRow[];
}

export function QuickTable({ rows }: Props) {
  return (
    <table className="quick-table">
      <thead>
        <tr>
          <th scope="col">名前</th>
          <th scope="col">区分</th>
          <th scope="col">体感年齢</th>
          <th scope="col">性別(感)</th>
          <th scope="col">見分け方</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.alterId}>
            <th scope="row">
              <span className="quick-table__name">
                <span className="color-dot" style={{ backgroundColor: row.color }} />
                {row.name}
              </span>
            </th>
            <td className="quick-table__category">{row.category}</td>
            <td className="quick-table__age">{row.age}</td>
            <td className="quick-table__gender">{row.gender}</td>
            {/* 見分け方の改行はそのまま出す */}
            <td className="quick-table__identify">{row.identify}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
