import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import {
  Check,
  KeyRound,
  Pencil,
  PlugZap,
  RefreshCw,
  Server,
  Trash2,
  X,
} from 'lucide-react';
import { useSshServerStore } from '../../stores/useSshServerStore';
import type {
  SshAuthConfig,
  SshCodexSyncResult,
  SshServer,
  SshServerDraft,
} from '../../types/sshServer';

interface FormState {
  id?: string;
  name: string;
  host: string;
  port: string;
  username: string;
  codexHome: string;
  authKind: 'agent' | 'private_key_file';
  privateKeyPath: string;
  syncOnSwitch: boolean;
}

const emptyForm: FormState = {
  name: '',
  host: '',
  port: '22',
  username: '',
  codexHome: '~/.codex',
  authKind: 'agent',
  privateKeyPath: '',
  syncOnSwitch: true,
};

function formFromServer(server: SshServer): FormState {
  return {
    id: server.id,
    name: server.name,
    host: server.host,
    port: String(server.port || 22),
    username: server.username,
    codexHome: server.codex_home || '~/.codex',
    authKind: server.auth.kind,
    privateKeyPath: server.auth.kind === 'private_key_file' ? server.auth.path : '',
    syncOnSwitch: server.sync_on_codex_switch,
  };
}

function draftFromForm(form: FormState): SshServerDraft {
  const auth: SshAuthConfig =
    form.authKind === 'private_key_file'
      ? { kind: 'private_key_file', path: form.privateKeyPath.trim() }
      : { kind: 'agent' };
  return {
    id: form.id,
    name: form.name.trim(),
    host: form.host.trim(),
    port: Number.parseInt(form.port, 10) || 22,
    username: form.username.trim(),
    codex_home: form.codexHome.trim() || '~/.codex',
    auth,
    sync_on_codex_switch: form.syncOnSwitch,
  };
}

function formatSyncTime(timestamp?: number) {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleString();
}

interface CodexSshServersPanelProps {
  /** 嵌入设置弹框时隐藏顶部大标题区 */
  embedded?: boolean;
}

