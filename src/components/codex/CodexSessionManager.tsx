import { type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirm as confirmDialog, open as openFileDialog, save as saveFileDialog } from '@tauri-apps/plugin-dialog';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { Check, ChevronDown, ChevronRight, Copy, Download, Eye, FileText, Folder, FolderOpen, Minimize2, RefreshCw, RotateCcw, Search, Trash2, Upload, X } from 'lucide-react';
import { ModalErrorMessage, useModalErrorState } from '../ModalErrorMessage';
import { SingleSelectDropdown, type SingleSelectOption } from '../SingleSelectDropdown';
import { useEscClose } from '../../hooks/useEscClose';
import type {
  CodexSessionImportPreview,
  CodexSessionImportPreviewItem,
  CodexSessionExportPreview,
  CodexSessionExportPreviewItem,
  CodexSessionRecord,
  CodexSessionTokenStats,
  CodexSessionTransferOperation,
  CodexSessionTransferProgress,
  CodexSessionTrashSummary,
  CodexTrashedSessionRecord,
} from '../../types/codex';
import type { InstanceProfile } from '../../types/instance';
import { useCodexInstanceStore } from '../../stores/useCodexInstanceStore';
import { validateSessionImportPaths } from '../../services/codexInstanceService';
import {
  filterCodexSessionsByKind,
  type CodexSessionKindFilter,
} from '../../utils/codexSessionFilters';
import { CodexSessionVisibilityRepairModal } from './CodexSessionVisibilityRepairModal';
import {
  CodexSessionUsagePanel,
  CodexSessionUsageSummary,
} from './CodexSessionUsagePanel';

type SessionManagerView = 'list' | 'usage';

type MessageState = { text: string; tone?: 'error' };
type SessionTokenStatsMap = Record<string, CodexSessionTokenStats>;

type SessionGroup = {
  cwd: string;
  /** 官方客户端项目名（可重命名），优先用作分组标题。 */
  projectName?: string | null;
  sessions: CodexSessionRecord[];
  latestUpdatedAt: number;
};

type InstanceSortField = 'createdAt' | 'lastLaunchedAt';
type InstanceSortDirection = 'asc' | 'desc';
type SessionTransferStatus = 'running' | 'success' | 'error';
type ExportSelectionFilter = 'all' | 'selected' | 'unselected';

type SessionTransferTask = {
  id: string;
  operation: CodexSessionTransferOperation;
  status: SessionTransferStatus;
  progress: CodexSessionTransferProgress;
  message?: string;
  error?: string;
};

function readCodexInstanceSortPreference(): {
  field: InstanceSortField;
  direction: InstanceSortDirection;
} {
  const sortField = localStorage.getItem('agtools.codex.instances.sort_field');
  const sortDirection = localStorage.getItem('agtools.codex.instances.sort_direction');
  return {
    field: sortField === 'lastLaunchedAt' ? 'lastLaunchedAt' : 'createdAt',
    direction: sortDirection === 'desc' ? 'desc' : 'asc',
  };
}

function sortInstancesForDisplay(instances: InstanceProfile[]): InstanceProfile[] {
  const sortPreference = readCodexInstanceSortPreference();
  return [...instances].sort((left, right) => {
    if (left.isDefault && !right.isDefault) return -1;
    if (!left.isDefault && right.isDefault) return 1;
    const leftValue =
      sortPreference.field === 'createdAt'
        ? left.createdAt || 0
        : left.lastLaunchedAt || 0;
    const rightValue =
      sortPreference.field === 'createdAt'
        ? right.createdAt || 0
        : right.lastLaunchedAt || 0;
    return sortPreference.direction === 'asc'
      ? leftValue - rightValue
      : rightValue - leftValue;
  });
}

function buildGroups(sessions: CodexSessionRecord[]): SessionGroup[] {
  const groups = new Map<string, CodexSessionRecord[]>();
  sessions.forEach((session) => {
    const bucket = groups.get(session.cwd) ?? [];
    bucket.push(session);
    groups.set(session.cwd, bucket);
  });

  return Array.from(groups.entries())
    .map(([cwd, groupSessions]) => {
      const projectName = groupSessions.find((session) => session.projectName?.trim())?.projectName ?? null;
      return {
        cwd,
        projectName,
        sessions: [...groupSessions].sort(
          (left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0) || left.title.localeCompare(right.title),
        ),
        latestUpdatedAt: Math.max(...groupSessions.map((item) => item.updatedAt ?? 0), 0),
      };
    })
    .sort(
      (left, right) =>
        right.latestUpdatedAt - left.latestUpdatedAt || left.cwd.localeCompare(right.cwd, 'zh-CN'),
    );
}

function buildDefaultExpandedGroups(_groups: SessionGroup[]): string[] {
  return [];
}

function formatRelativeTime(value: number | null | undefined, isZh: boolean): string {
  if (!value) return isZh ? '时间未知' : 'Unknown';
  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - value);
  const minute = 60;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffSeconds < hour) {
    const minutes = Math.max(1, Math.floor(diffSeconds / minute));
    return isZh ? `${minutes} 分钟` : `${minutes}m`;
  }
  if (diffSeconds < day) {
    const hours = Math.floor(diffSeconds / hour);
    return isZh ? `${hours} 小时` : `${hours}h`;
  }
  if (diffSeconds < week) {
    const days = Math.floor(diffSeconds / day);
    return isZh ? `${days} 天` : `${days}d`;
  }
  const weeks = Math.floor(diffSeconds / week);
  return isZh ? `${weeks} 周` : `${weeks}w`;
}

function resolveGroupLabel(cwd: string, projectName?: string | null): string {
  const trimmedProjectName = projectName?.trim();
  if (trimmedProjectName) return trimmedProjectName;
  const normalized = cwd.replace(/\\/g, '/').replace(/\/$/, '');
  const parts = normalized.split('/').filter(Boolean);
  return parts[parts.length - 1] || cwd;
}

function formatSessionId(sessionId: string): string {
  if (sessionId.length <= 18) return sessionId;
  return `${sessionId.slice(0, 8)}...${sessionId.slice(-6)}`;
}

function formatLargeNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatTokenStats(stats?: CodexSessionTokenStats): string {
  if (!stats) {
    return '';
  }
  const input = stats.inputTokens ?? 0;
  const output = stats.outputTokens ?? 0;
  const total = stats.totalTokens ?? 0;
  // #1510: when only total is available, show total-only instead of 0/0.
  if (input === 0 && output === 0) {
    if (total > 0) {
      return `${formatLargeNumber(total)} tokens`;
    }
    return '';
  }
  return `${formatLargeNumber(input)} / ${formatLargeNumber(output)} tokens`;
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  return `${value} B`;
}

function buildDefaultSessionExportName(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
  return `codex-sessions-${timestamp}.zip`;
}

