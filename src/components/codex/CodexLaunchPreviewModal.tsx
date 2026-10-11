import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleAlert,
  ImagePlus,
  KeyRound,
  Link2,
  Play,
  RefreshCw,
  Route,
  Save,
  Server,
  SlidersHorizontal,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { confirm as confirmDialog } from "@tauri-apps/plugin-dialog";
import { useEscCloseTopmost } from "../../hooks/useEscClose";
import { useModalFocusTrap } from "../../hooks/useModalFocusTrap";
import { resolveStoredCompactLimitInput } from "../../utils/codexModelContext";
import {
  saveCodexInstanceQuickConfig,
  saveCodexInstanceConfiguration,
} from "../../services/codexInstanceService";
import {
  CODEX_LAUNCH_PREVIEW_CONFIG_TIMEOUT,
  getCachedCodexLaunchPreviewConfig,
  loadCodexLaunchPreviewConfig,
  rememberCodexLaunchPreviewConfig,
} from "../../services/codexLaunchPreviewConfigService";
import {
  codexLaunchPreviewInstanceConfigKey,
  codexLaunchPreviewQuickConfigKey,
} from "../../utils/codexLaunchPreviewConfig";
import { useCodexAccountStore } from "../../stores/useCodexAccountStore";
import { useCodexInstanceStore } from "../../stores/useCodexInstanceStore";
import type { CodexInstanceApiRoute } from "../../types/instance";
import {
  CodexModelRoutingFields,
  buildCodexModelRoutingValue,
  createCodexModelSourceResolver,
  collectRouteUpstreamModels,
  eligibleCodexModelRoutingAccounts,
  normalizeCodexModelRoutingRoutes,
  shortCodexRouteAccountLabel,
  syncExperimentalModelsWithRouting,
  toggleRouteModelInRoutes,
} from "./CodexModelRoutingFields";
import { forceRefreshCodexTokens } from "../../services/codexService";
import { requestCodexOpenAddAccount } from "../../utils/codexAddAccountRequest";
import { areCodexModelRoutingsEqual, resolveRoutingCatalog } from "../../utils/codexModelRoutingValue";
import {
  resolveInstanceEffectiveBindAccountId,
  resolveLaunchPreviewRoutingBaseAccount,
  resolveLaunchPreviewRoutingBindAccountId,
} from "../../utils/codexLaunchPreviewRoutingBinding";
import type {
  CodexAccount,
  CodexExperimentalModelDefinition,
  CodexQuickConfig,
} from "../../types/codex";
import {
  formatCodexLoginProvider,
  getCodexAuthMetadata,
  getCodexSubscriptionPresentationForAccount,
  isCodexApiKeyAccount,
  isStandardCodexOAuthAccount,
} from "../../types/codex";
import {
  DEEPSEEK_ACCESS_MODE_CDP,
  DEEPSEEK_ACCESS_MODE_DIRECT,
  DEEPSEEK_ACCESS_MODE_GATEWAY,
  isDeepSeekAccount,
  isDeepSeekResponsesAccount,
  resolveDeepSeekAccessMode,
  type DeepSeekAccessMode,
} from "../../utils/codexDeepSeekAccess";
import { CodexImageAccountPickerModal } from "./CodexImageAccountPickerModal";
import { getCodexJwtExpiration, isCodexAccountReauthRequired, isCodexRefreshTokenReauthReason } from "../../utils/codexSwitchAuthFailure";
import type { UnifiedQuotaMetric } from "../../presentation/platformAccountPresentation";
import { buildCodexAccountPresentation } from "../../presentation/platformAccountPresentation";
import { ModalErrorMessage, useModalErrorState } from "../ModalErrorMessage";
import {
  SingleSelectDropdown,
  type SingleSelectOption,
} from "../SingleSelectDropdown";
import { CodexQuotaMiniRows } from "./CodexQuotaMiniRows";
import {
  CodexContextOverrideEditor,
  resolveCodexContextOverridePreset,
} from "./CodexContextOverrideEditor";
import { CodexExperimentalModelEditor } from "./CodexExperimentalModelEditor";
import { getCodexExperimentalModelErrorMessage } from "../../utils/codexExperimentalModel";
import { CodexSessionVisibilityRepairModal } from "./CodexSessionVisibilityRepairModal";
import { CodexSpeedControl } from "./CodexSpeedControl";
import { useLaunchPreviewChildReturnFocus } from "./useLaunchPreviewChildReturnFocus";
import "./CodexLaunchPreviewModal.css";

export const DEFAULT_CODEX_INSTANCE_ID = "__default__";

export interface CodexLaunchPreviewFact {
  label: string;
  value: string;
  monospace?: boolean;
  wide?: boolean;
  tone?: "warning" | "danger";
}

export interface CodexLaunchPreviewUsage {
  label: string;
  requests?: string | null;
  tokens?: string | null;
  cost?: string | null;
  extraLabel?: string | null;
  extraValue?: string | null;
}

export interface CodexLaunchPreviewSummary {
  badgeLabel?: string;
  contextText?: string;
  statusLabel?: string;
  statusTone?: "success" | "warning" | "neutral";
  facts?: CodexLaunchPreviewFact[];
  quotaItems?: UnifiedQuotaMetric[];
  usage?: CodexLaunchPreviewUsage | null;
  tags?: string[];
  footerText?: string;
}

export interface CodexLaunchPreviewAction {
  id: string;
  label: string;
  description: string;
  actionLabel?: string;
  control?: ReactNode;
  /** 行内左侧补充信息（如已选账号标签），与 DeepSeek 工具行保持同一布局。 */
  meta?: ReactNode;
  disabled?: boolean;
  tone?: "default" | "danger";
  onAction?: () => void | Promise<void>;
}

/** 启动预览里选好的启动配置，确认时交给调用方落盘。 */
export interface CodexLaunchPreviewLaunchOptions {
  deepSeekAccessMode?: DeepSeekAccessMode;
  imageGenerationAccountIds?: string[];
}

/** 启动预览里的 OAuth 绑定状态（仅 API Key 账号展示）。 */
export interface CodexLaunchPreviewOAuthBinding {
  /** 已绑定的 OAuth 账号展示名；未绑定时为 null。 */
  boundAccountLabel?: string | null;
  /** 绑定的 OAuth 账号需要重新授权。 */
  needsReauth?: boolean;
  reauthDescription?: string | null;
}

interface CodexLaunchPreviewModalProps {
  account?: CodexAccount | null;
  accountLabel: string;
  accountMetaLabel?: string;
  oauthBinding?: CodexLaunchPreviewOAuthBinding | null;
  onBindOAuth?: () => void;
  onReauthorizeOAuth?: () => void;
  summary?: CodexLaunchPreviewSummary;
  actions?: CodexLaunchPreviewAction[];
  instanceId?: string;
  instanceLabel?: string;
  instanceOptions?: SingleSelectOption[];
  onInstanceChange?: (instanceId: string) => void | Promise<void>;
  mode?: "account" | "instance" | "apiService";
  onClose: () => void;
  onExecute: (
    launchAfterSwitch: boolean,
    launchOptions?: CodexLaunchPreviewLaunchOptions,
  ) => Promise<boolean>;
}

interface ModelConfigSnapshot {
  enabled: boolean;
  models: CodexExperimentalModelDefinition[];
  defaultModelId: string | null;
  routingRoutes: CodexInstanceApiRoute[];
}

interface ContextConfigSnapshot {
  enabled: boolean;
  contextWindowInput: string;
  compactLimitInput: string;
}

