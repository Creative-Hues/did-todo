// バックアップ用のデータの読み出し・置き換え(SPEC.md 12章)
import type { AppDatabase } from './db';
import type { BackupData } from '../lib/backup';

/** バックアップの対象のテーブル(端末の設定 meta は入れない) */
function backupTables(database: AppDatabase) {
  return [
    database.alters,
    database.categories,
    database.profileSections,
    database.tasks,
    database.records,
    database.medications,
    database.medicationIntakes,
    database.stockLogs,
    database.clinicNotes,
    database.clinicNoteCategories,
    database.bucketItems,
  ];
}

/** バックアップに入れるすべてのデータを、同じ時点のものとして読み出す */
export async function readAllData(database: AppDatabase): Promise<BackupData> {
  return database.transaction('r', backupTables(database), async () => ({
    alters: await database.alters.toArray(),
    categories: await database.categories.toArray(),
    profileSections: await database.profileSections.toArray(),
    tasks: await database.tasks.toArray(),
    records: await database.records.toArray(),
    medications: await database.medications.toArray(),
    medicationIntakes: await database.medicationIntakes.toArray(),
    stockLogs: await database.stockLogs.toArray(),
    clinicNotes: await database.clinicNotes.toArray(),
    clinicNoteCategories: await database.clinicNoteCategories.toArray(),
    bucketItems: await database.bucketItems.toArray(),
  }));
}

/**
 * 今のデータをすべて消し、バックアップの中身に置き換える。
 * 1つのトランザクション(まとめて1回の処理)で行うので、途中で失敗したら何も変わらない。
 * 端末の設定(最後に書き出した日時)は置き換えない。
 */
export async function replaceAllData(database: AppDatabase, data: BackupData): Promise<void> {
  await database.transaction('rw', backupTables(database), async () => {
    await Promise.all(backupTables(database).map((table) => table.clear()));
    await database.alters.bulkAdd(data.alters);
    await database.categories.bulkAdd(data.categories);
    await database.profileSections.bulkAdd(data.profileSections);
    await database.tasks.bulkAdd(data.tasks);
    await database.records.bulkAdd(data.records);
    await database.medications.bulkAdd(data.medications);
    await database.medicationIntakes.bulkAdd(data.medicationIntakes);
    await database.stockLogs.bulkAdd(data.stockLogs);
    await database.clinicNotes.bulkAdd(data.clinicNotes);
    await database.clinicNoteCategories.bulkAdd(data.clinicNoteCategories);
    await database.bucketItems.bulkAdd(data.bucketItems);
  });
}

/** 最後にバックアップを書き出した日時(ISO形式)。一度もなければ null */
export async function getLastExportedAt(database: AppDatabase): Promise<string | null> {
  return (await database.meta.get('lastBackupExportedAt'))?.value ?? null;
}

export async function setLastExportedAt(database: AppDatabase, now: Date): Promise<void> {
  await database.meta.put({ key: 'lastBackupExportedAt', value: now.toISOString() });
}
