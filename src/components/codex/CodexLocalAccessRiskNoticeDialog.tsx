import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { useModalFocusTrap } from "../../hooks/useModalFocusTrap";
import { useEscCloseTopmost } from "../../hooks/useEscClose";
import { getCodexLocalAccessRiskNoticeConfirmLabel, type CodexLocalAccessRiskNoticeAction } from "../../utils/codexLocalAccessRiskNotice";

export function CodexLocalAccessRiskNoticeDialog({ action, remember, onRememberChange, onClose }: {
  action: CodexLocalAccessRiskNoticeAction;
  remember: boolean;
  onRememberChange: (remember: boolean) => void;
  onClose: (accepted: boolean) => void;
}) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDivElement>(null);
  useModalFocusTrap(dialog, true);
  useEscCloseTopmost(true, () => onClose(false), dialog);
  return (
    <div className="modal-overlay codex-local-access-hide-confirm-overlay codex-local-access-risk-notice-overlay">
    <div
      ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("codex.localAccess.riskNotice.title")}
      className="modal codex-local-access-hide-confirm-modal codex-local-access-risk-notice-modal"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="modal-header">
        <h2>
          {t("codex.localAccess.riskNotice.title", "Lưu ý rủi ro")}
        </h2>
        <button
          className="modal-close"
          onClick={() => onClose(false)}
          aria-label={t("common.close", "Đóng")}
        >
          <X />
        </button>
      </div>
      <div className="modal-body">
        <p className="codex-local-access-hide-confirm-desc">
          {t(
            "codex.localAccess.riskNotice.message",
            "Việc sử dụng tài khoản chính thức thông thường qua proxy ngược hoặc chuyển tiếp có thể chịu các hạn chế nghiêm ngặt từ dịch vụ chính thức. Cách sử dụng này cũng có thể bị nhận diện là chuyển tiếp và ảnh hưởng đến chất lượng câu trả lời (“giảm trí thông minh”). Hãy sử dụng thận trọng, nhất là khi có nhiều tài khoản.",
          )}
        </p>
        <div className="codex-local-access-hide-confirm-points codex-local-access-risk-notice-points">
          <label className="codex-local-access-risk-notice-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => {
                onRememberChange(
                  event.target.checked,
                );
              }}
            />
            <span>
              {t(
                "codex.localAccess.riskNotice.remember",
                "Tôi đã hiểu, đừng nhắc lại",
              )}
            </span>
          </label>
        </div>
      </div>
      <div className="modal-footer">
        <button
          className="btn btn-secondary"
          onClick={() => onClose(false)}
        >
          {t("common.cancel", "Hủy")}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => onClose(true)}
        >
          {getCodexLocalAccessRiskNoticeConfirmLabel(
            action,
            t,
          )}
        </button>
      </div>
    </div>
  </div>
  );
}
