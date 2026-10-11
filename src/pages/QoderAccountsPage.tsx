import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownWideNarrow,
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
  Check,
} from 'lucide-react';
import { confirm as confirmDialog } from '@tauri-apps/plugin-dialog';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from 'react-i18next';
import { TagEditModal } from '../components/TagEditModal';
import { ExportJsonModal } from '../components/ExportJsonModal';
import { ModalErrorMessage, useModalErrorState } from '../components/ModalErrorMessage';
import { MfaQuickCodeSelect } from '../components/MfaQuickCodeSelect';
import { PaginationControls } from '../components/PaginationControls';
import { AccountSelectionToolbar } from '../components/AccountSelectionToolbar';
import { usePlatformAccountGroups } from '../hooks/usePlatformAccountGroups';
import { QuickSettingsPopover } from '../components/QuickSettingsPopover';
import { MultiSelectFilterDropdown, type MultiSelectFilterOption } from '../components/MultiSelectFilterDropdown';
import { SingleSelectFilterDropdown } from '../components/SingleSelectFilterDropdown';
import { useEscClose } from '../hooks/useEscClose';
import { useEnterConfirm } from '../hooks/useEnterConfirm';
import {
  PlatformOverviewTab,
  PlatformOverviewTabsHeader,
} from '../components/platform/PlatformOverviewTabsHeader';
import { QoderInstancesContent } from './QoderInstancesPage';
import { useQoderAccountStore } from '../stores/useQoderAccountStore';
import * as qoderService from '../services/qoderService';
import {
  QoderAccount,
  getQoderAccountDisplayEmail,
  getQoderPlanBadge,
  getQoderSubscriptionInfo,
  getQoderUsage,
  hasQoderQuotaData,
  shouldShowQoderSubscriptionReset,
} from '../types/qoder';
import {
  isPrivacyModeEnabledByDefault,
  maskSensitiveValue,
  persistPrivacyModeEnabled,
} from '../utils/privacy';
import { useExportJsonModal } from '../hooks/useExportJsonModal';
import { useDropdownPanelPlacement } from '../hooks/useDropdownPanelPlacement';
import { parseFileCorruptedError } from '../components/FileCorruptedModal';
import { compareCurrentAccountFirst } from '../utils/currentAccountSort';
import {
  consumeQueuedExternalProviderImportForPlatform,
  EXTERNAL_PROVIDER_IMPORT_EVENT,
} from '../utils/externalProviderImport';
import {
  buildValidAccountsFilterOption,
  splitValidityFilterValues,
  VALID_ACCOUNTS_FILTER_VALUE,
} from '../utils/accountValidityFilter';
import {
  buildPaginatedGroups,
  buildPaginationPageSizeStorageKey,
  isEveryIdSelected,
  usePagination,
} from '../hooks/usePagination';
import {
  ACCOUNTS_OVERVIEW_FILTER_PERSISTENCE_CHANGED_EVENT,
  type AccountsOverviewFilterPersistenceChangedDetail,
  normalizeAccountsOverviewScope,
  readAccountsOverviewFilterField,
  readAccountsOverviewFilterPersistenceEnabled,
  readAccountsOverviewFilterStringArray,
  removeAccountsOverviewFilterField,
  writeAccountsOverviewFilterField,
} from '../utils/accountsOverviewFilterPersistence';

const QODER_FLOW_NOTICE_COLLAPSED_KEY = 'agtools.qoder.flow_notice_collapsed';
const QODER_FILTER_PERSISTENCE_SCOPE = normalizeAccountsOverviewScope('qoder');
const QODER_FILTER_FIELD_VIEW_MODE = 'view_mode';
const QODER_FILTER_FIELD_SORT_BY = 'sort_by';
const QODER_FILTER_FIELD_SORT_DIRECTION = 'sort_direction';
const QODER_FILTER_FIELD_FILTER_TYPES = 'filter_types';
const QODER_FILTER_FIELD_TAG_FILTER = 'tag_filter';
const QODER_FILTER_FIELD_GROUP_BY_TAG = 'group_by_tag';
const UNTAGGED_KEY = '__untagged__';

type ViewMode = 'grid' | 'list';
type SortBy = 'created_at' | 'plan' | 'quota';
type SortDirection = 'asc' | 'desc';

type QoderQuotaDisplayItem = {
  key: 'included' | 'creditPackage' | 'sharedCreditPackage';
  label: string;
  normalizedPercent: number;
  quotaClass: 'high' | 'medium' | 'critical';
  percentageText: string | null;
  valueText: string;
  showProgress: boolean;
};

type QoderQuotaDisplay = {
  planTag: string;
  planClass: string;
  items: QoderQuotaDisplayItem[];
  resetText: string | null;
};

function readBooleanStorage(key: string, fallback: boolean) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
}

function writeBooleanStorage(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore
  }
}

function normalizeQoderViewMode(value: unknown): ViewMode {
  return value === 'list' ? 'list' : 'grid';
}

function normalizeQoderSortBy(value: unknown): SortBy {
  return value === 'plan' || value === 'quota' || value === 'created_at'
    ? value
    : 'created_at';
}

function normalizeQoderSortDirection(value: unknown): SortDirection {
  return value === 'asc' ? 'asc' : 'desc';
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '--';
  const hasDecimal = Math.abs(value - Math.trunc(value)) > 0.001;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: hasDecimal ? 2 : 0,
  }).format(value);
}

function formatDateTime(value: number): string {
  const date = new Date(value * 1000);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDisplayDate(value: number): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatQuotaValue(value: number | null | undefined): string {
  return formatNumber(value ?? 0);
}

function resolveQoderPlanBadgeClass(plan: string): string {
  const normalized = plan.trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (normalized.includes('free')) return 'free';
  if (normalized.includes('trial')) return 'trial';
  if (normalized.includes('pro')) return 'pro';
  if (normalized.includes('team')) return 'team';
  if (normalized.includes('enterprise')) return 'enterprise';
  if (normalized.includes('business')) return 'business';
  if (normalized.includes('individual') || normalized.includes('personal')) return 'individual';
  if (normalized.includes('plus')) return 'plus';
  if (normalized.includes('ultra')) return 'ultra';
  return 'unknown';
}

function computeQuotaClass(percent: number | null): 'high' | 'medium' | 'critical' {
  if (percent == null) return 'high';
  if (percent >= 90) return 'critical';
  if (percent >= 70) return 'medium';
  return 'high';
}

function logQoderOauthUi(stage: string, payload?: Record<string, unknown>) {
  if (payload) {
    console.info('[Qoder OAuth UI]', stage, payload);
    return;
  }
  console.info('[Qoder OAuth UI]', stage);
}

const QODER_OAUTH_START_TIMEOUT_ERROR = 'QODER_OAUTH_START_TIMEOUT';
const QODER_OAUTH_START_TIMEOUT_MS = 10000;
const QODER_OAUTH_PEEK_TIMEOUT_ERROR = 'QODER_OAUTH_PEEK_TIMEOUT';
const QODER_OAUTH_PEEK_TIMEOUT_MS = 1200;
const QODER_OAUTH_PEEK_RETRY_MAX = 8;
const QODER_OAUTH_PEEK_RETRY_INTERVAL_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutCode: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timeoutCode));
    }, timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

