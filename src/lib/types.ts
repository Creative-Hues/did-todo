// データの型(SPEC.md 3章)

/** 人格(永続データ) */
export interface Alter {
  id: string;
  name: string;
  /** 表示色(例:#4A90D9) */
  color: string;
  /** 非表示フラグ(人格は削除しない) */
  hidden: boolean;
  /** 表示順 */
  order: number;
  /** 作成日時(ISO形式) */
  createdAt: string;
}

/** 周期 */
export type Cycle =
  | { type: 'daily' } // 毎日
  | { type: 'everyNDays'; n: number } // ○日ごと(n は 2 以上の整数)
  | { type: 'weekly' } // 毎週
  | { type: 'monthly' }; // 毎月

/** タスク(永続データ) */
export interface Task {
  id: string;
  name: string;
  cycle: Cycle;
  /** このタスクを気にしている人格のID(0人も可) */
  careAlterIds: string[];
  /** 非表示フラグ(タスクは削除しない) */
  hidden: boolean;
  /** 表示順 */
  order: number;
  /** 作成日時(ISO形式) */
  createdAt: string;
}

/** 完了記録(記録データ。1年間保持) */
export interface CompletionRecord {
  id: string;
  taskId: string;
  /** やった人格のID。「わからない」の場合は null */
  alterId: string | null;
  /** 完了日時(ISO形式。Date.toISOString() で保存する) */
  completedAt: string;
}