function createSessionTransferId(): string {
  return `session-transfer-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function clampPercent(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildInitialTransferProgress(
  transferId: string,
  operation: CodexSessionTransferOperation,
  total: number,
): CodexSessionTransferProgress {
  return {
    transferId,
    operation,
    phase: 'prepare',
    current: 0,
    total,
    percent: 0,
    currentLabel: null,
    running: true,
  };
}

export function CodexSessionManager() {
  const { t, i18n } = useTranslation();
  const instances = useCodexInstanceStore((state) => state.instances);
  const refreshInstances = useCodexInstanceStore((state) => state.refreshInstances);
  const syncThreadsAcrossInstances = useCodexInstanceStore((state) => state.syncThreadsAcrossInstances);
  const syncSessionsToInstance = useCodexInstanceStore((state) => state.syncSessionsToInstance);
  const listSessionsAcrossInstances = useCodexInstanceStore((state) => state.listSessionsAcrossInstances);
  const getSessionTokenStatsAcrossInstances = useCodexInstanceStore(
    (state) => state.getSessionTokenStatsAcrossInstances,
  );
  const moveSessionsToTrashAcrossInstances = useCodexInstanceStore(
    (state) => state.moveSessionsToTrashAcrossInstances,
  );
  const listTrashedSessionsAcrossInstances = useCodexInstanceStore(
    (state) => state.listTrashedSessionsAcrossInstances,
  );
  const restoreSessionsFromTrashAcrossInstances = useCodexInstanceStore(
    (state) => state.restoreSessionsFromTrashAcrossInstances,
  );
  const deleteTrashedSessionsAcrossInstances = useCodexInstanceStore(
    (state) => state.deleteTrashedSessionsAcrossInstances,
  );
  const emptySessionTrashAcrossInstances = useCodexInstanceStore(
    (state) => state.emptySessionTrashAcrossInstances,
  );
  const previewSessionExport = useCodexInstanceStore((state) => state.previewSessionExport);
  const exportSessions = useCodexInstanceStore((state) => state.exportSessions);
  const previewSessionImport = useCodexInstanceStore((state) => state.previewSessionImport);
  const importSessions = useCodexInstanceStore((state) => state.importSessions);
  const openSessionLocation = useCodexInstanceStore((state) => state.openSessionLocation);
  const openSessionRollout = useCodexInstanceStore((state) => state.openSessionRollout);
  const [sessions, setSessions] = useState<CodexSessionRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [showSyncTargetModal, setShowSyncTargetModal] = useState(false);
  const [syncTargetInstanceId, setSyncTargetInstanceId] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRepairVisibilityModal, setShowRepairVisibilityModal] = useState(false);
  const [trashedSessions, setTrashedSessions] = useState<CodexTrashedSessionRecord[]>([]);
  const [selectedTrashIds, setSelectedTrashIds] = useState<string[]>([]);
  const [exportPreview, setExportPreview] = useState<CodexSessionExportPreview | null>(null);
  const [exportPath, setExportPath] = useState('');
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);
  const [removedExportIds, setRemovedExportIds] = useState<string[]>([]);
  const [exportSourceFilter, setExportSourceFilter] = useState('all');
  const [exportSelectionFilter, setExportSelectionFilter] = useState<ExportSelectionFilter>('all');
  const [importPreview, setImportPreview] = useState<CodexSessionImportPreview | null>(null);
  const [importTargetInstanceId, setImportTargetInstanceId] = useState('');
  const [importCwdMappings, setImportCwdMappings] = useState<Record<string, string>>({});
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingToInstance, setSyncingToInstance] = useState(false);
  const [repairingVisibility, setRepairingVisibility] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingTrash, setLoadingTrash] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [purgingTrash, setPurgingTrash] = useState(false);
  const [loadingExportPreview, setLoadingExportPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadingImportPreview, setLoadingImportPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [transferTask, setTransferTask] = useState<SessionTransferTask | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [tokenStatsBySessionId, setTokenStatsBySessionId] = useState<SessionTokenStatsMap>({});
  const [loadingTokenGroupCwds, setLoadingTokenGroupCwds] = useState<string[]>([]);
  const [loadedTokenGroupCwds, setLoadedTokenGroupCwds] = useState<string[]>([]);
  const [titleSearchInput, setTitleSearchInput] = useState('');
  const [appliedTitleSearch, setAppliedTitleSearch] = useState('');
  const [sessionKindFilter, setSessionKindFilter] = useState<CodexSessionKindFilter>('conversation');
  const [sessionView, setSessionView] = useState<SessionManagerView>('list');
  const [sessionLocationTarget, setSessionLocationTarget] = useState<{
    session: CodexSessionRecord;
    action: 'location' | 'rollout';
  } | null>(null);
  const [openingSessionLocation, setOpeningSessionLocation] = useState(false);
  const {
    message: restoreModalError,
    scrollKey: restoreModalErrorScrollKey,
    set: setRestoreModalError,
  } = useModalErrorState();
  const {
    message: syncTargetModalError,
    scrollKey: syncTargetModalErrorScrollKey,
    set: setSyncTargetModalError,
  } = useModalErrorState();
  const {
    message: importModalError,
    scrollKey: importModalErrorScrollKey,
    set: setImportModalError,
  } = useModalErrorState();
  const [importPathErrors, setImportPathErrors] = useState<Record<string, string>>({});
  const importPathInputs = useRef<Record<string, HTMLInputElement | null>>({});
  useEffect(() => {
    const source = Object.keys(importPathErrors)[0];
    if (!source) return;
    const input = importPathInputs.current[source];
    input?.scrollIntoView({ block: 'center' });
    input?.focus();
  }, [importPathErrors]);
  const {
    message: exportModalError,
    scrollKey: exportModalErrorScrollKey,
    set: setExportModalError,
  } = useModalErrorState();
  const {
    message: sessionLocationError,
    scrollKey: sessionLocationErrorScrollKey,
    set: setSessionLocationError,
  } = useModalErrorState();
  const hasInitializedExpandedGroupsRef = useRef(false);
  const loadSessionsPromiseRef = useRef<Promise<void> | null>(null);
  const copyResetTimerRef = useRef<number | null>(null);
  const tokenStatsVersionRef = useRef(0);
  const transferTaskIdRef = useRef<string | null>(null);
  const isZh = i18n.resolvedLanguage?.toLowerCase().startsWith('zh') ?? true;

  const visibleSessions = useMemo(
    () => filterCodexSessionsByKind(sessions, sessionKindFilter),
    [sessionKindFilter, sessions],
  );
  const groupedSessions = useMemo(() => buildGroups(visibleSessions), [visibleSessions]);
  const allSessionIds = useMemo(
    () => Array.from(new Set(visibleSessions.map((session) => session.sessionId))),
    [visibleSessions],
  );
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedTrashIdSet = useMemo(() => new Set(selectedTrashIds), [selectedTrashIds]);
  const selectedExportIdSet = useMemo(() => new Set(selectedExportIds), [selectedExportIds]);
  const removedExportIdSet = useMemo(() => new Set(removedExportIds), [removedExportIds]);
  const selectedImportIdSet = useMemo(() => new Set(selectedImportIds), [selectedImportIds]);
  const loadingTokenGroupSet = useMemo(() => new Set(loadingTokenGroupCwds), [loadingTokenGroupCwds]);
  const loadedTokenGroupSet = useMemo(() => new Set(loadedTokenGroupCwds), [loadedTokenGroupCwds]);
  const trashTotalSizeBytes = useMemo(
    () => trashedSessions.reduce((sum, session) => sum + (session.sizeBytes ?? 0), 0),
    [trashedSessions],
  );
  const selectedTrashSizeBytes = useMemo(
    () =>
      trashedSessions
        .filter((session) => selectedTrashIdSet.has(session.sessionId))
        .reduce((sum, session) => sum + (session.sizeBytes ?? 0), 0),
    [selectedTrashIdSet, trashedSessions],
  );
  const selectedSessions = useMemo(
    () => visibleSessions.filter((session) => selectedIdSet.has(session.sessionId)),
    [selectedIdSet, visibleSessions],
  );
  useEffect(() => {
    const visibleIds = new Set(visibleSessions.map((session) => session.sessionId));
    setSelectedIds((previous) => {
      const next = previous.filter((sessionId) => visibleIds.has(sessionId));
      return next.length === previous.length ? previous : next;
    });
  }, [visibleSessions]);
  const orderedInstances = useMemo(() => sortInstancesForDisplay(instances), [instances]);
  const targetInstanceOptions = useMemo<SingleSelectOption[]>(
    () => [
      {
        value: '',
        label: t('codex.sessionManager.targetModal.pickTarget', "Chọn phiên bản đích"),
      },
      ...orderedInstances.map((instance) => ({
        value: instance.id,
        label: instance.isDefault
          ? t('instances.defaultName', "Phiên bản mặc định")
          : instance.name || t('instances.defaultName', "Phiên bản mặc định"),
      })),
    ],
    [orderedInstances, t],
  );
  const importTargetOptions = useMemo<SingleSelectOption[]>(
    () =>
      orderedInstances.map((instance) => ({
        value: instance.id,
        label: instance.isDefault
          ? t('instances.defaultName', "Phiên bản mặc định")
          : instance.name || t('instances.defaultName', "Phiên bản mặc định"),
      })),
    [orderedInstances, t],
  );
  const sessionKindOptions = useMemo<SingleSelectOption[]>(
    () => [
      {
        value: 'conversation',
        label: t('codex.sessionManager.kind.conversation', "Chat"),
      },
      {
        value: 'external',
        label: t('codex.sessionManager.kind.external', "Ngoài"),
      },
      {
        value: 'subagent',
        label: t('codex.sessionManager.kind.subagent', "Tác nhân con"),
      },
      {
        value: 'all',
        label: t('codex.sessionManager.kind.all', "Mọi loại"),
      },
    ],
    [t],
  );
  const importReadyItems = useMemo(
    () => importPreview?.items.filter((item) => item.status === 'ready') ?? [],
    [importPreview],
  );
  const importSourceCwds = useMemo(
    () =>
      Array.from(
        new Set(
          importReadyItems
            .map((item) => item.cwd.trim())
            .filter((cwd) => cwd.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [importReadyItems],
  );
  const exportPreviewItems = useMemo(
    () => exportPreview?.items ?? [],
    [exportPreview],
  );
  const exportAvailableItems = useMemo(
    () => exportPreviewItems.filter((item) => !removedExportIdSet.has(item.sessionId)),
    [exportPreviewItems, removedExportIdSet],
  );
  const exportSelectedItems = useMemo(
    () => exportAvailableItems.filter((item) => selectedExportIdSet.has(item.sessionId)),
    [exportAvailableItems, selectedExportIdSet],
  );
  const exportableSessionIds = useMemo(
    () => exportSelectedItems.map((item) => item.sessionId),
    [exportSelectedItems],
  );
  const exportSelectedSizeBytes = useMemo(
    () => exportSelectedItems.reduce((sum, item) => sum + item.sizeBytes, 0),
    [exportSelectedItems],
  );
  const exportAvailableSizeBytes = useMemo(
    () => exportAvailableItems.reduce((sum, item) => sum + item.sizeBytes, 0),
    [exportAvailableItems],
  );
  const exportSourceOptions = useMemo<SingleSelectOption[]>(() => {
    const sourceMap = new Map<string, { label: string; count: number }>();
    exportAvailableItems.forEach((item) => {
      const current = sourceMap.get(item.sourceInstanceId);
      sourceMap.set(item.sourceInstanceId, {
        label: item.sourceInstanceName,
        count: (current?.count ?? 0) + 1,
      });
    });
    return [
      {
        value: 'all',
        label: t('codex.sessionManager.exportModal.allSources', "Tất cả nguồn"),
      },
      ...Array.from(sourceMap.entries()).map(([value, option]) => ({
        value,
        label: `${option.label} (${option.count})`,
      })),
    ];
  }, [exportAvailableItems, t]);
  const exportSelectionFilterOptions = useMemo<SingleSelectOption[]>(
    () => [
      { value: 'all', label: t('codex.sessionManager.exportModal.filterAll', "Tất cả") },
      { value: 'selected', label: t('codex.sessionManager.exportModal.filterSelected', "Đã chọn") },
      { value: 'unselected', label: t('codex.sessionManager.exportModal.filterUnselected', "Chưa chọn") },
    ],
    [t],
  );
  const exportFilteredItems = useMemo(() => {
    return exportAvailableItems.filter((item) => {
      if (exportSourceFilter !== 'all' && item.sourceInstanceId !== exportSourceFilter) {
        return false;
      }
      const selected = selectedExportIdSet.has(item.sessionId);
      if (exportSelectionFilter === 'selected' && !selected) return false;
      if (exportSelectionFilter === 'unselected' && selected) return false;
      return true;
    });
  }, [
    exportAvailableItems,
    exportSelectionFilter,
    exportSourceFilter,
    selectedExportIdSet,
  ]);
  const allImportReadySelected = importReadyItems.length > 0
    && importReadyItems.every((item) => selectedImportIdSet.has(item.sessionId));
  const syncTargetInstance = useMemo(
    () => orderedInstances.find((instance) => instance.id === syncTargetInstanceId) ?? null,
    [orderedInstances, syncTargetInstanceId],
  );
  const syncTargetExistingCount = useMemo(() => {
    if (!syncTargetInstance) return 0;
    return selectedSessions.filter((session) =>
      session.locations.some((location) => location.instanceId === syncTargetInstance.id),
    ).length;
  }, [selectedSessions, syncTargetInstance]);
  const allSessionsSelected = allSessionIds.length > 0 && allSessionIds.every((id) => selectedIdSet.has(id));
  const allTrashSelected =
    trashedSessions.length > 0 &&
    trashedSessions.every((session) => selectedTrashIdSet.has(session.sessionId));
  const trashBusy = restoring || purgingTrash || loadingTrash;
  const instanceCount = instances.length;
  const hasAppliedSearch = Boolean(appliedTitleSearch);
  const hasSearchInput = Boolean(titleSearchInput.trim());
  const transferProgress = transferTask?.progress ?? null;
  const transferPercent = clampPercent(transferProgress?.percent);
  const transferRunning = transferTask?.status === 'running';

  const getTransferTitle = useCallback(
    (operation: CodexSessionTransferOperation) =>
      operation === 'export'
        ? t('codex.sessionManager.transferModal.exportTitle', "Xuất phiên")
        : t('codex.sessionManager.transferModal.importTitle', "Nhập phiên"),
    [t],
  );

  const getTransferPhaseText = useCallback(
    (progress: CodexSessionTransferProgress | null) => {
      const operation = progress?.operation ?? transferTask?.operation ?? 'export';
      const phase = progress?.phase ?? 'prepare';
      if (operation === 'export') {
        if (phase === 'collect') return t('codex.sessionManager.transferModal.phase.exportCollect', "Đang thu thập phiên...");
        if (phase === 'hash') return t('codex.sessionManager.transferModal.phase.exportHash', "Đang kiểm tra tệp phiên...");
        if (phase === 'write') return t('codex.sessionManager.transferModal.phase.exportWrite', "Đang ghi gói phiên...");
        if (phase === 'done') return t('codex.sessionManager.transferModal.phase.done', "Tác vụ đã hoàn tất");
        return t('codex.sessionManager.transferModal.phase.exportPrepare', "Đang chuẩn bị xuất...");
      }
      if (phase === 'read') return t('codex.sessionManager.transferModal.phase.importRead', "Đang đọc gói phiên...");
      if (phase === 'write') return t('codex.sessionManager.transferModal.phase.importWrite', "Đang ghi vào phiên bản đích...");
      if (phase === 'rebuild') return t('codex.sessionManager.transferModal.phase.importRebuild', "Đang làm mới chỉ mục phiên chính thức...");
      if (phase === 'done') return t('codex.sessionManager.transferModal.phase.done', "Tác vụ đã hoàn tất");
      return t('codex.sessionManager.transferModal.phase.importPrepare', "Đang chuẩn bị nhập...");
    },
    [t, transferTask?.operation],
  );

  const loadSessions = useCallback(async () => {
    if (loadSessionsPromiseRef.current) {
      return await loadSessionsPromiseRef.current;
    }

    const task = (async () => {
      setLoading(true);
      try {
        const nextSessions = await listSessionsAcrossInstances({
          titleQuery: appliedTitleSearch || null,
        });
        const nextGroups = buildGroups(nextSessions);
        const hasInitializedExpandedGroups = hasInitializedExpandedGroupsRef.current;
        tokenStatsVersionRef.current += 1;
        setSessions(nextSessions);
        setTokenStatsBySessionId({});
        setLoadingTokenGroupCwds([]);
        setLoadedTokenGroupCwds([]);
        setSelectedIds((prev) => prev.filter((id) => nextSessions.some((item) => item.sessionId === id)));
        setExpandedGroups((prev) => {
          const valid = prev.filter((cwd) => nextGroups.some((group) => group.cwd === cwd));

          if (prev.length === 0) {
            return hasInitializedExpandedGroups ? [] : buildDefaultExpandedGroups(nextGroups);
          }

          return valid.length > 0 ? valid : buildDefaultExpandedGroups(nextGroups);
        });
        hasInitializedExpandedGroupsRef.current = true;
      } catch (error) {
        setMessage({ text: String(error), tone: 'error' });
      } finally {
        setLoading(false);
      }
    })();

    loadSessionsPromiseRef.current = task;
    try {
      await task;
    } finally {
      if (loadSessionsPromiseRef.current === task) {
        loadSessionsPromiseRef.current = null;
      }
    }
  }, [appliedTitleSearch, listSessionsAcrossInstances]);

  const loadTokenStatsForGroups = useCallback(
    async (groups: SessionGroup[]) => {
      if (groups.length === 0) {
        return;
      }

      const groupCwds = groups.map((group) => group.cwd);
      const sessionIds = Array.from(new Set(groups.flatMap((group) => group.sessions.map((session) => session.sessionId))));
      if (sessionIds.length === 0) {
        setLoadedTokenGroupCwds((prev) => Array.from(new Set([...prev, ...groupCwds])));
        return;
      }

      const requestVersion = tokenStatsVersionRef.current;
      setLoadingTokenGroupCwds((prev) => Array.from(new Set([...prev, ...groupCwds])));

      try {
        const stats = await getSessionTokenStatsAcrossInstances(sessionIds);
        if (tokenStatsVersionRef.current !== requestVersion) {
          return;
        }

        setTokenStatsBySessionId((prev) => {
          const next = { ...prev };
          stats.forEach((item) => {
            next[item.sessionId] = item;
          });
          return next;
        });
      } catch (error) {
        if (tokenStatsVersionRef.current === requestVersion) {
          console.error('Failed to load session token stats:', error);
        }
      } finally {
        if (tokenStatsVersionRef.current !== requestVersion) {
          return;
        }
        setLoadingTokenGroupCwds((prev) => prev.filter((cwd) => !groupCwds.includes(cwd)));
        setLoadedTokenGroupCwds((prev) => Array.from(new Set([...prev, ...groupCwds])));
      }
    },
    [getSessionTokenStatsAcrossInstances],
  );

  const loadTrashedSessions = useCallback(async () => {
    setLoadingTrash(true);
    setRestoreModalError(null);
    setTrashedSessions([]);
    try {
      const nextSessions = await listTrashedSessionsAcrossInstances();
      setTrashedSessions(nextSessions);
      setSelectedTrashIds((prev) => prev.filter((id) => nextSessions.some((item) => item.sessionId === id)));
      return nextSessions;
    } catch (error) {
      setRestoreModalError(String(error));
      return [];
    } finally {
      setLoadingTrash(false);
    }
  }, [listTrashedSessionsAcrossInstances, setRestoreModalError]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (exportSourceFilter === 'all') return;
    if (exportSourceOptions.some((option) => option.value === exportSourceFilter)) return;
    setExportSourceFilter('all');
  }, [exportSourceFilter, exportSourceOptions]);

  useEffect(() => {
    const nextTitleQuery = titleSearchInput.trim();
    const timer = window.setTimeout(() => {
      setMessage(null);
      setAppliedTitleSearch((current) => (current === nextTitleQuery ? current : nextTitleQuery));
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [titleSearchInput]);

  useEffect(() => {
    const groupsToLoad = groupedSessions.filter(
      (group) =>
        expandedGroups.includes(group.cwd) &&
        !loadingTokenGroupSet.has(group.cwd) &&
        !loadedTokenGroupSet.has(group.cwd),
    );
    if (groupsToLoad.length === 0) {
      return;
    }

    void loadTokenStatsForGroups(groupsToLoad);
  }, [expandedGroups, groupedSessions, loadedTokenGroupSet, loadTokenStatsForGroups, loadingTokenGroupSet]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | null = null;
    void listen<CodexSessionTransferProgress>(
      'codex:session-transfer-progress',
      (event) => {
        const payload = event.payload;
        if (!payload || payload.transferId !== transferTaskIdRef.current) return;
        setTransferTask((current) => {
          if (!current || current.id !== payload.transferId) return current;
          return {
            ...current,
            progress: payload,
            status: payload.running ? 'running' : current.status,
          };
        });
      },
    ).then((nextUnlisten) => {
      if (disposed) {
        nextUnlisten();
      } else {
        unlisten = nextUnlisten;
      }
    });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const toggleSession = (sessionId: string) => {
    setSelectedIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId],
    );
  };

  const toggleGroupSelection = (sessionIds: string[]) => {
    const allSelected = sessionIds.every((id) => selectedIdSet.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        sessionIds.forEach((id) => next.delete(id));
      } else {
        sessionIds.forEach((id) => next.add(id));
      }
      return Array.from(next);
    });
  };

  const toggleAllSessions = () => {
    if (allSessionIds.length === 0) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSessionIds.every((id) => next.has(id))) {
        allSessionIds.forEach((id) => next.delete(id));
      } else {
        allSessionIds.forEach((id) => next.add(id));
      }
      return Array.from(next);
    });
  };

  const toggleGroupExpanded = (cwd: string) => {
    setExpandedGroups((prev) => (prev.includes(cwd) ? prev.filter((item) => item !== cwd) : [...prev, cwd]));
  };

  const toggleTrashedSession = (sessionId: string) => {
    setSelectedTrashIds((prev) =>
      prev.includes(sessionId) ? prev.filter((id) => id !== sessionId) : [...prev, sessionId],
    );
  };

  const toggleAllTrashedSessions = () => {
    if (trashedSessions.length === 0) return;
    setSelectedTrashIds(allTrashSelected ? [] : trashedSessions.map((session) => session.sessionId));
  };

  const handleOpenRestoreModal = async () => {
    setShowRestoreModal(true);
    setSelectedTrashIds([]);
    await loadTrashedSessions();
  };

  const handleOpenSyncTargetModal = async () => {
    if (selectedIds.length === 0) {
      setMessage({ text: t('codex.sessionManager.messages.pickOne', "Vui lòng chọn ít nhất một phiên"), tone: 'error' });
      return;
    }

    setMessage(null);
    setSyncTargetModalError(null);
    try {
      const latestInstances = await refreshInstances();
      const targetCandidates = sortInstancesForDisplay(
        latestInstances.length > 0 ? latestInstances : instances,
      );
      const firstMissingTarget = targetCandidates.find((instance) =>
        selectedSessions.some((session) =>
          !session.locations.some((location) => location.instanceId === instance.id),
        ),
      );
      setSyncTargetInstanceId((firstMissingTarget ?? targetCandidates[0])?.id ?? '');
      setShowSyncTargetModal(true);
    } catch (error) {
      setMessage({ text: String(error), tone: 'error' });
    }
  };

  const handleCloseSyncTargetModal = () => {
    setShowSyncTargetModal(false);
  };

  useEscClose(showSyncTargetModal, handleCloseSyncTargetModal);

  const handleCloseRestoreModal = () => {
    if (restoring || purgingTrash) return;
    setShowRestoreModal(false);
    setSelectedTrashIds([]);
    setRestoreModalError(null);
  };

  useEscClose(showRestoreModal, handleCloseRestoreModal);

  const handleMinimizeTransferModal = () => {
    setShowTransferModal(false);
  };

  const handleClearTransferTask = () => {
    if (transferTask?.status === 'running') {
      setShowTransferModal(false);
      return;
    }
    transferTaskIdRef.current = null;
    setTransferTask(null);
    setShowTransferModal(false);
  };

  useEscClose(showTransferModal && !transferRunning, handleClearTransferTask);

  const handleSyncSessions = async () => {
    setMessage(null);
    try {
      const latestInstances = await refreshInstances();
      if (latestInstances.length < 2) {
        setMessage({
          text: t('codex.sessionManager.messages.syncNeedTwo', "Cần ít nhất hai phiên bản để đồng bộ phiên"),
          tone: 'error',
        });
        return;
      }

      const confirmed = await confirmDialog(
        t('codex.sessionManager.confirm.syncMessage'),
        {
          title: t('codex.sessionManager.actions.syncSessions', "Đồng bộ phiên"),
          okLabel: t('common.confirm', "Xác nhận"),
          cancelLabel: t('common.cancel', "Hủy"),
        },
      );
      if (!confirmed) return;

      setSyncing(true);
      const summary = await syncThreadsAcrossInstances();
      setMessage({ text: summary.message });
      await loadSessions();
    } catch (error) {
      setMessage({ text: String(error), tone: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncSelectedToInstance = async () => {
    if (selectedIds.length === 0) {
      setSyncTargetModalError(t('codex.sessionManager.messages.pickOne', "Vui lòng chọn ít nhất một phiên"));
      return;
    }
    if (!syncTargetInstanceId) {
      setSyncTargetModalError(t('codex.sessionManager.targetModal.pickTarget', "Chọn phiên bản đích"));
      return;
    }

    setSyncingToInstance(true);
    setSyncTargetModalError(null);
    try {
      const summary = await syncSessionsToInstance(selectedIds, syncTargetInstanceId);
      setMessage({ text: summary.message });
      setShowSyncTargetModal(false);
      setSyncTargetInstanceId('');
      setSelectedIds([]);
      await loadSessions();
    } catch (error) {
      setSyncTargetModalError(String(error));
    } finally {
      setSyncingToInstance(false);
    }
  };

  const handleRefresh = async () => {
    setMessage(null);
    try {
      await refreshInstances();
      await loadSessions();
      if (showRestoreModal) {
        await loadTrashedSessions();
      }
    } catch (error) {
      setMessage({ text: String(error), tone: 'error' });
    }
  };

  const handleClearSearch = () => {
    setTitleSearchInput('');
    setMessage(null);

    if (!appliedTitleSearch) {
      return;
    }

    setAppliedTitleSearch('');
  };

  const handleRepairVisibility = async () => {
    setMessage(null);
    setShowRepairVisibilityModal(true);
  };

  /** 用翻译键组装“移到废纸篓”结果提示；后端未返回结构化计数时回退到后端文案。 */
  const buildTrashSummaryText = (summary: CodexSessionTrashSummary): string => {
    const hasStructuredCounts =
      summary.runningInstanceCount !== undefined
      || summary.officialDeleteFallbackInstanceCount !== undefined
      || summary.metadataRebuildFailedInstanceCount !== undefined;
    if (!hasStructuredCounts && summary.message.trim()) {
      return summary.message;
    }
    if (summary.trashedSessionCount === 0) {
      return t('codex.sessionManager.messages.trashSummaryEmpty', "Các cuộc trò chuyện đã chọn không tồn tại trong tập hợp phiên bản hiện tại, không cần xử lý");
    }

    const separator = isZh ? '；' : '; ';
    const fallbackInstanceCount = summary.officialDeleteFallbackInstanceCount ?? 0;
    const rebuildFailedInstanceCount = summary.metadataRebuildFailedInstanceCount ?? 0;
    const runningInstanceCount = summary.runningInstanceCount ?? 0;
    const parts = [
      fallbackInstanceCount > 0
        ? t(
          'codex.sessionManager.messages.trashSummaryFallback',
          "Đã chuyển {{count}} cuộc trò chuyện vào thùng rác và kích hoạt dựng lại chỉ mục phiên của Codex chính thức",
          { count: summary.trashedSessionCount },
        )
        : t(
          'codex.sessionManager.messages.trashSummary',
          "Đã chuyển {{count}} cuộc trò chuyện vào thùng rác và xóa trong Codex chính thức",
          { count: summary.trashedSessionCount },
        ),
    ];
    if (runningInstanceCount > 0) {
      parts.push(t(
        'codex.sessionManager.messages.trashSummaryRunningHint',
        "Các phiên bản đang chạy có thể cần làm mới hoặc khởi động lại để hiển thị thay đổi",
      ));
    }
    if (fallbackInstanceCount > 0) {
      parts.push(t(
        'codex.sessionManager.messages.trashSummaryFallbackHint',
        "Việc xóa chính thức chưa hoàn tất ở {{count}} phiên bản; tệp đã được xóa trực tiếp và Codex sẽ đồng bộ sau khi khởi động lại",
        { count: fallbackInstanceCount },
      ));
    }
    if (rebuildFailedInstanceCount > 0) {
      parts.push(t(
        'codex.sessionManager.messages.trashSummaryRebuildFailedHint',
        "Việc dựng lại chỉ mục thanh bên chính thức chưa hoàn tất ở {{count}} phiên bản; Codex sẽ tải lại sau khi khởi động lại",
        { count: rebuildFailedInstanceCount },
      ));
    }
    return parts.join(separator);
  };

  const handleMoveToTrash = async () => {
    if (selectedIds.length === 0) {
      setMessage({ text: t('codex.sessionManager.messages.pickOne', "Vui lòng chọn ít nhất một phiên"), tone: 'error' });
      return;
    }

    const confirmed = await confirmDialog(
      t(
        'codex.sessionManager.confirm.message',
        "Các phiên đã chọn sẽ được chuyển vào thùng rác từ các phiên bản tương ứng để có thể khôi phục sau này. Các phiên bản đang chạy có thể cần khởi động lại trước khi thay đổi xuất hiện. Tiếp tục chứ?",
      ),
      {
        title: t('codex.sessionManager.confirm.title', "Chuyển vào thùng rác"),
        okLabel: t('common.confirm', "Xác nhận"),
        cancelLabel: t('common.cancel', "Hủy"),
        kind: 'warning',
      },
    );
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);
    try {
      const summary = await moveSessionsToTrashAcrossInstances(selectedIds);
      setMessage({ text: buildTrashSummaryText(summary) });
      setSelectedIds([]);
      await loadSessions();
      if (showRestoreModal) {
        await loadTrashedSessions();
      }
    } catch (error) {
      setMessage({ text: String(error), tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleRestoreFromTrash = async () => {
    if (selectedTrashIds.length === 0) {
      setRestoreModalError(t('codex.sessionManager.messages.pickRestoreOne', "Hãy chọn ít nhất một phiên để khôi phục"));
      return;
    }

    setRestoring(true);
    setRestoreModalError(null);
    try {
      const summary = await restoreSessionsFromTrashAcrossInstances(selectedTrashIds);
      setMessage({ text: summary.message });
      setSelectedTrashIds([]);
      const [nextTrashedSessions] = await Promise.all([loadTrashedSessions(), loadSessions()]);
      if (nextTrashedSessions.length === 0) {
        setShowRestoreModal(false);
      }
    } catch (error) {
      setRestoreModalError(String(error));
    } finally {
      setRestoring(false);
    }
  };

  const handleDeleteTrashedSessions = async (sessionIds: string[]) => {
    const normalizedSessionIds = Array.from(new Set(sessionIds.filter(Boolean)));
    if (normalizedSessionIds.length === 0) {
      setRestoreModalError(t('codex.sessionManager.restoreModal.pickDeleteOne', "Chọn ít nhất một phiên để xóa vĩnh viễn"));
      return;
    }

    const deletingSessions = trashedSessions.filter((session) =>
      normalizedSessionIds.includes(session.sessionId),
    );
    const deletingSizeBytes = deletingSessions.reduce(
      (sum, session) => sum + (session.sizeBytes ?? 0),
      0,
    );
    const isSingle = normalizedSessionIds.length === 1;
    const confirmed = await confirmDialog(
      isSingle
        ? t(
            'codex.sessionManager.restoreModal.deleteOneConfirm',
            "Xóa vĩnh viễn phiên này? Không thể hoàn tác. Dung lượng dự kiến giải phóng: {{size}}.",
            { size: formatBytes(deletingSizeBytes) },
          )
        : t(
            'codex.sessionManager.restoreModal.deleteSelectedConfirm',
            "Xóa vĩnh viễn {{count}} phiên đã chọn? Không thể hoàn tác. Dung lượng dự kiến giải phóng: {{size}}.",
            { count: normalizedSessionIds.length, size: formatBytes(deletingSizeBytes) },
          ),
      {
        title: t('codex.sessionManager.restoreModal.permanentDeleteTitle', "Xóa vĩnh viễn"),
        okLabel: t('codex.sessionManager.restoreModal.permanentDeleteAction', "Xóa vĩnh viễn"),
        cancelLabel: t('common.cancel', "Hủy"),
        kind: 'warning',
      },
    );
    if (!confirmed) return;

    setPurgingTrash(true);
    setRestoreModalError(null);
    try {
      const summary = await deleteTrashedSessionsAcrossInstances(normalizedSessionIds);
      setMessage({ text: summary.message });
      setSelectedTrashIds((prev) => prev.filter((id) => !normalizedSessionIds.includes(id)));
      const nextTrashedSessions = await loadTrashedSessions();
      if (nextTrashedSessions.length === 0) {
        setShowRestoreModal(false);
      }
    } catch (error) {
      setRestoreModalError(String(error));
    } finally {
      setPurgingTrash(false);
    }
  };

  const handleEmptySessionTrash = async () => {
    if (trashedSessions.length === 0) {
      return;
    }

    const confirmed = await confirmDialog(
      t(
        'codex.sessionManager.restoreModal.emptyTrashConfirm',
        "Dọn thùng rác? {{count}} phiên sẽ bị xóa vĩnh viễn và không thể khôi phục. Dung lượng dự kiến giải phóng: {{size}}.",
        { count: trashedSessions.length, size: formatBytes(trashTotalSizeBytes) },
      ),
      {
        title: t('codex.sessionManager.restoreModal.emptyTrash', "Dọn thùng rác"),
        okLabel: t('codex.sessionManager.restoreModal.emptyTrash', "Dọn thùng rác"),
        cancelLabel: t('common.cancel', "Hủy"),
        kind: 'warning',
      },
    );
    if (!confirmed) return;

    setPurgingTrash(true);
    setRestoreModalError(null);
    try {
      const summary = await emptySessionTrashAcrossInstances();
      setMessage({ text: summary.message });
      setSelectedTrashIds([]);
      await loadTrashedSessions();
      setShowRestoreModal(false);
    } catch (error) {
      setRestoreModalError(String(error));
    } finally {
      setPurgingTrash(false);
    }
  };

  const previewImportPackage = useCallback(
    async (filePath: string, targetInstanceId: string) => {
      setLoadingImportPreview(true);
      setImportModalError(null);
      try {
        const preview = await previewSessionImport(filePath, targetInstanceId);
        setImportPreview(preview);
        setImportTargetInstanceId(preview.targetInstanceId);
        setSelectedImportIds(
          preview.items
            .filter((item) => item.status === 'ready')
            .map((item) => item.sessionId),
        );
        return preview;
      } finally {
        setLoadingImportPreview(false);
      }
    },
    [previewSessionImport, setImportModalError],
  );

  const resetExportModalSelection = useCallback(() => {
    setSelectedExportIds([]);
    setRemovedExportIds([]);
    setExportSourceFilter('all');
    setExportSelectionFilter('all');
  }, []);

  const addExportSelection = useCallback((items: CodexSessionExportPreviewItem[]) => {
    const ids = items.map((item) => item.sessionId);
    if (ids.length === 0) return;
    setSelectedExportIds((prev) => Array.from(new Set([...prev, ...ids])));
  }, []);

  const removeExportSelection = useCallback((items: CodexSessionExportPreviewItem[]) => {
    const ids = new Set(items.map((item) => item.sessionId));
    if (ids.size === 0) return;
    setSelectedExportIds((prev) => prev.filter((id) => !ids.has(id)));
  }, []);

  const removeExportItems = useCallback((items: CodexSessionExportPreviewItem[]) => {
    const ids = items.map((item) => item.sessionId);
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setRemovedExportIds((prev) => Array.from(new Set([...prev, ...ids])));
    setSelectedExportIds((prev) => prev.filter((id) => !idSet.has(id)));
  }, []);

  const toggleExportSession = useCallback((sessionId: string) => {
    setSelectedExportIds((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId],
    );
  }, []);

  const keepFilteredExportItems = useCallback(() => {
    const visibleIds = new Set(exportFilteredItems.map((item) => item.sessionId));
    setRemovedExportIds((prev) =>
      Array.from(new Set([
        ...prev,
        ...exportAvailableItems
          .filter((item) => !visibleIds.has(item.sessionId))
          .map((item) => item.sessionId),
      ])),
    );
    setSelectedExportIds(exportFilteredItems.map((item) => item.sessionId));
  }, [exportAvailableItems, exportFilteredItems]);

  const removeUncheckedExportItems = useCallback(() => {
    removeExportItems(exportAvailableItems.filter((item) => !selectedExportIdSet.has(item.sessionId)));
  }, [exportAvailableItems, removeExportItems, selectedExportIdSet]);

  const restoreRemovedExportItems = useCallback(() => {
    setRemovedExportIds([]);
  }, []);

  const handleExportSessions = async () => {
    if (selectedIds.length === 0) {
      setMessage({ text: t('codex.sessionManager.messages.pickOne', "Vui lòng chọn ít nhất một phiên"), tone: 'error' });
      return;
    }

    setMessage(null);
    setShowExportModal(true);
    setExportPreview(null);
    setExportPath('');
    resetExportModalSelection();
    setExportModalError(null);
    setLoadingExportPreview(true);
    try {
      const preview = await previewSessionExport(selectedIds);
      setExportPreview(preview);
      setSelectedExportIds(preview.items.map((item) => item.sessionId));
    } catch (error) {
      setExportModalError(String(error));
    } finally {
      setLoadingExportPreview(false);
    }
  };

  const handleCloseExportModal = () => {
    if (loadingExportPreview || exporting) return;
    setShowExportModal(false);
    setExportPreview(null);
    setExportPath('');
    resetExportModalSelection();
    setExportModalError(null);
  };

  useEscClose(showExportModal, handleCloseExportModal);

  const handleChooseExportPath = async () => {
    setExportModalError(null);
    const selected = await saveFileDialog({
      defaultPath: buildDefaultSessionExportName(),
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    });
    if (selected) {
      setExportPath(selected);
    }
  };

  const handleConfirmExportSessions = async () => {
    if (!exportPreview) {
      setExportModalError(t('codex.sessionManager.exportModal.noPreview', "Hãy hoàn tất xem trước trước"));
      return;
    }
    if (exportableSessionIds.length === 0) {
      setExportModalError(t('codex.sessionManager.exportModal.noExportable', "Không có phiên có thể xuất"));
      return;
    }
    if (!exportPath) {
      setExportModalError(t('codex.sessionManager.exportModal.pickPath', "Chọn vị trí xuất"));
      return;
    }

    setExporting(true);
    setExportModalError(null);
    setMessage(null);
    const transferId = createSessionTransferId();
    const sessionIdsToExport = [...exportableSessionIds];
    const targetExportPath = exportPath;
    transferTaskIdRef.current = transferId;
    setTransferTask({
      id: transferId,
      operation: 'export',
      status: 'running',
      progress: buildInitialTransferProgress(transferId, 'export', sessionIdsToExport.length),
    });
    setShowTransferModal(true);
    setShowExportModal(false);
    try {
      const summary = await exportSessions(sessionIdsToExport, targetExportPath, transferId);
      setTransferTask((current) =>
        current?.id === transferId
          ? {
              ...current,
              status: 'success',
              message: summary.message,
              progress: {
                ...current.progress,
                phase: 'done',
                current: current.progress.total,
                percent: 100,
                running: false,
              },
            }
          : current,
      );
      setMessage({ text: summary.message });
      setExportPreview(null);
      setExportPath('');
    } catch (error) {
      const errorText = String(error);
      setTransferTask((current) =>
        current?.id === transferId
          ? {
              ...current,
              status: 'error',
              error: errorText,
              progress: {
                ...current.progress,
                running: false,
              },
            }
          : current,
      );
      setMessage({ text: String(error), tone: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleOpenImportModal = async () => {
    const selected = await openFileDialog({
      multiple: false,
      filters: [{ name: 'ZIP', extensions: ['zip'] }],
    });
    const filePath = Array.isArray(selected) ? selected[0] : selected;
    if (!filePath) return;

    setMessage(null);
    setShowImportModal(true);
    setImportPreview(null);
    setImportCwdMappings({});
    setImportPathErrors({});
    setSelectedImportIds([]);
    setImportModalError(null);
    try {
      const latestInstances = await refreshInstances();
      const targetCandidates = sortInstancesForDisplay(
        latestInstances.length > 0 ? latestInstances : instances,
      );
      const defaultTarget = targetCandidates.find((instance) => instance.isDefault) ?? targetCandidates[0];
      const targetInstanceId = importTargetInstanceId || defaultTarget?.id || '';
      if (!targetInstanceId) {
        setImportModalError(t('codex.sessionManager.importModal.noTarget', "Không có instance Codex nào khả dụng để nhập"));
        return;
      }
      await previewImportPackage(filePath, targetInstanceId);
    } catch (error) {
      setImportModalError(String(error));
    }
  };

  const handleCloseImportModal = () => {
    if (importing || loadingImportPreview) return;
    setShowImportModal(false);
    setImportPreview(null);
    setImportCwdMappings({});
    setImportPathErrors({});
    setSelectedImportIds([]);
    setImportModalError(null);
  };

  useEscClose(showImportModal, handleCloseImportModal);

  const handleChangeImportTarget = async (targetInstanceId: string) => {
    setImportTargetInstanceId(targetInstanceId);
    setImportPathErrors({});
    setImportModalError(null);
    const filePath = importPreview?.importFilePath;
    if (!filePath || !targetInstanceId) return;
    try {
      await previewImportPackage(filePath, targetInstanceId);
    } catch (error) {
      setImportModalError(String(error));
    }
  };

  const toggleImportSession = (item: CodexSessionImportPreviewItem) => {
    if (item.status !== 'ready') return;
    setSelectedImportIds((prev) =>
      prev.includes(item.sessionId)
        ? prev.filter((id) => id !== item.sessionId)
        : [...prev, item.sessionId],
    );
  };

  const toggleAllImportReady = () => {
    if (importReadyItems.length === 0) return;
    setSelectedImportIds((prev) => {
      const next = new Set(prev);
      if (importReadyItems.every((item) => next.has(item.sessionId))) {
        importReadyItems.forEach((item) => next.delete(item.sessionId));
      } else {
        importReadyItems.forEach((item) => next.add(item.sessionId));
      }
      return Array.from(next);
    });
  };

  const handleImportSelectedSessions = async () => {
    if (!importPreview) {
      setImportModalError(t('codex.sessionManager.importModal.noPackage', "Trước tiên hãy chọn gói phiên"));
      return;
    }
    if (!importTargetInstanceId) {
      setImportModalError(t('codex.sessionManager.targetModal.pickTarget', "Chọn phiên bản đích"));
      return;
    }
    if (selectedImportIds.length === 0) {
      setImportModalError(t('codex.sessionManager.importModal.pickOne', "Chọn ít nhất một phiên có thể nhập"));
      return;
    }

    setImporting(true);
    setImportModalError(null);
    setImportPathErrors({});
    const selectedSources = new Set(importReadyItems
      .filter((item) => selectedImportIds.includes(item.sessionId)).map((item) => item.cwd.trim()));
    const cwdMappings = Object.fromEntries(Object.entries(importCwdMappings)
      .map(([source, target]) => [source.trim(), target.trim()] as const)
      .filter(([source, target]) => selectedSources.has(source) && target.length > 0 && source !== target));
    try {
      if (Object.keys(cwdMappings).length > 0) {
        const errors = await validateSessionImportPaths(cwdMappings);
        if (Object.keys(errors).length > 0) {
          setImportPathErrors(errors);
          setImporting(false);
          return;
        }
      }
    } catch (error) {
      setImportModalError(String(error));
      setImporting(false);
      return;
    }
    const transferId = createSessionTransferId();
    transferTaskIdRef.current = transferId;
    setTransferTask({
      id: transferId,
      operation: 'import',
      status: 'running',
      progress: buildInitialTransferProgress(transferId, 'import', selectedImportIds.length),
    });
    setShowTransferModal(true);
    setShowImportModal(false);
    try {
      const summary = await importSessions(
        importPreview.importFilePath,
        importTargetInstanceId,
        selectedImportIds,
        cwdMappings,
        transferId,
      );
      setTransferTask((current) =>
        current?.id === transferId
          ? {
              ...current,
              status: 'success',
              message: summary.message,
              progress: {
                ...current.progress,
                phase: 'done',
                current: current.progress.total,
                percent: 100,
                running: false,
              },
            }
          : current,
      );
      setMessage({ text: summary.message });
      setImportPreview(null);
      setSelectedImportIds([]);
      await loadSessions();
    } catch (error) {
      const errorText = String(error);
      setTransferTask((current) =>
        current?.id === transferId
          ? {
              ...current,
              status: 'error',
              error: errorText,
              progress: {
                ...current.progress,
                running: false,
              },
            }
          : current,
      );
    } finally {
      setImporting(false);
    }
  };

  const pickSessionInstanceId = (session: CodexSessionRecord): string | null => {
    if (session.locations.length === 1) {
      return session.locations[0]?.instanceId ?? null;
    }
    if (session.locations.length > 1) {
      // Prefer default instance when present; otherwise first location.
      const preferred =
        session.locations.find((loc) => loc.instanceId === '__default__') ??
        session.locations[0];
      return preferred?.instanceId ?? null;
    }
    return null;
  };

  const openSessionAtInstance = async (
    session: CodexSessionRecord,
    action: 'location' | 'rollout',
    instanceId: string | null,
    insidePicker: boolean,
  ) => {
    setOpeningSessionLocation(true);
    if (insidePicker) {
      setSessionLocationError(null);
    }
    try {
      if (action === 'location') {
        await openSessionLocation(session.sessionId, instanceId);
      } else {
        await openSessionRollout(session.sessionId, instanceId);
      }
      setSessionLocationTarget(null);
      setSessionLocationError(null);
    } catch (error) {
      const errorText = String(error);
      if (insidePicker) {
        setSessionLocationError(errorText);
        return;
      }
      setMessage({ text: errorText, tone: 'error' });
    } finally {
      setOpeningSessionLocation(false);
    }
  };

  const handleOpenSessionTarget = (
    event: MouseEvent<HTMLButtonElement>,
    session: CodexSessionRecord,
    action: 'location' | 'rollout',
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setMessage(null);
    if (session.locations.length > 1) {
      // Require explicit choice when ambiguous (#1510); use an in-app picker so the
      // instance name shown in the location column is directly selectable (#2129).
      setSessionLocationError(null);
      setSessionLocationTarget({ session, action });
      return;
    }
    void openSessionAtInstance(session, action, pickSessionInstanceId(session), false);
  };

  const handleOpenSessionLocation = (
    event: MouseEvent<HTMLButtonElement>,
    session: CodexSessionRecord,
  ) => {
    handleOpenSessionTarget(event, session, 'location');
  };

  const handleOpenSessionRollout = (
    event: MouseEvent<HTMLButtonElement>,
    session: CodexSessionRecord,
  ) => {
    handleOpenSessionTarget(event, session, 'rollout');
  };

  const handleCloseSessionLocationPicker = () => {
    if (openingSessionLocation) return;
    setSessionLocationTarget(null);
    setSessionLocationError(null);
  };

  useEscClose(
    Boolean(sessionLocationTarget) && !openingSessionLocation,
    handleCloseSessionLocationPicker,
  );

  const getImportStatusLabel = (item: CodexSessionImportPreviewItem): string => {
    if (item.status === 'ready') {
      return t('codex.sessionManager.importModal.statusReady', "Sẵn sàng");
    }
    if (item.status === 'duplicate') {
      return t('codex.sessionManager.importModal.statusDuplicate', "Đã có");
    }
    if (item.status === 'conflict') {
      return t('codex.sessionManager.importModal.statusConflict', "Xung đột");
    }
    return t('codex.sessionManager.importModal.statusInvalid', "Không hợp lệ");
  };

  const handleCopySessionId = async (event: MouseEvent<HTMLButtonElement>, sessionId: string) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(sessionId);
      setCopiedSessionId(sessionId);
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
      copyResetTimerRef.current = window.setTimeout(() => {
        setCopiedSessionId((current) => (current === sessionId ? null : current));
        copyResetTimerRef.current = null;
      }, 1200);
    } catch (error) {
      console.error('Failed to copy session id:', error);
      setMessage({
        text: t('common.shared.export.copyFailed', "Sao chép thất bại, vui lòng sao chép thủ công"),
        tone: 'error',
      });
    }
  };

  return (
    <section className="codex-session-manager">
      {sessionView === 'usage' ? (
        <CodexSessionUsagePanel onBack={() => setSessionView('list')} />
      ) : null}
      {sessionView === 'list' ? (
      <>
      <CodexSessionUsageSummary onOpenDetail={() => setSessionView('usage')} />
      <div className="codex-session-manager__header">
        <div className="codex-session-manager__search">
          <label className="codex-session-search-field">
            <div className="codex-session-search-field__control">
              <Search size={14} />
              <input
                type="text"
                value={titleSearchInput}
                onChange={(event) => setTitleSearchInput(event.target.value)}
                placeholder={t('codex.sessionManager.search.titlePlaceholder', "Tìm theo tiêu đề")}
                disabled={loading}
              />
            </div>
          </label>
          <button
            className="btn btn-secondary codex-session-manager__search-button"
            type="button"
            onClick={handleClearSearch}
            disabled={loading || (!hasSearchInput && !hasAppliedSearch)}
          >
            <X size={14} />
            {t('codex.sessionManager.search.clear', "Xóa")}
          </button>
          <SingleSelectDropdown
            className="codex-session-manager__kind-filter"
            value={sessionKindFilter}
            disabled={loading}
            options={sessionKindOptions}
            onChange={(value) => setSessionKindFilter(value as CodexSessionKindFilter)}
            ariaLabel={t('codex.sessionManager.kindFilter', "Loại phiên")}
            menuWidth={160}
            menuMaxHeight={220}
          />
        </div>
        <div className="codex-session-manager__actions">
          <div className="codex-session-manager__action-group is-maintenance">
            <button
              className="btn btn-secondary codex-session-manager__action-button"
              type="button"
              onClick={() => void handleSyncSessions()}
              disabled={syncing || syncingToInstance || repairingVisibility || deleting || loading || instanceCount < 2}
              title={
                instanceCount < 2
                  ? t('codex.sessionManager.messages.syncNeedTwo', "Cần ít nhất hai phiên bản để đồng bộ phiên")
                  : t('codex.sessionManager.actions.syncSessions', "Đồng bộ phiên")
              }
            >
              <RefreshCw size={14} className={syncing ? 'icon-spin' : undefined} />
              {t('codex.sessionManager.actions.syncSessions', "Đồng bộ phiên")}
            </button>
            <button
              className="btn btn-secondary codex-session-manager__action-button"
              type="button"
              onClick={() => void handleOpenImportModal()}
              disabled={loading || syncing || syncingToInstance || repairingVisibility || deleting || exporting || importing || loadingImportPreview}
            >
              <Upload size={14} className={loadingImportPreview ? 'icon-spin' : undefined} />
              {t('codex.sessionManager.actions.importSessions', "Nhập phiên")}
            </button>
            <button
              className="btn btn-secondary codex-session-manager__action-button"
              type="button"
              onClick={() => void handleRepairVisibility()}
              disabled={repairingVisibility || loading || deleting || syncing || syncingToInstance || exporting}
            >
              <Eye size={14} />
              {t('codex.sessionManager.actions.repairVisibility', "Sửa hiển thị")}
            </button>
            <button
              className="btn btn-secondary codex-session-manager__action-button"
              type="button"
              onClick={() => void handleOpenRestoreModal()}
              disabled={loading || syncing || syncingToInstance || repairingVisibility || deleting || restoring || purgingTrash}
            >
              <Trash2 size={14} />
              {t('codex.sessionManager.actions.trash', "Thùng rác")}
            </button>
            <button
              className="btn btn-secondary codex-session-manager__action-button"
              type="button"
              onClick={() => void handleRefresh()}
              disabled={loading || deleting || syncing || syncingToInstance || repairingVisibility}
            >
              <RefreshCw size={14} className={loading ? 'icon-spin' : undefined} />
              {t('common.refresh', "Làm mới")}
            </button>
          </div>
          {allSessionIds.length > 0 && (
            <div className="codex-session-manager__action-group is-selection">
              <button
                className="btn btn-secondary codex-session-manager__action-button"
                type="button"
                onClick={toggleAllSessions}
                disabled={loading || allSessionIds.length === 0}
                title={
                  allSessionsSelected
                    ? t('codex.sessionManager.actions.clearSelectedSessions', "Bỏ chọn")
                    : t('codex.sessionManager.actions.selectAllSessions', "Chọn mọi phiên")
                }
                aria-label={
                  allSessionsSelected
                    ? t('codex.sessionManager.actions.clearSelectedSessions', "Bỏ chọn")
                    : t('codex.sessionManager.actions.selectAllSessions', "Chọn mọi phiên")
                }
              >
                {allSessionsSelected ? <X size={14} /> : <Check size={14} />}
                {allSessionsSelected
                  ? t('codex.sessionManager.actions.clearSelectedSessions', "Bỏ chọn")
                  : t('codex.sessionManager.actions.selectAllSessions', "Chọn mọi phiên")}
              </button>
              <button
                className="btn btn-secondary codex-session-manager__action-button"
                type="button"
                onClick={() => void handleOpenSyncTargetModal()}
                disabled={syncing || syncingToInstance || repairingVisibility || deleting || loading || exporting || selectedIds.length === 0}
              >
                <Copy size={14} className={syncingToInstance ? 'icon-spin' : undefined} />
                {t('codex.sessionManager.actions.copyToInstance', "Sao chép sang phiên bản")} ({selectedIds.length})
              </button>
              <button
                className="btn btn-secondary codex-session-manager__action-button"
                type="button"
                onClick={() => void handleExportSessions()}
                disabled={syncing || syncingToInstance || repairingVisibility || deleting || loading || loadingExportPreview || exporting || selectedIds.length === 0}
              >
                <Download size={14} className={loadingExportPreview || exporting ? 'icon-spin' : undefined} />
                {t('codex.sessionManager.actions.exportSessions', "Xuất phiên")} ({selectedIds.length})
              </button>
              <button
                className="btn btn-danger codex-session-manager__action-button"
                type="button"
                onClick={() => void handleMoveToTrash()}
                disabled={deleting || loading || syncing || syncingToInstance || repairingVisibility || selectedIds.length === 0}
              >
                <Trash2 size={14} />
                {t('codex.sessionManager.actions.moveToTrash', "Chuyển vào thùng rác")} ({selectedIds.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {message ? (
        <div className={`message-bar ${message.tone === 'error' ? 'error' : 'success'}`}>{message.text}</div>
      ) : null}

      {transferTask && !showTransferModal ? (
        <div className={`codex-session-transfer-task is-${transferTask.status}`}>
          <div className="codex-session-transfer-task__copy">
            <strong>{getTransferTitle(transferTask.operation)}</strong>
            <span>
              {transferTask.status === 'running'
                ? t('codex.sessionManager.transferModal.runningSummary', {
                    defaultValue: "Đang xử lý {{current}}/{{total}}",
                    current: transferProgress?.current ?? 0,
                    total: transferProgress?.total ?? 0,
                  })
                : transferTask.status === 'success'
                  ? t('codex.sessionManager.transferModal.completedSummary', "Tác vụ đã hoàn tất")
                  : t('codex.sessionManager.transferModal.failedSummary', "Tác vụ thất bại")}
            </span>
            <div className="codex-session-transfer-task__progress" aria-hidden="true">
              <span style={{ width: `${transferPercent}%` }} />
            </div>
          </div>
          <div className="codex-session-transfer-task__actions">
            <button className="btn btn-secondary" type="button" onClick={() => setShowTransferModal(true)}>
              <Eye size={14} />
              {t('codex.sessionManager.transferModal.reopen', "Xem tiến độ")}
            </button>
            {transferTask.status !== 'running' ? (
              <button className="btn btn-secondary" type="button" onClick={handleClearTransferTask}>
                <X size={14} />
                {t('codex.sessionManager.transferModal.clear', "Xóa")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading && sessions.length === 0 ? (
        <div className="empty-state">
          <h3>{t('common.loading', "Đang tải...")}</h3>
        </div>
      ) : null}

      {!loading && groupedSessions.length === 0 ? (
        <div className="empty-state codex-session-manager__empty">
          <Folder size={42} className="empty-icon" />
          <h3>
            {hasAppliedSearch
              ? t('codex.sessionManager.empty.searchTitle', "Không tìm thấy phiên phù hợp")
              : t('codex.sessionManager.empty.title', "Chưa có phiên nào để quản lý")}
          </h3>
          <p>
            {hasAppliedSearch
              ? t('codex.sessionManager.empty.searchDesc', "Hãy điều chỉnh từ khóa tiêu đề.")
              : t('codex.sessionManager.empty.desc', "Không tìm thấy bản ghi phiên nào trong tập hợp phiên bản hiện tại.")}
          </p>
        </div>
      ) : null}

      {groupedSessions.length > 0 ? (
        <div className="codex-session-manager__list">
          {groupedSessions.map((group) => {
            const groupSessionIds = group.sessions.map((item) => item.sessionId);
            const allSelected = groupSessionIds.every((id) => selectedIdSet.has(id));
            const isExpanded = expandedGroups.includes(group.cwd);
            const isTokenStatsLoading = loadingTokenGroupSet.has(group.cwd);
            return (
              <section className="codex-session-folder" key={group.cwd}>
                <div className="codex-session-folder__row">
                  <div className="codex-session-folder__left">
                    <button
                      className="codex-session-folder__expand"
                      type="button"
                      onClick={() => toggleGroupExpanded(group.cwd)}
                      aria-label={
                        isExpanded
                          ? t('codex.sessionManager.actions.collapse', "Thu gọn")
                          : t('codex.sessionManager.actions.expand', "Mở rộng")
                      }
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <input
                      className="codex-session-folder__checkbox"
                      type="checkbox"
                      checked={allSelected && groupSessionIds.length > 0}
                      onChange={() => toggleGroupSelection(groupSessionIds)}
                    />
                    <Folder size={16} className="codex-session-folder__icon" />
                    <button
                      className="codex-session-folder__label"
                      type="button"
                      onClick={() => toggleGroupExpanded(group.cwd)}
                      title={group.cwd}
                    >
                      {resolveGroupLabel(group.cwd, group.projectName)}
                    </button>
                  </div>
                  <span className="codex-session-folder__time">
                    {formatRelativeTime(group.latestUpdatedAt, isZh)}
                  </span>
                </div>
                {isExpanded ? (
                  <div className="codex-session-folder__children">
                    {group.sessions.map((session) => {
                      const hasRunningLocation = session.locations.some((location) => location.running);
                      const tokenText = formatTokenStats(tokenStatsBySessionId[session.sessionId]);
                      return (
                        <div className="codex-session-row" key={session.sessionId}>
                          <label className="codex-session-row__left">
                            <input
                              className="codex-session-row__checkbox"
                              type="checkbox"
                              checked={selectedIdSet.has(session.sessionId)}
                              onChange={() => toggleSession(session.sessionId)}
                            />
                            <div className="codex-session-row__content">
                              <span className="codex-session-row__title" title={session.title}>
                                {session.title || t('codex.sessionManager.untitled', "Phiên chưa đặt tên")}
                              </span>
                              <span className="codex-session-row__meta">
                                {session.locations.map((location) => location.instanceName).join(' / ')}
                                {hasRunningLocation
                                  ? t('codex.sessionManager.locationRunning', " (đang chạy)")
                                  : ''}
                              </span>
                              <span className="codex-session-row__meta codex-session-row__session-id" title={session.sessionId}>
                                {t('codex.sessionManager.labels.sessionId', "ID phiên")}: {formatSessionId(session.sessionId)}
                              </span>
                            </div>
                          </label>
                          <div className="codex-session-row__right">
                            <button
                              className={`codex-session-row__copy-button${copiedSessionId === session.sessionId ? ' is-copied' : ''}`}
                              type="button"
                              onClick={(event) => void handleCopySessionId(event, session.sessionId)}
                              title={t('codex.sessionManager.actions.copySessionId', "Sao chép ID phiên")}
                              aria-label={t('codex.sessionManager.actions.copySessionId', "Sao chép ID phiên")}
                            >
                              {copiedSessionId === session.sessionId ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                            <button
                              className="codex-session-row__copy-button"
                              type="button"
                              onClick={(event) => void handleOpenSessionLocation(event, session)}
                              title={t('codex.sessionManager.actions.openLocation', "Mở vị trí")}
                              aria-label={t('codex.sessionManager.actions.openLocation', "Mở vị trí")}
                            >
                              <FolderOpen size={14} />
                            </button>
                            <button
                              className="codex-session-row__copy-button"
                              type="button"
                              onClick={(event) => void handleOpenSessionRollout(event, session)}
                              title={t('codex.sessionManager.actions.openRollout', "Mở tệp phiên")}
                              aria-label={t('codex.sessionManager.actions.openRollout', "Mở tệp phiên")}
                            >
                              <FileText size={14} />
                            </button>
                            {tokenText ? (
                              <span className="codex-session-row__tokens" title={t('codex.sessionManager.labels.tokenUsage', "Mức dùng token")}>
                                {tokenText}
                              </span>
                            ) : null}
                            {!tokenText && isTokenStatsLoading ? (
                              <span className="codex-session-row__tokens" title={t('common.loading', "Đang tải...")}>
                                <RefreshCw size={12} className="icon-spin" />
                              </span>
                            ) : null}
                            <span className="codex-session-row__time">
                              {formatRelativeTime(session.updatedAt, isZh)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}
      </>
      ) : null}

      {showSyncTargetModal ? (
        <div className="modal-overlay">
          <div className="modal codex-session-target-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('codex.sessionManager.targetModal.title', "Sao chép sang phiên bản")}</h2>
              <button
                className="modal-close"
                type="button"
                onClick={handleCloseSyncTargetModal}
                disabled={syncingToInstance}
                aria-label={t('common.close', "Đóng")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage message={syncTargetModalError} scrollKey={syncTargetModalErrorScrollKey} />
              <p className="codex-session-target-modal__hint">
                {t(
                  'codex.sessionManager.targetModal.hint',
                  "Sao chép các phiên đã chọn sang phiên bản đích. Phiên có cùng ID đã tồn tại ở đó sẽ được bỏ qua. Phiên bản đích đang chạy có thể cần khởi động lại trước khi hiển thị.",
                )}
              </p>
              <label className="codex-session-target-modal__field">
                <span>{t('codex.sessionManager.targetModal.targetInstance', "Phiên bản đích")}</span>
                <SingleSelectDropdown
                  className="codex-session-target-modal__select"
                  value={syncTargetInstanceId}
                  options={targetInstanceOptions}
                  onChange={(value) => {
                    setSyncTargetInstanceId(value);
                    setSyncTargetModalError(null);
                  }}
                  disabled={syncingToInstance}
                  ariaLabel={t('codex.sessionManager.targetModal.targetInstance', "Phiên bản đích")}
                  menuMaxHeight={240}
                />
              </label>
              <div className="codex-session-target-modal__summary">
                <span>
                  {t('codex.sessionManager.targetModal.selectedCount', {
                    defaultValue: "Đã chọn {{count}} phiên",
                    count: selectedIds.length,
                  })}
                </span>
                {syncTargetInstance ? (
                  <span>
                    {t('codex.sessionManager.targetModal.existingCount', {
                      defaultValue: "{{count}} đã có ở đích",
                      count: syncTargetExistingCount,
                    })}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleCloseSyncTargetModal}
                disabled={syncingToInstance}
              >
                {t('common.cancel', "Hủy")}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void handleSyncSelectedToInstance()}
                disabled={syncingToInstance || !syncTargetInstanceId || selectedIds.length === 0}
              >
                <Copy size={14} className={syncingToInstance ? 'icon-spin' : undefined} />
                {t('codex.sessionManager.targetModal.confirm', "Sao chép phiên")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showExportModal ? (
        <div className="modal-overlay">
          <div className="modal codex-session-export-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('codex.sessionManager.exportModal.title', "Xuất phiên")}</h2>
              <button
                className="modal-close"
                type="button"
                onClick={handleCloseExportModal}
                disabled={loadingExportPreview || exporting}
                aria-label={t('common.close', "Đóng")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage message={exportModalError} scrollKey={exportModalErrorScrollKey} />
              <p className="codex-session-export-modal__hint">
                {t(
                  'codex.sessionManager.exportModal.hint',
                  "Xem lại danh sách phiên, phiên bản nguồn và dung lượng trước khi xuất. Gói chỉ chứa tệp rollout và mục session_index, không chứa tài khoản, token, API Key hoặc cấu hình ứng dụng.",
                )}
              </p>
              {loadingExportPreview ? (
                <div className="codex-session-restore-modal__empty">
                  <RefreshCw size={28} className="icon-spin empty-icon" />
                  <h3>{t('codex.sessionManager.exportModal.previewing', "Đang xem trước phiên...")}</h3>
                </div>
              ) : null}
              {!loadingExportPreview && exportPreview ? (
                <>
                  <div className="codex-session-export-modal__summary">
                    <span>
                      {t('codex.sessionManager.exportModal.selectedExportCount', {
                        defaultValue: "Đã chọn {{selected}} / có thể xuất {{total}}",
                        selected: exportableSessionIds.length,
                        total: exportAvailableItems.length,
                      })}
                    </span>
                    <span>
                      {t('codex.sessionManager.exportModal.selectedSize', {
                        defaultValue: "Dung lượng đã chọn {{selected}} / tổng {{total}}",
                        selected: formatBytes(exportSelectedSizeBytes),
                        total: formatBytes(exportAvailableSizeBytes),
                      })}
                    </span>
                    <span>
                      {t('codex.sessionManager.exportModal.missingCount', {
                        defaultValue: "Thiếu {{count}}",
                        count: exportPreview.missingSessionCount,
                      })}
                    </span>
                  </div>
                  {removedExportIds.length > 0 ? (
                    <div className="codex-session-export-modal__notice is-neutral">
                      <span>
                        {t('codex.sessionManager.exportModal.removedNotice', {
                          defaultValue: "Đã bỏ {{count}} khỏi danh sách xuất này",
                          count: removedExportIds.length,
                        })}
                      </span>
                      <button
                        className="btn btn-secondary codex-session-export-modal__notice-action"
                        type="button"
                        onClick={restoreRemovedExportItems}
                        disabled={exporting}
                      >
                        <RotateCcw size={13} />
                        {t('codex.sessionManager.exportModal.restoreRemoved', "Khôi phục danh sách")}
                      </button>
                    </div>
                  ) : null}
                  <div className="codex-session-export-modal__path">
                    <div className="codex-session-export-modal__path-copy">
                      <strong>{t('codex.sessionManager.exportModal.exportPath', "Vị trí xuất")}</strong>
                      <span title={exportPath}>
                        {exportPath || t('codex.sessionManager.exportModal.pathUnset', "Chưa chọn vị trí xuất")}
                      </span>
                    </div>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => void handleChooseExportPath()}
                      disabled={exporting}
                    >
                      <FolderOpen size={14} />
                      {t('codex.sessionManager.exportModal.choosePath', "Chọn vị trí")}
                    </button>
                  </div>
                  {exportPreview.missingSessionCount > 0 ? (
                    <div className="codex-session-export-modal__notice">
                      {t('codex.sessionManager.exportModal.missingNotice', {
                        defaultValue: "{{count}} phiên không còn trong tập phiên bản hiện tại và sẽ bị bỏ qua.",
                        count: exportPreview.missingSessionCount,
                      })}
                    </div>
                  ) : null}
                  {exportAvailableItems.length > 0 ? (
                    <>
                      <div className="codex-session-export-filter">
                        <label className="codex-session-export-filter__field">
                          <span>{t('codex.sessionManager.exportModal.sourceLabel', "Nguồn")}</span>
                          <SingleSelectDropdown
                            className="codex-session-export-filter__select"
                            value={exportSourceFilter}
                            options={exportSourceOptions}
                            onChange={setExportSourceFilter}
                            disabled={exporting}
                            ariaLabel={t('codex.sessionManager.exportModal.sourceLabel', "Nguồn")}
                            menuMaxHeight={240}
                          />
                        </label>
                        <label className="codex-session-export-filter__field">
                          <span>{t('codex.sessionManager.exportModal.selectionLabel', "Chọn")}</span>
                          <SingleSelectDropdown
                            className="codex-session-export-filter__select"
                            value={exportSelectionFilter}
                            options={exportSelectionFilterOptions}
                            onChange={(value) => setExportSelectionFilter(value as ExportSelectionFilter)}
                            disabled={exporting}
                            ariaLabel={t('codex.sessionManager.exportModal.selectionLabel', "Chọn")}
                            menuMaxHeight={220}
                          />
                        </label>
                      </div>
                      <div className="codex-session-export-actions">
                        <span>
                          {t('codex.sessionManager.exportModal.visibleCount', {
                            defaultValue: "Đang hiện {{visible}} / {{total}}",
                            visible: exportFilteredItems.length,
                            total: exportAvailableItems.length,
                          })}
                        </span>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => addExportSelection(exportFilteredItems)}
                          disabled={exporting || exportFilteredItems.length === 0}
                        >
                          <Check size={13} />
                          {t('codex.sessionManager.exportModal.selectVisible', "Chọn bộ lọc")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => removeExportSelection(exportFilteredItems)}
                          disabled={exporting || exportFilteredItems.length === 0}
                        >
                          <X size={13} />
                          {t('codex.sessionManager.exportModal.clearVisible', "Bỏ bộ lọc")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={keepFilteredExportItems}
                          disabled={exporting || exportFilteredItems.length === 0}
                        >
                          {t('codex.sessionManager.exportModal.keepVisibleOnly', "Giữ bộ lọc")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => removeExportItems(exportFilteredItems)}
                          disabled={exporting || exportFilteredItems.length === 0}
                        >
                          <Trash2 size={13} />
                          {t('codex.sessionManager.exportModal.removeVisible', "Bỏ khỏi lọc")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={removeUncheckedExportItems}
                          disabled={exporting || exportAvailableItems.length === exportableSessionIds.length}
                        >
                          {t('codex.sessionManager.exportModal.removeUnchecked', "Bỏ chưa chọn")}
                        </button>
                      </div>
                      {exportFilteredItems.length > 0 ? (
                        <div className="codex-session-export-list">
                          {exportFilteredItems.map((item: CodexSessionExportPreviewItem) => {
                            const selected = selectedExportIdSet.has(item.sessionId);
                            return (
                              <div
                                className={`codex-session-export-row${selected ? ' is-selected' : ''}`}
                                key={item.sessionId}
                              >
                                <label className="codex-session-export-row__check">
                                  <input
                                    className="codex-session-row__checkbox"
                                    type="checkbox"
                                    checked={selected}
                                    disabled={exporting}
                                    onChange={() => toggleExportSession(item.sessionId)}
                                  />
                                  <span className="sr-only">
                                    {t('codex.sessionManager.exportModal.selectItem', "Chọn phiên để xuất")}
                                  </span>
                                </label>
                                <div className="codex-session-export-row__content">
                                  <span className="codex-session-export-row__title" title={item.title}>
                                    {item.title || t('codex.sessionManager.untitled', "Phiên chưa đặt tên")}
                                  </span>
                                  <span className="codex-session-export-row__meta" title={item.cwd}>
                                    {item.cwd}
                                  </span>
                                  <span className="codex-session-export-row__meta">
                                    {t('codex.sessionManager.exportModal.sourceInstance', {
                                      defaultValue: "Nguồn: {{name}}",
                                      name: item.sourceInstanceName,
                                    })}
                                  </span>
                                </div>
                                <div className="codex-session-export-row__right">
                                  <span className="codex-session-import-row__size">{formatBytes(item.sizeBytes)}</span>
                                  <span className="codex-session-row__time">
                                    {formatRelativeTime(item.updatedAt, isZh)}
                                  </span>
                                  <button
                                    className="btn btn-secondary codex-session-export-row__remove"
                                    type="button"
                                    onClick={() => removeExportItems([item])}
                                    disabled={exporting}
                                  >
                                    <Trash2 size={13} />
                                    {t('codex.sessionManager.exportModal.removeItem', "Bỏ")}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="codex-session-restore-modal__empty">
                          <Search size={32} className="empty-icon" />
                          <h3>{t('codex.sessionManager.exportModal.emptyFilteredTitle', "Không có phiên phù hợp")}</h3>
                          <p>{t('codex.sessionManager.exportModal.emptyFilteredDesc', "Điều chỉnh tìm kiếm, nguồn hoặc trạng thái chọn rồi thử lại.")}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="codex-session-restore-modal__empty">
                      <Folder size={32} className="empty-icon" />
                      <h3>{t('codex.sessionManager.exportModal.emptyTitle', "Không có phiên để xuất")}</h3>
                    </div>
                  )}
                </>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleCloseExportModal}
                disabled={loadingExportPreview || exporting}
              >
                {t('common.cancel', "Hủy")}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void handleConfirmExportSessions()}
                disabled={loadingExportPreview || exporting || !exportPath || exportableSessionIds.length === 0}
              >
                <Download size={14} className={exporting ? 'icon-spin' : undefined} />
                {t('codex.sessionManager.exportModal.confirm', "Xuất")} ({exportableSessionIds.length})
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showImportModal ? (
        <div className="modal-overlay">
          <div className="modal codex-session-import-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('codex.sessionManager.importModal.title', "Nhập phiên")}</h2>
              <button
                className="modal-close"
                type="button"
                onClick={handleCloseImportModal}
                disabled={importing || loadingImportPreview}
                aria-label={t('common.close', "Đóng")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage message={importModalError} scrollKey={importModalErrorScrollKey} />
              <p className="codex-session-import-modal__hint">
                {t(
                  'codex.sessionManager.importModal.hint',
                  "Gói phiên chỉ nhập các tệp rollout và mục session_index. Không bao gồm tài khoản, token, API key hoặc cài đặt ứng dụng; phiên có cùng ID trong instance đích sẽ bị bỏ qua.",
                )}
              </p>
              <label className="codex-session-target-modal__field">
                <span>{t('codex.sessionManager.targetModal.targetInstance', "Phiên bản đích")}</span>
                <SingleSelectDropdown
                  className="codex-session-target-modal__select"
                  value={importTargetInstanceId}
                  options={importTargetOptions}
                  onChange={(value) => void handleChangeImportTarget(value)}
                  disabled={importing || loadingImportPreview}
                  ariaLabel={t('codex.sessionManager.targetModal.targetInstance', "Phiên bản đích")}
                  menuMaxHeight={240}
                />
              </label>
              {importPreview ? (
                <div className="codex-session-import-modal__summary">
                  <span>
                    {t('codex.sessionManager.importModal.totalCount', {
                      defaultValue: "{{count}} phiên trong gói",
                      count: importPreview.totalSessionCount,
                    })}
                  </span>
                  <span>
                    {t('codex.sessionManager.importModal.readyCount', {
                      defaultValue: "{{count}} có thể nhập",
                      count: importPreview.importableSessionCount,
                    })}
                  </span>
                  <button
                    className="btn btn-secondary codex-session-import-modal__select-all"
                    type="button"
                    onClick={toggleAllImportReady}
                    disabled={importing || loadingImportPreview || importReadyItems.length === 0}
                  >
                    {allImportReadySelected
                      ? t('codex.sessionManager.actions.clearSelectedSessions', "Bỏ chọn")
                      : t('codex.sessionManager.importModal.selectReady', "Chọn mục có thể nhập")}
                  </button>
                </div>
              ) : null}
              {!loadingImportPreview && importSourceCwds.length > 0 ? (
                <section className="codex-session-import-mappings">
                  <div className="codex-session-import-mappings__intro">
                    <strong>
                      {t('codex.sessionManager.importModal.cwdMappingTitle', "Ánh xạ đường dẫn dự án (tùy chọn)")}
                    </strong>
                    <p>
                      {t(
                        'codex.sessionManager.importModal.cwdMappingHint',
                        "Ánh xạ thư mục làm việc nguồn sang đường dẫn dự án đã được thêm vào Codex trên máy tính này. Để trống để giữ nguyên đường dẫn nguồn.",
                      )}
                    </p>
                  </div>
                  <div className="codex-session-import-mappings__list">
                    {importSourceCwds.map((sourceCwd) => (
                      <label className="codex-session-import-mappings__row" key={sourceCwd}>
                        <code className="codex-session-import-mappings__source" title={sourceCwd}>
                          {sourceCwd}
                        </code>
                        <input
                          className="codex-session-import-mappings__target"
                          ref={(input) => { importPathInputs.current[sourceCwd.trim()] = input; }}
                          aria-invalid={Boolean(importPathErrors[sourceCwd.trim()])}
                          type="text"
                          value={importCwdMappings[sourceCwd] ?? ''}
                          placeholder={t(
                            'codex.sessionManager.importModal.cwdTargetPlaceholder',
                            "Nhập đường dẫn tuyệt đối đến dự án trên máy tính này",
                          )}
                          aria-label={`${t('codex.sessionManager.importModal.cwdMappingTitle', "Ánh xạ đường dẫn dự án (tùy chọn)")}: ${sourceCwd}`}
                          disabled={importing}
                          onChange={(event) => {
                            setImportPathErrors({});
                            setImportModalError(null);
                            setImportCwdMappings((previous) => ({
                              ...previous,
                              [sourceCwd]: event.target.value,
                            }));
                          }}
                        />
                        {importPathErrors[sourceCwd.trim()] ? (
                          <span className="codex-session-import-mappings__error" role="alert">
                            {t(`codex.sessionManager.importModal.${importPathErrors[sourceCwd.trim()]}`)}
                          </span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </section>
              ) : null}
              {loadingImportPreview ? (
                <div className="codex-session-restore-modal__empty">
                  <RefreshCw size={28} className="icon-spin empty-icon" />
                  <h3>{t('codex.sessionManager.importModal.previewing', "Đang xem trước gói phiên...")}</h3>
                </div>
              ) : null}
              {!loadingImportPreview && importPreview ? (
                <div className="codex-session-import-list">
                  {importPreview.items.map((item) => (
                    <label
                      className={`codex-session-import-row is-${item.status}`}
                      key={item.sessionId}
                    >
                      <div className="codex-session-import-row__left">
                        <input
                          className="codex-session-row__checkbox"
                          type="checkbox"
                          checked={selectedImportIdSet.has(item.sessionId)}
                          disabled={item.status !== 'ready' || importing}
                          onChange={() => toggleImportSession(item)}
                        />
                        <div className="codex-session-import-row__content">
                          <span className="codex-session-import-row__title" title={item.title}>
                            {item.title || t('codex.sessionManager.untitled', "Phiên chưa đặt tên")}
                          </span>
                          <span className="codex-session-import-row__meta" title={item.cwd}>
                            {item.cwd}
                          </span>
                          {item.existingInstanceNames.length > 0 ? (
                            <span className="codex-session-import-row__meta">
                              {t('codex.sessionManager.importModal.existsIn', {
                                defaultValue: "Đã có trong: {{names}}",
                                names: item.existingInstanceNames.join(' / '),
                              })}
                            </span>
                          ) : null}
                          {item.reason ? (
                            <span className="codex-session-import-row__reason">{item.reason}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="codex-session-import-row__right">
                        <span className={`codex-session-import-row__status is-${item.status}`}>
                          {getImportStatusLabel(item)}
                        </span>
                        <span className="codex-session-import-row__size">{formatBytes(item.sizeBytes)}</span>
                      </div>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleCloseImportModal}
                disabled={importing || loadingImportPreview}
              >
                {t('common.cancel', "Hủy")}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void handleImportSelectedSessions()}
                disabled={importing || loadingImportPreview || selectedImportIds.length === 0}
              >
                <Upload size={14} className={importing ? 'icon-spin' : undefined} />
                {t('codex.sessionManager.importModal.confirm', "Nhập phiên đã chọn")} ({selectedImportIds.length})
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {transferTask && showTransferModal ? (
        <div className="modal-overlay">
          <div
            className={`modal codex-session-transfer-modal is-${transferTask.status}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{getTransferTitle(transferTask.operation)}</h2>
              <button
                className="modal-close"
                type="button"
                onClick={transferRunning ? handleMinimizeTransferModal : handleClearTransferTask}
                aria-label={
                  transferRunning
                    ? t('codex.sessionManager.transferModal.minimize', "Thu nhỏ")
                    : t('common.close', "Đóng")
                }
              >
                {transferRunning ? <Minimize2 size={18} /> : <X size={18} />}
              </button>
            </div>
            <div className="modal-body">
              <div className="codex-session-transfer-progress" role="status">
                <div className="codex-session-transfer-progress__head">
                  <strong>{getTransferPhaseText(transferProgress)}</strong>
                  <span>{transferPercent}%</span>
                </div>
                <div className="codex-session-transfer-progress__bar">
                  <span style={{ width: `${transferPercent}%` }} />
                </div>
                <div className="codex-session-transfer-current">
                  <span>
                    {t('codex.sessionManager.transferModal.current', {
                      defaultValue: '{{current}} / {{total}}',
                      current: transferProgress?.current ?? 0,
                      total: transferProgress?.total ?? 0,
                    })}
                  </span>
                  {transferProgress?.currentLabel ? <span>{transferProgress.currentLabel}</span> : null}
                </div>
              </div>
              {transferTask.message ? (
                <div className="codex-session-transfer-result is-success">{transferTask.message}</div>
              ) : null}
              {transferTask.error ? (
                <div className="codex-session-transfer-result is-error">{transferTask.error}</div>
              ) : null}
            </div>
            <div className="modal-footer">
              {transferRunning ? (
                <button className="btn btn-secondary" type="button" onClick={handleMinimizeTransferModal}>
                  <Minimize2 size={14} />
                  {t('codex.sessionManager.transferModal.minimize', "Thu nhỏ")}
                </button>
              ) : (
                <button className="btn btn-primary" type="button" onClick={handleClearTransferTask}>
                  <X size={14} />
                  {t('common.close', "Đóng")}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <CodexSessionVisibilityRepairModal
        open={showRepairVisibilityModal}
        selectedSessionIds={selectedIds}
        totalSessionCount={allSessionIds.length}
        onClose={() => setShowRepairVisibilityModal(false)}
        onRunningChange={setRepairingVisibility}
        onRepaired={() => loadSessions()}
      />

      {showRestoreModal ? (
        <div className="modal-overlay">
          <div className="modal codex-session-restore-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('codex.sessionManager.restoreModal.title', "Thùng rác")}</h2>
              <button
                className="modal-close"
                type="button"
                onClick={handleCloseRestoreModal}
                disabled={restoring || purgingTrash}
                aria-label={t('common.close', "Đóng")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage message={restoreModalError} scrollKey={restoreModalErrorScrollKey} />
              {loadingTrash ? (
                <div className="codex-session-restore-modal__empty">
                  <h3>{t('common.loading', "Đang tải...")}</h3>
                </div>
              ) : null}
              {!loadingTrash && trashedSessions.length === 0 ? (
                <div className="codex-session-restore-modal__empty">
                  <Folder size={36} className="empty-icon" />
                  <h3>{t('codex.sessionManager.restoreModal.emptyTitle', "Thùng rác trống")}</h3>
                  <p>{t('codex.sessionManager.restoreModal.emptyDesc', "Các phiên đã chuyển vào thùng rác sẽ xuất hiện ở đây.")}</p>
                </div>
              ) : null}
              {!loadingTrash && trashedSessions.length > 0 ? (
                <>
                  <div className="codex-session-restore-modal__summary">
                    <span>
                      {t('codex.sessionManager.restoreModal.summary', "{{count}} mục, {{size}}", {
                        count: trashedSessions.length,
                        size: formatBytes(trashTotalSizeBytes),
                      })}
                    </span>
                    <span>
                      {t('codex.sessionManager.restoreModal.selectedSummary', "Đã chọn {{count}}, {{size}}", {
                        count: selectedTrashIds.length,
                        size: formatBytes(selectedTrashSizeBytes),
                      })}
                    </span>
                  </div>
                  <div className="codex-session-restore-actions">
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={toggleAllTrashedSessions}
                      disabled={trashBusy}
                    >
                      {allTrashSelected
                        ? t('codex.sessionManager.restoreModal.clearSelected', "Bỏ chọn")
                        : t('codex.sessionManager.restoreModal.selectAll', "Chọn tất cả")}
                    </button>
                    <button
                      className="btn btn-danger"
                      type="button"
                      onClick={() => void handleEmptySessionTrash()}
                      disabled={trashBusy || trashedSessions.length === 0}
                    >
                      <Trash2 size={14} className={purgingTrash && selectedTrashIds.length === 0 ? 'icon-spin' : undefined} />
                      {t('codex.sessionManager.restoreModal.emptyTrash', "Dọn thùng rác")}
                    </button>
                  </div>
                  <p className="codex-session-restore-modal__hint">
                    {t(
                      'codex.sessionManager.restoreModal.hint',
                      "Phiên trong Thùng rác có thể khôi phục về instance gốc hoặc xóa vĩnh viễn để giải phóng dung lượng đĩa.",
                    )}
                  </p>
                  <div className="codex-session-restore-list">
                    {trashedSessions.map((session) => (
                      <div className="codex-session-restore-row" key={session.sessionId}>
                        <div className="codex-session-restore-row__left">
                          <input
                            className="codex-session-row__checkbox"
                            type="checkbox"
                            checked={selectedTrashIdSet.has(session.sessionId)}
                            disabled={trashBusy}
                            onChange={() => toggleTrashedSession(session.sessionId)}
                          />
                          <div className="codex-session-restore-row__content">
                            <span className="codex-session-restore-row__title" title={session.title}>
                              {session.title || t('codex.sessionManager.untitled', "Phiên chưa đặt tên")}
                            </span>
                            <span className="codex-session-restore-row__meta">
                              {session.locations.map((location) => location.instanceName).join(' / ')}
                            </span>
                            <span className="codex-session-restore-row__meta">
                              {t('codex.sessionManager.restoreModal.itemSize', "Dung lượng {{size}}", {
                                size: formatBytes(session.sizeBytes ?? 0),
                              })}
                            </span>
                            <span className="codex-session-restore-row__meta codex-session-restore-row__cwd">
                              {session.cwd}
                            </span>
                          </div>
                        </div>
                        <div className="codex-session-restore-row__side">
                          <span className="codex-session-row__time">
                            {formatRelativeTime(session.deletedAt, isZh)}
                          </span>
                          <button
                            className="btn btn-danger codex-session-restore-row__delete"
                            type="button"
                            onClick={() => void handleDeleteTrashedSessions([session.sessionId])}
                            disabled={trashBusy}
                          >
                            <Trash2 size={13} />
                            {t('codex.sessionManager.restoreModal.deleteOne', "Xóa vĩnh viễn")}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleCloseRestoreModal}
                disabled={restoring || purgingTrash}
              >
                {t('common.cancel', "Hủy")}
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => void handleDeleteTrashedSessions(selectedTrashIds)}
                disabled={trashBusy || selectedTrashIds.length === 0}
              >
                <Trash2 size={14} className={purgingTrash && selectedTrashIds.length > 0 ? 'icon-spin' : undefined} />
                {t('codex.sessionManager.restoreModal.deleteSelected', "Xóa đã chọn")} ({selectedTrashIds.length})
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void handleRestoreFromTrash()}
                disabled={trashBusy || selectedTrashIds.length === 0}
              >
                <RotateCcw size={14} className={restoring ? 'icon-spin' : undefined} />
                {t('codex.sessionManager.restoreModal.restoreAction', "Khôi phục các phiên đã chọn")} ({selectedTrashIds.length})
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {sessionLocationTarget ? (
        <div className="modal-overlay">
          <div
            className="modal codex-session-location-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t('codex.sessionManager.locationPicker.title', "Chọn instance")}</h2>
              <button
                className="modal-close"
                type="button"
                onClick={handleCloseSessionLocationPicker}
                disabled={openingSessionLocation}
                aria-label={t('common.close', "Đóng")}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage
                message={sessionLocationError}
                scrollKey={sessionLocationErrorScrollKey}
              />
              <p className="codex-session-location-modal__hint">
                {sessionLocationTarget.action === 'rollout'
                  ? t(
                      'codex.sessionManager.locationPicker.rolloutHint',
                      "Phiên này tồn tại trên nhiều instance. Chọn instance để mở tệp phiên:",
                    )
                  : t(
                      'codex.sessionManager.locationPicker.hint',
                      "Phiên này tồn tại trên nhiều instance. Chọn instance để mở vị trí tệp:",
                    )}
              </p>
              <div className="codex-session-location-modal__list">
                {sessionLocationTarget.session.locations.map((location) => (
                  <button
                    key={location.instanceId}
                    className="codex-session-location-modal__option"
                    type="button"
                    onClick={() =>
                      void openSessionAtInstance(
                        sessionLocationTarget.session,
                        sessionLocationTarget.action,
                        location.instanceId,
                        true,
                      )
                    }
                    disabled={openingSessionLocation}
                  >
                    <span className="codex-session-location-modal__option-name">
                      {location.instanceName}
                    </span>
                    {location.running ? (
                      <span className="codex-session-location-modal__option-badge">
                        {t('codex.sessionManager.locationPicker.running', "Đang chạy")}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={handleCloseSessionLocationPicker}
                disabled={openingSessionLocation}
              >
                {t('common.cancel', "Hủy")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
