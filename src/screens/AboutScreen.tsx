// 「このアプリについて」(SPEC.md 14章⑥):アプリの名前と版・データの扱い・医療のアプリではないこと
// 人格情報タブの一覧画面の一番下から開く
import { useTerm } from '../hooks/useTerm';
import { APP_NAME, DATA_NOTICES, MEDICAL_NOTICE, SWITCH_LOG_NOTICE } from '../lib/about';

interface Props {
  onBack: () => void;
}

export function AboutScreen({ onBack }: Props) {
  const { t } = useTerm();
  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>このアプリについて</h1>
      </header>
      <section className="settings-section about">
        <h2>{APP_NAME}</h2>
        <p>版:{__APP_VERSION__}</p>
      </section>
      <section className="settings-section about">
        <h2>データの扱い</h2>
        <ul className="about-list">
          {DATA_NOTICES.map((text) => (
            <li key={text}>{t(text)}</li>
          ))}
        </ul>
      </section>
      <section className="settings-section about">
        <h2>医療のアプリではありません</h2>
        <ul className="about-list">
          <li>{MEDICAL_NOTICE}</li>
          <li>{SWITCH_LOG_NOTICE}</li>
        </ul>
      </section>
    </main>
  );
}
