import { useMemo, useState } from 'react';
import { Check, ChevronLeft, Copy, Play, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PlatformInstancesContent } from '../components/platform/PlatformInstancesContent';
import { SingleSelectDropdown } from '../components/SingleSelectDropdown';
import { useEscClose } from '../hooks/useEscClose';
import { useLaunchTerminalOptions } from '../hooks/useLaunchTerminalOptions';
import { usePlatformRuntimeSupport } from '../hooks/usePlatformRuntimeSupport';
import * as claudeInstanceService from '../services/claudeInstanceService';
import { useClaudeAccountStore } from '../stores/useClaudeAccountStore';
import { useClaudeInstanceStore } from '../stores/useClaudeInstanceStore';
import type { ClaudeAccount } from '../types/claude';
import {
  formatClaudeResetTime,
  getClaudeAccountDisplayEmail,
  getClaudePlanBadge,
  getClaudePlanBadgeClass,
  isClaudeDesktopRuntimeAccount,
} from '../types/claude';
import {
  resolveClaudeDisplayPercentage,
  resolveClaudeQuotaClassForDisplayValue,
} from '../utils/claudeQuotaDisplayPreference';
import type { InstanceLaunchMode, InstanceProfile } from '../types/instance';

interface ClaudeInstancesContentProps {
  accountsForSelect?: ClaudeAccount[];
}

interface ClaudeLaunchModalState {
  instanceId: string;
  instanceName: string;
  switchMessage: string;
  launchCommand: string;
  copied: boolean;
  executing: boolean;
  executeMessage: string | null;
  executeError: string | null;
}

