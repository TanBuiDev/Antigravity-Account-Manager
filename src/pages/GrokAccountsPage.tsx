import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  CircleAlert,
  Copy,
  FolderOpen,
  KeyRound,
  Play,
  X,
} from "lucide-react";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";
import { ModalErrorMessage } from "../components/ModalErrorMessage";
import { SingleSelectDropdown } from "../components/SingleSelectDropdown";
import {
  PlatformOverviewTabsHeader,
  type PlatformOverviewTab,
} from "../components/platform/PlatformOverviewTabsHeader";
import {
  CodebuddySuiteAccountsSharedView,
  type CodebuddySuiteAccountsPlatformConfig,
} from "../components/codebuddy-suite/CodebuddySuiteAccountsSharedView";
import { useProviderAccountsPage } from "../hooks/useProviderAccountsPage";
import { useEscClose } from "../hooks/useEscClose";
import { useLaunchTerminalOptions } from "../hooks/useLaunchTerminalOptions";
import * as grokInstanceService from "../services/grokInstanceService";
import * as grokService from "../services/grokService";
import { useGrokAccountStore } from "../stores/useGrokAccountStore";
import {
  formatGrokQuotaResetTime,
  formatGrokQuotaUsedTotal,
  getGrokAccountDisplayEmail,
  getGrokPlanBadge,
  getGrokPlanRawValue,
  getGrokQuotaClass,
  getGrokQuotaGroups,
  getGrokQuotaSummaryItems,
  getGrokUsage,
  hasGrokQuotaData,
  isGrokApiKeyAccount,
  type GrokAccount,
} from "../types/grok";
import { GrokInstancesContent } from "./GrokInstancesPage";

const FLOW_NOTICE_KEY = "agtools.grok.flow_notice_collapsed";
const CURRENT_ACCOUNT_KEY = "agtools.grok.current_account_id";
const GROK_CLI_INSTALL_COMMAND_UNIX =
  "curl -fsSL https://x.ai/cli/install.sh | bash";
const GROK_CLI_INSTALL_COMMAND_WINDOWS =
  "irm https://x.ai/cli/install.ps1 | iex";

function getGrokCliInstallCommand(): string {
  if (typeof navigator === "undefined") {
    return GROK_CLI_INSTALL_COMMAND_UNIX;
  }
  const platform = `${navigator.platform || ""} ${navigator.userAgent || ""}`;
  return /win/i.test(platform)
    ? GROK_CLI_INSTALL_COMMAND_WINDOWS
    : GROK_CLI_INSTALL_COMMAND_UNIX;
}

function isValidGrokApiBaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      !!parsed.hostname &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

function getGrokReauthorizationReason(account: GrokAccount): string | null {
  if (isGrokApiKeyAccount(account)) return null;
  const reason = account.status_reason?.trim() || "";
  const normalized = `${account.status || ""} ${reason}`.toLowerCase();
  if (
    account.status === "reauth_required" ||
    normalized.includes("invalid_grant") ||
    normalized.includes("refresh token has been revoked") ||
    normalized.includes("refresh_token 为空") ||
    normalized.includes("access_denied")
  ) {
    return reason || "invalid_grant";
  }
  return null;
}

interface GrokAccountLaunchModalState {
  instanceId: string;
  accountId: string;
  accountEmail: string;
  workingDir: string;
  launchCommand: string;
  regeneratingCommand: boolean;
  copied: boolean;
  executing: boolean;
  executeMessage: string | null;
  executeError: string | null;
  errorScrollKey: number;
}

type GrokApiProviderMode = "official" | "custom";

