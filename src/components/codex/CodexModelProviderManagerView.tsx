import { ModalErrorMessage } from "../ModalErrorMessage";
import { Bird, ArrowDownWideNarrow, ArrowDown, ArrowUp, Check, CircleAlert, ChevronDown, Copy, Clock, Database, ExternalLink, GripVertical, HelpCircle, KeyRound, Link2, LayoutGrid, Pencil, Plus, Rows3, Star, Trash2, X, Search, Settings, Activity, RefreshCw, RotateCw, Play } from "lucide-react";
import { MultiSelectFilterDropdown } from "../MultiSelectFilterDropdown";
import { SingleSelectFilterDropdown } from "../SingleSelectFilterDropdown";
import { SingleSelectDropdown } from "../SingleSelectDropdown";
import { AccountTagFilterDropdown } from "../AccountTagFilterDropdown";
import { PaginationControls } from "../PaginationControls";
import { CodexModelContextWindowTable } from "./CodexModelContextWindowTable";
import { resolveNewApiQuotaSnapshot } from "../../services/modelProviderUsageService";
import { CODEX_API_PROVIDER_CUSTOM_ID, CODEX_API_PROVIDER_PRESETS, DEEPSEEK_API_PROVIDER_ID, resolveCodexApiProviderPresetId } from "../../utils/codexProviderPresets";
import { resolveCodexModelProviderForApiKey } from "../../utils/codexModelProviderKeyConfig";
import { normalizeApiKeyFunOfficialUrl } from "../../utils/apikeyFunLinks";
import { getCodexSubscriptionPresentation } from "../../types/codex";
import { canConfigureCodexProviderVision, resolveCodexProviderCapabilityProfile } from "../../utils/codexProviderGateway";
import { CodexQuickConfigCard } from "./CodexQuickConfigCard";
import {
  CodexServicePanelModal,
  type CodexServicePanelActionItem,
  type CodexServicePanelMetricItem,
} from "./CodexServicePanelModal";
import type {
  OAuthBindingSortBy,
  useCodexModelProviderManagerController,
} from "./CodexModelProviderManager";

export type CodexModelProviderManagerViewProps = ReturnType<typeof useCodexModelProviderManagerController>;

