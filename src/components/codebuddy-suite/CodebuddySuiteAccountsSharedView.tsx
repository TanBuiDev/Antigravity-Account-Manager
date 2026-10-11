import {
  useMemo,
  useCallback,
  Fragment,
  useState,
  useEffect,
  type ComponentType,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  X,
  Globe,
  KeyRound,
  Database,
  FileText,
  Copy,
  Check,
  RotateCw,
  LayoutGrid,
  List,
  Search,
  Tag,
  Play,
  Eye,
  EyeOff,
  CircleAlert,
  ChevronDown,
  ChevronLeft,
  ArrowRightLeft,
  CalendarCheck,
  ShieldCheck,
} from "lucide-react";
import { TagEditModal } from "../TagEditModal";
import { ExportJsonModal } from "../ExportJsonModal";
import { ModalErrorMessage } from "../ModalErrorMessage";
import { MfaQuickCodeSelect } from "../MfaQuickCodeSelect";
import { QuickSettingsPopover } from "../QuickSettingsPopover";
import { PaginationControls } from "../PaginationControls";
import { AccountSelectionToolbar } from "../AccountSelectionToolbar";
import { usePlatformAccountGroups } from "../../hooks/usePlatformAccountGroups";
import { useEscClose } from "../../hooks/useEscClose";
import { useEnterConfirm } from "../../hooks/useEnterConfirm";
import { useCodebuddySuitePage } from "../../hooks/useCodebuddySuitePage";
import type { UseProviderAccountsPageReturn } from "../../hooks/useProviderAccountsPage";
import {
  buildPaginatedGroups,
  buildPaginationPageSizeStorageKey,
  isEveryIdSelected,
  usePagination,
} from "../../hooks/usePagination";
import { KNOWN_PLAN_FILTERS } from "./CodebuddySuiteConfig";
import { DosageNotifyUsageStatus } from "../platform/DosageNotifyUsageStatus";
import { CodeBuddyQuotaCategoryList } from "../codebuddy/CodeBuddyQuotaCategoryList";
import {
  MultiSelectFilterDropdown,
  type MultiSelectFilterOption,
} from "../MultiSelectFilterDropdown";
import type {
  CodebuddySuiteAccountBase,
  QuotaCategoryGroup,
  CodebuddyUsage,
} from "../../types/codebuddy-suite";
import { buildValidAccountsFilterOption } from "../../utils/accountValidityFilter";
import {
  readAccountsOverviewFilterStringArray,
  removeAccountsOverviewFilterField,
  writeAccountsOverviewFilterField,
} from "../../utils/accountsOverviewFilterPersistence";
import { getAccountQuotaUpdatedAtMs } from "../../utils/codebuddy-suite/parser";

const FILTER_TYPES_FIELD = "filter_types";

interface CheckinModalProps<TAccount extends CodebuddySuiteAccountBase> {
  accounts: TAccount[];
  onClose: () => void;
  onCheckinComplete?: () => void;
}

export interface CodebuddySuiteAccountsPlatformConfig<
  TAccount extends CodebuddySuiteAccountBase,
> {
  pageClassName: string;
  quickSettingsType?: "codebuddy_cn" | "workbuddy" | "zcode" | "grok";
  searchPlaceholderKey: string;
  searchPlaceholderDefault: string;
  flowNotice: {
    titleKey: string;
    titleDefault: string;
    descKey: string;
    descDefault: string;
    permissionKey: string;
    permissionDefault: string;
    networkKey: string;
    networkDefault: string;
  };
  noAccountsKey: string;
  noAccountsDefault: string;
  addAccountTitleKey: string;
  addAccountTitleDefault: string;
  oauthDescKey: string;
  oauthDescDefault: string;
  oauthFeatureCardClassName: string;
  oauthFeatureTitleKey: string;
  oauthFeatureTitleDefault: string;
  oauthFeatureItem1Key: string;
  oauthFeatureItem1Default: string;
  oauthFeatureItem2Key: string;
  oauthFeatureItem2Default: string;
  oauthFeatureItem3Key: string;
  oauthFeatureItem3Default: string;
  oauthUrlInputPlaceholderKey: string;
  oauthUrlInputPlaceholderDefault: string;
  oauthWaitingKey: string;
  oauthWaitingDefault: string;
  oauthOpenButtonKey?: string;
  oauthOpenButtonDefault?: string;
  showOauthIncognitoOpenButton?: boolean;
  tokenTabLabelKey?: string;
  tokenTabLabelDefault?: string;
  tokenDescKey: string;
  tokenDescDefault: string;
  tokenInputPlaceholderKey?: string;
  tokenInputPlaceholderDefault?: string;
  tokenSubmitLabelKey?: string;
  tokenSubmitLabelDefault?: string;
  tokenInputSecret?: boolean;
  tokenControl?: ReactNode;
  tokenFields?: ReactNode;
  tokenSubmitDisabled?: boolean;
  /** 是否显示独立的「粘贴 JSON」页签（与 Token/API Key 页签分离） */
  showPasteJsonTab?: boolean;
  pasteJsonTabLabelKey?: string;
  pasteJsonTabLabelDefault?: string;
  pasteJsonDescKey?: string;
  pasteJsonDescDefault?: string;
  pasteJsonPlaceholderKey?: string;
  pasteJsonPlaceholderDefault?: string;
  pasteJsonSubmitLabelKey?: string;
  pasteJsonSubmitLabelDefault?: string;
  importLocalDescKey: string;
  importLocalDescDefault: string;
  importLocalClientKey: string;
  importLocalClientDefault: string;
  syncButtonTitle?: (t: UseProviderAccountsPageReturn["t"]) => string;
  syncSuccessMessage?: (
    t: UseProviderAccountsPageReturn["t"],
    count: number,
  ) => string;
  syncFailedMessage?: (
    t: UseProviderAccountsPageReturn["t"],
    error: string,
  ) => string;
  runSync?: () => Promise<number>;
  getDisplayEmail: (account: TAccount) => string;
  getPlanBadge: (account: TAccount) => string;
  getPlanBadgeTitle?: (account: TAccount) => string | null;
  getPlanBadgeClass?: (planBadge: string, account: TAccount) => string;
  getSearchText?: (account: TAccount) => string;
  getUsage: (account: TAccount) => CodebuddyUsage;
  getQuotaGroups: (
    account: TAccount,
    t: (key: string, defaultValue?: string) => string,
  ) => QuotaCategoryGroup[];
  hasQuotaData: (account: TAccount, groups: QuotaCategoryGroup[]) => boolean;
  usagePrefix: string;
  quotaPrefix: string;
  tableUsageClassName: string;
  oauthProviderControl?: ReactNode;
  showMfaQuickCode?: boolean;
  CheckinModal?: ComponentType<CheckinModalProps<TAccount>>;
  getReauthorizationReason?: (account: TAccount) => string | null;
  reauthorizingAccount?: TAccount | null;
  onReauthorize?: (account: TAccount) => void;
  /**
   * Optional full override for account-card/table quota section.
   * When provided, skips the default dosage-status + category list UI.
   */
  renderQuotaSection?: (
    account: TAccount,
    variant: "card" | "table",
  ) => ReactNode;
}

