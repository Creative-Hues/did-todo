import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { TermProvider } from './hooks/useTerm';
import { runStartup } from './startup';

// 起動時の処理(失敗しても画面は表示する)
runStartup(new Date()).catch((error: unknown) => {
  console.error('起動時の処理に失敗しました', error);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root が見つかりません');
}

createRoot(rootElement).render(
  <StrictMode>
    {/* 「人格」の呼び方を、どの画面からでも使えるようにする(SPEC.md 14章③) */}
    <TermProvider>
      <App />
    </TermProvider>
  </StrictMode>,
);
