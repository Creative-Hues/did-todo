// 確認ダイアログ(記録の取り消し・人格やタスクの削除で共通)
// window.confirm はボタンの文言を変えられないため、自前で作る
interface Props {
  message: string;
  /** 実行するボタンの文言(例:「取り消す」「削除する」) */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <div className="overlay overlay--center">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-message">
        <p id="confirm-message" className="dialog__message">
          {message}
        </p>
        <div className="dialog__buttons">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="dialog__danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
