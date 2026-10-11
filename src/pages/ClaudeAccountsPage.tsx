import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  CalendarDays,
  CircleAlert,
  Clock3,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  FileJson,
  FolderOpen,
  Globe,
  KeyRound,
  Layers,
  LayoutGrid,
  List,
  Monitor,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Star,
  Tag,
  Terminal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import md5 from 'blueimp-md5';
import { ModalErrorMessage, useModalErrorState } from '../components/ModalErrorMessage';
import { ExportJsonModal } from '../components/ExportJsonModal';
import { AccountSelectionToolbar } from '../components/AccountSelectionToolbar';
import { ManualHelpIconButton } from '../components/ManualHelpIconButton';
import { QuickSettingsPopover } from '../components/QuickSettingsPopover';
import { SingleSelectDropdown } from '../components/SingleSelectDropdown';
import { TagEditModal } from '../components/TagEditModal';
import { ClaudeIcon } from '../components/icons/ClaudeIcon';
import { ClaudeDesktopRuntimeManager } from '../components/claude/ClaudeDesktopRuntimeManager';
import { ModelProviderUsagePanel } from '../components/model-provider/ModelProviderUsagePanel';
import { PlatformGroupSwitcher } from '../components/platform/PlatformGroupSwitcher';
import { useEscClose } from '../hooks/useEscClose';
import { useEnterConfirm } from '../hooks/useEnterConfirm';
import { useExportJsonModal } from '../hooks/useExportJsonModal';
import { useLaunchTerminalOptions } from '../hooks/useLaunchTerminalOptions';
import { usePlatformAccountGroups } from '../hooks/usePlatformAccountGroups';
import { getProviderCurrentAccountId, type ProviderCurrentPlatform } from '../services/providerCurrentAccountService';
import {
  isModelProviderUsageUnavailableError,
  queryModelProviderUsage,
  type ModelProviderUsageSummary,
} from '../services/modelProviderUsageService';
import { compareCurrentAccountFirst } from '../utils/currentAccountSort';
import { isPrivacyModeEnabledByDefault, maskSensitiveValue, persistPrivacyModeEnabled } from '../utils/privacy';
import * as claudeService from '../services/claudeService';
import * as claudeInstanceService from '../services/claudeInstanceService';
import { useClaudeAccountStore } from '../stores/useClaudeAccountStore';
import { useClaudeInstanceStore } from '../stores/useClaudeInstanceStore';
import {
  findGroupByPlatform,
  resolveGroupChildName,
  usePlatformLayoutStore,
} from '../stores/usePlatformLayoutStore';
import { useRemoteConfigStore } from '../stores/useRemoteConfigStore';
import type {
  ClaudeAccount,
  ClaudeDesktopGatewayConnectionMode,
  ClaudeDesktopGatewayModelMapping,
  ClaudeDesktopLoginStartResponse,
  ClaudeDesktopLoginProgressPayload,
  ClaudeOAuthStartResponse,
} from '../types/claude';
import { isMenuVisiblePlatform, type PlatformId } from '../types/platform';
import {
  formatClaudeResetTime,
  getClaudeAccountDisplayEmail,
  getClaudeApiProviderLabel,
  getClaudeAuthModeLabel,
  getClaudePlanBadge,
  getClaudePlanBadgeClass,
  isClaudeDesktopGatewayAccount,
  isClaudeDesktopOAuthAccount,
  isClaudeDesktopRuntimeAccount,
  normalizeClaudeAuthMode,
} from '../types/claude';
import {
  resolveClaudeDisplayPercentage,
  resolveClaudeQuotaClassForDisplayValue,
} from '../utils/claudeQuotaDisplayPreference';
import {
  CLAUDE_APIKEY_FUN_BASE_URL,
  CLAUDE_APIKEY_FUN_PROVIDER_ID,
  CLAUDE_API_PROVIDER_CUSTOM_ID,
  CLAUDE_API_PROVIDER_PRESETS,
  getDefaultClaudeApiProviderPresetId,
  findClaudeApiProviderPresetById,
  inferClaudeApiKeyField,
  normalizeClaudeApiProviderBaseUrl,
} from '../utils/claudeProviderPresets';
import {
  CLAUDE_DESKTOP_GATEWAY_DEFAULT_MODELS,
  CLAUDE_DESKTOP_GATEWAY_PROVIDER_CUSTOM_ID,
  CLAUDE_DESKTOP_GATEWAY_PROVIDER_PRESETS,
  findClaudeDesktopGatewayProviderPresetById,
  getDefaultClaudeDesktopGatewayProviderPresetId,
  inferClaudeDesktopGatewayApiKeyField,
} from '../utils/claudeDesktopProviderPresets';
import {
  APIKEY_FUN_PREFILL_EVENT,
  consumeApiKeyFunPrefill,
  type ApiKeyFunPrefillPayload,
} from '../utils/apiKeyFunPrefill';
import { getPlatformLabel } from '../utils/platformMeta';
import {
  applyClaudeApiProviderTemplateValue,
  getClaudeApiProviderTemplateInitialValues,
  resolveClaudeApiProviderExtraEnv,
} from '../utils/claudeApiProviderTemplates';
import {
  persistLastClaudeCliWorkingDir,
  readLastClaudeCliWorkingDir,
  sanitizeClaudeCliInstanceName,
} from '../utils/claudeCliLaunchPreferences';
import { ClaudeInstancesContent } from './ClaudeInstancesPage';
import type { InstanceProfile } from '../types/instance';

const CLAUDE_FLOW_NOTICE_COLLAPSED_KEY = 'agtools.claude.flow_notice_collapsed';
const CLAUDE_ACCOUNTS_VIEW_MODE_KEY = 'agtools.claude.accounts_view_mode';
const CLAUDE_API_KEY_USAGE_CACHE_KEY = 'agtools.claude.apiKeyUsage.cache.v1';
const CLAUDE_API_KEY_USAGE_REFRESH_THROTTLE_MS = 10 * 1000;
const CLAUDE_DESKTOP_LOGIN_PROGRESS_EVENT = 'claude:desktop-login-progress';
const claudeApiKeyUsageInFlight = new Set<string>();
const claudeApiKeyUsageManualRefreshAt: Record<string, number> = {};

function isClaudeCloudflareError(message?: string | null): boolean {
  const normalized = message?.toLowerCase() ?? '';
  return (
    normalized.includes('cloudflare') ||
    normalized.includes('just a moment') ||
    normalized.includes('cf-ray') ||
    normalized.includes('challenge-platform') ||
    normalized.includes('verify you are human') ||
    normalized.includes('checking your browser')
  );
}

function createClaudeDesktopLoginProgressId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `claude-login-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clampProgressPercent(value?: number | null): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatProgressBytes(value?: number | null): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${Math.round(value)} B`;
}

function getClaudeDesktopLoginProgressLabel(
  t: TFunction,
  progress?: ClaudeDesktopLoginProgressPayload | null,
): string {
  switch (progress?.phase) {
    case 'start':
      return t('claude.desktopOAuth.progress.start', "Đang chuẩn bị đăng nhập");
    case 'profile':
      return t('claude.desktopOAuth.progress.profile', "Đang tạo profile tách biệt");
    case 'resolve-runtime':
      return t('claude.desktopOAuth.progress.resolveRuntime', "Đang tìm thành phần đăng nhập");
    case 'check-cache':
      return t('claude.desktopOAuth.progress.checkCache', "Đang kiểm tra bộ nhớ đệm cục bộ");
    case 'cached':
      return t('claude.desktopOAuth.progress.cached', "Đang dùng bộ nhớ đệm cục bộ");
    case 'download-start':
      return t('claude.desktopOAuth.progress.downloadStart', "Bắt đầu tải thành phần");
    case 'downloading':
      return t('claude.desktopOAuth.progress.downloading', "Đang tải thành phần đăng nhập");
    case 'downloaded':
      return t('claude.desktopOAuth.progress.downloaded', "Đã tải thành phần đăng nhập");
    case 'verify':
      return t('claude.desktopOAuth.progress.verify', "Đang kiểm tra tính toàn vẹn");
    case 'extract':
      return t('claude.desktopOAuth.progress.extract', "Đang giải nén thành phần đăng nhập");
    case 'runtime-ready':
      return t('claude.desktopOAuth.progress.runtimeReady', "Thành phần đăng nhập đã sẵn sàng");
    case 'launch':
      return t('claude.desktopOAuth.progress.launch', "Đang mở cửa sổ đăng nhập Claude");
    case 'ready':
      return t('claude.desktopOAuth.progress.ready', "Cửa sổ đăng nhập đã mở");
    default:
      return t('claude.desktopOAuth.progress.default', "Đang chuẩn bị thành phần đăng nhập");
  }
}

function getClaudeDesktopLoginProgressDetail(
  t: TFunction,
  progress?: ClaudeDesktopLoginProgressPayload | null,
): string {
  const downloaded = formatProgressBytes(progress?.downloadedBytes);
  const total = formatProgressBytes(progress?.totalBytes);
  if (progress?.phase === 'downloading' || progress?.phase === 'downloaded') {
    if (downloaded && total) {
      return t('claude.desktopOAuth.progress.bytesWithTotal', "Đã tải {{downloaded}} trên {{total}}", {
        downloaded,
        total,
      });
    }
    if (downloaded) {
      return t('claude.desktopOAuth.progress.bytesOnly', "Đã tải {{downloaded}}", { downloaded });
    }
  }
  return t('claude.desktopOAuth.progress.hint', "Sau lần chuẩn bị đầu tiên, bộ nhớ đệm cục bộ sẽ được dùng lại trực tiếp.");
}

type ViewMode = 'grid' | 'list';
type AddTab = 'desktop' | 'desktopGateway' | 'oauth' | 'apikey' | 'import';
type ClaudeSubPlatform = 'desktop' | 'cli';
type ClaudePageSection = ClaudeSubPlatform | 'instances';
const DEFAULT_CLAUDE_API_PROVIDER_ID = getDefaultClaudeApiProviderPresetId();
const DEFAULT_CLAUDE_API_PROVIDER = findClaudeApiProviderPresetById(DEFAULT_CLAUDE_API_PROVIDER_ID);
const DEFAULT_CLAUDE_DESKTOP_GATEWAY_PROVIDER_ID = getDefaultClaudeDesktopGatewayProviderPresetId();
const DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS = [...CLAUDE_DESKTOP_GATEWAY_DEFAULT_MODELS];
const CLAUDE_DESKTOP_GATEWAY_GENERATED_ROUTE_BASE = 'claude-sonnet-4-6';
const CLAUDE_DESKTOP_GATEWAY_CUSTOM_DESKTOP_MODEL = '__custom_desktop_model__';

type ClaudeApiKeyUsageState = {
  loading: boolean;
  summary?: ModelProviderUsageSummary;
  error?: string;
  unavailable?: boolean;
  updatedAt?: number;
};

interface ClaudeAccountsPageProps {
  subPlatform?: ClaudeSubPlatform;
}

interface DeleteConfirmState {
  accountIds: string[];
  email: string;
}

interface ClaudeCliLaunchModalState {
  accountId: string;
  accountEmail: string;
  instanceId: string | null;
  workingDir: string;
  instanceName: string;
  launchCommand: string;
  preparing: boolean;
  copied: boolean;
  executing: boolean;
  executeMessage: string | null;
  executeError: string | null;
}

function joinFilePath(directory: string, fileName: string): string {
  if (!directory) return fileName;
  const separator = directory.includes('\\') ? '\\' : '/';
  return directory.endsWith(separator) ? `${directory}${fileName}` : `${directory}${separator}${fileName}`;
}

function normalizePathForCompare(value?: string | null): string {
  return (value || '').trim();
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '-';
  const value = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  return new Date(value).toLocaleString();
}

function readInitialViewMode(): ViewMode {
  try {
    const value = localStorage.getItem(CLAUDE_ACCOUNTS_VIEW_MODE_KEY);
    if (value === 'grid' || value === 'list') return value;
    if (value === 'compact') return 'list';
  } catch {
    // ignore storage failures
  }
  return 'grid';
}

function readClaudeApiKeyUsageCache(): Record<string, ClaudeApiKeyUsageState> {
  try {
    const raw = localStorage.getItem(CLAUDE_API_KEY_USAGE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const next: Record<string, ClaudeApiKeyUsageState> = {};
    Object.entries(parsed).forEach(([accountId, value]) => {
      if (!value || typeof value !== 'object') return;
      const item = value as {
        summary?: ModelProviderUsageSummary;
        error?: string;
        unavailable?: boolean;
        updatedAt?: number;
      };
      next[accountId] = {
        loading: false,
        summary: item.summary,
        error: typeof item.error === 'string' ? item.error : undefined,
        unavailable: item.unavailable === true,
        updatedAt:
          typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt)
            ? item.updatedAt
            : undefined,
      };
    });
    return next;
  } catch {
    return {};
  }
}

function writeClaudeApiKeyUsageCache(value: Record<string, ClaudeApiKeyUsageState>): void {
  try {
    localStorage.setItem(
      CLAUDE_API_KEY_USAGE_CACHE_KEY,
      JSON.stringify(
        Object.fromEntries(
          Object.entries(value).map(([accountId, item]) => [
            accountId,
            {
              summary: item.summary,
              error: item.error,
              unavailable: item.unavailable === true,
              updatedAt: item.updatedAt,
            },
          ]),
        ),
      ),
    );
  } catch {
    // ignore storage failures
  }
}

function normalizeClaudeApiKeyUsageBaseUrl(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.hash = '';
    url.search = '';
    const pathname = url.pathname.replace(/\/+$/g, '');
    return `${url.protocol}//${url.host}${pathname && pathname !== '/' ? pathname : ''}`;
  } catch {
    return raw.replace(/\/+$/g, '').toLowerCase();
  }
}

function hashClaudeApiKeyUsageIdentity(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getClaudeApiKeyUsageStableCacheKey(account: ClaudeAccount): string | null {
  const apiKey = account.api_key?.trim();
  const baseUrl = normalizeClaudeApiKeyUsageBaseUrl(account.api_base_url);
  if (!apiKey || !baseUrl) return null;
  return `api_key:${hashClaudeApiKeyUsageIdentity(baseUrl)}:${hashClaudeApiKeyUsageIdentity(apiKey)}`;
}

function getClaudeApiKeyUsageRequestKey(account: ClaudeAccount): string {
  return getClaudeApiKeyUsageStableCacheKey(account) ?? account.id;
}

function getClaudeApiKeyUsageCacheKeys(account: ClaudeAccount): string[] {
  const stableKey = getClaudeApiKeyUsageStableCacheKey(account);
  return stableKey && stableKey !== account.id ? [account.id, stableKey] : [account.id];
}

function mergeClaudeApiKeyUsageStates(
  states: Array<ClaudeApiKeyUsageState | undefined>,
): ClaudeApiKeyUsageState | undefined {
  const availableStates = states.filter((state): state is ClaudeApiKeyUsageState => Boolean(state));
  if (availableStates.length === 0) return undefined;

  const newestState = [...availableStates].sort(
    (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  )[0];
  const newestSummaryState = [...availableStates]
    .filter((state) => Boolean(state.summary))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))[0];
  const newestUpdatedAt = Math.max(
    ...availableStates.map((state) => state.updatedAt ?? 0),
  );

  return {
    loading: availableStates.some((state) => state.loading === true),
    summary: newestSummaryState?.summary,
    error: newestState.error,
    unavailable: newestState.unavailable === true,
    updatedAt: newestUpdatedAt > 0 ? newestUpdatedAt : undefined,
  };
}

function getClaudeApiKeyUsageState(
  value: Record<string, ClaudeApiKeyUsageState>,
  account: ClaudeAccount,
): ClaudeApiKeyUsageState | undefined {
  return mergeClaudeApiKeyUsageStates(
    getClaudeApiKeyUsageCacheKeys(account).map((key) => value[key]),
  );
}

function areClaudeApiKeyUsageStatesEqual(
  left?: ClaudeApiKeyUsageState,
  right?: ClaudeApiKeyUsageState,
): boolean {
  return (
    left?.loading === right?.loading &&
    left?.summary === right?.summary &&
    left?.error === right?.error &&
    left?.unavailable === right?.unavailable &&
    left?.updatedAt === right?.updatedAt
  );
}

function setClaudeApiKeyUsageStateForAccount(
  value: Record<string, ClaudeApiKeyUsageState>,
  account: ClaudeAccount,
  state: ClaudeApiKeyUsageState,
): Record<string, ClaudeApiKeyUsageState> {
  let changed = false;
  const next = { ...value };
  getClaudeApiKeyUsageCacheKeys(account).forEach((key) => {
    if (!areClaudeApiKeyUsageStatesEqual(next[key], state)) {
      next[key] = state;
      changed = true;
    }
  });
  return changed ? next : value;
}

function getClaudePlanBadgeLabel(account: ClaudeAccount, t: TFunction): string {
  const plan = getClaudePlanBadge(account);
  if (plan) return plan;
  if (isClaudeDesktopOAuthAccount(account)) {
    return t('claude.desktopOAuth.planUnknown', "Gói chưa rõ");
  }
  return t('accounts.plan.personal', 'Personal');
}

interface ClaudeQuotaSummaryItem {
  key: string;
  label: string;
  percentage: number;
  resetTime?: number | null;
}

function clampQuotaPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function maskClaudeApiKey(value?: string | null): string {
  const raw = value?.trim();
  if (!raw) return '-';
  if (raw.length <= 10) return `${raw.slice(0, 3)}***${raw.slice(-2)}`;
  return `${raw.slice(0, 4)}*****${raw.slice(-4)}`;
}

function parseClaudeDesktopGatewayModels(value: string): string[] {
  const seen = new Set<string>();
  const models: string[] = [];
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((model) => {
      const key = model.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      models.push(model);
    });
  return models;
}

function isClaudeDesktopGatewayRouteModel(value: string): boolean {
  const model = value.trim().toLowerCase();
  return model.startsWith('claude-') || model.startsWith('anthropic/claude-');
}

function getNextClaudeDesktopGatewaySafeModel(usedModels: Iterable<string>): string {
  const used = new Set(
    Array.from(usedModels)
      .map((model) => model.trim().toLowerCase())
      .filter(Boolean),
  );
  const defaultModel = DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS.find(
    (model) => !used.has(model.toLowerCase()),
  );
  if (defaultModel) return defaultModel;

  let index = 2;
  while (used.has(`${CLAUDE_DESKTOP_GATEWAY_GENERATED_ROUTE_BASE}-r${index}`)) {
    index += 1;
  }
  return `${CLAUDE_DESKTOP_GATEWAY_GENERATED_ROUTE_BASE}-r${index}`;
}

function normalizeClaudeDesktopGatewayMode(
  value?: string | null,
): ClaudeDesktopGatewayConnectionMode {
  return value === 'local_mapping' ? 'local_mapping' : 'direct';
}

function buildClaudeDesktopGatewayMappings(
  desktopModels: string[],
  upstreamModels: string[],
): ClaudeDesktopGatewayModelMapping[] {
  const normalizedDesktopModels = desktopModels.map((model) => model.trim()).filter(Boolean);
  const normalizedUpstreamModels = upstreamModels.map((model) => model.trim()).filter(Boolean);
  if (normalizedUpstreamModels.length > 0) {
    const usedDesktopModels = new Set<string>();
    return normalizedUpstreamModels.map((upstreamModel, index) => {
      const preferredModel = normalizedDesktopModels[index] ?? '';
      const preferredKey = preferredModel.toLowerCase();
      const desktopModel = preferredModel
        && isClaudeDesktopGatewayRouteModel(preferredModel)
        && !usedDesktopModels.has(preferredKey)
        ? preferredModel
        : getNextClaudeDesktopGatewaySafeModel(usedDesktopModels);
      usedDesktopModels.add(desktopModel.toLowerCase());
      return {
        desktopModel,
        upstreamModel,
        labelOverride: upstreamModel,
      };
    });
  }
  return normalizedDesktopModels
    .filter(Boolean)
    .map((desktopModel, index) => ({
      desktopModel,
      upstreamModel: upstreamModels[index]?.trim() || '',
    }));
}

