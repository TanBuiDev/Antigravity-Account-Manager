import { useEffect, type ReactElement } from "react";
import { RefreshCw, Upload, Trash2, X, Power, Database, Copy, Check, Play, RotateCw, CircleAlert, Info, Calendar, Tag, Eye, EyeOff, FileText, ExternalLink, Pencil, FolderPlus, ChevronRight, Wrench, Terminal, Link2, Waypoints } from "lucide-react";
import { isCodexApiKeyAccount, isCodexAgentIdentityAccount, isCodexChatCompletionsApiKeyAccount, isCodexNewApiAccount } from "../types/codex";
import { isVerboseCodexQuotaErrorMessage, summarizeCodexQuotaErrorMessage } from "../utils/codexQuotaError";
import { CodexQuotaMiniRows } from "../components/codex/CodexQuotaMiniRows";
import { CodexAccountProxyButton } from "../components/codex/CodexAccountProxyButton";
import { apiServiceProxyAccount } from "../services/codexProxyTargetService";
import { CodexSpeedControl } from "../components/codex/CodexSpeedControl";
import { CodexAccountProxyCard } from "../components/codex/CodexAccountProxyCard";
import { canUseCodexAccountProxy } from "../utils/codexAccountProxy";
import { CodexTeamQuotaHistory } from "../components/codex/CodexTeamQuotaHistory";
import { isCodexAccountReauthRequired, isCodexClientReauthNoticeOnly, isCodexRefreshTokenNoticeOnly, isCodexRefreshTokenReusedAccount, isCodexServerRevokedReauth } from "../utils/codexSwitchAuthFailure";
import { CODEX_LAUNCH_PREVIEW_API_SERVICE_CARD_KEY } from "../utils/codexLaunchPreviewInstancePreference";
 import { isDeepSeekAccount, isCodexTokenPlanAccount, shouldShowCodexApiKeyUsagePanel } from "../utils/codexDeepSeekAccess";
import { SingleSelectDropdown } from "../components/SingleSelectDropdown";
import { CODEX_API_SERVICE_BIND_ID } from "../types/instance";
import { COCKPIT_API_BASE_URL } from "../utils/codexProviderPresets";
import { formatCodexQuotaPoolPercent, formatCodexQuotaPoolWindowLabel } from "../utils/codexQuotaPool";
import { CODEX_LOCAL_ACCESS_STATUS_KEYS, resolveCodexLocalAccessRuntimeStatus } from "../utils/codexLocalAccessStatus";
import { resolveNewApiQuotaSnapshot } from "../services/modelProviderUsageService";
import { CODEX_LOCAL_ACCESS_FALLBACK_API_KEY_MASK, formatCockpitApiInteger, formatCockpitApiTokenCount, getCockpitApiStatsRecord, getCockpitApiUsageRecord, getCodexAccountNoteTitle, hasCodexAccountNoteDetails, isPendingOAuthCodexAccount, isSponsorModelProvider, readCockpitApiNumber, readCockpitApiString, resolveApiKeyUsageMode, toCockpitApiRecord, type CockpitApiJsonRecord } from "./codexAccountsControllerModel";
import type { useCodexAccountsBaseController } from "./useCodexAccountsBaseController";
import type { useCodexAccountsOAuthController } from "./useCodexAccountsOAuthController";
import type { useCodexAccountsAccessController } from "./useCodexAccountsAccessController";
import type { useCodexAccountsLocalAccessController } from "./useCodexAccountsLocalAccessController";
import type { useCodexAccountsOverviewController } from "./useCodexAccountsOverviewController";