export function CodexLaunchPreviewModal({
  account,
  accountLabel,
  accountMetaLabel,
  oauthBinding,
  onBindOAuth,
  onReauthorizeOAuth,
  summary,
  actions,
  instanceId = DEFAULT_CODEX_INSTANCE_ID,
  instanceLabel,
  instanceOptions,
  onInstanceChange,
  mode = "account",
  onClose,
  onExecute,
}: CodexLaunchPreviewModalProps) {
  const { t, i18n } = useTranslation();
  const dialog = useRef<HTMLDivElement>(null);
  const accessModeDialog = useRef<HTMLDivElement>(null);
  const imageModeDialog = useRef<HTMLDivElement>(null);
  const refreshDialog = useRef<HTMLDivElement>(null);
  const modelDialog = useRef<HTMLDivElement>(null);
  const contextDialog = useRef<HTMLDivElement>(null);
  const [loadedConfig, setLoadedConfig] = useState<CodexQuickConfig | null>(
    null,
  );
  const [catalogEnabled, setCatalogEnabled] = useState(false);
  const [models, setModels] = useState<CodexExperimentalModelDefinition[]>([]);
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null);
  const [contextOverrideEnabled, setContextOverrideEnabled] = useState(false);
  const [contextWindowInput, setContextWindowInput] = useState("");
  const [compactLimitInput, setCompactLimitInput] = useState("");
  const [contextConfigError, setContextConfigError] = useState<string | null>(null);
  const [contextConfigSaving, setContextConfigSaving] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoadError, setConfigLoadError] = useState<string | null>(null);
  const [configReload, setConfigReload] = useState(0);
  const [loadedTarget, setLoadedTarget] = useState<string | null>(null);
  const [loadedInstanceKey, setLoadedInstanceKey] = useState<string | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(false);
  const configSession = useRef(0);
  const configWritePending = useRef(false);
  const retainDraftOnReload = useRef(false);
  const [saving, setSaving] = useState(false);
  const [speedSaving, setSpeedSaving] = useState(false);
  const [changingInstance, setChangingInstance] = useState(false);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [executing, setExecuting] = useState<"switch" | "launch" | null>(null);
  const [repairOpen, setRepairOpen] = useState(false);
  const [modelConfigOpen, setModelConfigOpen] = useState(false);
  const [contextConfigOpen, setContextConfigOpen] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);
  const [manualRefreshResult, setManualRefreshResult] = useState<{
    status: "running" | "success" | "error";
    error?: string;
    requiresReauth?: boolean;
  } | null>(null);
  const [manualRefreshedAccount, setManualRefreshedAccount] =
    useState<CodexAccount | null>(null);
  const [modelConfigSnapshot, setModelConfigSnapshot] =
    useState<ModelConfigSnapshot | null>(null);
  const [contextConfigSnapshot, setContextConfigSnapshot] =
    useState<ContextConfigSnapshot | null>(null);
  const [routingEnabled, setRoutingEnabled] = useState(false);
  const persistRoutingDisableRef = useRef(false);
  const [routingRoutes, setRoutingRoutes] = useState<CodexInstanceApiRoute[]>(
    [],
  );
  const [notice, setNotice] = useState<string | null>(null);
  const initialImageGenerationAccountIds = useMemo(
    () =>
      (account?.api_image_generation_account_ids ?? []).filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      ),
    [account?.api_image_generation_account_ids],
  );
  const [deepSeekAccessMode, setDeepSeekAccessMode] =
    useState<DeepSeekAccessMode>(() =>
      resolveDeepSeekAccessMode(account ?? undefined),
    );
  const [deepSeekAccessModeDialogOpen, setDeepSeekAccessModeDialogOpen] =
    useState(false);
  const [imageGenEnabled, setImageGenEnabled] = useState(
    () => initialImageGenerationAccountIds.length > 0,
  );
  const [imageGenAccountIds, setImageGenAccountIds] = useState<string[]>(
    () => initialImageGenerationAccountIds,
  );
  const [imageGenPickerOpen, setImageGenPickerOpen] = useState(false);
  const [imageGenModeSwitchOpen, setImageGenModeSwitchOpen] = useState(false);
  const childDialogOpen = repairOpen || modelConfigOpen || contextConfigOpen ||
    deepSeekAccessModeDialogOpen || imageGenPickerOpen || imageGenModeSwitchOpen || Boolean(manualRefreshResult);
  useModalFocusTrap(dialog, true, true, !childDialogOpen);
  useModalFocusTrap(accessModeDialog, deepSeekAccessModeDialogOpen);
  useModalFocusTrap(imageModeDialog, imageGenModeSwitchOpen);
  useModalFocusTrap(refreshDialog, Boolean(manualRefreshResult));
  useModalFocusTrap(modelDialog, modelConfigOpen);
  useModalFocusTrap(contextDialog, contextConfigOpen);
  const rememberChildTrigger = useLaunchPreviewChildReturnFocus(dialog, childDialogOpen);
  const accountId = account?.id ?? null;

  useEffect(() => {
    setDeepSeekAccessMode(resolveDeepSeekAccessMode(account ?? undefined));
    setImageGenEnabled(initialImageGenerationAccountIds.length > 0);
    setImageGenAccountIds(initialImageGenerationAccountIds);
    // 只在切换账号时重置草稿，避免账号列表刷新覆盖用户正在编辑的内容。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // 只有网关模式支持 GPT 生图；切到直连 / CDP 时自动取消勾选并清空账号。
  const deepSeekImageGenAvailable =
    deepSeekAccessMode === DEEPSEEK_ACCESS_MODE_GATEWAY;
  useEffect(() => {
    if (
      !(account && isDeepSeekAccount(account)) ||
      deepSeekImageGenAvailable ||
      !imageGenEnabled
    ) {
      return;
    }
    setImageGenEnabled(false);
    setImageGenAccountIds([]);
  }, [account, deepSeekImageGenAvailable, imageGenEnabled]);

  const accounts = useCodexAccountStore((state) => state.accounts);
  const currentAccount = useCodexAccountStore((state) => state.currentAccount);
  const fetchAccounts = useCodexAccountStore((state) => state.fetchAccounts);
  const instances = useCodexInstanceStore((state) => state.instances);
  const selectedInstance = useMemo(
    () =>
      instances.find((item) => item.id === instanceId) ??
      (instanceId === DEFAULT_CODEX_INSTANCE_ID
        ? instances.find((item) => item.isDefault)
        : undefined),
    [instanceId, instances],
  );
  const previewTargetKey = JSON.stringify([instanceId, accountId]);
  const instanceConfigKey = codexLaunchPreviewInstanceConfigKey(selectedInstance);
  const instanceConfigChanged = loadedInstanceKey !== null && loadedInstanceKey !== instanceConfigKey;
  const configReady = loadedTarget === previewTargetKey && !loading &&
    !configLoadError && !instanceConfigChanged && loadedConfig !== null;
  const resolveModelSource = useMemo(
    () =>
      createCodexModelSourceResolver(
        normalizeCodexModelRoutingRoutes(routingRoutes, accounts),
        accounts,
        t,
      ),
    [accounts, routingRoutes, t],
  );
  const availableChannels = useMemo(() => {
    if (!routingEnabled) return [];
    const providerAccounts = eligibleCodexModelRoutingAccounts(accounts);
    return normalizeCodexModelRoutingRoutes(routingRoutes, accounts)
      .filter((route) => route.enabled)
      .map((route) => {
        const provider = providerAccounts.find(
          (acc) => acc.id === route.providerAccountId,
        );
        const upstreamModels = collectRouteUpstreamModels(route, provider);
        const name = shortCodexRouteAccountLabel(
          provider,
          provider?.email,
        );
        return {
          id: route.id,
          namespace: route.namespace,
          providerName: name,
          models: route.selectedModels ?? upstreamModels,
        };
      })
      .filter((group) => group.models.length > 0);
  }, [accounts, routingRoutes, routingEnabled]);
  const {
    message: error,
    scrollKey: errorScrollKey,
    set: setError,
  } = useModalErrorState();

  const busy =
    speedSaving ||
    saving ||
    changingInstance ||
    runningActionId !== null ||
    forceRefreshing ||
    executing !== null;
  const configBusy = busy || checkingConfig || !configReady;
  const requestClose = useCallback(() => {
    // 只把本弹框自己的子弹框（codex-launch-preview-* 系列）视为“还叠着一层”：
    // 启动进度弹框、Windows 操作提示等全局弹框不是它的子级，不应该让「关闭」失效。
    const hasStackedModal = Array.from(
      document.querySelectorAll<HTMLElement>(".modal-overlay"),
    ).some((element) =>
      Array.from(element.classList).some(
        (className) =>
          className.startsWith("codex-launch-preview-") &&
          className !== "codex-launch-preview-overlay",
      ),
    );
    if (!hasStackedModal) {
      // Invalidate pending read-before-write work synchronously, before React
      // commits the unmount and runs passive-effect cleanup.
      configSession.current += 1;
      onClose();
    }
  }, [onClose]);
  useEscCloseTopmost(
    !busy &&
      !repairOpen &&
      !modelConfigOpen &&
      !contextConfigOpen &&
      !deepSeekAccessModeDialogOpen &&
      !imageGenPickerOpen &&
      !imageGenModeSwitchOpen &&
      !manualRefreshResult,
    requestClose, dialog,
  );
  useEscCloseTopmost(deepSeekAccessModeDialogOpen, () =>
    setDeepSeekAccessModeDialogOpen(false), accessModeDialog,
  );
  useEscCloseTopmost(imageGenModeSwitchOpen, () => setImageGenModeSwitchOpen(false), imageModeDialog);

  const applyLoadedConfig = useCallback((config: CodexQuickConfig) => {
    setLoadedConfig(config);
    setCatalogEnabled(config.experimental_model_catalog_enabled);
    setModels(config.experimental_model_catalog_models);
    setDefaultModelId(
      config.experimental_model_catalog_default_model_id ?? null,
    );
    const contextWindow = config.detected_model_context_window;
    const compactLimit = config.detected_auto_compact_token_limit;
    setContextOverrideEnabled(
      contextWindow !== undefined || compactLimit !== undefined,
    );
    setContextWindowInput(contextWindow?.toString() ?? "");
    // 存量配置里压缩阈值缺失、等于或超过上下文时按 90% 归一，避免带出非法配对。
    setCompactLimitInput(resolveStoredCompactLimitInput(contextWindow, compactLimit));
    setModelsError(null);
  }, []);

  // Read the latest store values when a request completes, without subscribing
  // the read effect to every new instance object returned by status polling.
  const configLoadInputs = useRef({ selectedInstance, accounts, loadedConfig, loadedInstanceKey });
  configLoadInputs.current = { selectedInstance, accounts, loadedConfig, loadedInstanceKey };

  useEffect(() => {
    let active = true;
    const session = ++configSession.current;
    configWritePending.current = false;
    setCheckingConfig(false);
    setLoading(true);
    setConfigLoadError(null);
    const previous = configLoadInputs.current;
    const retained = retainDraftOnReload.current && previous.loadedConfig
      ? { config: previous.loadedConfig, instanceKey: previous.loadedInstanceKey }
      : null;
    retainDraftOnReload.current = false;
    if (!retained) {
      setLoadedTarget(null);
      setLoadedInstanceKey(null);
    }
    setError(null);
    const cached = getCachedCodexLaunchPreviewConfig(instanceId);
    // A retry after a slow pre-save read keeps the user's draft. Only an
    // explicit reload after a conflict replaces it with the latest snapshot.
    if (!retained) {
      if (cached) {
        applyLoadedConfig(cached);
      } else {
        setLoadedConfig(null);
        setCatalogEnabled(false);
        setModels([]);
        setDefaultModelId(null);
        setContextOverrideEnabled(false);
        setContextWindowInput("");
        setCompactLimitInput("");
      }
      setModelsError(null);
    }
    setNotice(null);
    setManualRefreshResult(null);
    setManualRefreshedAccount(null);
    persistRoutingDisableRef.current = false;
    const { selectedInstance: initialInstance, accounts: initialAccounts } = configLoadInputs.current;
    const routing = initialInstance?.modelRouting;
    const loadedRoutes = normalizeCodexModelRoutingRoutes(
      routing?.routes ?? [],
      initialAccounts,
    );
    if (!retained) {
      setRoutingEnabled(Boolean(routing?.enabled));
      setRoutingRoutes(loadedRoutes);
    }
    const startedAt = performance.now();
    void loadCodexLaunchPreviewConfig(instanceId, mode === "apiService")
      .then((config) => {
        if (active && session === configSession.current) {
          const latest = configLoadInputs.current;
          const latestRouting = latest.selectedInstance?.modelRouting;
          const latestRoutes = normalizeCodexModelRoutingRoutes(latestRouting?.routes ?? [], latest.accounts);
          if (retained) {
            if (codexLaunchPreviewQuickConfigKey(config) !== codexLaunchPreviewQuickConfigKey(retained.config) ||
                (retained.instanceKey !== null && retained.instanceKey !== codexLaunchPreviewInstanceConfigKey(latest.selectedInstance))) {
              setConfigLoadError("CODEX_LAUNCH_PREVIEW_CONFIG_CHANGED");
            }
            return;
          }
          applyLoadedConfig(config);
          setLoadedTarget(previewTargetKey);
          setLoadedInstanceKey(latest.selectedInstance ? codexLaunchPreviewInstanceConfigKey(latest.selectedInstance) : null);
          setRoutingEnabled(Boolean(latestRouting?.enabled));
          setRoutingRoutes(latestRoutes);
          if (latestRouting?.enabled && latestRoutes.length) {
            setModels(
              syncExperimentalModelsWithRouting(
                config.experimental_model_catalog_models,
                latestRoutes,
                latest.accounts,
                true,
              ),
            );
          }
        }
      })
      .catch((loadError) => {
        if (!active || session !== configSession.current) return;
        setConfigLoadError(String(loadError).replace(/^Error:\s*/, ""));
      })
      .finally(() => {
        console.info("[Codex Launch Preview] config read finished", {
          instanceId, elapsedMs: Math.round(performance.now() - startedAt), active,
        });
        if (active && session === configSession.current) setLoading(false);
      });
    return () => {
      active = false;
      configSession.current += 1;
    };
  }, [previewTargetKey, configReload, applyLoadedConfig, instanceId, setError]);

  // An initially empty instance cache can arrive after the configuration read.
  // Initialize routing once; later runtime-only refreshes never replace drafts.
  useEffect(() => {
    if (loading || loadedTarget !== previewTargetKey || loadedInstanceKey !== null || !selectedInstance) return;
    const routing = selectedInstance.modelRouting;
    const routes = normalizeCodexModelRoutingRoutes(routing?.routes ?? [], accounts);
    setRoutingEnabled(Boolean(routing?.enabled));
    setRoutingRoutes(routes);
    setLoadedInstanceKey(instanceConfigKey);
  }, [accounts, instanceConfigKey, loadedInstanceKey, loadedTarget, loading, previewTargetKey, selectedInstance]);

  const configErrorMessage = instanceConfigChanged || configLoadError === "CODEX_LAUNCH_PREVIEW_CONFIG_CHANGED"
    ? t("codex.launchPreview.configChanged")
    : configLoadError === CODEX_LAUNCH_PREVIEW_CONFIG_TIMEOUT
      ? t("codex.launchPreview.configLoadTimeout")
      : configLoadError
        ? t("instances.form.codexQuickConfig.loadFailed", { error: configLoadError })
        : null;

  const normalizedRoutingRoutes = useMemo(
    () => normalizeCodexModelRoutingRoutes(routingRoutes, accounts),
    [accounts, routingRoutes],
  );
  const effectiveLaunchAccount = account ?? currentAccount;
  // 混合模型路由只在实例绑定「可直接登录的 OAuth 订阅账号」时生效。
  // 预览/切换到一个普通账号（API Key、API 服务等）时，路由必须自动让位：
  // 不再把实例绑定改回 OAuth 底座账号，也不能用路由校验拦住这次切换。
  const launchSubjectIsOAuthAccount = Boolean(
    account
      ? isStandardCodexOAuthAccount(account)
      : mode === "apiService"
        ? false
        : currentAccount && isStandardCodexOAuthAccount(currentAccount),
  );
  const routingEnabledForSave = routingEnabled && launchSubjectIsOAuthAccount;
  // 后端保存路由配置时校验的是「目标实例当前生效的绑定账号」，不是正在预览的账号，
  // 所以必须按实例当前绑定判断是否需要一并下发路由底座账号（与实例表单行为一致）。
  const instanceEffectiveBindAccountId = useMemo(
    () =>
      resolveInstanceEffectiveBindAccountId({
        isDefaultInstance: instanceId === DEFAULT_CODEX_INSTANCE_ID,
        followLocalAccount: Boolean(selectedInstance?.followLocalAccount),
        bindAccountId: selectedInstance?.bindAccountId ?? null,
        localCurrentAccountId: currentAccount?.id ?? null,
      }),
    [currentAccount?.id, instanceId, selectedInstance],
  );
  const mixedRoutingOAuthAccount = useMemo(() => {
    if (!routingEnabledForSave) return null;
    return resolveLaunchPreviewRoutingBaseAccount(
      accounts,
      effectiveLaunchAccount,
      instanceEffectiveBindAccountId,
    );
  }, [
    accounts,
    effectiveLaunchAccount,
    instanceEffectiveBindAccountId,
    routingEnabledForSave,
  ]);
  const mixedRoutingBindAccountId = resolveLaunchPreviewRoutingBindAccountId({
    routingEnabled: routingEnabledForSave,
    routingBaseAccountId: mixedRoutingOAuthAccount?.id ?? null,
    instanceEffectiveBindAccountId,
  });
  const routingBindingNeedsRepair =
    routingEnabledForSave && mixedRoutingOAuthAccount == null;
  const contextOverridePreset = resolveCodexContextOverridePreset(
    contextOverrideEnabled,
    contextWindowInput,
    compactLimitInput,
  );

  const nextModelRouting = useMemo(
    () =>
      buildCodexModelRoutingValue(
        routingEnabledForSave,
        normalizedRoutingRoutes,
      ),
    [normalizedRoutingRoutes, routingEnabledForSave],
  );
  const routingDirty = useMemo(
    () =>
      !areCodexModelRoutingsEqual(selectedInstance?.modelRouting, nextModelRouting) ||
      routingBindingNeedsRepair ||
      mixedRoutingBindAccountId !== undefined,
    [
      mixedRoutingBindAccountId,
      nextModelRouting,
      routingBindingNeedsRepair,
      selectedInstance?.modelRouting,
    ],
  );
  const dirty = useMemo(() => {
    if (!loadedConfig && !routingDirty) return false;
    const contextDirty =
      loadedConfig != null &&
      (contextOverrideEnabled !==
        (loadedConfig.detected_model_context_window !== undefined ||
          loadedConfig.detected_auto_compact_token_limit !== undefined) ||
        (contextOverrideEnabled &&
          (contextWindowInput !==
            (loadedConfig.detected_model_context_window?.toString() ?? "") ||
            compactLimitInput !==
              (loadedConfig.detected_auto_compact_token_limit?.toString() ?? ""))));
    return (
      contextDirty ||
      routingDirty ||
      (loadedConfig != null &&
        (loadedConfig.experimental_model_catalog_enabled !== catalogEnabled ||
          JSON.stringify(loadedConfig.experimental_model_catalog_models) !==
            JSON.stringify(models) ||
          (loadedConfig.experimental_model_catalog_default_model_id ?? null) !==
            defaultModelId))
    );
  }, [
    catalogEnabled,
    compactLimitInput,
    contextOverrideEnabled,
    contextWindowInput,
    defaultModelId,
    loadedConfig,
    models,
    routingDirty,
  ]);

  const persistDraft = useCallback(async () => {
    if (configBusy || configWritePending.current) return false;
    if (!loadedConfig || (catalogEnabled && modelsError && models.length > 0 && !routingEnabled)) {
      if (catalogEnabled && modelsError) setError(modelsError);
      return false;
    }
    if (!dirty) return true;
    const contextWindow = Number.parseInt(contextWindowInput, 10);
    const compactLimit = compactLimitInput.trim()
      ? Number.parseInt(compactLimitInput, 10)
      : undefined;
    if (
      contextOverrideEnabled &&
      (!Number.isSafeInteger(contextWindow) || contextWindow <= 0)
    ) {
      setError(t("codex.experimentalModelCatalog.models.validation.contextWindow"));
      return false;
    }
    if (
      contextOverrideEnabled &&
      compactLimit !== undefined &&
      (!Number.isSafeInteger(compactLimit) || compactLimit <= 0)
    ) {
      setError(t("codex.experimentalModelCatalog.models.validation.autoCompact"));
      return false;
    }
    if (
      contextOverrideEnabled &&
      compactLimit !== undefined &&
      compactLimit >= contextWindow
    ) {
      setError(t("codex.experimentalModelCatalog.models.validation.autoCompactRange"));
      return false;
    }
    // 只有本次保存/启动仍然启用路由时才校验路由底座；
    // 目标是普通账号（API Key / API 服务）时路由会在保存时自动关闭，不能再拦住启动。
    if (routingEnabledForSave) {
      // 与实例表单一致：没有可直接登录的 OAuth 订阅账号时直接给出可读提示，
      // 不要等后端用实例旧绑定校验失败后再抛出难懂的报错。
      if (!mixedRoutingOAuthAccount) {
        setError(
          t(
            "instances.form.modelRouting.oauthRequired",
            "Định tuyến mô hình kết hợp cần liên kết tài khoản đăng ký OAuth đăng nhập trực tiếp.",
          ),
        );
        return false;
      }
      if (routingRoutes.length === 0) {
        setError(
          t(
            "instances.form.modelRouting.routeRequired",
            "Hãy thêm ít nhất một tuyến mô hình API.",
          ),
        );
        return false;
      }
      const providerAccounts = eligibleCodexModelRoutingAccounts(accounts);
      for (const route of normalizedRoutingRoutes) {
        const namespace = route.namespace.trim().toLowerCase();
        if (
          !/^[a-z0-9][a-z0-9_-]{1,31}$/.test(namespace) ||
          ["official", "subscription", "openai", "codex", "oauth"].includes(
            namespace,
          )
        ) {
          setError(
            t(
              "instances.form.modelRouting.invalidNamespace",
              "Namespace phải dài 2–32 ký tự, chỉ gồm chữ thường, chữ số, gạch dưới hoặc gạch ngang và không dùng tên dành riêng.",
            ),
          );
          return false;
        }
        if (
          !providerAccounts.some(
            (account) => account.id === route.providerAccountId,
          )
        ) {
          setError(
            t(
              "instances.form.modelRouting.providerRequired",
              "Mỗi tuyến mô hình phải chọn một tài khoản API.",
            ),
          );
          return false;
        }
      }
    }
    const session = configSession.current;
    configWritePending.current = true;
    setCheckingConfig(true);
    setNotice(null);
    setError(null);
    try {
      // Check before a write, not during passive status refresh. Closing the
      // dialog while this read is pending invalidates the session and cancels
      // the write; merely abandoning the Promise would still apply it later.
      const latest = await loadCodexLaunchPreviewConfig(
        instanceId,
        mode === "apiService",
      );
      if (session !== configSession.current) return false;
      if (codexLaunchPreviewQuickConfigKey(latest) !== codexLaunchPreviewQuickConfigKey(loadedConfig) ||
          (loadedInstanceKey !== null && loadedInstanceKey !== codexLaunchPreviewInstanceConfigKey(configLoadInputs.current.selectedInstance))) {
        setConfigLoadError("CODEX_LAUNCH_PREVIEW_CONFIG_CHANGED");
        return false;
      }
      setCheckingConfig(false);
      setSaving(true);
      let nextModels = models;
      if (routingEnabledForSave) {
        nextModels = syncExperimentalModelsWithRouting(
          models,
          normalizedRoutingRoutes,
          accounts,
          true,
        );
      }
      const nextCatalog = resolveRoutingCatalog(nextModels, catalogEnabled, defaultModelId);
      let saved: CodexQuickConfig;
      if (routingDirty) {
        const result = await saveCodexInstanceConfiguration({
          instanceId,
          bindAccountId: mixedRoutingBindAccountId,
          modelRouting: nextModelRouting,
          deferBindAccountApplication: true,
          updateContextOverride: true,
          modelContextWindow: contextOverrideEnabled ? contextWindow : null,
          autoCompactTokenLimit: contextOverrideEnabled ? (compactLimit ?? null) : null,
          experimentalModelCatalogEnabled: nextCatalog.enabled,
          experimentalModelCatalogModels: nextCatalog.models,
          experimentalModelCatalogDefaultModelId: nextCatalog.defaultModelId,
        });
        saved = result.quickConfig;
        if (session === configSession.current) {
          setLoadedInstanceKey(codexLaunchPreviewInstanceConfigKey(result.instance));
        }
        useCodexInstanceStore.setState({
          instances: useCodexInstanceStore.getState().instances.map((item) =>
            item.id === result.instance.id ? result.instance : item),
        });
      } else {
        saved = await saveCodexInstanceQuickConfig(
          instanceId,
          contextOverrideEnabled ? contextWindow : undefined,
          contextOverrideEnabled ? compactLimit : undefined,
          nextCatalog.enabled,
          nextCatalog.models,
          nextCatalog.defaultModelId,
        );
      }
      rememberCodexLaunchPreviewConfig(instanceId, saved);
      // A dispatched write may finish after Close. Keep shared snapshots current,
      // but do not revive the dismissed preview or continue its launch/switch.
      if (session !== configSession.current) return false;
      applyLoadedConfig(saved);
      setRoutingRoutes(normalizedRoutingRoutes);
      setNotice(routingDirty
        ? t("instances.form.modelRouting.savedForNextLaunch", "Đã lưu. Thay đổi sẽ có hiệu lực vào lần tới khi bạn khởi động Codex qua Cockpit; phiên hiện tại vẫn giữ nguyên.")
        :
        t(
          "codex.modelProviders.quickConfig.saveSuccess",
          "Đã lưu cấu hình Codex hiện tại.",
        ),
      );
      return true;
    } catch (saveError) {
      if (session !== configSession.current) return false;
      if (String(saveError).replace(/^Error:\s*/, "") === CODEX_LAUNCH_PREVIEW_CONFIG_TIMEOUT) {
        setConfigLoadError(CODEX_LAUNCH_PREVIEW_CONFIG_TIMEOUT);
        return false;
      }
      setError(
        getCodexExperimentalModelErrorMessage(t, saveError) ??
          t("instances.form.codexQuickConfig.saveFailed", {
            defaultValue: "Không thể lưu cấu hình Codex: {{error}}",
            error: String(saveError).replace(/^Error:\s*/, ""),
          }),
      );
      return false;
    } finally {
      if (session === configSession.current) {
        configWritePending.current = false;
        setCheckingConfig(false);
        setSaving(false);
      }
    }
  }, [
    accounts,
    applyLoadedConfig,
    catalogEnabled,
    configBusy,
    compactLimitInput,
    contextOverrideEnabled,
    contextWindowInput,
    defaultModelId,
    dirty,
    loadedConfig,
    loadedInstanceKey,
    models,
    modelsError,
    instanceId,
    nextModelRouting,
    routingDirty,
    routingEnabled,
    routingEnabledForSave,
    mixedRoutingBindAccountId,
    mixedRoutingOAuthAccount,
    normalizedRoutingRoutes,
    setError,
    t,
  ]);

  useEffect(() => {
    if (!persistRoutingDisableRef.current || routingEnabled) return;
    persistRoutingDisableRef.current = false;
    void persistDraft();
  }, [persistDraft, routingEnabled]);

  const handleExecute = useCallback(
    async (launchAfterSwitch: boolean) => {
      if (configBusy) return;
      const session = configSession.current;
      const saved = await persistDraft();
      if (!saved || session !== configSession.current) return;
      setExecuting(launchAfterSwitch ? "launch" : "switch");
      setNotice(null);
      setError(null);
      try {
        const launchOptions: CodexLaunchPreviewLaunchOptions | undefined =
          account && isDeepSeekAccount(account)
            ? {
                deepSeekAccessMode,
                imageGenerationAccountIds: imageGenEnabled
                  ? imageGenAccountIds.filter((id) =>
                      accounts.some((item) => item.id === id),
                    )
                  : [],
              }
            : undefined;
        await onExecute(launchAfterSwitch, launchOptions);
      } catch (executeError) {
        setError(String(executeError).replace(/^Error:\s*/, ""));
      } finally {
        // 启动事务超时或长期不返回时，按钮不能永久停在“加载中”状态。
        setExecuting(null);
      }
    },
    [
      accounts,
      configBusy,
      deepSeekAccessMode,
      imageGenAccountIds,
      imageGenEnabled,
      onExecute,
      persistDraft,
      setError,
    ],
  );

  const unavailable =
    loadedConfig &&
    !loadedConfig.experimental_model_catalog_available &&
    !loadedConfig.experimental_model_catalog_enabled;
  const defaultModel = defaultModelId
    ? models.find((model) => model.model_id === defaultModelId)
    : null;
  const defaultModelLabel =
    defaultModel?.display_name ||
    defaultModel?.model_id ||
    t("codex.experimentalModelCatalog.models.followOfficial", "Theo chính thức");

  const isApiKeySubject = Boolean(account && isCodexApiKeyAccount(account));
  // DeepSeek 走自己的模型目录与 API Key 鉴权：不显示 Token 刷新与官方模型管理。
  const isDeepSeekSubject = Boolean(account && isDeepSeekAccount(account));
  /** API 服务固定走网关模式，接入方式只读展示。 */
  const providerRowsVisible = isDeepSeekSubject || mode === "apiService";
  const providerAccessModeReadOnly = mode === "apiService";
  const canChooseDeepSeekAccessMode = Boolean(
    account && isDeepSeekResponsesAccount(account),
  );
  const imageGenAvailable = deepSeekImageGenAvailable;

  const accountPresentation = useMemo(
    () => (account ? buildCodexAccountPresentation(account, t) : null),
    [account, t],
  );
  const accountAuthMetadata = useMemo(
    () => (account && !isApiKeySubject ? getCodexAuthMetadata(account) : null),
    [account, isApiKeySubject],
  );
  const accountSubscription = useMemo(
    () =>
      account && !isApiKeySubject
        ? getCodexSubscriptionPresentationForAccount(account, t)
        : null,
    [account, isApiKeySubject, t],
  );
  const fallbackContextText = useMemo(() => {
    if (!account) return "";
    if (isApiKeySubject) {
      return (
        account.api_provider_name?.trim() ||
        account.api_base_url?.trim() ||
        account.auth_mode?.trim() ||
        "API Key"
      );
    }
    const organizationId = account.organization_id?.trim();
    const workspace =
      accountAuthMetadata?.workspaces.find(
        (item) => organizationId && item.id === organizationId,
      ) ||
      accountAuthMetadata?.workspaces.find((item) => item.is_default) ||
      accountAuthMetadata?.workspaces[0];
    const loginProvider = formatCodexLoginProvider(
      accountAuthMetadata?.authProvider,
    );
    return (
      account.account_name?.trim() ||
      workspace?.title?.trim() ||
      loginProvider ||
      account.auth_mode?.trim() ||
      "Codex"
    );
  }, [account, accountAuthMetadata, isApiKeySubject]);
  const fallbackFacts = useMemo<CodexLaunchPreviewFact[]>(() => {
    if (!account) return [];
    if (isApiKeySubject) {
      const modelCount = account.api_model_catalog?.length ?? 0;
      return [
        {
          label: t("codex.api.provider.label", "Nhà cung cấp"),
          value:
            account.api_provider_name?.trim() ||
            account.api_provider_id?.trim() ||
            t("codex.api.provider.custom", "Tùy chỉnh"),
        },
        {
          label: t("codex.api.baseUrl", "Base URL"),
          value: account.api_base_url?.trim() || "-",
          monospace: true,
          wide: true,
        },
        {
          label: t("codex.api.modelCatalog.label", "Danh sách mô hình"),
          value:
            modelCount > 0
              ? t("codex.api.modelCatalog.count", {
                  count: modelCount,
                  defaultValue: "{{count}} mô hình",
                })
              : t("common.none", "None​"),
        },
      ];
    }
    return [
      {
        label: t("kiro.account.userId", "ID người dùng"),
        value:
          accountAuthMetadata?.userId?.trim() ||
          account.user_id?.trim() ||
          t("common.none", "None​"),
        monospace: true,
      },
      {
        label: t("codex.apiSwitchNotice.type.account", "Tài khoản"),
        value:
          accountAuthMetadata?.chatgptAccountId?.trim() ||
          account.account_id?.trim() ||
          t("common.none", "None​"),
        monospace: true,
      },
      {
        label: t("codex.subscription.label", "Hết hạn gói"),
        value: accountSubscription
          ? `${accountSubscription.valueText}${
              accountSubscription.detailText
                ? ` · ${accountSubscription.detailText}`
                : ""
            }`
          : t("common.none", "None​"),
      },
    ];
  }, [account, accountAuthMetadata, accountSubscription, isApiKeySubject, t]);
  const tokenExpiryFacts = useMemo<CodexLaunchPreviewFact[]>(() => {
    const tokenAccount = manualRefreshedAccount ?? account;
    if (!tokenAccount || !isStandardCodexOAuthAccount(tokenAccount)) return [];

    const nowSeconds = Math.floor(Date.now() / 1000);
    const locale = i18n.resolvedLanguage || i18n.language;
    const relativeTime = new Intl.RelativeTimeFormat(locale, {
      numeric: "auto",
    });
    const formatExpiry = (expiresAt: number | null) => {
      if (expiresAt === null) {
        return t("codex.switchProgress.detail.expiryUnknown");
      }
      const diffSeconds = expiresAt - nowSeconds;
      const absoluteSeconds = Math.abs(diffSeconds);
      let unit: Intl.RelativeTimeFormatUnit = "minute";
      let divisor = 60;
      if (absoluteSeconds >= 36 * 60 * 60) {
        unit = "day";
        divisor = 24 * 60 * 60;
      } else if (absoluteSeconds >= 90 * 60) {
        unit = "hour";
        divisor = 60 * 60;
      }
      const relativeValue =
        diffSeconds < 0
          ? Math.floor(diffSeconds / divisor)
          : Math.max(1, Math.ceil(diffSeconds / divisor));
      return t("codex.switchProgress.detail.expiresAt", {
        time: new Date(expiresAt * 1000).toLocaleString(locale),
        relative: relativeTime.format(relativeValue, unit),
      });
    };
    const buildFact = (
      label: string,
      token: string | undefined,
      refreshLeadSeconds: number,
      affectsAuthorization = true,
    ): CodexLaunchPreviewFact => {
      const expiresAt = getCodexJwtExpiration(token?.trim() || "");
      return {
        label,
        value: formatExpiry(expiresAt),
        tone:
          !affectsAuthorization
            ? undefined
            : expiresAt !== null && expiresAt <= nowSeconds
              ? "danger"
              : expiresAt !== null && expiresAt <= nowSeconds + refreshLeadSeconds
                ? "warning"
                : undefined,
      };
    };

    return [
      buildFact("access_token", tokenAccount.tokens?.access_token, 5 * 60),
      buildFact("id_token", tokenAccount.tokens?.id_token, 10 * 60, false),
    ];
  }, [account, i18n.language, i18n.resolvedLanguage, manualRefreshedAccount, t]);
  const displayFacts = [
    ...(summary?.facts ?? fallbackFacts),
    ...tokenExpiryFacts,
  ];
  const displayQuotaItems =
    summary?.quotaItems ?? accountPresentation?.quotaItems.slice(0, 3) ?? [];
  const displayActions = actions ?? [];
  const displayBadgeLabel =
    summary?.badgeLabel ||
    accountMetaLabel ||
    account?.plan_type ||
    accountPresentation?.planLabel ||
    (mode === "apiService" ? "API Key" : "Codex");
  const displayContextText = summary?.contextText || fallbackContextText;
  // API 服务的「启用 GPT 生图」：在预览正文里单独成行，与 DeepSeek 启动预览保持一致。
  const imageForwardAction = displayActions.find(
    (action) => action.id === "image-forward",
  );
  const footerToolActions = displayActions.filter(
    (action) =>
      action.id !== "delete" &&
      action.id !== "speed" &&
      action.id !== "image-forward",
  );
  const subjectIcon =
    mode === "apiService" ? (
      <Server size={19} />
    ) : isApiKeySubject ? (
      <KeyRound size={19} />
    ) : (
      <UserRound size={19} />
    );

  const openModelConfig = useCallback(async () => {
    if (configBusy || unavailable) return;
    const session = configSession.current;
    // Per-model edits require the catalog persistence policy. Ask explicitly even
    // with mixed routing enabled, otherwise the backend discards the draft.
    if (!catalogEnabled) {
      const confirmed = await confirmDialog(
        t("codex.modelManagement.enableConfirmDescription"),
        {
          title: t("codex.modelManagement.enableConfirmTitle", "Bật quản lý mô hình?"),
          okLabel: t("codex.modelManagement.enableConfirmAction", "Bật và cấu hình"),
          cancelLabel: t("common.cancel", "Hủy"),
          kind: "warning",
        },
      );
      if (!confirmed || session !== configSession.current) return;
    }
    setModelConfigSnapshot({
      enabled: catalogEnabled,
      models: models.map((model) => ({
        ...model,
        reasoning_efforts: model.reasoning_efforts
          ? [...model.reasoning_efforts]
          : undefined,
      })),
      defaultModelId,
      routingRoutes: routingRoutes.map((route) => ({
        ...route,
        selectedModels: route.selectedModels?.slice(),
        extraModels: route.extraModels?.slice(),
      })),
    });
    setCatalogEnabled(true);
    setNotice(null);
    setError(null);
    setModelConfigOpen(true);
  }, [
    configBusy,
    catalogEnabled,
    defaultModelId,
    models,
    routingRoutes,
    setError,
    t,
    unavailable,
  ]);

  const handleInstanceChange = useCallback(
    async (nextInstanceId: string) => {
      if (
        busy || checkingConfig ||
        (!configReady && loadedTarget === previewTargetKey && dirty) ||
        !onInstanceChange ||
        !nextInstanceId ||
        nextInstanceId === instanceId
      ) {
        return;
      }
      const session = configSession.current;
      if (configReady) {
        const saved = await persistDraft();
        if (!saved || session !== configSession.current) return;
      }
      setChangingInstance(true);
      setNotice(null);
      setError(null);
      try {
        await onInstanceChange(nextInstanceId);
      } catch (changeError) {
        setError(String(changeError).replace(/^Error:\s*/, ""));
      } finally {
        setChangingInstance(false);
      }
    },
    [busy, checkingConfig, configReady, dirty, instanceId, loadedTarget, onInstanceChange, persistDraft, previewTargetKey, setError],
  );

  const closeModelConfig = useCallback(
    (apply: boolean) => {
      if (apply) {
        setCatalogEnabled(true);
      } else if (modelConfigSnapshot) {
        setCatalogEnabled(modelConfigSnapshot.enabled);
        setModels(modelConfigSnapshot.models);
        setDefaultModelId(modelConfigSnapshot.defaultModelId);
        setRoutingRoutes(modelConfigSnapshot.routingRoutes);
      }
      setModelConfigSnapshot(null);
      setModelConfigOpen(false);
      setModelsError(null);
    },
    [modelConfigSnapshot],
  );

  const openContextConfig = useCallback(() => {
    if (configBusy) return;
    setContextConfigSnapshot({
      enabled: contextOverrideEnabled,
      contextWindowInput,
      compactLimitInput,
    });
    setNotice(null);
    setError(null);
    setContextConfigError(null);
    setContextConfigOpen(true);
  }, [configBusy, compactLimitInput, contextOverrideEnabled, contextWindowInput, setError]);

  const closeContextConfig = useCallback(
    (apply: boolean) => {
      if (!apply && contextConfigSnapshot) {
        setContextOverrideEnabled(contextConfigSnapshot.enabled);
        setContextWindowInput(contextConfigSnapshot.contextWindowInput);
        setCompactLimitInput(contextConfigSnapshot.compactLimitInput);
      }
      setContextConfigSnapshot(null);
      setContextConfigOpen(false);
    },
    [contextConfigSnapshot],
  );

  /** 「应用上下文」直接落盘：立即写入 model_context_window / 自动压缩阈值，
   *  失败时保留弹框并在弹框内提示，避免用户以为已保存但 config.toml 没有变化。 */
  const applyContextConfig = useCallback(async () => {
    if (configBusy || contextConfigSaving) return;
    const contextWindow = Number.parseInt(contextWindowInput, 10);
    const compactLimit = compactLimitInput.trim()
      ? Number.parseInt(compactLimitInput, 10)
      : undefined;
    if (
      contextOverrideEnabled &&
      (!Number.isSafeInteger(contextWindow) || contextWindow <= 0)
    ) {
      setContextConfigError(
        t("codex.experimentalModelCatalog.models.validation.contextWindow"),
      );
      return;
    }
    if (
      contextOverrideEnabled &&
      compactLimit !== undefined &&
      (!Number.isSafeInteger(compactLimit) || compactLimit <= 0)
    ) {
      setContextConfigError(
        t("codex.experimentalModelCatalog.models.validation.autoCompact"),
      );
      return;
    }
    if (
      contextOverrideEnabled &&
      compactLimit !== undefined &&
      compactLimit >= contextWindow
    ) {
      setContextConfigError(
        t("codex.experimentalModelCatalog.models.validation.autoCompactRange"),
      );
      return;
    }
    setContextConfigError(null);
    setContextConfigSaving(true);
    const session = configSession.current;
    configWritePending.current = true;
    setCheckingConfig(true);
    try {
      // 与「保存」一致：写入前重读一次配置，外部已改动时拒绝应用，
      // 避免「应用上下文」绕过校验、静默覆盖别处的修改。
      const latest = await loadCodexLaunchPreviewConfig(
        instanceId,
        mode === "apiService",
      );
      if (session !== configSession.current) return;
      if (
        codexLaunchPreviewQuickConfigKey(latest) !==
        codexLaunchPreviewQuickConfigKey(loadedConfig)
      ) {
        setConfigLoadError("CODEX_LAUNCH_PREVIEW_CONFIG_CHANGED");
        return;
      }
      setCheckingConfig(false);
      const saved = await saveCodexInstanceQuickConfig(
        instanceId,
        contextOverrideEnabled ? contextWindow : undefined,
        contextOverrideEnabled ? compactLimit : undefined,
        catalogEnabled,
        models,
        defaultModelId,
      );
      rememberCodexLaunchPreviewConfig(instanceId, saved);
      if (session !== configSession.current) return;
      applyLoadedConfig(saved);
      setContextConfigSnapshot(null);
      setContextConfigOpen(false);
      setNotice(
        t("codex.modelProviders.quickConfig.saveSuccess", "Đã lưu cấu hình Codex hiện tại."),
      );
    } catch (saveError) {
      if (session !== configSession.current) return;
      setContextConfigError(String(saveError).replace(/^Error:\s*/, ""));
    } finally {
      if (session === configSession.current) {
        configWritePending.current = false;
        setCheckingConfig(false);
        setContextConfigSaving(false);
      }
    }
  }, [
    applyLoadedConfig,
    catalogEnabled,
    compactLimitInput,
    configBusy,
    contextConfigSaving,
    contextOverrideEnabled,
    contextWindowInput,
    defaultModelId,
    instanceId,
    loadedConfig,
    mode,
    models,
  ]);

  const handleAuxiliaryAction = useCallback(
    async (action: CodexLaunchPreviewAction) => {
      if (busy || action.disabled || !action.onAction) return;
      setRunningActionId(action.id);
      setNotice(null);
      setError(null);
      try {
        await action.onAction();
      } catch (actionError) {
        setError(String(actionError).replace(/^Error:\s*/, ""));
      } finally {
        setRunningActionId(null);
      }
    },
    [busy, setError],
  );

  const handleForceRefresh = useCallback(async () => {
    if (!account || !isStandardCodexOAuthAccount(account) || forceRefreshing) {
      return;
    }
    setForceRefreshing(true);
    setManualRefreshResult({ status: "running" });
    setNotice(null);
    setError(null);
    try {
      const refreshed = await forceRefreshCodexTokens(account.id);
      useCodexAccountStore.getState().applyAccountSnapshot(refreshed);
      setManualRefreshedAccount(refreshed);
      setManualRefreshResult({ status: "success" });
    } catch (refreshError) {
      const errorMessage = String(refreshError).replace(/^Error:\s*/, "");
      const latestAccount = useCodexAccountStore.getState().accounts.find((item) => item.id === account.id) ?? account;
      setManualRefreshResult({
        status: "error",
        error: errorMessage,
        requiresReauth: isCodexRefreshTokenReauthReason(errorMessage) || isCodexAccountReauthRequired(latestAccount),
      });
    } finally {
      setForceRefreshing(false);
    }
  }, [account, forceRefreshing, setError]);

  const closeManualRefreshResult = useCallback(() => {
    if (forceRefreshing) return;
    setManualRefreshResult(null);
  }, [forceRefreshing]);

  useEscCloseTopmost(modelConfigOpen && !busy, () => closeModelConfig(false), modelDialog);
  useEscCloseTopmost(contextConfigOpen && !busy && !contextConfigSaving, () => closeContextConfig(false), contextDialog);
  useEscCloseTopmost(Boolean(manualRefreshResult) && !forceRefreshing, closeManualRefreshResult, refreshDialog);

  const handleManualRefreshReauthorize = useCallback(() => {
    if (!account || forceRefreshing || !manualRefreshResult?.requiresReauth) return;
    setManualRefreshResult(null);
    onClose();
    window.dispatchEvent(
      new CustomEvent("app-request-navigate", { detail: "codex" }),
    );
    requestCodexOpenAddAccount({
      tab: "oauth",
      targetAccountId: account.id,
      ...(mode === "instance"
        ? {
            retryInstanceLaunchAfterOAuth: true,
            retryInstanceId: instanceId,
          }
        : {}),
    });
  }, [account, forceRefreshing, instanceId, mode, onClose, manualRefreshResult?.requiresReauth]);

  const renderFooterAction = (action: CodexLaunchPreviewAction) => (
    <div
      key={action.id}
      className={`codex-launch-preview-action-item ${
        action.control ? "has-control" : ""
      }`}
      title={action.description}
    >
      {action.control ? (
        <>
          <span className="codex-launch-preview-action-label">
            {action.label}
          </span>
          {action.control}
        </>
      ) : (
        <button
          type="button"
          className={`codex-launch-preview-action-button ${
            action.tone === "danger" ? "is-danger" : ""
          }`}
          onClick={() => void handleAuxiliaryAction(action)}
          disabled={busy || action.disabled || !action.onAction}
        >
          {runningActionId === action.id
            ? t("common.loading", "Đang tải...")
            : action.label}
        </button>
      )}
    </div>
  );

  const deepSeekAccessModeLabel =
    deepSeekAccessMode === DEEPSEEK_ACCESS_MODE_DIRECT
      ? t("codex.deepSeek.start.directMode", "API chính thức")
      : deepSeekAccessMode === DEEPSEEK_ACCESS_MODE_CDP
        ? t("codex.deepSeek.start.cdpMode", "Tiêm CDP")
        : t("codex.deepSeek.start.gatewayMode", "Danh sách cổng");

  const deepSeekAccessModeOptions: {
    id: DeepSeekAccessMode;
    label: string;
    pros: string;
    cons: string;
  }[] = ([
    {
      id: DEEPSEEK_ACCESS_MODE_GATEWAY,
      label: t("codex.deepSeek.start.gatewayMode", "Danh sách cổng"),
      pros: t(
        "codex.launchPreview.accessModeGatewayPros",
        "1: Đổi model ngay trong Codex\n2: Liên kết tài khoản OAuth và dùng các tính năng OAuth như nén từ xa, điều khiển trình duyệt\n3: Cấu hình tài khoản GPT để chuyển tiếp tạo ảnh",
      ),
      cons: t(
        "codex.launchPreview.accessModeGatewayCons",
        "1: Cần cổng nội bộ của instance, chậm hơn một chút so với kết nối trực tiếp",
      ),
    },
    {
      id: DEEPSEEK_ACCESS_MODE_CDP,
      label: t("codex.deepSeek.start.cdpMode", "Tiêm CDP"),
      pros: t(
        "codex.launchPreview.accessModeCdpPros",
        "1: Tốc độ như kết nối trực tiếp\n2: Đổi Flash / Pro trong danh sách model chính thức của Codex",
      ),
      cons: t(
        "codex.launchPreview.accessModeCdpCons",
        "1: Cần inject ứng dụng chính thức, không liên kết OAuth và không chuyển tiếp ảnh",
      ),
    },
    {
      id: DEEPSEEK_ACCESS_MODE_DIRECT,
      label: t("codex.deepSeek.start.directMode", "API chính thức"),
      pros: t(
        "codex.launchPreview.accessModeDirectPros",
        "1: Không qua cổng, nhanh nhất",
      ),
      cons: t(
        "codex.launchPreview.accessModeDirectCons",
        "1: Không đổi được model trong Codex, không liên kết OAuth và không chuyển tiếp ảnh",
      ),
    },
  ] as {
    id: DeepSeekAccessMode;
    label: string;
    pros: string;
    cons: string;
  }[]);

  const selectedImageGenAccounts = imageGenAccountIds
    .map((id) => accounts.find((item) => item.id === id))
    .filter((item): item is CodexAccount => Boolean(item));
  // 保存时以列表里勾选的现存账号为准：账号总览里删掉的账号不再参与提交，
  // 否则后端会逐个校验并报「生图账号不存在」。
  const existingImageGenAccountIds = selectedImageGenAccounts.map(
    (item) => item.id,
  );

  return (
    <>
      <div className="modal-overlay codex-launch-preview-overlay" inert={childDialogOpen} aria-hidden={childDialogOpen || undefined}>
        <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="codex-launch-preview-title" className="modal codex-launch-preview-modal">
          <div className="modal-header">
            <div className="codex-launch-preview-title-icon">
              <Play size={18} />
            </div>
            <div className="codex-launch-preview-heading">
              <h2 id="codex-launch-preview-title">{t("codex.launchPreview.title")}</h2>
            </div>
            <button
              type="button"
              className="modal-close"
              onClick={requestClose}
              disabled={busy}
              aria-label={t("common.close", "Đóng")}
            >
              <X />
            </button>
          </div>

          <div className="modal-body">
            <ModalErrorMessage message={configErrorMessage || error} scrollKey={errorScrollKey} />
            {(loading || checkingConfig) && (
              <div className="codex-launch-preview-config-status" role="status">
                <RefreshCw size={14} className="spin" />
                <span>{t(loadedConfig ? "codex.launchPreview.configRefreshing" : "codex.launchPreview.configLoading")}</span>
              </div>
            )}
            {configErrorMessage && !loading && (
              <div className="codex-launch-preview-config-status">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={busy || checkingConfig}
                  onClick={() => {
                    retainDraftOnReload.current = dirty && loadedTarget === previewTargetKey &&
                      !instanceConfigChanged && configLoadError !== "CODEX_LAUNCH_PREVIEW_CONFIG_CHANGED";
                    setConfigReload((value) => value + 1);
                  }}
                >
                  <RefreshCw size={14} />
                  {t("common.retry")}
                </button>
              </div>
            )}

            <section className="codex-launch-preview-summary-card">
              <div className="codex-launch-preview-summary-head">
                <div className="codex-launch-preview-subject">
                  <div className="codex-launch-preview-subject-icon">
                    {subjectIcon}
                  </div>
                  <div className="codex-launch-preview-subject-copy">
                    <div className="codex-launch-preview-subject-title-row">
                      <strong title={accountLabel}>{accountLabel}</strong>
                      <span className="codex-launch-preview-plan-badge">
                        {displayBadgeLabel}
                      </span>
                      {summary?.statusLabel && (
                        <span
                          className={`codex-launch-preview-status-badge ${
                            summary.statusTone ?? "neutral"
                          }`}
                        >
                          {summary.statusLabel}
                        </span>
                      )}
                    </div>
                    {displayContextText && (
                      <span title={displayContextText}>
                        {displayContextText}
                      </span>
                    )}
                  </div>
                </div>
                <div className="codex-launch-preview-summary-controls">
                  <CodexSpeedControl
                    key={`${mode}:${instanceId}:${accountId}`}
                    scope={mode === "apiService" ? "api" : mode === "instance" ? "instance" : "account"}
                    account={account} instanceId={instanceId} disabled={busy && !speedSaving}
                    onSavingChange={setSpeedSaving} onError={setError} />
                  <div
                    className={`codex-launch-preview-target${
                      instanceOptions?.length && onInstanceChange
                        ? " is-switchable"
                        : ""
                    }`}
                  >
                    <span>
                      {t(
                        "codex.sessionManager.repairModal.targetInstance",
                        "Phiên bản đích",
                      )}
                    </span>
                    {instanceOptions?.length && onInstanceChange ? (
                      <SingleSelectDropdown
                        value={instanceId}
                        options={instanceOptions}
                        onChange={(nextInstanceId) =>
                          void handleInstanceChange(nextInstanceId)
                        }
                        className="codex-launch-preview-instance-select"
                        menuClassName="codex-launch-preview-instance-menu"
                        disabled={busy || checkingConfig || (!configReady && loadedTarget === previewTargetKey && dirty)}
                        ariaLabel={t(
                          "codex.sessionManager.repairModal.targetInstance",
                          "Phiên bản đích",
                        )}
                        menuWidth={260}
                      />
                    ) : (
                      <>
                        <strong>
                          {instanceLabel ||
                            t("instances.defaultName", "Phiên bản mặc định")}
                        </strong>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p className="codex-launch-preview-token-note">
                {t(mode === "apiService" ? "codex.speed.apiHint" : "codex.speed.launchHint")}
              </p>
              {displayFacts.length > 0 && (
                <div className="codex-launch-preview-facts">
                  {displayFacts.map((fact, index) => (
                    <div
                      key={`${fact.label}-${index}`}
                      className={[
                        fact.wide ? "is-wide" : "",
                        fact.tone ? `is-${fact.tone}` : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span>{fact.label}</span>
                      <strong
                        className={fact.monospace ? "is-monospace" : undefined}
                        title={fact.value}
                      >
                        {fact.value}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              {tokenExpiryFacts.length > 0 && (
                <p className="codex-launch-preview-token-note">
                  {t("codex.launchPreview.tokenExpiryDescription")}
                </p>
              )}

              {summary?.usage &&
                (summary.usage.requests ||
                  summary.usage.tokens ||
                  summary.usage.cost ||
                  summary.usage.extraValue) && (
                  <div className="codex-launch-preview-usage">
                    <div className="codex-launch-preview-usage-title">
                      <BarChart3 size={15} />
                      <span>{summary.usage.label}</span>
                    </div>
                    <div className="codex-launch-preview-usage-grid">
                      {summary.usage.requests && (
                        <div>
                          <span>
                            {t("codex.localAccess.stats.requests", "Yêu cầu")}
                          </span>
                          <strong>{summary.usage.requests}</strong>
                        </div>
                      )}
                      {summary.usage.tokens && (
                        <div>
                          <span>
                            {t("codex.localAccess.stats.tokens", "Token")}
                          </span>
                          <strong>{summary.usage.tokens}</strong>
                        </div>
                      )}
                      {(summary.usage.cost || summary.usage.extraValue) && (
                        <div>
                          {summary.usage.cost && (
                            <>
                              <span>
                                {t(
                                  "codex.localAccess.stats.estimatedCost",
                                  "Giá trị ước tính",
                                )}
                              </span>
                              <strong>{summary.usage.cost}</strong>
                            </>
                          )}
                          {summary.usage.extraValue && (
                            <div className="codex-launch-preview-usage-extra">
                              <span>{summary.usage.extraLabel}</span>
                              <strong>{summary.usage.extraValue}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {displayQuotaItems.length > 0 && (
                <div className="codex-launch-preview-quota">
                  <CodexQuotaMiniRows items={displayQuotaItems} t={t} />
                </div>
              )}

              {summary?.tags && summary.tags.length > 0 && (
                <div className="codex-launch-preview-tags">
                  {summary.tags.slice(0, 8).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                  {summary.tags.length > 8 && (
                    <span>+{summary.tags.length - 8}</span>
                  )}
                </div>
              )}
            </section>

            <div className="codex-launch-preview-tool-list">
              {providerRowsVisible && mode !== "apiService" && (
                <section className="codex-launch-preview-tool-row">
                  <div className="codex-launch-preview-tool-icon">
                    <Route size={16} />
                  </div>
                  <div className="codex-launch-preview-tool-copy">
                    <h3>{t("codex.launchPreview.accessModeTitle", "Chế độ khởi động")}</h3>
                    <p>
                      {t(
                        "codex.launchPreview.accessModeDescription",
                        "Chọn cách khởi động nhà cung cấp này; các chế độ khác nhau ở chuyển mô hình, OAuth và chuyển tiếp tạo ảnh.",
                      )}
                    </p>
                    {providerAccessModeReadOnly ? (
                      <div className="codex-launch-preview-tool-meta">
                        <span>
                          {t(
                            "codex.launchPreview.accessModeApiServiceFixed",
                            "Dịch vụ API luôn dùng chế độ cổng; không thể thay đổi.",
                          )}
                        </span>
                      </div>
                    ) : !canChooseDeepSeekAccessMode ? (
                      <div className="codex-launch-preview-tool-meta">
                        <span>
                          {t(
                            "codex.deepSeek.start.chatOnlyHint",
                            "Chat Completions chỉ đi cổng cục bộ. Chọn mô hình khởi động tại đây.",
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm codex-launch-preview-tool-action codex-launch-preview-dropdown-trigger"
                    onClick={(event) => { rememberChildTrigger(event); setDeepSeekAccessModeDialogOpen(true); }}
                    disabled={busy || providerAccessModeReadOnly || !canChooseDeepSeekAccessMode}
                  >
                    <span>
                      {providerAccessModeReadOnly
                        ? t("codex.deepSeek.start.gatewayMode", "Danh sách cổng")
                        : deepSeekAccessModeLabel}
                    </span>
                    {!providerAccessModeReadOnly && <ChevronDown size={14} />}
                  </button>
                </section>
              )}

              {/* API 服务的生图转发由下面的可操作行承接，这里只渲染供应商账号的只读/可编辑行。 */}
              {providerRowsVisible && !providerAccessModeReadOnly && (
                <section className="codex-launch-preview-tool-row">
                  <div className="codex-launch-preview-tool-icon">
                    <ImagePlus size={16} />
                  </div>
                  <div className="codex-launch-preview-tool-copy">
                    <h3>
                      {t("codex.launchPreview.imageGenTitle", "Bật tạo ảnh GPT")}
                    </h3>
                    <p>
                      {t(
                        "codex.deepSeek.start.imageGenHint",
                        "Chỉ hỗ trợ ở chế độ cổng. Hội thoại vẫn do model của nhà cung cấp này xử lý; tạo ảnh đi theo luồng gpt-image gốc, do các tài khoản GPT đã chọn thực hiện và tiêu tốn hạn mức của chúng.",
                      )}
                    </p>
                    {providerAccessModeReadOnly && (
                      <div className="codex-launch-preview-tool-meta">
                        <span>
                          {t(
                            "codex.launchPreview.imageGenApiServiceFixed",
                            "Việc chuyển tiếp tạo ảnh của dịch vụ API được quản lý trong “Dịch vụ API → Cài đặt”; ở đây chỉ hiển thị trạng thái hiện tại.",
                          )}
                        </span>
                      </div>
                    )}
                    <div className="codex-launch-preview-tool-meta">
                      {imageGenEnabled && (
                        <span className="is-enabled">
                          {selectedImageGenAccounts.length > 0
                            ? t("codex.deepSeek.start.imageGenSelected", {
                                count: selectedImageGenAccounts.length,
                                defaultValue: "Đã chọn {{count}} tài khoản",
                              })
                            : t(
                                "codex.deepSeek.start.imageGenEmpty",
                                "Chưa chọn tài khoản",
                              )}
                        </span>
                      )}
                      {imageGenEnabled &&
                        selectedImageGenAccounts.slice(0, 4).map((item) => (
                          <span key={item.id}>
                            {item.email || item.account_name || item.id}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="codex-launch-preview-tool-controls">
                    <label className="codex-launch-preview-checkbox">
                      <input
                        type="checkbox"
                        checked={imageGenEnabled}
                        disabled={busy || providerAccessModeReadOnly}
                        onChange={(event) => {
                          if (!event.target.checked) {
                            setImageGenEnabled(false);
                            setImageGenAccountIds([]);
                            return;
                          }
                          rememberChildTrigger(event);
                          if (!imageGenAvailable) {
                            setImageGenModeSwitchOpen(true);
                            return;
                          }
                          setImageGenEnabled(true);
                          setImageGenPickerOpen(true);
                        }}
                      />
                      <span>{t("common.enable", "Enable​")}</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm codex-launch-preview-tool-action"
                      disabled={busy || providerAccessModeReadOnly || !imageGenEnabled}
                      onClick={(event) => { rememberChildTrigger(event); setImageGenPickerOpen(true); }}
                    >
                      {t("codex.deepSeek.start.imageGenPick", "Chọn tài khoản GPT")}
                    </button>
                  </div>
                </section>
              )}

              {mode !== "apiService" &&
                account &&
                isStandardCodexOAuthAccount(account) &&
                (selectedInstance?.launchMode ?? "app") !== "cli" && (
                  <CodexModelRoutingFields
                    variant="row"
                    disabled={configBusy || !selectedInstance}
                    errorMessage={configErrorMessage || error}
                    enabled={routingEnabled}
                    routes={routingRoutes}
                    accounts={accounts}
                    running={Boolean(selectedInstance?.running)}
                    onEnabledChange={(nextEnabled) => {
                      if (configBusy) return;
                      const catalog = resolveRoutingCatalog(
                        syncExperimentalModelsWithRouting(models, routingRoutes, accounts, nextEnabled),
                        catalogEnabled,
                        defaultModelId,
                      );
                      setCatalogEnabled(catalog.enabled);
                      setDefaultModelId(catalog.defaultModelId);
                      if (!nextEnabled) {
                        persistRoutingDisableRef.current = true;
                      }
                      setRoutingEnabled(nextEnabled);
                      setModels((prevModels) =>
                        syncExperimentalModelsWithRouting(
                          prevModels,
                          routingRoutes,
                          accounts,
                          nextEnabled,
                        ),
                      );
                    }}
                    onRoutesChange={(nextRoutes) => {
                      if (configBusy) return;
                      setRoutingRoutes(nextRoutes);
                      setModels((prevModels) =>
                        syncExperimentalModelsWithRouting(
                          prevModels,
                          nextRoutes,
                          accounts,
                          routingEnabled,
                        ),
                      );
                    }}
                    onAccountsRefresh={fetchAccounts}
                  />
                )}
              {imageForwardAction?.control && (
                <section className="codex-launch-preview-tool-row">
                  <div className="codex-launch-preview-tool-icon">
                    <ImagePlus size={16} />
                  </div>
                  <div className="codex-launch-preview-tool-copy">
                    <h3>
                      {t("codex.launchPreview.imageGenTitle", "Bật tạo ảnh GPT")}
                    </h3>
                    <p>
                      {t(
                        "codex.deepSeek.start.imageGenHint",
                        "Chỉ hỗ trợ ở chế độ cổng. Hội thoại vẫn do model của nhà cung cấp này xử lý; tạo ảnh đi theo luồng gpt-image gốc, do các tài khoản GPT đã chọn thực hiện và tiêu tốn hạn mức của chúng.",
                      )}
                    </p>
                    {imageForwardAction.meta}
                  </div>
                  <div className="codex-launch-preview-tool-controls">
                    {imageForwardAction.control}
                  </div>
                </section>
              )}
              {((oauthBinding && account && isCodexApiKeyAccount(account)) ||
                mode === "apiService") && (
                <section className="codex-launch-preview-tool-row">
                  <div className="codex-launch-preview-tool-icon">
                    <Link2 size={16} />
                  </div>
                  <div className="codex-launch-preview-tool-copy">
                    <h3>{t("codex.api.oauthBinding.label", "Liên kết OAuth")}</h3>
                    <p>
                      {t(
                        "codex.launchPreview.oauthBindingHint",
                        "Sau khi liên kết, việc khởi chạy giống hệt tài khoản thường và mọi khả năng OAuth (nén từ xa, điều khiển trình duyệt, các loại plugin, v.v.) đều khả dụng; hội thoại vẫn do nhà cung cấp API Key hiện tại xử lý.",
                      )}
                    </p>
                    <div className="codex-launch-preview-tool-meta">
                      <span>
                        {oauthBinding?.boundAccountLabel ||
                          t("codex.api.oauthBinding.unbound", "Chưa liên kết")}
                      </span>
                      {oauthBinding?.needsReauth && (
                        <span
                          className="codex-status-pill quota-error"
                          title={oauthBinding.reauthDescription || undefined}
                        >
                          <CircleAlert size={12} />
                          {t("codex.authError.badge", "Lỗi ủy quyền")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="codex-launch-preview-tool-controls">
                    {oauthBinding?.needsReauth && onReauthorizeOAuth && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm codex-launch-preview-tool-action"
                        onClick={onReauthorizeOAuth}
                        disabled={busy}
                      >
                        {t("common.reauthorize", "Ủy quyền lại")}
                      </button>
                    )}
                    {onBindOAuth && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm codex-launch-preview-tool-action"
                        onClick={onBindOAuth}
                        disabled={busy}
                      >
                        {oauthBinding?.boundAccountLabel
                          ? t(
                              "codex.launchPreview.oauthBindingChange",
                              "Đổi",
                            )
                          : t("codex.api.oauthBinding.action", "Liên kết OAuth")}
                      </button>
                    )}
                  </div>
                </section>
              )}
              {!isDeepSeekSubject && mode !== "apiService" && (
                <section className="codex-launch-preview-tool-row">
                  <div className="codex-launch-preview-tool-icon">
                    <RefreshCw size={16} />
                  </div>
                  <div className="codex-launch-preview-tool-copy">
                    <h3>{t("codex.launchPreview.forceRefreshTitle")}</h3>
                    <p>{t("codex.launchPreview.forceRefreshDescription")}</p>
                    <div className="codex-launch-preview-tool-meta">
                      <span>
                        {account && isStandardCodexOAuthAccount(account)
                          ? t("codex.launchPreview.forceRefreshReady")
                          : t("codex.launchPreview.forceRefreshUnavailable")}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm codex-launch-preview-tool-action"
                    onClick={(event) => { rememberChildTrigger(event); void handleForceRefresh(); }}
                    disabled={
                      busy || !account || !isStandardCodexOAuthAccount(account)
                    }
                  >
                    {forceRefreshing
                      ? t("codex.launchPreview.forceRefreshRunning")
                      : t("codex.launchPreview.forceRefreshAction")}
                  </button>
                </section>
              )}
              <section className="codex-launch-preview-tool-row">
                <div className="codex-launch-preview-tool-icon">
                  <SlidersHorizontal size={16} />
                </div>
                <div className="codex-launch-preview-tool-copy">
                  <h3>
                    {t("codex.contextOverride.title", "Quản lý ngữ cảnh")}
                  </h3>
                  <p>
                    {t(
                      "codex.contextOverride.dialogDescription",
                      "Cài đặt này áp dụng cho mọi tài khoản trong phiên bản Codex hiện tại và được giữ nguyên khi chuyển tài khoản. Chọn cấu hình chính thức, cài đặt sẵn hoặc ngữ cảnh tùy chỉnh.",
                    )}
                  </p>
                  <div className="codex-launch-preview-tool-meta">
                    <span className={contextOverrideEnabled ? "is-enabled" : ""}>
                      {loading
                        ? t("common.loading", "Đang tải...")
                        : contextOverridePreset === "preset_516k"
                          ? "516K / 464K"
                          : contextOverridePreset === "preset_1m"
                            ? "1M / 900K"
                            : contextOverridePreset === "custom"
                              ? t("codex.contextOverride.custom", "Ngữ cảnh tùy chỉnh")
                              : t("codex.contextOverride.followOfficial", "Theo chính thức")}
                    </span>
                    {contextOverridePreset === "custom" && contextWindowInput && (
                      <span>
                        {t(
                          "codex.experimentalModelCatalog.models.contextWindow",
                          "Cửa sổ ngữ cảnh",
                        )}：{contextWindowInput}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm codex-launch-preview-tool-action"
                  onClick={(event) => { rememberChildTrigger(event); openContextConfig(); }}
                  disabled={configBusy}
                >
                  {contextOverrideEnabled
                    ? t("codex.contextOverride.manage", "Quản lý ngữ cảnh")
                    : t("codex.contextOverride.adjust", "Điều chỉnh ngữ cảnh")}
                </button>
              </section>
              {!isDeepSeekSubject && (
                <section className="codex-launch-preview-tool-row">
                  <div className="codex-launch-preview-tool-icon">
                    <SlidersHorizontal size={16} />
                  </div>
                  <div className="codex-launch-preview-tool-copy">
                    <h3>{t("codex.modelManagement.title", "Quản lý mô hình")}</h3>
                    <p>
                      {catalogEnabled
                        ? t("codex.modelManagement.enabledDescription")
                        : t(
                            "codex.modelManagement.disabledDescription",
                            "Mặc định tắt. Mô hình, thứ tự và mức suy luận tuân theo danh mục chính thức.",
                          )}
                    </p>
                    {routingEnabled && (
                      <p>
                        {t(
                          "codex.modelManagement.routingManagedHint",
                          "Định tuyến hỗn hợp chỉ tạm dùng danh mục mô hình này khi instance đang chạy và tự khôi phục sau khi dừng. Công tắc ở đây không thay đổi.",
                        )}
                      </p>
                    )}
                    <div className="codex-launch-preview-tool-meta">
                      <span className={catalogEnabled ? "is-enabled" : ""}>
                        {loading
                          ? t("common.loading", "Đang tải...")
                          : catalogEnabled
                            ? t("codex.modelManagement.enabled", "Đã bật")
                            : t("codex.modelManagement.disabled", "Theo chính thức")}
                      </span>
                      {catalogEnabled && (
                        <span>
                          {t("codex.launchPreview.defaultModel", "Mô hình mặc định")}：
                          {defaultModelLabel}
                        </span>
                      )}
                      {models.length > 0 && (
                        <span>
                          {t("codex.api.modelCatalog.count", {
                            count: models.length,
                            defaultValue: "{{count}} mô hình",
                          })}
                        </span>
                      )}
                    </div>
                    {!loading && models.length > 0 && (
                      <div className="codex-launch-preview-model-chips">
                        {models.slice(0, 6).map((model) => (
                          <span key={model.model_id} title={model.model_id}>
                            {model.display_name || model.model_id}
                          </span>
                        ))}
                        {models.length > 6 && <span>+{models.length - 6}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm codex-launch-preview-tool-action"
                    onClick={(event) => { rememberChildTrigger(event); void openModelConfig(); }}
                    disabled={configBusy || Boolean(unavailable)}
                  >
                    {catalogEnabled
                      ? t("codex.modelManagement.manage", "Quản lý mô hình")
                      : t("codex.modelManagement.enable", "Bật quản lý mô hình")}
                  </button>
                </section>
              )}

              <section className="codex-launch-preview-tool-row">
                <div className="codex-launch-preview-tool-icon">
                  <Wrench size={16} />
                </div>
                <div className="codex-launch-preview-tool-copy">
                  <h3>
                    {t(
                      "codex.sessionManager.actions.repairVisibility",
                      "Sửa hiển thị",
                    )}
                  </h3>
                  <p>
                    {t(
                      "codex.sessionManager.repairModal.modeQuickDesc",
                      "Chuẩn hóa nhà cung cấp trong cơ sở dữ liệu chính thức và chỉ mục phiên. Giữ nguyên tệp rollout. Phù hợp khi đổi tài khoản thông thường.",
                    )}
                  </p>
                  <div className="codex-launch-preview-tool-meta">
                    <span>
                      {t(
                        "codex.sessionManager.repairModal.modeQuick",
                        "Sửa nhanh",
                      )}
                    </span>
                    <span>{t("codex.launchPreview.notApplied")}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm codex-launch-preview-tool-action"
                  onClick={(event) => { rememberChildTrigger(event); setRepairOpen(true); }}
                  disabled={busy}
                >
                  {t(
                    "codex.sessionManager.actions.repairVisibility",
                    "Sửa hiển thị",
                  )}
                </button>
              </section>
            </div>

            {notice && (
              <div className="codex-launch-preview-notice">
                <Save size={14} />
                <span>{notice}</span>
              </div>
            )}
            {configReady && dirty && !notice && (
              <div className="codex-launch-preview-dirty">
                <CircleAlert size={14} />
                <span>{t("codex.launchPreview.unsavedConfig")}</span>
              </div>
            )}
          </div>

          <div className="modal-footer codex-launch-preview-footer">
            {footerToolActions.length > 0 && (
              <div className="codex-launch-preview-footer-tools">
                {footerToolActions.map(renderFooterAction)}
              </div>
            )}
            <div className="codex-launch-preview-footer-main">
              <div className="codex-launch-preview-footer-start">
                {summary?.footerText && (
                  <span className="codex-launch-preview-action-meta">
                    {summary.footerText}
                  </span>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={requestClose}
                >
                  {t("common.close", "Đóng")}
                </button>
              </div>
              <div className="codex-launch-preview-footer-primary">
                {dirty && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => void persistDraft()}
                    disabled={configBusy || (catalogEnabled && Boolean(modelsError))}
                  >
                    <Save size={15} />
                    {saving || checkingConfig
                      ? t("common.saving", "Đang lưu...")
                      : t("common.save", "Lưu")}
                  </button>
                )}
                {mode === "account" && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => void handleExecute(false)}
                    disabled={configBusy || (catalogEnabled && Boolean(modelsError))}
                  >
                    {executing === "switch"
                      ? t("common.loading", "Đang tải...")
                      : t("codex.switch", "Chuyển")}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleExecute(mode !== "instance")}
                  disabled={configBusy || (catalogEnabled && models.length > 0 && Boolean(modelsError))}
                >
                  {mode !== "instance" && <Play size={15} />}
                  {executing !== null
                    ? t("common.loading", "Đang tải...")
                    : mode === "account"
                      ? t("codex.launchPreview.switchAndStart")
                      : mode === "apiService"
                        ? t("codex.localAccess.activateAction", "Khởi động dịch vụ API")
                        : t("codex.launchPreview.startInstance")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {deepSeekAccessModeDialogOpen && (
        <div className="modal-overlay codex-launch-preview-refresh-overlay">
          <div
            ref={accessModeDialog} tabIndex={-1}
            className="modal codex-launch-preview-mode-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-launch-preview-mode-title"
          >
            <div className="modal-header">
              <h2 id="codex-launch-preview-mode-title">
                {t("codex.launchPreview.accessModeTitle", "Chế độ khởi động")}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeepSeekAccessModeDialogOpen(false)}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <p className="form-hint">
                {t(
                  "codex.launchPreview.accessModeDescription",
                  "Chọn cách khởi động nhà cung cấp này; các chế độ khác nhau ở chuyển mô hình, OAuth và chuyển tiếp tạo ảnh.",
                )}
              </p>
              <div className="codex-launch-preview-mode-list">
                {deepSeekAccessModeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`codex-launch-preview-mode-card ${
                      deepSeekAccessMode === option.id ? "active" : ""
                    }`}
                    onClick={() => {
                      setDeepSeekAccessMode(option.id);
                      setDeepSeekAccessModeDialogOpen(false);
                    }}
                  >
                    <span className="codex-launch-preview-mode-card-head">
                      <span className="codex-launch-preview-mode-card-title">
                        {option.label}
                      </span>
                      {deepSeekAccessMode === option.id && <Check size={15} />}
                    </span>
                    <span className="codex-launch-preview-mode-card-section">
                      <span className="codex-launch-preview-mode-card-label is-pros">
                        {t("codex.launchPreview.prosLabel", "Ưu điểm:")}
                      </span>
                      <span className="codex-launch-preview-mode-card-pros">
                        {option.pros}
                      </span>
                    </span>
                    <span className="codex-launch-preview-mode-card-section">
                      <span className="codex-launch-preview-mode-card-label is-cons">
                        {t("codex.launchPreview.consLabel", "Nhược điểm:")}
                      </span>
                      <span className="codex-launch-preview-mode-card-cons">
                        {option.cons}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {imageGenModeSwitchOpen && (
        <div className="modal-overlay codex-launch-preview-refresh-overlay">
          <div
            ref={imageModeDialog} tabIndex={-1}
            className="modal codex-launch-preview-refresh-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-launch-preview-imagegen-gateway-title"
          >
            <div className="modal-header">
              <h2 id="codex-launch-preview-imagegen-gateway-title">
                {t(
                  "codex.launchPreview.imageGenSwitchTitle",
                  "Chỉ hỗ trợ ở chế độ cổng",
                )}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setImageGenModeSwitchOpen(false)}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <p className="form-hint">
                {t(
                  "codex.launchPreview.imageGenSwitchDescription",
                  "Bật tạo ảnh GPT cần chuyển sang chế độ cổng. Chuyển và bật?",
                )}
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setImageGenModeSwitchOpen(false)}
              >
                {t("codex.launchPreview.imageGenSwitchNo", "Không")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setDeepSeekAccessMode(DEEPSEEK_ACCESS_MODE_GATEWAY);
                  setImageGenEnabled(true);
                  setImageGenModeSwitchOpen(false);
                  setImageGenPickerOpen(true);
                }}
              >
                {t("codex.launchPreview.imageGenSwitchYes", "Có")}
              </button>
            </div>
          </div>
        </div>
      )}

      {imageGenPickerOpen && (
        <CodexImageAccountPickerModal
          accounts={accounts}
          selectedIds={existingImageGenAccountIds}
          contextLabel={
            accountPresentation?.displayName ||
            account?.email ||
            account?.id ||
            ""
          }
          onCancel={() => {
            setImageGenPickerOpen(false);
            if (existingImageGenAccountIds.length === 0) {
              setImageGenEnabled(false);
            }
          }}
          onConfirm={(ids) => {
            setImageGenPickerOpen(false);
            setImageGenAccountIds(ids);
            setImageGenEnabled(ids.length > 0);
          }}
        />
      )}

      {manualRefreshResult && (
        <div className="modal-overlay codex-launch-preview-refresh-overlay">
          <div
            ref={refreshDialog} tabIndex={-1}
            className="modal codex-launch-preview-refresh-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="codex-launch-preview-refresh-title"
          >
            <div className="modal-header">
              <div className="codex-launch-preview-refresh-heading">
                <RefreshCw size={18} />
                <div>
                  <h2 id="codex-launch-preview-refresh-title">
                    {t("codex.launchPreview.forceRefreshTitle")}
                  </h2>
                  <p>
                    {manualRefreshResult.status === "running"
                      ? t("codex.launchPreview.forceRefreshRunning")
                      : manualRefreshResult.status === "success"
                        ? t("codex.launchPreview.forceRefreshSuccess")
                        : t("codex.launchPreview.forceRefreshDescription")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={closeManualRefreshResult}
                disabled={forceRefreshing}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body codex-launch-preview-refresh-body">
              {manualRefreshResult.status === "error" ? (
                <ModalErrorMessage message={manualRefreshResult.error} />
              ) : (
                <div className="codex-launch-preview-refresh-status success">
                  <Save size={16} />
                  <span>
                    {manualRefreshResult.status === "running"
                      ? t("codex.launchPreview.forceRefreshRunning")
                      : t("codex.launchPreview.forceRefreshSuccess")}
                  </span>
                </div>
              )}
            </div>
            <div className="modal-footer codex-launch-preview-refresh-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeManualRefreshResult}
                disabled={forceRefreshing}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => void handleForceRefresh()}
                disabled={forceRefreshing}
              >
                {forceRefreshing
                  ? t("codex.launchPreview.forceRefreshRunning")
                  : t("codex.launchPreview.forceRefreshRetry", "Kiểm tra lại")}
              </button>
              {manualRefreshResult.status === "error" && manualRefreshResult.requiresReauth && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleManualRefreshReauthorize()}
                >
                  {t("common.reauthorize", "Ủy quyền lại")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <CodexSessionVisibilityRepairModal
        open={repairOpen}
        onClose={() => setRepairOpen(false)}
        onRepaired={() => {
          setNotice(t("codex.launchPreview.repairCompleted"));
        }}
      />

      {modelConfigOpen && (
        <div className="modal-overlay codex-launch-preview-model-config-overlay">
          <div ref={modelDialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("codex.modelManagement.title")} className="modal codex-launch-preview-model-config-modal">
            <div className="modal-header">
              <div>
                <h2>{t("codex.modelManagement.title", "Quản lý mô hình")}</h2>
                <p>
                  {routingEnabled && !catalogEnabled
                    ? t(
                        "codex.modelManagement.routingManagedHint",
                        "Định tuyến hỗn hợp chỉ tạm dùng danh mục mô hình này khi instance đang chạy và tự khôi phục sau khi dừng. Công tắc ở đây không thay đổi.",
                      )
                    : t("codex.modelManagement.enabledDescription")}
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => closeModelConfig(false)}
                disabled={busy}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage
                message={catalogEnabled ? modelsError : null}
                scrollKey={errorScrollKey}
              />
              <CodexExperimentalModelEditor
                instanceId={instanceId}
                models={models}
                defaultModelId={defaultModelId}
                resetModels={loadedConfig?.experimental_model_catalog_reset_models}
                resetDefaultModelId={
                  loadedConfig?.experimental_model_catalog_reset_default_model_id ?? null
                }
                mode="inline"
                availableChannels={availableChannels}
                resolveModelSource={resolveModelSource}
                onChange={(nextModels) => {
                  setModels(nextModels);
                  setNotice(null);
                  setError(null);
                }}
                onDefaultModelChange={(modelId) => {
                  setDefaultModelId(modelId);
                  setNotice(null);
                  setError(null);
                }}
                onValidationChange={setModelsError}
                onModelRemoved={(removedId) => {
                  setRoutingRoutes((prevRoutes) =>
                    toggleRouteModelInRoutes(prevRoutes, removedId, accounts, "remove"),
                  );
                }}
                onModelAdded={(addedId) => {
                  setRoutingRoutes((prevRoutes) =>
                    toggleRouteModelInRoutes(prevRoutes, addedId, accounts, "add"),
                  );
                }}
                disabled={configBusy}
              />
            </div>
            <div className="modal-footer">
              {catalogEnabled && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setCatalogEnabled(false);
                    setModelConfigSnapshot(null);
                    setModelConfigOpen(false);
                    setModelsError(null);
                  }}
                  disabled={configBusy}
                >
                  {t("codex.modelManagement.disable", "Tắt quản lý mô hình")}
                </button>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => closeModelConfig(false)}
                disabled={busy}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => closeModelConfig(true)}
                disabled={configBusy || (catalogEnabled && Boolean(modelsError))}
              >
                {t("codex.launchPreview.applyModelConfig")}
              </button>
            </div>
          </div>
        </div>
      )}

      {contextConfigOpen && (
        <div className="modal-overlay codex-launch-preview-model-config-overlay">
          <div ref={contextDialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("codex.contextOverride.title")} className="modal codex-launch-preview-model-config-modal codex-launch-preview-context-config-modal">
            <div className="modal-header">
              <div>
                <h2>{t("codex.contextOverride.title", "Quản lý ngữ cảnh")}</h2>
                <p>{t("codex.contextOverride.dialogDescription")}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => closeContextConfig(false)}
                disabled={busy || contextConfigSaving}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <CodexContextOverrideEditor
                enabled={contextOverrideEnabled}
                contextWindow={contextWindowInput}
                compactLimit={compactLimitInput}
                disabled={configBusy}
                onChange={(value) => {
                  setContextOverrideEnabled(value.enabled);
                  setContextWindowInput(value.contextWindow);
                  setCompactLimitInput(value.compactLimit);
                }}
              />
              {contextConfigError && (
                <div className="codex-launch-preview-context-error">
                  {contextConfigError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => closeContextConfig(false)}
                disabled={busy || contextConfigSaving}
              >
                {t("common.cancel", "Hủy")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void applyContextConfig()}
                disabled={configBusy || contextConfigSaving}
              >
                {contextConfigSaving
                  ? t("common.saving", "Đang lưu...")
                  : t("codex.contextOverride.apply", "Áp dụng ngữ cảnh")}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
