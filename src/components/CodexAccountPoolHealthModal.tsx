import { useEffect, useMemo, useRef, useState } from "react";
import { CircleAlert, Copy, RefreshCw, ShieldCheck, X } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "react-i18next";
import type { CodexAccount } from "../types/codex";
import type {
  CodexLocalAccessAccountHealth,
  CodexLocalAccessAccountPoolHealth,
  CodexLocalAccessAccountCooldown,
} from "../types/codexLocalAccess";
import { buildCodexAccountPresentation } from "../presentation/platformAccountPresentation";
import { isBlockingCodexAccountQuotaError } from "../utils/codexQuotaError";
import { resolveCodexHealthIssueDisplayName } from "../utils/codexAccountDisplayName";
import {
  codexAccountPoolDiagnosticReason,
  codexAccountPoolFailureKey,
  codexAccountPoolInspectionLabel,
  codexAccountPoolScopeDisplayName,
  codexAccountPoolScopeReasonKey,
} from "../utils/codexAccountPoolDiagnostic";
import { requestCodexApiKeyInspection } from "../utils/codexApiKeyInspection";
import { clearCodexLocalAccessPoolFailure } from "../services/codexLocalAccessService";
import {
  ModalErrorMessage,
  useModalErrorState,
} from "./ModalErrorMessage";
import "./CodexAccountPoolHealthModal.css";

interface CodexAccountPoolHealthModalProps {
  isOpen: boolean;
  accountIds: string[];
  accounts: CodexAccount[];
  accountHealth: CodexLocalAccessAccountHealth[];
  accountPoolHealth: CodexLocalAccessAccountPoolHealth[];
  /** 手动恢复后仍在抑制窗口内的账号，暂时不显示这些账号的异常行。 */
  recoverySuppressedAccountIds?: string[];
  actionBusy: boolean;
  maskAccountText?: (value: string) => string;
  onClose: () => void;
  onRecover: (accountId: string) => Promise<void>;
  onRecoverAll: (accountIds: string[]) => Promise<void>;
  /** 凭据类失败（auth_unavailable / 401）需要重新走官方登录，恢复调度状态无法修复。 */
  onReauthorize?: (accountId: string) => void;
}

type HealthIssueKind =
  | "missing"
  | "cooldown"
  | "auth"
  | "quota"
  | "unavailable";

interface HealthIssue {
  accountId: string;
  displayName: string;
  planLabel: string | null;
  planClass: string | null;
  quotaItems: Array<{ key: string; label: string; valueText: string; quotaClass: string }>;
  kind: HealthIssueKind;
  health: CodexLocalAccessAccountHealth | null;
}

function resolveIssueDisplayName(
  account: CodexAccount | undefined,
  health: CodexLocalAccessAccountHealth | null,
  accountId: string,
): string {
  return resolveCodexHealthIssueDisplayName(
    account?.account_name,
    account?.email,
    health?.email,
    accountId,
  );
}

function issueKindForHealth(
  account: CodexAccount | undefined,
  health: CodexLocalAccessAccountHealth | null,
): HealthIssueKind | null {
  if (!account) return "missing";
  if (health?.cooldowns?.length) return "cooldown";
  if (
    health?.schedulerReason === "unauthorized" ||
    health?.lastFailureCategory === "auth_unavailable" ||
    health?.lastFailureCategory === "auth_refresh_failed"
  ) {
    return "auth";
  }
  if (
    health?.schedulerReason === "quota" ||
    isBlockingCodexAccountQuotaError(account)
  ) {
    return "quota";
  }
  if (health?.schedulerAvailable === false || health?.available === false) {
    return "unavailable";
  }
  return null;
}

function hasQuotaCooldown(
  health: CodexLocalAccessAccountHealth | null,
): boolean {
  return Boolean(
    health?.cooldowns.some((cooldown) =>
      cooldown.reason.trim().toLowerCase().includes("quota"),
    ) || health?.schedulerReason?.trim().toLowerCase().includes("quota"),
  );
}

