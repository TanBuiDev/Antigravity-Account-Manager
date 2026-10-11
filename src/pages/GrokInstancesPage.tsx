import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  CircleCheck,
  CircleX,
  Copy,
  FolderOpen,
  Play,
  RefreshCw,
  Terminal,
  X,
} from 'lucide-react';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { useTranslation } from 'react-i18next';
import { PlatformInstancesContent } from '../components/platform/PlatformInstancesContent';
import { DosageNotifyQuotaPreview } from '../components/platform/DosageNotifyQuotaPreview';
import { ModalErrorMessage } from '../components/ModalErrorMessage';
import { SingleSelectDropdown } from '../components/SingleSelectDropdown';
import { useEscClose } from '../hooks/useEscClose';
import { useLaunchTerminalOptions } from '../hooks/useLaunchTerminalOptions';
import { usePlatformRuntimeSupport } from '../hooks/usePlatformRuntimeSupport';
import * as grokInstanceService from '../services/grokInstanceService';
import type { GrokCliStatus } from '../services/grokInstanceService';
import * as grokService from '../services/grokService';
import { useGrokAccountStore } from '../stores/useGrokAccountStore';
import { useGrokInstanceStore } from '../stores/useGrokInstanceStore';
import {
  getGrokAccountDisplayEmail,
  getGrokPlanBadge,
  getGrokUsage,
  type GrokAccount,
} from '../types/grok';
import type { InstanceProfile } from '../types/instance';

interface GrokInstancesContentProps {
  accountsForSelect?: GrokAccount[];
}

interface GrokLaunchModalState {
  instanceId: string;
  instanceName: string;
  accountId: string | null;
  workingDir: string;
  switchMessage: string;
  launchCommand: string;
  regeneratingCommand: boolean;
  copied: boolean;
  executing: boolean;
  executeMessage: string | null;
  executeError: string | null;
  errorScrollKey: number;
}

function resolveGrokLaunchWorkingDir(
  instance: InstanceProfile,
  accountMap: Map<string, GrokAccount>,
): { accountId: string | null; workingDir: string } {
  // 无全局当前账号：仅使用实例显式绑定的账号。
  const boundAccountId = instance.bindAccountId?.trim() || null;
  if (boundAccountId) {
    const bound = accountMap.get(boundAccountId);
    const accountDir = bound?.working_dir?.trim() || '';
    if (accountDir) {
      return { accountId: boundAccountId, workingDir: accountDir };
    }
    return {
      accountId: boundAccountId,
      workingDir: instance.workingDir?.trim() || '',
    };
  }

  return {
    accountId: null,
    workingDir: instance.workingDir?.trim() || '',
  };
}

const GROK_CLI_INSTALL_COMMAND_UNIX =
  'curl -fsSL https://x.ai/cli/install.sh | bash';
const GROK_CLI_INSTALL_COMMAND_WINDOWS =
  'irm https://x.ai/cli/install.ps1 | iex';

function getGrokCliInstallCommand(): string {
  if (typeof navigator === 'undefined') {
    return GROK_CLI_INSTALL_COMMAND_UNIX;
  }
  const platform = `${navigator.platform || ''} ${navigator.userAgent || ''}`;
  return /win/i.test(platform)
    ? GROK_CLI_INSTALL_COMMAND_WINDOWS
    : GROK_CLI_INSTALL_COMMAND_UNIX;
}

