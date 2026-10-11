import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bug,
  Check,
  CircleAlert,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  FolderPlus,
  Gauge,
  KeyRound,
  Power,
  RefreshCw,
  Search,
  Send,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { confirm as confirmDialog } from "@tauri-apps/plugin-dialog";
import { useTranslation } from "react-i18next";
import type { CodexAccount } from "../types/codex";
import {
  isGrokApiKeyAccount,
  type GrokAccount,
} from "../types/grok";
import { listGrokAccounts } from "../services/grokService";
import type { CodexAccountGroup } from "../services/codexAccountGroupService";
import type {
  CodexLocalAccessAddressKind,
  CodexLocalAccessChatMessage,
  CodexLocalAccessChatStreamEvent,
  CodexLocalAccessCustomRoutingRule,
  CodexLocalAccessImageGenerationPolicy,
  CodexLocalAccessRoutingStrategy,
  CodexLocalAccessScope,
  CodexLocalAccessState,
  CodexLocalAccessStatsWindow,
  CodexLocalAccessUsageStats,
} from "../types/codexLocalAccess";
import { getCodexPlanFilterKey, isCodexApiKeyAccount } from "../types/codex";
import { scrollElementTo } from "../utils/reducedMotion";
import {
  buildCodexAccountPresentation,
  buildQuotaPreviewLines,
} from "../presentation/platformAccountPresentation";
import {
  buildValidAccountsFilterOption,
  splitValidityFilterValues,
} from "../utils/accountValidityFilter";
import {
  buildCodexPlanFilterOptions,
  createCodexPlanFilterCounts,
  incrementCodexPlanFilterCount,
} from "../utils/codexAccountOverview";
import {
  formatCodexQuotaPoolPercent,
  formatCodexQuotaPoolWindowLabel,
  summarizeCodexQuotaPool,
} from "../utils/codexQuotaPool";
import {
  getCodexLocalAccessAccountIneligibleReason,
  isCodexLocalAccessEligibleAccount,
  resolveCodexLocalAccessInitialAccountIds,
} from "../utils/codexLocalAccessAccounts";
import { isBlockingCodexAccountQuotaError } from "../utils/codexQuotaError";
import { CODEX_LOCAL_ACCESS_STATUS_KEYS, resolveCodexLocalAccessRuntimeStatus } from "../utils/codexLocalAccessStatus";
import { AccountTagFilterDropdown } from "./AccountTagFilterDropdown";
import { CodexAccountPoolHealthModal } from "./CodexAccountPoolHealthModal";
import {
  MultiSelectFilterDropdown,
  type MultiSelectFilterOption,
} from "./MultiSelectFilterDropdown";
import { SingleSelectDropdown } from "./SingleSelectDropdown";
import { CodexImageModelSelect } from "./CodexImageModelConfig";
import { CodexRequestPayloadSetting } from "./codex/CodexRequestPayloadSetting";
import { CodexImageForwardConfig } from "./CodexImageForwardConfig";
import { buildGrokMemberRowAccounts, CodexGrokBuildQuotaChip, selectCodexLocalAccessMemberRows } from "./codex/codexGrokMemberRows";
import { PaginationControls } from "./PaginationControls";
import { CodexStatsRangePicker } from "./CodexStatsRangePicker";
import { queryCodexLocalAccessStats } from "../services/codexLocalAccessService";
import {
  type CodexStatsRangeKey,
  type CodexStatsTimeRange,
} from "../utils/codexStatsRange";
import {
  persistCodexStatsRangeSelection,
  readCodexStatsRangeSelection,
} from "../utils/codexStatsRangePreference";
import { useEscClose } from "../hooks/useEscClose";
import {
  buildPaginationPageSizeStorageKey,
  usePagination,
} from "../hooks/usePagination";
import {
  CUSTOM_ROUTING_PRIORITY_MIN,
  CUSTOM_ROUTING_PRIORITY_MAX,
  CUSTOM_ROUTING_WEIGHT_MIN,
  CUSTOM_ROUTING_WEIGHT_MAX,
  areSetsEqual,
  buildLocalAccessSummaryStats,
  buildLocalAccessRoutingStrategyOptions,
  createTestChatMessage,
  formatCompactNumber,
  formatLatencyMs,
  formatQuotaPoolLabel,
  formatRequestResultDetail as formatLocalAccessRequestResultDetail,
  normalizeAccessScope,
  normalizeCustomRoutingPriority,
  normalizeCustomRoutingWeight,
  resolveAccountUsagePriority,
  summarizeAccountPoolHealth,
  summarizeQuotaPoolsByPlan,
  type AccountUsagePriority,
  type CustomRoutingDraftRule,
  type TestChatMessage,
} from "./codex/codexLocalAccessModalModel";
import "./GroupAccountPickerModal.css";
import "./CodexLocalAccessModal.css";

const LOCAL_ACCESS_MEMBER_PAGE_SIZE_OPTIONS = [50, 100, 200] as const;

export interface CodexLocalAccessMemberViewConfig {
  accounts: CodexAccount[];
  searchQuery: string;
  filterTypes: string[];
  tagFilter: string[];
  groupFilter: string[];
  tierFilterOptions: MultiSelectFilterOption[];
  tierFilterAllLabel: string;
  availableTags: string[];
  groupFilterOptions: MultiSelectFilterOption[];
  onSearchQueryChange: (value: string) => void;
  onToggleFilterType: (value: string) => void;
  onClearFilterTypes: () => void;
  onToggleTagFilter: (value: string) => void;
  onClearTagFilter: () => void;
  onToggleGroupFilter: (value: string) => void;
  onClearGroupFilter: () => void;
}

interface CodexLocalAccessModalProps {
  isOpen: boolean;
  mode: "panel" | "members";
  state: CodexLocalAccessState | null;
  addressKind: CodexLocalAccessAddressKind;
  addressOptions: Array<{ value: string; label: string }>;
  onAddressKindChange: (value: string) => void;
  accounts: CodexAccount[];
  accountsLoaded: boolean;
  accountGroups: CodexAccountGroup[];
  /**
   * 把 Grok 平台（已登录）账号加入 API 服务集合。
   *
   * 宿主负责创建/复用绑定的供应商账号并刷新账号列表，返回对应的 Codex 账号 ID；
   * 未提供该回调时成员弹框不展示 Grok 平台分组。
   */
  onAddGrokMember?: (grokAccountId: string) => Promise<CodexAccount | null>;
  memberView?: CodexLocalAccessMemberViewConfig;
  initialSelectedIds: string[];
  maskAccountText: (value?: string | null) => string;
  onClose: () => void;
  onOpenFullPage?: () => void;
  onSaveAccounts: (payload: {
    accountIds: string[];
    restrictFreeAccounts: boolean;
    backupAccountIds: string[];
    preferredAccountIds: string[];
    sessionAffinity: boolean;
    sessionAffinityTtlMs: number;
    imageGenerationAccountPolicies: Record<string, CodexLocalAccessImageGenerationPolicy>;
  }) => Promise<unknown> | unknown;
  onClearStats: () => Promise<unknown> | unknown;
  onRefreshStats: () => Promise<unknown> | unknown;
  onUpdatePort: (port: number) => Promise<unknown> | unknown;
  onUpdateRoutingStrategy: (
    strategy: CodexLocalAccessRoutingStrategy,
  ) => Promise<unknown> | unknown;
  onUpdateCustomRouting: (
    rules: CodexLocalAccessCustomRoutingRule[],
  ) => Promise<unknown> | unknown;
  onUpdateAccessScope: (
    accessScope: CodexLocalAccessScope,
  ) => Promise<unknown> | unknown;
  onUpdateUpstreamProxyConfig: (
    upstreamProxyUrl: string | null,
  ) => Promise<unknown> | unknown;
  onUpdateDebugLogs: (debugLogs: boolean) => Promise<unknown> | unknown;
  onUpdateImageGenerationModel: (model: string) => Promise<unknown> | unknown;
  onUpdateImageGenerationMainModel: (model: string | null) => Promise<unknown> | unknown;
  /** 保存 API 服务的生图转发账号池（生图请求交给这些 OAuth 账号）。 */
  onUpdateImageGenerationAccounts: (
    accountIds: string[],
  ) => Promise<unknown> | unknown;
  onRotateApiKey: () => Promise<unknown> | unknown;
  onRestartSidecar: () => Promise<unknown> | unknown;
  onKillPort: () => Promise<unknown> | unknown;
  onToggleEnabled: () => Promise<unknown> | unknown;
  onRecoverAccounts: (accountIds: string[]) => Promise<void>;
  healthActionBusy: boolean;
  onStreamTestMessage: (payload: {
    sessionId: string;
    modelId: string;
    messages: CodexLocalAccessChatMessage[];
  }) => Promise<void> | void;
  saving: boolean;
  testing: boolean;
  starting: boolean;
  portCleanupBusy: boolean;
  sidecarRestarting: boolean;
}

type CopyableField = "apiPortUrl" | "baseUrl" | "apiKey" | "modelId";

const CODEX_LOCAL_ACCESS_STATS_RANGE_STORAGE_KEY =
  "agtools.codex.local_access.stats_range.v1";