function normalizeClaudeDesktopGatewayMappings(
  mappings: ClaudeDesktopGatewayModelMapping[],
): ClaudeDesktopGatewayModelMapping[] {
  const seen = new Set<string>();
  const result: ClaudeDesktopGatewayModelMapping[] = [];
  mappings.forEach((mapping) => {
    const desktopModel = mapping.desktopModel.trim();
    const upstreamModel = mapping.upstreamModel.trim();
    if (!desktopModel || !upstreamModel) return;
    const key = desktopModel.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      desktopModel,
      upstreamModel,
      labelOverride: upstreamModel,
      ...(mapping.supports1m === true ? { supports1m: true } : {}),
    });
  });
  return result;
}

function cloneClaudeDesktopGatewayMappings(
  mappings?: readonly ClaudeDesktopGatewayModelMapping[] | null,
): ClaudeDesktopGatewayModelMapping[] {
  return (mappings ?? []).map((mapping) => ({
    desktopModel: mapping.desktopModel,
    upstreamModel: mapping.upstreamModel,
    labelOverride: mapping.labelOverride ?? null,
    supports1m: mapping.supports1m === true,
  }));
}

function getClaudeDesktopGatewayUpstreamModels(
  mappings: ClaudeDesktopGatewayModelMapping[],
): string[] {
  const seen = new Set<string>();
  const models: string[] = [];
  mappings.forEach((mapping) => {
    const upstreamModel = mapping.upstreamModel.trim();
    const key = upstreamModel.toLowerCase();
    if (!upstreamModel || seen.has(key)) return;
    seen.add(key);
    models.push(upstreamModel);
  });
  return models;
}

function getClaudeDesktopGatewayDuplicateModel(
  mappings: ClaudeDesktopGatewayModelMapping[],
): string | null {
  const seen = new Set<string>();
  for (const mapping of mappings) {
    const desktopModel = mapping.desktopModel.trim();
    if (!desktopModel) continue;
    const key = desktopModel.toLowerCase();
    if (seen.has(key)) return desktopModel;
    seen.add(key);
  }
  return null;
}

