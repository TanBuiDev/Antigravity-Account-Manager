import {
  Check,
  ChevronLeft,
  Copy,
  FolderOpen,
  Play,
  RefreshCw,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LaunchTerminalOption } from "../../hooks/useLaunchTerminalOptions";
import { ModalErrorMessage } from "../ModalErrorMessage";
import { SingleSelectDropdown } from "../SingleSelectDropdown";

interface CodexCliWorkingDirField {
  value: string;
  error?: string | null;
  placeholder?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onChoose: () => void;
}

interface CodexCliLaunchDialogProps {
  subjectLabel: string;
  subjectValue: string;
  statusMessage?: string | null;
  workingDir?: CodexCliWorkingDirField;
  terminal: string;
  terminalOptions: LaunchTerminalOption[];
  onTerminalChange: (value: string) => void;
  command: string;
  commandPlaceholder?: string;
  preparing: boolean;
  copied: boolean;
  executing: boolean;
  successMessage?: string | null;
  errorMessage?: string | null;
  onClose: () => void;
  onBack?: () => void;
  onCopy: () => void;
  onExecute: () => void;
  showCancelButton?: boolean;
}

export function CodexCliLaunchDialog({
  subjectLabel,
  subjectValue,
  statusMessage,
  workingDir,
  terminal,
  terminalOptions,
  onTerminalChange,
  command,
  commandPlaceholder,
  preparing,
  copied,
  executing,
  successMessage,
  errorMessage,
  onClose,
  onBack,
  onCopy,
  onExecute,
  showCancelButton = false,
}: CodexCliLaunchDialogProps) {
  const { t } = useTranslation();
  const busy = preparing || executing;

  return (
    <div className="modal-overlay">
      <div className="modal modal-lg">
        <div className="modal-header">
          {onBack && (
            <button
              type="button"
              className="btn btn-secondary icon-only"
              onClick={onBack}
              title={t("common.back", "Quay lại")}
              aria-label={t("common.back", "Quay lại")}
            >
              <ChevronLeft size={14} />
            </button>
          )}
          <h2>{t("instances.launchDialog.title", "Khởi chạy phiên bản")}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t("common.close", "Đóng")}
          >
            <X />
          </button>
        </div>

        <div className="modal-body">
          <ModalErrorMessage message={errorMessage} />

          {statusMessage && (
            <div className="add-status success">
              <Check size={16} />
              <span>{statusMessage}</span>
            </div>
          )}

          <div className="form-group">
            <label>{subjectLabel}</label>
            <input className="form-input" value={subjectValue} readOnly />
          </div>

          {workingDir && (
            <div className="form-group">
              <label>{t("instances.form.workingDir", "Thư mục làm việc")}</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className={`form-input${workingDir.error ? " input-error" : ""}`}
                  value={workingDir.value}
                  placeholder={
                    workingDir.placeholder ??
                    t("instances.form.workingDirPlaceholder", "Mặc định dùng đường dẫn hiện tại")
                  }
                  onChange={(event) => workingDir.onChange(event.target.value)}
                  onBlur={workingDir.onBlur}
                  disabled={busy}
                  aria-invalid={Boolean(workingDir.error)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={workingDir.onChoose}
                  disabled={busy}
                  title={t(
                    "codex.cli.selectWorkingDir",
                    "选择 Codex CLI 工作目录",
                  )}
                  aria-label={t(
                    "codex.cli.selectWorkingDir",
                    "选择 Codex CLI 工作目录",
                  )}
                >
                  <FolderOpen size={16} />
                </button>
              </div>
              {workingDir.error && (
                <div className="form-error">{workingDir.error}</div>
              )}
              <p className="form-hint">
                {t("instances.form.workingDirDesc", "Khi khởi động sẽ chuyển vào thư mục này trước")}
              </p>
            </div>
          )}

          <div className="form-group">
            <label>{t("instances.launchDialog.terminal", "Cửa sổ lệnh")}</label>
            <SingleSelectDropdown
              value={terminal}
              onChange={onTerminalChange}
              options={terminalOptions}
              disabled={busy}
              ariaLabel={t("instances.launchDialog.terminal", "Cửa sổ lệnh")}
            />
          </div>

          <div className="form-group">
            <label>{t("instances.launchDialog.command", "Lệnh khởi chạy")}</label>
            <textarea
              className="form-input instance-args-input"
              value={command}
              placeholder={commandPlaceholder}
              readOnly
            />
            <p className="form-hint">
              {t(
                "instances.launchDialog.hint",
                "Sao chép lệnh để chạy thủ công hoặc chạy trực tiếp trong terminal.",
              )}
            </p>
          </div>

          {successMessage && (
            <div className="add-status success">
              <Check size={16} />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {showCancelButton && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={executing}
            >
              {t("common.cancel", "Hủy")}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCopy}
            disabled={busy}
          >
            <Copy size={16} />
            {preparing
              ? t("common.loading", "Đang tải...")
              : copied
                ? t("common.success", "Thành công")
                : t("common.copy", "Copy​")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onExecute}
            disabled={busy}
          >
            {busy ? (
              <RefreshCw size={16} className="loading-spinner" />
            ) : (
              <Play size={16} />
            )}
            {busy
              ? t("common.loading", "Đang tải...")
              : t("instances.launchDialog.runInTerminal", "Chạy trong terminal")}
          </button>
        </div>
      </div>
    </div>
  );
}
