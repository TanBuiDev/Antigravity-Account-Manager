import { listenSafely as listen } from "./utils/tauriEventListener";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import './App.css';
import { getVersion } from '@tauri-apps/api/app';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import { FileText, FolderOpen, RefreshCw, X } from 'lucide-react';
import { SideNav } from './components/layout/SideNav';
import { BootReadyMarker, VisibleBootPage } from './components/BootReadyMarker';
import { GlobalModal } from './components/GlobalModal';
import { WindowsOperationDialog } from './components/WindowsOperationDialog';
import { CodexSwitchProgressModal } from './components/CodexSwitchProgressModal';
import { CodexCliDaemonNotice } from './components/CodexCliDaemonNotice';
import { CodexInstanceLaunchProgressModal } from './components/CodexInstanceLaunchProgressModal';
import { CodexPelicanHost } from './components/codex/pelican/CodexPelicanHost';
import { AnnouncementHost } from './components/AnnouncementCenter';
import { TopCenterPromoBanner } from './components/TopCenterPromoBanner';
import type { QuickSettingsType } from './components/QuickSettingsPopover';
import { isMainWindowNavigablePage, type Page } from './types/navigation';
import type { TopRightAd } from './types/topRightAd';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import { useEasterEggTrigger } from './hooks/useEasterEggTrigger';
import { useGlobalModal } from './hooks/useGlobalModal';
import { changeLanguage, getCurrentLanguage, normalizeLanguage, syncLanguage } from './i18n';
import { useAccountStore } from './stores/useAccountStore';
import { useCodexAccountStore } from './stores/useCodexAccountStore';
import { useClaudeAccountStore } from './stores/useClaudeAccountStore';
import { useGitHubCopilotAccountStore } from './stores/useGitHubCopilotAccountStore';
import { useWindsurfAccountStore } from './stores/useWindsurfAccountStore';
import { useKiroAccountStore } from './stores/useKiroAccountStore';
import { useCursorAccountStore } from './stores/useCursorAccountStore';
import { useGrokAccountStore } from './stores/useGrokAccountStore';
import { useCodebuddyAccountStore } from './stores/useCodebuddyAccountStore';
import { useCodebuddyCnAccountStore } from './stores/useCodebuddyCnAccountStore';
import { useQoderAccountStore } from './stores/useQoderAccountStore';
import { useTraeAccountStore } from './stores/useTraeAccountStore';
import { useWorkbuddyAccountStore } from './stores/useWorkbuddyAccountStore';
import { useZedAccountStore } from './stores/useZedAccountStore';
import { useSideNavLayoutStore } from './stores/useSideNavLayoutStore';
import { usePlatformLayoutStore } from './stores/usePlatformLayoutStore';
import { initializeClassicSidebar } from './utils/classicSidebarStartup';
import { getAntigravityRuntimeTarget, resolveAntigravityStartupTarget, setAntigravityRuntimeTarget } from './utils/antigravityRuntimeTarget';
import { useTopRightAdStore } from './stores/useTopRightAdStore';
import { useSponsorStore } from './stores/useSponsorStore';
import { useRemoteConfigStore } from './stores/useRemoteConfigStore';
import type { UpdateCheckResult, UpdateInfo } from './components/UpdateNotification';
import type { RemoteUpdatePromptMode } from './types/remoteConfig';
import type { Update as UpdaterUpdate } from '@tauri-apps/plugin-updater';
import {
  parseUpdaterReleaseNotes,
  resolveUpdaterDownloadUrl,
} from './utils/updaterReleaseNotes';
import { FloatingCardWindow } from './pages/FloatingCardWindow';
import { CodexWakeupConfirmation } from './components/CodexWakeupConfirmation';
import { initWakeupNotificationListener } from './utils/wakeupNotificationListener';
import {
  createUpdaterCanceledError,
  isRetryableUpdaterError,
  isUpdaterCanceledError,
  retryWithBackoff,
  sanitizeUpdaterErrorMessage,
  UPDATE_CHECK_RETRY_DELAYS_MS,
  UPDATE_DOWNLOAD_RETRY_DELAYS_MS,
} from './utils/updaterRetry';
import { loadWakeupOfficialLsVersionMode } from './utils/wakeupOfficialLsVersion';
import { UpdatePromptPolicy } from './utils/updatePromptPolicy';
import {
  dispatchExternalProviderImportEvent,
  normalizeExternalProviderImportPayload,
  type ExternalProviderImportPayload,
} from './utils/externalProviderImport';
import { runAutoBackupCycle } from './services/scheduledBackupService';
import {
  hydrateUserMemory,
  USER_MEMORY_FLAGS,
} from './utils/userMemory';
import {
  clearLegacyWorkbuddyAutoCheckinLogs,
  getWorkbuddyAutoCheckinConfig,
  migrateWorkbuddyAutoCheckinConfigAsync,
} from './services/workbuddyAutoCheckinService';
import { prepareCodexLocalAccessForRestart } from './services/codexLocalAccessService';
import { applyReducedMotion } from './utils/reducedMotion';
import { isCodexInstanceAccountConflict } from './utils/codexInstanceLaunchConflict';
import {
  applyWebviewUiScale,
  isUiScaleResetKey,
  isUiScaleZoomInKey,
  isUiScaleZoomOutKey,
  normalizeUiScale,
  stepUiScale,
  UI_SCALE_DEFAULT,
} from './utils/uiScale';
import {
  emitActivePlatformFocus,
  resolvePlatformIdFromPage,
} from './utils/accountSyncEvents';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })),
);
const AccountsPage = lazy(() =>
  import('./pages/AccountsPage').then((module) => ({ default: module.AccountsPage })),
);
const CodexAccountsPage = lazy(() =>
  import('./pages/CodexAccountsPage').then((module) => ({ default: module.CodexAccountsPage })),
);
const CodexApiServicePage = lazy(() =>
  import('./pages/CodexApiServicePage').then((module) => ({ default: module.CodexApiServicePage })),
);
const ClaudeAccountsPage = lazy(() =>
  import('./pages/ClaudeAccountsPage').then((module) => ({ default: module.ClaudeAccountsPage })),
);
const GitHubCopilotAccountsPage = lazy(() =>
  import('./pages/GitHubCopilotAccountsPage').then((module) => ({
    default: module.GitHubCopilotAccountsPage,
  })),
);
const WindsurfAccountsPage = lazy(() =>
  import('./pages/WindsurfAccountsPage').then((module) => ({ default: module.WindsurfAccountsPage })),
);
const KiroAccountsPage = lazy(() =>
  import('./pages/KiroAccountsPage').then((module) => ({ default: module.KiroAccountsPage })),
);
const CursorAccountsPage = lazy(() =>
  import('./pages/CursorAccountsPage').then((module) => ({ default: module.CursorAccountsPage })),
);
const GrokAccountsPage = lazy(() =>
  import('./pages/GrokAccountsPage').then((module) => ({ default: module.GrokAccountsPage })),
);
const CodebuddyAccountsPage = lazy(() =>
  import('./pages/CodebuddyAccountsPage').then((module) => ({ default: module.CodebuddyAccountsPage })),
);
const CodebuddyCnAccountsPage = lazy(() =>
  import('./pages/CodebuddyCnAccountsPage').then((module) => ({ default: module.CodebuddyCnAccountsPage })),
);
const QoderAccountsPage = lazy(() =>
  import('./pages/QoderAccountsPage').then((module) => ({ default: module.QoderAccountsPage })),
);
const ZcodeAccountsPage = lazy(() =>
  import('./pages/ZcodeAccountsPage').then((module) => ({ default: module.ZcodeAccountsPage })),
);
const TraeAccountsPage = lazy(() =>
  import('./pages/TraeAccountsPage').then((module) => ({ default: module.TraeAccountsPage })),
);
const WorkbuddyAccountsPage = lazy(() =>
  import('./pages/WorkbuddyAccountsPage').then((module) => ({ default: module.WorkbuddyAccountsPage })),
);
const ZedAccountsPage = lazy(() =>
  import('./pages/ZedAccountsPage').then((module) => ({ default: module.ZedAccountsPage })),
);;
const WakeupTasksPage = lazy(() =>
  import('./pages/WakeupTasksPage').then((module) => ({ default: module.WakeupTasksPage })),
);
const WakeupVerificationPage = lazy(() =>
  import('./pages/WakeupVerificationPage').then((module) => ({
    default: module.WakeupVerificationPage,
  })),
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const TwoFactorAuthPage = lazy(() =>
  import('./pages/TwoFactorAuthPage').then((module) => ({ default: module.TwoFactorAuthPage })),
);
const ManualPage = lazy(() =>
  import('./pages/ManualPage').then((module) => ({ default: module.ManualPage })),
);
const ApiKeyFunPage = lazy(() =>
  import('./pages/ApiKeyFunPage').then((module) => ({ default: module.ApiKeyFunPage })),
);
const InstancesPage = lazy(() =>
  import('./pages/InstancesPage').then((module) => ({ default: module.InstancesPage })),
);
const PlatformLayoutModal = lazy(() =>
  import('./components/PlatformLayoutModal').then((module) => ({
    default: module.PlatformLayoutModal,
  })),
);
const UpdateNotification = lazy(() =>
  import('./components/UpdateNotification').then((module) => ({ default: module.UpdateNotification })),
);
const VersionJumpNotification = lazy(() =>
  import('./components/VersionJumpNotification').then((module) => ({ default: module.VersionJumpNotification })),
);
const CloseConfirmDialog = lazy(() =>
  import('./components/CloseConfirmDialog').then((module) => ({ default: module.CloseConfirmDialog })),
);
const BreakoutModal = lazy(() =>
  import('./components/easter-egg/BreakoutModal').then((module) => ({ default: module.BreakoutModal })),
);
const LogViewerModal = lazy(() =>
  import('./components/LogViewerModal').then((module) => ({ default: module.LogViewerModal })),
);

const ACTIVE_PAGE_STORAGE_KEY = 'agtools.active_page';
const RENDERABLE_PAGE_VALUES: readonly Page[] = [
  'dashboard',
  'api-relay',
  'overview',
  'codex',
  'claude',
  'claude-cli',
  'codex-api-service',
  'github-copilot',
  'windsurf',
  'kiro',
  'cursor',
  'grok',
  'codebuddy',
  'codebuddy-cn',
  'qoder',
  'zcode',
  'trae',
  'trae-solo',
  'trae-cn',
  'trae-solo-cn',
  'workbuddy',
  'zed',
  'instances',
  'wakeup',
  'verification',
  '2fa',
  'manual',
  'settings',
];
const RENDERABLE_PAGE_SET = new Set<string>(RENDERABLE_PAGE_VALUES);

const TOP_PROMO_DEFAULT_EXCLUDED_PAGES: readonly Page[] = ['api-relay', 'settings'];
const TOP_PROMO_PAGE_PLATFORM_TARGETS: Partial<Record<Page, readonly string[]>> = {
  overview: ['antigravity', 'antigravity-ide'],
  instances: ['antigravity', 'antigravity-ide'],
  wakeup: ['antigravity', 'antigravity-ide'],
  verification: ['antigravity', 'antigravity-ide'],
  codex: ['codex'],
  'codex-api-service': ['codex_api_service', 'codex'],
  'codex-instances': ['codex'],
  claude: ['claude', 'claude-manager'],
  'claude-cli': ['claude', 'claude-manager'],
  zed: ['zed'],
  'github-copilot': ['github-copilot'],
  windsurf: ['windsurf'],
  kiro: ['kiro'],
  cursor: ['cursor'],
  grok: ['grok'],
  codebuddy: ['codebuddy'],
  'codebuddy-cn': ['codebuddy-cn'],
  qoder: ['qoder'],
  zcode: ['zcode'],
  trae: ['trae', 'trae-suite'],
  'trae-solo': ['trae-solo', 'trae-suite'],
  'trae-cn': ['trae-cn', 'trae-suite'],
  'trae-solo-cn': ['trae-solo-cn', 'trae-suite'],
  workbuddy: ['workbuddy'],
};

function normalizePromoTarget(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

function normalizePromoTargets(values?: string[] | null): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  return values
    .map((value) => normalizePromoTarget(value))
    .filter(Boolean);
}

function promoTargetsMatch(configuredTargets: string[], activeTargets: Set<string>): boolean {
  return configuredTargets.some((target) => target === '*' || activeTargets.has(target));
}

function resolveTopPromoDisplayMode(ad: TopRightAd): string {
  const mode = ad.displayMode ? normalizePromoTarget(ad.displayMode).replace(/[^a-z0-9]/g, '') : '';
  if (!mode) {
    return ad.displayPages?.length || ad.displayPlatforms?.length ? 'targets' : 'all';
  }
  return mode;
}

function isTopPromoAdVisibleOnPage(ad: TopRightAd, page: Page): boolean {
  const pageTargets = new Set([normalizePromoTarget(page)]);
  const platformTargets = new Set(
    (TOP_PROMO_PAGE_PLATFORM_TARGETS[page] ?? []).map((value) => normalizePromoTarget(value)),
  );
  const displayPages = normalizePromoTargets(ad.displayPages);
  const displayPlatforms = normalizePromoTargets(ad.displayPlatforms);
  const pageMatches = promoTargetsMatch(displayPages, pageTargets);
  const platformMatches = promoTargetsMatch(displayPlatforms, platformTargets);

  if (
    TOP_PROMO_DEFAULT_EXCLUDED_PAGES.includes(page)
    && !pageMatches
    && !displayPages.includes('*')
  ) {
    return false;
  }

  if (promoTargetsMatch(normalizePromoTargets(ad.excludePages), pageTargets)) {
    return false;
  }
  if (promoTargetsMatch(normalizePromoTargets(ad.excludePlatforms), platformTargets)) {
    return false;
  }

  switch (resolveTopPromoDisplayMode(ad)) {
    case 'dashboard':
      return page === 'dashboard';
    case 'platforms':
      return platformMatches;
    case 'dashboardandplatforms':
      return page === 'dashboard' || platformMatches;
    case 'pages':
      return pageMatches;
    case 'dashboardandpages':
      return page === 'dashboard' || pageMatches;
    case 'targets':
      return pageMatches || platformMatches;
    case 'all':
    default:
      return true;
  }
}

function normalizeStoredActivePage(value: string | null): Page | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  return RENDERABLE_PAGE_SET.has(normalized) ? (normalized as Page) : null;
}

/** Tùy chọn trang khởi động: `last` khôi phục trang trước, các giá trị khác là Page ID */
function normalizeStartupPagePreference(value: string | null | undefined): 'last' | Page {
  if (resolveAntigravityStartupTarget(value)) return 'overview';
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === 'last') {
    return 'last';
  }
  return RENDERABLE_PAGE_SET.has(normalized) ? (normalized as Page) : 'last';
}

interface GeneralConfigTheme {
  theme: string;
  theme_color?: string;
  reduced_motion_enabled: boolean;
  ui_scale?: number;
}

interface GeneralConfigLanguage {
  language: string;
}

interface GeneralConfig extends GeneralConfigTheme, GeneralConfigLanguage {
  opencode_app_path: string;
  antigravity_app_path: string;
  codex_app_path: string;
  codex_launch_on_switch: boolean;
  top_right_ad_visible?: boolean;
  vscode_app_path: string;
  windsurf_app_path: string;
  kiro_app_path: string;
  cursor_app_path: string;
  claude_app_path: string;
  claude_app_scan_roots: string;
  codebuddy_app_path: string;
  codebuddy_cn_app_path: string;
  qoder_app_path: string;
  trae_app_path: string;
  trae_solo_app_path: string;
  trae_cn_app_path: string;
  trae_solo_cn_app_path: string;
  trae_app_scan_roots: string;
  trae_solo_app_scan_roots: string;
  trae_cn_app_scan_roots: string;
  trae_solo_cn_app_scan_roots: string;
  workbuddy_app_path: string;
  zed_app_path: string;
}

type AppPathMissingDetail = {
  app:
    | 'antigravity'
    | 'codex'
    | 'claude'
    | 'vscode'
    | 'windsurf'
    | 'kiro'
    | 'cursor'
    | 'codebuddy'
    | 'codebuddy_cn'
    | 'qoder'
    | 'trae'
    | 'trae_solo'
    | 'trae_cn'
    | 'trae_solo_cn'
    | 'workbuddy'
    | 'zed';
  retry?:
    | { kind: 'default'; runtimeTarget?: string }
    | { kind: 'instance'; instanceId?: string; runtimeTarget?: string }
    | { kind: 'switchAccount'; accountId?: string; runtimeTarget?: string };
};

type AppLaunchCandidate = {
  target_type: string;
  label: string;
  target: string;
  source: string;
  supports_multi_instance: boolean;
};

function isClaudeWindowsAppLaunchTarget(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith('shell:appsfolder\\') || trimmed.startsWith('shell:appsfolder/');
}

const WAKEUP_ENABLED_KEY = 'agtools.wakeup.enabled';
const TASKS_STORAGE_KEY = 'agtools.wakeup.tasks';
const WAKEUP_FORCE_DISABLE_MIGRATION_KEY = 'agtools.wakeup.migration.force_disable_0_8_14';

function isTraePlatformApp(app: string): app is 'trae' | 'trae_solo' | 'trae_cn' | 'trae_solo_cn' {
  return app === 'trae' || app === 'trae_solo' || app === 'trae_cn' || app === 'trae_solo_cn';
}

type TraePlatformApp = 'trae' | 'trae_solo' | 'trae_cn' | 'trae_solo_cn';