function buildClaudeDesktopGatewayDesktopModelOptions(
  customLabel: string,
) {
  const seen = new Set<string>();
  const options = DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS
    .map((model) => model.trim())
    .filter(Boolean)
    .filter((model) => {
      const key = model.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((model) => ({ value: model, label: model }));
  return [
    ...options,
    { value: CLAUDE_DESKTOP_GATEWAY_CUSTOM_DESKTOP_MODEL, label: customLabel },
  ];
}

function isClaudeProviderApiKeyAccount(account: ClaudeAccount): boolean {
  return normalizeClaudeAuthMode(account.auth_mode) === 'api_key' || isClaudeDesktopGatewayAccount(account);
}

function isClaudeApiKeyFunAccount(account: ClaudeAccount): boolean {
  const providerId = account.api_provider_id?.trim().toLowerCase();
  const sourceTag = account.api_provider_source_tag?.trim().toLowerCase();
  const providerName = account.api_provider_name?.trim().toLowerCase();
  const baseUrl = account.api_base_url?.trim().toLowerCase();
  return (
    providerId === CLAUDE_APIKEY_FUN_PROVIDER_ID ||
    sourceTag === 'apikey_fun' ||
    providerName === 'apikey.fan' ||
    providerName === 'apikey.fun' ||
    Boolean(baseUrl && /(^https?:\/\/)?([^/]+\.)?apikey\.(?:fan|fun)(\/|$)/i.test(baseUrl))
  );
}

function buildClaudeQuotaSummaryItems(account: ClaudeAccount, t: TFunction): ClaudeQuotaSummaryItem[] {
  const quota = account.quota;
  if (!quota) return [];
  const items: ClaudeQuotaSummaryItem[] = [
    {
      key: 'five-hour',
      label: t('claude.quota.fiveHour', 'Current session'),
      percentage: resolveClaudeDisplayPercentage(quota.five_hour_percentage),
      resetTime: quota.five_hour_reset_time,
    },
    {
      key: 'seven-day',
      label: t('claude.quota.sevenDay', 'Current week (all models)'),
      percentage: resolveClaudeDisplayPercentage(quota.seven_day_percentage),
      resetTime: quota.seven_day_reset_time,
    },
  ];
  return items;
}

function isClaudeOAuthAuthorizeInput(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return /(^|\.)claude\.com$/i.test(url.hostname) && url.pathname === '/cai/oauth/authorize';
  } catch {
    return trimmed.includes('claude.com/cai/oauth/authorize') || trimmed.includes('code=true&client_id=');
  }
}

function getClaudeCurrentPlatform(subPlatform: ClaudeSubPlatform): ProviderCurrentPlatform {
  return subPlatform === 'desktop' ? 'claude_desktop_account' : 'claude_code_account';
}

function isClaudeJsonExportableAccount(account: ClaudeAccount): boolean {
  return !isClaudeDesktopOAuthAccount(account);
}

export function ClaudeAccountsPage({ subPlatform = 'desktop' }: ClaudeAccountsPageProps) {
  const { t } = useTranslation();
  const claudePlatformId: PlatformId = 'claude_manager';
  const routeInitialSection: ClaudePageSection = subPlatform === 'cli' ? 'cli' : 'desktop';
  const [activeSection, setActiveSection] = useState<ClaudePageSection>(routeInitialSection);
  const activeSubPlatform: ClaudeSubPlatform = activeSection === 'cli' ? 'cli' : 'desktop';
  const { terminalOptions, selectedTerminal, setSelectedTerminal } =
    useLaunchTerminalOptions(activeSubPlatform === 'cli');
  const store = useClaudeAccountStore();
  const claudeInstanceStore = useClaudeInstanceStore();
  const { platformGroups } = usePlatformLayoutStore();
  const remoteHiddenPlatformIds = useRemoteConfigStore((state) => state.hiddenPlatformIds);
  const remoteHiddenPlatformSet = useMemo(
    () => new Set(remoteHiddenPlatformIds),
    [remoteHiddenPlatformIds],
  );
  const currentPlatformGroup = useMemo(
    () => findGroupByPlatform(platformGroups, claudePlatformId),
    [platformGroups, claudePlatformId],
  );
  const claudePlatformLabel = t('nav.claude', 'Claude');
  const switchablePlatforms = useMemo(() => {
    const source = currentPlatformGroup ? currentPlatformGroup.platformIds : [claudePlatformId];
    const visible = source.filter((platformId) =>
      platformId === claudePlatformId ||
      (isMenuVisiblePlatform(platformId) && !remoteHiddenPlatformSet.has(platformId)),
    );
    return visible.includes(claudePlatformId)
      ? visible
      : [claudePlatformId, ...visible];
  }, [currentPlatformGroup, claudePlatformId, remoteHiddenPlatformSet]);
  const platformSwitchOptions = useMemo(
    () =>
      switchablePlatforms.map((platformId) => ({
        platformId,
        label:
          platformId === claudePlatformId
            ? claudePlatformLabel
            : currentPlatformGroup
              ? resolveGroupChildName(
                  currentPlatformGroup,
                  platformId,
                  getPlatformLabel(platformId, t),
                )
              : getPlatformLabel(platformId, t),
      })),
    [claudePlatformId, claudePlatformLabel, currentPlatformGroup, switchablePlatforms, t],
  );
  const [viewMode, setViewMode] = useState<ViewMode>(readInitialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [privacyModeEnabled, setPrivacyModeEnabled] = useState(isPrivacyModeEnabledByDefault);
  const [message, setMessage] = useState<{ text: string; tone?: 'error' | 'success' } | null>(null);
  const [isFlowNoticeCollapsed, setIsFlowNoticeCollapsed] = useState(() => {
    try {
      return localStorage.getItem(CLAUDE_FLOW_NOTICE_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>('desktop');
  const [jsonInput, setJsonInput] = useState('');
  const [importing, setImporting] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyNameInput, setApiKeyNameInput] = useState('');
  const [apiKeyInputVisible, setApiKeyInputVisible] = useState(false);
  const [apiKeyImporting, setApiKeyImporting] = useState(false);
  const [apiProviderPresetId, setApiProviderPresetId] = useState(DEFAULT_CLAUDE_API_PROVIDER_ID);
  const [apiBaseUrlInput, setApiBaseUrlInput] = useState(DEFAULT_CLAUDE_API_PROVIDER?.baseUrls[0] ?? '');
  const [apiProviderTemplateValues, setApiProviderTemplateValues] = useState<Record<string, string>>(
    () => getClaudeApiProviderTemplateInitialValues(DEFAULT_CLAUDE_API_PROVIDER),
  );
  const [apiKeyModelCatalogOverride, setApiKeyModelCatalogOverride] = useState<string[] | null>(null);
  const [desktopGatewayAuthScheme, setDesktopGatewayAuthScheme] = useState('bearer');
  const [desktopGatewayModelsInput, setDesktopGatewayModelsInput] = useState('');
  const [desktopGatewayConnectionMode, setDesktopGatewayConnectionMode] =
    useState<ClaudeDesktopGatewayConnectionMode>('direct');
  const [desktopGatewayUpstreamModels, setDesktopGatewayUpstreamModels] = useState<string[]>([]);
  const [desktopGatewayModelMappings, setDesktopGatewayModelMappings] = useState<ClaudeDesktopGatewayModelMapping[]>([]);
  const [desktopGatewayMappingsExpanded, setDesktopGatewayMappingsExpanded] = useState(false);
  const [desktopGatewayModelsLoading, setDesktopGatewayModelsLoading] = useState(false);
  const [desktopGatewayModelsError, setDesktopGatewayModelsError] = useState<string | null>(null);
  const [desktopGatewayModelsMessage, setDesktopGatewayModelsMessage] = useState<string | null>(null);
  const [editingDesktopGatewayAccountId, setEditingDesktopGatewayAccountId] = useState<string | null>(null);
  const desktopGatewayModelsFetchSignatureRef = useRef('');
  const desktopGatewayModelsFetchRequestRef = useRef(0);
  // Keep React row identity separate from editable values and the persisted mapping shape.
  const desktopGatewayMappingRowKeysRef = useRef(
    new WeakMap<ClaudeDesktopGatewayModelMapping, string>(),
  );
  const desktopGatewayMappingRowKeySequenceRef = useRef(0);
  const [desktopLogin, setDesktopLogin] = useState<ClaudeDesktopLoginStartResponse | null>(null);
  const [desktopLoginProgress, setDesktopLoginProgress] = useState<ClaudeDesktopLoginProgressPayload | null>(null);
  const [desktopAccountNameInput, setDesktopAccountNameInput] = useState('');
  const [desktopStarting, setDesktopStarting] = useState(false);
  const [desktopCompleting, setDesktopCompleting] = useState(false);
  const [cliImportingLocal, setCliImportingLocal] = useState(false);
  const [oauthLogin, setOauthLogin] = useState<ClaudeOAuthStartResponse | null>(null);
  const [oauthCallbackInput, setOauthCallbackInput] = useState('');
  const [oauthEmailHint, setOauthEmailHint] = useState('');
  const [oauthStarting, setOauthStarting] = useState(false);
  const [oauthCompleting, setOauthCompleting] = useState(false);
  const [oauthCopied, setOauthCopied] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [verifyingAccountId, setVerifyingAccountId] = useState<string | null>(null);
  const [apiKeyUsageMap, setApiKeyUsageMap] = useState<Record<string, ClaudeApiKeyUsageState>>(
    () => readClaudeApiKeyUsageCache(),
  );
  const apiKeyUsageInFlightRef = useRef<Set<string>>(claudeApiKeyUsageInFlight);
  const apiKeyUsageManualRefreshAtRef = useRef<Record<string, number>>(claudeApiKeyUsageManualRefreshAt);
  const desktopLoginProgressIdRef = useRef<string | null>(null);
  const desktopLoginProgressUnlistenRef = useRef<UnlistenFn | null>(null);
  const oauthPrepareAttemptedRef = useRef(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [cliLaunchingAccountId, setCliLaunchingAccountId] = useState<string | null>(null);
  const [cliLaunchModal, setCliLaunchModal] = useState<ClaudeCliLaunchModalState | null>(null);
  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null);
  const [tagAccountId, setTagAccountId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  const grouping = usePlatformAccountGroups('claude_manager', clearSelection);
  const [editingAccountNoteId, setEditingAccountNoteId] = useState<string | null>(null);
  const [editingAccountNoteValue, setEditingAccountNoteValue] = useState('');
  const [savingAccountNote, setSavingAccountNote] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [deleting, setDeleting] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    message: addModalError,
    scrollKey: addModalErrorScrollKey,
    set: setAddModalError,
  } = useModalErrorState();
  const {
    message: deleteError,
    scrollKey: deleteErrorScrollKey,
    set: setDeleteError,
  } = useModalErrorState();
  const {
    message: accountNoteError,
    scrollKey: accountNoteErrorScrollKey,
    set: setAccountNoteError,
  } = useModalErrorState();

  const getDesktopGatewayMappingRowKey = useCallback((mapping: ClaudeDesktopGatewayModelMapping) => {
    const existingKey = desktopGatewayMappingRowKeysRef.current.get(mapping);
    if (existingKey) return existingKey;
    desktopGatewayMappingRowKeySequenceRef.current += 1;
    const nextKey = `claude-gateway-mapping-${desktopGatewayMappingRowKeySequenceRef.current}`;
    desktopGatewayMappingRowKeysRef.current.set(mapping, nextKey);
    return nextKey;
  }, []);

  const updateDesktopGatewayModelMapping = useCallback((
    index: number,
    updater: (mapping: ClaudeDesktopGatewayModelMapping) => ClaudeDesktopGatewayModelMapping,
  ) => {
    setDesktopGatewayModelMappings((previous) => {
      const current = previous[index];
      if (!current) return previous;
      const updated = updater(current);
      if (updated === current) return previous;
      desktopGatewayMappingRowKeysRef.current.set(
        updated,
        getDesktopGatewayMappingRowKey(current),
      );
      const next = [...previous];
      next[index] = updated;
      return next;
    });
  }, [getDesktopGatewayMappingRowKey]);

  const exportModal = useExportJsonModal({
    exportFilePrefix: activeSubPlatform === 'desktop' ? 'claude_desktop_accounts' : 'claude_cli_accounts',
    exportJsonByIds: claudeService.exportClaudeAccounts,
    onError: (error) => {
      setMessage({
        text: t('messages.exportFailed', {
          defaultValue: "Xuất thất bại: {{error}}",
          error: String(error).replace(/^Error:\s*/, ''),
        }),
        tone: 'error',
      });
    },
  });

  const getDefaultAddTab = useCallback(
    (platform: ClaudeSubPlatform = activeSubPlatform): AddTab =>
      platform === 'desktop' ? 'desktop' : 'oauth',
    [activeSubPlatform],
  );

  const cleanupDesktopLoginProgressListener = useCallback(() => {
    desktopLoginProgressIdRef.current = null;
    const unlisten = desktopLoginProgressUnlistenRef.current;
    desktopLoginProgressUnlistenRef.current = null;
    if (unlisten) {
      try {
        unlisten();
      } catch {
        // ignore listener cleanup failures
      }
    }
  }, []);

  useEffect(() => cleanupDesktopLoginProgressListener, [cleanupDesktopLoginProgressListener]);

  const resetAddModalState = useCallback((platform: ClaudeSubPlatform = activeSubPlatform) => {
    cleanupDesktopLoginProgressListener();
    setAddTab(getDefaultAddTab(platform));
    setJsonInput('');
    setApiKeyInput('');
    setApiKeyNameInput('');
    setApiKeyInputVisible(false);
    setApiProviderPresetId(DEFAULT_CLAUDE_API_PROVIDER_ID);
    setApiBaseUrlInput(DEFAULT_CLAUDE_API_PROVIDER?.baseUrls[0] ?? '');
    setApiProviderTemplateValues(getClaudeApiProviderTemplateInitialValues(DEFAULT_CLAUDE_API_PROVIDER));
    setApiKeyModelCatalogOverride(null);
    setDesktopGatewayAuthScheme('bearer');
    setDesktopGatewayModelsInput('');
    setDesktopGatewayConnectionMode('direct');
    setDesktopGatewayUpstreamModels([]);
    setDesktopGatewayModelMappings([]);
    setDesktopGatewayMappingsExpanded(false);
    setDesktopGatewayModelsLoading(false);
    setDesktopGatewayModelsError(null);
    setDesktopGatewayModelsMessage(null);
    setEditingDesktopGatewayAccountId(null);
    desktopGatewayModelsFetchSignatureRef.current = '';
    desktopGatewayModelsFetchRequestRef.current += 1;
    setDesktopLogin(null);
    setDesktopLoginProgress(null);
    setDesktopAccountNameInput('');
    setOauthLogin(null);
    setOauthCallbackInput('');
    setOauthEmailHint('');
    setOauthCopied(false);
    oauthPrepareAttemptedRef.current = false;
    setAddModalError(null);
  }, [activeSubPlatform, cleanupDesktopLoginProgressListener, getDefaultAddTab, setAddModalError]);

  const closeAddModal = useCallback(() => {
    if (desktopLogin?.loginId) {
      void claudeService.claudeDesktopLoginCancel(desktopLogin.loginId);
    }
    if (oauthLogin?.loginId) {
      void claudeService.claudeOauthLoginCancel(oauthLogin.loginId);
    }
    resetAddModalState();
    setShowAddModal(false);
  }, [desktopLogin?.loginId, oauthLogin?.loginId, resetAddModalState]);

  useEscClose(showAddModal, closeAddModal);
  useEscClose(Boolean(cliLaunchModal), () => setCliLaunchModal(null));
  useEscClose(Boolean(deleteConfirm) && !deleting, () => setDeleteConfirm(null));

  const refreshCurrentAccountId = useCallback(
    async (platform: ClaudeSubPlatform = activeSubPlatform) => {
      try {
        const accountId = await getProviderCurrentAccountId(getClaudeCurrentPlatform(platform));
        setCurrentAccountId(accountId);
      } catch {
        setCurrentAccountId(null);
      }
    },
    [activeSubPlatform],
  );

  useEffect(() => {
    void store.fetchAccounts();
    void refreshCurrentAccountId();
  }, [refreshCurrentAccountId, store.fetchAccounts]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAUDE_FLOW_NOTICE_COLLAPSED_KEY, String(isFlowNoticeCollapsed));
    } catch {
      // ignore storage failures
    }
  }, [isFlowNoticeCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(CLAUDE_ACCOUNTS_VIEW_MODE_KEY, viewMode);
    } catch {
      // ignore storage failures
    }
  }, [viewMode]);

  useEffect(() => {
    setActiveSection(routeInitialSection);
  }, [routeInitialSection]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeSubPlatform]);

  const maskAccountText = useCallback(
    (value?: string | null) => maskSensitiveValue(value, privacyModeEnabled),
    [privacyModeEnabled],
  );

  const togglePrivacyMode = () => {
    setPrivacyModeEnabled((prev) => {
      const next = !prev;
      persistPrivacyModeEnabled(next);
      return next;
    });
  };

  const desktopAccounts = useMemo(
    () => store.accounts.filter(isClaudeDesktopRuntimeAccount),
    [store.accounts],
  );

  const cliAccounts = useMemo(
    () => store.accounts.filter((account) => !isClaudeDesktopRuntimeAccount(account)),
    [store.accounts],
  );

  const currentSubPlatformAccounts = activeSubPlatform === 'desktop' ? desktopAccounts : cliAccounts;

  const exportableAccountIds = useMemo(
    () => new Set(currentSubPlatformAccounts.filter(isClaudeJsonExportableAccount).map((account) => account.id)),
    [currentSubPlatformAccounts],
  );

  useEffect(() => {
    writeClaudeApiKeyUsageCache(apiKeyUsageMap);
  }, [apiKeyUsageMap]);

  const selectedApiProviderPreset = useMemo(
    () => findClaudeApiProviderPresetById(apiProviderPresetId),
    [apiProviderPresetId],
  );
  const selectedDesktopGatewayProviderPreset = useMemo(
    () => findClaudeDesktopGatewayProviderPresetById(apiProviderPresetId),
    [apiProviderPresetId],
  );
  const selectedFormProviderPreset = addTab === 'desktopGateway'
    ? selectedDesktopGatewayProviderPreset
    : selectedApiProviderPreset;
  const resolvedApiBaseUrlInput = useMemo(
    () => applyClaudeApiProviderTemplateValue(apiBaseUrlInput, apiProviderTemplateValues),
    [apiBaseUrlInput, apiProviderTemplateValues],
  );
  const inferredApiKeyField = useMemo(
    () => inferClaudeApiKeyField(selectedApiProviderPreset, resolvedApiBaseUrlInput),
    [selectedApiProviderPreset, resolvedApiBaseUrlInput],
  );
  const resolvedApiProviderExtraEnv = useMemo(
    () => resolveClaudeApiProviderExtraEnv(selectedApiProviderPreset, apiProviderTemplateValues),
    [selectedApiProviderPreset, apiProviderTemplateValues],
  );

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    currentSubPlatformAccounts.forEach((account) => {
      (account.tags || []).forEach((tag) => {
        const normalized = tag.trim();
        if (normalized) tags.add(normalized);
      });
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [currentSubPlatformAccounts]);

  const tagAccount = useMemo(
    () => store.accounts.find((account) => account.id === tagAccountId) ?? null,
    [store.accounts, tagAccountId],
  );

  const editingAccountNoteAccount = useMemo(
    () => store.accounts.find((account) => account.id === editingAccountNoteId) ?? null,
    [store.accounts, editingAccountNoteId],
  );

  const openAccountNoteModal = useCallback(
    (account: ClaudeAccount) => {
      setEditingAccountNoteId(account.id);
      setEditingAccountNoteValue(account.account_note || '');
      setAccountNoteError(null);
    },
    [setAccountNoteError],
  );

  const closeAccountNoteModal = useCallback(() => {
    if (savingAccountNote) return;
    setEditingAccountNoteId(null);
    setEditingAccountNoteValue('');
    setAccountNoteError(null);
  }, [savingAccountNote, setAccountNoteError]);

  useEscClose(Boolean(editingAccountNoteAccount), closeAccountNoteModal);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let result = [...currentSubPlatformAccounts]
      .filter((account) => {
        if (!query) return true;
        return [
          getClaudeAccountDisplayEmail(account),
          getClaudeApiProviderLabel(account),
          account.api_base_url ?? '',
          account.account_uuid ?? '',
          account.id,
          account.account_note ?? '',
          ...(account.tags || []),
        ].some((value) => value.toLowerCase().includes(query));
      });

    if (grouping.activeGroupId) {
      result = grouping.filterAccountsByGroup(result);
    }

    return result.sort((a, b) => {
      const currentFirstDiff = compareCurrentAccountFirst(
        a.id,
        b.id,
        currentAccountId,
      );
      if (currentFirstDiff !== 0) return currentFirstDiff;
      return (b.last_used || b.created_at) - (a.last_used || a.created_at);
    });
  }, [searchQuery, currentSubPlatformAccounts, grouping, currentAccountId]);

  const filteredIds = useMemo(
    () => filteredAccounts.map((account) => account.id),
    [filteredAccounts],
  );

  const selectedVisibleIds = useMemo(
    () => filteredIds.filter((id) => selectedIds.has(id)),
    [filteredIds, selectedIds],
  );

  const filteredExportableIds = useMemo(
    () => filteredIds.filter((id) => exportableAccountIds.has(id)),
    [exportableAccountIds, filteredIds],
  );

  const selectedExportableIds = useMemo(
    () => selectedVisibleIds.filter((id) => exportableAccountIds.has(id)),
    [exportableAccountIds, selectedVisibleIds],
  );

  const selectedDeletableIds = useMemo(
    () => selectedVisibleIds.filter((id) => id !== currentAccountId),
    [selectedVisibleIds, currentAccountId],
  );

  const isAllFilteredSelected = useMemo(
    () => filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id)),
    [filteredIds, selectedIds],
  );

  useEffect(() => {
    const existingIds = new Set(currentSubPlatformAccounts.map((account) => account.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (existingIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [currentSubPlatformAccounts]);

  useEffect(() => {
    const apiKeyAccounts = currentSubPlatformAccounts.filter(
      (account) => isClaudeProviderApiKeyAccount(account),
    );
    if (apiKeyAccounts.length === 0) return;
    setApiKeyUsageMap((previous) => {
      let changed = false;
      let next: Record<string, ClaudeApiKeyUsageState> = previous;
      apiKeyAccounts.forEach((account) => {
        const mergedState = getClaudeApiKeyUsageState(previous, account);
        if (!mergedState) return;
        const synced = setClaudeApiKeyUsageStateForAccount(next, account, mergedState);
        if (synced !== next) {
          next = synced;
          changed = true;
        }
      });
      return changed ? next : previous;
    });
  }, [currentSubPlatformAccounts]);

  const accountsForInstances = store.accounts;

  const toggleAccountSelection = useCallback((accountId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }, []);

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (filteredIds.length > 0 && filteredIds.every((id) => next.has(id))) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [filteredIds]);

  const openAddModal = () => {
    resetAddModalState(activeSubPlatform);
    setShowAddModal(true);
  };

  function clearDesktopGatewayModelDiscoveryStatus() {
    setDesktopGatewayModelsLoading(false);
    setDesktopGatewayModelsError(null);
    setDesktopGatewayModelsMessage(null);
    desktopGatewayModelsFetchSignatureRef.current = '';
    desktopGatewayModelsFetchRequestRef.current += 1;
  }

  function applyDesktopGatewayProviderPreset(providerId: string) {
    setApiProviderPresetId(providerId);
    setApiKeyModelCatalogOverride(null);
    setApiProviderTemplateValues({});
    clearDesktopGatewayModelDiscoveryStatus();
    setAddModalError(null);

    if (providerId === CLAUDE_DESKTOP_GATEWAY_PROVIDER_CUSTOM_ID) {
      return;
    }

    const preset = findClaudeDesktopGatewayProviderPresetById(providerId);
    if (!preset) return;
    const mappings = cloneClaudeDesktopGatewayMappings(preset.modelMappings);
    setApiBaseUrlInput(preset.baseUrls[0] ?? '');
    setDesktopGatewayAuthScheme(preset.authScheme);
    setDesktopGatewayConnectionMode(preset.connectionMode);
    setDesktopGatewayUpstreamModels(getClaudeDesktopGatewayUpstreamModels(mappings));
    setDesktopGatewayMappingsExpanded(false);
    if (preset.connectionMode === 'local_mapping') {
      const nextMappings = mappings.length > 0
        ? mappings
        : buildClaudeDesktopGatewayMappings(DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS, []);
      setDesktopGatewayModelMappings(nextMappings);
      setDesktopGatewayModelsInput(
        (nextMappings.length > 0
          ? nextMappings.map((mapping) => mapping.desktopModel)
          : DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS
        ).join('\n'),
      );
    } else {
      const directModels = mappings.map((mapping) => mapping.desktopModel).filter(Boolean);
      setDesktopGatewayModelMappings(mappings);
      setDesktopGatewayModelsInput(
        (directModels.length > 0 ? directModels : DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS).join('\n'),
      );
    }
    setApiKeyNameInput(preset.name);
  }

  const openEditDesktopGatewayModal = (account: ClaudeAccount) => {
    if (!isClaudeDesktopGatewayAccount(account)) return;
    resetAddModalState('desktop');
    const providerName = account.api_provider_name?.trim()
      || account.organization_name?.trim()
      || getClaudeApiProviderLabel(account)
      || account.email?.trim()
      || t('claude.desktopGateway.label', 'Gateway');
    const apiKey = account.api_key?.trim() || '';
    const baseUrl = account.api_base_url?.trim() || '';
    const authScheme = account.desktop_gateway_auth_scheme?.trim() || 'bearer';
    setEditingDesktopGatewayAccountId(account.id);
    setShowAddModal(true);
    setAddTab('desktopGateway');
    setApiProviderPresetId(
      findClaudeDesktopGatewayProviderPresetById(account.api_provider_id)?.id
        ?? CLAUDE_DESKTOP_GATEWAY_PROVIDER_CUSTOM_ID,
    );
    setApiProviderTemplateValues({});
    setApiKeyModelCatalogOverride(null);
    setApiKeyNameInput(providerName);
    setApiBaseUrlInput(baseUrl);
    setApiKeyInput(apiKey);
    setApiKeyInputVisible(false);
    setDesktopGatewayAuthScheme(authScheme);
    const savedMode = normalizeClaudeDesktopGatewayMode(account.desktop_gateway_connection_mode);
    const savedModels = (account.desktop_gateway_models || []).map((model) => model.trim()).filter(Boolean);
    const savedModelsAreClaude = savedModels.length > 0 && savedModels.every(isClaudeDesktopGatewayRouteModel);
    const mode: ClaudeDesktopGatewayConnectionMode = savedMode === 'local_mapping' || !savedModelsAreClaude
      ? 'local_mapping'
      : 'direct';
    const upstreamModels = (
      account.desktop_gateway_upstream_models?.length
        ? account.desktop_gateway_upstream_models
        : savedModelsAreClaude
          ? []
          : savedModels
    ).map((model) => model.trim()).filter(Boolean);
    const mappings = normalizeClaudeDesktopGatewayMappings(
      account.desktop_gateway_model_mappings || buildClaudeDesktopGatewayMappings(
        mode === 'local_mapping'
          ? DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS
          : savedModels.length > 0
            ? savedModels
            : DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS,
        upstreamModels,
      ),
    );
    setDesktopGatewayConnectionMode(mode);
    setDesktopGatewayUpstreamModels(upstreamModels);
    setDesktopGatewayModelMappings(
      mappings.length > 0
        ? mappings
        : mode === 'local_mapping'
          ? buildClaudeDesktopGatewayMappings(DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS, upstreamModels)
          : [],
    );
    setDesktopGatewayMappingsExpanded(true);
    setDesktopGatewayModelsInput(
      mode === 'local_mapping'
        ? DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS.join('\n')
        : savedModels.join('\n'),
    );
    setDesktopGatewayModelsError(null);
    setDesktopGatewayModelsMessage(null);
    setAddModalError(null);
    const normalizedBaseUrl = normalizeClaudeApiProviderBaseUrl(baseUrl);
    desktopGatewayModelsFetchSignatureRef.current = apiKey && normalizedBaseUrl
      ? `${apiKey}\n${normalizedBaseUrl}\n${authScheme}`
      : '';
  };

  const selectAddTab = (tab: AddTab) => {
    if (editingDesktopGatewayAccountId) return;
    setAddModalError(null);
    if (tab !== 'desktop' && desktopLogin?.loginId) {
      void claudeService.claudeDesktopLoginCancel(desktopLogin.loginId);
      setDesktopLogin(null);
    }
    if (tab !== 'oauth' && oauthLogin?.loginId) {
      void claudeService.claudeOauthLoginCancel(oauthLogin.loginId);
      setOauthLogin(null);
      setOauthCallbackInput('');
      setOauthCopied(false);
      oauthPrepareAttemptedRef.current = false;
    }
    if (tab === 'oauth' && addTab !== 'oauth') {
      oauthPrepareAttemptedRef.current = false;
    }
    if (tab === 'desktopGateway' && addTab !== 'desktopGateway') {
      applyDesktopGatewayProviderPreset(DEFAULT_CLAUDE_DESKTOP_GATEWAY_PROVIDER_ID);
    }
    setAddTab(tab);
  };

  const applyApiKeyFunPrefill = useCallback(
    (request: ApiKeyFunPrefillPayload) => {
      const key = request.apiKey.trim();
      if (!key) return;

      if (request.target === 'claude_desktop') {
        const models = (request.modelCatalog ?? []).map((model) => model.trim()).filter(Boolean);
        const claudeModels = models.filter(isClaudeDesktopGatewayRouteModel);
        const baseUrl = request.baseUrl?.trim() || CLAUDE_APIKEY_FUN_BASE_URL;
        const normalizedBaseUrl = normalizeClaudeApiProviderBaseUrl(baseUrl) || baseUrl;
        resetAddModalState('desktop');
        setActiveSection('desktop');
        setShowAddModal(true);
        setAddTab('desktopGateway');
        setApiProviderPresetId(CLAUDE_APIKEY_FUN_PROVIDER_ID);
        setApiBaseUrlInput(baseUrl);
        setApiProviderTemplateValues({});
        setApiKeyModelCatalogOverride(null);
        setApiKeyNameInput(request.apiKeyName?.trim() || request.providerName?.trim() || 'APIKEY.FUN');
        setApiKeyInput(key);
        setApiKeyInputVisible(false);
        setDesktopGatewayAuthScheme('bearer');
        setDesktopGatewayUpstreamModels(models);
        if (claudeModels.length > 0) {
          setDesktopGatewayConnectionMode('direct');
          setDesktopGatewayModelsInput(claudeModels.join('\n'));
          setDesktopGatewayModelMappings([]);
          setDesktopGatewayMappingsExpanded(false);
        } else {
          setDesktopGatewayConnectionMode('local_mapping');
          setDesktopGatewayModelsInput(DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS.join('\n'));
          setDesktopGatewayModelMappings(buildClaudeDesktopGatewayMappings(
            DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS,
            models,
          ));
          setDesktopGatewayMappingsExpanded(false);
        }
        setDesktopGatewayModelsError(null);
        setDesktopGatewayModelsMessage(t(
          'apiKeyFun.prefill.claudeDesktopReady',
          "Đã điền cấu hình APIKEY.FUN. Hãy xác nhận để thêm vào Claude.",
        ));
        desktopGatewayModelsFetchSignatureRef.current = normalizedBaseUrl
          ? `${key}\n${normalizedBaseUrl}\nbearer`
          : '';
        setAddModalError(null);
        return;
      }

      if (request.target === 'claude_cli') {
        resetAddModalState('cli');
        setActiveSection('cli');
        setShowAddModal(true);
        setAddTab('apikey');
        setApiProviderPresetId(CLAUDE_APIKEY_FUN_PROVIDER_ID);
        setApiBaseUrlInput(request.baseUrl?.trim() || CLAUDE_APIKEY_FUN_BASE_URL);
        setApiProviderTemplateValues({});
        setApiKeyModelCatalogOverride(request.modelCatalog ?? null);
        setApiKeyNameInput(request.apiKeyName?.trim() || request.providerName?.trim() || 'APIKEY.FUN');
        setApiKeyInput(key);
        setApiKeyInputVisible(false);
        setAddModalError(null);
      }
    },
    [resetAddModalState, setAddModalError, t],
  );

  useEffect(() => {
    const consumePrefill = () => {
      const request =
        consumeApiKeyFunPrefill('claude_desktop') ||
        consumeApiKeyFunPrefill('claude_cli');
      if (request) {
        applyApiKeyFunPrefill(request);
      }
    };
    consumePrefill();
    window.addEventListener(APIKEY_FUN_PREFILL_EVENT, consumePrefill);
    return () => {
      window.removeEventListener(APIKEY_FUN_PREFILL_EVENT, consumePrefill);
    };
  }, [applyApiKeyFunPrefill]);

  const importJsonContent = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
      setAddModalError(t('common.shared.token.empty', "Vui lòng nhập Token hoặc JSON"));
      return;
    }
    setImporting(true);
    setAddModalError(null);
    try {
      const accounts = await claudeService.importClaudeFromJson(trimmed);
      await store.fetchAccounts();
      setMessage({
        text: t('common.shared.token.importSuccessMsg', {
          count: accounts.length,
          defaultValue: "Đã nhập {{count}} tài khoản",
        }),
      });
      closeAddModal();
    } catch (error) {
      setAddModalError(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setImporting(false);
    }
  };

  const handleImportCliFromLocal = async () => {
    setCliImportingLocal(true);
    setAddModalError(null);
    try {
      const account = await claudeService.importClaudeCliFromLocal();
      await store.fetchAccounts();
      setMessage({
        text: t('claude.cli.localSuccess', "Đã nhập đăng nhập Claude Code cục bộ: {{name}}", {
          name: account.email,
        }),
      });
      closeAddModal();
    } catch (error) {
      setAddModalError(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setCliImportingLocal(false);
    }
  };

  const handleStartDesktopLogin = async () => {
    cleanupDesktopLoginProgressListener();
    const progressId = createClaudeDesktopLoginProgressId();
    desktopLoginProgressIdRef.current = progressId;
    setDesktopStarting(true);
    setAddModalError(null);
    setDesktopLoginProgress({
      progressId,
      phase: 'start',
      percent: 0,
    });
    try {
      desktopLoginProgressUnlistenRef.current = await listen<ClaudeDesktopLoginProgressPayload>(
        CLAUDE_DESKTOP_LOGIN_PROGRESS_EVENT,
        (event) => {
          const payload = event.payload;
          if (!payload || payload.progressId !== desktopLoginProgressIdRef.current) return;
          setDesktopLoginProgress((previous) => ({
            ...payload,
            percent: payload.percent ?? previous?.percent ?? null,
            downloadedBytes: payload.downloadedBytes ?? previous?.downloadedBytes ?? null,
            totalBytes: payload.totalBytes ?? previous?.totalBytes ?? null,
          }));
        },
      );
      const login = await claudeService.claudeDesktopLoginStart(progressId);
      setDesktopLogin(login);
      setDesktopLoginProgress((previous) => ({
        progressId,
        phase: 'ready',
        percent: 100,
        downloadedBytes: previous?.downloadedBytes ?? null,
        totalBytes: previous?.totalBytes ?? null,
      }));
    } catch (error) {
      setAddModalError(String(error).replace(/^Error:\s*/, ''));
    } finally {
      cleanupDesktopLoginProgressListener();
      setDesktopStarting(false);
    }
  };

  const handleCompleteDesktopLogin = async () => {
    if (!desktopLogin) return;
    setDesktopCompleting(true);
    setAddModalError(null);
    try {
      const account = await claudeService.claudeDesktopLoginComplete(
        desktopLogin.loginId,
        desktopAccountNameInput,
      );
      await store.fetchAccounts();
      setMessage({
        text: t('claude.desktopOAuth.importSuccess', "Đã nhập đăng nhập Claude: {{name}}", {
          name: account.email,
        }),
      });
      closeAddModal();
    } catch (error) {
      setAddModalError(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setDesktopCompleting(false);
    }
  };

  const prepareOAuthLogin = useCallback(async (): Promise<ClaudeOAuthStartResponse | null> => {
    if (oauthLogin) return oauthLogin;
    if (oauthStarting) return null;
    setOauthStarting(true);
    setAddModalError(null);
    try {
      const login = await claudeService.claudeOauthLoginPrepare();
      setOauthLogin(login);
      setOauthCallbackInput('');
      setOauthCopied(false);
      return login;
    } catch (error) {
      setAddModalError(String(error).replace(/^Error:\s*/, ''));
      return null;
    } finally {
      setOauthStarting(false);
    }
  }, [oauthLogin, oauthStarting, setAddModalError]);

  useEffect(() => {
    if (!showAddModal || addTab !== 'oauth' || oauthLogin || oauthStarting || oauthPrepareAttemptedRef.current) {
      return;
    }
    oauthPrepareAttemptedRef.current = true;
    void prepareOAuthLogin();
  }, [addTab, oauthLogin, oauthStarting, prepareOAuthLogin, showAddModal]);

  const handleOpenOAuthUrl = async () => {
    const login = oauthLogin ?? await prepareOAuthLogin();
    if (!login?.verificationUri) return;
    try {
      await openUrl(login.verificationUri);
    } catch (error) {
      setAddModalError(
        t('claude.oauth.openFailed', "Không thể mở liên kết ủy quyền: {{error}}", {
          error: String(error).replace(/^Error:\s*/, ''),
        }),
      );
    }
  };

  const handleCopyOAuthUrl = async () => {
    if (!oauthLogin?.verificationUri) return;
    await navigator.clipboard.writeText(oauthLogin.verificationUri);
    setOauthCopied(true);
    window.setTimeout(() => setOauthCopied(false), 1200);
  };

  const handleCompleteOAuth = async () => {
    if (!oauthLogin) return;
    const callbackOrCode = oauthCallbackInput.trim();
    if (!callbackOrCode) {
      setAddModalError(t('claude.oauth.callbackRequired', "Dán liên kết callback hoặc code sau khi hoàn tất ủy quyền"));
      return;
    }
    if (isClaudeOAuthAuthorizeInput(callbackOrCode)) {
      setAddModalError(
        t(
          'claude.oauth.authorizeUrlNotCallback',
          "Bạn đã dán liên kết bắt đầu ủy quyền ở trên, không phải code sau khi hoàn tất. Hãy hoàn tất ủy quyền trong trình duyệt trước, rồi sao chép URL trang cuối hoặc code được hiển thị.",
        ),
      );
      return;
    }
    setOauthCompleting(true);
    setAddModalError(null);
    try {
      const account = await claudeService.claudeOauthLoginComplete(
        oauthLogin.loginId,
        callbackOrCode,
        oauthEmailHint,
      );
      await store.fetchAccounts();
      setMessage({
        text: t('claude.oauth.importSuccess', "Đã nhập ủy quyền Claude OAuth: {{name}}", {
          name: account.email,
        }),
      });
      closeAddModal();
    } catch (error) {
      setAddModalError(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setOauthCompleting(false);
    }
  };

  const handleSelectApiProviderPreset = (providerId: string) => {
    if (addTab === 'desktopGateway') {
      applyDesktopGatewayProviderPreset(providerId);
      return;
    }
    setApiProviderPresetId(providerId);
    setApiKeyModelCatalogOverride(null);
    setDesktopGatewayModelsError(null);
    setDesktopGatewayModelsMessage(null);
    if (providerId === CLAUDE_API_PROVIDER_CUSTOM_ID) {
      setApiProviderTemplateValues({});
      return;
    }
    const preset = findClaudeApiProviderPresetById(providerId);
    if (!preset) return;
    const templateValues = getClaudeApiProviderTemplateInitialValues(preset);
    setApiProviderTemplateValues(templateValues);
    setApiBaseUrlInput(
      applyClaudeApiProviderTemplateValue(preset.baseUrls[0] ?? '', templateValues),
    );
    setApiKeyNameInput(preset.name);
    setAddModalError(null);
  };

  const handleFetchDesktopGatewayModels = async () => {
    const apiKey = apiKeyInput.trim();
    if (!apiKey) {
      setDesktopGatewayModelsError(t('claude.apiKey.required', "Nhập API Key"));
      return;
    }
    const normalizedBaseUrl = normalizeClaudeApiProviderBaseUrl(resolvedApiBaseUrlInput);
    if (!normalizedBaseUrl) {
      setDesktopGatewayModelsError(t('claude.desktopGateway.baseUrlRequired', "Nhập Gateway Base URL"));
      return;
    }
    const signature = `${apiKey}\n${normalizedBaseUrl}\n${desktopGatewayAuthScheme}`;
    if (desktopGatewayModelsFetchSignatureRef.current === signature) {
      return;
    }
    desktopGatewayModelsFetchSignatureRef.current = signature;
    const requestId = desktopGatewayModelsFetchRequestRef.current + 1;
    desktopGatewayModelsFetchRequestRef.current = requestId;
    setDesktopGatewayModelsLoading(true);
    setDesktopGatewayModelsError(null);
    setDesktopGatewayModelsMessage(null);
    const fallbackMappings = (() => {
      const presetMappings = cloneClaudeDesktopGatewayMappings(selectedDesktopGatewayProviderPreset?.modelMappings);
      if (presetMappings.length > 0) return presetMappings;
      if (desktopGatewayModelMappings.length > 0) return cloneClaudeDesktopGatewayMappings(desktopGatewayModelMappings);
      return buildClaudeDesktopGatewayMappings(DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS, []);
    })();
    const applyFallbackMappings = () => {
      setDesktopGatewayConnectionMode('local_mapping');
      setDesktopGatewayUpstreamModels(getClaudeDesktopGatewayUpstreamModels(fallbackMappings));
      setDesktopGatewayModelsInput(
        (fallbackMappings.length > 0
          ? fallbackMappings.map((mapping) => mapping.desktopModel)
          : DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS
        ).join('\n'),
      );
      setDesktopGatewayModelMappings(fallbackMappings);
      setDesktopGatewayModelsError(null);
      if (fallbackMappings.some((mapping) => mapping.upstreamModel.trim())) {
        setDesktopGatewayMappingsExpanded(false);
        setDesktopGatewayModelsMessage(t('claude.desktopGateway.usingPresetMappings', "Đang dùng ánh xạ preset. Bạn có thể sửa trước khi lưu."));
      } else {
        setDesktopGatewayModelsMessage(null);
        setDesktopGatewayMappingsExpanded(true);
      }
    };
    try {
      const result = await claudeService.listClaudeDesktopGatewayModels({
        apiKey,
        apiBaseUrl: normalizedBaseUrl,
        authScheme: desktopGatewayAuthScheme,
      });
      if (desktopGatewayModelsFetchRequestRef.current !== requestId) {
        return;
      }
      const models = result.models.map((model) => model.id.trim()).filter(Boolean);
      if (models.length === 0) {
        applyFallbackMappings();
        return;
      }
      const claudeModels = models.filter(isClaudeDesktopGatewayRouteModel);
      if (claudeModels.length > 0) {
        setDesktopGatewayConnectionMode('direct');
        setDesktopGatewayModelsInput(claudeModels.join('\n'));
        setDesktopGatewayUpstreamModels(models);
        setDesktopGatewayModelMappings(buildClaudeDesktopGatewayMappings(claudeModels, []));
        setDesktopGatewayMappingsExpanded(false);
      } else {
        setDesktopGatewayConnectionMode('local_mapping');
        setDesktopGatewayUpstreamModels(models);
        setDesktopGatewayModelsInput(DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS.join('\n'));
        setDesktopGatewayModelMappings(buildClaudeDesktopGatewayMappings(DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS, models));
        setDesktopGatewayMappingsExpanded(false);
      }
      setDesktopGatewayModelsMessage(t('claude.desktopGateway.modelsLoaded', "Đã lấy {{count}} model. Bạn có thể sửa trước khi lưu.", {
        count: models.length,
      }));
    } catch {
      if (desktopGatewayModelsFetchRequestRef.current !== requestId) {
        return;
      }
      applyFallbackMappings();
    } finally {
      if (desktopGatewayModelsFetchRequestRef.current === requestId) {
        setDesktopGatewayModelsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!showAddModal || addTab !== 'desktopGateway') {
      return;
    }
    const apiKey = apiKeyInput.trim();
    const normalizedBaseUrl = normalizeClaudeApiProviderBaseUrl(resolvedApiBaseUrlInput);
    if (!apiKey || !normalizedBaseUrl) {
      setDesktopGatewayModelsLoading(false);
      desktopGatewayModelsFetchRequestRef.current += 1;
      return;
    }
    const signature = `${apiKey}\n${normalizedBaseUrl}\n${desktopGatewayAuthScheme}`;
    if (desktopGatewayModelsFetchSignatureRef.current === signature) {
      return;
    }
    desktopGatewayModelsFetchRequestRef.current += 1;
    const timer = window.setTimeout(() => {
      void handleFetchDesktopGatewayModels();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [
    addTab,
    apiKeyInput,
    desktopGatewayAuthScheme,
    resolvedApiBaseUrlInput,
    showAddModal,
  ]);

  const handleImportApiKey = async () => {
    const apiKey = apiKeyInput.trim();
    if (!apiKey) {
      setAddModalError(t('claude.apiKey.required', "Nhập API Key"));
      return;
    }
    const missingTemplateValue = addTab === 'desktopGateway'
      ? undefined
      : Object.entries(selectedApiProviderPreset?.templateValues ?? {}).find(
        ([key]) => !(apiProviderTemplateValues[key] ?? '').trim(),
      );
    if (missingTemplateValue) {
      setAddModalError(t('claude.apiKey.templateRequired', "Nhập {{label}}", {
        label: missingTemplateValue[1].label,
      }));
      return;
    }
    const normalizedBaseUrl = normalizeClaudeApiProviderBaseUrl(resolvedApiBaseUrlInput);
    if (normalizedBaseUrl === null) {
      setAddModalError(t('claude.apiKey.baseUrlInvalid', "Base URL không hợp lệ"));
      return;
    }
    if (addTab === 'desktopGateway' && !normalizedBaseUrl) {
      setAddModalError(t('claude.desktopGateway.baseUrlRequired', "Nhập Gateway Base URL"));
      return;
    }
    const directDesktopGatewayModels = parseClaudeDesktopGatewayModels(desktopGatewayModelsInput);
    const desktopGatewayMappingRows = desktopGatewayModelMappings
      .map((mapping) => ({
        desktopModel: mapping.desktopModel.trim(),
        upstreamModel: mapping.upstreamModel.trim(),
        supports1m: mapping.supports1m === true,
      }))
      .filter((mapping) => mapping.desktopModel || mapping.upstreamModel);
    const desktopGatewayMappings = normalizeClaudeDesktopGatewayMappings(desktopGatewayMappingRows);
    const desktopGatewayModels = addTab === 'desktopGateway'
      ? desktopGatewayConnectionMode === 'local_mapping'
        ? desktopGatewayMappings.map((mapping) => mapping.desktopModel)
        : directDesktopGatewayModels
      : [];
    const directDesktopGatewayModelSet = new Set(
      directDesktopGatewayModels.map((model) => model.toLowerCase()),
    );
    const directDesktopGatewayModelMappings = normalizeClaudeDesktopGatewayMappings(
      desktopGatewayModelMappings
        .filter((mapping) => directDesktopGatewayModelSet.has(mapping.desktopModel.trim().toLowerCase()))
        .map((mapping) => ({
          desktopModel: mapping.desktopModel,
          upstreamModel: mapping.upstreamModel || mapping.desktopModel,
          supports1m: mapping.supports1m === true,
        })),
    );
    if (addTab === 'desktopGateway') {
      if (desktopGatewayConnectionMode === 'local_mapping') {
        if (desktopGatewayMappings.length === 0) {
          setAddModalError(t('claude.desktopGateway.mappingsRequired', "Hãy cấu hình ánh xạ model"));
          return;
        }
        if (desktopGatewayMappingRows.some((mapping) => !mapping.desktopModel || !mapping.upstreamModel)) {
          setAddModalError(t('claude.desktopGateway.mappingsIncomplete', "Hoàn tất ánh xạ model"));
          return;
        }
        if (desktopGatewayMappings.some((mapping) => !isClaudeDesktopGatewayRouteModel(mapping.desktopModel))) {
          setAddModalError(t('claude.desktopGateway.mappingDesktopModelInvalid', "Tên model Claude được ánh xạ phải được Claude nhận biết"));
          return;
        }
        const duplicatedModel = getClaudeDesktopGatewayDuplicateModel(desktopGatewayMappingRows);
        if (duplicatedModel) {
          setAddModalError(t('claude.desktopGateway.mappingDesktopModelDuplicated', "Tên model Claude không được lặp: {{model}}", {
            model: duplicatedModel,
          }));
          return;
        }
      } else {
        if (desktopGatewayModels.length === 0) {
          setAddModalError(t('claude.desktopGateway.modelsRequired', "Nhập danh mục model"));
          return;
        }
        if (desktopGatewayModels.some((model) => !isClaudeDesktopGatewayRouteModel(model))) {
          setAddModalError(t('claude.desktopGateway.directModelsInvalid', "Chế độ trực tiếp chỉ hỗ trợ tên model Claude mà Claude nhận biết"));
          return;
        }
      }
    }
    setApiKeyImporting(true);
    setAddModalError(null);
    try {
      const providerPresetForPayload = addTab === 'desktopGateway'
        ? selectedDesktopGatewayProviderPreset
        : selectedApiProviderPreset;
      const providerPayload = {
        apiBaseUrl: normalizedBaseUrl,
        apiProviderId: providerPresetForPayload?.id ?? null,
        apiProviderName: providerPresetForPayload?.name || apiKeyNameInput || null,
        apiProviderSourceTag: providerPresetForPayload?.sourceTag ?? null,
        apiProviderWebsite: providerPresetForPayload?.website ?? null,
        apiProviderApiKeyUrl: providerPresetForPayload?.apiKeyUrl ?? null,
        apiKeyField: addTab === 'desktopGateway'
          ? inferClaudeDesktopGatewayApiKeyField(selectedDesktopGatewayProviderPreset, desktopGatewayAuthScheme)
          : null,
        apiModelCatalog: addTab === 'desktopGateway'
          ? null
          : apiKeyModelCatalogOverride ?? selectedApiProviderPreset?.modelCatalog ?? null,
        apiExtraEnv: addTab === 'desktopGateway' ? null : resolvedApiProviderExtraEnv,
      };
      const gatewayPayload = {
        ...providerPayload,
        authScheme: desktopGatewayAuthScheme,
        desktopGatewayModels,
        desktopGatewayConnectionMode,
        desktopGatewayUpstreamModels,
        desktopGatewayModelMappings: desktopGatewayConnectionMode === 'local_mapping'
          ? desktopGatewayMappings
          : directDesktopGatewayModelMappings.length > 0
            ? directDesktopGatewayModelMappings
            : null,
      };
      const account = addTab === 'desktopGateway'
        ? editingDesktopGatewayAccountId
          ? await claudeService.updateClaudeDesktopGateway(
            editingDesktopGatewayAccountId,
            apiKey,
            apiKeyNameInput,
            gatewayPayload,
          )
          : await claudeService.importClaudeDesktopGateway(apiKey, apiKeyNameInput, gatewayPayload)
        : await claudeService.importClaudeApiKey(apiKey, apiKeyNameInput, {
          ...providerPayload,
          apiKeyField: inferredApiKeyField,
        });
      await store.fetchAccounts();
      setMessage({
        text: t(
          addTab === 'desktopGateway'
            ? editingDesktopGatewayAccountId
              ? 'claude.desktopGateway.updateSuccess'
              : 'claude.desktopGateway.importSuccess'
            : 'claude.apiKey.importSuccess',
          addTab === 'desktopGateway'
            ? editingDesktopGatewayAccountId
              ? 'Đã cập nhật tài khoản Claude Gateway: {{name}}'
              : 'Đã nhập tài khoản Claude Gateway: {{name}}'
            : 'Đã nhập tài khoản Claude API Key: {{name}}',
          {
          name: account.email,
          },
        ),
      });
      closeAddModal();
    } catch (error) {
      setAddModalError(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setApiKeyImporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    await importJsonContent(text);
  };

  const handleSwitch = async (account: ClaudeAccount) => {
    setSwitching(account.id);
    setMessage(null);
    try {
      await store.switchAccount(account.id);
      setCurrentAccountId(account.id);
      const displayName = maskAccountText(getClaudeAccountDisplayEmail(account));
      setMessage({
        text: isClaudeDesktopGatewayAccount(account)
          ? t(
            'claude.desktopGateway.switchSuccess',
            'Đã áp dụng cấu hình nhà cung cấp Claude Desktop: {{name}}.',
            { name: displayName },
          )
          : t('messages.switched', {
            email: displayName,
          }),
      });
    } catch (error) {
      if (String(error ?? '').startsWith('APP_PATH_NOT_FOUND:claude')) {
        window.dispatchEvent(
          new CustomEvent('app-path-missing', {
            detail: {
              app: 'claude',
              retry: { kind: 'switchAccount', accountId: account.id },
            },
          }),
        );
        return;
      }
      setMessage({
        text: t('messages.switchFailed', {
          error: String(error),
        }),
        tone: 'error',
      });
    } finally {
      setSwitching(null);
    }
  };

  const resolveClaudeCliInstanceForAccount = async (
    account: ClaudeAccount,
    workingDir: string,
  ): Promise<InstanceProfile> => {
    const normalizedWorkingDir = normalizePathForCompare(workingDir);
    const instances = await claudeInstanceService.listInstances();
    const existing = instances.find(
      (instance) =>
        !instance.isDefault &&
        (instance.launchMode ?? 'app') === 'cli' &&
        instance.bindAccountId === account.id &&
        normalizePathForCompare(instance.workingDir) === normalizedWorkingDir,
    );
    if (existing) {
      return existing;
    }

    const defaults = await claudeInstanceService.getInstanceDefaults();
    const displayName = getClaudeAccountDisplayEmail(account) || account.email || account.id;
    const instanceHash = md5(`${account.id}|${normalizedWorkingDir}`).substring(0, 12);
    const instanceName = sanitizeClaudeCliInstanceName(
      `${displayName} CLI ${instanceHash.substring(0, 6)}`,
    );
    const userDataDir = joinFilePath(defaults.rootDir, `cli-${instanceHash}`);

    return await claudeInstanceService.createInstance({
      name: instanceName,
      userDataDir,
      workingDir: normalizedWorkingDir,
      extraArgs: '',
      bindAccountId: account.id,
      launchMode: 'cli',
      copySourceInstanceId: '__default__',
      initMode: 'copy',
    });
  };

  const handleLaunchClaudeCli = async (account: ClaudeAccount) => {
    setMessage(null);
    setCliLaunchModal({
      accountId: account.id,
      accountEmail: getClaudeAccountDisplayEmail(account),
      instanceId: null,
      workingDir: readLastClaudeCliWorkingDir(),
      instanceName: t('instances.messages.launchPrepared', "Lệnh khởi chạy đã sẵn sàng"),
      launchCommand: '',
      preparing: false,
      copied: false,
      executing: false,
      executeMessage: null,
      executeError: null,
    });
  };

  const prepareClaudeCliLaunch = async (
    modal: ClaudeCliLaunchModalState,
  ): Promise<ClaudeCliLaunchModalState | null> => {
    if (modal.instanceId && modal.launchCommand.trim()) {
      return modal;
    }
    const selected = modal.workingDir.trim();
    if (!selected) {
      setCliLaunchModal((prev) =>
        prev && prev.accountId === modal.accountId
          ? {
              ...prev,
              executeMessage: null,
              executeError: t('claude.cli.selectWorkingDir', "Chọn thư mục làm việc Claude CLI"),
            }
          : prev,
      );
      return null;
    }

    const account = useClaudeAccountStore
      .getState()
      .accounts.find((item) => item.id === modal.accountId);
    if (!account) {
      setCliLaunchModal((prev) =>
        prev && prev.accountId === modal.accountId
          ? {
              ...prev,
              executeMessage: null,
              executeError: t('instances.messages.accountMissing', 'Tài khoản không tồn tại'),
            }
          : prev,
      );
      return null;
    }

    setCliLaunchingAccountId(account.id);
    setCliLaunchModal((prev) =>
      prev && prev.accountId === modal.accountId
        ? {
            ...prev,
            preparing: true,
            executing: false,
            executeMessage: null,
            executeError: null,
            copied: false,
          }
        : prev,
    );
    try {
      const instance = await resolveClaudeCliInstanceForAccount(account, selected);
      const prepared = await claudeInstanceService.startInstance(instance.id);
      const launchInfo = await claudeInstanceService.getClaudeInstanceLaunchCommand(prepared.id);
      await claudeInstanceStore.refreshInstances();
      await store.fetchAccounts();
      setCurrentAccountId(account.id);
      persistLastClaudeCliWorkingDir(prepared.workingDir || selected);
      const nextModal: ClaudeCliLaunchModalState = {
        accountId: account.id,
        accountEmail: getClaudeAccountDisplayEmail(account),
        instanceId: prepared.id,
        workingDir: prepared.workingDir || selected,
        instanceName: prepared.isDefault
          ? t('instances.defaultName', "Phiên bản mặc định")
          : prepared.name || t('instances.defaultName', "Phiên bản mặc định"),
        launchCommand: launchInfo.launchCommand,
        preparing: false,
        copied: false,
        executing: false,
        executeMessage: null,
        executeError: null,
      };
      setCliLaunchModal((prev) => (prev && prev.accountId === modal.accountId ? nextModal : prev));
      return nextModal;
    } catch (error) {
      setCliLaunchModal((prev) =>
        prev && prev.accountId === modal.accountId
          ? {
              ...prev,
              preparing: false,
              executing: false,
              executeMessage: null,
              executeError: String(error).replace(/^Error:\s*/, ''),
            }
          : prev,
      );
      return null;
    } finally {
      setCliLaunchingAccountId(null);
    }
  };

  const updateCliLaunchWorkingDir = (value: string) => {
    setCliLaunchModal((prev) =>
      prev
        ? {
            ...prev,
            workingDir: value,
            instanceId: null,
            instanceName: t('instances.messages.launchPrepared', "Lệnh khởi chạy đã sẵn sàng"),
            launchCommand: '',
            copied: false,
            executeMessage: null,
            executeError: null,
          }
        : prev,
    );
  };

  const handleChooseCliWorkingDir = async () => {
    if (!cliLaunchModal || cliLaunchModal.preparing || cliLaunchModal.executing) return;
    const selected = await openFileDialog({
      directory: true,
      multiple: false,
      title: t('claude.cli.selectWorkingDir', "Chọn thư mục làm việc Claude CLI"),
    });
    if (!selected || typeof selected !== 'string') return;
    persistLastClaudeCliWorkingDir(selected);
    updateCliLaunchWorkingDir(selected);
  };

  const handleCopyCliLaunchCommand = async () => {
    if (!cliLaunchModal) return;
    const prepared = await prepareClaudeCliLaunch(cliLaunchModal);
    if (!prepared) return;
    try {
      await navigator.clipboard.writeText(prepared.launchCommand);
      setCliLaunchModal((prev) => (prev ? { ...prev, copied: true, executeError: null } : prev));
      window.setTimeout(() => {
        setCliLaunchModal((prev) => (prev ? { ...prev, copied: false } : prev));
      }, 1200);
    } catch {
      setCliLaunchModal((prev) =>
        prev
          ? {
              ...prev,
              executeError: t('common.shared.export.copyFailed', "Sao chép thất bại, vui lòng sao chép thủ công"),
            }
          : prev,
      );
    }
  };

  const handleExecuteCliInTerminal = async () => {
    if (!cliLaunchModal || cliLaunchModal.executing) return;
    const prepared = await prepareClaudeCliLaunch(cliLaunchModal);
    if (!prepared?.instanceId) return;
    setCliLaunchModal((prev) =>
      prev
        ? {
            ...prev,
            executing: true,
            executeMessage: null,
            executeError: null,
          }
        : prev,
    );
    try {
      const result = await claudeInstanceService.executeClaudeInstanceLaunchCommand(
        prepared.instanceId,
        selectedTerminal,
      );
      await store.fetchAccounts();
      await claudeInstanceStore.refreshInstances();
      setCurrentAccountId(prepared.accountId);
      setCliLaunchModal((prev) =>
        prev
          ? {
              ...prev,
              executing: false,
              executeMessage: result || t('claude.cli.launchSuccess', "Đã mở Claude CLI"),
            }
          : prev,
      );
    } catch (error) {
      setCliLaunchModal((prev) =>
        prev
          ? {
              ...prev,
              executing: false,
              executeError: String(error).replace(/^Error:\s*/, ''),
            }
          : prev,
      );
    }
  };

  const refreshClaudeApiKeyUsage = useCallback(
    async (
      account: ClaudeAccount,
      options?: { showMessage?: boolean },
    ) => {
      const apiKey = account.api_key?.trim() || '';
      const baseUrl = account.api_base_url?.trim() || '';
      const showMessage = options?.showMessage === true;
      if (!apiKey || !baseUrl) {
        if (showMessage) {
          setMessage({
            text: t('codex.modelProviders.usage.noKey', "Chưa có hạn mức để truy vấn"),
            tone: 'error',
          });
        }
        return;
      }
      const requestKey = getClaudeApiKeyUsageRequestKey(account);
      const now = Date.now();
      const lastRequestedAt = apiKeyUsageManualRefreshAtRef.current[requestKey] ?? 0;
      if (now - lastRequestedAt < CLAUDE_API_KEY_USAGE_REFRESH_THROTTLE_MS) return;
      if (apiKeyUsageInFlightRef.current.has(requestKey)) return;

      apiKeyUsageManualRefreshAtRef.current[requestKey] = now;
      apiKeyUsageInFlightRef.current.add(requestKey);
      setApiKeyUsageMap((previous) =>
        setClaudeApiKeyUsageStateForAccount(previous, account, {
          ...(getClaudeApiKeyUsageState(previous, account) ?? {}),
          loading: true,
          error: undefined,
          unavailable: false,
        }),
      );

      try {
        const summary = await queryModelProviderUsage({
          baseUrl,
          apiKey,
          integrationType: null,
        });
        setApiKeyUsageMap((previous) =>
          setClaudeApiKeyUsageStateForAccount(previous, account, {
            loading: false,
            summary,
            updatedAt: Date.now(),
          }),
        );
        if (showMessage) {
          setMessage({ text: t('claude.quota.refreshSuccess', "Đã làm mới hạn mức") });
        }
      } catch (error) {
        const unavailable = isModelProviderUsageUnavailableError(error);
        const errorText = String(error).replace(/^Error:\s*/, '');
        setApiKeyUsageMap((previous) =>
          setClaudeApiKeyUsageStateForAccount(previous, account, {
            loading: false,
            summary: getClaudeApiKeyUsageState(previous, account)?.summary,
            error: unavailable ? undefined : errorText,
            unavailable,
            updatedAt: Date.now(),
          }),
        );
        if (showMessage) {
          setMessage({
            text: t('claude.quota.refreshFailed', "Làm mới hạn mức lỗi: {{error}}", {
              error: unavailable
                ? t('codex.modelProviders.usage.noKey', "Chưa có hạn mức để truy vấn")
                : errorText,
            }),
            tone: 'error',
          });
        }
      } finally {
        apiKeyUsageInFlightRef.current.delete(requestKey);
      }
    },
    [t],
  );

  const handleRefresh = async (accountId: string) => {
    const targetAccount = useClaudeAccountStore
      .getState()
      .accounts.find((account) => account.id === accountId);
    if (targetAccount && isClaudeProviderApiKeyAccount(targetAccount)) {
      setMessage(null);
      await refreshClaudeApiKeyUsage(targetAccount, { showMessage: true });
      return;
    }

    setRefreshing(accountId);
    setMessage(null);
    try {
      await store.refreshToken(accountId);
      const refreshed = useClaudeAccountStore.getState().accounts.find((account) => account.id === accountId);
      if (refreshed?.quota_error?.message) {
        setMessage({
          text: t('claude.quota.refreshWithWarning', "Làm mới hạn mức lỗi: {{error}}", {
            error: refreshed.quota_error.message,
          }),
          tone: 'error',
        });
      } else {
        setMessage({
          text: t('claude.quota.refreshSuccess', "Đã làm mới hạn mức"),
        });
      }
    } catch (error) {
      setMessage({
        text: t('claude.quota.refreshFailed', "Làm mới hạn mức lỗi: {{error}}", {
          error: String(error).replace(/^Error:\s*/, ''),
        }),
        tone: 'error',
      });
    } finally {
      setRefreshing(null);
    }
  };

  const handleRefreshAll = async () => {
    setRefreshingAll(true);
    setMessage(null);
    try {
      for (const account of currentSubPlatformAccounts) {
        if (isClaudeProviderApiKeyAccount(account)) {
          await refreshClaudeApiKeyUsage(account);
        } else {
          await store.refreshToken(account.id);
        }
      }
      setMessage({
        text: t('claude.quota.refreshAllDone', "Làm mới hạn mức xong"),
      });
    } catch (error) {
      setMessage({
        text: t('claude.quota.refreshFailed', "Làm mới hạn mức lỗi: {{error}}", {
          error: String(error).replace(/^Error:\s*/, ''),
        }),
        tone: 'error',
      });
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleOpenVerificationWindow = async (accountId: string) => {
    setVerifyingAccountId(accountId);
    setMessage(null);
    try {
      await claudeService.openClaudeVerificationWindow(accountId);
      setMessage({
        text: t(
          'claude.quota.verificationWindowOpened',
          "Đã mở cửa sổ xác minh Claude. Sau khi xác minh, hãy làm mới hạn mức lần nữa.",
        ),
      });
    } catch (error) {
      setMessage({
        text: t('claude.quota.verificationWindowFailed', "Không mở được cửa sổ xác minh Claude: {{error}}", {
          error: String(error).replace(/^Error:\s*/, ''),
        }),
        tone: 'error',
      });
    } finally {
      setVerifyingAccountId(null);
    }
  };

  const handleExport = async (accountIds: string[]) => {
    const exportIds = accountIds.filter((id) => exportableAccountIds.has(id));
    if (exportIds.length === 0) return;
    const fileNameBase = activeSubPlatform === 'desktop' ? 'claude_desktop_accounts' : 'claude_cli_accounts';
    await exportModal.startExport(exportIds, fileNameBase);
  };

  const handleSubmitAccountNote = async () => {
    if (!editingAccountNoteId || savingAccountNote) return;
    setSavingAccountNote(true);
    setAccountNoteError(null);
    try {
      await claudeService.updateClaudeAccountNote(editingAccountNoteId, editingAccountNoteValue);
      await store.fetchAccounts();
      setMessage({
        text: t('claude.accountNote.saved', "Đã lưu ghi chú tài khoản"),
      });
      setEditingAccountNoteId(null);
      setEditingAccountNoteValue('');
    } catch (error) {
      setAccountNoteError(
        t('claude.accountNote.saveFailed', "Lưu ghi chú thất bại: {{error}}", {
          error: String(error).replace(/^Error:\s*/, ''),
        }),
      );
    } finally {
      setSavingAccountNote(false);
    }
  };

  const handleSaveTags = async (tags: string[]) => {
    if (!tagAccountId) return;
    await store.updateAccountTags(tagAccountId, tags);
    await store.fetchAccounts();
    setTagAccountId(null);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await store.deleteAccounts(deleteConfirm.accountIds);
      await refreshCurrentAccountId();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deleteConfirm.accountIds.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteConfirm(null);
    } catch (error) {
      setDeleteError(String(error).replace(/^Error:\s*/, ''));
    } finally {
      setDeleting(false);
    }
  };

  useEnterConfirm(Boolean(deleteConfirm) && !deleting, () => {
    void confirmDelete();
  });

  const openBatchDeleteConfirm = () => {
    if (selectedDeletableIds.length === 0) return;
    setDeleteError(null);
    setDeleteConfirm({
      accountIds: selectedDeletableIds,
      email: t('claude.deleteSelectedLabel', "{{count}} tài khoản", {
        count: selectedDeletableIds.length,
      }),
    });
  };

  const renderAccountNoteButton = (account: ClaudeAccount, className = 'codex-account-note-chip') => {
    const hasNote = Boolean(account.account_note?.trim());
    return (
      <button
        type="button"
        className={`${className} ${hasNote ? 'has-note' : 'empty-note'}`}
        onClick={() => openAccountNoteModal(account)}
        title={hasNote ? account.account_note || '' : t('claude.accountNote.emptyTitle', "Thêm ghi chú tài khoản")}
        aria-label={t('claude.accountNote.title', "Ghi chú tài khoản")}
      >
        <FileText size={className.includes('card-action') || className.includes('action-btn') ? 14 : 12} />
        {!className.includes('card-action') && !className.includes('action-btn') && (
          <span>
            {hasNote
              ? t('claude.accountNote.short', "Ghi chú")
              : t('claude.accountNote.addShort', "Ghi chú")}
          </span>
        )}
      </button>
    );
  };

  const renderAccountActions = (account: ClaudeAccount, variant: 'card' | 'table' = 'table') => {
    const isCurrent = currentAccountId === account.id;
    const authMode = normalizeClaudeAuthMode(account.auth_mode);
    const isApiKey = authMode === 'api_key';
    const isDesktopGateway = isClaudeDesktopGatewayAccount(account);
    const isProviderAccount = isApiKey || isDesktopGateway;
    const isDesktopRuntime = isClaudeDesktopRuntimeAccount(account);
    const isClaudeCodeOAuth = !isApiKey && !isDesktopRuntime;
    const canExportJson = isClaudeJsonExportableAccount(account);
    const isCliSubPlatform = activeSubPlatform === 'cli';
    const isApiKeyUsageLoading =
      isProviderAccount && getClaudeApiKeyUsageState(apiKeyUsageMap, account)?.loading === true;
    const buttonClass = variant === 'card' ? 'card-action-btn' : 'action-btn';
    return (
      <div className={variant === 'card' ? 'card-actions' : 'action-buttons'}>
        <button
          className={buttonClass}
          onClick={() => setTagAccountId(account.id)}
          title={t('accounts.editTags', "Chỉnh sửa thẻ")}
        >
          <Tag size={14} />
        </button>
        {renderAccountNoteButton(
          account,
          `${buttonClass} ${account.account_note?.trim() ? 'active' : ''}`,
        )}
        {isDesktopGateway && (
          <button
            className={buttonClass}
            onClick={() => openEditDesktopGatewayModal(account)}
            title={t('common.edit', 'Chỉnh sửa')}
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          className={`${buttonClass} ${!isCurrent ? 'success' : ''}`}
          onClick={() => void (isCliSubPlatform ? handleLaunchClaudeCli(account) : handleSwitch(account))}
          disabled={
            isCliSubPlatform
              ? Boolean(cliLaunchingAccountId) || isDesktopRuntime
              : Boolean(switching) || isApiKey
          }
          title={
            isCliSubPlatform
              ? isDesktopRuntime
                  ? t('claude.desktopOAuth.cliUnsupported', 'Tài khoản Claude không thể khởi chạy Claude Code CLI')
                  : t('common.cliQuickLaunch', "Mở CLI")
              : isApiKey
                ? t('claude.apiKey.switchDisabled', "Tài khoản API Key không chuyển sang Claude")
                : isDesktopGateway
                  ? t('claude.desktopGateway.switchHint', 'Áp dụng cấu hình nhà cung cấp và khởi chạy Claude Desktop')
                  : isClaudeCodeOAuth
                    ? t('claude.oauth.switchHint', 'Chuyển sang Claude Code trên máy này')
                    : isDesktopRuntime
                      ? t('claude.desktopOAuth.switchHint', "Chuyển sang Claude chính thức")
                      : t('common.shared.switchAccount', "Chuyển tài khoản")
          }
        >
          {(isCliSubPlatform ? cliLaunchingAccountId : switching) === account.id
            ? <RefreshCw size={14} className="loading-spinner" />
            : <Play size={14} />}
        </button>
        <button
          className={buttonClass}
          onClick={() => void handleRefresh(account.id)}
          disabled={refreshing === account.id || isApiKeyUsageLoading}
          title={t('common.refresh', "Làm mới")}
        >
          <RotateCw
            size={14}
            className={refreshing === account.id || isApiKeyUsageLoading ? 'loading-spinner' : ''}
          />
        </button>
        {canExportJson && (
          <button
            className={buttonClass}
            onClick={() => void handleExport([account.id])}
            title={t('common.shared.export.title', "Xuất")}
          >
            <Upload size={14} />
          </button>
        )}
        <button
          className={`${buttonClass} danger`}
          onClick={() =>
            setDeleteConfirm({
              accountIds: [account.id],
              email: getClaudeAccountDisplayEmail(account),
            })
          }
          disabled={isCurrent}
          title={isCurrent ? t('claude.deleteCurrentDisabled', "Không thể xóa tài khoản hiện tại") : t('common.delete', "Xóa")}
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  const renderPlanControl = (account: ClaudeAccount) => {
    if (isClaudeDesktopGatewayAccount(account)) return null;
    const planBadge = getClaudePlanBadgeLabel(account, t);
    const planClass = getClaudePlanBadgeClass(account);
    return <span className={`tier-badge ${planClass}`}>{planBadge}</span>;
  };

  const getDesktopGatewayProviderTitle = (account: ClaudeAccount) => (
    account.api_provider_name?.trim()
    || account.organization_name?.trim()
    || getClaudeApiProviderLabel(account)
    || t('claude.desktopGateway.label', 'Gateway')
  );

  const handleCopyApiKey = async (account: ClaudeAccount) => {
    const apiKey = account.api_key?.trim();
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setMessage({ text: t('common.copied', "Đã sao chép") });
    } catch {
      setMessage({
        text: t('common.shared.export.copyFailed', "Sao chép thất bại, vui lòng sao chép thủ công"),
        tone: 'error',
      });
    }
  };

  const renderApiKeyLine = (account: ClaudeAccount) => {
    const apiKey = account.api_key?.trim() || '';
    const masked = maskClaudeApiKey(apiKey);
    return (
      <div className="account-sub-line claude-api-key-line">
        <span className="codex-login-subline" title={apiKey ? masked : '-'}>
          {t('claude.apiKey.label', 'API Key')}: {masked}
        </span>
        {apiKey && (
          <button
            type="button"
            className="claude-api-key-copy"
            onClick={() => void handleCopyApiKey(account)}
            title={t('common.copy', "Copy​")}
            aria-label={t('common.copy', "Copy​")}
          >
            <Copy size={14} />
          </button>
        )}
      </div>
    );
  };

  const renderApiKeyStatsPanel = (account: ClaudeAccount) => {
    const usageState = getClaudeApiKeyUsageState(apiKeyUsageMap, account);
    return (
      <ModelProviderUsagePanel
        summary={usageState?.summary}
        loading={usageState?.loading === true}
        error={usageState?.error}
        unavailable={usageState?.unavailable === true}
        className="claude-api-key-stats-panel"
      />
    );
  };

  const renderQuotaSummary = (account: ClaudeAccount, variant: 'card' | 'table') => {
    const items = buildClaudeQuotaSummaryItems(account, t);
    const errorMessage = account.quota_error?.message?.trim();
    const isDesktopAccount = isClaudeDesktopOAuthAccount(account);
    const isApiKey = normalizeClaudeAuthMode(account.auth_mode) === 'api_key';
    const canOpenVerificationWindow = isDesktopAccount && isClaudeCloudflareError(errorMessage);

    if (isApiKey && !isDesktopAccount && items.length === 0 && !errorMessage) {
      return variant === 'table' ? (
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('claude.quota.unsupported', "Không làm mới")}</span>
      ) : null;
    }

    const content = (
      <>
        {items.map((item) => {
          const percentage = clampQuotaPercentage(item.percentage);
          const quotaClass = resolveClaudeQuotaClassForDisplayValue(percentage);
          const resetText = formatClaudeResetTime(item.resetTime);
          const resetDisplay = resetText || '-';
          const Icon = item.key === 'five-hour' ? Clock3 : CalendarDays;
          const title = resetText
            ? t('claude.quota.resetAt', "{{label}} đặt lại: {{time}}", {
                label: item.label,
                time: resetText,
              })
            : item.label;

          if (variant === 'card') {
            return (
              <div className="quota-item" key={`${account.id}-${item.key}`} title={title}>
                <div className="quota-header">
                  <Icon size={14} />
                  <span className="quota-label">{item.label}</span>
                  <span className={`quota-pct ${quotaClass}`}>{percentage}%</span>
                </div>
                <div className="quota-bar-track">
                  <div className={`quota-bar ${quotaClass}`} style={{ width: `${percentage}%` }} />
                </div>
                <span className="quota-reset">{resetDisplay}</span>
              </div>
            );
          }

          return (
            <div className="quota-item" key={`${account.id}-${item.key}`} title={title}>
              <div className="quota-header">
                <span className="quota-name">{item.label}</span>
                <span className={`quota-value ${quotaClass}`}>{percentage}%</span>
              </div>
              <div className="quota-progress-track">
                <div className={`quota-progress-bar ${quotaClass}`} style={{ width: `${percentage}%` }} />
              </div>
              <div className="quota-footer">
                <span className="quota-reset">{resetDisplay}</span>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className={variant === 'card' ? 'quota-empty' : ''} style={variant === 'table' ? { color: 'var(--text-muted)', fontSize: 13 } : undefined}>
            {t('claude.quota.empty', "Chưa có hạn mức")}
          </div>
        )}
        {errorMessage && (
          <div className={`quota-error-inline ${variant === 'table' ? 'table' : ''}`} title={errorMessage}>
            <CircleAlert size={variant === 'table' ? 12 : 14} />
            <span>{errorMessage}</span>
            {canOpenVerificationWindow && (
              <button
                type="button"
                className="btn btn-secondary quota-error-action"
                disabled={verifyingAccountId === account.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleOpenVerificationWindow(account.id);
                }}
              >
                <ExternalLink size={12} />
                <span>
                  {verifyingAccountId === account.id
                    ? t('claude.quota.openingVerification', "Đang mở...")
                    : t('claude.quota.openVerification', "Mở xác minh")}
                </span>
              </button>
            )}
          </div>
        )}
      </>
    );

    return variant === 'card' ? (
      <div className="codex-quota-section">{content}</div>
    ) : (
      <div className="quota-grid">{content}</div>
    );
  };

  const isDesktopSubPlatform = activeSubPlatform === 'desktop';
  const isInstancesSection = activeSection === 'instances';
  const shouldShowDesktopGatewayRouting =
    addTab === 'desktopGateway' &&
    Boolean(apiKeyInput.trim()) &&
    (
      desktopGatewayModelsLoading ||
      Boolean(desktopGatewayModelsMessage) ||
      Boolean(desktopGatewayModelsError) ||
      Boolean(desktopGatewayModelsInput.trim()) ||
      desktopGatewayModelMappings.length > 0
    );
  const shouldShowDesktopGatewayMappingEditor =
    desktopGatewayMappingsExpanded || desktopGatewayModelMappings.length === 0;
  const desktopGatewayMappingPreview = desktopGatewayModelMappings.slice(0, 3);
  const subPlatformAccountsCount = currentSubPlatformAccounts.length;
  const claudeTopTabs: Array<{
    key: ClaudePageSection;
    label: string;
    icon: ReactNode;
  }> = [
    {
      key: 'desktop',
      label: t('claude.subPlatform.desktop', 'Claude'),
      icon: <ClaudeIcon className="tab-icon" />,
    },
    {
      key: 'cli',
      label: t('claude.subPlatform.cli', 'Claude CLI'),
      icon: <Terminal className="tab-icon" />,
    },
    {
      key: 'instances',
      label: t('instances.title', "Nhiều phiên bản"),
      icon: <Layers className="tab-icon" />,
    },
  ];

  const addModalBusy =
    importing ||
    apiKeyImporting ||
    desktopStarting ||
    desktopCompleting ||
    cliImportingLocal ||
    oauthStarting ||
    oauthCompleting;

  return (
    <div className="ghcp-accounts-page codex-accounts-page claude-accounts-page">
      <div className="page-top-strip">
        <div className="page-top-strip-left">
          <span className="page-top-strip-label">
            {t('settings.general.accountManagement', 'Account')}
          </span>
          <ManualHelpIconButton className="platform-header-help" />
        </div>
        <div className="page-top-strip-right-placeholder" aria-hidden="true" />
      </div>
      <div className="page-tabs-row page-tabs-center page-tabs-row-with-leading">
        <div className="page-tabs-leading">
          <PlatformGroupSwitcher
            currentPlatformId={claudePlatformId}
            currentLabel={claudePlatformLabel}
            options={platformSwitchOptions}
            currentGroupId={currentPlatformGroup?.id ?? null}
            activePlatformId={claudePlatformId}
          />
        </div>
        <div className="page-tabs filter-tabs claude-page-tabs">
          {claudeTopTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`filter-tab${activeSection === tab.key ? ' active' : ''}`}
              onClick={() => setActiveSection(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {isInstancesSection ? (
        <ClaudeInstancesContent accountsForSelect={accountsForInstances} />
      ) : (
        <>
          <div className={`ghcp-flow-notice ${isFlowNoticeCollapsed ? 'collapsed' : ''}`} role="note">
            <button
              type="button"
              className="ghcp-flow-notice-toggle"
              onClick={() => setIsFlowNoticeCollapsed((prev) => !prev)}
            >
              <div className="ghcp-flow-notice-title">
                <CircleAlert size={16} />
                <span>{t('claude.flowNotice.title', "Tài khoản Claude")}</span>
              </div>
              <ChevronDown size={16} className={`ghcp-flow-notice-arrow ${isFlowNoticeCollapsed ? 'collapsed' : ''}`} />
            </button>
            {!isFlowNoticeCollapsed && (
              <div className="ghcp-flow-notice-body">
                <div className="ghcp-flow-notice-desc">
                  {t(
                    isDesktopSubPlatform ? 'claude.flowNotice.desktopDesc' : 'claude.flowNotice.cliDesc',
                    isDesktopSubPlatform
                      ? 'Ứng dụng quản lý các phiên đăng nhập Claude. Phiên được lưu vào kho tài khoản cục bộ trước và chỉ ghi vào Claude chính thức khi chuyển tài khoản.'
                      : 'Ứng dụng quản lý Claude Code OAuth và API Key của nhiều nhà cung cấp. Chuyển OAuth ghi cấu hình Claude Code; API Key ghi vào env trong settings.json của Claude Code.',
                  )}
                </div>
                <ul className="ghcp-flow-notice-list">
                  <li>
                    {t(
                    isDesktopSubPlatform ? 'claude.flowNotice.desktopPermission' : 'claude.flowNotice.cliPermission',
                    isDesktopSubPlatform
                      ? 'Phạm vi truy cập: đọc/ghi thư mục dữ liệu Claude chính thức; bản chụp trạng thái Claude được lưu trong dữ liệu tài khoản cục bộ.'
                        : 'Phạm vi truy cập: đọc/ghi cấu hình Claude Code và thông tin xác thực trong macOS Keychain; tài khoản API Key được lưu cục bộ và ghi dưới dạng văn bản thuần vào env của settings.json khi chuyển hoặc khởi chạy CLI.',
                    )}
                  </li>
                  <li>
                    {t(
                    isDesktopSubPlatform ? 'claude.flowNotice.desktopNetwork' : 'claude.flowNotice.cliNetwork',
                    isDesktopSubPlatform
                      ? 'Phạm vi mạng: cửa sổ đăng nhập truy cập claude.ai; làm mới tài khoản sẽ gọi các API Claude Web.'
                        : 'Phạm vi mạng: OAuth truy cập trang cấp quyền Claude và API token/profile/usage; nhập API Key không sử dụng mạng, Claude CLI sẽ kết nối nhà cung cấp được chọn sau khi chạy.',
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
                  placeholder={t(
                    isDesktopSubPlatform ? 'claude.searchDesktop' : 'claude.searchCli',
                    isDesktopSubPlatform ? 'Tìm tài khoản Claude...' : 'Tìm tài khoản Claude CLI...',
                  )}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <div className="view-switcher">
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title={t('accounts.view.list', "Chế độ danh sách")}
                >
                  <List size={16} />
                </button>
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title={t('accounts.view.grid', "Chế độ lưới")}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
            <div className="toolbar-right">
              <button className="btn btn-primary icon-only" onClick={openAddModal} title={t('common.shared.addAccount', "Thêm tài khoản")}>
                <Plus size={14} />
              </button>
              <button
                className="btn btn-secondary icon-only"
                onClick={() => void handleRefreshAll()}
                disabled={refreshingAll || subPlatformAccountsCount === 0}
                title={t('common.shared.refreshAll', "Làm mới tất cả")}
              >
                <RefreshCw size={14} className={refreshingAll ? 'loading-spinner' : ''} />
              </button>
              <button
                className="btn btn-secondary icon-only"
                onClick={togglePrivacyMode}
                title={privacyModeEnabled ? t('privacy.showSensitive', "Hiện email") : t('privacy.hideSensitive', "Ẩn email")}
              >
                {privacyModeEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              {(selectedVisibleIds.length > 0 ? selectedExportableIds.length > 0 : filteredExportableIds.length > 0) && (
                <button
                  className="btn btn-secondary export-btn icon-only"
                  onClick={() => void handleExport(selectedVisibleIds.length > 0 ? selectedExportableIds : filteredExportableIds)}
                  disabled={exportModal.preparing}
                  title={
                    selectedVisibleIds.length > 0
                      ? `${t('common.shared.export.title', "Xuất")} (${selectedExportableIds.length})`
                      : t('common.shared.export.title', "Xuất")
                  }
                >
                  <Upload size={14} />
                </button>
              )}
              {isDesktopSubPlatform && <QuickSettingsPopover type="claude" />}
            </div>
          </div>

          {(subPlatformAccountsCount > 0 || grouping.groups.length > 0) && (
            <AccountSelectionToolbar
              selectedCount={selectedVisibleIds.length}
              allSelected={isAllFilteredSelected}
              disabled={filteredIds.length === 0}
              onToggleSelectAll={toggleSelectAllFiltered}
              onClearSelection={clearSelection}
              grouping={grouping}
              accounts={currentSubPlatformAccounts}
              selectedIds={selectedVisibleIds}
              actions={(
                <>
                  {selectedExportableIds.length > 0 && (
                    <button
                      className="btn btn-secondary icon-only"
                      onClick={() => void handleExport(selectedExportableIds)}
                      disabled={exportModal.preparing}
                      title={`${t('common.shared.export.title', "Xuất")} (${selectedExportableIds.length})`}
                    >
                      <Upload size={14} />
                    </button>
                  )}
                  <button
                    className="btn btn-danger icon-only"
                    onClick={openBatchDeleteConfirm}
                    disabled={selectedDeletableIds.length === 0}
                    title={`${t('common.delete', "Xóa")} (${selectedDeletableIds.length})`}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            />
          )}

          {store.loading && store.accounts.length === 0 ? (
            <div className="loading-container">
              <RefreshCw size={24} className="loading-spinner" />
              <p>{t('common.loading', "Đang tải...")}</p>
            </div>
          ) : subPlatformAccountsCount === 0 ? (
            <div className="empty-state">
              {isDesktopSubPlatform ? <Monitor size={48} /> : <Terminal size={48} />}
              <h3>{t('common.shared.empty.title', "Chưa có tài khoản")}</h3>
              <p>
                {t(
                  isDesktopSubPlatform ? 'claude.noDesktopAccounts' : 'claude.noCliAccounts',
                  isDesktopSubPlatform ? 'Chưa có tài khoản Claude' : 'Chưa có tài khoản Claude CLI',
                )}
              </p>
              <button className="btn btn-primary" onClick={openAddModal}>
                <Plus size={16} />
                {t('common.shared.addAccount', "Thêm tài khoản")}
              </button>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="empty-state">
              <h3>{t('common.shared.noMatch.title', "Không có tài khoản phù hợp")}</h3>
              <p>{t('common.shared.noMatch.desc', "Thử điều chỉnh tìm kiếm hoặc bộ lọc")}</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="codex-accounts-grid">
                  {filteredAccounts.map((account) => {
                    const displayEmail = getClaudeAccountDisplayEmail(account);
                    const apiProviderLabel = getClaudeApiProviderLabel(account);
                    const authMode = normalizeClaudeAuthMode(account.auth_mode);
                    const isApiKey = authMode === 'api_key';
                    const isDesktopGateway = isClaudeDesktopGatewayAccount(account);
                    const isProviderAccount = isApiKey || isDesktopGateway;
                    const isSponsorApiKeyAccount = isProviderAccount && isClaudeApiKeyFunAccount(account);
                    const isCurrent = currentAccountId === account.id;
                    const isSelected = selectedIds.has(account.id);
                    const tags = (account.tags || []).map((tag) => tag.trim()).filter(Boolean);
                    const visibleTags = tags.slice(0, 2);
                    const moreTagCount = Math.max(0, tags.length - visibleTags.length);
                    const gatewayProviderTitle = isDesktopGateway ? getDesktopGatewayProviderTitle(account) : '';
                    const cardTitle = isDesktopGateway
                      ? gatewayProviderTitle
                      : isProviderAccount
                      ? apiProviderLabel || displayEmail || t('claude.apiKey.label', 'API Key')
                      : displayEmail;
                    const apiBaseUrlText = account.api_base_url?.trim()
                      || t('claude.apiKey.officialEndpoint', "Mặc định chính thức");
                    const apiProviderLine = `${t('claude.apiKey.providerLabel', "Nhà cung cấp")}: ${apiProviderLabel || '-'}`;
                    const apiBaseUrlLine = `${t('claude.apiKey.baseUrlLabel', "URL gốc")}: ${apiBaseUrlText}`;
                    return (
                      <div
                        key={account.id}
                        className={`codex-account-card claude-account-card ${isProviderAccount ? 'claude-api-key-card' : ''} ${isSponsorApiKeyAccount ? 'sponsor-api-account' : ''} ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="card-top">
                          <div className="card-select">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAccountSelection(account.id)}
                            />
                          </div>
                          <span className="account-email" title={cardTitle}>
                            {maskAccountText(cardTitle)}
                          </span>
                          {isCurrent && <span className="current-tag">{t('accounts.status.current', "Hiện tại")}</span>}
                          {!isProviderAccount && renderPlanControl(account)}
                        </div>
                        {isProviderAccount ? (
                          <>
                            {renderApiKeyLine(account)}
                            <div className="account-sub-line codex-provider-inline-line">
                              <span
                                className="codex-login-subline codex-provider-inline-text"
                                title={apiProviderLine}
                              >
                                {apiProviderLine}
                              </span>
                            </div>
                            <div className="account-sub-line">
                              <span className="codex-login-subline" title={apiBaseUrlLine}>
                                {apiBaseUrlLine}
                              </span>
                            </div>
                            {account.account_note?.trim() && (
                              <div className="account-sub-line">
                                {renderAccountNoteButton(account)}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="account-sub-line">
                              {account.organization_name && (
                                <span className="codex-login-subline" title={account.organization_name}>
                                  {t('claude.account.nickname', "Biệt danh")}: {account.organization_name}
                                </span>
                              )}
                              {renderAccountNoteButton(account)}
                            </div>
                            {account.account_uuid && (
                              <div className="account-sub-line">
                                <span className="codex-login-subline" title={`${t('claude.account.userId', "ID người dùng")}: ${account.account_uuid}`}>
                                  {t('claude.account.signedInWith', "Đăng nhập bằng {{provider}}", { provider: getClaudeAuthModeLabel(account) })}
                                  {' | '}
                                  {t('claude.account.userId', "ID người dùng")}: {maskAccountText(account.account_uuid)}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {tags.length > 0 && (
                          <div className="card-tags">
                            {visibleTags.map((tag, index) => (
                              <span key={`${account.id}-${tag}-${index}`} className="tag-pill">{tag}</span>
                            ))}
                            {moreTagCount > 0 && <span className="tag-pill more">+{moreTagCount}</span>}
                          </div>
                        )}
                        {isProviderAccount ? (
                          renderApiKeyStatsPanel(account)
                        ) : (
                          renderQuotaSummary(account, 'card')
                        )}
                        <div className="codex-card-bottom">
                          <span className="card-date">{formatDate(account.created_at)}</span>
                          <div className="card-footer">
                            {renderAccountActions(account, 'card')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="account-table-container claude-account-table-container">
                  <table className="account-table claude-account-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            onChange={toggleSelectAllFiltered}
                          />
                        </th>
                        <th style={{ width: 260 }}>{t('common.shared.columns.account', "Tài khoản")}</th>
                        <th style={{ width: 140 }}>{t('accounts.columns.plan', 'Gói dịch vụ')}</th>
                        <th>{t('claude.quota.title', "Hạn mức")}</th>
                        <th style={{ width: 180 }}>{t('accounts.columns.createdAt', 'Ngày tạo')}</th>
                        <th className="sticky-action-header table-action-header">{t('common.shared.columns.actions', "Hành động")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAccounts.map((account) => {
                        const displayEmail = getClaudeAccountDisplayEmail(account);
                        const apiProviderLabel = getClaudeApiProviderLabel(account);
                        const authMode = normalizeClaudeAuthMode(account.auth_mode);
                        const isApiKey = authMode === 'api_key';
                        const isDesktopGateway = isClaudeDesktopGatewayAccount(account);
                        const isProviderAccount = isApiKey || isDesktopGateway;
                        const isSponsorApiKeyAccount = isProviderAccount && isClaudeApiKeyFunAccount(account);
                        const isCurrent = currentAccountId === account.id;
                        const isSelected = selectedIds.has(account.id);
                        const tags = (account.tags || []).map((tag) => tag.trim()).filter(Boolean);
                        const tableTitle = isDesktopGateway
                          ? getDesktopGatewayProviderTitle(account)
                          : isApiKey
                            ? apiProviderLabel || displayEmail
                            : displayEmail;
                        return (
                          <tr key={account.id} className={`${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''} ${isSponsorApiKeyAccount ? 'sponsor-api-account' : ''}`}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleAccountSelection(account.id)}
                              />
                            </td>
                            <td>
                              <div className="account-cell">
                                <div className="account-main-line">
                                  <span className="account-email-text" title={tableTitle}>
                                    {maskAccountText(tableTitle)}
                                  </span>
                                  {isCurrent && <span className="mini-tag current">{t('accounts.status.current', "Hiện tại")}</span>}
                                </div>
                                <div className="account-sub-line codex-account-meta-inline">
                                  {account.organization_name && !isProviderAccount && (
                                    <span className="codex-login-subline" title={account.organization_name}>
                                      {t('claude.account.nickname', "Biệt danh")}: {account.organization_name}
                                    </span>
                                  )}
                                  {renderAccountNoteButton(account)}
                                  {tags.slice(0, 2).map((tag, index) => (
                                    <span key={`${account.id}-table-${tag}-${index}`} className="tag-pill">{tag}</span>
                                  ))}
                                </div>
                                {account.account_uuid && !isProviderAccount && (
                                  <div className="account-sub-line">
                                    <span className="codex-login-subline" title={`${t('claude.account.userId', "ID người dùng")}: ${account.account_uuid}`}>
                                      {t('claude.account.signedInWith', "Đăng nhập bằng {{provider}}", { provider: getClaudeAuthModeLabel(account) })}
                                      {' | '}
                                      {t('claude.account.userId', "ID người dùng")}: {maskAccountText(account.account_uuid)}
                                    </span>
                                  </div>
                                )}
                                {isProviderAccount && (
                                  <div className="account-sub-line">
                                    <span className="codex-login-subline" title={account.api_base_url || apiProviderLabel}>
                                      {t('claude.apiKey.providerLabel', "Nhà cung cấp")}: {apiProviderLabel || '-'}
                                      {account.api_base_url ? ` | ${account.api_base_url}` : ''}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>{isProviderAccount ? null : renderPlanControl(account)}</td>
                            <td>{isProviderAccount ? renderApiKeyStatsPanel(account) : renderQuotaSummary(account, 'table')}</td>
                            <td>{formatDate(account.created_at)}</td>
                            <td className="sticky-action-cell table-action-cell">
                              {renderAccountActions(account, 'table')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal ghcp-add-modal platform-account-add-modal claude-add-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {t(
                  editingDesktopGatewayAccountId
                    ? 'claude.desktopGateway.editTitle'
                    : isDesktopSubPlatform
                      ? 'claude.addAccount.desktopTitle'
                      : 'claude.addAccount.cliTitle',
                  editingDesktopGatewayAccountId
                    ? 'Chỉnh sửa Claude Gateway'
                    : isDesktopSubPlatform
                      ? 'Thêm tài khoản Claude'
                      : 'Thêm tài khoản Claude CLI',
                )}
              </h2>
              <button className="modal-close" onClick={closeAddModal} aria-label={t('common.close', "Đóng")}>
                <X />
              </button>
            </div>
            {!editingDesktopGatewayAccountId && <div className="modal-tabs">
              {isDesktopSubPlatform ? (
                <>
                  <button
                    className={`modal-tab ${addTab === 'desktop' ? 'active' : ''}`}
                    onClick={() => selectAddTab('desktop')}
                    type="button"
                  >
                    <Monitor size={14} />
                    <span className="modal-tab-label">{t('claude.addTabs.desktop', 'Desktop')}</span>
                  </button>
                  <button
                    className={`modal-tab ${addTab === 'desktopGateway' ? 'active' : ''}`}
                    onClick={() => selectAddTab('desktopGateway')}
                    type="button"
                  >
                    <KeyRound size={14} />
                    <span className="modal-tab-label">{t('claude.addTabs.desktopGateway', 'Gateway')}</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    className={`modal-tab ${addTab === 'oauth' ? 'active' : ''}`}
                    onClick={() => selectAddTab('oauth')}
                    type="button"
                  >
                    <Globe size={14} />
                    <span className="modal-tab-label">{t('claude.addTabs.oauth', 'OAuth')}</span>
                  </button>
                  <button
                    className={`modal-tab ${addTab === 'apikey' ? 'active' : ''}`}
                    onClick={() => selectAddTab('apikey')}
                    type="button"
                  >
                    <KeyRound size={14} />
                    <span className="modal-tab-label">{t('claude.addTabs.apiKey', 'API Key')}</span>
                  </button>
                </>
              )}
              <button
                className={`modal-tab ${addTab === 'import' ? 'active' : ''}`}
                onClick={() => selectAddTab('import')}
                type="button"
              >
                <Database size={14} />
                <span className="modal-tab-label">
                  {isDesktopSubPlatform
                    ? t('settings.transfer.backup.downloadJsonAction', 'JSON')
                    : t('claude.addTabs.import', "Cục bộ/JSON")}
                </span>
              </button>
            </div>}
            <div className="modal-body">
              <ModalErrorMessage message={addModalError} scrollKey={addModalErrorScrollKey} />
              {addTab === 'desktop' && (
                <div className="add-section">
                  <div className="add-method-card">
                    <div className="method-icon">
                      <Monitor size={20} />
                    </div>
                    <div>
                      <h3>{t('claude.desktopOAuth.title', "Đăng nhập Claude")}</h3>
                      <p>
                        {t(
                          'claude.desktopOAuth.desc',
                          "Đăng nhập Claude trong công cụ này; hỗ trợ Google, Apple, email và free.",
                        )}
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => void handleStartDesktopLogin()}
                      disabled={addModalBusy || Boolean(desktopLogin)}
                    >
                      {desktopStarting ? <RefreshCw size={14} className="loading-spinner" /> : <ExternalLink size={14} />}
                      {desktopStarting
                        ? t('claude.desktopOAuth.preparingRuntime', "Đang chuẩn bị...")
                        : t('claude.desktopOAuth.start', "Mở đăng nhập")}
                    </button>
                  </div>
                  <p className="oauth-hint">
                    {t(
                      'claude.desktopOAuth.hint',
                      "Lưu cục bộ trước; ghi vào Claude khi chuyển tài khoản.",
                    )}
                  </p>
                  <p className="oauth-hint">
                    {t(
                      'claude.desktopOAuth.runtimeHint',
                      "Ở lần dùng đầu tiên, thành phần đăng nhập Electron có thể được tải xuống và xác minh trong thư mục dữ liệu ứng dụng cục bộ; nó không đi kèm bộ cài và sẽ được dùng lại sau đó.",
                    )}
                  </p>
                  <ClaudeDesktopRuntimeManager disabled={addModalBusy || Boolean(desktopLogin)} onError={setAddModalError} onSuccess={(text) => setMessage({ text })} />
                  {desktopStarting && desktopLoginProgress && (
                    <div className="claude-desktop-login-progress" role="status" aria-live="polite">
                      <div className="claude-desktop-login-progress__head">
                        <strong>{getClaudeDesktopLoginProgressLabel(t, desktopLoginProgress)}</strong>
                        <span>{clampProgressPercent(desktopLoginProgress.percent)}%</span>
                      </div>
                      <div className="claude-desktop-login-progress__bar" aria-hidden="true">
                        <span style={{ width: `${clampProgressPercent(desktopLoginProgress.percent)}%` }} />
                      </div>
                      <p>{getClaudeDesktopLoginProgressDetail(t, desktopLoginProgress)}</p>
                    </div>
                  )}
                  <div className="form-group">
                    <label>{t('claude.desktopOAuth.nameLabel', "Tên tài khoản")}</label>
                    <input
                      className="form-input"
                      value={desktopAccountNameInput}
                      onChange={(event) => setDesktopAccountNameInput(event.target.value)}
                      placeholder={t('claude.desktopOAuth.namePlaceholder', "Tùy chọn, ví dụ Claude Free")}
                    />
                  </div>
                  {desktopLogin && (
                    <div className="oauth-url-section">
                      <p className="section-desc">
                        {t(
                          'claude.desktopOAuth.waiting',
                          "Đăng nhập trong cửa sổ Claude rồi hoàn tất nhập tại đây.",
                        )}
                      </p>
                      <div className="oauth-url-box">
                        <input
                          value={desktopLogin.userDataDir}
                          readOnly
                          aria-label={t('claude.desktopOAuth.profileDir', "Thư mục profile tách biệt")}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn-full"
                        onClick={() => void handleCompleteDesktopLogin()}
                        disabled={addModalBusy}
                      >
                        {desktopCompleting ? <RefreshCw size={14} className="loading-spinner" /> : <Download size={14} />}
                        {desktopCompleting ? t('common.loading', "Đang tải...") : t('claude.desktopOAuth.complete', "Hoàn tất")}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {addTab === 'oauth' && (
                <div className="add-section">
                  <div className="add-method-card">
                    <div className="method-icon">
                      <Globe size={20} />
                    </div>
                    <div>
                      <h3>{t('claude.oauth.title', "Ủy quyền Claude OAuth")}</h3>
                      <p>
                        {t(
                          'claude.oauth.desc',
                          "Mở trang ủy quyền OAuth chính thức của Claude, rồi dán liên kết callback hoặc code để nhập tài khoản.",
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="oauth-hint">
                    {t(
                      'claude.oauth.proRequiredHint',
                      "OAuth chính thức của Claude thường dùng cho Claude Code. Nếu trang dừng ở nâng cấp hoặc không có quyền, hãy dùng đăng nhập Claude.",
                    )}
                  </p>
                  <div className="oauth-url-section">
                    <p className="section-desc">
                      {t(
                        'claude.oauth.openInstruction',
                        "Nhấn nút bên dưới và hoàn tất ủy quyền Claude OAuth trong trình duyệt.",
                      )}
                    </p>
                    <label className="oauth-url-label">
                      {t('claude.oauth.authUrl', "Liên kết ủy quyền")}
                    </label>
                    <div className="oauth-url-box">
                      <input
                        value={
                          oauthLogin?.verificationUri
                            ?? (oauthStarting ? t('claude.oauth.preparing', "Đang tạo liên kết ủy quyền...") : '')
                        }
                        readOnly
                        aria-label={t('claude.oauth.authUrl', "Liên kết ủy quyền")}
                      />
                      <button
                        type="button"
                        className="oauth-copy-button"
                        onClick={() => void handleCopyOAuthUrl()}
                        disabled={!oauthLogin?.verificationUri}
                      >
                        {oauthCopied ? <Check size={14} /> : <Copy size={14} />}
                        {oauthCopied ? t('common.success', "Thành công") : t('common.copy', "Copy​")}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary btn-full"
                      onClick={() => void handleOpenOAuthUrl()}
                      disabled={addModalBusy || !oauthLogin?.verificationUri}
                    >
                      {oauthStarting ? <RefreshCw size={14} className="loading-spinner" /> : <Globe size={14} />}
                      {oauthStarting ? t('common.loading', "Đang tải...") : t('claude.oauth.openInBrowser', "Mở trong trình duyệt")}
                    </button>
                    <p className="section-desc">
                      {t(
                        'claude.oauth.waiting',
                        "Sau khi hoàn tất, dán URL trang cuối hoặc code được hiển thị vào bên dưới.",
                      )}
                    </p>
                    <div className="oauth-url-box oauth-manual-input">
                      <input
                        value={oauthCallbackInput}
                        onChange={(event) => {
                          setOauthCallbackInput(event.target.value);
                          setAddModalError(null);
                        }}
                        placeholder={t('claude.oauth.callbackPlaceholder', "Dán liên kết callback hoặc code ủy quyền")}
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void handleCompleteOAuth()}
                        disabled={addModalBusy || !oauthLogin}
                      >
                        {oauthCompleting ? <RefreshCw size={14} className="loading-spinner" /> : <Download size={14} />}
                        {oauthCompleting ? t('common.loading', "Đang tải...") : t('claude.oauth.complete', "Hoàn tất nhập")}
                      </button>
                    </div>
                    <div className="oauth-url-box oauth-manual-input">
                      <input
                        value={oauthEmailHint}
                        onChange={(event) => setOauthEmailHint(event.target.value)}
                        placeholder={t('claude.oauth.emailPlaceholder', "Email (điền nếu không tự nhận diện được)")}
                      />
                    </div>
                  </div>
                </div>
              )}
              {(addTab === 'apikey' || addTab === 'desktopGateway') && (
                <div className="add-section">
                  <p className="section-desc">
                    {t(
                      addTab === 'desktopGateway' ? 'claude.desktopGateway.desc' : 'claude.apiKey.desc',
                      addTab === 'desktopGateway'
                        ? 'Lưu Gateway API Key thành cấu hình Claude bên thứ ba; khi chuyển sẽ ghi vào hồ sơ được quản lý và khởi chạy Claude chính thức.'
                        : 'Lưu Claude CLI API Key làm thông tin xác thực độc lập; khi chuyển hoặc chạy CLI, khóa sẽ được ghi vào env của settings.json, không ghi vào phiên đăng nhập Claude.',
                    )}
                  </p>
                  <div className="form-group">
                    <label>{t('claude.apiKey.providerLabel', "Nhà cung cấp")}</label>
                    <div className="claude-provider-chip-list">
                      {(addTab === 'desktopGateway'
                        ? CLAUDE_DESKTOP_GATEWAY_PROVIDER_PRESETS
                        : CLAUDE_API_PROVIDER_PRESETS
                      ).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          className={`claude-provider-chip ${preset.isPartner ? 'sponsor' : ''} ${apiProviderPresetId === preset.id ? 'active' : ''}`}
                          onClick={() => handleSelectApiProviderPreset(preset.id)}
                        >
                          <span>{preset.name}</span>
                          {preset.isPartner && <Star size={12} className="api-provider-chip-badge" />}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={`claude-provider-chip ${apiProviderPresetId === (
                          addTab === 'desktopGateway'
                            ? CLAUDE_DESKTOP_GATEWAY_PROVIDER_CUSTOM_ID
                            : CLAUDE_API_PROVIDER_CUSTOM_ID
                        ) ? 'active' : ''}`}
                        onClick={() => handleSelectApiProviderPreset(
                          addTab === 'desktopGateway'
                            ? CLAUDE_DESKTOP_GATEWAY_PROVIDER_CUSTOM_ID
                            : CLAUDE_API_PROVIDER_CUSTOM_ID,
                        )}
                      >
                        <span>{t('claude.apiKey.customProvider', "Tùy chỉnh")}</span>
                      </button>
                    </div>
                  </div>
                  {selectedFormProviderPreset && selectedFormProviderPreset.baseUrls.length > 1 && (
                    <div className="form-group">
                      <label>{t('claude.apiKey.endpointLabel', "Endpoint")}</label>
                      <div className="claude-provider-endpoint-list">
                        {selectedFormProviderPreset.baseUrls.map((baseUrl) => (
                          <button
                            key={baseUrl || 'official'}
                            type="button"
                            className={`claude-provider-endpoint-chip ${apiBaseUrlInput === applyClaudeApiProviderTemplateValue(baseUrl, apiProviderTemplateValues) ? 'active' : ''}`}
                            onClick={() => {
                              setApiBaseUrlInput(applyClaudeApiProviderTemplateValue(baseUrl, apiProviderTemplateValues));
                              if (addTab === 'desktopGateway') {
                                clearDesktopGatewayModelDiscoveryStatus();
                              }
                            }}
                          >
                            {applyClaudeApiProviderTemplateValue(baseUrl, apiProviderTemplateValues) ||
                              t('claude.apiKey.officialEndpoint', "Mặc định chính thức")}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {addTab !== 'desktopGateway' && selectedApiProviderPreset?.templateValues &&
                    Object.entries(selectedApiProviderPreset.templateValues).map(([key, config]) => (
                      <div className="form-group" key={key}>
                        <label>{config.label}</label>
                        <input
                          className="form-input"
                          type={key.includes('SECRET') ? 'password' : 'text'}
                          value={apiProviderTemplateValues[key] ?? ''}
                          onChange={(event) => {
                            const nextValues = {
                              ...apiProviderTemplateValues,
                              [key]: event.target.value,
                            };
                            setApiProviderTemplateValues(nextValues);
                            setApiBaseUrlInput(
                              applyClaudeApiProviderTemplateValue(
                                selectedApiProviderPreset.baseUrls[0] ?? '',
                                nextValues,
                              ),
                            );
                            setAddModalError(null);
                          }}
                          placeholder={config.placeholder}
                          autoComplete="off"
                          spellCheck={false}
                        />
                      </div>
                    ))}
                  <div className="form-group">
                    <label>{t('claude.apiKey.baseUrlLabel', 'Base URL')}</label>
                    <input
                      className="form-input"
                        value={apiBaseUrlInput}
                        onChange={(event) => {
                          setApiBaseUrlInput(event.target.value);
                          setApiProviderPresetId(
                            addTab === 'desktopGateway'
                              ? CLAUDE_DESKTOP_GATEWAY_PROVIDER_CUSTOM_ID
                              : CLAUDE_API_PROVIDER_CUSTOM_ID,
                          );
                          setApiProviderTemplateValues({});
                          setApiKeyModelCatalogOverride(null);
                          if (addTab === 'desktopGateway') {
                            clearDesktopGatewayModelDiscoveryStatus();
                          } else {
                            setDesktopGatewayModelsError(null);
                            setDesktopGatewayModelsMessage(null);
                          }
                          setAddModalError(null);
                        }}
                      placeholder={t('claude.apiKey.baseUrlPlaceholder', "Để trống dùng địa chỉ Anthropic")}
                    />
                  </div>
                  {addTab === 'desktopGateway' && (
                    <div className="form-group">
                      <label>{t('claude.desktopGateway.authScheme', 'Auth Scheme')}</label>
                      <div className="claude-gateway-segmented claude-gateway-auth-segmented">
                        {['bearer', 'x-api-key', 'auto'].map((scheme) => (
                          <button
                            key={scheme}
                            type="button"
                            className={`claude-provider-endpoint-chip ${desktopGatewayAuthScheme === scheme ? 'active' : ''}`}
                            onClick={() => {
                              setDesktopGatewayAuthScheme(scheme);
                              clearDesktopGatewayModelDiscoveryStatus();
                            }}
                          >
                            {scheme}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label>{t('claude.apiKey.nameLabel', "Tên tài khoản")}</label>
                    <input
                      className="form-input"
                      value={apiKeyNameInput}
                      onChange={(event) => setApiKeyNameInput(event.target.value)}
                      placeholder={t('claude.apiKey.namePlaceholder', "Tùy chọn, ví dụ APIKEY.FUN")}
                    />
                  </div>
                  <div className="form-group">
                    <label>{t('claude.apiKey.keyLabel', 'API Key')}</label>
                    <div className="oauth-url-box oauth-manual-input claude-secret-input">
                      <input
                        type={apiKeyInputVisible ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(event) => {
                          setApiKeyInput(event.target.value);
                          if (addTab === 'desktopGateway') {
                            clearDesktopGatewayModelDiscoveryStatus();
                          } else {
                            setDesktopGatewayModelsError(null);
                            setDesktopGatewayModelsMessage(null);
                          }
                          setAddModalError(null);
                        }}
                        placeholder={t('claude.apiKey.placeholder', "Dán API Key của nhà cung cấp")}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <button
                        type="button"
                        className="codex-secret-toggle-btn"
                        onClick={() => setApiKeyInputVisible((visible) => !visible)}
                        title={
                          apiKeyInputVisible
                            ? t('claude.apiKey.hide', "Ẩn API Key")
                            : t('claude.apiKey.show', "Hiện API Key")
                        }
                        aria-label={
                          apiKeyInputVisible
                            ? t('claude.apiKey.hide', "Ẩn API Key")
                            : t('claude.apiKey.show', "Hiện API Key")
                        }
                      >
                        {apiKeyInputVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  {shouldShowDesktopGatewayRouting && (
                    <>
                      <div className="form-group">
                        <label>{t('claude.desktopGateway.connectionMode', "Kết nối")}</label>
                        <div className="claude-gateway-segmented claude-gateway-mode-segmented">
                          {[
                            {
                              value: 'direct',
                              label: t('claude.desktopGateway.modeDirect', "Trực tiếp"),
                            },
                            {
                              value: 'local_mapping',
                              label: t('claude.desktopGateway.modeLocalMapping', "Ánh xạ cục bộ"),
                            },
                          ].map((mode) => (
                            <button
                              key={mode.value}
                              type="button"
                              className={`claude-provider-endpoint-chip ${desktopGatewayConnectionMode === mode.value ? 'active' : ''}`}
                              onClick={() => {
                                const nextMode = mode.value as ClaudeDesktopGatewayConnectionMode;
                                setDesktopGatewayConnectionMode(nextMode);
                                if (nextMode === 'local_mapping' && desktopGatewayModelMappings.length === 0) {
                                  const desktopModels = parseClaudeDesktopGatewayModels(desktopGatewayModelsInput);
                                  setDesktopGatewayModelMappings(buildClaudeDesktopGatewayMappings(
                                    desktopModels.length > 0 ? desktopModels : DEFAULT_CLAUDE_DESKTOP_GATEWAY_MODELS,
                                    desktopGatewayUpstreamModels,
                                  ));
                                }
                                setDesktopGatewayModelsError(null);
                                setDesktopGatewayModelsMessage(null);
                                setAddModalError(null);
                              }}
                            >
                              {mode.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <div className="claude-gateway-models-header">
                          <label>{t('claude.desktopGateway.modelsLabel', "Danh mục model")}</label>
                        </div>
                        {desktopGatewayConnectionMode === 'direct' ? (
                          <textarea
                            className="form-input token-input claude-gateway-models-input"
                            rows={4}
                            value={desktopGatewayModelsInput}
                            onChange={(event) => {
                              setDesktopGatewayModelsInput(event.target.value);
                              setDesktopGatewayModelsError(null);
                              setDesktopGatewayModelsMessage(null);
                            }}
                            placeholder={t('claude.desktopGateway.modelsPlaceholder', "Mỗi dòng một ID model")}
                            spellCheck={false}
                          />
                        ) : (
                          <div className="claude-gateway-mapping-list">
                            {!shouldShowDesktopGatewayMappingEditor && (
                              <div className="claude-gateway-mapping-summary">
                                <div className="claude-gateway-mapping-summary-header">
                                  <div>
                                    <strong>
                                      {t('claude.desktopGateway.mappingSummary', "Đã cấu hình {{count}} ánh xạ", {
                                        count: desktopGatewayModelMappings.length,
                                      })}
                                    </strong>
                                    <span>{t('claude.desktopGateway.mappingSummaryHint', "Xem lại hoặc sửa trước khi lưu.")}</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setDesktopGatewayMappingsExpanded(true)}
                                  >
                                    <Pencil size={14} />
                                    {t('claude.desktopGateway.editMappings', "Sửa ánh xạ")}
                                  </button>
                                </div>
                                <div className="claude-gateway-mapping-preview-list">
                                  {desktopGatewayMappingPreview.map((mapping, index) => (
                                    <div className="claude-gateway-mapping-preview-item" key={`${index}-${mapping.upstreamModel}-${mapping.desktopModel}`}>
                                      <span title={mapping.upstreamModel}>{mapping.upstreamModel || '-'}</span>
                                      <span>-&gt;</span>
                                      <span title={mapping.desktopModel}>{mapping.desktopModel || '-'}</span>
                                    </div>
                                  ))}
                                  {desktopGatewayModelMappings.length > desktopGatewayMappingPreview.length && (
                                    <div className="claude-gateway-mapping-preview-more">
                                      {t('claude.desktopGateway.moreMappings', "Thêm {{count}}", {
                                        count: desktopGatewayModelMappings.length - desktopGatewayMappingPreview.length,
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {shouldShowDesktopGatewayMappingEditor && (
                              <>
                                {desktopGatewayModelMappings.length > 0 && (
                                  <div className="claude-gateway-mapping-editor-toolbar">
                                    <span>{t('claude.desktopGateway.mappingEditorTitle', "Ánh xạ model")}</span>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => setDesktopGatewayMappingsExpanded(false)}
                                    >
                                      {t('claude.desktopGateway.hideMappings', "Thu gọn")}
                                    </button>
                                  </div>
                                )}
                                {desktopGatewayModelMappings.map((mapping, index) => {
                                  const desktopModelOptions = buildClaudeDesktopGatewayDesktopModelOptions(
                                    t('claude.apiKey.customProvider', "Tùy chỉnh"),
                                  );
                                  const desktopModelInOptions = desktopModelOptions.some((option) => option.value === mapping.desktopModel);
                                  const desktopDropdownValue = desktopModelInOptions && mapping.desktopModel
                                    ? mapping.desktopModel
                                    : CLAUDE_DESKTOP_GATEWAY_CUSTOM_DESKTOP_MODEL;
                                  const showCustomDesktopInput =
                                    desktopDropdownValue === CLAUDE_DESKTOP_GATEWAY_CUSTOM_DESKTOP_MODEL;
                                  return (
                                    <div className="claude-gateway-mapping-row" key={getDesktopGatewayMappingRowKey(mapping)}>
                                      <input
                                        className="form-input"
                                        value={mapping.upstreamModel}
                                        onChange={(event) => {
                                          const value = event.target.value;
                                          updateDesktopGatewayModelMapping(index, (current) => ({
                                            ...current,
                                            upstreamModel: value,
                                          }));
                                          setDesktopGatewayModelsError(null);
                                          setAddModalError(null);
                                        }}
                                        placeholder={t('claude.desktopGateway.upstreamModelPlaceholder', "Model nguồn thực tế")}
                                        spellCheck={false}
                                      />
                                      <div className="claude-gateway-mapped-model-field">
                                        <SingleSelectDropdown
                                          value={desktopDropdownValue}
                                          options={desktopModelOptions}
                                          onChange={(value) => {
                                            updateDesktopGatewayModelMapping(index, (current) => ({
                                              ...current,
                                              desktopModel:
                                                value === CLAUDE_DESKTOP_GATEWAY_CUSTOM_DESKTOP_MODEL
                                                  ? desktopModelInOptions
                                                    ? ''
                                                    : current.desktopModel
                                                  : value,
                                            }));
                                            setDesktopGatewayModelsError(null);
                                            setAddModalError(null);
                                          }}
                                          ariaLabel={t('claude.desktopGateway.desktopModelPlaceholder', "Model Claude")}
                                          placeholder={t('claude.desktopGateway.desktopModelPlaceholder', "Model Claude")}
                                          menuWidth={260}
                                        />
                                        {showCustomDesktopInput && (
                                          <input
                                            className="form-input"
                                            value={mapping.desktopModel}
                                            onChange={(event) => {
                                              const value = event.target.value;
                                              updateDesktopGatewayModelMapping(index, (current) => ({
                                                ...current,
                                                desktopModel: value,
                                              }));
                                              setDesktopGatewayModelsError(null);
                                              setAddModalError(null);
                                            }}
                                            placeholder={t('claude.desktopGateway.desktopModelPlaceholder', "Model Claude")}
                                            spellCheck={false}
                                          />
                                        )}
                                      </div>
                                      <label
                                        className="claude-gateway-supports1m-toggle"
                                        title={t('claude.desktopGateway.supports1mLabel', "Khai báo hỗ trợ 1M")}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={mapping.supports1m === true}
                                          onChange={(event) => {
                                            const checked = event.target.checked;
                                            updateDesktopGatewayModelMapping(index, (current) => ({
                                              ...current,
                                              supports1m: checked,
                                            }));
                                            setDesktopGatewayModelsError(null);
                                            setAddModalError(null);
                                          }}
                                        />
                                        <span className="claude-gateway-supports1m-box" aria-hidden="true">
                                          {mapping.supports1m === true && <Check size={12} />}
                                        </span>
                                        <span>{t('claude.desktopGateway.supports1mShort', '1M')}</span>
                                      </label>
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                          setDesktopGatewayModelMappings((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
                                          setAddModalError(null);
                                        }}
                                      >
                                        <Trash2 size={14} />
                                        {t('common.delete', "Xóa")}
                                      </button>
                                    </div>
                                  );
                                })}
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => {
                                    setDesktopGatewayModelMappings((prev) => [
                                      ...prev,
                                      {
                                        desktopModel: getNextClaudeDesktopGatewaySafeModel(
                                          prev.map((mapping) => mapping.desktopModel),
                                        ),
                                        upstreamModel: '',
                                        supports1m: false,
                                      },
                                    ]);
                                    setDesktopGatewayMappingsExpanded(true);
                                    setAddModalError(null);
                                  }}
                                >
                                  <Plus size={14} />
                                  {t('claude.desktopGateway.addMapping', "Thêm ánh xạ")}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {shouldShowDesktopGatewayRouting && (
                    <div className="form-group claude-gateway-model-status-group">
                      {desktopGatewayModelsLoading && (
                        <div className="add-status loading">
                          <RefreshCw size={14} className="loading-spinner" />
                          <span>{t('claude.desktopGateway.modelsLoading', "Đang tải danh mục model...")}</span>
                        </div>
                      )}
                      {desktopGatewayModelsMessage && (
                        <div className="add-status success">
                          <CheckCircle size={14} />
                          <span>{desktopGatewayModelsMessage}</span>
                        </div>
                      )}
                      {desktopGatewayModelsError && (
                        <div className="add-status error">
                          <AlertTriangle size={14} />
                          <span>{desktopGatewayModelsError}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="oauth-hint">
                    {t(
                      addTab === 'desktopGateway' ? 'claude.desktopGateway.hint' : 'claude.apiKey.hint',
                      addTab === 'desktopGateway'
                        ? 'Tài khoản Gateway không đọc thông tin đăng ký Claude; API Key được ghi vào hồ sơ được quản lý theo cấu hình bên thứ ba chính thức để khởi chạy Claude.'
                        : 'Tài khoản API Key chỉ dùng cho Claude CLI; khóa được ghi dưới dạng văn bản thuần vào env của settings.json, không ghi vào phiên đăng nhập Claude và không hỗ trợ làm mới hạn mức đăng ký.',
                    )}
                  </p>
                  <button
                    className="btn btn-primary btn-full"
                    onClick={() => void handleImportApiKey()}
                    disabled={addModalBusy || !apiKeyInput.trim()}
                  >
                    {apiKeyImporting ? <RefreshCw size={14} className="loading-spinner" /> : <KeyRound size={14} />}
                    {apiKeyImporting
                      ? t('common.loading', "Đang tải...")
                      : t(
                        addTab === 'desktopGateway'
                          ? editingDesktopGatewayAccountId
                            ? 'claude.desktopGateway.updateAction'
                            : 'claude.desktopGateway.importAction'
                          : 'claude.apiKey.importAction',
                        addTab === 'desktopGateway'
                          ? editingDesktopGatewayAccountId
                            ? 'Lưu Gateway'
                            : 'Nhập Gateway'
                          : 'Nhập API Key',
                      )}
                  </button>
                </div>
              )}
              {addTab === 'import' && (
                <div className="add-section">
                  {!isDesktopSubPlatform && (
                    <div className="add-method-card">
                      <div className="method-icon">
                        <Terminal size={20} />
                      </div>
                      <div>
                        <h3>{t('claude.cli.localTitle', "Nhập Claude Code hiện tại")}</h3>
                        <p>
                          {t(
                            'claude.cli.localDesc',
                            "Đọc trạng thái đăng nhập OAuth Claude Code cục bộ hiện tại và sao chép thành snapshot tài khoản cục bộ.",
                          )}
                        </p>
                      </div>
                      <button
                        className="btn btn-secondary"
                        onClick={() => void handleImportCliFromLocal()}
                        disabled={addModalBusy}
                      >
                        {cliImportingLocal ? (
                          <RefreshCw size={14} className="loading-spinner" />
                        ) : (
                          <Download size={14} />
                        )}
                        {cliImportingLocal
                          ? t('common.loading', "Đang tải...")
                          : t('claude.desktopOAuth.localAction', "Nhập")}
                      </button>
                    </div>
                  )}
                  <div className="form-group">
                    <label>{t('claude.import.jsonLabel', "Dữ liệu JSON")}</label>
                    <textarea
                      className="form-input"
                      rows={8}
                      value={jsonInput}
                      placeholder={t(
                        isDesktopSubPlatform ? 'claude.import.desktopJsonPlaceholder' : 'claude.import.cliJsonPlaceholder',
                        isDesktopSubPlatform
                          ? 'Dán JSON tài khoản Claude Gateway đã xuất'
                          : 'Dán JSON tài khoản Claude CLI đã xuất',
                      )}
                      onChange={(event) => setJsonInput(event.target.value)}
                    />
                  </div>
                  <input
                    ref={importFileInputRef}
                    type="file"
                    accept=".json,application/json"
                    style={{ display: 'none' }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.currentTarget.value = '';
                      if (file) void handleImportFile(file);
                    }}
                  />
                </div>
              )}
            </div>
            {addTab === 'import' && (
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => importFileInputRef.current?.click()}
                  disabled={addModalBusy}
                >
                  <FileJson size={14} />
                  {t('common.shared.import.file', 'Chọn tệp')}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => void importJsonContent(jsonInput)}
                  disabled={addModalBusy}
                >
                  {importing ? <RefreshCw size={14} className="loading-spinner" /> : <Upload size={14} />}
                  {importing ? t('common.loading', "Đang tải...") : t('common.shared.import.label', "Nhập")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <ExportJsonModal
        isOpen={exportModal.showModal}
        title={`${t('common.shared.export.title', "Xuất")} JSON`}
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

      {cliLaunchModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('instances.launchDialog.title', "Khởi chạy phiên bản")}</h2>
              <button
                className="modal-close"
                onClick={() => setCliLaunchModal(null)}
                aria-label={t('common.close', "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div className="add-status success">
                <Check size={16} />
                <span>
                  {t('accounts.switched', "Đã chuyển sang {{email}}", {
                    email: maskAccountText(cliLaunchModal.accountEmail),
                  })}
                </span>
              </div>
              <div className="form-group">
                <label>{t('instances.columns.instance', "Phiên bản")}</label>
                <input
                  className="form-input"
                  value={cliLaunchModal.instanceName}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>{t('instances.form.workingDir', "Thư mục làm việc")}</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    value={cliLaunchModal.workingDir}
                    placeholder={t('instances.form.workingDirPlaceholder', "Mặc định dùng đường dẫn hiện tại")}
                    onChange={(event) => updateCliLaunchWorkingDir(event.target.value)}
                    disabled={cliLaunchModal.preparing || cliLaunchModal.executing}
                  />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => void handleChooseCliWorkingDir()}
                    disabled={cliLaunchModal.preparing || cliLaunchModal.executing}
                    title={t('claude.cli.selectWorkingDir', "Chọn thư mục làm việc Claude CLI")}
                    aria-label={t('claude.cli.selectWorkingDir', "Chọn thư mục làm việc Claude CLI")}
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
                <p className="form-hint">
                  {t('instances.form.workingDirDesc', "Khi khởi động sẽ chuyển vào thư mục này trước")}
                </p>
              </div>
              <div className="form-group">
                <label>{t('instances.launchDialog.command', "Lệnh khởi chạy")}</label>
                <textarea
                  className="form-input instance-args-input"
                  value={cliLaunchModal.launchCommand}
                  placeholder={t('claude.cli.selectWorkingDir', "Chọn thư mục làm việc Claude CLI")}
                  readOnly
                />
                <p className="form-hint">
                  {t(
                    'instances.launchDialog.hint',
                    "Sao chép lệnh để chạy thủ công hoặc chạy trực tiếp trong terminal.",
                  )}
                </p>
              </div>
              <div className="form-group">
                <label>{t('instances.launchDialog.terminal', "Cửa sổ lệnh")}</label>
                <SingleSelectDropdown
                  value={selectedTerminal}
                  onChange={setSelectedTerminal}
                  options={terminalOptions}
                  disabled={cliLaunchModal.preparing || cliLaunchModal.executing}
                  ariaLabel={t('instances.launchDialog.terminal', "Cửa sổ lệnh")}
                />
              </div>
              {cliLaunchModal.executeMessage && (
                <div className="add-status success">
                  <Check size={16} />
                  <span>{cliLaunchModal.executeMessage}</span>
                </div>
              )}
              {cliLaunchModal.executeError && (
                <div className="form-error">{cliLaunchModal.executeError}</div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => void handleCopyCliLaunchCommand()}
                disabled={cliLaunchModal.preparing || cliLaunchModal.executing}
              >
                <Copy size={16} />
                {cliLaunchModal.preparing
                  ? t('common.loading', "Đang tải...")
                  : cliLaunchModal.copied
                    ? t('common.success', "Thành công")
                    : t('common.copy', "Copy​")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleExecuteCliInTerminal()}
                disabled={cliLaunchModal.preparing || cliLaunchModal.executing}
              >
                {cliLaunchModal.preparing || cliLaunchModal.executing
                  ? <RefreshCw size={16} className="loading-spinner" />
                  : <Play size={16} />}
                {cliLaunchModal.preparing || cliLaunchModal.executing
                  ? t('common.loading', "Đang tải...")
                  : t('instances.launchDialog.runInTerminal', "Chạy trong terminal")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('common.delete', "Xóa")}</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)} aria-label={t('common.close', "Đóng")}>
                <X />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage message={deleteError} scrollKey={deleteErrorScrollKey} />
              <p>
                {t('claude.deleteConfirm', "Xóa tài khoản Claude {{email}}?", {
                  email: deleteConfirm.email,
                })}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                {t('common.cancel', "Hủy")}
              </button>
              <button className="btn btn-danger" onClick={() => void confirmDelete()} disabled={deleting}>
                <Trash2 size={14} />
                {deleting ? t('common.loading', "Đang tải...") : t('common.delete', "Xóa")}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingAccountNoteAccount && (
        <div className="modal-overlay">
          <div className="modal codex-account-note-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('claude.accountNote.title', "Ghi chú tài khoản")}</h2>
              <button
                className="modal-close"
                onClick={closeAccountNoteModal}
                aria-label={t('common.close', "Đóng")}
                disabled={savingAccountNote}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage message={accountNoteError} scrollKey={accountNoteErrorScrollKey} />
              <p className="codex-account-note-desc">
                {t('claude.accountNote.desc', "Thêm ghi chú cục bộ cho {{email}} để dễ nhận ra khi chuyển tài khoản.", {
                  email: maskAccountText(getClaudeAccountDisplayEmail(editingAccountNoteAccount)),
                })}
              </p>
              <label className="codex-account-note-field">
                <span>{t('claude.accountNote.label', "Ghi chú tài khoản")}</span>
                <textarea
                  className="codex-account-note-textarea"
                  value={editingAccountNoteValue}
                  onChange={(event) => {
                    setEditingAccountNoteValue(event.target.value);
                    setAccountNoteError(null);
                  }}
                  placeholder={t('claude.accountNote.placeholder', "Ví dụ: Free chính, Max 20x, tài khoản nhóm")}
                  disabled={savingAccountNote}
                  rows={5}
                />
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeAccountNoteModal} disabled={savingAccountNote}>
                {t('common.cancel', "Hủy")}
              </button>
              <button className="btn btn-primary" onClick={() => void handleSubmitAccountNote()} disabled={savingAccountNote}>
                {savingAccountNote ? <RefreshCw size={14} className="loading-spinner" /> : <FileText size={14} />}
                {savingAccountNote ? t('common.loading', "Đang tải...") : t('common.save', "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}

      <TagEditModal
        isOpen={Boolean(tagAccount)}
        initialTags={tagAccount?.tags || []}
        availableTags={availableTags}
        onClose={() => setTagAccountId(null)}
        onSave={handleSaveTags}
      />
    </div>
  );
}
