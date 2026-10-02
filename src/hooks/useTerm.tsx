// 呼び方(SPEC.md 14章③)を画面のどこからでも使えるようにする
// App で TermProvider を1回置き、各画面では useTerm() の t('人格を追加') のように使う
import { createContext, useContext, type ReactNode } from 'react';
import { db } from '../db/db';
import { getAltersTerm } from '../db/settingsRepo';
import { DEFAULT_TERM, withTerm } from '../lib/term';
import { useLiveQuery } from './useLiveQuery';

const TermContext = createContext<string>(DEFAULT_TERM);

export function TermProvider({ children }: { children: ReactNode }) {
  // 読み込み中は最初の呼び方で出す
  const term = useLiveQuery(() => getAltersTerm(db)) ?? DEFAULT_TERM;
  return <TermContext.Provider value={term}>{children}</TermContext.Provider>;
}

/**
 * @returns term:今の呼び方
 *          t:決まった文の中の「人格」を呼び方に置き換える関数(利用者が付けた名前を含む文には使わない)
 */
export function useTerm(): { term: string; t: (text: string) => string } {
  const term = useContext(TermContext);
  return { term, t: (text) => withTerm(text, term) };
}
