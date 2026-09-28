// データの型(SPEC.md 3章)

/** 人格(永続データ) */
export interface Alter {
  id: string;
  name: string;
  /** 表示色(例:#4A90D9) */
  color: string;
  /** 非表示フラグ(人格は記録がないときだけ削除できる) */
  hidden: boolean;
  /** 表示順 */
  order: number;
  /** 作成日時(ISO形式) */
  createdAt: string;
  /** 読み(基本情報) */
  reading: string;
  /** 区分のID。選ばないときは null(「未分類」に表示) */
  categoryId: string | null;
  /** 体感年齢(基本情報) */
  age: string;
  /** 性別(感)(基本情報) */
  gender: string;
  /** 見分け方(基本情報) */
  identify: string;
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
  /** 非表示フラグ(タスクは削除できるが、完了記録は残す) */
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
  /** 記録した瞬間の、タスクの careAlterIds の写し(古い記録にはない。SPEC.md 3.3) */
  careAlterIdsAtCompletion?: string[];
}

/** 人格の区分(永続データ。SPEC.md 10.2) */
export interface AlterCategory {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

/** プロフィールの見出し(永続データ。SPEC.md 10.4・10.5) */
export interface ProfileSection {
  id: string;
  /** 人格のID。null なら「全体のこと」の見出し */
  alterId: string | null;
  /** 見出し */
  title: string;
  /** 中身(改行可) */
  body: string;
  /** PDFに入れるか(false なら「自分たちだけ」) */
  includeInPdf: boolean;
  order: number;
  createdAt: string;
}

/** 服薬の時間帯:朝食後/昼食後/夕食後/寝る前 */
export type MedicationTiming = 'morning' | 'noon' | 'evening' | 'bedtime';

/** 薬(永続データ。SPEC.md 7.1) */
export interface Medication {
  id: string;
  name: string;
  /** 飲み方:決まった時間 / 頓服 */
  kind: 'scheduled' | 'asNeeded';
  /** 時間帯(決まった時間のときだけ使う) */
  timings: MedicationTiming[];
  /** 1回の錠数(0.5錠単位) */
  dosePerTake: number;
  /** 残りの錠数(0.5錠単位) */
  remaining: number;
  /** 状態:使用中 / 中止 */
  status: 'active' | 'stopped';
  order: number;
  createdAt: string;
}

/** 服薬記録(記録データ。1年間保持。SPEC.md 7.4〜7.6) */
export interface MedicationIntake {
  id: string;
  medicationId: string;
  /** 飲んだ人格のID。「わからない」の場合は null */
  alterId: string | null;
  /** 飲んだ日時(ISO形式) */
  takenAt: string;
  /** 時間帯。頓服のときは null */
  timing: MedicationTiming | null;
  /** 実際に残りから減らした錠数(取り消しのときに戻す数) */
  deducted: number;
  /** 飲んだ理由(頓服のとき。空欄可) */
  reason: string;
}

/** 在庫の履歴(補充・数え直し。SPEC.md 7.2) */
export interface StockLog {
  id: string;
  medicationId: string;
  /** 補充 / 数え直し */
  kind: 'refill' | 'recount';
  /** 補充ならもらってきた錠数、数え直しなら数えた錠数 */
  amount: number;
  /** 操作した日時(ISO形式) */
  at: string;
}

/** 受診メモの分類(永続データ。SPEC.md 8.1) */
export interface ClinicNoteCategory {
  id: string;
  name: string;
  order: number;
  createdAt: string;
}

/** 受診メモ(永続データ。SPEC.md 8.1) */
export interface ClinicNote {
  id: string;
  /** 書いた人格のID。「わからない」の場合は null */
  alterId: string | null;
  categoryId: string;
  body: string;
  /** 書いた日時(ISO形式) */
  createdAt: string;
  /** 話した日時(ISO形式)。まだ話していなければ null */
  discussedAt: string | null;
}

/** バケットの項目(永続データ。SPEC.md 9章) */
export interface BucketItem {
  id: string;
  /** 誰のリストか */
  alterId: string;
  body: string;
  order: number;
  /** 書いた日時(ISO形式) */
  createdAt: string;
  /** 叶った日時(ISO形式)。まだなら null */
  achievedAt: string | null;
  /** 協力してくれた人格のID(本人は含めない) */
  helperAlterIds: string[];
}

/** 端末の設定(キーと値)。バックアップには含めない */
export interface AppMeta {
  /** lastBackupExportedAt:バックアップを最後に書き出した日時(ISO形式) */
  key: 'lastBackupExportedAt';
  value: string;
}
