import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Power,
  RefreshCw,
  Server,
  Waypoints,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  CodexInstanceGatewayStatus,
  CodexInstanceGatewayView,
} from "../types/codexLocalAccess";
import { summarizeCodexInstanceGateways } from "../utils/codexInstanceGatewaySummary";
import "./CodexInstanceGatewaysModal.css";

interface CodexInstanceGatewaysModalProps {
  isOpen: boolean;
  gateways: CodexInstanceGatewayView[];
  loading: boolean;
  error: string;
  maskAccountText?: (value: string) => string;
  onRefresh: () => void;
  onStopGateway?: (gateway: CodexInstanceGatewayView) => Promise<boolean>;
  onRestartGateway?: (gateway: CodexInstanceGatewayView) => Promise<boolean>;
  onClose: () => void;
}

const STATUS_TONE: Record<CodexInstanceGatewayStatus, string> = {
  running: "success",
  unreachable: "error",
  portConflict: "error",
  stopped: "warning",
  notStarted: "muted",
};

/** 实例级本地网关总览弹框（只读展示运行态）。 */
export function CodexInstanceGatewaysModal({
  isOpen,
  gateways,
  loading,
  error,
  maskAccountText,
  onRefresh,
  onStopGateway,
  onRestartGateway,
  onClose,
}: CodexInstanceGatewaysModalProps) {
  const { t } = useTranslation();
  const [copiedGatewayId, setCopiedGatewayId] = useState<string | null>(null);
  const [busyGatewayId, setBusyGatewayId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setCopiedGatewayId(null);
      setBusyGatewayId(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const { total, running, issues } = summarizeCodexInstanceGateways(gateways);

  const kindLabel = (kind: CodexInstanceGatewayView["kind"]) => {
    switch (kind) {
      case "mixedModel":
        return t("codex.instanceGateways.kindMixedModel", "Định tuyến nhiều mô hình");
      case "boundOauth":
        return t("codex.instanceGateways.kindBoundOauth", "Cổng OAuth cục bộ");
      default:
        return t("codex.instanceGateways.kindProviderGateway", "Cổng nhà cung cấp");
    }
  };

  const statusLabel = (status: CodexInstanceGatewayStatus) => {
    switch (status) {
      case "running":
        return t("codex.localAccess.statusRunning", "Đang chạy");
      case "unreachable":
        return t("codex.instanceGateways.statusUnreachable", "Đã khởi động nhưng không truy cập được");
      case "portConflict":
        return t("codex.instanceGateways.statusPortConflict", "Cổng đang bị chiếm");
      case "notStarted":
        return t("codex.instanceGateways.statusNotStarted", "Chưa khởi động");
      default:
        return t("codex.localAccess.statusStopped", "Đã dừng");
    }
  };

  const handleCopyAddress = async (
    gateway: CodexInstanceGatewayView,
  ): Promise<void> => {
    const address = gateway.baseUrl?.trim();
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopiedGatewayId(gateway.id);
      window.setTimeout(() => {
        setCopiedGatewayId((current) =>
          current === gateway.id ? null : current,
        );
      }, 1200);
    } catch (copyError) {
      console.error("Failed to copy gateway address:", copyError);
    }
  };

  const handleGatewayAction = async (
    gateway: CodexInstanceGatewayView,
    action?: (gateway: CodexInstanceGatewayView) => Promise<boolean>,
  ): Promise<void> => {
    if (!action || busyGatewayId) return;
    setBusyGatewayId(gateway.id);
    try {
      await action(gateway);
    } finally {
      setBusyGatewayId(null);
    }
  };

  return (
    <div className="modal-overlay codex-instance-gateways-overlay">
      <div
        className="modal codex-instance-gateways-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="codex-instance-gateways-title"
      >
        <div className="modal-header codex-instance-gateways-header">
          <div>
            <div className="codex-instance-gateways-title-row">
              <Waypoints size={18} />
              <h3 id="codex-instance-gateways-title">
                {t("codex.instanceGateways.title", "Cổng instance")}
              </h3>
            </div>
            <p>
              {t(
                "codex.instanceGateways.subtitle",
                "Cổng cục bộ khởi động cùng các instance Codex",
              )}
            </p>
          </div>
          <div className="codex-instance-gateways-header-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw
                size={14}
                className={loading ? "loading-spinner" : ""}
              />
              <span>{t("common.refresh", "Làm mới")}</span>
            </button>
            <button
              type="button"
              className="folder-icon-btn"
              onClick={onClose}
              title={t("common.close", "Đóng")}
              aria-label={t("common.close", "Đóng")}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="modal-body codex-instance-gateways-body">
          {total > 0 && (
            <div className="codex-instance-gateways-summary">
              {t("codex.instanceGateways.summary", {
                total,
                running,
                issues,
                defaultValue: "Tổng {{total}} · đang chạy {{running}} · bất thường {{issues}}",
              })}
            </div>
          )}
          {error && (
            <div className="codex-instance-gateways-error">
              {t("codex.instanceGateways.loadFailed", "Không tải được cổng instance")}：
              {error}
            </div>
          )}
          {loading && total === 0 && (
            <div className="codex-instance-gateways-empty">
              {t("common.loading", "Đang tải...")}
            </div>
          )}
          {!loading && !error && total === 0 && (
            <div className="codex-instance-gateways-empty">
              <Server size={22} />
              <strong>
                {t("codex.instanceGateways.empty", "Không có cổng cấp instance")}
              </strong>
              <span>
                {t(
                  "codex.instanceGateways.emptyHint",
                  "Chúng sẽ tự xuất hiện sau khi liên kết tài khoản khóa API theo giao thức Chat hoặc bật định tuyến nhiều mô hình.",
                )}
              </span>
            </div>
          )}
          {gateways.map((gateway) => {
            const address = gateway.baseUrl?.trim() || "-";
            const accountLabel = gateway.accountLabel?.trim();
            const displayAccount = accountLabel
              ? maskAccountText
                ? maskAccountText(accountLabel)
                : accountLabel
              : gateway.accountId || "-";
            const instanceLabel = gateway.isDefault
              ? t("instances.defaultName", "Default Instance")
              : gateway.instanceName || gateway.instanceId;
            const models = gateway.upstreamModels.filter(Boolean);
            return (
              <div className="codex-instance-gateways-row" key={gateway.id}>
                <div className="codex-instance-gateways-row-main">
                  <div className="codex-instance-gateways-row-head">
                    <span className="codex-instance-gateways-kind">
                      {kindLabel(gateway.kind)}
                    </span>
                    <strong
                      className="codex-instance-gateways-row-name"
                      title={instanceLabel}
                    >
                      {instanceLabel}
                    </strong>
                    <span
                      className={`codex-instance-gateways-status ${
                        STATUS_TONE[gateway.status] ?? "muted"
                      }`}
                    >
                      {statusLabel(gateway.status)}
                    </span>
                  </div>
                  <dl className="codex-instance-gateways-fields">
                    <div className="codex-instance-gateways-field">
                      <dt>
                        {t("codex.instanceGateways.fieldAccount", "Tài khoản")}
                      </dt>
                      <dd title={displayAccount}>{displayAccount}</dd>
                    </div>
                    <div className="codex-instance-gateways-field">
                      <dt>
                        {t("codex.instanceGateways.fieldAddress", "Địa chỉ cục bộ")}
                      </dt>
                      <dd className="codex-instance-gateways-field-address">
                        <code title={address}>{address}</code>
                        <button
                          type="button"
                          className="folder-icon-btn codex-instance-gateways-copy-btn"
                          onClick={() => void handleCopyAddress(gateway)}
                          disabled={!gateway.baseUrl}
                          title={t("common.copy", "Copy​")}
                          aria-label={t("common.copy", "Copy​")}
                        >
                          {copiedGatewayId === gateway.id ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </dd>
                    </div>
                    {gateway.wireApi && (
                      <div className="codex-instance-gateways-field">
                        <dt>
                          {t("codex.instanceGateways.fieldProtocol", "Giao thức")}
                        </dt>
                        <dd>
                          <span className="codex-instance-gateways-chip">
                            {gateway.wireApi}
                          </span>
                        </dd>
                      </div>
                    )}
                    {models.length > 0 && (
                      <div className="codex-instance-gateways-field">
                        <dt>
                          {t("codex.instanceGateways.fieldModels", "Mô hình nguồn")}
                        </dt>
                        <dd title={models.join(", ")}>
                          {models.slice(0, 2).join(", ")}
                          {models.length > 2 ? ` +${models.length - 2}` : ""}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {gateway.lastError && (
                    <div
                      className="codex-instance-gateways-row-error"
                      title={gateway.lastError}
                    >
                      {gateway.lastError}
                    </div>
                  )}
                </div>
                <div className="codex-instance-gateways-row-actions">
                  {onRestartGateway && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        void handleGatewayAction(gateway, onRestartGateway)
                      }
                      disabled={Boolean(busyGatewayId) || loading}
                      title={t("codex.instanceGateways.restart", "Khởi động lại")}
                    >
                      <RefreshCw
                        size={14}
                        className={
                          busyGatewayId === gateway.id ? "loading-spinner" : ""
                        }
                      />
                      <span>
                        {t("codex.instanceGateways.restart", "Khởi động lại")}
                      </span>
                    </button>
                  )}
                  {onStopGateway && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        void handleGatewayAction(gateway, onStopGateway)
                      }
                      disabled={Boolean(busyGatewayId) || loading}
                      title={t("codex.instanceGateways.stop", "Dừng")}
                    >
                      <Power size={14} />
                      <span>{t("codex.instanceGateways.stop", "Dừng")}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CodexInstanceGatewaysModal;
