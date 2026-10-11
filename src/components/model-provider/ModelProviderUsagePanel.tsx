import { useTranslation } from 'react-i18next';
import {
  formatModelProviderUsageInteger,
  formatModelProviderUsageMoney,
  formatModelProviderUsageTokenCount,
  resolveModelProviderUsageMode,
  type ModelProviderUsageSummary,
} from '../../services/modelProviderUsageService';

interface ModelProviderUsagePanelProps {
  summary?: ModelProviderUsageSummary | null;
  loading?: boolean;
  error?: string;
  unavailable?: boolean;
  className?: string;
  variant?: 'card' | 'table';
}

export function ModelProviderUsagePanel({
  summary,
  loading = false,
  error,
  unavailable = false,
  className,
  variant,
}: ModelProviderUsagePanelProps) {
  const { t } = useTranslation();
  const usageMode = resolveModelProviderUsageMode(summary ?? undefined);
  const isSupportedUsage =
    usageMode === 'sub2api' ||
    usageMode === 'new_api' ||
    usageMode === 'token_plan';
  const classNames = [
    'codex-api-key-usage-panel',
    usageMode ?? 'sub2api',
    variant,
    className,
  ].filter(Boolean).join(' ');

  if (!summary) {
    const emptyText = loading
      ? t('codex.modelProviders.usage.loading', "Đang truy vấn hạn mức...")
      : error
        ? error
        : unavailable
          ? t('codex.modelProviders.usage.noKey', "Chưa có hạn mức để truy vấn")
          : t('codex.modelProviders.usage.pending', "Đang chờ truy vấn hạn mức");
    return (
      <div className={`${classNames} empty`}>
        <div className="codex-api-key-usage-empty" title={emptyText}>
          {emptyText}
        </div>
      </div>
    );
  }

  if (!isSupportedUsage) {
    return null;
  }

  if (usageMode === 'token_plan') {
    const resetDetail = summary?.details?.find((item) =>
      ['intervalExpiresAt', 'weeklyExpiresAt', 'expiresAt'].includes(item.key),
    );
    return (
      <div className={classNames}>
        <div className="codex-api-key-usage-grid">
          <div>
            <span>
              {t('codex.modelProviders.usage.fields.remaining', 'Remaining')}
            </span>
            <strong>
              {formatModelProviderUsageMoney(
                summary?.quotaRemaining ?? summary?.remaining,
                summary?.unit,
              )}
            </strong>
          </div>
          <div>
            <span>{t('codex.modelProviders.usage.fields.planName', 'Plan')}</span>
            <strong>{summary?.planName || '-'}</strong>
          </div>
          <div>
            <span>
              {t('codex.modelProviders.usage.fields.expiresAt', 'Next Reset')}
            </span>
            <strong>{resetDetail?.value || '-'}</strong>
          </div>
        </div>
      </div>
    );
  }

  const balanceText = formatModelProviderUsageMoney(
    summary.remaining ?? summary.balance ?? summary.quotaRemaining,
    summary.unit,
  );
  const todayRequests = formatModelProviderUsageInteger(summary.todayRequests);
  const todayTokens = formatModelProviderUsageTokenCount(summary.todayTotalTokens);

  return (
    <div className={classNames}>
      <div className="codex-api-key-usage-grid">
        <div>
          <span>{t('codex.modelProviders.usage.accountBalance', "Số dư tài khoản")}</span>
          <strong>{balanceText}</strong>
        </div>
        <div>
          <span>{t('codex.modelProviders.usage.fields.todayRequests', "Yêu cầu hôm nay")}</span>
          <strong>{todayRequests}</strong>
        </div>
        <div>
          <span>{t('codex.modelProviders.usage.fields.todayTokens', "Token hôm nay")}</span>
          <strong>{todayTokens}</strong>
        </div>
      </div>
    </div>
  );
}
