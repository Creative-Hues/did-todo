// 現在時刻を返すフック。
// 1分ごとと、画面に戻ったとき(バックグラウンドから復帰したとき)に取り直す。
// これで朝5時などの区切りをまたいでも、古い状態のまま表示されない。
import { useEffect, useState } from 'react';

const REFRESH_INTERVAL_MS = 60_000;

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return now;
}