export function GrokAccountsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<PlatformOverviewTab>("overview");
  const [launchModal, setLaunchModal] =
    useState<GrokAccountLaunchModalState | null>(null);
  const { terminalOptions, selectedTerminal, setSelectedTerminal } =
    useLaunchTerminalOptions();
  const grokCliInstallCommand = useMemo(() => getGrokCliInstallCommand(), []);
  const [installCommandCopied, setInstallCommandCopied] = useState(false);
  const [installExecuting, setInstallExecuting] = useState(false);
  const [installOpened, setInstallOpened] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installErrorScrollKey, setInstallErrorScrollKey] = useState(0);
  const [apiProviderMode, setApiProviderMode] =
    useState<GrokApiProviderMode>("official");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiModel, setApiModel] = useState("");
  const [apiBaseUrlTouched, setApiBaseUrlTouched] = useState(false);
  const [apiModelTouched, setApiModelTouched] = useState(false);
  const store = useGrokAccountStore();
  const [reauthTargetAccount, setReauthTargetAccount] =
    useState<GrokAccount | null>(null);

  useEscClose(!!launchModal, () => setLaunchModal(null));

  const page = useProviderAccountsPage<GrokAccount>({
    platformKey: "grok",
    oauthLogPrefix: "GrokOAuth",
    flowNoticeCollapsedKey: FLOW_NOTICE_KEY,
    currentAccountIdKey: CURRENT_ACCOUNT_KEY,
    exportFilePrefix: "grok_accounts",
    oauthTabKeys: ["oauth"],
    store: {
      accounts: store.accounts,
      currentAccountId: store.currentAccountId,
      loading: store.loading,
      error: store.error,
      fetchAccounts: store.fetchAccounts,
      fetchCurrentAccountId: store.fetchCurrentAccountId,
      deleteAccounts: store.deleteAccounts,
      refreshToken: store.refreshToken,
      refreshAllTokens: store.refreshAllTokens,
      setCurrentAccountId: store.setCurrentAccountId,
      updateAccountTags: store.updateAccountTags,
    },
    oauthService: {
      startLogin: grokService.startGrokOAuthLogin,
      completeLogin: (loginId) =>
        grokService.completeGrokOAuthLogin(
          loginId,
          reauthTargetAccount?.id ?? null,
        ),
      cancelLogin: grokService.cancelGrokOAuthLogin,
    },
    dataService: {
      importFromJson: grokService.importGrokFromJson,
      importFromLocal: grokService.importGrokFromLocal,
      exportAccounts: grokService.exportGrokAccounts,
      injectToVSCode: grokService.switchGrokAccount,
      addWithToken: (apiKey) =>
        grokService.addGrokAccountWithApiKey(
          apiKey,
          apiProviderMode === "custom" ? { apiBaseUrl, apiModel } : undefined,
        ),
    },
    getDisplayEmail: getGrokAccountDisplayEmail,
    onInjectSuccess: async ({ accountId, account, displayEmail }) => {
      const accountEmail = account
        ? getGrokAccountDisplayEmail(account)
        : displayEmail || accountId;
      const workingDir = account?.working_dir?.trim() || "";
      try {
        const launchInfo =
          await grokInstanceService.getGrokInstanceLaunchCommand("__default__", {
            workingDir,
            applyWorkingDirOverride: true,
            accountId,
          });
        setLaunchModal({
          instanceId: launchInfo.instanceId || "__default__",
          accountId,
          accountEmail,
          workingDir,
          launchCommand: launchInfo.launchCommand,
          regeneratingCommand: false,
          copied: false,
          executing: false,
          executeMessage: null,
          // 账号授权类问题只体现在账号列表，启动弹框不展示
          executeError: null,
          errorScrollKey: 0,
        });
        // 后端可能已把 reauth 状态写回账号，刷新列表徽章
        void store.fetchAccounts();
      } catch (error) {
        const message = String(error);
        setLaunchModal({
          instanceId: "__default__",
          accountId,
          accountEmail,
          workingDir,
          launchCommand: "",
          regeneratingCommand: false,
          copied: false,
          executing: false,
          executeMessage: null,
          executeError: grokInstanceService.isGrokReauthError(message)
            ? null
            : message,
          errorScrollKey: grokInstanceService.isGrokReauthError(message) ? 0 : 1,
        });
        if (grokInstanceService.isGrokReauthError(message)) {
          void store.fetchAccounts();
        }
      }
    },
    resolveOauthSuccessMessage: () =>
      t("grok.oauth.success", "Đăng nhập OAuth Grok thành công"),
  });

  useEffect(() => {
    if (!page.showAddModal) {
      setReauthTargetAccount(null);
      setApiProviderMode("official");
      setApiBaseUrl("");
      setApiModel("");
      setApiBaseUrlTouched(false);
      setApiModelTouched(false);
    }
  }, [page.showAddModal]);

  const handleReauthorize = useCallback(
    (account: GrokAccount) => {
      setReauthTargetAccount(account);
      page.openAddModal("oauth");
    },
    [page.openAddModal],
  );

  const persistAccountWorkingDir = useCallback(
    async (accountId: string, workingDir: string) => {
      await grokService.updateGrokAccountWorkingDir(
        accountId,
        workingDir.trim() || null,
      );
      await store.fetchAccounts();
    },
    [store],
  );

  const regenerateLaunchCommand = useCallback(
    async (modal: GrokAccountLaunchModalState, workingDir: string) => {
      setLaunchModal((current) =>
        current && current.accountId === modal.accountId
          ? {
              ...current,
              workingDir,
              regeneratingCommand: true,
              executeError: null,
              executeMessage: null,
            }
          : current,
      );
      try {
        const launchInfo =
          await grokInstanceService.getGrokInstanceLaunchCommand(
            modal.instanceId,
            {
              workingDir,
              applyWorkingDirOverride: true,
              accountId: modal.accountId,
            },
          );
        setLaunchModal((current) =>
          current && current.accountId === modal.accountId
            ? {
                ...current,
                workingDir,
                launchCommand: launchInfo.launchCommand,
                regeneratingCommand: false,
                executeError: null,
              }
            : current,
        );
        void store.fetchAccounts();
      } catch (error) {
        const message = String(error);
        setLaunchModal((current) =>
          current && current.accountId === modal.accountId
            ? {
                ...current,
                workingDir,
                regeneratingCommand: false,
                // 账号授权错误不进启动弹框
                executeError: grokInstanceService.isGrokReauthError(message)
                  ? null
                  : message,
                errorScrollKey: grokInstanceService.isGrokReauthError(message)
                  ? current.errorScrollKey
                  : current.errorScrollKey + 1,
              }
            : current,
        );
        if (grokInstanceService.isGrokReauthError(message)) {
          void store.fetchAccounts();
        }
      }
    },
    [store],
  );

  const updateLaunchWorkingDir = (value: string) => {
    setLaunchModal((current) =>
      current
        ? {
            ...current,
            workingDir: value,
            launchCommand: "",
            executeError: null,
            executeMessage: null,
          }
        : current,
    );
  };

  const handleChooseLaunchWorkingDir = async () => {
    if (!launchModal || launchModal.executing || launchModal.regeneratingCommand)
      return;
    const selected = await openFileDialog({
      directory: true,
      multiple: false,
      title: t("grok.instances.selectWorkingDir", "Chọn thư mục làm việc Grok CLI"),
    });
    if (!selected || typeof selected !== "string") return;
    try {
      await persistAccountWorkingDir(launchModal.accountId, selected);
      await regenerateLaunchCommand(launchModal, selected);
    } catch (error) {
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executeError: String(error),
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
    }
  };

  const handleLaunchWorkingDirBlur = async () => {
    if (!launchModal || launchModal.executing || launchModal.regeneratingCommand)
      return;
    const nextWorkingDir = launchModal.workingDir.trim();
    if (launchModal.launchCommand.trim()) {
      // Command already matches current input unless path changed since last gen.
      // Regenerate when input differs from the last successful bound value.
      const bound =
        store.accounts
          .find((item) => item.id === launchModal.accountId)
          ?.working_dir?.trim() || "";
      if (nextWorkingDir === bound) return;
    }
    try {
      // Preview command only; bind to account on copy/execute or folder pick.
      await regenerateLaunchCommand(launchModal, nextWorkingDir);
    } catch (error) {
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executeError: String(error),
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
    }
  };

  const ensureLaunchCommandReady = async (
    modal: GrokAccountLaunchModalState,
  ): Promise<GrokAccountLaunchModalState | null> => {
    if (modal.launchCommand.trim() && !modal.regeneratingCommand) {
      return modal;
    }
    try {
      await persistAccountWorkingDir(modal.accountId, modal.workingDir);
      const launchInfo = await grokInstanceService.getGrokInstanceLaunchCommand(
        modal.instanceId,
        {
          workingDir: modal.workingDir,
          applyWorkingDirOverride: true,
          accountId: modal.accountId,
        },
      );
      const next: GrokAccountLaunchModalState = {
        ...modal,
        launchCommand: launchInfo.launchCommand,
        regeneratingCommand: false,
        executeError: null,
      };
      setLaunchModal((current) =>
        current && current.accountId === modal.accountId ? next : current,
      );
      return next;
    } catch (error) {
      setLaunchModal((current) =>
        current && current.accountId === modal.accountId
          ? {
              ...current,
              regeneratingCommand: false,
              executeError: String(error),
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
      return null;
    }
  };

  const handleCopyLaunchCommand = async () => {
    if (!launchModal) return;
    const prepared = await ensureLaunchCommandReady(launchModal);
    if (!prepared?.launchCommand) return;
    try {
      await navigator.clipboard.writeText(prepared.launchCommand);
      setLaunchModal((current) =>
        current ? { ...current, copied: true, executeError: null } : current,
      );
      window.setTimeout(() => {
        setLaunchModal((current) =>
          current ? { ...current, copied: false } : current,
        );
      }, 1200);
    } catch {
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executeError: t(
                "common.shared.export.copyFailed",
                "Sao chép thất bại, vui lòng sao chép thủ công",
              ),
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
    }
  };

  const handleExecuteInTerminal = async () => {
    if (!launchModal || launchModal.executing || launchModal.regeneratingCommand)
      return;
    setLaunchModal((current) =>
      current
        ? {
            ...current,
            executing: true,
            executeError: null,
            executeMessage: null,
          }
        : current,
    );
    try {
      const prepared = await ensureLaunchCommandReady(launchModal);
      if (!prepared) {
        setLaunchModal((current) =>
          current ? { ...current, executing: false } : current,
        );
        return;
      }
      const result = await grokInstanceService.executeGrokInstanceLaunchCommand(
        prepared.instanceId,
        selectedTerminal,
        {
          workingDir: prepared.workingDir,
          applyWorkingDirOverride: true,
          accountId: prepared.accountId,
        },
      );
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executing: false,
              launchCommand: prepared.launchCommand,
              executeMessage: result,
            }
          : current,
      );
    } catch (error) {
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executing: false,
              executeError: String(error),
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
    }
  };

  const handleTerminalChange = (terminal: string) => {
    setSelectedTerminal(terminal);
    setLaunchModal((current) =>
      current
        ? { ...current, executeError: null, executeMessage: null }
        : current,
    );
  };

  const renderGrokQuotaSection = useCallback(
    (account: GrokAccount, variant: "card" | "table") => {
      const items = getGrokQuotaSummaryItems(
        account,
        t as (key: string, defaultValue?: string) => string,
      );
      const reauthorizationReason = getGrokReauthorizationReason(account);
      const errorMessage = account.quota_query_last_error?.trim() || "";
      const showError = !!errorMessage && items.length === 0;

      return (
        <div className={`grok-quota-summary ${variant}`}>
          {reauthorizationReason && (
            <div
              className={`quota-error-inline ${variant === "table" ? "table" : ""}`}
            >
              <CircleAlert size={14} />
              <span title={reauthorizationReason}>{reauthorizationReason}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline quota-error-action"
                onClick={() => handleReauthorize(account)}
              >
                <KeyRound size={12} />
                {t("common.reauthorize", "Ủy quyền lại")}
              </button>
            </div>
          )}
          <div className="grok-quota-items">
            {isGrokApiKeyAccount(account) && items.length === 0 && !errorMessage && (
              <div
                className={variant === "card" ? "quota-empty" : ""}
                style={
                  variant === "table"
                    ? { color: "var(--text-muted)", fontSize: 13 }
                    : undefined
                }
              >
                {t(
                  "grok.quota.apiKeyUnsupported",
                  "Tài khoản API Key không có hạn mức gói",
                )}
              </div>
            )}
            {items.map((item) => {
              // item.percentage 为 used%；文案与进度条均展示剩余%（与 Gemini 等平台一致：越用越短）
              const usedPercent = Math.max(
                0,
                Math.min(100, Math.round(item.percentage)),
              );
              const remainingPercent = Math.max(0, Math.min(100, 100 - usedPercent));
              // 颜色按已用比例（越用越红），条长度按剩余
              const quotaClass = getGrokQuotaClass(usedPercent);
              const amountText = formatGrokQuotaUsedTotal(item.used, item.total);
              const remainingLabel = t(
                "common.shared.quota.leftPercent",
                "{{value}}% left",
                { value: remainingPercent },
              );
              const resetText = formatGrokQuotaResetTime(item.resetAtMs);
              const resetDisplay = resetText || "-";
              const titleParts = [
                item.label,
                amountText || null,
                remainingLabel,
                resetText
                  ? t("grok.quota.resetAt", "{{label}} đặt lại: {{time}}", {
                      label: item.label,
                      time: resetText,
                    })
                  : null,
              ].filter(Boolean);
              const title = titleParts.join(" · ");

              if (variant === "card") {
                return (
                  <div
                    className="quota-item"
                    key={`${account.id}-${item.key}`}
                    title={title}
                  >
                    <div className="quota-header">
                      <CalendarDays size={14} />
                      <span className="quota-label">{item.label}</span>
                      <span className={`quota-pct ${quotaClass}`}>
                        {amountText ? (
                          <>
                            <span className="grok-quota-amount">{amountText}</span>
                            <span className="grok-quota-pct-sep">·</span>
                          </>
                        ) : null}
                        {remainingLabel}
                      </span>
                    </div>
                    <div className="quota-bar-track">
                      <div
                        className={`quota-bar ${quotaClass}`}
                        style={{ width: `${remainingPercent}%` }}
                      />
                    </div>
                    <span className="quota-reset">{resetDisplay}</span>
                  </div>
                );
              }

              return (
                <div
                  className="quota-item"
                  key={`${account.id}-${item.key}`}
                  title={title}
                >
                  <div className="quota-header">
                    <span className="quota-name">{item.label}</span>
                    <span className={`quota-value ${quotaClass}`}>
                      {amountText ? (
                        <>
                          <span className="grok-quota-amount">{amountText}</span>
                          <span className="grok-quota-pct-sep">·</span>
                        </>
                      ) : null}
                      {remainingLabel}
                    </span>
                  </div>
                  <div className="quota-progress-track">
                    <div
                      className={`quota-progress-bar ${quotaClass}`}
                      style={{ width: `${remainingPercent}%` }}
                    />
                  </div>
                  <div className="quota-footer">
                    <span className="quota-reset">{resetDisplay}</span>
                  </div>
                </div>
              );
            })}
            {items.length === 0 &&
              !showError &&
              !isGrokApiKeyAccount(account) && (
              <div
                className={variant === "card" ? "quota-empty" : ""}
                style={
                  variant === "table"
                    ? { color: "var(--text-muted)", fontSize: 13 }
                    : undefined
                }
              >
                {t("grok.quota.empty", "Không có hạn mức")}
              </div>
            )}
            {errorMessage && (
              <div
                className={`quota-error-inline ${variant === "table" ? "table" : ""}`}
                title={errorMessage}
              >
                <CircleAlert size={variant === "table" ? 12 : 14} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      );
    },
    [handleReauthorize, t],
  );

  const handleInstallTerminalChange = (terminal: string) => {
    setSelectedTerminal(terminal);
    setInstallError(null);
    setInstallOpened(false);
  };

  const reportInstallError = (message: string) => {
    setInstallError(message);
    setInstallErrorScrollKey((current) => current + 1);
  };

  const handleCopyInstallCommand = async () => {
    setInstallError(null);
    setInstallCommandCopied(false);
    try {
      await navigator.clipboard.writeText(grokCliInstallCommand);
      setInstallCommandCopied(true);
      window.setTimeout(() => setInstallCommandCopied(false), 1200);
    } catch {
      reportInstallError(
        t("common.shared.export.copyFailed", "Sao chép thất bại, vui lòng sao chép thủ công"),
      );
    }
  };

  const handleExecuteInstallCommand = async () => {
    if (installExecuting) return;
    setInstallError(null);
    setInstallOpened(false);
    setInstallExecuting(true);
    try {
      await grokInstanceService.executeGrokCliInstallCommand(selectedTerminal);
      setInstallOpened(true);
    } catch (error) {
      reportInstallError(String(error));
    } finally {
      setInstallExecuting(false);
    }
  };

  const renderGrokCliInstallGuide = () => (
    <div className="grok-cli-install-guide">
      <strong>{t("grok.instances.installCommand", "Lệnh cài đặt chính thức")}</strong>
      <p>
        {t(
          "grok.instances.installLaunchHint",
          "Bạn có thể chạy lệnh chính thức dưới đây trong terminal, sau khi cài đặt hãy nhấp chạy trong terminal lần nữa.",
        )}
      </p>
      <div className="grok-cli-install-command">
        <code>{grokCliInstallCommand}</code>
        <button
          type="button"
          className="btn btn-secondary icon-only"
          onClick={() => void handleCopyInstallCommand()}
          title={
            installCommandCopied
              ? t("common.success", "Thành công")
              : t("common.copy", "Copy​")
          }
          aria-label={t("common.copy", "Copy​")}
        >
          {installCommandCopied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div className="grok-cli-install-actions">
        <div className="grok-cli-install-terminal">
          <label>{t("instances.launchDialog.terminal", "Cửa sổ lệnh")}</label>
          <SingleSelectDropdown
            value={selectedTerminal}
            onChange={handleInstallTerminalChange}
            options={terminalOptions}
            disabled={installExecuting || !!launchModal?.executing}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleExecuteInstallCommand()}
          disabled={installExecuting || !!launchModal?.executing}
        >
          <Play size={14} />
          {installExecuting
            ? t("common.loading", "Đang tải...")
            : t("grok.instances.runInTerminal", "Chạy trong terminal")}
        </button>
      </div>
      {installOpened && (
        <div className="add-status success">
          <Check size={14} />
          <span>{t("common.success", "Thành công")}</span>
        </div>
      )}
      <ModalErrorMessage
        message={installError}
        scrollKey={installErrorScrollKey}
      />
    </div>
  );

  const accountsForInstances = useMemo(
    () =>
      [...store.accounts].sort((left, right) => {
        const createdDiff = right.created_at - left.created_at;
        return page.sortDirection === "desc" ? createdDiff : -createdDiff;
      }),
    [page.sortDirection, store.accounts],
  );

  const customApiBaseUrlValid = isValidGrokApiBaseUrl(apiBaseUrl);
  const customApiFieldsIncomplete =
    apiProviderMode === "custom" &&
    (!apiBaseUrl.trim() || !apiModel.trim() || !customApiBaseUrlValid);
  const apiBaseUrlError =
    apiProviderMode === "custom" && apiBaseUrlTouched
      ? !apiBaseUrl.trim()
        ? t("grok.import.apiFieldRequired", "Nhập {{field}}", {
            field: t("grok.import.apiBaseUrl", "URL cơ sở"),
          })
        : !customApiBaseUrlValid
          ? t(
              "grok.import.apiBaseUrlInvalid",
              "Nhập URL http:// hoặc https:// đầy đủ, không chứa thông tin xác thực, tham số truy vấn hay phân đoạn",
            )
          : null
      : null;
  const apiModelError =
    apiProviderMode === "custom" && apiModelTouched && !apiModel.trim()
      ? t("grok.import.apiFieldRequired", "Nhập {{field}}", {
          field: t("grok.import.apiModel", "ID mô hình"),
        })
      : null;

  const platformConfig: CodebuddySuiteAccountsPlatformConfig<GrokAccount> = {
    pageClassName: "grok-accounts-page",
    quickSettingsType: "grok",
    searchPlaceholderKey: "grok.search",
    searchPlaceholderDefault: "Tìm tài khoản Grok CLI...",
    flowNotice: {
      titleKey: "grok.flowNotice.title",
      titleDefault: "Hướng dẫn quản lý tài khoản Grok CLI",
      descKey: "grok.flowNotice.desc",
      descDefault:
        "Mặc định dùng GROK_HOME riêng; khi bật Đồng bộ đăng nhập chính thức lúc chuyển tài khoản, phiên mặc định sẽ ghi OAuth vào ~/.grok/auth.json, còn các phiên khác vẫn tách biệt.",
      permissionKey: "grok.flowNotice.permission",
      permissionDefault:
        "Phạm vi cục bộ: có thể đọc ~/.grok/auth.json để nhập; chỉ ghi khi bật đồng bộ và chuyển tài khoản OAuth ở phiên mặc định; API Key không ghi đè đăng nhập chính thức.",
      networkKey: "grok.flowNotice.network",
      networkDefault:
        "Phạm vi mạng: cấp quyền OAuth, làm mới thông tin xác thực và truy vấn mức sử dụng; không tải thông tin xác thực lên dịch vụ Cockpit.",
    },
    noAccountsKey: "grok.empty",
    noAccountsDefault: "Chưa có tài khoản Grok CLI",
    addAccountTitleKey: "grok.addAccount",
    addAccountTitleDefault: "Thêm tài khoản Grok CLI",
    oauthDescKey: "grok.oauth.desc",
    oauthDescDefault: "Mở trang cấp quyền xAI và nhập mã xác minh thiết bị; tài khoản sẽ tự lưu sau khi hoàn tất.",
    oauthFeatureCardClassName: "grok-oauth-feature-card",
    oauthFeatureTitleKey: "grok.oauth.title",
    oauthFeatureTitleDefault: "Grok Device OAuth",
    oauthFeatureItem1Key: "grok.oauth.item1",
    oauthFeatureItem1Default:
      "Sử dụng quy trình xác minh thiết bị chính thức của Grok CLI, không chiếm cổng callback cục bộ.",
    oauthFeatureItem2Key: "grok.oauth.item2",
    oauthFeatureItem2Default:
      "Sau khi cấp quyền thành công, lưu GROK_HOME riêng và duy trì trạng thái hợp lệ của thông tin xác thực.",
    oauthFeatureItem3Key: "grok.oauth.item3",
    oauthFeatureItem3Default: "Mỗi tài khoản có thư mục riêng, có thể chạy đồng thời mà không ảnh hưởng lẫn nhau.",
    oauthUrlInputPlaceholderKey: "grok.oauth.urlPlaceholder",
    oauthUrlInputPlaceholderDefault: "URL cấp quyền Grok OAuth",
    oauthWaitingKey: "grok.oauth.waiting",
    oauthWaitingDefault: "Đang chờ cấp quyền Grok OAuth...",
    oauthOpenButtonKey: "grok.oauth.openWindow",
    oauthOpenButtonDefault: "Mở trang cấp quyền",
    // 与 Codex 对齐：Token / JSON（粘贴）| API Key
    tokenTabLabelKey: "grok.import.apiKeyTab",
    tokenTabLabelDefault: "API Key",
    tokenDescKey:
      apiProviderMode === "custom"
        ? "grok.import.customApiDesc"
        : "grok.import.apiKeyDesc",
    tokenDescDefault:
      apiProviderMode === "custom"
        ? "Cấu hình Base URL, ID mô hình và API Key tương thích OpenAI. Khi chạy, ghi vào config.toml riêng cho tài khoản và chỉ truyền khóa cho tiến trình CLI này."
        : "Dán xAI API Key (XAI_API_KEY / xai-… chính thức). Khóa được truyền qua GROK_HOME riêng khi chạy CLI, không ghi đè đăng nhập OAuth chính thức.",
    tokenInputPlaceholderKey:
      apiProviderMode === "custom"
        ? "grok.import.customApiKeyPlaceholder"
        : "grok.import.apiKeyPlaceholder",
    tokenInputPlaceholderDefault:
      apiProviderMode === "custom"
        ? "Dán API Key bên thứ ba"
        : "Dán khóa bắt đầu bằng xai-",
    tokenSubmitLabelKey: "grok.import.apiKeyAction",
    tokenSubmitLabelDefault: "Thêm API Key",
    tokenInputSecret: true,
    tokenSubmitDisabled: customApiFieldsIncomplete,
    tokenControl: (
      <div className="grok-api-provider-control">
        <div
          className="grok-api-provider-modes"
          role="tablist"
          aria-label={t("grok.import.apiMode", "Loại API")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={apiProviderMode === "official"}
            className={`btn grok-api-provider-mode ${apiProviderMode === "official" ? "active" : ""}`}
            onClick={() => {
              setApiProviderMode("official");
              setApiBaseUrlTouched(false);
              setApiModelTouched(false);
              page.setAddStatus("idle");
              page.setAddMessage(null);
            }}
          >
            {t("grok.import.apiModeOfficial", "xAI chính thức")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={apiProviderMode === "custom"}
            className={`btn grok-api-provider-mode ${apiProviderMode === "custom" ? "active" : ""}`}
            onClick={() => {
              setApiProviderMode("custom");
              setApiBaseUrlTouched(false);
              setApiModelTouched(false);
              page.setAddStatus("idle");
              page.setAddMessage(null);
            }}
          >
            {t("grok.import.apiModeCustom", "Bên thứ ba")}
          </button>
        </div>
      </div>
    ),
    tokenFields:
      apiProviderMode === "custom" ? (
        <div className="grok-api-provider-fields">
          <div className="grok-api-provider-field">
            <label htmlFor="grok-api-base-url">
              {t("grok.import.apiBaseUrl", "Base URL")}
            </label>
            <input
              id="grok-api-base-url"
              className={`form-input ${apiBaseUrlError ? "error" : ""}`}
              type="url"
              value={apiBaseUrl}
              autoComplete="off"
              aria-invalid={!!apiBaseUrlError}
              aria-describedby={
                apiBaseUrlError ? "grok-api-base-url-error" : undefined
              }
              placeholder={t(
                "grok.import.apiBaseUrlPlaceholder",
                "https://api.example.com/v1",
              )}
              onChange={(event) => {
                setApiBaseUrl(event.target.value);
                page.setAddStatus("idle");
                page.setAddMessage(null);
              }}
              onBlur={() => setApiBaseUrlTouched(true)}
            />
            {apiBaseUrlError && (
              <span
                id="grok-api-base-url-error"
                className="grok-api-field-error"
              >
                {apiBaseUrlError}
              </span>
            )}
          </div>
          <div className="grok-api-provider-field">
            <label htmlFor="grok-api-model">
              {t("grok.import.apiModel", "ID mô hình")}
            </label>
            <input
              id="grok-api-model"
              className={`form-input ${apiModelError ? "error" : ""}`}
              value={apiModel}
              autoComplete="off"
              aria-invalid={!!apiModelError}
              aria-describedby={
                apiModelError ? "grok-api-model-error" : undefined
              }
              placeholder={t(
                "grok.import.apiModelPlaceholder",
                "Ví dụ: grok-4.1-fast",
              )}
              onChange={(event) => {
                setApiModel(event.target.value);
                page.setAddStatus("idle");
                page.setAddMessage(null);
              }}
              onBlur={() => setApiModelTouched(true)}
            />
            {apiModelError && (
              <span
                id="grok-api-model-error"
                className="grok-api-field-error"
              >
                {apiModelError}
              </span>
            )}
          </div>
        </div>
      ) : null,
    showPasteJsonTab: true,
    pasteJsonTabLabelKey: "common.shared.addModal.token",
    pasteJsonTabLabelDefault: "Token / JSON",
    pasteJsonDescKey: "grok.import.pasteDesc",
    pasteJsonDescDefault:
      "Dán auth.json chính thức của Grok CLI hoặc JSON tài khoản đầy đủ đã xuất (có thông tin xác thực để nhập khôi phục). Thông tin xác thực chỉ được xử lý cục bộ.",
    pasteJsonPlaceholderKey: "grok.import.pastePlaceholder",
    pasteJsonPlaceholderDefault: "Dán JSON tài khoản Grok",
    pasteJsonSubmitLabelKey: "grok.import.pasteAction",
    pasteJsonSubmitLabelDefault: "Nhập JSON",
    importLocalDescKey: "grok.import.localDesc",
    importLocalDescDefault:
      "Nhập từ ~/.grok/auth.json mặc định hoặc chọn auth.json chính thức hay tệp JSON tài khoản đầy đủ đã xuất từ ứng dụng.",
    importLocalClientKey: "grok.import.localClient",
    importLocalClientDefault: "Nhập từ Grok CLI cục bộ",
    getDisplayEmail: getGrokAccountDisplayEmail,
    getPlanBadge: (account) =>
      getGrokPlanBadge(account) || t("common.none", "None​"),
    getPlanBadgeTitle: (account) =>
      getGrokPlanRawValue(account) || t("common.none", "None​"),
    getPlanBadgeClass: (planBadge, account) => {
      if (isGrokApiKeyAccount(account) || planBadge === "API_KEY") return "pro";
      // Missing tier (暂无) uses Free styling — not the red "unknown" tone.
      if (!getGrokPlanRawValue(account)) return "free";
      if (planBadge === "Free") return "free";
      if (planBadge === "--") return "free";
      return "pro";
    },
    getSearchText: (account) =>
      [
        getGrokAccountDisplayEmail(account),
        account.first_name,
        account.last_name,
        account.principal_id,
        account.team_id,
        account.api_base_url,
        account.api_model,
        account.quota?.subscriptionStatus,
        getGrokPlanBadge(account) || t("common.none", "None​"),
      ]
        .filter(Boolean)
        .join(" "),
    getUsage: getGrokUsage,
    getQuotaGroups: getGrokQuotaGroups,
    hasQuotaData: (account) => hasGrokQuotaData(account),
    usagePrefix: "grok",
    quotaPrefix: "grok",
    tableUsageClassName: "grok-table-usage",
    showMfaQuickCode: false,
    getReauthorizationReason: getGrokReauthorizationReason,
    reauthorizingAccount: reauthTargetAccount,
    onReauthorize: handleReauthorize,
    renderQuotaSection: renderGrokQuotaSection,
  };

  return (
    <div className="ghcp-accounts-page grok-accounts-page">
      <PlatformOverviewTabsHeader
        platform="grok"
        active={activeTab}
        onTabChange={setActiveTab}
      />
      {activeTab === "instances" ? (
        <GrokInstancesContent accountsForSelect={accountsForInstances} />
      ) : (
        <CodebuddySuiteAccountsSharedView
          accounts={store.accounts}
          loading={store.loading}
          page={page}
          platformConfig={platformConfig}
          onRefreshAccounts={() => void store.fetchAccounts()}
        />
      )}
      {launchModal && (
        <div className="modal-overlay">
          <div
            className="modal modal-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <button
                className="btn btn-secondary icon-only"
                onClick={() => setLaunchModal(null)}
                title={t("common.back", "Quay lại")}
                aria-label={t("common.back", "Quay lại")}
              >
                <ChevronLeft size={14} />
              </button>
              <h2>{t("grok.instances.launchDialogTitle", "Chạy phiên bản")}</h2>
              <button
                className="modal-close"
                onClick={() => setLaunchModal(null)}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div className="add-status success">
                <Check size={16} />
                <span>
                  {t("accounts.switched", "Đã chuyển sang {{email}}", {
                    email: launchModal.accountEmail,
                  })}
                </span>
              </div>
              <ModalErrorMessage
                message={launchModal.executeError}
                scrollKey={launchModal.errorScrollKey}
              />
              {launchModal.executeError &&
                grokInstanceService.isGrokCliMissingError(
                  launchModal.executeError,
                ) &&
                renderGrokCliInstallGuide()}
              <div className="form-group">
                <label>{t("instances.columns.instance", "Phiên bản")}</label>
                <input
                  className="form-input"
                  value={t("instances.defaultName", "Phiên bản mặc định")}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>{t("instances.form.workingDir", "Thư mục làm việc")}</label>
                <div className="grok-launch-working-dir-row">
                  <input
                    className="form-input"
                    value={launchModal.workingDir}
                    placeholder={t(
                      "instances.form.workingDirPlaceholder",
                      "Mặc định dùng đường dẫn hiện tại",
                    )}
                    onChange={(event) =>
                      updateLaunchWorkingDir(event.target.value)
                    }
                    onBlur={() => void handleLaunchWorkingDirBlur()}
                    disabled={
                      launchModal.executing || launchModal.regeneratingCommand
                    }
                  />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => void handleChooseLaunchWorkingDir()}
                    disabled={
                      launchModal.executing || launchModal.regeneratingCommand
                    }
                    title={t(
                      "grok.instances.selectWorkingDir",
                      "Chọn thư mục làm việc Grok CLI",
                    )}
                    aria-label={t(
                      "grok.instances.selectWorkingDir",
                      "Chọn thư mục làm việc Grok CLI",
                    )}
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
                <p className="form-hint">
                  {t(
                    "grok.instances.workingDirAccountHint",
                    "Thư mục làm việc được gắn với tài khoản này và sẽ được khôi phục lần khởi chạy sau.",
                  )}
                </p>
              </div>
              <div className="form-group">
                <label>{t("instances.launchDialog.command", "Lệnh khởi chạy")}</label>
                <textarea
                  className="form-input instance-args-input"
                  value={launchModal.launchCommand}
                  placeholder={
                    launchModal.regeneratingCommand
                      ? t("common.loading", "Đang tải...")
                      : t(
                          "grok.instances.launchCommandPlaceholder",
                          "Chọn hoặc xác nhận thư mục để tạo lệnh khởi chạy",
                        )
                  }
                  readOnly
                />
                <p className="form-hint">
                  {t(
                    "grok.instances.launchHint",
                    "Sao chép lệnh để chạy thủ công hoặc thực thi trực tiếp trong terminal.",
                  )}
                </p>
              </div>
              <div className="form-group">
                <label>{t("instances.launchDialog.terminal", "Cửa sổ lệnh")}</label>
                <SingleSelectDropdown
                  value={selectedTerminal}
                  onChange={handleTerminalChange}
                  options={terminalOptions}
                  disabled={
                    launchModal.executing || launchModal.regeneratingCommand
                  }
                  ariaLabel={t("instances.launchDialog.terminal", "Cửa sổ lệnh")}
                />
              </div>
              {launchModal.executeMessage && (
                <div className="add-status success">
                  <Check size={16} />
                  <span>{launchModal.executeMessage}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => void handleCopyLaunchCommand()}
                disabled={
                  launchModal.executing || launchModal.regeneratingCommand
                }
              >
                <Copy size={16} />
                {launchModal.copied
                  ? t("common.success", "Thành công")
                  : t("common.copy", "Copy​")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleExecuteInTerminal()}
                disabled={
                  launchModal.executing || launchModal.regeneratingCommand
                }
              >
                <Play size={16} />
                {launchModal.executing
                  ? t("common.loading", "Đang tải...")
                  : t("grok.instances.runInTerminal", "Chạy trong terminal")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
