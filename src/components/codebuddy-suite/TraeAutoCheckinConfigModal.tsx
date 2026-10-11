import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Clock,
  AlertCircle,
  Settings,
  History,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useEscClose } from '../../hooks/useEscClose';
import {
  TraeAutoCheckinConfig,
  TraeAutoCheckinLogRecord,
  parseTimeToMinutes,
  getTraeAutoCheckinLogs,
  clearTraeAutoCheckinLogs,
  runTraeAutoCheckinCycleIfNeeded,
  TRAE_AUTO_CHECKIN_LOGS_CHANGED_EVENT,
} from '../../services/traeAutoCheckinService';

interface TraeAutoCheckinConfigModalProps {
  config: TraeAutoCheckinConfig;
  onSave: (newConfig: TraeAutoCheckinConfig) => void;
  onClose: () => void;
}

export function TraeAutoCheckinConfigModal({
  config,
  onSave,
  onClose,
}: TraeAutoCheckinConfigModalProps) {
  const { t } = useTranslation();
  useEscClose(true, onClose);

  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');
  const [enabled, setEnabled] = useState(config.enabled);
  const [startTime, setStartTime] = useState(config.startTime || '06:00');
  const [endTime, setEndTime] = useState(config.endTime || '12:00');
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<TraeAutoCheckinLogRecord[]>(() =>
    getTraeAutoCheckinLogs(),
  );
  const [manualTesting, setManualTesting] = useState(false);
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handleLogsChange = () => {
      setLogs(getTraeAutoCheckinLogs());
    };
    window.addEventListener(TRAE_AUTO_CHECKIN_LOGS_CHANGED_EVENT, handleLogsChange);
    return () => {
      window.removeEventListener(TRAE_AUTO_CHECKIN_LOGS_CHANGED_EVENT, handleLogsChange);
    };
  }, []);

  const handleSave = () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      setError(t('workbuddy.autoCheckin.error.invalidTime', 'Định dạng giờ bắt đầu không hợp lệ'));
      return;
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
      setError(t('workbuddy.autoCheckin.error.invalidTime', 'Định dạng giờ kết thúc không hợp lệ'));
      return;
    }
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (endMinutes < startMinutes) {
      setError(t('workbuddy.autoCheckin.error.endBeforeStart', 'Giờ kết thúc không được trước giờ bắt đầu'));
      return;
    }
    setError(null);
    onSave({ enabled, startTime, endTime });
  };

  const handleManualTest = async () => {
    setManualTesting(true);
    try {
      await runTraeAutoCheckinCycleIfNeeded(true);
    } finally {
      setManualTesting(false);
    }
  };

  const toggleLogExpand = (logId: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }));
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={14} className="checkin-status-success" />;
      case 'already_checked':
        return <CheckCircle size={14} className="checkin-status-already" />;
      case 'failed':
        return <XCircle size={14} className="checkin-status-failed" />;
      default:
        return null;
    }
  };

  const statusText = (status: string) => {
    switch (status) {
      case 'success':
        return t('workbuddy.checkin.success', 'Thành công');
      case 'already_checked':
        return t('workbuddy.checkin.alreadyChecked', 'Đã điểm danh');
      case 'failed':
        return t('workbuddy.checkin.failed', 'Thất bại');
      case 'inactive':
        return t('workbuddy.checkin.inactive', "Không khả dụng");
      default:
        return status;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <h2>
            <Settings size={18} />
            {t('trae.autoCheckin.title', 'Cài đặt điểm danh tự động TRAE SOLO CN')}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={14} />
            {t('workbuddy.autoCheckin.settings', 'Cài đặt')}
          </button>
          <button
            className={`modal-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={14} />
            {t('workbuddy.autoCheckin.history', 'Lịch sử')}
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="message-bar error">
              <AlertCircle size={14} />
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="auto-checkin-settings">
              <label className="setting-row">
                <span>{t('workbuddy.autoCheckin.enable', 'Bật điểm danh tự động')}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              </label>

              <div className="setting-row">
                <span>{t('workbuddy.autoCheckin.timeRange', 'Khung giờ điểm danh')}</span>
                <div className="time-range-inputs">
                  <div className="time-input-group">
                    <Clock size={14} />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <span className="time-separator">-</span>
                  <div className="time-input-group">
                    <Clock size={14} />
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="setting-actions">
                <button
                  className="btn btn-primary btn-full"
                  onClick={handleSave}
                >
                  {t('common.save', "Lưu")}
                </button>
              </div>

              <div className="setting-divider" />

              <div className="setting-row">
                <span>{t('workbuddy.autoCheckin.manualTest', 'Kiểm tra thủ công')}</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => void handleManualTest()}
                  disabled={manualTesting}
                >
                  {manualTesting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Play size={14} />
                  )}
                  {t('workbuddy.autoCheckin.testNow', 'Thực hiện ngay')}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="auto-checkin-history">
              <div className="history-header">
                <span className="history-count">
                  {t('workbuddy.autoCheckin.logCount', 'Tổng cộng {{count}} bản ghi', { count: logs.length })}
                </span>
                {logs.length > 0 && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (confirm(t('workbuddy.autoCheckin.confirmClear', 'Bạn có chắc muốn xóa toàn bộ bản ghi?'))) {
                        clearTraeAutoCheckinLogs();
                      }
                    }}
                  >
                    <Trash2 size={14} />
                    {t('common.clear', "Xóa")}
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="history-empty">
                  <p>{t('workbuddy.autoCheckin.noLogs', 'Chưa có lịch sử điểm danh')}</p>
                </div>
              ) : (
                <div className="history-list">
                  {logs.map((log) => (
                    <div key={log.id} className="history-item">
                      <div
                        className="history-item-header"
                        onClick={() => toggleLogExpand(log.id)}
                      >
                        <div className="history-item-date">
                          <span className={`history-status-dot ${log.status}`} />
                          <span>{log.date}</span>
                        </div>
                        <div className="history-item-summary">
                          <span className="history-stat success">{log.successCount}</span>
                          <span className="history-stat already">{log.alreadyCheckedCount}</span>
                          <span className="history-stat failed">{log.failedCount}</span>
                          <span className="history-time">{log.timestamp.split(' ')[1]}</span>
                          {expandedLogIds[log.id] ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </div>
                      </div>
                      {expandedLogIds[log.id] && (
                        <div className="history-item-details">
                          {log.details.map((detail, index) => (
                            <div key={index} className="history-detail-row">
                              {statusIcon(detail.status)}
                              <span className="detail-email">{detail.email}</span>
                              <span className={`detail-status ${detail.status}`}>
                                {statusText(detail.status)}
                              </span>
                              {detail.time && <span className="detail-time">{detail.time}</span>}
                              {detail.message && (
                                <span className="detail-message">{detail.message}</span>
                              )}
                            </div>
                          ))}
                          <div className="history-detail-footer">
                            {t('workbuddy.autoCheckin.duration', 'Thời gian: {{ms}} ms', {
                              ms: log.durationMs,
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}