// まだ中身を作っていないタブの画面(SPEC.md 5章)
interface Props {
  title: string;
}

export function PlaceholderScreen({ title }: Props) {
  return (
    <main className="app">
      <header className="screen-header">
        <h1>{title}</h1>
      </header>
      <p className="empty">この画面は準備中です</p>
    </main>
  );
}
