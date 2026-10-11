import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, RefreshCw, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { ModalErrorMessage, useModalErrorState } from "../ModalErrorMessage";
import {
  SingleSelectDropdown,
  type SingleSelectOption,
} from "../SingleSelectDropdown";
import { useModalFocusTrap } from "../../hooks/useModalFocusTrap";
import { useEscCloseTopmost } from "../../hooks/useEscClose";
import { useCodexInstanceStore } from "../../stores/useCodexInstanceStore";
import type {
  CodexSessionVisibilityRepairMode,
  CodexSessionVisibilityRepairInstanceList,
  CodexSessionVisibilityRepairProviderList,
  CodexSessionVisibilityRepairProgress,
  CodexSessionVisibilityRepairSummary,
} from "../../types/codex";
import { formatCodexSessionVisibilityRepairMessage } from "../../utils/codexSessionVisibility";

type RepairStatus = "idle" | "previewing" | "previewed" | "running" | "success";
type RepairScope = "all" | "selected";
type InstanceRepairScope = "target" | "all";

const SESSION_VISIBILITY_REPAIR_PROGRESS_EVENT =
  "codex:session_visibility_repair_progress";

interface CodexSessionVisibilityRepairModalProps {
  open: boolean;
  description?: ReactNode;
  selectedSessionIds?: string[];
  totalSessionCount?: number;
  onClose: () => void;
  onRepaired?: (
    summary: CodexSessionVisibilityRepairSummary,
  ) => void | Promise<void>;
  onRunningChange?: (running: boolean) => void;
}

interface CodexSessionVisibilityRepairProgressViewProps {
  progress: CodexSessionVisibilityRepairProgress | null;
}

