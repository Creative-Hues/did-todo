// 更新のお知らせ(SPEC.md 18章)のフック。
// 新しい版が届いても自動では切り替えず(vite-plugin-pwa の prompt の形)、帯を出すための状態を返す。
// - アプリを開いたとき:サービスワーカー(オフライン用の仕組み)の登録のときに、新しい版がないか確かめる
// - 画面に戻ったとき:もう一度確かめる。「あとで」で閉じた帯も、また出す
// - 新しい版が待っているときは、同じサイトの version.json を読み、データの形が変わる更新かを決める
import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { DB_VERSION } from '../db/dbVersion';
import { parseVersionInfo, updateNoticeKind, VERSION_FILE_NAME, type UpdateNoticeKind } from '../lib/updateNotice';

/** サイトに置いてある新しい版の情報を読む。読めなければ null(オフラインなど) */
async function fetchLatestVersionInfo() {
  try {
    // 同じサイトのファイルだけを読む(外のサイトとは通信しない)。いつも最新を読むよう、保存されたものは使わない
    const response = await fetch(`${import.meta.env.BASE_URL}${VERSION_FILE_NAME}`, { cache: 'no-store' });
    return response.ok ? parseVersionInfo(await response.json()) : null;
  } catch {
    return null;
  }
}

export interface UpdateNotice {
  /** 帯を出すか */
  visible: boolean;
  kind: UpdateNoticeKind;
  /** 「更新する」:新しい版に切り替える(アプリが読み込み直される) */
  update: () => void;
  /** 「あとで」:帯を閉じる(画面に戻ったとき・次に開いたときに、また出す) */
  dismiss: () => void;
}

export function useUpdateNotice(): UpdateNotice {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration ?? null;
    },
    onRegisterError(error: unknown) {
      console.error('オフライン用の仕組みの登録に失敗しました', error);
    },
  });
  const [dismissed, setDismissed] = useState(false);
  const [kind, setKind] = useState<UpdateNoticeKind>('normal');
  // 画面に戻った回数(戻るたびに version.json を読み直すため)
  const [visibleCount, setVisibleCount] = useState(0);

  // 画面に戻ったら、新しい版がないか確かめ、閉じた帯もまた出す
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      setDismissed(false);
      setVisibleCount((count) => count + 1);
      registrationRef.current?.update().catch((error: unknown) => {
        console.error('新しい版の確認に失敗しました', error);
      });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // 新しい版が待っているときは、データの形が変わる更新かを確かめる
  useEffect(() => {
    if (!needRefresh) {
      return;
    }
    let cancelled = false;
    void fetchLatestVersionInfo().then((latest) => {
      if (!cancelled) {
        setKind(updateNoticeKind(DB_VERSION, latest));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [needRefresh, visibleCount]);

  return {
    visible: needRefresh && !dismissed,
    kind,
    update: () => {
      void updateServiceWorker(true);
    },
    dismiss: () => setDismissed(true),
  };
}