export function QoderAccountsPage() {
  const { t } = useTranslation();
  const store = useQoderAccountStore();
  const initialFilterPersistenceEnabled =
    readAccountsOverviewFilterPersistenceEnabled(QODER_FILTER_PERSISTENCE_SCOPE);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<PlatformOverviewTab>('overview');
  const [filterPersistenceEnabled, setFilterPersistenceEnabled] = useState<boolean>(
    initialFilterPersistenceEnabled,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    initialFilterPersistenceEnabled
      ? normalizeQoderViewMode(
          readAccountsOverviewFilterField<unknown>(
            QODER_FILTER_PERSISTENCE_SCOPE,
            QODER_FILTER_FIELD_VIEW_MODE,
            'grid',
          ),
        )
      : 'grid',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTypes, setFilterTypes] = useState<string[]>(() =>
    initialFilterPersistenceEnabled
      ? readAccountsOverviewFilterStringArray(
          QODER_FILTER_PERSISTENCE_SCOPE,
          QODER_FILTER_FIELD_FILTER_TYPES,
        )
      : [],
  );
  const [sortBy, setSortBy] = useState<SortBy>(() =>
    initialFilterPersistenceEnabled
      ? normalizeQoderSortBy(
          readAccountsOverviewFilterField<unknown>(
            QODER_FILTER_PERSISTENCE_SCOPE,
            QODER_FILTER_FIELD_SORT_BY,
            'created_at',
          ),
        )
      : 'created_at',
  );
  const [sortDirection, setSortDirection] = useState<SortDirection>(() =>
    initialFilterPersistenceEnabled
      ? normalizeQoderSortDirection(
          readAccountsOverviewFilterField<unknown>(
            QODER_FILTER_PERSISTENCE_SCOPE,
            QODER_FILTER_FIELD_SORT_DIRECTION,
            'desc',
          ),
        )
      : 'desc',
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const grouping = usePlatformAccountGroups('qoder', () => setSelected(new Set()));
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<'oauth' | 'token' | 'import'>('import');

  useEscClose(showAddModal, () => setShowAddModal(false));
  const [addStatus, setAddStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [oauthLoginId, setOauthLoginId] = useState<string | null>(null);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [oauthPreparing, setOauthPreparing] = useState(false);
  const [oauthCompleting, setOauthCompleting] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [oauthUrlCopied, setOauthUrlCopied] = useState(false);
  const oauthSessionRef = useRef<string | null>(null);
  const oauthCompletingLoginIdRef = useRef<string | null>(null);
  const oauthAttemptSeqRef = useRef(0);
  const handlePrepareOauthRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [message, setMessage] = useState<{ text: string; tone?: 'error' } | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [injecting, setInjecting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showTagModal, setShowTagModal] = useState<string | null>(null);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [tagFilter, setTagFilter] = useState<string[]>(() =>
    initialFilterPersistenceEnabled
      ? readAccountsOverviewFilterStringArray(
          QODER_FILTER_PERSISTENCE_SCOPE,
          QODER_FILTER_FIELD_TAG_FILTER,
        )
      : [],
  );
  const [tagDeleteConfirm, setTagDeleteConfirm] = useState<{ tag: string; count: number } | null>(null);
  const {
    message: tagDeleteConfirmError,
    scrollKey: tagDeleteConfirmErrorScrollKey,
    set: setTagDeleteConfirmError,
  } = useModalErrorState();
  const [deletingTag, setDeletingTag] = useState(false);
  const tagFilterRef = useRef<HTMLDivElement | null>(null);
  const [groupByTag, setGroupByTag] = useState<boolean>(() =>
    initialFilterPersistenceEnabled
      ? Boolean(
          readAccountsOverviewFilterField<unknown>(
            QODER_FILTER_PERSISTENCE_SCOPE,
            QODER_FILTER_FIELD_GROUP_BY_TAG,
            false,
          ),
        )
      : false,
  );
  const [isFlowNoticeCollapsed, setIsFlowNoticeCollapsed] = useState<boolean>(() =>
    readBooleanStorage(QODER_FLOW_NOTICE_COLLAPSED_KEY, false),
  );
  const [privacyModeEnabled, setPrivacyModeEnabled] = useState<boolean>(() =>
    isPrivacyModeEnabledByDefault(),
  );

  useEffect(() => {
    const handleFilterPersistenceChanged = (event: Event) => {
      const detail = (event as CustomEvent<AccountsOverviewFilterPersistenceChangedDetail>).detail;
      if (!detail || detail.scope !== QODER_FILTER_PERSISTENCE_SCOPE) {
        return;
      }
      setFilterPersistenceEnabled(Boolean(detail.enabled));
    };
    window.addEventListener(
      ACCOUNTS_OVERVIEW_FILTER_PERSISTENCE_CHANGED_EVENT,
      handleFilterPersistenceChanged as EventListener,
    );
    return () => {
      window.removeEventListener(
        ACCOUNTS_OVERVIEW_FILTER_PERSISTENCE_CHANGED_EVENT,
        handleFilterPersistenceChanged as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!filterPersistenceEnabled) {
      removeAccountsOverviewFilterField(
        QODER_FILTER_PERSISTENCE_SCOPE,
        QODER_FILTER_FIELD_VIEW_MODE,
      );
      return;
    }
    writeAccountsOverviewFilterField(
      QODER_FILTER_PERSISTENCE_SCOPE,
      QODER_FILTER_FIELD_VIEW_MODE,
      viewMode,
    );
  }, [filterPersistenceEnabled, viewMode]);

  useEffect(() => {
    if (!filterPersistenceEnabled) {
      removeAccountsOverviewFilterField(
        QODER_FILTER_PERSISTENCE_SCOPE,
        QODER_FILTER_FIELD_SORT_BY,
      );
      return;
    }
    writeAccountsOverviewFilterField(
      QODER_FILTER_PERSISTENCE_SCOPE,
      QODER_FILTER_FIELD_SORT_BY,
      sortBy,
    );
  }, [filterPersistenceEnabled, sortBy]);

  useEffect(() => {
    if (!filterPersistenceEnabled) {
      removeAccountsOverviewFilterField(
        QODER_FILTER_PERSISTENCE_SCOPE,
        QODER_FILTER_FIELD_SORT_DIRECTION,
      );
      return;
    }
    writeAccountsOverviewFilterField(
      QODER_FILTER_PERSISTENCE_SCOPE,
      QODER_FILTER_FIELD_SORT_DIRECTION,
      sortDirection,
    );
  }, [filterPersistenceEnabled, sortDirection]);

  useEffect(() => {
    if (!filterPersistenceEnabled) {
      removeAccountsOverviewFilterField(
        QODER_FILTER_PERSISTENCE_SCOPE,
        QODER_FILTER_FIELD_FILTER_TYPES,
      );
      return;
    }
    writeAccountsOverviewFilterField(
      QODER_FILTER_PERSISTENCE_SCOPE,
      QODER_FILTER_FIELD_FILTER_TYPES,
      filterTypes,
    );
  }, [filterPersistenceEnabled, filterTypes]);

  useEffect(() => {
    if (!filterPersistenceEnabled) {
      removeAccountsOverviewFilterField(
        QODER_FILTER_PERSISTENCE_SCOPE,
        QODER_FILTER_FIELD_TAG_FILTER,
      );
      return;
    }
    writeAccountsOverviewFilterField(
      QODER_FILTER_PERSISTENCE_SCOPE,
      QODER_FILTER_FIELD_TAG_FILTER,
      tagFilter,
    );
  }, [filterPersistenceEnabled, tagFilter]);

  useEffect(() => {
    if (!filterPersistenceEnabled) {
      removeAccountsOverviewFilterField(
        QODER_FILTER_PERSISTENCE_SCOPE,
        QODER_FILTER_FIELD_GROUP_BY_TAG,
      );
      return;
    }
    writeAccountsOverviewFilterField(
      QODER_FILTER_PERSISTENCE_SCOPE,
      QODER_FILTER_FIELD_GROUP_BY_TAG,
      groupByTag,
    );
  }, [filterPersistenceEnabled, groupByTag]);

  useEffect(() => {
    if (!store.error) return;

    const corrupted = parseFileCorruptedError(store.error);
    if (corrupted) {
      setMessage({
        text: t('error.fileCorrupted.description', "Tệp {{fileName}} bị hỏng và không thể phân tích.", {
          fileName: corrupted.file_name,
        }),
        tone: 'error',
      });
      return;
    }

    setMessage({
      text: String(store.error).replace(/^Error:\s*/, ''),
      tone: 'error',
    });
  }, [store.error, t]);

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
  const fetchAccounts = store.fetchAccounts;

  const exportModal = useExportJsonModal({
    exportFilePrefix: 'qoder_accounts',
    exportJsonByIds: qoderService.exportQoderAccounts,
    onError: (error) =>
      setMessage({
        tone: 'error',
        text: t('accounts.exportError', "Xuất thất bại: {{error}}", { error: String(error) }),
      }),
  });

  const maskAccountText = useCallback(
    (value?: string | null) => maskSensitiveValue(value, privacyModeEnabled),
    [privacyModeEnabled],
  );

  const syncPrivacyMode = useCallback(() => {
    setPrivacyModeEnabled(isPrivacyModeEnabledByDefault());
  }, []);

  const resetOauthState = useCallback(() => {
    oauthAttemptSeqRef.current += 1;
    oauthSessionRef.current = null;
    oauthCompletingLoginIdRef.current = null;
    setOauthLoginId(null);
    setOauthUrl(null);
    setOauthPreparing(false);
    setOauthCompleting(false);
    setOauthError(null);
    setOauthUrlCopied(false);
  }, []);

  const openAddModal = useCallback((tab: 'oauth' | 'token' | 'import' = 'oauth') => {
    setAddTab(tab);
    setShowAddModal(true);
  }, []);

  const consumeExternalProviderImport = useCallback(() => {
    const request = consumeQueuedExternalProviderImportForPlatform('qoder');
    if (!request) return;
    openAddModal('token');
    setTokenInput(request.token);
    setAddStatus('idle');
    setAddMessage(null);
  }, [openAddModal]);

  useEffect(() => {
    const handleExternalImportEvent = () => {
      consumeExternalProviderImport();
    };
    consumeExternalProviderImport();
    window.addEventListener(EXTERNAL_PROVIDER_IMPORT_EVENT, handleExternalImportEvent);
    return () => {
      window.removeEventListener(EXTERNAL_PROVIDER_IMPORT_EVENT, handleExternalImportEvent);
    };
  }, [consumeExternalProviderImport]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncPrivacyMode();
      }
    };
    window.addEventListener('focus', syncPrivacyMode);
    window.addEventListener('storage', syncPrivacyMode);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', syncPrivacyMode);
      window.removeEventListener('storage', syncPrivacyMode);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [syncPrivacyMode]);

  useEffect(() => {
    void fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentAccountId = store.currentAccountId;

  useEffect(() => {
    if (!showAddModal) {
      oauthAttemptSeqRef.current += 1;
      const loginId = oauthSessionRef.current ?? oauthLoginId ?? undefined;
      if (loginId) {
        logQoderOauthUi('session:cancel-on-modal-close', { loginId });
        void qoderService.qoderOauthLoginCancel(loginId).catch(() => {});
      }
      setAddStatus('idle');
      setAddMessage(null);
      setAddTab('import');
      setTokenInput('');
      resetOauthState();
    }
  }, [oauthLoginId, resetOauthState, showAddModal]);

  useEffect(() => {
    if (!showAddModal || addTab === 'oauth') return;
    oauthAttemptSeqRef.current += 1;
    const loginId = oauthSessionRef.current ?? oauthLoginId ?? undefined;
    if (loginId) {
      logQoderOauthUi('session:cancel-on-tab-change', { loginId, addTab });
      void qoderService.qoderOauthLoginCancel(loginId).catch(() => {});
    }
    resetOauthState();
  }, [addTab, oauthLoginId, resetOauthState, showAddModal]);

  useEffect(
    () => () => {
      oauthAttemptSeqRef.current += 1;
      const loginId = oauthSessionRef.current ?? undefined;
      if (loginId) {
        logQoderOauthUi('session:cancel-on-unmount', { loginId });
        void qoderService.qoderOauthLoginCancel(loginId).catch(() => {});
      }
      oauthSessionRef.current = null;
      oauthCompletingLoginIdRef.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!showTagFilter) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (tagFilterRef.current?.contains(target)) return;
      setShowTagFilter(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [showTagFilter]);

  const isAbnormalAccount = useCallback((_account: QoderAccount) => false, []);

  const tierSummary = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set('UNKNOWN', 0);
    for (const account of accounts) {
      const plan = getQoderPlanBadge(account) || 'UNKNOWN';
      counts.set(plan, (counts.get(plan) ?? 0) + 1);
    }
    const entries = Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));
    return {
      all: accounts.length,
      valid: accounts.reduce(
        (count, account) => (isAbnormalAccount(account) ? count : count + 1),
        0,
      ),
      entries,
    };
  }, [accounts, isAbnormalAccount]);

  const allFilterLabel = useMemo(() => {
    const text = t('common.shared.filter.all', {
      count: tierSummary.all,
      defaultValue: 'All ({{count}})',
    });
    if (!text.includes('{{count}}')) return text;
    return text.replace('{{count}}', String(tierSummary.all));
  }, [t, tierSummary.all]);

  const tierFilterOptions = useMemo<MultiSelectFilterOption[]>(
    () => [
      ...tierSummary.entries.map(([plan, count]) => ({
        value: plan,
        label: `${plan} (${count})`,
      })),
      buildValidAccountsFilterOption(t, tierSummary.valid),
    ],
    [t, tierSummary.entries, tierSummary.valid],
  );

  useEffect(() => {
    const allowed = new Set(tierSummary.entries.map(([plan]) => plan));
    allowed.add(VALID_ACCOUNTS_FILTER_VALUE);
    setFilterTypes((prev) => {
      const next = prev.filter((value) => allowed.has(value));
      return next.length === prev.length ? prev : next;
    });
  }, [tierSummary.entries]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const account of accounts) {
      for (const rawTag of account.tags || []) {
        const normalized = normalizeTag(rawTag);
        if (normalized) tagSet.add(normalized);
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [accounts]);
  const {
    panelRef: tagFilterPanelRef,
    panelPlacement: tagFilterPanelPlacement,
    scrollContainerStyle: tagFilterScrollContainerStyle,
  } = useDropdownPanelPlacement(tagFilterRef, showTagFilter, availableTags.length);

  const compareAccountsBySort = useCallback(
    (a: QoderAccount, b: QoderAccount) => {
      const currentFirstDiff = compareCurrentAccountFirst(a.id, b.id, currentAccountId);
      if (currentFirstDiff !== 0) {
        return currentFirstDiff;
      }

      if (sortBy === 'plan') {
        const left = getQoderPlanBadge(a);
        const right = getQoderPlanBadge(b);
        const cmp = left.localeCompare(right);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (sortBy === 'quota') {
        const left = getQoderUsage(a).inlineSuggestionsUsedPercent ?? -1;
        const right = getQoderUsage(b).inlineSuggestionsUsedPercent ?? -1;
        const cmp = left - right;
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      const cmp = a.created_at - b.created_at;
      return sortDirection === 'asc' ? cmp : -cmp;
    },
    [currentAccountId, sortBy, sortDirection],
  );

  const filteredAccounts = useMemo(() => {
    let result = [...accounts];

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((account) => {
        const text = `${getQoderAccountDisplayEmail(account)} ${account.user_id || ''} ${getQoderPlanBadge(account)}`.toLowerCase();
        return text.includes(query);
      });
    }

    if (filterTypes.length > 0) {
      const { requireValidAccounts, selectedTypes } = splitValidityFilterValues(filterTypes);
      if (requireValidAccounts) {
        result = result.filter((account) => !isAbnormalAccount(account));
      }
      if (selectedTypes.size > 0) {
        result = result.filter((account) => selectedTypes.has(getQoderPlanBadge(account)));
      }
    }

    if (tagFilter.length > 0) {
      const selectedTags = new Set(tagFilter.map(normalizeTag));
      result = result.filter((account) =>
        (account.tags || []).some((tag) => selectedTags.has(normalizeTag(tag))),
      );
    }

    if (grouping.activeGroupId) {
      result = grouping.filterAccountsByGroup(result);
    }

    result.sort(compareAccountsBySort);
    return result;
  }, [accounts, compareAccountsBySort, filterTypes, grouping, isAbnormalAccount, searchQuery, tagFilter]);

  const groupedAccounts = useMemo(() => {
    if (!groupByTag) return [] as Array<[string, QoderAccount[]]>;
    const groups = new Map<string, QoderAccount[]>();
    const selectedTags = new Set(tagFilter.map(normalizeTag));

    for (const account of filteredAccounts) {
      const tags = (account.tags || []).map(normalizeTag).filter(Boolean);
      const matched = selectedTags.size > 0 ? tags.filter((tag) => selectedTags.has(tag)) : tags;
      if (matched.length === 0) {
        const list = groups.get(UNTAGGED_KEY) || [];
        list.push(account);
        groups.set(UNTAGGED_KEY, list);
        continue;
      }
      for (const tag of matched) {
        const list = groups.get(tag) || [];
        list.push(account);
        groups.set(tag, list);
      }
    }

    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === UNTAGGED_KEY) return -1;
      if (b === UNTAGGED_KEY) return 1;
      return a.localeCompare(b);
    });
  }, [filteredAccounts, groupByTag, tagFilter]);

  const filteredIds = useMemo(() => filteredAccounts.map((item) => item.id), [filteredAccounts]);
  const pagination = usePagination({
    items: filteredAccounts,
    storageKey: buildPaginationPageSizeStorageKey('Qoder'),
  });
  const paginatedAccounts = pagination.pageItems;
  const paginatedIds = useMemo(() => paginatedAccounts.map((item) => item.id), [paginatedAccounts]);
  const paginatedGroupedAccounts = useMemo(
    () => buildPaginatedGroups(groupedAccounts, paginatedAccounts),
    [groupedAccounts, paginatedAccounts],
  );
  const visibleSelectedCount = useMemo(
    () => filteredIds.filter((id) => selected.has(id)).length,
    [filteredIds, selected],
  );
  const allSelected = isEveryIdSelected(selected, paginatedIds);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (paginatedIds.length === 0) return;
    setSelected((prev) => {
      const next = new Set(prev);
      const pageFullySelected = paginatedIds.every((id) => next.has(id));
      if (pageFullySelected) {
        paginatedIds.forEach((id) => next.delete(id));
      } else {
        paginatedIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [paginatedIds]);

  const togglePrivacyMode = useCallback(() => {
    setPrivacyModeEnabled((prev) => {
      const next = !prev;
      persistPrivacyModeEnabled(next);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(
    async (accountId: string) => {
      if (refreshing === accountId) return;
      setRefreshing(accountId);
      try {
        await store.refreshToken(accountId);
        setMessage({ text: t('accounts.refreshSuccess', "Làm mới thành công") });
      } catch (error) {
        setMessage({
          tone: 'error',
          text: t('accounts.refreshFailed', "Làm mới thất bại: {{error}}", { error: String(error) }),
        });
      } finally {
        setRefreshing(null);
      }
    },
    [refreshing, store, t],
  );

  const handleRefreshAll = useCallback(async () => {
    if (refreshingAll) return;
    setRefreshingAll(true);
    try {
      await store.refreshAllTokens();
      setMessage({ text: t('accounts.refreshAllSuccess', "Đã làm mới tất cả tài khoản") });
    } catch (error) {
      setMessage({
        tone: 'error',
        text: t('accounts.refreshAllFailed', "Làm mới tất cả thất bại: {{error}}", { error: String(error) }),
      });
    } finally {
      setRefreshingAll(false);
    }
  }, [refreshingAll, store, t]);

  const handleSwitch = useCallback(
    async (accountId: string) => {
      if (injecting === accountId) return;
      setInjecting(accountId);
      try {
        await store.switchAccount(accountId);
        setMessage({ text: t('accounts.switchSuccess', "Chuyển đổi thành công") });
      } catch (error) {
        setMessage({
          tone: 'error',
          text: t('accounts.switchFailed', "Chuyển đổi thất bại: {{error}}", { error: String(error) }),
        });
      } finally {
        setInjecting(null);
      }
    },
    [injecting, store, t],
  );

  const handleDeleteAccounts = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0 || deleting) return;
      const confirmed = await confirmDialog(
        ids.length === 1
          ? t('accounts.deleteConfirm.single', "Xóa tài khoản này?")
          : t('accounts.deleteConfirm.multi', "Xóa {{count}} tài khoản đã chọn?", { count: ids.length }),
        {
          title: t('common.appName', 'Cockpit Tools'),
          kind: 'warning',
          okLabel: t('common.confirm', "Xác nhận"),
          cancelLabel: t('common.cancel', "Hủy"),
        },
      );
      if (!confirmed) return;

      setDeleting(true);
      try {
        await store.deleteAccounts(ids);
        setSelected(new Set());
        setMessage({ text: t('accounts.deleteSuccess', "Xóa thành công") });
      } catch (error) {
        setMessage({
          tone: 'error',
          text: t('accounts.deleteFailed', "Xóa thất bại: {{error}}", { error: String(error) }),
        });
      } finally {
        setDeleting(false);
      }
    },
    [deleting, store, t],
  );

  const handleSaveTags = useCallback(
    async (accountId: string, tags: string[]) => {
      const scrollY = window.scrollY;
      await store.updateAccountTags(accountId, tags);
      setMessage({ text: t('accounts.tagUpdated', "Thẻ đã được cập nhật") });
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: 'auto' });
        });
      });
    },
    [store, t],
  );

  const toggleTagFilterValue = useCallback((tag: string) => {
    setTagFilter((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  }, []);

  const clearTagFilter = useCallback(() => {
    setTagFilter([]);
  }, []);

  const requestDeleteTag = useCallback(
    (tag: string) => {
      const normalized = normalizeTag(tag);
      const count = accounts.reduce((acc, account) => {
        const hasTag = (account.tags || []).some((item) => normalizeTag(item) === normalized);
        return hasTag ? acc + 1 : acc;
      }, 0);
      if (count <= 0) return;
      setTagDeleteConfirmError(null);
      setTagDeleteConfirm({ tag, count });
    },
    [accounts],
  );

  const confirmDeleteTag = useCallback(async () => {
    if (!tagDeleteConfirm || deletingTag) return;
    setTagDeleteConfirmError(null);
    const normalized = normalizeTag(tagDeleteConfirm.tag);
    const targets = accounts.filter((account) =>
      (account.tags || []).some((item) => normalizeTag(item) === normalized),
    );
    if (targets.length === 0) {
      setTagDeleteConfirm(null);
      setTagDeleteConfirmError(null);
      return;
    }

    setDeletingTag(true);
    try {
      for (const account of targets) {
        const nextTags = (account.tags || []).filter((item) => normalizeTag(item) !== normalized);
        await store.updateAccountTags(account.id, nextTags);
      }
      setTagFilter((prev) => prev.filter((item) => normalizeTag(item) !== normalized));
      setTagDeleteConfirm(null);
      setTagDeleteConfirmError(null);
      setMessage({ text: t('accounts.tagUpdated', "Thẻ đã được cập nhật") });
    } catch (error) {
      setTagDeleteConfirmError(
        t('accounts.deleteTagFailed', "Xóa thẻ thất bại: {{error}}", { error: String(error) }),
      );
    } finally {
      setDeletingTag(false);
    }
  }, [accounts, deletingTag, store, t, tagDeleteConfirm]);

  useEscClose(Boolean(tagDeleteConfirm) && !deletingTag, () => {
    setTagDeleteConfirm(null);
    setTagDeleteConfirmError(null);
  });
  useEnterConfirm(Boolean(tagDeleteConfirm) && !deletingTag, () => {
    void confirmDeleteTag();
  });

  const handleImportLocal = useCallback(async () => {
    if (addStatus === 'loading') return;
    setAddStatus('loading');
    setAddMessage(null);
    try {
      await qoderService.importQoderFromLocal();
      await store.fetchAccounts();
      await new Promise((resolve) => setTimeout(resolve, 180));
      await store.fetchAccounts();
      setAddStatus('success');
      setAddMessage(t('qoder.import.localSuccess', "Đã nhập tài khoản từ Qoder cục bộ."));
    } catch (error) {
      setAddStatus('error');
      setAddMessage(t('qoder.import.localFailed', "Nhập cục bộ thất bại: {{error}}", { error: String(error) }));
    }
  }, [addStatus, store, t]);

  const handleImportJsonFile = useCallback(
    async (file: File) => {
      if (addStatus === 'loading') return;
      setAddStatus('loading');
      setAddMessage(null);
      try {
        const content = await file.text();
        await store.importFromJson(content);
        await store.fetchAccounts();
        setAddStatus('success');
        setAddMessage(t('accounts.importJsonSuccess', "Nhập JSON thành công"));
      } catch (error) {
        setAddStatus('error');
        setAddMessage(t('accounts.importJsonFailed', "Nhập JSON thất bại: {{error}}", { error: String(error) }));
      }
    },
    [addStatus, store, t],
  );

  const handleTokenImport = useCallback(async () => {
    if (addStatus === 'loading') return;
    const payload = tokenInput.trim();
    if (!payload) {
      setAddStatus('error');
      setAddMessage(t('common.shared.token.empty', "Vui lòng nhập Token hoặc JSON"));
      return;
    }
    setAddStatus('loading');
    setAddMessage(null);
    try {
      const imported = await store.importFromJson(payload);
      await store.fetchAccounts();
      setAddStatus('success');
      setAddMessage(
        t('common.shared.token.importSuccessMsg', "Đã nhập {{count}} tài khoản", {
          count: imported.length,
        }),
      );
    } catch (error) {
      setAddStatus('error');
      setAddMessage(
        t('common.shared.token.importFailedMsg', "Nhập thất bại: {{error}}", {
          error: String(error),
        }),
      );
    }
  }, [addStatus, store, t, tokenInput]);

  const handlePrepareOauth = useCallback(async () => {
    if (oauthPreparing || oauthCompleting) return;
    const attemptSeq = ++oauthAttemptSeqRef.current;
    logQoderOauthUi('prepare:start', {
      oauthPreparing,
      oauthCompleting,
      hasExistingSession: Boolean(oauthSessionRef.current ?? oauthLoginId),
      attemptSeq,
    });
    const previousLoginId = oauthSessionRef.current ?? oauthLoginId ?? undefined;
    if (previousLoginId) {
      logQoderOauthUi('prepare:cancel-previous', { loginId: previousLoginId });
      await qoderService.qoderOauthLoginCancel(previousLoginId).catch(() => {});
    }

    oauthSessionRef.current = null;
    setOauthLoginId(null);
    setOauthUrl(null);
    setOauthUrlCopied(false);
    setOauthError(null);
    setAddStatus('idle');
    setAddMessage(null);
    setOauthPreparing(true);
    setOauthCompleting(false);

    try {
      const startCompletePolling = (loginId: string) => {
        if (oauthCompletingLoginIdRef.current === loginId) return;
        oauthCompletingLoginIdRef.current = loginId;
        setOauthCompleting(true);
        void qoderService
          .qoderOauthLoginComplete(loginId)
          .then(async (completedAccount) => {
            logQoderOauthUi('complete:resolved', { loginId });
            if (attemptSeq !== oauthAttemptSeqRef.current) return;
            if (oauthSessionRef.current !== loginId) return;

            // fetchAccounts 将列表读取异常写入 store.error 而不会 reject。
            // 授权完成必须以“新账号已在列表中可见”为准，避免出现绿色成功但账号未加载的假成功状态。
            let accountVisible = false;
            let listError: string | null = null;
            for (let attempt = 0; attempt < 3; attempt += 1) {
              await store.fetchAccounts();
              const state = useQoderAccountStore.getState();
              listError = state.error;
              accountVisible = state.accounts.some(
                (account) =>
                  account.id === completedAccount.id ||
                  (completedAccount.email && account.email === completedAccount.email),
              );
              if (accountVisible) break;
              if (attempt < 2) await delay(150);
            }
            if (!accountVisible) {
              logQoderOauthUi('complete:account-not-visible-after-refresh', {
                loginId,
                accountId: completedAccount.id,
                error: listError,
              });
              setOauthError(listError);
              setAddStatus('error');
              setAddMessage(t('common.shared.oauth.failed', "Ủy quyền thất bại"));
              setOauthCompleting(false);
              oauthCompletingLoginIdRef.current = null;
              return;
            }

            setAddStatus('success');
            setAddMessage(t('common.shared.oauth.success', "Ủy quyền thành công"));
            setOauthError(null);
            setOauthCompleting(false);
            oauthSessionRef.current = null;
            oauthCompletingLoginIdRef.current = null;
            setOauthLoginId(null);
            setShowAddModal(false);
          })
          .catch((error) => {
            logQoderOauthUi('complete:rejected', {
              loginId,
              error: String(error),
            });
            if (attemptSeq !== oauthAttemptSeqRef.current) return;
            if (oauthSessionRef.current !== loginId) return;
            const msg = String(error);
            setOauthError(msg);
            setAddStatus('error');
            setAddMessage(t('common.shared.oauth.failed', "Ủy quyền thất bại") + ': ' + msg);
            setOauthCompleting(false);
            oauthCompletingLoginIdRef.current = null;
          });
      };

      let response: qoderService.QoderOAuthStartResponse;
      try {
        logQoderOauthUi('prepare:invoke-start', { timeoutMs: QODER_OAUTH_START_TIMEOUT_MS });
        response = await withTimeout(
          qoderService.qoderOauthLoginStart(),
          QODER_OAUTH_START_TIMEOUT_MS,
          QODER_OAUTH_START_TIMEOUT_ERROR,
        );
        if (attemptSeq !== oauthAttemptSeqRef.current) {
          void qoderService.qoderOauthLoginCancel(response.loginId).catch(() => {});
          logQoderOauthUi('prepare:start-stale-after-start', {
            loginId: response.loginId,
            attemptSeq,
          });
          return;
        }
        logQoderOauthUi('prepare:invoke-resolved', {
          loginId: response.loginId,
          verificationUri: response.verificationUri?.slice(0, 60),
          verificationUriLen: response.verificationUri?.length,
          callbackUrl: response.callbackUrl ?? null,
          rawKeys: Object.keys(response),
        });
      } catch (startError) {
        const startErrorText = String(startError);
        const isTimeout = startErrorText.includes(QODER_OAUTH_START_TIMEOUT_ERROR);
        if (!isTimeout) {
          throw startError;
        }

        logQoderOauthUi('prepare:start-timeout', {
          timeoutMs: QODER_OAUTH_START_TIMEOUT_MS,
          error: startErrorText,
        });

        let peeked: qoderService.QoderOAuthStartResponse | null = null;
        for (let attempt = 1; attempt <= QODER_OAUTH_PEEK_RETRY_MAX; attempt += 1) {
          if (attemptSeq !== oauthAttemptSeqRef.current) return;
          const pending = await withTimeout(
            qoderService.qoderOauthLoginPeek(),
            QODER_OAUTH_PEEK_TIMEOUT_MS,
            QODER_OAUTH_PEEK_TIMEOUT_ERROR,
          ).catch((peekError) => {
            const errorText = String(peekError);
            logQoderOauthUi('prepare:peek-error', {
              attempt,
              error: errorText,
              timeout: errorText.includes(QODER_OAUTH_PEEK_TIMEOUT_ERROR),
            });
            return null;
          });
          if (attemptSeq !== oauthAttemptSeqRef.current) {
            if (pending?.loginId) {
              void qoderService.qoderOauthLoginCancel(pending.loginId).catch(() => {});
            }
            return;
          }
          if (pending?.loginId && pending?.verificationUri) {
            peeked = pending;
            logQoderOauthUi('prepare:peek-hit', {
              attempt,
              loginId: pending.loginId,
              verificationUriLength: pending.verificationUri.length,
            });
            break;
          }
          await delay(QODER_OAUTH_PEEK_RETRY_INTERVAL_MS);
        }

        if (!peeked) {
          throw startError;
        }
        response = peeked;
      }

      if (attemptSeq !== oauthAttemptSeqRef.current) {
        void qoderService.qoderOauthLoginCancel(response.loginId).catch(() => {});
        logQoderOauthUi('prepare:start-stale-before-apply', {
          loginId: response.loginId,
          attemptSeq,
        });
        return;
      }

      const loginId = response.loginId;
      const verificationUri =
        response.verificationUri ||
        (response as unknown as { verification_uri?: string }).verification_uri ||
        '';
      if (!verificationUri) {
        const responseKeys = Object.keys(response);
        logQoderOauthUi('prepare:verification-uri-empty', {
          loginId,
          responseKeyCount: responseKeys.length,
          responseKeys: responseKeys.slice(0, 12),
        });
        throw new Error('Qoder OAuth 授权链接为空');
      }
      logQoderOauthUi('prepare:will-set-state', {
        loginId,
        verificationUriLength: verificationUri.length,
        callbackUrl: response.callbackUrl ?? null,
        currentOauthSessionRef: oauthSessionRef.current,
      });
      oauthSessionRef.current = loginId;
      setOauthLoginId(loginId);
      setOauthUrl(verificationUri);
      setOauthPreparing(false);
      logQoderOauthUi('prepare:state-set-done', { loginId });
      startCompletePolling(loginId);
    } catch (error) {
      if (attemptSeq !== oauthAttemptSeqRef.current) return;
      logQoderOauthUi('prepare:start-failed', { error: String(error) });
      const msg = String(error);
      setOauthPreparing(false);
      setOauthCompleting(false);
      setOauthError(msg);
      setAddStatus('error');
      setAddMessage(t('common.shared.oauth.failed', "Ủy quyền thất bại") + ': ' + msg);
    }
  }, [oauthCompleting, oauthLoginId, oauthPreparing, store, t]);

  // Keep a stable ref to avoid putting handlePrepareOauth in useEffect deps
  handlePrepareOauthRef.current = handlePrepareOauth;

  const handleOpenOauthUrl = useCallback(async () => {
    if (!oauthUrl) return;
    try {
      logQoderOauthUi('link:open-browser', { urlLength: oauthUrl.length });
      await openUrl(oauthUrl);
    } catch (error) {
      logQoderOauthUi('link:open-browser-failed', { error: String(error) });
      const msg = String(error);
      setOauthError(msg);
      setAddStatus('error');
      setAddMessage(t('common.shared.oauth.failed', "Ủy quyền thất bại") + ': ' + msg);
    }
  }, [oauthUrl, t]);

  const handleCopyOauthUrl = useCallback(async () => {
    if (!oauthUrl) return;
    try {
      await navigator.clipboard.writeText(oauthUrl);
      setOauthUrlCopied(true);
      window.setTimeout(() => setOauthUrlCopied(false), 1200);
    } catch {
      // ignore
    }
  }, [oauthUrl]);

  useEffect(() => {
    if (!showAddModal || addTab !== 'oauth') return;
    if (oauthUrl || oauthPreparing || oauthCompleting) return;
    logQoderOauthUi('effect:auto-prepare-fire');
    void handlePrepareOauthRef.current?.();
  }, [addTab, oauthCompleting, oauthPreparing, oauthUrl, showAddModal]);

  useEffect(() => {
    if (!showAddModal || addTab !== 'oauth') return;
    if (!oauthPreparing || oauthUrl) return;

    let cancelled = false;
    const adoptPendingSession = async () => {
      const pending = await qoderService.qoderOauthLoginPeek().catch(() => null);
      if (cancelled || !pending?.loginId) return;
      const verificationUri =
        pending.verificationUri ||
        (pending as unknown as { verification_uri?: string }).verification_uri ||
        '';
      if (!verificationUri) return;

      if (!oauthSessionRef.current) oauthSessionRef.current = pending.loginId;
      if (!oauthLoginId) setOauthLoginId(pending.loginId);
      setOauthPreparing(false);
      setOauthUrl(verificationUri);
      setOauthError(null);
      logQoderOauthUi('prepare:adopt-pending-session', {
        loginId: pending.loginId,
        verificationUriLength: verificationUri.length,
      });
    };

    const timer = window.setInterval(() => {
      void adoptPendingSession();
    }, 800);
    void adoptPendingSession();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [addTab, oauthLoginId, oauthPreparing, oauthUrl, showAddModal]);

  const handlePickImportFile = useCallback(() => {
    importFileInputRef.current?.click();
  }, []);

  const onImportFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      void handleImportJsonFile(file);
      event.target.value = '';
    },
    [handleImportJsonFile],
  );

  const handleExportByIds = useCallback(
    async (ids: string[], fileNameBase?: string) => {
      if (ids.length === 0) return;
      await exportModal.startExport(ids, fileNameBase);
    },
    [exportModal],
  );

  const handleExportSelected = useCallback(async () => {
    const visibleIdSet = new Set(filteredIds);
    const selectedVisibleIds = Array.from(selected).filter((id) => visibleIdSet.has(id));
    const ids = selectedVisibleIds.length > 0 ? selectedVisibleIds : filteredIds;
    await handleExportByIds(ids, 'qoder_accounts');
  }, [filteredIds, handleExportByIds, selected]);

  const formatRelativeDuration = useCallback(
    (seconds: number) => {
      if (seconds < 60) {
        return t('common.shared.time.lessThanMinute', "<1 phút");
      }
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        const remainingHours = hours % 24;
        if (remainingHours > 0) {
          return t('common.shared.time.relativeDaysHours', "{{days}} ngày {{hours}} giờ", {
            days,
            hours: remainingHours,
          });
        }
        return t('common.shared.time.relativeDays', "{{days}} ngày", { days });
      }
      if (hours > 0) {
        const remainingMinutes = minutes % 60;
        if (remainingMinutes > 0) {
          return t('common.shared.time.relativeHoursMinutes', "{{hours}} giờ {{minutes}} phút", {
            hours,
            minutes: remainingMinutes,
          });
        }
        return t('common.shared.time.relativeHours', "{{hours}} giờ", { hours });
      }
      return t('common.shared.time.relativeMinutes', "{{minutes}} phút", { minutes });
    },
    [t],
  );

  const resolveUpdatedText = useCallback(
    (account: QoderAccount) => {
      const updatedAt = account.last_used || account.created_at || 0;
      const secondsAgo = Math.max(0, Math.floor(Date.now() / 1000) - updatedAt);
      return t('common.shared.updated.label', "Cập nhật {{relative}} trước", {
        relative: formatRelativeDuration(secondsAgo),
      });
    },
    [formatRelativeDuration, t],
  );

  const resolveQuotaDisplay = useCallback(
    (account: QoderAccount): QoderQuotaDisplay => {
      const subscription = getQoderSubscriptionInfo(account);
      const resetAt = shouldShowQoderSubscriptionReset(subscription) ? subscription.expiresAt : null;
      const buildQuotaItem = (
        key: 'included' | 'creditPackage',
        label: string,
        used: number | null | undefined,
        total: number | null | undefined,
        percentage: number | null | undefined,
      ): QoderQuotaDisplayItem => {
        const normalizedUsed = used ?? 0;
        const normalizedTotal = total ?? 0;
        const resolvedPercent =
          percentage ?? (normalizedTotal > 0 ? (normalizedUsed / normalizedTotal) * 100 : 0);
        const normalizedPercent = Math.max(0, Math.min(100, Math.round(resolvedPercent)));

        return {
          key,
          label,
          normalizedPercent,
          quotaClass: computeQuotaClass(resolvedPercent),
          percentageText: `${normalizedPercent}%`,
          valueText: t('qoder.usageOverview.usedOfTotal', {
            used: formatQuotaValue(normalizedUsed),
            total: formatQuotaValue(normalizedTotal),
            defaultValue: '{{used}} / {{total}}',
          }),
          showProgress: true,
        };
      };

      return {
        planTag: subscription.planTag,
        planClass: resolveQoderPlanBadgeClass(subscription.planTag),
        items: [
          buildQuotaItem(
            'included',
            t('qoder.usageOverview.includedCredits', "Credits trong gói"),
            subscription.userQuota.used,
            subscription.userQuota.total,
            subscription.userQuota.percentage,
          ),
          buildQuotaItem(
            'creditPackage',
            t('common.shared.columns.creditPackage', 'Credit Package'),
            subscription.addOnQuota.used,
            subscription.addOnQuota.total,
            subscription.addOnQuota.percentage,
          ),
          {
            key: 'sharedCreditPackage',
            label: t('common.shared.columns.sharedCreditPackage', 'Shared Credit Package'),
            normalizedPercent: 0,
            quotaClass: 'high',
            percentageText: null,
            valueText: formatQuotaValue(subscription.sharedCreditPackageUsed),
            showProgress: false,
          },
        ],
        resetText:
          resetAt != null
            ? t('trae.quota.resetAt', {
                date: formatDisplayDate(resetAt),
                defaultValue: 'Subscription reset: {{date}}',
              })
            : null,
      };
    },
    [t],
  );

  const renderQuotaSection = useCallback(
    (account: QoderAccount) => {
      if (!hasQoderQuotaData(account)) {
        return (
          <div className="ghcp-quota-section qoder-usage-section">
            <div className="quota-empty">{t('common.shared.quota.noData', "Không có dữ liệu hạn mức")}</div>
          </div>
        );
      }

      const quota = resolveQuotaDisplay(account);

      return (
        <div className="ghcp-quota-section qoder-usage-section">
          {quota.items.map((item) => (
            <div
              key={item.key}
              className={`quota-item windsurf-credit-item qoder-usage-item ${item.showProgress ? '' : 'is-stat'}`}
            >
              <div className="quota-header">
                <span className="qoder-usage-label-wrap">
                  <span className="quota-label qoder-usage-label">{item.label}</span>
                </span>
              </div>
              {item.showProgress && (
                <div className="quota-bar-track">
                  <div
                    className={`quota-bar ${item.quotaClass}`}
                    style={{ width: `${item.normalizedPercent}%` }}
                  />
                </div>
              )}
              <div className={`windsurf-credit-meta-row ${item.showProgress ? '' : 'qoder-usage-meta-row-stat'}`}>
                {item.percentageText ? (
                  <span className="windsurf-credit-left qoder-usage-meta-primary">{item.percentageText}</span>
                ) : null}
                <span className="windsurf-credit-used qoder-usage-meta-secondary">{item.valueText}</span>
              </div>
            </div>
          ))}
          {quota.resetText && <div className="quota-reset qoder-usage-reset-note">{quota.resetText}</div>}
        </div>
      );
    },
    [resolveQuotaDisplay, t],
  );

  const renderGridCards = useCallback(
    (items: QoderAccount[], groupKey?: string) =>
      items.map((account) => {
        const maskedEmail = maskAccountText(getQoderAccountDisplayEmail(account));
        const isCurrent = currentAccountId === account.id;
        const isSelected = selected.has(account.id);
        const accountTags = (account.tags || []).map((tag) => tag.trim()).filter(Boolean);
        const visibleTags = accountTags.slice(0, 2);
        const moreTagCount = Math.max(0, accountTags.length - visibleTags.length);
        const plan = getQoderPlanBadge(account);
        const planClass = resolveQoderPlanBadgeClass(plan);
        const updatedText = resolveUpdatedText(account);
        const createdAtText = formatDateTime(account.created_at);
        const isRefreshing = refreshing === account.id;
        const isInjecting = injecting === account.id;
        const quotaError = account.quota_query_last_error?.trim();

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
              <span className="account-email" title={maskedEmail}>
                {maskedEmail}
              </span>
              {quotaError && (
                <span className="status-pill warning" title={quotaError}>
                  <CircleAlert size={12} />
                  {t('common.shared.quota.queryFailed', "Truy vấn hạn mức thất bại")}
                </span>
              )}
              <span className={`tier-badge ${planClass} raw-value`}>{plan}</span>
              {isCurrent && <span className="current-tag">{t('accounts.status.current', "Hiện tại")}</span>}
            </div>

            <div className="account-sub-line qoder-account-subline">
              <span className="kiro-table-subline" title={createdAtText}>
                {updatedText}
              </span>
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

            {renderQuotaSection(account)}

            <div className="card-footer">
              <span className="card-date qoder-card-created-at" title={createdAtText}>
                {updatedText}
              </span>
              <div className="card-actions">
                <button
                  className="card-action-btn success"
                  onClick={() => void handleSwitch(account.id)}
                  title={t('dashboard.switch', "Chuyển")}
                  disabled={isInjecting || deleting}
                >
                  {isInjecting ? <RotateCw size={14} className="loading-spinner" /> : <Play size={14} />}
                </button>
                <button
                  className="card-action-btn"
                  onClick={() => setShowTagModal(account.id)}
                  title={t('accounts.tagButton', "Chỉnh sửa thẻ")}
                  disabled={isInjecting || deleting}
                >
                  <Tag size={14} />
                </button>
                <button
                  className="card-action-btn"
                  onClick={() => void handleRefresh(account.id)}
                  title={t('common.refresh', "Làm mới")}
                  disabled={isRefreshing || isInjecting || deleting}
                >
                  <RefreshCw size={14} className={isRefreshing ? 'loading-spinner' : ''} />
                </button>
                <button
                  className="card-action-btn export-btn"
                  onClick={() => void handleExportByIds([account.id], getQoderAccountDisplayEmail(account))}
                  title={t('accounts.actions.export', "Xuất")}
                  disabled={exportModal.preparing || exportModal.saving}
                >
                  <Download size={14} />
                </button>
                <button
                  className="card-action-btn danger"
                  onClick={() => void handleDeleteAccounts([account.id])}
                  title={t('accounts.actions.delete', "Xóa")}
                  disabled={deleting}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      }),
    [
      currentAccountId,
      deleting,
      exportModal.preparing,
      exportModal.saving,
      handleDeleteAccounts,
      handleExportByIds,
      handleRefresh,
      handleSwitch,
      injecting,
      maskAccountText,
      refreshing,
      renderQuotaSection,
      resolveUpdatedText,
      selected,
      t,
      toggleSelect,
    ],
  );

  const renderListRows = useCallback(
    (items: QoderAccount[], groupKey?: string) =>
      items.map((account) => {
        const plan = getQoderPlanBadge(account);
        const planClass = resolveQoderPlanBadgeClass(plan);
        const quota = resolveQuotaDisplay(account);
        const isCurrent = currentAccountId === account.id;
        const isSelected = selected.has(account.id);
        const isRefreshing = refreshing === account.id;
        const isInjecting = injecting === account.id;
        const quotaError = account.quota_query_last_error?.trim();
        return (
          <tr key={groupKey ? `${groupKey}-${account.id}` : account.id} className={isCurrent ? 'current' : undefined}>
            <td>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelect(account.id)}
              />
            </td>
            <td title={maskAccountText(getQoderAccountDisplayEmail(account))}>
              <div className="account-cell">
                <div className="account-main-line">
                  {maskAccountText(getQoderAccountDisplayEmail(account))}
                </div>
                {quotaError && (
                  <div className="account-sub-line">
                    <span className="status-pill warning" title={quotaError}>
                      <CircleAlert size={12} />
                      {t('common.shared.quota.queryFailed', "Truy vấn hạn mức thất bại")}
                    </span>
                  </div>
                )}
              </div>
            </td>
            <td>{maskAccountText(account.user_id || '--')}</td>
            <td>
              <span className={`tier-badge raw-value ${planClass}`}>{plan}</span>
            </td>
            <td>
              <div className="qoder-table-quota">
                {quota.items.map((item) => (
                  <div
                    key={item.key}
                    className={`quota-item qoder-table-quota-item ${item.showProgress ? '' : 'is-stat'}`}
                  >
                    <div className="qoder-usage-summary-row">
                      <span className="qoder-usage-label-wrap">
                        <span className="quota-name qoder-usage-label">{item.label}</span>
                      </span>
                      {item.percentageText && (
                        <span className={`quota-value qoder-table-quota-pct ${item.quotaClass}`}>
                          {item.percentageText}
                        </span>
                      )}
                      <span className="windsurf-credit-left qoder-table-quota-total">{item.valueText}</span>
                    </div>
                    {item.showProgress && (
                      <div className="quota-progress-track">
                        <div
                          className={`quota-progress-bar ${item.quotaClass}`}
                          style={{ width: `${item.normalizedPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
                {quota.resetText && <div className="quota-reset qoder-table-reset">{quota.resetText}</div>}
              </div>
            </td>
            <td>{formatDateTime(account.created_at)}</td>
            <td>
              <div className="action-buttons">
                <button
                  className="action-btn"
                  onClick={() => void handleRefresh(account.id)}
                  title={t('common.refresh', "Làm mới")}
                  disabled={isRefreshing || isInjecting || deleting}
                >
                  <RefreshCw size={14} className={isRefreshing ? 'loading-spinner' : ''} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => void handleSwitch(account.id)}
                  title={t('dashboard.switch', "Chuyển")}
                  disabled={isInjecting || deleting}
                >
                  {isInjecting ? <RotateCw size={14} className="loading-spinner" /> : <Play size={14} />}
                </button>
                <button
                  className="action-btn"
                  onClick={() => setShowTagModal(account.id)}
                  title={t('accounts.tagButton', "Chỉnh sửa thẻ")}
                  disabled={isInjecting || deleting}
                >
                  <Tag size={14} />
                </button>
                <button
                  className="action-btn"
                  onClick={() => void handleExportByIds([account.id], getQoderAccountDisplayEmail(account))}
                  title={t('accounts.actions.export', "Xuất")}
                  disabled={exportModal.preparing || exportModal.saving}
                >
                  <Upload size={14} />
                </button>
                <button
                  className="action-btn danger"
                  onClick={() => void handleDeleteAccounts([account.id])}
                  title={t('accounts.actions.delete', "Xóa")}
                  disabled={deleting}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        );
      }),
    [
      currentAccountId,
      deleting,
      exportModal.preparing,
      exportModal.saving,
      handleDeleteAccounts,
      handleExportByIds,
      handleRefresh,
      handleSwitch,
      injecting,
      maskAccountText,
      refreshing,
      resolveQuotaDisplay,
      selected,
      t,
      toggleSelect,
    ],
  );

  const renderGroupedAccounts = () => {
    if (viewMode === 'grid') {
      return (
        <div className="grid-view-container">
          {!groupByTag ? (
            <div className="ghcp-accounts-grid">{renderGridCards(paginatedAccounts)}</div>
          ) : (
            <div className="tag-group-list">
              {paginatedGroupedAccounts.map(({ groupKey, items, totalCount }) => (
                <div key={groupKey} className="tag-group-section">
                  <div className="tag-group-header">
                    <span className="tag-group-title">
                      {groupKey === UNTAGGED_KEY ? t('accounts.defaultGroup', "Nhóm mặc định") : groupKey}
                    </span>
                    <span className="tag-group-count">{totalCount}</span>
                  </div>
                  <div className="tag-group-grid ghcp-accounts-grid">{renderGridCards(items, groupKey)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (!groupByTag) {
      return (
        <div className="account-table-container">
          <table className="account-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th>{t('common.shared.columns.account')}</th>
                <th>{t('common.shared.columns.userId', "ID người dùng")}</th>
                <th>{t('common.shared.columns.plan', "Gói")}</th>
                <th>{t('instances.labels.quota', "Hạn ngạch")}</th>
                <th>{t('common.shared.columns.createdAt')}</th>
                <th>{t('common.shared.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>{renderListRows(paginatedAccounts)}</tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="tag-group-list">
        {paginatedGroupedAccounts.map(({ groupKey, items, totalCount }) => (
          <div key={groupKey} className="tag-group-section">
            <div className="tag-group-header">
              <span className="tag-group-title">
                {groupKey === UNTAGGED_KEY ? t('accounts.defaultGroup', "Nhóm mặc định") : groupKey}
              </span>
              <span className="tag-group-count">{totalCount}</span>
            </div>
            <div className="account-table-container grouped">
              <table className="account-table">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                    <th>{t('common.shared.columns.account')}</th>
                    <th>{t('common.shared.columns.userId', "ID người dùng")}</th>
                    <th>{t('common.shared.columns.plan', "Gói")}</th>
                    <th>{t('instances.labels.quota', "Hạn ngạch")}</th>
                    <th>{t('common.shared.columns.createdAt')}</th>
                    <th>{t('common.shared.columns.actions')}</th>
                  </tr>
                </thead>
                <tbody>{renderListRows(items, groupKey)}</tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="ghcp-accounts-page qoder-accounts-page">
      <PlatformOverviewTabsHeader platform="qoder" active={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'instances' ? (
        <QoderInstancesContent accountsForSelect={filteredAccounts} />
      ) : (
        <>
          <div className={`ghcp-flow-notice ${isFlowNoticeCollapsed ? 'collapsed' : ''}`} role="note" aria-live="polite">
            <button
              type="button"
              className="ghcp-flow-notice-toggle"
              onClick={() =>
                setIsFlowNoticeCollapsed((prev) => {
                  const next = !prev;
                  writeBooleanStorage(QODER_FLOW_NOTICE_COLLAPSED_KEY, next);
                  return next;
                })
              }
              aria-expanded={!isFlowNoticeCollapsed}
            >
              <div className="ghcp-flow-notice-title">
                <CircleAlert size={16} />
                <span>{t('qoder.flowNotice.title', "Huong dan tai khoan Qoder (nhan de mo rong/thu gon)")}</span>
              </div>
              <ChevronDown size={16} className={`ghcp-flow-notice-arrow ${isFlowNoticeCollapsed ? 'collapsed' : ''}`} />
            </button>
            {!isFlowNoticeCollapsed && (
              <div className="ghcp-flow-notice-body">
                <div className="ghcp-flow-notice-desc">
                  {t(
                    'qoder.flowNotice.desc',
                    "Ho tro dang nhap OAuth chinh thuc (callback), nhap cuc bo, nhap JSON, tiem chuyen tai khoan, gan nhieu instance va tong quan han muc. Luong dang nhap su dung dung du lieu luu tru thuc te cua Qoder client.",
                  )}
                </div>
                <ul className="ghcp-flow-notice-list">
                  <li>{t('qoder.flowNotice.permission', "Pham vi quyen: doc kho xac thuc cuc bo cua Qoder (thong tin auth va thong tin nguoi dung) de phuc vu chuyen tai khoan va tiem phien; moi du lieu deu duoc xu ly cuc bo tren may cua ban.")}</li>
                  <li>{t('qoder.flowNotice.network', "Pham vi mang: dang nhap OAuth can truy cap dich vu chinh thuc cua Qoder de hoan tat callback; truy van han muc su dung Qoder API. Khong tai len khoa hay thong tin xac thuc cuc bo.")}</li>
                </ul>
              </div>
            )}
          </div>

          {message && (
            <div className={`message-bar ${message.tone === 'error' ? 'error' : 'success'}`}>
              {message.text}
              <button onClick={() => setMessage(null)} aria-label={t('common.close', "Đóng")}>
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
                  value={searchQuery}
                  placeholder={t('common.shared.search')}
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
                allLabel={allFilterLabel}
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
                >
                  <Tag size={14} />
                  {tagFilter.length > 0
                    ? `${t('accounts.filterTags', "Lọc thẻ")} (${tagFilter.length})`
                    : t('accounts.filterTags', "Lọc thẻ")}
                </button>
                {showTagFilter && (
                  <div
                    ref={tagFilterPanelRef}
                    className={`tag-filter-panel ${tagFilterPanelPlacement === 'top' ? 'open-top' : ''}`}
                  >
                    {availableTags.length === 0 ? (
                      <div className="tag-filter-empty">{t('accounts.noTags', "Không có thẻ")}</div>
                    ) : (
                      <div className="tag-filter-options" style={tagFilterScrollContainerStyle}>
                        {availableTags.map((tag) => (
                          <label key={tag} className={`tag-filter-option ${tagFilter.includes(tag) ? 'selected' : ''}`}>
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
                        {t('accounts.clearTagFilter', "Xóa bộ lọc thẻ")}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <SingleSelectFilterDropdown
                value={sortBy}
                options={[
                  { value: 'created_at', label: t('accounts.sort.createdAt') },
                  { value: 'plan', label: t('accounts.sort.plan') },
                  { value: 'quota', label: t('accounts.sort.quota') },
                ]}
                ariaLabel={t('common.shared.sortLabel', "Sắp xếp")}
                icon={<ArrowDownWideNarrow size={14} />}
                onChange={(value) => setSortBy(value as SortBy)}
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
                title={t('common.shared.addAccount')}
              >
                <Plus size={14} />
              </button>
              <button
                className="btn btn-secondary icon-only"
                onClick={() => void handleRefreshAll()}
                disabled={refreshingAll || accounts.length === 0}
                title={t('accounts.actions.refreshAll', "Làm mới tất cả")}
              >
                <RefreshCw size={14} className={refreshingAll ? 'loading-spinner' : ''} />
              </button>
              <button
                className="btn btn-secondary icon-only"
                onClick={togglePrivacyMode}
                title={
                  privacyModeEnabled
                    ? t('accounts.privacy.disable', "Tắt chế độ riêng tư")
                    : t('accounts.privacy.enable', "Bật chế độ riêng tư")
                }
              >
                {privacyModeEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                className="btn btn-secondary icon-only"
                onClick={() => openAddModal('token')}
                title={t('common.shared.import.label', "Nhập")}
              >
                <Download size={14} />
              </button>
              <button
                className="btn btn-secondary export-btn icon-only"
                onClick={() => void handleExportSelected()}
                disabled={exportModal.preparing || exportModal.saving || filteredAccounts.length === 0}
                title={
                  visibleSelectedCount > 0
                    ? `${t('accounts.actions.export', "Xuất")} (${visibleSelectedCount})`
                    : t('accounts.actions.export', "Xuất")
                }
              >
                <Upload size={14} />
              </button>
              <QuickSettingsPopover type="qoder" />
            </div>
          </div>

          {(accounts.length > 0 || grouping.groups.length > 0) && (
            <AccountSelectionToolbar
              selectedCount={selected.size}
              allSelected={allSelected}
              disabled={paginatedIds.length === 0}
              onToggleSelectAll={toggleSelectAll}
              onClearSelection={() => setSelected(new Set())}
              grouping={grouping}
              accounts={accounts}
              selectedIds={Array.from(selected)}
              actions={(
                <button
                  className="btn btn-danger icon-only"
                  onClick={() => void handleDeleteAccounts(Array.from(selected))}
                  disabled={deleting}
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
              <h3>{t('accounts.empty.title', "Chưa có tài khoản")}</h3>
              <p>{t('qoder.empty.desc', "Nhấp vào \"Thêm tài khoản\" để sử dụng đăng nhập xác thực, nhập cục bộ hoặc nhập JSON.")}</p>
              <button
                className="btn btn-primary"
                onClick={() => openAddModal('oauth')}
              >
                <Plus size={16} />
                {t('common.shared.addAccount')}
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="empty-state">
              <h3>{t('common.shared.noMatch.title', "Không có tài khoản phù hợp")}</h3>
              <p>{t('common.shared.noMatch.desc', "Thử điều chỉnh tìm kiếm hoặc bộ lọc")}</p>
            </div>
          ) : (
            <>
              {renderGroupedAccounts()}
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
            </>
          )}
        </>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content codex-add-modal platform-account-add-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <button className="btn btn-secondary icon-only" onClick={() => setShowAddModal(false)} title={t('common.back', "Quay lại")} aria-label={t('common.back', "Quay lại")}><ChevronLeft size={14} /></button>
              <h2>{t('qoder.addModal.title')}</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)} aria-label={t('common.close', "Đóng")}>
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
              <button
                className={`modal-tab ${addTab === 'import' ? 'active' : ''}`}
                onClick={() => openAddModal('import')}
              >
                <Database size={14} />
                {t('accounts.tabs.import', "Nhập")}
              </button>
            </div>
            <div className="modal-body">
              <MfaQuickCodeSelect />
              {addTab === 'oauth' ? (
                <div className="add-section">
                  <p className="section-desc">
                    {t('qoder.oauth.hint', "Hãy hoàn tất đăng nhập trên trang trình duyệt đã mở: nếu trang đăng nhập không tự động mở, hãy nhấp vào \"Sao chép liên kết đăng nhập\", sao chép liên kết rồi dán vào trình duyệt để hoàn tất đăng nhập.")}
                  </p>
                  {oauthError ? (
                    <div className="add-status error">
                      <CircleAlert size={16} />
                      <span>{oauthError}</span>
                      <button className="btn btn-sm btn-outline" onClick={() => void handlePrepareOauth()}>
                        {t('common.shared.oauth.retry', "Tạo lại thông tin ủy quyền")}
                      </button>
                    </div>
                  ) : null}
                  {oauthUrl ? (
                    <div className="oauth-url-section">
                      <div className="oauth-url-box">
                        <input type="text" value={oauthUrl} readOnly />
                        <button
                          onClick={() => void handleCopyOauthUrl()}
                          title={t('qoder.oauth.copyLoginUrl', "Sao chép liên kết đăng nhập")}
                          aria-label={t('qoder.oauth.copyLoginUrl', "Sao chép liên kết đăng nhập")}
                        >
                          {oauthUrlCopied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                      <button className="btn btn-primary btn-full" onClick={() => void handleOpenOauthUrl()}>
                        <Globe size={16} />
                        {t('common.shared.oauth.openBrowser', "Mở trong trình duyệt")}
                      </button>
                      {oauthCompleting && (
                        <div className="add-status loading">
                          <RefreshCw size={16} className="loading-spinner" />
                          <span>{t('common.shared.oauth.waiting', "Đang chờ ủy quyền...")}</span>
                        </div>
                      )}
                      <p className="oauth-hint">{t('common.shared.oauth.hint', "Sau khi ủy quyền, cửa sổ này sẽ tự cập nhật")}</p>
                    </div>
                  ) : (
                    <div className="oauth-loading">
                      <RefreshCw size={24} className="loading-spinner" />
                      <span>
                        {oauthPreparing
                          ? t('common.shared.oauth.preparing', "Đang chuẩn bị liên kết ủy quyền...")
                          : t('common.loading', "Đang tải...")}
                      </span>
                    </div>
                  )}
                </div>
              ) : addTab === 'token' ? (
                <div className="add-section">
                  <p className="section-desc">{t('accounts.importJsonHint', "Nhập file Qoder JSON được xuất từ công cụ này.")}</p>
                  <textarea
                    className="token-input"
                    value={tokenInput}
                    onChange={(event) => setTokenInput(event.target.value)}
                    placeholder={t('common.shared.token.placeholder', "Ví dụ: ghu_xxx / sk-ws-xxx / {\"access_token\":\"eyJ...\",\"refresh_token\":\"rt_...\"} / [{...}]")}
                  />
                  <button className="btn btn-primary btn-full" onClick={() => void handleTokenImport()} disabled={addStatus === 'loading' || !tokenInput.trim()}>
                    {addStatus === 'loading' ? <RefreshCw size={16} className="loading-spinner" /> : <Download size={16} />}
                    {t('common.shared.token.import', "Nhập")}
                  </button>
                </div>
              ) : (
                <div className="add-section">
                  <p className="section-desc">
                    {t('qoder.import.localDesc')}
                  </p>
                  <button className="btn btn-secondary btn-full" onClick={() => void handleImportLocal()} disabled={addStatus === 'loading'}>
                    {addStatus === 'loading' ? <RefreshCw size={16} className="loading-spinner" /> : <Database size={16} />}
                    {t('common.shared.addModal.import')}
                  </button>
                  <div className="oauth-hint" style={{ margin: '8px 0 4px' }}>
                    {t('common.shared.import.orJson', "Hoặc nhập từ tệp JSON")}
                  </div>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={onImportFileChange}
                  />
                  <button className="btn btn-primary btn-full" onClick={handlePickImportFile} disabled={addStatus === 'loading'}>
                    {addStatus === 'loading' ? <RefreshCw size={16} className="loading-spinner" /> : <Upload size={16} />}
                    {t('common.shared.import.pickFile', "Chọn tệp JSON để nhập")}
                  </button>
                </div>
              )}

              {addStatus !== 'idle' && addMessage && (
                <div className={`add-status ${addStatus}`}>
                  {addStatus === 'success' ? (
                    <Check size={16} />
                  ) : addStatus === 'loading' ? (
                    <RefreshCw size={16} className="loading-spinner" />
                  ) : (
                    <CircleAlert size={16} />
                  )}
                  <span>{addMessage}</span>
                </div>
              )}
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
                onClick={() => {
                  if (deletingTag) return;
                  setTagDeleteConfirm(null);
                  setTagDeleteConfirmError(null);
                }}
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
              <button className="btn btn-secondary" onClick={() => {
                setTagDeleteConfirm(null);
                setTagDeleteConfirmError(null);
              }} disabled={deletingTag}>
                {t('common.cancel')}
              </button>
              <button className="btn btn-danger" onClick={confirmDeleteTag} disabled={deletingTag}>
                {deletingTag ? t('common.processing', "Đang xử lý...") : t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTagModal && (
        <TagEditModal
          isOpen
          initialTags={accounts.find((item) => item.id === showTagModal)?.tags || []}
          availableTags={availableTags}
          onClose={() => setShowTagModal(null)}
          onSave={async (tags) => {
            await handleSaveTags(showTagModal!, tags);
          }}
        />
      )}

      <ExportJsonModal
        isOpen={exportModal.showModal}
        title={t('accounts.exportModal.title', "Xuất JSON")}
        jsonContent={exportModal.jsonContent}
        hidden={exportModal.hidden}
        copied={exportModal.copied}
        saving={exportModal.saving}
        savedPath={exportModal.savedPath}
        canOpenSavedDirectory={exportModal.canOpenSavedDirectory}
        pathCopied={exportModal.pathCopied}
        onClose={exportModal.closeModal}
        onToggleHidden={exportModal.toggleHidden}
        onCopyJson={exportModal.copyJson}
        onSaveJson={exportModal.saveJson}
        onOpenSavedDirectory={exportModal.openSavedDirectory}
        onCopySavedPath={exportModal.copySavedPath}
      />
    </div>
  );
}
