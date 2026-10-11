import { CodexApiRequestLogs } from "./CodexApiRequestLogs";
import { CodexSpeedControl } from "../components/codex/CodexSpeedControl";
import { Activity, BadgeDollarSign, ChevronDown, Check, CircleAlert, Copy, Eye, EyeOff, FolderPlus, Gauge, Image, Pin, PinOff, Play, Plus, Power, RefreshCw, Route, Send, ShieldCheck, SlidersHorizontal, Trash2, Undo2, Wrench, X } from "lucide-react";
import { CodexIcon } from "../components/icons/CodexIcon";
import { ManualHelpIconButton } from "../components/ManualHelpIconButton";
import { PlatformGroupSwitcher } from "../components/platform/PlatformGroupSwitcher";
import { resolveGroupChildName } from "../stores/usePlatformLayoutStore";
import { getPlatformLabel } from "../utils/platformMeta";
import { isCodexApiKeyScopeAccountActive, selectCodexApiKeyScopeAccounts } from "../utils/codexApiKeyAccountScope";
import * as codexLocalAccessService from "../services/codexLocalAccessService";
import { buildCodexAccountPresentation } from "../presentation/platformAccountPresentation";
import { formatCodexQuotaPoolPercent, formatCodexQuotaPoolWindowLabel } from "../utils/codexQuotaPool";
import { CODEX_LOCAL_ACCESS_STATUS_KEYS, resolveCodexLocalAccessRuntimeStatus } from "../utils/codexLocalAccessStatus";
import { SingleSelectDropdown } from "../components/SingleSelectDropdown";
import { CodexLocalAccessModal } from "../components/CodexLocalAccessModal";
import { CodexAccountPoolHealthModal } from "../components/CodexAccountPoolHealthModal";
import { CodexStatsRangePicker } from "../components/CodexStatsRangePicker";
import { CodexUsageTrend } from "../components/codex/CodexUsageTrend";
import { requestCodexOpenAddAccount } from "../utils/codexAddAccountRequest";
import { codexApiKeyInspectionCardId } from "../hooks/useCodexApiKeyInspection";
import { isCodexGatewayKeyRecoveryError } from "../utils/codexGatewayKeyRecovery";
import type {
  CodexLocalAccessCustomRoutingRule,
  CodexLocalAccessScope,
} from "../types/codexLocalAccess";
import "./CodexApiServicePage.css";
import type {
  CopyField,
  useCodexApiServicePageController,
} from "./CodexApiServicePage";

export type CodexApiServiceViewProps = ReturnType<typeof useCodexApiServicePageController>;

