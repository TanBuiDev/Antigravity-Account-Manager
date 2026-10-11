import { CodexRefreshPlanScopeControl } from './CodexRefreshPlanScopeControl';
import { CodexRequestPayloadSetting } from './codex/CodexRequestPayloadSetting';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { confirm as confirmDialog, open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import {
  Settings,
  RefreshCw,
  FolderOpen,
  Gauge,
  Terminal,
  Zap,
  X,
  EyeOff,
} from 'lucide-react';
import { useEscClose } from '../hooks/useEscClose';
import * as accountService from '../services/accountService';
import * as codexService from '../services/codexService';
import { getAccountGroups, type AccountGroup } from '../services/accountGroupService';
import {
  getCodexAccountGroups,
  type CodexAccountGroup,
} from '../services/codexAccountGroupService';
import {
  AutoSwitchAccountScopeSelector,
  type AutoSwitchAccountScopeMode,
  type AutoSwitchScopeAccount,
} from './AutoSwitchAccountScopeSelector';
import {
  buildAccountTierCounts,
  buildAccountTierFilterOptions,
} from '../utils/accountFilters';
import { getSubscriptionTier } from '../utils/account';
import {
  getCodexPlanBadgeStyle,
  isCodexAdditionalQuotaVisibleByDefault,
  isCodexCodeReviewQuotaVisibleByDefault,
  persistCodexAdditionalQuotaVisible,
  persistCodexCodeReviewQuotaVisible,
  persistCodexPlanBadgeStyle,
  type CodexPlanBadgeStyle,
} from '../utils/codexPreferences';
import {
  FEATURE_UNLOCK_CHANGED_EVENT,
  type FeatureUnlockChangedDetail,
  isAntigravitySeamlessSwitchFeatureUnlocked,
} from '../utils/featureUnlocks';
import {
  buildDefaultCurrentAccountRefreshMinutesMap,
  type CurrentAccountRefreshMinutesMap,
  type CurrentAccountRefreshPlatform,
  loadCurrentAccountRefreshMinutesMap,
  saveCurrentAccountRefreshMinutesMap,
} from '../utils/currentAccountRefresh';
import { setClaudeQuotaDisplayRemainingEnabled } from '../utils/claudeQuotaDisplayPreference';
import type { Account } from '../types/account';
import type {
  CodexAccount,
  CodexExperimentalModelDefinition,
  CodexQuickConfig,
} from '../types/codex';
import { getDisplayGroups, type DisplayGroup } from '../services/groupService';
import { useRemoteConfigStore } from '../stores/useRemoteConfigStore';
import { usePlatformRuntimeSupport } from '../hooks/usePlatformRuntimeSupport';
import {
  readAccountsOverviewFilterPersistenceEnabled,
  resolveAccountsOverviewScopeFromQuickSettingsType,
  setAccountsOverviewFilterPersistenceEnabled,
} from '../utils/accountsOverviewFilterPersistence';
import { CodexSshSyncSettingsControl } from './codex/CodexSshSyncSettingsControl';
import { CodexContextManagementControl } from './codex/CodexContextManagementControl';
import { getCodexExperimentalModelErrorMessage } from '../utils/codexExperimentalModel';
import { CodexExperimentalModelEditor } from './codex/CodexExperimentalModelEditor';
import './QuickSettingsPopover.css';

/** GeneralConfig from backend */
interface GeneralConfig {
  language: string;
  theme: string;
  ui_scale: number;
  auto_refresh_minutes: number;
  codex_auto_refresh_minutes: number;
  codex_auto_refresh_plan_types?: string[];
  claude_auto_refresh_minutes: number;
  codex_sync_wsl: boolean;
  codex_app_ui_injection_enabled?: boolean;
  codex_oauth_app_version?: string;
  codex_wsl_config_dir: string;
  ghcp_auto_refresh_minutes: number;
  windsurf_auto_refresh_minutes: number;
  kiro_auto_refresh_minutes: number;
  cursor_auto_refresh_minutes: number;
  grok_auto_refresh_minutes: number;
  grok_sync_official_auth_on_switch: boolean;
  grok_opencode_sync_on_switch?: boolean;
  grok_opencode_auth_overwrite_on_switch?: boolean;
  codebuddy_auto_refresh_minutes: number;
  codebuddy_cn_auto_refresh_minutes: number;
  qoder_auto_refresh_minutes: number;
  zcode_auto_refresh_minutes: number;
  trae_auto_refresh_minutes: number;
  trae_solo_auto_refresh_minutes: number;
  trae_cn_auto_refresh_minutes: number;
  trae_solo_cn_auto_refresh_minutes: number;
  workbuddy_auto_refresh_minutes: number;
  zed_auto_refresh_minutes: number;
  close_behavior: string;
  minimize_behavior?: 'dock_and_tray' | 'tray_only';
  hide_dock_icon?: boolean;
  tray_icon_style?: 'template' | 'color';
  opencode_app_path: string;
  antigravity_app_path: string;
  codex_app_path: string;
  claude_app_path: string;
  claude_app_scan_roots: string;
  codex_specified_app_path: string;
  vscode_app_path: string;
  windsurf_app_path: string;
  kiro_app_path: string;
  cursor_app_path: string;
  codebuddy_app_path: string;
  codebuddy_share_sessions_on_switch: boolean;
  codebuddy_cn_app_path: string;
  codebuddy_cn_share_sessions_on_switch: boolean;
  qoder_app_path: string;
  zcode_app_path: string;
  trae_app_path: string;
  trae_solo_app_path: string;
  trae_cn_app_path: string;
  trae_solo_cn_app_path: string;
  trae_share_sessions_on_switch: boolean;
  trae_solo_share_sessions_on_switch: boolean;
  trae_cn_share_sessions_on_switch: boolean;
  trae_solo_cn_share_sessions_on_switch: boolean;
  trae_app_scan_roots: string;
  trae_solo_app_scan_roots: string;
  trae_cn_app_scan_roots: string;
  trae_solo_cn_app_scan_roots: string;
  workbuddy_app_path: string;
  workbuddy_share_sessions_on_switch: boolean;
  zed_app_path: string;
  opencode_sync_on_switch: boolean;
  opencode_auth_overwrite_on_switch: boolean;
  ghcp_opencode_sync_on_switch: boolean;
  ghcp_opencode_auth_overwrite_on_switch: boolean;
  ghcp_launch_on_switch: boolean;
  openclaw_auth_overwrite_on_switch: boolean;
  hermes_auth_overwrite_on_switch?: boolean;
  codex_launch_on_switch: boolean;
  codex_auto_restore_takeover_on_launch: boolean;
  codex_preserve_verified_external_bridge: boolean;
  antigravity_launch_on_switch: boolean;
  codex_restart_specified_app_on_switch: boolean;
  codex_local_access_entry_visible: boolean;
  codex_hide_relay_quota?: boolean;
  antigravity_dual_switch_no_restart_enabled: boolean;
  auto_switch_enabled: boolean;
  auto_switch_threshold: number;
  auto_switch_credits_enabled: boolean;
  auto_switch_credits_threshold: number;
  auto_switch_scope_mode: string;
  auto_switch_selected_group_ids: string[];
  auto_switch_account_scope_mode?: string;
  auto_switch_selected_account_ids?: string[];
  codex_auto_switch_enabled: boolean;
  codex_auto_switch_primary_threshold: number;
  codex_auto_switch_secondary_threshold: number;
  codex_auto_switch_account_scope_mode?: string;
  codex_auto_switch_selected_account_ids?: string[];
  quota_alert_enabled: boolean;
  quota_alert_threshold: number;
  codex_quota_alert_enabled: boolean;
  codex_quota_alert_threshold: number;
  codex_quota_alert_primary_threshold: number;
  codex_quota_alert_secondary_threshold: number;
  ghcp_quota_alert_enabled: boolean;
  ghcp_quota_alert_threshold: number;
  windsurf_quota_alert_enabled: boolean;
  windsurf_quota_alert_threshold: number;
  kiro_quota_alert_enabled: boolean;
  kiro_quota_alert_threshold: number;
  cursor_quota_alert_enabled: boolean;
  cursor_quota_alert_threshold: number;
  grok_quota_alert_enabled: boolean;
  grok_quota_alert_threshold: number;
  claude_quota_alert_enabled: boolean;
  claude_quota_alert_threshold: number;
  claude_quota_display_remaining?: boolean;
  codebuddy_quota_alert_enabled: boolean;
  codebuddy_quota_alert_threshold: number;
  codebuddy_cn_quota_alert_enabled: boolean;
  codebuddy_cn_quota_alert_threshold: number;
  qoder_quota_alert_enabled: boolean;
  qoder_quota_alert_threshold: number;
  trae_quota_alert_enabled: boolean;
  trae_quota_alert_threshold: number;
  trae_solo_quota_alert_enabled: boolean;
  trae_solo_quota_alert_threshold: number;
  trae_cn_quota_alert_enabled: boolean;
  trae_cn_quota_alert_threshold: number;
  trae_solo_cn_quota_alert_enabled: boolean;
  trae_solo_cn_quota_alert_threshold: number;
  workbuddy_quota_alert_enabled: boolean;
  workbuddy_quota_alert_threshold: number;
  zed_quota_alert_enabled: boolean;
  zed_quota_alert_threshold: number;
}

export type QuickSettingsType =
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
  | 'zcode'
  | 'trae'
  | 'trae_solo'
  | 'trae_cn'
  | 'trae_solo_cn'
  | 'workbuddy'
  | 'zed';

type AppPathTarget =
  | 'antigravity'
  | 'antigravity_legacy'
  | 'codex'
  | 'claude'
  | 'vscode'
  | 'windsurf'
  | 'kiro'
  | 'cursor'
  | 'codebuddy'
  | 'codebuddy_cn'
  | 'qoder'
  | 'zcode'
  | 'trae'
  | 'trae_solo'
  | 'trae_cn'
  | 'trae_solo_cn'
  | 'workbuddy'
  | 'zed';

type QuotaAlertEnabledKey =
  | 'quota_alert_enabled'
  | 'codex_quota_alert_enabled'
  | 'claude_quota_alert_enabled'
  | 'ghcp_quota_alert_enabled'
  | 'windsurf_quota_alert_enabled'
  | 'kiro_quota_alert_enabled'
  | 'cursor_quota_alert_enabled'
  | 'grok_quota_alert_enabled'
  | 'codebuddy_quota_alert_enabled'
  | 'codebuddy_cn_quota_alert_enabled'
  | 'qoder_quota_alert_enabled'
  | 'trae_quota_alert_enabled'
  | 'trae_solo_quota_alert_enabled'
  | 'trae_cn_quota_alert_enabled'
  | 'trae_solo_cn_quota_alert_enabled'
  | 'workbuddy_quota_alert_enabled'
  | 'zed_quota_alert_enabled';
type QuotaAlertThresholdKey =
  | 'quota_alert_threshold'
  | 'codex_quota_alert_threshold'
  | 'claude_quota_alert_threshold'
  | 'ghcp_quota_alert_threshold'
  | 'windsurf_quota_alert_threshold'
  | 'kiro_quota_alert_threshold'
  | 'cursor_quota_alert_threshold'
  | 'grok_quota_alert_threshold'
  | 'codebuddy_quota_alert_threshold'
  | 'codebuddy_cn_quota_alert_threshold'
  | 'qoder_quota_alert_threshold'
  | 'trae_quota_alert_threshold'
  | 'trae_solo_quota_alert_threshold'
  | 'trae_cn_quota_alert_threshold'
  | 'trae_solo_cn_quota_alert_threshold'
  | 'workbuddy_quota_alert_threshold'
  | 'zed_quota_alert_threshold';
type CodexWindowThresholdKey =
  | 'codex_auto_switch_primary_threshold'
  | 'codex_auto_switch_secondary_threshold'
  | 'codex_quota_alert_primary_threshold'
  | 'codex_quota_alert_secondary_threshold';

type AppLaunchCandidate = {
  target_type: string;
  label: string;
  target: string;
  source: string;
  supports_multi_instance: boolean;
};

const getAppPathKeyForTarget = (target: AppPathTarget): keyof GeneralConfig => {
  switch (target) {
    case 'antigravity':
    case 'antigravity_legacy':
      return 'antigravity_app_path';
    case 'codex':
      return 'codex_app_path';
    case 'claude':
      return 'claude_app_path';
    case 'vscode':
      return 'vscode_app_path';
    case 'windsurf':
      return 'windsurf_app_path';
    case 'kiro':
      return 'kiro_app_path';
    case 'cursor':
      return 'cursor_app_path';
    case 'codebuddy':
      return 'codebuddy_app_path';
    case 'codebuddy_cn':
      return 'codebuddy_cn_app_path';
    case 'qoder':
      return 'qoder_app_path';
    case 'zcode':
      return 'zcode_app_path';
    case 'trae':
      return 'trae_app_path';
    case 'trae_solo':
      return 'trae_solo_app_path';
    case 'trae_cn':
      return 'trae_cn_app_path';
    case 'trae_solo_cn':
      return 'trae_solo_cn_app_path';
    case 'workbuddy':
      return 'workbuddy_app_path';
    case 'zed':
      return 'zed_app_path';
  }
};

interface QuickSettingsPopoverProps {
  type: QuickSettingsType;
}

const AUTO_SWITCH_SCOPE_ALL_ACCOUNTS: AutoSwitchAccountScopeMode = 'all_accounts';
const AUTO_SWITCH_SCOPE_SELECTED_ACCOUNTS: AutoSwitchAccountScopeMode = 'selected_accounts';
const CURRENT_ACCOUNT_REFRESH_PRESETS = ['1', '2', '5', '10', '15'];
const getCurrentAccountRefreshPlatformForType = (
  platformType: QuickSettingsType,
): CurrentAccountRefreshPlatform => {
  switch (platformType) {
    case 'antigravity':
      return 'antigravity';
    case 'codex':
      return 'codex';
    case 'claude':
      return 'claude';
    case 'github_copilot':
      return 'ghcp';
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
    case 'zcode':
      return 'zcode';
    case 'trae':
      return 'trae';
    case 'trae_solo':
      return 'trae_solo';
    case 'trae_cn':
      return 'trae_cn';
    case 'trae_solo_cn':
      return 'trae_solo_cn';
    case 'workbuddy':
      return 'workbuddy';
    case 'zed':
      return 'zed';
  }
};

const normalizeAutoSwitchAccountScopeMode = (
  value?: string | null,
): AutoSwitchAccountScopeMode =>
  value === AUTO_SWITCH_SCOPE_SELECTED_ACCOUNTS
    ? AUTO_SWITCH_SCOPE_SELECTED_ACCOUNTS
    : AUTO_SWITCH_SCOPE_ALL_ACCOUNTS;

export function QuickSettingsPopover({ type }: QuickSettingsPopoverProps) {
  const { t } = useTranslation();
  const isWindows = usePlatformRuntimeSupport('windows-only');
  const remoteCodexOAuthAppVersion = useRemoteConfigStore(
    (state) => state.state.codexOAuthAppVersion,
  );
  const overviewFilterScope = useMemo(
    () => resolveAccountsOverviewScopeFromQuickSettingsType(type),
    [type],
  );
  const [overviewFilterPersistenceEnabled, setOverviewFilterPersistenceEnabledState] =
    useState<boolean>(() =>
      readAccountsOverviewFilterPersistenceEnabled(overviewFilterScope),
    );
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<GeneralConfig | null>(null);
  const [pathDetecting, setPathDetecting] = useState(false);
  const [appLaunchCandidates, setAppLaunchCandidates] = useState<AppLaunchCandidate[]>([]);
  const [openingCodexConfig, setOpeningCodexConfig] = useState(false);
  const [codexModelManagementConfig, setCodexModelManagementConfig] =
    useState<CodexQuickConfig | null>(null);
  const [codexModelManagementLoading, setCodexModelManagementLoading] = useState(false);
  const [codexModelManagementSaving, setCodexModelManagementSaving] = useState(false);
  const [codexModelManagementError, setCodexModelManagementError] = useState<string | null>(null);
  const [codexModelManagementNotice, setCodexModelManagementNotice] = useState<string | null>(null);
  const [codexModelManagementModels, setCodexModelManagementModels] = useState<
    CodexExperimentalModelDefinition[]
  >([]);
  const [codexModelManagementDefaultModelId, setCodexModelManagementDefaultModelId] =
    useState<string | null>(null);
  const [codexModelManagementModelsError, setCodexModelManagementModelsError] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshEditing, setRefreshEditing] = useState(false);
  const [currentAccountRefreshEditing, setCurrentAccountRefreshEditing] = useState(false);
  const [thresholdEditing, setThresholdEditing] = useState(false);
  const [creditsThresholdEditing, setCreditsThresholdEditing] = useState(false);
  const [quotaAlertThresholdEditing, setQuotaAlertThresholdEditing] = useState(false);
  const [customRefresh, setCustomRefresh] = useState('');
  const [currentAccountCustomRefresh, setCurrentAccountCustomRefresh] = useState('');
  const [customThreshold, setCustomThreshold] = useState('');
  const [customCreditsThreshold, setCustomCreditsThreshold] = useState('');
  const [quotaAlertCustomThreshold, setQuotaAlertCustomThreshold] = useState('');
  const [codexAutoSwitchPrimaryCustomThreshold, setCodexAutoSwitchPrimaryCustomThreshold] = useState('');
  const [codexAutoSwitchSecondaryCustomThreshold, setCodexAutoSwitchSecondaryCustomThreshold] = useState('');
  const [codexQuotaAlertPrimaryCustomThreshold, setCodexQuotaAlertPrimaryCustomThreshold] = useState('');
  const [codexQuotaAlertSecondaryCustomThreshold, setCodexQuotaAlertSecondaryCustomThreshold] = useState('');
  const [autoSwitchDisplayGroups, setAutoSwitchDisplayGroups] = useState<DisplayGroup[]>([]);
  const [antigravityAccounts, setAntigravityAccounts] = useState<Account[]>([]);
  const [antigravityAccountGroups, setAntigravityAccountGroups] = useState<AccountGroup[]>([]);
  const [codexAccounts, setCodexAccounts] = useState<CodexAccount[]>([]);
  const [codexAccountGroups, setCodexAccountGroups] = useState<CodexAccountGroup[]>([]);
  const [codexShowCodeReviewQuota, setCodexShowCodeReviewQuota] = useState(
    isCodexCodeReviewQuotaVisibleByDefault,
  );
  const [codexShowAdditionalQuota, setCodexShowAdditionalQuota] = useState(
    isCodexAdditionalQuotaVisibleByDefault,
  );
  const [codexPlanBadgeStyle, setCodexPlanBadgeStyle] = useState<CodexPlanBadgeStyle>(
    getCodexPlanBadgeStyle,
  );
  const [currentAccountRefreshMap, setCurrentAccountRefreshMap] =
    useState<CurrentAccountRefreshMinutesMap>(() => buildDefaultCurrentAccountRefreshMinutesMap());
  const [antigravitySeamlessSwitchUnlocked, setAntigravitySeamlessSwitchUnlocked] = useState(
    isAntigravitySeamlessSwitchFeatureUnlocked,
  );
  const modalRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<GeneralConfig | null>(null);
  const configSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const configSaveVersionRef = useRef(0);
  const configLoadVersionRef = useRef(0);
  const refreshPresets = ['-1', '2', '5', '10', '15'];
  const thresholdPresets = ['0', '20', '40', '60'];
  const creditsThresholdPresets = ['0', '5', '10', '20'];
  const antigravityScopeTypeOptions = useMemo(
    () => buildAccountTierFilterOptions(t, buildAccountTierCounts(antigravityAccounts, {})),
    [antigravityAccounts, t],
  );
  const antigravityScopeAccounts = useMemo<AutoSwitchScopeAccount[]>(
    () =>
      antigravityAccounts.map((account) => {
        const disabledReason = account.disabled_reason || '';
        const typeValue =
          disabledReason === 'verification_required'
            ? 'VERIFICATION_REQUIRED'
            : disabledReason === 'tos_violation'
              ? 'TOS_VIOLATION'
              : getSubscriptionTier(account.quota);
        return {
          id: account.id,
          label: account.email,
          searchableText: account.email,
          tags: account.tags || [],
          type: typeValue,
        };
      }),
    [antigravityAccounts],
  );
  const antigravityScopeGroups = useMemo(
    () =>
      antigravityAccountGroups.map((group) => ({
        id: group.id,
        name: group.name,
        accountIds: group.accountIds || [],
      })),
    [antigravityAccountGroups],
  );
  const codexScopeAccounts = useMemo<AutoSwitchScopeAccount[]>(
    () =>
      codexAccounts.map((account) => ({
        id: account.id,
        label: account.email,
        searchableText: account.email,
        tags: account.tags || [],
      })),
    [codexAccounts],
  );
  const codexScopeGroups = useMemo(
    () =>
      codexAccountGroups.map((group) => ({
        id: group.id,
        name: group.name,
        accountIds: group.accountIds || [],
      })),
    [codexAccountGroups],
  );
  const loadCodexModelManagement = useCallback(async () => {
    if (type !== 'codex') return;
    setCodexModelManagementLoading(true);
    setCodexModelManagementError(null);
    setCodexModelManagementNotice(null);
    try {
      const loaded = await codexService.getCodexQuickConfig();
      setCodexModelManagementConfig(loaded);
      setCodexModelManagementModels(loaded.experimental_model_catalog_models);
      setCodexModelManagementDefaultModelId(
        loaded.experimental_model_catalog_default_model_id ?? null,
      );
      setCodexModelManagementModelsError(null);
    } catch (loadError) {
      setCodexModelManagementError(
        t('quickSettings.codex.quickConfig.loadFailed', {
          error: String(loadError),
        }),
      );
    } finally {
      setCodexModelManagementLoading(false);
    }
  }, [t, type]);

  const toggleCodexModelManagement = useCallback(async () => {
    if (!codexModelManagementConfig || codexModelManagementSaving) return;
    const enabled = !codexModelManagementConfig.experimental_model_catalog_enabled;
    if (enabled) {
      const confirmed = await confirmDialog(
        t('codex.modelManagement.enableConfirmDescription'),
        {
          title: t('codex.modelManagement.enableConfirmTitle'),
          okLabel: t('codex.modelManagement.enable'),
          cancelLabel: t('common.cancel'),
          kind: 'warning',
        },
      );
      if (!confirmed) return;
    }
    setCodexModelManagementSaving(true);
    setCodexModelManagementError(null);
    setCodexModelManagementNotice(null);
    try {
      const saved = await codexService.saveCodexModelCatalog(
        enabled,
        codexModelManagementModels,
        codexModelManagementDefaultModelId,
      );
      setCodexModelManagementConfig(saved);
      setCodexModelManagementModels(saved.experimental_model_catalog_models);
      setCodexModelManagementDefaultModelId(
        saved.experimental_model_catalog_default_model_id ?? null,
      );
      setCodexModelManagementModelsError(null);
      setCodexModelManagementNotice(t('quickSettings.codex.quickConfig.saveSuccess'));
      window.dispatchEvent(new Event('config-updated'));
    } catch (saveError) {
      setCodexModelManagementError(
        getCodexExperimentalModelErrorMessage(t, saveError) ??
          t('quickSettings.codex.quickConfig.saveFailed', {
            error: String(saveError),
          }),
      );
    } finally {
      setCodexModelManagementSaving(false);
    }
  }, [
    codexModelManagementConfig,
    codexModelManagementDefaultModelId,
    codexModelManagementModels,
    codexModelManagementSaving,
    t,
  ]);

  const saveCodexManagedModels = useCallback(async () => {
    if (
      !codexModelManagementConfig?.experimental_model_catalog_enabled ||
      codexModelManagementSaving
    ) {
      return;
    }
    if (codexModelManagementModelsError) {
      setCodexModelManagementError(codexModelManagementModelsError);
      return;
    }
    setCodexModelManagementSaving(true);
    setCodexModelManagementError(null);
    setCodexModelManagementNotice(null);
    try {
      const saved = await codexService.saveCodexModelCatalog(
        true,
        codexModelManagementModels,
        codexModelManagementDefaultModelId,
      );
      setCodexModelManagementConfig(saved);
      setCodexModelManagementModels(saved.experimental_model_catalog_models);
      setCodexModelManagementDefaultModelId(
        saved.experimental_model_catalog_default_model_id ?? null,
      );
      setCodexModelManagementNotice(t('quickSettings.codex.quickConfig.saveSuccess'));
      window.dispatchEvent(new Event('config-updated'));
    } catch (saveError) {
      setCodexModelManagementError(
        getCodexExperimentalModelErrorMessage(t, saveError) ??
          t('quickSettings.codex.quickConfig.saveFailed', {
            error: String(saveError),
          }),
      );
    } finally {
      setCodexModelManagementSaving(false);
    }
  }, [
    codexModelManagementConfig,
    codexModelManagementDefaultModelId,
    codexModelManagementModels,
    codexModelManagementModelsError,
    codexModelManagementSaving,
    t,
  ]);

  const handleOverviewFilterPersistenceToggle = useCallback(
    (checked: boolean) => {
      setOverviewFilterPersistenceEnabledState(checked);
      setAccountsOverviewFilterPersistenceEnabled(overviewFilterScope, checked);
    },
    [overviewFilterScope],
  );

  // Load config when modal opens
  useEffect(() => {
    if (isOpen) {
      loadConfig();
      if (type === 'codex') void loadCodexModelManagement();
      setCodexShowCodeReviewQuota(isCodexCodeReviewQuotaVisibleByDefault());
      setAntigravitySeamlessSwitchUnlocked(isAntigravitySeamlessSwitchFeatureUnlocked());
      setOverviewFilterPersistenceEnabledState(
        readAccountsOverviewFilterPersistenceEnabled(overviewFilterScope),
      );
    } else {
      configLoadVersionRef.current += 1;
      configRef.current = null;
      setConfig(null);
    }
  }, [isOpen, loadCodexModelManagement, overviewFilterScope, type]);

  useEffect(() => {
    const handleFeatureUnlockChanged = (event: Event) => {
      const detail = (event as CustomEvent<FeatureUnlockChangedDetail>).detail;
      if (!detail || detail.feature !== 'antigravity.seamless_switch') {
        return;
      }
      setAntigravitySeamlessSwitchUnlocked(Boolean(detail.unlocked));
    };

    window.addEventListener(FEATURE_UNLOCK_CHANGED_EVENT, handleFeatureUnlockChanged as EventListener);
    return () => {
      window.removeEventListener(
        FEATURE_UNLOCK_CHANGED_EVENT,
        handleFeatureUnlockChanged as EventListener,
      );
    };
  }, []);

  useEscClose(isOpen, () => setIsOpen(false));

  // 外部触发：按平台类型打开设置弹框
  useEffect(() => {
    const handleExternalOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ type?: QuickSettingsType }>;
      if (customEvent.detail?.type !== type) {
        return;
      }
      setIsOpen(true);
    };

    window.addEventListener('quick-settings:open', handleExternalOpen as EventListener);
    return () => {
      window.removeEventListener('quick-settings:open', handleExternalOpen as EventListener);
    };
  }, [type]);

  const loadConfig = async () => {
    const loadVersion = configLoadVersionRef.current + 1;
    configLoadVersionRef.current = loadVersion;
    try {
      while (true) {
        const pendingSaves = configSaveQueueRef.current;
        await pendingSaves;
        if (pendingSaves === configSaveQueueRef.current) {
          break;
        }
      }
      if (loadVersion !== configLoadVersionRef.current) {
        return;
      }
      const saveVersionAtStart = configSaveVersionRef.current;
      setError(null);
      const antigravityScopeDataPromise =
        type === 'antigravity'
          ? Promise.all([
              accountService.listAccounts(),
              getAccountGroups(),
            ]).catch(() => [[] as Account[], [] as AccountGroup[]] as const)
          : Promise.resolve([[] as Account[], [] as AccountGroup[]] as const);
      const codexScopeDataPromise =
        type === 'codex'
          ? Promise.all([
              codexService.listCodexAccounts(),
              getCodexAccountGroups(),
            ]).catch(() => [[] as CodexAccount[], [] as CodexAccountGroup[]] as const)
          : Promise.resolve([[] as CodexAccount[], [] as CodexAccountGroup[]] as const);

      const [cfg, groups, antigravityScopeData, codexScopeData] = await Promise.all([
        invoke<GeneralConfig>('get_general_config'),
        getDisplayGroups().catch(() => [] as DisplayGroup[]),
        antigravityScopeDataPromise,
        codexScopeDataPromise,
      ]);
      const [nextAntigravityAccounts, nextAntigravityGroups] = antigravityScopeData;
      const [nextCodexAccounts, nextCodexGroups] = codexScopeData;
      if (
        loadVersion !== configLoadVersionRef.current ||
        saveVersionAtStart !== configSaveVersionRef.current
      ) {
        return;
      }
      configRef.current = cfg;
      setConfig(cfg);
      setClaudeQuotaDisplayRemainingEnabled(
        Boolean(cfg.claude_quota_display_remaining),
      );
      setAutoSwitchDisplayGroups(groups);
      setAntigravityAccounts(nextAntigravityAccounts || []);
      setAntigravityAccountGroups(nextAntigravityGroups || []);
      setCodexAccounts(nextCodexAccounts || []);
      setCodexAccountGroups(nextCodexGroups || []);
      // 非预设值通过下拉中的动态选项展示，不默认进入输入态
      setRefreshEditing(false);
      setCurrentAccountRefreshEditing(false);
      setThresholdEditing(false);
      setQuotaAlertThresholdEditing(false);
      setCustomRefresh('');
      setCurrentAccountCustomRefresh('');
      setCustomThreshold('');
      setQuotaAlertCustomThreshold('');
      setCurrentAccountRefreshMap(loadCurrentAccountRefreshMinutesMap());
      setCodexAutoSwitchPrimaryCustomThreshold(String(cfg.codex_auto_switch_primary_threshold));
      setCodexAutoSwitchSecondaryCustomThreshold(String(cfg.codex_auto_switch_secondary_threshold));
      setCodexQuotaAlertPrimaryCustomThreshold(String(cfg.codex_quota_alert_primary_threshold));
      setCodexQuotaAlertSecondaryCustomThreshold(String(cfg.codex_quota_alert_secondary_threshold));
      setAppLaunchCandidates([]);
    } catch (err) {
      if (loadVersion !== configLoadVersionRef.current) {
        return;
      }
      console.error('Failed to load config:', err);
      setError(t('quickSettings.error.loadFailed', {
        error: String(err),
        defaultValue: "Tải cấu hình thất bại: {{error}}",
      }));
    }
  };

  const getRefreshKeyForType = (t: QuickSettingsType): keyof GeneralConfig => {
    switch (t) {
      case 'antigravity': return 'auto_refresh_minutes';
      case 'codex': return 'codex_auto_refresh_minutes';
      case 'claude': return 'claude_auto_refresh_minutes';
      case 'github_copilot': return 'ghcp_auto_refresh_minutes';
      case 'windsurf': return 'windsurf_auto_refresh_minutes';
      case 'kiro': return 'kiro_auto_refresh_minutes';
      case 'cursor': return 'cursor_auto_refresh_minutes';
      case 'grok': return 'grok_auto_refresh_minutes';
      case 'codebuddy': return 'codebuddy_auto_refresh_minutes';
      case 'codebuddy_cn': return 'codebuddy_cn_auto_refresh_minutes';
      case 'qoder': return 'qoder_auto_refresh_minutes';
      case 'zcode': return 'zcode_auto_refresh_minutes';
      case 'trae': return 'trae_auto_refresh_minutes';
      case 'trae_solo': return 'trae_solo_auto_refresh_minutes';
      case 'trae_cn': return 'trae_cn_auto_refresh_minutes';
      case 'trae_solo_cn': return 'trae_solo_cn_auto_refresh_minutes';
      case 'workbuddy': return 'workbuddy_auto_refresh_minutes';
      case 'zed': return 'zed_auto_refresh_minutes';
      default: return 'auto_refresh_minutes';
    }
  };

  const saveConfig = useCallback(
    async (updates: Partial<GeneralConfig>) => {
      const current = configRef.current;
      if (!current) return;
      const optimisticConfig = { ...current, ...updates };
      configRef.current = optimisticConfig;
      setConfig(optimisticConfig);
      setError(null);
      const saveVersion = configSaveVersionRef.current + 1;
      configSaveVersionRef.current = saveVersion;

      const operation = configSaveQueueRef.current.then(async () => {
        const latest = await invoke<GeneralConfig>('get_general_config');
        const merged = { ...latest, ...updates };
        await invoke('patch_general_config', { updates });
        if (saveVersion === configSaveVersionRef.current) {
          configRef.current = merged;
          setConfig(merged);
        }
        window.dispatchEvent(new Event('config-updated'));
      }).catch((err) => {
        console.error('Failed to save config:', err);
        setError(t('quickSettings.error.saveFailed', {
          error: String(err),
          defaultValue: "Lưu cấu hình thất bại: {{error}}",
        }));
        if (saveVersion === configSaveVersionRef.current) {
          void loadConfig();
        }
      });

      configSaveQueueRef.current = operation;
      await operation;
    },
    [t]
  );

  const handlePickAppPath = async (target: AppPathTarget) => {
    try {
      const selected = await open({ multiple: false, directory: false });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path || !config) return;

      setAppLaunchCandidates([]);
      saveConfig({ [getAppPathKeyForTarget(target)]: path });
    } catch (err) {
      console.error('Failed to pick path:', err);
      setError(t('quickSettings.error.pickPathFailed', {
        error: String(err),
        defaultValue: "Chọn đường dẫn thất bại: {{error}}",
      }));
    }
  };

  const handleResetAppPath = async (target: AppPathTarget) => {
    if (pathDetecting) return;
    if (isWindows) {
      setPathDetecting(true);
      setError(null);
      try {
        const candidates = await invoke<AppLaunchCandidate[]>('scan_app_launch_targets', {
          app: target,
        });
        setAppLaunchCandidates(candidates);
        if (candidates.length === 0) {
          setError(
            t(
              'quickSettings.appPath.scanEmpty',
              '未检测到正在运行的应用，请先启动后重试，或手动选择路径。',
            ),
          );
        }
      } catch (err) {
        console.error('Failed to scan app launch targets:', err);
        setError(t('quickSettings.error.resetPathFailed', {
          error: String(err),
          defaultValue: "Đặt lại đường dẫn thất bại: {{error}}",
        }));
      } finally {
        setPathDetecting(false);
      }
      return;
    }
    setPathDetecting(true);
    setError(null);
    try {
      const detected = await invoke<string | null>('detect_app_path', { app: target, force: true });
      setAppLaunchCandidates([]);
      saveConfig({ [getAppPathKeyForTarget(target)]: detected || '' });
    } catch (err) {
      console.error('Failed to reset path:', err);
      setError(t('quickSettings.error.resetPathFailed', {
        error: String(err),
        defaultValue: "Đặt lại đường dẫn thất bại: {{error}}",
      }));
    } finally {
      setPathDetecting(false);
    }
  };

  const handleSelectAppLaunchCandidate = (candidate: AppLaunchCandidate) => {
    setError(null);
    saveConfig({ [getAppPathKeyForTarget(getAppTarget())]: candidate.target });
  };

  const handlePickCodexSpecifiedAppPath = async () => {
    try {
      const selected = await open({ multiple: false, directory: false });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path) return;
      saveConfig({ codex_specified_app_path: path });
    } catch (err) {
      console.error('Failed to pick codex specified app path:', err);
      setError(t('quickSettings.error.pickPathFailed', {
        error: String(err),
        defaultValue: "Chọn đường dẫn thất bại: {{error}}",
      }));
    }
  };

  const handleOpenCodexConfigToml = useCallback(async () => {
    if (openingCodexConfig) return;
    setOpeningCodexConfig(true);
    try {
      await codexService.openCodexConfigToml();
    } catch (err) {
      setError(t('quickSettings.error.openCodexConfigFailed', {
        error: String(err),
        defaultValue: "Không thể mở Codex config.toml: {{error}}",
      }));
    } finally {
      setOpeningCodexConfig(false);
    }
  }, [openingCodexConfig, t]);

  const getTitle = () => {
    const platformLabel = (() => {
      switch (type) {
        case 'antigravity':
          return 'Antigravity';
        case 'codex':
          return 'Codex';
        case 'claude':
          return 'Claude';
        case 'github_copilot':
          return 'GitHub Copilot';
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
          return 'CodeBuddy CN';
        case 'qoder':
          return 'Qoder';
        case 'zcode':
          return 'ZCode';
        case 'trae':
          return 'Trae';
        case 'trae_solo':
          return 'TRAE SOLO';
        case 'trae_cn':
          return 'Trae CN';
        case 'trae_solo_cn':
          return 'TRAE SOLO CN';
        case 'workbuddy':
          return 'WorkBuddy';
        case 'zed':
          return 'Zed';
      }
    })();
    return `${platformLabel} ${t('nav.settings', "Cài đặt")}`;
  };

  const getSessionSharingPlatformLabel = () => {
    switch (type) {
      case 'codebuddy_cn':
        return 'CodeBuddy CN';
      case 'trae':
        return 'Trae';
      case 'trae_solo':
        return 'TRAE SOLO';
      case 'trae_cn':
        return 'Trae CN';
      case 'trae_solo_cn':
        return 'TRAE SOLO CN';
      default:
        return '';
    }
  };

  const getSessionSharingEnabled = () => {
    if (!config) return false;
    // Trae-series session sharing is disabled this release.
    if (type === 'codebuddy_cn') {
      return config.codebuddy_cn_share_sessions_on_switch ?? false;
    }
    return false;
  };

  const saveSessionSharingEnabled = (enabled: boolean) => {
    if (type === 'codebuddy_cn') {
      saveConfig({ codebuddy_cn_share_sessions_on_switch: enabled });
    }
  };

  const getRefreshKey = (): keyof GeneralConfig => {
    return getRefreshKeyForType(type);
  };

  const getQuotaAlertEnabledKeyForType = (t: QuickSettingsType): QuotaAlertEnabledKey => {
    switch (t) {
      case 'codex':
        return 'codex_quota_alert_enabled';
      case 'claude':
        return 'claude_quota_alert_enabled';
      case 'github_copilot':
        return 'ghcp_quota_alert_enabled';
      case 'windsurf':
        return 'windsurf_quota_alert_enabled';
      case 'kiro':
        return 'kiro_quota_alert_enabled';
      case 'cursor':
        return 'cursor_quota_alert_enabled';
      case 'grok':
        return 'grok_quota_alert_enabled';
      case 'codebuddy':
        return 'codebuddy_quota_alert_enabled';
      case 'codebuddy_cn':
        return 'codebuddy_cn_quota_alert_enabled';
      case 'qoder':
        return 'qoder_quota_alert_enabled';
      case 'trae':
        return 'trae_quota_alert_enabled';
      case 'trae_solo':
        return 'trae_solo_quota_alert_enabled';
      case 'trae_cn':
        return 'trae_cn_quota_alert_enabled';
      case 'trae_solo_cn':
        return 'trae_solo_cn_quota_alert_enabled';
      case 'workbuddy':
        return 'workbuddy_quota_alert_enabled';
      case 'zed':
        return 'zed_quota_alert_enabled';
      default:
        return 'quota_alert_enabled';
    }
  };

  const getQuotaAlertThresholdKeyForType = (t: QuickSettingsType): QuotaAlertThresholdKey => {
    switch (t) {
      case 'codex':
        return 'codex_quota_alert_threshold';
      case 'claude':
        return 'claude_quota_alert_threshold';
      case 'github_copilot':
        return 'ghcp_quota_alert_threshold';
      case 'windsurf':
        return 'windsurf_quota_alert_threshold';
      case 'kiro':
        return 'kiro_quota_alert_threshold';
      case 'cursor':
        return 'cursor_quota_alert_threshold';
      case 'grok':
        return 'grok_quota_alert_threshold';
      case 'codebuddy':
        return 'codebuddy_quota_alert_threshold';
      case 'codebuddy_cn':
        return 'codebuddy_cn_quota_alert_threshold';
      case 'qoder':
        return 'qoder_quota_alert_threshold';
      case 'trae':
        return 'trae_quota_alert_threshold';
      case 'trae_solo':
        return 'trae_solo_quota_alert_threshold';
      case 'trae_cn':
        return 'trae_cn_quota_alert_threshold';
      case 'trae_solo_cn':
        return 'trae_solo_cn_quota_alert_threshold';
      case 'workbuddy':
        return 'workbuddy_quota_alert_threshold';
      case 'zed':
        return 'zed_quota_alert_threshold';
      default:
        return 'quota_alert_threshold';
    }
  };

  const getRefreshLabel = () => {
    switch (type) {
      case 'antigravity':
        return t('quickSettings.refreshInterval', "Tự động làm mới hạn ngạch");
      case 'codex':
        return t('quickSettings.codexRefreshInterval', "Tự động làm mới hạn ngạch");
      case 'claude':
        return t('quickSettings.claudeRefreshInterval', "Tự làm mới hạn mức");
      case 'github_copilot':
        return t('quickSettings.ghcpRefreshInterval', "Tự động làm mới hạn ngạch");
      case 'windsurf':
        return t('quickSettings.windsurfRefreshInterval', "Tự động làm mới hạn ngạch");
      case 'kiro':
        return t('quickSettings.kiroRefreshInterval', "Hạn ngạch làm mới tự động");
      case 'cursor':
        return t('quickSettings.cursorRefreshInterval', "Tự động làm mới hạn mức");
      case 'grok':
        return t('quickSettings.refreshInterval', "Tự động làm mới hạn ngạch");
      case 'codebuddy':
        return t('quickSettings.refreshInterval', "Tự động làm mới hạn ngạch");
      case 'codebuddy_cn':
        return t('quickSettings.refreshInterval', "Tự động làm mới hạn ngạch");
      case 'qoder':
        return t('quickSettings.refreshInterval', "Tự động làm mới hạn ngạch");
      case 'zcode':
        return t('quickSettings.refreshInterval', "Tự động làm mới hạn ngạch");
      case 'trae':
      case 'trae_solo':
      case 'trae_cn':
      case 'trae_solo_cn':
        return t('quickSettings.refreshInterval', "Tự động làm mới hạn ngạch");
      case 'workbuddy':
        return t('quickSettings.refreshInterval', "Tự động làm mới hạn ngạch");
      case 'zed':
        return t('quickSettings.refreshInterval', "Tự động làm mới hạn ngạch");
    }
  };

  const showAppPathSection = type !== 'grok';
  const antigravityLaunchOnSwitch = config?.antigravity_launch_on_switch ?? true;

  const getAppPath = (): string => {
    if (!config) return '';
    switch (type) {
      case 'antigravity':
        return config.antigravity_app_path;
      case 'codex':
        return config.codex_app_path;
      case 'claude':
        return config.claude_app_path;
      case 'github_copilot':
        return config.vscode_app_path;
      case 'windsurf':
        return config.windsurf_app_path;
      case 'kiro':
        return config.kiro_app_path;
      case 'cursor':
        return config.cursor_app_path;
      case 'grok':
        return '';
      case 'codebuddy':
        return config.codebuddy_app_path;
      case 'codebuddy_cn':
        return config.codebuddy_cn_app_path;
      case 'qoder':
        return config.qoder_app_path;
      case 'zcode':
        return config.zcode_app_path || '';
      case 'trae':
        return config.trae_app_path;
      case 'trae_solo':
        return config.trae_solo_app_path;
      case 'trae_cn':
        return config.trae_cn_app_path;
      case 'trae_solo_cn':
        return config.trae_solo_cn_app_path;
      case 'workbuddy':
        return config.workbuddy_app_path;
      case 'zed':
        return config.zed_app_path;
      default:
        return '';
    }
  };

  const getAppPathLabel = () => {
    switch (type) {
      case 'antigravity':
        return t('quickSettings.antigravity.appPath', "Đường dẫn ứng dụng");
      case 'codex':
        return t('quickSettings.codex.appPath', "Đường dẫn ứng dụng");
      case 'claude':
        return t('quickSettings.claude.appPath', "Đường dẫn Claude");
      case 'github_copilot':
        return t('quickSettings.githubCopilot.appPath', "Đường dẫn VS Code");
      case 'windsurf':
        return t('quickSettings.windsurf.appPath', "Đường dẫn Devin");
      case 'kiro':
        return t('quickSettings.kiro.appPath', "Con đường Kiro");
      case 'cursor':
        return t('quickSettings.cursor.appPath', "Đường dẫn Cursor");
      case 'grok':
        return t('quickSettings.grok.appPath', "Đường dẫn Grok CLI");
      case 'codebuddy':
        return t('quickSettings.codebuddy.appPath', "Đường dẫn CodeBuddy");
      case 'codebuddy_cn':
        return t('quickSettings.codebuddyCn.appPath', "Đường dẫn CodeBuddy CN");
      case 'qoder':
        return t('quickSettings.qoder.appPath', "Đường dẫn Qoder");
      case 'zcode':
        return t('quickSettings.zcode.appPath', "Đường dẫn ZCode");
      case 'trae':
        return t('quickSettings.trae.appPath', "Đường dẫn Trae");
      case 'trae_solo':
        return t('quickSettings.traeSolo.appPath', "Đường dẫn TRAE SOLO");
      case 'trae_cn':
        return t('quickSettings.traeCn.appPath', "Đường dẫn Trae CN");
      case 'trae_solo_cn':
        return t('quickSettings.traeSoloCn.appPath', "Đường dẫn TRAE SOLO CN");
      case 'workbuddy':
        return t('quickSettings.workbuddy.appPath', "Đường dẫn WorkBuddy");
      case 'zed':
        return t('quickSettings.zed.appPath', "Đường dẫn Zed");
    }
  };

  const getAppTarget = (): AppPathTarget => {
    switch (type) {
      case 'antigravity':
        return 'antigravity_legacy';
      case 'codex':
        return 'codex';
      case 'claude':
        return 'claude';
      case 'github_copilot':
        return 'vscode';
      case 'windsurf':
        return 'windsurf';
      case 'kiro':
        return 'kiro';
      case 'cursor':
        return 'cursor';
      case 'grok':
        return 'antigravity';
      case 'codebuddy':
        return 'codebuddy';
      case 'codebuddy_cn':
        return 'codebuddy_cn';
      case 'qoder':
        return 'qoder';
      case 'zcode':
        return 'zcode';
      case 'trae':
        return 'trae';
      case 'trae_solo':
        return 'trae_solo';
      case 'trae_cn':
        return 'trae_cn';
      case 'trae_solo_cn':
        return 'trae_solo_cn';
      case 'workbuddy':
        return 'workbuddy';
      case 'zed':
        return 'zed';
    }
  };

  const refreshValue = config ? (config[getRefreshKey()] as number) : 10;
  const isPreset = refreshPresets.includes(String(refreshValue));
  const showRefreshInput = refreshEditing;
  const currentAccountRefreshPlatform = getCurrentAccountRefreshPlatformForType(type);
  const currentAccountRefreshValue = currentAccountRefreshMap[currentAccountRefreshPlatform] ?? 1;
  const isCurrentAccountRefreshAllowed = refreshValue > 0;
  const currentAccountRefreshDisplayValue = isCurrentAccountRefreshAllowed
    ? String(currentAccountRefreshValue)
    : '-1';
  const isCurrentAccountRefreshPreset = CURRENT_ACCOUNT_REFRESH_PRESETS.includes(
    String(currentAccountRefreshValue),
  );
  const showCurrentAccountRefreshInput = currentAccountRefreshEditing && isCurrentAccountRefreshAllowed;

  const isThresholdPreset = config ? thresholdPresets.includes(String(config.auto_switch_threshold)) : true;
  const showThresholdInput = thresholdEditing;
  const creditsAutoSwitchEnabled = config?.auto_switch_credits_enabled ?? false;
  const creditsAutoSwitchThresholdValue = config ? Number(config.auto_switch_credits_threshold) : 5;
  const isCreditsThresholdPreset = creditsThresholdPresets.includes(
    String(creditsAutoSwitchThresholdValue),
  );
  const showCreditsThresholdInput = creditsThresholdEditing;
  const autoSwitchScopeMode = config?.auto_switch_scope_mode === 'selected_groups'
    ? 'selected_groups'
    : 'any_group';
  const autoSwitchSelectedGroupIds = config?.auto_switch_selected_group_ids ?? [];
  const validAutoSwitchGroupIdSet = new Set(autoSwitchDisplayGroups.map((group) => group.id));
  const normalizedAutoSwitchSelectedGroupIds = autoSwitchSelectedGroupIds.filter((groupId) =>
    validAutoSwitchGroupIdSet.has(groupId)
  );
  const quotaAlertEnabledKey = getQuotaAlertEnabledKeyForType(type);
  const quotaAlertThresholdKey = getQuotaAlertThresholdKeyForType(type);
  const quotaAlertEnabledValue = config ? Boolean(config[quotaAlertEnabledKey]) : false;
  const quotaAlertThresholdValue = config ? Number(config[quotaAlertThresholdKey]) : 20;
  const isQuotaAlertThresholdPreset = thresholdPresets.includes(String(quotaAlertThresholdValue));
  const showQuotaAlertThresholdInput = quotaAlertThresholdEditing;
  const codexAutoSwitchPrimaryThresholdValue = config
    ? Number(config.codex_auto_switch_primary_threshold)
    : 20;
  const codexAutoSwitchSecondaryThresholdValue = config
    ? Number(config.codex_auto_switch_secondary_threshold)
    : 20;
  const codexQuotaAlertPrimaryThresholdValue = config
    ? Number(config.codex_quota_alert_primary_threshold)
    : 20;
  const codexQuotaAlertSecondaryThresholdValue = config
    ? Number(config.codex_quota_alert_secondary_threshold)
    : 20;
  const autoSwitchAccountScopeMode = normalizeAutoSwitchAccountScopeMode(
    config?.auto_switch_account_scope_mode,
  );
  const autoSwitchSelectedAccountIds = config?.auto_switch_selected_account_ids ?? [];
  const codexAutoSwitchAccountScopeMode = normalizeAutoSwitchAccountScopeMode(
    config?.codex_auto_switch_account_scope_mode,
  );
  const codexAutoSwitchSelectedAccountIds = config?.codex_auto_switch_selected_account_ids ?? [];

  // Drop stale selected-ID lists when scope is "all accounts" (runtime already ignores them).
  useEffect(() => {
    if (!config) return;
    if (
      type === 'codex' &&
      codexAutoSwitchAccountScopeMode === AUTO_SWITCH_SCOPE_ALL_ACCOUNTS &&
      codexAutoSwitchSelectedAccountIds.length > 0
    ) {
      void saveConfig({ codex_auto_switch_selected_account_ids: [] });
      return;
    }
    if (
      type === 'antigravity' &&
      autoSwitchAccountScopeMode === AUTO_SWITCH_SCOPE_ALL_ACCOUNTS &&
      autoSwitchSelectedAccountIds.length > 0
    ) {
      void saveConfig({ auto_switch_selected_account_ids: [] });
    }
  }, [
    autoSwitchAccountScopeMode,
    autoSwitchSelectedAccountIds.length,
    codexAutoSwitchAccountScopeMode,
    codexAutoSwitchSelectedAccountIds.length,
    config,
    saveConfig,
    type,
  ]);

  const handleRefreshSelectChange = (val: string) => {
    if (val === 'custom') {
      setCustomRefresh(String(refreshValue > 0 ? refreshValue : 1));
      setRefreshEditing(true);
    } else {
      setCustomRefresh('');
      setRefreshEditing(false);
      saveConfig({ [getRefreshKey()]: parseInt(val, 10) });
    }
  };

  const handleCustomRefreshApply = () => {
    const parsed = parseInt(customRefresh, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      saveConfig({ [getRefreshKey()]: parsed });
      setCustomRefresh('');
      setRefreshEditing(false);
      return;
    }
    setCustomRefresh('');
    setRefreshEditing(false);
  };

  const saveCurrentAccountRefresh = (minutes: number) => {
    setCurrentAccountRefreshMap((prev) => {
      const next = saveCurrentAccountRefreshMinutesMap({
        ...prev,
        [currentAccountRefreshPlatform]: minutes,
      });
      window.dispatchEvent(new Event('config-updated'));
      return next;
    });
  };

  const handleCurrentAccountRefreshSelectChange = (value: string) => {
    if (!isCurrentAccountRefreshAllowed) {
      setCurrentAccountCustomRefresh('');
      setCurrentAccountRefreshEditing(false);
      return;
    }
    if (value === 'custom') {
      setCurrentAccountCustomRefresh(String(currentAccountRefreshValue || 1));
      setCurrentAccountRefreshEditing(true);
      return;
    }
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      saveCurrentAccountRefresh(parsed);
    }
    setCurrentAccountCustomRefresh('');
    setCurrentAccountRefreshEditing(false);
  };

  const handleCurrentAccountCustomRefreshApply = () => {
    if (!isCurrentAccountRefreshAllowed) {
      setCurrentAccountCustomRefresh('');
      setCurrentAccountRefreshEditing(false);
      return;
    }
    const parsed = parseInt(currentAccountCustomRefresh, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      saveCurrentAccountRefresh(parsed);
      setCurrentAccountCustomRefresh('');
      setCurrentAccountRefreshEditing(false);
      return;
    }
    setCurrentAccountCustomRefresh('');
    setCurrentAccountRefreshEditing(false);
  };

  const handleThresholdSelectChange = (val: string) => {
    if (val === 'custom') {
      setCustomThreshold(String(config?.auto_switch_threshold ?? 20));
      setThresholdEditing(true);
    } else {
      setCustomThreshold('');
      setThresholdEditing(false);
      saveConfig({ auto_switch_threshold: parseInt(val, 10) });
    }
  };

  const handleCustomThresholdApply = () => {
    const parsed = parseInt(customThreshold, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      saveConfig({ auto_switch_threshold: parsed });
      setCustomThreshold('');
      setThresholdEditing(false);
      return;
    }
    setCustomThreshold('');
    setThresholdEditing(false);
  };

  const handleCreditsThresholdSelectChange = (val: string) => {
    if (val === 'custom') {
      setCustomCreditsThreshold(String(creditsAutoSwitchThresholdValue));
      setCreditsThresholdEditing(true);
      return;
    }
    setCustomCreditsThreshold('');
    setCreditsThresholdEditing(false);
    saveConfig({ auto_switch_credits_threshold: parseInt(val, 10) });
  };

  const handleCustomCreditsThresholdApply = () => {
    const parsed = parseInt(customCreditsThreshold, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      saveConfig({ auto_switch_credits_threshold: parsed });
      setCustomCreditsThreshold('');
      setCreditsThresholdEditing(false);
      return;
    }
    setCustomCreditsThreshold('');
    setCreditsThresholdEditing(false);
  };

  const handleAutoSwitchScopeModeChange = (value: string) => {
    if (value !== 'selected_groups') {
      saveConfig({ auto_switch_scope_mode: 'any_group' });
      return;
    }
    const nextSelected = normalizedAutoSwitchSelectedGroupIds.length > 0
      ? normalizedAutoSwitchSelectedGroupIds
      : autoSwitchDisplayGroups.map((group) => group.id);
    saveConfig({
      auto_switch_scope_mode: 'selected_groups',
      auto_switch_selected_group_ids: nextSelected,
    });
  };

  const handleAutoSwitchGroupToggle = (groupId: string) => {
    const selected = new Set(normalizedAutoSwitchSelectedGroupIds);
    if (selected.has(groupId)) {
      if (selected.size === 1) {
        return;
      }
      selected.delete(groupId);
    } else {
      selected.add(groupId);
    }
    saveConfig({ auto_switch_selected_group_ids: [...selected] });
  };

  const handleQuotaAlertThresholdSelectChange = (val: string) => {
    if (val === 'custom') {
      setQuotaAlertCustomThreshold(String(quotaAlertThresholdValue));
      setQuotaAlertThresholdEditing(true);
    } else {
      setQuotaAlertCustomThreshold('');
      setQuotaAlertThresholdEditing(false);
      saveConfig({ [quotaAlertThresholdKey]: parseInt(val, 10) } as Partial<GeneralConfig>);
    }
  };

  const handleQuotaAlertCustomThresholdApply = () => {
    const parsed = parseInt(quotaAlertCustomThreshold, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      saveConfig({ [quotaAlertThresholdKey]: parsed } as Partial<GeneralConfig>);
      setQuotaAlertCustomThreshold('');
      setQuotaAlertThresholdEditing(false);
      return;
    }
    setQuotaAlertCustomThreshold('');
    setQuotaAlertThresholdEditing(false);
  };

  const handleCodexWindowThresholdInputChange = (
    rawValue: string,
    setCustomValue: (value: string) => void,
  ) => {
    setCustomValue(rawValue.replace(/[^\d]/g, '').slice(0, 3));
  };

  const handleCodexWindowCustomThresholdApply = (
    customValue: string,
    setCustomValue: (value: string) => void,
    key: CodexWindowThresholdKey,
    fallbackValue: number,
  ) => {
    const parsed = parseInt(customValue, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      saveConfig({ [key]: parsed } as Partial<GeneralConfig>);
      setCustomValue(String(parsed));
      return;
    }
    setCustomValue(String(fallbackValue));
  };

  /** 共用的配额预警 enable + threshold 控件 */
  const renderQuotaAlertControls = () => {
    const isCodexAlert = type === 'codex';
    const isGrokAlert = type === 'grok';
    return (
      <>
        <div className="qs-row" style={{ marginTop: type === 'antigravity' ? 10 : 0 }}>
          <div className="qs-row-label">
            <span>{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</span>
          </div>
          <div className="qs-row-control">
            <label className="qs-switch">
              <input
                type="checkbox"
                checked={quotaAlertEnabledValue}
                onChange={(e) =>
                  saveConfig({ [quotaAlertEnabledKey]: e.target.checked } as Partial<GeneralConfig>)
                }
              />
              <span className="qs-switch-slider"></span>
            </label>
          </div>
        </div>

        {quotaAlertEnabledValue && (
          <div className="qs-field-group" style={{ animation: 'qsFadeUp 0.2s ease both' }}>
            {isCodexAlert ? (
              <>
                <div className="qs-row">
                  <div className="qs-row-label">
                    <span>
                      {t('codex.thresholds.shortCycle')} {t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <div className="qs-inline-input">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="qs-select qs-select--input-mode qs-select--with-unit"
                        value={codexQuotaAlertPrimaryCustomThreshold}
                        placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                        onChange={(e) =>
                          handleCodexWindowThresholdInputChange(
                            e.target.value,
                            setCodexQuotaAlertPrimaryCustomThreshold,
                          )
                        }
                        onBlur={() =>
                          handleCodexWindowCustomThresholdApply(
                            codexQuotaAlertPrimaryCustomThreshold,
                            setCodexQuotaAlertPrimaryCustomThreshold,
                            'codex_quota_alert_primary_threshold',
                            codexQuotaAlertPrimaryThresholdValue,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCodexWindowCustomThresholdApply(
                              codexQuotaAlertPrimaryCustomThreshold,
                              setCodexQuotaAlertPrimaryCustomThreshold,
                              'codex_quota_alert_primary_threshold',
                              codexQuotaAlertPrimaryThresholdValue,
                            );
                          }
                        }}
                      />
                      <span className="qs-input-unit">%</span>
                    </div>
                  </div>
                </div>

                <div className="qs-hint" style={{ marginTop: 0, marginBottom: 4 }}>
                  {t('quickSettings.codexWindow.orDivider', 'OR（命中任一即触发）')}
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <span>
                      {t('codex.thresholds.weekly')} {t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <div className="qs-inline-input">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="qs-select qs-select--input-mode qs-select--with-unit"
                        value={codexQuotaAlertSecondaryCustomThreshold}
                        placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                        onChange={(e) =>
                          handleCodexWindowThresholdInputChange(
                            e.target.value,
                            setCodexQuotaAlertSecondaryCustomThreshold,
                          )
                        }
                        onBlur={() =>
                          handleCodexWindowCustomThresholdApply(
                            codexQuotaAlertSecondaryCustomThreshold,
                            setCodexQuotaAlertSecondaryCustomThreshold,
                            'codex_quota_alert_secondary_threshold',
                            codexQuotaAlertSecondaryThresholdValue,
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCodexWindowCustomThresholdApply(
                              codexQuotaAlertSecondaryCustomThreshold,
                              setCodexQuotaAlertSecondaryCustomThreshold,
                              'codex_quota_alert_secondary_threshold',
                              codexQuotaAlertSecondaryThresholdValue,
                            );
                          }
                        }}
                      />
                      <span className="qs-input-unit">%</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="qs-row">
                <div className="qs-row-label">
                  <span>{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</span>
                </div>
                <div className="qs-row-control">
                  {showQuotaAlertThresholdInput ? (
                    <div className="qs-inline-input">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className="qs-select qs-select--input-mode qs-select--with-unit"
                        value={quotaAlertCustomThreshold}
                        placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                        onChange={(e) => setQuotaAlertCustomThreshold(e.target.value.replace(/[^\d]/g, ''))}
                        onBlur={handleQuotaAlertCustomThresholdApply}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleQuotaAlertCustomThresholdApply();
                          }
                        }}
                      />
                      <span className="qs-input-unit">%</span>
                    </div>
                  ) : (
                    <select
                      className="qs-select"
                      value={String(quotaAlertThresholdValue)}
                      onChange={(e) => handleQuotaAlertThresholdSelectChange(e.target.value)}
                    >
                      {!isQuotaAlertThresholdPreset && (
                        <option value={String(quotaAlertThresholdValue)}>
                          {quotaAlertThresholdValue}%
                        </option>
                      )}
                      <option value="0">0%</option>
                      <option value="20">20%</option>
                      <option value="40">40%</option>
                      <option value="60">60%</option>
                      <option value="custom">{t('quickSettings.customInput', "Tùy chỉnh")}</option>
                    </select>
                  )}
                </div>
              </div>
            )}
            <div className="qs-hint" style={{ marginTop: 6 }}>
              {isGrokAlert
                ? t(
                    'grok.quotaAlert.hint',
                    "Khi bất kỳ mục hạn mức nào của tài khoản hiện tại xuống dưới ngưỡng, hãy gửi thông báo hệ thống và hiển thị thao tác chuyển nhanh trong ứng dụng.",
                  )
                : t(
                    'quickSettings.quotaAlert.hint',
                    "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.",
                  )}
              {isCodexAlert && (
                <>
                  <div>
                    {t('codex.thresholds.windowHint')}
                  </div>
                  <div>
                    {t('codex.thresholds.rule', {
                      shortCycle: codexQuotaAlertPrimaryThresholdValue,
                      weekly: codexQuotaAlertSecondaryThresholdValue,
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  const handleCodexCodeReviewQuotaToggle = (checked: boolean) => {
    setCodexShowCodeReviewQuota(checked);
    persistCodexCodeReviewQuotaVisible(checked);
  };

  const handleCodexAdditionalQuotaToggle = (checked: boolean) => {
    setCodexShowAdditionalQuota(checked);
    persistCodexAdditionalQuotaVisible(checked);
  };

  const handleCodexPlanBadgeStyleChange = (style: CodexPlanBadgeStyle) => {
    setCodexPlanBadgeStyle(style);
    persistCodexPlanBadgeStyle(style);
  };

  const overlayContent = isOpen ? (
    <div className="qs-overlay">
      <div className={`qs-modal qs-modal--${type}`} ref={modalRef}>
        <div className="qs-header">
          <span className="qs-title">{getTitle()}</span>
          <button className="qs-close" onClick={() => setIsOpen(false)} aria-label={t('common.close')}>
            <X size={16} />
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="qs-error">
            {error}
            <button className="qs-error-close" onClick={() => setError(null)} aria-label={t('common.close')}>
              <X size={12} />
            </button>
          </div>
        )}

        {!config && !error && (
          <div className="qs-loading" role="status" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <span>{t('common.loading', "Đang tải...")}</span>
          </div>
        )}

        {config && (
          <div className="qs-body">
            {type === 'grok' && (
              <div className="qs-section">
                <div className="qs-row">
                  <div className="qs-row-label">
                    <span>
                      {t(
                        'quickSettings.grok.syncOfficialAuthOnSwitch',
                        "Đồng bộ đăng nhập chính thức",
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.grok_sync_official_auth_on_switch}
                        onChange={(event) =>
                          saveConfig({
                            grok_sync_official_auth_on_switch: event.target.checked,
                          })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div className="qs-hint">
                  {t(
                    'quickSettings.grok.syncOfficialAuthOnSwitchDesc',
                    "Khi bật, việc chuyển tài khoản OAuth cho phiên bản mặc định sẽ ghi vào ~/.grok/auth.json chính thức. Khi tắt, một GROK_HOME riêng sẽ được dùng. API Key và các phiên bản bổ sung không ghi đè đăng nhập chính thức.",
                  )}
                </div>
                <div className="qs-row" style={{ marginTop: 8 }}>
                  <div className="qs-row-label">
                    <span>
                      {t(
                        'settings.general.grokOpencodeAuthOverwrite',
                        "Ghi đè đăng nhập OpenCode khi chuyển đổi Grok",
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(config.grok_opencode_auth_overwrite_on_switch)}
                        onChange={(event) =>
                          saveConfig(
                            event.target.checked
                              ? { grok_opencode_auth_overwrite_on_switch: true }
                              : {
                                  grok_opencode_auth_overwrite_on_switch: false,
                                  grok_opencode_sync_on_switch: false,
                                },
                          )
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div className="qs-row">
                  <div className="qs-row-label">
                    <span>
                      {t(
                        'settings.general.grokOpencodeRestart',
                        "Khởi động lại OpenCode khi chuyển Grok",
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(config.grok_opencode_sync_on_switch)}
                        disabled={!config.grok_opencode_auth_overwrite_on_switch}
                        onChange={(event) =>
                          saveConfig({ grok_opencode_sync_on_switch: event.target.checked })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}
            {type === 'codex' && config && (
              <div className="qs-section">
                <div className="qs-section-header">{t('codex.autoRefreshScope.label')}</div>
                <p className="codex-refresh-scope-description">{t('codex.autoRefreshScope.description')}</p>
                <CodexRefreshPlanScopeControl value={config.codex_auto_refresh_plan_types}
                  onChange={(value) => void saveConfig({ codex_auto_refresh_plan_types: value })} />
                <CodexRequestPayloadSetting />
              </div>
            )}
            {type === 'codex' && (
              <div className="qs-section">
                <div className="qs-row">
                  <div className="qs-row-label">
                    <FolderOpen size={15} />
                    <span>
                      {t(
                        'settings.general.codexLocalAccessEntryVisible',
                        "Hiển thị mục Dịch vụ API",
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.codex_local_access_entry_visible}
                        onChange={(e) =>
                          saveConfig({ codex_local_access_entry_visible: e.target.checked })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div className="qs-hint">
                  {t(
                    'settings.general.codexLocalAccessEntryVisibleDesc',
                    "Chỉ kiểm soát việc mục Dịch vụ API có hiển thị trong tổng quan Codex hay không. Thao tác này không dừng dịch vụ API cục bộ; bạn có thể bật lại tại đây hoặc trong Cài đặt nhanh.",
                  )}
                </div>
                <div className="qs-row" style={{ marginTop: 8 }}>
                  <div className="qs-row-label">
                    <Gauge size={15} />
                    <span>
                      {t(
                        'settings.general.codexAppUiInjection',
                        "Hạn mức dịch vụ API",
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(config.codex_app_ui_injection_enabled)}
                        onChange={(event) =>
                          saveConfig({
                            codex_app_ui_injection_enabled: event.target.checked,
                          })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div className="qs-hint">
                  {t(
                    'settings.general.codexAppUiInjectionDesc',
                    "Sau khi khởi động lại phiên Codex, huy hiệu hạn mức bên dưới trình soạn thảo sẽ thay đổi theo mô hình đang chọn: DeepSeek hiển thị số dư tài khoản, Grok hiển thị hạn mức Grok, các mô hình GPT hiển thị hạn mức tuần và 5 giờ. Cần giữ Cockpit Tools chạy trong nền; dữ liệu sẽ ngừng cập nhật khi thoát hoàn toàn hoặc khi mạng không khả dụng.",
                  )}
                </div>
                <div className="qs-row" style={{ marginTop: 8 }}>
                  <div className="qs-row-label">
                    <span>{t('settings.general.codexOAuthAppVersion', "Phiên bản máy khách OAuth")}</span>
                  </div>
                  <div className="qs-row-control">
                    <input
                      type="text"
                      className="qs-path-input"
                      value={config.codex_oauth_app_version || ''}
                      placeholder={t('settings.general.codexOAuthAppVersionPlaceholder', {
                        defaultValue: "Để trống để dùng {{version}}",
                        version: remoteCodexOAuthAppVersion || '26.820.60940',
                      })}
                      onChange={(event) =>
                        saveConfig({ codex_oauth_app_version: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="qs-hint">
                  {t('settings.general.codexOAuthAppVersionDesc', {
                    defaultValue: "Để trống để dùng giá trị mặc định từ xa {{version}}; giá trị nhập vào chỉ ghi đè trường phiên bản trong URL ủy quyền OAuth.",
                    version: remoteCodexOAuthAppVersion || '26.820.60940',
                  })}
                </div>
                <div className="qs-codex-experimental-model">
                  <div className="qs-row qs-row--top">
                    <div className="qs-row-label">
                      <Zap size={15} />
                      <span>{t('codex.modelManagement.title')}</span>
                    </div>
                    <div className="qs-row-control">
                      <button
                        type="button"
                        className={`btn btn-sm ${
                          codexModelManagementConfig?.experimental_model_catalog_enabled
                            ? 'btn-outline'
                            : 'btn-primary'
                        }`}
                        onClick={() => void toggleCodexModelManagement()}
                        disabled={
                          codexModelManagementLoading ||
                          codexModelManagementSaving ||
                          !codexModelManagementConfig ||
                          (!codexModelManagementConfig.experimental_model_catalog_enabled &&
                            !codexModelManagementConfig.experimental_model_catalog_available)
                        }
                      >
                        {codexModelManagementSaving
                          ? t('common.saving')
                          : codexModelManagementConfig?.experimental_model_catalog_enabled
                            ? t('codex.modelManagement.disable')
                            : t('codex.modelManagement.enable')}
                      </button>
                    </div>
                  </div>
                  <div className="qs-hint">
                    {codexModelManagementConfig?.experimental_model_catalog_enabled
                      ? t('codex.modelManagement.enabledDescription')
                      : t('codex.modelManagement.disabledDescription')}
                  </div>
                  {!codexModelManagementConfig?.experimental_model_catalog_enabled &&
                    codexModelManagementConfig?.experimental_model_catalog_unavailable_reason ===
                      'catalog_conflict' && (
                      <div className="qs-codex-quick-status error">
                        {t('codex.experimentalModelCatalog.unavailable.catalogConflict')}
                      </div>
                    )}
                  {codexModelManagementConfig?.experimental_model_catalog_enabled && (
                    <>
                      <CodexExperimentalModelEditor
                        models={codexModelManagementModels}
                        defaultModelId={codexModelManagementDefaultModelId}
                        mode="summary"
                        onChange={(models) => {
                          setCodexModelManagementModels(models);
                          setCodexModelManagementError(null);
                          setCodexModelManagementNotice(null);
                        }}
                        onDefaultModelChange={(modelId) => {
                          setCodexModelManagementDefaultModelId(modelId);
                          setCodexModelManagementError(null);
                          setCodexModelManagementNotice(null);
                        }}
                        onValidationChange={setCodexModelManagementModelsError}
                        disabled={codexModelManagementSaving}
                      />
                      <div className="qs-codex-model-management-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => void saveCodexManagedModels()}
                          disabled={
                            codexModelManagementSaving ||
                            Boolean(codexModelManagementModelsError)
                          }
                        >
                          {codexModelManagementSaving
                            ? t('common.saving')
                            : t('common.save')}
                        </button>
                      </div>
                    </>
                  )}
                  {codexModelManagementError && (
                    <div className="qs-codex-quick-status error">
                      {codexModelManagementError}
                    </div>
                  )}
                  {codexModelManagementNotice && (
                    <div className="qs-codex-quick-status success">
                      {codexModelManagementNotice}
                    </div>
                  )}
                </div>
                {isWindows && (
                  <>
                    <div className="qs-row" style={{ marginTop: 8 }}>
                      <div className="qs-row-label">
                        <Terminal size={15} />
                        <span>{t('settings.general.codexSyncWsl', "Đồng bộ Codex sang WSL")}</span>
                      </div>
                      <div className="qs-row-control">
                        <label className="qs-switch">
                          <input
                            type="checkbox"
                            checked={config.codex_sync_wsl}
                            onChange={(e) =>
                              saveConfig({ codex_sync_wsl: e.target.checked })
                            }
                          />
                          <span className="qs-switch-slider"></span>
                        </label>
                      </div>
                    </div>
                    <div className="qs-hint">
                      {t(
                        'settings.general.codexSyncWslDesc',
                        "Sau khi chuyển tài khoản Codex mặc định, auth.json và config.toml cũng được ghi vào thư mục Codex trong WSL.",
                      )}
                    </div>
                    {config.codex_sync_wsl && (
                      <div className="qs-path-control" style={{ marginTop: 8 }}>
                        <input
                          type="text"
                          className="qs-path-input"
                          value={config.codex_wsl_config_dir}
                          placeholder={t(
                            'settings.general.codexWslConfigDirPlaceholder',
                            '\\\\wsl.localhost\\Ubuntu-24.04\\home\\user\\.codex',
                          )}
                          onChange={(e) =>
                            saveConfig({ codex_wsl_config_dir: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </>
                )}
                <CodexSshSyncSettingsControl variant="quick" />
                <CodexContextManagementControl variant="quick" active={isOpen && type === 'codex'} />
                <div className="qs-row" style={{ marginTop: 8 }}>
                  <div className="qs-row-label">
                    <EyeOff size={15} />
                    <span>
                      {t(
                        'settings.general.codexHideRelayQuota',
                        "Ẩn hạn mức relay",
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.codex_hide_relay_quota ?? false}
                        onChange={(e) =>
                          saveConfig({
                            codex_hide_relay_quota: e.target.checked,
                          })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div className="qs-hint">
                  {t(
                    'settings.general.codexHideRelayQuotaDesc',
                    "Ẩn bảng hạn mức relay / New API trên tổng quan tài khoản Codex.",
                  )}
                </div>
              </div>
            )}

            {/* ─── Refresh Interval ─── */}
            <div className="qs-section">
              <div className="qs-section-header">
                <RefreshCw size={15} />
                <span>{getRefreshLabel()}</span>
              </div>
              <div className="qs-field-group">
                {showRefreshInput ? (
                  <div className="qs-inline-input">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      className="qs-select qs-select--input-mode qs-select--with-unit"
                      value={customRefresh}
                      placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                      onChange={(e) => setCustomRefresh(e.target.value.replace(/[^\d]/g, ''))}
                      onBlur={handleCustomRefreshApply}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCustomRefreshApply();
                        }
                      }}
                    />
                    <span className="qs-input-unit">{t('settings.general.minutes')}</span>
                  </div>
                ) : (
                  <select
                    className="qs-select"
                    value={String(refreshValue)}
                    onChange={(e) => handleRefreshSelectChange(e.target.value)}
                  >
                    {!isPreset && (
                      <option value={String(refreshValue)}>
                        {refreshValue} {t('settings.general.minutes')}
                      </option>
                    )}
                    <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                    <option value="2">2 {t('settings.general.minutes')}</option>
                    <option value="5">5 {t('settings.general.minutes')}</option>
                    <option value="10">10 {t('settings.general.minutes')}</option>
                    <option value="15">15 {t('settings.general.minutes')}</option>
                    <option value="custom">{t('quickSettings.customInput', "Tùy chỉnh")}</option>
                  </select>
                )}
              </div>
            </div>

            <div className="qs-section">
              <div className="qs-section-header">
                <RefreshCw size={15} />
                <span>{t('settings.general.currentAccountRefreshTitle')}</span>
              </div>
              <div className="qs-field-group">
                {showCurrentAccountRefreshInput ? (
                  <div className="qs-inline-input">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      className="qs-select qs-select--input-mode qs-select--with-unit"
                      value={currentAccountCustomRefresh}
                      placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                      onChange={(e) =>
                        setCurrentAccountCustomRefresh(e.target.value.replace(/[^\d]/g, ''))
                      }
                      onBlur={handleCurrentAccountCustomRefreshApply}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCurrentAccountCustomRefreshApply();
                        }
                      }}
                    />
                    <span className="qs-input-unit">{t('settings.general.minutes')}</span>
                  </div>
                ) : (
                  <select
                    className="qs-select"
                    value={currentAccountRefreshDisplayValue}
                    onChange={(e) => handleCurrentAccountRefreshSelectChange(e.target.value)}
                    disabled={!isCurrentAccountRefreshAllowed}
                  >
                    {!isCurrentAccountRefreshAllowed && (
                      <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                    )}
                    {!isCurrentAccountRefreshPreset && (
                      <option value={String(currentAccountRefreshValue)}>
                        {currentAccountRefreshValue} {t('settings.general.minutes')}
                      </option>
                    )}
                    <option value="1">1 {t('settings.general.minutes')}</option>
                    <option value="2">2 {t('settings.general.minutes')}</option>
                    <option value="5">5 {t('settings.general.minutes')}</option>
                    <option value="10">10 {t('settings.general.minutes')}</option>
                    <option value="15">15 {t('settings.general.minutes')}</option>
                    <option value="custom">{t('quickSettings.customInput', "Tùy chỉnh")}</option>
                  </select>
                )}
                <div className="qs-hint" style={{ marginTop: 6 }}>
                  {isCurrentAccountRefreshAllowed
                    ? t('settings.general.currentAccountRefreshItemDesc')
                    : t(
                      'settings.general.currentAccountRefreshRequiresAutoRefresh',
                      "Hãy bật \"Tự động làm mới hạn ngạch\" trước để cấu hình làm mới tài khoản hiện tại.",
                    )}
                </div>
              </div>
            </div>

            <div className="qs-section">
              <div className="qs-section-header">
                <Settings size={15} />
                <span>{t('quickSettings.filterPersistence.title', "Ghi nhớ bộ lọc")}</span>
              </div>
              <div className="qs-row">
                <div className="qs-row-label">
                  <span>
                    {t(
                      'quickSettings.filterPersistence.enable',
                      "Ghi nhớ bộ lọc tổng quan tài khoản (không gồm tìm kiếm)",
                    )}
                  </span>
                </div>
                <div className="qs-row-control">
                  <label className="qs-switch">
                    <input
                      type="checkbox"
                      checked={overviewFilterPersistenceEnabled}
                      onChange={(event) =>
                        handleOverviewFilterPersistenceToggle(event.target.checked)
                      }
                    />
                    <span className="qs-switch-slider"></span>
                  </label>
                </div>
              </div>
              <div className="qs-hint">
                {t(
                  'quickSettings.filterPersistence.hint',
                  "Mặc định tắt. Khi bật, mỗi nền tảng sẽ giữ bộ lọc, thẻ và thứ tự sắp xếp.",
                )}
              </div>
            </div>

            {/* ─── App Path ─── */}
            {showAppPathSection && (
              <div className="qs-section">
	                <div className="qs-section-header">
	                  <FolderOpen size={15} />
	                  <span>{getAppPathLabel()}</span>
	                </div>
                {type === 'codex' && config && (
                  <>
                    <div className="qs-row">
                      <div className="qs-row-label">
                        <span>
                          {t(
                            'settings.general.codexLaunchOnSwitch',
                            "Tự động khởi chạy Codex App khi chuyển Codex",
                          )}
                        </span>
                      </div>
                      <div className="qs-row-control">
                        <label className="qs-switch">
                          <input
                            type="checkbox"
                            checked={config.codex_launch_on_switch}
                            onChange={(event) =>
                              saveConfig({
                                codex_launch_on_switch: event.target.checked,
                              })
                            }
                          />
                          <span className="qs-switch-slider"></span>
                        </label>
                      </div>
                    </div>
                    <div className="qs-hint">
                      {t(
                        'settings.general.codexLaunchOnSwitchDesc',
                        "Tự động khởi động hoặc khởi động lại Codex App sau khi chuyển tài khoản",
                      )}
                    </div>
                    <div className="qs-row">
                      <div className="qs-row-label"><span>{t('settings.general.codexAutoRestoreTakeoverOnLaunch')}</span></div>
                      <div className="qs-row-control">
                        <label className="qs-switch">
                          <input type="checkbox" checked={config.codex_auto_restore_takeover_on_launch}
                            onChange={(event) => saveConfig({ codex_auto_restore_takeover_on_launch: event.target.checked })} />
                          <span className="qs-switch-slider"></span>
                        </label>
                      </div>
                    </div>
                    <div className="qs-hint">{t('settings.general.codexAutoRestoreTakeoverOnLaunchDesc')}</div>
                    <div className="qs-row">
                      <div className="qs-row-label"><span>{t('settings.general.codexPreserveExternalBridge')}</span></div>
                      <div className="qs-row-control">
                        <label className="qs-switch">
                          <input type="checkbox" checked={config.codex_preserve_verified_external_bridge}
                            onChange={(event) => saveConfig({ codex_preserve_verified_external_bridge: event.target.checked })} />
                          <span className="qs-switch-slider"></span>
                        </label>
                      </div>
                    </div>
                    <div className="qs-hint">{t('settings.general.codexPreserveExternalBridgeDesc')}</div>
                  </>
                )}
                {type === 'antigravity' && config && (
                  <>
                    <div className="qs-row">
                      <div className="qs-row-label">
                        <span>
                          {t(
                            'settings.general.antigravityLaunchOnSwitch',
                            "Khởi chạy Antigravity IDE khi chuyển",
                          )}
                        </span>
                      </div>
                      <div className="qs-row-control">
                        <label className="qs-switch">
                          <input
                            type="checkbox"
                            checked={antigravityLaunchOnSwitch}
                            onChange={(event) =>
                              saveConfig({
                                antigravity_launch_on_switch: event.target.checked,
                              })
                            }
                          />
                          <span className="qs-switch-slider"></span>
                        </label>
                      </div>
                    </div>
                    <div className="qs-hint">
                      {t(
                        'settings.general.antigravityLaunchOnSwitchDesc',
                        "Khi tắt, việc chuyển chỉ ghi dữ liệu tài khoản mặc định của Antigravity IDE và không đóng, khởi chạy hoặc khởi động lại ứng dụng.",
                      )}
                    </div>
                  </>
                )}
                {config && (type !== 'antigravity' || antigravityLaunchOnSwitch) && (
	                <div className="qs-path-control">
                  <input
                    type="text"
                    className="qs-path-input"
                    value={getAppPath()}
                    placeholder={
                      type === 'claude'
                        ? t(
                            'quickSettings.claude.appTargetPlaceholder',
                            "Đường dẫn Claude.exe hoặc shell:AppsFolder\\...",
                          )
                        : t('settings.general.codexAppPathPlaceholder', "Đường dẫn mặc định")
                    }
                    onChange={(e) => {
                      setAppLaunchCandidates([]);
                      saveConfig({ [getAppPathKeyForTarget(getAppTarget())]: e.target.value });
                    }}
                  />
                  <div className="qs-path-actions">
                    {type === 'zcode' && (
                      <button
                        className="qs-btn"
                        onClick={() => {
                          setAppLaunchCandidates([]);
                          saveConfig({ zcode_app_path: '' });
                        }}
                        disabled={pathDetecting || !getAppPath().trim()}
                        title={t('common.clear', "Xóa")}
                      >
                        {t('common.clear', "Xóa")}
                      </button>
                    )}
                    <button
                      className="qs-btn"
                      onClick={() => handlePickAppPath(getAppTarget())}
                      disabled={pathDetecting}
                      title={t('settings.general.codexPathSelect', "Chọn")}
                    >
                      {t('settings.general.codexPathSelect', "Chọn")}
                    </button>
                    <button
                      className="qs-btn"
                      onClick={() => handleResetAppPath(getAppTarget())}
                      disabled={pathDetecting}
                      title={
                        pathDetecting
                          ? t('common.loading', "Đang tải...")
                          : isWindows
                            ? t('appPath.missing.scanApps', "Quét ứng dụng")
                            : t('settings.general.codexPathReset', "Đặt lại mặc định")
                      }
                    >
                      {isWindows ? (
                        pathDetecting
                          ? t('common.loading', "Đang tải...")
                          : t('appPath.missing.scanApps', "Quét ứng dụng")
                      ) : (
                        <RefreshCw size={12} className={pathDetecting ? 'spin' : undefined} />
                      )}
                    </button>
	                  </div>
	                </div>
                )}

	                {isWindows && config && (
                  <>
                    {appLaunchCandidates.length > 0 && (
                      <div className="qs-claude-candidate-list">
                        {appLaunchCandidates.map((candidate) => (
                          <button
                            key={`${candidate.target_type}:${candidate.target}`}
                            type="button"
                            className={`qs-claude-candidate-item${
                              getAppPath().trim() === candidate.target ? ' selected' : ''
                            }`}
                            onClick={() => handleSelectAppLaunchCandidate(candidate)}
                          >
                            <div className="qs-claude-candidate-main">
                              <span>{candidate.label || getTitle()}</span>
                              <span className="qs-claude-candidate-badge">
                                {candidate.target_type === 'windows_app'
                                  ? t('appPath.missing.windowsApp', 'Microsoft Store')
                                  : 'EXE'}
                              </span>
                            </div>
                            <div className="qs-claude-candidate-target">{candidate.target}</div>
                            {!candidate.supports_multi_instance ? (
                              <div className="qs-claude-candidate-note">
                                {t(
                                  'appPath.missing.defaultOnly',
                                  "Chỉ dành cho desktop mặc định; hãy chọn Claude.exe thật cho hồ sơ đa phiên bản.",
                                )}
                              </div>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {type === 'codex' && (
                  <div className="qs-codex-quick-settings">
                    <div className="qs-row" style={{ marginTop: 8 }}>
                      <div className="qs-row-label">
                        <Zap size={15} />
                        <span>
                          {t(
                            'settings.general.codexRestartSpecifiedAppOnSwitch',
                            "Khởi động lại ứng dụng chỉ định khi chuyển Codex",
                          )}
                        </span>
                      </div>
                      <div className="qs-row-control">
                        <label className="qs-switch">
                          <input
                            type="checkbox"
                            checked={config.codex_restart_specified_app_on_switch}
                            onChange={(e) =>
                              saveConfig({ codex_restart_specified_app_on_switch: e.target.checked })
                            }
                          />
                          <span className="qs-switch-slider"></span>
                        </label>
                      </div>
                    </div>

                    {config.codex_restart_specified_app_on_switch && (
                      <div className="qs-path-control">
                        <input
                          type="text"
                          className="qs-path-input"
                          value={config.codex_specified_app_path}
                          placeholder={t(
                            'settings.general.codexSpecifiedAppPathPlaceholder',
                            "Ví dụ /Applications/Host.app",
                          )}
                          onChange={(e) =>
                            saveConfig({ codex_specified_app_path: e.target.value })
                          }
                        />
                        <div className="qs-path-actions">
                          <button
                            className="qs-btn"
                            onClick={() => void handlePickCodexSpecifiedAppPath()}
                            title={t('settings.general.codexPathSelect', "Chọn")}
                          >
                            {t('settings.general.codexPathSelect', "Chọn")}
                          </button>
                          <button
                            className="qs-btn"
                            onClick={() => saveConfig({ codex_specified_app_path: '' })}
                            title={t('settings.general.codexPathReset', "Đặt lại mặc định")}
                          >
                            <RefreshCw size={12} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {type === 'codebuddy' && (
              <div className="qs-section">
                <div className="qs-row qs-row--top">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>{t('settings.general.codebuddyShareSessionsOnSwitch')}</span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.codebuddy_share_sessions_on_switch ?? false}
                        onChange={(event) =>
                          saveConfig({
                            codebuddy_share_sessions_on_switch: event.target.checked,
                          })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div className="qs-hint">
                  {t('settings.general.codebuddyShareSessionsOnSwitchDesc')}
                </div>
              </div>
            )}

            {type === 'codebuddy_cn' && (
              <div className="qs-section">
                <div className="qs-row qs-row--top">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>
                      {t('common.sessionSharing.title', {
                        platform: getSessionSharingPlatformLabel(),
                      })}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={getSessionSharingEnabled()}
                        onChange={(event) => saveSessionSharingEnabled(event.target.checked)}
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div className="qs-hint">
                  {t('common.sessionSharing.fullDesc', {
                    platform: getSessionSharingPlatformLabel(),
                  })}
                </div>
              </div>
            )}

            {type === 'workbuddy' && (
              <div className="qs-section">
                <div className="qs-row qs-row--top">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>{t('settings.general.workbuddyShareSessionsOnSwitch')}</span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.workbuddy_share_sessions_on_switch ?? false}
                        onChange={(event) =>
                          saveConfig({
                            workbuddy_share_sessions_on_switch: event.target.checked,
                          })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div className="qs-hint">
                  {t('settings.general.workbuddyShareSessionsOnSwitchDesc')}
                </div>
              </div>
            )}

            {/* ─── Codex: opencode sync ─── */}
            {type === 'codex' && (
              <div className="qs-section">
                <div className="qs-row">
                  <div className="qs-row-label">
                    <FolderOpen size={15} />
                    <span>{t('quickSettings.codex.configToml', 'Codex config.toml')}</span>
                  </div>
                  <div className="qs-row-control">
                    <button
                      className="qs-btn"
                      onClick={() => void handleOpenCodexConfigToml()}
                      disabled={openingCodexConfig}
                    >
                      {openingCodexConfig
                        ? t('common.loading', "Đang tải...")
                        : t('quickSettings.codex.openConfigToml', "Mở tệp")}
                    </button>
                  </div>
                </div>
                <div className="qs-hint" style={{ marginTop: -2, marginBottom: 2 }}>
                  {t('quickSettings.codex.openConfigHint', "Mở nhanh tệp Codex config.toml đang hoạt động.")}
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>
                      {t(
                        'settings.general.openclawAuthOverwrite',
                        "Ghi đè đăng nhập OpenClaw khi chuyển đổi Codex"
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.openclaw_auth_overwrite_on_switch}
                        onChange={(e) =>
                          saveConfig({ openclaw_auth_overwrite_on_switch: e.target.checked })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>
                      {t(
                        'settings.general.hermesAuthOverwrite',
                        "Đồng bộ Hermes khi đổi Codex"
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(config.hermes_auth_overwrite_on_switch)}
                        onChange={(e) =>
                          saveConfig({ hermes_auth_overwrite_on_switch: e.target.checked })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>
                      {t(
                        'settings.general.opencodeAuthOverwrite',
                        "Ghi đè đăng nhập OpenCode khi chuyển đổi Codex"
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.opencode_auth_overwrite_on_switch}
                        onChange={(e) =>
                          saveConfig(
                            e.target.checked
                              ? { opencode_auth_overwrite_on_switch: true }
                              : {
                                  opencode_auth_overwrite_on_switch: false,
                                  opencode_sync_on_switch: false,
                                }
                          )
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>{t('settings.general.opencodeRestart', "Khởi động lại OpenCode khi chuyển Codex")}</span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.opencode_sync_on_switch}
                        disabled={!config.opencode_auth_overwrite_on_switch}
                        onChange={(e) => saveConfig({ opencode_sync_on_switch: e.target.checked })}
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>{t('codex.list.showCodeReviewQuota', "Hiển thị hạn mức Code Review")}</span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={codexShowCodeReviewQuota}
                        onChange={(e) => handleCodexCodeReviewQuotaToggle(e.target.checked)}
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>{t('codex.list.showAdditionalQuota', "Hạn mức theo model")}</span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={codexShowAdditionalQuota}
                        onChange={(e) => handleCodexAdditionalQuotaToggle(e.target.checked)}
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>{t('codex.list.planBadgeStyle', "Kiểu huy hiệu gói")}</span>
                  </div>
                  <div className="qs-row-control">
                    <select
                      className="qs-select"
                      value={codexPlanBadgeStyle}
                      onChange={(e) =>
                        handleCodexPlanBadgeStyleChange(e.target.value as CodexPlanBadgeStyle)
                      }
                    >
                      <option value="default">{t('codex.list.planBadgeStyleDefault', "Mặc định")}</option>
                      <option value="outline">{t('codex.list.planBadgeStyleOutline', "Viền")}</option>
                      <option value="soft">{t('codex.list.planBadgeStyleSoft', "Mềm")}</option>
                      <option value="mono">{t('codex.list.planBadgeStyleMono', "Đơn sắc")}</option>
                    </select>
                  </div>
                </div>

                <div
                  className="qs-field-group"
                  style={{ marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--border-light)' }}
                >
                  <div className="qs-row">
                    <div className="qs-row-label">
                      <Zap size={15} />
                      <span>{t('quickSettings.autoSwitch.enable', "Tự động chuyển đổi")}</span>
                    </div>
                    <div className="qs-row-control">
                      <label className="qs-switch">
                        <input
                          type="checkbox"
                          checked={config.codex_auto_switch_enabled}
                          onChange={(e) => saveConfig({ codex_auto_switch_enabled: e.target.checked })}
                        />
                        <span className="qs-switch-slider"></span>
                      </label>
                    </div>
                  </div>

                  {config.codex_auto_switch_enabled && (
                    <div className="qs-field-group" style={{ animation: 'qsFadeUp 0.2s ease both' }}>
                      <div className="qs-row">
                        <div className="qs-row-label">
                          <span>
                            {t('codex.thresholds.shortCycle')} {t('quickSettings.autoSwitch.threshold', "Ngưỡng chuyển đổi")}
                          </span>
                        </div>
                        <div className="qs-row-control">
                          <div className="qs-inline-input">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="qs-select qs-select--input-mode qs-select--with-unit"
                              value={codexAutoSwitchPrimaryCustomThreshold}
                              placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                              onChange={(e) =>
                                handleCodexWindowThresholdInputChange(
                                  e.target.value,
                                  setCodexAutoSwitchPrimaryCustomThreshold,
                                )
                              }
                              onBlur={() =>
                                handleCodexWindowCustomThresholdApply(
                                  codexAutoSwitchPrimaryCustomThreshold,
                                  setCodexAutoSwitchPrimaryCustomThreshold,
                                  'codex_auto_switch_primary_threshold',
                                  codexAutoSwitchPrimaryThresholdValue,
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleCodexWindowCustomThresholdApply(
                                    codexAutoSwitchPrimaryCustomThreshold,
                                    setCodexAutoSwitchPrimaryCustomThreshold,
                                    'codex_auto_switch_primary_threshold',
                                    codexAutoSwitchPrimaryThresholdValue,
                                  );
                                }
                              }}
                            />
                            <span className="qs-input-unit">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="qs-hint" style={{ marginTop: 0, marginBottom: 4 }}>
                        {t('quickSettings.codexWindow.orDivider', 'OR（命中任一即触发）')}
                      </div>

                      <div className="qs-row">
                        <div className="qs-row-label">
                          <span>
                            {t('codex.thresholds.weekly')} {t('quickSettings.autoSwitch.threshold', "Ngưỡng chuyển đổi")}
                          </span>
                        </div>
                        <div className="qs-row-control">
                          <div className="qs-inline-input">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="qs-select qs-select--input-mode qs-select--with-unit"
                              value={codexAutoSwitchSecondaryCustomThreshold}
                              placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                              onChange={(e) =>
                                handleCodexWindowThresholdInputChange(
                                  e.target.value,
                                  setCodexAutoSwitchSecondaryCustomThreshold,
                                )
                              }
                              onBlur={() =>
                                handleCodexWindowCustomThresholdApply(
                                  codexAutoSwitchSecondaryCustomThreshold,
                                  setCodexAutoSwitchSecondaryCustomThreshold,
                                  'codex_auto_switch_secondary_threshold',
                                  codexAutoSwitchSecondaryThresholdValue,
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleCodexWindowCustomThresholdApply(
                                    codexAutoSwitchSecondaryCustomThreshold,
                                    setCodexAutoSwitchSecondaryCustomThreshold,
                                    'codex_auto_switch_secondary_threshold',
                                    codexAutoSwitchSecondaryThresholdValue,
                                  );
                                }
                              }}
                            />
                            <span className="qs-input-unit">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="qs-row qs-row--top">
                        <div className="qs-row-label">
                          <span>{t('settings.general.codexAutoSwitchAccountScope', "Phạm vi chuyển tự động tài khoản Codex")}</span>
                        </div>
                        <div className="qs-row-control qs-row-control--fill">
                          <AutoSwitchAccountScopeSelector
                            mode={codexAutoSwitchAccountScopeMode}
                            onModeChange={(mode) => {
                              // all_accounts ignores selected IDs at runtime; clear
                              // the list so config does not keep a stale subset.
                              if (mode === AUTO_SWITCH_SCOPE_ALL_ACCOUNTS) {
                                saveConfig({
                                  codex_auto_switch_account_scope_mode: mode,
                                  codex_auto_switch_selected_account_ids: [],
                                });
                                return;
                              }
                              saveConfig({ codex_auto_switch_account_scope_mode: mode });
                            }}
                            selectedAccountIds={codexAutoSwitchSelectedAccountIds}
                            onSelectedAccountIdsChange={(ids) =>
                              saveConfig({ codex_auto_switch_selected_account_ids: ids })
                            }
                            accounts={codexScopeAccounts}
                            groups={codexScopeGroups}
                            useDialog
                          />
                        </div>
                      </div>

                      <div className="qs-hint">
                        {t(
                          'quickSettings.autoSwitch.hint',
                          "Tự động chuyển khi các nhóm mô hình đang theo dõi chạm ngưỡng; nếu bật theo dõi credits, nó cũng sẽ kích hoạt khi credits còn lại thấp hơn ngưỡng."
                        )}
                        <div>
                          {t('codex.thresholds.windowHint')}
                        </div>
	                        <div>
                          {t('codex.thresholds.rule', {
                            shortCycle: codexAutoSwitchPrimaryThresholdValue,
                            weekly: codexAutoSwitchSecondaryThresholdValue,
                          })}
	                        </div>
		                </div>
	                    </div>
		                )}
	              </div>
	            </div>
	          )}

            {/* ─── GitHub Copilot: opencode sync ─── */}
            {type === 'github_copilot' && (
              <div className="qs-section">
                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>
                      {t(
                        'settings.general.ghcpLaunchOnSwitch',
                        "Tự động khởi chạy GitHub Copilot App khi chuyển GitHub Copilot"
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.ghcp_launch_on_switch}
                        onChange={(e) => saveConfig({ ghcp_launch_on_switch: e.target.checked })}
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>
                      {t(
                        'settings.general.ghcpOpencodeAuthOverwrite',
                        "Ghi đè đăng nhập OpenCode khi chuyển đổi GitHub Copilot"
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.ghcp_opencode_auth_overwrite_on_switch}
                        onChange={(e) =>
                          saveConfig(
                            e.target.checked
                              ? { ghcp_opencode_auth_overwrite_on_switch: true }
                              : {
                                  ghcp_opencode_auth_overwrite_on_switch: false,
                                  ghcp_opencode_sync_on_switch: false,
                                }
                          )
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="qs-row">
                  <div className="qs-row-label">
                    <Zap size={15} />
                    <span>
                      {t(
                        'settings.general.ghcpOpencodeRestart',
                        "Khởi động lại OpenCode khi chuyển GitHub Copilot"
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.ghcp_opencode_sync_on_switch}
                        disabled={!config.ghcp_opencode_auth_overwrite_on_switch}
                        onChange={(e) =>
                          saveConfig({ ghcp_opencode_sync_on_switch: e.target.checked })
                        }
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Antigravity: Auto-switch ─── */}
            {type === 'antigravity' && (
              <div className="qs-section qs-section--highlight">
                <div className="qs-section-header">
                  <Zap size={15} />
                  <span>{t('quickSettings.autoSwitch.title', "Tự động chuyển đổi")}</span>
                </div>

                {antigravitySeamlessSwitchUnlocked && (
                  <>
                    <div className="qs-row">
                      <div className="qs-row-label">
                        <span>
                          {t(
                            'settings.general.antigravityDualSwitchNoRestart',
                            "Chuyển đôi không cần khởi động lại"
                          )}
                        </span>
                      </div>
                      <div className="qs-row-control">
                        <label className="qs-switch">
                          <input
                            type="checkbox"
                            checked={config.antigravity_dual_switch_no_restart_enabled}
                            onChange={(e) =>
                              saveConfig({
                                antigravity_dual_switch_no_restart_enabled: e.target.checked,
                              })
                            }
                          />
                          <span className="qs-switch-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div className="qs-hint">
                      {t(
                        'settings.general.antigravityDualSwitchNoRestartDesc',
                        "Khi chuyển tài khoản, việc ghi dữ liệu cục bộ và chuyển đổi liền mạch qua tiện ích mở rộng được thực hiện trong một luồng, không cần khởi động lại Antigravity IDE."
                      )}
                    </div>
                  </>
                )}

                <div className="qs-row">
                  <div className="qs-row-label">
                    <span>{t('quickSettings.autoSwitch.enable', "Tự động chuyển đổi")}</span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={config.auto_switch_enabled}
                        onChange={(e) => saveConfig({ auto_switch_enabled: e.target.checked })}
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>

                {config.auto_switch_enabled && (
                  <div className="qs-field-group" style={{ animation: 'qsFadeUp 0.2s ease both' }}>
                    <div className="qs-row">
                      <div className="qs-row-label">
                        <span>{t('quickSettings.autoSwitch.threshold', "Ngưỡng chuyển đổi")}</span>
                      </div>
                      <div className="qs-row-control">
                        {showThresholdInput ? (
                          <div className="qs-inline-input">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="qs-select qs-select--input-mode qs-select--with-unit"
                              value={customThreshold}
                              placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                              onChange={(e) => setCustomThreshold(e.target.value.replace(/[^\d]/g, ''))}
                              onBlur={handleCustomThresholdApply}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleCustomThresholdApply();
                                }
                              }}
                            />
                            <span className="qs-input-unit">%</span>
                          </div>
                        ) : (
                          <select
                            className="qs-select"
                            value={String(config.auto_switch_threshold)}
                            onChange={(e) => handleThresholdSelectChange(e.target.value)}
                          >
                            {!isThresholdPreset && (
                              <option value={String(config.auto_switch_threshold)}>
                                {config.auto_switch_threshold}%
                              </option>
                            )}
                            <option value="0">0%</option>
                            <option value="20">20%</option>
                            <option value="40">40%</option>
                            <option value="60">60%</option>
                            <option value="custom">{t('quickSettings.customInput', "Tùy chỉnh")}</option>
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="qs-row">
                      <div className="qs-row-label">
                        <span>{t('quickSettings.autoSwitch.creditsEnable', "Theo dõi credits")}</span>
                      </div>
                      <div className="qs-row-control">
                        <label className="qs-switch">
                          <input
                            type="checkbox"
                            checked={creditsAutoSwitchEnabled}
                            onChange={(e) =>
                              saveConfig({ auto_switch_credits_enabled: e.target.checked })
                            }
                          />
                          <span className="qs-switch-slider"></span>
                        </label>
                      </div>
                    </div>

                    {creditsAutoSwitchEnabled && (
                      <div className="qs-row">
                        <div className="qs-row-label">
                          <span>{t('quickSettings.autoSwitch.creditsThreshold', "Ngưỡng credits")}</span>
                        </div>
                        <div className="qs-row-control">
                          {showCreditsThresholdInput ? (
                            <div className="qs-inline-input">
                              <input
                                type="number"
                                min={0}
                                className="qs-select qs-select--input-mode"
                                value={customCreditsThreshold}
                                placeholder={t('quickSettings.inputCredits', "Nhập credits")}
                                onChange={(e) =>
                                  setCustomCreditsThreshold(e.target.value.replace(/[^\d]/g, ''))
                                }
                                onBlur={handleCustomCreditsThresholdApply}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCustomCreditsThresholdApply();
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <select
                              className="qs-select"
                              value={String(creditsAutoSwitchThresholdValue)}
                              onChange={(e) => handleCreditsThresholdSelectChange(e.target.value)}
                            >
                              {!isCreditsThresholdPreset && (
                                <option value={String(creditsAutoSwitchThresholdValue)}>
                                  {creditsAutoSwitchThresholdValue}
                                </option>
                              )}
                              <option value="0">0</option>
                              <option value="5">5</option>
                              <option value="10">10</option>
                              <option value="20">20</option>
                              <option value="custom">{t('quickSettings.customInput', "Tùy chỉnh")}</option>
                            </select>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="qs-row">
                      <div className="qs-row-label">
                        <span>{t('quickSettings.autoSwitch.triggerModel', "Mô hình kích hoạt")}</span>
                      </div>
                      <div className="qs-row-control">
                        <select
                          className="qs-select"
                          value={autoSwitchScopeMode}
                          onChange={(e) => handleAutoSwitchScopeModeChange(e.target.value)}
                        >
                          <option value="any_group">
                            {t('quickSettings.autoSwitch.scopeAnyGroup', "Bất kỳ nhóm mô hình nào")}
                          </option>
                          <option value="selected_groups">
                            {t('quickSettings.autoSwitch.scopeSelectedGroups', "Nhóm mô hình đã chọn")}
                          </option>
                        </select>
                      </div>
                    </div>

                    {autoSwitchScopeMode === 'selected_groups' && (
                      <div className="qs-row qs-row--top">
                        <div className="qs-row-label">
                          <span>{t('quickSettings.autoSwitch.selectedGroups', "Nhóm đã chọn")}</span>
                        </div>
                        <div className="qs-row-control qs-row-control--fill">
                          {autoSwitchDisplayGroups.length === 0 ? (
                            <div className="qs-hint qs-hint--compact">
                              {t('quickSettings.autoSwitch.selectedGroupsEmpty', "Không có nhóm mô hình nào khả dụng")}
                            </div>
                          ) : (
                            <div className="qs-check-group-inline">
                              {autoSwitchDisplayGroups.map((group) => {
                                const checked = normalizedAutoSwitchSelectedGroupIds.includes(group.id);
                                return (
                                  <label
                                    key={group.id}
                                    className="qs-check-item"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => handleAutoSwitchGroupToggle(group.id)}
                                    />
                                    <span>{group.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="qs-row qs-row--top">
                      <div className="qs-row-label">
                        <span>{t('settings.general.autoSwitchAccountScope', "Phạm vi chuyển tài khoản tự động")}</span>
                      </div>
                      <div className="qs-row-control qs-row-control--fill">
                        <AutoSwitchAccountScopeSelector
                          mode={autoSwitchAccountScopeMode}
                          onModeChange={(mode) => {
                            if (mode === AUTO_SWITCH_SCOPE_ALL_ACCOUNTS) {
                              saveConfig({
                                auto_switch_account_scope_mode: mode,
                                auto_switch_selected_account_ids: [],
                              });
                              return;
                            }
                            saveConfig({ auto_switch_account_scope_mode: mode });
                          }}
                          selectedAccountIds={autoSwitchSelectedAccountIds}
                          onSelectedAccountIdsChange={(ids) =>
                            saveConfig({ auto_switch_selected_account_ids: ids })
                          }
                          accounts={antigravityScopeAccounts}
                          groups={antigravityScopeGroups}
                          typeOptions={antigravityScopeTypeOptions}
                          useDialog
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="qs-hint">
                  {t(
                    'quickSettings.autoSwitch.hint',
                    "Tự động chuyển khi các nhóm mô hình đang theo dõi chạm ngưỡng; nếu bật theo dõi credits, nó cũng sẽ kích hoạt khi credits còn lại thấp hơn ngưỡng."
                  )}
                </div>

                {renderQuotaAlertControls()}
              </div>
            )}

            {type !== 'antigravity' && type !== 'zcode' && (
              <div className="qs-section qs-section--highlight">
                <div className="qs-section-header">
                  <Zap size={15} />
                  <span>{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</span>
                </div>
                {renderQuotaAlertControls()}
              </div>
            )}

            {type === 'claude' && config && (
              <div className="qs-section">
                <div className="qs-section-header">
                  <Zap size={15} />
                  <span>
                    {t(
                      'settings.general.claudeQuotaDisplayRemaining',
                      "Claude hiển thị % còn lại",
                    )}
                  </span>
                </div>
                <div className="qs-row">
                  <div className="qs-row-label">
                    <span>
                      {t(
                        'settings.general.claudeQuotaDisplayRemaining',
                        "Claude hiển thị % còn lại",
                      )}
                    </span>
                  </div>
                  <div className="qs-row-control">
                    <label className="qs-switch">
                      <input
                        type="checkbox"
                        checked={Boolean(config.claude_quota_display_remaining)}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setClaudeQuotaDisplayRemainingEnabled(enabled);
                          void saveConfig({
                            claude_quota_display_remaining: enabled,
                          });
                        }}
                      />
                      <span className="qs-switch-slider"></span>
                    </label>
                  </div>
                </div>
                <div className="qs-hint">
                  {t(
                    'settings.general.claudeQuotaDisplayRemainingDesc',
                    "Mặc định % đã dùng. Bật = % còn lại. Tự chuyển và cảnh báo vẫn theo đã dùng.",
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="quick-settings-wrapper">
      <button
        className={`btn btn-secondary icon-only ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={getTitle()}
        aria-label={getTitle()}
      >
        <Settings size={14} />
      </button>
      {overlayContent && createPortal(overlayContent, document.body)}
    </div>
  );
}
