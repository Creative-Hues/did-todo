// 服薬タブの最初の画面(SPEC.md 7章):記録画面
// 記録の中身は段階C、「記録の一覧」は段階Dで足す
interface Props {
  onOpenSettings: () => void;
}

export function MedicationScreen({ onOpenSettings }: Props) {
  return (
    <main className="app">
      <header className="screen-header">
        <h1>服薬</h1>
        <div className="header-buttons">
          <button type="button" onClick={onOpenSettings}>
            薬の設定
          </button>
        </div>
      </header>
      <p className="empty">記録の画面は準備中です</p>
    </main>
  );
}
