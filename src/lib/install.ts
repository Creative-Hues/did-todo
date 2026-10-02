// ホーム画面への追加の案内(SPEC.md 14章⑤)。純粋関数。
// 端末の情報は引数で受け取る(テストで任意の端末を試せるように)

/** 案内の種類。none はホーム画面から開いている(案内しない) */
export type InstallGuideKind = 'none' | 'ios' | 'android' | 'desktop' | 'other';

export interface DeviceInfo {
  /** ホーム画面から開いているか(display-mode: standalone、または iPhone の navigator.standalone) */
  standalone: boolean;
  userAgent: string;
  /** 指で触れる点の数(iPad がパソコンのふりをするときの見分けに使う) */
  maxTouchPoints: number;
}

/** どの案内を出すかを決める */
export function installGuideKind(device: DeviceInfo): InstallGuideKind {
  if (device.standalone) {
    return 'none';
  }
  const ua = device.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && device.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/.test(ua)) {
    return /Chrome\//.test(ua) ? 'android' : 'other';
  }
  // パソコンの Chrome・Edge(どちらも Chrome/ を含む)
  return /Chrome\//.test(ua) && !/Mobile/.test(ua) ? 'desktop' : 'other';
}

/** 案内の文(SPEC.md 14章⑤) */
export function installGuideText(kind: Exclude<InstallGuideKind, 'none'>): string {
  switch (kind) {
    case 'ios':
      return 'Safari の共有ボタン(四角から矢印が出ているマーク)を押して、「ホーム画面に追加」を選んでください。ホーム画面のアイコンから開くと、アプリとして使えます。';
    case 'android':
      return 'Chrome の右上の「︙」を押して、「ホーム画面に追加」(または「アプリをインストール」)を選んでください。';
    case 'desktop':
      return 'アドレスバーの右にあるインストールのマークを押すと、アプリとして使えます。';
    case 'other':
      return 'このブラウザのままでも使えます。データは、このブラウザの中に保存されます(別のブラウザで開くと、データは見えません)。';
  }
}

/** 今の端末の情報を読む(画面で使う) */
export function readDeviceInfo(): DeviceInfo {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    standalone: window.matchMedia('(display-mode: standalone)').matches || iosStandalone,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}
