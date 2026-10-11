import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  Check,
  ChevronDown,
  ChevronLeft,
  CircleAlert,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LayoutGrid,
  List,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ExportJsonModal } from '../components/ExportJsonModal';
import { ModalErrorMessage } from '../components/ModalErrorMessage';
import { MfaQuickCodeSelect } from '../components/MfaQuickCodeSelect';
import { PaginationControls } from '../components/PaginationControls';
import { AccountSelectionToolbar } from '../components/AccountSelectionToolbar';
import { usePlatformAccountGroups } from '../hooks/usePlatformAccountGroups';
import { MultiSelectFilterDropdown, type MultiSelectFilterOption } from '../components/MultiSelectFilterDropdown';
import { QuickSettingsPopover } from '../components/QuickSettingsPopover';
import { SingleSelectFilterDropdown } from '../components/SingleSelectFilterDropdown';
import { TagEditModal } from '../components/TagEditModal';
import { ZedOverviewTabsHeader } from '../components/ZedOverviewTabsHeader';
import { usePlatformRuntimeSupport } from '../hooks/usePlatformRuntimeSupport';
import { useProviderAccountsPage } from '../hooks/useProviderAccountsPage';
import * as zedService from '../services/zedService';
import { useZedAccountStore } from '../stores/useZedAccountStore';
import {
  getZedAccountDisplayEmail,
  getZedEditPredictionsMetrics,
  getZedPlanBadge,
  hasZedQuotaData,
  type ZedAccount,
} from '../types/zed';
import { compareCurrentAccountFirst } from '../utils/currentAccountSort';
import {
  buildValidAccountsFilterOption,
  splitValidityFilterValues,
} from '../utils/accountValidityFilter';
import {
  buildPaginatedGroups,
  buildPaginationPageSizeStorageKey,
  isEveryIdSelected,
  usePagination,
} from '../hooks/usePagination';
import {
  normalizeAccountsOverviewScope,
  readAccountsOverviewFilterPersistenceEnabled,
  readAccountsOverviewFilterStringArray,
  removeAccountsOverviewFilterField,
  writeAccountsOverviewFilterField,
} from '../utils/accountsOverviewFilterPersistence';
import './ZedAccountsPage.css';

type ZedSortKey = 'created_at' | 'token_spend' | 'billing_end';