/** 渲染 CodexApiServicePage 的界面；业务状态与动作统一由 Controller 提供。 */
export function CodexApiServiceView(props: CodexApiServiceViewProps) {
  const {
    accessScope,
    inspectionNoticeKey,
    dismissInspectionNotice,
    accessScopeOptions,
    accountConcurrencyWaitDraft,
    accountModelMappingDrafts,
    accountModelMappingError,
    accountModelMappingsOpen,
    accountModelRuleAllSelected,
    accountModelRuleBulkText,
    accountModelRuleCount,
    accountModelRuleDrafts,
    accountModelRuleSelected,
    accountModelRulesOpen,
    accounts,
    accountsLoaded,
    activating,
    activeTab,
    addAccountModelMappingRow,
    addressKind,
    apiKeyDrafts,
    apiKeyHasFixedAccountScope,
    apiKeyInheritsAccountPool,
    apiKeyPolicyDraftFromValue,
    apiKeyPolicyDraftIsDirty,
    apiKeyPolicyDrafts,
    apiKeyStatsById,
    apiServiceIsCurrent,
    applyTimeoutPreset,
    availableAccountCount,
    busy,
    clearTestChat,
    clientBaseUrlHost,
    clientBaseUrlHostOptions,
    collection,
    compatibilityExamples,
    cooldownCount,
    copiedField,
    currentGroup,
    currentPlatformId,
    disableCoolingDraft,
    displayBaseUrl,
    error,
    excludedModelsText,
    expandedApiKeyPolicyIds,
    fillDeepSeekAccountModelMappings,
    formatAccountTokenUsage,
    formatCompactNumber,
    formatDateTime,
    formatLatencyMs,
    formatRequestResultDetail,
    formatUsdCost,
    groups,
    handleActivateService,
    handleApplyAccountModelRuleBulk,
    handleClearStats,
    handleRefreshStatsDetails,
    handleCloseAccountModelMappings,
    handleCloseAccountModelRules,
    handleCloseTestDialog,
    handleCopy,
    handleCreateApiKey,
    handleCreateTimeoutPreset,
    handleCustomStatsRangeApply,
    handleDeleteApiKey,
    handleDeleteTimeoutPreset,
    handleKillPort,
    handleOpenAccountModelMappings,
    handleOpenAccountModelRules,
    handleOpenAddAccount,
    handleOpenPricingModal,
    handleOpenTestDialog,
    handleRecoverAccounts,
    handleRemoveMember,
    handleRepriceRequestLogs,
    handleResetApiKeyPolicy,
    handleResetTimeoutDrafts,
    handleRestartSidecar,
    handleRotateApiKey,
    handleSaveAccountModelMappings,
    handleSaveAccountModelRules,
    handleSaveApiKeyLabel,
    handleSaveApiKeyPolicy,
    handleSaveMembersFromModal,
    handleAddGrokMemberToApiService,
    handleSaveModelPricings,
    handleSaveModelRules,
    handleSavePort,
    handleSaveProxy,
    handleSaveRoutingOptions,
    handleSaveTimeouts,
    handleSendTestChatMessage,
    handleSetApiKeyAccountPriority,
    handleStatsPresetChange,
    handleToggleApiKey,
    handleToggleEnabled,
    handleUpdateAccessScope,
    handleUpdateClientBaseUrlHost,
    handleUpdateRouting,
    handleUpdateTimeoutPreset,
    healthByAccountId,
    healthModalOpen,
    imageUnavailableCount,
    immediateSseResponseDraft,
    keyVisible,
    localAccessAccounts,
    mappingDraftsFromAccount,
    mappingMemberAccounts,
    maskAccountText,
    maxAccountConcurrencyDraft,
    maxConcurrentImageRequestsDraft,
    maxRetryCredentialsDraft,
    maxRetryIntervalDraft,
    memberAccountIds,
    memberAccounts,
    memberIds,
    memberModalOpen,
    memberView,
    modelAliasesText,
    modelIds,
    normalizeAddressKind,
    notice,
    parseModelRuleText,
    portInput,
    portKilling,
    pricingDrafts,
    pricingError,
    pricingModalOpen,
    pricingRepriceActive,
    pricingRepricePercent,
    pricingRepriceProgress,
    pricingRepriceStatusText,
    proxyInput,
    quotaPoolSummary,
    reloadState,
    removeAccountModelMappingRow,
    statsDetailsRefreshing,
    resetPricingDraft,
    responsesWebsocketsEnabledDraft,
    routingOptions,
    routingSaving,
    routingStrategy,
    selectedModelId,
    selectedStatsRangeTitle,
    selectedStatsWindow,
    selectedTimeoutPresetId,
    selectedTimeoutPresetIsCustom,
    serviceTabs,
    sessionAffinityDraft,
    sessionAffinityTtlDraft,
    setAccountModelRuleBulkText,
    setAccountModelRuleDrafts,
    setAccountModelRuleSelected,
    setActiveTab,
    setAddressKind,
    setApiKeyDrafts,
    setApiKeyPolicyDrafts,
    setAccountConcurrencyWaitDraft,
    setDisableCoolingDraft,
    setError,
    setExcludedModelsText,
    setHealthModalOpen,
    setImmediateSseResponseDraft,
    setKeyVisible,
    setMaxAccountConcurrencyDraft,
    setMaxConcurrentImageRequestsDraft,
    setMaxRetryCredentialsDraft,
    setMaxRetryIntervalDraft,
    setMemberModalOpen,
    setModelAliasesText,
    setNotice,
    setPortInput,
    setPricingModalOpen,
    setProxyInput,
    setResponsesWebsocketsEnabledDraft,
    setSelectedModelId,
    setSelectedTimeoutPresetId,
    setSessionAffinityDraft,
    setSessionAffinityTtlDraft,
    setState,
    setStatsLogTab,
    setTestChatInput,
    setTimeoutDrafts,
    setTimeoutPresetNameDraft,
    setTimeoutsError,
    setTimeoutsModalOpen,
    sidecarRestarting,
    state,
    stats,
    statsLogTab,
    statsLogTabs,
    statsRange,
    statsRangeError,
    statsTimeRange,
    summaryCards,
    switchOptions,
    t,
    testChatInput,
    testChatMessages,
    testChatScrollRef,
    testDialogError,
    testDialogOpen,
    testDialogRunning,
    timeoutDrafts,
    timeoutDraftsFromValue,
    timeoutPresetNameDraft,
    timeoutPresetOptions,
    timeoutsError,
    timeoutsModalOpen,
    toggleApiKeyPolicyExpanded,
    toggleStringSelection,
    updateAccountModelMappingDraft,
    updatePricingDraft,
    updateTimeoutDraft,
  } = props;
  const localAccessStatus = resolveCodexLocalAccessRuntimeStatus(collection, state);
  const keyRecoveryRequired = isCodexGatewayKeyRecoveryError(state?.lastError);
  return (
    <div className="codex-api-service-page">
      <div className="page-top-strip">
        <div className="page-top-strip-left">
          <span className="page-top-strip-label">
            {t("settings.general.accountManagement", "Account")}
          </span>
          <ManualHelpIconButton className="platform-header-help" />
        </div>
      </div>

      <div className="page-tabs-row page-tabs-center page-tabs-row-with-leading">
        <div className="page-tabs-leading">
          <PlatformGroupSwitcher
            currentPlatformId={currentPlatformId}
            currentLabel={
              currentGroup
                ? resolveGroupChildName(
                    currentGroup,
                    currentPlatformId,
                    getPlatformLabel(currentPlatformId, t),
                  )
                : getPlatformLabel(currentPlatformId, t)
            }
            options={switchOptions}
            currentGroupId={currentGroup?.id ?? null}
          />
        </div>
        <div className="page-tabs filter-tabs">
          {serviceTabs.map((tab) => (
            <button
              key={tab.key}
              className={`filter-tab${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="codex-api-service-content">
        <section className="codex-api-service-hero">
          <div className="codex-api-service-hero-main">
            <div className="codex-api-service-title-row">
              <span className="codex-api-service-title-icon" aria-hidden="true">
                <CodexIcon size={24} />
              </span>
              <div className="codex-api-service-title-copy">
                <div className="codex-api-service-title-line">
                  <h1>{t("codex.apiService.title", "Dịch vụ API Codex")}</h1>
                  {apiServiceIsCurrent && (
                    <span className="codex-api-service-current-tag">
                      {t("codex.current", "Hiện tại")}
                    </span>
                  )}
                  <span
                    className={`codex-api-service-status ${localAccessStatus}`}
                  >
                    {!state?.running && collection?.enabled && (state?.preparing || state?.recovering)
                      ? t("instances.status.starting", "Bắt đầu")
                      : t(CODEX_LOCAL_ACCESS_STATUS_KEYS[localAccessStatus])}
                  </span>
                  {state?.preparing && state.preparationTotal > 0 && (
                    <span className="codex-api-service-current-tag">
                      {t("common.loading", "Đang tải...")} {state.preparationCompleted}/
                      {state.preparationTotal}
                    </span>
                  )}
                  {state?.refreshingAccounts && state.accountRefreshTotal > 0 && (
                    <span className="codex-api-service-current-tag">
                      {t("common.loading", "Đang tải...")} {state.accountRefreshCompleted}/
                      {state.accountRefreshTotal}
                    </span>
                  )}
                  <span className="codex-api-service-current-tag">
                    {t("codex.localAccess.title", "Dịch vụ API")}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="codex-api-service-hero-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void reloadState()}
              disabled={busy || activating || testDialogRunning || sidecarRestarting}
            >
              <RefreshCw size={14} />
              {t("codex.localAccess.refreshStats", "Làm mới thống kê")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void handleRestartSidecar()}
              disabled={
                !collection ||
                busy ||
                activating ||
                testDialogRunning ||
                sidecarRestarting
              }
              title={t("codex.localAccess.restartAction", "Khởi động lại Sidecar")}
            >
              <RefreshCw
                size={14}
                className={sidecarRestarting ? "loading-spinner" : ""}
              />
              {t("codex.localAccess.restartAction", "Khởi động lại Sidecar")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenTestDialog}
              disabled={
                !collection ||
                busy ||
                activating ||
                state?.preparing ||
                testDialogRunning
              }
            >
              <ShieldCheck
                size={14}
                className={testDialogRunning ? "loading-spinner" : ""}
              />
              {t("codex.localAccess.testAction", "Kiểm tra")}
            </button>
            <button
              type="button"
              className={`btn ${apiServiceIsCurrent ? "btn-secondary" : "btn-primary"}`}
              onClick={() => void handleActivateService()}
              disabled={
                !collection ||
                busy ||
                activating ||
                state?.preparing ||
                testDialogRunning
              }
              title={t("codex.localAccess.activateAction", "Khởi động dịch vụ API")}
            >
              {activating ? (
                <RefreshCw size={14} className="loading-spinner" />
              ) : (
                <Play size={14} />
              )}
              {t("codex.localAccess.activateAction", "Khởi động dịch vụ API")}
            </button>
            <button
              type="button"
              className={`btn ${collection?.enabled ? "btn-danger" : "btn-secondary"}`}
              onClick={() => void handleToggleEnabled()}
              disabled={!collection || busy || activating || testDialogRunning}
            >
              <Power size={14} />
              {collection?.enabled
                ? t("codex.localAccess.disableService", "Tắt dịch vụ")
                : t("codex.localAccess.enableService", "Bật dịch vụ")}
            </button>
          </div>
          <div className="codex-api-service-hero-speed">
            <CodexSpeedControl scope="api" disabled={busy || activating || sidecarRestarting}
              onError={(message) => props.setError(message ?? "")} showHint />
          </div>
        </section>

        {(error || notice || inspectionNoticeKey || state?.lastError || state?.recovering || pricingRepriceActive) && (
          <div className="codex-api-service-message-stack">
            {inspectionNoticeKey && (
              <div className="codex-api-service-message warning" role="status">
                <CircleAlert size={15} />
                <span>{t(inspectionNoticeKey)}</span>
                <button type="button" className="codex-api-service-message-dismiss"
                  onClick={dismissInspectionNotice} aria-label={t("common.close")}>
                  <X size={14} />
                </button>
              </div>
            )}
            {state?.recovering && (
              <div className="codex-api-service-message info" role="status">
                <RefreshCw size={15} className="loading-spinner" />
                <span>{t("codex.apiService.recovery.progress", {
                  attempt: state.recoveryAttempt ?? 0,
                  total: state.recoveryTotal ?? 5,
                })}</span>
              </div>
            )}
            {error && error !== state?.lastError && (
              <div className="codex-api-service-message error">
                <CircleAlert size={15} />
                <span>{error}</span>
                <button
                  type="button"
                  className="codex-api-service-message-dismiss"
                  onClick={() => setError("")}
                  aria-label={t("common.close", "Đóng")}
                  title={t("common.close", "Đóng")}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {state?.lastError && (
              <div className={`codex-api-service-message ${keyRecoveryRequired ? "warning" : "error"}`}>
                <CircleAlert size={15} />
                <span>{keyRecoveryRequired
                  ? t(state.running ? "codex.apiService.recovery.partialUnavailable" : "codex.apiService.recovery.unavailable")
                  : state.lastError}</span>
                <button type="button" className="btn btn-secondary btn-sm"
                  onClick={() => void handleRestartSidecar()}
                  disabled={busy || sidecarRestarting || state.preparing}>
                  <RefreshCw size={13} />
                  {t("common.retry")}
                </button>
                {!keyRecoveryRequired && <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void handleKillPort()}
                  disabled={portKilling || busy || activating}
                >
                  <Wrench size={13} />
                  {t("codex.localAccess.killPortAction", "Dọn cổng")}
                </button>}
              </div>
            )}
            {notice && (
              <div className="codex-api-service-message success">
                <Check size={15} />
                <span>{notice}</span>
                <button
                  type="button"
                  className="codex-api-service-message-dismiss"
                  onClick={() => setNotice("")}
                  aria-label={t("common.close", "Đóng")}
                  title={t("common.close", "Đóng")}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {pricingRepriceActive && (
              <div className="codex-api-service-message codex-api-service-reprice-message">
                <RefreshCw size={15} />
                <div className="codex-api-service-reprice-status">
                  <span>{pricingRepriceStatusText}</span>
                  <div className="codex-api-service-reprice-track">
                    <div
                      className="codex-api-service-reprice-fill"
                      style={{ width: `${pricingRepricePercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "logs" && (
          <>
            <section className="codex-api-service-usage-toolbar">
              <div className="codex-api-service-usage-context">
                <Activity size={16} />
                <div>
                  <strong>
                    {t("codex.apiService.usage.title", "Usage Stats")}
                  </strong>
                  <span>
                    {selectedStatsRangeTitle}
                    {stats?.updatedAt
                      ? ` · ${t("codex.apiService.usage.lastRecorded", "Last recorded")} ${formatDateTime(stats.updatedAt)}`
                      : ""}
                  </span>
                </div>
              </div>
              <CodexStatsRangePicker
                value={statsRange}
                range={statsTimeRange}
                onPresetChange={handleStatsPresetChange}
                onCustomApply={handleCustomStatsRangeApply}
                disabled={busy}
                error={statsRangeError}
                compact
              />
            </section>

            <section className="codex-api-service-summary-grid">
              {summaryCards.map((item) => (
                <div key={item.key} className="codex-api-service-summary-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </div>
              ))}
            </section>

            <CodexUsageTrend statsWindow={selectedStatsWindow} />
          </>
        )}

        {activeTab === "overview" && (
          <div className="codex-api-service-grid two">
            <section className="codex-api-service-panel">
              <div className="codex-api-service-panel-head">
                <h2>{t("codex.localAccess.configTitle", "Cấu hình dịch vụ")}</h2>
              </div>
              <div className="codex-api-service-config-list">
                <label>
                  <span>Base URL</span>
                  <div className="codex-api-service-copy-row">
                    <code>{displayBaseUrl}</code>
                    <button
                      type="button"
                      className="folder-icon-btn"
                      onClick={() => void handleCopy("baseUrl", displayBaseUrl)}
                      disabled={!displayBaseUrl}
                    >
                      {copiedField === "baseUrl" ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </label>
                <label>
                  <span>
                    {t(
                      "codex.localAccess.clientBaseUrlHostLabel",
                      "Địa chỉ client",
                    )}
                  </span>
                  <div className="codex-api-service-input-row codex-api-service-stacked-control">
                    <SingleSelectDropdown
                      value={clientBaseUrlHost}
                      options={clientBaseUrlHostOptions}
                      onChange={(value) =>
                        void handleUpdateClientBaseUrlHost(value)
                      }
                      className="codex-api-service-client-host-select"
                      menuClassName="codex-api-service-client-host-menu"
                      disabled={busy || !collection}
                      ariaLabel={t(
                        "codex.localAccess.clientBaseUrlHostLabel",
                        "Địa chỉ client",
                      )}
                    />
                    <small className="codex-api-service-field-hint">
                      {t(
                        "codex.localAccess.clientBaseUrlHostDesc",
                        "Chỉ ảnh hưởng đến Base URL ghi vào Codex Provider và sao chép cho client; không đổi địa chỉ lắng nghe của dịch vụ.",
                      )}
                    </small>
                  </div>
                </label>
                <label>
                  <span>{t("codex.localAccess.apiKey", "Khóa")}</span>
                  <div className="codex-api-service-copy-row">
                    <code title={collection?.apiKey || "-"}>
                      {collection
                        ? keyVisible
                          ? collection.apiKey
                          : `${collection.apiKey.slice(0, 10)}••••••••••••`
                        : "-"}
                    </code>
                    <button
                      type="button"
                      className="folder-icon-btn"
                      onClick={() => setKeyVisible((current) => !current)}
                      disabled={!collection}
                    >
                      {keyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      className="folder-icon-btn"
                      onClick={() =>
                        void handleCopy("apiKey", collection?.apiKey || "")
                      }
                      disabled={!collection}
                    >
                      {copiedField === "apiKey" ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </label>
                <label>
                  <span>{t("codex.localAccess.portLabel", "Cổng dịch vụ")}</span>
                  <div className="codex-api-service-input-row">
                    <input
                      type="number"
                      min={1}
                      max={65535}
                      value={portInput}
                      onChange={(event) => setPortInput(event.target.value)}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void handleSavePort()}
                      disabled={busy}
                    >
                      {t("codex.localAccess.portSave", "Lưu cổng")}
                    </button>
                  </div>
                </label>
                <label>
                  <span>
                    {t("codex.localAccess.upstreamProxyLabel", "URL proxy API")}
                  </span>
                  <div className="codex-api-service-input-row codex-api-service-proxy-input-row">
                    <input
                      type="text"
                      value={proxyInput}
                      onChange={(event) => setProxyInput(event.target.value)}
                      placeholder={t(
                        "codex.localAccess.upstreamProxyUrlPlaceholderSidecar",
                        "De trong de dung proxy toan cuc",
                      )}
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => void handleSaveProxy()}
                      disabled={busy}
                    >
                      {t(
                        "codex.localAccess.upstreamProxySaveAction",
                        "Lưu proxy",
                      )}
                    </button>
                  </div>
                </label>
                <label>
                  <span>
                    {t("codex.apiService.timeouts.entryLabel", "Nâng cao")}
                  </span>
                  <div className="codex-api-service-input-row">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setTimeoutsError("");
                        setSelectedTimeoutPresetId(
                          collection?.activeTimeoutPresetId || "long_wait",
                        );
                        setTimeoutPresetNameDraft("");
                        setTimeoutDrafts(
                          timeoutDraftsFromValue(collection?.timeouts),
                        );
                        setTimeoutsModalOpen(true);
                      }}
                      disabled={!collection}
                    >
                      <SlidersHorizontal size={14} />
                      {t("codex.apiService.timeouts.openAction", "Hết hạn & thử lại")}
                    </button>
                  </div>
                </label>
              </div>
            </section>

            <section className="codex-api-service-panel">
              <div className="codex-api-service-panel-head">
                <h2>{t("codex.apiService.healthTitle", "Sức khỏe dịch vụ")}</h2>
              </div>
              <div className="codex-api-service-health-grid">
                <button
                  type="button"
                  className="codex-api-service-health-action"
                  onClick={() => setHealthModalOpen(true)}
                  aria-label={t(
                    "codex.localAccess.accountPoolHealth.openDetails",
                    "Xem lỗi tài khoản",
                  )}
                >
                  <span>
                    {t("codex.apiService.health.availableAccounts", "Tài khoản khả dụng")}
                  </span>
                  <strong>
                    {availableAccountCount}/{memberAccounts.length}
                  </strong>
                </button>
                <div>
                  <span>{t("codex.apiService.health.cooldowns", "Thời gian chờ")}</span>
                  <strong>{cooldownCount}</strong>
                </div>
                <div>
                  <span>
                    {t(
                      "codex.apiService.health.imageUnavailable",
                      "Ảnh không khả dụng",
                    )}
                  </span>
                  <strong>{imageUnavailableCount}</strong>
                </div>
                <div>
                  <span>{t("codex.apiService.health.keys", "Khóa máy khách")}</span>
                  <strong>{collection?.apiKeys.length ?? 0}</strong>
                </div>
              </div>
              <div className="codex-api-service-quota-strip">
                {quotaPoolSummary.visiblePlans.length === 0 ? (
                  <span>
                    {t("codex.localAccess.emptyMembers", "Hiện chưa có tài khoản trong bộ sưu tập")}
                  </span>
                ) : (
                  quotaPoolSummary.visiblePlans.map((item) => (
                    <span key={item.key}>
                      {item.key} ({item.count})
                      {item.windows.length > 0
                        ? ` · ${item.windows
                            .map(
                              (window) =>
                                `${formatCodexQuotaPoolWindowLabel(
                                  window.label,
                                  t("codex.localAccess.quotaPool.weeklyShort", "Tuần"),
                                )} ${formatCodexQuotaPoolPercent(window.percentage)}`,
                            )
                            .join(" · ")}`
                        : ""}
                    </span>
                  ))
                )}
              </div>
            </section>

            <section className="codex-api-service-panel codex-api-service-compat-panel">
              <div className="codex-api-service-panel-head">
                <div>
                  <h2>
                    {t(
                      "codex.apiService.compat.title",
                      "Tương thích giao thức",
                    )}
                  </h2>
                  <p className="codex-api-service-panel-desc">
                    {t(
                      "codex.apiService.compat.desc",
                      "Cùng một URL dịch vụ API hỗ trợ các ngõ OpenAI Chat, Responses, Anthropic Messages, Gemini và Ollama.",
                    )}
                  </p>
                </div>
              </div>
              <div className="codex-api-service-compat-grid">
                {compatibilityExamples.map((item) => {
                  const copyField: CopyField = `compat:${item.id}`;
                  return (
                    <div key={item.id} className="codex-api-service-compat-item">
                      <div className="codex-api-service-compat-item-head">
                        <div>
                          <strong>{item.title}</strong>
                          <span>{item.endpoint}</span>
                        </div>
                        <button
                          type="button"
                          className="folder-icon-btn"
                          onClick={() => void handleCopy(copyField, item.value)}
                          disabled={!displayBaseUrl}
                          title={t("common.copy", "Copy​")}
                        >
                          {copiedField === copyField ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      <code>{item.value}</code>
                      <small>{item.note}</small>
                    </div>
                  );
                })}
              </div>
              <div className="codex-api-service-compat-models">
                <span>
                  {t(
                    "codex.apiService.compat.modelCatalogLabel",
                    "Danh mục mô hình",
                  )}
                </span>
                <code>/v1/models · /v1beta/models · /api/tags</code>
              </div>
            </section>
          </div>
        )}

        {activeTab === "keys" && (
          <section className="codex-api-service-panel">
            <div className="codex-api-service-panel-head">
              <h2>{t("codex.localAccess.apiKeysTitle", "Khóa máy khách")}</h2>
                <div className="codex-api-service-head-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void handleCreateApiKey()}
                  disabled={busy || !collection}
                >
                  <Plus size={14} />
                  {t("codex.localAccess.apiKeyAdd", "Thêm khóa")}
                </button>
              </div>
            </div>
            <div className="codex-api-service-table">
              {(collection?.apiKeys ?? []).map((apiKey) => {
                const labelDraft = apiKeyDrafts[apiKey.id] ?? apiKey.label;
                const policyDraft =
                  apiKeyPolicyDrafts[apiKey.id] ??
                  apiKeyPolicyDraftFromValue(apiKey);
                const persistedInheritAccountPool =
                  apiKeyInheritsAccountPool(apiKey);
                const persistedAccountIds = apiKey.accountIds ?? [];
                const accountScopeLocked = apiKeyHasFixedAccountScope(
                  apiKey,
                  collection,
                );
                const keySelectableAccounts = selectCodexApiKeyScopeAccounts({
                  accounts: localAccessAccounts,
                  restrictFreeAccounts: collection?.restrictFreeAccounts ?? true,
                  scopedAccountIds: apiKey.accountIds ?? [],
                });
                const keySelectableAccountIds = keySelectableAccounts.map(
                  (account) => account.id,
                );
                const keySelectableAccountIdSet = new Set(
                  keySelectableAccounts.map((account) => account.id),
                );
                const policyDirty = apiKeyPolicyDraftIsDirty(
                  apiKey,
                  policyDraft,
                );
                const customScopeInvalid =
                  !policyDraft.inheritAccountPool &&
                  policyDraft.accountIds.length === 0;
                const keyStats = apiKeyStatsById.get(apiKey.id);
                const keyUsage = keyStats?.usage;
                const tokenLimit = apiKey.tokenLimit ?? 0;
                const tokenUsed = apiKey.tokenUsed ?? 0;
                const tokenLimitReached =
                  tokenLimit > 0 && tokenUsed >= tokenLimit;
                const tokenLimitProgress =
                  tokenLimit > 0
                    ? Math.min(100, Math.max(0, (tokenUsed / tokenLimit) * 100))
                    : 0;
                const keySuccessRate =
                  keyUsage && keyUsage.requestCount > 0
                    ? Math.round(
                        (keyUsage.successCount / keyUsage.requestCount) * 100,
                      )
                    : 0;
                const policyExpanded = expandedApiKeyPolicyIds.has(apiKey.id);
                return (
                  <div key={apiKey.id} className="codex-api-service-key-card"
                    id={codexApiKeyInspectionCardId(apiKey.id)} tabIndex={-1}>
                    <div className="codex-api-service-key-main">
                      <input
                        value={labelDraft}
                        onChange={(event) =>
                          setApiKeyDrafts((drafts) => ({
                            ...drafts,
                            [apiKey.id]: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          void handleSaveApiKeyLabel(apiKey.id, apiKey.label)
                        }
                        disabled={busy}
                        aria-label={t(
                          "codex.localAccess.apiKeyLabel",
                          "Tên khóa",
                        )}
                      />
                      <code title={apiKey.key}>
                        {keyVisible
                          ? apiKey.key
                          : `${apiKey.key.slice(0, 10)}••••••••••••`}
                      </code>
                      <span
                        className={`codex-api-service-pill ${apiKey.enabled ? "success" : "muted"}`}
                      >
                        {apiKey.enabled
                          ? t("common.enabled", "Enabled")
                          : t("common.disabled", "Disabled")}
                      </span>
                      <span className="codex-api-service-key-last-used">
                        <small>
                          {t("codex.apiService.keys.lastUsed", "Last used")}
                        </small>
                        <strong>{formatDateTime(apiKey.lastUsedAt)}</strong>
                      </span>
                      <div className="codex-api-service-row-actions">
                        <button
                          type="button"
                          className="folder-icon-btn"
                          onClick={() =>
                            void handleCopy(`apiKey:${apiKey.id}`, apiKey.key)
                          }
                          title={t("common.copy", "Copy")}
                        >
                          {copiedField === `apiKey:${apiKey.id}` ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="folder-icon-btn"
                          onClick={() =>
                            void handleToggleApiKey(apiKey.id, !apiKey.enabled)
                          }
                          disabled={busy}
                          title={
                            apiKey.enabled
                              ? t("common.disable", "Disable")
                              : t("common.enable", "Enable")
                          }
                        >
                          <Power size={14} />
                        </button>
                        <button
                          type="button"
                          className="folder-icon-btn"
                          onClick={() => void handleRotateApiKey(apiKey.id)}
                          disabled={busy}
                          title={t(
                            "codex.localAccess.apiKeyRotate",
                            "Rotate Key",
                          )}
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          type="button"
                          className="folder-icon-btn"
                          onClick={() => void handleDeleteApiKey(apiKey.id)}
                          disabled={
                            busy || (collection?.apiKeys.length ?? 0) <= 1
                          }
                          title={t("common.delete", "Delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="api-key-details-row">
                      <div
                        className={`api-key-routing-summary ${
                          !persistedInheritAccountPool &&
                          persistedAccountIds.length === 0
                            ? "warning"
                            : ""
                        }`}
                      >
                        <Route size={16} />
                        <div>
                          <span>
                            {t("codex.apiService.keys.routingAccounts", "Routing Accounts")}
                          </span>
                          <strong>
                            {persistedInheritAccountPool
                              ? t(
                                  "codex.apiService.keys.accountScopeInheritedCount",
                                  "Account pool: inheriting {{count}}",
                                  { count: memberIds.length },
                                )
                              : persistedAccountIds.length === 0
                                ? t(
                                    "codex.apiService.keys.accountScopeUnavailable",
                                    "Account pool: no available accounts",
                                  )
                                : t(
                                    "codex.apiService.keys.accountScopeCount",
                                    "Account pool: {{selected}}/{{total}}",
                                    {
                                      selected: persistedAccountIds.length,
                                      total: keySelectableAccountIds.length,
                                    },
                                  )}
                          </strong>
                        </div>
                      </div>
                      <div
                        className={`api-key-token-limit-summary${
                          tokenLimitReached ? " limit-reached" : ""
                        }`}
                      >
                        <Gauge size={16} />
                        <div>
                          <span>
                            {t(
                              "codex.apiService.keys.tokenLimitUsage",
                              "Token limit",
                            )}
                          </span>
                          <strong>
                            {tokenLimit > 0
                              ? `${formatCompactNumber(tokenUsed)} / ${formatCompactNumber(tokenLimit)}`
                              : t(
                                  "codex.apiService.keys.tokenLimitUnlimited",
                                  "Unlimited",
                                )}
                          </strong>
                          {tokenLimit > 0 && (
                            <span
                              className="api-key-token-limit-progress"
                              aria-label={`${Math.round(tokenLimitProgress)}%`}
                            >
                              <span
                                style={{ width: `${tokenLimitProgress}%` }}
                              />
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        key={`${statsRange}:${statsTimeRange.startAt}:${statsTimeRange.endAt}`}
                        className="api-key-usage-grid"
                        aria-live="polite"
                        aria-label={`${selectedStatsRangeTitle} Key Usage`}
                      >
                        <div className="api-key-usage-grid-head">
                          <Activity size={14} />
                          <span>{selectedStatsRangeTitle}</span>
                        </div>
                        <div>
                          <span>
                            {t("codex.localAccess.stats.requests", "Requests")}
                          </span>
                          <strong>
                            {formatCompactNumber(keyUsage?.requestCount ?? 0)}
                          </strong>
                        </div>
                        <div>
                          <span>Token</span>
                          <strong>{formatAccountTokenUsage(keyUsage)}</strong>
                        </div>
                        <div>
                          <span>
                            {t("codex.localAccess.stats.successRateLabel", "Success Rate")}
                          </span>
                          <strong>{keySuccessRate}%</strong>
                        </div>
                        <div>
                          <span>
                            {t("codex.localAccess.stats.estimatedCost", "Estimated Cost")}
                          </span>
                          <strong>
                            {formatUsdCost(keyUsage?.estimatedCostUsd ?? 0)}
                          </strong>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="codex-api-service-key-advanced-toggle"
                      aria-expanded={policyExpanded}
                      onClick={() => toggleApiKeyPolicyExpanded(apiKey.id)}
                    >
                      <span className="codex-api-service-section-title">
                        <SlidersHorizontal size={14} />
                        <span>
                          {t(
                            "codex.apiService.keys.advancedPolicyTitle",
                            "Nhóm tài khoản, mô hình và giới hạn token",
                          )}
                        </span>
                      </span>
                      <span className="codex-api-service-key-advanced-state">
                        {policyDirty && (
                          <span className="api-key-policy-dirty">
                            {t(
                              "codex.apiService.keys.unsaved",
                              "Chưa lưu",
                            )}
                          </span>
                        )}
                        {policyExpanded
                          ? t("common.collapse", "Thu gọn")
                          : t("common.expand", "Mở rộng")}
                        <ChevronDown size={14} />
                      </span>
                    </button>
                    {policyExpanded && (
                      <div className="codex-api-service-key-policy">
                        <div className="api-key-token-limit-editor">
                          <label>
                            <span>
                              {t(
                                "codex.apiService.keys.tokenLimit",
                                "Total token limit",
                              )}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={policyDraft.tokenLimit}
                              onChange={(event) =>
                                setApiKeyPolicyDrafts((drafts) => ({
                                  ...drafts,
                                  [apiKey.id]: {
                                    ...(drafts[apiKey.id] ?? policyDraft),
                                    tokenLimit: event.target.value,
                                  },
                                }))
                              }
                              placeholder={t(
                                "codex.apiService.keys.tokenLimitPlaceholder",
                                "Example: 10m",
                              )}
                              disabled={busy}
                            />
                          </label>
                          <div>
                            <strong>
                              {t(
                                "codex.apiService.keys.tokenLimitCurrentUsage",
                                "Used: {{used}} tokens",
                                { used: formatCompactNumber(tokenUsed) },
                              )}
                            </strong>
                            <small>
                              {t(
                                "codex.apiService.keys.tokenLimitHint",
                                "Leave blank for unlimited. Input and output tokens are combined across all models.",
                              )}
                            </small>
                          </div>
                        </div>
                        <div className="api-key-account-scope">
                          <div className="api-key-account-scope-header">
                            <span>
                              {t(
                                "codex.apiService.keys.accountScope",
                                "Phạm vi luân chuyển",
                              )}
                            </span>
                            <span className="api-key-account-scope-hint">
                              {accountScopeLocked
                                ? t(
                                    "codex.apiService.keys.accountScopeFixed",
                                    "Khóa này cố định với tài khoản liên kết và không thể kế thừa nhóm dịch vụ",
                                  )
                                : policyDraft.inheritAccountPool
                                  ? t(
                                      "codex.apiService.keys.accountScopeInherit",
                                      "Tự động theo nhóm tài khoản dịch vụ",
                                    )
                                  : customScopeInvalid
                                    ? t(
                                        "codex.apiService.keys.accountScopeRequired",
                                        "Chọn ít nhất một tài khoản",
                                      )
                                    : t(
                                        "codex.apiService.keys.accountScopeSelected",
                                        "Đã chọn {{count}} tài khoản",
                                        { count: policyDraft.accountIds.length },
                                      )}
                            </span>
                          </div>
                          <div
                            className="api-key-account-scope-mode"
                            role="group"
                            aria-label={t(
                              "codex.apiService.keys.accountScope",
                              "Phạm vi luân chuyển",
                            )}
                          >
                            <button
                              type="button"
                              className={
                                policyDraft.inheritAccountPool ? "active" : ""
                              }
                              aria-pressed={policyDraft.inheritAccountPool}
                              onClick={() =>
                                setApiKeyPolicyDrafts((drafts) => ({
                                  ...drafts,
                                  [apiKey.id]: {
                                    ...(drafts[apiKey.id] ?? policyDraft),
                                    inheritAccountPool: true,
                                  },
                                }))
                              }
                              disabled={busy || accountScopeLocked}
                              title={
                                accountScopeLocked
                                  ? t(
                                      "codex.apiService.keys.accountScopeFixed",
                                      "Khóa này cố định với tài khoản liên kết và không thể kế thừa nhóm dịch vụ",
                                    )
                                  : undefined
                              }
                            >
                              {t(
                                "codex.apiService.keys.accountScopeModeInherit",
                                "Kế thừa nhóm dịch vụ",
                              )}
                            </button>
                            <button
                              type="button"
                              className={
                                policyDraft.inheritAccountPool ? "" : "active"
                              }
                              aria-pressed={!policyDraft.inheritAccountPool}
                              onClick={() =>
                                setApiKeyPolicyDrafts((drafts) => {
                                  const currentDraft =
                                    drafts[apiKey.id] ?? policyDraft;
                                  const reusableAccountIds =
                                    currentDraft.accountIds.filter((accountId) =>
                                      keySelectableAccountIdSet.has(accountId),
                                    );
                                  return {
                                    ...drafts,
                                    [apiKey.id]: {
                                      ...currentDraft,
                                      inheritAccountPool: false,
                                      accountIds:
                                        reusableAccountIds.length > 0
                                          ? reusableAccountIds
                                          : memberAccountIds,
                                    },
                                  };
                                })
                              }
                              disabled={
                                busy ||
                                accountScopeLocked ||
                                keySelectableAccounts.length === 0
                              }
                            >
                              {t(
                                "codex.apiService.keys.accountScopeModeCustom",
                                "Nhóm tài khoản tùy chỉnh",
                              )}
                            </button>
                          </div>
                          {keySelectableAccounts.length === 0 ? (
                            <div className="codex-api-service-empty">
                              {t(
                                "codex.localAccess.emptyMembers",
                                "Hiện chưa có tài khoản trong bộ sưu tập",
                              )}
                            </div>
                          ) : (
                            <div className="api-key-account-scope-grid">
                              {keySelectableAccounts.map((account) => {
                                const presentation =
                                  buildCodexAccountPresentation(account, t);
                                const accountSelected =
                                  isCodexApiKeyScopeAccountActive({
                                    accountId: account.id,
                                    inheritAccountPool:
                                      policyDraft.inheritAccountPool,
                                    accountIds: policyDraft.accountIds,
                                    inheritedAccountIds: memberAccountIds,
                                  });
                                const canPinAccount =
                                  !policyDraft.inheritAccountPool &&
                                  !accountScopeLocked &&
                                  !policyDirty &&
                                  apiKey.accountIds?.includes(account.id);
                                const priorityRank = (
                                  apiKey.priorityAccountIds ?? []
                                ).indexOf(account.id);
                                const isPrioritizedAccount = priorityRank >= 0;
                                const isTopPriorityAccount = priorityRank === 0;
                                return (
                                  <div
                                    key={account.id}
                                    className={`api-key-account-scope-item${
                                      isPrioritizedAccount ? " is-preferred" : ""
                                    }`}
                                  >
                                    <label className="api-key-account-scope-selection">
                                      <input
                                        type="checkbox"
                                        checked={accountSelected}
                                        onChange={() =>
                                          setApiKeyPolicyDrafts((drafts) => {
                                            const currentDraft =
                                              drafts[apiKey.id] ?? policyDraft;
                                            const accountIds = toggleStringSelection(
                                              currentDraft.accountIds,
                                              account.id,
                                            );
                                            return {
                                              ...drafts,
                                              [apiKey.id]: {
                                                ...currentDraft,
                                                accountIds,
                                              },
                                            };
                                          })
                                        }
                                        disabled={
                                          busy ||
                                          policyDraft.inheritAccountPool ||
                                          accountScopeLocked
                                        }
                                      />
                                      <span>
                                        <strong title={presentation.displayName}>
                                          {maskAccountText(
                                            presentation.displayName,
                                          )}
                                        </strong>
                                        <small>{presentation.planLabel}</small>
                                      </span>
                                    </label>
                                    <button
                                      type="button"
                                      className="api-key-account-priority-btn"
                                      data-priority-rank={
                                        isPrioritizedAccount
                                          ? priorityRank + 1
                                          : undefined
                                      }
                                      aria-label={
                                        isTopPriorityAccount
                                          ? t(
                                              "codex.apiService.keys.accountPriorityClear",
                                              "Bỏ ghim tài khoản ưu tiên",
                                            )
                                          : isPrioritizedAccount
                                            ? t(
                                                "codex.apiService.keys.accountPriorityPromote",
                                                "Đưa tài khoản lên ưu tiên cao nhất",
                                              )
                                          : t(
                                              "codex.apiService.keys.accountPrioritySet",
                                              "Ghim tài khoản ưu tiên",
                                            )
                                      }
                                      aria-pressed={isPrioritizedAccount}
                                      title={
                                        isTopPriorityAccount
                                          ? t(
                                              "codex.apiService.keys.accountPriorityClear",
                                              "Bỏ ghim tài khoản ưu tiên",
                                            )
                                          : isPrioritizedAccount
                                            ? t(
                                                "codex.apiService.keys.accountPriorityPromote",
                                                "Đưa tài khoản lên ưu tiên cao nhất",
                                              )
                                          : t(
                                              "codex.apiService.keys.accountPrioritySet",
                                              "Ghim tài khoản ưu tiên",
                                            )
                                      }
                                      onClick={() =>
                                        void handleSetApiKeyAccountPriority(
                                          apiKey,
                                          policyDraft,
                                          account.id,
                                        )
                                      }
                                      disabled={busy || !canPinAccount}
                                    >
                                      {isTopPriorityAccount ? (
                                        <PinOff size={14} />
                                      ) : (
                                        <Pin size={14} />
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="codex-api-service-policy-grid">
                          <label>
                            <span>
                              {t(
                                "codex.apiService.keys.modelPrefix",
                                "Tiền tố mô hình",
                              )}
                            </span>
                            <input
                              value={policyDraft.modelPrefix}
                              onChange={(event) =>
                                setApiKeyPolicyDrafts((drafts) => ({
                                  ...drafts,
                                  [apiKey.id]: {
                                    ...(drafts[apiKey.id] ?? policyDraft),
                                    modelPrefix: event.target.value,
                                  },
                                }))
                              }
                              placeholder={t(
                                "codex.apiService.keys.modelPrefixPlaceholder",
                                "Ví dụ: codex",
                              )}
                              disabled={busy}
                            />
                          </label>
                          <label>
                            <span>
                              {t(
                                "codex.apiService.keys.allowedModels",
                                "Mô hình được phép",
                              )}
                            </span>
                            <textarea
                              value={policyDraft.allowedModels}
                              onChange={(event) =>
                                setApiKeyPolicyDrafts((drafts) => ({
                                  ...drafts,
                                  [apiKey.id]: {
                                    ...(drafts[apiKey.id] ?? policyDraft),
                                    allowedModels: event.target.value,
                                  },
                                }))
                              }
                              placeholder={t(
                                "codex.apiService.keys.allowedModelsPlaceholder",
                                "Để trống là tất cả; mỗi dòng một mô hình hoặc mẫu",
                              )}
                              disabled={busy}
                            />
                          </label>
                          <label>
                            <span>
                              {t(
                                "codex.apiService.keys.excludedModels",
                                "Mô hình loại trừ",
                              )}
                            </span>
                            <textarea
                              value={policyDraft.excludedModels}
                              onChange={(event) =>
                                setApiKeyPolicyDrafts((drafts) => ({
                                  ...drafts,
                                  [apiKey.id]: {
                                    ...(drafts[apiKey.id] ?? policyDraft),
                                    excludedModels: event.target.value,
                                  },
                                }))
                              }
                              placeholder={t(
                                "codex.apiService.keys.excludedModelsPlaceholder",
                                "Mỗi dòng một mô hình hoặc mẫu",
                              )}
                              disabled={busy}
                            />
                          </label>
                          <div className="codex-api-service-policy-actions">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleResetApiKeyPolicy(apiKey)}
                              disabled={busy || !policyDirty}
                            >
                              <Undo2 size={14} />
                              {t(
                                "codex.apiService.keys.resetPolicy",
                                "Bỏ thay đổi",
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                void handleSaveApiKeyPolicy(apiKey.id)
                              }
                              disabled={
                                busy || !policyDirty || customScopeInvalid
                              }
                            >
                              <Check size={14} />
                              {t(
                                "codex.apiService.keys.savePolicy",
                                "Lưu chính sách",
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === "accounts" && (
          <div className="codex-api-service-grid accounts">
            <section className="codex-api-service-panel">
              <div className="codex-api-service-panel-head">
                <h2>
                  {t("codex.localAccess.accountStatsTitle", "Theo tài khoản")}
                </h2>
                <div className="codex-api-service-head-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleOpenAddAccount}
                    disabled={busy || activating || testDialogRunning}
                    title={t("common.shared.addAccount", "Thêm tài khoản")}
                  >
                    <Plus size={14} />
                    {t("common.shared.addAccount", "Thêm tài khoản")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleOpenAccountModelMappings}
                    disabled={
                      busy || !collection || mappingMemberAccounts.length === 0
                    }
                  >
                    <Route size={14} />
                    {t(
                      "codex.apiService.accountModelMappings.action",
                      "Bản đồ mô hình",
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleOpenAccountModelRules}
                    disabled={busy || !collection || memberAccounts.length === 0}
                  >
                    <Wrench size={14} />
                    {t(
                      "codex.apiService.accountModelRules.action",
                      "Chặn mô hình",
                    )}
                    {accountModelRuleCount > 0 ? ` ${accountModelRuleCount}` : ""}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setMemberModalOpen(true)}
                    disabled={busy || !collection}
                  >
                    <FolderPlus size={14} />
                    {t("codex.localAccess.modal.manageMembers", "Quản lý thành viên")}
                  </button>
                </div>
              </div>
              <div className="codex-api-service-account-grid">
                {memberAccounts.length === 0 ? (
                  <div className="codex-api-service-empty codex-api-service-empty-with-action">
                    <span>
                      {t("codex.localAccess.emptyMembers", "Hiện chưa có tài khoản trong bộ sưu tập")}
                    </span>
                    <div className="codex-api-service-empty-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleOpenAddAccount}
                        disabled={busy || activating || testDialogRunning}
                      >
                        <Plus size={14} />
                        {t("common.shared.addAccount", "Thêm tài khoản")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setMemberModalOpen(true)}
                        disabled={busy || !collection}
                      >
                        <FolderPlus size={14} />
                        {t("codex.localAccess.modal.manageMembers", "Quản lý thành viên")}
                      </button>
                    </div>
                  </div>
                ) : (
                  memberAccounts.map((account) => {
                    const presentation = buildCodexAccountPresentation(
                      account,
                      t,
                    );
                    const health = healthByAccountId.get(account.id);
                    const stat = selectedStatsWindow?.accounts.find(
                      (item) => item.accountId === account.id,
                    );
                    const disabledModelCount =
                      parseModelRuleText(
                        accountModelRuleDrafts[account.id] ?? "",
                      ).length;
                    return (
                      <div
                        key={account.id}
                        className="codex-api-service-account-card"
                      >
                        <div>
                          <strong title={presentation.displayName}>
                            {maskAccountText(presentation.displayName)}
                          </strong>
                          <span
                            className={`tier-badge ${presentation.planClass}`}
                          >
                            {presentation.planLabel}
                          </span>
                        </div>
                        <div className="codex-api-service-account-meta">
                          <span>
                            {t("codex.localAccess.stats.accountRequests", {
                              count: stat?.usage.requestCount ?? 0,
                              defaultValue: "{{count}} yêu cầu",
                            })}
                          </span>
                          <span className="codex-api-service-account-meta-token">
                            {formatAccountTokenUsage(stat?.usage)}
                          </span>
                          <span>{formatRequestResultDetail(stat?.usage)}</span>
                          <span>
                            {formatUsdCost(stat?.usage.estimatedCostUsd ?? 0)}
                          </span>
                          <span>
                            {t("codex.apiService.accountHealth.failures", {
                              count: health?.consecutiveFailures ?? 0,
                              defaultValue: "{{count}} lỗi liên tiếp",
                            })}
                          </span>
                          <span>
                            {health?.cooldowns.length
                              ? t("codex.localAccess.healthCooldown", {
                                  count: health.cooldowns.length,
                                  defaultValue: "Chờ {{count}}",
                                })
                              : health && !health.available
                                ? t(
                                    health.schedulerReason === "unauthorized"
                                      ? "codex.apiService.accountHealth.authError"
                                      : "codex.apiService.accountHealth.unavailable",
                                    health.schedulerReason === "unauthorized"
                                      ? "鉴权异常"
                                      : "暂不可用",
                                  )
                                : t("codex.localAccess.healthAvailable", "Khả dụng")}
                          </span>
                          <span>
                            {t("codex.apiService.accountHealth.image", {
                              status:
                                health?.imageGenerationStatus ?? "unknown",
                              defaultValue: "Ảnh {{status}}",
                            })}
                          </span>
                          {(account.api_model_mappings?.length ?? 0) > 0 && (
                            <span>
                              {t(
                                "codex.apiService.accountModelMappings.cardCount",
                                {
                                  count: account.api_model_mappings?.length ?? 0,
                                  defaultValue: "{{count}} đã ánh xạ",
                                },
                              )}
                            </span>
                          )}
                          {disabledModelCount > 0 && (
                            <span>
                              {t(
                                "codex.apiService.accountModelRules.cardCount",
                                {
                                  count: disabledModelCount,
                                  defaultValue: "Chặn {{count}}",
                                },
                              )}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="folder-icon-btn"
                          onClick={() => void handleRemoveMember(account.id)}
                          disabled={busy}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="codex-api-service-panel">
              <div className="codex-api-service-panel-head">
                <h2 className="codex-api-service-title-with-icon">
                  <Route size={16} />
                  {t("codex.apiService.routing.optionsTitle", "Tùy chọn định tuyến")}
                </h2>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void handleSaveRoutingOptions()}
                  disabled={busy || routingSaving || !collection}
                >
                  <Check size={14} />
                  {t("codex.apiService.routing.saveOptions", "Lưu tùy chọn")}
                </button>
              </div>
              <div className="codex-api-service-config-list codex-api-service-routing-form">
                <label>
                  <span>{t("codex.localAccess.routingLabel", "Định tuyến")}</span>
                  <SingleSelectDropdown
                    value={routingStrategy}
                    options={routingOptions}
                    onChange={(value) => void handleUpdateRouting(value)}
                    disabled={busy || !collection}
                    ariaLabel={t("codex.localAccess.routingLabel", "Định tuyến")}
                  />
                </label>
                <label>
                  <span>
                    {t(
                      "codex.apiService.routing.sessionAffinity",
                      "Gắn phiên",
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={sessionAffinityDraft}
                    onChange={(event) =>
                      setSessionAffinityDraft(event.target.checked)
                    }
                    disabled={routingSaving || !collection}
                  />
                </label>
                <label>
                  <span>
                    {t(
                      "codex.apiService.routing.sessionAffinityTtl",
                      "Thời gian hết hạn (giây)",
                    )}
                  </span>
                  <input
                    type="number"
                    min={60}
                    max={86400}
                    value={sessionAffinityTtlDraft}
                    onChange={(event) =>
                      setSessionAffinityTtlDraft(event.target.value)
                    }
                    disabled={routingSaving || !collection}
                  />
                </label>
                <label>
                  <span>
                    {t(
                      "codex.apiService.routing.responsesWebsockets",
                      "Responses WebSocket",
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={responsesWebsocketsEnabledDraft}
                    onChange={(event) =>
                      setResponsesWebsocketsEnabledDraft(event.target.checked)
                    }
                    disabled={busy || !collection}
                  />
                </label>
                <label>
                  <span>
                    {t(
                      "codex.apiService.routing.maxRetryCredentials",
                      "Tài khoản retry",
                    )}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={8}
                    value={maxRetryCredentialsDraft}
                    onChange={(event) =>
                      setMaxRetryCredentialsDraft(event.target.value)
                    }
                    disabled={busy || !collection}
                  />
                </label>
                <label>
                  <span>
                    {t("codex.apiService.routing.maxRetryInterval", "Chờ retry")}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={maxRetryIntervalDraft}
                    onChange={(event) =>
                      setMaxRetryIntervalDraft(event.target.value)
                    }
                    disabled={busy || !collection}
                  />
                </label>
                <label>
                  <span>
                    {t("codex.apiService.routing.disableCooling", "Tắt cooldown")}
                  </span>
                  <input
                    type="checkbox"
                    checked={disableCoolingDraft}
                    onChange={(event) =>
                      setDisableCoolingDraft(event.target.checked)
                    }
                    disabled={busy || !collection}
                  />
                </label>
                <label>
                  <span>
                    {t(
                      "codex.apiService.routing.immediateSseResponse",
                      "SSE trả 200 ngay",
                    )}
                  </span>
                  <input
                    type="checkbox"
                    checked={immediateSseResponseDraft}
                    onChange={(event) =>
                      setImmediateSseResponseDraft(event.target.checked)
                    }
                    disabled={busy || !collection}
                  />
                </label>
                <label>
                  <span>
                    {t(
                      "codex.apiService.routing.maxConcurrentImageRequests",
                      "Image requests per account",
                    )}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={maxConcurrentImageRequestsDraft}
                    onChange={(event) =>
                      setMaxConcurrentImageRequestsDraft(event.target.value)
                    }
                    disabled={busy || !collection}
                  />
                </label>
                <label>
                  <span>
                    {t(
                      "codex.apiService.routing.maxAccountConcurrency",
                      "Account concurrency",
                    )}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={64}
                    value={maxAccountConcurrencyDraft}
                    onChange={(event) =>
                      setMaxAccountConcurrencyDraft(event.target.value)
                    }
                    disabled={busy || !collection}
                  />
                </label>
                <label>
                  <span>
                    {t(
                      "codex.apiService.routing.accountConcurrencyWait",
                      "Concurrency wait (s)",
                    )}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={1800}
                    value={accountConcurrencyWaitDraft}
                    onChange={(event) =>
                      setAccountConcurrencyWaitDraft(event.target.value)
                    }
                    disabled={busy || !collection}
                  />
                </label>
              </div>
            </section>
          </div>
        )}

        {activeTab === "models" && (
          <div className="codex-api-service-grid two">
            <section className="codex-api-service-panel">
              <div className="codex-api-service-panel-head">
                <h2>
                  {t("codex.apiService.models.availableTitle", "Mô hình khả dụng")}
                </h2>
                <div className="codex-api-service-head-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleOpenPricingModal}
                    disabled={!collection}
                  >
                    <BadgeDollarSign size={14} />
                    {t("codex.apiService.models.pricingAction", "Giá")}
                  </button>
                  <button
                    type="button"
                    className="folder-icon-btn"
                    onClick={() => void handleCopy("modelId", selectedModelId)}
                    disabled={!selectedModelId}
                  >
                    {copiedField === "modelId" ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </div>
              <div className="codex-api-service-model-list">
                {modelIds.map((modelId) => (
                  <button
                    key={modelId}
                    type="button"
                    className={selectedModelId === modelId ? "active" : ""}
                    onClick={() => setSelectedModelId(modelId)}
                  >
                    <span>{modelId}</span>
                    {modelId === "gpt-image-2" && <Image size={14} />}
                  </button>
                ))}
              </div>
            </section>
            <div className="codex-api-service-panel-stack">
              <section className="codex-api-service-panel">
                <div className="codex-api-service-panel-head">
                  <h2>
                    {t("codex.apiService.models.capabilityTitle", "Công tắc năng lực")}
                  </h2>
                </div>
                <div className="codex-api-service-config-list">
                  <label>
                    <span>
                      {t("codex.localAccess.accessScopeLabel", "Phạm vi truy cập")}
                    </span>
                    <SingleSelectDropdown
                      value={accessScope}
                      options={accessScopeOptions}
                      onChange={(value) => void handleUpdateAccessScope(value)}
                      disabled={busy || !collection}
                      ariaLabel={t(
                        "codex.localAccess.accessScopeLabel",
                        "Phạm vi truy cập",
                      )}
                    />
                  </label>
                  <p className="codex-api-service-muted">
                    {t(
                      "codex.apiService.models.capabilityDesc",
                      "gpt-image-2 được tự động hiển thị hoặc ẩn theo công tắc dịch vụ, gói tài khoản và trạng thái năng lực ảnh đã ghi nhận.",
                    )}
                  </p>
                </div>
              </section>
              <section className="codex-api-service-panel">
                <div className="codex-api-service-panel-head">
                  <h2>{t("codex.apiService.models.rulesTitle", "Quy tắc mô hình")}</h2>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void handleSaveModelRules()}
                    disabled={busy || !collection}
                  >
                    <Check size={14} />
                    {t("codex.apiService.models.saveRules", "Lưu quy tắc")}
                  </button>
                </div>
                <div className="codex-api-service-policy-grid model-rules">
                  <label>
                    <span>
                      {t("codex.apiService.models.aliasTitle", "Bí danh mô hình")}
                    </span>
                    <textarea
                      value={modelAliasesText}
                      onChange={(event) =>
                        setModelAliasesText(event.target.value)
                      }
                      placeholder={t(
                        "codex.apiService.models.aliasPlaceholder",
                        "gpt-5 => g5; thêm + để giữ mô hình gốc",
                      )}
                      disabled={busy || !collection}
                    />
                  </label>
                  <label>
                    <span>
                      {t("codex.apiService.models.excludedTitle", "Mô hình ẩn")}
                    </span>
                    <textarea
                      value={excludedModelsText}
                      onChange={(event) =>
                        setExcludedModelsText(event.target.value)
                      }
                      placeholder={t(
                        "codex.apiService.models.excludedPlaceholder",
                        "Mỗi dòng một mô hình hoặc mẫu, ví dụ gpt-5-*",
                      )}
                      disabled={busy || !collection}
                    />
                  </label>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "logs" && (
          <section className="codex-api-service-panel">
            <div className="codex-api-service-panel-head codex-api-service-log-panel-head">
              <div
                className="codex-api-service-subtabs"
                role="tablist"
                aria-label={t("codex.apiService.tabs.logs", "Thống kê và nhật ký")}
              >
                {statsLogTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={statsLogTab === tab.key}
                    className={statsLogTab === tab.key ? "active" : ""}
                    onClick={() => setStatsLogTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="codex-api-service-head-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => void handleRefreshStatsDetails()}
                  disabled={busy || statsDetailsRefreshing}
                  title={t("codex.localAccess.refreshStats", "Làm mới thống kê")}
                >
                  <RefreshCw
                    size={14}
                    className={statsDetailsRefreshing ? "loading-spinner" : ""}
                  />
                  {t("common.refresh", "Làm mới")}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => void handleClearStats()}
                  disabled={busy}
                >
                  <Trash2 size={14} />
                  {t("codex.localAccess.clearStats", "Xóa thống kê")}
                </button>
              </div>
            </div>

            {statsLogTab === "accounts" && (
              <div className="codex-api-service-account-grid codex-api-service-stats-account-grid">
                {memberAccounts.length === 0 ? (
                  <div className="codex-api-service-empty">
                    {t("codex.localAccess.emptyMembers", "Hiện chưa có tài khoản trong bộ sưu tập")}
                  </div>
                ) : (
                  memberAccounts.map((account) => {
                    const presentation = buildCodexAccountPresentation(
                      account,
                      t,
                    );
                    const health = healthByAccountId.get(account.id);
                    const stat = selectedStatsWindow?.accounts.find(
                      (item) => item.accountId === account.id,
                    );
                    return (
                      <div
                        key={account.id}
                        className="codex-api-service-account-card"
                      >
                        <div>
                          <strong title={presentation.displayName}>
                            {maskAccountText(presentation.displayName)}
                          </strong>
                          <span
                            className={`tier-badge ${presentation.planClass}`}
                          >
                            {presentation.planLabel}
                          </span>
                        </div>
                        <div className="codex-api-service-account-meta">
                          <span>
                            {t("codex.localAccess.stats.accountRequests", {
                              count: stat?.usage.requestCount ?? 0,
                              defaultValue: "{{count}} yêu cầu",
                            })}
                          </span>
                          <span className="codex-api-service-account-meta-token">
                            {formatAccountTokenUsage(stat?.usage)}
                          </span>
                          <span>{formatRequestResultDetail(stat?.usage)}</span>
                          <span>
                            {formatUsdCost(stat?.usage.estimatedCostUsd ?? 0)}
                          </span>
                          <span>
                            {t("codex.apiService.accountHealth.failures", {
                              count: health?.consecutiveFailures ?? 0,
                              defaultValue: "{{count}} lỗi liên tiếp",
                            })}
                          </span>
                          <span>
                            {health?.cooldowns.length
                              ? t("codex.localAccess.healthCooldown", {
                                  count: health.cooldowns.length,
                                  defaultValue: "Chờ {{count}}",
                                })
                              : health && !health.available
                                ? t(
                                    health.schedulerReason === "unauthorized"
                                      ? "codex.apiService.accountHealth.authError"
                                      : "codex.apiService.accountHealth.unavailable",
                                    health.schedulerReason === "unauthorized"
                                      ? "鉴权异常"
                                      : "暂不可用",
                                  )
                                : t("codex.localAccess.healthAvailable", "Khả dụng")}
                          </span>
                          <span>
                            {t("codex.apiService.accountHealth.image", {
                              status:
                                health?.imageGenerationStatus ?? "unknown",
                              defaultValue: "Ảnh {{status}}",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {statsLogTab === "models" && (
              <div className="codex-api-service-log-list">
                {(selectedStatsWindow?.models?.length ?? 0) === 0 ? (
                  <div className="codex-api-service-empty">
                    {t("codex.localAccess.statsEmpty", "Chưa có thống kê")}
                  </div>
                ) : (
                  selectedStatsWindow?.models.map((item) => (
                    <div
                      key={item.modelId}
                      className="codex-api-service-log-row codex-api-service-stat-row"
                    >
                      <div>
                        <strong>{item.modelId}</strong>
                      </div>
                      <div>
                        <span>
                          {t("codex.localAccess.stats.accountRequests", {
                            count: item.usage.requestCount,
                            defaultValue: "{{count}} yêu cầu",
                          })}
                        </span>
                        <span>{formatRequestResultDetail(item.usage)}</span>
                        <span>
                          {formatCompactNumber(item.usage.totalTokens)} Tokens
                        </span>
                        <span>
                          {formatUsdCost(item.usage.estimatedCostUsd)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {statsLogTab === "keys" && (
              <div className="codex-api-service-log-list">
                {(selectedStatsWindow?.apiKeys?.length ?? 0) === 0 ? (
                  <div className="codex-api-service-empty">
                    {t("codex.localAccess.statsEmpty", "Chưa có thống kê")}
                  </div>
                ) : (
                  selectedStatsWindow?.apiKeys.map((item) => (
                    <div
                      key={item.apiKeyId}
                      className="codex-api-service-log-row codex-api-service-stat-row"
                    >
                      <div>
                        <strong title={item.label || item.apiKeyId}>
                          {item.label || item.apiKeyId}
                        </strong>
                      </div>
                      <div>
                        <span>
                          {t("codex.localAccess.stats.accountRequests", {
                            count: item.usage.requestCount,
                            defaultValue: "{{count}} yêu cầu",
                          })}
                        </span>
                        <span>{formatRequestResultDetail(item.usage)}</span>
                        <span>
                          {formatCompactNumber(item.usage.totalTokens)} Tokens
                        </span>
                        <span>
                          {formatUsdCost(item.usage.estimatedCostUsd)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {statsLogTab === "logs" && (
              <CodexApiRequestLogs {...props} />
            )}
          </section>
        )}
      </main>

      {timeoutsModalOpen && (
        <div
          className="modal-overlay codex-api-service-pricing-overlay"
          role="presentation"
        >
          <div
            className="modal codex-api-service-timeouts-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-api-service-timeouts-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="codex-api-service-timeouts-title">
                  {t("codex.apiService.timeouts.title", "Hết hạn & thử lại")}
                </h2>
                <p className="codex-api-service-pricing-desc">
                  {t(
                    "codex.apiService.timeouts.desc",
                    "Giá trị tính bằng giây. Khi lưu, dịch vụ API sẽ khởi động lại hoặc tải lại.",
                  )}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setTimeoutsModalOpen(false)}
                aria-label={t("common.close", "Đóng")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body codex-api-service-timeouts-body">
              {timeoutsError && (
                <div className="codex-api-service-message error">
                  <CircleAlert size={15} />
                  <span>{timeoutsError}</span>
                </div>
              )}
              <section className="codex-api-service-timeout-section codex-api-service-timeout-preset-section">
                <h3>
                  {t("codex.apiService.timeouts.presetTitle", "Mẫu tham số")}
                </h3>
                <div className="codex-api-service-timeout-preset-row">
                  <label className="codex-api-service-timeout-preset-select">
                    <span>
                      {t("codex.apiService.timeouts.presetSelect", "Chọn mẫu")}
                    </span>
                    <select
                      value={selectedTimeoutPresetId}
                      onChange={(event) =>
                        applyTimeoutPreset(event.target.value)
                      }
                    >
                      {timeoutPresetOptions.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="codex-api-service-timeout-preset-name">
                    <span>
                      {t("codex.apiService.timeouts.presetName", "Tên mẫu")}
                    </span>
                    <input
                      type="text"
                      maxLength={40}
                      value={timeoutPresetNameDraft}
                      onChange={(event) => {
                        setTimeoutsError("");
                        setTimeoutPresetNameDraft(event.target.value);
                      }}
                      placeholder={t(
                        "codex.apiService.timeouts.presetNamePlaceholder",
                        "Mẫu tùy chỉnh mới",
                      )}
                    />
                  </label>
                </div>
                <div className="codex-api-service-timeout-preset-actions">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void handleCreateTimeoutPreset()}
                    disabled={!collection || busy}
                  >
                    <Plus size={14} />
                    {t("codex.apiService.timeouts.saveAsPreset", "Lưu thành mẫu")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => void handleUpdateTimeoutPreset()}
                    disabled={
                      !collection || !selectedTimeoutPresetIsCustom || busy
                    }
                  >
                    <Check size={14} />
                    {t(
                      "codex.apiService.timeouts.updatePreset",
                      "Cập nhật mẫu hiện tại",
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm danger"
                    onClick={() => void handleDeleteTimeoutPreset()}
                    disabled={
                      !collection || !selectedTimeoutPresetIsCustom || busy
                    }
                  >
                    <Trash2 size={14} />
                    {t("codex.apiService.timeouts.deletePreset", "Xóa mẫu")}
                  </button>
                </div>
              </section>
              <section className="codex-api-service-timeout-section">
                <h3>
                  {t("codex.apiService.timeouts.sidecarTitle", "Thời gian luồng")}
                </h3>
                <div className="codex-api-service-policy-grid">
                  <label>
                    <span>
                      {t("codex.apiService.timeouts.streamOpen", "Mở stream")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={timeoutDrafts.sidecarStreamOpenTimeoutMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "sidecarStreamOpenTimeoutMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t("codex.apiService.timeouts.streamIdle", "Stream rỗi")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={timeoutDrafts.sidecarStreamIdleTimeoutMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "sidecarStreamIdleTimeoutMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t("codex.apiService.timeouts.imageOpen", "Mở ảnh")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={timeoutDrafts.sidecarImageStreamOpenTimeoutMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "sidecarImageStreamOpenTimeoutMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t("codex.apiService.timeouts.imageIdle", "Ảnh rỗi")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={timeoutDrafts.sidecarImageStreamIdleTimeoutMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "sidecarImageStreamIdleTimeoutMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t("codex.apiService.timeouts.openAttempts", "Lần mở")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={3}
                      value={timeoutDrafts.sidecarStreamOpenMaxAttempts}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "sidecarStreamOpenMaxAttempts",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t("codex.apiService.timeouts.keepalive", "Keep-alive")}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={300}
                      value={timeoutDrafts.sidecarStreamKeepaliveSeconds}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "sidecarStreamKeepaliveSeconds",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.bootstrapRetries",
                        "Thử lại khởi động",
                      )}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={timeoutDrafts.sidecarStreamingBootstrapRetries}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "sidecarStreamingBootstrapRetries",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              </section>
              <section className="codex-api-service-timeout-section">
                <h3>
                  {t(
                    "codex.apiService.timeouts.retryTitle",
                    "发送与账号重试",
                  )}
                </h3>
                <div className="codex-api-service-policy-grid">
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.sendRetryAttempts",
                        "Thử lại gửi",
                      )}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={timeoutDrafts.upstreamSendRetryAttempts}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "upstreamSendRetryAttempts",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.sendRetryBaseDelay",
                        "Trễ cơ bản gửi (ms)",
                      )}
                    </span>
                    <input
                      type="number"
                      min={50}
                      max={10000}
                      value={timeoutDrafts.upstreamSendRetryBaseDelayMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "upstreamSendRetryBaseDelayMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.sendRetryMaxDelay",
                        "Trễ tối đa gửi (ms)",
                      )}
                    </span>
                    <input
                      type="number"
                      min={50}
                      max={10000}
                      value={timeoutDrafts.upstreamSendRetryMaxDelayMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "upstreamSendRetryMaxDelayMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.singleStatusAttempts",
                        "Thử lại một tài khoản",
                      )}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      value={timeoutDrafts.singleAccountStatusRetryAttempts}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "singleAccountStatusRetryAttempts",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.singleStatusBaseDelay",
                        "Trễ cơ bản tài khoản (ms)",
                      )}
                    </span>
                    <input
                      type="number"
                      min={50}
                      max={10000}
                      value={timeoutDrafts.singleAccountStatusRetryBaseDelayMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "singleAccountStatusRetryBaseDelayMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.singleStatusMaxDelay",
                        "Trễ tối đa tài khoản (ms)",
                      )}
                    </span>
                    <input
                      type="number"
                      min={50}
                      max={10000}
                      value={timeoutDrafts.singleAccountStatusRetryMaxDelayMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "singleAccountStatusRetryMaxDelayMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              </section>
              <section className="codex-api-service-timeout-section">
                <h3>
                  {t(
                    "codex.apiService.timeouts.websocketTitle",
                    "Thiết lập WebSocket",
                  )}
                </h3>
                <div className="codex-api-service-policy-grid">
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.websocketConnect",
                        "Hết hạn kết nối",
                      )}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={timeoutDrafts.websocketConnectTimeoutMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "websocketConnectTimeoutMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.websocketInitial",
                        "Hết hạn tin đầu",
                      )}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={timeoutDrafts.websocketInitialMessageTimeoutMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "websocketInitialMessageTimeoutMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t("codex.apiService.timeouts.websocketIdle", "Hết hạn nhàn rỗi")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={1800}
                      value={timeoutDrafts.websocketIdleTimeoutMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "websocketIdleTimeoutMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>
                      {t(
                        "codex.apiService.timeouts.websocketHeartbeat",
                        "Khoảng heartbeat",
                      )}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={600}
                      value={timeoutDrafts.websocketHeartbeatIntervalMs}
                      onChange={(event) =>
                        updateTimeoutDraft(
                          "websocketHeartbeatIntervalMs",
                          event.target.value,
                        )
                      }
                    />
                  </label>
                </div>
              </section>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void handleRepriceRequestLogs()}
                disabled={busy}
              >
                <RefreshCw size={15} />
                {t("codex.apiService.models.pricingReprice", "Tính lại lịch sử")}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleResetTimeoutDrafts}
              >
                {t("codex.apiService.timeouts.resetDefaults", "Khôi phục mặc định")}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTimeoutsModalOpen(false)}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSaveTimeouts()}
                disabled={busy}
              >
                <Check size={15} />
                {t("common.save", "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {accountModelRulesOpen && (
        <div
          className="modal-overlay codex-api-service-pricing-overlay"
          role="presentation"
        >
          <div
            className="modal codex-api-service-pricing-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-api-service-account-model-rules-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="codex-api-service-account-model-rules-title">
                  {t(
                    "codex.apiService.accountModelRules.title",
                    "Chặn mô hình theo tài khoản",
                  )}
                </h2>
                <p className="codex-api-service-pricing-desc">
                  {t(
                    "codex.apiService.accountModelRules.desc",
                    "Tài khoản khớp quy tắc sẽ bị bỏ qua với yêu cầu mô hình đó. Mỗi dòng một mô hình hoặc ký tự đại diện.",
                  )}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseAccountModelRules}
                aria-label={t("common.close", "Đóng")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body codex-api-service-pricing-body">
              <div className="codex-api-service-policy-actions">
                <label className="codex-api-service-account-model-bulk">
                  <span>
                    {t(
                      "codex.apiService.accountModelRules.bulkLabel",
                      "Quy tắc hàng loạt",
                    )}
                  </span>
                  <textarea
                    value={accountModelRuleBulkText}
                    onChange={(event) =>
                      setAccountModelRuleBulkText(event.target.value)
                    }
                    placeholder={t(
                      "codex.apiService.accountModelRules.placeholder",
                      "gpt-6-luna\ngpt-6-*",
                    )}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleApplyAccountModelRuleBulk}
                  disabled={busy || accountModelRuleSelected.size === 0}
                >
                  {t(
                    "codex.apiService.accountModelRules.applySelected",
                    "Áp dụng đã chọn",
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    setAccountModelRuleSelected(
                      accountModelRuleAllSelected
                        ? new Set()
                        : new Set(memberAccounts.map((account) => account.id)),
                    )
                  }
                  disabled={memberAccounts.length === 0}
                >
                  {accountModelRuleAllSelected
                    ? t(
                        "codex.apiService.accountModelRules.clearSelection",
                        "Bỏ chọn",
                      )
                    : t(
                        "codex.apiService.accountModelRules.selectAll",
                        "Chọn tài khoản",
                      )}
                </button>
              </div>
              <div className="codex-api-service-pricing-table">
                {memberAccounts.map((account) => {
                  const presentation = buildCodexAccountPresentation(
                    account,
                    t,
                  );
                  return (
                    <div
                      key={account.id}
                      className="codex-api-service-account-model-row"
                    >
                      <label className="codex-api-service-account-model-check">
                        <input
                          type="checkbox"
                          checked={accountModelRuleSelected.has(account.id)}
                          onChange={(event) => {
                            setAccountModelRuleSelected((selected) => {
                              const next = new Set(selected);
                              if (event.target.checked) {
                                next.add(account.id);
                              } else {
                                next.delete(account.id);
                              }
                              return next;
                            });
                          }}
                        />
                        <span>
                          <strong title={presentation.displayName}>
                            {maskAccountText(presentation.displayName)}
                          </strong>
                          <small>{presentation.planLabel}</small>
                        </span>
                      </label>
                      <textarea
                        value={accountModelRuleDrafts[account.id] ?? ""}
                        onChange={(event) =>
                          setAccountModelRuleDrafts((drafts) => ({
                            ...drafts,
                            [account.id]: event.target.value,
                          }))
                        }
                        placeholder={t(
                          "codex.apiService.accountModelRules.placeholder",
                          "gpt-6-luna\ngpt-6-*",
                        )}
                        disabled={busy}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseAccountModelRules}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSaveAccountModelRules()}
                disabled={busy}
              >
                <Check size={15} />
                {t("common.save", "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {accountModelMappingsOpen && (
        <div
          className="modal-overlay codex-api-service-pricing-overlay"
          role="presentation"
        >
          <div
            className="modal codex-api-service-pricing-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-api-service-account-model-mappings-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="codex-api-service-account-model-mappings-title">
                  {t(
                    "codex.apiService.accountModelMappings.title",
                    "Ánh xạ mô hình tài khoản",
                  )}
                </h2>
                <p className="codex-api-service-pricing-desc">
                  {t(
                    "codex.apiService.accountModelMappings.desc",
                    "Chỉ viết lại tên mô hình sau khi tài khoản này được chọn. Bên trái là yêu cầu của máy khách; bên phải là mô hình thực sự được gửi lên.",
                  )}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={handleCloseAccountModelMappings}
                aria-label={t("common.close", "Đóng")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body codex-api-service-pricing-body">
              {accountModelMappingError && (
                <div className="codex-api-service-message error">
                  <CircleAlert size={15} />
                  <span>{accountModelMappingError}</span>
                </div>
              )}
              {mappingMemberAccounts.length === 0 ? (
                <div className="codex-api-service-empty">
                  {t(
                    "codex.apiService.accountModelMappings.empty",
                    "Không có tài khoản khóa API nào trong nhóm này có thể ánh xạ",
                  )}
                </div>
              ) : (
                mappingMemberAccounts.map((account) => {
                  const presentation = buildCodexAccountPresentation(account, t);
                  const rows =
                    accountModelMappingDrafts[account.id] ??
                    mappingDraftsFromAccount(account);
                  return (
                    <div
                      key={account.id}
                      className="codex-api-service-mapping-account"
                    >
                      <div className="codex-api-service-mapping-account-head">
                        <strong title={presentation.displayName}>
                          {maskAccountText(presentation.displayName)}
                        </strong>
                        <div className="codex-api-service-head-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() =>
                              fillDeepSeekAccountModelMappings(account.id)
                            }
                            disabled={busy}
                          >
                            {t(
                              "codex.apiService.accountModelMappings.fillDeepSeek",
                              "Điền DeepSeek",
                            )}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => addAccountModelMappingRow(account.id)}
                            disabled={busy}
                          >
                            <Plus size={14} />
                            {t(
                              "codex.apiService.accountModelMappings.addRow",
                              "Thêm hàng",
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="codex-api-service-mapping-rows">
                        {rows.map((row, index) => (
                          <div
                            key={`${account.id}-${index}`}
                            className="codex-api-service-mapping-row"
                          >
                            <label>
                              <span>
                                {t(
                                  "codex.apiService.accountModelMappings.clientModel",
                                  "Yêu cầu",
                                )}
                              </span>
                              <input
                                value={row.clientModel}
                                onChange={(event) =>
                                  updateAccountModelMappingDraft(
                                    account.id,
                                    index,
                                    "clientModel",
                                    event.target.value,
                                  )
                                }
                                placeholder="gpt-5.6-sol"
                                disabled={busy}
                              />
                            </label>
                            <span className="codex-api-service-mapping-arrow">
                              →
                            </span>
                            <label>
                              <span>
                                {t(
                                  "codex.apiService.accountModelMappings.upstreamModel",
                                  "Gửi",
                                )}
                              </span>
                              <input
                                value={row.upstreamModel}
                                onChange={(event) =>
                                  updateAccountModelMappingDraft(
                                    account.id,
                                    index,
                                    "upstreamModel",
                                    event.target.value,
                                  )
                                }
                                placeholder="deepseek-v4-flash"
                                disabled={busy}
                              />
                            </label>
                            <label>
                              <span>
                                {t(
                                  "codex.api.modelCatalog.contextWindow",
                                  "上下文窗口",
                                )}
                              </span>
                              <input
                                value={row.contextWindow ?? ""}
                                onChange={(event) =>
                                  updateAccountModelMappingDraft(
                                    account.id,
                                    index,
                                    "contextWindow",
                                    event.target.value,
                                  )
                                }
                                placeholder={t(
                                  "codex.api.modelCatalog.contextWindowPlaceholder",
                                  "留空=默认",
                                )}
                                inputMode="numeric"
                                disabled={busy}
                              />
                            </label>
                            <button
                              type="button"
                              className="folder-icon-btn"
                              onClick={() =>
                                removeAccountModelMappingRow(account.id, index)
                              }
                              disabled={busy}
                              aria-label={t("common.delete", "Xóa")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseAccountModelMappings}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSaveAccountModelMappings()}
                disabled={busy || mappingMemberAccounts.length === 0}
              >
                <Check size={15} />
                {t("common.save", "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {pricingModalOpen && (
        <div
          className="modal-overlay codex-api-service-pricing-overlay"
          role="presentation"
        >
          <div
            className="modal codex-api-service-pricing-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-api-service-pricing-title"
          >
            <div className="modal-header">
              <div>
                <h2 id="codex-api-service-pricing-title">
                  {t("codex.apiService.models.pricingTitle", "Giá mô hình")}
                </h2>
                <p className="codex-api-service-pricing-desc">
                  {t(
                    "codex.apiService.models.pricingDesc",
                    "USD / 1M token, chỉ dùng thống kê cục bộ.",
                  )}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setPricingModalOpen(false)}
                aria-label={t("common.close", "Đóng")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body codex-api-service-pricing-body">
              {pricingError && (
                <div className="codex-api-service-message error">
                  <CircleAlert size={15} />
                  <span>{pricingError}</span>
                </div>
              )}
              {pricingRepriceProgress && (
                <div
                  className={`codex-api-service-pricing-reprice is-${pricingRepriceProgress.phase}`}
                >
                  <div className="codex-api-service-pricing-reprice-head">
                    <span>{pricingRepriceStatusText}</span>
                    <strong>{pricingRepricePercent}%</strong>
                  </div>
                  <div className="codex-api-service-reprice-track">
                    <div
                      className="codex-api-service-reprice-fill"
                      style={{ width: `${pricingRepricePercent}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="codex-api-service-pricing-table">
                <div className="codex-api-service-pricing-head">
                  <span>
                    {t("codex.apiService.models.pricingModel", "Mô hình")}
                  </span>
                  <span>
                    {t(
                      "codex.apiService.models.pricingLongThreshold",
                      "Ngưỡng ngữ cảnh dài (tokens)",
                    )}
                  </span>
                  <span className="codex-api-service-pricing-head-tier">
                    {t(
                      "codex.apiService.models.pricingStandard",
                      "Chuẩn",
                    )}
                    <span className="codex-api-service-pricing-head-fields">
                      <span>{t("codex.apiService.models.pricingInput", "Đầu vào")}</span>
                      <span>
                        {t("codex.apiService.models.pricingCache", "Đầu vào cache")}
                      </span>
                      <span>{t("codex.apiService.models.pricingOutput", "Đầu ra")}</span>
                    </span>
                  </span>
                  <span className="codex-api-service-pricing-head-tier">
                    {t(
                      "codex.apiService.models.pricingStandardLong",
                      "Chuẩn (dài)",
                    )}
                    <span className="codex-api-service-pricing-head-fields">
                      <span>{t("codex.apiService.models.pricingInput", "Đầu vào")}</span>
                      <span>
                        {t("codex.apiService.models.pricingCache", "Đầu vào cache")}
                      </span>
                      <span>{t("codex.apiService.models.pricingOutput", "Đầu ra")}</span>
                    </span>
                  </span>
                  <span className="codex-api-service-pricing-head-tier">
                    {t(
                      "codex.apiService.models.pricingPriority",
                      "Ưu tiên",
                    )}
                    <span className="codex-api-service-pricing-head-fields">
                      <span>{t("codex.apiService.models.pricingInput", "Đầu vào")}</span>
                      <span>
                        {t("codex.apiService.models.pricingCache", "Đầu vào cache")}
                      </span>
                      <span>{t("codex.apiService.models.pricingOutput", "Đầu ra")}</span>
                    </span>
                  </span>
                  <div className="codex-api-service-pricing-cell">
                    <span>
                      {t("codex.apiService.models.pricingSource", "Nguồn")}
                    </span>
                  </div>
                  <div className="codex-api-service-pricing-cell">
                    <span>
                      {t("codex.apiService.models.pricingActions", "Thao tác")}
                    </span>
                  </div>
                </div>
                <div className="codex-api-service-pricing-rows">
                  {pricingDrafts.map((draft) => (
                    <div
                      key={draft.modelId}
                      className="codex-api-service-pricing-row"
                    >
                      <strong>{draft.modelId}</strong>
                      <div className="codex-api-service-pricing-inputs compact">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={draft.longContextThresholdTokens}
                          placeholder={t(
                            "codex.apiService.models.pricingLongThreshold",
                            "Ngưỡng ngữ cảnh dài (tokens)",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingLongThreshold",
                            "Ngưỡng ngữ cảnh dài (tokens)",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "longContextThresholdTokens",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="codex-api-service-pricing-inputs">
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={draft.inputUsdPerMillion}
                          placeholder={t(
                            "codex.apiService.models.pricingOfficialMissing",
                            "-",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingInput",
                            "Đầu vào",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "inputUsdPerMillion",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={draft.cachedInputUsdPerMillion}
                          placeholder={t(
                            "codex.apiService.models.pricingOfficialMissing",
                            "-",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingCache",
                            "Đầu vào cache",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "cachedInputUsdPerMillion",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={draft.outputUsdPerMillion}
                          placeholder={t(
                            "codex.apiService.models.pricingOfficialMissing",
                            "-",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingOutput",
                            "Đầu ra",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "outputUsdPerMillion",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="codex-api-service-pricing-inputs">
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={draft.standardLongInputUsdPerMillion}
                          placeholder={t(
                            "codex.apiService.models.pricingOfficialMissing",
                            "-",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingStandardLongInput",
                            "Input chuẩn (dài)",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "standardLongInputUsdPerMillion",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={draft.standardLongCachedInputUsdPerMillion}
                          placeholder={t(
                            "codex.apiService.models.pricingOfficialMissing",
                            "-",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingStandardLongCache",
                            "Input cache chuẩn (dài)",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "standardLongCachedInputUsdPerMillion",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={draft.standardLongOutputUsdPerMillion}
                          placeholder={t(
                            "codex.apiService.models.pricingOfficialMissing",
                            "-",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingStandardLongOutput",
                            "Output chuẩn (dài)",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "standardLongOutputUsdPerMillion",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="codex-api-service-pricing-inputs">
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={draft.priorityInputUsdPerMillion}
                          placeholder={t(
                            "codex.apiService.models.pricingOfficialMissing",
                            "-",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingPriorityInput",
                            "Input ưu tiên",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "priorityInputUsdPerMillion",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={draft.priorityCachedInputUsdPerMillion}
                          placeholder={t(
                            "codex.apiService.models.pricingOfficialMissing",
                            "-",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingPriorityCache",
                            "Input cache ưu tiên",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "priorityCachedInputUsdPerMillion",
                              event.target.value,
                            )
                          }
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.000001"
                          value={draft.priorityOutputUsdPerMillion}
                          placeholder={t(
                            "codex.apiService.models.pricingOfficialMissing",
                            "-",
                          )}
                          aria-label={t(
                            "codex.apiService.models.pricingPriorityOutput",
                            "Output ưu tiên",
                          )}
                          onChange={(event) =>
                            updatePricingDraft(
                              draft.modelId,
                              "priorityOutputUsdPerMillion",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                      <div className="codex-api-service-pricing-cell">
                        <span
                          className={`codex-api-service-pill ${draft.custom ? "success" : "muted"}`}
                        >
                          {draft.custom
                            ? t(
                                "codex.apiService.models.pricingCustom",
                                "Tùy chỉnh",
                              )
                            : draft.hasPreset
                              ? t(
                                  "codex.apiService.models.pricingPreset",
                                  "Cài sẵn",
                                )
                              : t(
                                  "codex.apiService.models.pricingUnset",
                                  "Chưa đặt",
                                )}
                        </span>
                      </div>
                      <div className="codex-api-service-pricing-cell">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => resetPricingDraft(draft.modelId)}
                        >
                          {t("codex.apiService.models.pricingReset", "Đặt lại")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPricingModalOpen(false)}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSaveModelPricings()}
                disabled={busy || pricingRepriceActive}
              >
                <Check size={15} />
                {t("common.save", "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {testDialogOpen && (
        <div
          className="modal-overlay codex-local-access-test-dialog-overlay"
        >
          <div
            className="modal codex-local-access-test-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-api-service-test-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header codex-local-access-test-dialog-header">
              <div>
                <h3 id="codex-api-service-test-dialog-title">
                  <ShieldCheck size={18} />
                  <span>
                    {t("codex.localAccess.testDialogTitle", "Kiểm tra dịch vụ API")}
                  </span>
                </h3>
                <p>
                  {t(
                    "codex.localAccess.testDialogDesc",
                    "Bắt đầu cuộc trò chuyện thật kiểu playground qua dịch vụ API hiện tại để kiểm tra mô hình, định tuyến tài khoản và phản hồi upstream.",
                  )}
                </p>
              </div>
              <button
                className="modal-close codex-local-access-test-dialog-close"
                onClick={handleCloseTestDialog}
                disabled={testDialogRunning}
                aria-label={t("common.close")}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body codex-local-access-test-dialog-body">
              <div className="codex-local-access-test-chat-toolbar">
                <div className="codex-local-access-test-chat-model">
                  <span>{t("codex.localAccess.testChatModel", "Mô hình")}</span>
                  <SingleSelectDropdown
                    value={selectedModelId}
                    options={modelIds.map((modelId) => ({
                      value: modelId,
                      label: modelId,
                    }))}
                    onChange={setSelectedModelId}
                    disabled={modelIds.length === 0 || testDialogRunning}
                    ariaLabel={t("codex.localAccess.testChatModel", "Mô hình")}
                    placeholder={t(
                      "codex.localAccess.modelIdPlaceholder",
                      "Chọn ID mô hình",
                    )}
                    menuPlacement="down"
                    menuMaxHeight={240}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={clearTestChat}
                  disabled={testDialogRunning || testChatMessages.length === 0}
                >
                  {t("codex.localAccess.testChatClear", "Xóa chat")}
                </button>
              </div>

              <div
                className="codex-local-access-test-chat"
                ref={testChatScrollRef}
              >
                {testChatMessages.length === 0 ? (
                  <div className="codex-local-access-test-chat-empty">
                    {t(
                      "codex.localAccess.testChatEmpty",
                      "Gửi một tin nhắn để bắt đầu cuộc trò chuyện thật qua dịch vụ API hiện tại.",
                    )}
                  </div>
                ) : (
                  testChatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`codex-local-access-test-chat-message is-${message.role}${
                        message.failureTitle ? " is-error" : ""
                      }`}
                    >
                      <div className="codex-local-access-test-chat-bubble">
                        {message.failureTitle && (
                          <strong className="codex-local-access-test-chat-error-title">
                            {message.failureTitle}
                          </strong>
                        )}
                        <p>{message.content}</p>
                        {message.failureDetail && (
                          <span className="codex-local-access-test-chat-meta">
                            {message.failureDetail}
                          </span>
                        )}
                        {typeof message.latencyMs === "number" && (
                          <span className="codex-local-access-test-chat-meta">
                            {t("codex.localAccess.testChatLatency", {
                              latency: formatLatencyMs(message.latencyMs),
                              defaultValue: "Mất {{latency}}",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {testDialogRunning && (
                  <div className="codex-local-access-test-chat-message is-assistant">
                    <div className="codex-local-access-test-chat-bubble">
                      <span className="codex-local-access-test-chat-loading">
                        <RefreshCw size={14} className="loading-spinner" />
                        {t(
                          "codex.localAccess.testChatSending",
                          "Đang gọi API",
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {testDialogError && (
                <div
                  className="codex-local-access-inline-error"
                  aria-live="assertive"
                >
                  <CircleAlert size={14} />
                  <span>{testDialogError}</span>
                </div>
              )}
            </div>

            <div className="modal-footer codex-local-access-test-dialog-footer">
              <textarea
                className="codex-local-access-test-chat-input"
                value={testChatInput}
                onChange={(event) => setTestChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendTestChatMessage();
                  }
                }}
                disabled={testDialogRunning}
                rows={2}
                placeholder={t(
                  "codex.localAccess.testChatInputPlaceholder",
                  "Nhập tin nhắn thử, Enter để gửi",
                )}
              />
              <button
                className="btn btn-primary codex-local-access-test-chat-send"
                onClick={() => void handleSendTestChatMessage()}
                disabled={
                  testDialogRunning || !testChatInput.trim() || !selectedModelId
                }
              >
                <Send size={15} />
                {t("codex.localAccess.testChatSend", "Gửi")}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCloseTestDialog}
                disabled={testDialogRunning}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      <CodexAccountPoolHealthModal
        isOpen={healthModalOpen}
        accountIds={memberIds}
        accounts={accounts}
        accountHealth={state?.accountHealth ?? []}
        accountPoolHealth={state?.accountPoolHealth ?? []}
        recoverySuppressedAccountIds={
          state?.recoverySuppressedAccountIds ?? []
        }
        actionBusy={busy}
        maskAccountText={maskAccountText}
        onClose={() => setHealthModalOpen(false)}
        onRecover={(accountId) => handleRecoverAccounts([accountId])}
        onRecoverAll={handleRecoverAccounts}
        onReauthorize={(accountId) => {
          setHealthModalOpen(false);
          requestCodexOpenAddAccount({
            targetAccountId: accountId,
            tab: "tempLogin",
          });
        }}
      />

      <CodexLocalAccessModal
        isOpen={memberModalOpen}
        mode="members"
        state={state}
        addressKind={addressKind}
        addressOptions={[
          {
            value: "local",
            label: t("codex.localAccess.addressLocal", "Cục bộ"),
          },
          ...(state?.lanBaseUrl
            ? [
                {
                  value: "lan",
                  label: t("codex.localAccess.addressLan", "Mạng cục bộ"),
                },
              ]
            : []),
        ]}
        onAddressKindChange={(value) =>
          setAddressKind(normalizeAddressKind(value))
        }
        accounts={accounts}
        accountsLoaded={accountsLoaded}
        accountGroups={groups}
        memberView={memberView}
        onAddGrokMember={handleAddGrokMemberToApiService}
        initialSelectedIds={memberIds}
        maskAccountText={maskAccountText}
        onClose={() => setMemberModalOpen(false)}
        onSaveAccounts={async ({
          accountIds,
          restrictFreeAccounts,
          backupAccountIds,
          preferredAccountIds,
          sessionAffinity,
          sessionAffinityTtlMs,
          imageGenerationAccountPolicies,
        }) => {
          await handleSaveMembersFromModal(
            accountIds,
            restrictFreeAccounts,
            backupAccountIds,
            preferredAccountIds,
            imageGenerationAccountPolicies,
          );
          if (collection) {
            const next = await codexLocalAccessService.updateCodexLocalAccessRoutingOptions({
              sessionAffinity,
              sessionAffinityTtlMs,
              responsesWebsocketsEnabled: collection.responsesWebsocketsEnabled,
              maxRetryCredentials: collection.maxRetryCredentials,
              maxRetryIntervalMs: collection.maxRetryIntervalMs,
              disableCooling: collection.disableCooling,
              immediateSseResponse: collection.immediateSseResponse,
              maxConcurrentImageRequests: collection.maxConcurrentImageRequests,
              maxAccountConcurrency: collection.maxAccountConcurrency,
              accountConcurrencyWaitMs: collection.accountConcurrencyWaitMs,
            });
            setState(next);
          }
        }}
        onClearStats={() =>
          codexLocalAccessService.clearCodexLocalAccessStats().then(setState)
        }
        onRefreshStats={reloadState}
        onUpdatePort={(port) =>
          codexLocalAccessService
            .updateCodexLocalAccessPort(port)
            .then(setState)
        }
        onUpdateRoutingStrategy={(strategy) =>
          codexLocalAccessService
            .updateCodexLocalAccessRoutingStrategy(strategy)
            .then(setState)
        }
        onUpdateCustomRouting={(rules: CodexLocalAccessCustomRoutingRule[]) =>
          codexLocalAccessService
            .updateCodexLocalAccessCustomRouting(rules)
            .then(setState)
        }
        onUpdateAccessScope={(scope: CodexLocalAccessScope) =>
          codexLocalAccessService
            .updateCodexLocalAccessAccessScope(scope)
            .then(setState)
        }
        onUpdateDebugLogs={(debugLogs) =>
          codexLocalAccessService
            .updateCodexLocalAccessDebugLogs(debugLogs)
            .then(setState)
        }
        onUpdateImageGenerationModel={(model) =>
          codexLocalAccessService
            .updateCodexLocalAccessImageGenerationModel(model)
            .then(setState)
        }
        onUpdateImageGenerationMainModel={(model) =>
          codexLocalAccessService.updateCodexLocalAccessImageGenerationMainModel(model).then(setState)
        }
        onUpdateImageGenerationAccounts={(accountIds) =>
          codexLocalAccessService
            .updateCodexLocalAccessImageGenerationAccounts(accountIds)
            .then(setState)
        }
        onUpdateUpstreamProxyConfig={(url) =>
          codexLocalAccessService
            .updateCodexLocalAccessUpstreamProxyConfig(url)
            .then(setState)
        }
        onRotateApiKey={() =>
          codexLocalAccessService.rotateCodexLocalAccessApiKey().then(setState)
        }
        onRestartSidecar={handleRestartSidecar}
        onKillPort={handleKillPort}
        onToggleEnabled={() => handleToggleEnabled(true)}
        onRecoverAccounts={handleRecoverAccounts}
        healthActionBusy={busy}
        onStreamTestMessage={({ sessionId, modelId, messages }) =>
          codexLocalAccessService.streamCodexLocalAccessChatTest(
            sessionId,
            modelId,
            messages,
          )
        }
        saving={busy}
        testing={testDialogRunning}
        starting={false}
        portCleanupBusy={portKilling}
        sidecarRestarting={sidecarRestarting}
      />
    </div>
  );
}