/** 封装 useCodexAccountsPageController 的 useCodexAccountsRenderers 业务域状态与动作。 */
export function useCodexAccountsRenderers(context: Pick<ReturnType<typeof useCodexAccountsBaseController> & ReturnType<typeof useCodexAccountsOAuthController> & ReturnType<typeof useCodexAccountsAccessController> & ReturnType<typeof useCodexAccountsLocalAccessController> & ReturnType<typeof useCodexAccountsOverviewController>,
  | "accountIdLabel"
  | "accounts"
  | "activeGroupId"
  | "addingLocalAccessAccountId"
  | "apiKeyUsageDetailAccount"
  | "apiKeyUsageMap"
  | "applyWindowStatsToQuotaItems"
  | "batchImportOpen"
  | "boundLocalAccessOAuthAccount"
  | "canDirectlyAddLocalAccessAccount"
  | "canRefreshApiKeyUsage"
  | "clearInlineRename"
  | "cliLaunchingAccountId"
  | "closeExternalImportProgressModal"
  | "cockpitApiPanelAccount"
  | "codexGroups"
  | "editingApiKeyNameId"
  | "editingApiKeyNameValue"
  | "externalImportProgress"
  | "filteredAccounts"
  | "findApiKeyUsageDetail"
  | "formatApiKeyUsageDetailByKey"
  | "formatApiKeyUsageDetailLabel"
  | "formatApiKeyUsageDetailValue"
  | "formatApiKeyUsageMoney"
  | "formatApiKeyUsagePercent"
  | "formatApiKeyUsageQuotaValue"
  | "formatDate"
  | "getCodexSwitchOrLaunchBlockedReason"
  | "groupByTag"
  | "handleAccountNameDoubleClick"
  | "handleAddLocalAccessAccount"
  | "handleCopyLocalAccessValue"
  | "handleDelete"
  | "handleEnterGroup"
  | "handleExportByIds"
  | "handleHideLocalAccessEntry"
  | "handleKillLocalAccessPort"
  | "handleLaunchCodexCli"
  | "handleLaunchLocalAccessCli"
  | "handleLocalAccessAddressKindChange"
  | "handleQuickRefreshLocalAccessQuota"
  | "handleQuickToggleLocalAccessEnabled"
  | "handleRefresh"
  | "handleRefreshGroup"
  | "handleRefreshSubscriptionInfo"
  | "handleRemoveLocalAccessAccount"
  | "handleRemoveSingleFromGroup"
  | "handleSubmitInlineRename"
  | "handleSwitch"
  | "handleToggleOverviewAccount"
  | "hideRelayQuota"
  | "importApiServiceGuideCount"
  | "inlineRenameDiscardRef"
  | "localAccessAccountIdSet"
  | "localAccessAccountPoolHealthHasIssue"
  | "localAccessAccountPoolHealthSummary"
  | "localAccessAddressOptions"
  | "localAccessBusy"
  | "localAccessCollection"
  | "localAccessCopiedField"
  | "localAccessDetailsExpanded"
  | "localAccessEntryVisible"
  | "instanceGatewaySummary"
  | "instanceGatewaysLoading"
  | "localAccessKeyVisible"
  | "localAccessLaunchCurrent"
  | "localAccessPortKilling"
  | "localAccessQuotaHiddenCount"
  | "localAccessQuotaPoolLabels"
  | "localAccessQuotaPreviewItems"
  | "localAccessRefreshing"
  | "localAccessScopeLabel"
  | "localAccessStarting"
  | "localAccessState"
  | "maskAccountText"
  | "openAccountNoteModal"
  | "openApiKeyCredentialsModal"
  | "openCodexAddModal"
  | "openCodexApiServicePage"
  | "openLocalAccessMemberPicker"
  | "openLocalAccessOAuthBindingModal"
  | "openLocalAccessPanel"
  | "openInstanceGateways"
  | "openQuickSwitchProviderModal"
  | "openQuotaErrorDetail"
  | "openTagModal"
  | "overviewCurrentAccountId"
  | "overviewLayoutMode"
  | "paginatedAccounts"
  | "refreshApiKeyUsage"
  | "refreshApiKeyUsageByAccountId"
  | "refreshing"
  | "refreshingAll"
  | "refreshingGroupId"
  | "refreshingSubscriptionAccountId"
  | "removingGroupAccountIds"
  | "renderAccountNoteButton"
  | "renderAddLocalAccessAccountButton"
  | "renderApiKeyRevealLine"
  | "renderApiKeyUsagePanel"
  | "renderOAuthBindingLine"
  | "renderQuotaErrorInline"
  | "renderResetCreditControls"
  | "requestDeleteGroup"
  | "resolveAccountMeta"
  | "resolveApiKeyDisplayText"
  | "resolveApiProviderDisplayName"
  | "resolveCockpitApiAccountBalanceText"
  | "resolveGroupAccounts"
  | "resolveLocalAccessBaseUrl"
  | "resolvePresentation"
  | "resolveQuotaErrorMeta"
  | "resolveSingleExportBaseName"
  | "resolveSubscriptionPresentation"
  | "resolveUsageProviderForApiKeyAccount"
  | "resolveVisibleQuotaItems"
  | "savingApiKeyNameId"
  | "selected"
  | "selectedLocalAccessAddressKind"
  | "setActiveTab"
  | "setApiKeyUsageDetailAccountId"
  | "setCockpitApiPanelAccountId"
  | "setEditingApiKeyNameValue"
  | "setExternalImportSyncError"
  | "setGroupQuickAddGroupId"
   | "setImportApiServiceGuideCount"
   | "restoreLaunchPreviewInstanceId"
   | "setLocalAccessDetailsExpanded"
  | "setLocalAccessKeyVisible"
  | "setLocalAccessLaunchPreviewOpen"
  | "setMessage"
  | "setShowCodexGroupModal"
  | "setShowLocalAccessHealthModal"
  | "setShowLocalAccessQuotaStatsModal"
  | "shouldOfferReauthorizeAction"
  | "sponsorApiProviderTemplates"
  | "switching"
  | "t"
  | "toggleAccountApiKeyVisible"
  | "visibleApiKeyAccountIds"
>) {
  const {
    accountIdLabel,
    addingLocalAccessAccountId,
    apiKeyUsageDetailAccount,
    apiKeyUsageMap,
    applyWindowStatsToQuotaItems,
    batchImportOpen,
    boundLocalAccessOAuthAccount,
    canDirectlyAddLocalAccessAccount,
    canRefreshApiKeyUsage,
    clearInlineRename,
    cliLaunchingAccountId,
    closeExternalImportProgressModal,
    cockpitApiPanelAccount,
    editingApiKeyNameId,
    editingApiKeyNameValue,
    externalImportProgress,
    filteredAccounts,
    findApiKeyUsageDetail,
    formatApiKeyUsageDetailByKey,
    formatApiKeyUsageDetailLabel,
    formatApiKeyUsageDetailValue,
    formatApiKeyUsageMoney,
    formatApiKeyUsagePercent,
    formatApiKeyUsageQuotaValue,
    formatDate,
    getCodexSwitchOrLaunchBlockedReason,
    handleAccountNameDoubleClick,
    handleAddLocalAccessAccount,
    handleCopyLocalAccessValue,
    handleDelete,
    handleExportByIds,
    handleHideLocalAccessEntry,
    handleKillLocalAccessPort,
    handleLaunchCodexCli,
    handleLaunchLocalAccessCli,
    handleLocalAccessAddressKindChange,
    handleQuickRefreshLocalAccessQuota,
    handleQuickToggleLocalAccessEnabled,
    handleRefresh,
    handleRefreshSubscriptionInfo,
    handleRemoveLocalAccessAccount,
    handleSubmitInlineRename,
    handleSwitch,
    handleToggleOverviewAccount,
    hideRelayQuota,
    importApiServiceGuideCount,
    inlineRenameDiscardRef,
    localAccessAccountIdSet,
    localAccessAccountPoolHealthHasIssue,
    localAccessAccountPoolHealthSummary,
    localAccessAddressOptions,
    localAccessBusy,
    localAccessCollection,
    localAccessCopiedField,
    localAccessDetailsExpanded,
    localAccessEntryVisible,
    instanceGatewaySummary,
    instanceGatewaysLoading,
    localAccessKeyVisible,
    localAccessLaunchCurrent,
    localAccessPortKilling,
    localAccessQuotaHiddenCount,
    localAccessQuotaPoolLabels,
    localAccessQuotaPreviewItems,
    localAccessRefreshing,
    localAccessScopeLabel,
    localAccessStarting,
    localAccessState,
    maskAccountText,
    openAccountNoteModal,
    openApiKeyCredentialsModal,
    openCodexAddModal,
    openCodexApiServicePage,
    openLocalAccessMemberPicker,
    openLocalAccessOAuthBindingModal,
    openLocalAccessPanel,
    openInstanceGateways,
    openQuickSwitchProviderModal,
    openQuotaErrorDetail,
    openTagModal,
    overviewCurrentAccountId,
    overviewLayoutMode,
    paginatedAccounts,
    refreshApiKeyUsage,
    refreshApiKeyUsageByAccountId,
    refreshing,
    refreshingSubscriptionAccountId,
    renderAccountNoteButton,
    renderAddLocalAccessAccountButton,
    renderApiKeyRevealLine,
    renderApiKeyUsagePanel,
    renderOAuthBindingLine,
    renderQuotaErrorInline,
    renderResetCreditControls,
    resolveAccountMeta,
    resolveApiKeyDisplayText,
    resolveApiProviderDisplayName,
    resolveCockpitApiAccountBalanceText,
    resolveLocalAccessBaseUrl,
    resolvePresentation,
    resolveQuotaErrorMeta,
    resolveSingleExportBaseName,
    resolveSubscriptionPresentation,
    resolveUsageProviderForApiKeyAccount,
    resolveVisibleQuotaItems,
    savingApiKeyNameId,
    selected,
    selectedLocalAccessAddressKind,
    setActiveTab,
    setApiKeyUsageDetailAccountId,
    setCockpitApiPanelAccountId,
    setEditingApiKeyNameValue,
    setExternalImportSyncError,
    setImportApiServiceGuideCount,
    restoreLaunchPreviewInstanceId,
    setLocalAccessDetailsExpanded,
    setLocalAccessKeyVisible,
    setLocalAccessLaunchPreviewOpen,
    setMessage,
    setShowLocalAccessHealthModal,
    setShowLocalAccessQuotaStatsModal,
    shouldOfferReauthorizeAction,
    sponsorApiProviderTemplates,
    switching,
    t,
    toggleAccountApiKeyVisible,
    visibleApiKeyAccountIds,
  } = context;
  const renderCompactRows = (
      items: typeof filteredAccounts,
      groupKey?: string,
    ) =>
      items.map((account) => {
        const presentation = resolvePresentation(account);
        const isCurrent = overviewCurrentAccountId === account.id;
        const isSelected = selected.has(account.id);
        const isApiKeyAccount = isCodexApiKeyAccount(account);
        const serverRevokedReauth = isCodexServerRevokedReauth(account);
        const refreshTokenReusedState = isCodexRefreshTokenReusedAccount(account);
        const reauthNoticeOnly =
          !serverRevokedReauth &&
          !refreshTokenReusedState &&
          isCodexClientReauthNoticeOnly(account);
        const clientAuthRequired =
          !isApiKeyAccount &&
          !account.requires_reauth &&
          !serverRevokedReauth &&
          account.client_auth_status === "login_required";
        const isAgentIdentityAccount = isCodexAgentIdentityAccount(account);
        const switchOrLaunchBlockedReason =
          getCodexSwitchOrLaunchBlockedReason(account);
        const isChatCompletionsApiKey =
          isCodexChatCompletionsApiKeyAccount(account);
        const compactOfficialQuotaItems = applyWindowStatsToQuotaItems(
          account,
          presentation.quotaItems,
        ).filter((item) => item.key === "primary" || item.key === "secondary");
        const compactDeepSeekSummary = isDeepSeekAccount(account)
          ? apiKeyUsageMap[account.id]?.summary
          : undefined;
        const compactTokenPlanSummary = isCodexTokenPlanAccount(account)
          ? apiKeyUsageMap[account.id]?.summary
          : undefined;
        const subscriptionInfo = resolveSubscriptionPresentation(account);
        const showCompactExpiry =
          !isApiKeyAccount &&
          !isAgentIdentityAccount &&
          subscriptionInfo.bucket !== "active";
        const showSubscriptionRefreshAction =
          !isApiKeyAccount &&
          !isAgentIdentityAccount &&
          (subscriptionInfo.bucket === "missing" ||
            subscriptionInfo.bucket === "expired");
        const isSubscriptionRefreshPending =
          refreshingSubscriptionAccountId === account.id ||
          refreshing === account.id;
        return (
          <div
            key={groupKey ? `${groupKey}-${account.id}` : account.id}
            className={`codex-compact-row ${isCurrent ? "current" : ""} ${isSelected ? "selected" : ""}`}
          >
            <div className="codex-compact-header">
              <div className="codex-compact-select">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleOverviewAccount(account.id)}
                />
              </div>
              <span
                className="codex-compact-email"
                title={maskAccountText(presentation.displayName)}
              >
                {maskAccountText(presentation.displayName)}
              </span>
              {!isApiKeyAccount &&
                !refreshTokenReusedState &&
                (account.requires_reauth || serverRevokedReauth) && (
                <span
                  className={`codex-status-pill ${reauthNoticeOnly ? "quota-refresh" : "quota-error"} codex-client-auth-status-pill`}
                  title={account.reauth_reason || t("codex.authError.badge", "Lỗi ủy quyền")}
                >
                  <CircleAlert size={11} />
                  {reauthNoticeOnly
                    ? t("codex.switchAuth.apiOnlyBadge", "Cần đăng nhập")
                    : t("codex.authError.badge", "Lỗi ủy quyền")}
                </span>
              )}
              {clientAuthRequired && (
                <span
                  className="codex-status-pill quota-refresh codex-client-auth-status-pill"
                  title={t(
                    "codex.switchAuth.apiOnlyDescription",
                    "Ứng dụng hiện tại đã chuyển đến trang đăng nhập. Hãy cấp quyền lại để khôi phục ứng dụng; bạn vẫn có thể tiếp tục dùng Dịch vụ API trong lúc này.",
                  )}
                >
                  <CircleAlert size={11} />
                  {t("codex.switchAuth.apiOnlyBadge", "Cần đăng nhập")}
                </span>
              )}
            </div>
            <div className="codex-compact-quotas">
              {isDeepSeekAccount(account) ? (
                <>
                  {(
                    [
                      [
                        "totalBalance",
                        t(
                          "codex.modelProviders.usage.fields.totalBalance",
                          "Tổng số dư",
                        ),
                        formatApiKeyUsageMoney(
                          compactDeepSeekSummary?.balance,
                          compactDeepSeekSummary?.unit,
                        ),
                      ],
                      [
                        "grantedBalance",
                        t(
                          "codex.modelProviders.usage.fields.grantedBalance",
                          "Số dư tặng",
                        ),
                        formatApiKeyUsageDetailByKey(
                          compactDeepSeekSummary,
                          "grantedBalance",
                        ),
                      ],
                      [
                        "toppedUpBalance",
                        t(
                          "codex.modelProviders.usage.fields.toppedUpBalance",
                          "Số dư nạp",
                        ),
                        formatApiKeyUsageDetailByKey(
                          compactDeepSeekSummary,
                          "toppedUpBalance",
                        ),
                      ],
                    ] as const
                  ).map(([key, label, value]) => (
                    <span
                      key={`${account.id}-${key}`}
                      className={`codex-compact-quota codex-compact-quota-${key}`}
                      title={`${label} ${value}`}
                    >
                      <span className="codex-compact-dot" />
                      <span className="codex-compact-quota-value high">
                        {value}
                      </span>
                    </span>
                  ))}
                </>
              ) : isCodexTokenPlanAccount(account) ? (
                <>
                  {(
                    [
                      [
                        "remaining",
                        t(
                          "codex.modelProviders.usage.fields.remaining",
                          "Remaining",
                        ),
                        formatApiKeyUsageMoney(
                          compactTokenPlanSummary?.quotaRemaining ??
                            compactTokenPlanSummary?.remaining,
                          compactTokenPlanSummary?.unit,
                        ),
                      ],
                      [
                        "planName",
                        t("codex.modelProviders.usage.fields.planName", "Plan"),
                        compactTokenPlanSummary?.planName || "-",
                      ],
                    ] as const
                  ).map(([key, label, value]) => (
                    <span
                      key={`${account.id}-${key}`}
                      className={`codex-compact-quota codex-compact-quota-${key}`}
                      title={`${label} ${value}`}
                    >
                      <span className="codex-compact-dot" />
                      <span className="codex-compact-quota-value high">
                        {value}
                      </span>
                    </span>
                  ))}
                </>
              ) : (
                !isChatCompletionsApiKey && (
                  <>{account.plan_type !== 'self_serve_business_usage_based' && <CodexQuotaMiniRows items={compactOfficialQuotaItems} t={t} />}<CodexTeamQuotaHistory account={account} /></>
                )
              )}
              {showCompactExpiry && (
                <span className="codex-compact-expiry-wrap">
                  <span
                    className={`codex-compact-expiry ${subscriptionInfo.tone}`}
                    title={subscriptionInfo.titleText}
                  >
                    {subscriptionInfo.valueText}
                  </span>
                  {showSubscriptionRefreshAction && (
                    <button
                      type="button"
                      className="codex-subscription-refresh-btn"
                      onClick={() =>
                        void handleRefreshSubscriptionInfo(account.id)
                      }
                      disabled={isSubscriptionRefreshPending}
                      title={t("common.refresh", "Làm mới")}
                      aria-label={t("common.refresh", "Làm mới")}
                    >
                      {t("common.refresh", "Làm mới")}
                    </button>
                  )}
                </span>
              )}
            </div>
            <div className="codex-compact-actions">
              <CodexSpeedControl scope="account" account={account} compact disabled={!!switching}
                onError={(text) => setMessage(text ? { text, tone: "error" } : null)} />
              {renderAddLocalAccessAccountButton(
                account,
                "codex-compact-api-service-btn",
                13,
              )}
              {(clientAuthRequired || isCodexAccountReauthRequired(account)) && (
                <button
                  type="button"
                  className="codex-compact-note-btn codex-compact-reauthorize-btn"
                  onClick={() => openCodexAddModal("tempLogin", account)}
                  title={t("common.reauthorize", "Ủy quyền lại")}
                  aria-label={t("common.reauthorize", "Ủy quyền lại")}
                >
                  <RefreshCw size={13} />
                </button>
              )}
              {!isApiKeyAccount && (
                <button
                  className={`codex-compact-note-btn ${hasCodexAccountNoteDetails(account) ? "has-note" : ""}`}
                  onClick={() => openAccountNoteModal(account)}
                  title={
                    getCodexAccountNoteTitle(account, "") ||
                    t("codex.accountNote.emptyTitle", "Thêm ghi chú tài khoản")
                  }
                  aria-label={t("codex.accountNote.title", "Ghi chú tài khoản")}
                >
                  <FileText size={13} />
                </button>
              )}
              <button
                className={`codex-compact-switch-btn ${!isCurrent ? "success" : ""}`}
                onClick={() => handleSwitch(account.id)}
                disabled={!!switching || Boolean(switchOrLaunchBlockedReason)}
                title={switchOrLaunchBlockedReason || t("codex.switch", "Chuyển")}
              >
                {switching === account.id ? (
                  <RefreshCw size={14} className="loading-spinner" />
                ) : (
                  <Play size={14} />
                )}
              </button>
            </div>
          </div>
        );
      });
  
    const renderGridCards = (items: typeof filteredAccounts, groupKey?: string) =>
      items.map((account) => {
        const presentation = resolvePresentation(account);
        const meta = resolveAccountMeta(account);
        const isCurrent = overviewCurrentAccountId === account.id;
        const isApiKeyAccount = isCodexApiKeyAccount(account);
        const serverRevokedReauth = isCodexServerRevokedReauth(account);
        const refreshTokenReusedState = isCodexRefreshTokenReusedAccount(account);
        const clientAuthRequired =
          !isApiKeyAccount &&
          !account.requires_reauth &&
          !refreshTokenReusedState &&
          account.client_auth_status === "login_required";
        const clientAuthNoticeText = t(
          "codex.switchAuth.apiOnlyDescription",
          "Ứng dụng hiện tại đã chuyển đến trang đăng nhập. Hãy cấp quyền lại để khôi phục ứng dụng; bạn vẫn có thể tiếp tục dùng Dịch vụ API trong lúc này.",
        );
        const clientAuthDetailText = [
          t(
            "codex.switchAuth.observationStatus",
            "Đã phát hiện chuyển hướng đến trang đăng nhập",
          ),
          account.last_client_launch_at
            ? t("codex.switchAuth.launchTime", {
                time: new Date(account.last_client_launch_at * 1000).toLocaleString(),
                defaultValue: "Thời điểm khởi chạy phiên bản: {{time}}",
              })
            : "",
          account.last_client_login_redirect_at
            ? t("codex.switchAuth.loginRedirectTime", {
                time: new Date(
                  account.last_client_login_redirect_at * 1000,
                ).toLocaleString(),
                defaultValue: "Lần chuyển hướng gần nhất đến trang đăng nhập: {{time}}",
              })
            : "",
          account.last_client_auth_observed_at
            ? t("codex.switchAuth.observationTime", {
                time: new Date(
                  account.last_client_auth_observed_at * 1000,
                ).toLocaleString(),
                defaultValue: "Lần kiểm tra gần nhất: {{time}}",
              })
            : "",
          account.last_client_auth_instance_id
            ? t("codex.switchAuth.observationInstance", {
                instance: account.last_client_auth_instance_id,
                defaultValue: "Phiên bản được kiểm tra: {{instance}}",
              })
            : "",
        ]
          .filter(Boolean)
          .join("\n");
        const switchOrLaunchBlockedReason =
          getCodexSwitchOrLaunchBlockedReason(account);
        const isPendingOAuthAccount = isPendingOAuthCodexAccount(account);
        const isNewApiAccount = isCodexNewApiAccount(account);
        const isEditingApiKeyName =
          isApiKeyAccount && editingApiKeyNameId === account.id;
        const isSavingApiKeyName = savingApiKeyNameId === account.id;
        const planClass = presentation.planClass || "unknown";
        const isSelected = selected.has(account.id);
        const quotaItems = applyWindowStatsToQuotaItems(
          account,
          resolveVisibleQuotaItems(
            presentation,
            isApiKeyAccount,
            isNewApiAccount,
          ),
        );
        const reauthErrorMeta = resolveQuotaErrorMeta(
          !refreshTokenReusedState && account.requires_reauth && account.reauth_reason
            ? {
                message: account.reauth_reason,
                timestamp: account.token_updated_at || account.last_used,
              }
            : undefined,
        );
        const quotaErrorMeta = resolveQuotaErrorMeta(
          refreshTokenReusedState ? undefined : account.quota_error,
        );
        const accountIssueMeta = reauthErrorMeta.rawMessage
          ? reauthErrorMeta
          : quotaErrorMeta;
        const hasQuotaError = Boolean(accountIssueMeta.rawMessage);
        const isRefreshTokenNotice = isCodexRefreshTokenNoticeOnly(account);
        const isClientReauthNotice =
          !serverRevokedReauth &&
          !refreshTokenReusedState &&
          isCodexClientReauthNoticeOnly(account);
        const isQuotaRefreshNotice =
          isClientReauthNotice ||
          (!reauthErrorMeta.rawMessage &&
            quotaErrorMeta.isRefreshRequestFailure &&
            !quotaErrorMeta.statusCode &&
            !quotaErrorMeta.errorCode);
        const accountIssueDisplayText = isRefreshTokenNotice
          ? t(
              "codex.quotaError.authRefreshDeferred",
              "refresh_token đã mất hiệu lực. access_token hiện tại vẫn dùng được cho dịch vụ API nhưng không thể chuyển ứng dụng chính thức. Hãy cấp quyền lại trước khi chuyển.",
            )
          : accountIssueMeta.displayText;
        const accountIssueBadge = isRefreshTokenNotice
          ? t("codex.authError.badge", "Lỗi ủy quyền")
          : isQuotaRefreshNotice
            ? t("codex.quotaError.refreshFailedBadge", "Làm mới thất bại")
            : reauthErrorMeta.rawMessage
              ? t("codex.authError.badge", "Lỗi ủy quyền")
              : accountIssueMeta.statusCode ||
                t("codex.quotaError.badge", "Lỗi quota");
        const showReauthorizeAction =
          !isApiKeyAccount &&
          !isRefreshTokenNotice &&
          (isPendingOAuthAccount ||
            isCodexAccountReauthRequired(account) ||
            (hasQuotaError && shouldOfferReauthorizeAction(accountIssueMeta)));
        const accountIdText =
          meta.chatgptAccountId &&
          meta.chatgptAccountId !== t("common.none", "None​")
            ? meta.chatgptAccountId
            : meta.userId;
        const signInLine = `${meta.signedInWithText} | ${accountIdLabel}: ${accountIdText}`;
        const apiProviderName = resolveApiProviderDisplayName(account);
        const apiProviderLine = `${t("codex.api.provider.label", "Nhà cung cấp")}：${apiProviderName}`;
        const apiBaseUrlText = (account.api_base_url || "").trim() || "-";
        const apiBaseUrlLine = `${t("codex.api.baseUrl", "Base URL")}：${apiBaseUrlText}`;
        const apiKeyUsageProvider = resolveUsageProviderForApiKeyAccount(account);
        const isSponsorApiKeyAccount =
          isApiKeyAccount &&
          isSponsorModelProvider(
            apiKeyUsageProvider,
            sponsorApiProviderTemplates,
          );
        const apiKeyUsageMode = resolveApiKeyUsageMode(
          apiKeyUsageMap[account.id]?.summary,
        );
        const showApiKeyUsagePanel = shouldShowCodexApiKeyUsagePanel(
          account,
          hideRelayQuota,
        );
        const isSub2ApiUsageAccount =
          showApiKeyUsagePanel &&
          (apiKeyUsageMode === "sub2api" ||
            apiKeyUsageProvider?.integrationType === "sub2api");
        const isTokenPlanUsageAccount =
          showApiKeyUsagePanel && apiKeyUsageMode === "token_plan";
        const isQuotaAwareApiKeyAccount =
          showApiKeyUsagePanel &&
          !isSponsorApiKeyAccount &&
          (apiKeyUsageMode !== null ||
            isDeepSeekAccount(account) ||
            apiKeyUsageProvider?.integrationType === "new_api" ||
            apiKeyUsageProvider?.integrationType === "sub2api");
        const shouldRenderQuotaSection =
          showApiKeyUsagePanel ||
          !isApiKeyAccount ||
          (isNewApiAccount && !hideRelayQuota);
        const displayPlanClass = isSponsorApiKeyAccount
          ? "sponsor-api"
          : isQuotaAwareApiKeyAccount
            ? "new-api-exclusive"
            : planClass;
        const displayPlanLabel = isSponsorApiKeyAccount
          ? apiProviderName
          : presentation.planLabel;
        const cockpitApiAccountBalanceText =
          isNewApiAccount && !hideRelayQuota
            ? resolveCockpitApiAccountBalanceText(account)
            : null;
        const accountTags = (account.tags || [])
          .map((tag) => tag.trim())
          .filter(Boolean);
        // 充分利用卡片横向空间：最多展示 8 个，避免 3 个标签就被 +N 收起（#962）
        const visibleTags = accountTags.slice(0, 8);
        const moreTagCount = Math.max(0, accountTags.length - visibleTags.length);
        const isInLocalAccess = localAccessAccountIdSet.has(account.id);
        const canAddToLocalAccess = canDirectlyAddLocalAccessAccount(account);
        const subscriptionInfo = resolveSubscriptionPresentation(account);
        const isSubscriptionInfoMissing = subscriptionInfo.bucket === "missing";
        const isAccessTokenOnlySubscription =
          subscriptionInfo.bucket === "access_token_only";
        const showSubscriptionRefreshAction =
          !isApiKeyAccount &&
          !isPendingOAuthAccount &&
          (subscriptionInfo.bucket === "missing" ||
            subscriptionInfo.bucket === "expired");
        const isSubscriptionRefreshPending =
          refreshingSubscriptionAccountId === account.id ||
          refreshing === account.id;
        const resetCreditControls = renderResetCreditControls(account);
        return (
          <div
            key={groupKey ? `${groupKey}-${account.id}` : account.id}
            className={`codex-account-card ${isCurrent ? "current" : ""} ${isSelected ? "selected" : ""} ${isPendingOAuthAccount ? "pending-auth" : ""} ${isNewApiAccount ? "new-api-exclusive" : ""} ${isQuotaAwareApiKeyAccount ? "api-key-usage-account" : ""} ${isSponsorApiKeyAccount ? "sponsor-api-account" : ""}`}
          >
            <div className="card-top">
              <div className="card-select">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleOverviewAccount(account.id)}
                />
              </div>
              {isEditingApiKeyName ? (
                <input
                  className="account-email inline-name-editor"
                  value={editingApiKeyNameValue}
                  onChange={(event) =>
                    setEditingApiKeyNameValue(event.target.value)
                  }
                  onBlur={() => void handleSubmitInlineRename(account)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleSubmitInlineRename(account);
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      inlineRenameDiscardRef.current = true;
                      clearInlineRename();
                    }
                  }}
                  disabled={isSavingApiKeyName}
                  autoFocus
                />
              ) : (
                <span
                  className={`account-email ${isApiKeyAccount ? "editable" : ""}`}
                  title={maskAccountText(presentation.displayName)}
                  onDoubleClick={() => handleAccountNameDoubleClick(account)}
                >
                  {maskAccountText(presentation.displayName)}
                </span>
              )}
              {isCurrent && (
                <span className="current-tag">{t("codex.current", "Hiện tại")}</span>
              )}
              {clientAuthRequired && (
                <span
                  className="codex-status-pill quota-refresh codex-client-auth-status-pill"
                  title={t(
                    "codex.switchAuth.apiOnlyDescription",
                    "Ứng dụng hiện tại đã chuyển đến trang đăng nhập. Hãy cấp quyền lại để khôi phục ứng dụng; bạn vẫn có thể tiếp tục dùng Dịch vụ API trong lúc này.",
                  )}
                >
                  <CircleAlert size={12} />
                  {t("codex.switchAuth.apiOnlyBadge", "Cần đăng nhập")}
                </span>
              )}
              {hasQuotaError && (
                <span
                  className={`codex-status-pill ${isQuotaRefreshNotice ? "quota-refresh" : "quota-error"}`}
                  title={accountIssueDisplayText}
                >
                  {isQuotaRefreshNotice ? (
                    <Info size={12} />
                  ) : (
                    <CircleAlert size={12} />
                  )}
                  {accountIssueBadge}
                </span>
              )}
              <span className={`tier-badge ${displayPlanClass}`}>
                {displayPlanLabel}
              </span>
            </div>
            {(meta.accountContextText ||
              isInLocalAccess ||
              canAddToLocalAccess ||
              (!isApiKeyAccount && hasCodexAccountNoteDetails(account)) ||
              resetCreditControls || canUseCodexAccountProxy(account) || isApiKeyAccount) && (
              <div className="account-sub-line">
                {meta.accountContextText && (
                  <span
                    className="codex-login-subline"
                    title={meta.accountContextText}
                  >
                    Team Name：{meta.accountContextText}
                  </span>
                )}
                {isInLocalAccess && (
                  <button
                    type="button"
                    className="group-account-badge codex-local-access-inline-remove"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleRemoveLocalAccessAccount(account.id);
                    }}
                    disabled={addingLocalAccessAccountId !== null}
                    title={t("codex.localAccess.removeAction", "Xóa khỏi API")}
                    aria-label={t(
                      "codex.localAccess.removeAction",
                      "Xóa khỏi API",
                    )}
                  >
                    {addingLocalAccessAccountId === account.id ? (
                      <RefreshCw size={11} className="loading-spinner" />
                    ) : (
                      <Link2 size={11} />
                    )}
                    {t("codex.localAccess.removeAction", "Xóa khỏi API")}
                  </button>
                )}
                {!isInLocalAccess && canAddToLocalAccess && (
                  <button
                    type="button"
                    className="group-account-badge codex-local-access-inline-add"
                    onClick={() => void handleAddLocalAccessAccount(account.id)}
                    disabled={addingLocalAccessAccountId !== null}
                    title={t("codex.localAccess.entryAction", "Thêm vào dịch vụ API")}
                  >
                    <Link2 size={11} />
                    {t("codex.localAccess.entryAction", "Thêm vào dịch vụ API")}
                  </button>
                )}
                {!isApiKeyAccount && renderAccountNoteButton(account)}
                {resetCreditControls}
                <CodexAccountProxyButton account={account} />
              </div>
            )}
            <CodexAccountProxyCard account={account} placement="summary" />
            {!isApiKeyAccount && (
              <div className="account-sub-line">
                <span className="codex-login-subline" title={signInLine}>
                  {meta.signedInWithText} | {accountIdLabel}:{" "}
                  {maskAccountText(accountIdText)}
                </span>
              </div>
            )}
            {isApiKeyAccount && (
              <>
                <div className="account-sub-line">
                  {renderApiKeyRevealLine(account)}
                </div>
                {renderOAuthBindingLine(account)}
                <div className="account-sub-line codex-provider-inline-line">
                  <span
                    className="codex-login-subline codex-provider-inline-text"
                    title={apiProviderLine}
                  >
                    {apiProviderLine}
                  </span>
                  {!isNewApiAccount && (
                    <button
                      type="button"
                      className="codex-provider-inline-switch"
                      onClick={() => openQuickSwitchProviderModal(account)}
                      title={t("codex.quickSwitch.action", "Chuyển nhanh nhà cung cấp")}
                    >
                      {t("codex.quickSwitch.inlineAction", "Chuyển")}
                    </button>
                  )}
                </div>
                <div className="account-sub-line codex-provider-inline-line">
                  <span
                    className="codex-login-subline codex-provider-inline-text"
                    title={apiBaseUrlLine}
                  >
                    {apiBaseUrlLine}
                  </span>
                  {(isSub2ApiUsageAccount || isTokenPlanUsageAccount) && (
                    <button
                      type="button"
                      className="codex-provider-inline-switch"
                      onClick={() => setApiKeyUsageDetailAccountId(account.id)}
                      title={t(
                        "codex.modelProviders.usage.detailTitle",
                        "Bảng dịch vụ",
                      )}
                    >
                      {t("common.detail", "Chi tiết")}
                    </button>
                  )}
                </div>
              </>
            )}
            {accountTags.length > 0 && (
              <div className="card-tags">
                {visibleTags.map((tag, idx) => (
                  <span key={`${account.id}-${tag}-${idx}`} className="tag-pill">
                    {tag}
                  </span>
                ))}
                {moreTagCount > 0 && (
                  <span className="tag-pill more">+{moreTagCount}</span>
                )}
              </div>
            )}
            {shouldRenderQuotaSection && (
              <div className="codex-quota-section">
                {showApiKeyUsagePanel ? (
                  renderApiKeyUsagePanel(account, apiKeyUsageProvider)
                ) : (
                  <>
                    {clientAuthRequired &&
                      renderQuotaErrorInline({
                        accountName: presentation.displayName,
                        displayText: clientAuthNoticeText,
                        rawMessage: clientAuthDetailText,
                        isVerbose: false,
                        detailSummary: clientAuthNoticeText,
                        detailReauthorizeAccountId: account.id,
                        clearClientAuthObservationAccountId: account.id,
                        detailTitle: t(
                          "codex.switchAuth.apiOnlyTitle",
                          "Ứng dụng cần đăng nhập",
                        ),
                        isRefreshNotice: true,
                        showReauthorize: true,
                        onReauthorize: () =>
                          openCodexAddModal("tempLogin", account),
                      })}
                    {!isPendingOAuthAccount &&
                      hasQuotaError &&
                      renderQuotaErrorInline({
                        accountName: presentation.displayName,
                        displayText: accountIssueDisplayText,
                        rawMessage: accountIssueMeta.rawMessage,
                        isVerbose: accountIssueMeta.isVerbose,
                        detailSummary: isRefreshTokenNotice
                          ? accountIssueDisplayText
                          : undefined,
                        detailReauthorizeAccountId:
                          isRefreshTokenNotice || showReauthorizeAction
                            ? account.id
                            : undefined,
                        isRefreshNotice: isQuotaRefreshNotice,
                        showReauthorize: showReauthorizeAction,
                        onReauthorize: () =>
                          openCodexAddModal("tempLogin", account),
                      })}
                    {cockpitApiAccountBalanceText && (
                      <div className="codex-account-balance-line">
                        <span>
                          {t(
                            "codex.modelProviders.usage.accountBalance",
                            "Số dư tài khoản",
                          )}
                          ：
                        </span>
                        <strong>{cockpitApiAccountBalanceText}</strong>
                      </div>
                    )}
                    {account.plan_type !== 'self_serve_business_usage_based' && <CodexQuotaMiniRows items={quotaItems} t={t} />}
                    <CodexTeamQuotaHistory account={account} />
                    {quotaItems.length === 0 && !cockpitApiAccountBalanceText && (
                      <div className="quota-empty">
                        {t("common.shared.quota.noData", "Không có dữ liệu hạn mức")}
                      </div>
                    )}
                    {isPendingOAuthAccount && (
                      <div className="codex-card-action-inline">
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => openCodexAddModal("oauth", account)}
                          title={t("common.shared.addModal.oauth", "Ủy quyền OAuth")}
                        >
                          {t("common.shared.addModal.oauth", "Ủy quyền OAuth")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {!isApiKeyAccount && (
              <div
                className={`codex-subscription-footer ${subscriptionInfo.tone}`}
                title={subscriptionInfo.titleText}
              >
                <div className="codex-subscription-footer-main">
                  <Calendar size={14} />
                  {isSubscriptionInfoMissing || isAccessTokenOnlySubscription ? (
                    <strong>{subscriptionInfo.valueText}</strong>
                  ) : (
                    <>
                      <span>{t("codex.subscription.label", "Hết hạn gói")}</span>
                      <strong>{subscriptionInfo.valueText}</strong>
                    </>
                  )}
                </div>
                {(subscriptionInfo.timestampMs != null ||
                  showSubscriptionRefreshAction) && (
                  <div className="codex-subscription-footer-side">
                    {subscriptionInfo.timestampMs != null && (
                      <span className="codex-subscription-footer-date">
                        {subscriptionInfo.detailText}
                      </span>
                    )}
                    {showSubscriptionRefreshAction && (
                      <button
                        type="button"
                        className="codex-subscription-refresh-btn"
                        onClick={() =>
                          void handleRefreshSubscriptionInfo(account.id)
                        }
                        disabled={isSubscriptionRefreshPending}
                        title={t("common.refresh", "Làm mới")}
                        aria-label={t("common.refresh", "Làm mới")}
                      >
                        {t("common.refresh", "Làm mới")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="codex-card-bottom">
              <CodexAccountProxyCard account={account} placement="detailed" />
              <span className="card-date">{formatDate(account.created_at)}</span>
              <CodexSpeedControl scope="account" account={account} disabled={!!switching}
                onError={(text) => setMessage(text ? { text, tone: "error" } : null)} />
              <div className="card-footer">
                <div className="card-actions">
                  <button
                    className="card-action-btn"
                    onClick={() => void handleLaunchCodexCli(account)}
                    disabled={
                      cliLaunchingAccountId === account.id ||
                      Boolean(switchOrLaunchBlockedReason)
                    }
                    title={
                      switchOrLaunchBlockedReason ||
                      t("common.cliQuickLaunch", "Mở CLI")
                    }
                  >
                    {cliLaunchingAccountId === account.id ? (
                      <RefreshCw size={14} className="loading-spinner" />
                    ) : (
                      <Terminal size={14} />
                    )}
                  </button>
                  {isNewApiAccount && (
                    <button
                      className="card-action-btn"
                      onClick={() => setCockpitApiPanelAccountId(account.id)}
                      title={t("codex.cockpitApi.servicePanel", "Bảng dịch vụ")}
                    >
                      <Database size={14} />
                    </button>
                  )}
                  <button
                    className="card-action-btn"
                    onClick={() => openTagModal(account.id)}
                    title={t("accounts.editTags", "Chỉnh sửa thẻ")}
                  >
                    <Tag size={14} />
                  </button>
                  {!isApiKeyAccount && !isNewApiAccount && (
                    <button
                      className={`card-action-btn ${hasCodexAccountNoteDetails(account) ? "active" : ""}`}
                      onClick={() => openAccountNoteModal(account)}
                      title={
                        getCodexAccountNoteTitle(account, "") ||
                        t("codex.accountNote.emptyTitle", "Thêm ghi chú tài khoản")
                      }
                      aria-label={t("codex.accountNote.title", "Ghi chú tài khoản")}
                    >
                      <FileText size={14} />
                    </button>
                  )}
                  {isApiKeyAccount && !isNewApiAccount && (
                    <button
                      className="card-action-btn"
                      onClick={() => openApiKeyCredentialsModal(account)}
                      title={t("instances.actions.edit", "Chỉnh sửa")}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    className={`card-action-btn ${!isCurrent ? "success" : ""}`}
                    onClick={() => handleSwitch(account.id)}
                    disabled={!!switching || Boolean(switchOrLaunchBlockedReason)}
                    title={
                      switchOrLaunchBlockedReason || t("codex.switch", "Chuyển")
                    }
                  >
                    {switching === account.id ? (
                      <RefreshCw size={14} className="loading-spinner" />
                    ) : (
                      <Play size={14} />
                    )}
                  </button>
                  {!isPendingOAuthAccount &&
                    (!isApiKeyAccount ||
                      isNewApiAccount ||
                      canRefreshApiKeyUsage(account, apiKeyUsageProvider)) && (
                      <button
                        className="card-action-btn"
                        onClick={() =>
                          canRefreshApiKeyUsage(account, apiKeyUsageProvider)
                            ? void refreshApiKeyUsage(
                                account,
                                apiKeyUsageProvider,
                              )
                            : handleRefresh(account.id)
                        }
                        disabled={
                          canRefreshApiKeyUsage(account, apiKeyUsageProvider)
                            ? apiKeyUsageMap[account.id]?.loading === true
                            : refreshing === account.id
                        }
                        title={t("common.shared.refreshQuota", "Làm mới hạn mức")}
                      >
                        <RotateCw
                          size={14}
                          className={
                            canRefreshApiKeyUsage(account, apiKeyUsageProvider)
                              ? apiKeyUsageMap[account.id]?.loading === true
                                ? "loading-spinner"
                                : ""
                              : refreshing === account.id
                                ? "loading-spinner"
                                : ""
                          }
                        />
                      </button>
                    )}
                  <button
                    className="card-action-btn export-btn"
                    onClick={() =>
                      handleExportByIds(
                        [account.id],
                        resolveSingleExportBaseName(account),
                      )
                    }
                    title={t("common.shared.export.title", "Xuất")}
                  >
                    <Upload size={14} />
                  </button>
                  <button
                    className="card-action-btn danger"
                    onClick={() => handleDelete(account.id)}
                    title={t("common.recycleBin.move")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      });
  
    const renderLocalAccessInlineCard = () => {
      if (!localAccessEntryVisible) {
        return null;
      }
  
      const isGridLocalAccessCard = overviewLayoutMode === "grid";
      const showLocalAccessDetails = isGridLocalAccessCard
        ? true
        : localAccessDetailsExpanded;
      const baseUrl = resolveLocalAccessBaseUrl();
      const apiKeyDisplay = !localAccessCollection
        ? CODEX_LOCAL_ACCESS_FALLBACK_API_KEY_MASK
        : localAccessKeyVisible
          ? localAccessCollection.apiKey
          : `${localAccessCollection.apiKey.slice(0, 10)}••••••••••••`;
      const localAccessOAuthBindingLabel = t(
        "codex.api.oauthBinding.label",
        "Liên kết OAuth",
      );
      const localAccessOAuthBindingValue = boundLocalAccessOAuthAccount
        ? maskAccountText(
            boundLocalAccessOAuthAccount.account_name ||
              boundLocalAccessOAuthAccount.email ||
              boundLocalAccessOAuthAccount.id,
          )
        : t("codex.api.oauthBinding.unbound", "Chưa liên kết");
      const localAccessOAuthBindingLine = `${localAccessOAuthBindingLabel}：${localAccessOAuthBindingValue}`;
      const localAccessBoundOAuthNeedsReauth = Boolean(
        boundLocalAccessOAuthAccount?.requires_reauth,
      );
      const localAccessBoundOAuthIssueText =
        boundLocalAccessOAuthAccount?.reauth_reason?.trim() ||
        t(
          "codex.switchAuth.reauthorizeDescription",
          "Không thể làm mới thông tin đăng nhập và access_token không còn dùng được cho dịch vụ API. Hãy ủy quyền lại tài khoản để tiếp tục.",
        );
      const quotaReserveStatus = localAccessState?.quotaReserveStatus ?? null;
      const quotaReserveWarningLine =
        quotaReserveStatus?.warning &&
        quotaReserveStatus.effectiveWindow &&
        quotaReserveStatus.effectiveRemainingPercent != null &&
        quotaReserveStatus.effectiveReservePercent != null
          ? `${
              quotaReserveStatus.effectiveWindow === "weekly"
                ? t(
                    "codex.localAccess.oauthBinding.quotaReserveWeeklyLabel",
                    "Giữ lại theo tuần",
                  )
                : t(
                    "codex.localAccess.oauthBinding.quotaReserveHourlyLabel",
                    "Giữ lại 5 giờ",
                  )
            }：${quotaReserveStatus.effectiveRemainingPercent}% / ${quotaReserveStatus.effectiveReservePercent}%`
          : null;
      const localAccessStatusTone = resolveCodexLocalAccessRuntimeStatus(
        localAccessCollection,
        localAccessState,
      );
      const localAccessStatusText = t(CODEX_LOCAL_ACCESS_STATUS_KEYS[localAccessStatusTone]);
      const isLocalAccessCurrent = localAccessLaunchCurrent;
      const localAccessMemberCountLabel = t("codex.localAccess.accountCount", {
        count: localAccessState?.memberCount ?? 0,
        defaultValue: "{{count}} tài khoản",
      });
      return (
        <div
          key="codex-local-access-card"
          className={`codex-account-card folder-inline-card codex-local-access-card codex-local-access-card--${overviewLayoutMode} ${
            isLocalAccessCurrent ? "current" : ""
          } ${showLocalAccessDetails ? "is-expanded" : "is-collapsed"}`}
        >
          <div className="folder-inline-header codex-local-access-header">
            {isGridLocalAccessCard ? (
              <>
                <div className="folder-inline-info">
                  <div className="codex-local-access-title-row">
                    <span className="codex-local-access-current-mode">
                      {t("codex.localAccess.title", "Dịch vụ API")}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div
                className="codex-local-access-summary-trigger"
                role="button"
                tabIndex={0}
                onClick={() =>
                  setLocalAccessDetailsExpanded((current) => !current)
                }
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setLocalAccessDetailsExpanded((current) => !current);
                }}
                title={
                  showLocalAccessDetails
                    ? t("codex.localAccess.collapseDetails", "Thu gọn")
                    : t("codex.localAccess.expandDetails", "Mở chi tiết")
                }
              >
                <div className="folder-inline-info">
                  <div className="codex-local-access-title-row">
                    <span className="codex-local-access-current-mode">
                      {t("codex.localAccess.title", "Dịch vụ API")}
                    </span>
                    <span className="codex-local-access-summary-text">
                      {localAccessMemberCountLabel}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="codex-local-access-header-actions">
              <button
                type="button"
                className={`codex-local-access-instance-gateways${
                  instanceGatewaySummary.issues > 0 ? " has-issue" : ""
                }${instanceGatewaySummary.total === 0 ? " is-empty" : ""}`}
                onClick={openInstanceGateways}
                title={t("codex.instanceGateways.title", "Cổng instance")}
                aria-label={t("codex.instanceGateways.title", "Cổng instance")}
              >
                {instanceGatewaysLoading ? (
                  <RefreshCw size={12} className="loading-spinner" />
                ) : (
                  <Waypoints size={13} />
                )}
                <span>
                  {instanceGatewaySummary.total > 0
                    ? t("codex.instanceGateways.entryCount", {
                        count: instanceGatewaySummary.total,
                        defaultValue: "Cổng instance {{count}}",
                      })
                    : t("codex.instanceGateways.entry", "Cổng instance")}
                </span>
                {instanceGatewaySummary.issues > 0 && (
                  <span className="codex-local-access-instance-gateways-issue">
                    {t("codex.instanceGateways.issueCount", {
                      count: instanceGatewaySummary.issues,
                      defaultValue: "{{count}} bất thường",
                    })}
                  </span>
                )}
              </button>
              {isLocalAccessCurrent && (
                <span className="current-tag">{t("codex.current", "Hiện tại")}</span>
              )}
              <span
                className={`codex-local-access-status ${localAccessStatusTone}`}
              >
                {localAccessStatusText}
              </span>
              {!isGridLocalAccessCard && (
                <button
                  type="button"
                  className="folder-icon-btn codex-local-access-toggle-btn"
                  onClick={() =>
                    setLocalAccessDetailsExpanded((current) => !current)
                  }
                  title={
                    showLocalAccessDetails
                      ? t("codex.localAccess.collapseDetails", "Thu gọn")
                      : t("codex.localAccess.expandDetails", "Mở chi tiết")
                  }
                  aria-label={
                    showLocalAccessDetails
                      ? t("codex.localAccess.collapseDetails", "Thu gọn")
                      : t("codex.localAccess.expandDetails", "Mở chi tiết")
                  }
                >
                  <ChevronRight
                    size={16}
                    className={`codex-local-access-toggle-icon ${
                      showLocalAccessDetails ? "is-open" : ""
                    }`}
                  />
                </button>
              )}
              <button
                type="button"
                className="folder-icon-btn codex-local-access-close-btn"
                onClick={() => void handleHideLocalAccessEntry()}
                title={t(
                  "codex.localAccess.hideEntryAction",
                  "Ẩn mục Dịch vụ API",
                )}
                aria-label={t(
                  "codex.localAccess.hideEntryAction",
                  "Ẩn mục Dịch vụ API",
                )}
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="account-sub-line"><CodexAccountProxyButton account={apiServiceProxyAccount(t("codex.localAccess.title"))} /></div>
          <CodexAccountProxyCard account={apiServiceProxyAccount(t("codex.localAccess.title"))} placement="summary" />
          <CodexAccountProxyCard account={apiServiceProxyAccount(t("codex.localAccess.title"))} placement="detailed" />
          {showLocalAccessDetails && (
            <>
              <div className="codex-local-access-meta">
                <div className="codex-local-access-row">
                  <div className="codex-local-access-label codex-local-access-address-select">
                    <SingleSelectDropdown
                      value={selectedLocalAccessAddressKind}
                      options={localAccessAddressOptions}
                      onChange={handleLocalAccessAddressKindChange}
                      menuClassName="codex-local-access-address-menu"
                      menuWidth={92}
                      menuMaxHeight={120}
                      disabled={localAccessAddressOptions.length < 2}
                      ariaLabel={t("codex.localAccess.addressKind", "Loại địa chỉ")}
                    />
                  </div>
                  <code className="codex-local-access-code" title={baseUrl}>
                    {baseUrl || "-"}
                  </code>
                  <div className="codex-local-access-row-actions">
                    <button
                      type="button"
                      className="folder-icon-btn"
                      onClick={() =>
                        void handleCopyLocalAccessValue("baseUrl", baseUrl)
                      }
                      title={t("common.copy", "Copy​")}
                      disabled={!baseUrl}
                    >
                      {localAccessCopiedField === "baseUrl" ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="codex-local-access-row">
                  <span className="codex-local-access-label">
                    {t("codex.localAccess.apiKey", "Khóa")}
                  </span>
                  <code
                    className="codex-local-access-code"
                    title={localAccessCollection?.apiKey || "-"}
                  >
                    {apiKeyDisplay}
                  </code>
                  <div className="codex-local-access-row-actions">
                    <button
                      type="button"
                      className="folder-icon-btn"
                      onClick={() =>
                        setLocalAccessKeyVisible((current) => !current)
                      }
                      title={
                        localAccessKeyVisible
                          ? t("codex.localAccess.hideKey", "Ẩn khóa")
                          : t("codex.localAccess.showKey", "Hiện khóa")
                      }
                      disabled={!localAccessCollection}
                    >
                      {localAccessKeyVisible ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                    <button
                      type="button"
                      className="folder-icon-btn"
                      onClick={() =>
                        void handleCopyLocalAccessValue(
                          "apiKey",
                          localAccessCollection?.apiKey || "",
                        )
                      }
                      title={t("common.copy", "Copy​")}
                      disabled={!localAccessCollection}
                    >
                      {localAccessCopiedField === "apiKey" ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="account-sub-line codex-provider-inline-line codex-oauth-binding-line codex-local-access-oauth-line">
                  <span
                    className="codex-login-subline codex-provider-inline-text"
                    title={localAccessOAuthBindingLine}
                  >
                    {localAccessOAuthBindingLine}
                  </span>
                  {localAccessBoundOAuthNeedsReauth && (
                    <span
                      className="codex-status-pill quota-error"
                      title={localAccessBoundOAuthIssueText}
                    >
                      <CircleAlert size={12} />
                      {t("codex.authError.badge", "Lỗi ủy quyền")}
                    </span>
                  )}
                  {localAccessBoundOAuthNeedsReauth &&
                    boundLocalAccessOAuthAccount && (
                      <button
                        type="button"
                        className="codex-provider-inline-switch codex-oauth-binding-action"
                        onClick={() =>
                          openCodexAddModal(
                            "oauth",
                            boundLocalAccessOAuthAccount,
                          )
                        }
                        title={t("common.reauthorize", "Ủy quyền lại")}
                        disabled={localAccessBusy}
                      >
                        <RefreshCw size={11} />
                        {t("common.reauthorize", "Ủy quyền lại")}
                      </button>
                    )}
                  <button
                    type="button"
                    className="codex-provider-inline-switch codex-oauth-binding-action"
                    onClick={() => openLocalAccessOAuthBindingModal()}
                    title={t("codex.api.oauthBinding.action", "Liên kết OAuth")}
                    disabled={localAccessBusy}
                  >
                    <Link2 size={11} />
                    {t("codex.api.oauthBinding.actionShort", "Liên kết")}
                  </button>
                </div>
                {quotaReserveWarningLine && (
                  <div
                    className={`codex-local-access-quota-reserve-warning ${
                      quotaReserveStatus?.blocked ? "is-blocked" : "is-near"
                    }`}
                    title={t(
                      "codex.localAccess.oauthBinding.quotaReserveDesc",
                      "Dịch vụ API chỉ dùng tài khoản OAuth này khi hạn mức còn lại của 5 giờ và tuần đều cao hơn mức giữ lại.",
                    )}
                  >
                    <CircleAlert size={13} />
                    <span>{quotaReserveWarningLine}</span>
                  </div>
                )}
              </div>
  
              {localAccessQuotaPreviewItems.length > 0 && (
                <div
                  className="codex-local-access-pool-row"
                  aria-label={localAccessQuotaPoolLabels.title}
                >
                  {localAccessQuotaPreviewItems.map((item) => (
                    <div key={item.key} className="codex-local-access-pool-pill">
                      <strong>
                        {item.key} ({item.count})
                      </strong>
                      {item.windows.map((window) => (
                        <span key={window.key}>
                          {formatCodexQuotaPoolWindowLabel(
                            window.label,
                            localAccessQuotaPoolLabels.weekly,
                          )}{" "}
                          {formatCodexQuotaPoolPercent(window.percentage)}
                        </span>
                      ))}
                    </div>
                  ))}
                  {localAccessQuotaHiddenCount > 0 && (
                    <button
                      type="button"
                      className="codex-local-access-pool-more"
                      onClick={() => setShowLocalAccessQuotaStatsModal(true)}
                      title={t(
                        "codex.localAccess.quotaPool.viewFull",
                        "Xem thống kê đầy đủ",
                      )}
                      aria-label={t(
                        "codex.localAccess.quotaPool.viewFull",
                        "Xem thống kê đầy đủ",
                      )}
                    >
                      +{localAccessQuotaHiddenCount}
                    </button>
                  )}
                </div>
              )}
  
              {localAccessAccountPoolHealthSummary.total > 0 && (
                <button
                  type="button"
                  className={`codex-local-access-health-summary${
                    localAccessAccountPoolHealthHasIssue ? " has-issue" : ""
                  }`}
                  title={t("codex.localAccess.accountPoolHealth.detail", {
                    available: localAccessAccountPoolHealthSummary.available,
                    total: localAccessAccountPoolHealthSummary.total,
                    abnormal: localAccessAccountPoolHealthSummary.abnormal,
                    cooldown: localAccessAccountPoolHealthSummary.cooldown,
                    missing: localAccessAccountPoolHealthSummary.missing,
                    authError: localAccessAccountPoolHealthSummary.authError,
                    quotaLimited:
                      localAccessAccountPoolHealthSummary.quotaLimited,
                    defaultValue:
                      "OK {{available}}/{{total}}, lỗi {{abnormal}}, chờ {{cooldown}}, thiếu {{missing}}, auth {{authError}}, hạn mức {{quotaLimited}}",
                  })}
                  onClick={() => setShowLocalAccessHealthModal(true)}
                  aria-label={t(
                    "codex.localAccess.accountPoolHealth.openDetails",
                    "Xem lỗi tài khoản",
                  )}
                >
                  <span className="codex-local-access-health-summary-title">
                    {t("codex.localAccess.accountPoolHealth.title", "Trạng thái tài khoản")}
                  </span>
                  <span className="codex-local-access-health-summary-value">
                    {localAccessAccountPoolHealthSummary.available ===
                    localAccessAccountPoolHealthSummary.total &&
                    localAccessAccountPoolHealthSummary.abnormal === 0 &&
                    localAccessAccountPoolHealthSummary.cooldown === 0
                      ? t("codex.localAccess.accountPoolHealth.allAvailable", {
                          count: localAccessAccountPoolHealthSummary.total,
                          defaultValue: "Tất cả OK {{count}}",
                        })
                      : t("codex.localAccess.accountPoolHealth.availableRatio", {
                          available:
                            localAccessAccountPoolHealthSummary.available,
                          total: localAccessAccountPoolHealthSummary.total,
                          defaultValue: "Tốt {{available}}/{{total}}",
                        })}
                  </span>
                  {(localAccessAccountPoolHealthSummary.abnormal > 0 ||
                    localAccessAccountPoolHealthSummary.cooldown > 0) && (
                    <span className="codex-local-access-health-summary-value">
                      {t("codex.localAccess.accountPoolHealth.issueSummary", {
                        abnormal: localAccessAccountPoolHealthSummary.abnormal,
                        cooldown: localAccessAccountPoolHealthSummary.cooldown,
                        defaultValue: "Lỗi {{abnormal}} · Chờ {{cooldown}}",
                      })}
                    </span>
                  )}
                </button>
              )}
  
              {localAccessState?.lastError && (
                <div className="quota-error-inline">
                  <CircleAlert size={14} />
                  <span
                    className="quota-error-inline-text"
                    title={summarizeCodexQuotaErrorMessage(
                      localAccessState.lastError,
                    )}
                  >
                    {summarizeCodexQuotaErrorMessage(localAccessState.lastError)}
                  </span>
                  {isVerboseCodexQuotaErrorMessage(
                    localAccessState.lastError,
                  ) && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline quota-error-action"
                      onClick={() =>
                        openQuotaErrorDetail(
                          t("codex.localAccess.title", "Dịch vụ API"),
                          localAccessState.lastError ?? "",
                        )
                      }
                      title={t("codex.quotaError.viewDetails", "Chi tiết")}
                    >
                      {t("codex.quotaError.viewDetails", "Chi tiết")}
                    </button>
                  )}
                  <button
                    type="button"
                    className="folder-icon-btn codex-local-access-error-action"
                    onClick={() => void handleKillLocalAccessPort()}
                    title={t("codex.localAccess.killPortAction")}
                    aria-label={t("codex.localAccess.killPortAction")}
                    disabled={localAccessBusy || !localAccessCollection}
                  >
                    {localAccessPortKilling ? (
                      <RefreshCw size={14} className="loading-spinner" />
                    ) : (
                      <Wrench size={14} />
                    )}
                  </button>
                </div>
              )}
  
              <div className="codex-card-bottom codex-local-access-card-bottom">
                <span className="card-date">
                  {t("codex.localAccess.footerHint", {
                    scope: localAccessScopeLabel,
                    defaultValue: "Phạm vi truy cập: {{scope}}",
                  })}
                </span>
                <CodexSpeedControl scope="api" disabled={localAccessBusy || localAccessStarting}
                  onError={(text) => setMessage(text ? { text, tone: "error" } : null)} />
                <div
                  className={`card-footer codex-local-access-footer ${
                    importApiServiceGuideCount !== null &&
                    !batchImportOpen &&
                    !externalImportProgress.visible
                      ? "has-import-guide"
                      : ""
                  }`}
                >
                  <div className="card-actions">
                    <button
                      className="card-action-btn"
                      onClick={openLocalAccessMemberPicker}
                      title={t("common.shared.addAccount", "Thêm tài khoản")}
                      disabled={localAccessBusy}
                    >
                      <FolderPlus size={14} />
                    </button>
                    <button
                      className="card-action-btn"
                      onClick={() => void handleLaunchLocalAccessCli()}
                      title={t("common.cliQuickLaunch", "Mở CLI")}
                      disabled={
                        localAccessBusy ||
                        !localAccessCollection ||
                        cliLaunchingAccountId === CODEX_API_SERVICE_BIND_ID
                      }
                    >
                      {cliLaunchingAccountId === CODEX_API_SERVICE_BIND_ID ? (
                        <RefreshCw size={14} className="loading-spinner" />
                      ) : (
                        <Terminal size={14} />
                      )}
                    </button>
                    <button
                      className="card-action-btn"
                      onClick={openLocalAccessPanel}
                      title={t("codex.localAccess.dashboardAction", "Bảng dịch vụ")}
                      disabled={localAccessBusy}
                    >
                      <Database size={14} />
                    </button>
                    <button
                      className="card-action-btn"
                      onClick={openCodexApiServicePage}
                      title={t("codex.apiService.openPage", "Mở dịch vụ API")}
                      disabled={localAccessBusy}
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      className="card-action-btn"
                      onClick={() => void handleQuickRefreshLocalAccessQuota()}
                      title={t("common.shared.refreshQuota", "Làm mới hạn mức")}
                      disabled={localAccessBusy || !localAccessCollection}
                    >
                      <RotateCw
                        size={14}
                        className={localAccessRefreshing ? "loading-spinner" : ""}
                      />
                    </button>
                    <div className="codex-import-api-service-guide-anchor">
                      {importApiServiceGuideCount !== null &&
                        !batchImportOpen &&
                        !externalImportProgress.visible && (
                          <div
                            className="codex-local-access-gateway-guide codex-import-api-service-anchor-guide"
                            role="dialog"
                            aria-label={t(
                              "codex.importApiService.guideTitle",
                              "Đã thêm tài khoản vào dịch vụ API",
                            )}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="codex-local-access-gateway-guide-close"
                              onClick={() => setImportApiServiceGuideCount(null)}
                              aria-label={t("common.close", "Đóng")}
                            >
                              <X size={12} />
                            </button>
                            <div className="codex-local-access-gateway-guide-title">
                              {t(
                                "codex.importApiService.guideTitle",
                                "Đã thêm tài khoản vào dịch vụ API",
                              )}
                            </div>
                            <p>
                              {t(
                                "codex.importApiService.guideDescription",
                                "Đã thêm {{count}} tài khoản vào dịch vụ API. Chọn “Khởi động dịch vụ API” để chuyển đổi và sử dụng.",
                              ).replace(
                                "{{count}}",
                                String(importApiServiceGuideCount),
                              )}
                            </p>
                            <button
                              type="button"
                              className="codex-local-access-gateway-guide-action"
                              onClick={() => setImportApiServiceGuideCount(null)}
                            >
                              {t("codex.importApiService.later", "Để sau")}
                            </button>
                          </div>
                        )}
                      <button
                        className="card-action-btn success"
                        onClick={() => {
                          setImportApiServiceGuideCount(null);
                          restoreLaunchPreviewInstanceId(
                            CODEX_LAUNCH_PREVIEW_API_SERVICE_CARD_KEY,
                          );
                          setLocalAccessLaunchPreviewOpen(true);
                        }}
                        title={t(
                          "codex.localAccess.activateAction",
                          "Khởi động dịch vụ API",
                        )}
                        disabled={localAccessBusy || !localAccessCollection}
                      >
                        {localAccessStarting ? (
                          <RefreshCw size={14} className="loading-spinner" />
                        ) : (
                          <Play size={14} />
                        )}
                      </button>
                    </div>
                    <button
                      className={`card-action-btn ${localAccessCollection?.enabled ? "" : "success"}`}
                      onClick={() => void handleQuickToggleLocalAccessEnabled()}
                      title={
                        localAccessCollection?.enabled
                          ? t("codex.localAccess.disableService", "Tắt dịch vụ")
                          : t("codex.localAccess.enableService", "Bật dịch vụ")
                      }
                      disabled={localAccessBusy || !localAccessCollection}
                    >
                      <Power size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      );
    };
  
    const renderInlineFolderCards = () => {
      const cards: ReactElement[] = [];
      const localAccessCard = renderLocalAccessInlineCard();
      if (localAccessCard) {
        cards.push(localAccessCard);
      }
      return cards.length > 0 ? cards : null;
    };
  
    const renderTableRows = (items: typeof filteredAccounts, groupKey?: string) =>
      items.map((account) => {
        const presentation = resolvePresentation(account);
        const meta = resolveAccountMeta(account);
        const isCurrent = overviewCurrentAccountId === account.id;
        const isApiKeyAccount = isCodexApiKeyAccount(account);
        const serverRevokedReauth = isCodexServerRevokedReauth(account);
        const refreshTokenReusedState = isCodexRefreshTokenReusedAccount(account);
        const switchOrLaunchBlockedReason =
          getCodexSwitchOrLaunchBlockedReason(account);
        const isPendingOAuthAccount = isPendingOAuthCodexAccount(account);
        const isNewApiAccount = isCodexNewApiAccount(account);
        const isChatCompletionsApiKey =
          isCodexChatCompletionsApiKeyAccount(account);
        const isEditingApiKeyName =
          isApiKeyAccount && editingApiKeyNameId === account.id;
        const isSavingApiKeyName = savingApiKeyNameId === account.id;
        const planClass = presentation.planClass || "unknown";
        const quotaItems = applyWindowStatsToQuotaItems(
          account,
          resolveVisibleQuotaItems(
            presentation,
            isApiKeyAccount,
            isNewApiAccount,
          ),
        );
        const reauthErrorMeta = resolveQuotaErrorMeta(
          !refreshTokenReusedState && account.requires_reauth && account.reauth_reason
            ? {
                message: account.reauth_reason,
                timestamp: account.token_updated_at || account.last_used,
              }
            : undefined,
        );
        const quotaErrorMeta = resolveQuotaErrorMeta(
          refreshTokenReusedState ? undefined : account.quota_error,
        );
        const accountIssueMeta = reauthErrorMeta.rawMessage
          ? reauthErrorMeta
          : quotaErrorMeta;
        const hasQuotaError = Boolean(accountIssueMeta.rawMessage);
        const isRefreshTokenNotice = isCodexRefreshTokenNoticeOnly(account);
        const isClientReauthNotice =
          !serverRevokedReauth &&
          !refreshTokenReusedState &&
          isCodexClientReauthNoticeOnly(account);
        const isQuotaRefreshNotice =
          isClientReauthNotice ||
          (!reauthErrorMeta.rawMessage &&
            quotaErrorMeta.isRefreshRequestFailure &&
            !quotaErrorMeta.statusCode &&
            !quotaErrorMeta.errorCode);
        const accountIssueDisplayText = isRefreshTokenNotice
          ? t(
              "codex.quotaError.authRefreshDeferred",
              "refresh_token đã mất hiệu lực. access_token hiện tại vẫn dùng được cho dịch vụ API nhưng không thể chuyển ứng dụng chính thức. Hãy cấp quyền lại trước khi chuyển.",
            )
          : accountIssueMeta.displayText;
        const accountIssueBadge = isRefreshTokenNotice
          ? t("codex.authError.badge", "Lỗi ủy quyền")
          : isQuotaRefreshNotice
            ? t("codex.quotaError.refreshFailedBadge", "Làm mới thất bại")
            : reauthErrorMeta.rawMessage
              ? t("codex.authError.badge", "Lỗi ủy quyền")
              : accountIssueMeta.statusCode ||
                t("codex.quotaError.badge", "Lỗi quota");
        const showReauthorizeAction =
          !isApiKeyAccount &&
          !isRefreshTokenNotice &&
          (isPendingOAuthAccount ||
            isCodexAccountReauthRequired(account) ||
            (hasQuotaError && shouldOfferReauthorizeAction(accountIssueMeta)));
        const accountIdText =
          meta.chatgptAccountId &&
          meta.chatgptAccountId !== t("common.none", "None​")
            ? meta.chatgptAccountId
            : meta.userId;
        const signInLine = `${meta.signedInWithText} | ${accountIdLabel}: ${accountIdText}`;
        const apiProviderName = resolveApiProviderDisplayName(account);
        const apiProviderLine = `${t("codex.api.provider.label", "Nhà cung cấp")}：${apiProviderName}`;
        const apiBaseUrlText = (account.api_base_url || "").trim() || "-";
        const apiBaseUrlLine = `${t("codex.api.baseUrl", "Base URL")}：${apiBaseUrlText}`;
        const apiKeyUsageProvider = resolveUsageProviderForApiKeyAccount(account);
        const isSponsorApiKeyAccount =
          isApiKeyAccount &&
          isSponsorModelProvider(
            apiKeyUsageProvider,
            sponsorApiProviderTemplates,
          );
        const apiKeyUsageMode = resolveApiKeyUsageMode(
          apiKeyUsageMap[account.id]?.summary,
        );
        const showApiKeyUsagePanel = shouldShowCodexApiKeyUsagePanel(
          account,
          hideRelayQuota,
        );
        const isSub2ApiUsageAccount =
          showApiKeyUsagePanel &&
          (apiKeyUsageMode === "sub2api" ||
            apiKeyUsageProvider?.integrationType === "sub2api");
        const isTokenPlanUsageAccount =
          showApiKeyUsagePanel && apiKeyUsageMode === "token_plan";
        const isQuotaAwareApiKeyAccount =
          showApiKeyUsagePanel &&
          !isSponsorApiKeyAccount &&
          (apiKeyUsageMode !== null ||
            isDeepSeekAccount(account) ||
            apiKeyUsageProvider?.integrationType === "new_api" ||
            apiKeyUsageProvider?.integrationType === "sub2api");
        const displayPlanClass = isSponsorApiKeyAccount
          ? "sponsor-api"
          : isQuotaAwareApiKeyAccount
            ? "new-api-exclusive"
            : planClass;
        const displayPlanLabel = isSponsorApiKeyAccount
          ? apiProviderName
          : presentation.planLabel;
        const cockpitApiAccountBalanceText =
          isNewApiAccount && !hideRelayQuota
            ? resolveCockpitApiAccountBalanceText(account)
            : null;
        const isInLocalAccess = localAccessAccountIdSet.has(account.id);
        const subscriptionInfo = resolveSubscriptionPresentation(account);
        const showSubscriptionRefreshAction =
          !isApiKeyAccount &&
          !isPendingOAuthAccount &&
          (subscriptionInfo.bucket === "missing" ||
            subscriptionInfo.bucket === "expired");
        const isSubscriptionRefreshPending =
          refreshingSubscriptionAccountId === account.id ||
          refreshing === account.id;
        const resetCreditControls = renderResetCreditControls(account);
        return (
          <tr
            key={groupKey ? `${groupKey}-${account.id}` : account.id}
            className={`${isCurrent ? "current" : ""} ${isPendingOAuthAccount ? "pending-auth" : ""} ${isNewApiAccount ? "new-api-exclusive" : ""} ${isQuotaAwareApiKeyAccount ? "api-key-usage-account" : ""} ${isSponsorApiKeyAccount ? "sponsor-api-account" : ""}`}
          >
            <td>
              <input
                type="checkbox"
                checked={selected.has(account.id)}
                onChange={() => handleToggleOverviewAccount(account.id)}
              />
            </td>
            <td>
              <div className="account-cell">
                <div className="account-main-line">
                  {isEditingApiKeyName ? (
                    <input
                      className="account-email-text inline-name-editor"
                      value={editingApiKeyNameValue}
                      onChange={(event) =>
                        setEditingApiKeyNameValue(event.target.value)
                      }
                      onBlur={() => void handleSubmitInlineRename(account)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleSubmitInlineRename(account);
                        } else if (event.key === "Escape") {
                          event.preventDefault();
                          inlineRenameDiscardRef.current = true;
                          clearInlineRename();
                        }
                      }}
                      disabled={isSavingApiKeyName}
                      autoFocus
                    />
                  ) : (
                    <span
                      className={`account-email-text ${isApiKeyAccount ? "editable" : ""}`}
                      title={maskAccountText(presentation.displayName)}
                      onDoubleClick={() => handleAccountNameDoubleClick(account)}
                    >
                      {maskAccountText(presentation.displayName)}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="mini-tag current">
                      {t("codex.current", "Hiện tại")}
                    </span>
                  )}
                </div>
                {(meta.accountContextText ||
                  isInLocalAccess ||
                  (!isApiKeyAccount && hasCodexAccountNoteDetails(account)) ||
                  resetCreditControls || canUseCodexAccountProxy(account) || isApiKeyAccount) && (
                  <div className="account-sub-line codex-account-meta-inline">
                    {meta.accountContextText && (
                      <span
                        className="codex-login-subline"
                        title={meta.accountContextText}
                      >
                        Team Name：{meta.accountContextText}
                      </span>
                    )}
                    {isInLocalAccess && (
                      <button
                        type="button"
                        className="group-account-badge codex-local-access-inline-remove"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleRemoveLocalAccessAccount(account.id);
                        }}
                        disabled={addingLocalAccessAccountId !== null}
                        title={t(
                          "codex.localAccess.removeAction",
                          "Xóa khỏi API",
                        )}
                        aria-label={t(
                          "codex.localAccess.removeAction",
                          "Xóa khỏi API",
                        )}
                      >
                        {addingLocalAccessAccountId === account.id ? (
                          <RefreshCw size={11} className="loading-spinner" />
                        ) : (
                          <Link2 size={11} />
                        )}
                        {t("codex.localAccess.removeAction", "Xóa khỏi API")}
                      </button>
                    )}
                    {!isApiKeyAccount && renderAccountNoteButton(account)}
                    {resetCreditControls}
                    <CodexAccountProxyButton account={account} />
                    <CodexSpeedControl scope="account" account={account} compact disabled={!!switching}
                      onError={(text) => setMessage(text ? { text, tone: "error" } : null)} />
                  </div>
                )}
                {!isApiKeyAccount && (
                  <div className="account-sub-line codex-account-meta-inline">
                    <span className="codex-login-subline" title={signInLine}>
                      {meta.signedInWithText} | {accountIdLabel}:{" "}
                      {maskAccountText(accountIdText)}
                    </span>
                  </div>
                )}
                {isApiKeyAccount && (
                  <>
                    <div className="account-sub-line codex-account-meta-inline">
                      {renderApiKeyRevealLine(account)}
                    </div>
                    {renderOAuthBindingLine(account)}
                    <div className="account-sub-line codex-account-meta-inline codex-provider-inline-line">
                      <span
                        className="codex-login-subline codex-provider-inline-text"
                        title={apiProviderLine}
                      >
                        {apiProviderLine}
                      </span>
                      {!isNewApiAccount && (
                        <button
                          type="button"
                          className="codex-provider-inline-switch"
                          onClick={() => openQuickSwitchProviderModal(account)}
                          title={t("codex.quickSwitch.action", "Chuyển nhanh nhà cung cấp")}
                        >
                          {t("codex.quickSwitch.inlineAction", "Chuyển")}
                        </button>
                      )}
                    </div>
                    <div className="account-sub-line codex-account-meta-inline codex-provider-inline-line">
                      <span
                        className="codex-login-subline codex-provider-inline-text"
                        title={apiBaseUrlLine}
                      >
                        {apiBaseUrlLine}
                      </span>
                      {(isSub2ApiUsageAccount || isTokenPlanUsageAccount) && (
                        <button
                          type="button"
                          className="codex-provider-inline-switch"
                          onClick={() =>
                            setApiKeyUsageDetailAccountId(account.id)
                          }
                          title={t(
                            "codex.modelProviders.usage.detailTitle",
                            "Bảng dịch vụ",
                          )}
                        >
                          {t("common.detail", "Chi tiết")}
                        </button>
                      )}
                    </div>
                  </>
                )}
                {hasQuotaError && (
                  <div className="account-sub-line">
                    <span
                      className={`codex-status-pill ${isQuotaRefreshNotice ? "quota-refresh" : "quota-error"}`}
                      title={accountIssueDisplayText}
                    >
                      {isQuotaRefreshNotice ? (
                        <Info size={12} />
                      ) : (
                        <CircleAlert size={12} />
                      )}
                      {accountIssueBadge}
                    </span>
                  </div>
                )}
              </div>
            </td>
            <td>
              <span className={`tier-badge ${displayPlanClass}`}>
                {displayPlanLabel}
              </span>
            </td>
            <td>
              {isApiKeyAccount ? (
                isNewApiAccount ? (
                  <div
                    className="codex-subscription-table-cell"
                    title={presentation.planLabel}
                  >
                    <span className="codex-subscription-badge new-api-exclusive">
                      {presentation.planLabel}
                    </span>
                  </div>
                ) : (
                  <span className="codex-subscription-table-empty">-</span>
                )
              ) : (
                <div
                  className="codex-subscription-table-cell"
                  title={subscriptionInfo.titleText}
                >
                  <div className="codex-subscription-table-head">
                    <span
                      className={`codex-subscription-badge ${subscriptionInfo.tone}`}
                    >
                      {subscriptionInfo.valueText}
                    </span>
                    {showSubscriptionRefreshAction && (
                      <button
                        type="button"
                        className="codex-subscription-refresh-btn"
                        onClick={() =>
                          void handleRefreshSubscriptionInfo(account.id)
                        }
                        disabled={isSubscriptionRefreshPending}
                        title={t("common.refresh", "Làm mới")}
                        aria-label={t("common.refresh", "Làm mới")}
                      >
                        {t("common.refresh", "Làm mới")}
                      </button>
                    )}
                  </div>
                  {subscriptionInfo.timestampMs != null && (
                    <span className="codex-subscription-date">
                      {subscriptionInfo.detailText}
                    </span>
                  )}
                </div>
              )}
            </td>
            <td>
              {showApiKeyUsagePanel ? (
                renderApiKeyUsagePanel(account, apiKeyUsageProvider, "table")
              ) : isChatCompletionsApiKey ? (
                <span className="codex-subscription-table-empty">-</span>
              ) : (
                <>
                  <div className="quota-grid">
                    {cockpitApiAccountBalanceText && (
                      <div className="codex-account-balance-line table">
                        <span>
                          {t(
                            "codex.modelProviders.usage.accountBalance",
                            "Số dư tài khoản",
                          )}
                          ：
                        </span>
                        <strong>{cockpitApiAccountBalanceText}</strong>
                      </div>
                    )}
                    {account.plan_type !== 'self_serve_business_usage_based' && <CodexQuotaMiniRows items={quotaItems} t={t} />}
                    <CodexTeamQuotaHistory account={account} />
                    {quotaItems.length === 0 && !cockpitApiAccountBalanceText && (
                      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                        {t("common.shared.quota.noData", "Không có dữ liệu hạn mức")}
                      </span>
                    )}
                  </div>
                  {!isPendingOAuthAccount &&
                    hasQuotaError &&
                    renderQuotaErrorInline({
                      accountName: presentation.displayName,
                      displayText: accountIssueDisplayText,
                      rawMessage: accountIssueMeta.rawMessage,
                      isVerbose: accountIssueMeta.isVerbose,
                      detailSummary: isRefreshTokenNotice
                        ? accountIssueDisplayText
                        : undefined,
                      detailReauthorizeAccountId:
                        isRefreshTokenNotice || showReauthorizeAction
                          ? account.id
                          : undefined,
                      isRefreshNotice: isQuotaRefreshNotice,
                      showReauthorize: showReauthorizeAction,
                      onReauthorize: () =>
                        openCodexAddModal("tempLogin", account),
                      table: true,
                    })}
                  {isPendingOAuthAccount && (
                    <div className="quota-error-inline table quota-refresh-notice">
                      <Info size={12} />
                      <span>
                        {t("common.shared.quota.noData", "Không có dữ liệu hạn mức")}
                      </span>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => openCodexAddModal("oauth", account)}
                        title={t("common.shared.addModal.oauth", "Ủy quyền OAuth")}
                      >
                        {t("common.shared.addModal.oauth", "Ủy quyền OAuth")}
                      </button>
                    </div>
                  )}
                </>
              )}
            </td>
            <td className="sticky-action-cell table-action-cell">
              <div className="action-buttons">
                <button
                  className="action-btn"
                  onClick={() => void handleLaunchCodexCli(account)}
                  disabled={
                    cliLaunchingAccountId === account.id ||
                    Boolean(switchOrLaunchBlockedReason)
                  }
                  title={
                    switchOrLaunchBlockedReason ||
                    t("common.cliQuickLaunch", "Mở CLI")
                  }
                >
                  {cliLaunchingAccountId === account.id ? (
                    <RefreshCw size={14} className="loading-spinner" />
                  ) : (
                    <Terminal size={14} />
                  )}
                </button>
                {renderAddLocalAccessAccountButton(account, "action-btn")}
                {isNewApiAccount && (
                  <button
                    className="action-btn"
                    onClick={() => setCockpitApiPanelAccountId(account.id)}
                    title={t("codex.cockpitApi.servicePanel", "Bảng dịch vụ")}
                  >
                    <Database size={14} />
                  </button>
                )}
                <button
                  className="action-btn"
                  onClick={() => openTagModal(account.id)}
                  title={t("accounts.editTags", "Chỉnh sửa thẻ")}
                >
                  <Tag size={14} />
                </button>
                {!isApiKeyAccount && !isNewApiAccount && (
                  <button
                    className={`action-btn ${hasCodexAccountNoteDetails(account) ? "active" : ""}`}
                    onClick={() => openAccountNoteModal(account)}
                    title={
                      getCodexAccountNoteTitle(account, "") ||
                      t("codex.accountNote.emptyTitle", "Thêm ghi chú tài khoản")
                    }
                    aria-label={t("codex.accountNote.title", "Ghi chú tài khoản")}
                  >
                    <FileText size={14} />
                  </button>
                )}
                {isApiKeyAccount && !isNewApiAccount && (
                  <button
                    className="action-btn"
                    onClick={() => openApiKeyCredentialsModal(account)}
                    title={t("instances.actions.edit", "Chỉnh sửa")}
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  className={`action-btn ${!isCurrent ? "success" : ""}`}
                  onClick={() => handleSwitch(account.id)}
                  disabled={!!switching || Boolean(switchOrLaunchBlockedReason)}
                  title={switchOrLaunchBlockedReason || t("codex.switch", "Chuyển")}
                >
                  {switching === account.id ? (
                    <RefreshCw size={14} className="loading-spinner" />
                  ) : (
                    <Play size={14} />
                  )}
                </button>
                {!isPendingOAuthAccount &&
                  (!isApiKeyAccount ||
                    isNewApiAccount ||
                    canRefreshApiKeyUsage(account, apiKeyUsageProvider)) && (
                    <button
                      className="action-btn"
                      onClick={() =>
                        canRefreshApiKeyUsage(account, apiKeyUsageProvider)
                          ? void refreshApiKeyUsage(account, apiKeyUsageProvider)
                          : handleRefresh(account.id)
                      }
                      disabled={
                        canRefreshApiKeyUsage(account, apiKeyUsageProvider)
                          ? apiKeyUsageMap[account.id]?.loading === true
                          : refreshing === account.id
                      }
                      title={t("common.shared.refreshQuota", "Làm mới hạn mức")}
                    >
                      <RotateCw
                        size={14}
                        className={
                          canRefreshApiKeyUsage(account, apiKeyUsageProvider)
                            ? apiKeyUsageMap[account.id]?.loading === true
                              ? "loading-spinner"
                              : ""
                            : refreshing === account.id
                              ? "loading-spinner"
                              : ""
                        }
                      />
                    </button>
                  )}
                <button
                  className="action-btn"
                  onClick={() =>
                    handleExportByIds(
                      [account.id],
                      resolveSingleExportBaseName(account),
                    )
                  }
                  title={t("common.shared.export.title", "Xuất")}
                >
                  <Upload size={14} />
                </button>
                <button
                  className="action-btn danger"
                  onClick={() => handleDelete(account.id)}
                  title={t("common.recycleBin.move")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        );
      });
  
    const renderGroupTableRows = () => null;
  
    const inlineFolderCards = renderInlineFolderCards();
    const hasGroupEntryCards = Boolean(
      inlineFolderCards && inlineFolderCards.length > 0,
    );
    const showOverviewSelectionBar = paginatedAccounts.length > 0;
    const externalImportRunning = [
      "receiving",
      "fetching",
      "parsing",
      "importing",
      "refreshing",
    ].includes(externalImportProgress.status);
    const externalImportStepIndex = (() => {
      switch (externalImportProgress.status) {
        case "receiving":
          return 0;
        case "fetching":
          return 1;
        case "parsing":
          return 2;
        case "importing":
          return 3;
        case "refreshing":
          return 4;
        case "success":
        case "partial":
        case "error":
          return 5;
        default:
          return -1;
      }
    })();
    const externalImportSteps = [
      t("common.shared.externalImport.stepReceive", "Nhận yêu cầu"),
      t("common.shared.externalImport.stepFetch", "Lấy gói"),
      t("common.shared.externalImport.stepParse", "Phân tích nội dung"),
      t("common.shared.externalImport.stepImport", "Nhập tài khoản"),
      t("common.shared.externalImport.stepRefresh", "Làm mới danh sách"),
    ];
    const externalImportPercent = Math.max(
      0,
      Math.min(100, Math.round(externalImportProgress.progress)),
    );
    const handleCopyExternalImportErrors = async () => {
      const content = externalImportProgress.failures
        .map((item) => `${item.index}. ${item.label}: ${item.error}`)
        .join("\n");
      if (!content) return;
      await navigator.clipboard.writeText(content).catch(() => {});
      setMessage({
        text: t("common.shared.externalImport.copied", "Đã sao chép"),
        tone: "success",
      });
    };
    const handleViewExternalImportAccounts = () => {
      setActiveTab("overview");
      closeExternalImportProgressModal();
    };

    useEffect(() => {
      if (externalImportRunning) {
        setExternalImportSyncError(null);
      }
    }, [externalImportRunning]);

    useEffect(() => {
      if (importApiServiceGuideCount === null) return;
      setActiveTab("overview");
      setLocalAccessDetailsExpanded(true);
    }, [importApiServiceGuideCount]);

    const renderApiKeyUsageDetailModal = () => {
      const account = apiKeyUsageDetailAccount;
      if (!account) return null;
      const state = apiKeyUsageMap[account.id];
      const summary = state?.summary;
      const provider = resolveUsageProviderForApiKeyAccount(account);
      const usageMode =
        resolveApiKeyUsageMode(summary) ??
        (provider?.integrationType === "sub2api" ? "sub2api" : null);
      if (!usageMode) return null;
      const coreDetailKeys =
        usageMode === "new_api"
          ? new Set(["mode", "totalGranted", "totalAvailable", "expiresAt"])
          : usageMode === "sub2api"
            ? new Set(["mode", "remaining", "todayRequests", "todayTokens"])
            : usageMode === "deepseek"
              ? new Set([
                  "mode",
                  "totalBalance",
                  "grantedBalance",
                  "toppedUpBalance",
                ])
              : usageMode === "token_plan"
                ? new Set(["mode", "remaining", "planName", "expiresAt"])
                : new Set<string>();
      const details = (summary?.details ?? []).filter(
        (item) => !coreDetailKeys.has(item.key),
      );
      const visible = visibleApiKeyAccountIds.has(account.id);
      const apiKeyDisplay = resolveApiKeyDisplayText(account, visible);
      const baseUrl =
        provider?.baseUrl.trim() || (account.api_base_url || "").trim() || "-";
      const usedPercent = formatApiKeyUsagePercent(summary);
      const newApiQuota = resolveNewApiQuotaSnapshot(summary);
      const summaryDetails =
        usageMode === "new_api"
          ? [
              {
                key: "totalGranted",
                label: t(
                  "codex.modelProviders.usage.fields.totalGranted",
                  "Đã cấp",
                ),
                value: formatApiKeyUsageMoney(newApiQuota.granted, summary?.unit),
              },
              {
                key: "totalAvailable",
                label: t(
                  "codex.modelProviders.usage.fields.totalAvailable",
                  "Khả dụng",
                ),
                value: formatApiKeyUsageMoney(
                  newApiQuota.available,
                  summary?.unit,
                ),
              },
              {
                key: "expiresAt",
                label: t(
                  "codex.modelProviders.usage.fields.expiresAt",
                  "Hết hạn",
                ),
                value:
                  newApiQuota.expiresAt != null
                    ? formatApiKeyUsageDetailValue({
                        key: "expiresAt",
                        value: String(newApiQuota.expiresAt),
                      })
                    : "-",
              },
            ]
          : usageMode === "token_plan"
            ? [
                {
                  key: "remaining",
                  label: t(
                    "codex.modelProviders.usage.fields.remaining",
                    "Remaining",
                  ),
                  value: formatApiKeyUsageQuotaValue(
                    summary,
                    summary?.quotaRemaining ?? summary?.remaining,
                  ),
                },
                {
                  key: "planName",
                  label: t("codex.modelProviders.usage.fields.planName", "Plan"),
                  value: summary?.planName || "-",
                },
                {
                  key: "expiresAt",
                  label: t(
                    "codex.modelProviders.usage.fields.expiresAt",
                    "Next Reset",
                  ),
                  value: formatApiKeyUsageDetailByKey(
                    summary,
                    findApiKeyUsageDetail(summary, "intervalExpiresAt")
                      ? "intervalExpiresAt"
                      : findApiKeyUsageDetail(summary, "weeklyExpiresAt")
                        ? "weeklyExpiresAt"
                        : "expiresAt",
                  ),
                },
              ]
            : usageMode === "sub2api"
              ? [
                  {
                    key: "accountBalance",
                    label: t(
                      "codex.modelProviders.usage.accountBalance",
                      "Số dư tài khoản",
                    ),
                    value: formatApiKeyUsageQuotaValue(
                      summary,
                      summary?.remaining ??
                        summary?.balance ??
                        summary?.quotaRemaining,
                    ),
                  },
                  {
                    key: "todayRequests",
                    label: t(
                      "codex.modelProviders.usage.fields.todayRequests",
                      "Yêu cầu hôm nay",
                    ),
                    value: summary
                      ? formatCockpitApiInteger(summary.todayRequests ?? 0)
                      : "-",
                  },
                  {
                    key: "todayTokens",
                    label: t(
                      "codex.modelProviders.usage.fields.todayTokens",
                      "Token hôm nay",
                    ),
                    value: summary
                      ? formatCockpitApiTokenCount(summary.todayTotalTokens ?? 0)
                      : "-",
                  },
                ]
              : usageMode === "deepseek"
                ? [
                    {
                      key: "totalBalance",
                      label: t(
                        "codex.modelProviders.usage.fields.totalBalance",
                        "Tổng số dư",
                      ),
                      value: formatApiKeyUsageMoney(
                        summary?.balance,
                        summary?.unit,
                      ),
                    },
                    {
                      key: "grantedBalance",
                      label: t(
                        "codex.modelProviders.usage.fields.grantedBalance",
                        "Số dư tặng",
                      ),
                      value: formatApiKeyUsageDetailByKey(
                        summary,
                        "grantedBalance",
                      ),
                    },
                    {
                      key: "toppedUpBalance",
                      label: t(
                        "codex.modelProviders.usage.fields.toppedUpBalance",
                        "Số dư nạp",
                      ),
                      value: formatApiKeyUsageDetailByKey(
                        summary,
                        "toppedUpBalance",
                      ),
                    },
                  ]
                : [];
      const summaryGridClassName =
        usageMode === "sub2api" ||
        usageMode === "new_api" ||
        usageMode === "token_plan"
          ? "cockpit-api-summary-grid compact"
          : "cockpit-api-summary-grid";
  
      return (
        <div className="modal-overlay">
          <div
            className="modal-content cockpit-api-panel-modal codex-api-key-usage-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header cockpit-api-panel-header">
              <div>
                <h2>{t("codex.modelProviders.usage.detailTitle", "Bảng dịch vụ")}</h2>
                <span className="cockpit-api-panel-subtitle">
                  {maskAccountText(resolvePresentation(account).displayName)}
                  {provider ? ` · ${provider.name}` : ""}
                </span>
              </div>
              <button
                className="modal-close"
                onClick={() => setApiKeyUsageDetailAccountId(null)}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="cockpit-api-panel-body">
              <section className="cockpit-api-connection-card">
                <div className="cockpit-api-connection-row">
                  <span>{t("codex.localAccess.baseUrl", "Địa chỉ")}</span>
                  <code title={baseUrl}>{baseUrl}</code>
                  <button
                    type="button"
                    className="folder-icon-btn cockpit-api-icon-btn"
                    onClick={() =>
                      void navigator.clipboard.writeText(baseUrl).catch(() => {})
                    }
                    title={t("common.copy", "Copy​")}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="cockpit-api-connection-row">
                  <span>{t("codex.localAccess.apiKey", "Khóa")}</span>
                  <code title={visible ? account.openai_api_key || "" : ""}>
                    {apiKeyDisplay}
                  </code>
                  <div className="cockpit-api-connection-actions">
                    <button
                      type="button"
                      className="folder-icon-btn cockpit-api-icon-btn"
                      onClick={() => toggleAccountApiKeyVisible(account.id)}
                      title={
                        visible
                          ? t("codex.localAccess.hideKey", "Ẩn khóa")
                          : t("codex.localAccess.showKey", "Hiện khóa")
                      }
                    >
                      {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      className="folder-icon-btn cockpit-api-icon-btn"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(account.openai_api_key || "")
                          .catch(() => {})
                      }
                      title={t("common.copy", "Copy​")}
                      disabled={!account.openai_api_key}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </section>
              <section className={summaryGridClassName}>
                {summaryDetails.map((item) => (
                  <div
                    className="cockpit-api-stat-card cockpit-api-stat-card-center"
                    key={item.key}
                  >
                    <span className="cockpit-api-card-label">{item.label}</span>
                    <strong>{item.value}</strong>
                    {(item.key === "remaining" ||
                      item.key === "totalAvailable") &&
                      usageMode !== "new_api" &&
                      usageMode !== "sub2api" && (
                        <div>
                          <div className="cockpit-api-progress-row">
                            <div className="cockpit-api-progress-track">
                              <div
                                className="cockpit-api-progress-bar"
                                style={{ width: `${usedPercent}%` }}
                              />
                            </div>
                            <span>{usedPercent}%</span>
                          </div>
                        </div>
                      )}
                  </div>
                ))}
              </section>
              <section className="cockpit-api-panel-section">
                <div className="cockpit-api-section-head">
                  <strong>
                    {t("codex.modelProviders.usage.rawFields", "Dữ liệu dịch vụ")}
                  </strong>
                </div>
                <div className="cockpit-api-usage-card-grid">
                  {details.length > 0 ? (
                    details.map((item) => (
                      <div className="cockpit-api-usage-card" key={item.key}>
                        <span className="cockpit-api-card-label">
                          {formatApiKeyUsageDetailLabel(item.key, item.label)}
                        </span>
                        <strong>
                          {formatApiKeyUsageDetailValue(item, summary?.unit)}
                        </strong>
                        <small>{item.key}</small>
                      </div>
                    ))
                  ) : (
                    <div className="cockpit-api-empty-row">
                      {t("codex.cockpitApi.noStats", "Chưa có thống kê")}
                    </div>
                  )}
                </div>
              </section>
            </div>
            <div className="modal-footer cockpit-api-panel-footer">
              <button
                className="btn btn-secondary"
                onClick={() => void refreshApiKeyUsageByAccountId(account.id)}
                disabled={state?.loading}
              >
                <RotateCw
                  size={14}
                  className={state?.loading ? "loading-spinner" : ""}
                />
                {t("common.shared.refreshQuota", "Làm mới hạn mức")}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => openApiKeyCredentialsModal(account)}
              >
                <Pencil size={14} />
                {t("instances.actions.edit", "Chỉnh sửa")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleLaunchCodexCli(account)}
                disabled={cliLaunchingAccountId === account.id}
              >
                {cliLaunchingAccountId === account.id ? (
                  <RefreshCw size={14} className="loading-spinner" />
                ) : (
                  <Terminal size={14} />
                )}
                {t("common.cliQuickLaunch", "Mở CLI")}
              </button>
            </div>
          </div>
        </div>
      );
    };
  
    const renderCockpitApiServicePanel = () => {
      const account = cockpitApiPanelAccount;
      if (!account) return null;
  
      const usage = getCockpitApiUsageRecord(account);
      const stats = getCockpitApiStatsRecord(account);
      const requests = toCockpitApiRecord(stats?.requests);
      const tokens = toCockpitApiRecord(stats?.tokens);
      const total = toCockpitApiRecord(stats?.total);
      const modelItems = (Array.isArray(stats?.models) ? stats.models : [])
        .map(toCockpitApiRecord)
        .filter((item): item is CockpitApiJsonRecord => Boolean(item))
        .slice(0, 8);
      const dailyItems = (Array.isArray(stats?.daily) ? stats.daily : [])
        .map(toCockpitApiRecord)
        .filter((item): item is CockpitApiJsonRecord => Boolean(item));
      const visible = visibleApiKeyAccountIds.has(account.id);
      const apiKeyDisplay = resolveApiKeyDisplayText(account, visible);
      const baseUrl = (account.api_base_url || "").trim() || COCKPIT_API_BASE_URL;
      const quotaText = readCockpitApiString(usage, "summary_display") || "-";
      const cockpitApiAccountBalanceText =
        resolveCockpitApiAccountBalanceText(account);
      const usedPercent = readCockpitApiNumber(usage, "used_percent");
      const requestCount = readCockpitApiNumber(requests, "total");
      const todayCount = readCockpitApiNumber(requests, "today");
      const last7Count = readCockpitApiNumber(requests, "last_7_days");
      const last30Count = readCockpitApiNumber(requests, "last_30_days");
      const totalTokens = readCockpitApiNumber(tokens, "total");
      const totalQuotaDisplay = readCockpitApiString(total, "quota_display");
      const panelDisplayName = resolvePresentation(account).displayName;
      const hasStats = Boolean(stats);
      const usedPercentText = `${formatCockpitApiInteger(usedPercent)}%`;
      const summaryItems = [
        {
          key: "requests",
          label: t("codex.cockpitApi.requests", "Yêu cầu"),
          value: formatCockpitApiInteger(requestCount),
          meta: `${t("codex.cockpitApi.today", "Hôm nay")} ${formatCockpitApiInteger(todayCount)}`,
        },
        {
          key: "periods",
          label: t("codex.cockpitApi.periods", "Kỳ"),
          value: `7d ${formatCockpitApiInteger(last7Count)}`,
          meta: `30d ${formatCockpitApiInteger(last30Count)}`,
        },
        {
          key: "tokens",
          label: t("codex.cockpitApi.tokens", "Tokens"),
          value: formatCockpitApiTokenCount(totalTokens),
          meta: `${t("codex.cockpitApi.quotaUsed", "Đã dùng")} ${totalQuotaDisplay || "-"}`,
        },
      ];
  
      return (
        <div className="modal-overlay">
          <div
            className="modal-content cockpit-api-panel-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header cockpit-api-panel-header">
              <div>
                <h2>
                  {t("codex.cockpitApi.panelTitle", "Bảng dịch vụ Cockpit Api")}
                </h2>
                <span className="cockpit-api-panel-subtitle">
                  {maskAccountText(panelDisplayName)}
                </span>
              </div>
              <button
                className="modal-close"
                onClick={() => setCockpitApiPanelAccountId(null)}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
  
            <div className="cockpit-api-panel-body">
              <section className="cockpit-api-connection-card">
                <div className="cockpit-api-connection-row">
                  <span>{t("codex.localAccess.baseUrl", "Địa chỉ")}</span>
                  <code title={baseUrl}>{baseUrl}</code>
                  <button
                    type="button"
                    className="folder-icon-btn cockpit-api-icon-btn"
                    onClick={() =>
                      void navigator.clipboard.writeText(baseUrl).catch(() => {})
                    }
                    title={t("common.copy", "Copy​")}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="cockpit-api-connection-row">
                  <span>{t("codex.localAccess.apiKey", "Khóa")}</span>
                  <code title={visible ? account.openai_api_key || "" : ""}>
                    {apiKeyDisplay}
                  </code>
                  <div className="cockpit-api-connection-actions">
                    <button
                      type="button"
                      className="folder-icon-btn cockpit-api-icon-btn"
                      onClick={() => toggleAccountApiKeyVisible(account.id)}
                      title={
                        visible
                          ? t("codex.localAccess.hideKey", "Ẩn khóa")
                          : t("codex.localAccess.showKey", "Hiện khóa")
                      }
                    >
                      {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      className="folder-icon-btn cockpit-api-icon-btn"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(account.openai_api_key || "")
                          .catch(() => {})
                      }
                      title={t("common.copy", "Copy​")}
                      disabled={!account.openai_api_key}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </section>
  
              <section className="cockpit-api-summary-grid">
                <div className="cockpit-api-balance-card">
                  <span className="cockpit-api-card-label">
                    {t("codex.cockpitApi.balance", "Số dư")}
                  </span>
                  <strong>{quotaText}</strong>
                  {cockpitApiAccountBalanceText && (
                    <small className="cockpit-api-balance-meta">
                      {t("codex.modelProviders.usage.accountBalance", "Số dư tài khoản")}
                      ：{cockpitApiAccountBalanceText}
                    </small>
                  )}
                  <div className="cockpit-api-progress-row">
                    <div className="cockpit-api-progress-track">
                      <div
                        className="cockpit-api-progress-bar"
                        style={{ width: usedPercentText }}
                      />
                    </div>
                    <span>{usedPercentText}</span>
                  </div>
                </div>
                {summaryItems.map((item) => (
                  <div className="cockpit-api-stat-card" key={item.key}>
                    <span className="cockpit-api-card-label">{item.label}</span>
                    <strong>{item.value}</strong>
                    <small>{item.meta}</small>
                  </div>
                ))}
              </section>
  
              {hasStats ? (
                <div className="cockpit-api-stats-grid">
                  <section className="cockpit-api-panel-section">
                    <div className="cockpit-api-section-head">
                      <strong>
                        {t("codex.cockpitApi.modelStats", "Thống kê mô hình")}
                      </strong>
                    </div>
                    <div className="cockpit-api-usage-list">
                      {modelItems.length > 0 ? (
                        modelItems.map((item) => {
                          const modelName =
                            readCockpitApiString(item, "model_name") || "-";
                          const count = readCockpitApiNumber(
                            item,
                            "request_count",
                          );
                          const modelTokens = readCockpitApiNumber(
                            item,
                            "total_tokens",
                          );
                          const quotaDisplay = readCockpitApiString(
                            item,
                            "quota_display",
                          );
                          return (
                            <div
                              className="cockpit-api-usage-row"
                              key={modelName}
                            >
                              <div>
                                <span className="cockpit-api-usage-name">
                                  {modelName}
                                </span>
                                <small>
                                  {t("codex.cockpitApi.requests", "Yêu cầu")}{" "}
                                  {formatCockpitApiInteger(count)}
                                </small>
                              </div>
                              <div className="cockpit-api-usage-values">
                                <span>
                                  {t("codex.cockpitApi.tokens", "Tokens")}{" "}
                                  {formatCockpitApiTokenCount(modelTokens)}
                                </span>
                                <strong>{quotaDisplay || "-"}</strong>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="cockpit-api-empty-row">
                          {t("codex.cockpitApi.noStats", "Chưa có thống kê")}
                        </div>
                      )}
                    </div>
                  </section>
  
                  <section className="cockpit-api-panel-section">
                    <div className="cockpit-api-section-head">
                      <strong>
                        {t("codex.cockpitApi.dailyStats", "Thống kê hằng ngày")}
                      </strong>
                    </div>
                    <div className="cockpit-api-usage-list">
                      {dailyItems.length > 0 ? (
                        dailyItems.map((item) => {
                          const date = readCockpitApiString(item, "date") || "-";
                          const count = readCockpitApiNumber(
                            item,
                            "request_count",
                          );
                          const dayTokens = readCockpitApiNumber(
                            item,
                            "total_tokens",
                          );
                          const quotaDisplay = readCockpitApiString(
                            item,
                            "quota_display",
                          );
                          return (
                            <div className="cockpit-api-usage-row" key={date}>
                              <div>
                                <span className="cockpit-api-usage-name">
                                  {date}
                                </span>
                                <small>
                                  {t("codex.cockpitApi.requests", "Yêu cầu")}{" "}
                                  {formatCockpitApiInteger(count)}
                                </small>
                              </div>
                              <div className="cockpit-api-usage-values">
                                <span>
                                  {t("codex.cockpitApi.tokens", "Tokens")}{" "}
                                  {formatCockpitApiTokenCount(dayTokens)}
                                </span>
                                <strong>{quotaDisplay || "-"}</strong>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="cockpit-api-empty-row">
                          {t("codex.cockpitApi.noStats", "Chưa có thống kê")}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="cockpit-api-empty-state">
                  {t(
                    "codex.cockpitApi.refreshHint",
                    "Bấm làm mới để đồng bộ thống kê của API key này.",
                  )}
                </div>
              )}
            </div>
  
            <div className="modal-footer cockpit-api-panel-footer">
              <button
                className="btn btn-secondary"
                onClick={() => void handleRefresh(account.id)}
                disabled={refreshing === account.id}
              >
                <RotateCw
                  size={14}
                  className={refreshing === account.id ? "loading-spinner" : ""}
                />
                {t("common.shared.refreshQuota", "Làm mới hạn mức")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleLaunchCodexCli(account)}
                disabled={cliLaunchingAccountId === account.id}
              >
                {cliLaunchingAccountId === account.id ? (
                  <RefreshCw size={14} className="loading-spinner" />
                ) : (
                  <Terminal size={14} />
                )}
                {t("common.cliQuickLaunch", "Mở CLI")}
              </button>
            </div>
          </div>
        </div>
      );
    };
  return {
    externalImportPercent,
    externalImportRunning,
    externalImportStepIndex,
    externalImportSteps,
    handleCopyExternalImportErrors,
    handleViewExternalImportAccounts,
    hasGroupEntryCards,
    inlineFolderCards,
    renderApiKeyUsageDetailModal,
    renderCockpitApiServicePanel,
    renderCompactRows,
    renderGridCards,
    renderGroupTableRows,
    renderTableRows,
    showOverviewSelectionBar,
  };
}
