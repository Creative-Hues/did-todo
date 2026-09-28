// プロフィールの見出しの一覧(SPEC.md 10.4・10.5)。人格ごとのページと「全体のこと」で共通
// 各カード:≡(並び替え)・見出し・中身。カードをタップすると編集画面を開く
// カードの右側の外に「PDFに入れる/自分たちだけ」の切り替えボタンを置く(押すとすぐ保存)
import { db } from '../../db/db';
import { reorderProfileSections, setProfileSectionIncludeInPdf } from '../../db/profileSectionRepo';
import { showSaveError } from '../../lib/showError';
import type { ProfileSection } from '../../lib/types';
import { SortableList } from '../common/SortableList';

interface Props {
  /** 並び順どおりの見出し(1人分、または「全体のこと」の分) */
  sections: ProfileSection[];
  onOpen: (section: ProfileSection) => void;
  onAdd: () => void;
}

export function ProfileSectionList({ sections, onOpen, onAdd }: Props) {
  const toggle = (section: ProfileSection) => {
    setProfileSectionIncludeInPdf(db, section.id, !section.includeInPdf).catch(showSaveError);
  };

  const renderCard = (section: ProfileSection) => (
    <div className="profile-row">
      <button type="button" className="profile-card" onClick={() => onOpen(section)}>
        <span className="profile-card__title">{section.title}</span>
        {section.body !== '' && <span className="profile-card__body">{section.body}</span>}
      </button>
      {/* ひと目で区別できるよう、「PDFに入れる」は色つき、「自分たちだけ」は鍵マーク付きの灰色 */}
      <button
        type="button"
        className={section.includeInPdf ? 'pdf-toggle pdf-toggle--on' : 'pdf-toggle pdf-toggle--off'}
        aria-pressed={section.includeInPdf}
        aria-label={`「${section.title}」をPDFに入れる`}
        onClick={() => toggle(section)}
      >
        {/* アイコンを文字の上に置き、文字は言葉の切れ目で2行に分ける(ほかの位置では折り返さない) */}
        <span className="pdf-toggle__icon" aria-hidden="true">
          {section.includeInPdf ? '📄' : '🔒'}
        </span>
        {(section.includeInPdf ? ['PDFに', '入れる'] : ['自分', 'たちだけ']).map((line) => (
          <span key={line} className="pdf-toggle__line">
            {line}
          </span>
        ))}
      </button>
    </div>
  );

  return (
    <>
      <SortableList
        className="item-list profile-list"
        items={sections}
        onReorder={(ids) => reorderProfileSections(db, ids)}
        renderItem={renderCard}
        getLabel={(section) => section.title}
      />
      <button type="button" className="add-button profile-add" onClick={onAdd}>
        ＋ 見出しを追加
      </button>
    </>
  );
}
