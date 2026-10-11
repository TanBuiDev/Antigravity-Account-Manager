import { useMemo, useCallback, Fragment, useState, useEffect } from 'react';
import {
  Plus, RefreshCw, Download, Upload, Trash2, X, Globe, KeyRound, Database,
  Copy, Check, RotateCw, LayoutGrid, List, Search,
  Tag, Play, Eye, EyeOff, CircleAlert, ChevronDown,
} from 'lucide-react';
import { useCodebuddyAccountStore } from '../stores/useCodebuddyAccountStore';
import * as codebuddyService from '../services/codebuddyService';
import { TagEditModal } from '../components/TagEditModal';
import { ExportJsonModal } from '../components/ExportJsonModal';
import { ModalErrorMessage } from '../components/ModalErrorMessage';
import { MfaQuickCodeSelect } from '../components/MfaQuickCodeSelect';
import { PaginationControls } from '../components/PaginationControls';
import { AccountSelectionToolbar } from '../components/AccountSelectionToolbar';
import { usePlatformAccountGroups } from '../hooks/usePlatformAccountGroups';
import {
  CB_PACKAGE_CODE,
  CodebuddyAccount,
  CodebuddyOfficialQuotaResource,
  getCodebuddyAccountDisplayEmail,
  getCodebuddyOfficialQuotaModel,
  getCodebuddyPlanBadge,
  getCodebuddyUsage,
} from '../types/codebuddy';
import { QuickSettingsPopover } from '../components/QuickSettingsPopover';
import { useProviderAccountsPage } from '../hooks/useProviderAccountsPage';
import { PlatformOverviewTabsHeader, PlatformOverviewTab } from '../components/platform/PlatformOverviewTabsHeader';
import { CodebuddyInstancesContent } from './CodebuddyInstancesPage';
import { DosageNotifyUsageStatus } from '../components/platform/DosageNotifyUsageStatus';
import { MultiSelectFilterDropdown, type MultiSelectFilterOption } from '../components/MultiSelectFilterDropdown';
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
import { CodebuddySessionManager } from '../components/codebuddy/CodebuddySessionManager';

const CB_FLOW_NOTICE_COLLAPSED_KEY = 'agtools.codebuddy.flow_notice_collapsed';
const CB_CURRENT_ACCOUNT_ID_KEY = 'agtools.codebuddy.current_account_id';
const CB_KNOWN_PLAN_FILTERS = ['FREE', 'TRIAL', 'PRO', 'ENTERPRISE'] as const;
const CODEBUDDY_FILTER_PERSISTENCE_SCOPE = normalizeAccountsOverviewScope('CodeBuddy');
const FILTER_TYPES_FIELD = 'filter_types';
const QUOTA_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

function formatQuotaNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return QUOTA_NUMBER_FORMATTER.format(Math.max(0, value));
}

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getQuotaClassByRemainPercent(remainPercent: number | null): string {
  if (remainPercent == null || !Number.isFinite(remainPercent)) return 'high';
  if (remainPercent <= 10) return 'critical';
  if (remainPercent <= 30) return 'low';
  if (remainPercent <= 60) return 'medium';
  return 'high';
}

