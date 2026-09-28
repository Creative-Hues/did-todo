// 一覧 → 編集画面 → 戻る、のときに一覧の元のスクロール位置に戻すフック
import { useLayoutEffect, useRef } from 'react';

/**
 * @param showingList 今、一覧を表示しているか
 * @returns 一覧から別の画面を開く直前に呼ぶ関数(今のスクロール位置を覚える)
 */
export function useListScroll(showingList: boolean): () => void {
  const listScrollY = useRef(0);

  // 一覧に戻ったら覚えた位置へ、別の画面を開いたら一番上へ
  useLayoutEffect(() => {
    window.scrollTo(0, showingList ? listScrollY.current : 0);
  }, [showingList]);

  return () => {
    listScrollY.current = window.scrollY;
  };
}
