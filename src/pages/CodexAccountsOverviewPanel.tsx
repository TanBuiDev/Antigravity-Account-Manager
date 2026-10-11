import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModalScrollLock } from "../hooks/useModalScrollLock";
import "./CodexAccountDialogs.css";
import { Plus, RefreshCw, Upload, Trash2, X, Globe, KeyRound, Power, Copy, Check, Play, Pause, RotateCw, CircleAlert, Info, Rows3, LayoutGrid, List, Search, ArrowDownWideNarrow, ArrowUp, ArrowDown, GripVertical, Clock, Tag, Star, Eye, EyeOff, BookOpen, FileText, ExternalLink, FolderOpen, FolderPlus, LogOut, Terminal, ChevronDown } from "lucide-react";
import * as codexLocalAccessService from "../services/codexLocalAccessService";
import { TagEditModal } from "../components/TagEditModal";
import { ExportJsonModal } from "../components/ExportJsonModal";
import { ModalErrorMessage } from "../components/ModalErrorMessage";
import { PaginationControls } from "../components/PaginationControls";
import { PlatformGroupTabs } from "../components/PlatformGroupTabs";
import { AccountGroupModal, AddToGroupModal } from "../components/AccountGroupModal";
import { CodexGroupAccountPickerModal } from "../components/CodexGroupAccountPickerModal";
import { CodexLocalAccessModal } from "../components/CodexLocalAccessModal";
import { CodexInstanceGatewaysModal } from "../components/CodexInstanceGatewaysModal";
import { CodexAccountPoolHealthModal } from "../components/CodexAccountPoolHealthModal";
import { isCodexApiKeyAccount, isCodexChatCompletionsApiKeyAccount, isCodexNewApiAccount } from "../types/codex";
import { QuickSettingsPopover } from "../components/QuickSettingsPopover";
import { MultiSelectFilterDropdown } from "../components/MultiSelectFilterDropdown";
import { SingleSelectFilterDropdown } from "../components/SingleSelectFilterDropdown";
import { SingleSelectDropdown } from "../components/SingleSelectDropdown";
import { CODEX_API_PROVIDER_CUSTOM_ID, CODEX_API_PROVIDER_PRESETS, COCKPIT_API_PROVIDER_ID } from "../utils/codexProviderPresets";
import { formatCodexQuotaPoolPercent, formatCodexQuotaPoolWindowLabel } from "../utils/codexQuotaPool";
import { CodexLocalAccessRiskNoticeDialog } from "../components/codex/CodexLocalAccessRiskNoticeDialog";
import { getMfaOtpToken } from "../utils/mfaVault";
import type { CodexExportFormat } from "../utils/codexExportFormats";
import type { CodexAccountsViewProps } from "./CodexAccountsView";
import { CodexAddAccountDialog } from "./CodexAddAccountDialog";
import { useCodexPelicanStore } from "../stores/useCodexPelicanStore";
import { CodexRecycleBinModal } from "../components/CodexRecycleBinModal";
import { emitAccountsChanged } from "../utils/accountSyncEvents";
import { PELICAN_GROUPS_CHANGED } from "../components/codex/pelican/PelicanResults";


