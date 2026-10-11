import { buildCodexSessionUsageQuery as buildUsageQuery } from '../../utils/codexSessionUsageQuery';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { confirm as confirmDialog } from '@tauri-apps/plugin-dialog';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Database,
  DollarSign,
  RefreshCw,
  RotateCcw,
  Send,
  Zap,
} from 'lucide-react';
import { SingleSelectDropdown, type SingleSelectOption } from '../SingleSelectDropdown';
import * as codexInstanceService from '../../services/codexInstanceService';
import type {
  CodexSessionUsageQuery,
  CodexSessionUsageReport,
  CodexSessionUsageBreakdownRow,
} from '../../types/codex';
import {
  SESSION_USAGE_SUMMARY_PENDING,
  formatSessionUsageCostUsd,
  formatSessionUsageCount,
  formatSessionUsageTokensShort,
  hasTrustedSessionUsageCache,
  resolveSessionUsageSummaryStatus,
  type SessionUsageSummaryLoadState,
} from '../../utils/codexSessionUsageFormat';
import { CodexUsageTrend, type UsageTrendPoint } from './CodexUsageTrend';
import {
  normalizeCodexSessionUsageRange,
  persistCodexSessionUsageRange,
  readCodexSessionUsageRange,
  type CodexSessionUsageRange as UsageRange,
} from '../../utils/codexStatsRangePreference';

function TokenAmount({
  value,
  lang,
  compactDecimals = 1,
}: {
  value: number;
  lang: string;
  compactDecimals?: 1 | 2;
}) {
  const exact = formatSessionUsageCount(value);
  const compact = formatSessionUsageTokensShort(value, lang, compactDecimals);
  return (
    <strong className="codex-session-usage-amount" title={exact}>
      {compact}
    </strong>
  );
}

function formatRelativeSyncTime(value: number | null | undefined, isZh: boolean): string {
  if (!value) {
    return '';
  }
  const diffSeconds = Math.max(0, Math.floor(Date.now() / 1000) - value);
  if (diffSeconds < 60) {
    return isZh ? '刚刚' : 'just now';
  }
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return isZh ? `${minutes} 分钟前` : `${minutes}m ago`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return isZh ? `${hours} 小时前` : `${hours}h ago`;
  }
  const days = Math.floor(diffSeconds / 86400);
  return isZh ? `${days} 天前` : `${days}d ago`;
}

