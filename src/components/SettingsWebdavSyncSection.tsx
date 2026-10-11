import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Cloud, Download, RefreshCw, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DataTransferImportResult,
  importDataTransferJson,
} from '../services/dataTransferService';
import {
  createManagedBackup,
  getAutoBackupSettings,
  getSelectionFromAutoBackupSettings,
} from '../services/scheduledBackupService';
import {
  WEBDAV_SYNC_STATE_CHANGED_EVENT,
  WebdavBackupFileEntry,
  WebdavSyncSettings,
  deleteWebdavBackupFile,
  getWebdavSyncSettings,
  listWebdavBackupFiles,
  readWebdavBackupFile,
  saveWebdavSyncSettings,
  testWebdavSyncConnection,
  uploadAutoBackupToWebdav,
} from '../services/webdavSyncService';

type WebdavFeedbackTone = 'loading' | 'success' | 'error';

interface WebdavFeedback {
  tone: WebdavFeedbackTone;
  text: string;
}

interface GroupedWebdavBackup {
  id: string;
  display_name: string;
  zip_file?: WebdavBackupFileEntry;
  json_file?: WebdavBackupFileEntry;
  modified_at: string | null;
  size_bytes: number;
}

function getBackupBaseName(fileName: string): string {
  return fileName.replace(/\.json$|\.zip$/, '');
}