/** 渲染 CodexModelProviderManager 的界面；业务状态与动作统一由 Controller 提供。 */
export function CodexModelProviderManagerView(props: CodexModelProviderManagerViewProps) {
  const {
    apiKeyPickerProviderId,
    openProviderPelican,
    batchTestCancelling,
    batchTestDeleting,
    batchTestError,
    batchTestFilter,
    batchTestModalOpen,
    batchTestModelCustom,
    batchTestModelId,
    batchTestModelOptions,
    batchTestResultSelectedProviderIds,
    batchTestSearchQuery,
    batchTestSelectedCount,
    batchTestSelectedProviderIds,
    batchTestSession,
    batchTestStep,
    closeBatchTestModal,
    closeModal,
    currentEditingProvider,
    providerLaunchDialog,
    displayInstances,
    draggedProviderCustomSortId,
    editingApiKey,
    enablingProviderId,
    error,
    existingApiKeySearchQuery,
    filteredProviderBatchTestRecords,
    filteredProviderIds,
    filteredProviders,
    form,
    formatDateTime,
    formatDurationMs,
    formatProviderBatchTestErrorMessage,
    formatUsageDetailLabel,
    formatUsageDetailValue,
    formatUsageMoney,
    formatUsageQuotaValue,
    formError,
    getInstanceName,
    getProviderInstanceId,
    getSelectedProviderApiKey,
    handleBatchDeleteProviders,
    handleDeleteApiKey,
    handleDeleteBatchTestResults,
    handleDeleteProvider,
    handleEnableProvider,
    handleProviderCustomSortDragMove,
    handleProviderCustomSortDragStart,
    handleProviderInstanceChange,
    handleProviderOauthBindingChange,
    handleProviderSortByChange,
    handleRenameApiKey,
    handleSaveApiKeyEdit,
    handleSaveProvider,
    handleSelectPresetEndpoint,
    handleSelectProviderPreset,
    handleSelectSponsorTemplate,
    handleStartBatchProviderTest,
    handleTestProvider,
    instancePickerProviderId,
    isAllBatchTestProvidersSelected,
    isAllProvidersSelected,
    isCurrentProviderActive,
    isInstanceReady,
    isProviderCustomSortActive,
    isSponsorProvider,
    loading,
    maskAccountText,
    maskApiKey,
    moveProviderCustomSortProvider,
    mutateForm,
    notice,
    openBatchTestModal,
    openCreateModal,
    openEditModal,
    parseModelCatalogText,
    pickerSearchQuery,
    previewPaths,
    providerBatchTestCounts,
    providerBatchTestFilterOptions,
    providerBatchTestSelectableIds,
    providerBatchTestVisibleProviders,
    providerCustomSortDropTargetId,
    providerCustomSortProviders,
    providerDetailId,
    providerFilterOptions,
    providerNameFilter,
    providerOauthAccounts,
    providerOauthAvailableTags,
    providerOauthEligibleAccounts,
    providerOauthFilteredAccounts,
    providerOauthFilterTypes,
    providerOauthHasExistingBinding,
    providerOauthPagination,
    providerOauthSaving,
    providerOauthSearchQuery,
    providerOauthSelectedAccountId,
    providerOauthSortBy,
    providerOauthSortDirection,
    providerOauthTagFilter,
    providerOauthTarget,
    providerOauthTierCounts,
    providerOauthTierFilterOptions,
    providerReferenceMap,
    providers,
    providerSortBy,
    providerSortDirection,
    providerUsageMap,
    providerUsageRefreshingAll,
    providerViewMode,
    refreshAllProviderUsage,
    refreshProviderUsage,
    requestBatchTestCancellation,
    resetProviderCustomSortOrder,
    resolveBoundOAuthAccount,
    resolveEnableModePreferenceForWireApi,
    resolveInstanceById,
    resolvePresentation,
    resolveProviderApiKeyLabel,
    resolveProviderWireApi,
    saving,
    searchQuery,
    selectedPreset,
    selectedPresetId,
    selectedProviderApiKeyMap,
    selectedProviderIds,
    selectedProviderOauthAccount,
    selectedSponsorTemplate,
    selectedSponsorTemplateId,
    selectFailedBatchTestResults,
    setApiKeyPickerProviderId,
    setBatchTestFilter,
    setBatchTestModelCustom,
    setBatchTestModelId,
    setBatchTestSearchQuery,
    setBatchTestStep,
    setEditingApiKey,
    setExistingApiKeySearchQuery,
    setInstancePickerProviderId,
    setNotice,
    setPickerSearchQuery,
    setProviderDetailId,
    setProviderNameFilter,
    setProviderOauthFilterTypes,
    setProviderOauthPickerId,
    setProviderOauthSearchQuery,
    setProviderOauthSelectedAccountId,
    setProviderOauthSortBy,
    setProviderOauthSortDirection,
    setProviderOauthTagFilter,
    setProviderSortDirection,
    setProviderViewMode,
    setSearchQuery,
    setSelectedProviderApiKeyMap,
    setShowProviderCustomSortModal,
    setShowQuickConfigModal,
    showModal,
    showProviderCustomSortModal,
    showQuickConfigModal,
    sponsorProviderTemplates,
    stopProviderCustomSortDragging,
    t,
    testingProviderId,
    toggleAllVisibleBatchTestProviders,
    toggleAllVisibleBatchTestResults,
    toggleBatchTestProvider,
    toggleBatchTestResultProvider,
    toggleProviderOAuthFilterTypeValue,
    toggleProviderOAuthTagFilterValue,
    toggleProviderSelected,
    toggleSelectAllProviders,
  } = props;
  return (
    <div className="codex-provider-manager-page">
      {notice && (
        <div
          className={`message-bar ${notice.tone === "error" ? "error" : "success"}`}
        >
          {notice.text}
          <button
            onClick={() => setNotice(null)}
            aria-label={t("common.close", "Đóng")}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {showQuickConfigModal && (
        <CodexQuickConfigCard onClose={() => setShowQuickConfigModal(false)} />
      )}

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search className="search-icon" size={16} />
            <input
              type="text"
              placeholder={t("common.search", "Tìm kiếm...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="view-switcher">
            <button
              className={`view-btn ${providerViewMode === "compact" ? "active" : ""}`}
              onClick={() => setProviderViewMode("compact")}
              title={t("accounts.view.compact", "Chế độ thu gọn")}
            >
              <Rows3 size={16} />
            </button>
            <button
              className={`view-btn ${providerViewMode === "grid" ? "active" : ""}`}
              onClick={() => setProviderViewMode("grid")}
              title={t("common.shared.view.grid", "Dạng thẻ")}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <MultiSelectFilterDropdown
            options={providerFilterOptions}
            selectedValues={providerNameFilter}
            allLabel={t("common.shared.filter.all", {
              count: providers.length,
            })}
            filterLabel={t("common.shared.filterLabel", "Bộ lọc")}
            clearLabel={t("accounts.clearFilter", "Xóa bộ lọc")}
            emptyLabel={t("common.none", "None​")}
            ariaLabel={t("common.shared.filterLabel", "Bộ lọc")}
            onToggleValue={(value) =>
              setProviderNameFilter((previous) =>
                previous.includes(value)
                  ? previous.filter((item) => item !== value)
                  : [...previous, value],
              )
            }
            onClear={() => setProviderNameFilter([])}
          />
          <SingleSelectFilterDropdown
            value={providerSortBy}
            options={[
              {
                value: "name",
                label: t("common.shared.sort.name", "Theo tên"),
              },
              {
                value: "created_at",
                label: t("common.shared.sort.createdAt", "Thời gian tạo"),
              },
              {
                value: "custom",
                label: t("codex.modelProviders.sort.custom", "Thứ tự tùy chỉnh"),
              },
            ]}
            ariaLabel={t("common.shared.sortLabel", "Sắp xếp")}
            icon={<ArrowDownWideNarrow size={14} />}
            onChange={handleProviderSortByChange}
          />
          {!isProviderCustomSortActive && (
            <button
              className="sort-direction-btn"
              onClick={() =>
                setProviderSortDirection((previous) =>
                  previous === "asc" ? "desc" : "asc",
                )
              }
              title={t("common.shared.sort.toggleDirection", "Đổi hướng sắp xếp")}
            >
              {providerSortDirection === "desc" ? "⬇" : "⬆"}
            </button>
          )}
        </div>
        <div className="toolbar-right">
          <button
            className="btn btn-secondary icon-only"
            onClick={() => void refreshAllProviderUsage()}
            disabled={
              providerUsageRefreshingAll ||
              providers.every((provider) => !getSelectedProviderApiKey(provider))
            }
            title={t("common.shared.refreshQuota", "Làm mới hạn mức")}
          >
            <RefreshCw
              size={14}
              className={providerUsageRefreshingAll ? "loading-spinner" : undefined}
            />
          </button>
          <button
            className="btn btn-primary icon-only"
            onClick={openCreateModal}
            title={t("codex.modelProviders.add", "Thêm nhà cung cấp")}
          >
            <Plus size={14} />
          </button>
          <button
            className="btn btn-secondary icon-only"
            onClick={() => setShowQuickConfigModal(true)}
            title={t("codex.modelProviders.quickConfig.title", "Cấu hình Codex hiện tại")}
          >
            <Settings size={14} />
          </button>
          {selectedProviderIds.size > 0 && (
            <button
              className="btn btn-danger icon-only"
              onClick={() => void handleBatchDeleteProviders()}
              title={`${t("common.delete", "Xóa")} (${selectedProviderIds.size})`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="add-status error">
          <CircleAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {filteredProviderIds.length > 0 && (
        <div className="codex-overview-selection-bar">
          <div className="codex-overview-selection-left">
            <label className="codex-overview-select-all">
              <input
                type="checkbox"
                checked={isAllProvidersSelected}
                onChange={() => toggleSelectAllProviders(filteredProviderIds)}
              />
              <span>{t("common.selectAll", "Chọn tất cả")}</span>
            </label>
            {selectedProviderIds.size > 0 && (
              <span className="codex-overview-selected-count">
                {t("codex.modelProviders.batchTest.selectedCount", {
                  defaultValue: "Đã chọn {{count}}",
                  count: selectedProviderIds.size,
                })}
              </span>
            )}
          </div>
          <div className="codex-overview-selection-actions">
            <button type="button" className="btn btn-secondary" onClick={openProviderPelican}
              disabled={filteredProviders.every((provider) => !getSelectedProviderApiKey(provider))}>
              <Bird size={14} />{t("pelican.title")}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={openBatchTestModal}
              disabled={filteredProviders.every((provider) => !getSelectedProviderApiKey(provider))}
              title={t(
                "codex.modelProviders.batchTest.entryHint",
                "Kiểm tra hàng loạt năng lực chat thực của nhà cung cấp",
              )}
            >
              <Activity size={14} />
              {t("codex.modelProviders.batchTest.entry", "Kiểm tra tất cả")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="section-desc">{t("common.loading", "Đang tải...")}</div>
      ) : providers.length === 0 ? (
        <div className="empty-state">
          <h3>{t("codex.modelProviders.emptyTitle", "Chưa có nhà cung cấp mô hình")}</h3>
          <p>
            {t(
              "codex.modelProviders.emptyDesc",
              "Bấm \"Thêm nhà cung cấp\" ở góc trên bên phải để bắt đầu.",
            )}
          </p>
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="empty-state">
          <h3>{t("codex.modelProviders.noMatchTitle", "Không tìm thấy nhà cung cấp phù hợp")}</h3>
          <p>{t("common.shared.noMatch.desc", "Thử điều chỉnh tìm kiếm hoặc bộ lọc")}</p>
        </div>
      ) : (
        <div className={`codex-provider-grid ${providerViewMode === "compact" ? "compact" : ""}`}>
          {filteredProviders.map((provider) => {
            const presetId = resolveCodexApiProviderPresetId(provider.baseUrl);
            const capabilityProfile = resolveCodexProviderCapabilityProfile({
              presetId,
              baseUrl: provider.baseUrl,
              wireApi: provider.wireApi,
            });
            const primaryApiKey = getSelectedProviderApiKey(provider);
            const enabling = enablingProviderId === provider.id;
            const testing = testingProviderId === provider.id;
            const usageState = providerUsageMap[provider.id];
            const usageSummary = usageState?.summary;
            const usagePrimaryText = usageSummary
              ? formatUsageQuotaValue(
                  usageSummary,
                  usageSummary.quotaRemaining ??
                    usageSummary.remaining ??
                    usageSummary.balance,
                )
              : "-";
            const usageRequestText =
              usageSummary?.todayRequests != null
                ? String(usageSummary.todayRequests)
                : "-";
            const targetInstanceId = getProviderInstanceId(provider);
            const targetInstance = resolveInstanceById(targetInstanceId);
            const targetInstanceName = getInstanceName(targetInstance);
            const targetInstanceReady = isInstanceReady(targetInstance);
            const active = isCurrentProviderActive(provider, targetInstance);
            const sponsorProvider = isSponsorProvider(
              provider,
              sponsorProviderTemplates,
            );
            const selectedApiKeyLine = primaryApiKey
              ? `${t("codex.addModal.token", "API Key")}：${maskApiKey(
                  primaryApiKey.apiKey,
                )}`
              : `${t("codex.addModal.token", "API Key")}：${t(
                  "common.none",
                  "None​",
                )}`;
            const oauthBindingLine = `${t(
              "codex.api.oauthBinding.label",
              "Liên kết OAuth",
            )}：${
              resolveBoundOAuthAccount(provider)?.account_name ||
              resolveBoundOAuthAccount(provider)?.email ||
              resolveBoundOAuthAccount(provider)?.id ||
              t("codex.api.oauthBinding.unbound", "Chưa liên kết")
            }`;
            const providerLine = `${t("codex.api.provider.label", "Nhà cung cấp")}：${
              provider.name
            }`;
            const apiBaseUrlLine = `${t("codex.api.baseUrl", "Base URL")}：${
              provider.baseUrl
            }`;
            const usageMode =
              usageSummary?.mode === "new_api" ||
              usageSummary?.mode === "sub2api" ||
              usageSummary?.mode === "deepseek" ||
              usageSummary?.mode === "token_plan"
                ? usageSummary.mode
                : provider.integrationType ?? null;
            const deepSeekDetailValue = (key: string) => {
              const item = usageSummary?.details?.find((detail) => detail.key === key);
              return item ? formatUsageDetailValue(item, usageSummary?.unit) : "-";
            };
            const {
              granted: totalGranted,
              available: totalAvailable,
              expiresAt,
            } = resolveNewApiQuotaSnapshot(usageSummary);
            const tokenPlanResetDetail = usageSummary?.details?.find((detail) =>
              ["intervalExpiresAt", "weeklyExpiresAt", "expiresAt"].includes(
                detail.key,
              ),
            );
            const tokenPlanResetText = tokenPlanResetDetail
              ? formatUsageDetailValue(
                  tokenPlanResetDetail,
                  usageSummary?.unit,
                )
              : "-";
            const progressPercent =
              usageMode === "new_api" &&
              totalGranted != null &&
              totalAvailable != null &&
              totalGranted > 0
                ? Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        ((totalGranted - totalAvailable) / totalGranted) * 100,
                      ),
                    ),
                  )
                : usageSummary?.quotaUnlimited
                  ? 100
                  : 0;
            return (
              <div
                className={`codex-account-card codex-provider-card ${active ? "current" : ""} ${sponsorProvider ? "sponsor-api-account" : ""}`}
                key={provider.id}
              >
                <div className="card-top">
                  <div className="card-select">
                    <input
                      type="checkbox"
                      checked={selectedProviderIds.has(provider.id)}
                      onChange={() => toggleProviderSelected(provider.id)}
                    />
                  </div>
                  <span className="account-email" title={provider.name}>
                    {provider.name}
                  </span>
                </div>
                <div className="account-sub-line">
                  {provider.apiKeys.length > 0 && primaryApiKey ? (
                    <div className="codex-provider-inline-line codex-provider-api-key-line">
                      <div
                        className="codex-api-key-reveal-line codex-provider-api-key-trigger"
                        title={selectedApiKeyLine}
                      >
                        <span className="codex-login-subline">
                          {selectedApiKeyLine}
                        </span>
                        <button
                          type="button"
                          className="codex-provider-inline-icon-btn"
                          onClick={() => {
                            void navigator.clipboard.writeText(primaryApiKey.apiKey);
                            setNotice({
                              tone: "success",
                              text: t(
                                "codex.modelProviders.apiKeyCopied",
                                "Đã sao chép API Key",
                              ),
                            });
                          }}
                          title={t("common.copy", "Copy​")}
                        >
                          <Copy size={12} />
                        </button>
                        {provider.apiKeys.length > 1 && (
                          <button
                            type="button"
                            className="codex-provider-inline-dropdown-btn"
                            onClick={() => {
                              setPickerSearchQuery("");
                              setApiKeyPickerProviderId(provider.id);
                            }}
                            title={t("codex.modelProviders.existingApiKeys", "API Key hiện có")}
                          >
                            <ChevronDown size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span
                      className="codex-login-subline codex-provider-inline-text"
                      title={selectedApiKeyLine}
                    >
                      {selectedApiKeyLine}
                    </span>
                  )}
                </div>
                <div className="account-sub-line codex-provider-inline-line codex-oauth-binding-line">
                  <span
                    className="codex-login-subline codex-provider-inline-text"
                    title={oauthBindingLine}
                  >
                    {oauthBindingLine}
                  </span>
                  <button
                    type="button"
                    className="codex-provider-inline-switch codex-oauth-binding-action"
                    onClick={() => {
                      setPickerSearchQuery("");
                      setProviderOauthPickerId(provider.id);
                    }}
                    title={t("codex.api.oauthBinding.action", "Liên kết OAuth")}
                  >
                    <Link2 size={11} />
                    {resolveBoundOAuthAccount(provider)
                      ? t("common.detail", "Chi tiết")
                      : t("codex.api.oauthBinding.actionShort", "Liên kết")}
                  </button>
                </div>
                <div className="account-sub-line codex-provider-inline-line">
                  <span
                    className="codex-login-subline codex-provider-inline-text"
                    title={providerLine}
                  >
                    {providerLine}
                  </span>
                  <button
                    type="button"
                    className="codex-provider-inline-switch"
                    onClick={() => setProviderDetailId(provider.id)}
                    title={t("codex.quickSwitch.inlineAction", "Chuyển")}
                  >
                    {t("codex.quickSwitch.inlineAction", "Chuyển")}
                  </button>
                </div>
                <div className="account-sub-line">
                  <span className="codex-login-subline" title={apiBaseUrlLine}>
                    {apiBaseUrlLine}
                  </span>
                </div>
                <div className="codex-quota-section">
                  {usageMode === "deepseek" ? (
                    <div className="codex-api-key-usage-panel sub2api">
                      <div className="codex-api-key-usage-grid">
                        <div>
                          <span>{t("codex.modelProviders.usage.fields.totalBalance", "Tổng số dư")}</span>
                          <strong>{usagePrimaryText}</strong>
                        </div>
                        <div>
                          <span>{t("codex.modelProviders.usage.fields.grantedBalance", "Số dư tặng")}</span>
                          <strong>{deepSeekDetailValue("grantedBalance")}</strong>
                        </div>
                        <div>
                          <span>{t("codex.modelProviders.usage.fields.toppedUpBalance", "Số dư nạp")}</span>
                          <strong>{deepSeekDetailValue("toppedUpBalance")}</strong>
                        </div>
                      </div>
                    </div>
                  ) : usageMode === "token_plan" ? (
                    <div className="codex-api-key-usage-panel token-plan">
                      <div className="codex-api-key-usage-grid">
                        <div>
                          <span>
                            {t(
                              "codex.modelProviders.usage.fields.remaining",
                              "Remaining",
                            )}
                          </span>
                          <strong>{usagePrimaryText}</strong>
                        </div>
                        <div>
                          <span>
                            {t(
                              "codex.modelProviders.usage.fields.planName",
                              "Plan",
                            )}
                          </span>
                          <strong>{usageSummary?.planName || "-"}</strong>
                        </div>
                        <div>
                          <span>
                            {t(
                              "codex.modelProviders.usage.fields.expiresAt",
                              "Next Reset",
                            )}
                          </span>
                          <strong>{tokenPlanResetText}</strong>
                        </div>
                      </div>
                    </div>
                  ) : usageMode === "sub2api" ? (
                    <div className="codex-api-key-usage-panel sub2api">
                      <div className="codex-api-key-usage-grid">
                        <div>
                          <span>{t("codex.modelProviders.usage.accountBalance", "Số dư tài khoản")}</span>
                          <strong>{usagePrimaryText}</strong>
                        </div>
                        <div>
                          <span>{t("codex.modelProviders.usage.fields.todayRequests", "Yêu cầu hôm nay")}</span>
                          <strong>{usageRequestText}</strong>
                        </div>
                        <div>
                          <span>{t("codex.modelProviders.usage.fields.todayTokens", "Token hôm nay")}</span>
                          <strong>
                            {typeof usageSummary?.todayTotalTokens === "number"
                              ? usageSummary.todayTotalTokens.toLocaleString("en-US")
                              : "-"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  ) : usageMode === "new_api" ? (
                    <div className="codex-api-key-usage-panel">
                      <div
                        className="quota-item codex-api-key-quota-item new-api"
                        title={`${t("codex.cockpitApi.balance", "Số dư")}：${
                          usageSummary?.quotaUnlimited
                            ? t("codex.newApi.quota.unlimited", "Không giới hạn")
                            : totalAvailable != null && totalGranted != null
                              ? `${formatUsageMoney(totalAvailable, usageSummary?.unit)} / ${formatUsageMoney(totalGranted, usageSummary?.unit)}`
                              : totalAvailable != null
                                ? formatUsageMoney(totalAvailable, usageSummary?.unit)
                                : "-"
                        }`}
                      >
                        <div className="quota-header">
                          <Database size={14} />
                          <span className="quota-label">
                            {t("codex.cockpitApi.balance", "Số dư")}
                          </span>
                          <span className="quota-pct high">
                            {usageSummary?.quotaUnlimited
                              ? t("codex.newApi.quota.unlimited", "Không giới hạn")
                              : totalAvailable != null && totalGranted != null
                                ? `${formatUsageMoney(totalAvailable, usageSummary?.unit)} / ${formatUsageMoney(totalGranted, usageSummary?.unit)}`
                                : totalAvailable != null
                                  ? formatUsageMoney(totalAvailable, usageSummary?.unit)
                                : "-"}
                          </span>
                        </div>
                        <div className="quota-bar-track">
                          <div
                            className="quota-bar high"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className="quota-reset">
                          {expiresAt != null && expiresAt > 0
                            ? `${t("codex.modelProviders.usage.fields.expiresAt", "Hết hạn")} ${new Date(expiresAt * 1000).toLocaleDateString()}`
                            : t("dashboard.noData", "Không có dữ liệu")}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="codex-api-key-usage-panel empty">
                      {t("codex.modelProviders.usage.noKey", "Chưa có hạn mức để truy vấn")}
                    </div>
                  )}
                </div>
                <div className="codex-card-bottom">
                  <span className="card-date">
                    {new Date(provider.updatedAt || provider.createdAt).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="codex-speed-select codex-provider-instance-select codex-provider-instance-trigger"
                    onClick={() => {
                      setPickerSearchQuery("");
                      setInstancePickerProviderId(provider.id);
                    }}
                    title={targetInstanceName}
                  >
                    <span>{targetInstanceName}</span>
                    <ChevronDown size={12} />
                  </button>
                  <div className="card-footer">
                    <div className="card-actions">
                      <button
                        className="card-action-btn"
                        onClick={() => setProviderDetailId(provider.id)}
                        title={t("codex.modelProviders.usage.detailTitle", "Bảng dịch vụ")}
                      >
                        <Database size={14} />
                      </button>
                      <button
                        className="card-action-btn"
                        disabled={!primaryApiKey || usageState?.loading}
                        onClick={() =>
                          primaryApiKey &&
                          void refreshProviderUsage(provider, primaryApiKey)
                        }
                        title={t("common.shared.refreshQuota", "Làm mới hạn mức")}
                      >
                        <RefreshCw
                          size={14}
                          className={usageState?.loading ? "loading-spinner" : undefined}
                        />
                      </button>
                      <button
                        className="card-action-btn success"
                        disabled={!primaryApiKey || enabling || !targetInstanceReady}
                        title={
                          targetInstanceReady
                            ? t("codex.modelProviders.enableAndStart", "Chạy")
                            : t(
                                "codex.modelProviders.instance.uninitializedHint",
                                "Phiên bản đích chưa được khởi tạo. Hãy khởi chạy một lần từ trang đa phiên bản trước.",
                              )
                        }
                        onClick={() =>
                          primaryApiKey &&
                          void handleEnableProvider(
                            provider,
                            primaryApiKey,
                            targetInstanceId,
                            targetInstanceName,
                          )
                        }
                      >
                        {enabling ? (
                          <RefreshCw size={14} className="loading-spinner" />
                        ) : (
                          <Play size={14} />
                        )}
                      </button>
                      {capabilityProfile.wireApi === "chat_completions" && (
                        <button
                          className="card-action-btn"
                          disabled={!primaryApiKey || testing}
                          onClick={() =>
                            primaryApiKey &&
                            void handleTestProvider(
                              provider,
                              primaryApiKey,
                              capabilityProfile.wireApi,
                            )
                          }
                          title={t("codex.localAccess.testAction", "Kiểm tra")}
                        >
                          <Activity size={14} />
                        </button>
                      )}
                      <button
                        className="card-action-btn"
                        onClick={() => openEditModal(provider)}
                        title={t("instances.actions.edit", "Chỉnh sửa")}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="card-action-btn"
                        onClick={() => {
                          const targetUrl = normalizeApiKeyFunOfficialUrl(
                            provider.website ||
                            provider.apiKeyUrl ||
                            provider.baseUrl,
                          );
                          if (!targetUrl) return;
                          window.open(targetUrl, "_blank", "noopener,noreferrer");
                        }}
                        title={t("codex.modelProviders.website", "Trang web")}
                        disabled={!(provider.website || provider.apiKeyUrl || provider.baseUrl)}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        className="card-action-btn danger"
                        onClick={() => void handleDeleteProvider(provider)}
                        title={t("common.delete", "Xóa")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {batchTestModalOpen && (
        <div className="modal-overlay codex-provider-batch-test-overlay">
          <div
            className={`modal codex-wakeup-modal codex-provider-batch-test-modal ${
              batchTestStep === "results" ? "codex-wakeup-results-modal" : ""
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t("codex.modelProviders.batchTest.title", "Kiểm tra hàng loạt nhà cung cấp mô hình")}</h2>
              <button
                className="modal-close"
                onClick={closeBatchTestModal}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body codex-wakeup-modal-body codex-provider-batch-test-body">
              {batchTestError && (
                <div className="add-status error">
                  <CircleAlert size={16} />
                  <span>{batchTestError}</span>
                </div>
              )}

              {batchTestStep === "select" ? (
                <>
                  <div className="codex-provider-batch-test-copy">
                    <strong>
                      {t(
                        "codex.modelProviders.batchTest.selectTitle",
                        "Chọn nhà cung cấp để kiểm tra",
                      )}
                    </strong>
                    <span>
                      {t(
                        "codex.modelProviders.batchTest.selectDesc",
                        "Nhà cung cấp đã chọn được tạm nối vào gateway cục bộ để kiểm thử chat, rồi chuyển lên upstream theo giao thức của từng nhà cung cấp.",
                      )}
                    </span>
                  </div>
                  <div className="form-group codex-provider-batch-test-model">
                    <label>
                      {t(
                        "codex.modelProviders.batchTest.modelLabel",
                        "Mô hình kiểm tra",
                      )}
                    </label>
                    <SingleSelectDropdown
                      value={batchTestModelId}
                      options={batchTestModelOptions}
                      onChange={setBatchTestModelId}
                      ariaLabel={t(
                        "codex.modelProviders.batchTest.modelLabel",
                        "Mô hình kiểm tra",
                      )}
                      placeholder={t(
                        "codex.modelProviders.batchTest.modelAuto",
                        "Tự động (danh mục / phát hiện)",
                      )}
                    />
                    {batchTestModelId === "__custom__" && (
                      <input
                        className="form-input"
                        type="text"
                        value={batchTestModelCustom}
                        onChange={(event) =>
                          setBatchTestModelCustom(event.target.value)
                        }
                        placeholder={t(
                          "codex.modelProviders.batchTest.modelCustomPlaceholder",
                          "ID mô hình, vd. gpt-6.1-sol",
                        )}
                        style={{ marginTop: 8 }}
                      />
                    )}
                    <p className="codex-provider-batch-test-model-hint">
                      {t(
                        "codex.modelProviders.batchTest.modelHint",
                        "Tùy chọn: mô hình chung. Để trống sẽ tự chọn từ danh mục.",
                      )}
                    </p>
                  </div>
                  <div className="search-box codex-provider-batch-test-search">
                    <Search className="search-icon" size={16} />
                    <input
                      type="text"
                      placeholder={t("common.search", "Tìm kiếm...")}
                      value={batchTestSearchQuery}
                      onChange={(event) => setBatchTestSearchQuery(event.target.value)}
                    />
                  </div>
                  <div className="codex-wakeup-account-selection-bar">
                    <label className="codex-overview-select-all">
                      <input
                        type="checkbox"
                        checked={isAllBatchTestProvidersSelected}
                        onChange={toggleAllVisibleBatchTestProviders}
                        disabled={providerBatchTestSelectableIds.length === 0}
                      />
                      <span>{t("common.selectAll", "Chọn tất cả")}</span>
                    </label>
                    <span className="codex-wakeup-account-selection-summary">
                      {t("codex.modelProviders.batchTest.selectionSummary", {
                        defaultValue: "Đã chọn {{selected}} / có thể kiểm tra {{total}}",
                        selected: batchTestSelectedCount,
                        total: providerBatchTestSelectableIds.length,
                      })}
                    </span>
                  </div>
                  <div className="codex-provider-batch-test-list">
                    {providerBatchTestVisibleProviders.map((provider) => {
                      const apiKey = getSelectedProviderApiKey(provider);
                      const wireApi = resolveProviderWireApi(provider);
                      const selected = batchTestSelectedProviderIds.has(provider.id);
                      const disabled = !apiKey;
                      return (
                        <label
                          key={provider.id}
                          className={`codex-provider-batch-test-row ${
                            selected ? "selected" : ""
                          } ${disabled ? "disabled" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggleBatchTestProvider(provider.id)}
                          />
                          <div className="codex-provider-batch-test-row-copy">
                            <strong>{provider.name}</strong>
                            <span>{provider.baseUrl}</span>
                            <div className="codex-provider-batch-test-row-meta">
                              <span>
                                {apiKey
                                  ? resolveProviderApiKeyLabel(
                                      apiKey,
                                      provider.name,
                                      t("codex.modelProviders.unnamedKey", "Key chưa có tên"),
                                    )
                                  : t(
                                      "codex.modelProviders.batchTest.noApiKey",
                                      "Không có API Key",
                                    )}
                              </span>
                              <span>
                                {wireApi === "chat_completions"
                                  ? t(
                                      "codex.modelProviders.batchTest.gatewayProtocol",
                                      "Chat Completions · gateway",
                                    )
                                  : t(
                                      "codex.modelProviders.batchTest.directProtocol",
                                      "Responses · gateway",
                                    )}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                    {providerBatchTestVisibleProviders.length === 0 && (
                      <p className="wakeup-hint">{t("common.none", "None​")}</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {batchTestSession && (
                    <>
                      <section className="codex-wakeup-results-summary-bar">
                        <div className="codex-wakeup-results-summary-copy">
                          <div className="codex-wakeup-results-summary-head">
                            <span className="codex-wakeup-results-kicker">
                              {t("codex.modelProviders.batchTest.kicker", "PROVIDER TEST")}
                            </span>
                            <h3>
                              {t(
                                "codex.modelProviders.batchTest.resultsTitle",
                                "Kết quả kiểm tra chat nhà cung cấp",
                              )}
                            </h3>
                          </div>
                          <div className="codex-wakeup-results-summary-meta">
                            <span>
                              {batchTestSession.cancelled
                                ? t("common.cancelled", "Đã hủy")
                                : batchTestSession.running
                                ? t(
                                    "codex.modelProviders.batchTest.status.running",
                                    "Đang chạy",
                                  )
                                : t(
                                    "codex.modelProviders.batchTest.status.completed",
                                    "Hoàn tất",
                                  )}
                            </span>
                            <span>
                              {t("codex.modelProviders.batchTest.totalCount", {
                                defaultValue: "{{count}} nhà cung cấp",
                                count: batchTestSession.total,
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="codex-wakeup-results-summary-progress">
                          <strong>
                            {batchTestSession.completed}/{batchTestSession.total}
                          </strong>
                          <span>
                            {batchTestSession.cancelled
                              ? t("common.cancelled", "Đã hủy")
                              : batchTestSession.running
                              ? t(
                                  "codex.modelProviders.batchTest.status.running",
                                  "Đang chạy",
                                )
                              : t(
                                  "codex.modelProviders.batchTest.status.completed",
                                  "Hoàn tất",
                                )}
                          </span>
                        </div>
                      </section>

                      <section className="codex-wakeup-results-progress-strip">
                        <div className="codex-wakeup-results-progress-head">
                          <span>
                            {t(
                              "codex.modelProviders.batchTest.progress",
                              "Tiến độ kiểm tra",
                            )}
                          </span>
                          <strong>
                            {batchTestSession.completed}/{batchTestSession.total}
                          </strong>
                        </div>
                        <div className="codex-wakeup-results-progress-track">
                          <div
                            className="codex-wakeup-results-progress-fill"
                            style={{
                              width: `${
                                batchTestSession.total > 0
                                  ? (batchTestSession.completed /
                                      batchTestSession.total) *
                                    100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </section>

                      <div className="codex-wakeup-results-filter-bar">
                        {providerBatchTestFilterOptions.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            className={`codex-wakeup-results-filter-chip ${
                              batchTestFilter === option.key ? "active" : ""
                            } tone-${option.tone}`}
                            onClick={() => setBatchTestFilter(option.key)}
                          >
                            <span>{option.label}</span>
                            <strong>{option.count}</strong>
                          </button>
                        ))}
                      </div>

                      <div className="codex-provider-batch-test-result-toolbar">
                        <label className="codex-overview-select-all">
                          <input
                            type="checkbox"
                            checked={
                              filteredProviderBatchTestRecords.length > 0 &&
                              filteredProviderBatchTestRecords.every((record) =>
                                batchTestResultSelectedProviderIds.has(record.providerId),
                              )
                            }
                            onChange={toggleAllVisibleBatchTestResults}
                            disabled={filteredProviderBatchTestRecords.length === 0}
                          />
                          <span>
                            {t("codex.modelProviders.batchTest.selectVisible", "Chọn mục đang hiển thị")}
                          </span>
                        </label>
                        <div className="codex-provider-batch-test-result-actions">
                          <span className="codex-overview-selected-count">
                            {t("codex.modelProviders.batchTest.resultSelectedCount", {
                              defaultValue: "Đã chọn {{count}}",
                              count: batchTestResultSelectedProviderIds.size,
                            })}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={selectFailedBatchTestResults}
                            disabled={providerBatchTestCounts.error === 0}
                          >
                            {t("codex.modelProviders.batchTest.selectFailed", "Chọn lỗi")}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => void handleDeleteBatchTestResults()}
                            disabled={
                              batchTestResultSelectedProviderIds.size === 0 ||
                              batchTestSession.running ||
                              batchTestDeleting
                            }
                          >
                            {batchTestDeleting ? (
                              <RefreshCw size={14} className="loading-spinner" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            {t("common.delete", "Xóa")}
                          </button>
                        </div>
                      </div>

                      <div className="codex-wakeup-results-list">
                        {filteredProviderBatchTestRecords.map((record) => {
                          const selected = batchTestResultSelectedProviderIds.has(
                            record.providerId,
                          );
                          const recordMessage =
                            record.status === "pending"
                              ? t(
                                  "codex.modelProviders.batchTest.pendingDesc",
                                  "Đang chờ bắt đầu.",
                                )
                              : record.status === "running"
                                ? t(
                                    "codex.modelProviders.batchTest.runningDesc",
                                    "Đang gửi yêu cầu chat.",
                                  )
                              : record.status === "cancelled"
                                ? t("common.cancelled", "Đã hủy")
                              : record.status === "success"
                                  ? record.reply ||
                                    t(
                                      "codex.modelProviders.batchTest.noReply",
                                      "Upstream không trả về phản hồi đọc được.",
                                    )
                                  : formatProviderBatchTestErrorMessage(
                                      record.error,
                                    );
                          const statusLabel =
                            record.status === "success"
                              ? t(
                                  "codex.modelProviders.batchTest.status.success",
                                  "Thành công",
                                )
                              : record.status === "error"
                                ? t(
                                    "codex.modelProviders.batchTest.status.error",
                                    "Thất bại",
                                  )
                              : record.status === "cancelled"
                                ? t("common.cancelled", "Đã hủy")
                              : record.status === "running"
                                  ? t(
                                      "codex.modelProviders.batchTest.status.running",
                                      "Đang chạy",
                                    )
                                  : t(
                                      "codex.modelProviders.batchTest.status.pending",
                                      "Đang chờ",
                                    );
                          return (
                            <article
                              key={record.providerId}
                              className={`codex-wakeup-execution-row codex-provider-batch-test-result-row is-${record.status}`}
                            >
                              <div className="codex-wakeup-execution-row-head">
                                <div className="codex-provider-batch-test-result-title">
                                  <label className="codex-provider-batch-test-result-check">
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      onChange={() =>
                                        toggleBatchTestResultProvider(record.providerId)
                                      }
                                      disabled={record.status === "running"}
                                    />
                                  </label>
                                  <div>
                                    <h4 className="codex-wakeup-execution-row-title">
                                      {record.providerName}
                                    </h4>
                                    <span className="codex-wakeup-execution-row-subtitle">
                                      {record.apiKeyName ||
                                        t(
                                          "codex.modelProviders.unnamedKey",
                                          "Key chưa có tên",
                                        )}
                                    </span>
                                  </div>
                                </div>
                                <span className={`codex-wakeup-execution-badge is-${record.status}`}>
                                  {record.status === "running" && (
                                    <RefreshCw size={14} className="loading-spinner" />
                                  )}
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="codex-wakeup-execution-row-prompt">
                                {t("codex.modelProviders.batchTest.protocolSummary", {
                                  defaultValue:
                                    "{{protocol}} · {{mode}} · {{model}}",
                                  protocol:
                                    record.wireApi === "chat_completions"
                                      ? t(
                                          "codex.modelProviders.wireApi.chatCompletions",
                                          "Chat Completions",
                                        )
                                      : t(
                                          "codex.modelProviders.wireApi.responses",
                                          "Responses gốc",
                                        ),
                                  mode:
                                    record.accessMode === "gateway"
                                      ? t(
                                          "codex.modelProviders.enableMode.gatewayMode",
                                          "Chế độ gateway",
                                        )
                                      : t(
                                          "codex.modelProviders.enableMode.directMode",
                                          "Chế độ trực tiếp",
                                        ),
                                  model:
                                    record.modelId ||
                                    t(
                                      "codex.modelProviders.batchTest.modelUnknown",
                                      "Mô hình đang chờ",
                                    ),
                                })}
                              </div>
                              {record.prompt && (
                                <div className="codex-wakeup-execution-row-prompt">
                                  {t("codex.modelProviders.batchTest.promptLabel", "Lời nhắc")}：
                                  {record.prompt}
                                </div>
                              )}
                              <p
                                className="codex-wakeup-execution-row-message"
                                title={
                                  record.status === "error" && record.error
                                    ? record.error
                                    : undefined
                                }
                              >
                                {recordMessage}
                              </p>
                              <div className="codex-wakeup-execution-row-meta">
                                <span>{formatDateTime(record.timestamp)}</span>
                                <span>{formatDurationMs(record.durationMs)}</span>
                              </div>
                            </article>
                          );
                        })}
                        {filteredProviderBatchTestRecords.length === 0 && (
                          <p className="wakeup-hint">{t("common.none", "None​")}</p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              {batchTestStep === "results" && !batchTestSession?.running && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBatchTestStep("select")}
                  disabled={batchTestDeleting}
                >
                  {t("common.back", "Quay lại")}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeBatchTestModal}
              >
                {t("common.close", "Đóng")}
              </button>
              {batchTestStep === "results" && batchTestSession?.running && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    void requestBatchTestCancellation(batchTestSession.runId)
                  }
                  disabled={batchTestCancelling}
                >
                  {batchTestCancelling && (
                    <RefreshCw size={14} className="loading-spinner" />
                  )}
                  {batchTestCancelling
                    ? t("common.cancelling", "Đang hủy...")
                    : t("common.cancel", "Hủy")}
                </button>
              )}
              {batchTestStep === "select" && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleStartBatchProviderTest()}
                  disabled={batchTestSelectedCount === 0}
                >
                  <Activity size={14} />
                  {t("codex.modelProviders.batchTest.start", "Bắt đầu kiểm tra")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showProviderCustomSortModal && (
        <div className="modal-overlay">
          <div
            className="modal codex-custom-sort-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>
                  {t(
                    "codex.modelProviders.sort.customModalTitle",
                    "Sắp xếp nhà cung cấp tùy chỉnh",
                  )}
                </h2>
                <p className="codex-custom-sort-modal-desc">
                  {t(
                    "codex.modelProviders.sort.customModalDesc",
                    "Kéo nhà cung cấp hoặc dùng nút lên/xuống để chỉnh thứ tự hiển thị.",
                  )}
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowProviderCustomSortModal(false)}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div
                className={`codex-custom-sort-list ${
                  draggedProviderCustomSortId ? "is-sorting" : ""
                }`}
                onMouseUp={stopProviderCustomSortDragging}
                onMouseLeave={stopProviderCustomSortDragging}
              >
                {providerCustomSortProviders.map((provider, index) => {
                  const wireApi = resolveProviderWireApi(provider);
                  const rowClass = [
                    "codex-custom-sort-row",
                    draggedProviderCustomSortId === provider.id
                      ? "is-dragging"
                      : "",
                    draggedProviderCustomSortId &&
                    draggedProviderCustomSortId !== provider.id
                      ? "is-drop-candidate"
                      : "",
                    draggedProviderCustomSortId &&
                    draggedProviderCustomSortId !== provider.id &&
                    providerCustomSortDropTargetId === provider.id
                      ? "is-drop-target"
                      : "",
                  ]
                    .join(" ")
                    .trim();

                  return (
                    <div
                      key={provider.id}
                      className={rowClass}
                      onMouseEnter={() =>
                        handleProviderCustomSortDragMove(provider.id)
                      }
                    >
                      <div className="codex-custom-sort-row-main">
                        <button
                          type="button"
                          className="codex-custom-sort-drag-handle"
                          onMouseDown={(event) =>
                            handleProviderCustomSortDragStart(
                              event,
                              provider.id,
                            )
                          }
                          title={t(
                            "codex.modelProviders.sort.customDragHandle",
                            "Kéo để sắp xếp",
                          )}
                          aria-label={t(
                            "codex.modelProviders.sort.customDragHandle",
                            "Kéo để sắp xếp",
                          )}
                        >
                          <GripVertical size={16} />
                        </button>
                        <span className="codex-custom-sort-index">
                          {index + 1}
                        </span>
                        <div className="codex-custom-sort-account">
                          <div className="codex-custom-sort-account-title">
                            <span title={provider.name}>{provider.name}</span>
                            <span className="mini-tag">
                              {wireApi === "chat_completions"
                                ? t(
                                    "codex.modelProviders.batchTest.gatewayProtocol",
                                    "Chat Completions · gateway",
                                  )
                                : t(
                                    "codex.modelProviders.batchTest.directProtocol",
                                    "Responses · gateway",
                                  )}
                            </span>
                          </div>
                          <div className="codex-custom-sort-quota-line codex-custom-sort-provider-meta">
                            <span title={provider.baseUrl}>
                              {provider.baseUrl}
                            </span>
                            <span>
                              {t("codex.modelProviders.apiKeysCount", {
                                defaultValue: "{{count}} API Key",
                                count: provider.apiKeys.length,
                              })}
                            </span>
                            <span>
                              {t("codex.modelProviders.referencesCount", {
                                defaultValue: "{{count}} tài khoản đã liên kết",
                                count: providerReferenceMap.get(provider.id) ?? 0,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="codex-custom-sort-row-actions">
                        <button
                          type="button"
                          className="folder-icon-btn"
                          onClick={() =>
                            moveProviderCustomSortProvider(provider.id, "up")
                          }
                          disabled={index === 0}
                          title={t(
                            "codex.modelProviders.sort.customMoveUp",
                            "Chuyển lên",
                          )}
                          aria-label={t(
                            "codex.modelProviders.sort.customMoveUp",
                            "Chuyển lên",
                          )}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="folder-icon-btn"
                          onClick={() =>
                            moveProviderCustomSortProvider(provider.id, "down")
                          }
                          disabled={
                            index === providerCustomSortProviders.length - 1
                          }
                          title={t(
                            "codex.modelProviders.sort.customMoveDown",
                            "Chuyển xuống",
                          )}
                          aria-label={t(
                            "codex.modelProviders.sort.customMoveDown",
                            "Chuyển xuống",
                          )}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {providerCustomSortProviders.length === 0 && (
                  <p className="wakeup-hint">{t("common.none", "None​")}</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={resetProviderCustomSortOrder}
              >
                <RotateCw size={14} />
                {t(
                  "codex.modelProviders.sort.customReset",
                  "Đặt lại thứ tự",
                )}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowProviderCustomSortModal(false)}
              >
                {t("common.confirm", "Xác nhận")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div
            className="modal codex-provider-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {form.providerId
                  ? t("codex.modelProviders.editTitle", "Chỉnh sửa nhà cung cấp mô hình")
                  : t("codex.modelProviders.createTitle", "Thêm nhà cung cấp mô hình")}
              </h2>
              <button
                className="modal-close"
                onClick={closeModal}
                aria-label={t("common.close", "Đóng")}
                disabled={saving}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t("codex.api.provider.label", "Nhà cung cấp")}</label>
                <div className="api-provider-chip-list">
                  <button
                    className={`api-provider-chip ${selectedPresetId === CODEX_API_PROVIDER_CUSTOM_ID && !selectedSponsorTemplateId ? "active" : ""}`}
                    onClick={() =>
                      handleSelectProviderPreset(CODEX_API_PROVIDER_CUSTOM_ID)
                    }
                    type="button"
                    disabled={saving}
                  >
                    <span>{t("codex.api.provider.custom", "Tùy chỉnh")}</span>
                  </button>
                  {sponsorProviderTemplates.map((template) => (
                    <button
                      key={template.id}
                      className={`api-provider-chip sponsor ${selectedSponsorTemplateId === template.id ? "active" : ""}`}
                      onClick={() => handleSelectSponsorTemplate(template)}
                      type="button"
                      disabled={saving}
                    >
                      <span>{template.name}</span>
                      <Star size={12} className="api-provider-chip-badge" />
                    </button>
                  ))}
                  {CODEX_API_PROVIDER_PRESETS.filter(
                    (preset) => !preset.isService,
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      className={`api-provider-chip ${selectedPresetId === preset.id ? "active" : ""}`}
                      onClick={() => handleSelectProviderPreset(preset.id)}
                      type="button"
                      disabled={saving}
                    >
                      <span>
                        {t(
                          `codex.api.providers.${preset.id}.name`,
                          preset.name,
                        )}
                      </span>
                      {preset.isPartner && (
                        <Star size={12} className="api-provider-chip-badge" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              {selectedPreset && selectedPreset.baseUrls.length > 1 && (
                <div className="form-group">
                  <label>
                    {t("codex.api.provider.endpoint", "Điểm cuối nhà cung cấp")}
                  </label>
                  <div className="api-provider-endpoint-list">
                    {selectedPreset.baseUrls.map((baseUrl) => (
                      <button
                        key={baseUrl}
                        className={`api-provider-endpoint-chip ${form.baseUrl === baseUrl ? "active" : ""}`}
                        onClick={() => handleSelectPresetEndpoint(baseUrl)}
                        type="button"
                        disabled={saving}
                      >
                        {baseUrl}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedPreset && (
                <div className="api-provider-hint-block">
                  <p className="api-provider-hint">
                    {t(
                      "codex.api.provider.hint",
                      "Base URL tương thích đã được điền tự động. Bạn vẫn có thể chỉnh sửa thủ công.",
                    )}
                  </p>
                  <div className="api-provider-links">
                    {selectedPreset.website && (
                      <a
                        className="btn btn-secondary"
                        href={selectedPreset.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={14} />
                        {t("codex.api.provider.website", "Trang web")}
                      </a>
                    )}
                    {selectedPreset.apiKeyUrl && (
                      <a
                        className="btn btn-secondary"
                        href={selectedPreset.apiKeyUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <KeyRound size={14} />
                        {t("codex.api.provider.apiKeyPage", "Trang API Key")}
                      </a>
                    )}
                  </div>
                </div>
              )}
              {selectedSponsorTemplate && (
                <div className="api-provider-hint-block sponsor">
                  <p className="api-provider-hint">
                    {t(
                      "codex.modelProviders.sponsorHint",
                      "URL dịch vụ trạm chuyển riêng đã được điền. Sau khi nhập API Key, thẻ sẽ tự động truy vấn số dư và mức dùng.",
                    )}
                  </p>
                  <div className="api-provider-links">
                    {selectedSponsorTemplate.website && (
                      <a
                        className="btn btn-secondary"
                        href={selectedSponsorTemplate.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={14} />
                        {t("codex.api.provider.website", "Trang web")}
                      </a>
                    )}
                    {selectedSponsorTemplate.apiKeyUrl && (
                      <a
                        className="btn btn-secondary"
                        href={selectedSponsorTemplate.apiKeyUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <KeyRound size={14} />
                        {t("codex.api.provider.apiKeyPage", "Trang API Key")}
                      </a>
                    )}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>
                  {t("codex.modelProviders.fields.name", "Tên nhà cung cấp")}
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={form.name}
                  onChange={(event) => mutateForm({ name: event.target.value })}
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label>
                  {t("codex.modelProviders.fields.baseUrl", "Base URL")}
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={form.baseUrl}
                  onChange={(event) =>
                    mutateForm({ baseUrl: event.target.value })
                  }
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="codex-provider-label-with-help">
                  <span>{t("codex.modelProviders.fields.wireApi", "Giao thức")}</span>
                  <span
                    className="codex-provider-inline-help"
                    title={t(
                      "codex.modelProviders.wireApi.help",
                      "Hãy dùng Responses cho hầu hết nhà cung cấp. Chỉ chuyển sang Chat Completions khi nhà cung cấp nói rõ chỉ hỗ trợ giao thức đó. Nếu chưa chắc, hãy chọn Responses trước.",
                    )}
                    aria-label={t(
                      "codex.modelProviders.wireApi.helpAria",
                      "Xem trợ giúp giao thức",
                    )}
                  >
                    <HelpCircle size={14} />
                  </span>
                </label>
                <div className="api-provider-chip-list">
                  <button
                    type="button"
                    className={`api-provider-chip ${form.wireApi === "responses" ? "active" : ""}`}
                    onClick={() =>
                      mutateForm({
                        wireApi: "responses",
                        enableModePreference:
                          resolveEnableModePreferenceForWireApi(
                            "responses",
                            selectedPresetId,
                          ),
                      })
                    }
                    disabled={saving}
                  >
                    <span>
                      {t("codex.modelProviders.wireApi.responses", "Responses gốc")}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`api-provider-chip ${form.wireApi === "chat_completions" ? "active" : ""}`}
                    onClick={() =>
                      mutateForm({
                        wireApi: "chat_completions",
                        supportsWebsockets: false,
                        enableModePreference:
                          resolveEnableModePreferenceForWireApi(
                            "chat_completions",
                            selectedPresetId,
                          ),
                      })
                    }
                    disabled={saving}
                  >
                    <span>
                      {t(
                        "codex.modelProviders.wireApi.chatCompletions",
                        "Giao thức Chat Completions",
                      )}
                    </span>
                  </button>
                </div>
                {selectedPresetId === DEEPSEEK_API_PROVIDER_ID && (
                  <p className="api-provider-hint">
                    {form.wireApi === "responses"
                      ? t(
                          "codex.modelProviders.wireApi.deepseekResponsesHint",
                          "Khởi động DeepSeek để chọn cổng kết nối hoặc kết nối trực tiếp chính thức, sau đó chọn Flash hoặc Pro. Cổng kết nối liệt kê mô hình trong Codex; kết nối trực tiếp bỏ qua cổng.",
                        )
                      : t(
                          "codex.modelProviders.wireApi.deepseekChatHint",
                          "DeepSeek Chat Completions dùng cầu cổng cục bộ cho các đường dẫn cũ. Chọn Responses khi bạn cần hành vi công cụ chính thức của Codex.",
                        )}
                  </p>
                )}
              </div>
              {/* DeepSeek 官方 Responses 强制直连、不支持 WebSocket：不展示该开关。 */}
              {form.wireApi === "responses" &&
                selectedPresetId !== DEEPSEEK_API_PROVIDER_ID && (
                <div className="form-group">
                  <label>
                    {t(
                      "codex.modelProviders.fields.supportsWebsockets",
                      "Truyền tải WebSocket",
                    )}
                  </label>
                  <label className="provider-vision-toggle">
                    <span className="provider-vision-toggle-copy">
                      <span className="provider-vision-toggle-title">
                        {t(
                          "codex.modelProviders.websockets.title",
                          "Cho phép Codex dùng Responses qua WebSocket",
                        )}
                      </span>
                      <span className="provider-vision-toggle-desc">
                        {t(
                          "codex.modelProviders.websockets.help",
                          "Chỉ bật khi nhà cung cấp hỗ trợ rõ ràng Responses qua WebSocket; hãy xác nhận phương thức truyền trong nhật ký Codex hoặc dịch vụ proxy.",
                        )}
                      </span>
                    </span>
                    <span className="provider-vision-switch">
                      <input
                        type="checkbox"
                        checked={form.supportsWebsockets}
                        onChange={(event) =>
                          mutateForm({ supportsWebsockets: event.target.checked })
                        }
                        disabled={
                          saving ||
                          selectedPresetId === "openai_official" ||
                          selectedPresetId === DEEPSEEK_API_PROVIDER_ID
                        }
                      />
                      <span className="provider-vision-switch-track" />
                    </span>
                  </label>
                </div>
              )}
              {(canConfigureCodexProviderVision({ presetId: selectedPresetId, wireApi: form.wireApi }) ||
                selectedPresetId === DEEPSEEK_API_PROVIDER_ID) && (
                <>
                  <div className="form-group">
                    <label>
                      {t("codex.modelProviders.fields.modelCatalog", "Danh mục mô hình")}
                    </label>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={form.modelCatalogText}
                      onChange={(event) =>
                        mutateForm({ modelCatalogText: event.target.value })
                      }
                      placeholder={"deepseek-flash\ndeepseek-v4-pro"}
                      disabled={saving}
                    />
                    <CodexModelContextWindowTable
                      models={parseModelCatalogText(form.modelCatalogText)}
                      drafts={form.modelContextWindowsDraft}
                      showContextWindow={false}
                      onChange={(model, value) =>
                        mutateForm({
                          modelContextWindowsDraft: {
                            ...form.modelContextWindowsDraft,
                            [model]: value,
                          },
                        })
                      }
                      visionStates={form.visionModelStates}
                      visionDefault={form.supportsVision}
                      onVisionChange={(model, value) =>
                        mutateForm({
                          visionModelStates: {
                            ...form.visionModelStates,
                            [model]: value,
                          },
                        })
                      }
                      disabled={saving}
                    />
                  </div>
                  {/* DeepSeek Responses 只保留逐模型能力；其他第三方协议均可配置默认值。 */}
                  {canConfigureCodexProviderVision({ presetId: selectedPresetId, wireApi: form.wireApi }) && (
                    <>
                  <div className="form-group">
                    <label>
                      {t(
                        "codex.modelProviders.fields.visionCapability",
                        "Nhập ảnh",
                      )}
                    </label>
                    <label className="provider-vision-toggle">
                      <span className="provider-vision-toggle-copy">
                        <span className="provider-vision-toggle-title">
                          {t(
                            "codex.modelProviders.vision.providerDefault",
                            "Nhà cung cấp này mặc định hỗ trợ nhập ảnh",
                          )}
                        </span>
                        <span className="provider-vision-toggle-desc">
                          {t(
                            "codex.modelProviders.vision.providerDefaultHint",
                            "Mô hình chưa có cài đặt riêng dùng giá trị mặc định này; GPT-5.5 trở lên mặc định hỗ trợ ảnh. Có thể tắt từng mô hình trong danh sách. Nếu cổng không tìm thấy mô hình hỗ trợ ảnh, ảnh sẽ bị bỏ qua và văn bản tiếp tục được xử lý.",
                          )}
                        </span>
                      </span>
                      <span className="provider-vision-switch">
                        <input
                          type="checkbox"
                          checked={form.supportsVision}
                          onChange={(event) =>
                            mutateForm({ supportsVision: event.target.checked })
                          }
                          disabled={saving}
                        />
                        <span className="provider-vision-switch-track" />
                      </span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      {t(
                        "codex.modelProviders.fields.visionModels",
                        "Mẫu hỗ trợ ảnh",
                      )}
                    </label>
                    {parseModelCatalogText(form.modelCatalogText).length === 0 ? (
                      <>
                        <textarea
                          className="form-input"
                          rows={3}
                          value={form.visionModelText}
                          onChange={(event) =>
                            mutateForm({ visionModelText: event.target.value })
                          }
                          placeholder={"qwen-vl-plus\ngpt-6.1-sol"}
                          disabled={saving}
                        />
                        <p className="api-provider-hint">
                          {t(
                            "codex.modelProviders.vision.modelsHint",
                            "Mỗi dòng một mẫu. Dùng khi chỉ một số mẫu của nhà cung cấp hỗ trợ ảnh dán vào.",
                          )}
                        </p>
                      </>
                    ) : null}
                </div>
                <div className="form-group">
                  <label>
                    {t(
                      "codex.modelProviders.fields.visionRoutingModel",
                      "Mẫu xử lý ảnh",
                    )}
                  </label>
                  <input
                    className="form-input"
                    value={form.visionRoutingModel}
                    onChange={(event) =>
                      mutateForm({ visionRoutingModel: event.target.value })
                    }
                    placeholder={"mimo-v2.5"}
                    disabled={saving}
                  />
                  <p className="api-provider-hint">
                    {t(
                      "codex.modelProviders.vision.routingModelHint",
                      "Khi mô hình hiện tại không đọc được ảnh, cổng dùng mô hình này. Để trống để dùng mô hình hỗ trợ ảnh duy nhất nếu có; nếu không, ảnh bị bỏ qua và văn bản tiếp tục được xử lý.",
                    )}
                  </p>
                </div>
                    </>
                  )}
                {form.wireApi === "chat_completions" && (
                  <p className="api-provider-hint">
                    {t(
                      "codex.modelProviders.gatewayHint",
                      "Nhà cung cấp bên thứ ba khởi động qua cổng cục bộ để tách phiên bản và chuyển đổi giao thức. Nhà cung cấp OpenAI chính thức vẫn dùng kết nối trực tiếp.",
                    )}
                  </p>
                )}
                </>
              )}
              <div className="form-group">
                <label>
                  {t("codex.modelProviders.fields.website", "Trang web (tùy chọn)")}
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={form.website}
                  onChange={(event) =>
                    mutateForm({ website: event.target.value })
                  }
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label>
                  {t(
                    "codex.modelProviders.fields.apiKeyUrl",
                    "Trang API Key (tùy chọn)",
                  )}
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={form.apiKeyUrl}
                  onChange={(event) =>
                    mutateForm({ apiKeyUrl: event.target.value })
                  }
                  disabled={saving}
                />
              </div>

              {currentEditingProvider &&
                currentEditingProvider.apiKeys.length > 0 && (
                  <div className="form-group">
                    <label>
                      {t(
                        "codex.modelProviders.existingApiKeys",
                        "API Key hiện có",
                      )}
                    </label>
                    {currentEditingProvider.apiKeys.length > 5 && (
                      <div className="search-box codex-provider-key-search">
                        <Search className="search-icon" size={16} />
                        <input
                          type="text"
                          placeholder={t(
                            "codex.modelProviders.existingApiKeysSearch",
                            "Tìm API Key…",
                          )}
                          value={existingApiKeySearchQuery}
                          onChange={(event) =>
                            setExistingApiKeySearchQuery(event.target.value)
                          }
                          disabled={saving}
                        />
                      </div>
                    )}
                    <div className="codex-provider-key-list inline">
                      {currentEditingProvider.apiKeys
                        .filter((item) => {
                          const query = existingApiKeySearchQuery
                            .trim()
                            .toLowerCase();
                          if (!query) return true;
                          const label = (
                            item.name ||
                            t("codex.modelProviders.unnamedKey", "Key chưa có tên")
                          ).toLowerCase();
                          const masked = maskApiKey(item.apiKey).toLowerCase();
                          return (
                            label.includes(query) ||
                            masked.includes(query) ||
                            item.apiKey.toLowerCase().includes(query)
                          );
                        })
                        .map((item) => {
                          const isEditing = editingApiKey?.apiKeyId === item.id;
                          if (isEditing && editingApiKey) {
                            return (
                              <div
                                className="codex-provider-key-row is-editing"
                                key={item.id}
                              >
                                <div className="codex-provider-key-edit-fields">
                                  <input
                                    className="form-input"
                                    type="text"
                                    value={editingApiKey.name}
                                    onChange={(event) =>
                                      setEditingApiKey((current) =>
                                        current
                                          ? { ...current, name: event.target.value }
                                          : current,
                                      )
                                    }
                                    placeholder={t(
                                      "codex.modelProviders.fields.newApiKeyName",
                                      "API Key name (optional)",
                                    )}
                                    disabled={saving}
                                  />
                                  <input
                                    className="form-input"
                                    type="password"
                                    value={editingApiKey.apiKey}
                                    onChange={(event) =>
                                      setEditingApiKey((current) =>
                                        current
                                          ? { ...current, apiKey: event.target.value }
                                          : current,
                                      )
                                    }
                                    placeholder={t(
                                      "codex.modelProviders.fields.apiKey",
                                      "API Key",
                                    )}
                                    autoComplete="off"
                                    disabled={saving}
                                  />
                                </div>
                                <div className="codex-provider-key-edit-actions">
                                  <button
                                    type="button"
                                    className="action-btn success"
                                    onClick={() => void handleSaveApiKeyEdit()}
                                    disabled={saving}
                                    title={t("common.save", "Save")}
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    className="action-btn"
                                    onClick={() => setEditingApiKey(null)}
                                    disabled={saving}
                                    title={t("common.cancel", "Cancel")}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="codex-provider-key-row" key={item.id}>
                          <div className="codex-provider-key-text">
                            <span className="codex-provider-key-name">
                              {item.name ||
                                t(
                                  "codex.modelProviders.unnamedKey",
                                  "Key chưa có tên",
                                )}
                            </span>
                            <code>{maskApiKey(item.apiKey)}</code>
                          </div>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() =>
                              setEditingApiKey({
                                providerId: currentEditingProvider.id,
                                apiKeyId: item.id,
                                originalApiKey: item.apiKey,
                                apiKey: item.apiKey,
                                name: item.name,
                              })
                            }
                            disabled={saving}
                            title={t(
                              "codex.modelProviders.editApiKey",
                              "Edit API Key",
                            )}
                          >
                            <KeyRound size={12} />
                          </button>
                          <button
                            type="button"
                            className="action-btn"
                            onClick={() =>
                              void handleRenameApiKey(
                                currentEditingProvider,
                                item,
                              )
                            }
                            disabled={saving}
                            title={t("common.rename", "Đổi tên")}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="action-btn danger"
                            onClick={() =>
                              void handleDeleteApiKey(
                                currentEditingProvider,
                                item,
                              )
                            }
                            disabled={saving}
                            title={t("common.delete", "Xóa")}
                          >
                            <Trash2 size={12} />
                          </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

              <div className="form-group">
                <label>
                  {t(
                    "codex.modelProviders.fields.newApiKeyName",
                    "Tên key mới (tùy chọn)",
                  )}
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={form.newApiKeyName}
                  onChange={(event) =>
                    mutateForm({ newApiKeyName: event.target.value })
                  }
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label>
                  {t("codex.modelProviders.fields.newApiKey", "API Key mới")}
                </label>
                <input
                  className="form-input"
                  type="text"
                  value={form.newApiKey}
                  onChange={(event) =>
                    mutateForm({ newApiKey: event.target.value })
                  }
                  disabled={saving}
                />
              </div>

              <div className="provider-save-preview">
                <div className="provider-save-preview-header">
                  <div className="provider-save-preview-title">
                    {t("codex.modelProviders.preview.title", "Xem trước khi lưu")}
                  </div>
                  <span className="provider-save-preview-chip primary">
                    {t("codex.modelProviders.preview.writeNow", "Sẽ ghi")}
                  </span>
                </div>
                <p className="provider-save-preview-desc">
                  {t(
                    "codex.modelProviders.preview.desc",
                    "Khi lưu nhà cung cấp, kho nhà cung cấp sẽ được cập nhật trước. Cấu hình Codex chính thức hiện tại sẽ không đổi ngay lập tức.",
                  )}
                </p>
                <div className="provider-save-preview-list">
                  <div className="provider-save-preview-item primary">
                    <div className="provider-save-preview-item-head">
                      <span className="provider-save-preview-item-title">
                        {t(
                          "codex.modelProviders.preview.providerStoreTitle",
                          "Kho nhà cung cấp",
                        )}
                      </span>
                      <span className="provider-save-preview-chip primary">
                        {t("codex.modelProviders.preview.writeNow", "Sẽ ghi")}
                      </span>
                    </div>
                    <code>{previewPaths.providerStorePath}</code>
                    <p>
                      {t(
                        "codex.modelProviders.preview.providerStoreDesc",
                        "Lưu tên nhà cung cấp, Base URL, liên kết trang web/API Key và mọi API Key mới được thêm trong hộp thoại này.",
                      )}
                    </p>
                  </div>

                  <div className="provider-save-preview-item muted">
                    <div className="provider-save-preview-item-head">
                      <span className="provider-save-preview-item-title">
                        {t(
                          "codex.modelProviders.preview.codexConfigTitle",
                          "Cấu hình Codex hiện tại",
                        )}
                      </span>
                      <span className="provider-save-preview-chip muted">
                        {t(
                          "codex.modelProviders.preview.noImmediateChange",
                          "Chưa đổi ngay",
                        )}
                      </span>
                    </div>
                    <code>{previewPaths.codexConfigPath}</code>
                    <p>
                      {t(
                        "codex.modelProviders.preview.codexConfigDesc",
                        "Nhà cung cấp hiện tại hoặc Base URL sẽ không đổi ngay. Tệp này chỉ được cập nhật khi lưu hoặc chuyển tài khoản Codex API key.",
                      )}
                    </p>
                  </div>

                  <div className="provider-save-preview-item muted">
                    <div className="provider-save-preview-item-head">
                      <span className="provider-save-preview-item-title">
                        {t(
                          "codex.modelProviders.preview.authFileTitle",
                          "Thông tin xác thực Codex hiện tại",
                        )}
                      </span>
                      <span className="provider-save-preview-chip muted">
                        {t(
                          "codex.modelProviders.preview.noImmediateChange",
                          "Chưa đổi ngay",
                        )}
                      </span>
                    </div>
                    <code>{previewPaths.codexAuthPath}</code>
                    <p>
                      {t(
                        "codex.modelProviders.preview.authFileDesc",
                        "Việc lưu nhà cung cấp không ghi đè OPENAI_API_KEY hiện tại trong auth.json.",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <ModalErrorMessage message={formError} position="bottom" />
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeModal}
                disabled={saving}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                className="btn btn-primary codex-provider-save-button"
                onClick={() => void handleSaveProvider()}
                disabled={saving}
              >
                <span className="codex-provider-save-button-label">
                  <span aria-hidden={saving}>
                    {t("common.save", "Lưu")}
                  </span>
                  <span aria-hidden={!saving}>
                    {t("common.saving", "Đang lưu...")}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {apiKeyPickerProviderId && (() => {
        const provider = providers.find((item) => item.id === apiKeyPickerProviderId);
        if (!provider) return null;
        const unnamedKeyLabel = t(
          "codex.modelProviders.unnamedKey",
          "Key chưa có tên",
        );
        const filteredApiKeys = provider.apiKeys.filter((item) =>
          resolveProviderApiKeyLabel(item, provider.name, unnamedKeyLabel)
            .toLowerCase()
            .includes(pickerSearchQuery.trim().toLowerCase()),
        );
        return (
          <div className="modal-overlay">
            <div
              className="modal codex-provider-picker-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{t("codex.modelProviders.existingApiKeys", "API Key hiện có")}</h2>
                <button
                  className="modal-close"
                  onClick={() => setApiKeyPickerProviderId(null)}
                  aria-label={t("common.close", "Đóng")}
                >
                  <X />
                </button>
              </div>
              <div className="modal-body codex-provider-picker-body">
                <div className="search-box codex-provider-picker-search">
                  <Search className="search-icon" size={16} />
                  <input
                    type="text"
                    placeholder={t("common.search", "Tìm kiếm...")}
                    value={pickerSearchQuery}
                    onChange={(event) => setPickerSearchQuery(event.target.value)}
                  />
                </div>
                <div className="codex-provider-picker-list">
                  {filteredApiKeys.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`codex-provider-picker-item ${selectedProviderApiKeyMap[provider.id] === item.id || (!selectedProviderApiKeyMap[provider.id] && provider.apiKeys[0]?.id === item.id) ? "active" : ""}`}
                      onClick={() => {
                        setSelectedProviderApiKeyMap((previous) => ({
                          ...previous,
                          [provider.id]: item.id,
                        }));
                        setApiKeyPickerProviderId(null);
                      }}
                    >
                      <span>{resolveProviderApiKeyLabel(item, provider.name, unnamedKeyLabel)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {instancePickerProviderId && (() => {
        const provider = providers.find((item) => item.id === instancePickerProviderId);
        if (!provider) return null;
        const filteredInstances = displayInstances.filter((instance) =>
          getInstanceName(instance)
            .toLowerCase()
            .includes(pickerSearchQuery.trim().toLowerCase()),
        );
        return (
          <div className="modal-overlay">
            <div
              className="modal codex-provider-picker-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{t("codex.modelProviders.instance.shortLabel", "Phiên")}</h2>
                <button
                  className="modal-close"
                  onClick={() => setInstancePickerProviderId(null)}
                  aria-label={t("common.close", "Đóng")}
                >
                  <X />
                </button>
              </div>
              <div className="modal-body codex-provider-picker-body">
                <div className="search-box codex-provider-picker-search">
                  <Search className="search-icon" size={16} />
                  <input
                    type="text"
                    placeholder={t("common.search", "Tìm kiếm...")}
                    value={pickerSearchQuery}
                    onChange={(event) => setPickerSearchQuery(event.target.value)}
                  />
                </div>
                <div className="codex-provider-picker-list">
                  {filteredInstances.map((instance) => (
                    <button
                      key={instance.id}
                      type="button"
                      className={`codex-provider-picker-item ${getProviderInstanceId(provider) === instance.id ? "active" : ""}`}
                      onClick={() => {
                        void handleProviderInstanceChange(provider, instance.id);
                        setInstancePickerProviderId(null);
                      }}
                    >
                      <span>
                        {getInstanceName(instance)}
                        {instance.running
                          ? ` · ${t("codex.modelProviders.instance.running", "Đang chạy")}`
                          : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {providerOauthTarget && (
        <div
          className="modal-overlay"
        >
          <div
            className="modal-content codex-add-modal codex-oauth-binding-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t("codex.api.oauthBinding.title", "Liên kết tài khoản OAuth")}</h2>
              <button
                className="modal-close"
                onClick={() => !providerOauthSaving && setProviderOauthPickerId(null)}
                aria-label={t("common.close", "Đóng")}
                disabled={providerOauthSaving}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div className="add-section">
                <div className="codex-oauth-binding-context">
                  <p className="section-desc codex-oauth-binding-desc">
                    {t(
                      "codex.modelProviders.oauthBinding.desc",
                      "Tùy chọn. Có thể liên kết bất kỳ tài khoản OAuth nào có refresh_token. Nếu không liên kết, nhà cung cấp tiếp tục dùng luồng API Key gốc.",
                    )}
                  </p>
                  <div className="section-desc codex-oauth-binding-current-target">
                    {t("codex.modelProviders.oauthBinding.currentProvider", {
                      defaultValue: "Nhà cung cấp: {{name}}",
                      name: providerOauthTarget.name,
                    })}
                  </div>
                </div>
                <div className="codex-oauth-binding-picker">
                  <div className="codex-oauth-binding-picker-header">
                    <label>
                      {t("codex.api.oauthBinding.selectLabel", "Chọn tài khoản OAuth")}
                    </label>
                  </div>
                  {providerOauthAccounts.length === 0 ? (
                    <div className="add-status error">
                      <CircleAlert size={16} />
                      <span>
                        {t(
                          "codex.api.oauthBinding.empty",
                          "Chưa có tài khoản OAuth. Hãy thêm tài khoản ủy quyền OAuth trước.",
                        )}
                      </span>
                    </div>
                  ) : providerOauthEligibleAccounts.length === 0 ? (
                    <div className="add-status error">
                      <CircleAlert size={16} />
                      <span>
                        {t(
                          "codex.api.oauthBinding.emptyEligible",
                          "Không có tài khoản OAuth có refresh_token. Hãy ủy quyền OAuth lại hoặc thêm tài khoản OAuth đủ điều kiện.",
                        )}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="codex-oauth-binding-toolbar">
                        <div className="search-box codex-oauth-binding-search">
                          <Search size={16} className="search-icon" />
                          <input
                            type="text"
                            placeholder={t("common.shared.search", "Tìm kiếm tài khoản...")}
                            value={providerOauthSearchQuery}
                            onChange={(event) =>
                              setProviderOauthSearchQuery(event.target.value)
                            }
                            disabled={providerOauthSaving}
                          />
                        </div>
                        <MultiSelectFilterDropdown
                          options={providerOauthTierFilterOptions}
                          selectedValues={providerOauthFilterTypes}
                          allLabel={t("common.shared.filter.all", {
                            count: providerOauthTierCounts.all,
                          })}
                          filterLabel={t("common.shared.filterLabel", "Bộ lọc")}
                          clearLabel={t("accounts.clearFilter", "Xóa bộ lọc")}
                          emptyLabel={t("common.none", "None​")}
                          ariaLabel={t("common.shared.filterLabel", "Bộ lọc")}
                          onToggleValue={toggleProviderOAuthFilterTypeValue}
                          onClear={() => setProviderOauthFilterTypes([])}
                        />
                        <AccountTagFilterDropdown
                          availableTags={providerOauthAvailableTags}
                          selectedTags={providerOauthTagFilter}
                          onToggleTag={toggleProviderOAuthTagFilterValue}
                          onClear={() => setProviderOauthTagFilter([])}
                        />
                        <SingleSelectFilterDropdown
                          value={providerOauthSortBy}
                          options={[
                            {
                              value: "last_used",
                              label: t("accounts.columns.lastUsed", "Sử dụng lần cuối"),
                            },
                            {
                              value: "created_at",
                              label: t("common.shared.sort.createdAt", "Thời gian tạo"),
                            },
                            {
                              value: "account",
                              label: t("common.shared.columns.account", "Tài khoản"),
                            },
                            {
                              value: "plan",
                              label: t("accounts.sort.plan", "Theo gói"),
                            },
                          ]}
                          ariaLabel={t("common.shared.sortLabel", "Sắp xếp")}
                          icon={<ArrowDownWideNarrow size={14} />}
                          disabled={providerOauthSaving}
                          onChange={(value) =>
                            setProviderOauthSortBy(value as OAuthBindingSortBy)
                          }
                        />
                        <button
                          type="button"
                          className="sort-direction-btn"
                          onClick={() =>
                            setProviderOauthSortDirection((prev) =>
                              prev === "desc" ? "asc" : "desc",
                            )
                          }
                          disabled={providerOauthSaving}
                          title={
                            providerOauthSortDirection === "desc"
                              ? t(
                                  "common.shared.sort.descTooltip",
                                  "Giảm dần (nhấn để chuyển Tăng dần)",
                                )
                              : t(
                                  "common.shared.sort.ascTooltip",
                                  "Tăng dần (nhấn để chuyển Giảm dần)",
                                )
                          }
                          aria-label={t(
                            "common.shared.sort.toggleDirection",
                            "Đổi hướng sắp xếp",
                          )}
                        >
                          {providerOauthSortDirection === "desc" ? (
                            <ArrowDown size={15} />
                          ) : (
                            <ArrowUp size={15} />
                          )}
                        </button>
                      </div>
                      {providerOauthFilteredAccounts.length === 0 ? (
                        <div className="group-account-empty">
                          <span>
                            {t("common.shared.noMatch.title", "Không có tài khoản phù hợp")}
                          </span>
                        </div>
                      ) : (
                        <div className="codex-oauth-binding-list">
                          {providerOauthPagination.pageItems.map((account) => {
                            const presentation = resolvePresentation(account);
                            const subscriptionInfo =
                              getCodexSubscriptionPresentation(
                                account.subscription_active_until,
                                t,
                              );
                            const selected =
                              providerOauthSelectedAccountId === account.id;
                            const emailText = maskAccountText(
                              account.email ||
                                account.account_name ||
                                presentation.displayName ||
                                account.id,
                            );
                            return (
                              <label
                                key={account.id}
                                className={`codex-oauth-binding-row ${selected ? "is-selected" : ""}`}
                                aria-label={emailText}
                                aria-disabled={providerOauthSaving}
                                onClick={(event) => {
                                  if (providerOauthSaving) {
                                    event.preventDefault();
                                    return;
                                  }
                                  setProviderOauthSelectedAccountId(account.id);
                                }}
                              >
                                <input
                                  type="radio"
                                  name="codex-provider-oauth-binding-account"
                                  checked={selected}
                                  onChange={() =>
                                    setProviderOauthSelectedAccountId(account.id)
                                  }
                                  disabled={providerOauthSaving}
                                />
                                <div className="codex-oauth-binding-row-main">
                                  <span
                                    className="codex-oauth-binding-row-name"
                                    title={emailText}
                                  >
                                    {emailText}
                                  </span>
                                  <span
                                    className={`tier-badge codex-oauth-binding-row-plan ${presentation.planClass || "unknown"}`}
                                    title={presentation.planLabel}
                                  >
                                    {presentation.planLabel}
                                  </span>
                                  <span
                                    className={`codex-oauth-binding-row-term ${subscriptionInfo.tone}`}
                                    title={subscriptionInfo.titleText}
                                  >
                                    <Clock size={12} />
                                    <span>
                                      {t("codex.subscription.label", "Hết hạn gói")}
                                    </span>
                                    <strong>{subscriptionInfo.valueText}</strong>
                                    <span>{subscriptionInfo.detailText}</span>
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <PaginationControls
                        totalItems={providerOauthPagination.totalItems}
                        currentPage={providerOauthPagination.currentPage}
                        totalPages={providerOauthPagination.totalPages}
                        pageSize={providerOauthPagination.pageSize}
                        pageSizeOptions={providerOauthPagination.pageSizeOptions}
                        rangeStart={providerOauthPagination.rangeStart}
                        rangeEnd={providerOauthPagination.rangeEnd}
                        canGoPrevious={providerOauthPagination.canGoPrevious}
                        canGoNext={providerOauthPagination.canGoNext}
                        onPageSizeChange={providerOauthPagination.setPageSize}
                        onPreviousPage={providerOauthPagination.goToPreviousPage}
                        onNextPage={providerOauthPagination.goToNextPage}
                      />
                    </>
                  )}
                </div>
                <div className="api-key-edit-actions">
                  {providerOauthHasExistingBinding && (
                    <button
                      className="btn btn-secondary codex-oauth-binding-clear"
                      onClick={() =>
                        void handleProviderOauthBindingChange(
                          providerOauthTarget,
                          null,
                        )
                      }
                      disabled={providerOauthSaving}
                    >
                      {t("codex.api.oauthBinding.clearAction", "Bỏ liên kết")}
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => setProviderOauthPickerId(null)}
                    disabled={providerOauthSaving}
                  >
                    {t("common.cancel", "Hủy")}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() =>
                      selectedProviderOauthAccount &&
                      void handleProviderOauthBindingChange(
                        providerOauthTarget,
                        selectedProviderOauthAccount.id,
                      )
                    }
                    disabled={
                      providerOauthSaving ||
                      !selectedProviderOauthAccount ||
                      providerOauthEligibleAccounts.length === 0
                    }
                  >
                    {providerOauthSaving
                      ? t("common.saving", "Đang lưu...")
                      : t("common.save", "Lưu")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {providerDetailId && (() => {
        const storedProvider = providers.find((item) => item.id === providerDetailId);
        const provider = storedProvider ? resolveCodexModelProviderForApiKey(storedProvider, getSelectedProviderApiKey(storedProvider)?.apiKey) : null;
        if (!provider) return null;
        const usageState = providerUsageMap[provider.id];
        const primaryApiKey = getSelectedProviderApiKey(provider);
        const usageSummary = usageState?.summary;
        const resolvedWireApi = resolveProviderWireApi(provider);
        const usageMode =
          usageSummary?.mode === "new_api" ||
          usageSummary?.mode === "sub2api" ||
          usageSummary?.mode === "deepseek" ||
          usageSummary?.mode === "token_plan"
            ? usageSummary.mode
            : provider.integrationType ?? null;
        const coreDetailKeys =
          usageMode === "new_api"
            ? new Set(["mode", "totalGranted", "totalAvailable", "expiresAt"])
            : usageMode === "sub2api"
              ? new Set(["mode", "remaining", "todayRequests", "todayTokens"])
            : usageMode === "deepseek"
                ? new Set([
                    "isAvailable",
                    "currency",
                    "totalBalance",
                    "grantedBalance",
                    "toppedUpBalance",
                  ])
                : usageMode === "token_plan"
                  ? new Set([
                      "mode",
                      "remaining",
                      "planName",
                      "expiresAt",
                    ])
                : new Set<string>();
        const detailMetrics: CodexServicePanelMetricItem[] = [
          {
            key: "wireApi",
            label: t("codex.modelProviders.fields.wireApi", "Giao thức"),
            value:
              resolvedWireApi === "chat_completions"
                ? t(
                    "codex.modelProviders.wireApi.chatCompletions",
                    "Giao thức Chat Completions",
                  )
                : t(
                    "codex.modelProviders.wireApi.responses",
                    "Responses gốc",
                  ),
            rawKey: "wireApi",
          },
          {
            key: "supportsWebsockets",
            label: t(
              "codex.modelProviders.fields.supportsWebsockets",
              "Truyền tải WebSocket",
            ),
            value:
              resolvedWireApi === "responses" && provider.supportsWebsockets
                ? t("codex.modelProviders.websockets.enabled", "Đã bật")
                : t("codex.modelProviders.websockets.disabled", "Đã tắt"),
            rawKey: "supportsWebsockets",
          },
          {
            key: "oauthBinding",
            label: t("codex.api.oauthBinding.label", "Liên kết OAuth"),
            value:
              resolveBoundOAuthAccount(provider)?.account_name ||
              resolveBoundOAuthAccount(provider)?.email ||
              resolveBoundOAuthAccount(provider)?.id ||
              t("codex.api.oauthBinding.unbound", "Chưa liên kết"),
            rawKey: "boundOauthAccountId",
          },
          ...(resolveCodexApiProviderPresetId(provider.baseUrl) ===
          DEEPSEEK_API_PROVIDER_ID
            ? [
                {
                  key: "enableMode",
                  label: t("codex.modelProviders.enableMode.label", "Chế độ kết nối"),
                  value: t(
                    "codex.deepSeek.start.chooseAtStart",
                    "Khi khởi động",
                  ),
                  rawKey: "enableMode",
                },
              ]
            : resolvedWireApi === "chat_completions"
              ? [
                  {
                    key: "enableMode",
                    label: t("codex.modelProviders.enableMode.label", "Chế độ kết nối"),
                    value: t(
                      "codex.modelProviders.enableMode.gatewayMode",
                      "Chế độ gateway",
                    ),
                    rawKey: "enableMode",
                  },
                ]
              : [
                  {
                    key: "enableMode",
                    label: t("codex.modelProviders.enableMode.label", "Chế độ kết nối"),
                    value: t(
                      "codex.modelProviders.enableMode.directMode",
                      "Chế độ trực tiếp",
                    ),
                    rawKey: "enableMode",
                  },
                ]),
          {
            key: "vision",
            label: t("codex.modelProviders.vision.allModels", "Ảnh"),
            value: provider.supportsVision
              ? t("common.yes", "Có")
              : t("common.no", "Không"),
            rawKey: "supportsVision",
          },
          {
            key: "modelCatalog",
            label: t("codex.modelProviders.modelCatalog", "Mô hình"),
            value:
              (provider.modelCatalog?.length ?? 0) > 0
                ? (provider.modelCatalog ?? []).join(", ")
                : t("codex.modelProviders.modelCatalogEmpty", "Chưa có danh mục mô hình"),
            rawKey: "modelCatalog",
          },
          ...((usageSummary?.details ?? [])
            .filter((item) => !coreDetailKeys.has(item.key))
            .map((item) => ({
              key: item.key,
              label: formatUsageDetailLabel(item.key, item.label),
              value: formatUsageDetailValue(item, usageSummary?.unit),
              rawKey: item.key,
            })) as CodexServicePanelMetricItem[]),
        ];

        const newApiQuota = resolveNewApiQuotaSnapshot(usageSummary);
        const coreMetrics: CodexServicePanelMetricItem[] =
          usageMode === "deepseek"
            ? [
                "isAvailable",
                "currency",
                "totalBalance",
                "grantedBalance",
                "toppedUpBalance",
              ].map((key) => {
                const item = usageSummary?.details?.find((detail) => detail.key === key);
                return {
                  key,
                  label: formatUsageDetailLabel(key, key),
                  value: item ? formatUsageDetailValue(item, usageSummary?.unit) : "-",
                };
              })
            : usageMode === "new_api"
            ? [
                {
                  key: "totalGranted",
                  label: t("codex.modelProviders.usage.fields.totalGranted", "Đã cấp"),
                  value: formatUsageDetailValue(
                    {
                      key: "totalGranted",
                      value: String(newApiQuota.granted ?? "-"),
                    },
                    usageSummary?.unit,
                  ),
                },
                {
                  key: "totalAvailable",
                  label: t("codex.modelProviders.usage.fields.totalAvailable", "Khả dụng"),
                  value: formatUsageDetailValue(
                    {
                      key: "totalAvailable",
                      value: String(newApiQuota.available ?? "-"),
                    },
                    usageSummary?.unit,
                  ),
                },
                {
                  key: "expiresAt",
                  label: t("codex.modelProviders.usage.fields.expiresAt", "Hết hạn"),
                  value: formatUsageDetailValue(
                    {
                      key: "expiresAt",
                      value: String(newApiQuota.expiresAt ?? "-"),
                    },
                    usageSummary?.unit,
                  ),
                },
              ]
            : usageMode === "sub2api"
              ? [
                  {
                    key: "accountBalance",
                    label: t("codex.modelProviders.usage.accountBalance", "Số dư tài khoản"),
                    value: formatUsageQuotaValue(
                      usageSummary,
                      usageSummary?.remaining ??
                        usageSummary?.balance ??
                        usageSummary?.quotaRemaining,
                    ),
                  },
                  {
                    key: "todayRequests",
                    label: t("codex.modelProviders.usage.fields.todayRequests", "Yêu cầu hôm nay"),
                    value: String(usageSummary?.todayRequests ?? 0),
                  },
                  {
                    key: "todayTokens",
                    label: t("codex.modelProviders.usage.fields.todayTokens", "Token hôm nay"),
                    value: (usageSummary?.todayTotalTokens ?? 0).toLocaleString("en-US"),
                  },
                ]
              : [];

        const actions: CodexServicePanelActionItem[] = [
          {
            key: "refresh",
            label: t("common.shared.refreshQuota", "Làm mới hạn mức"),
            variant: "secondary",
            icon: (
              <RefreshCw
                size={14}
                className={usageState?.loading ? "loading-spinner" : ""}
              />
            ),
            disabled: !primaryApiKey || usageState?.loading,
            onClick: () => {
              if (primaryApiKey) {
                void refreshProviderUsage(provider, primaryApiKey);
              }
            },
          },
          {
            key: "edit",
            label: t("instances.actions.edit", "Chỉnh sửa"),
            variant: "secondary",
            icon: <Pencil size={14} />,
            onClick: () => {
              setProviderDetailId(null);
              openEditModal(provider);
            },
          },
          {
            key: "oauth",
            label: t("codex.api.oauthBinding.action", "Liên kết OAuth"),
            variant: "secondary",
            icon: <Link2 size={14} />,
            onClick: () => {
              setProviderDetailId(null);
              setProviderOauthPickerId(provider.id);
            },
          },
        ];

        if (provider.website || provider.apiKeyUrl || provider.baseUrl) {
          actions.push({
            key: "website",
            label: t("codex.modelProviders.website", "Trang web"),
            variant: "secondary",
            icon: <ExternalLink size={14} />,
            onClick: () => {
              const targetUrl = normalizeApiKeyFunOfficialUrl(
                provider.website || provider.apiKeyUrl || provider.baseUrl,
              );
              if (!targetUrl) return;
              window.open(targetUrl, "_blank", "noopener,noreferrer");
            },
          });
        }

        return (
          <CodexServicePanelModal
            open={true}
            title={t("codex.modelProviders.usage.detailTitle", "Bảng dịch vụ")}
            subtitle={provider.name}
            baseUrl={provider.baseUrl}
            apiKeyDisplay={primaryApiKey ? maskApiKey(primaryApiKey.apiKey) : "-"}
            rawApiKey={primaryApiKey?.apiKey}
            coreMetrics={coreMetrics}
            detailMetrics={detailMetrics}
            actions={actions}
            onClose={() => setProviderDetailId(null)}
            emptyDetailText={t("codex.cockpitApi.noStats", "Chưa có thống kê")}
          />
        );
      })()}
      {providerLaunchDialog}
    </div>
  );
}
