// 「全体のこと」のページ(SPEC.md 10.5)。特定の人格ではない情報を、人格ごとのページと同じ見出しの仕組みで書く
import { ProfileSectionList } from '../components/profile/ProfileSectionList';
import type { ProfileSection } from '../lib/types';

interface Props {
  /** 「全体のこと」の見出し(並び順どおり) */
  sections: ProfileSection[];
  onBack: () => void;
  onOpenSection: (section: ProfileSection) => void;
  onAddSection: () => void;
}

export function CommonInfoScreen({ sections, onBack, onOpenSection, onAddSection }: Props) {
  return (
    <main className="app">
      <header className="screen-header">
        <button type="button" onClick={onBack}>
          ‹ 戻る
        </button>
        <h1>全体のこと</h1>
      </header>
      <section className="settings-section">
        <ProfileSectionList sections={sections} onOpen={onOpenSection} onAdd={onAddSection} />
      </section>
    </main>
  );
}
