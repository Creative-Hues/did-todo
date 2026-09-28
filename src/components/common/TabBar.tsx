// 画面下のタブバー(SPEC.md 5章)。アイコン+文字で、今いるタブは色で区別する
// アイコンは外部から読み込まず、SVG をここに直接書く
import type { ReactNode } from 'react';

export type TabKey = 'todo' | 'medication' | 'clinic' | 'bucket' | 'alters';

/** アイコンの共通の枠(線で描く。色は文字色と同じ) */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="tab-bar__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** タブの並び(左から) */
const TABS: readonly { key: TabKey; label: string; icon: ReactNode }[] = [
  {
    key: 'todo',
    label: 'ToDo',
    // チェック付きの四角
    icon: (
      <Icon>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 12l3 3 5-6" />
      </Icon>
    ),
  },
  {
    key: 'medication',
    label: '服薬',
    // カプセル
    icon: (
      <Icon>
        <rect x="2.5" y="8" width="19" height="8" rx="4" transform="rotate(-45 12 12)" />
        <path d="M8.5 8.5l7 7" />
      </Icon>
    ),
  },
  {
    key: 'clinic',
    label: '受診メモ',
    // クリップボード
    icon: (
      <Icon>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
      </Icon>
    ),
  },
  {
    key: 'bucket',
    label: 'バケット',
    // 星
    icon: (
      <Icon>
        <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
      </Icon>
    ),
  },
  {
    key: 'alters',
    label: '人格情報',
    // 2人の人
    icon: (
      <Icon>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M17 14c2.6 0 4.5 1.8 4.5 4.5" />
      </Icon>
    ),
  },
];

interface Props {
  current: TabKey;
  onSelect: (tab: TabKey) => void;
}

export function TabBar({ current, onSelect }: Props) {
  return (
    <nav className="tab-bar" aria-label="画面の切り替え">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={tab.key === current ? 'tab-bar__button tab-bar__button--current' : 'tab-bar__button'}
          aria-current={tab.key === current ? 'page' : undefined}
          onClick={() => onSelect(tab.key)}
        >
          {tab.icon}
          <span className="tab-bar__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
