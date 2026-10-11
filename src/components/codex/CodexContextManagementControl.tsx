import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain } from 'lucide-react';
import * as codexService from '../../services/codexService';
import * as codexInstanceService from '../../services/codexInstanceService';
import './CodexContextManagementControl.css';

type ControlVariant = 'quick' | 'settings';

interface CodexContextManagementControlProps {
  variant?: ControlVariant;
  /** 传入实例 ID 时只操作该实例的 CODEX_HOME；不传则操作默认官方实例。 */
  instanceId?: string;
  active?: boolean;
}

const CONTEXT_MANAGEMENT_UPDATED_EVENT = 'codex-context-management-updated';

export function CodexContextManagementControl({
  variant = 'settings',
  instanceId,
  active = true,
}: CodexContextManagementControlProps) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const config = instanceId
        ? await codexInstanceService.getCodexInstanceQuickConfig(instanceId)
        : await codexService.getCodexQuickConfig();
      setEnabled(Boolean(config.context_management_experimental_mode));
      setLoaded(true);
    } catch (loadError) {
      setLoaded(false);
      setError(
        t('settings.general.codexContextManagementLoadFailed', {
          defaultValue: "Không thể đọc công tắc quản lý ngữ cảnh chính thức: {{error}}",
          error: String(loadError),
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [active, instanceId, t]);

  useEffect(() => {
    if (active) {
      void load();
    } else {
      setLoading(false);
    }
  }, [active, load]);

  useEffect(() => {
    if (!active) return;
    const handleUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ instanceId?: string }>).detail;
      if ((detail?.instanceId ?? null) !== (instanceId ?? null)) return;
      void load();
    };
    window.addEventListener(CONTEXT_MANAGEMENT_UPDATED_EVENT, handleUpdated);
    return () => window.removeEventListener(CONTEXT_MANAGEMENT_UPDATED_EVENT, handleUpdated);
  }, [active, instanceId, load]);

  const handleChange = async (nextEnabled: boolean) => {
    if (!loaded || loading || saving) return;
    const previous = enabled;
    setEnabled(nextEnabled);
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = instanceId
        ? await codexInstanceService.saveCodexInstanceContextManagement(
            instanceId,
            nextEnabled,
          )
        : await codexService.saveCodexContextManagement(nextEnabled);
      setEnabled(Boolean(saved.context_management_experimental_mode));
      setNotice(t('settings.general.codexContextManagementSaveSuccess', "Đã lưu công tắc quản lý ngữ cảnh chính thức"));
      window.dispatchEvent(
        new CustomEvent(CONTEXT_MANAGEMENT_UPDATED_EVENT, {
          detail: { instanceId: instanceId ?? null },
        }),
      );
    } catch (saveError) {
      setEnabled(previous);
      setError(
        t('settings.general.codexContextManagementSaveFailed', {
          defaultValue: "Không thể lưu công tắc quản lý ngữ cảnh chính thức: {{error}}",
          error: String(saveError),
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  const description = t(
    'settings.general.codexContextManagementDesc',
    "Tắt theo mặc định. Chỉ ghi công tắc quản lý ngữ cảnh thử nghiệm chính thức của Codex cho hồ sơ hiện tại; hãy khởi động lại hoàn toàn Codex để áp dụng. Không thay đổi cửa sổ ngữ cảnh, ngưỡng nén hoặc API Service.",
  );
  const status = error || (saving ? t('common.saving', "Đang lưu...") : notice);

  if (variant === 'quick') {
    return (
      <div className="codex-context-management-control codex-context-management-control--quick">
        <div className="qs-row qs-row--top">
          <div className="qs-row-label">
            <Brain size={15} />
            <span>
              {t(
                'settings.general.codexContextManagement',
                "Bật experimental_mode = true (quản lý ngữ cảnh thử nghiệm)",
              )}
            </span>
          </div>
          <div className="qs-row-control">
            <label className="qs-switch">
              <input
                type="checkbox"
                checked={enabled}
                disabled={!loaded || loading || saving}
                onChange={(event) => void handleChange(event.target.checked)}
                aria-label={t(
                  'settings.general.codexContextManagement',
                  "Bật experimental_mode = true (quản lý ngữ cảnh thử nghiệm)",
                )}
              />
              <span className="qs-switch-slider" />
            </label>
          </div>
        </div>
        <div className="qs-hint">{description}</div>
        {status && (
          <div className={`qs-codex-quick-status ${error ? 'error' : saving ? '' : 'success'}`}>
            {status}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="codex-context-management-control codex-context-management-control--settings">
      <div className="settings-row">
        <div className="row-label">
          <div className="row-title">
            {t(
              'settings.general.codexContextManagement',
              "Bật experimental_mode = true (quản lý ngữ cảnh thử nghiệm)",
            )}
          </div>
          <div className="row-desc">{description}</div>
          {status && (
            <div className={`codex-context-management-status ${error ? 'error' : 'success'}`}>
              {status}
            </div>
          )}
        </div>
        <div className="row-control">
          <label className="switch">
            <input
              type="checkbox"
              checked={enabled}
              disabled={!loaded || loading || saving}
              onChange={(event) => void handleChange(event.target.checked)}
              aria-label={t(
                'settings.general.codexContextManagement',
                "Bật experimental_mode = true (quản lý ngữ cảnh thử nghiệm)",
              )}
            />
            <span className="slider" />
          </label>
        </div>
      </div>
    </div>
  );
}