function renderClaudeQuotaPreview(
  account: ClaudeAccount,
  emptyText: string,
  apiKeyText: string,
  currentSessionLabel: string,
  currentWeekLabel: string,
) {
  if (account.auth_mode === 'api_key') {
    return <span className="account-quota-empty">{apiKeyText}</span>;
  }

  const quota = account.quota;
  if (!quota) {
    return <span className="account-quota-empty">{emptyText}</span>;
  }

  const rows = [
    {
      key: 'five-hour',
      label: currentSessionLabel,
      value: resolveClaudeDisplayPercentage(quota.five_hour_percentage),
      reset: quota.five_hour_reset_time,
    },
    {
      key: 'seven-day',
      label: currentWeekLabel,
      value: resolveClaudeDisplayPercentage(quota.seven_day_percentage),
      reset: quota.seven_day_reset_time,
    },
  ];

  return (
    <div className="account-quota-preview">
      {rows.map((row) => {
        const quotaClass = resolveClaudeQuotaClassForDisplayValue(row.value);
        const resetText = formatClaudeResetTime(row.reset);
        return (
          <span className="account-quota-item" key={row.key} title={resetText}>
            <span className={`quota-dot ${quotaClass}`} />
            <span className={`quota-text ${quotaClass}`}>
              {row.label} {row.value}%
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function ClaudeInstancesContent({
  accountsForSelect,
}: ClaudeInstancesContentProps = {}) {
  const { t } = useTranslation();
  const instanceStore = useClaudeInstanceStore();
  const { accounts: storeAccounts, fetchAccounts } = useClaudeAccountStore();
  const accounts = accountsForSelect ?? storeAccounts;
  const isSupportedPlatform = usePlatformRuntimeSupport('desktop');
  const [launchModal, setLaunchModal] = useState<ClaudeLaunchModalState | null>(null);
  const { terminalOptions, selectedTerminal, setSelectedTerminal } =
    useLaunchTerminalOptions();

  useEscClose(!!launchModal, () => setLaunchModal(null));

  const accountMap = useMemo(() => {
    const map = new Map<string, ClaudeAccount>();
    accounts.forEach((account) => map.set(account.id, account));
    return map;
  }, [accounts]);

  const isAccountAllowedForLaunchMode = (
    account: ClaudeAccount,
    launchMode: InstanceLaunchMode,
  ) => {
    const isDesktop = isClaudeDesktopRuntimeAccount(account);
    return launchMode === 'cli' ? !isDesktop : isDesktop;
  };

  const handleInstanceStarted = async (instance: InstanceProfile) => {
    if ((instance.launchMode ?? 'app') !== 'cli') return;
    const launchInfo =
      await claudeInstanceService.getClaudeInstanceLaunchCommand(instance.id);
    const boundAccount = instance.bindAccountId
      ? accountMap.get(instance.bindAccountId)
      : undefined;
    const instanceName = instance.isDefault
      ? t('instances.defaultName', "Phiên bản mặc định")
      : instance.name || t('instances.defaultName', "Phiên bản mặc định");
    setLaunchModal({
      instanceId: instance.id,
      instanceName,
      switchMessage: boundAccount
        ? t('accounts.switched', "Đã chuyển sang {{email}}", {
            email: getClaudeAccountDisplayEmail(boundAccount),
          })
        : t('claude.cli.prepared', "Claude CLI đã sẵn sàng"),
      launchCommand: launchInfo.launchCommand,
      copied: false,
      executing: false,
      executeMessage: null,
      executeError: null,
    });
  };

  const handleCopyLaunchCommand = async () => {
    if (!launchModal) return;
    try {
      await navigator.clipboard.writeText(launchModal.launchCommand);
      setLaunchModal((prev) => (prev ? { ...prev, copied: true, executeError: null } : prev));
      window.setTimeout(() => {
        setLaunchModal((prev) => (prev ? { ...prev, copied: false } : prev));
      }, 1200);
    } catch {
      setLaunchModal((prev) =>
        prev
          ? {
              ...prev,
              executeError: t('common.shared.export.copyFailed', "Sao chép thất bại, vui lòng sao chép thủ công"),
            }
          : prev,
      );
    }
  };

  const handleExecuteInTerminal = async () => {
    if (!launchModal || launchModal.executing) return;
    setLaunchModal((prev) =>
      prev
        ? { ...prev, executing: true, executeError: null, executeMessage: null }
        : prev,
    );
    try {
      const result =
        await claudeInstanceService.executeClaudeInstanceLaunchCommand(
          launchModal.instanceId,
          selectedTerminal,
        );
      setLaunchModal((prev) =>
        prev
          ? {
              ...prev,
              executing: false,
              executeMessage: result || t('claude.cli.launchSuccess', "Đã mở Claude CLI"),
            }
          : prev,
      );
    } catch (error) {
      setLaunchModal((prev) =>
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

  return (
    <>
      <PlatformInstancesContent<ClaudeAccount>
        instanceStore={instanceStore}
        accounts={accounts}
        fetchAccounts={fetchAccounts}
        renderAccountQuotaPreview={(account) =>
          renderClaudeQuotaPreview(
            account,
            t('instances.quota.empty', "Không có hạn ngạch trong bộ nhớ đệm"),
            t('claude.apiKey.quotaUnsupported', "Tài khoản API Key không hỗ trợ làm mới"),
            t('claude.quota.fiveHour', 'Current session'),
            t('claude.quota.sevenDay', 'Current week (all models)'),
          )
        }
        renderAccountBadge={(account) => (
          <span className={`instance-plan-badge ${getClaudePlanBadgeClass(account)}`}>
            {getClaudePlanBadge(account) || t('claude.desktopOAuth.planUnknown', "Gói chưa rõ")}
          </span>
        )}
        getAccountSearchText={(account) =>
          `${getClaudeAccountDisplayEmail(account)} ${getClaudePlanBadge(account)} ${account.organization_name ?? ''}`
        }
        appType="claude"
        isSupported={isSupportedPlatform}
        unsupportedTitleKey="common.shared.instances.unsupported.title"
        unsupportedTitleDefault="暂不支持当前系统"
        unsupportedDescKey="claude.instances.unsupportedDescPlatform"
        unsupportedDescDefault="Claude / Claude CLI 应用多开仅支持 macOS、Windows 和 Linux。"
        onInstanceStarted={handleInstanceStarted}
        resolveStartSuccessMessage={(instance) =>
          (instance.launchMode ?? 'app') === 'cli'
            ? t('claude.cli.prepared', "Claude CLI đã sẵn sàng")
            : t('claude.instances.startSuccess', "Đã khởi động Claude")
        }
        isAccountAllowedForLaunchMode={isAccountAllowedForLaunchMode}
      />

      {launchModal && (
        <div className="modal-overlay">
          <div className="modal modal-lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <button
                className="btn btn-secondary icon-only"
                onClick={() => setLaunchModal(null)}
                title={t('common.back', "Quay lại")}
                aria-label={t('common.back', "Quay lại")}
              >
                <ChevronLeft size={14} />
              </button>
              <h2>{t('instances.launchDialog.title', "Khởi chạy phiên bản")}</h2>
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
              <div className="form-group">
                <label>{t('instances.columns.instance', "Phiên bản")}</label>
                <input className="form-input" value={launchModal.instanceName} readOnly />
              </div>
              <div className="form-group">
                <label>{t('instances.launchDialog.command', "Lệnh khởi chạy")}</label>
                <textarea
                  className="form-input instance-args-input"
                  value={launchModal.launchCommand}
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
                  disabled={launchModal.executing}
                  ariaLabel={t('instances.launchDialog.terminal', "Cửa sổ lệnh")}
                />
              </div>
              {launchModal.executeMessage && (
                <div className="add-status success">
                  <Check size={16} />
                  <span>{launchModal.executeMessage}</span>
                </div>
              )}
              {launchModal.executeError && (
                <div className="form-error">{launchModal.executeError}</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => void handleCopyLaunchCommand()}>
                <Copy size={16} />
                {launchModal.copied ? t('common.success', "Thành công") : t('common.copy', "Copy​")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => void handleExecuteInTerminal()}
                disabled={launchModal.executing}
              >
                <Play size={16} />
                {launchModal.executing
                  ? t('common.loading', "Đang tải...")
                  : t('instances.launchDialog.runInTerminal', "Chạy trong terminal")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ClaudeInstancesPage() {
  return <ClaudeInstancesContent />;
}