/** 渲染 CodexAccountsView 的 activeTab === "overview" 业务面板。 */
export function CodexAccountsOverviewPanel(props: CodexAccountsViewProps) {
  const {
    accountNoteCopiedKey,
    accountNoteError,
    accountNoteErrorScrollKey,
    accountNoteFieldErrors,
    accountNoteMailPreview,
    accountNoteMailPreviewError,
    accountNoteMailPreviewLoading,
    accountNoteMfaPickerOpen,
    accountNotePasswordVisible,
    accountNoteSecretVisible,
    accounts,
    activeAccountNoteDisplayName,
    activeAccountNoteEmail,
    activeAccountNoteForm,
    activeAccountNoteMode,
    activeAccountNoteOtpToken,
    activeAccountNoteSaving,
    activeAccountUsesPersonalAccessToken,
    activeGroup,
    activeGroupId,
    availableTags,
    batchDeleteBusy,
    batchDeleteJob,
    batchDeleteModalError,
    batchImportBusy,
    batchImportOpen,
    batchImportPreview,
    batchImportProgress,
    batchImportResult,
    batchImportSessionId,
    canOpenFormattedExportSavedDirectory,
    canSelectAllFilteredAccounts,
    clearAllOverviewFilters,
    clearFilterTypes,
    clearGroupFilter,
    clearTagFilter,
    closeAccountNoteModal,
    closeApiKeyCredentialsModal,
    closeLocalAccessRiskNotice,
    closeQuickSwitchModal,
    closeResetCreditConfirmModal,
    codexAccountSortOptions,
    codexGroups,
    codexOverviewGroupFilterOptions,
    confirmCodexDelete,
    confirmDeleteGroup,
    confirmDeleteTag,
    confirmHideLocalAccessEntry,
    copyAccountNoteValue,
    copyFormattedExportJson,
    copyFormattedExportSavedPath,
    customSortAccounts,
    customSortDropTargetId,
    deleteConfirm,
    deleteConfirmError,
    deleteConfirmErrorScrollKey,
    deletingGroup,
    deletingTag,
    draggedCustomSortAccountId,
    editingApiBaseUrlCredentialsValue,
    editingApiKeyCredentialsId,
    editingApiKeyCredentialsValue,
    editingApiKeyCredentialsVisible,
    editingApiModelCatalogDraft,
    editingApiWireApi,
    editingApiSupportsWebsockets,
    editingApiCredentialsError,
    setEditingApiWireApi,
    setEditingApiSupportsWebsockets,
    setEditingApiCredentialsError,
    editingApiModelCatalogError,
    editingApiModelCatalogFetching,
    editingApiModelCatalogInput,
    editingApiModelCatalogSyncAvailable,
    editingApiProviderPresetId,
    editingApiSyncModelCatalogToCodex,
    editingManagedProviderApiKeyId,
    editingManagedProviderId,
    editingNewManagedProviderNameInput,
    errorAccountIds,
    exportCanIncludeSensitiveNotes,
    exportFormat,
    exportFormatOptions,
    exportHasAgentIdentity,
    exporting,
    exportJsonHidden,
    exportModalError,
    exportModalErrorScrollKey,
    exportSelectionCount,
    filteredAccounts,
    filteredIds,
    filterTypes,
    formatCodexAccountNoteMailPreviewTime,
    formatCodexManagedApiKeyOptionLabel,
    formatMfaRecordOption,
    formatMfaSecretPreview,
    formatResetCreditAbsoluteTime,
    formatResetCreditTime,
    formattedExportJsonContent,
    formattedExportJsonCopied,
    formattedExportModalCustomContent,
    formattedExportPathCopied,
    formattedExportSavedPath,
    formattedSavingExportJson,
    getResetCreditStatusLabel,
    getResetCreditStatusTone,
    groupByTag,
    groupDeleteConfirm,
    groupDeleteError,
    groupDeleteErrorScrollKey,
    groupFilter,
    groupQuickAddGroup,
    groupQuickAddGroupId,
    handleChangeOverviewLayoutMode,
    handleClearBatchDelete,
    handleClearErrorAccounts,
    handleClearLocalAccessStats,
    handleClearOverviewSelection,
    handleCloseExportModal,
    handleCodexBatchDelete,
    handleConfirmConsumeResetCredit,
    handleCustomSortDragMove,
    handleCustomSortDragStart,
    handleDismissBatchImportTask,
    handleEditingApiBaseUrlCredentialsChange,
    handleEditingApiKeyCredentialsChange,
    handleExport,
    handleFetchEditingApiModelCatalog,
    handleKillLocalAccessPort,
    handleEnterGroup,
    handleLeaveGroup,
    handleLocalAccessAddressKindChange,
    handleOpenAccountNoteMailUrl,
    handleOpenProviderLink,
    handlePauseBatchDelete,
    handlePendingOAuthEmailInputChange,
    handleQuickAddAccountsToGroup,
    handleRecoverLocalAccessAccounts,
    handleCreateGrokUpstreamAccount,
    handleRefreshAccountNoteMailPreview,
    handleRefreshAll,
    handleRemoveFromGroup,
    handleRestartLocalAccessSidecar,
    handleResumeBatchDelete,
    handleRetryFailedBatchDelete,
    handleRotateLocalAccessApiKey,
    handleSaveLocalAccessAccounts,
    handleSaveTags,
    handleSelectAllFilteredAccounts,
    handleSelectEditingApiProviderPreset,
    handleSelectEditingManagedProvider,
    handleSelectEditingManagedProviderApiKey,
    handleSelectQuickSwitchApiKey,
    handleSelectQuickSwitchProvider,
    handleSortByChange,
    handleSubmitAccountNote,
    handleSubmitApiKeyCredentials,
    handleSubmitQuickSwitch,
    handleToggleExportJsonHidden,
    handleToggleLocalAccessEnabled,
    handleToggleSelectAllPaginated,
    handleUpdateLocalAccessAccessScope,
    handleUpdateLocalAccessCustomRouting,
    handleUpdateLocalAccessPort,
    handleUpdateLocalAccessRoutingStrategy,
    handleUpdateLocalAccessUpstreamProxyConfig,
    hasActiveOverviewFilters,
    hasDetectableFullQuotaWakeupAccounts,
    hasGroupEntryCards,
    instanceGateways,
    instanceGatewaysError,
    instanceGatewaysLoading,
    instanceGatewaysOpen,
    closeInstanceGateways,
    refreshInstanceGateways,
    stopInstanceGateway,
    restartInstanceGateway,
    includeExportSensitiveNotes,
    inlineFolderCards,
    isAllFilteredSelectionActive,
    isAllPaginatedSelected,
    isCustomSortActive,
    isResetCreditConfirmSubmitting,
    loading,
    localAccessAddressOptions,
    localAccessCollection,
    localAccessHealthActionBusy,
    localAccessHideSubmitting,
    localAccessModalMode,
    localAccessModalSelectedIds,
    localAccessPortKilling,
    localAccessQuotaPoolLabels,
    localAccessQuotaPoolSummary,
    localAccessRiskNoticeAction,
    localAccessRiskNoticeRemember,
    localAccessSaving,
    localAccessSidecarRestarting,
    localAccessStarting,
    localAccessState,
    managedProviders,
    managedProvidersLoading,
    maskAccountText,
    message,
    mfaTimeRemaining,
    moveCustomSortAccount,
    OPENAI_OFFICIAL_PRESET_ID,
    openCodexAddModal,
    openCodexApiServicePage,
    openFormattedExportSavedDirectory,
    openFullQuotaWakeupTestModal,
    overviewAccounts,
    overviewCurrentAccountId,
    overviewLayoutMode,
    page,
    paginatedAccounts,
    paginatedGroupedAccounts,
    pagination,
    pendingOAuthEmailInput,
    pendingOAuthFieldErrors,
    pendingWebSessionImport,
    performTokenImport,
    privacyModeEnabled,
    quickSwitchAccount,
    quickSwitchAccountId,
    quickSwitchApiKeyId,
    quickSwitchError,
    quickSwitchProviderId,
    quickSwitchSubmitting,
    refreshingAll,
    refreshSavedMfaRecords,
    reloadCodexGroups,
    reloadLocalAccessState,
    renderCompactRows,
    renderGridCards,
    renderGroupTableRows,
    renderTableRows,
    reportExportModalError,
    requestDeleteTag,
    resetCreditConfirmAccount,
    resetCreditConfirmActionLocked,
    resetCreditConfirmAvailableCount,
    resetCreditConfirmCredits,
    resetCreditConfirmError,
    resetCreditConfirmErrorScrollKey,
    resetCreditConfirmLoading,
    resetCreditConfirmNextExpiresAt,
    resetCustomSortOrder,
    resolveGroupLabel,
    resolvePresentation,
    savedMfaRecords,
    saveFormattedExportJson,
    savingApiKeyCredentials,
    searchQuery,
    selected,
    selectedEditingApiProviderPreset,
    selectedEditingManagedProvider,
    selectedLocalAccessAddressKind,
    selectedQuickSwitchApiKey,
    selectedQuickSwitchProvider,
    setAccountNoteMfaPickerOpen,
    setAccountNotePasswordVisible,
    setAccountNoteSecretVisible,
    setActiveTab,
    setBatchImportOpen,
    setDeleteConfirm,
    setEditingApiKeyCredentialsVisible,
    setEditingApiModelCatalogError,
    setEditingApiModelCatalogInput,
    setEditingApiSyncModelCatalogToCodex,
    setEditingNewManagedProviderNameInput,
    setExportFormat,
    setGroupByTag,
    setGroupDeleteConfirm,
    setGroupDeleteError,
    setGroupQuickAddGroupId,
    setIncludeExportSensitiveNotes,
    setLocalAccessRiskNoticeRemember,
    setLocalAccessState,
    setMessage,
    setPendingWebSessionImport,
    setSearchQuery,
    setShowAddToCodexGroupModal,
    setShowCodexGroupModal,
    setShowCustomSortModal,
    setShowLocalAccessHealthModal,
    setShowLocalAccessHideConfirm,
    setShowLocalAccessModal,
    setShowLocalAccessQuotaStatsModal,
    setShowTagFilter,
    setShowTagModal,
    setSortDirection,
    setTagDeleteConfirm,
    showAddToCodexGroupModal,
    showCodexGroupModal,
    showCustomSortModal,
    showExportModal,
    showLocalAccessHealthModal,
    showLocalAccessHideConfirm,
    showLocalAccessModal,
    showLocalAccessQuotaStatsModal,
    showOverviewSelectionBar,
    showTagFilter,
    showTagModal,
    sortBy,
    sortDirection,
    stopCustomSortDragging,
    store,
    t,
    tagDeleteConfirm,
    tagDeleteConfirmError,
    tagDeleteConfirmErrorScrollKey,
    tagFilter,
    tagFilterRef,
    tierCounts,
    tierFilterOptions,
    toggleFilterTypeValue,
    toggleGroupFilterValue,
    togglePrivacyMode,
    toggleTagFilterValue,
    updateActiveAccountNoteForm,
    viewMode,
  } = props;
  const noteMfaInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!activeAccountNoteMode || !accountNoteFieldErrors.twoFactorSecret) return;
    const frame = window.requestAnimationFrame(() => {
      noteMfaInputRef.current?.scrollIntoView({ block: "nearest" });
      noteMfaInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeAccountNoteMode, accountNoteFieldErrors.twoFactorSecret]);
  const [recycleBinOpen, setRecycleBinOpen] = useState(false);
  const recycleBinButton = (
    <button type="button" className="btn btn-secondary" onClick={() => setRecycleBinOpen(true)}>
      <Trash2 size={14} /><span>{t("common.recycleBin.title")}</span>
    </button>
  );
  useEffect(() => {
    const reload = () => { void reloadCodexGroups(); };
    window.addEventListener(PELICAN_GROUPS_CHANGED, reload);
    return () => window.removeEventListener(PELICAN_GROUPS_CHANGED, reload);
  }, [reloadCodexGroups]);
  useModalScrollLock(Boolean(quickSwitchAccountId || editingApiKeyCredentialsId));
  return (
        <>
          {recycleBinOpen && <CodexRecycleBinModal
            onClose={() => setRecycleBinOpen(false)}
            maskAccountText={maskAccountText}
            onRestored={async () => {
              await store.fetchAccounts();
              await emitAccountsChanged({ platformId: "codex", reason: "restore" });
            }}
          />}
          {message && (
            <div
              className={`message-bar ${message.tone === "error" ? "error" : "success"}`}
            >
              {message.text}
              <button onClick={() => setMessage(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder={t("common.shared.search", "Tìm kiếm tài khoản...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="view-switcher">
                <button
                  className={`view-btn ${overviewLayoutMode === "compact" ? "active" : ""}`}
                  onClick={() => handleChangeOverviewLayoutMode("compact")}
                  title={t("accounts.view.compact", "Chế độ thu gọn")}
                >
                  <Rows3 size={16} />
                </button>
                <button
                  className={`view-btn ${overviewLayoutMode === "list" ? "active" : ""}`}
                  onClick={() => handleChangeOverviewLayoutMode("list")}
                  title={t("common.shared.view.list", "Dạng danh sách")}
                >
                  <List size={16} />
                </button>
                <button
                  className={`view-btn ${overviewLayoutMode === "grid" ? "active" : ""}`}
                  onClick={() => handleChangeOverviewLayoutMode("grid")}
                  title={t("common.shared.view.grid", "Dạng thẻ")}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
              <MultiSelectFilterDropdown
                options={tierFilterOptions}
                selectedValues={filterTypes}
                allLabel={t("codex.filters.allPlans", {
                  count: tierCounts.all,
                  defaultValue: "Mọi gói ({{count}})",
                })}
                filterLabel={t("common.shared.filterLabel", "Bộ lọc")}
                clearLabel={t("accounts.clearFilter", "Xóa bộ lọc")}
                emptyLabel={t("common.none", "None​")}
                ariaLabel={t("common.shared.filterLabel", "Bộ lọc")}
                onToggleValue={toggleFilterTypeValue}
                onClear={clearFilterTypes}
              />
              <div className="tag-filter" ref={tagFilterRef}>
                <button
                  type="button"
                  className={`tag-filter-btn ${tagFilter.length > 0 ? "active" : ""}`}
                  onClick={() => setShowTagFilter((prev) => !prev)}
                  aria-label={t("accounts.filterTags", "Lọc thẻ")}
                >
                  <Tag size={14} />
                  {tagFilter.length > 0
                    ? `${t("accounts.filterTagsCount", "Thẻ")}(${tagFilter.length})`
                    : t("accounts.filterTags", "Lọc thẻ")}
                </button>
                {showTagFilter && (
                  <div
                    ref={page.tagFilterPanelRef}
                    className={`tag-filter-panel ${page.tagFilterPanelPlacement === "top" ? "open-top" : ""}`}
                  >
                    {availableTags.length === 0 ? (
                      <div className="tag-filter-empty">
                        {t("accounts.noAvailableTags", "Không có thẻ nào")}
                      </div>
                    ) : (
                      <div
                        className="tag-filter-options"
                        style={page.tagFilterScrollContainerStyle}
                      >
                        {availableTags.map((tag) => (
                          <label
                            key={tag}
                            className={`tag-filter-option ${tagFilter.includes(tag) ? "selected" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={tagFilter.includes(tag)}
                              onChange={() => toggleTagFilterValue(tag)}
                            />
                            <span className="tag-filter-name">{tag}</span>
                            <button
                              type="button"
                              className="tag-filter-delete"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                requestDeleteTag(tag);
                              }}
                              aria-label={t("accounts.deleteTagAria", {
                                tag,
                                defaultValue: "Xóa thẻ {{tag}}",
                              })}
                            >
                              <X size={12} />
                            </button>
                          </label>
                        ))}
                      </div>
                    )}
                    <div className="tag-filter-divider" />
                    <label className="tag-filter-group-toggle">
                      <input
                        type="checkbox"
                        checked={groupByTag}
                        onChange={(e) => setGroupByTag(e.target.checked)}
                      />
                      <span>{t("accounts.groupByTag", "Nhóm theo thẻ")}</span>
                    </label>
                    {tagFilter.length > 0 && (
                      <button
                        type="button"
                        className="tag-filter-clear"
                        onClick={clearTagFilter}
                      >
                        {t("accounts.clearFilter", "Xóa bộ lọc")}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <SingleSelectFilterDropdown
                value={sortBy}
                options={codexAccountSortOptions}
                ariaLabel={t("common.shared.sortLabel", "Sắp xếp")}
                icon={<ArrowDownWideNarrow size={14} />}
                onChange={handleSortByChange}
              />
              {!isCustomSortActive && (
                <button
                  className="sort-direction-btn"
                  onClick={() =>
                    setSortDirection((prev) =>
                      prev === "desc" ? "asc" : "desc",
                    )
                  }
                  title={
                    sortDirection === "desc"
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
                  {sortDirection === "desc" ? "⬇" : "⬆"}
                </button>
              )}
            </div>
            <div className="toolbar-right">
              <button
                className="btn btn-primary icon-only"
                onClick={() => openCodexAddModal("tempLogin")}
                title={t("common.shared.addAccount", "Thêm tài khoản")}
              >
                <Plus size={14} />
              </button>
              <button
                className="btn btn-secondary icon-only"
                onClick={handleRefreshAll}
                disabled={refreshingAll || accounts.length === 0}
                title={t("common.shared.refreshAll", "Làm mới tất cả")}
              >
                <RefreshCw
                  size={14}
                  className={refreshingAll ? "loading-spinner" : ""}
                />
              </button>
              <button
                className="btn btn-secondary icon-only"
                onClick={togglePrivacyMode}
                title={
                  privacyModeEnabled
                    ? t("privacy.showSensitive", "Hiện email")
                    : t("privacy.hideSensitive", "Ẩn email")
                }
              >
                {privacyModeEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                className="btn btn-secondary export-btn icon-only"
                onClick={() => void handleExport(filteredIds)}
                disabled={exporting || filteredIds.length === 0}
                title={
                  exportSelectionCount > 0
                    ? `${t("common.shared.export.title", "Xuất")} (${exportSelectionCount})`
                    : t("common.shared.export.title", "Xuất")
                }
              >
                <Upload size={14} />
              </button>
              {!activeGroupId && (
                <button
                  className={`btn btn-secondary icon-only ${groupFilter.length > 0 ? "btn-filter-active" : ""}`}
                  onClick={() => setShowCodexGroupModal(true)}
                  title={
                    groupFilter.length > 0
                      ? `${t("accounts.groups.manageTitle", "Quản lý nhóm")} (${groupFilter.length})`
                      : t("accounts.groups.manageTitle", "Quản lý nhóm")
                  }
                >
                  <FolderOpen size={14} />
                </button>
              )}
              <QuickSettingsPopover type="codex" />
            </div>
          </div>

          {(accounts.length > 0 || codexGroups.length > 0) && (
            <div className="codex-overview-selection-bar account-selection-toolbar has-middle">
              <div className="codex-overview-selection-left">
                <label className="codex-overview-select-all">
                  <input
                    type="checkbox"
                    checked={isAllPaginatedSelected}
                    onChange={handleToggleSelectAllPaginated}
                    disabled={paginatedAccounts.length === 0}
                  />
                  <span>{t("common.selectAll", "Chọn tất cả")}</span>
                </label>
                {selected.size > 0 && !isAllFilteredSelectionActive && (
                  <>
                    <span className="codex-overview-selected-count">
                      {t(
                        "codex.apiService.customRoutingSelected",
                        "Đã chọn {{count}}",
                      ).replace("{{count}}", String(selected.size))}
                    </span>
                    <button
                      type="button"
                      className="codex-overview-clear-selection-btn"
                      onClick={handleClearOverviewSelection}
                    >
                      {t("messages.clearSelection", "Bỏ chọn")}
                    </button>
                  </>
                )}
                {canSelectAllFilteredAccounts && (
                  <button
                    type="button"
                    className="codex-overview-select-filtered-btn"
                    onClick={handleSelectAllFilteredAccounts}
                  >
                    {t("messages.selectAllFilteredAccounts", {
                      count: filteredIds.length,
                      defaultValue: "Chọn mọi kết quả {{count}}",
                    })}
                  </button>
                )}
                {isAllFilteredSelectionActive && (
                  <>
                    <span className="codex-overview-selected-count">
                      {t("messages.selectedAllFilteredAccounts", {
                        count: filteredIds.length,
                        defaultValue: "Đã chọn mọi kết quả {{count}}",
                      })}
                    </span>
                    <button
                      type="button"
                      className="codex-overview-clear-selection-btn"
                      onClick={handleClearOverviewSelection}
                    >
                      {t("messages.clearSelection", "Bỏ chọn")}
                    </button>
                  </>
                )}
              </div>

              <div className="account-selection-toolbar-middle">
                <PlatformGroupTabs
                  groups={codexGroups}
                  activeGroupId={activeGroupId}
                  accounts={accounts}
                  onSelectGroup={(groupId) => {
                    if (groupId === null) {
                      handleLeaveGroup();
                    } else {
                      handleEnterGroup(groupId);
                    }
                  }}
                  onOpenManage={() => setShowCodexGroupModal(true)}
                />
              </div>

              <div className="codex-overview-selection-actions">
                <button type="button" className="btn btn-secondary" onClick={() => useCodexPelicanStore.getState().open([...selected])}>
                  <Play size={14} /><span>{t('pelican.title')}</span>
                </button>
                {recycleBinButton}
                {hasDetectableFullQuotaWakeupAccounts && (
                  <button
                    type="button"
                    className="btn btn-secondary codex-overview-full-quota-wakeup-btn"
                    onClick={openFullQuotaWakeupTestModal}
                    title={t(
                      "codex.wakeup.fullQuotaActionTitle",
                      "Mở kiểm thử đánh thức tài khoản. Mặc định sắp xếp theo hạn mức 5h từ cao xuống thấp.",
                    )}
                  >
                    <Power size={14} />
                    <span>
                      {t("codex.wakeup.fullQuotaAction", "Đánh thức tài khoản")}
                    </span>
                  </button>
                )}
                {errorAccountIds.length > 0 && (
                  <button
                    className="btn btn-danger icon-only codex-overview-clear-error-btn"
                    onClick={handleClearErrorAccounts}
                    title={`${t("messages.cleanErrorAccountsAction", "Dọn tài khoản ERROR")} (${errorAccountIds.length})`}
                  >
                    <CircleAlert size={14} />
                  </button>
                )}
                {selected.size > 0 && (
                  <>
                    <button
                      className="btn btn-secondary icon-only"
                      onClick={() => setShowAddToCodexGroupModal(true)}
                      title={
                        activeGroupId
                          ? `${t("accounts.groups.moveToGroup")} (${selected.size})`
                          : `${t("codex.groups.addToGroup", "Thêm vào nhóm")} (${selected.size})`
                      }
                    >
                      <FolderPlus size={14} />
                    </button>
                    {activeGroup && (
                      <button
                        className="btn btn-secondary icon-only"
                        onClick={() => void handleRemoveFromGroup()}
                        title={t("accounts.groups.removeFromGroup")}
                        aria-label={t("accounts.groups.removeFromGroup")}
                      >
                        <LogOut size={14} />
                      </button>
                    )}
                    <button
                      className="btn btn-danger icon-only"
                      onClick={handleCodexBatchDelete}
                      title={`${t("common.delete", "Xóa")} (${selected.size})`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {loading && accounts.length === 0 ? (
            <div className="loading-container">
              <RefreshCw size={24} className="loading-spinner" />
              <p>{t("common.loading", "Đang tải...")}</p>
            </div>
          ) : accounts.length === 0 && !hasGroupEntryCards ? (
            <div className="empty-state">
              <Globe size={48} />
              <h3>{t("common.shared.empty.title", "Chưa có tài khoản")}</h3>
              <p>
                {t(
                  "codex.empty.description",
                  "Nhấn \"Thêm tài khoản\" để bắt đầu",
                )}
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  marginTop: "16px",
                }}
              >
                <button
                  className="btn btn-primary"
                  onClick={() => openCodexAddModal("tempLogin")}
                >
                  <Plus size={16} />
                  {t("common.shared.addAccount", "Thêm tài khoản")}
                </button>
                {recycleBinButton}
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent("app-request-navigate", {
                        detail: "manual",
                      }),
                    )
                  }
                >
                  <BookOpen size={16} />
                  {t("manual.navTitle", "Sổ tay sử dụng")}
                </button>
              </div>
            </div>
          ) : filteredAccounts.length === 0 && !hasGroupEntryCards ? (
            <div className="empty-state">
              <h3>{t("common.shared.noMatch.title", "Không có tài khoản phù hợp")}</h3>
              {recycleBinButton}
              <p>
                {t("common.shared.noMatch.desc", "Thử điều chỉnh tìm kiếm hoặc bộ lọc")}
              </p>
              {hasActiveOverviewFilters && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearAllOverviewFilters}
                >
                  {t("codex.filters.clearAll", "Xóa lọc")}
                </button>
              )}
            </div>
          ) : (
            <>
              {batchDeleteJob && (
                <div className="codex-batch-delete-job">
                  <div className="codex-batch-delete-job__head">
                    <div>
                      <strong>{t("common.recycleBin.move")}</strong>
                      <span>
                        {t("codex.batchDelete.summary", {
                          completed: batchDeleteJob.completed,
                          total: batchDeleteJob.total,
                          failed: batchDeleteJob.failed,
                        })}
                      </span>
                    </div>
                    <span
                      className={`codex-batch-delete-job__status ${batchDeleteJob.status}`}
                    >
                      {t(`codex.batchDelete.${batchDeleteJob.status}`)}
                    </span>
                  </div>
                  <div className="codex-batch-delete-job__progress">
                    <span
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round(
                            (batchDeleteJob.completed /
                              Math.max(1, batchDeleteJob.total)) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                  {batchDeleteJob.errors.length > 0 && (
                    <div className="codex-batch-delete-job__errors">
                      {batchDeleteJob.errors.slice(0, 5).map((item) => (
                        <span key={`${item.accountId}-${item.error}`}>
                          {item.accountId}: {item.error}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="codex-batch-delete-job__actions">
                    {batchDeleteJob.status === "running" && (
                      <button
                        className="btn btn-secondary"
                        onClick={handlePauseBatchDelete}
                        disabled={batchDeleteBusy}
                      >
                        <Pause size={14} />
                        <span>{t("codex.batchDelete.pause")}</span>
                      </button>
                    )}
                    {batchDeleteJob.status === "paused" && (
                      <button
                        className="btn btn-primary"
                        onClick={handleResumeBatchDelete}
                        disabled={batchDeleteBusy}
                      >
                        <Play size={14} />
                        <span>{t("codex.batchDelete.resume")}</span>
                      </button>
                    )}
                    {batchDeleteJob.status === "failed" &&
                      batchDeleteJob.failed > 0 && (
                        <button
                          className="btn btn-secondary"
                          onClick={handleRetryFailedBatchDelete}
                          disabled={batchDeleteBusy}
                        >
                          <RotateCw size={14} />
                          <span>{t("codex.batchDelete.retryFailed")}</span>
                        </button>
                      )}
                    {batchDeleteJob.status !== "running" && (
                      <button
                        className="btn btn-secondary"
                        onClick={handleClearBatchDelete}
                        disabled={batchDeleteBusy}
                      >
                        <X size={14} />
                        <span>{t("codex.batchDelete.clear")}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
              {batchImportSessionId &&
                !batchImportOpen &&
                !batchImportResult && (
                  <div className="codex-batch-import-task">
                    <div className="codex-batch-import-task__copy">
                      <strong>
                        {t(
                          "codex.batchImport.hiddenTask",
                          "Tác vụ nhập hàng loạt Codex",
                        )}
                      </strong>
                      <span>
                        {batchImportBusy
                          ? t(
                              "codex.batchImport.taskRunning",
                              "Đang xử lý {{current}} / {{total}}",
                            )
                              .replace(
                                "{{current}}",
                                String(batchImportProgress?.current ?? 0),
                              )
                              .replace(
                                "{{total}}",
                                String(
                                  batchImportProgress?.total ??
                                    batchImportPreview?.total ??
                                    0,
                                ),
                              )
                          : batchImportPreview
                            ? t(
                                "codex.batchImport.taskPreview",
                                "Đã có {{total}} bản xem trước",
                              ).replace(
                                "{{total}}",
                                String(batchImportPreview.total),
                              )
                            : t(
                                "codex.batchImport.preparing",
                                "Đang chuẩn bị nhập...",
                              )}
                      </span>
                    </div>
                    <div className="codex-batch-import-task__actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setBatchImportOpen(true)}
                      >
                        <FileText size={14} />
                        <span>{t("codex.batchImport.reopen", "Xem tác vụ")}</span>
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={handleDismissBatchImportTask}
                        title={
                          batchImportBusy
                            ? t(
                                "codex.batchImport.cancelAndDismiss",
                                "Hủy và bỏ",
                              )
                            : t("codex.batchImport.dismissTask", "Bỏ")
                        }
                      >
                        <X size={14} />
                        <span>
                          {batchImportBusy
                            ? t("common.cancel", "Hủy")
                            : t("codex.batchImport.dismissTask", "Bỏ")}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              {overviewLayoutMode === "compact" ? (
                <>
                  {inlineFolderCards && (
                    <div className="codex-group-entry-grid">
                      {inlineFolderCards}
                    </div>
                  )}
                  {groupByTag ? (
                    <div className="tag-group-list">
                      {paginatedGroupedAccounts.map(
                        ({ groupKey, items, totalCount }) => (
                          <div key={groupKey} className="tag-group-section">
                            <div className="tag-group-header">
                              <span className="tag-group-title">
                                {resolveGroupLabel(groupKey)}
                              </span>
                              <span className="tag-group-count">
                                {totalCount}
                              </span>
                            </div>
                            <div className="codex-compact-list">
                              {renderCompactRows(items, groupKey)}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="codex-compact-list">
                      {renderCompactRows(paginatedAccounts)}
                    </div>
                  )}
                </>
              ) : viewMode === "grid" ? (
                <div className="grid-view-container">
                  {!showOverviewSelectionBar &&
                    paginatedAccounts.length > 0 && (
                      <div
                        className="grid-view-header"
                        style={{ marginBottom: "12px", paddingLeft: "4px" }}
                      >
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            color: "var(--text-color)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isAllPaginatedSelected}
                            onChange={handleToggleSelectAllPaginated}
                          />
                          {t("common.selectAll", "Chọn tất cả")}
                        </label>
                      </div>
                    )}
                  {groupByTag ? (
                    <>
                      {inlineFolderCards && (
                        <div className="codex-group-entry-grid">
                          {inlineFolderCards}
                        </div>
                      )}
                      <div className="tag-group-list">
                        {paginatedGroupedAccounts.map(
                          ({ groupKey, items, totalCount }) => (
                            <div key={groupKey} className="tag-group-section">
                              <div className="tag-group-header">
                                <span className="tag-group-title">
                                  {resolveGroupLabel(groupKey)}
                                </span>
                                <span className="tag-group-count">
                                  {totalCount}
                                </span>
                              </div>
                              <div className="tag-group-grid codex-accounts-grid">
                                {renderGridCards(items, groupKey)}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="codex-accounts-grid">
                      {inlineFolderCards}
                      {renderGridCards(paginatedAccounts)}
                    </div>
                  )}
                </div>
              ) : groupByTag ? (
                <>
                  {inlineFolderCards && (
                    <div className="codex-group-entry-grid">
                      {inlineFolderCards}
                    </div>
                  )}
                  <div className="account-table-container grouped">
                    <table className="account-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>
                            {showOverviewSelectionBar ? null : (
                              <input
                                type="checkbox"
                                checked={isAllPaginatedSelected}
                                onChange={handleToggleSelectAllPaginated}
                              />
                            )}
                          </th>
                          <th style={{ width: 260 }}>
                            {t("common.shared.columns.email", "E-mail")}
                          </th>
                          <th style={{ width: 140 }}>
                            {t("common.shared.columns.plan", "Gói")}
                          </th>
                          <th style={{ width: 150 }}>
                            {t("codex.subscription.column", "Hết hạn")}
                          </th>
                          <th>{t("accounts.columns.quota", "Trạng thái hạn mức")}</th>
                          <th className="sticky-action-header table-action-header">
                            {t("common.shared.columns.actions", "Hành động")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedGroupedAccounts.map(
                          ({ groupKey, items, totalCount }) => (
                            <Fragment key={groupKey}>
                              <tr className="tag-group-row">
                                <td colSpan={6}>
                                  <div className="tag-group-header">
                                    <span className="tag-group-title">
                                      {resolveGroupLabel(groupKey)}
                                    </span>
                                    <span className="tag-group-count">
                                      {totalCount}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                              {renderTableRows(items, groupKey)}
                            </Fragment>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  {inlineFolderCards && (
                    <div className="codex-group-entry-grid">
                      {inlineFolderCards}
                    </div>
                  )}
                  <div className="account-table-container">
                    <table className="account-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}>
                            {showOverviewSelectionBar ? null : (
                              <input
                                type="checkbox"
                                checked={isAllPaginatedSelected}
                                onChange={handleToggleSelectAllPaginated}
                              />
                            )}
                          </th>
                          <th style={{ width: 260 }}>
                            {t("common.shared.columns.email", "E-mail")}
                          </th>
                          <th style={{ width: 140 }}>
                            {t("common.shared.columns.plan", "Gói")}
                          </th>
                          <th style={{ width: 150 }}>
                            {t("codex.subscription.column", "Hết hạn")}
                          </th>
                          <th>{t("accounts.columns.quota", "Trạng thái hạn mức")}</th>
                          <th className="sticky-action-header table-action-header">
                            {t("common.shared.columns.actions", "Hành động")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {renderGroupTableRows()}
                        {renderTableRows(paginatedAccounts)}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          <PaginationControls
            totalItems={pagination.totalItems}
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            pageSizeOptions={pagination.pageSizeOptions}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            canGoPrevious={pagination.canGoPrevious}
            canGoNext={pagination.canGoNext}
            onPageSizeChange={pagination.setPageSize}
            onPreviousPage={pagination.goToPreviousPage}
            onNextPage={pagination.goToNextPage}
          />

          {<CodexAddAccountDialog {...props} />}

          {quickSwitchAccountId && createPortal(
            <div className="modal-overlay codex-account-dialog-overlay">
              <div
                className="modal-content codex-add-modal codex-api-key-edit-modal codex-account-dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>{t("codex.quickSwitch.title", "Chuyển nhanh nhà cung cấp")}</h2>
                  <button
                    className="modal-close"
                    onClick={closeQuickSwitchModal}
                    aria-label={t("common.close", "Đóng")}
                    disabled={quickSwitchSubmitting}
                  >
                    <X />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="add-section">
                    <p className="section-desc">
                      {t(
                        "codex.quickSwitch.desc",
                        "Nhanh chóng chuyển tài khoản API Key này sang nhà cung cấp và API Key đã lưu.",
                      )}
                    </p>
                    {quickSwitchAccount && (
                      <div className="section-desc">
                        {t("codex.quickSwitch.currentAccount", {
                          defaultValue: "Tài khoản hiện tại: {{name}}",
                          name: maskAccountText(
                            resolvePresentation(quickSwitchAccount).displayName,
                          ),
                        })}
                      </div>
                    )}
                    <div className="oauth-link">
                      <label>
                        {t(
                          "codex.modelProviders.selectSavedProvider",
                          "Nhà cung cấp đã lưu",
                        )}
                      </label>
                      {managedProvidersLoading ? (
                        <div className="section-desc">
                          {t("common.loading", "Đang tải...")}
                        </div>
                      ) : managedProviders.length === 0 ? (
                        <div className="add-status error">
                          <CircleAlert size={16} />
                          <span>
                            {t(
                              "codex.quickSwitch.noProviders",
                              "Chưa có nhà cung cấp nào được lưu. Hãy thêm một mục trong Nhà cung cấp mô hình trước.",
                            )}
                          </span>
                        </div>
                      ) : (
                        <div className="api-provider-chip-list">
                          {managedProviders.map((provider) => (
                            <button
                              key={provider.id}
                              className={`api-provider-chip ${quickSwitchProviderId === provider.id ? "active" : ""}`}
                              onClick={() =>
                                handleSelectQuickSwitchProvider(provider.id)
                              }
                              type="button"
                              disabled={quickSwitchSubmitting}
                            >
                              <span>{provider.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedQuickSwitchProvider &&
                      selectedQuickSwitchProvider.apiKeys.length > 0 && (
                        <div className="oauth-link">
                          <label>
                            {t(
                              "codex.modelProviders.selectSavedApiKey",
                              "API Key đã lưu",
                            )}
                          </label>
                          <SingleSelectDropdown
                            className="codex-managed-api-key-select"
                            value={quickSwitchApiKeyId}
                            options={selectedQuickSwitchProvider.apiKeys.map(
                              (item) => ({
                                value: item.id,
                                label: formatCodexManagedApiKeyOptionLabel(
                                  item,
                                  t(
                                    "codex.modelProviders.unnamedKey",
                                    "Key chưa có tên",
                                  ),
                                ),
                              }),
                            )}
                            onChange={handleSelectQuickSwitchApiKey}
                            disabled={quickSwitchSubmitting}
                            placeholder={t(
                              "codex.modelProviders.selectSavedApiKeyPlaceholder",
                              "Chọn khóa API",
                            )}
                            ariaLabel={t(
                              "codex.modelProviders.selectSavedApiKey",
                              "API Key đã lưu",
                            )}
                          />
                          {selectedQuickSwitchProvider.apiKeys.length > 1 && (
                            <p className="api-provider-hint">
                              {t(
                                "codex.modelProviders.selectSavedApiKeyHint",
                                "Nhà cung cấp này có nhiều khóa API. Chọn một khóa tại đây.",
                              )}
                            </p>
                          )}
                        </div>
                      )}

                    {selectedQuickSwitchProvider &&
                      selectedQuickSwitchProvider.apiKeys.length === 0 && (
                        <div className="add-status error">
                          <CircleAlert size={16} />
                          <span>
                            {t(
                              "codex.quickSwitch.providerHasNoKeys",
                              "Nhà cung cấp này chưa có API Key khả dụng. Hãy thêm một key trong Nhà cung cấp mô hình trước.",
                            )}
                          </span>
                        </div>
                      )}

                    {quickSwitchError && (
                      <div className="add-status error">
                        <CircleAlert size={16} />
                        <span>{quickSwitchError}</span>
                      </div>
                    )}

                  </div>
                </div>
                    <div className="modal-footer api-key-edit-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setActiveTab("providers");
                          closeQuickSwitchModal();
                        }}
                        disabled={quickSwitchSubmitting}
                      >
                        {t("codex.quickSwitch.gotoProviders", "Quản lý nhà cung cấp")}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => void handleSubmitQuickSwitch()}
                        disabled={
                          quickSwitchSubmitting ||
                          managedProvidersLoading ||
                          !selectedQuickSwitchProvider ||
                          !selectedQuickSwitchApiKey
                        }
                      >
                        {quickSwitchSubmitting
                          ? t("common.saving", "Đang lưu...")
                          : t("codex.quickSwitch.apply", "Chuyển ngay")}
                      </button>
                    </div>
              </div>
            </div>,
            document.body,
          )}



          {editingApiKeyCredentialsId && createPortal(
            <div className="modal-overlay codex-account-dialog-overlay">
              <div
                className="modal-content codex-add-modal codex-api-key-edit-modal codex-provider-modal codex-account-dialog"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>{`${t("instances.actions.edit", "Chỉnh sửa")} ${t("codex.addModal.token", "API Key")}`}</h2>
                  <button
                    className="modal-close"
                    onClick={closeApiKeyCredentialsModal}
                    aria-label={t("common.close", "Đóng")}
                    disabled={savingApiKeyCredentials}
                  >
                    <X />
                  </button>
                </div>
                <div className="modal-body">
                  <div className="add-section">
                    <div className="oauth-link">
                      <label>
                        {t(
                          "codex.modelProviders.selectSavedProvider",
                          "Nhà cung cấp đã lưu",
                        )}
                      </label>
                      {managedProvidersLoading ? (
                        <div className="section-desc">
                          {t("common.loading", "Đang tải...")}
                        </div>
                      ) : managedProviders.length === 0 ? (
                        <div className="section-desc">
                          {t(
                            "codex.modelProviders.noSavedProviders",
                            "Chưa có nhà cung cấp nào được lưu. Bạn có thể điền trực tiếp các trường và hệ thống sẽ tự động lưu.",
                          )}
                        </div>
                      ) : (
                        <div className="api-provider-chip-list">
                          {managedProviders.map((provider) => (
                            <button
                              key={provider.id}
                              className={`api-provider-chip ${editingManagedProviderId === provider.id ? "active" : ""}`}
                              onClick={() =>
                                handleSelectEditingManagedProvider(provider.id)
                              }
                              type="button"
                              disabled={savingApiKeyCredentials}
                            >
                              <span>{provider.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedEditingManagedProvider &&
                      selectedEditingManagedProvider.apiKeys.length > 0 && (
                        <div className="oauth-link">
                          <label>
                            {t(
                              "codex.modelProviders.selectSavedApiKey",
                              "API Key đã lưu",
                            )}
                          </label>
                          <SingleSelectDropdown
                            className="codex-managed-api-key-select"
                            value={editingManagedProviderApiKeyId}
                            options={[
                              {
                                value: "",
                                label: t(
                                  "codex.modelProviders.manualApiKeyOption",
                                  "Nhập khóa mới theo cách thủ công",
                                ),
                              },
                              ...selectedEditingManagedProvider.apiKeys.map(
                                (item) => ({
                                  value: item.id,
                                  label: formatCodexManagedApiKeyOptionLabel(
                                    item,
                                    t(
                                      "codex.modelProviders.unnamedKey",
                                      "Key chưa có tên",
                                    ),
                                  ),
                                }),
                              ),
                            ]}
                            onChange={handleSelectEditingManagedProviderApiKey}
                            disabled={savingApiKeyCredentials}
                            placeholder={t(
                              "codex.modelProviders.selectSavedApiKeyPlaceholder",
                              "Chọn khóa API",
                            )}
                            ariaLabel={t(
                              "codex.modelProviders.selectSavedApiKey",
                              "API Key đã lưu",
                            )}
                          />
                          {selectedEditingManagedProvider.apiKeys.length >
                            1 && (
                            <p className="api-provider-hint">
                              {t(
                                "codex.modelProviders.selectSavedApiKeyHint",
                                "Nhà cung cấp này có nhiều khóa API. Chọn một khóa tại đây.",
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    <div className="oauth-link">
                      <label>{t("codex.api.provider.label", "Nhà cung cấp")}</label>
                      <div className="api-provider-chip-list">
                        <button
                          className={`api-provider-chip ${editingApiProviderPresetId === CODEX_API_PROVIDER_CUSTOM_ID ? "active" : ""}`}
                          onClick={() =>
                            handleSelectEditingApiProviderPreset(
                              CODEX_API_PROVIDER_CUSTOM_ID,
                            )
                          }
                          type="button"
                          disabled={savingApiKeyCredentials}
                        >
                          <span>
                            {t("codex.api.provider.custom", "Tùy chỉnh")}
                          </span>
                        </button>
                        {CODEX_API_PROVIDER_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            className={`api-provider-chip ${editingApiProviderPresetId === preset.id ? "active" : ""}`}
                            onClick={() =>
                              handleSelectEditingApiProviderPreset(preset.id)
                            }
                            type="button"
                            disabled={savingApiKeyCredentials}
                          >
                            <span>
                              {t(
                                `codex.api.providers.${preset.id}.name`,
                                preset.name,
                              )}
                            </span>
                            {preset.isPartner && (
                              <Star
                                size={12}
                                className="api-provider-chip-badge"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    {selectedEditingApiProviderPreset &&
                      selectedEditingApiProviderPreset.baseUrls.length > 1 && (
                        <div className="oauth-link">
                          <label>
                            {t("codex.api.provider.endpoint", "Điểm cuối nhà cung cấp")}
                          </label>
                          <div className="api-provider-endpoint-list">
                            {selectedEditingApiProviderPreset.baseUrls.map(
                              (baseUrl) => (
                                <button
                                  key={baseUrl}
                                  className={`api-provider-endpoint-chip ${editingApiBaseUrlCredentialsValue === baseUrl ? "active" : ""}`}
                                  onClick={() =>
                                    handleEditingApiBaseUrlCredentialsChange(
                                      baseUrl,
                                    )
                                  }
                                  type="button"
                                  disabled={savingApiKeyCredentials}
                                >
                                  {baseUrl}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    {selectedEditingApiProviderPreset && (
                      <div className="api-provider-hint-block">
                        <p className="api-provider-hint">
                          {t(
                            "codex.api.provider.hint",
                            "Base URL tương thích đã được điền tự động. Bạn vẫn có thể chỉnh sửa thủ công.",
                          )}
                        </p>
                        <div className="api-provider-links">
                          {selectedEditingApiProviderPreset.website && (
                            <button
                              className="btn btn-secondary"
                              onClick={() =>
                                void handleOpenProviderLink(
                                  selectedEditingApiProviderPreset.website ||
                                    "",
                                )
                              }
                              disabled={savingApiKeyCredentials}
                            >
                              <ExternalLink size={14} />
                              {t("codex.api.provider.website", "Trang web")}
                            </button>
                          )}
                          {selectedEditingApiProviderPreset.apiKeyUrl && (
                            <button
                              className="btn btn-secondary"
                              onClick={() =>
                                void handleOpenProviderLink(
                                  selectedEditingApiProviderPreset.apiKeyUrl ||
                                    "",
                                )
                              }
                              disabled={savingApiKeyCredentials}
                            >
                              <KeyRound size={14} />
                              {selectedEditingApiProviderPreset.id ===
                              COCKPIT_API_PROVIDER_ID
                                ? t("codex.api.provider.getApiKey", "Lấy khóa")
                                : t(
                                    "codex.api.provider.apiKeyPage",
                                    "Trang API Key",
                                  )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="oauth-link">
                      <label>{t("codex.addModal.token", "API Key")}</label>
                      <div className="oauth-url-box oauth-manual-input codex-secret-input">
                        <input
                          type={
                            editingApiKeyCredentialsVisible
                              ? "text"
                              : "password"
                          }
                          value={editingApiKeyCredentialsValue}
                          onChange={(e) =>
                            handleEditingApiKeyCredentialsChange(e.target.value)
                          }
                          disabled={savingApiKeyCredentials}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <button
                          type="button"
                          className="codex-secret-toggle-btn"
                          onClick={() =>
                            setEditingApiKeyCredentialsVisible(
                              (visible) => !visible,
                            )
                          }
                          disabled={savingApiKeyCredentials}
                          title={
                            editingApiKeyCredentialsVisible
                              ? t("codex.api.hideApiKey", "Ẩn API Key")
                              : t("codex.api.showApiKey", "Hiện API Key")
                          }
                          aria-label={
                            editingApiKeyCredentialsVisible
                              ? t("codex.api.hideApiKey", "Ẩn API Key")
                              : t("codex.api.showApiKey", "Hiện API Key")
                          }
                        >
                          {editingApiKeyCredentialsVisible ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="oauth-link">
                      <label>{t("codex.api.baseUrl", "Base URL")}</label>
                      <div className="oauth-url-box oauth-manual-input">
                        <input
                          type="text"
                          value={editingApiBaseUrlCredentialsValue}
                          onChange={(e) =>
                            handleEditingApiBaseUrlCredentialsChange(
                              e.target.value,
                            )
                          }
                          placeholder={t(
                            "codex.api.baseUrlPlaceholder",
                            "Để trống để dùng giá trị mặc định chính thức",
                          )}
                          disabled={savingApiKeyCredentials}
                        />
                      </div>
                    </div>
                    <div className="oauth-link">
                      <label>{t("codex.modelProviders.fields.wireApi", "Giao thức")}</label>
                      <div className="api-provider-chip-list">
                        <button type="button" className={`api-provider-chip ${editingApiWireApi === "responses" ? "active" : ""}`}
                          disabled={savingApiKeyCredentials} aria-pressed={editingApiWireApi === "responses"}
                          onClick={() => { setEditingApiWireApi("responses"); setEditingApiCredentialsError(null); }}>
                          {t("codex.modelProviders.wireApi.responses", "Responses gốc")}
                        </button>
                        <button type="button" className={`api-provider-chip ${editingApiWireApi === "chat_completions" ? "active" : ""}`}
                          disabled={savingApiKeyCredentials} aria-pressed={editingApiWireApi === "chat_completions"}
                          onClick={() => { setEditingApiWireApi("chat_completions"); setEditingApiSupportsWebsockets(false); setEditingApiCredentialsError(null); }}>
                          {t("codex.modelProviders.wireApi.chatCompletions", "Giao thức Chat Completions")}
                        </button>
                      </div>
                    </div>
                    {editingApiWireApi === "responses" && (
                      <div className="oauth-link">
                        <label>{t("codex.modelProviders.fields.supportsWebsockets", "Truyền tải WebSocket")}</label>
                        <label className="provider-vision-toggle">
                          <span className="provider-vision-toggle-copy">
                            <span className="provider-vision-toggle-title">
                              {t("codex.modelProviders.websockets.title", "Cho phép Codex dùng Responses qua WebSocket")}
                            </span>
                            <span className="provider-vision-toggle-desc">
                              {t("codex.modelProviders.websockets.help", "Chỉ bật khi nhà cung cấp hỗ trợ rõ ràng Responses qua WebSocket; hãy xác nhận phương thức truyền trong nhật ký Codex hoặc dịch vụ proxy.")}
                            </span>
                          </span>
                          <span className="provider-vision-switch">
                            <input type="checkbox" checked={editingApiSupportsWebsockets} disabled={savingApiKeyCredentials}
                              onChange={(event) => { setEditingApiSupportsWebsockets(event.target.checked); setEditingApiCredentialsError(null); }} />
                            <span className="provider-vision-switch-track" />
                          </span>
                        </label>
                      </div>
                    )}
                    {editingApiProviderPresetId !== COCKPIT_API_PROVIDER_ID && (
                      <div className="oauth-link">
                        <label>
                          {t(
                            "codex.modelProviders.newProviderName",
                            "Tên nhà cung cấp (tùy chọn, dùng cho tự động lưu)",
                          )}
                        </label>
                        <div className="oauth-url-box oauth-manual-input">
                          <input
                            type="text"
                            value={editingNewManagedProviderNameInput}
                            onChange={(e) =>
                              setEditingNewManagedProviderNameInput(
                                e.target.value,
                              )
                            }
                            placeholder={t(
                              "codex.modelProviders.newProviderNamePlaceholder",
                              "Nếu để trống, tên máy chủ sẽ được dùng tự động",
                            )}
                            disabled={savingApiKeyCredentials}
                          />
                        </div>
                      </div>
                    )}
                    {editingApiProviderPresetId !==
                      OPENAI_OFFICIAL_PRESET_ID && (
                      <>
                        <div className="api-model-catalog-panel">
                          <div className="api-model-catalog-header">
                            <label htmlFor="codex-api-model-catalog-edit">
                              {t("codex.api.modelCatalog.label", "Danh sách mô hình")}
                            </label>
                            <span className="api-model-catalog-count">
                              {t("codex.api.modelCatalog.count", {
                                defaultValue: "{{count}} mô hình",
                                count: editingApiModelCatalogDraft.length,
                              })}
                            </span>
                          </div>
                          <textarea
                            id="codex-api-model-catalog-edit"
                            className="form-input api-model-catalog-input"
                            rows={6}
                            value={editingApiModelCatalogInput}
                            onChange={(event) => {
                              setEditingApiModelCatalogInput(
                                event.target.value,
                              );
                              setEditingApiModelCatalogError(null);
                            }}
                            placeholder={t(
                              "codex.api.modelCatalog.placeholder",
                              "Nhập một ID mô hình trên mỗi dòng hoặc phân tách các ID bằng dấu phẩy.",
                            )}
                            disabled={savingApiKeyCredentials}
                            aria-describedby="codex-api-model-catalog-edit-hint"
                          />
                          <div className="api-model-catalog-toolbar">
                            <p
                              id="codex-api-model-catalog-edit-hint"
                              className="api-model-catalog-hint"
                            >
                              {t(
                                "codex.api.modelCatalog.editHint",
                                "Các mô hình đã lấy chỉ được thêm vào bản nháp này. Hãy xem lại và chỉnh sửa trước khi lưu.",
                              )}
                            </p>
                            <button
                              type="button"
                              className="btn btn-secondary api-model-catalog-fetch"
                              onClick={() =>
                                void handleFetchEditingApiModelCatalog()
                              }
                              disabled={
                                editingApiModelCatalogFetching ||
                                savingApiKeyCredentials ||
                                !editingApiKeyCredentialsValue.trim()
                              }
                            >
                              <RefreshCw
                                size={14}
                                className={
                                  editingApiModelCatalogFetching
                                    ? "loading-spinner"
                                    : undefined
                                }
                              />
                              {editingApiModelCatalogFetching
                                ? t(
                                    "codex.api.modelCatalog.fetching",
                                    "Đang lấy...",
                                  )
                                : t(
                                    "codex.api.modelCatalog.fetch",
                                    "Lấy từ nhà cung cấp",
                                  )}
                            </button>
                          </div>
                          {editingApiModelCatalogError && (
                            <div className="add-status error api-model-catalog-error">
                              <CircleAlert size={16} />
                              <span>{editingApiModelCatalogError}</span>
                            </div>
                          )}
                        </div>
                        {editingApiModelCatalogSyncAvailable && (
                          <label className="codex-import-api-service-toggle api-model-catalog-sync-toggle">
                            <span className="codex-import-api-service-toggle-copy">
                              <strong>
                                {t(
                                  "codex.api.modelCatalog.syncToggle",
                                  "Đồng bộ mô hình nhà cung cấp với Codex",
                                )}
                              </strong>
                              <small>
                                {t(
                                  "codex.api.modelCatalog.syncDescription",
                                  "Sau khi lưu, danh sách này được dùng để tạo danh mục mô hình Codex do Cockpit quản lý. Danh mục tùy chỉnh không bị ghi đè.",
                                )}
                              </small>
                            </span>
                            <input
                              type="checkbox"
                              checked={editingApiSyncModelCatalogToCodex}
                              disabled={savingApiKeyCredentials}
                              onChange={(event) => {
                                setEditingApiSyncModelCatalogToCodex(
                                  event.target.checked,
                                );
                                setEditingApiModelCatalogError(null);
                              }}
                            />
                            <span className="codex-import-api-service-switch" />
                          </label>
                        )}
                      </>
                    )}
                  </div>
                </div>
                    <ModalErrorMessage message={editingApiCredentialsError} position="bottom" />
                    <div className="modal-footer api-key-edit-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={closeApiKeyCredentialsModal}
                        disabled={savingApiKeyCredentials}
                      >
                        {t("common.cancel")}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => void handleSubmitApiKeyCredentials()}
                        disabled={
                          savingApiKeyCredentials ||
                          editingApiModelCatalogFetching ||
                          !editingApiKeyCredentialsValue.trim()
                        }
                      >
                        {savingApiKeyCredentials
                          ? t("common.saving", "Đang lưu...")
                          : t("common.save")}
                      </button>
                    </div>
              </div>
            </div>,
            document.body,
          )}

          {showCustomSortModal && (
            <div className="modal-overlay">
              <div
                className="modal codex-custom-sort-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-header">
                  <div>
                    <h2>
                      {t("codex.sort.customModalTitle", "Thứ tự tài khoản")}
                    </h2>
                    <p className="codex-custom-sort-modal-desc">
                      {t(
                        "codex.sort.customModalDesc",
                        "Kéo tài khoản hoặc dùng nút lên/xuống để chỉnh thứ tự hiển thị.",
                      )}
                    </p>
                  </div>
                  <button
                    className="modal-close"
                    onClick={() => setShowCustomSortModal(false)}
                    aria-label={t("common.close", "Đóng")}
                  >
                    <X />
                  </button>
                </div>
                <div className="modal-body">
                  <div
                    className={`codex-custom-sort-list ${
                      draggedCustomSortAccountId ? "is-sorting" : ""
                    }`}
                    onMouseUp={stopCustomSortDragging}
                    onMouseLeave={stopCustomSortDragging}
                  >
                    {customSortAccounts.map((account, index) => {
                      const presentation = resolvePresentation(account);
                      const isCurrent = overviewCurrentAccountId === account.id;
                      const isChatCompletionsApiKey =
                        isCodexChatCompletionsApiKeyAccount(account);
                      const quotaItems =
                        isChatCompletionsApiKey ||
                        (isCodexApiKeyAccount(account) &&
                          !isCodexNewApiAccount(account))
                          ? []
                          : presentation.quotaItems
                              .filter((item) => item.key !== "code_review")
                              .slice(0, 2);
                      const rowClass = [
                        "codex-custom-sort-row",
                        draggedCustomSortAccountId === account.id
                          ? "is-dragging"
                          : "",
                        draggedCustomSortAccountId &&
                        draggedCustomSortAccountId !== account.id
                          ? "is-drop-candidate"
                          : "",
                        draggedCustomSortAccountId &&
                        draggedCustomSortAccountId !== account.id &&
                        customSortDropTargetId === account.id
                          ? "is-drop-target"
                          : "",
                      ]
                        .join(" ")
                        .trim();

                      return (
                        <div
                          key={account.id}
                          className={rowClass}
                          onMouseEnter={() =>
                            handleCustomSortDragMove(account.id)
                          }
                        >
                          <div className="codex-custom-sort-row-main">
                            <button
                              type="button"
                              className="codex-custom-sort-drag-handle"
                              onMouseDown={(event) =>
                                handleCustomSortDragStart(event, account.id)
                              }
                              title={t(
                                "codex.sort.customDragHandle",
                                "Kéo để sắp xếp",
                              )}
                              aria-label={t(
                                "codex.sort.customDragHandle",
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
                                <span
                                  title={maskAccountText(
                                    presentation.displayName,
                                  )}
                                >
                                  {maskAccountText(presentation.displayName)}
                                </span>
                                {isCurrent && (
                                  <span className="mini-tag current">
                                    {t("codex.current", "Hiện tại")}
                                  </span>
                                )}
                                <span
                                  className={`tier-badge ${presentation.planClass || "unknown"}`}
                                >
                                  {presentation.planLabel}
                                </span>
                              </div>
                              <div className="codex-custom-sort-quota-line">
                                {quotaItems.length > 0 ? (
                                  quotaItems.map((item) => (
                                    <span
                                      key={`${account.id}-${item.key}`}
                                      className="codex-custom-sort-quota"
                                      title={item.hintText}
                                    >
                                      <span>{item.label}</span>
                                      <strong className={item.quotaClass}>
                                        {item.valueText}
                                      </strong>
                                    </span>
                                  ))
                                ) : isChatCompletionsApiKey ? null : (
                                  <span className="codex-custom-sort-quota-empty">
                                    {t(
                                      "common.shared.quota.noData",
                                      "Không có dữ liệu hạn mức",
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="codex-custom-sort-row-actions">
                            <button
                              type="button"
                              className="folder-icon-btn"
                              onClick={() =>
                                moveCustomSortAccount(account.id, "up")
                              }
                              disabled={index === 0}
                              title={t("codex.sort.customMoveUp", "Lên")}
                              aria-label={t("codex.sort.customMoveUp", "Lên")}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              type="button"
                              className="folder-icon-btn"
                              onClick={() =>
                                moveCustomSortAccount(account.id, "down")
                              }
                              disabled={index === customSortAccounts.length - 1}
                              title={t("codex.sort.customMoveDown", "Xuống")}
                              aria-label={t(
                                "codex.sort.customMoveDown",
                                "Xuống",
                              )}
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={resetCustomSortOrder}
                  >
                    <RotateCw size={14} />
                    {t("codex.sort.customReset", "Đặt lại thứ tự")}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowCustomSortModal(false)}
                  >
                    {t("common.confirm", "Xác nhận")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <ExportJsonModal
            isOpen={showExportModal}
            title={`${t("common.shared.export.title", "Xuất")} JSON`}
            jsonContent={formattedExportJsonContent}
            customContent={formattedExportModalCustomContent}
            errorMessage={exportModalError}
            errorScrollKey={exportModalErrorScrollKey}
            hidden={exportJsonHidden}
            copied={formattedExportJsonCopied}
            saving={formattedSavingExportJson}
            savedPath={formattedExportSavedPath}
            canOpenSavedDirectory={canOpenFormattedExportSavedDirectory}
            pathCopied={formattedExportPathCopied}
            toolbarContent={
              <>
                <span className="export-json-toolbar-label">
                  {t("codex.exportFormat.label", "Định dạng xuất")}
                </span>
                <div className="export-json-toolbar-dropdown">
                  <SingleSelectFilterDropdown
                    value={exportFormat}
                    options={exportFormatOptions}
                    ariaLabel={t("codex.exportFormat.label", "Định dạng xuất")}
                    onChange={(value) => {
                      if (value === "cpa" && exportHasAgentIdentity) {
                        reportExportModalError(
                          t(
                            "codex.exportFormat.agentIdentityCpaUnsupported",
                            "Không thể xuất tài khoản Agent Identity ở định dạng cpa. Hãy dùng Cockpit Tools hoặc sub2api.",
                          ),
                        );
                        return;
                      }
                      setExportFormat(value as CodexExportFormat);
                    }}
                  />
                </div>
                {exportHasAgentIdentity ? (
                  <div className="export-json-sensitive-notice">
                    <Info size={14} />
                    <span>
                      {t(
                        "codex.exportFormat.agentIdentityPrivateKeyNotice",
                        "Bản xuất này chứa khóa riêng Agent Identity có thể khôi phục tài khoản trên thiết bị khác. Hãy bảo vệ khóa như mật khẩu.",
                      )}
                    </span>
                  </div>
                ) : null}
                {exportCanIncludeSensitiveNotes ? (
                  <label
                    className="export-json-sensitive-toggle"
                    title={t(
                      "codex.accountNote.exportSensitiveToggleHint",
                      "Kiểm soát JSON xuất ra có gồm mã 2FA, mật khẩu, số điện thoại và URL email hay không.",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={includeExportSensitiveNotes}
                      onChange={(event) =>
                        setIncludeExportSensitiveNotes(event.target.checked)
                      }
                    />
                    <span className="export-json-sensitive-switch" />
                    <span>
                      {includeExportSensitiveNotes
                        ? t(
                            "codex.accountNote.exportSensitiveIncluded",
                            "Gồm ghi chú nhạy cảm",
                          )
                        : t(
                            "codex.accountNote.exportSensitiveExcluded",
                            "Loại ghi chú nhạy cảm",
                          )}
                    </span>
                    <Info size={14} />
                  </label>
                ) : null}
                {exportCanIncludeSensitiveNotes &&
                includeExportSensitiveNotes ? (
                  <div className="export-json-sensitive-notice">
                    <Info size={14} />
                    <span>
                      {t(
                        "codex.accountNote.exportSensitiveNotice",
                        "Bản xuất chứa mã 2FA, mật khẩu, số điện thoại hoặc URL email. Chỉ lưu vào vị trí tin cậy.",
                      )}
                    </span>
                  </div>
                ) : null}
              </>
            }
            onClose={handleCloseExportModal}
            onToggleHidden={handleToggleExportJsonHidden}
            onCopyJson={copyFormattedExportJson}
            onSaveJson={saveFormattedExportJson}
            onOpenSavedDirectory={openFormattedExportSavedDirectory}
            onCopySavedPath={copyFormattedExportSavedPath}
          />

          {showLocalAccessQuotaStatsModal && (
            <div className="modal-overlay codex-local-access-stats-overlay">
              <div
                className="modal codex-local-access-stats-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>
                    {t(
                      "codex.localAccess.quotaPool.modalTitle",
                      "Nhóm hạn mức dịch vụ API",
                    )}
                  </h2>
                  <button
                    className="modal-close"
                    onClick={() => setShowLocalAccessQuotaStatsModal(false)}
                    aria-label={t("common.close", "Đóng")}
                  >
                    <X />
                  </button>
                </div>
                <div className="modal-body">
                  {localAccessQuotaPoolSummary.visiblePlans.length === 0 ? (
                    <div className="codex-local-access-stats-empty">
                      {t("codex.localAccess.quotaPool.empty", "Chưa có thống kê hạn mức")}
                    </div>
                  ) : (
                    <div className="codex-local-access-stats-list">
                      {localAccessQuotaPoolSummary.visiblePlans.map((item) => (
                        <div
                          key={item.key}
                          className="codex-local-access-stats-row"
                        >
                          <div className="codex-local-access-stats-plan">
                            <strong>
                              {item.key} ({item.count})
                            </strong>
                          </div>
                          <div className="codex-local-access-stats-values">
                            {item.windows.map((window) => (
                              <span key={window.key}>
                                <b>
                                  {formatCodexQuotaPoolWindowLabel(
                                    window.label,
                                    localAccessQuotaPoolLabels.weekly,
                                  )}
                                </b>
                                <strong>
                                  {formatCodexQuotaPoolPercent(
                                    window.percentage,
                                  )}
                                </strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowLocalAccessQuotaStatsModal(false)}
                  >
                    {t("common.confirm", "Xác nhận")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showLocalAccessHideConfirm && (
            <div className="modal-overlay codex-local-access-hide-confirm-overlay">
              <div
                className="modal codex-local-access-hide-confirm-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>
                    {t(
                      "codex.localAccess.hideEntryAction",
                      "Ẩn mục Dịch vụ API",
                    )}
                  </h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      if (localAccessHideSubmitting) return;
                      setShowLocalAccessHideConfirm(false);
                    }}
                    aria-label={t("common.close", "Đóng")}
                    disabled={localAccessHideSubmitting}
                  >
                    <X />
                  </button>
                </div>
                <div className="modal-body">
                  <p className="codex-local-access-hide-confirm-desc">
                    {t(
                      "codex.localAccess.hideEntryConfirm",
                      "Thao tác này sẽ ẩn mục Dịch vụ API khỏi phần tổng quan và đồng thời tắt dịch vụ API hiện tại. Bạn có thể bật lại sau trong Cài đặt Codex hoặc Cài đặt nhanh.",
                    )}
                  </p>
                  <div className="codex-local-access-hide-confirm-points">
                    <div className="codex-local-access-hide-confirm-point">
                      <span className="codex-local-access-hide-confirm-dot" />
                      <span>
                        {t(
                          "codex.localAccess.hideEntryEffectHide",
                          "Ẩn mục Dịch vụ API khỏi phần tổng quan",
                        )}
                      </span>
                    </div>
                    <div className="codex-local-access-hide-confirm-point">
                      <span className="codex-local-access-hide-confirm-dot" />
                      <span>
                        {t(
                          "codex.localAccess.hideEntryEffectDisable",
                          "Tắt dịch vụ API hiện tại",
                        )}
                      </span>
                    </div>
                    <div className="codex-local-access-hide-confirm-point">
                      <span className="codex-local-access-hide-confirm-dot" />
                      <span>
                        {t(
                          "codex.localAccess.hideEntryEffectRestore",
                          "Bạn có thể bật lại trong Cài đặt Codex hoặc Cài đặt nhanh",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowLocalAccessHideConfirm(false)}
                    disabled={localAccessHideSubmitting}
                  >
                    {t("common.cancel", "Hủy")}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => void confirmHideLocalAccessEntry()}
                    disabled={localAccessHideSubmitting}
                  >
                    {localAccessHideSubmitting
                      ? t("common.processing", "Đang xử lý...")
                      : t("common.confirm", "Xác nhận")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {pendingWebSessionImport && (
            <div className="modal-overlay codex-local-access-hide-confirm-overlay codex-local-access-risk-notice-overlay">
              <div
                className="modal codex-local-access-hide-confirm-modal codex-local-access-risk-notice-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>
                    <CircleAlert size={18} />
                    {t(
                      "codex.webSessionImport.noticeTitle",
                      "Lưu ý Web Session",
                    )}
                  </h2>
                  <button
                    className="modal-close"
                    onClick={() => setPendingWebSessionImport(null)}
                    aria-label={t("common.close", "Đóng")}
                  >
                    <X />
                  </button>
                </div>
                <div className="modal-body">
                  <p className="codex-local-access-hide-confirm-desc">
                    {t(
                      "codex.webSessionImport.noticeMessage",
                      "{{count}} Web Session. Không dùng thật; chỉ xem hạn mức.",
                      { count: pendingWebSessionImport.accountLabels.length },
                    )}
                  </p>
                  <div className="codex-local-access-hide-confirm-points codex-local-access-risk-notice-points">
                    {pendingWebSessionImport.accountLabels.map(
                      (accountLabel, index) => (
                        <div
                          className="codex-local-access-hide-confirm-point"
                          key={`${accountLabel}-${index}`}
                        >
                          <span className="codex-local-access-hide-confirm-dot" />
                          <span>{maskAccountText(accountLabel)}</span>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="codex-local-access-hide-confirm-points codex-local-access-risk-notice-points">
                    <div className="codex-local-access-hide-confirm-point">
                      <span className="codex-local-access-hide-confirm-dot" />
                      <span>
                        {t(
                          "codex.webSessionImport.noticeQuotaOnly",
                          "Chỉ hạn mức. Không client/CLI/đổi tài khoản.",
                        )}
                      </span>
                    </div>
                    <div className="codex-local-access-hide-confirm-point">
                      <span className="codex-local-access-hide-confirm-dot" />
                      <span>
                        {t(
                          "codex.webSessionImport.noticeNoApi",
                          "Không vào API hay OAuth.",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setPendingWebSessionImport(null)}
                  >
                    {t("common.cancel", "Hủy")}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      const pending = pendingWebSessionImport;
                      setPendingWebSessionImport(null);
                      void performTokenImport(pending.content);
                    }}
                  >
                    {t(
                      "codex.webSessionImport.noticeConfirm",
                      "Đã hiểu, tiếp tục",
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {localAccessRiskNoticeAction && (
            <CodexLocalAccessRiskNoticeDialog action={localAccessRiskNoticeAction}
              remember={localAccessRiskNoticeRemember} onRememberChange={setLocalAccessRiskNoticeRemember}
              onClose={closeLocalAccessRiskNotice} />
          )}

          {resetCreditConfirmAccount && (
            <div className="modal-overlay codex-reset-credit-confirm-overlay">
              <div
                className="modal codex-reset-credit-confirm-modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="codex-reset-credit-confirm-visual">
                  <button
                    type="button"
                    className="modal-close codex-reset-credit-confirm-close"
                    onClick={closeResetCreditConfirmModal}
                    aria-label={t("common.close", "Đóng")}
                    disabled={isResetCreditConfirmSubmitting}
                  >
                    <X />
                  </button>
                  <div className="codex-reset-credit-confirm-icon">
                    <Terminal size={30} />
                    <RotateCw
                      size={18}
                      className="codex-reset-credit-confirm-icon-badge"
                    />
                  </div>
                </div>
                <div className="modal-body codex-reset-credit-confirm-body">
                  <h2>
                    {t(
                      "codex.quota.resetCreditDialogTitle",
                      "Đặt lại mức dùng?",
                    )}
                  </h2>
                  <p>
                    {t("codex.quota.resetCreditDialogDesc", {
                      count: resetCreditConfirmAvailableCount ?? 0,
                      defaultValue:
                        "Đặt lại giới hạn tốc độ để tiếp tục làm việc không gián đoạn. Lượt đặt lại còn lại: {{count}}.",
                    })}
                  </p>
                  <div className="codex-reset-credit-confirm-account">
                    <span>{t("common.shared.columns.email", "E-mail")}</span>
                    <strong>
                      {maskAccountText(
                        resolvePresentation(resetCreditConfirmAccount)
                          .displayName,
                      )}
                    </strong>
                  </div>
                  {resetCreditConfirmNextExpiresAt && (
                    <div className="codex-reset-credit-confirm-expiry">
                      <Clock size={14} />
                      <span>
                        {t("codex.quota.resetCreditNextExpiry", {
                          time: formatResetCreditTime(
                            resetCreditConfirmNextExpiresAt,
                          ),
                          defaultValue: "Hết hạn gần nhất: {{time}}",
                        })}
                      </span>
                    </div>
                  )}
                  <div className="codex-reset-credit-confirm-details">
                    <div className="codex-reset-credit-confirm-details-title">
                      {t("codex.quota.resetCreditDetailsTitle", "Chi tiết lượt đặt lại")}
                    </div>
                    {resetCreditConfirmLoading ? (
                      <div className="codex-reset-credit-confirm-empty">
                        <RefreshCw size={14} className="loading-spinner" />
                        <span>{t("common.loading", "Đang tải...")}</span>
                      </div>
                    ) : resetCreditConfirmCredits.length > 0 ? (
                      resetCreditConfirmCredits.map((credit, index) => (
                        <div
                          className="codex-reset-credit-confirm-detail"
                          key={
                            credit.id || `${credit.status || "credit"}-${index}`
                          }
                        >
                          <span
                            className={`codex-reset-credit-confirm-detail-status ${getResetCreditStatusTone(credit)}`}
                          >
                            {getResetCreditStatusLabel(credit)}
                          </span>
                          <span>
                            {t("codex.quota.resetCreditGrantedAt", "Được cấp")}：
                            <strong>
                              {formatResetCreditAbsoluteTime(credit.granted_at)}
                            </strong>
                          </span>
                          <span>
                            {t("codex.quota.resetCreditExpiresAt", "Hết hạn")}：
                            <strong>
                              {formatResetCreditTime(credit.expires_at)}
                            </strong>
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="codex-reset-credit-confirm-empty">
                        {t("codex.quota.resetCreditNoRecords", "Chưa có bản ghi đặt lại")}
                      </div>
                    )}
                  </div>
                  <ModalErrorMessage
                    message={resetCreditConfirmError}
                    scrollKey={resetCreditConfirmErrorScrollKey}
                    position="bottom"
                  />
                </div>
                <div className="modal-footer codex-reset-credit-confirm-footer">
                  <button
                    type="button"
                    className="btn btn-primary codex-reset-credit-confirm-action"
                    onClick={() => void handleConfirmConsumeResetCredit()}
                    disabled={
                      isResetCreditConfirmSubmitting ||
                      resetCreditConfirmLoading ||
                      resetCreditConfirmActionLocked ||
                      resetCreditConfirmAvailableCount == null ||
                      resetCreditConfirmAvailableCount <= 0
                    }
                  >
                    {isResetCreditConfirmSubmitting ? (
                      <>
                        <RefreshCw size={14} className="loading-spinner" />
                        {t("common.processing", "Đang xử lý...")}
                      </>
                    ) : (
                      t("codex.quota.resetCreditDialogAction", "Đặt lại mức dùng")
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {deleteConfirm && (
            <div className="modal-overlay">
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t("common.recycleBin.move")}</h2>
                  <button
                    className="modal-close"
                    onClick={() => !batchDeleteBusy && setDeleteConfirm(null)}
                    aria-label={t("common.close", "Đóng")}
                  >
                    <X />
                  </button>
                </div>
                <div className="modal-body">
                  <ModalErrorMessage
                    message={batchDeleteModalError || deleteConfirmError}
                    scrollKey={deleteConfirmErrorScrollKey}
                  />
                  <p>{t("common.recycleBin.confirmMove", { count: deleteConfirm.ids.length })}</p>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setDeleteConfirm(null)}
                    disabled={batchDeleteBusy}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={confirmCodexDelete}
                    disabled={batchDeleteBusy}
                  >
                    {batchDeleteBusy
                      ? t("common.processing", "Đang xử lý...")
                      : t("common.recycleBin.move")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tagDeleteConfirm && (
            <div className="modal-overlay">
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{t("common.confirm")}</h2>
                  <button
                    className="modal-close"
                    onClick={() => !deletingTag && setTagDeleteConfirm(null)}
                    aria-label={t("common.close", "Đóng")}
                  >
                    <X />
                  </button>
                </div>
                <div className="modal-body">
                  <ModalErrorMessage
                    message={tagDeleteConfirmError}
                    scrollKey={tagDeleteConfirmErrorScrollKey}
                  />
                  <p>
                    {t(
                      "accounts.confirmDeleteTag",
                      'Delete tag "{{tag}}"? This tag will be removed from {{count}} accounts.',
                      {
                        tag: tagDeleteConfirm.tag,
                        count: tagDeleteConfirm.count,
                      },
                    )}
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setTagDeleteConfirm(null)}
                    disabled={deletingTag}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={confirmDeleteTag}
                    disabled={deletingTag}
                  >
                    {deletingTag
                      ? t("common.processing", "Đang xử lý...")
                      : t("common.confirm")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {groupDeleteConfirm && (
            <div className="modal-overlay">
              <div
                className="modal"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="modal-header">
                  <h2>{t("accounts.groups.deleteTitle")}</h2>
                  <button
                    className="modal-close"
                    onClick={() => {
                      if (deletingGroup) return;
                      setGroupDeleteConfirm(null);
                      setGroupDeleteError(null);
                    }}
                    aria-label={t("common.close", "Đóng")}
                  >
                    <X />
                  </button>
                </div>
                <div className="modal-body">
                  <ModalErrorMessage
                    message={groupDeleteError}
                    scrollKey={groupDeleteErrorScrollKey}
                  />
                  <p>
                    {t("accounts.groups.deleteConfirm", {
                      name: groupDeleteConfirm.name,
                    })}
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setGroupDeleteConfirm(null);
                      setGroupDeleteError(null);
                    }}
                    disabled={deletingGroup}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => void confirmDeleteGroup()}
                    disabled={deletingGroup}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
            </div>
          )}

          <TagEditModal
            isOpen={!!showTagModal}
            resetKey={showTagModal}
            initialTags={
              accounts.find((a) => a.id === showTagModal)?.tags || []
            }
            availableTags={availableTags}
            onClose={() => setShowTagModal(null)}
            onSave={handleSaveTags}
          />

          {activeAccountNoteMode &&
            createPortal(
              <div className="modal-overlay">
                <div
                  className="modal codex-account-note-modal"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2>{t("codex.accountNote.title", "Ghi chú tài khoản")}</h2>
                    <button
                      className="modal-close"
                      onClick={closeAccountNoteModal}
                      aria-label={t("common.close", "Đóng")}
                      disabled={activeAccountNoteSaving}
                    >
                      <X />
                    </button>
                  </div>
                  <div className="modal-body">
                    <ModalErrorMessage
                      message={accountNoteError}
                      scrollKey={accountNoteErrorScrollKey}
                    />
                    <p className="codex-account-note-desc">
                      {t("codex.accountNote.desc", {
                        account: maskAccountText(activeAccountNoteDisplayName),
                        defaultValue:
                          "Thêm mật khẩu, 2FA, URL email, điện thoại và ghi chú khác cho {{account}}.",
                      })}
                    </p>
                    <div className="codex-account-note-field">
                      <span>{t("common.shared.columns.email", "E-mail")}</span>
                      {activeAccountNoteMode === "pendingOAuth" ? (
                        <>
                          <div className="codex-account-note-input-row">
                            <input
                              className={`codex-account-note-input ${
                                pendingOAuthFieldErrors.email ? "has-error" : ""
                              }`}
                              type="email"
                              value={pendingOAuthEmailInput}
                              onChange={(event) => {
                                handlePendingOAuthEmailInputChange(
                                  event.target.value,
                                );
                              }}
                              placeholder={t(
                                "codex.pendingAuth.emailPlaceholder",
                                "Nhập email tài khoản OpenAI",
                              )}
                              disabled={activeAccountNoteSaving}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="codex-account-note-icon-btn"
                              onClick={() =>
                                void copyAccountNoteValue(
                                  "modal:email",
                                  activeAccountNoteEmail,
                                )
                              }
                              disabled={
                                activeAccountNoteSaving ||
                                !activeAccountNoteEmail
                              }
                              aria-label={t("common.copy", "Copy​")}
                              title={t("common.copy", "Copy​")}
                            >
                              {accountNoteCopiedKey === "modal:email" ? (
                                <Check size={14} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                          {pendingOAuthFieldErrors.email ? (
                            <span className="codex-account-note-field-error">
                              {pendingOAuthFieldErrors.email}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <div className="codex-account-note-readonly-row">
                          <span
                            className={`codex-account-note-readonly-value ${
                              activeAccountNoteEmail ? "" : "is-empty"
                            }`}
                            title={activeAccountNoteEmail}
                          >
                            {activeAccountNoteEmail || "-"}
                          </span>
                          <button
                            type="button"
                            className="codex-account-note-icon-btn"
                            onClick={() =>
                              void copyAccountNoteValue(
                                "modal:email",
                                activeAccountNoteEmail,
                              )
                            }
                            disabled={
                              activeAccountNoteSaving || !activeAccountNoteEmail
                            }
                            aria-label={t("common.copy", "Copy​")}
                            title={t("common.copy", "Copy​")}
                          >
                            {accountNoteCopiedKey === "modal:email" ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    {activeAccountUsesPersonalAccessToken ? (
                      <label className="codex-account-note-field">
                        <span>
                          {t(
                            "codex.accountNote.workspaceIdLabel",
                            "ChatGPT Workspace ID",
                          )}
                        </span>
                        <div className="codex-account-note-input-row">
                          <input
                            className="codex-account-note-input"
                            type="text"
                            value={activeAccountNoteForm.chatgptAccountId}
                            onChange={(event) => {
                              updateActiveAccountNoteForm({
                                chatgptAccountId: event.target.value,
                              });
                            }}
                            placeholder={t(
                              "codex.accountNote.workspaceIdPlaceholder",
                              "Nhập UUID của nhóm / không gian làm việc",
                            )}
                            autoComplete="off"
                            spellCheck={false}
                            disabled={activeAccountNoteSaving}
                          />
                          <button
                            type="button"
                            className="codex-account-note-icon-btn"
                            onClick={() =>
                              void copyAccountNoteValue(
                                "modal:chatgptAccountId",
                                activeAccountNoteForm.chatgptAccountId,
                              )
                            }
                            disabled={
                              activeAccountNoteSaving ||
                              !activeAccountNoteForm.chatgptAccountId.trim()
                            }
                            aria-label={t("common.copy", "Copy​")}
                            title={t("common.copy", "Copy​")}
                          >
                            {accountNoteCopiedKey ===
                            "modal:chatgptAccountId" ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                        <small className="codex-account-note-field-hint">
                          {t(
                            "codex.accountNote.workspaceIdHint",
                            "Chỉ dành cho mã truy cập cá nhân at-*; Dịch vụ API gửi giá trị này dưới dạng ChatGPT-Account-Id.",
                          )}
                        </small>
                      </label>
                    ) : null}
                    <label className="codex-account-note-field">
                      <span>
                        {t("codex.accountNote.passwordLabel", "Mật khẩu")}
                      </span>
                      <div className="codex-account-note-input-row">
                        <input
                          className="codex-account-note-input"
                          type={
                            accountNotePasswordVisible ? "text" : "password"
                          }
                          value={activeAccountNoteForm.accountPassword}
                          onChange={(event) => {
                            updateActiveAccountNoteForm({
                              accountPassword: event.target.value,
                            });
                          }}
                          placeholder={t(
                            "codex.accountNote.passwordPlaceholder",
                            "Mật khẩu đăng nhập hoặc tạm thời",
                          )}
                          disabled={activeAccountNoteSaving}
                          autoFocus={activeAccountNoteMode !== "pendingOAuth"}
                        />
                        <button
                          type="button"
                          className="codex-account-note-icon-btn"
                          onClick={() =>
                            setAccountNotePasswordVisible((prev) => !prev)
                          }
                          disabled={activeAccountNoteSaving}
                          aria-label={
                            accountNotePasswordVisible
                              ? t("codex.accountNote.hide", "Ẩn")
                              : t("codex.accountNote.show", "Hiện")
                          }
                          title={
                            accountNotePasswordVisible
                              ? t("codex.accountNote.hide", "Ẩn")
                              : t("codex.accountNote.show", "Hiện")
                          }
                        >
                          {accountNotePasswordVisible ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="codex-account-note-icon-btn"
                          onClick={() =>
                            void copyAccountNoteValue(
                              "modal:password",
                              activeAccountNoteForm.accountPassword,
                            )
                          }
                          disabled={
                            activeAccountNoteSaving ||
                            !activeAccountNoteForm.accountPassword.trim()
                          }
                          aria-label={t("common.copy", "Copy​")}
                          title={t("common.copy", "Copy​")}
                        >
                          {accountNoteCopiedKey === "modal:password" ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </label>
                    <label className="codex-account-note-field">
                      <span>
                        {t(
                          "codex.accountNote.twoFactorSecretLabel",
                          "Mã bí mật 2FA",
                        )}
                      </span>
                      <div className="codex-account-note-input-row">
                        <input
                          ref={noteMfaInputRef}
                          className={`codex-account-note-input ${
                            accountNoteFieldErrors.twoFactorSecret
                              ? "has-error"
                              : ""
                          }`}
                          type={accountNoteSecretVisible ? "text" : "password"}
                          value={activeAccountNoteForm.twoFactorSecret}
                          onChange={(event) => {
                            updateActiveAccountNoteForm({
                              twoFactorSecret: event.target.value,
                            });
                          }}
                          placeholder={t(
                            "codex.accountNote.twoFactorSecretPlaceholder",
                            "Mã Base32 hoặc URI otpauth://",
                          )}
                          disabled={activeAccountNoteSaving}
                        />
                        <button
                          type="button"
                          className="codex-account-note-icon-btn"
                          onClick={() => {
                            refreshSavedMfaRecords();
                            setAccountNoteMfaPickerOpen((prev) => !prev);
                          }}
                          disabled={
                            activeAccountNoteSaving ||
                            savedMfaRecords.length === 0
                          }
                          aria-label={t(
                            "mfaQuick.selectLabel",
                            "Chọn khóa 2FA",
                          )}
                          title={t("mfaQuick.selectLabel", "Chọn khóa 2FA")}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="codex-account-note-icon-btn"
                          onClick={() =>
                            setAccountNoteSecretVisible((prev) => !prev)
                          }
                          disabled={activeAccountNoteSaving}
                          aria-label={
                            accountNoteSecretVisible
                              ? t("codex.accountNote.hide", "Ẩn")
                              : t("codex.accountNote.show", "Hiện")
                          }
                          title={
                            accountNoteSecretVisible
                              ? t("codex.accountNote.hide", "Ẩn")
                              : t("codex.accountNote.show", "Hiện")
                          }
                        >
                          {accountNoteSecretVisible ? (
                            <EyeOff size={14} />
                          ) : (
                            <Eye size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          className="codex-account-note-icon-btn"
                          onClick={() =>
                            void copyAccountNoteValue(
                              "modal:twoFactorSecret",
                              activeAccountNoteForm.twoFactorSecret,
                            )
                          }
                          disabled={
                            activeAccountNoteSaving ||
                            !activeAccountNoteForm.twoFactorSecret.trim()
                          }
                          aria-label={t("common.copy", "Copy​")}
                          title={t("common.copy", "Copy​")}
                        >
                          {accountNoteCopiedKey === "modal:twoFactorSecret" ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      {accountNoteMfaPickerOpen &&
                      savedMfaRecords.length > 0 ? (
                        <div
                          className="codex-account-note-mfa-picker"
                          role="listbox"
                          aria-label={t(
                            "mfaQuick.selectLabel",
                            "Chọn khóa 2FA",
                          )}
                        >
                          {savedMfaRecords.map((record) => {
                            const title = formatMfaRecordOption(
                              record,
                              t("mfaQuick.unnamedSecret", "Khóa chưa đặt tên"),
                            );
                            const remark = record.remark?.trim();
                            const isSelected =
                              record.secret.trim() ===
                              activeAccountNoteForm.twoFactorSecret.trim();
                            const token = getMfaOtpToken(record.secret);
                            return (
                              <button
                                key={record.id}
                                type="button"
                                className={`codex-account-note-mfa-option ${isSelected ? "is-selected" : ""}`}
                                onClick={() => {
                                  updateActiveAccountNoteForm({
                                    twoFactorSecret: record.secret,
                                  });
                                  setAccountNoteMfaPickerOpen(false);
                                }}
                              >
                                <span className="codex-account-note-mfa-option__main">
                                  <strong title={title}>{title}</strong>
                                  {remark ? (
                                    <em title={remark}>{remark}</em>
                                  ) : null}
                                </span>
                                <span className="codex-account-note-mfa-option__side">
                                  {isSelected ? <Check size={14} /> : null}
                                  {token ||
                                    formatMfaSecretPreview(record.secret)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {accountNoteFieldErrors.twoFactorSecret ? (
                        <span className="codex-account-note-field-error">
                          {accountNoteFieldErrors.twoFactorSecret}
                        </span>
                      ) : activeAccountNoteForm.twoFactorSecret.trim() &&
                        activeAccountNoteOtpToken ? (
                        <div className="codex-account-note-otp-preview">
                          <span>
                            {t("codex.accountNote.currentOtp", "Mã hiện tại")}
                          </span>
                          <strong>{activeAccountNoteOtpToken}</strong>
                          <button
                            type="button"
                            className="codex-account-note-icon-btn"
                            onClick={() =>
                              void copyAccountNoteValue(
                                "modal:otp",
                                activeAccountNoteOtpToken,
                              )
                            }
                            disabled={activeAccountNoteSaving}
                            aria-label={t("common.copy", "Copy​")}
                            title={t("common.copy", "Copy​")}
                          >
                            {accountNoteCopiedKey === "modal:otp" ? (
                              <Check size={14} />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                          <em>
                            {t("codex.accountNote.otpRemaining", {
                              defaultValue: "{{seconds}} giây",
                              seconds: mfaTimeRemaining,
                            })}
                          </em>
                        </div>
                      ) : activeAccountNoteForm.twoFactorSecret.trim() ? (
                        <span className="codex-account-note-field-error">
                          {t(
                            "codex.accountNote.twoFactorSecretInvalid",
                            "Mã bí mật 2FA không hợp lệ. Nhập mã Base32 hoặc URI otpauth://.",
                          )}
                        </span>
                      ) : null}
                    </label>
                    <label className="codex-account-note-field">
                      <span>
                        {t("codex.accountNote.mailUrlLabel", "URL email")}
                      </span>
                      <div className="codex-account-note-input-row">
                        <input
                          className="codex-account-note-input"
                          type="url"
                          value={activeAccountNoteForm.mailUrl}
                          onChange={(event) => {
                            updateActiveAccountNoteForm({
                              mailUrl: event.target.value,
                            });
                          }}
                          placeholder={t(
                            "codex.accountNote.mailUrlPlaceholder",
                            "Nhập URL trang tra cứu email mở được",
                          )}
                          disabled={activeAccountNoteSaving}
                        />
                        <button
                          type="button"
                          className="codex-account-note-icon-btn"
                          onClick={handleRefreshAccountNoteMailPreview}
                          disabled={
                            activeAccountNoteSaving ||
                            accountNoteMailPreviewLoading ||
                            !activeAccountNoteForm.mailUrl.trim()
                          }
                          aria-label={t(
                            "codex.accountNote.mailPreviewRefresh",
                            "Làm mới email",
                          )}
                          title={t(
                            "codex.accountNote.mailPreviewRefresh",
                            "Làm mới email",
                          )}
                        >
                          <RefreshCw
                            size={14}
                            className={
                              accountNoteMailPreviewLoading
                                ? "loading-spinner"
                                : ""
                            }
                          />
                        </button>
                        <button
                          type="button"
                          className="codex-account-note-icon-btn"
                          onClick={() => void handleOpenAccountNoteMailUrl()}
                          disabled={
                            activeAccountNoteSaving ||
                            !activeAccountNoteForm.mailUrl.trim()
                          }
                          aria-label={t(
                            "codex.accountNote.mailPreviewOpen",
                            "Mở trong trình duyệt",
                          )}
                          title={t(
                            "codex.accountNote.mailPreviewOpen",
                            "Mở trong trình duyệt",
                          )}
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          type="button"
                          className="codex-account-note-icon-btn"
                          onClick={() =>
                            void copyAccountNoteValue(
                              "modal:mailUrl",
                              activeAccountNoteForm.mailUrl,
                            )
                          }
                          disabled={
                            activeAccountNoteSaving ||
                            !activeAccountNoteForm.mailUrl.trim()
                          }
                          aria-label={t("common.copy", "Copy​")}
                          title={t("common.copy", "Copy​")}
                        >
                          {accountNoteCopiedKey === "modal:mailUrl" ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                      {accountNoteMailPreviewLoading ? (
                        <div className="codex-account-note-mail-preview is-loading">
                          {t(
                            "codex.accountNote.mailPreviewLoading",
                            "Đang đọc email...",
                          )}
                        </div>
                      ) : accountNoteMailPreviewError ? (
                        <span className="codex-account-note-field-error">
                          {accountNoteMailPreviewError}
                        </span>
                      ) : accountNoteMailPreview ? (
                        <div
                          key={`${accountNoteMailPreview.code}-${accountNoteMailPreview.fetchedAt}`}
                          className={`codex-account-note-mail-preview ${
                            accountNoteMailPreview.status === "changed"
                              ? "is-changed"
                              : ""
                          }`}
                        >
                          <div className="codex-account-note-mail-preview__code">
                            <span>
                              {t(
                                "codex.accountNote.mailPreviewCode",
                                "Mã email mới nhất",
                              )}
                            </span>
                            <strong>{accountNoteMailPreview.code}</strong>
                            <button
                              type="button"
                              className="codex-account-note-icon-btn"
                              onClick={() =>
                                void copyAccountNoteValue(
                                  "modal:mailCode",
                                  accountNoteMailPreview.code,
                                )
                              }
                              disabled={activeAccountNoteSaving}
                              aria-label={t("common.copy", "Copy​")}
                              title={t("common.copy", "Copy​")}
                            >
                              {accountNoteCopiedKey === "modal:mailCode" ? (
                                <Check size={14} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                          <p title={accountNoteMailPreview.snippet}>
                            {accountNoteMailPreview.snippet}
                          </p>
                          <em
                            className={`codex-account-note-mail-preview__status status-${accountNoteMailPreview.status}`}
                          >
                            {accountNoteMailPreview.status === "changed"
                              ? t(
                                  "codex.accountNote.mailPreviewStatusChanged",
                                  {
                                    defaultValue: "Mã mới · {{time}}",
                                    time: formatCodexAccountNoteMailPreviewTime(
                                      accountNoteMailPreview.fetchedAt,
                                    ),
                                  },
                                )
                              : accountNoteMailPreview.status === "unchanged"
                                ? t(
                                    "codex.accountNote.mailPreviewStatusUnchanged",
                                    {
                                      defaultValue: "Không đổi · {{time}}",
                                      time: formatCodexAccountNoteMailPreviewTime(
                                        accountNoteMailPreview.fetchedAt,
                                      ),
                                    },
                                  )
                                : t(
                                    "codex.accountNote.mailPreviewStatusInitial",
                                    {
                                      defaultValue: "Đã lấy lúc {{time}}",
                                      time: formatCodexAccountNoteMailPreviewTime(
                                        accountNoteMailPreview.fetchedAt,
                                      ),
                                    },
                                  )}
                          </em>
                          {accountNoteMailPreview.truncated ? (
                            <em>
                              {t(
                                "codex.accountNote.mailPreviewTruncated",
                                "Nội dung đã bị cắt",
                              )}
                            </em>
                          ) : null}
                        </div>
                      ) : null}
                    </label>
                    <label className="codex-account-note-field">
                      <span>
                        {t("codex.accountNote.phoneNumberLabel", "Điện thoại")}
                      </span>
                      <div className="codex-account-note-input-row">
                        <input
                          className="codex-account-note-input"
                          type="tel"
                          value={activeAccountNoteForm.phoneNumber}
                          onChange={(event) => {
                            updateActiveAccountNoteForm({
                              phoneNumber: event.target.value,
                            });
                          }}
                          placeholder={t(
                            "codex.accountNote.phoneNumberPlaceholder",
                            "Số điện thoại đã liên kết",
                          )}
                          disabled={activeAccountNoteSaving}
                        />
                        <button
                          type="button"
                          className="codex-account-note-icon-btn"
                          onClick={() =>
                            void copyAccountNoteValue(
                              "modal:phoneNumber",
                              activeAccountNoteForm.phoneNumber,
                            )
                          }
                          disabled={
                            activeAccountNoteSaving ||
                            !activeAccountNoteForm.phoneNumber.trim()
                          }
                          aria-label={t("common.copy", "Copy​")}
                          title={t("common.copy", "Copy​")}
                        >
                          {accountNoteCopiedKey === "modal:phoneNumber" ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>
                    </label>
                    <label className="codex-account-note-field">
                      <span>
                        {t("codex.accountNote.otherNoteLabel", "Ghi chú khác")}
                      </span>
                      <textarea
                        className="codex-account-note-textarea"
                        value={activeAccountNoteForm.note}
                        onChange={(event) => {
                          updateActiveAccountNoteForm({
                            note: event.target.value,
                          });
                        }}
                        placeholder={t(
                          "codex.accountNote.placeholder",
                          "Ghi chú bàn giao, email khôi phục hoặc chi tiết tài khoản",
                        )}
                        disabled={activeAccountNoteSaving}
                        rows={4}
                      />
                    </label>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn btn-secondary"
                      onClick={closeAccountNoteModal}
                      disabled={activeAccountNoteSaving}
                    >
                      {t("common.cancel", "Hủy")}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => void handleSubmitAccountNote()}
                      disabled={activeAccountNoteSaving}
                    >
                      {activeAccountNoteSaving
                        ? t("common.saving", "Đang lưu...")
                        : t("common.save", "Lưu")}
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )}

          <CodexGroupAccountPickerModal
            isOpen={!!groupQuickAddGroupId}
            targetGroup={groupQuickAddGroup}
            accounts={overviewAccounts}
            accountGroups={codexGroups}
            maskAccountText={maskAccountText}
            onClose={() => setGroupQuickAddGroupId(null)}
            onConfirm={({ accountIds }) =>
              handleQuickAddAccountsToGroup(groupQuickAddGroupId!, accountIds)
            }
          />

          <CodexAccountPoolHealthModal
            isOpen={showLocalAccessHealthModal}
            accountIds={localAccessCollection?.accountIds ?? []}
            accounts={accounts}
            accountHealth={localAccessState?.accountHealth ?? []}
            accountPoolHealth={localAccessState?.accountPoolHealth ?? []}
            recoverySuppressedAccountIds={
              localAccessState?.recoverySuppressedAccountIds ?? []
            }
            actionBusy={localAccessHealthActionBusy}
            maskAccountText={maskAccountText}
            onClose={() => setShowLocalAccessHealthModal(false)}
            onRecover={(accountId) =>
              handleRecoverLocalAccessAccounts([accountId])
            }
            onRecoverAll={handleRecoverLocalAccessAccounts}
            onReauthorize={(accountId) => {
              const account = accounts.find((item) => item.id === accountId);
              if (!account) return;
              setShowLocalAccessHealthModal(false);
              openCodexAddModal("tempLogin", account);
            }}
          />

          <CodexLocalAccessModal
            isOpen={showLocalAccessModal}
            mode={localAccessModalMode}
            state={localAccessState}
            addressKind={selectedLocalAccessAddressKind}
            addressOptions={localAccessAddressOptions}
            onAddressKindChange={handleLocalAccessAddressKindChange}
            accounts={accounts}
            accountsLoaded={store.accountsLoaded}
            accountGroups={codexGroups}
            onAddGrokMember={handleCreateGrokUpstreamAccount}
            memberView={
              localAccessModalMode === "members"
                ? {
                    accounts: filteredAccounts,
                    searchQuery,
                    filterTypes,
                    tagFilter,
                    groupFilter,
                    tierFilterOptions,
                    tierFilterAllLabel: t("common.shared.filter.all", {
                      count: tierCounts.all,
                    }),
                    availableTags,
                    groupFilterOptions: codexOverviewGroupFilterOptions,
                    onSearchQueryChange: setSearchQuery,
                    onToggleFilterType: toggleFilterTypeValue,
                    onClearFilterTypes: clearFilterTypes,
                    onToggleTagFilter: toggleTagFilterValue,
                    onClearTagFilter: clearTagFilter,
                    onToggleGroupFilter: toggleGroupFilterValue,
                    onClearGroupFilter: clearGroupFilter,
                  }
                : undefined
            }
            initialSelectedIds={localAccessModalSelectedIds}
            maskAccountText={maskAccountText}
            onClose={() => setShowLocalAccessModal(false)}
            onOpenFullPage={openCodexApiServicePage}
            onSaveAccounts={({
              accountIds,
              restrictFreeAccounts,
              backupAccountIds,
              preferredAccountIds,
              sessionAffinity,
              sessionAffinityTtlMs,
              imageGenerationAccountPolicies,
            }) =>
              handleSaveLocalAccessAccounts(accountIds, {
                restrictFreeAccounts,
                backupAccountIds,
                preferredAccountIds,
                sessionAffinity,
                sessionAffinityTtlMs,
                imageGenerationAccountPolicies,
              })
            }
            onClearStats={handleClearLocalAccessStats}
            onRefreshStats={reloadLocalAccessState}
            onUpdatePort={handleUpdateLocalAccessPort}
            onUpdateRoutingStrategy={handleUpdateLocalAccessRoutingStrategy}
            onUpdateCustomRouting={handleUpdateLocalAccessCustomRouting}
            onUpdateAccessScope={handleUpdateLocalAccessAccessScope}
            onUpdateDebugLogs={(debugLogs) =>
              codexLocalAccessService
                .updateCodexLocalAccessDebugLogs(debugLogs)
                .then(setLocalAccessState)
            }
            onUpdateImageGenerationModel={(model) =>
              codexLocalAccessService
                .updateCodexLocalAccessImageGenerationModel(model)
                .then(setLocalAccessState)
            }
            onUpdateImageGenerationMainModel={(model) =>
              codexLocalAccessService.updateCodexLocalAccessImageGenerationMainModel(model).then(setLocalAccessState)
            }
            onUpdateImageGenerationAccounts={(accountIds) =>
              codexLocalAccessService
                .updateCodexLocalAccessImageGenerationAccounts(accountIds)
                .then(setLocalAccessState)
            }
            onUpdateUpstreamProxyConfig={
              handleUpdateLocalAccessUpstreamProxyConfig
            }
            onRotateApiKey={handleRotateLocalAccessApiKey}
            onRestartSidecar={handleRestartLocalAccessSidecar}
            onKillPort={handleKillLocalAccessPort}
            onToggleEnabled={handleToggleLocalAccessEnabled}
            onRecoverAccounts={handleRecoverLocalAccessAccounts}
            healthActionBusy={localAccessHealthActionBusy}
            onStreamTestMessage={({ sessionId, modelId, messages }) =>
              codexLocalAccessService.streamCodexLocalAccessChatTest(
                sessionId,
                modelId,
                messages,
              )
            }
            saving={localAccessSaving}
            testing={false}
            starting={localAccessStarting}
            portCleanupBusy={localAccessPortKilling}
            sidecarRestarting={localAccessSidecarRestarting}
          />

          <CodexInstanceGatewaysModal
            isOpen={instanceGatewaysOpen}
            gateways={instanceGateways}
            loading={instanceGatewaysLoading}
            error={instanceGatewaysError}
            maskAccountText={maskAccountText}
            onRefresh={() => void refreshInstanceGateways()}
            onStopGateway={stopInstanceGateway}
            onRestartGateway={restartInstanceGateway}
            onClose={closeInstanceGateways}
          />

          {/* Codex 分组管理弹窗 */}
          <AccountGroupModal
            isOpen={showCodexGroupModal}
            onClose={() => setShowCodexGroupModal(false)}
            onGroupsChanged={reloadCodexGroups}
            platform="codex"
            onAddAccounts={(group) => {
              setShowCodexGroupModal(false);
              setGroupQuickAddGroupId(group.id);
            }}
          />

          {/* Codex 添加到分组弹窗 */}
          <AddToGroupModal
            isOpen={showAddToCodexGroupModal}
            onClose={() => setShowAddToCodexGroupModal(false)}
            platform="codex"
            accountIds={Array.from(selected)}
            sourceGroupId={activeGroupId ?? undefined}
            onAdded={reloadCodexGroups}
          />

        </>
      );
}