export function CodexLocalAccessModal({
  isOpen,
  mode,
  state,
  addressKind,
  addressOptions,
  onAddressKindChange,
  accounts,
  accountsLoaded,
  accountGroups,
  onAddGrokMember,
  memberView,
  initialSelectedIds,
  maskAccountText,
  onClose,
  onOpenFullPage,
  onSaveAccounts,
  onClearStats,
  onRefreshStats,
  onUpdatePort,
  onUpdateRoutingStrategy,
  onUpdateCustomRouting,
  onUpdateAccessScope,
  onUpdateUpstreamProxyConfig,
  onUpdateDebugLogs,
  onUpdateImageGenerationModel,
  onUpdateImageGenerationMainModel,
  onUpdateImageGenerationAccounts,
  onRotateApiKey,
  onRestartSidecar,
  onKillPort,
  onToggleEnabled,
  onRecoverAccounts,
  healthActionBusy,
  onStreamTestMessage,
  saving,
  testing,
  starting,
  portCleanupBusy,
  sidecarRestarting,
}: CodexLocalAccessModalProps) {
  const { t } = useTranslation();
  const localAccessStatus = resolveCodexLocalAccessRuntimeStatus(state?.collection, state);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [restrictFreeAccounts, setRestrictFreeAccounts] = useState(true);
  const [sessionAffinity, setSessionAffinity] = useState(true);
  const [sessionAffinityTtlSeconds, setSessionAffinityTtlSeconds] =
    useState("3600");
  const [sessionAffinityTtlError, setSessionAffinityTtlError] = useState("");
  const [imageGenerationPolicies, setImageGenerationPolicies] = useState<Record<string, CodexLocalAccessImageGenerationPolicy>>({});
  const [membersDraftDirty, setMembersDraftDirty] = useState(false);
  // 跨平台成员：Grok 平台已登录账号（默认与 Codex 一起展示）。
  const [grokMemberAccounts, setGrokMemberAccounts] = useState<GrokAccount[]>([]);
  const [grokMemberLoading, setGrokMemberLoading] = useState(false);
  const [grokMemberError, setGrokMemberError] = useState("");
  const [grokMemberBusyId, setGrokMemberBusyId] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [error, setError] = useState("");
  const errorAreaRef = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState("");
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [testDialogRunning, setTestDialogRunning] = useState(false);
  const [testChatMessages, setTestChatMessages] = useState<TestChatMessage[]>(
    [],
  );
  const [testChatInput, setTestChatInput] = useState("");
  const [testDialogError, setTestDialogError] = useState("");
  const [portInput, setPortInput] = useState("");
  const [upstreamProxyDraftUrl, setUpstreamProxyDraftUrl] = useState("");
  const [keyVisible, setKeyVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<CopyableField | null>(null);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [statsSelection, setStatsSelection] = useState(() =>
    readCodexStatsRangeSelection(CODEX_LOCAL_ACCESS_STATS_RANGE_STORAGE_KEY),
  );
  const { key: statsRange, range: statsTimeRange } = statsSelection;
  const [filteredStatsWindow, setFilteredStatsWindow] =
    useState<CodexLocalAccessStatsWindow | null>(null);
  const [statsRangeError, setStatsRangeError] = useState("");
  const statsRequestSeqRef = useRef(0);
  const [customRoutingOpen, setCustomRoutingOpen] = useState(false);
  const [customRoutingQuery, setCustomRoutingQuery] = useState("");
  const [customRoutingFilterTypes, setCustomRoutingFilterTypes] = useState<
    string[]
  >([]);
  const [customRoutingTagFilter, setCustomRoutingTagFilter] = useState<
    string[]
  >([]);
  const [customRoutingError, setCustomRoutingError] = useState("");
  const [customRoutingSelected, setCustomRoutingSelected] = useState<
    Set<string>
  >(new Set());
  const [customRoutingDraft, setCustomRoutingDraft] = useState<
    Record<string, CustomRoutingDraftRule>
  >({});
  useEscClose(isOpen, onClose);
  const [customRoutingBulkPriority, setCustomRoutingBulkPriority] =
    useState("10");
  const [customRoutingBulkWeight, setCustomRoutingBulkWeight] = useState("1");
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
  const customRoutingSelectAllRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const sessionAffinityTtlInputRef = useRef<HTMLInputElement | null>(null);
  const testChatScrollRef = useRef<HTMLDivElement | null>(null);

  const collection = state?.collection ?? null;
  const apiPortUrl = state?.apiPortUrl ?? "";
  const baseUrl = state?.baseUrl ?? "";
  const displayBaseUrl =
    addressKind === "lan" && state?.lanBaseUrl ? state.lanBaseUrl : baseUrl;
  const modelIds = state?.modelIds ?? [];
  const stats = state?.stats;
  const quotaPoolLabels = useMemo(
    () => ({
      weekly: t("codex.localAccess.quotaPool.weeklyShort", "Tuần"),
      title: t("codex.localAccess.quotaPool.title", "Nhóm hạn mức"),
    }),
    [t],
  );
  const selectedStatsWindow =
    useMemo<CodexLocalAccessStatsWindow | null>(() => {
      if (filteredStatsWindow) return filteredStatsWindow;
      if (!stats || statsRange === "custom" || statsRange === "rolling7d") {
        return filteredStatsWindow;
      }
      return stats[statsRange];
    }, [filteredStatsWindow, stats, statsRange]);
  const selectedTotals = selectedStatsWindow?.totals;
  const routingStrategy = collection?.routingStrategy ?? "auto";
  const accessScope = collection?.accessScope ?? "localhost";
  const upstreamProxyUrl = collection?.upstreamProxyUrl ?? "";
  const accessScopeAddress = accessScope === "lan" ? "0.0.0.0" : "127.0.0.1";
  const accessScopeBadge =
    accessScope === "lan"
      ? t("codex.localAccess.accessScopeLanShort", "Cục bộ+mạng")
      : t("codex.localAccess.accessScopeLocalhostShort", "Chỉ cục bộ");
  const modelIdOptions = useMemo(
    () => modelIds.map((modelId) => ({ value: modelId, label: modelId })),
    [modelIds],
  );
  const avgLatencyMs =
    selectedTotals && selectedTotals.successCount > 0
      ? selectedTotals.totalLatencyMs / selectedTotals.successCount
      : 0;
  const successRate =
    selectedTotals && selectedTotals.requestCount > 0
      ? Math.round(
          (selectedTotals.successCount / selectedTotals.requestCount) * 100,
        )
      : 0;
  const formatRequestResultDetail = (usage?: CodexLocalAccessUsageStats | null) =>
    formatLocalAccessRequestResultDetail(t, usage);
  const testDialogBusy = testDialogRunning || testing;
  const actionBusy = saving || testing || starting || portCleanupBusy;
  useEffect(() => {
    if (!error && (!state?.lastError || actionBusy)) return;
    errorAreaRef.current?.scrollIntoView({ block: "nearest" });
    errorAreaRef.current?.focus({ preventScroll: true });
  }, [error, state?.lastError, actionBusy]);

  const membersInteractionDisabled =
    actionBusy || !accountsLoaded || Boolean(grokMemberBusyId);
  const summaryStats = useMemo(
    () => buildLocalAccessSummaryStats(t, selectedTotals, avgLatencyMs, successRate),
    [avgLatencyMs, selectedTotals, successRate, t],
  );

  const localAccessAccounts = useMemo(() => accounts, [accounts]);
  const quotaPoolSummary = useMemo(
    () => summarizeCodexQuotaPool(localAccessAccounts),
    [localAccessAccounts],
  );
  const currentQuotaPoolSummary = useMemo(() => {
    const accountIds = new Set(collection?.accountIds ?? []);
    return summarizeCodexQuotaPool(
      localAccessAccounts.filter((account) => accountIds.has(account.id)),
    );
  }, [collection?.accountIds, localAccessAccounts]);
  const accountPoolHealthSummary = useMemo(
    () => summarizeAccountPoolHealth(localAccessAccounts, collection?.accountIds ?? [], state),
    [
      collection?.accountIds,
      localAccessAccounts,
      state?.accountHealth,
      state?.accountPoolHealth,
      state?.recoverySuppressedAccountIds,
    ],
  );
  const initialRestrictFreeAccounts = collection?.restrictFreeAccounts ?? true;
  const initialSessionAffinity = collection?.sessionAffinity ?? true;
  const initialSessionAffinityTtlSeconds = Math.round(
    (collection?.sessionAffinityTtlMs ?? 60 * 60 * 1000) / 1000,
  );
  const normalizedInitialSelectedIds = useMemo(
    () =>
      resolveCodexLocalAccessInitialAccountIds(
        initialSelectedIds,
        localAccessAccounts,
        initialRestrictFreeAccounts,
        accountsLoaded,
      ),
    [
      accountsLoaded,
      initialSelectedIds,
      initialRestrictFreeAccounts,
      localAccessAccounts,
    ],
  );

  useEffect(() => {
    if (!isOpen || mode !== "members") {
      setMembersDraftDirty(false);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    const shouldResetMembersDraft = mode !== "members" || !membersDraftDirty;
    if (shouldResetMembersDraft) {
      setQuery("");
      setSelected(new Set(normalizedInitialSelectedIds));
      setFilterTypes([]);
      setTagFilter([]);
      setGroupFilter([]);
      setRestrictFreeAccounts(initialRestrictFreeAccounts);
      setSessionAffinity(initialSessionAffinity);
      setSessionAffinityTtlSeconds(String(initialSessionAffinityTtlSeconds));
      setImageGenerationPolicies(collection?.imageGenerationAccountPolicies ?? {});
    }
    setSessionAffinityTtlError("");
    setError("");
    setNotice("");
    setTestDialogOpen(false);
    setTestDialogRunning(false);
    setTestChatMessages([]);
    setTestChatInput("");
    setTestDialogError("");
    setKeyVisible(false);
    setCopiedField(null);
    setPortInput(collection?.port ? String(collection.port) : "");
    setUpstreamProxyDraftUrl(collection?.upstreamProxyUrl ?? "");
    setCustomRoutingOpen(false);
    setCustomRoutingQuery("");
    setCustomRoutingFilterTypes([]);
    setCustomRoutingTagFilter([]);
    setCustomRoutingError("");
    setCustomRoutingSelected(new Set());
    if (shouldResetMembersDraft) {
      setCustomRoutingDraft(() => {
        const ruleMap = new Map(
          (collection?.customRoutingRules ?? []).map((rule) => [
            rule.accountId,
            {
              priority: normalizeCustomRoutingPriority(rule.priority),
              weight: normalizeCustomRoutingWeight(rule.weight),
              isBackup: Boolean(rule.isBackup),
              isPreferred: Boolean(rule.isPreferred),
            },
          ]),
        );
        const next: Record<string, CustomRoutingDraftRule> = {};
        (collection?.accountIds ?? []).forEach((accountId) => {
          next[accountId] = ruleMap.get(accountId) ?? {
            priority: CUSTOM_ROUTING_PRIORITY_MIN,
            weight: CUSTOM_ROUTING_WEIGHT_MIN,
            isBackup: false,
            isPreferred: false,
          };
        });
        return next;
      });
    }
    setCustomRoutingBulkPriority("10");
    setCustomRoutingBulkWeight("1");
    if (mode === "members") {
      window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [
    collection?.accountIds,
    collection?.apiKeys,
    collection?.customRoutingRules,
    collection?.port,
    collection?.upstreamProxyUrl,
    initialRestrictFreeAccounts,
    initialSessionAffinity,
    initialSessionAffinityTtlSeconds,
    isOpen,
    membersDraftDirty,
    mode,
    normalizedInitialSelectedIds,
  ]);

  useEffect(() => {
    if (modelIds.length === 0) {
      setSelectedModelId("");
      return;
    }
    setSelectedModelId((current) =>
      modelIds.includes(current) ? current : modelIds[0],
    );
  }, [modelIds]);

  useEffect(() => {
    if (isOpen) {
      setStatsSelection(readCodexStatsRangeSelection(CODEX_LOCAL_ACCESS_STATS_RANGE_STORAGE_KEY));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const requestSeq = ++statsRequestSeqRef.current;
    setStatsRangeError("");
    void queryCodexLocalAccessStats(statsTimeRange.startAt, statsTimeRange.endAt)
      .then((window) => {
        if (requestSeq === statsRequestSeqRef.current) setFilteredStatsWindow(window);
      })
      .catch((err) => {
        if (requestSeq === statsRequestSeqRef.current) {
          setStatsRangeError(String(err).replace(/^Error:\s*/, ""));
        }
      });
  }, [isOpen, stats?.updatedAt, statsTimeRange.endAt, statsTimeRange.startAt]);

  const handleStatsPresetChange = (
    key: Exclude<CodexStatsRangeKey, "custom">,
    range: CodexStatsTimeRange,
  ) => {
    const selection = { key, range };
    setStatsSelection(selection);
    persistCodexStatsRangeSelection(CODEX_LOCAL_ACCESS_STATS_RANGE_STORAGE_KEY, selection);
  };

  const handleCustomStatsRangeApply = (range: CodexStatsTimeRange) => {
    const selection = { key: "custom" as const, range };
    setStatsSelection(selection);
    persistCodexStatsRangeSelection(CODEX_LOCAL_ACCESS_STATS_RANGE_STORAGE_KEY, selection);
  };

  useEffect(() => {
    if (!testDialogOpen) return;
    const node = testChatScrollRef.current;
    scrollElementTo(node, { top: node?.scrollHeight ?? 0 });
  }, [testChatMessages, testDialogOpen]);

  const normalizeTag = (value: string) => value.trim().toLowerCase();

  const availableTags = useMemo(() => {
    const next = new Set<string>();
    localAccessAccounts.forEach((account) => {
      (account.tags || []).forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed) next.add(trimmed);
      });
    });
    return Array.from(next).sort((left, right) => left.localeCompare(right));
  }, [localAccessAccounts]);

  const groupIdsByAccountId = useMemo(() => {
    const next = new Map<string, Set<string>>();
    accountGroups.forEach((group) => {
      group.accountIds.forEach((accountId) => {
        const current = next.get(accountId) ?? new Set<string>();
        current.add(group.id);
        next.set(accountId, current);
      });
    });
    return next;
  }, [accountGroups]);

  const groupNameByAccountId = useMemo(() => {
    const next = new Map<string, string[]>();
    accountGroups.forEach((group) => {
      group.accountIds.forEach((accountId) => {
        const current = next.get(accountId) ?? [];
        current.push(group.name);
        next.set(accountId, current);
      });
    });
    return next;
  }, [accountGroups]);

  const groupFilterOptions = useMemo<MultiSelectFilterOption[]>(
    () =>
      accountGroups
        .map((group) => ({
          value: group.id,
          label: `${group.name} (${group.accountIds.length})`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [accountGroups],
  );

  const tierCounts = useMemo(() => {
    const counts = createCodexPlanFilterCounts(localAccessAccounts.length);
    localAccessAccounts.forEach((account) => {
      if (!isBlockingCodexAccountQuotaError(account)) {
        counts.VALID += 1;
      }
      const tier = getCodexPlanFilterKey(account);
      incrementCodexPlanFilterCount(counts, tier);
      if (isBlockingCodexAccountQuotaError(account)) {
        counts.ERROR += 1;
      }
    });
    return counts;
  }, [localAccessAccounts]);

  const quotaPoolByPlan = useMemo(
    () => summarizeQuotaPoolsByPlan(localAccessAccounts),
    [localAccessAccounts],
  );

  const allTierFilterLabel = useMemo(
    () =>
      formatQuotaPoolLabel(
        t("common.shared.filter.all", { count: tierCounts.all }),
        quotaPoolSummary.all,
        quotaPoolLabels.weekly,
      ),
    [
      quotaPoolLabels.weekly,
      quotaPoolSummary.all,
      t,
      tierCounts.all,
    ],
  );

  const tierFilterOptions = useMemo<MultiSelectFilterOption[]>(
    () =>
      buildCodexPlanFilterOptions(tierCounts, {
        includeValid: true,
        pendingLabel: t("codex.pendingAuth.badge", "Chờ xác thực"),
        validOption: buildValidAccountsFilterOption(t, tierCounts.VALID),
      }).map((option) => {
        const pool = quotaPoolByPlan[option.value];
        if (!pool) return option;
        return {
          ...option,
          label: formatQuotaPoolLabel(
            option.label,
            pool,
            quotaPoolLabels.weekly,
          ),
        };
      }),
    [
      quotaPoolLabels.weekly,
      quotaPoolByPlan,
      t,
      tierCounts,
    ],
  );

  const memberSearchQuery = memberView?.searchQuery ?? query;
  const memberFilterTypes = memberView?.filterTypes ?? filterTypes;
  const memberTagFilter = memberView?.tagFilter ?? tagFilter;
  const memberGroupFilter = memberView?.groupFilter ?? groupFilter;
  const memberTierFilterOptions =
    memberView?.tierFilterOptions ?? tierFilterOptions;
  const memberTierFilterAllLabel =
    memberView?.tierFilterAllLabel ?? allTierFilterLabel;
  const memberAvailableTags = memberView?.availableTags ?? availableTags;
  const memberGroupFilterOptions =
    memberView?.groupFilterOptions ?? groupFilterOptions;

  // 平台筛选：默认全部平台（Codex + Grok），后续可继续追加平台。
  const platformFilterActive =
    platformFilter.length > 0 && platformFilter.length < 2;
  const showCodexPlatform =
    !platformFilterActive || platformFilter.includes("codex");
  const showGrokPlatform =
    !platformFilterActive || platformFilter.includes("grok");

  // Grok 平台账号：仅 OAuth(订阅) 账号可作为 API 服务上游，API Key 账号不在此处展示。
  const grokMemberCandidates = useMemo(
    () => grokMemberAccounts.filter((account) => !isGrokApiKeyAccount(account)),
    [grokMemberAccounts],
  );
  // grok account id -> 绑定它的 Codex 供应商账号 ID（已加入集合时用于勾选反查）。
  const grokMemberBindingByAccountId = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((account) => {
      const grokAccountId = account.upstream_grok_account_id?.trim();
      if (grokAccountId && !map.has(grokAccountId)) {
        map.set(grokAccountId, account.id);
      }
    });
    return map;
  }, [accounts]);

  /**
   * Grok 平台账号在成员列表里的行数据（与 Codex 账号同一列表、同一套交互）。
   *
   * 行 ID 使用 `grok:` 前缀与真实 Codex 账号区分；勾选后由宿主创建绑定的
   * 供应商账号，选中的始终是真实账号 ID。
   */
  const grokMemberRowAccounts = useMemo(() => {
    if (mode !== "members" || !onAddGrokMember || !showGrokPlatform) {
      return [] as CodexAccount[];
    }
    const { requireValidAccounts, selectedTypes } =
      splitValidityFilterValues(memberFilterTypes);
    return buildGrokMemberRowAccounts({
      accounts: grokMemberCandidates,
      searchQuery: memberSearchQuery,
      tagFilterActive: memberTagFilter.length > 0,
      groupFilterActive: memberGroupFilter.length > 0,
      requireValidAccounts,
      selectedTypes,
    });
  }, [
    grokMemberCandidates,
    memberFilterTypes,
    memberGroupFilter,
    memberSearchQuery,
    memberTagFilter,
    mode,
    onAddGrokMember,
    showGrokPlatform,
  ]);

  /** 行 ID -> Grok 平台账号（成员列表里 Grok 行与 Codex 行共用同一张表）。 */
  const grokMemberRowAccountById = useMemo(() => {
    const map = new Map<string, GrokAccount>();
    grokMemberRowAccounts.forEach((row) => {
      const grokAccountId = row.upstream_grok_account_id?.trim();
      if (!grokAccountId) {
        return;
      }
      const source = grokMemberCandidates.find(
        (candidate) => candidate.id === grokAccountId,
      );
      if (source) {
        map.set(row.id, source);
      }
    });
    return map;
  }, [grokMemberCandidates, grokMemberRowAccounts]);

  const visibleAccounts = useMemo(() => {
    if (memberView) {
      return memberView.accounts;
    }

    const queryText = query.trim().toLowerCase();
    const sorted = [...localAccessAccounts].sort((a, b) => {
      const aName = buildCodexAccountPresentation(
        a,
        t,
      ).displayName.toLowerCase();
      const bName = buildCodexAccountPresentation(
        b,
        t,
      ).displayName.toLowerCase();
      return aName.localeCompare(bName);
    });
    const selectedTags = new Set(tagFilter.map(normalizeTag));
    const selectedGroups = new Set(groupFilter);
    const { requireValidAccounts, selectedTypes } =
      splitValidityFilterValues(filterTypes);

    return sorted.filter((account) => {
      const presentation = buildCodexAccountPresentation(account, t);
      const displayName = presentation.displayName.toLowerCase();
      const groupNames = (groupNameByAccountId.get(account.id) ?? [])
        .join(" ")
        .toLowerCase();
      const matchesQuery =
        !queryText ||
        displayName.includes(queryText) ||
        groupNames.includes(queryText);
      if (!matchesQuery) return false;

      if (selectedTags.size > 0) {
        const accountTags = (account.tags || []).map(normalizeTag);
        if (!accountTags.some((tag) => selectedTags.has(tag))) {
          return false;
        }
      }

      if (selectedGroups.size > 0) {
        const accountGroupIds = groupIdsByAccountId.get(account.id);
        if (
          !accountGroupIds ||
          !Array.from(accountGroupIds).some((id) => selectedGroups.has(id))
        ) {
          return false;
        }
      }

      if (
        requireValidAccounts &&
        isBlockingCodexAccountQuotaError(account)
      ) {
        return false;
      }

      if (selectedTypes.size > 0) {
        const planKey = getCodexPlanFilterKey(account);
        const matchesType = Array.from(selectedTypes).some((type) => {
          if (type === "ERROR") {
            return isBlockingCodexAccountQuotaError(account);
          }
          return type === planKey;
        });
        if (!matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [
    filterTypes,
    groupFilter,
    groupIdsByAccountId,
    groupNameByAccountId,
    localAccessAccounts,
    memberView,
    query,
    t,
    tagFilter,
  ]);

  const visibleSelectableAccounts = selectCodexLocalAccessMemberRows({
    codexAccounts: visibleAccounts,
    grokRows: grokMemberRowAccounts,
    grokAccounts: grokMemberCandidates,
    manageGrok: Boolean(onAddGrokMember),
    showCodexPlatform,
    showGrokPlatform,
    restrictFreeAccounts,
    selected,
  });
  const memberPagination = usePagination({
    items: visibleSelectableAccounts,
    storageKey: buildPaginationPageSizeStorageKey("CodexLocalAccessMembers"),
    pageSizeOptions: LOCAL_ACCESS_MEMBER_PAGE_SIZE_OPTIONS,
    defaultPageSize: 50,
  });
  const paginatedVisibleSelectableAccounts = memberPagination.pageItems;

  useEffect(() => {
    memberPagination.setCurrentPage(1);
  }, [
    memberFilterTypes,
    memberGroupFilter,
    memberPagination.setCurrentPage,
    memberSearchQuery,
    restrictFreeAccounts,
    memberTagFilter,
  ]);

  const visibleEnabledAccounts = useMemo(
    () =>
      visibleSelectableAccounts.filter((account) =>
        isCodexLocalAccessEligibleAccount(account, restrictFreeAccounts),
      ),
    [restrictFreeAccounts, visibleSelectableAccounts],
  );

  /** 行是否已被选中：Grok 行按绑定的供应商账号 ID 判断。 */
  const isMemberRowSelected = useCallback(
    (account: CodexAccount) => {
      const grokRowAccount = grokMemberRowAccountById.get(account.id);
      if (!grokRowAccount) {
        return selected.has(account.id);
      }
      const boundAccountId = grokMemberBindingByAccountId.get(grokRowAccount.id);
      return Boolean(boundAccountId && selected.has(boundAccountId));
    },
    [grokMemberBindingByAccountId, grokMemberRowAccountById, selected],
  );

  const selectedVisibleCount = useMemo(
    () =>
      visibleEnabledAccounts.reduce(
        (count, account) => count + (isMemberRowSelected(account) ? 1 : 0),
        0,
      ),
    [isMemberRowSelected, visibleEnabledAccounts],
  );

  const allVisibleSelected =
    visibleEnabledAccounts.length > 0 &&
    selectedVisibleCount === visibleEnabledAccounts.length;

  useEffect(() => {
    if (!selectAllCheckboxRef.current) return;
    selectAllCheckboxRef.current.indeterminate =
      selectedVisibleCount > 0 && !allVisibleSelected;
  }, [allVisibleSelected, selectedVisibleCount]);

  const initialBackupAccountIds = useMemo(() => {
    const selectedSet = new Set(normalizedInitialSelectedIds);
    return new Set(
      (collection?.customRoutingRules ?? [])
        .filter(
          (rule) => rule.isBackup && selectedSet.has(rule.accountId),
        )
        .map((rule) => rule.accountId),
    );
  }, [collection?.customRoutingRules, normalizedInitialSelectedIds]);

  const initialPreferredAccountIds = useMemo(() => {
    const selectedSet = new Set(normalizedInitialSelectedIds);
    return new Set(
      (collection?.customRoutingRules ?? [])
        .filter(
          (rule) => rule.isPreferred && selectedSet.has(rule.accountId),
        )
        .map((rule) => rule.accountId),
    );
  }, [collection?.customRoutingRules, normalizedInitialSelectedIds]);

  const currentBackupAccountIds = useMemo(() => {
    const ruleBackupById = new Map(
      (collection?.customRoutingRules ?? []).map((rule) => [
        rule.accountId,
        Boolean(rule.isBackup),
      ]),
    );
    const next = new Set<string>();
    selected.forEach((accountId) => {
      const isBackup =
        customRoutingDraft[accountId]?.isBackup ??
        ruleBackupById.get(accountId) ??
        false;
      if (isBackup) {
        next.add(accountId);
      }
    });
    return next;
  }, [collection?.customRoutingRules, customRoutingDraft, selected]);

  const currentPreferredAccountIds = useMemo(() => {
    const rulePreferredById = new Map(
      (collection?.customRoutingRules ?? []).map((rule) => [
        rule.accountId,
        Boolean(rule.isPreferred),
      ]),
    );
    const next = new Set<string>();
    selected.forEach((accountId) => {
      const isPreferred =
        customRoutingDraft[accountId]?.isPreferred ??
        rulePreferredById.get(accountId) ??
        false;
      if (isPreferred) {
        next.add(accountId);
      }
    });
    return next;
  }, [collection?.customRoutingRules, customRoutingDraft, selected]);

  const selectionDirty = useMemo(
    () =>
      !areSetsEqual(selected, new Set(normalizedInitialSelectedIds)) ||
      restrictFreeAccounts !== (collection?.restrictFreeAccounts ?? true) ||
      sessionAffinity !== initialSessionAffinity ||
      sessionAffinityTtlSeconds !== String(initialSessionAffinityTtlSeconds) ||
      !areSetsEqual(currentBackupAccountIds, initialBackupAccountIds) ||
      !areSetsEqual(currentPreferredAccountIds, initialPreferredAccountIds) ||
      JSON.stringify(imageGenerationPolicies) !==
        JSON.stringify(collection?.imageGenerationAccountPolicies ?? {}),
    [
      collection?.restrictFreeAccounts,
      currentBackupAccountIds,
      currentPreferredAccountIds,
      initialSessionAffinity,
      initialSessionAffinityTtlSeconds,
      initialBackupAccountIds,
      initialPreferredAccountIds,
      normalizedInitialSelectedIds,
      restrictFreeAccounts,
      sessionAffinity,
      sessionAffinityTtlSeconds,
      selected,
      imageGenerationPolicies,
    ],
  );

  const allStatsByAccountId = useMemo(() => {
    const next = new Map<
      string,
      NonNullable<CodexLocalAccessState["stats"]>["accounts"][number]
    >();
    stats?.accounts.forEach((item) => next.set(item.accountId, item));
    return next;
  }, [stats?.accounts]);

  const windowStatsByAccountId = useMemo(() => {
    const next = new Map<
      string,
      NonNullable<CodexLocalAccessState["stats"]>["accounts"][number]
    >();
    selectedStatsWindow?.accounts.forEach((item) =>
      next.set(item.accountId, item),
    );
    return next;
  }, [selectedStatsWindow?.accounts]);

  const currentMemberStats = useMemo(() => {
    const currentIds = collection?.accountIds ?? [];
    return currentIds
      .map((accountId) => {
        const account = localAccessAccounts.find(
          (item) => item.id === accountId,
        );
        if (!account) return null;
        const presentation = buildCodexAccountPresentation(account, t);
        const accountStats = windowStatsByAccountId.get(account.id);
        return {
          account,
          presentation,
          stats: accountStats?.usage ?? null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => {
        const rightCount = right.stats?.requestCount ?? 0;
        const leftCount = left.stats?.requestCount ?? 0;
        return rightCount - leftCount;
      });
  }, [collection?.accountIds, localAccessAccounts, t, windowStatsByAccountId]);

  const routingStrategyOptions = useMemo(
    () => buildLocalAccessRoutingStrategyOptions(t),
    [t],
  );
  const memberPriorityOptions = useMemo(
    () => [
      {
        value: "lowest",
        label: t("codex.localAccess.memberPriorityLowest", "Thấp nhất"),
      },
      {
        value: "normal",
        label: t("codex.localAccess.memberPriorityNormal", "Bình thường"),
      },
      {
        value: "highest",
        label: t("codex.localAccess.memberPriorityHighest", "Cao nhất"),
      },
    ],
    [t],
  );
  const imageGenerationPolicyOptions = useMemo(
    () => [
      { value: "inherit", label: t("codex.localAccess.imagePolicy.inherit", "Hình ảnh: Tự động") },
      { value: "enabled", label: t("codex.localAccess.imagePolicy.enabled", "Hình ảnh: Bật") },
      { value: "disabled", label: t("codex.localAccess.imagePolicy.disabled", "Hình ảnh: Tắt") },
    ],
    [t],
  );
  const accessScopeOptions = useMemo(
    () => [
      {
        value: "localhost",
        label: t("codex.localAccess.accessScopeLocalhost", "Chỉ cục bộ"),
      },
      {
        value: "lan",
        label: t("codex.localAccess.accessScopeLan", "Mạng nội bộ"),
      },
    ],
    [t],
  );
  const renderQuotaPreview = (
    presentation: ReturnType<typeof buildCodexAccountPresentation>,
    limit = 2,
  ) => {
    const quotaLines = buildQuotaPreviewLines(presentation.quotaItems, limit);
    if (quotaLines.length === 0) {
      return null;
    }

    return (
      <div className="codex-local-access-quota-line">
        {quotaLines.map((line) => (
          <span
            key={line.key}
            className={`codex-local-access-quota-chip ${line.quotaClass}`}
            title={line.title}
          >
            <span className="codex-local-access-quota-dot" />
            <span>{line.text}</span>
          </span>
        ))}
      </div>
    );
  };

  const localAccessAccountById = useMemo(
    () => new Map(localAccessAccounts.map((account) => [account.id, account])),
    [localAccessAccounts],
  );

  useEffect(() => {
    if (!isOpen || mode !== "members" || !onAddGrokMember) {
      return;
    }
    let cancelled = false;
    setGrokMemberLoading(true);
    setGrokMemberError("");
    void listGrokAccounts()
      .then((list) => {
        if (!cancelled) {
          setGrokMemberAccounts(list);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setGrokMemberError(String(loadError).replace(/^Error:\s*/, ""));
          setGrokMemberAccounts([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGrokMemberLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, onAddGrokMember]);

  const handleToggleGrokMember = async (
    grokAccount: GrokAccount,
    nextChecked: boolean,
  ) => {
    const boundAccountId = grokMemberBindingByAccountId.get(grokAccount.id);
    if (!nextChecked) {
      if (boundAccountId) {
        setSelected((previous) => {
          const next = new Set(previous);
          next.delete(boundAccountId);
          return next;
        });
      }
      setMembersDraftDirty(true);
      return;
    }
    if (boundAccountId) {
      setSelected((previous) => new Set(previous).add(boundAccountId));
      setMembersDraftDirty(true);
      return;
    }
    if (!onAddGrokMember) {
      return;
    }
    setGrokMemberBusyId(grokAccount.id);
    setGrokMemberError("");
    try {
      const bound = await onAddGrokMember(grokAccount.id);
      if (bound) {
        setSelected((previous) => new Set(previous).add(bound.id));
        setMembersDraftDirty(true);
      }
    } catch (addError) {
      setGrokMemberError(String(addError).replace(/^Error:\s*/, ""));
    } finally {
      setGrokMemberBusyId("");
    }
  };

  const customRoutingRuleByAccountId = useMemo(() => {
    const next = new Map<string, CustomRoutingDraftRule>();
    collection?.customRoutingRules?.forEach((rule) => {
      next.set(rule.accountId, {
        priority: normalizeCustomRoutingPriority(rule.priority),
        weight: normalizeCustomRoutingWeight(rule.weight),
        isBackup: Boolean(rule.isBackup),
        isPreferred: Boolean(rule.isPreferred),
      });
    });
    return next;
  }, [collection?.customRoutingRules]);

  const customRoutingAccounts = useMemo(() => {
    const currentIds = collection?.accountIds ?? [];
    return currentIds
      .map((accountId) => localAccessAccountById.get(accountId))
      .filter((account): account is CodexAccount => Boolean(account));
  }, [collection?.accountIds, localAccessAccountById]);

  const customRoutingAvailableTags = useMemo(() => {
    const next = new Set<string>();
    customRoutingAccounts.forEach((account) => {
      (account.tags || []).forEach((tag) => {
        const trimmed = tag.trim();
        if (trimmed) next.add(trimmed);
      });
    });
    return Array.from(next).sort((left, right) => left.localeCompare(right));
  }, [customRoutingAccounts]);

  const customRoutingQuotaPoolSummary = useMemo(
    () => summarizeCodexQuotaPool(customRoutingAccounts),
    [customRoutingAccounts],
  );

  const customRoutingTierCounts = useMemo(() => {
    const counts = createCodexPlanFilterCounts(customRoutingAccounts.length);
    customRoutingAccounts.forEach((account) => {
      if (!isBlockingCodexAccountQuotaError(account)) {
        counts.VALID += 1;
      }
      const tier = getCodexPlanFilterKey(account);
      incrementCodexPlanFilterCount(counts, tier);
      if (isBlockingCodexAccountQuotaError(account)) {
        counts.ERROR += 1;
      }
    });
    return counts;
  }, [customRoutingAccounts]);

  const customRoutingQuotaPoolByPlan = useMemo(() => {
    return summarizeQuotaPoolsByPlan(customRoutingAccounts);
  }, [customRoutingAccounts]);

  const customRoutingAllTierFilterLabel = useMemo(
    () =>
      formatQuotaPoolLabel(
        t("common.shared.filter.all", { count: customRoutingTierCounts.all }),
        customRoutingQuotaPoolSummary.all,
        quotaPoolLabels.weekly,
      ),
    [
      customRoutingQuotaPoolSummary.all,
      customRoutingTierCounts.all,
      quotaPoolLabels.weekly,
      t,
    ],
  );

  const customRoutingTierFilterOptions = useMemo<MultiSelectFilterOption[]>(
    () =>
      buildCodexPlanFilterOptions(customRoutingTierCounts, {
        includeValid: true,
        pendingLabel: t("codex.pendingAuth.badge", "Chờ xác thực"),
        validOption: buildValidAccountsFilterOption(
          t,
          customRoutingTierCounts.VALID,
        ),
      }).map((option) => {
        const pool = customRoutingQuotaPoolByPlan[option.value];
        if (!pool) return option;
        return {
          ...option,
          label: formatQuotaPoolLabel(
            option.label,
            pool,
            quotaPoolLabels.weekly,
          ),
        };
      }),
    [
      customRoutingQuotaPoolByPlan,
      customRoutingTierCounts,
      quotaPoolLabels.weekly,
      t,
    ],
  );

  const visibleCustomRoutingAccounts = useMemo(() => {
    const normalizedQuery = customRoutingQuery.trim().toLowerCase();
    const selectedTags = new Set(customRoutingTagFilter.map(normalizeTag));
    const { requireValidAccounts, selectedTypes } = splitValidityFilterValues(
      customRoutingFilterTypes,
    );

    return customRoutingAccounts.filter((account) => {
      const presentation = buildCodexAccountPresentation(account, t);
      const matchesQuery =
        !normalizedQuery ||
        presentation.displayName.toLowerCase().includes(normalizedQuery) ||
        account.id.toLowerCase().includes(normalizedQuery) ||
        presentation.planLabel.toLowerCase().includes(normalizedQuery);
      if (!matchesQuery) return false;

      if (selectedTags.size > 0) {
        const accountTags = (account.tags || []).map(normalizeTag);
        if (!accountTags.some((tag) => selectedTags.has(tag))) {
          return false;
        }
      }

      if (
        requireValidAccounts &&
        isBlockingCodexAccountQuotaError(account)
      ) {
        return false;
      }

      if (selectedTypes.size > 0) {
        const planKey = getCodexPlanFilterKey(account);
        const matchesType = Array.from(selectedTypes).some((type) => {
          if (type === "ERROR") {
            return isBlockingCodexAccountQuotaError(account);
          }
          return type === planKey;
        });
        if (!matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [
    customRoutingAccounts,
    customRoutingFilterTypes,
    customRoutingQuery,
    customRoutingTagFilter,
    t,
  ]);

  const selectedVisibleCustomRoutingCount = useMemo(
    () =>
      visibleCustomRoutingAccounts.filter((account) =>
        customRoutingSelected.has(account.id),
      ).length,
    [customRoutingSelected, visibleCustomRoutingAccounts],
  );
  const allVisibleCustomRoutingSelected =
    visibleCustomRoutingAccounts.length > 0 &&
    selectedVisibleCustomRoutingCount === visibleCustomRoutingAccounts.length;

  useEffect(() => {
    if (!customRoutingSelectAllRef.current) return;
    customRoutingSelectAllRef.current.indeterminate =
      selectedVisibleCustomRoutingCount > 0 && !allVisibleCustomRoutingSelected;
  }, [allVisibleCustomRoutingSelected, selectedVisibleCustomRoutingCount]);

  const handleCopy = async (field: CopyableField, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(
        () => setCopiedField((current) => (current === field ? null : current)),
        1200,
      );
    } catch (err) {
      setError(t("common.shared.export.copyFailed", "Sao chép thất bại, vui lòng sao chép thủ công"));
      console.error("Failed to copy local access value:", err);
    }
  };

  const runAction = async (task: () => Promise<void | boolean>, successText: string) => {
    setError("");
    setNotice("");
    try {
      const completed = await task();
      if (completed !== false) setNotice(successText);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleSelectAllVisible = async () => {
    if (membersInteractionDisabled || visibleEnabledAccounts.length === 0) {
      return;
    }
    const codexRows: CodexAccount[] = [];
    const grokRows: GrokAccount[] = [];
    for (const account of visibleEnabledAccounts) {
      const grokRowAccount = grokMemberRowAccountById.get(account.id);
      if (grokRowAccount) {
        grokRows.push(grokRowAccount);
      } else {
        codexRows.push(account);
      }
    }
    if (allVisibleSelected) {
      setMembersDraftDirty(true);
      setSelected((prev) => {
        const next = new Set(prev);
        codexRows.forEach((account) => next.delete(account.id));
        grokRows.forEach((grokAccount) => {
          const boundAccountId =
            grokMemberBindingByAccountId.get(grokAccount.id);
          if (boundAccountId) {
            next.delete(boundAccountId);
          }
        });
        return next;
      });
      return;
    }
    setMembersDraftDirty(true);
    setSelected((prev) => {
      const next = new Set(prev);
      codexRows.forEach((account) => next.add(account.id));
      return next;
    });
    // Grok 账号需要先接入（创建绑定账号）才能加入集合，逐个串行执行。
    void (async () => {
      for (const grokAccount of grokRows) {
        if (membersInteractionDisabled) {
          return;
        }
        const boundAccountId = grokMemberBindingByAccountId.get(grokAccount.id);
        if (boundAccountId) {
          setSelected((prev) => new Set(prev).add(boundAccountId));
          continue;
        }
        await handleToggleGrokMember(grokAccount, true);
      }
    })();
  };

  const handleToggleRestrictFreeAccounts = async () => {
    if (membersInteractionDisabled) return;
    setMembersDraftDirty(true);
    setRestrictFreeAccounts((prev) => !prev);
  };

  const handleToggleSessionAffinity = async () => {
    if (membersInteractionDisabled) return;
    setSessionAffinityTtlError("");
    if (sessionAffinity) {
      setMembersDraftDirty(true);
      setSessionAffinity(false);
      return;
    }
    const confirmed = await confirmDialog(
      t(
        "codex.localAccess.modal.sessionAffinityDescription",
        "Khi bật, cùng một cuộc trò chuyện sẽ cố gắng tiếp tục dùng cùng một tài khoản. Nếu tài khoản không khả dụng, định tuyến vẫn có thể chuyển đổi; sau khi hết hạn, tài khoản sẽ được chọn lại.",
      ),
      {
        title: t(
          "codex.localAccess.modal.sessionAffinityConfirmTitle",
          "Bật gắn kết phiên?",
        ),
      },
    );
    if (!confirmed) return;
    setMembersDraftDirty(true);
    setSessionAffinity(true);
  };

  const toggleSelect = async (accountId: string) => {
    if (membersInteractionDisabled) return;
    const account = localAccessAccountById.get(accountId);
    if (!account) return;
    const isSelectionBlocked =
      !isCodexLocalAccessEligibleAccount(account, restrictFreeAccounts) &&
      !selected.has(accountId);
    if (isSelectionBlocked) {
      return;
    }
    setMembersDraftDirty(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const handleSaveMembers = async () => {
    if (!accountsLoaded) return;
    setError("");
    setNotice("");
    setSessionAffinityTtlError("");
    const parsedSessionAffinityTtlSeconds = Number(
      sessionAffinityTtlSeconds.trim(),
    );
    if (
      !Number.isInteger(parsedSessionAffinityTtlSeconds) ||
      parsedSessionAffinityTtlSeconds < 60 ||
      parsedSessionAffinityTtlSeconds > 86400
    ) {
      const message = t("codex.apiService.validation.numberRange", {
        min: 60,
        max: 86400,
        defaultValue: "Nhập số từ {{min}} đến {{max}}",
      });
      setSessionAffinityTtlError(message);
      requestAnimationFrame(() => sessionAffinityTtlInputRef.current?.focus());
      return;
    }
    try {
      const filtered = Array.from(selected).filter((accountId) => {
        const account = localAccessAccountById.get(accountId);
        if (!account) return false;
        return isCodexLocalAccessEligibleAccount(account, restrictFreeAccounts);
      });
      const backupAccountIds = filtered.filter((accountId) => {
        const isBackup =
          customRoutingDraft[accountId]?.isBackup ??
          customRoutingRuleByAccountId.get(accountId)?.isBackup ??
          false;
        return isBackup;
      });
      const preferredAccountIds = filtered.filter((accountId) => {
        const isPreferred =
          customRoutingDraft[accountId]?.isPreferred ??
          customRoutingRuleByAccountId.get(accountId)?.isPreferred ??
          false;
        return isPreferred;
      });
      await onSaveAccounts({
        accountIds: filtered,
        restrictFreeAccounts,
        backupAccountIds,
        preferredAccountIds,
        sessionAffinity,
        sessionAffinityTtlMs: parsedSessionAffinityTtlSeconds * 1000,
        imageGenerationAccountPolicies: Object.fromEntries(
          filtered.map((accountId) => [
            accountId,
            imageGenerationPolicies[accountId] ??
              (isCodexApiKeyAccount(
                localAccessAccountById.get(accountId) as CodexAccount,
              )
                ? "disabled"
                : "inherit"),
          ]),
        ),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSavePort = async () => {
    const nextPort = Number(portInput.trim());
    if (!Number.isInteger(nextPort) || nextPort <= 0 || nextPort > 65535) {
      setError(
        t("codex.localAccess.portInvalid", "Nhập cổng từ 1 đến 65535"),
      );
      return;
    }

    await runAction(
      async () => {
        await onUpdatePort(nextPort);
      },
      t("codex.localAccess.portSaveSuccess", "Đã cập nhật cổng dịch vụ API"),
    );
  };

  const openCustomRoutingDialog = () => {
    if (!collection) return;
    setError("");
    setNotice("");
    setCustomRoutingError("");
    setCustomRoutingOpen(true);
  };

  const handleChangeRoutingStrategy = async (nextStrategy: string) => {
    if (!collection) return;
    if (nextStrategy === "custom") {
      openCustomRoutingDialog();
      return;
    }
    if (nextStrategy === routingStrategy) return;

    await runAction(
      async () => {
        await onUpdateRoutingStrategy(
          nextStrategy as CodexLocalAccessRoutingStrategy,
        );
      },
      t("codex.localAccess.routingSaveSuccess", "Đã cập nhật định tuyến dịch vụ API"),
    );
  };

  const closeCustomRoutingDialog = () => {
    if (saving) return;
    setCustomRoutingOpen(false);
    setCustomRoutingError("");
    setCustomRoutingSelected(new Set());
  };

  const toggleCustomRoutingSelect = (accountId: string) => {
    if (saving) return;
    setCustomRoutingSelected((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  const toggleCustomRoutingSelectAllVisible = () => {
    if (saving || visibleCustomRoutingAccounts.length === 0) return;
    setCustomRoutingSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleCustomRoutingSelected) {
        visibleCustomRoutingAccounts.forEach((account) =>
          next.delete(account.id),
        );
      } else {
        visibleCustomRoutingAccounts.forEach((account) => next.add(account.id));
      }
      return next;
    });
  };

  const updateCustomRoutingRule = (
    accountId: string,
    field: "priority" | "weight",
    rawValue: string,
  ) => {
    const parsed = Number.parseInt(rawValue, 10);
    setCustomRoutingDraft((prev) => {
      const current = prev[accountId] ?? {
        priority: CUSTOM_ROUTING_PRIORITY_MIN,
        weight: CUSTOM_ROUTING_WEIGHT_MIN,
        isBackup: false,
        isPreferred: false,
      };
      return {
        ...prev,
        [accountId]: {
          ...current,
          [field]:
            field === "priority"
              ? normalizeCustomRoutingPriority(parsed)
              : normalizeCustomRoutingWeight(parsed),
        },
      };
    });
  };

  const updateMemberUsagePriority = (
    accountId: string,
    usagePriority: AccountUsagePriority,
  ) => {
    if (membersInteractionDisabled) return;
    if (!selected.has(accountId)) {
      setMembersDraftDirty(true);
      setSelected((prev) => {
        const next = new Set(prev);
        next.add(accountId);
        return next;
      });
    }
    const current = customRoutingDraft[accountId] ??
      customRoutingRuleByAccountId.get(accountId) ?? {
        priority: CUSTOM_ROUTING_PRIORITY_MIN,
        weight: CUSTOM_ROUTING_WEIGHT_MIN,
        isBackup: false,
        isPreferred: false,
      };
    setMembersDraftDirty(true);
    setCustomRoutingDraft((prev) => ({
      ...prev,
      [accountId]: {
        ...current,
        isBackup: usagePriority === "lowest",
        isPreferred: usagePriority === "highest",
      },
    }));
  };

  const applyCustomRoutingBatch = () => {
    if (saving || customRoutingSelected.size === 0) return;
    const priority = normalizeCustomRoutingPriority(
      Number.parseInt(customRoutingBulkPriority, 10),
    );
    const weight = normalizeCustomRoutingWeight(
      Number.parseInt(customRoutingBulkWeight, 10),
    );
    setCustomRoutingBulkPriority(String(priority));
    setCustomRoutingBulkWeight(String(weight));
    setCustomRoutingDraft((prev) => {
      const next = { ...prev };
      customRoutingSelected.forEach((accountId) => {
        next[accountId] = {
          priority,
          weight,
          isBackup:
            next[accountId]?.isBackup ??
            customRoutingRuleByAccountId.get(accountId)?.isBackup ??
            false,
          isPreferred:
            next[accountId]?.isPreferred ??
            customRoutingRuleByAccountId.get(accountId)?.isPreferred ??
            false,
        };
      });
      return next;
    });
  };

  const resetCustomRoutingDraft = () => {
    if (!collection || saving) return;
    const next: Record<string, CustomRoutingDraftRule> = {};
    collection.accountIds.forEach((accountId) => {
      next[accountId] = {
        priority: CUSTOM_ROUTING_PRIORITY_MIN,
        weight: CUSTOM_ROUTING_WEIGHT_MIN,
        isBackup: false,
        isPreferred: false,
      };
    });
    setCustomRoutingDraft(next);
    setCustomRoutingSelected(new Set());
  };

  const handleSaveCustomRouting = async () => {
    if (!collection) return;
    setCustomRoutingError("");
    setNotice("");
    try {
      const rules = collection.accountIds.map((accountId) => {
        const rule = customRoutingDraft[accountId] ??
          customRoutingRuleByAccountId.get(accountId) ?? {
            priority: CUSTOM_ROUTING_PRIORITY_MIN,
            weight: CUSTOM_ROUTING_WEIGHT_MIN,
            isBackup: false,
            isPreferred: false,
          };
        return {
          accountId,
          priority: normalizeCustomRoutingPriority(rule.priority),
          weight: normalizeCustomRoutingWeight(rule.weight),
          isBackup: rule.isBackup,
          isPreferred: rule.isPreferred,
        };
      });
      await onUpdateCustomRouting(rules);
      setNotice(
        t(
          "codex.localAccess.customRoutingSaveSuccess",
          "Đã cập nhật định tuyến tùy chỉnh của dịch vụ API",
        ),
      );
      setCustomRoutingOpen(false);
      setCustomRoutingSelected(new Set());
    } catch (err) {
      setCustomRoutingError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleChangeAccessScope = async (nextValue: string) => {
    if (!collection) return;
    const nextAccessScope = normalizeAccessScope(nextValue);
    if (nextAccessScope === accessScope) return;

    await runAction(
      async () => {
        await onUpdateAccessScope(nextAccessScope);
      },
      t("codex.localAccess.accessScopeSaveSuccess", "Đã cập nhật phạm vi truy cập dịch vụ API"),
    );
  };

  const handleSaveUpstreamProxyConfig = async () => {
    if (!collection) return;
    const upstreamProxyUrlDraft = upstreamProxyDraftUrl.trim();
    if (upstreamProxyUrlDraft === upstreamProxyUrl.trim()) {
      setUpstreamProxyDraftUrl(upstreamProxyUrlDraft);
      return;
    }

    await runAction(
      async () => {
        await onUpdateUpstreamProxyConfig(upstreamProxyUrlDraft || null);
      },
      t("codex.localAccess.upstreamProxySaveSuccess", "Đã cập nhật URL proxy API"),
    );
  };

  const handleToggleDebugLogs = async () => {
    if (!collection) return;
    const nextDebugLogs = !collection.debugLogs;
    const confirmed = await confirmDialog(
      nextDebugLogs
        ? t(
            "codex.localAccess.debugLogsEnableConfirmMessage",
            "Khi bật, dịch vụ API sẽ xuất nhật ký debug để chẩn đoán sự cố gateway, proxy, yêu cầu upstream và phản hồi streaming. Việc này có thể thêm một ít chi phí hiệu năng khi đồng thời cao hoặc streaming dài. Nên tắt sau khi chẩn đoán xong. Bật?",
          )
        : t(
            "codex.localAccess.debugLogsDisableConfirmMessage",
            "Khi tắt, dịch vụ API sẽ dừng xuất nhật ký debug, giảm nhiễu nhật ký và chi phí bổ sung. Bạn có thể bật lại khi chẩn đoán gateway, proxy hoặc streaming. Tắt?",
          ),
      {
        title: nextDebugLogs
          ? t(
              "codex.localAccess.debugLogsEnableConfirmTitle",
              "Bật nhật ký debug",
            )
          : t(
              "codex.localAccess.debugLogsDisableConfirmTitle",
              "Tắt nhật ký debug",
            ),
        kind: "info",
        okLabel: nextDebugLogs
          ? t("codex.localAccess.debugLogsEnableConfirmAction", "Bật")
          : t("codex.localAccess.debugLogsDisableConfirmAction", "Tắt"),
        cancelLabel: t("common.cancel"),
      },
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    try {
      await onUpdateDebugLogs(nextDebugLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleResetKey = async () => {
    const confirmed = await confirmDialog(
      t(
        "codex.localAccess.rotateConfirmMessage",
        "Sau khi đặt lại, khóa dịch vụ API hiện tại sẽ mất hiệu lực ngay và các yêu cầu đang chạy có thể không dùng được nữa. Tiếp tục chứ?",
      ),
      {
        title: t("codex.localAccess.rotateKey", "Đổi khóa"),
        kind: "warning",
        okLabel: t("common.confirm"),
        cancelLabel: t("common.cancel"),
      },
    );

    if (!confirmed) {
      return;
    }

    await runAction(
      async () => {
        await onRotateApiKey();
        setKeyVisible(true);
      },
      t("codex.localAccess.rotateSuccess", "Đã đặt lại khóa dịch vụ API"),
    );
  };

  const handleClearStats = async () => {
    const confirmed = await confirmDialog(
      t("codex.localAccess.clearStatsConfirm", "Xóa toàn bộ thống kê dịch vụ API?"),
      {
        title: t("codex.localAccess.clearStats", "Xóa thống kê"),
        kind: "warning",
        okLabel: t("common.confirm"),
        cancelLabel: t("common.cancel"),
      },
    );

    if (!confirmed) {
      return;
    }

    await runAction(
      async () => {
        await onClearStats();
      },
      t("codex.localAccess.clearStatsSuccess", "Đã xóa thống kê dịch vụ API"),
    );
  };

  const handleKillPort = async () => {
    await runAction(
      async () => {
        await onKillPort();
      },
      t("codex.localAccess.killPortSuccessUnknown", "Đã dọn cổng dịch vụ API"),
    );
  };

  const handleRestartSidecar = async () => {
    const confirmed = await confirmDialog(
      t(
        "codex.localAccess.restartConfirmMessage",
        "Chỉ Sidecar của dịch vụ API sẽ được khởi động lại. Tài khoản, token, API key và cài đặt nhóm tài khoản sẽ không thay đổi. Các yêu cầu đang chạy có thể bị gián đoạn. Tiếp tục?",
      ),
      {
        title: t("codex.localAccess.restartTitle", "Khởi động lại dịch vụ API"),
        kind: "warning",
        okLabel: t("codex.localAccess.restartAction", "Khởi động lại Sidecar"),
        cancelLabel: t("common.cancel", "Hủy"),
      },
    );
    if (!confirmed) return;
    await runAction(
      async () => {
        await onRestartSidecar();
      },
      t("codex.localAccess.restartSuccess", "Đã khởi động lại Sidecar dịch vụ API"),
    );
  };

  const handleRefreshStats = async () => {
    setError("");
    setNotice("");
    try {
      await onRefreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleEnabled = async () => {
    await runAction(
      async () => {
        const completed = await onToggleEnabled();
        if (completed === false) return false;
      },
      collection?.enabled
        ? t("codex.localAccess.disabledSuccess", "Đã tắt dịch vụ API")
        : t("codex.localAccess.enabledSuccess", "Đã bật dịch vụ API"),
    );
  };

  const closeTestDialog = () => {
    if (testDialogBusy) return;
    setTestDialogOpen(false);
  };

  const handleTest = () => {
    setTestDialogOpen(true);
    setTestDialogError("");
  };

  const clearTestChat = () => {
    if (testDialogBusy) return;
    setTestChatMessages([]);
    setTestDialogError("");
  };

  const handleSendTestChatMessage = async () => {
    if (testDialogBusy) return;
    const content = testChatInput.trim();
    if (!content) {
      setTestDialogError(
        t("codex.localAccess.testChatInputRequired", "Nhập tin nhắn thử"),
      );
      return;
    }
    if (!selectedModelId) {
      setTestDialogError(
        t("codex.localAccess.testChatModelRequired", "Chọn ID mô hình"),
      );
      return;
    }

    const userMessage = createTestChatMessage("user", content);
    const assistantMessage = createTestChatMessage("assistant", "");
    const nextMessages = [...testChatMessages, userMessage, assistantMessage];
    setTestChatMessages(nextMessages);
    setTestChatInput("");
    setTestDialogError("");
    setTestDialogRunning(true);
    const sessionId = `local-access-test-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    let unlisten: (() => void) | null = null;
    try {
      const apiMessages: CodexLocalAccessChatMessage[] = nextMessages
        .filter((message) => !message.failureTitle && message.content.trim())
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));
      unlisten = await listen<CodexLocalAccessChatStreamEvent>(
        "codex-local-access-chat-test-stream",
        (event) => {
          const payload = event.payload;
          if (payload.sessionId !== sessionId) return;
          if (payload.type === "delta") {
            const chunk = payload.content ?? payload.reasoning ?? "";
            if (!chunk) return;
            setTestChatMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? { ...message, content: `${message.content}${chunk}` }
                  : message,
              ),
            );
            return;
          }
          if (payload.type === "error") {
            setTestChatMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? {
                      ...message,
                      content: payload.failure.cause,
                      failureTitle: payload.failure.title,
                      failureDetail: payload.failure.suggestion,
                    }
                  : message,
              ),
            );
            return;
          }
          if (payload.type === "done") {
            setTestChatMessages((current) =>
              current.map((message) =>
                message.id === assistantMessage.id
                  ? {
                      ...message,
                      content:
                        message.content ||
                        t(
                          "codex.localAccess.testChatEmptyResponse",
                          "Phản hồi trống",
                        ),
                      latencyMs: payload.latencyMs,
                    }
                  : message,
              ),
            );
          }
        },
      );
      await onStreamTestMessage({
        sessionId,
        modelId: selectedModelId,
        messages: apiMessages,
      });
    } catch (err) {
      setTestDialogError(err instanceof Error ? err.message : String(err));
      setTestChatMessages((current) =>
        current.filter((message) => message.id !== assistantMessage.id),
      );
    } finally {
      unlisten?.();
      setTestDialogRunning(false);
    }
  };

  if (!isOpen) return null;
  const isMembersMode = mode === "members";

  return (
    <>
      <div
        className={`modal-overlay codex-local-access-modal-overlay${
          isMembersMode ? "" : " codex-local-access-modal-overlay-panel"
        }`}
      >
        <div
          className={`modal codex-local-access-modal${
            isMembersMode
              ? " codex-local-access-modal-members"
              : " codex-local-access-modal-panel"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header codex-local-access-modal-header">
            <div className="codex-local-access-header-main">
              <h2 className="group-account-picker-title">
                <Server size={18} />
                <span>
                  {isMembersMode
                    ? t("codex.localAccess.entryAction", "Thêm vào dịch vụ API")
                    : t("codex.localAccess.title", "Dịch vụ API")}
                </span>
              </h2>
              {!isMembersMode && (
                <div className="codex-local-access-header-meta">
                  <div className="codex-local-access-header-badges">
                    <span
                      className={`codex-local-access-status ${
                        localAccessStatus
                      }`}
                    >
                      {t(CODEX_LOCAL_ACCESS_STATUS_KEYS[localAccessStatus])}
                    </span>
                    <span className="codex-local-access-subtle-badge">
                      {accessScopeBadge}
                    </span>
                    <button
                      type="button"
                      className="codex-local-access-test-pill"
                      onClick={() => void handleTest()}
                      disabled={!collection || testDialogBusy || saving}
                      title={t(
                        "codex.localAccess.testDialogTitle",
                        "Kiểm tra dịch vụ API",
                      )}
                      aria-label={t(
                        "codex.localAccess.testDialogTitle",
                        "Kiểm tra dịch vụ API",
                      )}
                    >
                      <ShieldCheck
                        size={13}
                        className={testDialogBusy ? "loading-spinner" : ""}
                      />
                      <span>{t("codex.localAccess.testAction", "Kiểm tra")}</span>
                    </button>
                    {collection && (
                      <div className="codex-local-access-header-upstream">
                        <div className="codex-local-access-header-upstream-url">
                          <input
                            type="text"
                            value={upstreamProxyDraftUrl}
                            onChange={(event) =>
                              setUpstreamProxyDraftUrl(event.target.value)
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleSaveUpstreamProxyConfig();
                              }
                            }}
                            disabled={saving || testing || starting}
                            placeholder={t(
                              "codex.localAccess.upstreamProxyUrlPlaceholder",
                              "Trống = proxy toàn cục",
                            )}
                            aria-label={t(
                              "codex.localAccess.upstreamProxyLabel",
                              "URL proxy API",
                            )}
                          />
                          <button
                            type="button"
                            className="codex-local-access-upstream-save-btn"
                            onClick={() => void handleSaveUpstreamProxyConfig()}
                            disabled={saving || testing || starting}
                            title={t(
                              "codex.localAccess.upstreamProxySaveAction",
                              "Lưu proxy",
                            )}
                            aria-label={t(
                              "codex.localAccess.upstreamProxySaveAction",
                              "Lưu proxy",
                            )}
                          >
                            <Check size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="codex-local-access-header-tools">
                    {onOpenFullPage && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm codex-local-access-full-page-btn"
                        onClick={onOpenFullPage}
                        title={t(
                          "codex.apiService.openFullPage",
                          "Xem tất cả tính năng",
                        )}
                        aria-label={t(
                          "codex.apiService.openFullPage",
                          "Xem tất cả tính năng",
                        )}
                      >
                        <ExternalLink size={14} />
                        <span>
                          {t("codex.apiService.openFullPage", "Xem tất cả tính năng")}
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="folder-icon-btn codex-local-access-toolbar-btn"
                      onClick={() => void handleRefreshStats()}
                      disabled={!collection || actionBusy}
                      title={t("codex.localAccess.refreshStats", "Làm mới thống kê")}
                      aria-label={t(
                        "codex.localAccess.refreshStats",
                        "Làm mới thống kê",
                      )}
                    >
                      <RefreshCw
                        size={14}
                        className={saving ? "loading-spinner" : ""}
                      />
                    </button>
                    {collection && (
                      <>
                        <div className="codex-local-access-header-routing">
                          <SingleSelectDropdown
                            value={routingStrategy}
                            options={routingStrategyOptions}
                            onChange={(value) =>
                              void handleChangeRoutingStrategy(value)
                            }
                            disabled={saving || testing || starting}
                            ariaLabel={t(
                              "codex.localAccess.routingLabel",
                              "Định tuyến",
                            )}
                          />
                        </div>
                        {routingStrategy === "custom" && (
                          <button
                            type="button"
                            className="folder-icon-btn codex-local-access-toolbar-btn"
                            onClick={openCustomRoutingDialog}
                            disabled={saving || testing || starting}
                            title={t(
                              "codex.localAccess.customRoutingEdit",
                              "Sửa định tuyến tùy chỉnh",
                            )}
                            aria-label={t(
                              "codex.localAccess.customRoutingEdit",
                              "Sửa định tuyến tùy chỉnh",
                            )}
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                        )}
                      </>
                    )}
                    {collection && (
                      <button
                        type="button"
                        className={`folder-icon-btn codex-local-access-toolbar-btn codex-local-access-debug-toggle${
                          collection.debugLogs ? " is-active" : ""
                        }`}
                        onClick={() => void handleToggleDebugLogs()}
                        disabled={saving || testing || starting}
                        title={
                          collection.debugLogs
                            ? t(
                                "codex.localAccess.debugLogsEnabledSuccess",
                                "Đã bật nhật ký debug",
                              )
                            : t(
                                "codex.localAccess.debugLogsDisabledSuccess",
                                "Đã tắt nhật ký debug",
                              )
                        }
                        aria-label={
                          collection.debugLogs
                            ? t(
                                "codex.localAccess.debugLogsEnabledSuccess",
                                "Đã bật nhật ký debug",
                              )
                            : t(
                                "codex.localAccess.debugLogsDisabledSuccess",
                                "Đã tắt nhật ký debug",
                              )
                        }
                        aria-pressed={collection.debugLogs}
                      >
                        <Bug size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className={`folder-icon-btn codex-local-access-toolbar-btn ${
                        collection?.enabled ? "is-danger" : "is-primary"
                      }`}
                      onClick={() => void handleToggleEnabled()}
                      disabled={!collection || saving || testing || starting}
                      title={
                        collection?.enabled
                          ? t("codex.localAccess.disableService", "Tắt dịch vụ")
                          : t("codex.localAccess.enableService", "Bật dịch vụ")
                      }
                      aria-label={
                        collection?.enabled
                          ? t("codex.localAccess.disableService", "Tắt dịch vụ")
                          : t("codex.localAccess.enableService", "Bật dịch vụ")
                      }
                    >
                      <Power size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              className="modal-close codex-local-access-close"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <X size={18} />
            </button>
          </div>

          {(error || (state?.lastError && !actionBusy)) && (
            <div className="codex-local-access-error-area" role="alert" ref={errorAreaRef} tabIndex={-1}>
            {state?.lastError && !error && !actionBusy && (
              <div className="codex-local-access-inline-error codex-local-access-inline-error-with-action">
                <CircleAlert size={14} />
                <span>{state.lastError}</span>
                {collection && (
                  <>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm codex-local-access-inline-action"
                      onClick={() => void handleRestartSidecar()}
                      disabled={actionBusy || sidecarRestarting}
                    >
                      <RefreshCw
                        size={14}
                        className={sidecarRestarting ? "loading-spinner" : ""}
                      />
                      {t("codex.localAccess.restartAction", "Khởi động lại Sidecar")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm codex-local-access-inline-action"
                      onClick={() => void handleKillPort()}
                      disabled={actionBusy}
                    >
                      {portCleanupBusy ? (
                        <RefreshCw size={14} className="loading-spinner" />
                      ) : (
                        <Wrench size={14} />
                      )}
                      {t("codex.localAccess.killPortAction", "Dọn cổng")}
                    </button>
                  </>
                )}
              </div>
            )}

            {error && (
              <div className="codex-local-access-inline-error">
                <CircleAlert size={14} />
                <span>{error}</span>
              </div>
            )}

            </div>
          )}

          <div className="modal-body codex-local-access-modal-body">
            {!isMembersMode && <section className="codex-local-access-section"><CodexRequestPayloadSetting /></section>}
            {notice && (
              <div className="codex-local-access-inline-success">
                <Check size={14} />
                <span>{notice}</span>
              </div>
            )}

            {!isMembersMode && (
              <section className="codex-local-access-section codex-local-access-section-surface codex-local-access-summary-block">
                <div className="codex-local-access-summary-head">
                  <div className="codex-local-access-section-title">
                    <Activity size={16} />
                    <span>{t("codex.localAccess.statsTitle", "Tổng quan")}</span>
                  </div>
                  <div className="codex-local-access-summary-actions">
                    <CodexStatsRangePicker
                      value={statsRange}
                      range={statsTimeRange}
                      onPresetChange={handleStatsPresetChange}
                      onCustomApply={handleCustomStatsRangeApply}
                      disabled={actionBusy}
                      error={statsRangeError}
                      compact
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => void handleClearStats()}
                      disabled={!collection || actionBusy}
                      title={t("codex.localAccess.clearStats", "Xóa thống kê")}
                      aria-label={t("codex.localAccess.clearStats", "Xóa thống kê")}
                    >
                      <Trash2 size={14} />
                      {t("codex.localAccess.clearStats", "Xóa thống kê")}
                    </button>
                  </div>
                </div>
                <div className="codex-local-access-stats-grid">
                  {summaryStats.map((item) => (
                    <div
                      key={item.key}
                      className={`codex-local-access-stat-card codex-local-access-stat-card-${item.key}`}
                    >
                      <span className="codex-local-access-stat-label">
                        {item.label}
                      </span>
                      <strong>{item.value}</strong>
                      <span className="codex-local-access-stat-sub">
                        {item.detail}
                      </span>
                    </div>
                  ))}
                </div>
                {currentQuotaPoolSummary.visiblePlans.length > 0 && (
                  <div
                    className="codex-local-access-quota-pool-grid"
                    aria-label={quotaPoolLabels.title}
                  >
                    {accountPoolHealthSummary.total > 0 && (
                      <button
                        type="button"
                        className={`codex-local-access-quota-pool-card codex-local-access-health-pool-card${
                          accountPoolHealthSummary.available <
                          accountPoolHealthSummary.total ||
                        accountPoolHealthSummary.abnormal > 0 ||
                        accountPoolHealthSummary.cooldown > 0
                            ? " has-issue"
                            : ""
                        }`}
                        title={t("codex.localAccess.accountPoolHealth.detail", {
                          available: accountPoolHealthSummary.available,
                          total: accountPoolHealthSummary.total,
                          abnormal: accountPoolHealthSummary.abnormal,
                          cooldown: accountPoolHealthSummary.cooldown,
                          missing: accountPoolHealthSummary.missing,
                          authError: accountPoolHealthSummary.authError,
                          quotaLimited: accountPoolHealthSummary.quotaLimited,
                          defaultValue:
                            "OK {{available}}/{{total}}, lỗi {{abnormal}}, chờ {{cooldown}}, thiếu {{missing}}, auth {{authError}}, hạn mức {{quotaLimited}}",
                        })}
                        onClick={() => setHealthModalOpen(true)}
                        aria-label={t(
                          "codex.localAccess.accountPoolHealth.openDetails",
                          "Xem lỗi tài khoản",
                        )}
                      >
                        <span className="codex-local-access-quota-pool-plan">
                          {t(
                            "codex.localAccess.accountPoolHealth.title",
                            "Trạng thái tài khoản",
                          )}
                        </span>
                        <span className="codex-local-access-quota-pool-value">
                          {accountPoolHealthSummary.available ===
                          accountPoolHealthSummary.total &&
                          accountPoolHealthSummary.abnormal === 0 &&
                          accountPoolHealthSummary.cooldown === 0
                            ? t(
                                "codex.localAccess.accountPoolHealth.allAvailable",
                                {
                                  count: accountPoolHealthSummary.total,
                                  defaultValue: "Tất cả OK {{count}}",
                                },
                              )
                            : t(
                                "codex.localAccess.accountPoolHealth.availableRatio",
                                {
                                  available: accountPoolHealthSummary.available,
                                  total: accountPoolHealthSummary.total,
                                  defaultValue: "Tốt {{available}}/{{total}}",
                                },
                              )}
                        </span>
                        {(accountPoolHealthSummary.abnormal > 0 ||
                          accountPoolHealthSummary.cooldown > 0) && (
                          <span className="codex-local-access-quota-pool-value codex-local-access-health-issue">
                            {t(
                              "codex.localAccess.accountPoolHealth.issueSummary",
                              {
                                abnormal: accountPoolHealthSummary.abnormal,
                                cooldown: accountPoolHealthSummary.cooldown,
                                defaultValue:
                                  "Lỗi {{abnormal}} · Chờ {{cooldown}}",
                              },
                            )}
                          </span>
                        )}
                      </button>
                    )}
                    {currentQuotaPoolSummary.visiblePlans.map((item) => (
                      <div
                        key={item.key}
                        className="codex-local-access-quota-pool-card"
                      >
                        <span className="codex-local-access-quota-pool-plan">
                          {item.key} ({item.count})
                        </span>
                        {item.windows.map((window) => (
                          <span
                            key={window.key}
                            className="codex-local-access-quota-pool-value"
                          >
                            {formatCodexQuotaPoolWindowLabel(
                              window.label,
                              quotaPoolLabels.weekly,
                            )}{" "}
                            {formatCodexQuotaPoolPercent(window.percentage)}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {!isMembersMode && (
              <div className="codex-local-access-panel-grid">
                <section className="codex-local-access-section codex-local-access-section-surface codex-local-access-config-section">
                  <div className="codex-local-access-section-title">
                    <KeyRound size={16} />
                    <span>
                      {t("codex.localAccess.configTitle", "Cấu hình dịch vụ")}
                    </span>
                  </div>
                  {collection ? (
                    <div className="codex-local-access-config-grid">
                      <div className="codex-local-access-config-card codex-local-access-config-card-base">
                        <div className="codex-local-access-config-head">
                          <div className="codex-local-access-config-label codex-local-access-address-select">
                            <SingleSelectDropdown
                              value={addressKind}
                              options={addressOptions}
                              onChange={onAddressKindChange}
                              menuClassName="codex-local-access-address-menu"
                              menuWidth={92}
                              menuMaxHeight={120}
                              disabled={addressOptions.length < 2}
                              ariaLabel={t(
                                "codex.localAccess.addressKind",
                                "Loại địa chỉ",
                              )}
                            />
                          </div>
                          <div className="codex-local-access-config-actions">
                            <button
                              type="button"
                              className="folder-icon-btn"
                              onClick={() =>
                                void handleCopy("baseUrl", displayBaseUrl)
                              }
                              title={t("common.copy", "Copy​")}
                            >
                              {copiedField === "baseUrl" ? (
                                <Check size={14} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                        </div>
                        <code
                          className="codex-local-access-code"
                          title={displayBaseUrl}
                        >
                          {displayBaseUrl}
                        </code>
                      </div>

                      <div className="codex-local-access-config-card codex-local-access-config-card-key">
                        <div className="codex-local-access-config-head">
                          <span className="codex-local-access-config-label">
                            {t("codex.localAccess.apiKey", "Khóa")}
                          </span>
                          <div className="codex-local-access-config-actions">
                            <button
                              type="button"
                              className="folder-icon-btn"
                              onClick={() => setKeyVisible((prev) => !prev)}
                              title={
                                keyVisible
                                  ? t("codex.localAccess.hideKey", "Ẩn khóa")
                                  : t("codex.localAccess.showKey", "Hiện khóa")
                              }
                            >
                              {keyVisible ? (
                                <EyeOff size={14} />
                              ) : (
                                <Eye size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="folder-icon-btn"
                              onClick={() =>
                                void handleCopy("apiKey", collection.apiKey)
                              }
                              title={t("common.copy", "Copy​")}
                            >
                              {copiedField === "apiKey" ? (
                                <Check size={14} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => void handleResetKey()}
                              disabled={saving || testing || starting}
                            >
                              {saving ? (
                                <RefreshCw
                                  size={14}
                                  className="loading-spinner"
                                />
                              ) : (
                                <RefreshCw size={14} />
                              )}
                              {t("codex.localAccess.rotateKey", "Đổi khóa")}
                            </button>
                          </div>
                        </div>
                        <code
                          className="codex-local-access-code"
                          title={collection.apiKey}
                        >
                          {keyVisible
                            ? collection.apiKey
                            : `${collection.apiKey.slice(0, 10)}••••••••••••`}
                        </code>
                      </div>

                      <div className="codex-local-access-config-card codex-local-access-config-card-port codex-local-access-port-card">
                        <div className="codex-local-access-config-head">
                          <label
                            className="codex-local-access-config-label"
                            htmlFor="codex-local-access-port"
                          >
                            {t("codex.localAccess.portLabel", "Cổng dịch vụ")}
                          </label>
                          <div className="codex-local-access-config-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => void handleSavePort()}
                              disabled={saving || testing || starting}
                            >
                              {saving ? (
                                <RefreshCw
                                  size={14}
                                  className="loading-spinner"
                                />
                              ) : (
                                <Gauge size={14} />
                              )}
                              {t("codex.localAccess.portSave", "Lưu cổng")}
                            </button>
                          </div>
                        </div>
                        <div className="codex-local-access-port-row">
                          <input
                            id="codex-local-access-port"
                            type="number"
                            min={1}
                            max={65535}
                            value={portInput}
                            onChange={(event) =>
                              setPortInput(event.target.value)
                            }
                            disabled={saving || testing || starting}
                          />
                        </div>
                      </div>

                      <div className="codex-local-access-config-card codex-local-access-config-card-scope">
                        <div className="codex-local-access-config-head">
                          <span className="codex-local-access-config-label">
                            {t(
                              "codex.localAccess.accessScopeLabel",
                              "Phạm vi truy cập",
                            )}
                          </span>
                          <div className="codex-local-access-config-actions">
                            <SingleSelectDropdown
                              value={accessScope}
                              options={accessScopeOptions}
                              onChange={(value) =>
                                void handleChangeAccessScope(value)
                              }
                              menuClassName="codex-local-access-scope-menu"
                              menuWidth={132}
                              menuMaxHeight={120}
                              disabled={saving || testing || starting}
                              ariaLabel={t(
                                "codex.localAccess.accessScopeLabel",
                                "Phạm vi truy cập",
                              )}
                            />
                          </div>
                        </div>
                        <code
                          className="codex-local-access-code"
                          title={accessScopeAddress}
                        >
                          {accessScopeAddress}
                        </code>
                      </div>
                    </div>
                  ) : (
                    <div className="group-account-empty">
                      {t(
                        "codex.localAccess.configEmpty",
                        "Hãy lưu ít nhất một tài khoản vào bộ sưu tập dịch vụ API trước khi tạo URL, khóa và cổng.",
                      )}
                    </div>
                  )}
                  {collection || modelIdOptions.length > 0 ? (
                    <div className="codex-local-access-config-extra-grid">
                      {collection ? (
                        <div className="codex-local-access-config-card codex-local-access-config-card-root">
                          <div className="codex-local-access-config-head">
                            <span className="codex-local-access-config-label">
                              {t("codex.localAccess.apiPortUrl", "URL cổng API")}
                            </span>
                            <div className="codex-local-access-config-actions">
                              <button
                                type="button"
                                className="folder-icon-btn"
                                onClick={() =>
                                  void handleCopy("apiPortUrl", apiPortUrl)
                                }
                                title={t("common.copy", "Copy​")}
                              >
                                {copiedField === "apiPortUrl" ? (
                                  <Check size={14} />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                          <code
                            className="codex-local-access-code"
                            title={apiPortUrl}
                          >
                            {apiPortUrl}
                          </code>
                        </div>
                      ) : null}

                      {modelIdOptions.length > 0 ? (
                        <div className="codex-local-access-config-card codex-local-access-config-card-model">
                          <div className="codex-local-access-config-head">
                            <span className="codex-local-access-config-label">
                              {t("codex.localAccess.modelId", "ID mô hình")}
                            </span>
                            <span className="codex-local-access-view-only-badge">
                              {t(
                                "codex.localAccess.modelIdViewOnly",
                                "Chỉ xem",
                              )}
                            </span>
                            <div className="codex-local-access-config-actions">
                              <button
                                type="button"
                                className="folder-icon-btn"
                                onClick={() =>
                                  void handleCopy("modelId", selectedModelId)
                                }
                                title={t("common.copy", "Copy​")}
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
                          <div className="codex-local-access-model-row">
                            <SingleSelectDropdown
                              value={selectedModelId}
                              options={modelIdOptions}
                              onChange={setSelectedModelId}
                              disabled={modelIdOptions.length === 0}
                              ariaLabel={t(
                                "codex.localAccess.modelId",
                                "ID mô hình",
                              )}
                              placeholder={t(
                                "codex.localAccess.modelIdPlaceholder",
                                "Chọn ID mô hình",
                              )}
                              menuPlacement="up"
                              menuMaxHeight={240}
                            />
                          </div>
                        </div>
                      ) : null}

                      {collection ? (
                        <CodexImageForwardConfig
                          accounts={accounts}
                          accountIds={collection.imageGenerationAccountIds}
                          disabled={saving || testing || starting}
                          maskAccountText={maskAccountText}
                          onSave={onUpdateImageGenerationAccounts}
                          imageModelControl={
                            <CodexImageModelSelect
                              model={collection.imageGenerationModel}
                              mainModel={collection.imageGenerationMainModel}
                              disabled={saving || testing || starting}
                              onSave={onUpdateImageGenerationModel}
                              onSaveMainModel={onUpdateImageGenerationMainModel}
                            />
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section className="codex-local-access-section codex-local-access-section-surface codex-local-access-account-stats-section">
                  <div className="codex-local-access-section-title">
                    <Server size={16} />
                    <span>
                      {t("codex.localAccess.accountStatsTitle", "Theo tài khoản")}
                    </span>
                  </div>
                  <div className="codex-local-access-account-stats">
                    {currentMemberStats.length === 0 ? (
                      <div className="group-account-empty">
                        {t(
                          "codex.localAccess.statsEmpty",
                          "Chưa có thống kê",
                        )}
                      </div>
                    ) : (
                      currentMemberStats.map(
                        ({ account, presentation, stats: accountStats }) => (
                          <div
                            key={account.id}
                            className="codex-local-access-account-stat-row"
                          >
                            <div className="codex-local-access-account-stat-top">
                              <div className="codex-local-access-account-stat-main">
                                <span
                                  className="group-account-email"
                                  title={maskAccountText(
                                    presentation.displayName,
                                  )}
                                >
                                  {maskAccountText(presentation.displayName)}
                                </span>
                                <span
                                  className={`tier-badge ${presentation.planClass}`}
                                >
                                  {presentation.planLabel}
                                </span>
                              </div>
                              <div className="codex-local-access-account-stat-block codex-local-access-account-stat-block-quota">
                                {renderQuotaPreview(presentation, 3)}
                              </div>
                              <div className="codex-local-access-account-stat-block codex-local-access-account-stat-block-metrics">
                                <div className="codex-local-access-account-stat-metrics">
                                  <span className="codex-local-access-account-stat-pill">
                                    {formatRequestResultDetail(accountStats)}
                                  </span>
                                  <span className="codex-local-access-account-stat-pill">
                                    {(accountStats?.totalTokens ?? 0) === 0
                                      ? t(
                                          "codex.localAccess.stats.accountTokens",
                                          {
                                            count: 0,
                                            defaultValue: "0 Tokens",
                                          },
                                        )
                                      : t(
                                          "codex.localAccess.stats.accountTokensCompact",
                                          {
                                            value: formatCompactNumber(
                                              accountStats?.totalTokens ?? 0,
                                            ),
                                            defaultValue: "{{value}}",
                                          },
                                        )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </section>
              </div>
            )}

            {isMembersMode && (
              <section className="codex-local-access-section codex-local-access-section-surface codex-local-access-member-section">
                <div className="codex-local-access-section-head">
                  <div className="codex-local-access-section-title">
                    <FolderPlus size={16} />
                    <span>
                      {t("codex.localAccess.memberTitle", "Thành viên bộ sưu tập")}
                    </span>
                  </div>
                  <div className="codex-local-access-member-head-actions">
                    <label className="codex-local-access-free-toggle">
                      <input
                        type="checkbox"
                        checked={restrictFreeAccounts}
                        onChange={() => void handleToggleRestrictFreeAccounts()}
                        disabled={membersInteractionDisabled}
                      />
                      <span>
                        {t(
                          "codex.localAccess.modal.restrictFreeToggle",
                          "Giới hạn tài khoản Free",
                        )}
                      </span>
                    </label>
                    <div className="codex-local-access-session-affinity-settings">
                      <div className="codex-local-access-session-affinity-row">
                        <label className="codex-local-access-session-affinity-toggle">
                          <input
                            type="checkbox"
                            checked={sessionAffinity}
                            onChange={() => void handleToggleSessionAffinity()}
                            disabled={membersInteractionDisabled}
                          />
                          <span>
                            {t(
                              "codex.apiService.routing.sessionAffinity",
                              "Gắn phiên",
                            )}
                          </span>
                        </label>
                        <label className="codex-local-access-session-affinity-expiry">
                          <span>
                            {t(
                              "codex.apiService.routing.sessionAffinityTtl",
                              "Thời gian hết hạn (giây)",
                            )}
                          </span>
                          <input
                            ref={sessionAffinityTtlInputRef}
                            type="number"
                            min={60}
                            max={86400}
                            value={sessionAffinityTtlSeconds}
                            aria-invalid={Boolean(sessionAffinityTtlError)}
                            onChange={(event) => {
                              setMembersDraftDirty(true);
                              setSessionAffinityTtlError("");
                              setSessionAffinityTtlSeconds(event.target.value);
                            }}
                            disabled={membersInteractionDisabled}
                          />
                        </label>
                      </div>
                      {sessionAffinityTtlError && (
                        <small className="codex-local-access-session-affinity-error">
                          {sessionAffinityTtlError}
                        </small>
                      )}
                    </div>
                    {collection && (
                      <>
                        <div className="codex-local-access-member-routing">
                          <SingleSelectDropdown
                            value={routingStrategy}
                            options={routingStrategyOptions}
                            onChange={(value) =>
                              void handleChangeRoutingStrategy(value)
                            }
                            disabled={saving || testing || starting}
                            ariaLabel={t(
                              "codex.localAccess.routingLabel",
                              "Định tuyến",
                            )}
                          />
                        </div>
                        {routingStrategy === "custom" && (
                          <button
                            type="button"
                            className="folder-icon-btn codex-local-access-toolbar-btn"
                            onClick={openCustomRoutingDialog}
                            disabled={saving || testing || starting}
                            title={t(
                              "codex.localAccess.customRoutingEdit",
                              "Sửa định tuyến tùy chỉnh",
                            )}
                            aria-label={t(
                              "codex.localAccess.customRoutingEdit",
                              "Sửa định tuyến tùy chỉnh",
                            )}
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="group-account-toolbar">
                  <div className="group-account-search">
                    <Search size={16} className="group-account-search-icon" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={memberSearchQuery}
                      onChange={(event) => {
                        if (memberView) {
                          memberView.onSearchQueryChange(event.target.value);
                          return;
                        }
                        setQuery(event.target.value);
                      }}
                      placeholder={t("accounts.search")}
                    />
                  </div>
                  <div className="group-account-picker-filters">
                    {onAddGrokMember && (
                      <MultiSelectFilterDropdown
                        options={[
                          { value: "codex", label: "Codex" },
                          { value: "grok", label: "Grok" },
                        ]}
                        selectedValues={platformFilter}
                        allLabel={t(
                          "codex.localAccess.memberPlatformAll",
                          "Tất cả nền tảng",
                        )}
                        filterLabel={t(
                          "codex.localAccess.memberPlatformLabel",
                          "Nền tảng",
                        )}
                        clearLabel={t("accounts.clearFilter", "Xóa bộ lọc")}
                        emptyLabel={t("common.none", "None​")}
                        ariaLabel={t(
                          "codex.localAccess.memberPlatformLabel",
                          "Nền tảng",
                        )}
                        onToggleValue={(value) =>
                          setPlatformFilter((prev) =>
                            prev.includes(value)
                              ? prev.filter((item) => item !== value)
                              : [...prev, value],
                          )
                        }
                        onClear={() => setPlatformFilter([])}
                      />
                    )}
                    <MultiSelectFilterDropdown
                      options={memberTierFilterOptions}
                      selectedValues={memberFilterTypes}
                      allLabel={memberTierFilterAllLabel}
                      filterLabel={t("common.shared.filterLabel", "Bộ lọc")}
                      clearLabel={t("accounts.clearFilter", "Xóa bộ lọc")}
                      emptyLabel={t("common.none", "None​")}
                      ariaLabel={t("common.shared.filterLabel", "Bộ lọc")}
                      onToggleValue={(value) => {
                        if (memberView) {
                          memberView.onToggleFilterType(value);
                          return;
                        }
                        setFilterTypes((prev) =>
                          prev.includes(value)
                            ? prev.filter((item) => item !== value)
                            : [...prev, value],
                        );
                      }}
                      onClear={() => {
                        if (memberView) {
                          memberView.onClearFilterTypes();
                          return;
                        }
                        setFilterTypes([]);
                      }}
                    />
                    <AccountTagFilterDropdown
                      availableTags={memberAvailableTags}
                      selectedTags={memberTagFilter}
                      onToggleTag={(value) => {
                        if (memberView) {
                          memberView.onToggleTagFilter(value);
                          return;
                        }
                        setTagFilter((prev) =>
                          prev.includes(value)
                            ? prev.filter((item) => item !== value)
                            : [...prev, value],
                        );
                      }}
                      onClear={() => {
                        if (memberView) {
                          memberView.onClearTagFilter();
                          return;
                        }
                        setTagFilter([]);
                      }}
                    />
                    <MultiSelectFilterDropdown
                      options={memberGroupFilterOptions}
                      selectedValues={memberGroupFilter}
                      allLabel={t("accounts.groups.allGroups", "Tất cả nhóm")}
                      filterLabel={t("accounts.groups.manageTitle", "Quản lý nhóm")}
                      clearLabel={t("accounts.clearFilter", "Xóa bộ lọc")}
                      emptyLabel={t("common.none", "None​")}
                      ariaLabel={t("accounts.groups.manageTitle", "Quản lý nhóm")}
                      onToggleValue={(value) => {
                        if (memberView) {
                          memberView.onToggleGroupFilter(value);
                          return;
                        }
                        setGroupFilter((prev) =>
                          prev.includes(value)
                            ? prev.filter((item) => item !== value)
                            : [...prev, value],
                        );
                      }}
                      onClear={() => {
                        if (memberView) {
                          memberView.onClearGroupFilter();
                          return;
                        }
                        setGroupFilter([]);
                      }}
                    />
                  </div>
                </div>

                <div className="group-account-item group-account-item-header">
                  <input
                    ref={selectAllCheckboxRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={
                      membersInteractionDisabled ||
                      visibleEnabledAccounts.length === 0
                    }
                  />
                  <div className="group-account-main" />
                </div>

                <div className="group-account-list codex-local-access-member-list">
                  {!accountsLoaded ? (
                    <div className="group-account-empty">
                      {t("common.loading", "Đang tải...")}
                    </div>
                  ) : localAccessAccounts.length === 0 &&
                    grokMemberRowAccounts.length === 0 &&
                    !grokMemberLoading ? (
                    <div className="group-account-empty">
                      {t(
                        "codex.localAccess.modal.empty",
                        "Không có tài khoản OAuth khả dụng",
                      )}
                    </div>
                  ) : visibleSelectableAccounts.length === 0 &&
                    grokMemberRowAccounts.length === 0 &&
                    !grokMemberLoading ? (
                    <div className="group-account-empty">
                      {t("common.shared.noMatch.title", "Không có tài khoản phù hợp")}
                    </div>
                  ) : (
                    paginatedVisibleSelectableAccounts.map((account) => {
                      const presentation = buildCodexAccountPresentation(
                        account,
                        t,
                      );
                      const ineligibleReason =
                        getCodexLocalAccessAccountIneligibleReason(
                          account,
                          restrictFreeAccounts,
                        );
                      const isPendingOauthUnsupported =
                        ineligibleReason === "pending_oauth";
                      const isWebSessionUnsupported =
                        ineligibleReason === "web_session_quota_only";
                      const isJoinUnsupported =
                        isPendingOauthUnsupported || isWebSessionUnsupported;
                      const grokRowAccount = grokMemberRowAccountById.get(
                        account.id,
                      );
                      const grokBoundAccountId = grokRowAccount
                        ? grokMemberBindingByAccountId.get(grokRowAccount.id)
                        : undefined;
                      const rowAccountId = grokBoundAccountId ?? account.id;
                      const isChecked =
                        !isJoinUnsupported && selected.has(rowAccountId);
                      const grokRowBusy =
                        Boolean(grokRowAccount) &&
                        grokMemberBusyId === grokRowAccount?.id;
                      const usagePriority = resolveAccountUsagePriority(
                        customRoutingDraft[rowAccountId] ??
                          customRoutingRuleByAccountId.get(rowAccountId),
                      );
                      const accountStats = allStatsByAccountId.get(
                        rowAccountId,
                      )?.usage;
                      const grokQuotaChip = grokRowAccount ? (
                        <CodexGrokBuildQuotaChip t={t} account={grokRowAccount} />
                      ) : null;

                      return (
                        <div
                          key={account.id}
                          className={`group-account-item${isChecked ? " is-current" : ""}${isJoinUnsupported ? " is-disabled" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="codex-local-access-member-select"
                            checked={isChecked}
                            disabled={
                              membersInteractionDisabled ||
                              isJoinUnsupported ||
                              grokRowBusy
                            }
                            onChange={() =>
                              grokRowAccount
                                ? void handleToggleGrokMember(
                                    grokRowAccount,
                                    !isChecked,
                                  )
                                : toggleSelect(account.id)
                            }
                            aria-label={maskAccountText(
                              presentation.displayName,
                            )}
                          />
                          <div className="group-account-main">
                            <div className="codex-local-access-member-mainline">
                              <button
                                type="button"
                                className="group-account-email"
                                title={maskAccountText(
                                  presentation.displayName,
                                )}
                                disabled={
                                  membersInteractionDisabled ||
                                  isJoinUnsupported ||
                                  grokRowBusy
                                }
                                onClick={() =>
                                  grokRowAccount
                                    ? void handleToggleGrokMember(
                                        grokRowAccount,
                                        !isChecked,
                                      )
                                    : toggleSelect(account.id)
                                }
                              >
                                {maskAccountText(presentation.displayName)}
                              </button>
                              <span
                                className="codex-local-access-member-priority-slot"
                                title={t(
                                  "codex.localAccess.memberPriorityDesc",
                                  "Cao nhất được dùng trước, Bình thường theo quy tắc hiện tại, còn Thấp nhất chỉ dùng khi các tài khoản khác không khả dụng.",
                                )}
                              >
                                {!isJoinUnsupported ? (
                                  <>
                                    <span className="codex-local-access-member-priority-label">
                                      {t(
                                        "codex.localAccess.memberPriorityLabel",
                                        "Ưu tiên",
                                      )}
                                    </span>
                                    <SingleSelectDropdown
                                      value={usagePriority}
                                      options={memberPriorityOptions}
                                      className="codex-local-access-member-priority-dropdown"
                                      menuClassName="codex-local-access-member-priority-menu"
                                      menuWidth={112}
                                      menuMaxHeight={180}
                                      ariaLabel={t(
                                        "codex.localAccess.memberPriorityLabel",
                                        "Ưu tiên",
                                      )}
                                      disabled={
                                        membersInteractionDisabled ||
                                        grokRowBusy ||
                                        (Boolean(grokRowAccount) &&
                                          !grokBoundAccountId)
                                      }
                                      onChange={(value) =>
                                        updateMemberUsagePriority(
                                          rowAccountId,
                                          value as AccountUsagePriority,
                                        )
                                      }
                                    />
                                  </>
                                ) : null}
                              </span>
                              <span className="codex-local-access-member-plan">
                                {!isJoinUnsupported && (
                                  <SingleSelectDropdown
                                    value={
                                      imageGenerationPolicies[rowAccountId] ??
                                      (isCodexApiKeyAccount(account)
                                        ? "disabled"
                                        : "inherit")
                                    }
                                    options={imageGenerationPolicyOptions}
                                    className="codex-local-access-member-image-policy-dropdown"
                                    menuClassName="codex-local-access-member-image-policy-menu"
                                    menuWidth={120}
                                    ariaLabel={t(
                                      "codex.localAccess.imagePolicy.label",
                                      "Chính sách hình ảnh",
                                    )}
                                    disabled={
                                      membersInteractionDisabled ||
                                      grokRowBusy ||
                                      (Boolean(grokRowAccount) && !grokBoundAccountId)
                                    }
                                    onChange={(value) =>
                                      setImageGenerationPolicies((prev) => ({
                                        ...prev,
                                        [rowAccountId]:
                                          value as CodexLocalAccessImageGenerationPolicy,
                                      }))
                                    }
                                  />
                                )}
                                <span
                                  className={`tier-badge ${presentation.planClass}`}
                                >
                                  {grokRowAccount
                                    ? t("codex.grokAdd.tab", "Tài khoản Grok")
                                    : presentation.planLabel}
                                </span>
                              </span>
                              <span className="codex-local-access-member-metric">
                                {t("codex.localAccess.stats.accountRequests", {
                                  count: accountStats?.requestCount ?? 0,
                                  defaultValue: "{{count}} yêu cầu",
                                })}
                              </span>
                              <span className="codex-local-access-member-trailing">
                                {isPendingOauthUnsupported && (
                                  <span className="codex-local-access-member-unsupported">
                                    {t(
                                      "codex.localAccess.modal.pendingOauthUnsupported",
                                      "Chờ xác thực: không",
                                    )}
                                  </span>
                                )}
                                {isWebSessionUnsupported && (
                                  <span className="codex-local-access-member-unsupported">
                                    {t(
                                      "codex.webSessionImport.apiIneligible",
                                      "Web Session chỉ hạn mức, không API",
                                    )}
                                  </span>
                                )}
                                {grokQuotaChip ??
                                  renderQuotaPreview(presentation, 2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {grokMemberError && (
                  <div className="group-account-empty codex-local-access-grok-member-error">
                    {grokMemberError}
                  </div>
                )}
                {visibleSelectableAccounts.length > 0 && (
                  <PaginationControls
                    totalItems={memberPagination.totalItems}
                    currentPage={memberPagination.currentPage}
                    totalPages={memberPagination.totalPages}
                    pageSize={memberPagination.pageSize}
                    pageSizeOptions={memberPagination.pageSizeOptions}
                    rangeStart={memberPagination.rangeStart}
                    rangeEnd={memberPagination.rangeEnd}
                    canGoPrevious={memberPagination.canGoPrevious}
                    canGoNext={memberPagination.canGoNext}
                    onPageSizeChange={memberPagination.setPageSize}
                    onPreviousPage={memberPagination.goToPreviousPage}
                    onNextPage={memberPagination.goToNextPage}
                  />
                )}
              </section>
            )}
          </div>

          <div className="modal-footer group-account-picker-footer codex-local-access-modal-footer">
            {isMembersMode ? (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  {t("common.cancel")}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => void handleSaveMembers()}
                  disabled={membersInteractionDisabled || !selectionDirty}
                >
                  {saving
                    ? t("common.saving")
                    : t("codex.localAccess.modal.save", "Lưu bộ")}
                </button>
              </>
            ) : (
              <button
                className="btn btn-secondary"
                onClick={onClose}
              >
                {t("common.close")}
              </button>
            )}
          </div>
        </div>
      </div>

      {customRoutingOpen && collection && (
        <div className="modal-overlay codex-local-access-custom-routing-overlay">
          <div
            className="modal codex-local-access-custom-routing-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-local-access-custom-routing-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header codex-local-access-custom-routing-header">
              <div>
                <h3 id="codex-local-access-custom-routing-title">
                  <SlidersHorizontal size={18} />
                  <span>
                    {t("codex.localAccess.customRoutingTitle", "Định tuyến tùy chỉnh")}
                  </span>
                </h3>
                <p>
                  {t(
                    "codex.localAccess.customRoutingDesc",
                    "Đặt mức ưu tiên và trọng số để điều khiển thứ tự chọn tài khoản và phân tải.",
                  )}
                </p>
              </div>
              <button
                className="modal-close codex-local-access-custom-routing-close"
                onClick={closeCustomRoutingDialog}
                disabled={saving}
                aria-label={t("common.close")}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body codex-local-access-custom-routing-body">
              {customRoutingError && (
                <div
                  className="codex-local-access-inline-error"
                  aria-live="assertive"
                >
                  <CircleAlert size={14} />
                  <span>{customRoutingError}</span>
                </div>
              )}

              <div className="codex-local-access-custom-routing-guide">
                <div className="codex-local-access-custom-routing-guide-card">
                  <strong>
                    {t(
                      "codex.localAccess.customRoutingPriorityTitle",
                      "Ưu tiên",
                    )}
                  </strong>
                  <span>
                    {t(
                      "codex.localAccess.customRoutingPriorityDesc",
                      "Giá trị cao hơn được chọn trước; tài khoản ưu tiên thấp chỉ được thử khi nhóm ưu tiên cao không khả dụng.",
                    )}
                  </span>
                </div>
                <div className="codex-local-access-custom-routing-guide-card">
                  <strong>
                    {t("codex.localAccess.customRoutingWeightTitle", "Trọng số")}
                  </strong>
                  <span>
                    {t(
                      "codex.localAccess.customRoutingWeightDesc",
                      "Dùng để cân bằng tải trong cùng mức ưu tiên. Trọng số càng cao thì nhận càng nhiều yêu cầu.",
                    )}
                  </span>
                </div>
              </div>

              <div className="codex-local-access-custom-routing-toolbar">
                <div className="group-account-search codex-local-access-custom-routing-search">
                  <Search size={16} className="group-account-search-icon" />
                  <input
                    type="text"
                    value={customRoutingQuery}
                    onChange={(event) =>
                      setCustomRoutingQuery(event.target.value)
                    }
                    placeholder={t(
                      "codex.localAccess.customRoutingSearch",
                      "Tìm email, gói hoặc ID tài khoản",
                    )}
                  />
                </div>
                <div className="group-account-picker-filters codex-local-access-custom-routing-filters">
                  <MultiSelectFilterDropdown
                    options={customRoutingTierFilterOptions}
                    selectedValues={customRoutingFilterTypes}
                    allLabel={customRoutingAllTierFilterLabel}
                    filterLabel={t("common.shared.filterLabel", "Bộ lọc")}
                    clearLabel={t("accounts.clearFilter", "Xóa bộ lọc")}
                    emptyLabel={t("common.none", "None​")}
                    ariaLabel={t("common.shared.filterLabel", "Bộ lọc")}
                    onToggleValue={(value) =>
                      setCustomRoutingFilterTypes((prev) =>
                        prev.includes(value)
                          ? prev.filter((item) => item !== value)
                          : [...prev, value],
                      )
                    }
                    onClear={() => setCustomRoutingFilterTypes([])}
                  />
                  <AccountTagFilterDropdown
                    availableTags={customRoutingAvailableTags}
                    selectedTags={customRoutingTagFilter}
                    onToggleTag={(value) =>
                      setCustomRoutingTagFilter((prev) =>
                        prev.includes(value)
                          ? prev.filter((item) => item !== value)
                          : [...prev, value],
                      )
                    }
                    onClear={() => setCustomRoutingTagFilter([])}
                  />
                </div>
                <div className="codex-local-access-custom-routing-bulk">
                  <span className="codex-local-access-custom-routing-selected-count">
                    {t("codex.localAccess.customRoutingSelected", {
                      count: customRoutingSelected.size,
                      defaultValue: "Đã chọn {{count}}",
                    })}
                  </span>
                  <label>
                    <span>
                      {t(
                        "codex.localAccess.customRoutingPriorityShort",
                        "Ưu tiên",
                      )}
                    </span>
                    <input
                      type="number"
                      min={CUSTOM_ROUTING_PRIORITY_MIN}
                      max={CUSTOM_ROUTING_PRIORITY_MAX}
                      value={customRoutingBulkPriority}
                      onChange={(event) =>
                        setCustomRoutingBulkPriority(event.target.value)
                      }
                      disabled={saving}
                    />
                  </label>
                  <label>
                    <span>
                      {t("codex.localAccess.customRoutingWeightShort", "Trọng số")}
                    </span>
                    <input
                      type="number"
                      min={CUSTOM_ROUTING_WEIGHT_MIN}
                      max={CUSTOM_ROUTING_WEIGHT_MAX}
                      value={customRoutingBulkWeight}
                      onChange={(event) =>
                        setCustomRoutingBulkWeight(event.target.value)
                      }
                      disabled={saving}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={applyCustomRoutingBatch}
                    disabled={saving || customRoutingSelected.size === 0}
                  >
                    {t(
                      "codex.localAccess.customRoutingApplyBatch",
                      "Áp dụng cho mục chọn",
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={resetCustomRoutingDraft}
                    disabled={saving || customRoutingAccounts.length === 0}
                  >
                    {t("codex.localAccess.customRoutingReset", "Đặt lại")}
                  </button>
                </div>
              </div>

              <div className="codex-local-access-custom-routing-list-shell">
                <div className="codex-local-access-custom-routing-row codex-local-access-custom-routing-row-head">
                  <input
                    ref={customRoutingSelectAllRef}
                    type="checkbox"
                    checked={allVisibleCustomRoutingSelected}
                    onChange={toggleCustomRoutingSelectAllVisible}
                    disabled={
                      saving || visibleCustomRoutingAccounts.length === 0
                    }
                    aria-label={t("common.selectAll", "Chọn tất cả")}
                  />
                  <span>
                    {t("codex.localAccess.customRoutingAccountColumn", "Tài khoản")}
                  </span>
                  <span>
                    {t("codex.localAccess.customRoutingQuotaColumn", "Hạn mức")}
                  </span>
                  <span>
                    {t(
                      "codex.localAccess.customRoutingPriorityShort",
                      "Ưu tiên",
                    )}
                  </span>
                  <span>
                    {t("codex.localAccess.customRoutingWeightShort", "Trọng số")}
                  </span>
                </div>

                <div className="codex-local-access-custom-routing-list">
                  {customRoutingAccounts.length === 0 ? (
                    <div className="group-account-empty">
                      {t(
                        "codex.localAccess.customRoutingEmpty",
                        "Không có tài khoản có thể cấu hình trong bộ sưu tập dịch vụ API hiện tại",
                      )}
                    </div>
                  ) : visibleCustomRoutingAccounts.length === 0 ? (
                    <div className="group-account-empty">
                      {t("common.shared.noMatch.title", "Không có tài khoản phù hợp")}
                    </div>
                  ) : (
                    visibleCustomRoutingAccounts.map((account) => {
                      const presentation = buildCodexAccountPresentation(
                        account,
                        t,
                      );
                      const draftRule = customRoutingDraft[account.id] ?? {
                        priority: CUSTOM_ROUTING_PRIORITY_MIN,
                        weight: CUSTOM_ROUTING_WEIGHT_MIN,
                        isBackup: false,
                        isPreferred: false,
                      };
                      const checked = customRoutingSelected.has(account.id);

                      return (
                        <div
                          key={account.id}
                          className={`codex-local-access-custom-routing-row${
                            checked ? " is-selected" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleCustomRoutingSelect(account.id)
                            }
                            disabled={saving}
                          />
                          <div className="codex-local-access-custom-routing-account">
                            <span
                              className="group-account-email"
                              title={maskAccountText(presentation.displayName)}
                            >
                              {maskAccountText(presentation.displayName)}
                            </span>
                            <span
                              className={`tier-badge ${presentation.planClass}`}
                            >
                              {presentation.planLabel}
                            </span>
                            {(draftRule.isBackup || draftRule.isPreferred) && (
                              <span
                                className="codex-local-access-custom-routing-usage-priority-badge"
                                title={t(
                                  "codex.localAccess.memberPriorityDesc",
                                  "Cao nhất được dùng trước, Bình thường theo quy tắc hiện tại, còn Thấp nhất chỉ dùng khi các tài khoản khác không khả dụng.",
                                )}
                              >
                                {t(
                                  draftRule.isPreferred
                                    ? "codex.localAccess.memberPriorityHighest"
                                    : "codex.localAccess.memberPriorityLowest",
                                  draftRule.isPreferred ? "Cao nhất" : "Thấp nhất",
                                )}
                              </span>
                            )}
                          </div>
                          <div className="codex-local-access-custom-routing-quota">
                            {renderQuotaPreview(presentation, 2) ?? (
                              <span className="codex-local-access-custom-routing-muted">
                                {t("common.none", "None​")}
                              </span>
                            )}
                          </div>
                          <label className="codex-local-access-custom-routing-number-field is-priority">
                            <span>
                              {t(
                                "codex.localAccess.customRoutingPriorityShort",
                                "Ưu tiên",
                              )}
                            </span>
                            <input
                              className="codex-local-access-custom-routing-number"
                              type="number"
                              min={CUSTOM_ROUTING_PRIORITY_MIN}
                              max={CUSTOM_ROUTING_PRIORITY_MAX}
                              value={draftRule.priority}
                              onChange={(event) =>
                                updateCustomRoutingRule(
                                  account.id,
                                  "priority",
                                  event.target.value,
                                )
                              }
                              disabled={saving}
                              aria-label={t(
                                "codex.localAccess.customRoutingPriorityShort",
                                "Ưu tiên",
                              )}
                            />
                          </label>
                          <label className="codex-local-access-custom-routing-number-field is-weight">
                            <span>
                              {t(
                                "codex.localAccess.customRoutingWeightShort",
                                "Trọng số",
                              )}
                            </span>
                            <input
                              className="codex-local-access-custom-routing-number"
                              type="number"
                              min={CUSTOM_ROUTING_WEIGHT_MIN}
                              max={CUSTOM_ROUTING_WEIGHT_MAX}
                              value={draftRule.weight}
                              onChange={(event) =>
                                updateCustomRoutingRule(
                                  account.id,
                                  "weight",
                                  event.target.value,
                                )
                              }
                              disabled={saving}
                              aria-label={t(
                                "codex.localAccess.customRoutingWeightShort",
                                "Trọng số",
                              )}
                            />
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer codex-local-access-custom-routing-footer">
              <button
                className="btn btn-secondary"
                onClick={closeCustomRoutingDialog}
                disabled={saving}
              >
                {t("common.cancel")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleSaveCustomRouting()}
                disabled={saving || customRoutingAccounts.length === 0}
              >
                {saving
                  ? t("common.saving")
                  : t("codex.localAccess.customRoutingSave", "Lưu định tuyến")}
              </button>
            </div>
          </div>
        </div>
      )}

      {testDialogOpen && (
        <div className="modal-overlay codex-local-access-test-dialog-overlay">
          <div
            className="modal codex-local-access-test-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-local-access-test-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header codex-local-access-test-dialog-header">
              <div>
                <h3 id="codex-local-access-test-dialog-title">
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
                onClick={closeTestDialog}
                disabled={testDialogBusy}
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
                    options={modelIdOptions}
                    onChange={setSelectedModelId}
                    disabled={modelIdOptions.length === 0 || testDialogBusy}
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
                  disabled={testDialogBusy || testChatMessages.length === 0}
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
                disabled={testDialogBusy}
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
                  testDialogBusy || !testChatInput.trim() || !selectedModelId
                }
              >
                <Send size={15} />
                {t("codex.localAccess.testChatSend", "Gửi")}
              </button>
              <button
                className="btn btn-secondary"
                onClick={closeTestDialog}
                disabled={testDialogBusy}
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
      <CodexAccountPoolHealthModal
        isOpen={healthModalOpen}
        accountIds={collection?.accountIds ?? []}
        accounts={accounts}
        accountHealth={state?.accountHealth ?? []}
        accountPoolHealth={state?.accountPoolHealth ?? []}
        recoverySuppressedAccountIds={
          state?.recoverySuppressedAccountIds ?? []
        }
        actionBusy={healthActionBusy}
        maskAccountText={(value) => maskAccountText(value)}
        onClose={() => setHealthModalOpen(false)}
        onRecover={(accountId) => onRecoverAccounts([accountId])}
        onRecoverAll={onRecoverAccounts}
      />
    </>
  );
}

export default CodexLocalAccessModal;