function UsageBreakdownTable({
  rows,
  emptyLabel,
  keyLabel,
  lang,
  showEstimatedCost = false,
}: {
  rows: CodexSessionUsageBreakdownRow[];
  emptyLabel: string;
  keyLabel: string;
  lang: string;
  showEstimatedCost?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="codex-session-usage-table-wrap">
      <table className="codex-session-usage-table">
        <thead>
          <tr>
            <th>{keyLabel}</th>
            <th>{t('codex.sessionUsage.tables.input', "Token vào")}</th>
            <th>{t('codex.sessionUsage.tables.cached', "Token cache")}</th>
            <th>{t('codex.sessionUsage.tables.output', "Token ra")}</th>
            <th>{t('codex.sessionUsage.tables.total', "Tổng token")}</th>
            <th>{t('codex.sessionUsage.tables.requests', "YC")}</th>
            {showEstimatedCost ? <th>{t('codex.sessionUsage.cards.cost')}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showEstimatedCost ? 7 : 6}>{emptyLabel}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key || row.label}>
                <td title={row.label || row.key}>{row.label || row.key || '—'}</td>
                <td>
                  <TokenAmount value={row.inputTokens} lang={lang} />
                </td>
                <td>
                  <TokenAmount value={row.cachedInputTokens} lang={lang} />
                </td>
                <td>
                  <TokenAmount value={row.outputTokens} lang={lang} />
                </td>
                <td>
                  <TokenAmount value={row.totalTokens} lang={lang} />
                </td>
                <td>{formatSessionUsageCount(row.requestCount)}</td>
                {showEstimatedCost ? <td title={row.estimatedCostUsd == null ? t('codex.sessionUsage.costUnavailable') : undefined}>
                  {row.estimatedCostUsd == null ? '—' : formatSessionUsageCostUsd(row.estimatedCostUsd)}
                </td> : null}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function CodexSessionUsageSummary({
  onOpenDetail,
}: {
  onOpenDetail: () => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || 'zh-CN';
  const [report, setReport] = useState<CodexSessionUsageReport | null>(null);
  const [loadState, setLoadState] = useState<SessionUsageSummaryLoadState>('scanning');
  const [range] = useState<UsageRange>(() => readCodexSessionUsageRange());
  const query = useMemo(() => buildUsageQuery(range, ''), [range]);

  useEffect(() => {
    let cancelled = false;
    setLoadState('scanning');
    void (async () => {
      let trusted = false;
      try {
        const cached = await codexInstanceService.querySessionUsage(query);
        if (cancelled) return;
        trusted = hasTrustedSessionUsageCache(cached);
        setReport(cached);
        setLoadState(trusted ? 'updating' : 'scanning');
      } catch {
        if (!cancelled) setReport(null);
      }
      try {
        const synced = await codexInstanceService.syncSessionUsage({
          rebuild: false,
          query,
        });
        if (cancelled) return;
        if (synced.report) {
          setReport(synced.report);
        }
        setLoadState('ready');
      } catch {
        if (cancelled) return;
        // 列表页只展示已有汇总，扫描失败不挡会话列表。
        setLoadState(trusted ? 'ready' : 'failed');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const trusted = hasTrustedSessionUsageCache(report);
  const status = resolveSessionUsageSummaryStatus(loadState, trusted);
  const totals = report?.totals;
  const metrics = [
    [
      t('codex.sessionUsage.summary.input', "Vào"),
      trusted
        ? formatSessionUsageTokensShort(totals?.inputTokens ?? 0, lang)
        : SESSION_USAGE_SUMMARY_PENDING,
    ],
    [
      t('codex.sessionUsage.summary.cached', "Cache"),
      trusted
        ? formatSessionUsageTokensShort(totals?.cachedInputTokens ?? 0, lang)
        : SESSION_USAGE_SUMMARY_PENDING,
    ],
    [
      t('codex.sessionUsage.summary.output', "Ra"),
      trusted
        ? formatSessionUsageTokensShort(totals?.outputTokens ?? 0, lang)
        : SESSION_USAGE_SUMMARY_PENDING,
    ],
    [
      t('codex.sessionUsage.summary.total', "Tổng"),
      trusted
        ? formatSessionUsageTokensShort(totals?.totalTokens ?? 0, lang, 2)
        : SESSION_USAGE_SUMMARY_PENDING,
    ],
    [
      t('codex.sessionUsage.summary.requests', "YC"),
      trusted
        ? formatSessionUsageCount(totals?.requestCount ?? 0)
        : SESSION_USAGE_SUMMARY_PENDING,
    ],
    [
      t('codex.sessionUsage.summary.cost', "Phí"),
      trusted
        ? formatSessionUsageCostUsd(totals?.estimatedCostUsd)
        : SESSION_USAGE_SUMMARY_PENDING,
    ],
  ] as const;

  return (
    <div className="codex-session-usage-summary">
      <div className="codex-session-usage-summary__title">
        {t(`codex.sessionUsage.range.${range}`)}
        {status ? (
          <span
            className={`codex-session-usage-summary__status is-${status}`}
            role="status"
          >
            {status === 'scanning'
              ? t('codex.sessionUsage.summary.scanning', "Đang quét")
              : t('codex.sessionUsage.summary.updating', "Đang cập nhật")}
          </span>
        ) : null}
      </div>
      <div className="codex-session-usage-summary__metrics">
        {metrics.map(([label, value]) => (
          <span key={label} className="codex-session-usage-summary__metric">
            <em>{label}</em>
            <strong className={trusted ? undefined : 'is-pending'}>{value}</strong>
          </span>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-sm btn-secondary codex-session-usage-summary__detail"
        onClick={onOpenDetail}
      >
        {t('codex.sessionUsage.summary.detail', "Chi tiết")}
      </button>
    </div>
  );
}

export function CodexSessionUsagePanel({
  onBack,
}: {
  onBack?: () => void;
} = {}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || 'zh-CN';
  const isZh = lang.toLowerCase().startsWith('zh');
  const [range, setRange] = useState<UsageRange>(() => readCodexSessionUsageRange());
  const [instanceId, setInstanceId] = useState('');
  const [report, setReport] = useState<CodexSessionUsageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState('');
  const requestVersionRef = useRef(0);

  const query = useMemo(() => buildUsageQuery(range, instanceId), [instanceId, range]);

  const loadCached = useCallback(async (nextQuery: CodexSessionUsageQuery) => {
    const version = ++requestVersionRef.current;
    setLoading(true);
    setError('');
    try {
      const nextReport = await codexInstanceService.querySessionUsage(nextQuery);
      if (version === requestVersionRef.current) {
        setReport(nextReport);
      }
    } catch (loadError) {
      if (version === requestVersionRef.current) {
        setError(
          t('codex.sessionUsage.errors.loadFailed', {
            error: loadError instanceof Error ? loadError.message : String(loadError),
            defaultValue: "Không đọc được mức dùng phiên: {{error}}",
          }),
        );
      }
    } finally {
      if (version === requestVersionRef.current) {
        setLoading(false);
      }
    }
  }, [t]);

  const runSync = useCallback(async (rebuild: boolean) => {
    const syncQuery = buildUsageQuery(range, instanceId);
    const version = ++requestVersionRef.current;
    setSyncing(true);
    if (rebuild) {
      setRebuilding(true);
    }
    setError('');
    try {
      const result = await codexInstanceService.syncSessionUsage({
        rebuild,
        query: syncQuery,
      });
      if (version === requestVersionRef.current) {
        if (result.report) {
          setReport(result.report);
        } else {
          const nextReport = await codexInstanceService.querySessionUsage(syncQuery);
          if (version === requestVersionRef.current) setReport(nextReport);
        }
        if (result.errors.length > 0) {
          setError(result.errors[0]);
        }
      }
    } catch (syncError) {
      if (version === requestVersionRef.current) {
        setError(
          t('codex.sessionUsage.errors.syncFailed', {
            error: syncError instanceof Error ? syncError.message : String(syncError),
            defaultValue: "Không quét được mức dùng phiên: {{error}}",
          }),
        );
      }
    } finally {
      if (version === requestVersionRef.current) {
        setSyncing(false);
        setRebuilding(false);
        setLoading(false);
      }
    }
  }, [instanceId, range, t]);

  useEffect(() => {
    void loadCached(query);
  }, [loadCached, query]);

  useEffect(() => {
    void runSync(false);
    // 仅在首次进入面板时增量扫描，切换筛选只读缓存。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRebuild = useCallback(async () => {
    const confirmed = await confirmDialog(
      t(
        'codex.sessionUsage.rebuildConfirm.message',
        "Sẽ xóa bộ nhớ đệm mức dùng phiên rồi đọc lại mọi nhật ký. Hạn mức chính thức và nhật ký dịch vụ API không đổi. Tiếp tục?",
      ),
      {
        title: t('codex.sessionUsage.rebuildConfirm.title', "Quét lại"),
        kind: 'warning',
      },
    );
    if (!confirmed) {
      return;
    }
    await runSync(true);
  }, [runSync, t]);

  const rangeOptions = useMemo<SingleSelectOption[]>(
    () => [
      { value: 'today', label: t('codex.sessionUsage.range.today') },
      { value: '7d', label: t('codex.sessionUsage.range.7d', "7 ngày") },
      { value: '30d', label: t('codex.sessionUsage.range.30d', "30 ngày") },
      { value: 'month', label: t('codex.sessionUsage.range.month', "Tháng này") },
      { value: 'all', label: t('codex.sessionUsage.range.all', "Tất cả") },
    ],
    [t],
  );
  const instanceOptions = useMemo<SingleSelectOption[]>(
    () => [
      { value: '', label: t('codex.sessionUsage.instance.all', "Mọi phiên bản") },
      ...(report?.instances ?? []).map((instance) => ({
        value: instance.id,
        label: instance.name || instance.id,
      })),
    ],
    [report?.instances, t],
  );

  const totals = report?.totals;
  const hasData = (totals?.requestCount ?? 0) > 0 || (report?.eventCount ?? 0) > 0;
  const lastSyncedLabel = formatRelativeSyncTime(report?.lastSyncedAt, isZh);
  const sessionTrend = useMemo<UsageTrendPoint[]>(
    () =>
      (report?.byDay ?? [])
        .map((row) => ({
          bucketStart: new Date(`${row.key}T00:00:00`).getTime(),
          usage: {
            totalTokens: row.totalTokens,
            requestCount: row.requestCount,
            estimatedCostUsd: 0,
          },
        }))
        .filter((point) => Number.isFinite(point.bucketStart))
        .sort((left, right) => left.bucketStart - right.bucketStart),
    [report?.byDay],
  );

  return (
    <div className="codex-session-usage">
      <div className="codex-session-usage__intro">
        <div>
          <h3>{t('codex.sessionUsage.title', "Mức dùng phiên")}</h3>
          <p>{t('codex.sessionUsage.desc', "Cộng dồn token thực từ nhật ký phiên Codex trên máy, không dùng hạn mức chính thức hay nhật ký dịch vụ API.")}</p>
        </div>
        {onBack ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
          >
            {t('codex.sessionUsage.summary.back', "Quay lại")}
          </button>
        ) : null}
      </div>

      <div className="codex-session-usage__toolbar">
        <label className="codex-session-usage__field">
          <span>{t('codex.sessionUsage.range.label', "Khoảng")}</span>
          <SingleSelectDropdown
            value={range}
            options={rangeOptions}
            onChange={(value) => {
              const nextRange = normalizeCodexSessionUsageRange(value);
              setRange(nextRange);
              persistCodexSessionUsageRange(nextRange);
            }}
            ariaLabel={t('codex.sessionUsage.range.label', "Khoảng")}
            menuWidth={140}
            menuMaxHeight={220}
          />
        </label>
        <label className="codex-session-usage__field">
          <span>{t('codex.sessionUsage.instance.label', "Phiên bản")}</span>
          <SingleSelectDropdown
            value={instanceId}
            options={instanceOptions}
            onChange={setInstanceId}
            ariaLabel={t('codex.sessionUsage.instance.label', "Phiên bản")}
            menuWidth={200}
            menuMaxHeight={260}
          />
        </label>
        <div className="codex-session-usage__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void runSync(false)}
            disabled={syncing}
          >
            <RefreshCw size={14} className={syncing && !rebuilding ? 'spin' : undefined} />
            {t('codex.sessionUsage.actions.refresh', "Làm mới")}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleRebuild()}
            disabled={syncing}
          >
            <RotateCcw size={14} className={rebuilding ? 'spin' : undefined} />
            {t('codex.sessionUsage.actions.rebuild', "Quét lại")}
          </button>
        </div>
      </div>

      <div className="codex-session-usage__status" role="status">
        {syncing
          ? t('codex.sessionUsage.status.scanning', "Đang quét nhật ký…")
          : hasData
            ? t('codex.sessionUsage.status.ready', {
                files: report?.filesTracked ?? 0,
                requests: report?.eventCount ?? 0,
                defaultValue: "{{files}} tệp, {{requests}} yêu cầu",
              })
            : t('codex.sessionUsage.status.idle', "Chưa quét")}
        {lastSyncedLabel ? (
          <span>
            {t('codex.sessionUsage.status.lastSynced', {
              time: lastSyncedLabel,
              defaultValue: "Đồng bộ lần cuối {{time}}",
            })}
          </span>
        ) : null}
        {(report?.deferredFiles ?? 0) > 0 ? (
          <span>
            {t('codex.sessionUsage.status.deferred', {
              count: report?.deferredFiles ?? 0,
              defaultValue: "{{count}} nhánh đang chờ phiên cha",
            })}
          </span>
        ) : null}
        {(report?.lastErrorCount ?? 0) > 0 ? (
          <span>
            {t('codex.sessionUsage.status.errors', {
              count: report?.lastErrorCount ?? 0,
              defaultValue: "{{count}} tệp không đọc được",
            })}
          </span>
        ) : null}
      </div>

      {error ? <div className="codex-session-usage__error">{error}</div> : null}

      <p className="codex-session-usage__hint">
        {t(
          'codex.sessionUsage.hint',
          "Hạn mức chính thức là gói. Nhật ký dịch vụ API chỉ gồm cổng cục bộ. Ở đây cộng phần tăng JSONL từng yêu cầu.",
        )}
      </p>

      {loading && !report ? (
        <div className="codex-session-usage__empty">
          {t('common.loading', "Đang tải...")}
        </div>
      ) : !hasData ? (
        <div className="codex-session-usage__empty">
          <h4>{t('codex.sessionUsage.empty.title', "Chưa có mức dùng phiên")}</h4>
          <p>
            {t(
              'codex.sessionUsage.empty.desc',
              "Mở trang này sẽ quét nền nhật ký Codex cục bộ và các phiên bản thêm. Vừa dùng xong thì nhấn Làm mới.",
            )}
          </p>
        </div>
      ) : (
        <>
          <section className="codex-session-usage__hero">
            <div className="codex-session-usage__hero-head">
              <div className="codex-session-usage__hero-total">
                <div className="codex-session-usage__hero-icon" aria-hidden="true">
                  <Zap size={22} />
                </div>
                <div>
                  <span>{t('codex.sessionUsage.cards.total', "Tổng token")}</span>
                  <TokenAmount
                    value={totals?.totalTokens ?? 0}
                    lang={lang}
                    compactDecimals={2}
                  />
                </div>
              </div>
              <div className="codex-session-usage__hero-side">
                <span>
                  <Send size={13} />
                  {t('codex.sessionUsage.cards.requests', "Yêu cầu")}
                </span>
                <strong>{formatSessionUsageCount(totals?.requestCount ?? 0)}</strong>
                <span>
                  <DollarSign size={13} />
                  {t('codex.sessionUsage.cards.cost', "Chi phí ước")}
                </span>
                <strong>{formatSessionUsageCostUsd(totals?.estimatedCostUsd)}</strong>
              </div>
            </div>

            <div className="codex-session-usage__cards">
            <article className="is-input">
              <div className="codex-session-usage__card-head">
                <ArrowDownToLine size={15} aria-hidden="true" />
                <span>{t('codex.sessionUsage.cards.input', "Token vào")}</span>
              </div>
              <TokenAmount
                value={totals?.inputTokens ?? 0}
                lang={lang}
              />
            </article>
            <article className="is-cache">
              <div className="codex-session-usage__card-head">
                <Database size={15} aria-hidden="true" />
                <span>{t('codex.sessionUsage.cards.cached', "Token cache")}</span>
              </div>
              <TokenAmount
                value={totals?.cachedInputTokens ?? 0}
                lang={lang}
              />
            </article>
            <article className="is-output">
              <div className="codex-session-usage__card-head">
                <ArrowUpFromLine size={15} aria-hidden="true" />
                <span>{t('codex.sessionUsage.cards.output', "Token ra")}</span>
              </div>
              <TokenAmount
                value={totals?.outputTokens ?? 0}
                lang={lang}
              />
            </article>
            </div>
          </section>

          <CodexUsageTrend
            points={sessionTrend}
            metrics={["totalTokens", "requestCount"]}
            hourly={false}
            title={t('codex.sessionUsage.title', "Mức dùng phiên")}
            emptyLabel={t('codex.sessionUsage.empty.title', "Chưa có mức dùng phiên")}
            labels={{
              totalTokens: t('codex.sessionUsage.cards.total', "Tổng token"),
              requestCount: t('codex.sessionUsage.cards.requests', "Yêu cầu"),
            }}
          />

          <div className="codex-session-usage__grids">
            <section>
              <h4>{t('codex.sessionUsage.tables.model', "Theo mô hình")}</h4>
              <UsageBreakdownTable
                rows={report?.byModel ?? []}
                keyLabel={t('codex.sessionUsage.tables.modelName', "Mô hình")}
                emptyLabel={t('codex.sessionUsage.empty.title', "Chưa có mức dùng phiên")}
                lang={lang}
              />
            </section>
            <section>
              <h4>{t('codex.sessionUsage.tables.instance', "Theo phiên bản")}</h4>
              <UsageBreakdownTable
                rows={report?.byInstance ?? []}
                keyLabel={t('codex.sessionUsage.tables.instanceName', "Phiên bản")}
                emptyLabel={t('codex.sessionUsage.empty.title', "Chưa có mức dùng phiên")}
                lang={lang}
              />
            </section>
          </div>

          <section>
            <h4>{t('codex.sessionUsage.tables.day', "Theo ngày")}</h4>
            <UsageBreakdownTable
              rows={report?.byDay ?? []}
              showEstimatedCost
              keyLabel={t('codex.sessionUsage.tables.dayName', "Ngày")}
              emptyLabel={t('codex.sessionUsage.empty.title', "Chưa có mức dùng phiên")}
              lang={lang}
            />
            {(report?.byDay ?? []).some((row) => row.estimatedCostUsd == null) ? (
              <p className="codex-session-usage__hint">{t('codex.sessionUsage.costUnavailable')}</p>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