export function CodebuddyAccountsPage() {
  const [activeTab, setActiveTab] = useState<PlatformOverviewTab>('overview');
  const [filterTypes, setFilterTypes] = useState<string[]>(() =>
    readAccountsOverviewFilterPersistenceEnabled(CODEBUDDY_FILTER_PERSISTENCE_SCOPE)
      ? readAccountsOverviewFilterStringArray(
          CODEBUDDY_FILTER_PERSISTENCE_SCOPE,
          FILTER_TYPES_FIELD,
        )
      : [],
  );
  const untaggedKey = '__untagged__';
  const store = useCodebuddyAccountStore();

  const page = useProviderAccountsPage<CodebuddyAccount>({
    platformKey: 'CodeBuddy',
    oauthLogPrefix: 'CodebuddyOAuth',
    flowNoticeCollapsedKey: CB_FLOW_NOTICE_COLLAPSED_KEY,
    currentAccountIdKey: CB_CURRENT_ACCOUNT_ID_KEY,
    exportFilePrefix: 'codebuddy_accounts',
    oauthTabKeys: ['oauth'],
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
      startLogin: codebuddyService.startCodebuddyOAuthLogin,
      completeLogin: codebuddyService.completeCodebuddyOAuthLogin,
      cancelLogin: codebuddyService.cancelCodebuddyOAuthLogin,
    },
    dataService: {
      importFromJson: codebuddyService.importCodebuddyFromJson,
      importFromLocal: codebuddyService.importCodebuddyFromLocal,
      addWithToken: codebuddyService.addCodebuddyAccountWithToken,
      exportAccounts: codebuddyService.exportCodebuddyAccounts,
      injectToVSCode: codebuddyService.injectCodebuddyToVSCode,
    },
    getDisplayEmail: (account) => getCodebuddyAccountDisplayEmail(account),
  });

  const {
    t, locale, privacyModeEnabled, togglePrivacyMode, maskAccountText,
    viewMode, setViewMode, searchQuery, setSearchQuery,
    filterPersistenceEnabled, filterPersistenceScope,
    sortDirection, sortBy,
    selected, toggleSelect, toggleSelectAll,
    tagFilter, groupByTag, setGroupByTag, showTagFilter, setShowTagFilter,
    showTagModal, setShowTagModal, tagFilterRef, availableTags,
    toggleTagFilterValue, clearTagFilter, tagDeleteConfirm, tagDeleteConfirmError, tagDeleteConfirmErrorScrollKey, setTagDeleteConfirm,
    deletingTag, confirmDeleteTag, openTagModal, handleSaveTags,
    refreshing, refreshingAll, injecting,
    handleRefresh, handleRefreshAll, handleDelete, handleBatchDelete,
    deleteConfirm, deleteConfirmError, deleteConfirmErrorScrollKey, setDeleteConfirm, deleting, confirmDelete,
    message, setMessage,
    exporting, handleExport, handleExportByIds, getScopedSelectedCount,
    showExportModal, exportJsonContent, exportJsonHidden,
    toggleExportJsonHidden, exportJsonCopied, copyExportJson,
    savingExportJson, saveExportJson, exportSavedPath,
    canOpenExportSavedDirectory, openExportSavedDirectory, copyExportSavedPath, exportPathCopied,
    closeExportModal,
    showAddModal, addTab, addStatus, addMessage, tokenInput, setTokenInput,
    importing, openAddModal, closeAddModal,
    handleTokenImport, handleImportJsonFile, handleImportFromLocal, handlePickImportFile, importFileInputRef,
    oauthUrl, oauthUrlCopied, oauthUserCode, oauthUserCodeCopied, oauthMeta,
    oauthPolling, oauthTimedOut,
    oauthPrepareError, oauthCompleteError,
    handleCopyOauthUrl, handleCopyOauthUserCode, handleRetryOauth, handleOpenOauthUrl,
    handleInjectToVSCode,
    isFlowNoticeCollapsed, setIsFlowNoticeCollapsed,
    currentAccountId, formatDate, normalizeTag,
  } = page;

  const grouping = usePlatformAccountGroups('codebuddy', () => toggleSelectAll(Array.from(selected)));

  useEffect(() => {
    if (!filterPersistenceEnabled) {
      removeAccountsOverviewFilterField(filterPersistenceScope, FILTER_TYPES_FIELD);
      return;
    }
    writeAccountsOverviewFilterField(filterPersistenceScope, FILTER_TYPES_FIELD, filterTypes);
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

  const accounts = store.accounts;
  const loading = store.loading;

  const resolvePlanKey = useCallback(
    (account: CodebuddyAccount) => getCodebuddyPlanBadge(account),
    [],
  );

  const resolveTierBadgeClass = useCallback((plan: string) => {
    switch (plan.toUpperCase()) {
      case 'FREE':
        return 'free';
      case 'TRIAL':
        return 'trial';
      case 'PRO':
        return 'pro';
      case 'ENTERPRISE':
        return 'enterprise';
      default:
        return 'unknown';
    }
  }, []);

  const isAbnormalAccount = useCallback(
    (account: CodebuddyAccount) => !getCodebuddyUsage(account).isNormal,
    [],
  );

  const tierSummary = useMemo(() => {
    const dynamicCounts = new Map<string, number>();
    accounts.forEach((account) => {
      const tier = resolvePlanKey(account);
      dynamicCounts.set(tier, (dynamicCounts.get(tier) ?? 0) + 1);
    });
    const validCount = accounts.reduce(
      (count, account) => (isAbnormalAccount(account) ? count : count + 1),
      0,
    );
    const extraKeys = Array.from(dynamicCounts.keys())
      .filter((tier) => !(CB_KNOWN_PLAN_FILTERS as readonly string[]).includes(tier))
      .sort((a, b) => a.localeCompare(b));
    return { all: accounts.length, validCount, dynamicCounts, extraKeys };
  }, [accounts, isAbnormalAccount, resolvePlanKey]);

  const tierFilterOptions = useMemo<MultiSelectFilterOption[]>(() => {
    const options: MultiSelectFilterOption[] = [];
    CB_KNOWN_PLAN_FILTERS.forEach((plan) => {
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
  }, [t, tierSummary.dynamicCounts, tierSummary.extraKeys, tierSummary.validCount]);

  const filteredAccounts = useMemo(() => {
    let result = [...accounts];
    if (grouping.activeGroupId) {
      result = grouping.filterAccountsByGroup(result);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((account) =>
        [account.email, account.nickname || '', account.uid || '', account.enterprise_name || '', account.id]
          .some((item) => item.toLowerCase().includes(query)),
      );
    }
    if (filterTypes.length > 0) {
      const { requireValidAccounts, selectedTypes } = splitValidityFilterValues(filterTypes);
      if (requireValidAccounts) {
        result = result.filter((account) => !isAbnormalAccount(account));
      }
      if (selectedTypes.size > 0) {
        result = result.filter((account) => selectedTypes.has(resolvePlanKey(account)));
      }
    }
    if (tagFilter.length > 0) {
      const selectedTags = new Set(tagFilter.map(normalizeTag));
      result = result.filter((acc) => (acc.tags || []).map(normalizeTag).some((tag) => selectedTags.has(tag)));
    }
    result.sort((a, b) => {
      const currentFirstDiff = compareCurrentAccountFirst(a.id, b.id, currentAccountId);
      if (currentFirstDiff !== 0) {
        return currentFirstDiff;
      }

      const diff = b.created_at - a.created_at;
      return sortDirection === 'desc' ? diff : -diff;
    });
    return result;
  }, [accounts, grouping.activeGroupId, grouping.filterAccountsByGroup, currentAccountId, searchQuery, filterTypes, isAbnormalAccount, resolvePlanKey, tagFilter, normalizeTag, sortBy, sortDirection]);

  const filteredIds = useMemo(() => filteredAccounts.map((account) => account.id), [filteredAccounts]);
  const exportSelectionCount = getScopedSelectedCount(filteredIds);
  const pagination = usePagination({
    items: filteredAccounts,
    storageKey: buildPaginationPageSizeStorageKey('CodeBuddy'),
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
    const selectedTags = new Set(tagFilter.map(normalizeTag));
    filteredAccounts.forEach((account) => {
      const tags = (account.tags || []).map(normalizeTag).filter(Boolean);
      const matchedTags = selectedTags.size > 0 ? tags.filter((tag) => selectedTags.has(tag)) : tags;
      if (matchedTags.length === 0) {
        if (!groups.has(untaggedKey)) groups.set(untaggedKey, []);
        groups.get(untaggedKey)?.push(account);
        return;
      }
      matchedTags.forEach((tag) => {
        if (!groups.has(tag)) groups.set(tag, []);
        groups.get(tag)?.push(account);
      });
    });
    return Array.from(groups.entries()).sort(([aKey], [bKey]) => {
      if (aKey === untaggedKey) return -1;
      if (bKey === untaggedKey) return 1;
      return aKey.localeCompare(bKey);
    });
  }, [filteredAccounts, groupByTag, normalizeTag, tagFilter, untaggedKey]);

  const paginatedGroupedAccounts = useMemo(
    () => buildPaginatedGroups(groupedAccounts, paginatedAccounts),
    [groupedAccounts, paginatedAccounts],
  );

  const resolveGroupLabel = (groupKey: string) =>
    groupKey === untaggedKey ? t('accounts.defaultGroup', "Nhóm mặc định") : groupKey;

  const formatQuotaDateTime = useCallback((timeMs: number | null) => {
    if (timeMs == null || !Number.isFinite(timeMs)) return null;
    const date = new Date(timeMs);
    if (locale.startsWith('zh')) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hour = String(date.getHours()).padStart(2, '0');
      const minute = String(date.getMinutes()).padStart(2, '0');
      const second = String(date.getSeconds()).padStart(2, '0');
      return `${year}年 ${month}月${day}日 ${hour}:${minute}:${second}`;
    }
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }, [locale]);

  const resolveResourceTimeText = useCallback((resource: CodebuddyOfficialQuotaResource, isExtra: boolean) => {
    if (isExtra) return null;
    const isBase = resource.isBasePackage;
    const primaryTimeText = formatQuotaDateTime(isBase ? resource.refreshAt : resource.expireAt);
    if (primaryTimeText) {
      return isBase
        ? t('codebuddy.quotaQuery.updatedAt', "Lần truy vấn gần nhất: {{time}}", { time: primaryTimeText })
        : t('codebuddy.quotaQuery.expireAt', "Hết hạn lúc: {{time}}", { time: primaryTimeText });
    }
    const fallbackTimeText = formatQuotaDateTime(isBase ? resource.expireAt : resource.refreshAt);
    if (fallbackTimeText) {
      return isBase
        ? t('codebuddy.quotaQuery.expireAt', "Hết hạn lúc: {{time}}", { time: fallbackTimeText })
        : t('codebuddy.quotaQuery.updatedAt', "Lần truy vấn gần nhất: {{time}}", { time: fallbackTimeText });
    }
    return null;
  }, [formatQuotaDateTime, t]);

  const resolveResourcePackageTitle = useCallback((resource: CodebuddyOfficialQuotaResource, isExtra: boolean) => {
    if (isExtra || resource.packageCode === CB_PACKAGE_CODE.extra) {
      return t('codebuddy.extraCredit.title', "Gói cộng thêm");
    }
    if (resource.packageCode === CB_PACKAGE_CODE.activity) {
      return t('codebuddy.quotaQuery.packageTitle.activity', "Gói quà tặng sự kiện");
    }
    if (
      resource.packageCode === CB_PACKAGE_CODE.free ||
      resource.packageCode === CB_PACKAGE_CODE.gift ||
      resource.packageCode === CB_PACKAGE_CODE.freeMon
    ) {
      return t('codebuddy.quotaQuery.packageTitle.base', "Gói trải nghiệm cơ bản");
    }
    if (
      resource.packageCode === CB_PACKAGE_CODE.proMon ||
      resource.packageCode === CB_PACKAGE_CODE.proYear
    ) {
      return t('codebuddy.quotaQuery.packageTitle.pro', "Đăng ký Pro");
    }
    return resource.packageName || t('codebuddy.quotaQuery.packageUnknown', "Không rõ gói");
  }, [t]);

  const renderResourceQuotaItems = useCallback((account: CodebuddyAccount, variant: 'card' | 'table') => {
    const model = getCodebuddyOfficialQuotaModel(account);
    const extraResource: CodebuddyOfficialQuotaResource = {
      ...model.extra,
      packageName: t('codebuddy.extraCredit.title', "Gói cộng thêm"),
    };
    const allResources = [...model.resources, extraResource];

    return (
      <div className="codebuddy-official-quota-list">
        {allResources.map((resource, idx) => {
          const isExtra = idx === allResources.length - 1;
          const quotaClass = getQuotaClassByRemainPercent(resource.remainPercent);
          const usedPercent = clampPercent(resource.usedPercent);
          const quotaValueText = resource.unlimited
            ? t('common.shared.quota.unlimited', "Hạn mức không giới hạn")
            : `${formatQuotaNumber(resource.used)} / ${formatQuotaNumber(resource.total)}`;
          const timeText = resolveResourceTimeText(resource, isExtra);
          const packageName = resolveResourcePackageTitle(resource, isExtra);

          return (
            <div key={`${account.id}-${resource.packageCode || 'pkg'}-${idx}`} className="codebuddy-official-quota-row">
              <div className="quota-header">
                <span className="quota-label" title={packageName}>{packageName}</span>
                <span className={`quota-pct ${quotaClass}`}>{quotaValueText}</span>
              </div>
              {variant === 'card' ? (
                <div className="quota-bar-track">
                  <div className={`quota-bar ${quotaClass}`} style={{ width: `${usedPercent}%` }} />
                </div>
              ) : (
                <div className="quota-progress-track">
                  <div className={`quota-progress-bar ${quotaClass}`} style={{ width: `${usedPercent}%` }} />
                </div>
              )}
              {timeText ? (
                <div className="codebuddy-official-quota-meta-wrap">
                  <span className="codebuddy-official-quota-meta">{timeText}</span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }, [resolveResourcePackageTitle, resolveResourceTimeText, t]);

  const renderUsageInfo = useCallback((account: CodebuddyAccount) => {
    const usage = getCodebuddyUsage(account);
    return (
      <DosageNotifyUsageStatus
        usage={usage}
        locale={locale}
        accountLabel={maskAccountText(getCodebuddyAccountDisplayEmail(account))}
        normalText={t('codebuddy.usageNormal', "Bình thường")}
        abnormalText={t('codebuddy.usageAbnormal', "Bất thường")}
        viewDetailText={t('codebuddy.usageViewDetail', "Xem chi tiết")}
        detailTitle={t('codebuddy.usageDetailTitle', "Chi tiết trạng thái sử dụng")}
        accountText={t('common.shared.columns.account', "Tài khoản")}
        confirmText={t('common.confirm', "Xác nhận")}
        closeText={t('common.close', "Đóng")}
        classPrefix="codebuddy"
      />
    );
  }, [locale, maskAccountText, t]);

  const renderQuotaQuerySection = useCallback((account: CodebuddyAccount, variant: 'card' | 'table') => {
    const model = getCodebuddyOfficialQuotaModel(account);
    const hasQuotaData =
      model.resources.length > 0 || model.extra.total > 0 || model.extra.remain > 0 || model.extra.used > 0;
    const refreshFailed = !!account.quota_query_last_error?.trim();
    const shouldShowQuota = hasQuotaData;
    const statusText = refreshFailed
      ? t('codebuddy.quotaQuery.failedRefreshCompact', "Làm mới hạn ngạch thất bại")
      : t('codebuddy.quotaQuery.empty', "Chưa có thông tin truy vấn hạn ngạch được liên kết");
    const cachedWarningText = t(
      'common.shared.quota.cachedRefreshFailed',
      "Làm mới thất bại; đang hiển thị dữ liệu thành công gần nhất",
    );
    const updatedAtText = model.updatedAt != null
      ? formatQuotaDateTime(model.updatedAt)
      : null;
    return (
      <>
        <div className="quota-item">
          <div className="quota-header">
            <span className="quota-name">{t('codebuddy.usage', "Trạng thái sử dụng")}</span>
            {renderUsageInfo(account)}
          </div>
        </div>
        <div className="quota-item codebuddy-quota-item">
          <div className="quota-header codebuddy-quota-header">
            <span className="quota-name">{t('codebuddy.quotaQuery.sectionTitle', "Truy vấn hạn ngạch")}</span>
          </div>
          {refreshFailed && hasQuotaData && (
            <div className={`quota-cache-warning ${variant === 'table' ? 'table' : ''}`} role="status">
              <CircleAlert size={14} />
              <div className="quota-cache-warning-content">
                <span className="quota-cache-warning-title">{cachedWarningText}</span>
                {updatedAtText && (
                  <span className="quota-cache-warning-time">
                    {t('common.shared.quota.lastSuccessfulQuery', "Lần thành công gần nhất: {{time}}", {
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
            <div className="quota-empty">
              {statusText}
            </div>
          )}
        </div>
      </>
    );
  }, [formatQuotaDateTime, renderResourceQuotaItems, renderUsageInfo, t]);

  const renderGridCards = (items: typeof filteredAccounts, groupKey?: string) =>
    items.map((account) => {
      const displayEmail = getCodebuddyAccountDisplayEmail(account);
      const planBadge = resolvePlanKey(account);
      const tierBadgeClass = resolveTierBadgeClass(planBadge);
      const accountTags = (account.tags || []).map((tag) => tag.trim()).filter(Boolean);
      const visibleTags = accountTags.slice(0, 2);
      const moreTagCount = Math.max(0, accountTags.length - visibleTags.length);
      const isSelected = selected.has(account.id);
      const isCurrent = currentAccountId === account.id;
      return (
        <div key={groupKey ? `${groupKey}-${account.id}` : account.id}
          className={`ghcp-account-card ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}>
          <div className="card-top">
            <div className="card-select">
              <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(account.id)} />
            </div>
            <span className="account-email" title={maskAccountText(displayEmail)}>{maskAccountText(displayEmail)}</span>
            {isCurrent && <span className="current-tag">{t('accounts.status.current', "Hiện tại")}</span>}
            <span className={`tier-badge ${tierBadgeClass}`}>{planBadge}</span>
          </div>
          {accountTags.length > 0 && (
            <div className="card-tags">
              {visibleTags.map((tag, idx) => <span key={`${account.id}-${tag}-${idx}`} className="tag-pill">{tag}</span>)}
              {moreTagCount > 0 && <span className="tag-pill more">+{moreTagCount}</span>}
            </div>
          )}
          <div className="ghcp-quota-section">
            {renderQuotaQuerySection(account, 'card')}
          </div>
          <div className="card-footer">
            <span className="card-date">{formatDate(account.created_at)}</span>
            <div className="card-actions">
              <button className="card-action-btn success" onClick={() => handleInjectToVSCode?.(account.id)} disabled={!!injecting}
                title={t('common.shared.switchAccount', "Chuyển tài khoản")}>
                {injecting === account.id ? <RefreshCw size={14} className="loading-spinner" /> : <Play size={14} />}
              </button>
              <button className="card-action-btn" onClick={() => openTagModal(account.id)} title={t('accounts.editTags', "Chỉnh sửa thẻ")}><Tag size={14} /></button>
              <button className="card-action-btn" onClick={() => handleRefresh(account.id)} disabled={refreshing === account.id} title={t('common.shared.refreshQuota', "Làm mới hạn mức")}>
                <RotateCw size={14} className={refreshing === account.id ? 'loading-spinner' : ''} />
              </button>
              <button className="card-action-btn export-btn" onClick={() => handleExportByIds([account.id])} title={t('common.shared.export.title', "Xuất")}><Upload size={14} /></button>
              <button className="card-action-btn danger" onClick={() => handleDelete(account.id)} title={t('common.delete', "Xóa")}><Trash2 size={14} /></button>
            </div>
          </div>
        </div>
      );
    });

  const renderTableRows = (items: typeof filteredAccounts, _groupKey?: string) =>
    items.map((account) => {
      const displayEmail = getCodebuddyAccountDisplayEmail(account);
      const planBadge = resolvePlanKey(account);
      const tierBadgeClass = resolveTierBadgeClass(planBadge);
      const isSelected = selected.has(account.id);
      const isCurrent = currentAccountId === account.id;
      return (
        <tr key={account.id} className={`${isCurrent ? 'current-row' : ''} ${isSelected ? 'selected-row' : ''}`}>
          <td><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(account.id)} /></td>
          <td>
            <span className="table-email" title={maskAccountText(displayEmail)}>{maskAccountText(displayEmail)}</span>
            {isCurrent && <span className="current-tag">{t('accounts.status.current', "Hiện tại")}</span>}
          </td>
          <td><span className={`tier-badge ${tierBadgeClass}`}>{planBadge}</span></td>
          <td>
            <div className="codebuddy-table-usage">
              {renderQuotaQuerySection(account, 'table')}
            </div>
          </td>
          <td className="sticky-action-cell table-action-cell">
            <div className="action-buttons">
              <button className="action-btn success" onClick={() => handleInjectToVSCode?.(account.id)} disabled={!!injecting}><Play size={14} /></button>
              <button className="action-btn" onClick={() => openTagModal(account.id)}><Tag size={14} /></button>
              <button className="action-btn" onClick={() => handleRefresh(account.id)} disabled={refreshing === account.id}><RotateCw size={14} className={refreshing === account.id ? 'loading-spinner' : ''} /></button>
              <button className="action-btn" onClick={() => handleExportByIds([account.id])}><Upload size={14} /></button>
              <button className="action-btn danger" onClick={() => handleDelete(account.id)}><Trash2 size={14} /></button>
            </div>
          </td>
        </tr>
      );
    });

  return (
    <div className="ghcp-accounts-page codebuddy-accounts-page">
      <PlatformOverviewTabsHeader
        platform="codebuddy"
        active={activeTab}
        onTabChange={setActiveTab}
        tabs={['overview', 'sessions', 'instances']}
      />
      {activeTab === 'instances' ? (
        <CodebuddyInstancesContent accountsForSelect={filteredAccounts} />
      ) : activeTab === 'sessions' ? (
        <CodebuddySessionManager platform="intl" accounts={store.accounts as any} />
      ) : (
        <>
      <div className={`ghcp-flow-notice ${isFlowNoticeCollapsed ? 'collapsed' : ''}`} role="note">
        <button type="button" className="ghcp-flow-notice-toggle" onClick={() => setIsFlowNoticeCollapsed((prev) => !prev)}>
          <div className="ghcp-flow-notice-title">
            <CircleAlert size={16} />
            <span>{t('codebuddy.flowNotice.title', "Hướng dẫn quản lý tài khoản CodeBuddy (bấm để mở rộng/thu gọn)")}</span>
          </div>
          <ChevronDown size={16} className={`ghcp-flow-notice-arrow ${isFlowNoticeCollapsed ? 'collapsed' : ''}`} />
        </button>
        {!isFlowNoticeCollapsed && (
          <div className="ghcp-flow-notice-body">
            <div className="ghcp-flow-notice-desc">
              {t('codebuddy.flowNotice.desc', "Khi chuyển tài khoản, ứng dụng cần đọc vùng lưu xác thực cục bộ của CodeBuddy và gọi dịch vụ chứng thực hệ thống để giải mã/mã hóa lại. Dữ liệu chỉ được xử lý cục bộ.")}
            </div>
            <ul className="ghcp-flow-notice-list">
              <li>{t('codebuddy.flowNotice.permission', "Phạm vi quyền: đọc cơ sở dữ liệu xác thực CodeBuddy (state.vscdb), gọi khả năng chứng thực hệ thống (macOS Keychain / Windows DPAPI / Linux Secret Service) để giải mã và ghi lại.")}</li>
              <li>{t('codebuddy.flowNotice.network', "Phạm vi mạng: đăng nhập OAuth và làm mới Token cần gửi yêu cầu đến codebuddy.ai; truy vấn hạn ngạch sẽ gọi API tính phí. Không tải lên khóa hoặc thông tin xác thực cục bộ.")}</li>
            </ul>
          </div>
        )}
      </div>

      {message && (
        <div className={`message-bar ${message.tone === 'error' ? 'error' : 'success'}`}>
          {message.text}
          <button onClick={() => setMessage(null)}><X size={14} /></button>
        </div>
      )}

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder={t('codebuddy.search', "Tìm kiếm tài khoản CodeBuddy...")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="view-switcher">
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title={t('common.shared.view.list', "Dạng danh sách")}><List size={16} /></button>
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title={t('common.shared.view.grid', "Dạng thẻ")}><LayoutGrid size={16} /></button>
          </div>
          <MultiSelectFilterDropdown
            options={tierFilterOptions}
            selectedValues={filterTypes}
            allLabel={t('common.shared.filter.all', "Tất cả ({{count}})", { count: tierSummary.all })}
            filterLabel={t('common.shared.filterLabel', "Bộ lọc")}
            clearLabel={t('accounts.clearFilter', "Xóa bộ lọc")}
            emptyLabel={t('common.none', "None​")}
            ariaLabel={t('common.shared.filterLabel', "Bộ lọc")}
            onToggleValue={toggleFilterTypeValue}
            onClear={clearFilterTypes}
          />
          <div className="tag-filter" ref={tagFilterRef}>
            <button type="button" className={`tag-filter-btn ${tagFilter.length > 0 ? 'active' : ''}`} onClick={() => setShowTagFilter((prev) => !prev)}>
              <Tag size={14} />
              {tagFilter.length > 0 ? `${t('accounts.filterTagsCount', "Thẻ")}(${tagFilter.length})` : t('accounts.filterTags', "Lọc thẻ")}
            </button>
            {showTagFilter && (
              <div
                ref={page.tagFilterPanelRef}
                className={`tag-filter-panel ${page.tagFilterPanelPlacement === 'top' ? 'open-top' : ''}`}
              >
                {availableTags.length === 0 ? (
                  <div className="tag-filter-empty">{t('accounts.noAvailableTags', "Không có thẻ nào")}</div>
                ) : (
                  <>
                    <div className="tag-filter-header">
                      <label className="group-toggle"><input type="checkbox" checked={groupByTag} onChange={() => setGroupByTag(!groupByTag)} /> {t('accounts.groupByTag', "Nhóm theo thẻ")}</label>
                      {tagFilter.length > 0 && <button className="tag-filter-clear" onClick={clearTagFilter}>{t('common.shared.clear', "Xóa")}</button>}
                    </div>
                    <div className="tag-filter-list" style={page.tagFilterScrollContainerStyle}>
                      {availableTags.map((tag) => (
                        <label key={tag} className="tag-filter-item">
                          <input type="checkbox" checked={tagFilter.includes(tag)} onChange={() => toggleTagFilterValue(tag)} />
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
          <button className="btn btn-primary icon-only" onClick={() => openAddModal('oauth')} title={t('common.shared.addAccount', "Thêm tài khoản")}><Plus size={14} /></button>
          <button className="btn btn-secondary icon-only" onClick={handleRefreshAll} disabled={refreshingAll || accounts.length === 0} title={t('common.shared.refreshAll', "Làm mới tất cả")}>
            <RefreshCw size={14} className={refreshingAll ? 'loading-spinner' : ''} />
          </button>
          <button className="btn btn-secondary icon-only" onClick={togglePrivacyMode}
            title={privacyModeEnabled ? t('privacy.showSensitive', "Hiện email") : t('privacy.hideSensitive', "Ẩn email")}>
            {privacyModeEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button className="btn btn-secondary icon-only" onClick={() => openAddModal('token')} disabled={importing} title={t('common.shared.import.label', "Nhập")}><Download size={14} /></button>
          <button className="btn btn-secondary export-btn icon-only" onClick={() => void handleExport(filteredIds)} disabled={exporting || filteredIds.length === 0}
            title={exportSelectionCount > 0 ? `${t('common.shared.export.title', "Xuất")} (${exportSelectionCount})` : t('common.shared.export.title', "Xuất")}>
            <Upload size={14} />
          </button>
          <QuickSettingsPopover type="codebuddy" />
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
        <div className="loading-container"><RefreshCw size={24} className="loading-spinner" /><p>{t('common.loading', "Đang tải...")}</p></div>
      ) : accounts.length === 0 ? (
        <div className="empty-state">
          <Globe size={48} />
          <h3>{t('common.shared.empty.title', "Chưa có tài khoản")}</h3>
          <p>{t('codebuddy.noAccounts', "Chưa có tài khoản CodeBuddy")}</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={() => openAddModal('oauth')}>
              <Plus size={16} /> {t('common.shared.addAccount', "Thêm tài khoản")}
            </button>
          </div>
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
                <th style={{ width: 40 }}><input type="checkbox" checked={isAllPaginatedSelected} onChange={() => toggleSelectAll(paginatedIds)} /></th>
                <th style={{ width: 240 }}>{t('common.shared.columns.email', "E-mail")}</th>
                <th style={{ width: 120 }}>{t('common.shared.columns.plan', "Gói")}</th>
                <th>{t('codebuddy.quotaQuery.sectionTitle', "Truy vấn hạn ngạch")}</th>
                <th className="sticky-action-header table-action-header">{t('common.shared.columns.actions', "Hành động")}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGroupedAccounts.map(({ groupKey, items, totalCount }) => (
                <Fragment key={groupKey}>
                  <tr className="tag-group-row"><td colSpan={5}><div className="tag-group-header"><span className="tag-group-title">{resolveGroupLabel(groupKey)}</span><span className="tag-group-count">{totalCount}</span></div></td></tr>
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
                <th style={{ width: 40 }}><input type="checkbox" checked={isAllPaginatedSelected} onChange={() => toggleSelectAll(paginatedIds)} /></th>
                <th style={{ width: 240 }}>{t('common.shared.columns.email', "E-mail")}</th>
                <th style={{ width: 120 }}>{t('common.shared.columns.plan', "Gói")}</th>
                <th>{t('codebuddy.quotaQuery.sectionTitle', "Truy vấn hạn ngạch")}</th>
                <th className="sticky-action-header table-action-header">{t('common.shared.columns.actions', "Hành động")}</th>
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
            <div className="modal-content ghcp-add-modal platform-account-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('codebuddy.addAccount', "Thêm tài khoản CodeBuddy")}</h2>
              <button className="modal-close" onClick={closeAddModal}><X size={18} /></button>
            </div>
            <div className="modal-tabs">
              <button className={`modal-tab ${addTab === 'oauth' ? 'active' : ''}`} onClick={() => openAddModal('oauth')}><Globe size={14} /> {t('common.shared.addModal.oauth', "Ủy quyền OAuth")}</button>
              <button className={`modal-tab ${addTab === 'token' ? 'active' : ''}`} onClick={() => openAddModal('token')}><KeyRound size={14} />{t('common.shared.addModal.token', 'Token / JSON')}</button>
              <button className={`modal-tab ${addTab === 'json' ? 'active' : ''}`} onClick={() => openAddModal('json')}><Database size={14} />{t('common.shared.addModal.import', "Nhập từ máy")}</button>
            </div>
            <div className="modal-body">
              <MfaQuickCodeSelect />
              {addTab === 'oauth' && (
                <div className="add-section oauth-section">
                  <p className="section-desc">
                    {t('codebuddy.oauthDesc', "Bấm nút bên dưới để mở trang ủy quyền CodeBuddy trong trình duyệt.")}
                  </p>
                  <div className="codebuddy-oauth-feature-card oauth">
                    <p className="feature-title">
                      {t('codebuddy.oauthFeature.oauth.title', "Chỉ ủy quyền thông tin đăng nhập IDE")}
                    </p>
                    <ul className="feature-list">
                      <li>{t('codebuddy.oauthFeature.oauth.item1', "Sau khi hoàn tất OAuth trong trình duyệt, bạn có thể thêm tài khoản và dùng để chuyển IDE.")}</li>
                      <li>{t('codebuddy.oauthFeature.oauth.item2', "Tham số truy vấn hạn ngạch sẽ không được liên kết tự động.")}</li>
                      <li>{t('codebuddy.oauthFeature.oauth.item3', "Nếu cần hiển thị hạn ngạch, hãy chạy thủ công \"Truy vấn hạn ngạch\" trên thẻ tài khoản.")}</li>
                    </ul>
                  </div>
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
                      <div className="oauth-url-box">
                        <input
                          type="text"
                          value={oauthUrl}
                          readOnly
                          placeholder={t('codebuddy.oauthUrlInputPlaceholder', "Có thể nhập URL ủy quyền thủ công")}
                        />
                        <button onClick={handleCopyOauthUrl}>
                          {oauthUrlCopied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      {!oauthUrl.includes('user_code=') && oauthUserCode && (
                        <div className="oauth-url-box">
                          <input type="text" value={oauthUserCode} readOnly />
                          <button onClick={handleCopyOauthUserCode}>
                            {oauthUserCodeCopied ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>
                      )}
                      {oauthMeta && (
                        <p className="oauth-hint">
                          {t('common.shared.oauth.meta', "Hết hạn sau: {{expires}}s; chu kỳ thăm dò: {{interval}}s", {
                            expires: oauthMeta.expiresIn,
                            interval: oauthMeta.intervalSeconds,
                          })}
                        </p>
                      )}
                      <button
                        className="btn btn-primary btn-full"
                        onClick={handleOpenOauthUrl}
                      >
                        <Globe size={16} />
                        {t('common.shared.oauth.openBrowser', "Mở trong trình duyệt")}
                      </button>
                      {oauthPolling && (
                        <div className="add-status loading">
                          <RefreshCw size={16} className="loading-spinner" />
                          <span>{t('codebuddy.oauthWaiting', "Đang chờ hoàn tất ủy quyền...")}</span>
                        </div>
                      )}
                      {oauthCompleteError && (
                        <div className="add-status error">
                          <CircleAlert size={16} />
                          <span>{oauthCompleteError}</span>
                          {oauthTimedOut && (
                            <button className="btn btn-sm btn-outline" onClick={handleRetryOauth}>
                              {t('common.shared.oauth.timeoutRetry', "Làm mới liên kết ủy quyền")}
                            </button>
                          )}
                        </div>
                      )}
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
                <div className="add-section token-section">
                  <p className="section-desc">{t('codebuddy.tokenDesc', "Dán access token của CodeBuddy:")}</p>
                  <textarea className="token-input" value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder={t('common.shared.token.placeholder', "Ví dụ: ghu_xxx / sk-ws-xxx / {\"access_token\":\"eyJ...\",\"refresh_token\":\"rt_...\"} / [{...}]")} />
                  <button className="btn btn-primary btn-full" onClick={handleTokenImport} disabled={importing || !tokenInput.trim()}>
                    {importing ? <RefreshCw size={16} className="loading-spinner" /> : <Download size={16} />}
                    {t('common.shared.token.import', 'Import')}
                  </button>
                </div>
              )}
              {addTab === 'json' && (
                <div className="add-section json-section">
                  <p className="section-desc">{t('codebuddy.import.localDesc', "Hỗ trợ nhập dữ liệu tài khoản từ ứng dụng CodeBuddy cục bộ hoặc từ tệp JSON.")}</p>
                  <button className="btn btn-secondary btn-full" onClick={() => handleImportFromLocal?.()} disabled={importing}>
                    {importing ? <RefreshCw size={16} className="loading-spinner" /> : <Database size={16} />}
                    {t('codebuddy.import.localClient', "Nhập từ CodeBuddy cục bộ")}
                  </button>
                  <div className="oauth-hint" style={{ margin: '8px 0 4px' }}>{t('common.shared.import.orJson', "Hoặc nhập từ tệp JSON")}</div>
                  <input ref={importFileInputRef} type="file" accept="application/json" style={{ display: 'none' }}
                    onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; void handleImportJsonFile(file); }} />
                  <button className="btn btn-primary btn-full" onClick={handlePickImportFile} disabled={importing}>
                    {importing ? <RefreshCw size={16} className="loading-spinner" /> : <Database size={16} />}
                    {t('common.shared.import.pickFile', "Chọn tệp JSON để nhập")}
                  </button>
                </div>
              )}

              {addStatus !== 'idle' && addStatus !== 'loading' && (
                <div className={`add-status ${addStatus}`}>
                  {addStatus === 'success' ? <Check size={16} /> : <CircleAlert size={16} />}
                  <span>{addMessage || t('common.shared.loginSuccess', "Đăng nhập thành công")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('common.confirmDelete', "Xác nhận xóa")}</h2>
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
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)} disabled={deleting}>{t('common.cancel', "Hủy")}</button>
              <button className="btn btn-danger" onClick={confirmDelete} disabled={deleting}>{deleting ? t('common.processing', "Đang xử lý...") : t('common.confirm', "Xác nhận")}</button>
            </div>
          </div>
        </div>
      )}

      {tagDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('common.confirmDeleteTag', "Xác nhận xóa thẻ")}</h2>
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
              <p>{t('common.deleteTagWarning', { tag: tagDeleteConfirm, defaultValue: '确定要从所有账号中移除标签 "{{tag}}" 吗？' })}</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setTagDeleteConfirm(null)} disabled={deletingTag}>{t('common.cancel', "Hủy")}</button>
              <button className="btn btn-danger" onClick={confirmDeleteTag} disabled={deletingTag}>{deletingTag ? t('common.processing', "Đang xử lý...") : t('common.confirm', "Xác nhận")}</button>
            </div>
          </div>
        </div>
      )}

      <ExportJsonModal
        isOpen={showExportModal}
        title={`${t('common.shared.export.title', "Xuất")} JSON`}
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
        </>
      )}
    </div>
  );
}