function createRepairRunId() {
  return `repair-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function buildInitialProgress(
  runId: string,
  mode: CodexSessionVisibilityRepairMode = "quick",
): CodexSessionVisibilityRepairProgress {
  return {
    runId,
    mode,
    stage: "queued",
    percent: 8,
    current: 0,
    total: 0,
  };
}

export function buildCodexSessionVisibilityInitialProgress(
  runId: string,
  mode: CodexSessionVisibilityRepairMode = "quick",
): CodexSessionVisibilityRepairProgress {
  return buildInitialProgress(runId, mode);
}

export function createCodexSessionVisibilityRepairRunId() {
  return createRepairRunId();
}

function clampRepairProgressPercent(value?: number | null): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function CodexSessionVisibilityRepairProgressView({
  progress,
}: CodexSessionVisibilityRepairProgressViewProps) {
  const { t } = useTranslation();

  const resolveProgressMessage = useCallback(
    (value: CodexSessionVisibilityRepairProgress) => {
      const instanceName = value.instanceName ?? "";
      const values = {
        current: value.current,
        total: value.total,
        instance: instanceName,
      };
      switch (value.stage) {
        case "collect_instances":
          return t(
            "codex.sessionManager.repairModal.progress.collectInstances",
            "Đang thu thập phiên bản Codex...",
          );
        case "scan_instances":
          return t(
            "codex.sessionManager.repairModal.progress.scanInstances",
            "Đang chuẩn bị quét phiên bản...",
          );
        case "scan_instance":
          return t(
            "codex.sessionManager.repairModal.progress.scanInstance",
            "Đang quét {{instance}} ({{current}}/{{total}})...",
            values,
          );
        case "backup_instance":
          return t(
            "codex.sessionManager.repairModal.progress.backupInstance",
            "Đang sao lưu {{instance}} ({{current}}/{{total}})...",
            values,
          );
        case "write_instance":
          return t(
            "codex.sessionManager.repairModal.progress.writeInstance",
            "Đang ghi {{instance}} ({{current}}/{{total}})...",
            values,
          );
        case "write_sqlite_provider":
          return t(
            "codex.sessionManager.repairModal.progress.writeSqliteProvider",
            "Đang ghi hiển thị SQLite cho {{instance}}...",
            values,
          );
        case "write_rollout_files":
          return t(
            "codex.sessionManager.repairModal.progress.writeRolloutFiles",
            "Đang sửa thời gian tệp phiên cho {{instance}}...",
            values,
          );
        case "write_sqlite_timestamps":
          return t(
            "codex.sessionManager.repairModal.progress.writeSqliteTimestamps",
            "Đang sửa thời gian SQLite cho {{instance}}...",
            values,
          );
        case "write_session_index":
          return t(
            "codex.sessionManager.repairModal.progress.writeSessionIndex",
            "Đang ghi session_index...",
            values,
          );
        case "rebuild_metadata":
          return t(
            "codex.sessionManager.repairModal.progress.rebuildMetadata",
            "Đang làm mới trạng thái phiên chính thức cho {{instance}}...",
            values,
          );
        case "prune_backups":
          return t(
            "codex.sessionManager.repairModal.progress.pruneBackups",
            "Đang dọn bản sao lưu cũ...",
          );
        case "done":
          return t(
            "codex.sessionManager.repairModal.progress.done",
            "Đã sửa xong",
          );
        default:
          return t(
            "codex.sessionManager.repairModal.progress.queued",
            "Đang khởi động tác vụ sửa...",
          );
      }
    },
    [t],
  );

  const percent = clampRepairProgressPercent(progress?.percent);

  return (
    <div className="codex-visibility-repair-progress" role="status">
      <div className="codex-visibility-repair-progress__head">
        <strong>
          {t("codex.sessionManager.repairModal.progressTitle", "Tiến trình sửa")}
        </strong>
        <span>{percent}%</span>
      </div>
      <div className="codex-visibility-repair-progress__bar">
        <span style={{ width: `${percent}%` }} />
      </div>
      <div className="codex-api-switch-notice-repair-status is-loading">
        <RefreshCw size={14} className="loading-spinner" />
        <span>
          {progress
            ? resolveProgressMessage(progress)
            : t(
                "codex.sessionManager.repairModal.progress.queued",
                "Đang khởi động tác vụ sửa...",
              )}
        </span>
      </div>
    </div>
  );
}

export function CodexSessionVisibilityRepairModal({
  open,
  description,
  selectedSessionIds = [],
  totalSessionCount = 0,
  onClose,
  onRepaired,
  onRunningChange,
}: CodexSessionVisibilityRepairModalProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDivElement>(null);
  useModalFocusTrap(dialog, open);
  const repairSessionVisibilityAcrossInstances = useCodexInstanceStore(
    (state) => state.repairSessionVisibilityAcrossInstances,
  );
  const listSessionVisibilityRepairInstances = useCodexInstanceStore(
    (state) => state.listSessionVisibilityRepairInstances,
  );
  const listSessionVisibilityRepairProviders = useCodexInstanceStore(
    (state) => state.listSessionVisibilityRepairProviders,
  );
  const runIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<RepairStatus>("idle");
  const [selectedMode, setSelectedMode] =
    useState<CodexSessionVisibilityRepairMode>("quick");
  const [selectedInstanceScope, setSelectedInstanceScope] =
    useState<InstanceRepairScope>("target");
  const [selectedScope, setSelectedScope] = useState<RepairScope>("all");
  const [instanceList, setInstanceList] =
    useState<CodexSessionVisibilityRepairInstanceList | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [providerList, setProviderList] =
    useState<CodexSessionVisibilityRepairProviderList | null>(null);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [progress, setProgress] =
    useState<CodexSessionVisibilityRepairProgress | null>(null);
  const [previewSummary, setPreviewSummary] =
    useState<CodexSessionVisibilityRepairSummary | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [encryptedContentWarningVisible, setEncryptedContentWarningVisible] =
    useState(false);
  const {
    message: error,
    scrollKey: errorScrollKey,
    set: setError,
  } = useModalErrorState();

  const running = status === "running" || status === "previewing";
  const repairing = status === "running";
  const previewing = status === "previewing";
  const uniqueSelectedSessionIds = useMemo(
    () => Array.from(new Set(selectedSessionIds.filter(Boolean))),
    [selectedSessionIds],
  );
  const repairInstances = instanceList?.instances ?? [];
  const instanceOptions = useMemo<SingleSelectOption[]>(
    () =>
      repairInstances.map((instance) => {
        const name = instance.isDefault
          ? t("codex.sessionManager.repairModal.defaultInstance", "Phiên bản mặc định")
          : instance.name || instance.id;
        const runningLabel = instance.running
          ? ` · ${t("codex.sessionManager.repairModal.runningInstance", "Đang chạy")}`
          : "";
        return {
          value: instance.id,
          label: `${name}${runningLabel}`,
        };
      }),
    [repairInstances, t],
  );
  const canUseSelectedScope = uniqueSelectedSessionIds.length > 0;
  const providerOptions = useMemo<SingleSelectOption[]>(
    () =>
      (providerList?.providers ?? []).map((provider) => {
        const sources = provider.sources
          .map((source) =>
            t(
              `codex.sessionManager.repairModal.providerSource.${source}`,
              source,
            ),
          )
          .join(" / ");
        const defaultLabel = provider.isDefault
          ? ` · ${t("codex.sessionManager.repairModal.defaultProvider", "Mặc định")}`
          : "";
        return {
          value: provider.id,
          label: `${provider.id}${sources ? ` (${sources})` : ""}${defaultLabel}`,
        };
      }),
    [providerList, t],
  );
  const effectiveScope = canUseSelectedScope ? selectedScope : "all";
  const startDisabled =
    running ||
    loadingInstances ||
    loadingProviders ||
    !selectedInstanceId ||
    !selectedProvider ||
    (effectiveScope === "selected" && uniqueSelectedSessionIds.length === 0);
  const hasRunningRepairTarget = useMemo(() => {
    if (selectedMode !== "deep") return false;
    if (selectedInstanceScope === "all") {
      return repairInstances.some((instance) => instance.running);
    }
    return repairInstances.some(
      (instance) => instance.id === selectedInstanceId && instance.running,
    );
  }, [
    repairInstances,
    selectedInstanceId,
    selectedInstanceScope,
    selectedMode,
  ]);
  const repairDisabled = startDisabled || hasRunningRepairTarget;
  const hasPreview = previewSummary !== null;

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setSelectedMode("quick");
      setSelectedInstanceScope("target");
      setSelectedScope("all");
      setInstanceList(null);
      setSelectedInstanceId("");
      setProviderList(null);
      setSelectedProvider("");
      setLoadingInstances(false);
      setLoadingProviders(false);
      setProgress(null);
      setPreviewSummary(null);
      setResult(null);
      setEncryptedContentWarningVisible(false);
      setError(null);
      runIdRef.current = null;
      onRunningChange?.(false);
    }
  }, [onRunningChange, open, setError]);

  useEffect(() => {
    if (!open) return;
    setSelectedScope(uniqueSelectedSessionIds.length > 0 ? "selected" : "all");
  }, [open, uniqueSelectedSessionIds.length]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingInstances(true);
    void listSessionVisibilityRepairInstances()
      .then((nextInstanceList) => {
        if (cancelled) return;
        setInstanceList(nextInstanceList);
        const instances = nextInstanceList.instances ?? [];
        const preferred =
          instances.find(
            (instance) => instance.id === nextInstanceList.defaultInstanceId,
          )?.id ||
          nextInstanceList.defaultInstanceId ||
          instances[0]?.id ||
          "";
        setSelectedInstanceId((current) =>
          current && instances.some((instance) => instance.id === current)
            ? current
            : preferred,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          t("codex.sessionManager.repairModal.instanceLoadFailed", {
            defaultValue: "Không thể tải phiên bản: {{error}}",
            error: String(err).replace(/^Error:\s*/, ""),
          }),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInstances(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [listSessionVisibilityRepairInstances, open, setError, t]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoadingProviders(true);
    void listSessionVisibilityRepairProviders()
      .then((nextProviderList) => {
        if (cancelled) return;
        setProviderList(nextProviderList);
        const providers = nextProviderList.providers ?? [];
        const preferred =
          providers.find(
            (provider) => provider.id === nextProviderList.defaultProvider,
          )?.id ||
          nextProviderList.defaultProvider ||
          providers[0]?.id ||
          "";
        setSelectedProvider((current) =>
          current && providers.some((provider) => provider.id === current)
            ? current
            : preferred,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          t("codex.sessionManager.repairModal.providerLoadFailed", {
            defaultValue: "Không tải được provider: {{error}}",
            error: String(err).replace(/^Error:\s*/, ""),
          }),
        );
      })
      .finally(() => {
        if (!cancelled) setLoadingProviders(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listSessionVisibilityRepairProviders, open, setError, t]);

  useEffect(() => {
    if (!open) return;

    let disposed = false;
    let unlisten: UnlistenFn | null = null;
    void listen<CodexSessionVisibilityRepairProgress>(
      SESSION_VISIBILITY_REPAIR_PROGRESS_EVENT,
      (event) => {
        const payload = event.payload;
        if (!payload) return;
        if (payload.runId && payload.runId !== runIdRef.current) return;
        setProgress(payload);
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
  }, [open]);

  useEscCloseTopmost(open && !running, onClose, dialog);

  const closeModal = useCallback(() => {
    if (running) return;
    onClose();
  }, [onClose, running]);

  const clearPreview = useCallback(() => {
    if (running) return;
    setPreviewSummary(null);
    if (status === "previewed" || status === "success") {
      setStatus("idle");
      setResult(null);
      setProgress(null);
    }
  }, [running, status]);

  const buildRepairOptions = useCallback(
    (dryRun: boolean) => {
      const sessionIds =
        effectiveScope === "selected" ? uniqueSelectedSessionIds : null;
      const repairInstanceIds =
        selectedInstanceScope === "target" ? [selectedInstanceId] : null;
      return {
        mode: selectedMode,
        dryRun,
        targetInstanceId: selectedInstanceId,
        targetProvider: selectedProvider,
        repairInstanceIds,
        sessionIds,
      };
    },
    [
      effectiveScope,
      selectedInstanceScope,
      selectedInstanceId,
      selectedMode,
      selectedProvider,
      uniqueSelectedSessionIds,
    ],
  );

  const handlePreview = useCallback(async () => {
    if (running) return;
    const runId = createRepairRunId();
    runIdRef.current = runId;
    setStatus("previewing");
    setProgress(buildInitialProgress(runId, selectedMode));
    setPreviewSummary(null);
    setResult(null);
    setEncryptedContentWarningVisible(false);
    setError(null);
    onRunningChange?.(true);
    try {
      const summary = await repairSessionVisibilityAcrossInstances(
        runId,
        buildRepairOptions(true),
      );
      setPreviewSummary(summary);
      setEncryptedContentWarningVisible(
        Boolean(summary.encryptedContentWarning),
      );
      setResult(formatCodexSessionVisibilityRepairMessage(summary, t));
      setStatus("previewed");
      setProgress((current) =>
        current
          ? {
              ...current,
              stage: "done",
              percent: 100,
            }
          : null,
      );
    } catch (err) {
      setStatus("idle");
      setPreviewSummary(null);
      setError(
        t("codex.sessionManager.repairModal.previewFailedWithError", {
          defaultValue: "Xem trước sửa phiên thất bại: {{error}}",
          error: String(err).replace(/^Error:\s*/, ""),
        }),
      );
    } finally {
      onRunningChange?.(false);
    }
  }, [
    buildRepairOptions,
    onRunningChange,
    repairSessionVisibilityAcrossInstances,
    running,
    selectedMode,
    setError,
    t,
  ]);

  const handleRepair = useCallback(async () => {
    if (running) return;
    const runId = createRepairRunId();
    runIdRef.current = runId;
    setStatus("running");
    setProgress(buildInitialProgress(runId, selectedMode));
    setPreviewSummary(null);
    setResult(null);
    setEncryptedContentWarningVisible(false);
    setError(null);
    onRunningChange?.(true);
    try {
      const summary = await repairSessionVisibilityAcrossInstances(
        runId,
        buildRepairOptions(false),
      );
      setResult(formatCodexSessionVisibilityRepairMessage(summary, t));
      setEncryptedContentWarningVisible(
        Boolean(summary.encryptedContentWarning),
      );
      setStatus("success");
      setProgress((current) =>
        current
          ? {
              ...current,
              stage: "done",
              percent: 100,
            }
          : null,
      );
      await onRepaired?.(summary);
    } catch (err) {
      setStatus("idle");
      setError(
        t("codex.apiSwitchNotice.repairFailedWithError", {
          defaultValue: "Sửa hiển thị thất bại: {{error}}",
          error: String(err).replace(/^Error:\s*/, ""),
        }),
      );
    } finally {
      onRunningChange?.(false);
    }
  }, [
    buildRepairOptions,
    onRepaired,
    onRunningChange,
    repairSessionVisibilityAcrossInstances,
    running,
    selectedMode,
    setError,
    t,
  ]);

  if (!open) return null;

  return (
    <div className="modal-overlay codex-local-access-hide-confirm-overlay">
      <div
        ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label={t("codex.sessionManager.repairModal.title")}
        className="modal codex-local-access-hide-confirm-modal codex-api-switch-notice-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t("codex.sessionManager.repairModal.title", "Sửa lịch sử")}</h2>
          <button
            className="modal-close"
            onClick={closeModal}
            disabled={running}
            aria-label={t("common.close", "Đóng")}
          >
            <X />
          </button>
        </div>
        <div className="modal-body">
          <ModalErrorMessage message={error} scrollKey={errorScrollKey} />
          <p className="codex-local-access-hide-confirm-desc">
            {description ??
              t(
                "codex.sessionManager.repairModal.description",
                "Chuẩn hóa nhà cung cấp trong chỉ mục SQLite, danh mục phiên và không gian làm việc. Giữ nguyên từng byte của tệp rollout; chỉ sửa thời gian tệp. Tạo bản sao lưu cục bộ trước khi sửa.",
              )}
          </p>
          <div className="codex-visibility-repair-options">
            <div className="codex-visibility-repair-scope">
              <span className="codex-visibility-repair-scope__title">
                {t("codex.sessionManager.repairModal.modeTitle", "Chế độ sửa")}
              </span>
              <div className="codex-visibility-repair-scope__grid">
                <button
                  type="button"
                  className={`codex-visibility-repair-scope-card${
                    selectedMode === "quick" ? " is-selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedMode("quick");
                    clearPreview();
                  }}
                  disabled={running}
                  aria-pressed={selectedMode === "quick"}
                >
                  <strong>
                    {t(
                      "codex.sessionManager.repairModal.modeQuick",
                      "Sửa nhanh",
                    )}
                  </strong>
                  <small>
                    {t(
                      "codex.sessionManager.repairModal.modeQuickDesc",
                      "Chuẩn hóa nhà cung cấp trong cơ sở dữ liệu chính thức và chỉ mục phiên. Giữ nguyên tệp rollout. Phù hợp khi đổi tài khoản thông thường.",
                    )}
                  </small>
                </button>
                <button
                  type="button"
                  className={`codex-visibility-repair-scope-card${
                    selectedMode === "deep" ? " is-selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedMode("deep");
                    clearPreview();
                  }}
                  disabled={running}
                  aria-pressed={selectedMode === "deep"}
                >
                  <strong>
                    {t("codex.sessionManager.repairModal.modeDeep", "Sửa đầy đủ")}
                  </strong>
                  <small>
                    {t(
                      "codex.sessionManager.repairModal.modeDeepDesc",
                      "Sửa nhà cung cấp cũ, danh mục, không gian làm việc và chỉ mục tác nhân con. Giữ nguyên tệp rollout. Hãy đóng phiên bản đích trước.",
                    )}
                  </small>
                </button>
              </div>
            </div>
            <div className="codex-visibility-repair-field">
              <span>
                {t(
                  "codex.sessionManager.repairModal.targetProvider",
                  "Provider đích",
                )}
              </span>
              <SingleSelectDropdown
                value={selectedProvider}
                options={providerOptions}
                onChange={(value) => {
                  setSelectedProvider(value);
                  setError(null);
                  clearPreview();
                }}
                disabled={
                  running || loadingProviders || providerOptions.length === 0
                }
                placeholder={
                  loadingProviders
                    ? t(
                        "codex.sessionManager.repairModal.loadingProviders",
                        "Đang tải provider...",
                      )
                    : t(
                        "codex.sessionManager.repairModal.noProvider",
                        "Không tìm thấy provider",
                      )
                }
                ariaLabel={t(
                  "codex.sessionManager.repairModal.targetProvider",
                  "Provider đích",
                )}
                className="codex-visibility-repair-instance-select"
                menuClassName="codex-visibility-repair-instance-menu"
              />
            </div>
            <div className="codex-visibility-repair-field">
              <span>
                {t(
                  "codex.sessionManager.repairModal.targetInstance",
                  "Phiên bản đích",
                )}
              </span>
              <SingleSelectDropdown
                value={selectedInstanceId}
                options={instanceOptions}
                onChange={(value) => {
                  setSelectedInstanceId(value);
                  setError(null);
                  clearPreview();
                }}
                disabled={
                  running || loadingInstances || instanceOptions.length === 0
                }
                placeholder={
                  loadingInstances
                    ? t(
                        "codex.sessionManager.repairModal.loadingInstances",
                        "Đang tải phiên bản...",
                      )
                    : t(
                        "codex.sessionManager.repairModal.noInstance",
                        "Không tìm thấy phiên bản",
                      )
                }
                ariaLabel={t(
                  "codex.sessionManager.repairModal.targetInstance",
                  "Phiên bản đích",
                )}
                className="codex-visibility-repair-instance-select"
                menuClassName="codex-visibility-repair-instance-menu"
              />
            </div>
            <div className="codex-visibility-repair-scope">
              <span className="codex-visibility-repair-scope__title">
                {t(
                  "codex.sessionManager.repairModal.instanceScopeTitle",
                  "Phạm vi phiên bản",
                )}
              </span>
              <div className="codex-visibility-repair-scope__grid">
                <button
                  type="button"
                  className={`codex-visibility-repair-scope-card${
                    selectedInstanceScope === "target" ? " is-selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedInstanceScope("target");
                    clearPreview();
                  }}
                  disabled={running}
                  aria-pressed={selectedInstanceScope === "target"}
                >
                  <strong>
                    {t(
                      "codex.sessionManager.repairModal.instanceScopeTarget",
                      "Chỉ bản đích",
                    )}
                  </strong>
                  <small>
                    {t(
                      "codex.sessionManager.repairModal.instanceScopeTargetDesc",
                      "Chỉ sửa phiên bản đã chọn, thường nhanh hơn.",
                    )}
                  </small>
                </button>
                <button
                  type="button"
                  className={`codex-visibility-repair-scope-card${
                    selectedInstanceScope === "all" ? " is-selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedInstanceScope("all");
                    clearPreview();
                  }}
                  disabled={running}
                  aria-pressed={selectedInstanceScope === "all"}
                >
                  <strong>
                    {t(
                      "codex.sessionManager.repairModal.instanceScopeAll",
                      "Tất cả phiên bản",
                    )}
                  </strong>
                  <small>
                    {t(
                      "codex.sessionManager.repairModal.instanceScopeAllDesc",
                      "Sửa mọi phiên bản Codex khi khôi phục nhiều phiên bản.",
                    )}
                  </small>
                </button>
              </div>
            </div>
            <div className="codex-visibility-repair-scope">
              <span className="codex-visibility-repair-scope__title">
                {t("codex.sessionManager.repairModal.scopeTitle", "Phạm vi phiên")}
              </span>
              <div className="codex-visibility-repair-scope__grid">
                <button
                  type="button"
                  className={`codex-visibility-repair-scope-card${
                    effectiveScope === "all" ? " is-selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedScope("all");
                    clearPreview();
                  }}
                  disabled={running}
                  aria-pressed={effectiveScope === "all"}
                >
                  <strong>
                    {t("codex.sessionManager.repairModal.scopeAll", "Tất cả phiên")}
                  </strong>
                  <small>
                    {t("codex.sessionManager.repairModal.scopeAllDesc", {
                      defaultValue: "Sửa {{count}} phiên trong danh sách hiện tại.",
                      count: totalSessionCount,
                    })}
                  </small>
                </button>
                <button
                  type="button"
                  className={`codex-visibility-repair-scope-card${
                    effectiveScope === "selected" ? " is-selected" : ""
                  }`}
                  onClick={() => {
                    setSelectedScope("selected");
                    clearPreview();
                  }}
                  disabled={running || !canUseSelectedScope}
                  aria-pressed={effectiveScope === "selected"}
                >
                  <strong>
                    {t(
                      "codex.sessionManager.repairModal.scopeSelected",
                      "Phiên đã chọn",
                    )}
                  </strong>
                  <small>
                    {canUseSelectedScope
                      ? t(
                          "codex.sessionManager.repairModal.scopeSelectedDesc",
                          {
                            defaultValue: "Chỉ sửa {{count}} phiên đã chọn.",
                            count: uniqueSelectedSessionIds.length,
                          },
                        )
                      : t(
                          "codex.sessionManager.repairModal.scopeSelectedEmpty",
                          "Hãy chọn phiên trong danh sách trước.",
                        )}
                  </small>
                </button>
              </div>
            </div>
          </div>
          {running && (
            <CodexSessionVisibilityRepairProgressView progress={progress} />
          )}
          {hasRunningRepairTarget && !running && (
            <div className="codex-api-switch-notice-repair-status is-warning">
              <span>
                {t(
                  "codex.sessionManager.repairModal.stopInstanceHint",
                  "Hãy thoát hoàn toàn phiên bản Codex App/ChatGPT đã chọn trước khi sửa đầy đủ. Bạn vẫn có thể xem trước thay đổi.",
                )}
              </span>
            </div>
          )}
          {status === "success" && result && (
            <div className="codex-api-switch-notice-repair-status is-success">
              <Check size={14} />
              <span>{result}</span>
            </div>
          )}
          {status === "previewed" && result && (
            <div className="codex-api-switch-notice-repair-status is-preview">
              <Search size={14} />
              <span>{result}</span>
            </div>
          )}
          {encryptedContentWarningVisible && (
            <div className="codex-api-switch-notice-repair-status is-warning">
              <span>
                {t(
                  "codex.sessionManager.repairModal.encryptedContentWarning",
                  "Đã phát hiện lịch sử được mã hóa bởi nhà cung cấp hoặc tài khoản khác. Có thể di chuyển siêu dữ liệu, nhưng việc tiếp tục hoặc nén các phiên đó vẫn có thể thất bại; hãy quay lại nhà cung cấp/tài khoản gốc hoặc mở phiên mới.",
                )}
              </span>
            </div>
          )}
        </div>
        <div className="modal-footer codex-api-switch-notice-footer">
          <button
            className="btn btn-secondary"
            onClick={closeModal}
            disabled={running}
          >
            {t("common.close", "Đóng")}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => void handlePreview()}
            disabled={startDisabled}
          >
            <Search
              size={14}
              className={previewing ? "icon-spin" : undefined}
            />
            {previewing
              ? t("codex.sessionManager.repairModal.previewing", "Đang xem trước...")
              : hasPreview
                ? t("codex.sessionManager.repairModal.previewAgain", "Xem trước lại")
                : t("codex.sessionManager.repairModal.preview", "Xem trước thay đổi")}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => void handleRepair()}
            disabled={repairDisabled}
          >
            <RefreshCw
              size={14}
              className={repairing ? "icon-spin" : undefined}
            />
            {repairing
              ? t("codex.sessionManager.repairModal.running", "Đang sửa...")
              : hasPreview
                ? t(
                    "codex.sessionManager.repairModal.confirmRepair",
                    "Xác nhận sửa",
                  )
                : t("codex.sessionManager.repairModal.start", "Sửa")}
          </button>
        </div>
      </div>
    </div>
  );
}
