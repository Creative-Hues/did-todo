// 保存の失敗を利用者に知らせる

export function showSaveError(error: unknown): void {
  console.error('保存に失敗しました', error);
  window.alert('保存に失敗しました。もう一度お試しください。');
}
