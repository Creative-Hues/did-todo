// 記録の取り消しの確認(SPEC.md 5.3)
// window.confirm はボタンの文言を変えられないため、自前で作る
interface Props {
  /** 「人格A・9:12」形式の文字列 */
  labelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function UndoDialog({ labelText, onConfirm, onCancel }: Props) {
  return (
    <div className="overlay overlay--center">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="undo-message">
        <p id="undo-message" className="dialog__message">
          {labelText} の記録を取り消しますか?
        </p>
        <div className="dialog__buttons">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="dialog__danger" onClick={onConfirm}>
            取り消す
          </button>
        </div>
      </div>
    </div>
  );
}
