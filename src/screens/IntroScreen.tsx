// 「はじめに」の画面(SPEC.md 14章⑤)。人格が1人もいない間、アプリを開くたびに出す(閉じることはできる)
// 画面全体に重ねて出す
import { IntroContent } from '../components/common/IntroContent';
import { useTerm } from '../hooks/useTerm';

interface Props {
  /** 「人格を登録する」:閉じて、人格を追加する画面を開く */
  onAddAlter: () => void;
  /** 「閉じる」 */
  onClose: () => void;
}

export function IntroScreen({ onAddAlter, onClose }: Props) {
  const { t } = useTerm();
  return (
    <div className="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <main className="app intro__body">
        <h1 id="intro-title" className="intro__title">
          はじめに
        </h1>
        <IntroContent />
        <div className="intro__buttons">
          <button type="button" className="sheet__wide-button intro__primary" onClick={onAddAlter}>
            {t('人格を登録する')}
          </button>
          <button type="button" className="sheet__wide-button" onClick={onClose}>
            閉じる
          </button>
        </div>
      </main>
    </div>
  );
}