export function CodexSshServersPanel({ embedded = false }: CodexSshServersPanelProps) {
  const { t } = useTranslation();
  const {
    servers,
    selectedServerId,
    loading,
    error,
    lastSyncResult,
    fetchServers,
    upsertServer,
    deleteServer,
    selectServer,
    testConnection,
    syncNow,
    applySyncResult,
  } = useSshServerStore();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyServerId, setBusyServerId] = useState<string | null>(null);
  const [localMessage, setLocalMessage] = useState<{
    kind: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const selectedServer = useMemo(
    () => servers.find((server) => server.id === selectedServerId) ?? null,
    [servers, selectedServerId],
  );

  useEffect(() => {
    void fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | null = null;
    listen<SshCodexSyncResult>('codex:ssh-sync-result', (event) => {
      applySyncResult(event.payload);
      setLocalMessage({
        kind: event.payload.verified ? 'success' : 'warning',
        text: event.payload.verified
          ? t('codex.ssh.syncVerified', "Đã xác minh đồng bộ hóa SSH")
          : event.payload.error ??
            t('codex.ssh.syncFailed', "Đồng bộ hóa SSH không thành công"),
      });
    }).then((dispose) => {
      if (disposed) {
        dispose();
        return;
      }
      unlisten = dispose;
    });
    return () => {
      disposed = true;
      if (unlisten) unlisten();
    };
  }, [applySyncResult, t]);

  const handleSubmit = async () => {
    setSaving(true);
    setLocalMessage(null);
    try {
      const draft = draftFromForm(form);
      await upsertServer(draft);
      // 开启「切号同步」时自动选中该服务器，设置里的开关会点亮
      if (draft.sync_on_codex_switch) {
        const list = useSshServerStore.getState().servers;
        const matched =
          list.find(
            (server) =>
              server.host === draft.host &&
              server.port === draft.port &&
              server.username === draft.username,
          ) ?? list.find((server) => server.id === draft.id);
        if (matched) {
          await selectServer(matched.id);
        }
      }
      setForm(emptyForm);
      setLocalMessage({ kind: 'success', text: t('common.saved', 'Đã lưu') });
    } catch (err) {
      setLocalMessage({ kind: 'error', text: String(err) });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (serverId: string) => {
    setBusyServerId(serverId);
    setLocalMessage(null);
    try {
      await testConnection(serverId);
      setLocalMessage({
        kind: 'success',
        text: t('codex.ssh.connectionOk', "Đã kết nối"),
      });
    } catch (err) {
      setLocalMessage({ kind: 'error', text: String(err) });
    } finally {
      setBusyServerId(null);
    }
  };

  const handleSync = async (serverId?: string) => {
    setBusyServerId(serverId ?? selectedServerId);
    setLocalMessage(null);
    try {
      const result = await syncNow(serverId);
      setLocalMessage({
        kind: result.verified ? 'success' : 'warning',
        text: result.verified
          ? t('codex.ssh.syncVerified', "Đã xác minh đồng bộ hóa SSH")
          : result.error ?? t('codex.ssh.syncFailed', "Đồng bộ hóa SSH không thành công"),
      });
    } catch (err) {
      setLocalMessage({ kind: 'error', text: String(err) });
    } finally {
      setBusyServerId(null);
    }
  };

  return (
    <div className={`codex-ssh-panel${embedded ? ' codex-ssh-panel--embedded' : ''}`}>
      {!embedded && (
        <div className="codex-ssh-panel__header">
          <div className="codex-ssh-panel__header-copy">
            <h2 className="codex-ssh-panel__title">
              {t('codex.ssh.title', "Đồng bộ SSH Codex")}
            </h2>
            <p className="codex-ssh-panel__subtitle">
              {t(
                'codex.ssh.subtitle',
                "Máy chủ đã chọn sẽ nhận được gói xác thực Codex hiện tại sau khi chuyển đổi tài khoản.",
              )}
            </p>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => void fetchServers()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : undefined} />
            <span>{t('common.refresh', "Làm mới")}</span>
          </button>
        </div>
      )}

      {(error || localMessage) && (
        <div
          className={`codex-ssh-panel__message codex-ssh-panel__message--${localMessage?.kind ?? 'error'}`}
          role="status"
        >
          {localMessage?.text ?? error}
        </div>
      )}

      <div className="codex-ssh-panel__layout">
        <form
          className="codex-ssh-panel__form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="codex-ssh-panel__form-header">
            <div>
              <div className="codex-ssh-panel__section-kicker">
                {form.id
                  ? t('codex.ssh.editServer', "Chỉnh sửa máy chủ")
                  : t('codex.ssh.addServer', "Thêm máy chủ")}
              </div>
              <h3 className="codex-ssh-panel__form-title">
                {t('codex.ssh.formLead', "Chi tiết máy chủ từ xa")}
              </h3>
            </div>
            <div className="codex-ssh-panel__form-header-actions">
              {embedded && (
                <button
                  className="btn btn-secondary icon-only"
                  type="button"
                  title={t('common.refresh', "Làm mới")}
                  aria-label={t('common.refresh', "Làm mới")}
                  onClick={() => void fetchServers()}
                  disabled={loading}
                >
                  <RefreshCw size={14} className={loading ? 'spin' : undefined} />
                </button>
              )}
              {form.id && (
                <button
                  className="btn btn-secondary icon-only"
                  type="button"
                  title={t('common.cancel', "Hủy")}
                  aria-label={t('common.cancel', "Hủy")}
                  onClick={() => setForm(emptyForm)}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="codex-ssh-panel__fields">
            <label className="codex-ssh-panel__field">
              <span>{t('codex.ssh.name', "Tên")}</span>
              <input
                className="form-input"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder={t('codex.ssh.namePlaceholder', "ví dụ. Trang chủ NAS")}
                required
              />
            </label>

            <div className="codex-ssh-panel__field-grid codex-ssh-panel__field-grid--host">
              <label className="codex-ssh-panel__field">
                <span>{t('codex.ssh.host', "Host")}</span>
                <input
                  className="form-input"
                  value={form.host}
                  onChange={(event) => setForm({ ...form, host: event.target.value })}
                  placeholder="192.168.1.10"
                  required
                />
              </label>
              <label className="codex-ssh-panel__field">
                <span>{t('codex.ssh.port', "Cổng")}</span>
                <input
                  className="form-input"
                  inputMode="numeric"
                  value={form.port}
                  onChange={(event) => setForm({ ...form, port: event.target.value })}
                  required
                />
              </label>
            </div>

            <div className="codex-ssh-panel__field-grid">
              <label className="codex-ssh-panel__field">
                <span>{t('codex.ssh.username', "Tên người dùng")}</span>
                <input
                  className="form-input"
                  value={form.username}
                  onChange={(event) =>
                    setForm({ ...form, username: event.target.value })
                  }
                  placeholder="ubuntu"
                  required
                />
              </label>
              <label className="codex-ssh-panel__field">
                <span>{t('codex.ssh.codexHome', "Thư mục Codex từ xa")}</span>
                <input
                  className="form-input"
                  value={form.codexHome}
                  onChange={(event) =>
                    setForm({ ...form, codexHome: event.target.value })
                  }
                  placeholder="~/.codex"
                />
              </label>
            </div>

            <div className="codex-ssh-panel__auth">
              <span className="codex-ssh-panel__field-label">
                {t('codex.ssh.authMethod', "Phương thức xác thực")}
              </span>
              <div
                className="codex-ssh-panel__segmented"
                role="radiogroup"
                aria-label={t('codex.ssh.authMethod', "Phương thức xác thực")}
              >
                <button
                  type="button"
                  className={form.authKind === 'agent' ? 'active' : undefined}
                  onClick={() => setForm({ ...form, authKind: 'agent' })}
                >
                  {t('codex.ssh.agentAuth', 'SSH Agent')}
                </button>
                <button
                  type="button"
                  className={
                    form.authKind === 'private_key_file' ? 'active' : undefined
                  }
                  onClick={() =>
                    setForm({ ...form, authKind: 'private_key_file' })
                  }
                >
                  {t('codex.ssh.privateKeyAuth', "Khóa riêng")}
                </button>
              </div>
            </div>

            {form.authKind === 'private_key_file' && (
              <label className="codex-ssh-panel__field">
                <span>{t('codex.ssh.privateKeyPath', "Đường dẫn chính")}</span>
                <input
                  className="form-input"
                  value={form.privateKeyPath}
                  onChange={(event) =>
                    setForm({ ...form, privateKeyPath: event.target.value })
                  }
                  placeholder="~/.ssh/id_ed25519"
                  required
                />
              </label>
            )}

            <label className="codex-ssh-panel__switch-card">
              <span className="codex-ssh-panel__switch-copy">
                <strong>{t('codex.ssh.syncOnSwitch', "Đồng bộ hóa sau khi chuyển đổi")}</strong>
                <em>
                  {t(
                    'codex.ssh.syncOnSwitchHint',
                    "Sau khi lưu và chọn, Codex chuyển sang đẩy xác thực đến máy chủ này",
                  )}
                </em>
              </span>
              <span className="codex-ssh-panel__switch">
                <input
                  type="checkbox"
                  checked={form.syncOnSwitch}
                  onChange={(event) =>
                    setForm({ ...form, syncOnSwitch: event.target.checked })
                  }
                />
                <span className="codex-ssh-panel__switch-slider" />
              </span>
            </label>
          </div>

          <div className="codex-ssh-panel__form-actions">
            {form.id && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setForm(emptyForm)}
              >
                {t('common.cancel', "Hủy")}
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={saving}>
              <Check size={14} />
              <span>
                {form.id
                  ? t('common.save', "Lưu")
                  : t('codex.ssh.addAndSave', "Thêm và lưu")}
              </span>
            </button>
          </div>
        </form>

        <section className="codex-ssh-panel__list-wrap">
          <div className="codex-ssh-panel__list-header">
            <div>
              <div className="codex-ssh-panel__section-kicker">
                {t('codex.ssh.serverList', "Máy chủ")}
              </div>
              <h3 className="codex-ssh-panel__list-title">
                {t('codex.ssh.serverListLead', "Chọn mục tiêu đồng bộ hóa")}
              </h3>
            </div>
            <span className="codex-ssh-panel__count">
              {t('codex.ssh.serverCount', "{{count}} máy chủ", {
                count: servers.length,
              })}
            </span>
          </div>

          <div className="codex-ssh-panel__list">
            {servers.length === 0 && (
              <div className="codex-ssh-panel__empty">
                <div className="codex-ssh-panel__empty-icon" aria-hidden="true">
                  <Server size={22} />
                </div>
                <h3>{t('codex.ssh.emptyTitle', "Không có máy chủ SSH")}</h3>
                <p>
                  {t(
                    'codex.ssh.emptyBody',
                    "Điền vào máy chủ ở bên trái và lưu nó làm mục tiêu đồng bộ hóa chuyển đổi.",
                  )}
                </p>
              </div>
            )}

            {servers.map((server) => {
              const isSelected = server.id === selectedServerId;
              const sync = server.last_sync;
              const busy = busyServerId === server.id;
              return (
                <article
                  className={`codex-ssh-panel__item${isSelected ? ' is-selected' : ''}`}
                  key={server.id}
                >
                  <button
                    type="button"
                    className="codex-ssh-panel__item-main"
                    onClick={() => void selectServer(isSelected ? null : server.id)}
                  >
                    <div className="codex-ssh-panel__item-top">
                      <div className="codex-ssh-panel__item-avatar" aria-hidden="true">
                        <Server size={16} />
                      </div>
                      <div className="codex-ssh-panel__item-copy">
                        <div className="codex-ssh-panel__item-title">
                          <strong>{server.name}</strong>
                          {isSelected && (
                            <span className="codex-ssh-panel__badge">
                              {t('codex.ssh.selected', "Đã chọn")}
                            </span>
                          )}
                          {server.sync_on_codex_switch && (
                            <span className="codex-ssh-panel__badge codex-ssh-panel__badge--soft">
                              {t('codex.ssh.autoSyncBadge', "Tự động")}
                            </span>
                          )}
                        </div>
                        <div className="codex-ssh-panel__item-meta">
                          <code>
                            {server.username}@{server.host}:{server.port}
                          </code>
                          <span className="codex-ssh-panel__dot">·</span>
                          <span>{server.codex_home}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`codex-ssh-panel__sync-status${
                        sync?.verified ? ' is-ok' : sync ? ' is-fail' : ''
                      }`}
                    >
                      {sync
                        ? sync.verified
                          ? t('codex.ssh.syncedAs', "Đã đồng bộ hóa {{email}} · {{time}}", {
                              email: sync.account_email,
                              time: formatSyncTime(sync.synced_at),
                            })
                          : sync.error ??
                            t('codex.ssh.syncFailed', "Đồng bộ hóa SSH không thành công")
                        : t('codex.ssh.neverSynced', "Chưa được đồng bộ hóa")}
                    </div>
                  </button>

                  <div className="codex-ssh-panel__item-actions">
                    <button
                      className={`btn btn-secondary${isSelected ? ' is-active' : ''}`}
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void selectServer(isSelected ? null : server.id)
                      }
                    >
                      <Check size={14} />
                      <span>
                        {isSelected
                          ? t('codex.ssh.selected', "Đã chọn")
                          : t('codex.ssh.select', "Lựa chọn")}
                      </span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={busy}
                      onClick={() => void handleTest(server.id)}
                    >
                      <PlugZap size={14} />
                      <span>{t('codex.ssh.testConnection', "Bài kiểm tra")}</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={busy}
                      onClick={() => void handleSync(server.id)}
                    >
                      <KeyRound size={14} />
                      <span>{t('codex.ssh.syncNow', "Đồng bộ hóa ngay bây giờ")}</span>
                    </button>
                    <button
                      className="btn btn-secondary icon-only"
                      type="button"
                      title={t('common.edit', 'Chỉnh sửa')}
                      aria-label={t('common.edit', 'Chỉnh sửa')}
                      onClick={() => setForm(formFromServer(server))}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-danger icon-only"
                      type="button"
                      title={t('common.delete', "Xóa")}
                      aria-label={t('common.delete', "Xóa")}
                      onClick={() => void deleteServer(server.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {selectedServer && lastSyncResult?.server_id === selectedServer.id && (
        <div
          className={`codex-ssh-panel__footer${
            lastSyncResult.verified ? ' is-ok' : ' is-fail'
          }`}
        >
          {lastSyncResult.verified
            ? t('codex.ssh.latestVerified', "Đã xác minh đồng bộ hóa SSH lần cuối")
            : lastSyncResult.error ??
              t('codex.ssh.syncFailed', "Đồng bộ hóa SSH không thành công")}
        </div>
      )}
    </div>
  );
}
