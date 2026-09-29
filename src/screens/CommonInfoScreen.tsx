// 「全体のこと」のページ(SPEC.md 10.5)。特定の人格ではない情報を、人格ごとのページと同じ見出しの仕組みで書く
import { PrintOverflowNotice } from '../components/print/PrintOverflowNotice';
import { ProfileSectionList } from '../components/profile/ProfileSectionList';
import type { PrintContent } from '../lib/alterInfo';
import type { ProfileSection } from '../lib/types';

interface Props {
  /** 「全体のこと」の見出し(並び順どおり) */
  sections: ProfileSection[];
  onBack: () => void;
  onOpenSection: (section: ProfileSection) => void;
  onAddSection: () => void;
  /** 印刷したときの「全体のこと」(1ページに収まるかを測るため) */
  printPreview: PrintContent;
}

export function CommonInfoScreen({ sections, onBack, onOpenSection, onAddSection, printPreview }: Props) {
  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>全体のこと</h1>
      </header>
      <PrintOverflowNotice content={printPreview} part="common" label="全体のこと" />
      <section className="settings-section">
        <ProfileSectionList sections={sections} onOpen={onOpenSection} onAdd={onAddSection} />
      </section>
    </main>
  );
}