interface CodebuddySuiteAccountsSharedViewProps<
  TAccount extends CodebuddySuiteAccountBase,
> {
  accounts: TAccount[];
  loading: boolean;
  page: UseProviderAccountsPageReturn;
  platformConfig: CodebuddySuiteAccountsPlatformConfig<TAccount>;
  onRefreshAccounts: () => void;
}

export function CodebuddySuiteAccountsSharedView<
  TAccount extends CodebuddySuiteAccountBase,
>({
  accounts,
  loading,
  page,
  platformConfig,
  onRefreshAccounts,
}: CodebuddySuiteAccountsSharedViewProps<TAccount>) {
  const [filterTypes, setFilterTypes] = useState<string[]>(() =>
    page.filterPersistenceEnabled
      ? readAccountsOverviewFilterStringArray(
          page.filterPersistenceScope,
          FILTER_TYPES_FIELD,
        )
      : [],
  );
  const [tokenInputVisible, setTokenInputVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);

  const {
    t,
    locale,
    privacyModeEnabled,
    togglePrivacyMode,
    maskAccountText,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filterPersistenceEnabled,
    filterPersistenceScope,
    sortDirection,
    selected,
    toggleSelect,
    toggleSelectAll,
    tagFilter,
    groupByTag,
    setGroupByTag,
    showTagFilter,
    setShowTagFilter,
    showTagModal,
    setShowTagModal,
    tagFilterRef,
    availableTags,
    toggleTagFilterValue,
    clearTagFilter,
    tagDeleteConfirm,
    tagDeleteConfirmError,
    tagDeleteConfirmErrorScrollKey,
    setTagDeleteConfirm,
    deletingTag,
    confirmDeleteTag,
    openTagModal,
    handleSaveTags,
    refreshing,
    refreshingAll,
    injecting,
    handleRefresh,
    handleRefreshAll,
    handleDelete,
    handleBatchDelete,
    deleteConfirm,
    deleteConfirmError,
    deleteConfirmErrorScrollKey,
    setDeleteConfirm,
    deleting,
    confirmDelete,
    message,
    setMessage,
    exporting,
    handleExport,
    handleExportByIds,
    getScopedSelectedCount,
    showExportModal,
    exportJsonContent,
    exportJsonHidden,
    toggleExportJsonHidden,
    exportJsonCopied,
    copyExportJson,
    savingExportJson,
    saveExportJson,
    exportSavedPath,
    canOpenExportSavedDirectory,
    openExportSavedDirectory,
    copyExportSavedPath,
    exportPathCopied,
    closeExportModal,
    showAddModal,
    addTab,
    addStatus,
    addMessage,
    addErrorScrollKey,
    tokenInput,
    setTokenInput,
    importing,
    openAddModal,
    closeAddModal,
    handleTokenImport,
    handleImportJsonFile,
    handleImportFromLocal,
    handlePickImportFile,
    importFileInputRef,
    oauthUrl,
    oauthUrlCopied,
    oauthUserCode,
    oauthUserCodeCopied,
    oauthMeta,
    oauthPolling,
    oauthTimedOut,
    oauthPrepareError,
    oauthCompleteError,
    handleCopyOauthUrl,
    handleCopyOauthUserCode,
    handleRetryOauth,
    handleOpenOauthUrlWithMode,
    oauthManualCallbackInput,
    setOauthManualCallbackInput,
    oauthManualCallbackSubmitting,
    oauthManualCallbackError,
    oauthSupportsManualCallback,
    handleSubmitOauthCallbackUrl,
    handleInjectToVSCode,
    handleOpenWebview,
    webviewing,
    isFlowNoticeCollapsed,
    setIsFlowNoticeCollapsed,
    currentAccountId,
    formatDate,
    normalizeTag,
  } = page;
  const quotaNumberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale || undefined, { maximumFractionDigits: 2 }),
    [locale],
  );
  const quotaDateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale || undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [locale],
  );
  const formatLocalizedQuotaNumber = useCallback(
    (value: number) =>
      Number.isFinite(value)
        ? quotaNumberFormatter.format(Math.max(0, value))
        : "0",
    [quotaNumberFormatter],
  );
  const formatQuotaDateTime = useCallback(
    (timeMs: number | null) =>
      timeMs != null && Number.isFinite(timeMs)
        ? quotaDateTimeFormatter.format(new Date(timeMs))
        : "",
    [quotaDateTimeFormatter],
  );

  useEffect(() => {
    if (!showAddModal || addTab !== "token") setTokenInputVisible(false);
  }, [addTab, showAddModal]);

  useEscClose(showAddModal, closeAddModal);
  useEscClose(!!deleteConfirm && !deleting, () => setDeleteConfirm(null));
  useEnterConfirm(!!deleteConfirm && !deleting, () => {
    void confirmDelete();
  });
  useEscClose(!!tagDeleteConfirm && !deletingTag, () => setTagDeleteConfirm(null));
  useEnterConfirm(!!tagDeleteConfirm && !deletingTag, () => {
    void confirmDeleteTag();
  });
  useEscClose(showCheckinModal, () => setShowCheckinModal(false));

  useEffect(() => {
    if (!filterPersistenceEnabled) {
      removeAccountsOverviewFilterField(
        filterPersistenceScope,
        FILTER_TYPES_FIELD,
      );
      return;
    }
    writeAccountsOverviewFilterField(
      filterPersistenceScope,
      FILTER_TYPES_FIELD,
      filterTypes,
    );
  }, [filterPersistenceEnabled, filterPersistenceScope, filterTypes]);

  const toggleFilterTypeValue = useCallback((value: string) => {
    setFilterTypes((prev) => {
      if (prev.includes(value)) {
        return prev.filter((item) => item !== value);
      }
      return [...prev, value];
    });
  }, []);

  const clearFilterTypes = useCallback(() => {
    setFilterTypes([]);
  }, []);

  const handleSync = useCallback(async () => {
    if (!platformConfig.runSync) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const count = await platformConfig.runSync();
      setSyncMessage(platformConfig.syncSuccessMessage?.(t, count) ?? null);
      setTimeout(() => setSyncMessage(null), 3000);
    } catch (err) {
      setSyncMessage(
        platformConfig.syncFailedMessage?.(t, String(err)) ?? String(err),
      );
    } finally {
      setSyncing(false);
    }
  }, [platformConfig, t]);

  const isAbnormalAccount = useCallback(
    (account: TAccount) => !platformConfig.getUsage(account).isNormal,
    [platformConfig],
  );

  const platformKey = useMemo(() => {
    if (platformConfig.quickSettingsType) return platformConfig.quickSettingsType;
    const match = platformConfig.pageClassName.replace(/-accounts-page$/, '');
    return match || 'workbuddy';
  }, [platformConfig.pageClassName, platformConfig.quickSettingsType]);

  const grouping = usePlatformAccountGroups(platformKey, () => toggleSelectAll(Array.from(selected)));

  const groupFilteredAccounts = useMemo(
    () => grouping.filterAccountsByGroup(accounts),
    [accounts, grouping.filterAccountsByGroup],
  );

  const suitePage = useCodebuddySuitePage({
    accounts: groupFilteredAccounts,
    currentAccountId,
    searchQuery,
    filterTypes,
    tagFilter,
    sortDirection,
    getPlanBadge: platformConfig.getPlanBadge,
    getSearchText: platformConfig.getSearchText,
    isAbnormalAccount,
    normalizeTag,
    groupByTag,
  });

  const {
    tierSummary,
    filteredAccounts,
    filteredIds,
    groupedAccounts,
    resolvePlanKey,
    resolveTierBadgeClass,
  } = suitePage;

  const tierFilterOptions = useMemo<MultiSelectFilterOption[]>(() => {
    const options: MultiSelectFilterOption[] = [];
    KNOWN_PLAN_FILTERS.forEach((plan) => {
      const count = tierSummary.dynamicCounts.get(plan) ?? 0;
      if (count === 0) return;
      options.push({ value: plan, label: `${plan} (${count})` });
    });
    tierSummary.extraKeys.forEach((key) => {
      options.push({
        value: key,
        label: `${key} (${tierSummary.dynamicCounts.get(key) ?? 0})`,
      });
    });
    options.push(buildValidAccountsFilterOption(t, tierSummary.validCount));
    return options;
  }, [
    t,
    tierSummary.dynamicCounts,
    tierSummary.extraKeys,
    tierSummary.validCount,
  ]);

  const exportSelectionCount = getScopedSelectedCount(filteredIds);
  const pagination = usePagination({
    items: filteredAccounts,
    storageKey: buildPaginationPageSizeStorageKey(
      platformConfig.quickSettingsType ?? platformConfig.pageClassName,
    ),
  });
  const paginatedAccounts = pagination.pageItems;
  const paginatedIds = useMemo(
    () => paginatedAccounts.map((account) => account.id),
    [paginatedAccounts],
  );
  const paginatedGroupedAccounts = useMemo(
    () => buildPaginatedGroups(groupedAccounts, paginatedAccounts),
    [groupedAccounts, paginatedAccounts],
  );
  const isAllPaginatedSelected = useMemo(
    () => isEveryIdSelected(selected, paginatedIds),
    [paginatedIds, selected],
  );

  const resolveGroupLabel = (groupKey: string) =>
    groupKey === "__untagged__"
      ? t("accounts.defaultGroup", "Nhóm mặc định")
      : groupKey;

  const renderResourceQuotaItems = useCallback(
    (account: TAccount, _variant: "card" | "table") => {
      const groups = platformConfig.getQuotaGroups(
        account,
        t as (key: string, defaultValue?: string) => string,
      );
      return (
        <CodeBuddyQuotaCategoryList
          groups={groups}
          formatNumber={formatLocalizedQuotaNumber}
          formatDateTime={formatQuotaDateTime}
        />
      );
    },
    [formatLocalizedQuotaNumber, formatQuotaDateTime, platformConfig, t],
  );

  const renderUsageInfo = useCallback(
    (account: TAccount) => {
      const usage = platformConfig.getUsage(account);
      return (
        <DosageNotifyUsageStatus
          usage={usage}
          locale={locale}
          accountLabel={maskAccountText(
            platformConfig.getDisplayEmail(account),
          )}
          normalText={t(`${platformConfig.usagePrefix}.usageNormal`, "Bình thường")}
          abnormalText={t(
            `${platformConfig.usagePrefix}.usageAbnormal`,
            "Bất thường",
          )}
          viewDetailText={t(
            `${platformConfig.usagePrefix}.usageViewDetail`,
            "Xem chi tiết",
          )}
          detailTitle={t(
            `${platformConfig.usagePrefix}.usageDetailTitle`,
            "Chi tiết trạng thái sử dụng",
          )}
          accountText={t("common.shared.columns.account", "Tài khoản")}
          confirmText={t("common.confirm", "Xác nhận")}
          closeText={t("common.close", "Đóng")}
          classPrefix={platformConfig.usagePrefix}
        />
      );
    },
    [locale, maskAccountText, platformConfig, t],
  );

  const renderQuotaQuerySection = useCallback(
    (account: TAccount, variant: "card" | "table") => {
      if (platformConfig.renderQuotaSection) {
        return platformConfig.renderQuotaSection(account, variant);
      }

      const groups = platformConfig.getQuotaGroups(
        account,
        t as (key: string, defaultValue?: string) => string,
      );
      const hasQuotaData = platformConfig.hasQuotaData(account, groups);
      const refreshFailed = !!account.quota_query_last_error?.trim();
      const reauthorizationReason =
        platformConfig.getReauthorizationReason?.(account) || null;
      const shouldShowQuota = hasQuotaData;
      const statusText = refreshFailed
        ? t(
            `${platformConfig.quotaPrefix}.quotaQuery.failedRefreshCompact`,
            "Không thể truy vấn hạn mức",
          )
        : t(
            `${platformConfig.quotaPrefix}.quotaQuery.empty`,
            "Chưa có dữ liệu hạn mức",
          );
      const cachedWarningText = t(
        "common.shared.quota.cachedRefreshFailed",
        "Làm mới thất bại; đang hiển thị dữ liệu thành công gần nhất",
      );
      const updatedAtMs = getAccountQuotaUpdatedAtMs(account);
      const updatedAtText = updatedAtMs != null
        ? formatQuotaDateTime(updatedAtMs)
        : "";
      return (
        <>
          {reauthorizationReason && (
            <div
              className={`quota-error-inline ${variant === "table" ? "table" : ""}`}
            >
              <CircleAlert size={14} />
              <span title={reauthorizationReason}>{reauthorizationReason}</span>
              {platformConfig.onReauthorize && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline quota-error-action"
                  onClick={() => platformConfig.onReauthorize?.(account)}
                >
                  <KeyRound size={12} />
                  {t("common.reauthorize", "Ủy quyền lại")}
                </button>
              )}
            </div>
          )}
          <div className="quota-item">
            <div className="quota-header">
              <span className="quota-name">
                {t(`${platformConfig.usagePrefix}.usage`, "Trạng thái sử dụng")}
              </span>
              {renderUsageInfo(account)}
            </div>
          </div>
          <div
            className={`quota-item ${platformConfig.usagePrefix}-quota-item`}
          >
            <div
              className={`quota-header ${platformConfig.usagePrefix}-quota-header`}
            >
              <span className="quota-name">
                {t(
                  `${platformConfig.quotaPrefix}.quotaQuery.sectionTitle`,
                  "Truy vấn hạn mức",
                )}
              </span>
            </div>
            {refreshFailed && hasQuotaData && (
              <div className={`quota-cache-warning ${variant === "table" ? "table" : ""}`} role="status">
                <CircleAlert size={14} />
                <div className="quota-cache-warning-content">
                  <span className="quota-cache-warning-title">{cachedWarningText}</span>
                  {updatedAtText && (
                    <span className="quota-cache-warning-time">
                      {t("common.shared.quota.lastSuccessfulQuery", "Lần thành công gần nhất: {{time}}", {
                        time: updatedAtText,
                      })}
                    </span>
                  )}
                </div>
              </div>
            )}
            {shouldShowQuota ? (
              renderResourceQuotaItems(account, variant)
            ) : (
              <div
                className={`quota-empty quota-query-state ${refreshFailed ? "error" : "empty"}`}
                role={refreshFailed ? "status" : undefined}
              >
                <span className="quota-query-state-icon" aria-hidden="true">
                  {refreshFailed ? (
                    <CircleAlert size={16} />
                  ) : (
                    <Database size={16} />
                  )}
                </span>
                <span className="quota-query-state-text">{statusText}</span>
              </div>
            )}
          </div>
        </>
      );
    },
    [platformConfig, renderResourceQuotaItems, renderUsageInfo, t],
  );

  const renderGridCards = (items: typeof filteredAccounts, groupKey?: string) =>
    items.map((account) => {
      const displayEmail = platformConfig.getDisplayEmail(account);
      const planBadge = resolvePlanKey(account);
      const planBadgeTitle =
        platformConfig.getPlanBadgeTitle?.(account) || planBadge;
      const tierBadgeClass =
        platformConfig.getPlanBadgeClass?.(planBadge, account) ||
        resolveTierBadgeClass(planBadge);
      const accountTags = (account.tags || [])
        .map((tag) => tag.trim())
        .filter(Boolean);
      const visibleTags = accountTags.slice(0, 2);
      const moreTagCount = Math.max(0, accountTags.length - visibleTags.length);
      const isSelected = selected.has(account.id);
      const isCurrent = currentAccountId === account.id;
      return (
        <div
          key={groupKey ? `${groupKey}-${account.id}` : account.id}
          className={`ghcp-account-card ${isCurrent ? "current" : ""} ${isSelected ? "selected" : ""}`}
        >
          <div className="card-top">
            <div className="card-select">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(account.id)}
              />
            </div>
            <span
              className="account-email"
              title={maskAccountText(displayEmail)}
            >
              {maskAccountText(displayEmail)}
            </span>
            {isCurrent && (
              <span className="current-tag">
                {t("accounts.status.current", "Hiện tại")}
              </span>
            )}
            <span
              className={`tier-badge ${tierBadgeClass}`}
              title={planBadgeTitle}
            >
              {planBadge}
            </span>
          </div>
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
          <div className="ghcp-quota-section">
            {renderQuotaQuerySection(account, "card")}
          </div>
          <div className="card-footer">
            <span className="card-date">{formatDate(account.created_at)}</span>
            <div className="card-actions">
              <button
                className="card-action-btn success"
                onClick={() => handleInjectToVSCode?.(account.id)}
                disabled={!!injecting}
                title={t("common.shared.switchAccount", "Chuyển tài khoản")}
              >
                {injecting === account.id ? (
                  <RefreshCw size={14} className="loading-spinner" />
                ) : (
                  <Play size={14} />
                )}
              </button>
              <button
                className="card-action-btn"
                onClick={() => openTagModal(account.id)}
                title={t("accounts.editTags", "Chỉnh sửa thẻ")}
              >
                <Tag size={14} />
              </button>
              <button
                className="card-action-btn"
                onClick={() => handleRefresh(account.id)}
                disabled={refreshing === account.id}
                title={t("common.shared.refreshQuota", "Làm mới hạn mức")}
              >
                <RotateCw
                  size={14}
                  className={refreshing === account.id ? "loading-spinner" : ""}
                />
              </button>
              <button
                className="card-action-btn export-btn"
                onClick={() => handleExportByIds([account.id])}
                title={t("common.shared.export.title", "Xuất")}
              >
                <Upload size={14} />
              </button>
              {handleOpenWebview && (
                <button
                  className="card-action-btn"
                  onClick={() => handleOpenWebview(account.id)}
                  disabled={webviewing === account.id}
                  title={t("workbuddy.webview.open", "Mở phiên trên web")}
                >
                  {webviewing === account.id ? (
                    <RefreshCw size={14} className="loading-spinner" />
                  ) : (
                    <Globe size={14} />
                  )}
                </button>
              )}
              <button
                className="card-action-btn danger"
                onClick={() => handleDelete(account.id)}
                title={t("common.delete", "Xóa")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      );
    });

  const renderTableRows = (
    items: typeof filteredAccounts,
    _groupKey?: string,
  ) =>
    items.map((account) => {
      const displayEmail = platformConfig.getDisplayEmail(account);
      const planBadge = resolvePlanKey(account);
      const planBadgeTitle =
        platformConfig.getPlanBadgeTitle?.(account) || planBadge;
      const tierBadgeClass =
        platformConfig.getPlanBadgeClass?.(planBadge, account) ||
        resolveTierBadgeClass(planBadge);
      const isSelected = selected.has(account.id);
      const isCurrent = currentAccountId === account.id;
      return (
        <tr
          key={account.id}
          className={`${isCurrent ? "current-row" : ""} ${isSelected ? "selected-row" : ""}`}
        >
          <td>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(account.id)}
            />
          </td>
          <td>
            <span className="table-email" title={maskAccountText(displayEmail)}>
              {maskAccountText(displayEmail)}
            </span>
            {isCurrent && (
              <span className="current-tag">
                {t("accounts.status.current", "Hiện tại")}
              </span>
            )}
          </td>
          <td>
            <span
              className={`tier-badge ${tierBadgeClass}`}
              title={planBadgeTitle}
            >
              {planBadge}
            </span>
          </td>
          <td>
            <div className={platformConfig.tableUsageClassName}>
              {renderQuotaQuerySection(account, "table")}
            </div>
          </td>
          <td className="sticky-action-cell table-action-cell">
            <div className="action-buttons">
              <button
                className="action-btn success"
                onClick={() => handleInjectToVSCode?.(account.id)}
                disabled={!!injecting}
              >
                <Play size={14} />
              </button>
              <button
                className="action-btn"
                onClick={() => openTagModal(account.id)}
              >
                <Tag size={14} />
              </button>
              <button
                className="action-btn"
                onClick={() => handleRefresh(account.id)}
                disabled={refreshing === account.id}
              >
                <RotateCw
                  size={14}
                  className={refreshing === account.id ? "loading-spinner" : ""}
                />
              </button>
              <button
                className="action-btn"
                onClick={() => handleExportByIds([account.id])}
              >
                <Upload size={14} />
              </button>
              {handleOpenWebview && (
                <button
                  className="action-btn"
                  onClick={() => handleOpenWebview(account.id)}
                  disabled={webviewing === account.id}
                  title={t("workbuddy.webview.open", "Mở phiên trên web")}
                >
                  {webviewing === account.id ? (
                    <RefreshCw size={14} className="loading-spinner" />
                  ) : (
                    <Globe size={14} />
                  )}
                </button>
              )}
              <button
                className="action-btn danger"
                onClick={() => handleDelete(account.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </td>
        </tr>
      );
    });

  const CheckinModal = platformConfig.CheckinModal;

  return (
    <>
      <div
        className={`ghcp-flow-notice ${isFlowNoticeCollapsed ? "collapsed" : ""}`}
        role="note"
      >
        <button
          type="button"
          className="ghcp-flow-notice-toggle"
          onClick={() => setIsFlowNoticeCollapsed((prev) => !prev)}
        >
          <div className="ghcp-flow-notice-title">
            <CircleAlert size={16} />
            <span>
              {t(
                platformConfig.flowNotice.titleKey,
                platformConfig.flowNotice.titleDefault,
              )}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`ghcp-flow-notice-arrow ${isFlowNoticeCollapsed ? "collapsed" : ""}`}
          />
        </button>
        {!isFlowNoticeCollapsed && (
          <div className="ghcp-flow-notice-body">
            <div className="ghcp-flow-notice-desc">
              {t(
                platformConfig.flowNotice.descKey,
                platformConfig.flowNotice.descDefault,
              )}
            </div>
            <ul className="ghcp-flow-notice-list">
              <li>
                {t(
                  platformConfig.flowNotice.permissionKey,
                  platformConfig.flowNotice.permissionDefault,
                )}
              </li>
              <li>
                {t(
                  platformConfig.flowNotice.networkKey,
                  platformConfig.flowNotice.networkDefault,
                )}
              </li>
            </ul>
          </div>
        )}
      </div>

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

      {syncMessage && (
        <div className="message-bar success">
          {syncMessage}
          <button onClick={() => setSyncMessage(null)}>
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
              placeholder={t(
                platformConfig.searchPlaceholderKey,
                platformConfig.searchPlaceholderDefault,
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="view-switcher">
            <button
              className={`view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title={t("common.shared.view.list", "Dạng danh sách")}
            >
              <List size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title={t("common.shared.view.grid", "Dạng thẻ")}
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <MultiSelectFilterDropdown
            options={tierFilterOptions}
            selectedValues={filterTypes}
            allLabel={t('common.shared.filter.all', "Tất cả ({{count}})", { count: tierSummary.all })}
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
                  <>
                    <div className="tag-filter-header">
                      <label className="group-toggle">
                        <input
                          type="checkbox"
                          checked={groupByTag}
                          onChange={() => setGroupByTag(!groupByTag)}
                        />{" "}
                        {t("accounts.groupByTag", "Nhóm theo thẻ")}
                      </label>
                      {tagFilter.length > 0 && (
                        <button
                          className="tag-filter-clear"
                          onClick={clearTagFilter}
                        >
                          {t("common.shared.clear", "Xóa")}
                        </button>
                      )}
                    </div>
                    <div
                      className="tag-filter-list"
                      style={page.tagFilterScrollContainerStyle}
                    >
                      {availableTags.map((tag) => (
                        <label key={tag} className="tag-filter-item">
                          <input
                            type="checkbox"
                            checked={tagFilter.includes(tag)}
                            onChange={() => toggleTagFilterValue(tag)}
                          />
                          <span>{tag}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          <button
            className="btn btn-primary icon-only"
            onClick={() => openAddModal("oauth")}
            title={t("common.shared.addAccount", "Thêm tài khoản")}
          >
            <Plus size={14} />
          </button>
          {platformConfig.runSync && platformConfig.syncButtonTitle && (
            <button
              className="btn btn-secondary icon-only"
              onClick={handleSync}
              disabled={syncing || accounts.length === 0}
              title={platformConfig.syncButtonTitle(t)}
            >
              {syncing ? (
                <RefreshCw size={14} className="loading-spinner" />
              ) : (
                <ArrowRightLeft size={14} />
              )}
            </button>
          )}
          {CheckinModal && (
            <button
              className="btn btn-secondary icon-only"
              onClick={() => setShowCheckinModal(true)}
              disabled={accounts.length === 0}
              title={t("workbuddy.checkin.modalTitle", "Điểm danh hằng ngày")}
            >
              <CalendarCheck size={14} />
            </button>
          )}
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
            className="btn btn-secondary icon-only"
            onClick={() => openAddModal("token")}
            disabled={importing}
            title={t("common.shared.import.label", "Nhập")}
          >
            <Download size={14} />
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
          {platformConfig.quickSettingsType && (
            <QuickSettingsPopover type={platformConfig.quickSettingsType} />
          )}
        </div>
      </div>

      {(accounts.length > 0 || grouping.groups.length > 0) && (
        <AccountSelectionToolbar
          selectedCount={selected.size}
          allSelected={isAllPaginatedSelected}
          disabled={paginatedIds.length === 0}
          onToggleSelectAll={() => toggleSelectAll(paginatedIds)}
          onClearSelection={() => toggleSelectAll(Array.from(selected))}
          grouping={grouping}
          accounts={accounts}
          selectedIds={Array.from(selected)}
          actions={
            <button
              className="btn btn-danger icon-only"
              onClick={handleBatchDelete}
              title={`${t("common.delete", "Xóa")} (${selected.size})`}
              aria-label={`${t("common.delete", "Xóa")} (${selected.size})`}
            >
              <Trash2 size={14} />
            </button>
          }
        />
      )}

      {loading && accounts.length === 0 ? (
        <div className="loading-container">
          <RefreshCw size={24} className="loading-spinner" />
          <p>{t("common.loading", "Đang tải...")}</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="empty-state">
          <Globe size={48} />
          <h3>{t("common.shared.empty.title", "Chưa có tài khoản")}</h3>
          <p>
            {t(platformConfig.noAccountsKey, platformConfig.noAccountsDefault)}
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
              onClick={() => openAddModal("oauth")}
            >
              <Plus size={16} /> {t("common.shared.addAccount", "Thêm tài khoản")}
            </button>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="empty-state">
          <h3>{t("common.shared.noMatch.title", "Không có tài khoản phù hợp")}</h3>
          <p>{t("common.shared.noMatch.desc", "Thử điều chỉnh tìm kiếm hoặc bộ lọc")}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid-view-container">
          {groupByTag ? (
            <div className="tag-group-list">
              {paginatedGroupedAccounts.map(
                ({ groupKey, items, totalCount }) => (
                  <div key={groupKey} className="tag-group-section">
                    <div className="tag-group-header">
                      <span className="tag-group-title">
                        {resolveGroupLabel(groupKey)}
                      </span>
                      <span className="tag-group-count">{totalCount}</span>
                    </div>
                    <div className="tag-group-grid ghcp-accounts-grid">
                      {renderGridCards(items, groupKey)}
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="ghcp-accounts-grid">
              {renderGridCards(paginatedAccounts)}
            </div>
          )}
        </div>
      ) : groupByTag ? (
        <div className="account-table-container grouped">
          <table className="account-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={isAllPaginatedSelected}
                    onChange={() => toggleSelectAll(paginatedIds)}
                  />
                </th>
                <th style={{ width: 240 }}>
                  {t("common.shared.columns.email", "E-mail")}
                </th>
                <th style={{ width: 120 }}>
                  {t("common.shared.columns.plan", "Gói")}
                </th>
                <th>{t("instances.labels.quota", "Hạn ngạch")}</th>
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
                      <td colSpan={5}>
                        <div className="tag-group-header">
                          <span className="tag-group-title">
                            {resolveGroupLabel(groupKey)}
                          </span>
                          <span className="tag-group-count">{totalCount}</span>
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
      ) : (
        <div className="account-table-container">
          <table className="account-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={isAllPaginatedSelected}
                    onChange={() => toggleSelectAll(paginatedIds)}
                  />
                </th>
                <th style={{ width: 240 }}>
                  {t("common.shared.columns.email", "E-mail")}
                </th>
                <th style={{ width: 120 }}>
                  {t("common.shared.columns.plan", "Gói")}
                </th>
                <th>{t("instances.labels.quota", "Hạn ngạch")}</th>
                <th className="sticky-action-header table-action-header">
                  {t("common.shared.columns.actions", "Hành động")}
                </th>
              </tr>
            </thead>
            <tbody>{renderTableRows(paginatedAccounts)}</tbody>
          </table>
        </div>
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

      {showAddModal &&
        createPortal(
          <div className="modal-overlay account-add-modal-overlay">
            <div
              className={`modal-content ghcp-add-modal platform-account-add-modal ${platformConfig.pageClassName}-add-modal${
                platformConfig.showPasteJsonTab
                  ? " suite-account-add-modal-wide"
                  : ""
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <button
                  className="btn btn-secondary icon-only"
                  onClick={closeAddModal}
                  title={t("common.back", "Quay lại")}
                  aria-label={t("common.back", "Quay lại")}
                >
                  <ChevronLeft size={14} />
                </button>
                <h2>
                  {platformConfig.reauthorizingAccount
                    ? t("common.reauthorize", "Ủy quyền lại")
                    : t(
                        platformConfig.addAccountTitleKey,
                        platformConfig.addAccountTitleDefault,
                      )}
                </h2>
                <button
                  className="modal-close"
                  onClick={closeAddModal}
                  aria-label={t("common.close", "Đóng")}
                >
                  <X size={18} />
                </button>
              </div>
              {!platformConfig.reauthorizingAccount && (
                <div
                  className={`modal-tabs${
                    platformConfig.showPasteJsonTab
                      ? " modal-tabs-four"
                      : ""
                  }`}
                >
                  <button
                    className={`modal-tab ${addTab === "oauth" ? "active" : ""}`}
                    onClick={() => openAddModal("oauth")}
                  >
                    <Globe size={14} />
                    <span className="modal-tab-label">
                      {t("common.shared.addModal.oauth", "Ủy quyền OAuth")}
                    </span>
                  </button>
                  {/* 与 Codex 一致：OAuth | Token / JSON | API Key | 本地导入 */}
                  {platformConfig.showPasteJsonTab ? (
                    <>
                      <button
                        className={`modal-tab ${addTab === "paste" ? "active" : ""}`}
                        onClick={() => openAddModal("paste")}
                      >
                        <FileText size={14} />
                        <span className="modal-tab-label">
                          {t(
                            platformConfig.pasteJsonTabLabelKey ||
                              "common.shared.addModal.token",
                            platformConfig.pasteJsonTabLabelDefault ||
                              "Token / JSON",
                          )}
                        </span>
                      </button>
                      <button
                        className={`modal-tab ${addTab === "token" ? "active" : ""}`}
                        onClick={() => openAddModal("token")}
                      >
                        <KeyRound size={14} />
                        <span className="modal-tab-label">
                          {t(
                            platformConfig.tokenTabLabelKey ||
                              "common.shared.addModal.apiKey",
                            platformConfig.tokenTabLabelDefault || "API Key",
                          )}
                        </span>
                      </button>
                    </>
                  ) : (
                    <button
                      className={`modal-tab ${addTab === "token" ? "active" : ""}`}
                      onClick={() => openAddModal("token")}
                    >
                      <KeyRound size={14} />
                      <span className="modal-tab-label">
                        {t(
                          platformConfig.tokenTabLabelKey ||
                            "common.shared.addModal.token",
                          platformConfig.tokenTabLabelDefault || "Token / JSON",
                        )}
                      </span>
                    </button>
                  )}
                  <button
                    className={`modal-tab ${addTab === "json" ? "active" : ""}`}
                    onClick={() => openAddModal("json")}
                  >
                    <Database size={14} />
                    <span className="modal-tab-label">
                      {t("common.shared.addModal.import", "Nhập từ máy")}
                    </span>
                  </button>
                </div>
              )}
              <div className="modal-body">
                <ModalErrorMessage
                  message={addStatus === "error" ? addMessage : null}
                  scrollKey={addErrorScrollKey}
                />
                {platformConfig.showMfaQuickCode !== false && (
                  <MfaQuickCodeSelect />
                )}
                {addTab === "oauth" && (
                  <div className="add-section oauth-section">
                    {platformConfig.oauthProviderControl}
                    {platformConfig.reauthorizingAccount && (
                      <div className="oauth-reauthorization-target">
                        <KeyRound size={14} />
                        <span>{t("common.reauthorize", "Ủy quyền lại")}</span>
                        <strong>
                          {maskAccountText(
                            platformConfig.getDisplayEmail(
                              platformConfig.reauthorizingAccount,
                            ),
                          )}
                        </strong>
                      </div>
                    )}
                    <p className="section-desc">
                      {t(
                        platformConfig.oauthDescKey,
                        platformConfig.oauthDescDefault,
                      )}
                    </p>
                    {oauthPrepareError ? (
                      <div className="add-status error">
                        <CircleAlert size={16} />
                        <span>{oauthPrepareError}</span>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={handleRetryOauth}
                        >
                          {t("common.shared.oauth.retry", "Tạo lại thông tin ủy quyền")}
                        </button>
                      </div>
                    ) : oauthUrl ? (
                      <div className="oauth-url-section">
                        <div className="oauth-url-box">
                          <input
                            type="text"
                            value={oauthUrl}
                            readOnly
                            placeholder={t(
                              platformConfig.oauthUrlInputPlaceholderKey,
                              platformConfig.oauthUrlInputPlaceholderDefault,
                            )}
                          />
                          <button onClick={handleCopyOauthUrl}>
                            {oauthUrlCopied ? (
                              <Check size={16} />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </div>
                        {!oauthUrl.includes("user_code=") && oauthUserCode && (
                          <div className="oauth-url-box">
                            <input type="text" value={oauthUserCode} readOnly />
                            <button onClick={handleCopyOauthUserCode}>
                              {oauthUserCodeCopied ? (
                                <Check size={16} />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                          </div>
                        )}
                        {oauthMeta && (
                          <p className="oauth-hint">
                            {t(
                              "common.shared.oauth.meta",
                              "Hết hạn sau: {{expires}}s; chu kỳ thăm dò: {{interval}}s",
                              {
                                expires: oauthMeta.expiresIn,
                                interval: oauthMeta.intervalSeconds,
                              },
                            )}
                          </p>
                        )}
                        <div
                          className={
                            platformConfig.showOauthIncognitoOpenButton
                              ? "zcode-oauth-window-actions"
                              : undefined
                          }
                        >
                          <button
                            className="btn btn-primary btn-full"
                            onClick={() =>
                              void handleOpenOauthUrlWithMode(false)
                            }
                          >
                            <Globe size={16} />
                            {platformConfig.showOauthIncognitoOpenButton
                              ? t(
                                  "common.shared.oauth.normalWindow",
                                  "Cửa sổ thường",
                                )
                              : platformConfig.oauthOpenButtonKey
                                ? t(
                                    platformConfig.oauthOpenButtonKey,
                                    platformConfig.oauthOpenButtonDefault ??
                                      "Mở cửa sổ cấp quyền",
                                  )
                                : t(
                                    "common.shared.oauth.openBrowser",
                                    "Mở trong trình duyệt",
                                  )}
                          </button>
                          {platformConfig.showOauthIncognitoOpenButton && (
                            <button
                              className="btn btn-secondary btn-full"
                              onClick={() =>
                                void handleOpenOauthUrlWithMode(true)
                              }
                            >
                              <ShieldCheck size={16} />
                              {t(
                                "common.shared.oauth.incognitoWindow",
                                "Cửa sổ riêng tư",
                              )}
                            </button>
                          )}
                        </div>
                        {oauthPolling && (
                          <div className="add-status loading">
                            <RefreshCw size={16} className="loading-spinner" />
                            <span>
                              {t(
                                platformConfig.oauthWaitingKey,
                                platformConfig.oauthWaitingDefault,
                              )}
                            </span>
                          </div>
                        )}
                        {oauthCompleteError && (
                          <div className="add-status error">
                            <CircleAlert size={16} />
                            <span>{oauthCompleteError}</span>
                            {oauthTimedOut && (
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={handleRetryOauth}
                              >
                                {t(
                                  "common.shared.oauth.timeoutRetry",
                                  "Làm mới liên kết ủy quyền",
                                )}
                              </button>
                            )}
                          </div>
                        )}
                        {oauthSupportsManualCallback && (
                          <div className="oauth-manual-callback">
                            <label>
                              {t(
                                "common.shared.oauth.manualCallbackLabel",
                                "Nhập URL callback thủ công",
                              )}
                            </label>
                            <div className="oauth-url-box">
                              <input
                                type="text"
                                value={oauthManualCallbackInput}
                                onChange={(event) =>
                                  setOauthManualCallbackInput(
                                    event.target.value,
                                  )
                                }
                                placeholder={t(
                                  "common.shared.oauth.manualCallbackPlaceholder",
                                  "Dán đầy đủ URL callback, ví dụ: http://localhost:1455/auth/callback?code=...&state=...",
                                )}
                              />
                              <button
                                onClick={() =>
                                  void handleSubmitOauthCallbackUrl()
                                }
                                disabled={
                                  oauthManualCallbackSubmitting ||
                                  !oauthManualCallbackInput.trim()
                                }
                                title={t("common.confirm", "Xác nhận")}
                              >
                                {oauthManualCallbackSubmitting ? (
                                  <RefreshCw
                                    size={16}
                                    className="loading-spinner"
                                  />
                                ) : (
                                  <Check size={16} />
                                )}
                              </button>
                            </div>
                            {oauthManualCallbackError && (
                              <div className="add-status error">
                                <CircleAlert size={16} />
                                <span>{oauthManualCallbackError}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <p className="oauth-hint">
                          {t(
                            "common.shared.oauth.hint",
                            "Once authorized, this window will update automatically",
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="oauth-loading">
                        <RefreshCw size={24} className="loading-spinner" />
                        <span>
                          {t(
                            "common.shared.oauth.preparing",
                            "Đang chuẩn bị liên kết ủy quyền...",
                          )}
                        </span>
                      </div>
                    )}
                    <div
                      className={`oauth-feature-card ${platformConfig.oauthFeatureCardClassName} oauth`}
                    >
                      <p className="feature-title">
                        {t(
                          platformConfig.oauthFeatureTitleKey,
                          platformConfig.oauthFeatureTitleDefault,
                        )}
                      </p>
                      <ul className="feature-list">
                        <li>
                          {t(
                            platformConfig.oauthFeatureItem1Key,
                            platformConfig.oauthFeatureItem1Default,
                          )}
                        </li>
                        <li>
                          {t(
                            platformConfig.oauthFeatureItem2Key,
                            platformConfig.oauthFeatureItem2Default,
                          )}
                        </li>
                        <li>
                          {t(
                            platformConfig.oauthFeatureItem3Key,
                            platformConfig.oauthFeatureItem3Default,
                          )}
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
                {addTab === "token" && (
                  <div className="add-section token-section">
                    {platformConfig.tokenControl}
                    <p className="section-desc">
                      {t(
                        platformConfig.tokenDescKey,
                        platformConfig.tokenDescDefault,
                      )}
                    </p>
                    {platformConfig.tokenFields}
                    {platformConfig.tokenInputSecret ? (
                      <div className="token-secret-field">
                        <input
                          className="token-input"
                          type={tokenInputVisible ? "text" : "password"}
                          value={tokenInput}
                          autoComplete="off"
                          onChange={(e) => setTokenInput(e.target.value)}
                          placeholder={t(
                            platformConfig.tokenInputPlaceholderKey ||
                              "common.shared.token.placeholder",
                            platformConfig.tokenInputPlaceholderDefault ||
                              "Dán token hoặc JSON...",
                          )}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary icon-only token-secret-toggle"
                          onClick={() =>
                            setTokenInputVisible((visible) => !visible)
                          }
                          title={t(
                            tokenInputVisible ? "common.hide" : "common.show",
                            tokenInputVisible ? "Ẩn" : "Hiện",
                          )}
                          aria-label={t(
                            tokenInputVisible ? "common.hide" : "common.show",
                            tokenInputVisible ? "Ẩn" : "Hiện",
                          )}
                        >
                          {tokenInputVisible ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <textarea
                        className="token-input"
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        placeholder={t(
                          platformConfig.tokenInputPlaceholderKey ||
                            "common.shared.token.placeholder",
                          platformConfig.tokenInputPlaceholderDefault ||
                            "Dán token hoặc JSON...",
                        )}
                      />
                    )}
                    <button
                      className="btn btn-primary btn-full"
                      onClick={handleTokenImport}
                      disabled={
                        importing ||
                        !tokenInput.trim() ||
                        platformConfig.tokenSubmitDisabled
                      }
                    >
                      {importing ? (
                        <RefreshCw size={16} className="loading-spinner" />
                      ) : (
                        <Download size={16} />
                      )}
                      {t(
                        platformConfig.tokenSubmitLabelKey ||
                          "common.shared.token.import",
                        platformConfig.tokenSubmitLabelDefault || "Import",
                      )}
                    </button>
                  </div>
                )}
                {platformConfig.showPasteJsonTab && addTab === "paste" && (
                  <div className="add-section token-section">
                    <p className="section-desc">
                      {t(
                        platformConfig.pasteJsonDescKey ||
                          "common.shared.import.pasteDesc",
                        platformConfig.pasteJsonDescDefault ||
                          "Dán auth.json chính thức hoặc JSON tài khoản đầy đủ do ứng dụng xuất (có thông tin xác thực để có thể nhập khôi phục).",
                      )}
                    </p>
                    <textarea
                      className="token-input"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder={t(
                        platformConfig.pasteJsonPlaceholderKey ||
                          "common.shared.import.pastePlaceholder",
                        platformConfig.pasteJsonPlaceholderDefault ||
                          "Dán JSON tài khoản...",
                      )}
                    />
                    <button
                      className="btn btn-primary btn-full"
                      onClick={handleTokenImport}
                      disabled={importing || !tokenInput.trim()}
                    >
                      {importing ? (
                        <RefreshCw size={16} className="loading-spinner" />
                      ) : (
                        <Download size={16} />
                      )}
                      {t(
                        platformConfig.pasteJsonSubmitLabelKey ||
                          "common.shared.token.import",
                        platformConfig.pasteJsonSubmitLabelDefault ||
                          "Nhập JSON",
                      )}
                    </button>
                  </div>
                )}
                {addTab === "json" && (
                  <div className="add-section json-section">
                    <p className="section-desc">
                      {t(
                        platformConfig.importLocalDescKey,
                        platformConfig.importLocalDescDefault,
                      )}
                    </p>
                    <button
                      className="btn btn-secondary btn-full"
                      onClick={() => handleImportFromLocal?.()}
                      disabled={importing}
                    >
                      {importing ? (
                        <RefreshCw size={16} className="loading-spinner" />
                      ) : (
                        <Database size={16} />
                      )}
                      {t(
                        platformConfig.importLocalClientKey,
                        platformConfig.importLocalClientDefault,
                      )}
                    </button>
                    <div className="oauth-hint" style={{ margin: "8px 0 4px" }}>
                      {t("common.shared.import.orJson", "Hoặc nhập từ tệp JSON")}
                    </div>
                    <input
                      ref={importFileInputRef}
                      type="file"
                      accept="application/json"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        void handleImportJsonFile(file);
                      }}
                    />
                    <button
                      className="btn btn-primary btn-full"
                      onClick={handlePickImportFile}
                      disabled={importing}
                    >
                      {importing ? (
                        <RefreshCw size={16} className="loading-spinner" />
                      ) : (
                        <Database size={16} />
                      )}
                      {t("common.shared.import.pickFile", "Chọn tệp JSON để nhập")}
                    </button>
                  </div>
                )}

                {addStatus === "success" && (
                  <div className="add-status success">
                    <Check size={16} />
                    <span>
                      {addMessage ||
                        t("common.shared.loginSuccess", "Đăng nhập thành công")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div
            className="modal confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t("common.confirmDelete", "Xác nhận xóa")}</h2>
              <button
                className="modal-close"
                onClick={() => !deleting && setDeleteConfirm(null)}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage
                message={deleteConfirmError}
                scrollKey={deleteConfirmErrorScrollKey}
              />
              <p>{deleteConfirm.message}</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting
                  ? t("common.processing", "Đang xử lý...")
                  : t("common.confirm", "Xác nhận")}
              </button>
            </div>
          </div>
        </div>
      )}

      {tagDeleteConfirm && (
        <div className="modal-overlay">
          <div
            className="modal confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t("common.confirmDeleteTag", "Xác nhận xóa thẻ")}</h2>
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
                {t("common.deleteTagWarning", {
                  tag: tagDeleteConfirm,
                  defaultValue: 'Bạn có chắc muốn xóa nhãn "{{tag}}" khỏi tất cả tài khoản không?',
                })}
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setTagDeleteConfirm(null)}
                disabled={deletingTag}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDeleteTag}
                disabled={deletingTag}
              >
                {deletingTag
                  ? t("common.processing", "Đang xử lý...")
                  : t("common.confirm", "Xác nhận")}
              </button>
            </div>
          </div>
        </div>
      )}

      <ExportJsonModal
        isOpen={showExportModal}
        title={`${t("common.shared.export.title", "Xuất")} JSON`}
        jsonContent={exportJsonContent}
        hidden={exportJsonHidden}
        copied={exportJsonCopied}
        saving={savingExportJson}
        savedPath={exportSavedPath}
        canOpenSavedDirectory={canOpenExportSavedDirectory}
        pathCopied={exportPathCopied}
        onClose={closeExportModal}
        onToggleHidden={toggleExportJsonHidden}
        onCopyJson={copyExportJson}
        onSaveJson={saveExportJson}
        onOpenSavedDirectory={openExportSavedDirectory}
        onCopySavedPath={copyExportSavedPath}
      />

      <TagEditModal
        isOpen={!!showTagModal}
        initialTags={accounts.find((a) => a.id === showTagModal)?.tags || []}
        availableTags={availableTags}
        onClose={() => setShowTagModal(null)}
        onSave={handleSaveTags}
      />

      {showCheckinModal && CheckinModal && (
        <CheckinModal
          accounts={filteredAccounts}
          onClose={() => setShowCheckinModal(false)}
          onCheckinComplete={onRefreshAccounts}
        />
      )}
    </>
  );
}