function getTraeAppPath(config: GeneralConfig, app: TraePlatformApp): string {
  switch (app) {
    case 'trae_solo':
      return config.trae_solo_app_path;
    case 'trae_cn':
      return config.trae_cn_app_path;
    case 'trae_solo_cn':
      return config.trae_solo_cn_app_path;
    case 'trae':
    default:
      return config.trae_app_path;
  }
}

const TOP_RIGHT_AD_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const REMOTE_CONFIG_FALLBACK_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const EXTERNAL_IMPORT_DEDUPE_WINDOW_MS = 30 * 1000;

type WakeupHistoryRecord = {
  id: string;
  timestamp: number;
  triggerType: string;
  triggerSource: string;
  taskName?: string;
  accountEmail: string;
  modelId: string;
  prompt?: string;
  success: boolean;
  message?: string;
  duration?: number;
};

type WakeupTaskResultPayload = {
  taskId: string;
  lastRunAt: number;
  records: WakeupHistoryRecord[];
};

type QuotaAlertPayload = {
  platform?: string;
  current_account_id: string;
  current_email: string;
  threshold: number;
  threshold_display?: string | null;
  lowest_percentage: number;
  low_models: string[];
  recommended_account_id?: string | null;
  recommended_email?: string | null;
  triggered_at: number;
};

type QuotaAlertPlatform =
  | 'antigravity'
  | 'codex'
  | 'claude'
  | 'github_copilot'
  | 'windsurf'
  | 'kiro'
  | 'cursor'
  | 'grok'
  | 'codebuddy'
  | 'codebuddy_cn'
  | 'qoder'
  | 'trae'
  | 'workbuddy'
  | 'zed';
type UpdateCheckSource = 'auto' | 'manual';
type UpdateActionState = 'hidden' | 'available' | 'downloading' | 'installing' | 'ready';

type UpdateRuntimeInfo = {
  platform: string;
  linux_install_kind: string;
  linux_managed_install_supported: boolean;
  updater_target?: string | null;
};

type LinuxUpdateProgressPhase =
  | 'download_started'
  | 'downloading'
  | 'downloaded'
  | 'auth_required'
  | 'installing'
  | 'completed';

type LinuxUpdateProgressPayload = {
  version: string;
  phase: LinuxUpdateProgressPhase;
  progress?: number | null;
};

type UpdateAction = {
  state: UpdateActionState;
  version: string | null;
  progress: number;
  requiresInstall: boolean;
};

function buildExternalImportDedupeKey(payload: {
  providerId: string;
  page: string;
  token: string;
  importUrl?: string | null;
  apiBaseUrl?: string | null;
  minAppVersion?: string | null;
  rawUrl?: string | null;
}): string {
  return [
    payload.providerId,
    payload.page,
    payload.rawUrl ?? '',
    payload.importUrl ?? '',
    payload.apiBaseUrl ?? '',
    payload.minAppVersion ?? '',
    payload.token,
  ].join('|');
}

function parseVersionParts(value: string | null | undefined): number[] {
  if (!value) return [];
  return value
    .trim()
    .replace(/^v/i, '')
    .split(/[^\d]+/)
    .filter(Boolean)
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part) && part >= 0);
}

function isVersionLowerThan(currentVersion: string, minimumVersion: string): boolean {
  const currentParts = parseVersionParts(currentVersion);
  const minimumParts = parseVersionParts(minimumVersion);
  if (currentParts.length === 0 || minimumParts.length === 0) {
    return false;
  }
  const maxLength = Math.max(currentParts.length, minimumParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const current = currentParts[index] ?? 0;
    const minimum = minimumParts[index] ?? 0;
    if (current < minimum) return true;
    if (current > minimum) return false;
  }
  return false;
}

function normalizeQuotaAlertPlatform(platform: string | undefined): QuotaAlertPlatform {
  switch (platform) {
    case 'codex':
      return 'codex';
    case 'claude':
    case 'claude-cli':
      return 'claude';
    case 'github_copilot':
      return 'github_copilot';
    case 'windsurf':
      return 'windsurf';
    case 'kiro':
      return 'kiro';
    case 'cursor':
      return 'cursor';
    case 'grok':
      return 'grok';
    case 'codebuddy':
      return 'codebuddy';
    case 'codebuddy_cn':
      return 'codebuddy_cn';
    case 'qoder':
      return 'qoder';
    case 'trae':
    case 'trae-solo':
    case 'trae_solo':
    case 'trae-cn':
    case 'trae_cn':
    case 'trae-solo-cn':
    case 'trae_solo_cn':
      return 'trae';
    case 'zed':
      return 'zed';
    default:
      return 'antigravity';
  }
}

function getQuotaAlertPlatformLabel(
  platform: QuotaAlertPlatform,
  t: (key: string, defaultValue: string) => string,
): string {
  switch (platform) {
    case 'codex':
      return t('nav.codex', 'Codex');
    case 'claude':
      return t('nav.claude', 'Claude');
    case 'github_copilot':
      return t('nav.githubCopilot', 'GitHub Copilot');
    case 'windsurf':
      return 'Devin';
    case 'kiro':
      return 'Kiro';
    case 'cursor':
      return 'Cursor';
    case 'grok':
      return 'Grok CLI';
    case 'codebuddy':
      return 'CodeBuddy';
    case 'codebuddy_cn':
      return t('nav.codebuddyCn', 'CodeBuddy CN');
    case 'qoder':
      return t('nav.qoder', 'Qoder');
    case 'trae':
      return t('nav.trae', 'Trae');
    case 'zed':
      return t('nav.zed', 'Zed');
    default:
      return t('nav.overview', 'Antigravity IDE');
  }
}

function getQuotaAlertTargetPage(platform: QuotaAlertPlatform): Page {
  switch (platform) {
    case 'codex':
      return 'codex';
    case 'claude':
      return 'claude';
    case 'github_copilot':
      return 'github-copilot';
    case 'windsurf':
      return 'windsurf';
    case 'kiro':
      return 'kiro';
    case 'cursor':
      return 'cursor';
    case 'grok':
      return 'grok';
    case 'codebuddy':
      return 'codebuddy';
    case 'codebuddy_cn':
      return 'codebuddy-cn';
    case 'qoder':
      return 'qoder';
    case 'trae':
      return 'trae';
    case 'workbuddy':
      return 'workbuddy';
    case 'zed':
      return 'zed';
    default:
      return 'overview';
  }
}

function getQuotaAlertQuickSettingsType(platform: QuotaAlertPlatform): QuickSettingsType {
  switch (platform) {
    case 'codex':
      return 'codex';
    case 'claude':
      return 'claude';
    case 'github_copilot':
      return 'github_copilot';
    case 'windsurf':
      return 'windsurf';
    case 'kiro':
      return 'kiro';
    case 'cursor':
      return 'cursor';
    case 'grok':
      return 'grok';
    case 'codebuddy':
      return 'codebuddy';
    case 'codebuddy_cn':
      return 'codebuddy_cn';
    case 'qoder':
      return 'qoder';
    case 'trae':
      return 'trae';
    case 'workbuddy':
      return 'workbuddy';
    case 'zed':
      return 'zed';
    default:
      return 'antigravity';
  }
}

function isElementVisible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0;
}

function triggerPageRefreshButton(): boolean {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button.btn.btn-secondary.icon-only:not(:disabled)'),
  );

  const target = buttons.find((button) => {
    if (!isElementVisible(button)) {
      return false;
    }
    return !!button.querySelector('svg.lucide-refresh-cw');
  });

  if (!target) {
    return false;
  }

  target.click();
  return true;
}

function isWindowsPlatform(): boolean {
  const navWithUAData = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = navWithUAData.userAgentData?.platform || navigator.platform || '';
  return platform.toLowerCase().includes('win');
}

