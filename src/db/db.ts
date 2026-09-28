// データベースの定義(Dexie = IndexedDB を使いやすくするライブラリ)
import { Dexie, type EntityTable, type Transaction } from 'dexie';
import type {
  Alter,
  AlterCategory,
  AppMeta,
  BucketItem,
  ClinicNote,
  ClinicNoteCategory,
  CompletionRecord,
  Medication,
  MedicationIntake,
  MedicationTiming,
  ProfileSection,
  StockLog,
  Task,
} from '../lib/types';
import { buildInitialMedicationTimings } from '../lib/medicationTimings';
import {
  buildInitialCategories,
  buildInitialClinicNoteCategories,
  upgradeAlterToV2,
  type AlterV1,
} from './initialData';

export class AppDatabase extends Dexie {
  alters!: EntityTable<Alter, 'id'>;
  tasks!: EntityTable<Task, 'id'>;
  records!: EntityTable<CompletionRecord, 'id'>;
  categories!: EntityTable<AlterCategory, 'id'>;
  profileSections!: EntityTable<ProfileSection, 'id'>;
  medications!: EntityTable<Medication, 'id'>;
  medicationIntakes!: EntityTable<MedicationIntake, 'id'>;
  medicationTimings!: EntityTable<MedicationTiming, 'id'>;
  stockLogs!: EntityTable<StockLog, 'id'>;
  clinicNotes!: EntityTable<ClinicNote, 'id'>;
  clinicNoteCategories!: EntityTable<ClinicNoteCategory, 'id'>;
  bucketItems!: EntityTable<BucketItem, 'id'>;
  meta!: EntityTable<AppMeta, 'key'>;

  constructor(name = 'did-todo') {
    super(name);
    // 最初の項目が主キー、以降は検索に使う項目(インデックス)
    // 版1は消さずに残す(古い版のデータから順に引き継ぐため)
    this.version(1).stores({
      alters: 'id, order',
      tasks: 'id, order',
      records: 'id, taskId, completedAt, [taskId+completedAt]',
    });
    // 版2:SPEC.md 3.5。今のテーブルの主キーは変えず、新しいテーブルを足す
    this.version(2)
      .stores({
        categories: 'id, order',
        profileSections: 'id, alterId, order',
        medications: 'id, order',
        medicationIntakes: 'id, medicationId, takenAt',
        stockLogs: 'id, medicationId, at',
        clinicNotes: 'id, createdAt',
        clinicNoteCategories: 'id, order',
        bucketItems: 'id, alterId, order',
        meta: 'key',
      })
      .upgrade(async (tx) => {
        // 今の人格に基本情報の初期値を足し、最初のデータを入れる
        const alters = tx.table<AlterV1, string>('alters');
        const upgraded = (await alters.toArray()).map(upgradeAlterToV2);
        await tx.table<Alter, string>('alters').bulkPut(upgraded);
        await addInitialData(tx, new Date());
      });
    // 版3:SPEC.md 3.5・7.8。服薬の時間帯の一覧を足し、最初の4つを入れる
    // 最初の4つのIDは、薬・服薬記録に入っていた時間帯の値と同じなので、薬と服薬記録は書き換えない
    this.version(3)
      .stores({ medicationTimings: 'id, order' })
      .upgrade((tx) => addInitialMedicationTimings(tx, new Date()));
    // 新しく入れたとき(版1〜3の upgrade を通らない)も、同じ最初のデータを入れる
    this.on('populate', async (tx) => {
      const now = new Date();
      await addInitialData(tx, now);
      await addInitialMedicationTimings(tx, now);
    });
  }
}

/** 最初の区分と、受診メモの分類を入れる */
async function addInitialData(tx: Transaction, now: Date): Promise<void> {
  const newId = () => crypto.randomUUID();
  await tx.table<AlterCategory, string>('categories').bulkAdd(buildInitialCategories(now, newId));
  await tx
    .table<ClinicNoteCategory, string>('clinicNoteCategories')
    .bulkAdd(buildInitialClinicNoteCategories(now, newId));
}

/** 最初の4つの服薬の時間帯を入れる(SPEC.md 7.8) */
async function addInitialMedicationTimings(tx: Transaction, now: Date): Promise<void> {
  await tx
    .table<MedicationTiming, string>('medicationTimings')
    .bulkAdd(buildInitialMedicationTimings(now.toISOString()));
}

/** アプリ全体で使うデータベース */
export const db = new AppDatabase();
