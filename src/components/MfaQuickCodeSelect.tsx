import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, KeyRound } from 'lucide-react';
import {
  getMfaOtpToken,
  getMfaTimeRemaining,
  loadSavedMfaRecords,
  type MfaRecord,
} from '../utils/mfaVault';

interface MfaQuickCodeSelectProps {
  className?: string;
}

function formatMfaOption(record: MfaRecord, fallbackLabel: string): string {
  const accountName = record.accountName.trim();
  if (accountName) return accountName;
  const secret = record.secret.trim();
  if (!secret) return fallbackLabel;
  if (secret.length <= 14) return secret;
  return `${secret.slice(0, 6)}...${secret.slice(-4)}`;
}

export function MfaQuickCodeSelect({ className = '' }: MfaQuickCodeSelectProps) {
  const { t } = useTranslation();
  const [records, setRecords] = useState<MfaRecord[]>(() => loadSavedMfaRecords());
  const [selectedId, setSelectedId] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(() => getMfaTimeRemaining());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRecords(loadSavedMfaRecords());
  }, []);

  useEffect(() => {
    if (records.length === 0) {
      setSelectedId('');
      return;
    }
    if (!selectedId || !records.some((record) => record.id === selectedId)) {
      setSelectedId(records[0].id);
    }
  }, [records, selectedId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeRemaining(getMfaTimeRemaining());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedId) ?? records[0],
    [records, selectedId],
  );

  const token = selectedRecord ? getMfaOtpToken(selectedRecord.secret) : '';
  const isWarning = timeRemaining <= 5;

  const handleCopyCode = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  if (records.length === 0) return null;

  return (
    <section className={`mfa-quick-code-select ${className}`.trim()}>
      <div className="mfa-quick-code-select__header">
        <span className="mfa-quick-code-select__title">
          <KeyRound size={14} />
          {t('mfaQuick.title', "Mã 2FA")}
        </span>
        <span className={`mfa-quick-code-select__timer ${isWarning ? 'warning' : ''}`}>
          {t('mfaQuick.refreshIn', '{{time}}s', { time: timeRemaining })}
        </span>
      </div>
      <div className="mfa-quick-code-select__controls">
        <select
          value={selectedRecord?.id ?? ''}
          onChange={(event) => setSelectedId(event.target.value)}
          aria-label={t('mfaQuick.selectLabel', "Chọn khóa 2FA")}
        >
          {records.map((record) => (
            <option key={record.id} value={record.id}>
              {formatMfaOption(record, t('mfaQuick.unnamedSecret', "Khóa chưa đặt tên"))}
            </option>
          ))}
        </select>
        <div className="mfa-quick-code-select__code" aria-live="polite">
          <span className={token ? '' : 'invalid'}>
            {token || t('mfaQuick.invalidCode', "Khóa không hợp lệ")}
          </span>
          <button
            type="button"
            className="action-btn"
            onClick={handleCopyCode}
            disabled={!token}
            title={copied ? t('mfaQuick.copied', "Đã sao chép") : t('mfaQuick.copyCode', "Sao chép mã")}
            aria-label={copied ? t('mfaQuick.copied', "Đã sao chép") : t('mfaQuick.copyCode', "Sao chép mã")}
          >
            {copied ? <Check size={14} className="is-success" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </section>
  );
}
