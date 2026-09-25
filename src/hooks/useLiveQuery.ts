// データベースの内容を画面に表示し、変更があれば自動で表示し直すフック
// (liveQuery = Dexie に組み込まれている「データ変更を見張る仕組み」)
import { liveQuery } from 'dexie';
import { useEffect, useState, type DependencyList } from 'react';

/** 読み込み中は undefined を返す */
export function useLiveQuery<T>(query: () => Promise<T>, deps: DependencyList = []): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: (result) => setValue(() => result),
      error: (error: unknown) => console.error('データの読み込みに失敗しました', error),
    });
    return () => subscription.unsubscribe();
    // query は deps が変わったときだけ作り直す
  }, deps);

  return value;
}