function formatCooldown(
  cooldown: CodexLocalAccessAccountCooldown,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  const model = cooldown.modelId.trim() || t("common.unknown", "未知模型");
  if (!cooldown.nextRetryAt) {
    return t("codex.localAccess.accountPoolHealth.dialog.cooldownModel", {
      model,
      defaultValue: "Mô hình {{model}} đang chờ",
    });
  }
  const time = new Date(cooldown.nextRetryAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return t("codex.localAccess.accountPoolHealth.dialog.cooldownUntil", {
    model,
    time,
    defaultValue: "Mô hình {{model}} chờ đến {{time}}",
  });
}

type PoolMemberStatus =
  CodexLocalAccessAccountPoolHealth["accountStatuses"][number];

function isRecoverableReason(reason: string | null | undefined): boolean {
  return ![
    "disabled",
    "missing",
    "quota_reserved",
    "model_excluded",
    "model_disabled",
    "model_not_supported",
    "model_not_available",
    "not_found",
    "image_policy_blocked",
    "pool_unavailable",
    "auth_not_found",
  ].includes(reason?.trim().toLowerCase() ?? "");
}

function poolMemberIssueKind(member: PoolMemberStatus): HealthIssueKind {
  if (member.available) return "unavailable";
  const code = member.reasonCode.trim().toLowerCase();
  if (code.includes("cooldown")) return "cooldown";
  if (
    code.includes("auth") ||
    code.includes("token") ||
    code.includes("unauthorized")
  ) {
    return "auth";
  }
  if (code.includes("quota")) return "quota";
  if (code === "missing") return "missing";
  return "unavailable";
}

export function CodexAccountPoolHealthModal({
  isOpen,
  accountIds,
  accounts,
  accountHealth,
  accountPoolHealth,
  recoverySuppressedAccountIds,
  actionBusy,
  maskAccountText,
  onClose,
  onRecover,
  onRecoverAll,
  onReauthorize,
}: CodexAccountPoolHealthModalProps) {
  const { t, i18n } = useTranslation();
  const {
    message: recoveryError,
    scrollKey: recoveryErrorScrollKey,
    set: setRecoveryError,
  } = useModalErrorState();
  const [recoveringAccountIds, setRecoveringAccountIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [recoveringAll, setRecoveringAll] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const recoveryInFlightRef = useRef(false);
  const clearInFlightRef = useRef(false);
  const [clearingPoolKey, setClearingPoolKey] = useState<string | null>(null);
  const [clearedPoolKeys, setClearedPoolKeys] = useState<Set<string>>(() => new Set());
  const submittedRecoveryAccountIdsRef = useRef<Set<string>>(new Set());
  const suppressedAccountIds = useMemo(
    () =>
      new Set(
        (recoverySuppressedAccountIds ?? [])
          .map((accountId) => accountId.trim())
          .filter(Boolean),
      ),
    [recoverySuppressedAccountIds],
  );
  const visiblePools = useMemo(
    () => accountPoolHealth.filter((pool) => {
      if (clearedPoolKeys.has(codexAccountPoolFailureKey(pool))) return false;
      const members = (pool.accountStatuses ?? []).filter((member) => member.accountId.trim());
      return members.length === 0 || members.some((member) => !suppressedAccountIds.has(member.accountId.trim()));
    }),
    [accountPoolHealth, clearedPoolKeys, suppressedAccountIds],
  );
  // A selection failure without member diagnostics belongs to the pool. It
  // does not prove that any selected account supports or attempted the model.
  const poolMemberStatuses = useMemo(
    () =>
      visiblePools.map((pool) =>
        (pool.accountStatuses ?? []).filter((member) => member.accountId.trim()),
      ),
    [visiblePools],
  );
  const issues = useMemo<HealthIssue[]>(() => {
    const accountsById = new Map(accounts.map((account) => [account.id, account]));
    const healthById = new Map(
      accountHealth.map((health) => [health.accountId, health]),
    );
    return accountIds.flatMap((accountId) => {
      const account = accountsById.get(accountId);
      const health = healthById.get(accountId) ?? null;
      const kind = issueKindForHealth(account, health);
      if (!kind) return [];
      const rawName = resolveIssueDisplayName(account, health, accountId);
      const displayName = maskAccountText ? maskAccountText(rawName) : rawName;
      const presentation = account
        ? buildCodexAccountPresentation(account, t)
        : null;
      return [{
        accountId,
        displayName,
        planLabel: presentation?.planLabel?.trim() || null,
        planClass: presentation?.planClass || null,
        quotaItems: (presentation?.quotaItems ?? [])
          .filter((item) => item.valueText.trim().length > 0)
          .slice(0, 3)
          .map((item) => ({
            key: item.key,
            label: item.label,
            valueText: item.valueText,
            quotaClass: item.quotaClass,
          })),
        kind,
        health,
      }];
    });
  }, [accountHealth, accountIds, accounts, maskAccountText, t]);
  // 恢复现在会立即返回、重活在后台继续跑；后台失败必须回到当前弹框内提示，
  // 不能只停留在日志或提示“已提交”。
  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<{ accountIds?: string[]; status?: string; error?: string }>(
      "codex-local-access-recovery-result",
      (event) => {
        const payload = event.payload ?? {};
        const accountIds = Array.isArray(payload.accountIds)
          ? payload.accountIds.filter((accountId) => typeof accountId === "string")
          : [];
        const submitted = submittedRecoveryAccountIdsRef.current;
        const matched = accountIds.filter((accountId) => submitted.has(accountId));
        if (matched.length === 0) return;
        if (payload.status === "failed") {
          const errorText =
            typeof payload.error === "string" ? payload.error.trim() : "";
          setRecoveryError(
            t("messages.actionFailed", {
              action: t(
                "codex.localAccess.accountPoolHealth.recover",
                "Khôi phục trạng thái",
              ),
              error: errorText || t("common.failed", "Thất bại"),
              defaultValue: "{{action}} thất bại: {{error}}",
            }),
          );
          return;
        }
        setRecoverySuccess(
          t("codex.localAccess.accountPoolHealth.recoverSuccess", {
            count: matched.length,
            defaultValue: "Đã yêu cầu khôi phục {{count}} tài khoản",
          }),
        );
      },
    ).then((cleanup) => {
      if (disposed) cleanup();
      else unlisten = cleanup;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [t, setRecoveryError, setRecoverySuccess]);

  if (!isOpen) return null;

  const issueLabel = (kind: HealthIssueKind): string => {
    switch (kind) {
      case "missing":
        return t("codex.localAccess.accountPoolHealth.dialog.missing", "Thiếu tài khoản");
      case "cooldown":
        return t("codex.localAccess.accountPoolHealth.dialog.cooldown", "Đang chờ");
      case "auth":
        return t("codex.apiService.accountHealth.authError", "Lỗi xác thực");
      case "quota":
        return t("codex.localAccess.accountPoolHealth.dialog.quota", "Giới hạn hạn mức");
      default:
        return t("codex.apiService.accountHealth.unavailable", "Tạm thời không khả dụng");
    }
  };

  const issueDetails = (issue: HealthIssue): string => {
    if (issue.kind === "missing") {
      return t(
        "codex.localAccess.accountPoolHealth.dialog.missingDetail",
        "Tài khoản không còn trong danh sách",
      );
    }
    if (issue.kind === "cooldown" && issue.health) {
      if (hasQuotaCooldown(issue.health)) {
        return t(
          "codex.localAccess.accountPoolHealth.dialog.quotaDetail",
          "Hạn mức tạm thời không khả dụng. Hãy chờ hoặc kiểm tra gói.",
        );
      }
      return issue.health.cooldowns
        .map((cooldown) => formatCooldown(cooldown, t))
        .join(" · ");
    }
    if (issue.kind === "auth") {
      return t(
        "codex.localAccess.accountPoolHealth.dialog.authDetail",
        "Ủy quyền OAuth có thể đã hết hạn. Hãy ủy quyền lại.",
      );
    }
    if (issue.kind === "quota") {
      return t(
        "codex.localAccess.accountPoolHealth.dialog.quotaDetail",
        "Hạn mức tạm thời không khả dụng. Hãy chờ hoặc kiểm tra gói.",
      );
    }
    switch (issue.health?.schedulerReason) {
      case "payment_required":
        return t(
          "codex.localAccess.accountPoolHealth.dialog.paymentDetail",
          "Gói hoặc trạng thái thanh toán không khả dụng. Hãy kiểm tra đăng ký.",
        );
      case "not_found":
      case "model_not_supported":
      case "model_not_available":
        return t(
          "codex.localAccess.accountPoolHealth.dialog.modelDetail",
          "Tài khoản không hỗ trợ mô hình được yêu cầu.",
        );
      case "transient_upstream":
        return t(
          "codex.localAccess.accountPoolHealth.dialog.upstreamDetail",
          "Dịch vụ thượng nguồn tạm thời lỗi. Sẽ thử lại sau khi phục hồi.",
        );
      case "disabled":
        return t(
          "codex.localAccess.accountPoolHealth.dialog.disabledDetail",
          "Tài khoản đã bị tắt. Hãy bật trước.",
        );
    }
    return t(
      "codex.localAccess.accountPoolHealth.dialog.unavailableDetail",
      "Sidecar hiện không xem tài khoản này là có thể lập lịch.",
    );
  };

  const poolMemberAccountIds = new Set(
    poolMemberStatuses.flatMap((members) =>
      members
        .map((member) => member.accountId.trim())
        .filter(Boolean),
    ),
  );
  const visibleAccountIssues = issues.filter(
    (issue) =>
      !poolMemberAccountIds.has(issue.accountId) &&
      !suppressedAccountIds.has(issue.accountId),
  );
  const hasVisibleIssues =
    visiblePools.length > 0 ||
    visibleAccountIssues.length > 0 ||
    poolMemberStatuses.some((members) =>
      members.some((member) => !suppressedAccountIds.has(member.accountId.trim())),
    );
  const recoverableAccountIds = visibleAccountIssues
    .filter(
      (issue) =>
        issue.kind !== "missing" &&
        !(issue.kind === "auth" && onReauthorize) &&
        isRecoverableReason(issue.health?.schedulerReason),
    )
    .map((issue) => issue.accountId);
  const isRecoverable = (issue: HealthIssue) =>
    recoverableAccountIds.includes(issue.accountId);
  const isPoolMemberRecoverable = (
    member: CodexLocalAccessAccountPoolHealth["accountStatuses"][number],
  ): boolean => {
    return (
      Boolean(member.accountId.trim()) &&
      !member.available &&
      !suppressedAccountIds.has(member.accountId.trim()) &&
      !(poolMemberIssueKind(member) === "auth" && onReauthorize) &&
      isRecoverableReason(member.reasonCode)
    );
  };
  const poolMemberRecoveryIds = Array.from(
    new Set(
      poolMemberStatuses.flatMap((members) =>
        members
          .filter(isPoolMemberRecoverable)
          .map((member) => member.accountId.trim())
          .filter(Boolean),
      ),
    ),
  );
  const runRecovery = async (
    accountIds: string[],
    source: "single" | "all",
  ) => {
    const normalizedAccountIds = Array.from(
      new Set(accountIds.map((accountId) => accountId.trim()).filter(Boolean)),
    );
    if (normalizedAccountIds.length === 0 || recoveryInFlightRef.current || clearInFlightRef.current) {
      return;
    }
    recoveryInFlightRef.current = true;
    for (const accountId of normalizedAccountIds) {
      submittedRecoveryAccountIdsRef.current.add(accountId);
    }
    setRecoveryError(null);
    setRecoverySuccess(null);
    setRecoveringAccountIds(new Set(normalizedAccountIds));
    setRecoveringAll(source === "all");
    try {
      if (normalizedAccountIds.length === 1) {
        await onRecover(normalizedAccountIds[0]);
      } else {
        await onRecoverAll(normalizedAccountIds);
      }
      setRecoverySuccess(
        t("codex.localAccess.accountPoolHealth.recoverSuccess", {
          count: normalizedAccountIds.length,
          defaultValue: "Đã yêu cầu khôi phục {{count}} tài khoản",
        }),
      );
    } catch (error) {
      setRecoveryError(String(error).replace(/^Error:\s*/, ""));
    } finally {
      recoveryInFlightRef.current = false;
      setRecoveringAccountIds(new Set());
      setRecoveringAll(false);
    }
  };
  const clearPoolRecord = async (pool: CodexLocalAccessAccountPoolHealth) => {
    if (clearInFlightRef.current || recoveryInFlightRef.current || actionBusy) return;
    const key = codexAccountPoolFailureKey(pool);
    clearInFlightRef.current = true;
    setClearingPoolKey(key);
    setRecoveryError(null);
    setRecoverySuccess(null);
    try {
      const cleared = await clearCodexLocalAccessPoolFailure(pool.apiKeyId, pool.lastFailureAt);
      window.dispatchEvent(new Event("codex-local-access-state-updated"));
      if (!cleared) {
        setRecoveryError(t("codex.localAccess.accountPoolHealth.dialog.clearStale"));
        return;
      }
      setClearedPoolKeys((previous) => new Set([...previous, key]));
      setRecoverySuccess(t("codex.localAccess.accountPoolHealth.dialog.clearSuccess"));
    } catch (error) {
      setRecoveryError(t("codex.localAccess.accountPoolHealth.dialog.clearFailed", {
        error: String(error).replace(/^Error:\s*/, ""),
      }));
    } finally {
      clearInFlightRef.current = false;
      setClearingPoolKey(null);
    }
  };
  const handleClose = () => {
    setRecoveryError(null);
    setRecoverySuccess(null);
    onClose();
  };
  const copyRequestId = async (requestId: string) => {
    setRecoveryError(null);
    setRecoverySuccess(null);
    try {
      await navigator.clipboard.writeText(requestId);
      setRecoverySuccess(t("common.copied"));
    } catch (error) {
      setRecoveryError(t("messages.actionFailed", {
        action: t("common.copy"),
        error: String(error).replace(/^Error:\s*/, ""),
      }));
    }
  };
  const inspectPoolConfiguration = (pool: CodexLocalAccessAccountPoolHealth) => {
    handleClose();
    requestCodexApiKeyInspection({ apiKeyId: pool.apiKeyId, requestKind: pool.requestKind });
  };

  return (
    <div className="modal-overlay codex-account-pool-health-overlay">
      <div
        className="modal codex-account-pool-health-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="codex-account-pool-health-title"
      >
        <div className="modal-header codex-account-pool-health-header">
          <div>
            <div className="codex-account-pool-health-title-row">
              <CircleAlert size={18} />
              <h3 id="codex-account-pool-health-title">
                {t(
                  "codex.localAccess.accountPoolHealth.dialog.title",
                  "Lỗi tài khoản",
                )}
              </h3>
            </div>
            <p>
              {t(
                "codex.localAccess.accountPoolHealth.dialog.description",
                "Hiển thị sự cố của nhóm tài khoản và từng tài khoản. Chỉ cung cấp thao tác tài khoản khi lỗi được xác định thuộc tài khoản đó.",
              )}
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={handleClose}
            aria-label={t("common.close", "Đóng")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body codex-account-pool-health-body">
          <ModalErrorMessage
            message={recoveryError}
            scrollKey={recoveryErrorScrollKey}
          />
          {recoverySuccess && (
            <div
              className="codex-account-pool-health-success"
              role="status"
              aria-live="polite"
            >
              <ShieldCheck size={15} />
              <span>{recoverySuccess}</span>
            </div>
          )}
          {!hasVisibleIssues ? (
            <div className="codex-account-pool-health-empty">
              <ShieldCheck size={24} />
              <span>
                {t(
                  "codex.localAccess.accountPoolHealth.dialog.noIssues",
                  "Không có vấn đề cần hiển thị",
                )}
              </span>
            </div>
          ) : (
            <div className="codex-account-pool-health-list">
              {visiblePools.map((health, index) => (
                <div
                  className="codex-account-pool-health-item is-unavailable"
                  key={`pool:${codexAccountPoolFailureKey(health)}`}
                >
                  <div className="codex-account-pool-health-item-primary">
                    <div className="codex-account-pool-health-item-identity">
                      <strong>
                        {t(
                          "codex.localAccess.accountPoolHealth.dialog.poolUnavailable",
                          "Không có tài khoản khả dụng trong nhóm",
                        )}
                      </strong>
                      {health.model.trim() && (
                        <span className="codex-account-pool-health-model-pill">
                          {health.model.trim()}
                        </span>
                      )}
                      {health.errorCode.trim() && <code>{health.errorCode}</code>}
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => inspectPoolConfiguration(health)}
                    >
                      {t(codexAccountPoolInspectionLabel(health))}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={actionBusy || recoveringAccountIds.size > 0 || clearingPoolKey !== null}
                      onClick={() => void clearPoolRecord(health)}
                      title={t("codex.localAccess.accountPoolHealth.dialog.clearHint")}
                    >
                      {clearingPoolKey === codexAccountPoolFailureKey(health)
                        ? t("common.clearingRecord")
                        : t("common.clearRecord")}
                    </button>
                  </div>
                  <p className="codex-account-pool-health-item-detail">
                    {health.apiKeyLabel.trim()
                      ? (maskAccountText ? maskAccountText(health.apiKeyLabel) : health.apiKeyLabel)
                      : t("codex.localAccess.accountPoolHealth.dialog.unscopedApiKey", "API Key hiện tại")}
                    {" · "}
                    {t("codex.localAccess.accountPoolHealth.dialog.poolUnavailableDetail", {
                      model: health.model.trim() || t("common.unknown", "未知模型"),
                      defaultValue: "Không chọn được tài khoản khả dụng cho mô hình {{model}}",
                    })}
                  </p>
                  <p className="codex-account-pool-health-item-detail">
                    {t(codexAccountPoolDiagnosticReason(health).key, codexAccountPoolDiagnosticReason(health).values)}
                  </p>
                  <p className="codex-account-pool-health-item-detail">
                    {t("common.failureTime")}{": "}
                    <time dateTime={new Date(health.lastFailureAt).toISOString()}>
                      {new Date(health.lastFailureAt).toLocaleString(i18n?.language)}
                    </time>
                  </p>
                  {health.requestId?.trim() && (
                    <div className="codex-account-pool-health-request">
                      <span>{t("common.requestId")}{": "}<code>{health.requestId.trim()}</code></span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => void copyRequestId(health.requestId!.trim())}
                        aria-label={`${t("common.copy")} ${t("common.requestId")}`}
                      >
                        <Copy size={12} />{t("common.copy")}
                      </button>
                    </div>
                  )}
                  {(health.scopeDiagnostics ?? []).map((diagnostic, diagnosticIndex) => {
                    const rawName = codexAccountPoolScopeDisplayName(
                      diagnostic,
                      accounts,
                      t("codex.localAccess.accountPoolHealth.dialog.unmappedAccount"),
                      (id) => t("codex.localAccess.accountPoolHealth.dialog.accountReference", { id }),
                    );
                    const displayName = maskAccountText ? maskAccountText(rawName) : rawName;
                    return (
                      <p className="codex-account-pool-health-item-detail" key={`scope:${diagnosticIndex}`}>
                        <strong>{displayName}</strong>{" · "}
                        {t(codexAccountPoolScopeReasonKey(diagnostic.reasonCode))}
                      </p>
                    );
                  })}
                  {poolMemberStatuses[index].length === 0 && (health.scopeDiagnostics?.length ?? 0) === 0 && (
                    <p className="codex-account-pool-health-item-detail">
                      {t("codex.localAccess.accountPoolHealth.dialog.poolUnattributedDetail")}
                    </p>
                  )}
                  <p className="codex-account-pool-health-item-detail">
                    {t("codex.localAccess.accountPoolHealth.dialog.clearHint")}
                  </p>
                  {health.diagnosticAvailable && (
                    <p className="codex-account-pool-health-item-detail">
                      {t("codex.localAccess.accountPoolHealth.dialog.poolDiagnosticDetail", {
                        model: health.model.trim() || t("common.unknown", "未知模型"),
                        candidate: health.candidateAuths,
                        scoped: health.scopedAuths,
                        available: health.availableAuths,
                        unavailable: health.unavailableAuths,
                        modelExcluded: health.modelExcludedAuths,
                        quotaReserved: health.quotaReservedAuths,
                        imageBlocked: health.imagePolicyBlockedAuths,
                      })}
                    </p>
                  )}
                </div>
              ))}
              {visiblePools.flatMap((health, healthIndex) =>
                (poolMemberStatuses[healthIndex] ?? [])
                  .filter(
                    (member) =>
                      !suppressedAccountIds.has(member.accountId.trim()),
                  )
                  .map((member) => {
                    const account = accounts.find(
                      (item) => item.id === member.accountId,
                    );
                    const rawName = resolveIssueDisplayName(
                      account,
                      null,
                      member.accountEmail || member.accountId,
                    );
                    const displayName = maskAccountText
                      ? maskAccountText(rawName)
                      : rawName;
                    const presentation = account
                      ? buildCodexAccountPresentation(account, t)
                      : null;
                    const recoverable = isPoolMemberRecoverable(member);
                    const recovering = recoveringAccountIds.has(member.accountId);
                    const memberKind = poolMemberIssueKind(member);
                    return (
                      <div
                        className={`codex-account-pool-health-item is-${member.available ? "available" : memberKind}`}
                        key={`${healthIndex}:${health.apiKeyId || "__unscoped__"}:${health.model}:${member.accountId}`}
                      >
                        <div className="codex-account-pool-health-item-primary">
                          <div className="codex-account-pool-health-item-identity">
                            <strong title={displayName}>{displayName}</strong>
                            {presentation?.planLabel && (
                              <span
                                className={`tier-badge ${presentation.planClass || "unknown"}`}
                              >
                                {presentation.planLabel}
                              </span>
                            )}
                            {health.model.trim() && (
                              <span className="codex-account-pool-health-model-pill">
                                {health.model.trim()}
                              </span>
                            )}
                            <span className="codex-account-pool-health-item-status">
                              {member.available
                                ? t("codex.apiService.health.availableAccounts", "Tài khoản khả dụng")
                                : issueLabel(memberKind)}
                            </span>
                            {member.reasonCode.trim() && (
                              <code>{member.reasonCode}</code>
                            )}
                          </div>
                          {memberKind === "auth" && onReauthorize ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => onReauthorize(member.accountId)}
                              title={t(
                                "codex.localAccess.accountPoolHealth.dialog.reauthorizeHint",
                                "Thông tin xác thực của tài khoản không còn hợp lệ; hãy đăng nhập chính thức lại. Chỉ đặt lại bộ lập lịch sẽ không khắc phục được.",
                              )}
                            >
                              <RefreshCw size={13} />
                              {t("common.reauthorize", "Ủy quyền lại")}
                            </button>
                          ) : recoverable ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                void runRecovery([member.accountId], "single")
                              }
                              disabled={actionBusy || recoveringAccountIds.size > 0 || clearingPoolKey !== null}
                            >
                              <RefreshCw
                                size={13}
                                className={recovering ? "loading-spinner" : undefined}
                              />
                              {recovering
                                ? t(
                                    "codex.localAccess.accountPoolHealth.dialog.recovering",
                                    "Đang khôi phục…",
                                  )
                                : t(
                                    "codex.localAccess.accountPoolHealth.dialog.recover",
                                    "Khôi phục",
                                  )}
                            </button>
                          ) : null}
                        </div>
                        {member.reasonMessage.trim() && (
                          <p className="codex-account-pool-health-item-detail">
                            {member.reasonMessage}
                          </p>
                        )}
                      </div>
                    );
                  }),
                )}
              {visibleAccountIssues.map((issue) => (
                <div
                  className={`codex-account-pool-health-item is-${issue.kind}`}
                  key={issue.accountId}
                >
                  <div className="codex-account-pool-health-item-primary">
                    <div className="codex-account-pool-health-item-identity">
                      <strong title={issue.displayName}>{issue.displayName}</strong>
                      {issue.planLabel && (
                        <span
                          className={`tier-badge ${issue.planClass || "unknown"}`}
                        >
                          {issue.planLabel}
                        </span>
                      )}
                      {issue.quotaItems.map((item) => (
                        <span
                          key={item.key}
                          className={`codex-account-pool-health-quota-pill quota-${item.quotaClass}`}
                          title={`${item.label} ${item.valueText}`}
                        >
                          <span className="codex-account-pool-health-quota-label">
                            {item.label}
                          </span>
                          <span className="codex-account-pool-health-quota-value">
                            {item.valueText}
                          </span>
                        </span>
                      ))}
                      <span className="codex-account-pool-health-item-status">
                        {issueLabel(issue.kind)}
                      </span>
                    </div>
                    {issue.kind === "auth" && onReauthorize ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => onReauthorize(issue.accountId)}
                        title={t(
                          "codex.localAccess.accountPoolHealth.dialog.reauthorizeHint",
                          "Thông tin xác thực của tài khoản không còn hợp lệ; hãy đăng nhập chính thức lại. Chỉ đặt lại bộ lập lịch sẽ không khắc phục được.",
                        )}
                      >
                        <RefreshCw size={13} />
                        {t("common.reauthorize", "Ủy quyền lại")}
                      </button>
                    ) : isRecoverable(issue) ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          void runRecovery([issue.accountId], "single")
                        }
                        disabled={actionBusy || recoveringAccountIds.size > 0 || clearingPoolKey !== null}
                      >
                        <RefreshCw
                          size={14}
                          className={
                            recoveringAccountIds.has(issue.accountId)
                              ? "loading-spinner"
                              : undefined
                          }
                        />
                        {recoveringAccountIds.has(issue.accountId)
                          ? t(
                              "codex.localAccess.accountPoolHealth.dialog.recovering",
                              "Đang khôi phục…",
                            )
                          : t(
                              "codex.localAccess.accountPoolHealth.dialog.recover",
                              "Khôi phục",
                            )}
                      </button>
                    ) : null}
                  </div>
                  <p className="codex-account-pool-health-item-detail">
                    {issueDetails(issue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer codex-account-pool-health-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
          >
            {t("common.close", "Đóng")}
          </button>
          {(recoverableAccountIds.length > 0 ||
            poolMemberRecoveryIds.length > 0) && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                void runRecovery(
                  Array.from(
                    new Set([...recoverableAccountIds, ...poolMemberRecoveryIds]),
                  ),
                  "all",
                )
              }
              disabled={actionBusy || recoveringAccountIds.size > 0 || clearingPoolKey !== null}
            >
              <RefreshCw
                size={15}
                className={recoveringAll ? "loading-spinner" : undefined}
              />
              {recoveringAll
                ? t(
                    "codex.localAccess.accountPoolHealth.dialog.recovering",
                    "Đang khôi phục…",
                  )
                : t(
                    "codex.localAccess.accountPoolHealth.dialog.recoverAll",
                    "Khôi phục tất cả",
                  )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
