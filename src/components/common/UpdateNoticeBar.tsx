// 更新のお知らせの帯(SPEC.md 18.2・18.3)。画面の上に出す
// 入力中の画面をふさがないよう、画面全体をおおう確認ではなく、帯の形にする(スクロールしても上に残る)
import { updateNoticeText, type UpdateNoticeKind } from '../../lib/updateNotice';

interface Props {
  kind: UpdateNoticeKind;
  /** 「バックアップを書き出す」:バックアップ画面を開く */
  onOpenBackup: () => void;
  /** 「更新する」 */
  onUpdate: () => void;
  /** 「あとで」 */
  onDismiss: () => void;
}

export function UpdateNoticeBar({ kind, onOpenBackup, onUpdate, onDismiss }: Props) {
  return (
    <div
      className={kind === 'dataChange' ? 'update-notice update-notice--strong' : 'update-notice'}
      role="status"
    >
      <p className="update-notice__text">{updateNoticeText(kind)}</p>
      <div className="update-notice__buttons">
        <button type="button" className="update-notice__backup" onClick={onOpenBackup}>
          バックアップを書き出す
        </button>
        <button type="button" onClick={onUpdate}>
          更新する
        </button>
        <button type="button" onClick={onDismiss}>
          あとで
        </button>
      </div>
    </div>
  );
}