const ZED_FLOW_NOTICE_COLLAPSED_KEY = 'agtools.zed.flow_notice_collapsed';
const ZED_CURRENT_ACCOUNT_ID_KEY = 'agtools.zed.current_account_id';
const ZED_UNTAGGED_KEY = '__untagged__';
const ZED_FILTER_PERSISTENCE_SCOPE = normalizeAccountsOverviewScope('Zed');
const FILTER_TYPES_FIELD = 'filter_types';

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getZedPlanTone(planRaw?: string | null): string {
  const normalized = (planRaw || '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized.includes('enterprise') || normalized.includes('team')) return 'enterprise';
  if (normalized.includes('trial')) return 'trial';
  if (
    normalized.includes('pro') ||
    normalized.includes('plus') ||
    normalized.includes('ultra') ||
    normalized.includes('ultimate')
  ) {
    return 'pro';
  }
  if (normalized.includes('free')) return 'free';
  return 'unknown';
}

function getZedStatusTone(status?: string | null): 'normal' | 'warning' | 'forbidden' | 'neutral' {
  const normalized = (status || '').trim().toLowerCase();
  if (!normalized) return 'neutral';
  if (
    normalized.includes('cancel') ||
    normalized.includes('expire') ||
    normalized.includes('past_due') ||
    normalized.includes('past due') ||
    normalized.includes('suspend')
  ) {
    return 'forbidden';
  }
  if (normalized.includes('trial') || normalized.includes('pending')) {
    return 'warning';
  }
  if (normalized.includes('active')) {
    return 'normal';
  }
  return 'neutral';
}

function isZedAccountAbnormal(account: ZedAccount): boolean {
  if (account.has_overdue_invoices) {
    return true;
  }
  const tone = getZedStatusTone(account.subscription_status);
  return tone === 'warning' || tone === 'forbidden';
}

function formatDateTime(timestamp?: number | null, locale = 'zh-CN'): string {
  if (!timestamp) return '--';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString(locale);
}

function formatDateOnly(timestamp?: number | null, locale = 'zh-CN'): string {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

type ZedUsagePanelItem =
  | {
      key: string;
      variant: 'simple';
      label: string;
      value: string;
      detail: string;
      title: string;
      tone?: 'high' | 'medium' | 'low';
    }
  | {
      key: string;
      variant: 'metric';
      label: string;
      value: string;
      detail: string;
      title: string;
      usedText: string;
      leftText: string;
      progressPercent: number;
      tone: 'high' | 'medium' | 'low';
    };

type ZedUsagePanel = {
  headline: string;
  note: string;
  items: ZedUsagePanelItem[];
  title: string;
};

function formatQuotaCount(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
    Math.max(0, Math.round(value)),
  );
}

function getQuotaTone(progressPercent: number): 'high' | 'medium' | 'low' {
  const remaining = Math.max(0, Math.min(100, 100 - progressPercent));
  if (remaining <= 10) return 'low';
  if (remaining <= 30) return 'medium';
  return 'high';
}

export function ZedAccountsPage() {
  const { t } = useTranslation();
  const isMacOS = usePlatformRuntimeSupport('macos-only');
  const store = useZedAccountStore();
  const [filterTypes, setFilterTypes] = useState<string[]>(() =>
    readAccountsOverviewFilterPersistenceEnabled(ZED_FILTER_PERSISTENCE_SCOPE)
      ? readAccountsOverviewFilterStringArray(ZED_FILTER_PERSISTENCE_SCOPE, FILTER_TYPES_FIELD)
      : [],
  );

  const page = useProviderAccountsPage<ZedAccount>({
    platformKey: 'Zed',
    oauthLogPrefix: 'ZedOAuth',
    flowNoticeCollapsedKey: ZED_FLOW_NOTICE_COLLAPSED_KEY,
    currentAccountIdKey: ZED_CURRENT_ACCOUNT_ID_KEY,
    exportFilePrefix: 'zed_accounts',
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
      startLogin: zedService.zedOauthLoginStart,
      completeLogin: zedService.zedOauthLoginComplete,
      cancelLogin: zedService.zedOauthLoginCancel,
      submitCallbackUrl: zedService.zedOauthSubmitCallbackUrl,
    },
    dataService: {
      importFromJson: zedService.importZedFromJson,
      exportAccounts: zedService.exportZedAccounts,
      injectToVSCode: zedService.injectZedAccount,
      importFromLocal: zedService.importZedFromLocal,
    },
    getDisplayEmail: getZedAccountDisplayEmail,
    resolveOauthSuccessMessage: () =>
      t(
        'zed.oauth.importOnlySuccess',
        "Ủy quyền đã hoàn tất thành công. Tài khoản đã được nhập. Để Zed chính thức sử dụng tài khoản này, hãy nhấn \"Áp dụng và khởi động lại\".",
      ),
    onInjectSuccess: async () => {
      await store.fetchCurrentAccountId();
    },
  });

  const {
    t: pageT,
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
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
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
    requestDeleteTag,
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
    closeExportModal,
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
    showAddModal,
    addTab,
    addStatus,
    addMessage,
    tokenInput,
    setTokenInput,
    importing,
    openAddModal,
    closeAddModal,
    handleTokenImport,
    handleImportFromLocal,
    handleImportJsonFile,
    handlePickImportFile,
    importFileInputRef,
    oauthUrl,
    oauthUrlCopied,
    oauthMeta,
    oauthPrepareError,
    oauthCompleteError,
    oauthPolling,
    oauthTimedOut,
    oauthManualCallbackInput,
    setOauthManualCallbackInput,
    oauthManualCallbackSubmitting,
    oauthManualCallbackError,
    oauthSupportsManualCallback,
    handleCopyOauthUrl,
    handleRetryOauth,
    handleRetryOauthComplete,
    handleOpenOauthUrl,
    handleSubmitOauthCallbackUrl,
    handleInjectToVSCode,
    isFlowNoticeCollapsed,
    setIsFlowNoticeCollapsed,
    currentAccountId,
    formatDate,
    normalizeTag,
  } = page;

  const grouping = usePlatformAccountGroups('zed', () => toggleSelectAll(Array.from(selected)));

  useEffect(() => {
    if (!filterPersistenceEnabled) {
      removeAccountsOverviewFilterField(filterPersistenceScope, FILTER_TYPES_FIELD);
      return;
    }
    writeAccountsOverviewFilterField(filterPersistenceScope, FILTER_TYPES_FIELD, filterTypes);
  }, [filterPersistenceEnabled, filterPersistenceScope, filterTypes]);

  const accounts = store.accounts;
  const loading = store.loading;

  const syncCurrentAccount = useCallback(async () => {
    try {
      await store.fetchCurrentAccountId();
    } catch (error) {
      console.error('加载 Zed 运行时状态失败:', error);
    }
  }, [store.fetchCurrentAccountId]);

  useEffect(() => {
    void syncCurrentAccount();
  }, [syncCurrentAccount]);

  const currentAccount = useMemo(
    () => accounts.find((account) => account.id === currentAccountId) ?? null,
    [accounts, currentAccountId],
  );

  useEffect(() => {
    if (loading || !currentAccountId || currentAccount) return;
    void syncCurrentAccount();
  }, [currentAccount, currentAccountId, loading, syncCurrentAccount]);

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

  const resolvePlanKey = useCallback((account: ZedAccount) => getZedPlanBadge(account), []);

  const resolveSingleExportBaseName = useCallback((account: ZedAccount) => {
    const display = (getZedAccountDisplayEmail(account) || account.id).trim();
    const atIndex = display.indexOf('@');
    return atIndex > 0 ? display.slice(0, atIndex) : display;
  }, []);

  const tierCounts = useMemo(() => {
    const counts = new Map<string, number>();
    accounts.forEach((account) => {
      const key = resolvePlanKey(account);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return {
      plans: counts,
      validCount: accounts.reduce(
        (count, account) => (isZedAccountAbnormal(account) ? count : count + 1),
        0,
      ),
    };
  }, [accounts, resolvePlanKey]);

  const tierFilterOptions = useMemo<MultiSelectFilterOption[]>(
    () => [
      ...Array.from(tierCounts.plans.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([plan, count]) => ({
          value: plan,
          label: `${plan} (${count})`,
        })),
      buildValidAccountsFilterOption(t, tierCounts.validCount),
    ],
    [t, tierCounts],
  );

  const compareAccountsBySort = useCallback(
    (left: ZedAccount, right: ZedAccount) => {
      const currentFirstDiff = compareCurrentAccountFirst(left.id, right.id, currentAccountId);
      if (currentFirstDiff !== 0) {
        return currentFirstDiff;
      }

      const key = sortBy as ZedSortKey;
      if (key === 'billing_end') {
        const leftValue = left.billing_period_end_at ?? null;
        const rightValue = right.billing_period_end_at ?? null;
        if (leftValue == null && rightValue == null) return 0;
        if (leftValue == null) return 1;
        if (rightValue == null) return -1;
        return sortDirection === 'desc' ? rightValue - leftValue : leftValue - rightValue;
      }

      if (key === 'token_spend') {
        const leftValue = parseFiniteNumber(left.token_spend_used_cents) ?? -1;
        const rightValue = parseFiniteNumber(right.token_spend_used_cents) ?? -1;
        const diff = rightValue - leftValue;
        return sortDirection === 'desc' ? diff : -diff;
      }

      const diff = right.created_at - left.created_at;
      return sortDirection === 'desc' ? diff : -diff;
    },
    [currentAccountId, sortBy, sortDirection],
  );

  const filteredAccounts = useMemo(() => {
    let result = [...accounts];

    if (grouping.activeGroupId) {
      result = grouping.filterAccountsByGroup(result);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((account) => {
        const fields = [
          getZedAccountDisplayEmail(account),
          account.github_login,
          account.user_id,
          account.plan_raw,
          ...(account.tags || []),
        ]
          .filter(Boolean)
          .map((value) => String(value).toLowerCase());
        return fields.some((value) => value.includes(query));
      });
    }

    if (filterTypes.length > 0) {
      const { requireValidAccounts, selectedTypes } = splitValidityFilterValues(filterTypes);
      if (requireValidAccounts) {
        result = result.filter((account) => !isZedAccountAbnormal(account));
      }
      if (selectedTypes.size > 0) {
        result = result.filter((account) => selectedTypes.has(resolvePlanKey(account)));
      }
    }

    if (tagFilter.length > 0) {
      const selectedTags = new Set(tagFilter.map(normalizeTag));
      result = result.filter((account) =>
        (account.tags || []).map(normalizeTag).some((tag) => selectedTags.has(tag)),
      );
    }

    result.sort(compareAccountsBySort);
    return result;
  }, [accounts, grouping.activeGroupId, grouping.filterAccountsByGroup, compareAccountsBySort, filterTypes, normalizeTag, resolvePlanKey, searchQuery, tagFilter]);

  const filteredIds = useMemo(() => filteredAccounts.map((account) => account.id), [filteredAccounts]);
  const exportSelectionCount = getScopedSelectedCount(filteredIds);
  const pagination = usePagination({
    items: filteredAccounts,
    storageKey: buildPaginationPageSizeStorageKey('Zed'),
  });
  const paginatedAccounts = pagination.pageItems;
  const paginatedIds = useMemo(() => paginatedAccounts.map((account) => account.id), [paginatedAccounts]);
  const isAllPaginatedSelected = useMemo(
    () => isEveryIdSelected(selected, paginatedIds),
    [paginatedIds, selected],
  );

  const groupedAccounts = useMemo(() => {
    if (!groupByTag) return [] as Array<[string, typeof filteredAccounts]>;
    const groups = new Map<string, typeof filteredAccounts>();

    filteredAccounts.forEach((account) => {
      const tags = (account.tags || []).map(normalizeTag).filter(Boolean);
      const matchedTags =
        tagFilter.length > 0
          ? tags.filter((tag) => tagFilter.map(normalizeTag).includes(tag))
          : tags;

      if (matchedTags.length === 0) {
        if (!groups.has(ZED_UNTAGGED_KEY)) groups.set(ZED_UNTAGGED_KEY, []);
        groups.get(ZED_UNTAGGED_KEY)?.push(account);
        return;
      }

      matchedTags.forEach((tag) => {
        if (!groups.has(tag)) groups.set(tag, []);
        groups.get(tag)?.push(account);
      });
    });

    return Array.from(groups.entries()).sort(([leftKey], [rightKey]) => {
      if (leftKey === ZED_UNTAGGED_KEY) return -1;
      if (rightKey === ZED_UNTAGGED_KEY) return 1;
      return leftKey.localeCompare(rightKey);
    });
  }, [filteredAccounts, groupByTag, normalizeTag, tagFilter]);

  const paginatedGroupedAccounts = useMemo(
    () => buildPaginatedGroups(groupedAccounts, paginatedAccounts),
    [groupedAccounts, paginatedAccounts],
  );

  const resolveGroupLabel = useCallback(
    (groupKey: string) =>
      groupKey === ZED_UNTAGGED_KEY ? t('accounts.defaultGroup', "Nhóm mặc định") : groupKey,
    [t],
  );

  const resolveCycleDisplay = useCallback(
    (account: ZedAccount) => {
      const startText = formatDateOnly(account.billing_period_start_at, locale);
      const endText = formatDateOnly(account.billing_period_end_at, locale);
      const periodRangeText =
        startText && endText
          ? t('common.shared.credits.periodRange', {
              start: startText,
              end: endText,
              defaultValue: "Chu kỳ: {{start}} - {{end}}",
            })
          : endText
            ? t('common.shared.credits.periodEndOnly', {
                end: endText,
                defaultValue: "Kết thúc chu kỳ: {{end}}",
              })
            : t('common.shared.credits.planEndsUnknown', "Không có thông tin chu kỳ");

      const summary = periodRangeText;
      const detail = '';

      return {
        summary,
        detail,
        title: detail ? `${summary} · ${detail}` : summary,
      };
    },
    [locale, t],
  );

  const formatUsedLine = useCallback(
    (used: number | null | undefined, total: number | null | undefined) =>
      t('common.shared.credits.usedLine', {
        used: formatQuotaCount(used),
        total: formatQuotaCount(total),
        defaultValue: '{{used}} / {{total}} used',
      }),
    [t],
  );

  const formatLeftLine = useCallback(
    (left: number | null | undefined) =>
      t('common.shared.credits.leftInline', {
        left: formatQuotaCount(left),
        defaultValue: '{{left}} left',
      }),
    [t],
  );

  const buildUsagePanel = useCallback(
    (account: ZedAccount | null): ZedUsagePanel => {
      if (!account) {
        return {
          headline: '',
          note: t('zed.runtime.noCurrentAccount', "Không có tài khoản Zed đang hoạt động"),
          items: [
            {
              key: 'edit',
              variant: 'simple',
              label: 'Edit Predictions',
              value: '--',
              detail: '',
              title: 'Edit Predictions',
            },
            {
              key: 'overdue',
              variant: 'simple',
              label: t('zed.page.overdueField', "Hóa đơn quá hạn"),
              value: '--',
              detail: '',
              title: t('zed.page.overdueField', "Hóa đơn quá hạn"),
            },
          ],
          title: t('zed.runtime.noCurrentAccount', "Không có tài khoản Zed đang hoạt động"),
        };
      }

      if (!hasZedQuotaData(account)) {
        const note = t('common.shared.quota.noData', "Không có dữ liệu hạn mức");
        return {
          headline: '',
          note,
          items: [],
          title: note,
        };
      }

      const updatedText = account.usage_updated_at
        ? t('zed.page.usageUpdatedAt', {
            time: formatDateTime(account.usage_updated_at, locale),
            defaultValue: 'Updated: {{time}}',
          })
        : '';

      const hasEditPredictions =
        account.edit_predictions_used != null || Boolean(account.edit_predictions_limit_raw?.trim());

      const editMetrics = hasEditPredictions ? getZedEditPredictionsMetrics(account) : null;
      const items: ZedUsagePanelItem[] = [];
      if (editMetrics) {
        const editValue = `${formatQuotaCount(editMetrics.used)} / ${formatQuotaCount(editMetrics.total)}`;
        const editProgressPercent = Math.max(0, Math.min(100, editMetrics.usedPercent));
        items.push({
          key: 'edit',
          variant: 'metric',
          label: 'Edit Predictions',
          value: `${Math.round(editProgressPercent)}%`,
          detail: '',
          title: `Edit Predictions: ${editValue}`,
          usedText: formatUsedLine(editMetrics.used, editMetrics.total),
          leftText: formatLeftLine(editMetrics.left),
          progressPercent: editProgressPercent,
          tone: getQuotaTone(editProgressPercent),
        });
      }
      if (account.has_overdue_invoices != null) {
        const overdueValue = account.has_overdue_invoices
          ? t('zed.page.overdueYes', "Có")
          : t('zed.page.overdueNo', "Không");
        items.push({
          key: 'overdue',
          variant: 'simple',
          label: t('zed.page.overdueField', "Hóa đơn quá hạn"),
          value: overdueValue,
          detail: updatedText,
          title: `${t('zed.page.overdueField', "Hóa đơn quá hạn")}: ${overdueValue}`,
          tone: account.has_overdue_invoices ? 'low' : 'high',
        });
      }

      return {
        headline: '',
        note: updatedText,
        items,
        title: items.map((item) => item.title).join(' | ') || updatedText,
      };
    },
    [formatLeftLine, formatUsedLine, locale, t],
  );

  const renderUsagePanel = (
    panel: ReturnType<typeof buildUsagePanel>,
    options?: { compact?: boolean },
  ) => (
    <div className={`windsurf-official-usage ${options?.compact ? 'compact' : ''}`} title={panel.title}>
      {panel.headline ? <div className="windsurf-official-usage-headline">{panel.headline}</div> : null}
      {panel.note ? <div className="windsurf-official-usage-note">{panel.note}</div> : null}
      <div className="windsurf-official-usage-list">
        {panel.items.map((item) =>
          item.variant === 'metric' ? (
            <div key={item.key} className="windsurf-official-usage-item zed-usage-metric-item" title={item.title}>
              <div className="zed-usage-metric-header">
                <span className="zed-usage-metric-label">{item.label}</span>
                <span className={`zed-usage-metric-value ${item.tone}`}>{item.value}</span>
              </div>
              <div className={`windsurf-credit-meta-row ${options?.compact ? 'table' : ''}`}>
                <span className="windsurf-credit-used">{item.usedText}</span>
                <span className="windsurf-credit-left">{item.leftText}</span>
              </div>
              <div className={`zed-usage-metric-track ${options?.compact ? 'compact' : ''}`}>
                <div
                  className={`zed-usage-metric-bar ${item.tone}`}
                  style={{ width: `${item.progressPercent}%` }}
                />
              </div>
              {item.detail ? <div className="windsurf-official-usage-detail">{item.detail}</div> : null}
            </div>
          ) : (
            <div key={item.key} className="windsurf-official-usage-item" title={item.title}>
              <div className="windsurf-official-usage-main">
                <span className="windsurf-official-usage-label">{item.label}</span>
                <span className={`windsurf-official-usage-value ${item.tone ?? ''}`}>{item.value}</span>
              </div>
              {item.detail ? <div className="windsurf-official-usage-detail">{item.detail}</div> : null}
            </div>
          ),
        )}
      </div>
    </div>
  );

  const renderPlanDetails = (
    cycleDisplay: ReturnType<typeof resolveCycleDisplay>,
    options?: { compact?: boolean },
  ) => (
    <div className={`windsurf-plan-cycle ${options?.compact ? 'compact' : ''}`} title={cycleDisplay.title}>
      <span className="windsurf-plan-cycle-summary">{cycleDisplay.summary}</span>
      {cycleDisplay.detail ? (
        <span className="windsurf-plan-cycle-detail">{cycleDisplay.detail}</span>
      ) : null}
    </div>
  );

  const renderGridCards = (items: typeof filteredAccounts, groupKey?: string) =>
    items.map((account) => {
      const emailText = getZedAccountDisplayEmail(account);
      const cycleDisplay = resolveCycleDisplay(account);
      const usagePanel = buildUsagePanel(account);
      const accountTags = (account.tags || []).map((tag) => tag.trim()).filter(Boolean);
      const visibleTags = accountTags.slice(0, 2);
      const moreTagCount = Math.max(0, accountTags.length - visibleTags.length);
      const isSelected = selected.has(account.id);
      const isCurrent = currentAccountId === account.id;
      const quotaError = account.quota_query_last_error?.trim();
      const statusTone = account.subscription_status
        ? getZedStatusTone(account.subscription_status)
        : null;

      return (
        <div
          key={groupKey ? `${groupKey}-${account.id}` : account.id}
          className={`ghcp-account-card ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
        >
          <div className="card-top">
            <div className="card-select">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(account.id)}
              />
            </div>
            <span className="account-email" title={maskAccountText(emailText)}>
              {maskAccountText(emailText)}
            </span>
            {isCurrent && <span className="current-tag">{t('accounts.status.current')}</span>}
            {quotaError && (
              <span className="status-pill warning" title={quotaError}>
                <CircleAlert size={12} />
                {t('common.shared.quota.queryFailed', "Truy vấn hạn mức thất bại")}
              </span>
            )}
            <span className={`tier-badge ${getZedPlanTone(account.plan_raw)}`}>
              {getZedPlanBadge(account)}
            </span>
          </div>

          <div className="zed-status-row">
            {account.subscription_status && statusTone ? (
              <span className={`status-pill ${statusTone}`}>{account.subscription_status}</span>
            ) : null}
            <span className="tag-pill zed-login-pill">@{account.github_login}</span>
          </div>

          {accountTags.length > 0 && (
            <div className="card-tags">
              {visibleTags.map((tag, index) => (
                <span key={`${account.id}-${tag}-${index}`} className="tag-pill">
                  {tag}
                </span>
              ))}
              {moreTagCount > 0 && <span className="tag-pill more">+{moreTagCount}</span>}
            </div>
          )}

          {renderUsagePanel(usagePanel)}
          {renderPlanDetails(cycleDisplay)}

          <div className="card-footer">
            <span className="card-date">{formatDate(account.last_used || account.created_at)}</span>
            <div className="card-actions">
              <button
                className="card-action-btn success"
                onClick={() => handleInjectToVSCode?.(account.id)}
                disabled={injecting === account.id}
                title={
                  isCurrent
                    ? t('zed.actions.reapply', "Áp dụng lại")
                    : t('zed.actions.applyAndRestart', "Áp dụng và khởi động lại")
                }
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
                title={t('accounts.editTags', "Chỉnh sửa thẻ")}
              >
                <Tag size={14} />
              </button>
              <button
                className="card-action-btn"
                onClick={() => handleRefresh(account.id)}
                disabled={refreshing === account.id}
                title={t('common.shared.refreshQuota', "Làm mới hạn mức")}
              >
                <RotateCw size={14} className={refreshing === account.id ? 'loading-spinner' : ''} />
              </button>
              <button
                className="card-action-btn export-btn"
                onClick={() => handleExportByIds([account.id], resolveSingleExportBaseName(account))}
                title={t('common.shared.export.title', "Xuất")}
              >
                <Upload size={14} />
              </button>
              <button
                className="card-action-btn danger"
                onClick={() => handleDelete(account.id)}
                title={t('common.delete', "Xóa")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      );
    });

  const renderTableRows = (items: typeof filteredAccounts, groupKey?: string) =>
    items.map((account) => {
      const emailText = getZedAccountDisplayEmail(account);
      const cycleDisplay = resolveCycleDisplay(account);
      const usagePanel = buildUsagePanel(account);
      const accountTags = (account.tags || []).map((tag) => tag.trim()).filter(Boolean);
      const visibleTags = accountTags.slice(0, 3);
      const moreTagCount = Math.max(0, accountTags.length - visibleTags.length);
      const isCurrent = currentAccountId === account.id;
      const quotaError = account.quota_query_last_error?.trim();

      return (
        <tr
          key={groupKey ? `${groupKey}-${account.id}` : account.id}
          className={isCurrent ? 'current' : ''}
        >
          <td>
            <input
              type="checkbox"
              checked={selected.has(account.id)}
              onChange={() => toggleSelect(account.id)}
            />
          </td>
          <td>
            <div className="account-cell">
              <div className="account-main-line">
                <span className="account-email-text" title={maskAccountText(emailText)}>
                  {maskAccountText(emailText)}
                </span>
                {isCurrent && <span className="mini-tag current">{t('accounts.status.current')}</span>}
              </div>
              <div className="account-sub-line">
                <span className="kiro-table-subline">
                  {account.subscription_status
                    ? `@${account.github_login} · ${account.subscription_status}`
                    : `@${account.github_login}`}
                </span>
              </div>
              {quotaError && (
                <div className="account-sub-line">
                  <span className="status-pill warning" title={quotaError}>
                    <CircleAlert size={12} />
                    {t('common.shared.quota.queryFailed', "Truy vấn hạn mức thất bại")}
                  </span>
                </div>
              )}
              {accountTags.length > 0 && (
                <div className="account-tags-inline">
                  {visibleTags.map((tag, index) => (
                    <span key={`${account.id}-inline-${tag}-${index}`} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                  {moreTagCount > 0 && <span className="tag-pill more">+{moreTagCount}</span>}
                </div>
              )}
            </div>
          </td>
          <td>
            <span className={`tier-badge ${getZedPlanTone(account.plan_raw)}`}>
              {getZedPlanBadge(account)}
            </span>
          </td>
          <td>{renderUsagePanel(usagePanel, { compact: true })}</td>
          <td>{renderPlanDetails(cycleDisplay, { compact: true })}</td>
          <td className="sticky-action-cell table-action-cell">
            <div className="action-buttons">
              <button
                className="action-btn success"
                onClick={() => handleInjectToVSCode?.(account.id)}
                disabled={injecting === account.id}
                title={
                  isCurrent
                    ? t('zed.actions.reapply', "Áp dụng lại")
                    : t('zed.actions.applyAndRestart', "Áp dụng và khởi động lại")
                }
              >
                {injecting === account.id ? (
                  <RefreshCw size={14} className="loading-spinner" />
                ) : (
                  <Play size={14} />
                )}
              </button>
              <button
                className="action-btn"
                onClick={() => openTagModal(account.id)}
                title={t('accounts.editTags', "Chỉnh sửa thẻ")}
              >
                <Tag size={14} />
              </button>
              <button
                className="action-btn"
                onClick={() => handleRefresh(account.id)}
                disabled={refreshing === account.id}
                title={t('common.shared.refreshQuota', "Làm mới hạn mức")}
              >
                <RotateCw size={14} className={refreshing === account.id ? 'loading-spinner' : ''} />
              </button>
              <button
                className="action-btn"
                onClick={() => handleExportByIds([account.id], resolveSingleExportBaseName(account))}
                title={t('common.shared.export.title', "Xuất")}
              >
                <Upload size={14} />
              </button>
              <button
                className="action-btn danger"
                onClick={() => handleDelete(account.id)}
                title={t('common.delete', "Xóa")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </td>
        </tr>
      );
    });

  return (
    <div className="ghcp-accounts-page zed-accounts-page">
      <ZedOverviewTabsHeader />

      <div className={`ghcp-flow-notice ${isFlowNoticeCollapsed ? 'collapsed' : ''}`} role="note" aria-live="polite">
        <button
          type="button"
          className="ghcp-flow-notice-toggle"
          onClick={() => setIsFlowNoticeCollapsed((prev) => !prev)}
          aria-expanded={!isFlowNoticeCollapsed}
        >
          <div className="ghcp-flow-notice-title">
            <CircleAlert size={16} />
            <span>{t('zed.flowNotice.title', "Ghi chú tích hợp tài khoản Zed (nhấp để mở rộng/thu gọn)")}</span>
          </div>
          <ChevronDown size={16} className={`ghcp-flow-notice-arrow ${isFlowNoticeCollapsed ? 'collapsed' : ''}`} />
        </button>
        {!isFlowNoticeCollapsed && (
          <div className="ghcp-flow-notice-body">
            <div className="ghcp-flow-notice-desc">
              {t(
                'zed.flowNotice.desc',
                "Hỗ trợ đăng nhập OAuth chính thức, nhập JSON, nhập trạng thái đăng nhập cục bộ hiện tại và áp dụng một tài khoản đã lưu trở lại ứng dụng Zed chính thức theo đúng quy tắc lưu trữ thực tế của ứng dụng. Trang này chỉ hiển thị các trường trạng thái mà ứng dụng desktop có thể đọc trực tiếp.",
              )}
            </div>
            <ul className="ghcp-flow-notice-list">
              <li>
                {t(
                  'zed.flowNotice.reason',
                  "Phạm vi quyền: mở đăng nhập same-origin chính thức của Zed trong trình duyệt; đọc thông tin xác thực Zed cục bộ hiện tại để nhập; ghi lại vào đúng vị trí thông tin xác thực hệ thống khi áp dụng tài khoản; và có thể khởi động hoặc khởi động lại Zed khi cần.",
                )}
              </li>
              <li>
                {t(
                  'zed.flowNotice.storage',
                  "Phạm vi dữ liệu: chỉ lưu cục bộ các bản ghi tài khoản được nhập hoặc cấp quyền, thẻ và nội dung xuất ra. Nội dung Keychain hoặc thông tin xác thực cục bộ không bị tải lên, các phiên web của trình duyệt không bị quét và các thông tin xác thực hệ thống không liên quan không bị sửa đổi.",
                )}
              </li>
            </ul>
          </div>
        )}
      </div>

      {message && (
        <div className={`message-bar ${message.tone === 'error' ? 'error' : 'success'}`}>
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
              placeholder={t('zed.page.searchPlaceholder', "Tìm login GitHub, gói hoặc thẻ")}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="view-switcher">
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title={t('common.shared.view.list', "Dạng danh sách")}
            >
              <List size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title={t('common.shared.view.grid', "Dạng thẻ")}
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <MultiSelectFilterDropdown
            options={tierFilterOptions}
            selectedValues={filterTypes}
            allLabel={t('common.shared.filter.all', "Tất cả ({{count}})", { count: accounts.length })}
            filterLabel={t('common.shared.filterLabel', "Bộ lọc")}
            clearLabel={t('accounts.clearFilter', "Xóa bộ lọc")}
            emptyLabel={t('common.none', "None​")}
            ariaLabel={t('common.shared.filterLabel', "Bộ lọc")}
            onToggleValue={toggleFilterTypeValue}
            onClear={clearFilterTypes}
          />

          <div className="tag-filter" ref={tagFilterRef}>
            <button
              type="button"
              className={`tag-filter-btn ${tagFilter.length > 0 ? 'active' : ''}`}
              onClick={() => setShowTagFilter((prev) => !prev)}
              aria-label={t('accounts.filterTags', "Lọc thẻ")}
            >
              <Tag size={14} />
              {tagFilter.length > 0
                ? `${t('accounts.filterTagsCount', "Thẻ")}(${tagFilter.length})`
                : t('accounts.filterTags', "Lọc thẻ")}
            </button>
            {showTagFilter && (
              <div
                ref={page.tagFilterPanelRef}
                className={`tag-filter-panel ${page.tagFilterPanelPlacement === 'top' ? 'open-top' : ''}`}
              >
                {availableTags.length === 0 ? (
                  <div className="tag-filter-empty">{t('accounts.noAvailableTags', "Không có thẻ nào")}</div>
                ) : (
                  <div className="tag-filter-options" style={page.tagFilterScrollContainerStyle}>
                    {availableTags.map((tag) => (
                      <label
                        key={tag}
                        className={`tag-filter-option ${tagFilter.includes(tag) ? 'selected' : ''}`}
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
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            requestDeleteTag(tag);
                          }}
                          aria-label={t('accounts.deleteTagAria', {
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
                    onChange={(event) => setGroupByTag(event.target.checked)}
                  />
                  <span>{t('accounts.groupByTag', "Nhóm theo thẻ")}</span>
                </label>
                {tagFilter.length > 0 && (
                  <button type="button" className="tag-filter-clear" onClick={clearTagFilter}>
                    {t('accounts.clearFilter', "Xóa bộ lọc")}
                  </button>
                )}
              </div>
            )}
          </div>

          <SingleSelectFilterDropdown
            value={sortBy}
            options={[
              { value: 'created_at', label: t('common.shared.sort.createdAt', "Thời gian tạo") },
              { value: 'token_spend', label: t('zed.sort.tokenSpend', "Sắp xếp theo Token Spend") },
              { value: 'billing_end', label: t('common.shared.sort.planEnd', "Theo thời gian kết thúc chu kỳ") },
            ]}
            ariaLabel={t('common.shared.sortLabel', "Sắp xếp")}
            icon={<ArrowDownWideNarrow size={14} />}
            onChange={setSortBy}
          />

          <button
            className="sort-direction-btn"
            onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            title={
              sortDirection === 'desc'
                ? t('common.shared.sort.descTooltip', "Giảm dần (nhấn để chuyển Tăng dần)")
                : t('common.shared.sort.ascTooltip', "Tăng dần (nhấn để chuyển Giảm dần)")
            }
            aria-label={t('common.shared.sort.toggleDirection', "Đổi hướng sắp xếp")}
          >
            {sortDirection === 'desc' ? '⬇' : '⬆'}
          </button>
        </div>

        <div className="toolbar-right">
          <button
            className="btn btn-primary icon-only"
            onClick={() => openAddModal('oauth')}
            title={t('zed.actions.addAccount', "Đăng nhập vào Zed")}
          >
            <Plus size={14} />
          </button>
          <button
            className="btn btn-secondary icon-only"
            onClick={handleRefreshAll}
            disabled={refreshingAll || accounts.length === 0}
            title={t('common.shared.refreshAll', "Làm mới tất cả")}
          >
            <RefreshCw size={14} className={refreshingAll ? 'loading-spinner' : ''} />
          </button>
          <button
            className="btn btn-secondary icon-only"
            onClick={togglePrivacyMode}
            title={
              privacyModeEnabled
                ? t('privacy.showSensitive', "Hiện email")
                : t('privacy.hideSensitive', "Ẩn email")
            }
          >
            {privacyModeEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            className="btn btn-secondary icon-only"
            onClick={() => openAddModal('import')}
            disabled={importing}
            title={t('common.shared.import.label', "Nhập")}
          >
            <Download size={14} />
          </button>
          <button
            className="btn btn-secondary export-btn icon-only"
            onClick={() => void handleExport(filteredIds)}
            disabled={exporting || filteredIds.length === 0}
            title={
              exportSelectionCount > 0
                ? `${t('common.shared.export.title', "Xuất")} (${exportSelectionCount})`
                : t('common.shared.export.title', "Xuất")
            }
          >
            <Upload size={14} />
          </button>
          <QuickSettingsPopover type="zed" />
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
          actions={(
            <button
              className="btn btn-danger icon-only"
              onClick={handleBatchDelete}
              title={`${t('common.delete', "Xóa")} (${selected.size})`}
              aria-label={`${t('common.delete', "Xóa")} (${selected.size})`}
            >
              <Trash2 size={14} />
            </button>
          )}
        />
      )}

      {loading && accounts.length === 0 ? (
        <div className="loading-container">
          <RefreshCw size={24} className="loading-spinner" />
          <p>{t('common.loading', "Đang tải...")}</p>
        </div>
      ) : accounts.length === 0 ? (
        <div className="empty-state">
          <h3>{t('common.shared.empty.title', "Chưa có tài khoản")}</h3>
          <p>{t('zed.empty.description', "Nhấp vào “Thêm tài khoản” để bắt đầu quản lý các tài khoản Zed của bạn, hoặc nhập chúng từ JSON hay từ trạng thái đăng nhập cục bộ hiện tại.")}</p>
          <button className="btn btn-primary" onClick={() => openAddModal('oauth')}>
            <Plus size={16} />
            {t('common.shared.addAccount', "Thêm tài khoản")}
          </button>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="empty-state">
          <h3>{t('common.shared.noMatch.title', "Không có tài khoản phù hợp")}</h3>
          <p>{t('common.shared.noMatch.desc', "Thử điều chỉnh tìm kiếm hoặc bộ lọc")}</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid-view-container">
          {groupByTag ? (
          <div className="tag-group-list">
            {paginatedGroupedAccounts.map(({ groupKey, items, totalCount }) => (
              <div key={groupKey} className="tag-group-section">
                <div className="tag-group-header">
                  <span className="tag-group-title">{resolveGroupLabel(groupKey)}</span>
                  <span className="tag-group-count">{totalCount}</span>
                </div>
                <div className="tag-group-grid ghcp-accounts-grid">{renderGridCards(items, groupKey)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ghcp-accounts-grid">{renderGridCards(paginatedAccounts)}</div>
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
                <th style={{ width: 240 }}>{pageT('common.shared.columns.email', '邮箱')}</th>
                <th style={{ width: 120 }}>{pageT('common.shared.columns.plan', '计划')}</th>
                <th>{t('zed.page.tokenSpend', 'Token Spend')}</th>
                <th>{pageT('common.detail', '详情')}</th>
                <th className="sticky-action-header table-action-header">
                  {pageT('common.shared.columns.actions', '操作')}
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedGroupedAccounts.map(({ groupKey, items, totalCount }) => (
                <Fragment key={groupKey}>
                  <tr className="tag-group-row">
                    <td colSpan={6}>
                      <div className="tag-group-header">
                        <span className="tag-group-title">{resolveGroupLabel(groupKey)}</span>
                        <span className="tag-group-count">{totalCount}</span>
                      </div>
                    </td>
                  </tr>
                  {renderTableRows(items, groupKey)}
                </Fragment>
              ))}
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
                <th style={{ width: 240 }}>{pageT('common.shared.columns.email', '邮箱')}</th>
                <th style={{ width: 120 }}>{pageT('common.shared.columns.plan', '计划')}</th>
                <th>{t('zed.page.tokenSpend', 'Token Spend')}</th>
                <th>{pageT('common.detail', '详情')}</th>
                <th className="sticky-action-header table-action-header">
                  {pageT('common.shared.columns.actions', '操作')}
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

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content ghcp-add-modal platform-account-add-modal zed-add-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <button className="btn btn-secondary icon-only" onClick={closeAddModal} title={t('common.back', "Quay lại")} aria-label={t('common.back', "Quay lại")}><ChevronLeft size={14} /></button>
              <h2>{t('zed.addModal.title', "Thêm tài khoản Zed")}</h2>
              <button
                className="modal-close"
                onClick={closeAddModal}
                aria-label={t('common.close', "Đóng")}
              >
                <X />
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={`modal-tab ${addTab === 'oauth' ? 'active' : ''}`}
                onClick={() => openAddModal('oauth')}
              >
                <Globe size={14} />
                {t('common.shared.addModal.oauth', "Ủy quyền OAuth")}
              </button>
              <button
                className={`modal-tab ${addTab === 'token' ? 'active' : ''}`}
                onClick={() => openAddModal('token')}
              >
                <KeyRound size={14} />
                {t('common.shared.addModal.token', 'Token / JSON')}
              </button>
              {isMacOS && (
                <button
                  className={`modal-tab ${addTab === 'import' ? 'active' : ''}`}
                  onClick={() => openAddModal('import')}
                >
                  <Database size={14} />
                  {t('accounts.tabs.import', "Nhập")}
                </button>
              )}
            </div>

            <div className="modal-body">
              <MfaQuickCodeSelect />
              {addTab === 'oauth' && (
                <div className="add-section">
                  <p className="section-desc">
                    {t('zed.oauth.desc', "Nhấp vào nút bên dưới để hoàn tất xác thực đăng nhập Zed chính thức trong trình duyệt.")}
                  </p>
                  {oauthPrepareError ? (
                    <div className="add-status error">
                      <CircleAlert size={16} />
                      <span>{oauthPrepareError}</span>
                      <button className="btn btn-sm btn-outline" onClick={handleRetryOauth}>
                        {t('common.shared.oauth.retry', "Tạo lại thông tin ủy quyền")}
                      </button>
                    </div>
                  ) : oauthUrl ? (
                    <div className="oauth-url-section">
                      <div className="oauth-link">
                        <label>{t('accounts.oauth.linkLabel', "Liên kết xác thực")}</label>
                        <div className="oauth-url-box">
                          <input type="text" value={oauthUrl} readOnly />
                          <button onClick={handleCopyOauthUrl}>
                            {oauthUrlCopied ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                      {oauthMeta ? (
                        <p className="oauth-hint">
                          {t('common.shared.oauth.meta', "Hết hạn sau: {{expires}}s; chu kỳ thăm dò: {{interval}}s", {
                            expires: oauthMeta.expiresIn,
                            interval: oauthMeta.intervalSeconds,
                          })}
                        </p>
                      ) : null}
                      <button className="btn btn-primary btn-full" onClick={handleOpenOauthUrl}>
                        <Globe size={16} />
                        {t('common.shared.oauth.openBrowser', "Mở trong trình duyệt")}
                      </button>
                      {oauthSupportsManualCallback && (
                        <div className="oauth-link">
                          <label>{t('common.shared.oauth.manualCallbackLabel', "Nhập URL callback thủ công")}</label>
                          <div className="oauth-url-box oauth-manual-input">
                            <input
                              type="text"
                              value={oauthManualCallbackInput}
                              onChange={(event) => setOauthManualCallbackInput(event.target.value)}
                              placeholder={t(
                                'common.shared.oauth.manualCallbackPlaceholder',
                                "Dán đầy đủ URL callback, ví dụ: http://localhost:1455/auth/callback?code=...&state=...",
                              )}
                            />
                            <button
                              className="oauth-copy-button"
                              onClick={() => void handleSubmitOauthCallbackUrl()}
                              disabled={oauthManualCallbackSubmitting || !oauthManualCallbackInput.trim()}
                            >
                              {oauthManualCallbackSubmitting ? (
                                <RefreshCw size={16} className="loading-spinner" />
                              ) : (
                                <Check size={16} />
                              )}
                              {t('accounts.oauth.continue', "Tôi đã xác thực, tiếp tục")}
                            </button>
                          </div>
                        </div>
                      )}
                      {oauthManualCallbackError ? (
                        <div className="add-status error">
                          <CircleAlert size={16} />
                          <span>{oauthManualCallbackError}</span>
                        </div>
                      ) : null}
                      {oauthPolling ? (
                        <div className="add-status loading">
                          <RefreshCw size={16} className="loading-spinner" />
                          <span>{t('common.shared.oauth.waiting', "Đang chờ ủy quyền...")}</span>
                        </div>
                      ) : null}
                      {oauthCompleteError ? (
                        <div className="add-status error">
                          <CircleAlert size={16} />
                          <span>{oauthCompleteError}</span>
                          {oauthTimedOut ? (
                            <button className="btn btn-sm btn-outline" onClick={handleRetryOauth}>
                              {t('common.shared.oauth.timeoutRetry', "Làm mới liên kết ủy quyền")}
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-outline" onClick={handleRetryOauthComplete}>
                              {t('common.refresh', 'Refresh')}
                            </button>
                          )}
                        </div>
                      ) : null}
                      <p className="oauth-hint">
                        {t('common.shared.oauth.hint', 'Once authorized, this window will update automatically')}
                      </p>
                    </div>
                  ) : (
                    <div className="oauth-loading">
                      <RefreshCw size={24} className="loading-spinner" />
                      <span>{t('common.shared.oauth.preparing', "Đang chuẩn bị liên kết ủy quyền...")}</span>
                    </div>
                  )}
                </div>
              )}

              {addTab === 'token' && (
                <div className="add-section">
                  <p className="section-desc">
                    {t('zed.import.jsonDesc', "Nhập tệp JSON Zed được xuất bởi công cụ này.")}
                  </p>
                  <textarea
                    className="token-input"
                    value={tokenInput}
                    onChange={(event) => setTokenInput(event.target.value)}
                    placeholder={t(
                      'common.shared.token.placeholder',
                      "Ví dụ: ghu_xxx / sk-ws-xxx / {\"access_token\":\"eyJ...\",\"refresh_token\":\"rt_...\"} / [{...}]",
                    )}
                  />
                  <button
                    className="btn btn-primary btn-full"
                    onClick={() => void handleTokenImport()}
                    disabled={addStatus === 'loading' || !tokenInput.trim()}
                  >
                    {addStatus === 'loading' ? (
                      <RefreshCw size={16} className="loading-spinner" />
                    ) : (
                      <Download size={16} />
                    )}
                    {t('common.shared.token.import', "Nhập")}
                  </button>
                </div>
              )}

              {isMacOS && addTab === 'import' && (
                <div className="add-section">
                  <p className="section-desc">
                    {t('zed.import.localDesc', "Nhập dữ liệu tài khoản từ trạng thái đăng nhập Zed cục bộ hiện tại hoặc từ tệp JSON đã xuất.")}
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
                    {t('common.shared.addModal.import', "Nhập từ máy")}
                  </button>
                  <div className="oauth-hint" style={{ margin: '8px 0 4px' }}>
                    {t('common.shared.import.orJson', "Hoặc nhập từ tệp JSON")}
                  </div>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept="application/json"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
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
                    {t('common.shared.import.pickFile', "Chọn tệp JSON để nhập")}
                  </button>
                </div>
              )}

              {addStatus !== 'idle' && addStatus !== 'loading' && (
                <div className={`add-status ${addStatus}`}>
                  {addStatus === 'success' ? <Check size={16} /> : <CircleAlert size={16} />}
                  <span>{addMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ExportJsonModal
        isOpen={showExportModal}
        title={t('zed.actions.exportTitle', "Xuất JSON tài khoản Zed")}
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

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('common.confirm')}</h2>
              <button
                className="modal-close"
                onClick={() => !deleting && setDeleteConfirm(null)}
                aria-label={t('common.close', "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage message={deleteConfirmError} scrollKey={deleteConfirmErrorScrollKey} />
              <p>{deleteConfirm.message}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {tagDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('common.confirm')}</h2>
              <button
                className="modal-close"
                onClick={() => !deletingTag && setTagDeleteConfirm(null)}
                aria-label={t('common.close', "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage message={tagDeleteConfirmError} scrollKey={tagDeleteConfirmErrorScrollKey} />
              <p>
                {t('accounts.confirmDeleteTag', 'Delete tag "{{tag}}"? This tag will be removed from {{count}} accounts.', {
                  tag: tagDeleteConfirm.tag,
                  count: tagDeleteConfirm.count,
                })}
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setTagDeleteConfirm(null)}
                disabled={deletingTag}
              >
                {t('common.cancel')}
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteTag} disabled={deletingTag}>
                {deletingTag ? t('common.processing', "Đang xử lý...") : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      <TagEditModal
        isOpen={!!showTagModal}
        initialTags={accounts.find((account) => account.id === showTagModal)?.tags || []}
        availableTags={availableTags}
        onClose={() => setShowTagModal(null)}
        onSave={handleSaveTags}
      />
    </div>
  );
}
