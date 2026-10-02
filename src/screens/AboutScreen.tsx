// 「このアプリについて」(SPEC.md 14章⑥):アプリの名前と版・交代の記録について・「はじめに」の内容
// (「はじめに」の内容に、データの扱いと医療のアプリではないことが入っている)
// 人格情報タブの一覧画面の一番下から開く
import { IntroContent } from '../components/common/IntroContent';
import { APP_NAME, SWITCH_LOG_NOTICE } from '../lib/about';

interface Props {
  onBack: () => void;
}

export function AboutScreen({ onBack }: Props) {
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
      {/* 「はじめに」の内容を見直せるようにする(SPEC.md 14章⑤⑥) */}
      <IntroContent />
      <section className="settings-section about">
        <h2>交代の記録について</h2>
        <p>{SWITCH_LOG_NOTICE}</p>
      </section>
    </main>
  );
}