function normalizeError(error: unknown): string {
  const msg = String(error).replace(/^Error:\s*/, '');
  // 针对坚果云等 WebDAV 服务的祖先目录不存在报错进行友好提示
  if (msg.includes('AncestorsNotFound') || msg.includes('The ancestors of this location does not found')) {
    return `${msg}\n\nLưu ý: Không tìm thấy thư mục cha. Một số dịch vụ WebDAV không cho phép tạo thư mục trực tiếp tại thư mục gốc. Hãy kiểm tra lại đường dẫn thư mục từ xa.例如应填写为已存在的同步文件夹路径，如“我的坚果云/cockpit-tools”；或者先在坚果云网页端创建一个名为“cockpit-tools”的同步文件夹，然后在这里将远端目录填为“cockpit-tools”。`;
  }
  return msg;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes >= 10 * 1024 ? 0 : 1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function formatRemoteTime(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString();
}

function buildImportFeedback(
  result: DataTransferImportResult,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const parts: string[] = [];
  if (result.imported_account_count > 0) {
    parts.push(t('settings.transfer.feedback.accountsImported', {
      count: result.imported_account_count,
      defaultValue: "Đã nhập {{count}} tài khoản",
    }));
  }
  if (result.config_result?.applied) {
    parts.push(t('settings.transfer.feedback.configImported', {
      defaultValue: "Đã khôi phục dữ liệu cấu hình",
    }));
  }
  if (result.config_result?.needs_restart) {
    parts.push(t('settings.transfer.feedback.restartRequired', {
      defaultValue: "Đã khôi phục cài đặt dịch vụ mạng. Một số thay đổi sẽ có hiệu lực sau khi khởi động lại",
    }));
  }
  return parts.length > 0
    ? parts.join(' · ')
    : t('settings.webdav.feedback.restoreEmpty', {
        defaultValue: "Không có dữ liệu nào được khôi phục từ bản sao lưu từ xa",
      });
}

export function SettingsWebdavSyncSection() {
  const { t } = useTranslation();

  const [settings, setSettings] = useState<WebdavSyncSettings | null>(null);
  const [url, setUrl] = useState('https://dav.jianguoyun.com/dav/');
  const [username, setUsername] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [remoteDir, setRemoteDir] = useState('cockpit-tools');
  const [retentionInput, setRetentionInput] = useState('15');
  const [remoteFiles, setRemoteFiles] = useState<WebdavBackupFileEntry[]>([]);
  const [showAllRemote, setShowAllRemote] = useState(false);

  const groupedRemoteFiles = useMemo(() => {
    const groups: Record<string, GroupedWebdavBackup> = {};
    for (const file of remoteFiles) {
      const id = getBackupBaseName(file.file_name);
      if (!groups[id]) {
        groups[id] = {
          id,
          display_name: file.file_name,
          modified_at: file.modified_at,
          size_bytes: 0,
        };
      }
      const group = groups[id];
      if (file.file_kind === 'zip') {
        group.zip_file = file;
        group.display_name = file.file_name;
      } else {
        group.json_file = file;
      }
      if (file.modified_at && (!group.modified_at || new Date(file.modified_at) > new Date(group.modified_at))) {
        group.modified_at = file.modified_at;
      }
      group.size_bytes += file.size_bytes;
    }
    return Object.values(groups).sort((a, b) => {
      const timeA = a.modified_at ? new Date(a.modified_at).getTime() : 0;
      const timeB = b.modified_at ? new Date(b.modified_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [remoteFiles]);

  const visibleGroups = showAllRemote ? groupedRemoteFiles : groupedRemoteFiles.slice(0, 3);
  const [feedback, setFeedback] = useState<WebdavFeedback | null>(null);
  const [isRemoteExpanded, setIsRemoteExpanded] = useState(false);
  const isRemoteExpandedRef = useRef(isRemoteExpanded);

  useEffect(() => {
    isRemoteExpandedRef.current = isRemoteExpanded;
  }, [isRemoteExpanded]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [syncingLatest, setSyncingLatest] = useState(false);

  const applySettings = useCallback((next: WebdavSyncSettings) => {
    setSettings(next);
    setUrl(next.url);
    setUsername(next.username);
    setRemoteDir(next.remote_dir);
    setRetentionInput(String(next.retention_days));
    setPasswordInput('');
    setClearPassword(false);
  }, []);

  const loadRemoteFiles = useCallback(async () => {
    setRemoteLoading(true);
    try {
      const files = await listWebdavBackupFiles();
      setRemoteFiles(files);
    } catch (error) {
      setRemoteFiles([]);
      setFeedback({
        tone: 'error',
        text: t('settings.webdav.feedback.listFailed', {
          error: normalizeError(error),
          defaultValue: "Tải bản sao lưu từ xa thất bại: {{error}}",
        }),
      });
    } finally {
      setRemoteLoading(false);
    }
  }, [t]);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const next = await getWebdavSyncSettings();
      applySettings(next);
      if (next.has_password && next.username.trim() && isRemoteExpandedRef.current) {
        await loadRemoteFiles();
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: t('settings.webdav.feedback.loadSettingsFailed', {
          error: normalizeError(error),
          defaultValue: "Tải cài đặt WebDAV thất bại: {{error}}",
        }),
      });
    } finally {
      setSettingsLoading(false);
    }
  }, [applySettings, loadRemoteFiles, t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const handleStateChanged = () => {
      void loadSettings();
    };
    window.addEventListener(WEBDAV_SYNC_STATE_CHANGED_EVENT, handleStateChanged);
    return () => window.removeEventListener(WEBDAV_SYNC_STATE_CHANGED_EVENT, handleStateChanged);
  }, [loadSettings]);

  const persistSettings = useCallback(async () => {
    let parsedRetention = parseInt(retentionInput, 10);
    if (!Number.isInteger(parsedRetention) || parsedRetention < 1 || parsedRetention > 365) {
      parsedRetention = Math.max(1, Math.min(365, parsedRetention || 15));
      setRetentionInput(String(parsedRetention));
    }

    const next = await saveWebdavSyncSettings({
      enabled: true,
      url,
      username,
      password: passwordInput.trim() ? passwordInput : null,
      clearPassword,
      remoteDir,
      retentionDays: parsedRetention,
    });
    applySettings(next);
    return next;
  }, [applySettings, clearPassword, passwordInput, remoteDir, retentionInput, url, username]);

  const handleTestAndSave = useCallback(async () => {
    setTesting(true);
    setFeedback({
      tone: 'loading',
      text: t('settings.webdav.feedback.testingAndSaving', {
        defaultValue: "Đang lưu và kiểm tra kết nối WebDAV...",
      }),
    });
    try {
      const next = await persistSettings();
      const result = await testWebdavSyncConnection({
        url,
        username,
        password: passwordInput.trim() ? passwordInput : null,
        clearPassword,
        remoteDir,
      });
      if (result.ok) {
        setFeedback({
          tone: 'success',
          text: t('settings.webdav.feedback.saveAndTestSuccess', {
            defaultValue: "Đã lưu cấu hình và kiểm tra kết nối thành công!",
          }),
        });
        if (next.has_password && next.username.trim()) {
          await loadRemoteFiles();
        }
      } else {
        setFeedback({
          tone: 'error',
          text: t('settings.webdav.feedback.saveSuccessTestFailed', {
            message: result.message,
            defaultValue: "Đã lưu cấu hình, nhưng kiểm tra kết nối thất bại: {{message}}",
          }),
        });
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: t('settings.webdav.feedback.saveAndTestFailed', {
          error: normalizeError(error),
          defaultValue: "Lưu và kiểm tra kết nối thất bại: {{error}}",
        }),
      });
    } finally {
      setTesting(false);
    }
  }, [clearPassword, passwordInput, remoteDir, url, username, persistSettings, loadRemoteFiles, t]);

  const handleUploadNow = useCallback(async () => {
    setUploading(true);
    setFeedback({
      tone: 'loading',
      text: t('settings.webdav.feedback.uploading', {
        defaultValue: "Đang tạo và tải bản sao lưu lên...",
      }),
    });
    try {
      const savedSettings = await persistSettings();
      if (!savedSettings.enabled) {
        throw new Error(t('settings.webdav.errors.notEnabled', {
          defaultValue: "Hãy bật đồng bộ hóa WebDAV trước",
        }));
      }
      const backupSettings = await getAutoBackupSettings();
      const backup = await createManagedBackup({
        trigger: 'manual',
        selection: getSelectionFromAutoBackupSettings(backupSettings),
        retentionDays: backupSettings.retention_days,
        markAsLastRun: true,
      });
      const result = await uploadAutoBackupToWebdav(backup.file_name);
      await loadSettings();
      setFeedback({
        tone: 'success',
        text: t('settings.webdav.feedback.uploadSuccess', {
          count: result.uploaded_files.length,
          deleted: result.deleted_files.length,
          defaultValue: "Đã tải lên {{count}} tệp, dọn dẹp {{deleted}} bản sao lưu từ xa hết hạn",
        }),
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: t('settings.webdav.feedback.uploadFailed', {
          error: normalizeError(error),
          defaultValue: "Tải lên WebDAV thất bại: {{error}}",
        }),
      });
    } finally {
      setUploading(false);
    }
  }, [loadSettings, persistSettings, t]);

  const handleRefreshRemoteFiles = useCallback(async () => {
    setFeedback(null);
    await loadRemoteFiles();
  }, [loadRemoteFiles]);

  const toggleRemoteExpanded = useCallback(() => {
    setIsRemoteExpanded((prev) => {
      const next = !prev;
      if (next) {
        void loadRemoteFiles();
      }
      return next;
    });
  }, [loadRemoteFiles]);

  const handleRestore = useCallback(
    async (group: GroupedWebdavBackup) => {
      const fileToRestore = group.zip_file ?? group.json_file;
      if (!fileToRestore) return;
      if (!window.confirm(t('settings.webdav.restoreConfirm', {
        name: fileToRestore.file_name,
        defaultValue: "Khôi phục dữ liệu từ bản sao lưu từ xa {{name}}?",
      }))) {
        return;
      }
      setRestoringFile(group.id);
      setFeedback({
        tone: 'loading',
        text: t('settings.webdav.feedback.restoring', {
          defaultValue: "Đang đọc bản sao lưu từ xa và nhập...",
        }),
      });
      try {
        const content = await readWebdavBackupFile(fileToRestore.file_name);
        const result = await importDataTransferJson(content, {
          includeAccounts: true,
          includeConfig: true,
        });
        setFeedback({
          tone: 'success',
          text: buildImportFeedback(result, t),
        });
        await loadSettings();
      } catch (error) {
        setFeedback({
          tone: 'error',
          text: t('common.shared.import.failedMsg', {
            error: normalizeError(error),
            defaultValue: "Nhập thất bại: {{error}}",
          }),
        });
      } finally {
        setRestoringFile(null);
      }
    },
    [loadSettings, t],
  );

  const handleDelete = useCallback(
    async (group: GroupedWebdavBackup) => {
      if (!window.confirm(t('settings.webdav.deleteConfirm', {
        name: group.display_name,
        defaultValue: "Xóa bản sao lưu từ xa {{name}}?",
      }))) {
        return;
      }
      setDeletingFile(group.id);
      try {
        if (group.zip_file) {
          await deleteWebdavBackupFile(group.zip_file.file_name);
        }
        if (group.json_file) {
          await deleteWebdavBackupFile(group.json_file.file_name);
        }
        await loadRemoteFiles();
        setFeedback({
          tone: 'success',
          text: t('settings.webdav.feedback.deleteSuccess', {
            defaultValue: "Đã xóa bản sao lưu từ xa",
          }),
        });
      } catch (error) {
        setFeedback({
          tone: 'error',
          text: t('settings.webdav.feedback.deleteFailed', {
            error: normalizeError(error),
            defaultValue: "Xóa bản sao lưu từ xa thất bại: {{error}}",
          }),
        });
      } finally {
        setDeletingFile(null);
      }
    },
    [loadRemoteFiles, t],
  );

  const handleSyncConfigLatest = useCallback(async () => {
    setSyncingLatest(true);
    setFeedback({
      tone: 'loading',
      text: t('settings.webdav.feedback.syncingLatest', {
        defaultValue: "Đang đồng bộ cấu hình từ xa mới nhất...",
      }),
    });
    try {
      const files = await listWebdavBackupFiles();
      setRemoteFiles(files);

      const latestBackup = files
        .filter((f) => f.file_kind === 'json' || f.file_kind === 'zip')
        .sort((a, b) => {
          const timeA = a.modified_at ? new Date(a.modified_at).getTime() : 0;
          const timeB = b.modified_at ? new Date(b.modified_at).getTime() : 0;
          return timeB - timeA;
        })[0];

      if (!latestBackup) {
        setFeedback({
          tone: 'error',
          text: t('settings.webdav.feedback.noRemoteBackup', {
            defaultValue: "Không tìm thấy tệp sao lưu nào có thể khôi phục từ xa",
          }),
        });
        return;
      }

      if (!window.confirm(t('settings.webdav.syncLatestConfirm', {
        name: latestBackup.file_name,
        defaultValue: "Bạn có chắc chắn muốn tải bản sao lưu từ xa mới nhất {{name}} và đồng bộ hóa cục bộ không? Việc này sẽ ghi đè lên dữ liệu cục bộ hiện có.",
      }))) {
        setFeedback(null);
        return;
      }

      setFeedback({
        tone: 'loading',
        text: t('settings.webdav.feedback.restoring', {
          defaultValue: "Đang đọc bản sao lưu từ xa và nhập...",
        }),
      });

      const content = await readWebdavBackupFile(latestBackup.file_name);
      const result = await importDataTransferJson(content, {
        includeAccounts: true,
        includeConfig: true,
      });

      setFeedback({
        tone: 'success',
        text: buildImportFeedback(result, t),
      });
      await loadSettings();
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: t('settings.webdav.feedback.syncFailed', {
          error: normalizeError(error),
          defaultValue: "Đồng bộ cấu hình mới nhất thất bại: {{error}}",
        }),
      });
    } finally {
      setSyncingLatest(false);
    }
  }, [loadSettings, t]);

  const hasUsableSavedCredential = Boolean(settings?.has_password && settings.username.trim());
  const busy = testing || uploading || remoteLoading || restoringFile !== null || deletingFile !== null || syncingLatest;
  const passwordPlaceholder = settings?.has_password
    ? t('settings.webdav.passwordSavedPlaceholder', {
        defaultValue: "Đã lưu; để trống để giữ lại",
      })
    : t('settings.webdav.passwordPlaceholder', {
        defaultValue: "Mật khẩu ứng dụng bên thứ ba Jianguoyun",
      });
  const lastUploadText = useMemo(() => {
    const time = formatRemoteTime(
      settings?.last_upload_at,
      t('settings.webdav.never', { defaultValue: "Chưa đồng bộ hóa" }),
    );
    return settings?.last_upload_file_name ? `${time} · ${settings.last_upload_file_name}` : time;
  }, [settings?.last_upload_at, settings?.last_upload_file_name, t]);
  const lastDownloadText = useMemo(() => {
    const time = formatRemoteTime(
      settings?.last_download_at,
      t('settings.webdav.never', { defaultValue: "Chưa đồng bộ hóa" }),
    );
    return settings?.last_download_file_name ? `${time} · ${settings.last_download_file_name}` : time;
  }, [settings?.last_download_at, settings?.last_download_file_name, t]);

  return (
    <>
      <div className="group-title">{t('settings.webdav.groupTitle', "Đồng bộ hóa WebDAV")}</div>
      <div className="settings-group">
        <div className="settings-row">
          <div className="row-label">
            <div className="row-title">{t('settings.webdav.urlTitle', "Địa chỉ dịch vụ")}</div>
            <div className="row-desc">{t('settings.webdav.urlDesc', "Địa chỉ mặc định của Jianguoyun: https://dav.jianguoyun.com/dav/")}</div>
          </div>
          <div className="row-control row-control--grow" style={{ maxWidth: '240px' }}>
            <input
              className="settings-select settings-select--input-mode settings-webdav-input"
              style={{ width: '100%' }}
              value={url}
              disabled={settingsLoading || busy}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
        </div>

        <div className="settings-webdav-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-light)' }}>
          <div className="settings-row" style={{ borderBottom: 'none', paddingRight: '24px' }}>
            <div className="row-label" style={{ minWidth: 'auto' }}>
              <div className="row-title">{t('settings.webdav.usernameTitle', "Tài khoản")}</div>
              <div className="row-desc">{t('settings.webdav.usernameDesc', "Jianguoyun sử dụng email tài khoản của bạn.")}</div>
            </div>
            <div className="row-control row-control--grow" style={{ maxWidth: '240px' }}>
              <input
                className="settings-select settings-select--input-mode settings-webdav-input"
                style={{ width: '100%' }}
                value={username}
                disabled={settingsLoading || busy}
                placeholder={t('settings.webdav.usernamePlaceholder', "Email hoặc tên người dùng")}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
          </div>
          <div className="settings-row" style={{ borderBottom: 'none', paddingLeft: '24px', borderLeft: '1px solid var(--border-light)' }}>
            <div className="row-label" style={{ minWidth: 'auto' }}>
              <div className="row-title">{t('settings.webdav.remoteDirTitle', "Thư mục từ xa")}</div>
              <div className="row-desc">{t('settings.webdav.remoteDirDesc', "Chỉ các tệp sao lưu Cockpit trong thư mục này mới được quản lý.")}</div>
            </div>
            <div className="row-control row-control--grow" style={{ maxWidth: '240px' }}>
              <input
                className="settings-select settings-select--input-mode settings-webdav-input"
                style={{ width: '100%' }}
                value={remoteDir}
                disabled={settingsLoading || busy}
                onChange={(event) => setRemoteDir(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="settings-webdav-grid-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border-light)' }}>
          <div className="settings-row" style={{ borderBottom: 'none', paddingRight: '24px' }}>
            <div className="row-label" style={{ minWidth: 'auto' }}>
              <div className="row-title">{t('settings.webdav.passwordTitle', "Mật khẩu ứng dụng")}</div>
              <div className="row-desc">{t('settings.webdav.passwordDesc', "Được lưu cục bộ; để trống để giữ mật khẩu hiện có.")}</div>
            </div>
            <div className="row-control row-control--grow settings-webdav-password-control" style={{ maxWidth: '240px' }}>
              <input
                type="password"
                className="settings-select settings-select--input-mode settings-webdav-input"
                style={{ width: '100%' }}
                value={passwordInput}
                disabled={settingsLoading || busy}
                placeholder={passwordPlaceholder}
                onChange={(event) => setPasswordInput(event.target.value)}
              />
            </div>
          </div>
          <div className="settings-row" style={{ borderBottom: 'none', paddingLeft: '24px', borderLeft: '1px solid var(--border-light)' }}>
            <div className="row-label" style={{ minWidth: 'auto' }}>
              <div className="row-title">{t('settings.webdav.retentionTitle', "Remote Retention Days")}</div>
              <div className="row-desc">{t('settings.webdav.retentionDesc', "Backups older than this on the cloud will be removed during the next sync.")}</div>
            </div>
            <div className="row-control row-control--grow" style={{ maxWidth: '240px' }}>
              <div className="settings-inline-input settings-backup-retention-input" style={{ width: '100%' }}>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="settings-select settings-select--input-mode settings-select--with-unit settings-webdav-input"
                  style={{ width: '100%' }}
                  value={retentionInput}
                  disabled={settingsLoading || busy}
                  onChange={(event) =>
                    setRetentionInput(event.target.value.replace(/[^\d]/g, ''))
                  }
                />
                <span className="settings-input-unit">
                  {t('settings.webdav.retentionUnit', "days")}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-row settings-row--align-start">
          <div className="row-label">
            <div className="row-title">{t('settings.webdav.statusTitle', "Trạng thái đồng bộ")}</div>
            <div className="row-desc">{t('settings.webdav.statusDesc', "Khôi phục từ xa yêu cầu chọn thủ công và không bao giờ âm thầm ghi đè lên dữ liệu cục bộ.")}</div>
            <div className="settings-backup-inline-meta">
              {t('settings.webdav.lastUpload', {
                time: lastUploadText,
                defaultValue: "Tải lên cuối: {{time}}",
              })}
              <br />
              {t('settings.webdav.lastDownload', {
                time: lastDownloadText,
                defaultValue: "Khôi phục cuối: {{time}}",
              })}
            </div>
          </div>
          <div className="row-control settings-webdav-actions">
            <button className="btn btn-secondary" disabled={settingsLoading || busy} onClick={() => void handleTestAndSave()}>
              {testing ? <RefreshCw size={16} className="loading-spinner" /> : <Cloud size={16} />}
              {t('settings.webdav.testAction', "Kiểm tra/Lưu cấu hình")}
            </button>
            <button
              className="btn btn-primary"
              disabled={settingsLoading || busy || !hasUsableSavedCredential}
              onClick={() => void handleUploadNow()}
            >
              {uploading ? <RefreshCw size={16} className="loading-spinner" /> : <Upload size={16} />}
              {t('settings.webdav.uploadAction', "Tạo & Tải lên")}
            </button>
            <button
              className="btn btn-secondary"
              disabled={settingsLoading || busy || !hasUsableSavedCredential}
              onClick={() => void handleSyncConfigLatest()}
            >
              {syncingLatest ? <RefreshCw size={16} className="loading-spinner" /> : <RefreshCw size={16} />}
              {t('settings.webdav.syncAction', "Đồng bộ cấu hình")}
            </button>
          </div>
        </div>

        {feedback && (
          <div className="settings-transfer-feedback-wrap">
            <div className={`add-feedback ${feedback.tone}`}>{feedback.text}</div>
          </div>
        )}

        <div
          className="settings-row settings-row--align-start settings-row--no-border settings-webdav-remote-header"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={toggleRemoteExpanded}
        >
          <div className="row-label">
            <div className="row-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`settings-webdav-chevron ${isRemoteExpanded ? 'expanded' : ''}`}>
                <ChevronRight size={16} />
              </span>
              {t('settings.webdav.remoteListTitle', "Bản sao lưu từ xa")}
            </div>
            <div className="row-desc">{t('settings.webdav.remoteListDesc', "Chỉ hiển thị các tệp JSON và ZIP khớp với tên sao lưu tự động/thủ công của Cockpit.")}</div>
          </div>
          <div className="row-control" onClick={(e) => e.stopPropagation()}>
            {isRemoteExpanded && (
              <button
                className="btn btn-secondary"
                disabled={settingsLoading || busy || !hasUsableSavedCredential}
                onClick={() => void handleRefreshRemoteFiles()}
              >
                {remoteLoading ? <RefreshCw size={16} className="loading-spinner" /> : <RotateCcw size={16} />}
                {t('common.refresh', "Làm mới")}
              </button>
            )}
          </div>
        </div>

        {isRemoteExpanded && (
          <div className="settings-webdav-list-wrap">
            {remoteLoading ? (
              <div className="settings-backup-empty">
                <div className="settings-backup-empty-title">{t('common.loading', "Đang tải...")}</div>
              </div>
            ) : groupedRemoteFiles.length === 0 ? (
              <div className="settings-backup-empty">
                <div className="settings-backup-empty-title">{t('settings.webdav.emptyTitle', "Không có bản sao lưu từ xa")}</div>
                <div className="settings-backup-empty-desc">{t('settings.webdav.emptyDesc', "Lưu cài đặt, sau đó tạo và tải bản sao lưu lên.")}</div>
              </div>
            ) : (
              <div className="settings-backup-list">
                {visibleGroups.map((group) => {
                  const isRestoring = restoringFile === group.id;
                  const isDeleting = deletingFile === group.id;
                  return (
                    <div className="settings-backup-item" key={group.id}>
                      <div className="settings-backup-item-head">
                        <div>
                          <div className="settings-backup-item-name">{group.display_name}</div>
                          <div className="settings-backup-item-tags">
                            {group.zip_file && <span className="settings-backup-tag" style={{ marginRight: '4px' }}>ZIP</span>}
                            {group.json_file && <span className="settings-backup-tag">JSON</span>}
                          </div>
                        </div>
                      </div>
                      <div className="settings-backup-item-meta">
                        <span>
                          {t('settings.transfer.backup.fileTime', {
                            time: formatRemoteTime(group.modified_at, t('settings.webdav.unknownTime', "Không xác định")),
                            defaultValue: "Thời gian: {{time}}",
                          })}
                        </span>
                        <span>
                          {t('settings.transfer.backup.fileSize', {
                            size: formatFileSize(group.size_bytes),
                            defaultValue: "Dung lượng: {{size}}",
                          })}
                        </span>
                      </div>
                      <div className="settings-backup-item-actions">
                        <button
                          className="btn btn-secondary"
                          disabled={busy}
                          onClick={() => void handleRestore(group)}
                        >
                          {isRestoring ? <RefreshCw size={16} className="loading-spinner" /> : <Download size={16} />}
                          {t('settings.webdav.restoreAction', "Khôi phục")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          disabled={busy}
                          onClick={() => void handleDelete(group)}
                        >
                          {isDeleting ? <RefreshCw size={16} className="loading-spinner" /> : <Trash2 size={16} />}
                          {t('settings.transfer.backup.deleteAction', "Xóa")}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {groupedRemoteFiles.length > 3 && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px', marginBottom: '16px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowAllRemote((prev) => !prev)}
                    >
                      {showAllRemote
                        ? t('settings.webdav.collapseAll', "Collapse remote backups")
                        : t('settings.webdav.expandAll', {
                            count: groupedRemoteFiles.length - 3,
                            defaultValue: "Expand all remote backups ({{count}} more)",
                          })}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
