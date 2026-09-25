// 端末のデータを消されにくくする(ブラウザに「永続ストレージ」を要求する)

/**
 * まだ許可されていなければ navigator.storage.persist() を呼ぶ。
 * 起動のたびに呼んでよい(許可済みなら何もしない)。
 * 戻り値:永続化されているかどうか
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }
  if (await navigator.storage.persisted()) {
    return true;
  }
  return navigator.storage.persist();
}