export function GrokInstancesContent({
  accountsForSelect,
}: GrokInstancesContentProps = {}) {
  const { t, i18n } = useTranslation();
  const accountStore = useGrokAccountStore();
  const instanceStore = useGrokInstanceStore();
  const accounts = accountsForSelect ?? accountStore.accounts;
  const isSupported = usePlatformRuntimeSupport('desktop');
  const grokCliInstallCommand = useMemo(() => getGrokCliInstallCommand(), []);
  const [launchModal, setLaunchModal] = useState<GrokLaunchModalState | null>(
    null,
  );
  const [cliStatus, setCliStatus] = useState<GrokCliStatus | null>(null);
  const [cliPath, setCliPath] = useState('');
  const [cliModalOpen, setCliModalOpen] = useState(false);
  const [cliStatusLoading, setCliStatusLoading] = useState(false);
  const [cliSaving, setCliSaving] = useState(false);
  const [cliError, setCliError] = useState<string | null>(null);
  const [cliErrorScrollKey, setCliErrorScrollKey] = useState(0);
  const [cliActionError, setCliActionError] = useState<string | null>(null);
  const [cliActionErrorScrollKey, setCliActionErrorScrollKey] = useState(0);
  const [installCommandCopied, setInstallCommandCopied] = useState(false);
  const [installExecuting, setInstallExecuting] = useState(false);
  const [installOpened, setInstallOpened] = useState(false);
  const [retryInstanceId, setRetryInstanceId] = useState<string | null>(null);
  const { terminalOptions, selectedTerminal, setSelectedTerminal } =
    useLaunchTerminalOptions();

  useEscClose(!!launchModal, () => setLaunchModal(null));
  useEscClose(cliModalOpen, () => {
    setCliModalOpen(false);
    setCliError(null);
    setCliActionError(null);
    setInstallCommandCopied(false);
    setInstallExecuting(false);
    setInstallOpened(false);
    setRetryInstanceId(null);
  });

  const applyCliStatus = useCallback((status: GrokCliStatus) => {
    setCliStatus(status);
    setCliPath(status.configuredPath || '');
  }, []);

  const reportCliError = useCallback((message: string) => {
    setCliError(message);
    setCliErrorScrollKey((current) => current + 1);
  }, []);

  const reportCliActionError = useCallback((message: string) => {
    setCliActionError(message);
    setCliActionErrorScrollKey((current) => current + 1);
  }, []);

  const resolveCliUnavailableMessage = useCallback(
    (status: GrokCliStatus) => {
      const configuredPath = status.configuredPath?.trim();
      return configuredPath
        ? t(
            'grok.instances.cliPathInvalid',
            "Đường dẫn Grok CLI đã cấu hình không hợp lệ: {{path}}",
            { path: configuredPath },
          )
        : t(
            'quickSettings.grok.cliMissing',
            "Không tìm thấy Grok CLI. Hãy nhập đường dẫn riêng.",
          );
    },
    [t],
  );

  const loadCliStatus = useCallback(
    async (showError: boolean) => {
      setCliStatusLoading(true);
      if (showError) {
        setCliError(null);
        setCliActionError(null);
      }
      try {
        const status = await grokInstanceService.getGrokCliStatus();
        applyCliStatus(status);
        return status;
      } catch (error) {
        if (showError) reportCliError(String(error));
        return null;
      } finally {
        setCliStatusLoading(false);
      }
    },
    [applyCliStatus, reportCliError],
  );

  useEffect(() => {
    void loadCliStatus(false);
  }, [loadCliStatus]);

  const accountMap = useMemo(() => {
    const map = new Map<string, GrokAccount>();
    accounts.forEach((account) => map.set(account.id, account));
    return map;
  }, [accounts]);

  const handleInstanceStarted = async (instance: InstanceProfile) => {
    const { accountId, workingDir } = resolveGrokLaunchWorkingDir(
      instance,
      accountMap,
    );
    const boundAccount = accountId ? accountMap.get(accountId) : undefined;
    const instanceName = instance.isDefault
      ? t('instances.defaultName', "Phiên bản mặc định")
      : instance.name || t('instances.defaultName', "Phiên bản mặc định");
    try {
      const launchInfo = await grokInstanceService.getGrokInstanceLaunchCommand(
        instance.id,
        {
          workingDir,
          applyWorkingDirOverride: true,
          accountId,
        },
      );
      setLaunchModal({
        instanceId: instance.id,
        instanceName,
        accountId,
        workingDir,
        switchMessage: boundAccount
          ? t(
              'grok.instances.accountHomeReady',
              'Đã chuẩn bị thư mục riêng: {{email}}',
              {
                email: getGrokAccountDisplayEmail(boundAccount),
              },
            )
          : t('instances.messages.launchPrepared', "Lệnh khởi chạy đã sẵn sàng"),
        launchCommand: launchInfo.launchCommand,
        regeneratingCommand: false,
        copied: false,
        executing: false,
        executeMessage: null,
        // 账号授权类问题只体现在账号列表，启动弹框不展示
        executeError: null,
        errorScrollKey: 0,
      });
      void accountStore.fetchAccounts();
    } catch (error) {
      const message = String(error);
      setLaunchModal({
        instanceId: instance.id,
        instanceName,
        accountId,
        workingDir,
        switchMessage: boundAccount
          ? t('accounts.switched', "Đã chuyển sang {{email}}", {
              email: getGrokAccountDisplayEmail(boundAccount),
            })
          : t('instances.messages.launchPrepared', "Lệnh khởi chạy đã sẵn sàng"),
        launchCommand: '',
        regeneratingCommand: false,
        copied: false,
        executing: false,
        executeMessage: null,
        executeError: grokInstanceService.isGrokReauthError(message)
          ? null
          : message,
        errorScrollKey: grokInstanceService.isGrokReauthError(message) ? 0 : 1,
      });
      if (grokInstanceService.isGrokReauthError(message)) {
        void accountStore.fetchAccounts();
      }
    }
  };

  const handleInstanceStartError = useCallback(
    async (_error: unknown, instance: InstanceProfile) => {
      let status: GrokCliStatus;
      try {
        status = await grokInstanceService.getGrokCliStatus();
      } catch {
        return false;
      }
      applyCliStatus(status);
      if (status.available) return false;

      setRetryInstanceId(instance.id);
      setCliModalOpen(true);
      reportCliError(resolveCliUnavailableMessage(status));
      return true;
    },
    [applyCliStatus, reportCliError, resolveCliUnavailableMessage],
  );

  const closeCliModal = () => {
    setCliModalOpen(false);
    setCliError(null);
    setCliActionError(null);
    setInstallCommandCopied(false);
    setInstallExecuting(false);
    setInstallOpened(false);
    setRetryInstanceId(null);
  };

  const openCliModal = () => {
    setRetryInstanceId(null);
    setCliError(null);
    setCliActionError(null);
    setInstallCommandCopied(false);
    setInstallExecuting(false);
    setInstallOpened(false);
    setCliModalOpen(true);
    void loadCliStatus(true);
  };

  const handleSaveCliPath = async () => {
    if (cliSaving || installExecuting) return;
    setCliSaving(true);
    setCliError(null);
    setCliActionError(null);
    try {
      const status = await grokInstanceService.updateGrokCliRuntimeConfig(
        cliPath,
      );
      applyCliStatus(status);
      if (!status.available) {
        reportCliError(resolveCliUnavailableMessage(status));
        return;
      }

      if (!retryInstanceId) return;
      try {
        const startedInstance = await instanceStore.startInstance(
          retryInstanceId,
        );
        await handleInstanceStarted(startedInstance);
        setRetryInstanceId(null);
        setCliModalOpen(false);
      } catch (error) {
        reportCliError(String(error));
      }
    } catch (error) {
      reportCliError(String(error));
    } finally {
      setCliSaving(false);
    }
  };

  const cliStatusText = cliStatus?.available
    ? t('quickSettings.grok.cliDetected', "Đã phát hiện: {{version}} · {{path}}", {
        version: cliStatus.version || '--',
        path: cliStatus.binaryPath || '--',
      })
    : t(
        'quickSettings.grok.cliMissing',
        "Không tìm thấy Grok CLI. Hãy nhập đường dẫn riêng.",
      );
  const showLaunchInstallGuide = Boolean(
    launchModal?.executeError &&
      grokInstanceService.isGrokCliMissingError(launchModal.executeError),
  );

  const handleCopyInstallCommand = async () => {
    setCliActionError(null);
    setInstallCommandCopied(false);
    try {
      await navigator.clipboard.writeText(grokCliInstallCommand);
      setInstallCommandCopied(true);
      window.setTimeout(() => setInstallCommandCopied(false), 1200);
    } catch {
      reportCliActionError(
        t('common.shared.export.copyFailed', "Sao chép thất bại, vui lòng sao chép thủ công"),
      );
    }
  };

  const handleExecuteInstallCommand = async () => {
    if (installExecuting) return;
    setCliActionError(null);
    setInstallOpened(false);
    setInstallExecuting(true);
    try {
      await grokInstanceService.executeGrokCliInstallCommand(selectedTerminal);
      setInstallOpened(true);
    } catch (error) {
      reportCliActionError(String(error));
    } finally {
      setInstallExecuting(false);
    }
  };

  const handleInstallTerminalChange = (terminal: string) => {
    setSelectedTerminal(terminal);
    setCliActionError(null);
    setInstallOpened(false);
  };

  const persistLaunchWorkingDir = useCallback(
    async (accountId: string | null, workingDir: string) => {
      if (!accountId) return;
      await grokService.updateGrokAccountWorkingDir(
        accountId,
        workingDir.trim() || null,
      );
      await accountStore.fetchAccounts();
    },
    [accountStore],
  );

  const regenerateLaunchCommand = useCallback(
    async (modal: GrokLaunchModalState, workingDir: string) => {
      setLaunchModal((current) =>
        current && current.instanceId === modal.instanceId
          ? {
              ...current,
              workingDir,
              regeneratingCommand: true,
              executeError: null,
              executeMessage: null,
            }
          : current,
      );
      try {
        const launchInfo =
          await grokInstanceService.getGrokInstanceLaunchCommand(
            modal.instanceId,
            {
              workingDir,
              applyWorkingDirOverride: true,
              accountId: modal.accountId,
            },
          );
        setLaunchModal((current) =>
          current && current.instanceId === modal.instanceId
            ? {
                ...current,
                workingDir,
                launchCommand: launchInfo.launchCommand,
                regeneratingCommand: false,
                executeError: null,
              }
            : current,
        );
        void accountStore.fetchAccounts();
      } catch (error) {
        const message = String(error);
        setLaunchModal((current) =>
          current && current.instanceId === modal.instanceId
            ? {
                ...current,
                workingDir,
                regeneratingCommand: false,
                executeError: grokInstanceService.isGrokReauthError(message)
                  ? null
                  : message,
                errorScrollKey: grokInstanceService.isGrokReauthError(message)
                  ? current.errorScrollKey
                  : current.errorScrollKey + 1,
              }
            : current,
        );
        if (grokInstanceService.isGrokReauthError(message)) {
          void accountStore.fetchAccounts();
        }
      }
    },
    [accountStore],
  );

  const updateLaunchWorkingDir = (value: string) => {
    setLaunchModal((current) =>
      current
        ? {
            ...current,
            workingDir: value,
            launchCommand: '',
            executeError: null,
            executeMessage: null,
          }
        : current,
    );
  };

  const handleChooseLaunchWorkingDir = async () => {
    if (!launchModal || launchModal.executing || launchModal.regeneratingCommand)
      return;
    const selected = await openFileDialog({
      directory: true,
      multiple: false,
      title: t('grok.instances.selectWorkingDir', "Chọn thư mục làm việc Grok CLI"),
    });
    if (!selected || typeof selected !== 'string') return;
    try {
      await persistLaunchWorkingDir(launchModal.accountId, selected);
      await regenerateLaunchCommand(launchModal, selected);
    } catch (error) {
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executeError: String(error),
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
    }
  };

  const handleLaunchWorkingDirBlur = async () => {
    if (!launchModal || launchModal.executing || launchModal.regeneratingCommand)
      return;
    const nextWorkingDir = launchModal.workingDir.trim();
    try {
      await regenerateLaunchCommand(launchModal, nextWorkingDir);
    } catch (error) {
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executeError: String(error),
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
    }
  };

  const ensureLaunchCommandReady = async (
    modal: GrokLaunchModalState,
  ): Promise<GrokLaunchModalState | null> => {
    if (modal.launchCommand.trim() && !modal.regeneratingCommand) {
      return modal;
    }
    try {
      await persistLaunchWorkingDir(modal.accountId, modal.workingDir);
      const launchInfo = await grokInstanceService.getGrokInstanceLaunchCommand(
        modal.instanceId,
        {
          workingDir: modal.workingDir,
          applyWorkingDirOverride: true,
          accountId: modal.accountId,
        },
      );
      const next: GrokLaunchModalState = {
        ...modal,
        launchCommand: launchInfo.launchCommand,
        regeneratingCommand: false,
        executeError: null,
      };
      setLaunchModal((current) =>
        current && current.instanceId === modal.instanceId ? next : current,
      );
      return next;
    } catch (error) {
      setLaunchModal((current) =>
        current && current.instanceId === modal.instanceId
          ? {
              ...current,
              regeneratingCommand: false,
              executeError: String(error),
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
      return null;
    }
  };

  const handleCopyLaunchCommand = async () => {
    if (!launchModal) return;
    const prepared = await ensureLaunchCommandReady(launchModal);
    if (!prepared?.launchCommand) return;
    try {
      await navigator.clipboard.writeText(prepared.launchCommand);
      setLaunchModal((current) =>
        current ? { ...current, copied: true, executeError: null } : current,
      );
      window.setTimeout(() => {
        setLaunchModal((current) =>
          current ? { ...current, copied: false } : current,
        );
      }, 1200);
    } catch {
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executeError: t(
                'common.shared.export.copyFailed',
                "Sao chép thất bại, vui lòng sao chép thủ công",
              ),
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
    }
  };

  const handleExecuteInTerminal = async () => {
    if (!launchModal || launchModal.executing || launchModal.regeneratingCommand)
      return;
    setLaunchModal((current) =>
      current
        ? {
            ...current,
            executing: true,
            executeError: null,
            executeMessage: null,
          }
        : current,
    );
    try {
      const prepared = await ensureLaunchCommandReady(launchModal);
      if (!prepared) {
        setLaunchModal((current) =>
          current ? { ...current, executing: false } : current,
        );
        return;
      }
      const result = await grokInstanceService.executeGrokInstanceLaunchCommand(
        prepared.instanceId,
        selectedTerminal,
        {
          workingDir: prepared.workingDir,
          applyWorkingDirOverride: true,
          accountId: prepared.accountId,
        },
      );
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executing: false,
              launchCommand: prepared.launchCommand,
              executeMessage: result,
            }
          : current,
      );
    } catch (error) {
      const message = String(error);
      void loadCliStatus(false);
      setLaunchModal((current) =>
        current
          ? {
              ...current,
              executing: false,
              executeError: message,
              errorScrollKey: current.errorScrollKey + 1,
            }
          : current,
      );
    }
  };

  const handleTerminalChange = (terminal: string) => {
    setSelectedTerminal(terminal);
    setCliActionError(null);
    setInstallOpened(false);
    setLaunchModal((current) =>
      current
        ? { ...current, executeError: null, executeMessage: null }
        : current,
    );
  };

  const renderGrokCliInstallGuide = (
    controlsDisabled: boolean,
    hintText = t(
      'grok.instances.installHint',
      "Chạy lệnh chính thức sau trong terminal, rồi nhấn Làm mới sau khi cài đặt xong.",
    ),
  ) => (
    <div className="grok-cli-install-guide">
      <strong>
        {t('grok.instances.installCommand', "Lệnh cài đặt chính thức")}
      </strong>
      <p>{hintText}</p>
      <div className="grok-cli-install-command">
        <code>{grokCliInstallCommand}</code>
        <button
          type="button"
          className="btn btn-secondary icon-only"
          onClick={() => void handleCopyInstallCommand()}
          title={
            installCommandCopied
              ? t('common.success', "Thành công")
              : t('common.copy', "Copy​")
          }
          aria-label={t('common.copy', "Copy​")}
        >
          {installCommandCopied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div className="grok-cli-install-actions">
        <div className="grok-cli-install-terminal">
          <label>{t('instances.launchDialog.terminal', "Cửa sổ lệnh")}</label>
          <SingleSelectDropdown
            value={selectedTerminal}
            onChange={handleInstallTerminalChange}
            options={terminalOptions}
            disabled={controlsDisabled || installExecuting}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void handleExecuteInstallCommand()}
          disabled={controlsDisabled || installExecuting}
        >
          <Play size={14} />
          {installExecuting
            ? t('common.loading', "Đang tải...")
            : t('grok.instances.runInTerminal', "Chạy trong terminal")}
        </button>
      </div>
      {installOpened && (
        <div className="add-status success">
          <Check size={14} />
          <span>{t('common.success', "Thành công")}</span>
        </div>
      )}
      <ModalErrorMessage
        message={cliActionError}
        scrollKey={cliActionErrorScrollKey}
      />
    </div>
  );

  return (
    <>
      <PlatformInstancesContent<GrokAccount>
        instanceStore={instanceStore}
        accounts={accounts}
        fetchAccounts={accountStore.fetchAccounts}
        renderAccountQuotaPreview={(account) => (
          <DosageNotifyQuotaPreview
            usage={getGrokUsage(account)}
            locale={i18n.language || 'zh-CN'}
            emptyText={t('instances.quota.empty', "Không có hạn ngạch trong bộ nhớ đệm")}
            normalText={t('grok.usageNormal', "Ổn định")}
            abnormalText={t('grok.usageAbnormal', "Bất thường")}
            abnormalDisplay="short"
          />
        )}
        renderAccountBadge={(account) => (
          <span className="instance-plan-badge">
            {getGrokPlanBadge(account) || t('common.none', "None​")}
          </span>
        )}
        getAccountDisplayText={getGrokAccountDisplayEmail}
        getAccountSearchText={(account) =>
          [
            getGrokAccountDisplayEmail(account),
            account.first_name,
            account.last_name,
            account.principal_id,
            account.team_id,
            getGrokPlanBadge(account) || t('common.none', "None​"),
          ]
            .filter(Boolean)
            .join(' ')
        }
        appType="grok"
        isSupported={isSupported}
        unsupportedTitleKey="common.shared.instances.unsupported.title"
        unsupportedTitleDefault="Hệ điều hành hiện chưa được hỗ trợ"
        unsupportedDescKey="grok.instances.unsupported"
        unsupportedDescDefault="Chạy nhiều phiên Grok CLI chỉ được hỗ trợ trên macOS, Windows và Linux."
        onInstanceStarted={handleInstanceStarted}
        onInstanceStartError={handleInstanceStartError}
        resolveStartSuccessMessage={() =>
          t('instances.messages.launchPrepared', "Lệnh khởi chạy đã sẵn sàng")
        }
        toolbarExtraActions={
          <button
            type="button"
            className={`btn btn-secondary grok-cli-status-button${
              cliStatus?.available ? ' is-ready' : ' is-missing'
            }`}
            onClick={openCliModal}
            title={cliStatusText}
            aria-label={t('quickSettings.grok.title', "Cài đặt Grok CLI")}
          >
            <Terminal size={14} />
            <span>
              {cliStatusLoading
                ? t('common.loading', "Đang tải...")
                : cliStatus?.available
                  ? cliStatus.version ||
                    t('grok.instances.cliReady', "Đã phát hiện")
                  : t('grok.instances.cliMissingShort', "Chưa phát hiện")}
            </span>
          </button>
        }
      />

      {cliModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal grok-cli-settings-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <button
                className="btn btn-secondary icon-only"
                onClick={closeCliModal}
                title={t('common.back', "Quay lại")}
                aria-label={t('common.back', "Quay lại")}
              >
                <ChevronLeft size={14} />
              </button>
              <h2>{t('quickSettings.grok.title', "Cài đặt Grok CLI")}</h2>
              <button
                className="modal-close"
                onClick={closeCliModal}
                aria-label={t('common.close', "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div
                className={`grok-cli-runtime-status${
                  cliStatus?.available ? ' is-ready' : ' is-missing'
                }`}
              >
                {cliStatus?.available ? (
                  <CircleCheck size={18} />
                ) : (
                  <CircleX size={18} />
                )}
                <span>{cliStatusText}</span>
                <button
                  type="button"
                  className="btn btn-secondary icon-only"
                  onClick={() => void loadCliStatus(true)}
                  disabled={cliStatusLoading || cliSaving || installExecuting}
                  title={t('common.refresh', "Làm mới")}
                  aria-label={t('common.refresh', "Làm mới")}
                >
                  <RefreshCw
                    size={14}
                    className={cliStatusLoading ? 'icon-spin' : ''}
                  />
                </button>
              </div>
              {cliStatus && !cliStatus.available &&
                renderGrokCliInstallGuide(cliSaving)}
              <div className="form-group">
                <label>{t('quickSettings.grok.cliPath', "Đường dẫn CLI")}</label>
                <input
                  className="form-input"
                  value={cliPath}
                  placeholder={cliStatus?.binaryPath || '~/.grok/bin/grok'}
                  onChange={(event) => {
                    setCliPath(event.target.value);
                    setCliError(null);
                  }}
                  disabled={cliSaving || installExecuting}
                  autoFocus
                />
                <ModalErrorMessage
                  message={cliError}
                  scrollKey={cliErrorScrollKey}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeCliModal}
                disabled={cliSaving || installExecuting}
              >
                {t('common.cancel', "Hủy")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleSaveCliPath()}
                disabled={cliSaving || installExecuting}
              >
                {cliSaving
                  ? t('common.loading', "Đang tải...")
                  : retryInstanceId
                    ? t('grok.instances.saveAndRetry', "Lưu và thử lại")
                    : t('common.save', "Lưu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {launchModal && (
        <div className="modal-overlay">
          <div
            className="modal modal-lg grok-launch-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <button
                className="btn btn-secondary icon-only"
                onClick={() => setLaunchModal(null)}
                title={t('common.back', "Quay lại")}
                aria-label={t('common.back', "Quay lại")}
              >
                <ChevronLeft size={14} />
              </button>
              <h2>{t('grok.instances.launchDialogTitle', "Chạy phiên bản")}</h2>
              <button
                className="modal-close"
                onClick={() => setLaunchModal(null)}
                aria-label={t('common.close', "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div className="add-status success">
                <Check size={16} />
                <span>{launchModal.switchMessage}</span>
              </div>
              <ModalErrorMessage
                message={launchModal.executeError}
                scrollKey={launchModal.errorScrollKey}
              />
              {showLaunchInstallGuide &&
                renderGrokCliInstallGuide(
                  launchModal.executing,
                  t(
                    'grok.instances.installLaunchHint',
                    'Bạn có thể chạy lệnh chính thức dưới đây trong terminal, sau khi cài đặt hãy nhấp chạy trong terminal lần nữa.',
                  ),
                )}
              <div className="form-group">
                <label>{t('instances.columns.instance', "Phiên bản")}</label>
                <input
                  className="form-input"
                  value={launchModal.instanceName}
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>{t('instances.form.workingDir', "Thư mục làm việc")}</label>
                <div className="grok-launch-working-dir-row">
                  <input
                    className="form-input"
                    value={launchModal.workingDir}
                    placeholder={t(
                      'instances.form.workingDirPlaceholder',
                      "Mặc định dùng đường dẫn hiện tại",
                    )}
                    onChange={(event) =>
                      updateLaunchWorkingDir(event.target.value)
                    }
                    onBlur={() => void handleLaunchWorkingDirBlur()}
                    disabled={
                      launchModal.executing || launchModal.regeneratingCommand
                    }
                  />
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => void handleChooseLaunchWorkingDir()}
                    disabled={
                      launchModal.executing || launchModal.regeneratingCommand
                    }
                    title={t(
                      'grok.instances.selectWorkingDir',
                      "Chọn thư mục làm việc Grok CLI",
                    )}
                    aria-label={t(
                      'grok.instances.selectWorkingDir',
                      "Chọn thư mục làm việc Grok CLI",
                    )}
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
                <p className="form-hint">
                  {launchModal.accountId
                    ? t(
                        'grok.instances.workingDirAccountHint',
                        "Thư mục làm việc được gắn với tài khoản này và sẽ được khôi phục lần khởi chạy sau.",
                      )
                    : t(
                        'instances.form.workingDirDesc',
                        "Khi khởi động sẽ chuyển vào thư mục này trước",
                      )}
                </p>
              </div>
              <div className="form-group">
                <label>{t('instances.launchDialog.command', "Lệnh khởi chạy")}</label>
                <textarea
                  className="form-input instance-args-input"
                  value={launchModal.launchCommand}
                  placeholder={
                    launchModal.regeneratingCommand
                      ? t('common.loading', "Đang tải...")
                      : t(
                          'grok.instances.launchCommandPlaceholder',
                          "Chọn hoặc xác nhận thư mục để tạo lệnh khởi chạy",
                        )
                  }
                  readOnly
                />
                <p className="form-hint">
                  {t(
                    'grok.instances.launchHint',
                    "Sao chép lệnh để chạy thủ công hoặc thực thi trực tiếp trong terminal.",
                  )}
                </p>
              </div>
              <div className="form-group">
                <label>{t('instances.launchDialog.terminal', "Cửa sổ lệnh")}</label>
                <SingleSelectDropdown
                  value={selectedTerminal}
                  onChange={handleTerminalChange}
                  options={terminalOptions}
                  disabled={
                    launchModal.executing || launchModal.regeneratingCommand
                  }
                  ariaLabel={t('instances.launchDialog.terminal', "Cửa sổ lệnh")}
                />
              </div>
              {launchModal.executeMessage && (
                <div className="add-status success">
                  <Check size={16} />
                  <span>{launchModal.executeMessage}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => void handleCopyLaunchCommand()}
                disabled={
                  launchModal.executing || launchModal.regeneratingCommand
                }
              >
                <Copy size={16} />
                {launchModal.copied
                  ? t('common.success', "Thành công")
                  : t('common.copy', "Copy​")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleExecuteInTerminal()}
                disabled={
                  launchModal.executing || launchModal.regeneratingCommand
                }
              >
                <Play size={16} />
                {launchModal.executing
                  ? t('common.loading', "Đang tải...")
                  : t('grok.instances.runInTerminal', "Chạy trong terminal")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