function MainApp() {
  const { t } = useTranslation();
  const sideNavLayoutMode = useSideNavLayoutStore((state) => state.mode);
  const sideNavClassicCollapsed = useSideNavLayoutStore((state) => state.classicCollapsed);
  const sideNavClassicFirstSyncDone = useSideNavLayoutStore((state) => state.classicFirstSyncDone);
  const markSideNavClassicFirstSyncDone = useSideNavLayoutStore((state) => state.markClassicFirstSyncDone);
  const syncSidebarEntriesFromDashboard = usePlatformLayoutStore((state) => state.syncSidebarEntriesFromDashboard);
  const [page, setPage] = useState<Page>(() => {
    try {
      const saved = normalizeStoredActivePage(localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY));
      if (saved) {
        return saved;
      }
      localStorage.removeItem(ACTIVE_PAGE_STORAGE_KEY);
    } catch {}
    return 'dashboard';
  });
  const isCodexSuitePage = page === 'codex' || page === 'codex-api-service';
  const [codexSuiteKeepAlive, setCodexSuiteKeepAlive] = useState(isCodexSuitePage);
  const shouldMountCodexSuite = isCodexSuitePage || codexSuiteKeepAlive;

  useEffect(() => {
    if (isCodexSuitePage) {
      setCodexSuiteKeepAlive(true);
    }
  }, [isCodexSuitePage]);

  useEffect(() => {
    const ensureMounted = () => setCodexSuiteKeepAlive(true);
    window.addEventListener('codex-suite-ensure-mounted', ensureMounted);
    return () => {
      window.removeEventListener('codex-suite-ensure-mounted', ensureMounted);
    };
  }, []);

  useEffect(() => {
    void hydrateUserMemory().then((memory) => {
      const store = useSideNavLayoutStore.getState();
      if (
        memory.dismissed[USER_MEMORY_FLAGS.classicSwitchPrompt] ||
        store.hideClassicSwitchPrompt
      ) {
        store.setHideClassicSwitchPrompt(true);
      }
    });
  }, []);

  useEffect(() => {
    try {
      const normalized = normalizeStoredActivePage(page);
      if (normalized) {
        localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, normalized);
      } else {
        localStorage.removeItem(ACTIVE_PAGE_STORAGE_KEY);
        setPage('dashboard');
      }
    } catch (e) {
      console.warn('Failed to save active page to localStorage:', e);
    }
  }, [page]);

  // Khởi động nguội: trang cố định được ưu tiên hơn trang lưu trong localStorage
  useEffect(() => {
    let disposed = false;
    const applyStartupPagePreference = async () => {
      try {
        const config = await invoke<{ startup_page?: string }>('get_general_config');
        if (disposed) {
          return;
        }
        const preferred = normalizeStartupPagePreference(config.startup_page);
        const antigravityTarget = resolveAntigravityStartupTarget(config.startup_page);
        if (antigravityTarget) setAntigravityRuntimeTarget(antigravityTarget);
        if (preferred !== 'last') {
          setPage(preferred);
        }
      } catch (error) {
        console.warn('Failed to apply startup page preference:', error);
      }
    };
    void applyStartupPagePreference();
    return () => {
      disposed = true;
    };
  }, []);

  // Khởi động nguội: khôi phục trạng thái proxy Codex theo cấu hình
  useEffect(() => {
    void useCodexAccountStore.getState().restoreActiveTakeoverIfNeeded();
  }, []);

  // Đồng bộ nền tảng của cửa sổ nổi/menu khi chuyển nền tảng ở cửa sổ chính
  useEffect(() => {
    const platformId = resolvePlatformIdFromPage(page);
    if (!platformId) {
      return;
    }
    void emitActivePlatformFocus({
      platformId,
      page,
      reason: 'main-window-page',
    });
  }, [page]);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [updateNotificationKey, setUpdateNotificationKey] = useState(0);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [showPlatformLayoutModal, setShowPlatformLayoutModal] = useState(false);
  const [platformLayoutRequestedGroupId, setPlatformLayoutRequestedGroupId] = useState<string | null>(null);
  const [showBreakout, setShowBreakout] = useState(false);
  const [hasBreakoutSession, setHasBreakoutSession] = useState(false);
  const [appPathMissing, setAppPathMissing] = useState<AppPathMissingDetail | null>(null);
  const [appPathSetting, setAppPathSetting] = useState(false);
  const [appPathDetecting, setAppPathDetecting] = useState(false);
  const [appPathDraft, setAppPathDraft] = useState('');
  const [appLaunchCandidates, setAppLaunchCandidates] = useState<AppLaunchCandidate[]>([]);
  const [appPathActionError, setAppPathActionError] = useState('');
  const [appPathScanError, setAppPathScanError] = useState('');
  const [versionJumpInfo, setVersionJumpInfo] = useState<{
    previous_version: string;
    current_version: string;
    release_notes: string;
    release_notes_zh: string;
  } | null>(null);
  const [showVersionJumpNotification, setShowVersionJumpNotification] = useState(false);
  const [updateRuntimeInfo, setUpdateRuntimeInfo] = useState<UpdateRuntimeInfo | null>(null);
  const [updateRuntimeInfoLoaded, setUpdateRuntimeInfoLoaded] = useState(false);
  const [updateNotificationInfo, setUpdateNotificationInfo] = useState<UpdateInfo | null>(null);
  const [updateNotificationChecking, setUpdateNotificationChecking] = useState(false);
  const [updateRemindersEnabled, setUpdateRemindersEnabled] = useState(false);
  const [updateSkipError, setUpdateSkipError] = useState('');
  const [silentUpdateVersion, setSilentUpdateVersion] = useState<string | null>(null);
  const [updateAction, setUpdateAction] = useState<UpdateAction>({
    state: 'hidden',
    version: null,
    progress: 0,
    requiresInstall: true,
  });
  const [updateRetryStatus, setUpdateRetryStatus] = useState('');
  const [updateDownloadError, setUpdateDownloadError] = useState('');
  const [updateErrorDetails, setUpdateErrorDetails] = useState('');
  const pendingSilentUpdateRef = useRef<UpdaterUpdate | null>(null);
  const activeUpdateDownloadRef = useRef<UpdaterUpdate | null>(null);
  const updateCancelRequestedRef = useRef(false);
  const updateDownloadTaskIdRef = useRef(0);
  const updateDownloadOwnerRef = useRef<'none' | 'shared' | 'silent'>('none');
  const updateCheckRequestIdRef = useRef(0);
  const updatePromptPolicyRef = useRef(new UpdatePromptPolicy());
  const externalImportHandledAtRef = useRef<Map<string, number>>(new Map());
  const { showModal, closeModal } = useGlobalModal();
  const topRightAdState = useTopRightAdStore((state) => state.state);
  const fetchTopRightAdState = useTopRightAdStore((state) => state.fetchState);
  const forceRefreshTopRightAdState = useTopRightAdStore((state) => state.forceRefreshState);
  const sponsorModuleState = useSponsorStore((state) => state.state);
  const fetchSponsorModuleState = useSponsorStore((state) => state.fetchState);
  const sponsorModuleInitialized = useSponsorStore((state) => state.initialized);
  const fetchRemoteConfigState = useRemoteConfigStore((state) => state.fetchState);
  const sponsorEntryVisible = Boolean(sponsorModuleState.sponsorModule);
  const [topRightAdVisible, setTopRightAdVisible] = useState(true);
  const topRightAdVisibleRef = useRef<boolean | null>(null);
  const visibleTopCenterPromoAds = useMemo(
    () => topRightAdState.ads.filter((ad) => isTopPromoAdVisibleOnPage(ad, page)),
    [page, topRightAdState.ads],
  );
  const trayRefreshInFlightRef = useRef(false);
  const openPlatformLayoutModal = useCallback(() => {
    setPlatformLayoutRequestedGroupId(null);
    setShowPlatformLayoutModal(true);
  }, []);
  const openBreakout = useCallback(() => {
    setHasBreakoutSession(true);
    setShowBreakout(true);
  }, []);
  const ensureExternalImportVersionCompatible = useCallback(
    async (payload: ExternalProviderImportPayload): Promise<boolean> => {
      const requiredVersion = payload.minAppVersion?.trim().replace(/^v/i, '');
      if (!requiredVersion) return true;

      let currentVersion = '';
      try {
        currentVersion = await getVersion();
      } catch (error) {
        console.warn('[ExternalImport][App] Không thể đọc phiên bản ứng dụng; đã hủy yêu cầu nhập', error);
      }

      if (currentVersion && !isVersionLowerThan(currentVersion, requiredVersion)) {
        return true;
      }

      showModal({
        title: t('common.shared.externalImport.versionUnsupportedTitle', "Phiên bản ứng dụng quá thấp"),
        description: t(
          'common.shared.externalImport.versionUnsupportedDesc',
          "Cách này chưa được hỗ trợ. Vui lòng tải phiên bản mới nhất.",
        ),
        width: 'sm',
        actions: [
          {
            id: 'check-update',
            label: t('common.shared.externalImport.checkUpdate', "Kiểm tra cập nhật"),
            variant: 'primary',
            onClick: () => {
              window.dispatchEvent(
                new CustomEvent('update-check-requested', {
                  detail: { source: 'manual' satisfies UpdateCheckSource },
                }),
              );
            },
          },
          {
            id: 'close',
            label: t('common.close', "Đóng"),
            variant: 'secondary',
          },
        ],
      });
      console.warn('[ExternalImport][App] Phiên bản hiện tại không hỗ trợ cách nhập này; đã hủy yêu cầu', {
        currentVersion: currentVersion || null,
        requiredVersion,
        providerId: payload.providerId,
      });
      return false;
    },
    [showModal, t],
  );

  const handleExternalProviderImportRawPayload = useCallback(async (rawPayload: unknown) => {
    console.info('[ExternalImport][App] Đã nhận payload gốc:', rawPayload);
    const normalized = normalizeExternalProviderImportPayload(rawPayload);
    if (!normalized) {
      console.warn('[ExternalImport][App] Chuẩn hóa payload thất bại; đã bỏ qua');
      return;
    }
    if (!(await ensureExternalImportVersionCompatible(normalized))) {
      return;
    }
    const now = Date.now();
    for (const [key, handledAt] of externalImportHandledAtRef.current) {
      if (now - handledAt > EXTERNAL_IMPORT_DEDUPE_WINDOW_MS) {
        externalImportHandledAtRef.current.delete(key);
      }
    }
    const dedupeKey = buildExternalImportDedupeKey(normalized);
    if (externalImportHandledAtRef.current.has(dedupeKey)) {
      console.info('[ExternalImport][App] Đã bỏ qua payload nhập trùng lặp');
      return;
    }
    externalImportHandledAtRef.current.set(dedupeKey, now);
    console.info('[ExternalImport][App] Đã chuẩn hóa payload:', {
      providerId: normalized.providerId,
      page: normalized.page,
      autoImport: normalized.autoImport,
      tokenLength: normalized.token.length,
      hasImportUrl: Boolean(normalized.importUrl),
      apiBaseUrl: normalized.apiBaseUrl ?? null,
      minAppVersion: normalized.minAppVersion ?? null,
      source: normalized.source ?? null,
    });
    setPage(normalized.page);
    window.setTimeout(() => {
      console.info('[ExternalImport][App] Đã phát sự kiện nhập đến giao diện');
      dispatchExternalProviderImportEvent(normalized);
    }, 0);
  }, [ensureExternalImportVersionCompatible]);
  const handleBreakoutMinimize = useCallback(() => {
    setShowBreakout(false);
  }, []);
  const handleBreakoutTerminate = useCallback(() => {
    setShowBreakout(false);
    setHasBreakoutSession(false);
  }, []);
  const handleResumeBreakout = useCallback(() => {
    if (!hasBreakoutSession) return;
    setShowBreakout(true);
  }, [hasBreakoutSession]);

  const {
    count: easterEggClickCount,
    registerClick: handleEasterEggTriggerClick,
    reset: resetEasterEggTrigger,
  } = useEasterEggTrigger({
    threshold: 20,
    windowMs: 8000,
    onTrigger: openBreakout,
  });
  const handleBreakoutEntryTriggerClick = useCallback(() => {
    if (hasBreakoutSession) {
      resetEasterEggTrigger();
      handleResumeBreakout();
      return;
    }
    handleEasterEggTriggerClick();
  }, [handleEasterEggTriggerClick, handleResumeBreakout, hasBreakoutSession, resetEasterEggTrigger]);
  
  // Bật hook tự động làm mới
  useAutoRefresh();

  // Khởi tạo trình lắng nghe thông báo đánh thức
  useEffect(() => {
    initWakeupNotificationListener();
  }, []);

  useEffect(() => {
    let disposed = false;

    const syncLanguageFromConfig = async () => {
      try {
        const config = await invoke<GeneralConfigLanguage>('get_general_config');
        const nextLanguage = await syncLanguage(config.language);
        if (disposed) {
          return;
        }
        window.dispatchEvent(
          new CustomEvent('general-language-updated', { detail: { language: nextLanguage } }),
        );
      } catch (error) {
        console.error('Failed to sync language config:', error);
      }
    };

    void syncLanguageFromConfig();
    window.addEventListener('config-updated', syncLanguageFromConfig);
    return () => {
      disposed = true;
      window.removeEventListener('config-updated', syncLanguageFromConfig);
    };
  }, []);

  useEffect(() => {
    const handleRefreshShortcut = (event: KeyboardEvent) => {
      const isRefreshKey = event.key.toLowerCase() === 'r';
      const isWindowsF5 = isWindowsPlatform() && event.key === 'F5';
      const hasMainModifier = event.metaKey || event.ctrlKey;
      const matchMainRefresh = isRefreshKey && hasMainModifier && !event.altKey && !event.shiftKey;
      const matchWindowsRefresh = isWindowsF5 && !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
      if ((!matchMainRefresh && !matchWindowsRefresh) || event.repeat) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      triggerPageRefreshButton();
    };

    window.addEventListener('keydown', handleRefreshShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleRefreshShortcut, true);
    };
  }, []);

  // Điều chỉnh tỷ lệ giao diện bằng phím tắt; dùng ⌘0 / Ctrl+0 để đặt lại.
  useEffect(() => {
    let disposed = false;
    let currentScale = UI_SCALE_DEFAULT;
    let saveTimer: number | null = null;
    let pendingScale: number | null = null;
    let saveQueue: Promise<void> = Promise.resolve();

    const loadCurrentScale = async () => {
      try {
        const config = await invoke<{ ui_scale?: number }>('get_general_config');
        if (disposed) return;
        currentScale = normalizeUiScale(config.ui_scale);
      } catch (error) {
        console.error('Failed to load UI scale for shortcuts:', error);
      }
    };

    const persistScale = (scale: number) => {
      pendingScale = scale;
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
      }
      saveTimer = window.setTimeout(() => {
        saveTimer = null;
        const toSave = pendingScale;
        pendingScale = null;
        if (toSave == null) return;
        saveQueue = saveQueue
          .catch(() => undefined)
          .then(async () => {
            if (disposed) return;
            try {
              await invoke('patch_general_config', {
                updates: { ui_scale: toSave },
              });
              window.dispatchEvent(new Event('config-updated'));
            } catch (error) {
              console.error('Failed to save UI scale:', error);
            }
          });
      }, 250);
    };

    const handleZoomShortcut = (event: KeyboardEvent) => {
      const hasMainModifier = event.metaKey || event.ctrlKey;
      if (!hasMainModifier || event.altKey) {
        return;
      }

      const zoomIn = isUiScaleZoomInKey(event);
      const zoomOut = isUiScaleZoomOutKey(event);
      const reset = isUiScaleResetKey(event);
      if (!zoomIn && !zoomOut && !reset) {
        return;
      }
      // Đặt lại chỉ một lần; cho phép giữ phím khi phóng to/thu nhỏ.
      if (reset && event.repeat) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nextScale = reset
        ? UI_SCALE_DEFAULT
        : stepUiScale(currentScale, zoomIn ? 1 : -1);
      if (nextScale === currentScale) {
        return;
      }
      currentScale = nextScale;
      void applyWebviewUiScale(nextScale).catch((error) => {
        console.error('Failed to apply UI scale shortcut:', error);
      });
      persistScale(nextScale);
    };

    void loadCurrentScale();
    window.addEventListener('keydown', handleZoomShortcut, true);
    window.addEventListener('config-updated', loadCurrentScale);
    return () => {
      disposed = true;
      window.removeEventListener('keydown', handleZoomShortcut, true);
      window.removeEventListener('config-updated', loadCurrentScale);
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
      }
    };
  }, []);

  useEffect(() => {
    void fetchTopRightAdState();
  }, [fetchTopRightAdState]);

  useEffect(() => {
    let disposed = false;

    const loadTopRightAdVisible = async () => {
      try {
        const config = await invoke<GeneralConfig>('get_general_config');
        if (disposed) {
          return;
        }
        const nextVisible = config.top_right_ad_visible ?? true;
        const previousVisible = topRightAdVisibleRef.current;
        topRightAdVisibleRef.current = nextVisible;
        setTopRightAdVisible(nextVisible);
        if (previousVisible === false && nextVisible) {
          void forceRefreshTopRightAdState();
        }
      } catch (error) {
        if (disposed) {
          return;
        }
        console.error('Failed to load top-right ad visibility config:', error);
        topRightAdVisibleRef.current = true;
        setTopRightAdVisible(true);
      }
    };

    void loadTopRightAdVisible();
    window.addEventListener('config-updated', loadTopRightAdVisible);
    return () => {
      disposed = true;
      window.removeEventListener('config-updated', loadTopRightAdVisible);
    };
  }, [forceRefreshTopRightAdState]);

  useEffect(() => {
    void fetchSponsorModuleState();
  }, [fetchSponsorModuleState]);

  useEffect(() => {
    let disposed = false;
    let timer: number | null = null;

    const scheduleNextRefresh = (delayMs: number) => {
      if (disposed) return;
      const normalizedDelay = Number.isFinite(delayMs) && delayMs >= 60_000
        ? delayMs
        : REMOTE_CONFIG_FALLBACK_REFRESH_INTERVAL_MS;
      timer = window.setTimeout(() => {
        void refresh(false);
      }, normalizedDelay);
    };

    const refresh = async (force: boolean) => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
      const state = await fetchRemoteConfigState(force);
      scheduleNextRefresh(state.refreshIntervalMs);
    };

    void refresh(true);

    return () => {
      disposed = true;
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [fetchRemoteConfigState]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchTopRightAdState();
      void fetchSponsorModuleState();
    }, TOP_RIGHT_AD_REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [fetchSponsorModuleState, fetchTopRightAdState]);

  useEffect(() => {
    const handleLanguageChanged = () => {
      void fetchTopRightAdState();
      void fetchSponsorModuleState();
    };
    window.addEventListener('general-language-updated', handleLanguageChanged);
    return () => {
      window.removeEventListener('general-language-updated', handleLanguageChanged);
    };
  }, [fetchSponsorModuleState, fetchTopRightAdState]);

  useEffect(() => {
    const handleSponsorRoutesUpdated = () => {
      void useCodexAccountStore.getState().fetchAccounts();
      void useClaudeAccountStore.getState().fetchAccounts();
    };
    window.addEventListener('sponsor-routes-updated', handleSponsorRoutesUpdated);
    return () => {
      window.removeEventListener('sponsor-routes-updated', handleSponsorRoutesUpdated);
    };
  }, []);

  useEffect(() => {
    if (sponsorModuleInitialized && page === 'api-relay' && !sponsorEntryVisible) {
      setPage('dashboard');
    }
  }, [page, sponsorEntryVisible, sponsorModuleInitialized]);

  useEffect(() => {
    if (sideNavLayoutMode !== 'classic' || sideNavClassicFirstSyncDone) {
      return;
    }
    let current = true;
    void initializeClassicSidebar({
      isCurrent: () => current,
      initialize: syncSidebarEntriesFromDashboard,
      markInitialized: markSideNavClassicFirstSyncDone,
    });
    return () => { current = false; };
  }, [
    sideNavLayoutMode,
    sideNavClassicFirstSyncDone,
    syncSidebarEntriesFromDashboard,
    markSideNavClassicFirstSyncDone,
  ]);

  const openUpdateNotificationDetails = useCallback((source: UpdateCheckSource = 'manual') => {
    if (source === 'manual') updatePromptPolicyRef.current.openManual();
    setUpdateSkipError('');
    setUpdateNotificationKey(Date.now());
    setShowUpdateNotification(true);
  }, []);

  const openUpdateNotification = useCallback((source: UpdateCheckSource) => {
    if (source === 'manual') {
      window.dispatchEvent(new CustomEvent('update-check-started', { detail: { source } }));
    }
    openUpdateNotificationDetails();
  }, [openUpdateNotificationDetails]);

  const closeUpdateNotification = useCallback(() => {
    updatePromptPolicyRef.current.close();
    setShowUpdateNotification(false);
    setUpdateSkipError('');
    if (updateAction.state === 'hidden') {
      setUpdateNotificationInfo(null);
      setUpdateRetryStatus('');
      setUpdateDownloadError('');
      setUpdateErrorDetails('');
    }
  }, [updateAction.state]);

  const writeUpdateLog = useCallback((level: 'info' | 'warn' | 'error', message: string) => {
    void invoke('update_log', { level, message }).catch(() => {});
  }, []);

  const openAutomaticUpdatePrompt = useCallback((
    version: string,
    mode: RemoteUpdatePromptMode,
  ) => {
    if (!updatePromptPolicyRef.current.openAutomatic(version, mode)) {
      return false;
    }
    openUpdateNotificationDetails('auto');
    writeUpdateLog('info', `Chính sách từ xa đã mở hộp thoại cập nhật: version=${version}`);
    return true;
  }, [openUpdateNotificationDetails, writeUpdateLog]);

  const applyUpdateReminderPreference = useCallback((enabled: boolean, revision?: number) => {
    const policy = updatePromptPolicyRef.current;
    if (!policy.applyPreference(enabled, revision)) return;
    setUpdateRemindersEnabled(policy.enabled);
    if (policy.shouldCloseAutomaticPrompt()) {
      policy.close();
      setShowUpdateNotification(false);
    }
  }, []);

  const prepareCodexLocalAccessBeforeRelaunch = useCallback(async () => {
    setUpdateRetryStatus(
      t('update_notification.stoppingApiService', "Đang dừng dịch vụ API..."),
    );
    try {
      const state = await prepareCodexLocalAccessForRestart();
      writeUpdateLog(
        'info',
        `Đã dừng trình lắng nghe Codex API trước khi khởi động lại: enabled=${Boolean(state.collection?.enabled)}, running=${state.running}`,
      );
    } catch (error) {
      const compactError = sanitizeUpdaterErrorMessage(error);
      writeUpdateLog(
        'warn',
        `Không thể dừng Codex API; vẫn tiếp tục khởi động lại: error=${compactError}`,
      );
      setUpdateRetryStatus(
        t(
          'update_notification.stopApiServiceFailedContinue',
          "Dịch vụ API chưa dừng đúng cách. Vẫn tiếp tục khởi động lại...",
        ),
      );
    }
  }, [t, writeUpdateLog]);

  const restoreCodexLocalAccessAfterRelaunchFailure = useCallback(async () => {
    await invoke('codex_local_access_get_state').catch((error) => {
      writeUpdateLog(
        'warn',
        `Không thể khôi phục Codex API sau khi khởi động lại thất bại: error=${sanitizeUpdaterErrorMessage(error)}`,
      );
    });
  }, [writeUpdateLog]);

  const prepareUpdateNotificationInfo = useCallback(async (update: UpdaterUpdate): Promise<UpdateInfo> => {
    const { releaseNotes, releaseNotesZh } = parseUpdaterReleaseNotes(update.body);
    const currentVersion = update.currentVersion || (await getVersion());
    return {
      current_version: currentVersion,
      latest_version: update.version,
      download_url: resolveUpdaterDownloadUrl(update.version, update.rawJson),
      release_notes: releaseNotes,
      release_notes_zh: releaseNotesZh,
    };
  }, []);

  const handleUpdateCheckResult = useCallback((result: UpdateCheckResult) => {
    const latestVersion = result.latestVersion;
    if (result.status === 'has_update' && latestVersion) {
      setUpdateAction((prev) => {
        if (prev.state === 'downloading' && prev.version === latestVersion) {
          return prev;
        }
        if (prev.state === 'installing' && prev.version === latestVersion) {
          return prev;
        }
        if (prev.state === 'ready' && prev.version === latestVersion) {
          return prev;
        }
        return {
          state: 'available',
          version: latestVersion,
          progress: 0,
          requiresInstall: true,
        };
      });
      setUpdateRetryStatus('');
    } else if (result.status === 'up_to_date') {
      setUpdateAction((prev) => {
        if (prev.state === 'ready' || prev.state === 'downloading' || prev.state === 'installing') {
          return prev;
        }
        return {
          state: 'hidden',
          version: null,
          progress: 0,
          requiresInstall: true,
        };
      });
      setUpdateRetryStatus('');
      setUpdateDownloadError('');
      setUpdateErrorDetails('');
    }

    if (result.source === 'manual') {
      window.dispatchEvent(new CustomEvent('update-check-finished', { detail: result }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    invoke<UpdateRuntimeInfo>('get_update_runtime_info')
      .then((info) => {
        if (cancelled) {
          return;
        }
        setUpdateRuntimeInfo(info);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        console.error('[App] Failed to load update runtime info:', error);
        writeUpdateLog('warn', `Không thể tải thông tin môi trường cập nhật: error=${sanitizeUpdaterErrorMessage(error)}`);
      })
      .finally(() => {
        if (!cancelled) {
          setUpdateRuntimeInfoLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [writeUpdateLog]);

  useEffect(() => {
    let cancelled = false;
    const preferenceRevision = updatePromptPolicyRef.current.revision;
    invoke<{
      auto_check?: boolean;
      check_interval_hours?: number;
      auto_install?: boolean;
      last_run_version?: string;
      remind_on_update?: boolean;
      skipped_version?: string;
    }>('get_update_settings')
      .then((settings) => {
        if (cancelled) {
          return;
        }
        applyUpdateReminderPreference(settings?.remind_on_update ?? true, preferenceRevision);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [applyUpdateReminderPreference]);

  useEffect(() => {
    const handleUpdateReminderChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === 'boolean') {
        applyUpdateReminderPreference(detail.enabled);
      }
    };
    window.addEventListener('update-reminder-changed', handleUpdateReminderChanged as EventListener);
    return () => {
      window.removeEventListener('update-reminder-changed', handleUpdateReminderChanged as EventListener);
    };
  }, [applyUpdateReminderPreference]);

  const isLinuxManagedUpdate = updateRuntimeInfo?.platform === 'linux'
    && updateRuntimeInfo.linux_managed_install_supported;

  const getUpdaterCheckTarget = useCallback((): string | undefined => {
    if (typeof updateRuntimeInfo?.updater_target !== 'string') {
      return undefined;
    }

    const target = updateRuntimeInfo.updater_target.trim();
    return target.length > 0 ? target : undefined;
  }, [updateRuntimeInfo]);

  const runUpdaterCheck = useCallback(async () => {
    const { check } = await import('@tauri-apps/plugin-updater');
    const target = getUpdaterCheckTarget();
    return target ? check({ target }) : check();
  }, [getUpdaterCheckTarget]);

  const closeUpdaterHandle = useCallback(async (handle: UpdaterUpdate | null | undefined) => {
    if (!handle) {
      return;
    }
    await handle.close().catch(() => {});
  }, []);

  const runModalUpdateCheck = useCallback(async (source: UpdateCheckSource) => {
    const requestId = Date.now();
    updateCheckRequestIdRef.current = requestId;
    setUpdateNotificationInfo(null);
    setUpdateNotificationChecking(true);
    setUpdateRetryStatus('');
    setUpdateDownloadError('');
    setUpdateErrorDetails('');
    openUpdateNotification(source);

    try {
      const update = await retryWithBackoff(
        async () => runUpdaterCheck(),
        {
          delaysMs: UPDATE_CHECK_RETRY_DELAYS_MS,
          shouldRetry: isRetryableUpdaterError,
          onRetry: ({ retryIndex, totalRetries, delayMs, error }) => {
            if (updateCheckRequestIdRef.current !== requestId) {
              return;
            }
            const compactError = sanitizeUpdaterErrorMessage(error);
            setUpdateRetryStatus(
              t('update_notification.checkRetrying', {
                attempt: retryIndex,
                total: totalRetries,
              }),
            );
            writeUpdateLog(
              'warn',
              `Kiểm tra cập nhật tương tác thất bại; chuẩn bị thử lại(${retryIndex}/${totalRetries})，delay=${delayMs}ms，error=${compactError}`,
            );
          },
        },
      );

      if (updateCheckRequestIdRef.current !== requestId) {
        await closeUpdaterHandle(update);
        return;
      }

      setUpdateRetryStatus('');
      if (update) {
        const info = await prepareUpdateNotificationInfo(update);
        if (updateCheckRequestIdRef.current !== requestId) {
          await closeUpdaterHandle(update);
          return;
        }
        setUpdateNotificationInfo(info);
        handleUpdateCheckResult({
          source,
          status: 'has_update',
          currentVersion: info.current_version,
          latestVersion: info.latest_version,
        });
        await closeUpdaterHandle(update);
        return;
      }

      const currentVersion = await getVersion();
      if (updateCheckRequestIdRef.current !== requestId) {
        return;
      }
      updatePromptPolicyRef.current.close();
      setShowUpdateNotification(false);
      setUpdateNotificationInfo(null);
      handleUpdateCheckResult({
        source,
        status: 'up_to_date',
        currentVersion,
        latestVersion: currentVersion,
      });
    } catch (error) {
      if (updateCheckRequestIdRef.current !== requestId) {
        return;
      }
      console.error('[App] Interactive update check failed:', error);
      writeUpdateLog(
        'warn',
        `Kiểm tra cập nhật tương tác thất bại; đóng hộp thoại: error=${sanitizeUpdaterErrorMessage(error)}`,
      );
      updatePromptPolicyRef.current.close();
      setShowUpdateNotification(false);
      setUpdateNotificationInfo(null);
      handleUpdateCheckResult({
        source,
        status: 'failed',
        error: String(error),
      });
    } finally {
      if (updateCheckRequestIdRef.current === requestId) {
        setUpdateNotificationChecking(false);
      }
    }
  }, [
    closeUpdaterHandle,
    handleUpdateCheckResult,
    openUpdateNotification,
    prepareUpdateNotificationInfo,
    runUpdaterCheck,
    t,
    writeUpdateLog,
  ]);

  const handleApplyPendingUpdate = useCallback(async () => {
    const targetVersion = updateAction.version || silentUpdateVersion || '';
    const shouldInstall = updateAction.state === 'ready'
      ? updateAction.requiresInstall
      : Boolean(pendingSilentUpdateRef.current);
    let failureStage: 'prepare' | 'install' | 'relaunch' = 'prepare';
    try {
      writeUpdateLog(
        'info',
        `Người dùng chọn khởi động lại để cập nhật: version=${targetVersion || 'unknown'}, install_before_restart=${shouldInstall}`,
      );
      setUpdateRetryStatus(
        t('update_notification.stoppingApiService', "Đang dừng dịch vụ API..."),
      );
      setUpdateDownloadError('');
      setUpdateErrorDetails('');
      await prepareCodexLocalAccessBeforeRelaunch();
      failureStage = 'install';
      const pendingUpdate = pendingSilentUpdateRef.current;
      if (shouldInstall && pendingUpdate) {
        await pendingUpdate.install();
      }
      if (pendingUpdate) {
        await pendingUpdate.close().catch(() => {});
        pendingSilentUpdateRef.current = null;
      }
      setSilentUpdateVersion(null);
      setUpdateRetryStatus('');
      setUpdateDownloadError('');
      setUpdateErrorDetails('');
      setUpdateAction({
        state: 'ready',
        version: targetVersion || null,
        progress: 100,
        requiresInstall: false,
      });
      failureStage = 'relaunch';
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (error) {
      await restoreCodexLocalAccessAfterRelaunchFailure();
      console.error('[App] Failed to apply pending update:', error);
      const compactError = sanitizeUpdaterErrorMessage(error);
      const errorMessage = failureStage === 'prepare'
        ? t('update_notification.stopApiServiceFailed', "Không thể dừng dịch vụ API. Hãy tắt dịch vụ trước rồi thử lại.")
        : failureStage === 'install'
          ? t('update_notification.installFailed', "Cài đặt hệ thống thất bại. Hãy thử lại sau hoặc tải gói về thủ công.")
          : t('update_notification.restartRequiredAfterInstall', "Bản cập nhật đã được cài. Hãy khởi động lại ứng dụng thủ công để hoàn tất chuyển đổi.");
      setUpdateRetryStatus('');
      setUpdateDownloadError(errorMessage);
      setUpdateErrorDetails(compactError);
      writeUpdateLog(
        'error',
        `Không thể cài đặt bản cập nhật thủ công: stage=${failureStage}, error=${compactError}`,
      );
      throw error;
    }
  }, [
    prepareCodexLocalAccessBeforeRelaunch,
    restoreCodexLocalAccessAfterRelaunchFailure,
    silentUpdateVersion,
    updateAction,
    t,
    writeUpdateLog,
  ]);

  const runLinuxManagedUpdate = useCallback(async (expectedVersion: string) => {
    setUpdateRetryStatus('');
    setUpdateDownloadError('');
    setUpdateErrorDetails('');
    setSilentUpdateVersion(null);
    setUpdateAction({
      state: 'downloading',
      version: expectedVersion,
      progress: 0,
      requiresInstall: false,
    });

    if (pendingSilentUpdateRef.current) {
      await closeUpdaterHandle(pendingSilentUpdateRef.current);
      pendingSilentUpdateRef.current = null;
    }

    writeUpdateLog('info', `Bắt đầu cập nhật qua trình quản lý Linux: version=${expectedVersion}`);

    try {
      await invoke('install_linux_update', {
        expectedVersion,
      });

      setUpdateAction({
        state: 'ready',
        version: expectedVersion,
        progress: 100,
        requiresInstall: false,
      });
      setUpdateRetryStatus(t('update_notification.installSuccess', "Đã cài đặt bản cập nhật! Đang khởi động lại..."));
      setUpdateDownloadError('');
      setUpdateErrorDetails('');

      let relaunchStage: 'prepare' | 'relaunch' = 'prepare';
      try {
        await prepareCodexLocalAccessBeforeRelaunch();
        relaunchStage = 'relaunch';
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      } catch (error) {
        await restoreCodexLocalAccessAfterRelaunchFailure();
        const compactError = sanitizeUpdaterErrorMessage(error);
        console.error('[App] Linux managed update installed but relaunch failed:', error);
        writeUpdateLog(
          'error',
          `Đã cài bản cập nhật Linux nhưng không thể khởi động lại: version=${expectedVersion}, error=${compactError}`,
        );
        setUpdateRetryStatus('');
        setUpdateDownloadError(
          relaunchStage === 'prepare'
            ? t('update_notification.stopApiServiceFailed', "Không thể dừng dịch vụ API. Hãy tắt dịch vụ trước rồi thử lại.")
            : t('update_notification.restartRequiredAfterInstall', "Bản cập nhật đã được cài. Hãy khởi động lại ứng dụng thủ công để hoàn tất chuyển đổi."),
        );
        setUpdateErrorDetails(compactError);
      }
    } catch (error) {
      console.error('[App] Linux managed update failed:', error);
      const compactError = sanitizeUpdaterErrorMessage(error);
      writeUpdateLog('error', `Cập nhật qua trình quản lý Linux thất bại: version=${expectedVersion}, error=${compactError}`);
      setUpdateRetryStatus('');
      setUpdateDownloadError(
        t('update_notification.installFailed', "Cài đặt hệ thống thất bại. Hãy thử lại sau hoặc tải gói về thủ công."),
      );
      setUpdateErrorDetails(compactError);
      setUpdateAction({
        state: 'available',
        version: expectedVersion,
        progress: 0,
        requiresInstall: true,
      });
      throw error;
    }
  }, [
    closeUpdaterHandle,
    prepareCodexLocalAccessBeforeRelaunch,
    restoreCodexLocalAccessAfterRelaunchFailure,
    t,
    writeUpdateLog,
  ]);

  const runSharedUpdateDownload = useCallback(async (expectedVersion: string) => {
    const taskId = Date.now();
    updateDownloadTaskIdRef.current = taskId;
    updateCancelRequestedRef.current = false;
    updateDownloadOwnerRef.current = 'shared';
    setUpdateRetryStatus('');
    setUpdateDownloadError('');
    setUpdateErrorDetails('');
    setUpdateAction({
      state: 'downloading',
      version: expectedVersion,
      progress: 0,
      requiresInstall: true,
    });
    writeUpdateLog('info', `Bắt đầu tải bản cập nhật: version=${expectedVersion}`);

    let usedAttempts = 0;
    try {
      const downloadedUpdate = await retryWithBackoff(
        async (attempt) => {
          usedAttempts = attempt;
          if (updateCancelRequestedRef.current || updateDownloadTaskIdRef.current !== taskId) {
            throw createUpdaterCanceledError();
          }

          let candidate: UpdaterUpdate | null = null;
          try {
            candidate = await runUpdaterCheck();
            if (!candidate) {
              throw new Error('No update available from updater plugin');
            }
            activeUpdateDownloadRef.current = candidate;

            const candidateVersion = candidate.version;
            const { releaseNotes, releaseNotesZh } = parseUpdaterReleaseNotes(candidate.body);
            await invoke('save_pending_update_notes', {
              version: candidateVersion,
              releaseNotes,
              releaseNotesZh,
            }).catch((error) => {
              console.error('[App] Failed to cache shared update notes:', error);
              writeUpdateLog(
                'warn',
                `Không thể lưu ghi chú cập nhật vào bộ nhớ đệm: version=${candidateVersion}, error=${sanitizeUpdaterErrorMessage(error)}`,
              );
            });

            let downloaded = 0;
            let contentLength = 0;
            await candidate.download((event) => {
              if (updateCancelRequestedRef.current || updateDownloadTaskIdRef.current !== taskId) {
                throw createUpdaterCanceledError();
              }
              setUpdateAction((prev) => {
                if (prev.state !== 'downloading') {
                  return prev;
                }

                if (event.event === 'Started') {
                  contentLength = event.data.contentLength ?? 0;
                  return {
                    ...prev,
                    version: candidateVersion,
                    progress: 0,
                  };
                }

                if (event.event === 'Progress') {
                  downloaded += event.data.chunkLength;
                  const nextProgress = contentLength > 0
                    ? Math.min(100, Math.round((downloaded / contentLength) * 100))
                    : Math.min(95, prev.progress + 1);
                  return {
                    ...prev,
                    version: candidateVersion,
                    progress: nextProgress,
                  };
                }

                return {
                  ...prev,
                  version: candidateVersion,
                  progress: 100,
                };
              });
            });

            if (updateCancelRequestedRef.current || updateDownloadTaskIdRef.current !== taskId) {
              throw createUpdaterCanceledError();
            }

            return candidate;
          } catch (error) {
            if (candidate) {
              await closeUpdaterHandle(candidate);
            }
            if (activeUpdateDownloadRef.current === candidate) {
              activeUpdateDownloadRef.current = null;
            }
            throw error;
          }
        },
        {
          delaysMs: UPDATE_DOWNLOAD_RETRY_DELAYS_MS,
          shouldRetry: isRetryableUpdaterError,
          onRetry: ({ retryIndex, totalRetries, delayMs, error }) => {
            const compactError = sanitizeUpdaterErrorMessage(error);
            setUpdateRetryStatus(
              t('update_notification.downloadRetrying', {
                attempt: retryIndex,
                total: totalRetries,
              }),
            );
            writeUpdateLog(
              'warn',
              `Tải bản cập nhật thất bại; chuẩn bị thử lại(${retryIndex}/${totalRetries})，delay=${delayMs}ms，error=${compactError}`,
            );
            setUpdateAction((prev) => {
              if (prev.state !== 'downloading') {
                return prev;
              }
              return {
                ...prev,
                progress: 0,
              };
            });
          },
        },
      );

      if (updateCancelRequestedRef.current || updateDownloadTaskIdRef.current !== taskId) {
        await closeUpdaterHandle(downloadedUpdate);
        return;
      }

      if (pendingSilentUpdateRef.current) {
        await closeUpdaterHandle(pendingSilentUpdateRef.current);
      }
      pendingSilentUpdateRef.current = downloadedUpdate;
      activeUpdateDownloadRef.current = null;
      setSilentUpdateVersion(downloadedUpdate.version);
      setUpdateRetryStatus('');
      setUpdateDownloadError('');
      setUpdateErrorDetails('');
      setUpdateAction({
        state: 'ready',
        version: downloadedUpdate.version,
        progress: 100,
        requiresInstall: true,
      });
      writeUpdateLog('info', `Đã tải bản cập nhật; cần khởi động lại để cài: version=${downloadedUpdate.version}`);
    } catch (error) {
      if (isUpdaterCanceledError(error) || updateCancelRequestedRef.current || updateDownloadTaskIdRef.current !== taskId) {
        writeUpdateLog('info', `Đã hủy tải bản cập nhật: version=${expectedVersion}`);
        setUpdateRetryStatus(t('update_notification.updateCancelled', "Đã hủy cập nhật."));
        setUpdateDownloadError('');
        setUpdateErrorDetails('');
        return;
      }

      console.error('[App] Shared update download failed:', error);
      writeUpdateLog('error', `Không thể tải bản cập nhật: error=${sanitizeUpdaterErrorMessage(error)}`);
      setUpdateRetryStatus('');
      setUpdateDownloadError(
        t('update_notification.autoUpdateFailedAfterRetries', {
          count: Math.max(usedAttempts, 1),
        }),
      );
      setUpdateErrorDetails(sanitizeUpdaterErrorMessage(error));
      setUpdateAction({
        state: 'available',
        version: expectedVersion,
        progress: 0,
        requiresInstall: true,
      });
      throw error;
    } finally {
      if (updateDownloadTaskIdRef.current === taskId && updateDownloadOwnerRef.current === 'shared') {
        updateDownloadOwnerRef.current = 'none';
      }
    }
  }, [closeUpdaterHandle, runUpdaterCheck, t, writeUpdateLog]);

  const cancelUpdateDownload = useCallback(async () => {
    if (updateAction.state !== 'downloading') {
      return;
    }
    if (updateDownloadOwnerRef.current !== 'shared') {
      writeUpdateLog('info', 'Tác vụ tải hiện tại không hỗ trợ hủy');
      return;
    }

    const version = updateAction.version;
    updateCancelRequestedRef.current = true;
    updateDownloadTaskIdRef.current += 1;
    setUpdateRetryStatus('');
    setUpdateDownloadError('');
    setUpdateErrorDetails('');

    const active = activeUpdateDownloadRef.current;
    if (active) {
      await closeUpdaterHandle(active);
      activeUpdateDownloadRef.current = null;
    }

    if (version) {
      setUpdateAction({
        state: 'available',
        version,
        progress: 0,
        requiresInstall: true,
      });
    } else {
      setUpdateAction({
        state: 'hidden',
        version: null,
        progress: 0,
        requiresInstall: true,
      });
    }
    updateDownloadOwnerRef.current = 'none';
    writeUpdateLog('info', `Người dùng đã hủy tải bản cập nhật: version=${version || 'unknown'}`);
  }, [closeUpdaterHandle, updateAction.state, updateAction.version, writeUpdateLog]);

  const handleUpdatePrimaryAction = useCallback(async () => {
    updatePromptPolicyRef.current.openManual();
    if (updateAction.state === 'downloading') {
      openUpdateNotificationDetails();
      return;
    }
    if (updateAction.state === 'installing') {
      return;
    }

    if (updateAction.state === 'ready') {
      try {
        await handleApplyPendingUpdate();
      } catch (error) {
        console.error('[App] Update restart failed:', error);
        writeUpdateLog('error', `Không thể khởi động lại để cập nhật: error=${sanitizeUpdaterErrorMessage(error)}`);
        openUpdateNotificationDetails();
      }
      return;
    }

    if (updateAction.state !== 'available' || !updateAction.version) {
      return;
    }

    const expectedVersion = updateAction.version;
    try {
      if (isLinuxManagedUpdate) {
        await runLinuxManagedUpdate(expectedVersion);
      } else {
        await runSharedUpdateDownload(expectedVersion);
      }
    } catch (error) {
      console.error('[App] Update download failed:', error);
      writeUpdateLog('error', `Không thể tải bản cập nhật: error=${sanitizeUpdaterErrorMessage(error)}`);
      openUpdateNotificationDetails();
    }
  }, [
    handleApplyPendingUpdate,
    isLinuxManagedUpdate,
    openUpdateNotificationDetails,
    runLinuxManagedUpdate,
    runSharedUpdateDownload,
    updateAction,
    writeUpdateLog,
  ]);

  const handleQuickUpdateActionClick = useCallback(() => {
    const shouldOpenUpdateDetails = updateAction.state !== 'hidden'
      && (
        updateRemindersEnabled
        || updateAction.state === 'downloading'
        || updateAction.state === 'installing'
        || updateAction.state === 'ready'
      );

    if (!shouldOpenUpdateDetails) {
      if (versionJumpInfo) {
        (
          window as Window & {
            __agtoolsVersionJumpModalRequestedAt?: number;
          }
        ).__agtoolsVersionJumpModalRequestedAt = performance.now();
        setShowVersionJumpNotification(true);
      }
      return;
    }

    if (updateAction.state === 'installing') {
      return;
    }

    openUpdateNotificationDetails();
  }, [openUpdateNotificationDetails, updateAction.state, updateRemindersEnabled, versionJumpInfo]);

  const handleSkipUpdateVersion = useCallback(async () => {
    const targetVersion = updateNotificationInfo?.latest_version;
    if (!targetVersion) {
      return;
    }
    setUpdateSkipError('');
    try {
      await invoke('patch_update_settings', { skippedVersion: targetVersion });
      const pendingUpdate = pendingSilentUpdateRef.current;
      if (pendingUpdate && pendingUpdate.version === targetVersion) {
        await closeUpdaterHandle(pendingUpdate);
        pendingSilentUpdateRef.current = null;
      }
      writeUpdateLog('info', `Người dùng bỏ qua phiên bản cập nhật: version=${targetVersion}`);
      setUpdateAction((prev) => {
        if (
          prev.version === targetVersion
          && (prev.state === 'available' || prev.state === 'downloading' || prev.state === 'ready')
        ) {
          return {
            state: 'hidden',
            version: null,
            progress: 0,
            requiresInstall: true,
          };
        }
        return prev;
      });
      updatePromptPolicyRef.current.close();
      setShowUpdateNotification(false);
      setUpdateNotificationInfo(null);
      setUpdateRetryStatus('');
      setUpdateDownloadError('');
      setUpdateErrorDetails('');
      setSilentUpdateVersion(null);
      updateDownloadOwnerRef.current = 'none';
      setUpdateSkipError('');
    } catch (error) {
      console.error('[App] Failed to skip update version:', error);
      setUpdateSkipError(
        t('update_notification.skipFailed', {
          error: sanitizeUpdaterErrorMessage(error),
        }),
      );
      writeUpdateLog('error', `Không thể bỏ qua phiên bản cập nhật: error=${sanitizeUpdaterErrorMessage(error)}`);
    }
  }, [closeUpdaterHandle, t, updateNotificationInfo, writeUpdateLog]);

  useEffect(() => {
    return () => {
      const pendingUpdate = pendingSilentUpdateRef.current;
      if (pendingUpdate) {
        void pendingUpdate.close();
        pendingSilentUpdateRef.current = null;
      }
      const activeUpdate = activeUpdateDownloadRef.current;
      if (activeUpdate) {
        void activeUpdate.close();
        activeUpdateDownloadRef.current = null;
      }
    };
  }, []);

  const openQuickSettingsForPlatform = useCallback((platform: QuotaAlertPlatform) => {
    const targetPage = getQuotaAlertTargetPage(platform);
    const targetType = getQuotaAlertQuickSettingsType(platform);
    closeModal();
    setPage(targetPage);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('quick-settings:open', { detail: { type: targetType } }));
      });
    });
  }, [closeModal]);

  useEffect(() => {
    let cleanup: (() => void) | null = null;
    let disposed = false;

    const applyTheme = (newTheme: string) => {
      if (newTheme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', newTheme);
      }
    };

    const applyUiScale = async (rawScale?: number) => {
      try {
        await applyWebviewUiScale(rawScale);
      } catch (error) {
        console.error('Failed to apply UI scale:', error);
      }
    };

    const watchSystemTheme = () => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else {
        mediaQuery.addListener(handleChange);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange);
        } else {
          mediaQuery.removeListener(handleChange);
        }
      };
    };

    const syncVisualConfig = async () => {
      try {
        const config = await invoke<GeneralConfigTheme>('get_general_config');
        if (disposed) {
          return;
        }
        applyTheme(config.theme);
        try {
          document.documentElement.setAttribute(
            'data-theme-color',
            (config.theme_color || 'default').trim() || 'default',
          );
        } catch {
          /* ignore */
        }
        applyReducedMotion(config.reduced_motion_enabled);
        void applyUiScale(config.ui_scale);
        cleanup?.();
        cleanup = null;
        if (config.theme === 'system') {
          cleanup = watchSystemTheme();
        }
      } catch (error) {
        console.error('Failed to load theme config:', error);
      }
    };

    void syncVisualConfig();
    window.addEventListener('config-updated', syncVisualConfig);

    return () => {
      disposed = true;
      window.removeEventListener('config-updated', syncVisualConfig);
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const syncWakeupStateOnStartup = async () => {
      let officialLsVersionMode = loadWakeupOfficialLsVersionMode();
      try {
        // Chuyển đổi một lần: tắt công tắc đánh thức sau nâng cấp; người dùng có thể bật lại
        if (localStorage.getItem(WAKEUP_FORCE_DISABLE_MIGRATION_KEY) !== '1') {
          localStorage.setItem(WAKEUP_ENABLED_KEY, 'false');
          localStorage.setItem(WAKEUP_FORCE_DISABLE_MIGRATION_KEY, '1');
        }
        const enabled = localStorage.getItem(WAKEUP_ENABLED_KEY) === 'true';
        const tasksRaw = localStorage.getItem(TASKS_STORAGE_KEY);
        const tasks = tasksRaw ? JSON.parse(tasksRaw) : [];
        officialLsVersionMode = loadWakeupOfficialLsVersionMode();
        await invoke('wakeup_sync_state', {
          enabled,
          tasks,
          officialLsVersionMode,
          runStartupTasks: true,
        });
      } catch (error) {
        console.error('Không thể đồng bộ trạng thái tác vụ đánh thức:', error);
      }
    };
    void syncWakeupStateOnStartup();
  }, []);

  useEffect(() => {
    const AUTO_BACKUP_STARTUP_DELAY_MS = 5 * 60 * 1000;
    const AUTO_BACKUP_POLL_INTERVAL_MS = 60 * 60 * 1000;
    let startupTimerId: number | undefined;
    let intervalId: number | undefined;
    let inFlight = false;

    const checkAutoBackup = async () => {
      if (inFlight) {
        return;
      }
      inFlight = true;
      try {
        await runAutoBackupCycle();
      } catch (error) {
        console.warn('[AutoBackup] Không thể sao lưu định kỳ:', error);
      } finally {
        inFlight = false;
      }
    };

    startupTimerId = window.setTimeout(() => {
      void checkAutoBackup();
      intervalId = window.setInterval(() => {
        void checkAutoBackup();
      }, AUTO_BACKUP_POLL_INTERVAL_MS);
    }, AUTO_BACKUP_STARTUP_DELAY_MS);

    return () => {
      if (startupTimerId !== undefined) {
        window.clearTimeout(startupTimerId);
      }
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  // Chuyển cài đặt cũ từ WebView localStorage sang bộ lập lịch Rust
  useEffect(() => {
    clearLegacyWorkbuddyAutoCheckinLogs();
    void migrateWorkbuddyAutoCheckinConfigAsync(getWorkbuddyAutoCheckinConfig()).catch((err) => {
      console.warn('[WorkbuddyAutoCheckin] Không thể di chuyển cài đặt điểm danh cũ:', err);
    });
  }, []);

  // Check for updates on startup
  useEffect(() => {
    if (!updateRuntimeInfoLoaded) {
      return;
    }

    const UPDATE_POLL_INTERVAL_MS = 60 * 60 * 1000;
    let updateCheckInFlight = false;
    let intervalId: number | undefined;

    const checkUpdates = async (trigger: 'startup' | 'hourly') => {
      if (updateCheckInFlight) {
        writeUpdateLog('info', `${trigger === 'startup' ? 'Khởi động' : 'Kiểm tra hàng giờ'}Bỏ qua kiểm tra cập nhật vì lượt trước chưa hoàn tất`);
        return;
      }
      updateCheckInFlight = true;
      const triggerLabel = trigger === 'startup' ? 'Khởi động' : 'Kiểm tra hàng giờ';
      const updateFlowStartedAt = performance.now();
      try {
        console.log(`[App] ${triggerLabel} update check triggered.`);
        console.log(`[StartupPerf][UpdateCheck] ${triggerLabel} update check started`);
        writeUpdateLog('info', `${triggerLabel}Đã kích hoạt quy trình kiểm tra cập nhật tự động`);

        const settingsInvokeStartedAt = performance.now();
        const preferenceRevision = updatePromptPolicyRef.current.revision;
        const settings = await invoke<{
          auto_check?: boolean;
          check_interval_hours?: number;
          auto_install?: boolean;
          remind_on_update?: boolean;
          skipped_version?: string;
        }>('get_update_settings');
        const settingsInvokeElapsed = performance.now() - settingsInvokeStartedAt;
        console.log(
          `[StartupPerf][UpdateCheck] get_update_settings completed in ${settingsInvokeElapsed.toFixed(2)}ms`,
        );
        const autoInstall = settings?.auto_install ?? false;
        applyUpdateReminderPreference(settings?.remind_on_update ?? true, preferenceRevision);
        const skippedVersion = (settings?.skipped_version ?? '').trim();
        const remoteConfigState = await fetchRemoteConfigState(false);
        const updatePromptMode = remoteConfigState.updatePromptMode;
        writeUpdateLog(
          'info',
          `Đã đọc cài đặt cập nhật: auto_install=${autoInstall}, update_prompt_mode=${updatePromptMode}; luôn kiểm tra cập nhật khi khởi động`,
        );

        writeUpdateLog('info', 'Kiểm tra cập nhật ngay khi khởi động');

        if (autoInstall && !isLinuxManagedUpdate) {
          // Silent update: check and download in background, install on restart
          console.log('[App] Auto-install enabled, attempting silent update...');
          writeUpdateLog('info', 'Đã bật tự động cập nhật nền; thử kiểm tra và tải không hiện hộp thoại');
          let preparedUpdateInfo: UpdateInfo | null = null;
          try {
            const silentCheckStartedAt = performance.now();
            const update = await retryWithBackoff(
              async () => runUpdaterCheck(),
              {
                delaysMs: UPDATE_CHECK_RETRY_DELAYS_MS,
                shouldRetry: isRetryableUpdaterError,
                onRetry: ({ retryIndex, totalRetries, delayMs, error }) => {
                  const compactError = sanitizeUpdaterErrorMessage(error);
                  console.warn(
                    `[App] Silent update check failed, retrying (${retryIndex}/${totalRetries}) in ${delayMs}ms:`,
                    error,
                  );
                  writeUpdateLog(
                    'warn',
                    `Kiểm tra cập nhật nền thất bại; chuẩn bị thử lại(${retryIndex}/${totalRetries})，delay=${delayMs}ms，error=${compactError}`,
                  );
                },
              },
            );
            console.log(
              `[StartupPerf][UpdateCheck] silent runUpdaterCheck completed in ${(performance.now() - silentCheckStartedAt).toFixed(2)}ms; hasUpdate=${Boolean(update)}`,
            );
            if (update) {
              if (skippedVersion && update.version === skippedVersion) {
                console.log('[App] Update skipped by user, ignoring:', update.version);
                writeUpdateLog('info', `Phát hiện phiên bản mới nhưng đã bỏ qua: version=${update.version}`);
                await closeUpdaterHandle(update);
                setUpdateAction((prev) => {
                  if (prev.state === 'available' && prev.version === update.version) {
                    return {
                      state: 'hidden',
                      version: null,
                      progress: 0,
                      requiresInstall: true,
                    };
                  }
                  return prev;
                });
              } else {
                preparedUpdateInfo = await prepareUpdateNotificationInfo(update);
                setUpdateNotificationInfo(preparedUpdateInfo);
                handleUpdateCheckResult({
                  source: 'auto',
                  status: 'has_update',
                  currentVersion: preparedUpdateInfo.current_version,
                  latestVersion: preparedUpdateInfo.latest_version,
                });
                openAutomaticUpdatePrompt(update.version, updatePromptMode);
                console.log('[App] Update found, downloading silently with retry...');
                writeUpdateLog('info', `Phát hiện phiên bản mới; bắt đầu tải ở chế độ nền: version=${update.version}`);
                updateDownloadOwnerRef.current = 'silent';
                setUpdateRetryStatus('');
                setUpdateDownloadError('');
                setUpdateErrorDetails('');
                setUpdateAction((prev) => {
                  if (prev.state === 'ready' && prev.version === update.version) {
                    return prev;
                  }
                  return {
                    state: 'downloading',
                    version: update.version,
                    progress: 0,
                    requiresInstall: true,
                  };
                });
                await invoke('save_pending_update_notes', {
                  version: update.version,
                  releaseNotes: preparedUpdateInfo.release_notes,
                  releaseNotesZh: preparedUpdateInfo.release_notes_zh,
                }).catch((error) => {
                  console.error('[App] Failed to cache silent update notes:', error);
                  writeUpdateLog(
                    'warn',
                    `Không thể lưu ghi chú của bản cập nhật sắp cài: version=${update.version}, error=${sanitizeUpdaterErrorMessage(error)}`,
                  );
                });
                const silentDownloadStartedAt = performance.now();
                const downloadedUpdate = await retryWithBackoff(
                  async (attempt) => {
                    let candidate: UpdaterUpdate | null = null;
                    try {
                      if (attempt === 1) {
                        candidate = update;
                      } else {
                        candidate = await runUpdaterCheck();
                      }

                      if (!candidate) {
                        throw new Error('No update available from updater plugin');
                      }

                      let downloaded = 0;
                      let contentLength = 0;
                      const candidateVersion = candidate.version;
                      await candidate.download((event) => {
                        setUpdateAction((prev) => {
                          if (prev.state !== 'downloading') {
                            return prev;
                          }

                          if (event.event === 'Started') {
                            contentLength = event.data.contentLength ?? 0;
                            return {
                              ...prev,
                              version: candidateVersion,
                              progress: 0,
                            };
                          }

                          if (event.event === 'Progress') {
                            downloaded += event.data.chunkLength;
                            const nextProgress = contentLength > 0
                              ? Math.min(100, Math.round((downloaded / contentLength) * 100))
                              : Math.min(95, prev.progress + 1);
                            return {
                              ...prev,
                              version: candidateVersion,
                              progress: nextProgress,
                            };
                          }

                          return {
                            ...prev,
                            version: candidateVersion,
                            progress: 100,
                          };
                        });
                      });
                      return candidate;
                    } catch (error) {
                      if (candidate) {
                        await candidate.close().catch(() => {});
                      }
                      throw error;
                    }
                  },
                  {
                    delaysMs: UPDATE_DOWNLOAD_RETRY_DELAYS_MS,
                    shouldRetry: isRetryableUpdaterError,
                    onRetry: ({ retryIndex, totalRetries, delayMs, error }) => {
                      const compactError = sanitizeUpdaterErrorMessage(error);
                      setUpdateRetryStatus(
                        t('update_notification.downloadRetrying', {
                          attempt: retryIndex,
                          total: totalRetries,
                        }),
                      );
                      console.warn(
                        `[App] Silent update download failed, retrying (${retryIndex}/${totalRetries}) in ${delayMs}ms:`,
                        error,
                      );
                      writeUpdateLog(
                        'warn',
                        `Tải cập nhật nền thất bại; chuẩn bị thử lại(${retryIndex}/${totalRetries})，delay=${delayMs}ms，error=${compactError}`,
                      );
                      setUpdateAction((prev) => {
                        if (prev.state !== 'downloading') {
                          return prev;
                        }
                        return {
                          ...prev,
                          progress: 0,
                        };
                      });
                    },
                  },
                );
                console.log(
                  `[StartupPerf][UpdateCheck] silent update download completed in ${(performance.now() - silentDownloadStartedAt).toFixed(2)}ms; version=${downloadedUpdate.version}`,
                );

                if (pendingSilentUpdateRef.current) {
                  await pendingSilentUpdateRef.current.close();
                }
                pendingSilentUpdateRef.current = downloadedUpdate;
                console.log('[App] Silent download complete, waiting for restart to install.');
                writeUpdateLog(
                  'info',
                  `Đã tải cập nhật nền; cần khởi động lại ứng dụng: version=${downloadedUpdate.version}`,
                );
                updateDownloadOwnerRef.current = 'none';
                setUpdateRetryStatus('');
                setUpdateDownloadError('');
                setUpdateErrorDetails('');
                setSilentUpdateVersion(downloadedUpdate.version);
                setUpdateAction({
                  state: 'ready',
                  version: downloadedUpdate.version,
                  progress: 100,
                  requiresInstall: true,
                });
                if (updatePromptPolicyRef.current.enabled) {
                  writeUpdateLog('info', `Đã hiển thị yêu cầu khởi động lại ở góc trên bên trái: version=${downloadedUpdate.version}`);
                }
              }
            } else {
              console.log('[App] No update available.');
              writeUpdateLog('info', 'Đã kiểm tra cập nhật; hiện đang ở phiên bản mới nhất');
              updateDownloadOwnerRef.current = 'none';
              setUpdateRetryStatus('');
              setUpdateDownloadError('');
              setUpdateErrorDetails('');
              setUpdateAction((prev) => {
                if (prev.state === 'ready') {
                  return prev;
                }
                return {
                  state: 'hidden',
                  version: null,
                  progress: 0,
                  requiresInstall: true,
                };
              });
            }
          } catch (err) {
            console.error('[App] Silent update failed:', err);
            updateDownloadOwnerRef.current = 'none';
            writeUpdateLog(
              'error',
              `Cập nhật nền thất bại; vẫn giữ lối vào cập nhật ở góc trên trái: error=${sanitizeUpdaterErrorMessage(err)}`,
            );
            if (!updatePromptPolicyRef.current.enabled) {
              setUpdateRetryStatus('');
              setUpdateDownloadError('');
              setUpdateErrorDetails('');
              setUpdateAction((prev) => {
                if (prev.state === 'downloading' || prev.state === 'available') {
                  return {
                    state: 'hidden',
                    version: null,
                    progress: 0,
                    requiresInstall: true,
                  };
                }
                return prev;
              });
            }
            if (preparedUpdateInfo && updatePromptPolicyRef.current.enabled) {
              setUpdateNotificationInfo(preparedUpdateInfo);
              setUpdateAction({
                state: 'available',
                version: preparedUpdateInfo.latest_version,
                progress: 0,
                requiresInstall: true,
              });
              writeUpdateLog('info', `Cập nhật nền thất bại; đã hiển thị lối vào cập nhật ở góc trên trái: version=${preparedUpdateInfo.latest_version}`);
            }
          }
        } else {
          // Auto-check only opens the dialog after a real update is found.
          if (autoInstall && isLinuxManagedUpdate) {
            writeUpdateLog(
              'info',
              `Cài đặt bằng trình quản lý gói Linux(${updateRuntimeInfo?.linux_install_kind || 'unknown'})Bỏ qua tải nền; hiển thị lối vào cài đặt một chạm ở góc trên trái`,
            );
          }
          writeUpdateLog('info', 'Đã tắt cập nhật nền; chỉ kiểm tra và hiển thị khi có phiên bản mới');
          try {
            const manualCheckStartedAt = performance.now();
            const update = await retryWithBackoff(
              async () => runUpdaterCheck(),
              {
                delaysMs: UPDATE_CHECK_RETRY_DELAYS_MS,
                shouldRetry: isRetryableUpdaterError,
                onRetry: ({ retryIndex, totalRetries, delayMs, error }) => {
                  const compactError = sanitizeUpdaterErrorMessage(error);
                  console.warn(
                    `[App] Background manual update check failed, retrying (${retryIndex}/${totalRetries}) in ${delayMs}ms:`,
                    error,
                  );
                  writeUpdateLog(
                    'warn',
                    `Kiểm tra cập nhật nền theo yêu cầu thất bại; chuẩn bị thử lại(${retryIndex}/${totalRetries})，delay=${delayMs}ms，error=${compactError}`,
                  );
                },
              },
            );
            console.log(
              `[StartupPerf][UpdateCheck] manual runUpdaterCheck completed in ${(performance.now() - manualCheckStartedAt).toFixed(2)}ms; hasUpdate=${Boolean(update)}`,
            );

            if (update) {
              if (skippedVersion && update.version === skippedVersion) {
                console.log('[App] Update skipped by user, ignoring:', update.version);
                writeUpdateLog('info', `Phát hiện phiên bản mới nhưng đã bỏ qua: version=${update.version}`);
                await closeUpdaterHandle(update);
                setUpdateAction((prev) => {
                  if (prev.state === 'available' && prev.version === update.version) {
                    return {
                      state: 'hidden',
                      version: null,
                      progress: 0,
                      requiresInstall: true,
                    };
                  }
                  return prev;
                });
              } else {
                const info = await prepareUpdateNotificationInfo(update);
                setUpdateNotificationInfo(info);
                handleUpdateCheckResult({
                  source: 'auto',
                  status: 'has_update',
                  currentVersion: info.current_version,
                  latestVersion: info.latest_version,
                });
                const openedPrompt = openAutomaticUpdatePrompt(update.version, updatePromptMode);
                writeUpdateLog(
                  'info',
                  openedPrompt
                    ? `Phát hiện bản mới; đã mở hộp thoại theo chính sách từ xa: version=${update.version}`
                    : `Phát hiện bản mới; đã hiển thị lối vào cập nhật ở góc trên trái: version=${update.version}`,
                );
                await closeUpdaterHandle(update);
              }
            } else {
              writeUpdateLog('info', 'Đã kiểm tra cập nhật; hiện đang ở phiên bản mới nhất');
              setUpdateRetryStatus('');
              setUpdateDownloadError('');
              setUpdateErrorDetails('');
              setUpdateAction((prev) => {
                if (prev.state === 'ready') {
                  return prev;
                }
                return {
                  state: 'hidden',
                  version: null,
                  progress: 0,
                  requiresInstall: true,
                };
              });
            }
          } catch (err) {
            console.error('[App] Background update check failed:', err);
            writeUpdateLog(
              'warn',
              `Kiểm tra cập nhật nền theo yêu cầu thất bại; bỏ qua hộp thoại: error=${sanitizeUpdaterErrorMessage(err)}`,
            );
          }
        }

        const updateLastCheckStartedAt = performance.now();
        await invoke('update_last_check_time');
        console.log(
          `[StartupPerf][UpdateCheck] update_last_check_time completed in ${(performance.now() - updateLastCheckStartedAt).toFixed(2)}ms`,
        );
        writeUpdateLog('info', 'Đã cập nhật last_check_time; kết thúc lượt kiểm tra cập nhật');
        console.log('[App] Update check cycle completed.');
        console.log(
          `[StartupPerf][UpdateCheck] ${triggerLabel} update check completed in ${(performance.now() - updateFlowStartedAt).toFixed(2)}ms`,
        );
      } catch (error) {
        console.error('Failed to check update settings:', error);
        console.error(
          `[StartupPerf][UpdateCheck] ${triggerLabel} update check failed after ${(performance.now() - updateFlowStartedAt).toFixed(2)}ms:`,
          error,
        );
        writeUpdateLog('error', `Quy trình kiểm tra cập nhật bị gián đoạn: error=${sanitizeUpdaterErrorMessage(error)}`);
      } finally {
        updateCheckInFlight = false;
      }
    };

    void checkUpdates('startup');
    intervalId = window.setInterval(() => {
      void checkUpdates('hourly');
    }, UPDATE_POLL_INTERVAL_MS);
    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [
    applyUpdateReminderPreference,
    closeUpdaterHandle,
    fetchRemoteConfigState,
    handleUpdateCheckResult,
    isLinuxManagedUpdate,
    openAutomaticUpdatePrompt,
    prepareUpdateNotificationInfo,
    runUpdaterCheck,
    updateRuntimeInfo?.linux_install_kind,
    updateRuntimeInfoLoaded,
    writeUpdateLog,
  ]);

  // Version jump detection (post-update changelog)
  useEffect(() => {
    const detectVersionJump = async () => {
      const versionJumpStartedAt = performance.now();
      try {
        console.log('[StartupPerf][VersionJump] detection started');
        const versionJumpInvokeStartedAt = performance.now();
        const jumpInfo = await invoke<{
          previous_version: string;
          current_version: string;
          release_notes: string;
          release_notes_zh: string;
        } | null>('check_version_jump');
        console.log(
          `[StartupPerf][VersionJump] check_version_jump completed in ${(performance.now() - versionJumpInvokeStartedAt).toFixed(2)}ms; hasJump=${Boolean(jumpInfo)}`,
        );
        if (jumpInfo) {
          console.log('[App] Version jump detected:', jumpInfo.previous_version, '->', jumpInfo.current_version);
          (
            window as Window & {
              __agtoolsVersionJumpModalRequestedAt?: number;
            }
          ).__agtoolsVersionJumpModalRequestedAt = performance.now();
          setVersionJumpInfo(jumpInfo);
          setShowVersionJumpNotification(true);
          requestAnimationFrame(() => {
            console.log(
              `[StartupPerf][VersionJump] first frame after opening version jump modal in ${(performance.now() - versionJumpStartedAt).toFixed(2)}ms`,
            );
          });
        }
        console.log(
          `[StartupPerf][VersionJump] detection finished in ${(performance.now() - versionJumpStartedAt).toFixed(2)}ms`,
        );
      } catch (error) {
        console.error('Failed to check version jump:', error);
        console.error(
          `[StartupPerf][VersionJump] detection failed after ${(performance.now() - versionJumpStartedAt).toFixed(2)}ms:`,
          error,
        );
      }
    };

    const timer = setTimeout(detectVersionJump, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    listen<string>('settings:language_changed', (event) => {
      const nextLanguage = normalizeLanguage(String(event.payload || ''));
      if (!nextLanguage || nextLanguage === getCurrentLanguage()) {
        return;
      }
      void changeLanguage(nextLanguage);
      window.dispatchEvent(new CustomEvent('general-language-updated', { detail: { language: nextLanguage } }));
    }).then((fn) => { unlisten = fn; });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    let disposed = false;

    listen<QuotaAlertPayload>('quota:alert', (event) => {
      const payload = event.payload;
      if (!payload || !payload.current_account_id) {
        return;
      }

      const platform = normalizeQuotaAlertPlatform(payload.platform);
      const platformLabel = getQuotaAlertPlatformLabel(platform, t);
      const hasRecommendation = Boolean(payload.recommended_account_id && payload.recommended_email);
      const lowQuotaItemsText = payload.low_models.length > 0
        ? payload.low_models.join(', ')
        : platform === 'grok'
          ? t('grok.quotaAlert.unknownItem', "Mục hạn mức không xác định")
          : t('quotaAlert.modal.unknownModel', "Mô hình không xác định");

      showModal({
        title: t('quotaAlert.modal.title', "Cảnh báo hạn mức"),
        description: t(
          'quotaAlert.modal.desc',
          "Hạn mức của tài khoản hiện tại đã chạm ngưỡng cảnh báo. Vui lòng xử lý sớm."
        ),
        width: 'md',
        content: (
          <div className="quota-alert-modal-content">
            <div className="quota-alert-modal-row">
              <span>{t('quotaAlert.modal.platform', "Nền tảng")}</span>
              <strong>{platformLabel}</strong>
            </div>
            <div className="quota-alert-modal-row">
              <span>{t('quotaAlert.modal.account', "Tài khoản hiện tại")}</span>
              <strong>{payload.current_email}</strong>
            </div>
            <div className="quota-alert-modal-row">
              <span>{t('quotaAlert.modal.threshold', "Ngưỡng cảnh báo")}</span>
              <strong>{payload.threshold_display || `${payload.threshold}%`}</strong>
            </div>
            <div className="quota-alert-modal-row">
              <span>{t('quotaAlert.modal.lowest', "Mức thấp nhất hiện tại")}</span>
              <strong>{payload.lowest_percentage}%</strong>
            </div>
            <div className="quota-alert-modal-row quota-alert-modal-row--stack">
              <span>
                {platform === 'grok'
                  ? t('grok.quotaAlert.items', "Mục hạn mức")
                  : t('quotaAlert.modal.models', "Mô hình kích hoạt")}
              </span>
              <strong>{lowQuotaItemsText}</strong>
            </div>
            <div className="quota-alert-modal-row">
              <span>{t('quotaAlert.modal.recommended', "Đề xuất chuyển")}</span>
              <strong>
                {payload.recommended_email || t('quotaAlert.modal.noRecommendation', "Không có tài khoản phù hợp để chuyển")}
              </strong>
            </div>
          </div>
        ),
        actions: [
          {
            id: 'quota-alert-later',
            label: t('quotaAlert.modal.later', "Để sau"),
            variant: 'secondary',
          },
          {
            id: 'quota-alert-open-settings',
            label: t('quotaAlert.modal.openSettings', "Điều chỉnh cài đặt cảnh báo"),
            variant: 'secondary',
            autoClose: false,
            onClick: () => {
              openQuickSettingsForPlatform(platform);
            },
          },
          ...(hasRecommendation
            ? [{
                id: 'quota-alert-switch',
                label: t('quotaAlert.modal.switchNow', "Chuyển nhanh sang {{email}}", {
                  email: payload.recommended_email as string,
                }),
                variant: 'primary' as const,
                autoClose: false,
                onClick: async () => {
                  try {
                    const targetAccountId = payload.recommended_account_id as string;
                    if (platform === 'codex') {
                      await useCodexAccountStore.getState().switchAccount(targetAccountId);
                      setPage('codex');
                    } else if (platform === 'claude') {
                      await useClaudeAccountStore.getState().switchAccount(targetAccountId);
                      setPage('claude');
                    } else if (platform === 'github_copilot') {
                      await useGitHubCopilotAccountStore.getState().switchAccount(targetAccountId);
                      setPage('github-copilot');
                    } else if (platform === 'windsurf') {
                      await useWindsurfAccountStore.getState().switchAccount(targetAccountId);
                      setPage('windsurf');
                    } else if (platform === 'kiro') {
                      await useKiroAccountStore.getState().switchAccount(targetAccountId);
                      setPage('kiro');
                    } else if (platform === 'cursor') {
                      await useCursorAccountStore.getState().switchAccount(targetAccountId);
                      setPage('cursor');
                    } else if (platform === 'grok') {
                      await useGrokAccountStore.getState().switchAccount(targetAccountId);
                      setPage('grok');
                    } else if (platform === 'codebuddy') {
                      await useCodebuddyAccountStore.getState().switchAccount(targetAccountId);
                      setPage('codebuddy');
                    } else if (platform === 'codebuddy_cn') {
                      await useCodebuddyCnAccountStore.getState().switchAccount(targetAccountId);
                      setPage('codebuddy-cn');
                    } else if (platform === 'qoder') {
                      await useQoderAccountStore.getState().switchAccount(targetAccountId);
                      setPage('qoder');
                    } else if (platform === 'trae') {
                      await useTraeAccountStore.getState().switchAccount(targetAccountId);
                      setPage('trae');
                    } else if (platform === 'workbuddy') {
                      await useWorkbuddyAccountStore.getState().switchAccount(targetAccountId);
                      setPage('workbuddy');
                    } else if (platform === 'zed') {
                      await useZedAccountStore.getState().switchAccount(targetAccountId);
                      setPage('zed');
                    } else {
                      await useAccountStore.getState().switchAccount(targetAccountId);
                      setPage('overview');
                    }
                    closeModal();
                  } catch (error) {
                    showModal({
                      title: t('quotaAlert.modal.switchFailedTitle', "Chuyển thất bại"),
                      description: t('quotaAlert.modal.switchFailedBody', "Chuyển nhanh thất bại: {{error}}", {
                        error: String(error),
                      }),
                      width: 'sm',
                      actions: [
                        {
                          id: 'quota-alert-switch-failed-ok',
                          label: t('common.confirm', "Xác nhận"),
                          variant: 'primary',
                        },
                      ],
                    });
                  }
                },
              }]
            : []),
        ],
      });
    }).then((fn) => {
      if (disposed) {
        fn();
        return;
      }
      unlisten = fn;
    });

    return () => {
      disposed = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, [closeModal, openQuickSettingsForPlatform, showModal, t]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const handleWakeupResult = (payload: WakeupTaskResultPayload) => {
      if (!payload || typeof payload.taskId !== 'string') return;

      // Cập nhật thời gian chạy cuối của tác vụ
      const tasksRaw = localStorage.getItem(TASKS_STORAGE_KEY);
      if (tasksRaw) {
        try {
          const tasks = JSON.parse(tasksRaw) as Array<{ id: string; lastRunAt?: number }>;
          const nextTasks = tasks.map((task) =>
            task.id === payload.taskId ? { ...task, lastRunAt: payload.lastRunAt } : task
          );
          localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(nextTasks));
        } catch (error) {
          console.error('Không thể cập nhật giờ đánh thức:', error);
        }
      }

      // Backend đã lưu lịch sử; chỉ cần báo frontend làm mới
      window.dispatchEvent(new CustomEvent('wakeup-task-result', { detail: payload }));
      window.dispatchEvent(new Event('wakeup-tasks-updated'));
    };

    listen<WakeupTaskResultPayload>('wakeup://task-result', (event) => {
      handleWakeupResult(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    const handleUpdateRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ source?: UpdateCheckSource }>).detail;
      // Automatic checks use the background flow and its local-preference gate.
      if (detail?.source !== 'manual') return;
      void runModalUpdateCheck('manual');
    };
    window.addEventListener('update-check-requested', handleUpdateRequest as EventListener);
    return () => {
      window.removeEventListener('update-check-requested', handleUpdateRequest as EventListener);
    };
  }, [runModalUpdateCheck]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    listen<LinuxUpdateProgressPayload>('update://linux-progress', (event) => {
      const { phase, progress, version } = event.payload;
      setUpdateDownloadError('');
      setUpdateErrorDetails('');

      setUpdateAction((prev) => {
        if (
          prev.version
          && prev.version !== version
          && (prev.state === 'downloading' || prev.state === 'installing' || prev.state === 'ready')
        ) {
          return prev;
        }

        if (phase === 'completed') {
          return {
            state: 'ready',
            version,
            progress: 100,
            requiresInstall: false,
          };
        }

        if (phase === 'auth_required' || phase === 'installing' || phase === 'downloaded') {
          return {
            state: 'installing',
            version,
            progress: 100,
            requiresInstall: false,
          };
        }

        return {
          state: 'downloading',
          version,
          progress: Math.max(0, Math.min(100, Math.round(progress ?? 0))),
          requiresInstall: false,
        };
      });

      if (phase === 'auth_required' || phase === 'downloaded') {
        setUpdateRetryStatus(
          t('update_notification.authorizing', "Đang chờ cấp quyền hệ thống..."),
        );
        return;
      }

      if (phase === 'installing') {
        setUpdateRetryStatus(
          t('update_notification.installing', "Đang cài đặt..."),
        );
        return;
      }

      if (phase === 'completed') {
        setUpdateRetryStatus(
          t('update_notification.installSuccess', "Đã cài đặt bản cập nhật! Đang khởi động lại..."),
        );
        return;
      }

      setUpdateRetryStatus('');
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [t]);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    const refreshTasks = [
      {
        command: 'refresh_current_quota',
        errorMessage: 'Failed to refresh Antigravity IDE quotas:',
      },
      {
        command: 'refresh_current_codex_quota',
        errorMessage: 'Failed to refresh Codex quotas:',
      },
      {
        command: 'refresh_all_claude_quotas',
        errorMessage: 'Failed to refresh Claude quotas:',
      },
      {
        command: 'refresh_all_github_copilot_tokens',
        errorMessage: 'Failed to refresh GitHub Copilot quotas:',
      },
      {
        command: 'refresh_all_windsurf_tokens',
        errorMessage: 'Failed to refresh Devin quotas:',
      },
      {
        command: 'refresh_all_kiro_tokens',
        errorMessage: 'Failed to refresh Kiro quotas:',
      },
      {
        command: 'refresh_all_cursor_tokens',
        errorMessage: 'Failed to refresh Cursor:',
      },
      {
        command: 'refresh_all_grok_accounts',
        errorMessage: 'Failed to refresh Grok:',
      },
      {
        command: 'refresh_all_codebuddy_tokens',
        errorMessage: 'Failed to refresh CodeBuddy:',
      },
      {
        command: 'refresh_all_codebuddy_cn_tokens',
        errorMessage: 'Failed to refresh CodeBuddy CN:',
      },
      {
        command: 'refresh_all_qoder_tokens',
        errorMessage: 'Failed to refresh Qoder:',
      },
      {
        command: 'refresh_all_zcode_accounts',
        errorMessage: 'Failed to refresh ZCode:',
      },
      {
        command: 'refresh_all_trae_tokens',
        errorMessage: 'Failed to refresh Trae:',
      },
      {
        command: 'refresh_all_zed_tokens',
        errorMessage: 'Failed to refresh Zed:',
      },
    ] as const;

    listen('tray:refresh_quota', async () => {
      if (trayRefreshInFlightRef.current) {
        return;
      }
      trayRefreshInFlightRef.current = true;

      try {
        await Promise.all(
          refreshTasks.map(({ command, errorMessage }) =>
            invoke(command, command === 'refresh_current_quota'
              ? { runtimeTarget: getAntigravityRuntimeTarget() }
              : undefined).catch((error) => {
              console.error(errorMessage, error);
            }),
          ),
        );
      } finally {
        trayRefreshInFlightRef.current = false;
      }
    }).then((fn) => { unlisten = fn; });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    const handlePayload = (payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const detail = payload as AppPathMissingDetail;
      if (
        detail.app !== 'antigravity' &&
        detail.app !== 'codex' &&
        detail.app !== 'claude' &&
        detail.app !== 'vscode' &&
        detail.app !== 'windsurf' &&
        detail.app !== 'kiro' &&
        detail.app !== 'cursor' &&
        detail.app !== 'codebuddy' &&
        detail.app !== 'codebuddy_cn' &&
        detail.app !== 'qoder' &&
        !isTraePlatformApp(detail.app) &&
        detail.app !== 'workbuddy' &&
        detail.app !== 'zed'
      ) {
        return;
      }
      setAppPathMissing(detail);
    };

    listen('app:path_missing', (event) => {
      handlePayload(event.payload);
    }).then((fn) => { unlisten = fn; });

    const handleWindowEvent = (event: Event) => {
      const custom = event as CustomEvent<AppPathMissingDetail>;
      handlePayload(custom.detail);
    };
    window.addEventListener('app-path-missing', handleWindowEvent as EventListener);

    return () => {
      if (unlisten) {
        unlisten();
      }
      window.removeEventListener('app-path-missing', handleWindowEvent as EventListener);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!appPathMissing) {
      setAppPathDraft('');
      setAppLaunchCandidates([]);
      setAppPathDetecting(false);
      setAppPathActionError('');
      setAppPathScanError('');
      return () => {
        active = false;
      };
    }
    setAppPathActionError('');
    setAppPathScanError('');
    setAppLaunchCandidates([]);
    (async () => {
      try {
        const config = await invoke<GeneralConfig>('get_general_config');
        const currentPath =
          appPathMissing.app === 'codex'
            ? config.codex_app_path
            : appPathMissing.app === 'claude'
              ? config.claude_app_path
            : appPathMissing.app === 'vscode'
              ? config.vscode_app_path
              : appPathMissing.app === 'windsurf'
                ? config.windsurf_app_path
              : appPathMissing.app === 'kiro'
                ? config.kiro_app_path
              : appPathMissing.app === 'cursor'
                ? config.cursor_app_path
              : appPathMissing.app === 'codebuddy'
                ? config.codebuddy_app_path
              : appPathMissing.app === 'codebuddy_cn'
                ? config.codebuddy_cn_app_path
              : appPathMissing.app === 'qoder'
                ? config.qoder_app_path
              : isTraePlatformApp(appPathMissing.app)
                ? getTraeAppPath(config, appPathMissing.app)
              : appPathMissing.app === 'workbuddy'
                ? config.workbuddy_app_path
              : appPathMissing.app === 'zed'
                ? config.zed_app_path
              : config.antigravity_app_path;
        if (active) {
          const normalizedPath = currentPath || '';
          const shouldClearClaudeDefaultTarget =
            appPathMissing.app === 'claude' &&
            appPathMissing.retry?.kind === 'instance' &&
            isClaudeWindowsAppLaunchTarget(normalizedPath);
          setAppPathDraft(shouldClearClaudeDefaultTarget ? '' : normalizedPath);
          if (appPathMissing.app === 'codex' && config.codex_launch_on_switch === false) {
            setAppPathMissing(null);
          }
        }
      } catch (error) {
        console.error('Failed to load app path config:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [appPathMissing]);

  const handlePickMissingAppPath = async () => {
    if (appPathSetting) return;
    try {
      const selected = await open({
        multiple: false,
        directory: false,
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (path) {
        setAppPathActionError('');
        setAppPathScanError('');
        setAppPathDraft(path);
        setAppLaunchCandidates([]);
      }
    } catch (error) {
      console.error('Không thể chọn đường dẫn ứng dụng:', error);
    }
  };

  const handleSaveMissingAppPath = async () => {
    if (!appPathMissing || appPathSetting || appPathDetecting) return;
    const path = appPathDraft.trim();
    if (!path) return;
    setAppPathScanError('');
    if (
      appPathMissing.app === 'claude' &&
      appPathMissing.retry?.kind === 'instance' &&
      isClaudeWindowsAppLaunchTarget(path)
    ) {
      setAppPathActionError(
        t(
          'appPath.missing.claudeMultiInstanceRequiresExe',
          "Hồ sơ đa phiên bản Claude cần đường dẫn Claude.exe thật. Mục tiêu Microsoft Store chỉ dùng cho hồ sơ desktop mặc định.",
        ),
      );
      return;
    }
    setAppPathSetting(true);
    setAppPathActionError('');
    setAppPathScanError('');
    try {
      const app = appPathMissing.app;
      const retry = appPathMissing.retry;
      const antigravityInstanceStartCommand =
        app === 'antigravity' && retry?.runtimeTarget !== 'antigravity_ide'
          ? 'antigravity_legacy_start_instance'
          : 'start_instance';
      await invoke('set_app_path', { app, path });
      if (retry?.kind === 'switchAccount' && retry.accountId && app === 'zed') {
        await useZedAccountStore.getState().switchAccount(retry.accountId);
        setPage('zed');
      } else if (retry?.kind === 'switchAccount' && retry.accountId && app === 'claude') {
        await useClaudeAccountStore.getState().switchAccount(retry.accountId);
        await useClaudeAccountStore.getState().fetchCurrentAccountId();
        setPage('claude');
      } else if (retry?.kind === 'switchAccount' && retry.accountId) {
        await invoke('switch_account', {
          accountId: retry.accountId,
          runtimeTarget: retry.runtimeTarget,
        });
        await Promise.allSettled([
          useAccountStore.getState().fetchAccounts(),
          useAccountStore.getState().fetchCurrentAccount(),
        ]);
      } else if (retry?.kind === 'instance' && retry.instanceId) {
        if (app === 'codex') {
          await invoke('codex_start_instance', { instanceId: retry.instanceId });
        } else if (app === 'claude') {
          await invoke('claude_start_instance', { instanceId: retry.instanceId });
        } else if (app === 'vscode') {
          await invoke('github_copilot_start_instance', { instanceId: retry.instanceId });
        } else if (app === 'windsurf') {
          await invoke('windsurf_start_instance', { instanceId: retry.instanceId });
        } else if (app === 'kiro') {
          await invoke('kiro_start_instance', { instanceId: retry.instanceId });
        } else if (app === 'cursor') {
          await invoke('cursor_start_instance', { instanceId: retry.instanceId });
        } else if (app === 'codebuddy') {
          await invoke('codebuddy_start_instance', { instanceId: retry.instanceId });
        } else if (app === 'codebuddy_cn') {
          await invoke('codebuddy_cn_start_instance', { instanceId: retry.instanceId });
        } else if (app === 'qoder') {
          await invoke('qoder_start_instance', { instanceId: retry.instanceId });
        } else if (isTraePlatformApp(app)) {
          await invoke('trae_start_instance', { platformId: app, instanceId: retry.instanceId });
        } else if (app === 'workbuddy') {
          await invoke('workbuddy_start_instance', { instanceId: retry.instanceId });
        } else if (app === 'zed') {
          await invoke('zed_start_default_session');
        } else {
          await invoke(antigravityInstanceStartCommand, { instanceId: retry.instanceId });
        }
      } else {
        if (app === 'codex') {
          await invoke('codex_start_instance', { instanceId: '__default__' });
        } else if (app === 'claude') {
          await invoke('claude_start_instance', { instanceId: '__default__' });
        } else if (app === 'vscode') {
          await invoke('github_copilot_start_instance', { instanceId: '__default__' });
        } else if (app === 'windsurf') {
          await invoke('windsurf_start_instance', { instanceId: '__default__' });
        } else if (app === 'kiro') {
          await invoke('kiro_start_instance', { instanceId: '__default__' });
        } else if (app === 'cursor') {
          await invoke('cursor_start_instance', { instanceId: '__default__' });
        } else if (app === 'codebuddy') {
          await invoke('codebuddy_start_instance', { instanceId: '__default__' });
        } else if (app === 'codebuddy_cn') {
          await invoke('codebuddy_cn_start_instance', { instanceId: '__default__' });
        } else if (app === 'qoder') {
          await invoke('qoder_start_instance', { instanceId: '__default__' });
        } else if (isTraePlatformApp(app)) {
          await invoke('trae_start_instance', { platformId: app, instanceId: '__default__' });
        } else if (app === 'workbuddy') {
          await invoke('workbuddy_start_instance', { instanceId: '__default__' });
        } else if (app === 'zed') {
          await invoke('zed_start_default_session');
        } else {
          await invoke(antigravityInstanceStartCommand, { instanceId: '__default__' });
        }
      }
      setAppPathMissing(null);
      setAppPathSetting(false);
    } catch (error) {
      if (isCodexInstanceAccountConflict(error)) {
        setAppPathMissing(null);
        setAppPathSetting(false);
        return;
      }
      console.error('Không thể lưu đường dẫn ứng dụng:', error);
      setAppPathActionError(String(error));
      setAppPathSetting(false);
    }
  };

  const handleResetMissingAppPath = async () => {
    if (!appPathMissing || appPathSetting || appPathDetecting) return;
    const scanApp =
      appPathMissing.app === 'antigravity' && appPathMissing.retry?.runtimeTarget !== 'antigravity_ide'
        ? 'antigravity_legacy'
        : appPathMissing.app === 'antigravity' && appPathMissing.retry?.runtimeTarget === 'antigravity_ide'
          ? 'antigravity_ide'
          : appPathMissing.app;

    if (isWindowsPlatform()) {
      setAppPathDetecting(true);
      setAppPathActionError('');
      setAppPathScanError('');
      try {
        const candidates = await invoke<AppLaunchCandidate[]>('scan_app_launch_targets', {
          app: scanApp,
        });
        setAppLaunchCandidates(candidates);
        if (appPathMissing.app === 'claude' && appPathMissing.retry?.kind === 'instance') {
          const hasMultiInstanceCandidate = candidates.some(
            (candidate) => candidate.supports_multi_instance,
          );
          if (!hasMultiInstanceCandidate && candidates.length > 0) {
            setAppPathScanError(
              t(
                'appPath.missing.claudeMultiInstanceRequiresExe',
                "Hồ sơ đa phiên bản Claude cần đường dẫn Claude.exe thật. Mục tiêu Microsoft Store chỉ dùng cho hồ sơ desktop mặc định.",
              ),
            );
          }
        }
        if (candidates.length === 0) {
          setAppPathScanError(
            t(
              'appPath.missing.scanEmptyGeneric',
              'Không tìm thấy {{app}} đang chạy. Hãy mở ứng dụng và thử lại hoặc chọn đường dẫn thủ công.',
              { app: appPathMissingAppName },
            ),
          );
        }
      } catch (error) {
        console.error('Không thể tìm ứng dụng Claude Desktop đang chạy:', error);
        setAppPathScanError(String(error));
      } finally {
        setAppPathDetecting(false);
      }
      return;
    }
    setAppPathDetecting(true);
    try {
      const detected = await invoke<string | null>('detect_app_path', {
        app: scanApp,
        force: true,
      });
      setAppPathActionError('');
      setAppPathScanError('');
      setAppPathDraft((detected || '').trim());
    } catch (error) {
      console.error('Không thể tự phát hiện đường dẫn ứng dụng:', error);
    } finally {
      setAppPathDetecting(false);
    }
  };

  const handleSelectAppLaunchCandidate = (candidate: AppLaunchCandidate) => {
    if (
      appPathMissing?.app === 'claude' &&
      appPathMissing.retry?.kind === 'instance' &&
      !candidate.supports_multi_instance
    ) {
      return;
    }
    setAppPathActionError('');
    setAppPathScanError('');
    setAppPathDraft(candidate.target);
  };

  // Lắng nghe yêu cầu đóng cửa sổ
  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

    listen('window:close_requested', () => {
      setShowCloseDialog(true);
    }).then((fn) => { unlisten = fn; });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  // After tray destroy/recreate (#686), apply any deferred navigation.
  useEffect(() => {
    void invoke<string | null>('main_window_take_pending_navigation')
      .then((target) => {
        if (!target) return;
        const page = String(target);
        if (isMainWindowNavigablePage(page)) {
          setPage(page);
        }
      })
      .catch(() => {
        /* command may be unavailable on older builds */
      });
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;

        listen<string>('tray:navigate', (event) => {
          const target = String(event.payload || '');
          if (isMainWindowNavigablePage(target)) {
            setPage(target);
          }
        }).then((fn) => { unlisten = fn; });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  useEffect(() => {
    let unlisten: UnlistenFn | undefined;
    listen('external:provider-import', (event) => {
      console.info('[ExternalImport][App] Đã nhận sự kiện Tauri external:provider-import');
      void handleExternalProviderImportRawPayload(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [handleExternalProviderImportRawPayload]);

  useEffect(() => {
    let canceled = false;
    void invoke<unknown>('external_import_take_pending')
      .then((payload) => {
        if (canceled) return;
        if (!payload) {
          console.info('[ExternalImport][App] Không có payload nhập chờ xử lý khi khởi động');
          return;
        }
        console.info('[ExternalImport][App] Đã tìm thấy payload nhập chờ xử lý khi khởi động');
        void handleExternalProviderImportRawPayload(payload);
      })
      .catch((error) => {
        console.warn('[ExternalImport] Không thể đọc yêu cầu nhập đang chờ:', error);
      });
    return () => {
      canceled = true;
    };
  }, [handleExternalProviderImportRawPayload]);

  // Xử lý kéo cửa sổ
  const handleDragStart = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    void getCurrentWindow().startDragging().catch((error) => {
      console.warn('[Window] startDragging failed:', error);
    });
  };

  useEffect(() => {
    const handleRequestNavigate = (e: Event) => {
      const custom = e as CustomEvent<Page>;
      if (custom.detail) {
        setPage(custom.detail);
      }
    };
    window.addEventListener('app-request-navigate', handleRequestNavigate as EventListener);
    return () => {
      window.removeEventListener('app-request-navigate', handleRequestNavigate as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleOpenPlatformLayout = (e: Event) => {
      const custom = e as CustomEvent<{ groupId?: string | null }>;
      const groupId =
        custom.detail && typeof custom.detail.groupId === 'string' && custom.detail.groupId.trim()
          ? custom.detail.groupId.trim()
          : null;
      setPlatformLayoutRequestedGroupId(groupId);
      setShowPlatformLayoutModal(true);
    };

    window.addEventListener('app-open-platform-layout', handleOpenPlatformLayout as EventListener);
    return () => {
      window.removeEventListener('app-open-platform-layout', handleOpenPlatformLayout as EventListener);
    };
  }, []);
  const suspenseFallback = (
    <div className="loading-state">
      {t('common.loading', "Đang tải...")}
    </div>
  );

  const appPathMissingRuntimeTarget = appPathMissing?.retry?.runtimeTarget;
  const appPathMissingAppName = appPathMissing
    ? appPathMissing.app === 'codex'
      ? 'Codex'
      : appPathMissing.app === 'claude'
        ? 'Claude Desktop'
      : appPathMissing.app === 'vscode'
        ? 'VS Code'
        : appPathMissing.app === 'windsurf'
          ? 'Devin'
          : appPathMissing.app === 'kiro'
            ? 'Kiro'
            : appPathMissing.app === 'cursor'
            ? 'Cursor'
            : appPathMissing.app === 'codebuddy'
              ? 'CodeBuddy'
              : appPathMissing.app === 'codebuddy_cn'
                ? 'CodeBuddy CN'
              : appPathMissing.app === 'qoder'
                ? 'Qoder'
              : isTraePlatformApp(appPathMissing.app)
                ? 'Trae'
              : appPathMissing.app === 'workbuddy'
                ? 'WorkBuddy'
              : appPathMissing.app === 'antigravity' && appPathMissingRuntimeTarget === 'antigravity_ide'
                ? 'Antigravity IDE'
                : 'Antigravity'
    : '';

  const appPathMissingPathLabel = appPathMissing
    ? appPathMissing.app === 'codex'
      ? t('quickSettings.codex.appPath', "Đường dẫn ứng dụng")
      : appPathMissing.app === 'claude'
        ? t('quickSettings.claude.appPath', "Đường dẫn Claude")
      : appPathMissing.app === 'vscode'
        ? t('quickSettings.githubCopilot.appPath', "Đường dẫn VS Code")
        : appPathMissing.app === 'windsurf'
          ? t('quickSettings.windsurf.appPath', "Đường dẫn Devin")
          : appPathMissing.app === 'kiro'
            ? t('quickSettings.kiro.appPath', "Con đường Kiro")
            : appPathMissing.app === 'cursor'
            ? t('quickSettings.cursor.appPath', "Đường dẫn Cursor")
            : appPathMissing.app === 'codebuddy'
              ? t('quickSettings.codebuddy.appPath', "Đường dẫn CodeBuddy")
              : appPathMissing.app === 'codebuddy_cn'
                ? t('quickSettings.codebuddyCn.appPath', "Đường dẫn CodeBuddy CN")
              : appPathMissing.app === 'qoder'
                ? t('quickSettings.qoder.appPath', "Đường dẫn Qoder")
              : isTraePlatformApp(appPathMissing.app)
                ? t('quickSettings.trae.appPath', "Đường dẫn Trae")
              : t('quickSettings.antigravity.appPath', "Đường dẫn ứng dụng")
    : t('quickSettings.antigravity.appPath', "Đường dẫn ứng dụng");
  const appPathMissingBusy = appPathSetting || appPathDetecting;
  const claudeMultiInstanceNeedsExe =
    appPathMissing?.app === 'claude' && appPathMissing.retry?.kind === 'instance';
  const shouldRenderUpdateNotification = showUpdateNotification
    || (updateRemindersEnabled && updateAction.state !== 'hidden');

  return (
    <div
      className={`app-container${isWindowsPlatform() ? ' app-container-windows' : ''}${sideNavLayoutMode === 'classic' ? ' app-container-side-nav-classic' : ''}${sideNavLayoutMode === 'classic' && sideNavClassicCollapsed ? ' app-container-side-nav-classic-collapsed' : ''}`}
    >
      {/* Thông báo cập nhật: giữ component khi hoạt động và lưu trạng thái sau khi đóng */}
      {shouldRenderUpdateNotification && (
        <div style={showUpdateNotification ? undefined : { display: 'none' }}>
        <Suspense fallback={null}>
          <UpdateNotification
            key={updateNotificationKey}
            updateInfo={updateNotificationInfo}
            checking={updateNotificationChecking}
            onRestartUpdate={handleApplyPendingUpdate}
            actionState={updateAction.state}
            actionVersion={updateAction.version}
            actionProgress={updateAction.progress}
            actionRetryStatus={updateRetryStatus}
            actionError={updateDownloadError}
            actionErrorDetails={updateErrorDetails}
            skipError={updateSkipError}
            onPrimaryAction={handleUpdatePrimaryAction}
            onCancelUpdate={cancelUpdateDownload}
            onSkipUpdate={handleSkipUpdateVersion}
            onClose={closeUpdateNotification}
          />
        </Suspense>
        </div>
      )}
      {/* Thông báo thay đổi phiên bản ở lần chạy đầu sau cập nhật */}
      {versionJumpInfo && (
        <Suspense fallback={null}>
          {showVersionJumpNotification && (
            <VersionJumpNotification
              info={versionJumpInfo}
              onClose={() => {
                setShowVersionJumpNotification(false);
                setVersionJumpInfo(null);
              }}
            />
          )}
        </Suspense>
      )}
      <GlobalModal />
      <CodexSwitchProgressModal />
      <CodexCliDaemonNotice />
      <CodexWakeupConfirmation />
      <CodexInstanceLaunchProgressModal />
      <CodexPelicanHost />
      <WindowsOperationDialog />

      {/* Hộp thoại xác nhận đóng */}
      {showCloseDialog && (
        <Suspense fallback={null}>
          <CloseConfirmDialog onClose={() => setShowCloseDialog(false)} />
        </Suspense>
      )}

      {hasBreakoutSession && (
        <Suspense fallback={null}>
          <BreakoutModal
            open={showBreakout}
            onMinimize={handleBreakoutMinimize}
            onTerminate={handleBreakoutTerminate}
          />
        </Suspense>
      )}

      {appPathMissing && (
        <div className="qs-overlay" style={{ zIndex: 10100 }}>
          <div className="qs-modal app-path-missing-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qs-header">
              <span className="qs-title">{t('appPath.missing.title', "Không tìm thấy đường dẫn ứng dụng")}</span>
              <button
                className="qs-close"
                onClick={() => setAppPathMissing(null)}
                aria-label={t('common.close', "Đóng")}
                disabled={appPathMissingBusy}
              >
                <X size={16} />
              </button>
            </div>

            <div className="qs-body">
              <div className="qs-section">
                <p className="app-path-missing-desc">
                  {t('appPath.missing.desc', "Không tìm thấy đường dẫn ứng dụng {{app}}. Vui lòng đặt ngay để tiếp tục.", {
                    app: appPathMissingAppName,
                  })}
                </p>
                {claudeMultiInstanceNeedsExe ? (
                  <p className="app-path-missing-hint">
                    {t(
                      'appPath.missing.claudeMultiInstanceRequiresExe',
                      "Hồ sơ đa phiên bản Claude cần đường dẫn Claude.exe thật. Mục tiêu Microsoft Store chỉ dùng cho hồ sơ desktop mặc định.",
                    )}
                  </p>
                ) : null}
                {appPathMissing.app === 'codex' ? (
                  <p className="app-path-missing-hint">
                    {t(
                      'appPath.missing.codexLaunchHint',
                      "Đã chuyển tài khoản xong. Muốn khởi chạy thì hãy đặt đường dẫn. Nếu không cần khởi chạy sau khi chuyển, hãy tắt «Tự động khởi chạy Codex App khi chuyển Codex» trong Cài đặt.",
                    )}
                  </p>
                ) : null}
              </div>

              <div className="qs-section">
                <div className="qs-section-header">
                  <FolderOpen size={15} />
                  <span>{appPathMissingPathLabel}</span>
                </div>
                <div className="qs-path-control">
                  <input
                    type="text"
                    className="qs-path-input"
                    value={appPathDraft}
                    placeholder={
                      appPathMissing.app === 'claude'
                        ? t(
                            'appPath.missing.claudeTargetPlaceholder',
                            "Đường dẫn Claude.exe hoặc shell:AppsFolder\\...",
                          )
                        : t('settings.general.codexAppPathPlaceholder', "Đường dẫn mặc định")
                    }
                    onChange={(e) => {
                      setAppPathActionError('');
                      setAppPathScanError('');
                      setAppLaunchCandidates([]);
                      setAppPathDraft(e.target.value);
                    }}
                    disabled={appPathMissingBusy}
                  />
                  <div className="qs-path-actions">
                    <button
                      className="qs-btn"
                      onClick={handlePickMissingAppPath}
                      disabled={appPathMissingBusy}
                    >
                      {t('settings.general.codexPathSelect', "Chọn")}
                    </button>
                    <button
                      className="qs-btn"
                      onClick={handleResetMissingAppPath}
                      disabled={appPathMissingBusy}
                      title={
                        appPathDetecting
                          ? t('common.loading', "Đang tải...")
                          : isWindowsPlatform()
                            ? t('appPath.missing.scanApps', "Quét ứng dụng")
                            : (
                            appPathMissing.app === 'vscode'
                              ? t('settings.general.vscodePathReset', "Đặt lại mặc định")
                              : appPathMissing.app === 'windsurf'
                                ? t('settings.general.windsurfPathReset', "Đặt lại mặc định")
                                : appPathMissing.app === 'kiro'
                                  ? t('settings.general.kiroPathReset', "Đặt lại về mặc định")
                                  : appPathMissing.app === 'cursor'
                                  ? t('settings.general.cursorPathReset', "Đặt lại mặc định")
                                    : appPathMissing.app === 'codebuddy'
                                      ? t('settings.general.codebuddyPathReset', "Đặt lại mặc định")
                                    : appPathMissing.app === 'codebuddy_cn'
                                      ? t('settings.general.codebuddyPathReset', "Đặt lại mặc định")
                                    : appPathMissing.app === 'qoder'
                                      ? t('settings.general.qoderPathReset', "Đặt lại mặc định")
                                    : isTraePlatformApp(appPathMissing.app)
                                      ? t('settings.general.traePathReset', "Đặt lại mặc định")
                                    : t('settings.general.codexPathReset', "Đặt lại mặc định")
                          )
                      }
                    >
                      {isWindowsPlatform() ? (
                        appPathDetecting
                          ? t('common.loading', "Đang tải...")
                          : t('appPath.missing.scanApps', "Quét ứng dụng")
                      ) : (
                        <RefreshCw size={12} className={appPathDetecting ? 'spin' : undefined} />
                      )}
                    </button>
                  </div>
                </div>
                {isWindowsPlatform() ? (
                  <>
                    {appLaunchCandidates.length > 0 ? (
                      <div className="app-path-candidate-list">
                        {appLaunchCandidates.map((candidate) => (
                          <button
                            key={`${candidate.target_type}:${candidate.target}`}
                            type="button"
                            className={`app-path-candidate-item${
                              appPathDraft.trim() === candidate.target ? ' selected' : ''
                            }`}
                            onClick={() => handleSelectAppLaunchCandidate(candidate)}
                            disabled={
                              appPathMissingBusy ||
                              (claudeMultiInstanceNeedsExe && !candidate.supports_multi_instance)
                            }
                          >
                            <div className="app-path-candidate-main">
                              <span>{candidate.label || appPathMissingAppName}</span>
                              <span className="app-path-candidate-badge">
                                {candidate.target_type === 'windows_app'
                                  ? t('appPath.missing.windowsApp', 'Microsoft Store')
                                  : 'EXE'}
                              </span>
                            </div>
                            <div className="app-path-candidate-target">{candidate.target}</div>
                            {!candidate.supports_multi_instance ? (
                              <div className="app-path-candidate-note">
                                {t(
                                  'appPath.missing.defaultOnly',
                                  "Chỉ dành cho desktop mặc định; hãy chọn Claude.exe thật cho hồ sơ đa phiên bản.",
                                )}
                              </div>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {appPathScanError || appPathActionError ? (
                  <p className="app-path-missing-error">
                    {appPathScanError || t('messages.switchFailed', { error: appPathActionError })}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setAppPathMissing(null)}
                disabled={appPathMissingBusy}
              >
                {t('common.cancel', "Hủy")}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveMissingAppPath}
                disabled={appPathMissingBusy || !appPathDraft.trim()}
              >
                {t('common.save', "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Vùng kéo cố định phía trên */}
      <div
        className="drag-region"
        data-tauri-drag-region
        onMouseDown={handleDragStart}
      />

      {/* Thanh điều hướng nổi bên trái */}
      <SideNav
        page={page}
        setPage={setPage}
        onOpenPlatformLayout={openPlatformLayoutModal}
        easterEggClickCount={easterEggClickCount}
        onEasterEggTriggerClick={handleBreakoutEntryTriggerClick}
        hasBreakoutSession={hasBreakoutSession}
        updateActionState={updateAction.state}
        updateProgress={updateAction.progress}
        onUpdateActionClick={handleQuickUpdateActionClick}
        updateRemindersEnabled={updateRemindersEnabled}
        sponsorEntryVisible={sponsorEntryVisible}
        onOpenLogViewer={() => setShowLogViewer(true)}
      />

      <AnnouncementHost onNavigate={setPage} />

      {sideNavLayoutMode !== 'classic' && (
        <button
          className="log-entry-fab"
          onClick={() => setShowLogViewer(true)}
          title={t('manual.dataPrivacy.keywords.5', "khắc phục lỗi")}
          aria-label={t('manual.dataPrivacy.keywords.5', "khắc phục lỗi")}
        >
          <FileText size={18} />
        </button>
      )}

      <Suspense fallback={null}>
        <PlatformLayoutModal
          open={showPlatformLayoutModal}
          requestedEditGroupId={platformLayoutRequestedGroupId}
          onClose={() => {
            setShowPlatformLayoutModal(false);
            setPlatformLayoutRequestedGroupId(null);
          }}
        />
        <LogViewerModal
          open={showLogViewer}
          onClose={() => setShowLogViewer(false)}
        />
      </Suspense>

      <div className="main-wrapper">
        {topRightAdVisible && visibleTopCenterPromoAds.length > 0 ? (
          <div className="app-global-promo-layer" aria-hidden={false}>
            <TopCenterPromoBanner ads={visibleTopCenterPromoAds} reserveWhenEmpty={false} />
          </div>
        ) : null}
        {/* overview hiện là trang tổng quan tài khoản đã hợp nhất */}
        <Suspense fallback={suspenseFallback}>
          <VisibleBootPage when={page === 'dashboard'}>
            <DashboardPage
              onNavigate={setPage}
              onOpenPlatformLayout={openPlatformLayoutModal}
              onEasterEggTriggerClick={handleBreakoutEntryTriggerClick}
            />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'api-relay'}>
            <ApiKeyFunPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'overview'}>
            <AccountsPage onNavigate={setPage} />
          </VisibleBootPage>
          {/* Codex suite: keep both pages mounted after first visit to avoid empty flash when switching. */}
          {shouldMountCodexSuite && (
            <Suspense fallback={page === 'codex' ? suspenseFallback : null}>
              <div
                className="app-page-keep-alive"
                hidden={page !== 'codex'}
                aria-hidden={page !== 'codex'}
              >
                <CodexAccountsPage />
                {page === 'codex' ? <BootReadyMarker /> : null}
              </div>
            </Suspense>
          )}
          {shouldMountCodexSuite && (
            <Suspense fallback={page === 'codex-api-service' ? suspenseFallback : null}>
              <div
                className="app-page-keep-alive"
                hidden={page !== 'codex-api-service'}
                aria-hidden={page !== 'codex-api-service'}
              >
                <CodexApiServicePage />
                {page === 'codex-api-service' ? <BootReadyMarker /> : null}
              </div>
            </Suspense>
          )}
          <VisibleBootPage when={page === 'claude'}>
            <ClaudeAccountsPage subPlatform="desktop" />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'claude-cli'}>
            <ClaudeAccountsPage subPlatform="cli" />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'github-copilot'}>
            <GitHubCopilotAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'windsurf'}>
            <WindsurfAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'kiro'}>
            <KiroAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'cursor'}>
            <CursorAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'grok'}>
            <GrokAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'codebuddy'}>
            <CodebuddyAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'codebuddy-cn'}>
            <CodebuddyCnAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'qoder'}>
            <QoderAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'zcode'}>
            <ZcodeAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'trae'}>
            <TraeAccountsPage platformId="trae" />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'trae-solo'}>
            <TraeAccountsPage platformId="trae_solo" />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'trae-cn'}>
            <TraeAccountsPage platformId="trae_cn" />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'trae-solo-cn'}>
            <TraeAccountsPage platformId="trae_solo_cn" />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'workbuddy'}>
            <WorkbuddyAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'zed'}>
            <ZedAccountsPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'instances'}>
            <InstancesPage onNavigate={setPage} />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'wakeup'}>
            <WakeupTasksPage onNavigate={setPage} />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'verification'}>
            <WakeupVerificationPage onNavigate={setPage} />
          </VisibleBootPage>
          <VisibleBootPage when={page === '2fa'}>
            <TwoFactorAuthPage />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'manual'}>
            <ManualPage
              onNavigate={setPage}
              onOpenPlatformLayout={openPlatformLayoutModal}
            />
          </VisibleBootPage>
          <VisibleBootPage when={page === 'settings'}>
            <SettingsPage />
          </VisibleBootPage>
        </Suspense>
      </div>
    </div>
  );
}

function App() {
  const windowLabel = getCurrentWindow().label;
  if (windowLabel === 'floating-card' || windowLabel.startsWith('instance-floating-card-')) {
    return <FloatingCardWindow />;
  }

  return <MainApp />;
}

export default App;
