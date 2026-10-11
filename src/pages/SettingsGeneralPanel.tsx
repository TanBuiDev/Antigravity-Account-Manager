import { invoke } from '@tauri-apps/api/core';
import { normalizeLanguage } from '../i18n';
import * as accountService from '../services/accountService';
import { AutoSwitchAccountScopeSelector } from '../components/AutoSwitchAccountScopeSelector';
import { UI_SCALE_OPTION_STRINGS as UI_SCALE_OPTIONS } from '../utils/uiScale';
import { setClaudeQuotaDisplayRemainingEnabled } from '../utils/claudeQuotaDisplayPreference';
import { SettingsAccountTransferSection } from '../components/SettingsAccountTransferSection';
import type { SideNavLayoutMode } from '../stores/useSideNavLayoutStore';
import './settings/Settings.css';
import { Save, FolderOpen, AlertCircle, RefreshCw } from 'lucide-react';
import type { SettingsPageViewProps } from "./SettingsPageView";
import { FloatingCardSettings, FloatingCardShowSetting } from "./settings/FloatingCardSettings";
import { StartupPageSetting } from "./settings/StartupPageSetting";
import { ThemeColorSetting } from './settings/ThemeColorSetting';
import { SettingsCodexPlatformPanel } from "./SettingsCodexPlatformPanel";


/** Hiển thị bảng cài đặt chung khi activeTab của SettingsPageView là 'general'. */
export function SettingsGeneralPanel(props: SettingsPageViewProps) {
  const {
    antigravityAccountGroups,
    antigravityAppPath,
    antigravityDualSwitchNoRestartEnabled,
    antigravityLaunchOnSwitch,
    antigravityScopeAccounts,
    antigravityScopeTypeOptions,
    antigravitySeamlessSwitchUnlocked,
    appAutoLaunchEnabled,
    autoImportFromLocalEnabled,
    autoImportScanBusy,
    autoImportScanSeqRef,
    autoImportScanStatus,
    autoInstall,
    autoInstallLoaded,
    autoInstallTouchedRef,
    autoRefresh,
    autoRefreshCustomMode,
    autoRefreshIsPreset,
    autoSwitchAccountScopeMode,
    autoSwitchCreditsEnabled,
    autoSwitchCreditsThreshold,
    autoSwitchCreditsThresholdCustomMode,
    autoSwitchCreditsThresholdIsPreset,
    autoSwitchEnabled,
    autoSwitchSelectedAccountIds,
    autoSwitchThreshold,
    autoSwitchThresholdCustomMode,
    autoSwitchThresholdIsPreset,
    claudeAppPath,
    claudeAutoRefresh,
    claudeAutoRefreshCustomMode,
    claudeAutoRefreshIsPreset,
    claudeLaunchCandidates,
    claudeQuotaAlertEnabled,
    claudeQuotaAlertThreshold,
    claudeQuotaAlertThresholdCustomMode,
    claudeQuotaAlertThresholdIsPreset,
    claudeQuotaDisplayRemaining,
    closeBehavior,
    codebuddyAppPath,
    codebuddyAutoRefresh,
    codebuddyAutoRefreshCustomMode,
    codebuddyAutoRefreshIsPreset,
    codebuddyCnAppPath,
    codebuddyCnAutoRefresh,
    codebuddyCnAutoRefreshCustomMode,
    codebuddyCnAutoRefreshIsPreset,
    codebuddyCnQuotaAlertEnabled,
    codebuddyCnQuotaAlertThreshold,
    codebuddyCnQuotaAlertThresholdCustomMode,
    codebuddyCnQuotaAlertThresholdIsPreset,
    codebuddyCnShareSessionsOnSwitch,
    codebuddyQuotaAlertEnabled,
    codebuddyQuotaAlertThreshold,
    codebuddyQuotaAlertThresholdCustomMode,
    codebuddyQuotaAlertThresholdIsPreset,
    codebuddyShareSessionsOnSwitch,
    cursorAppPath,
    cursorAutoRefresh,
    cursorAutoRefreshCustomMode,
    cursorAutoRefreshIsPreset,
    cursorQuotaAlertEnabled,
    cursorQuotaAlertThreshold,
    cursorQuotaAlertThresholdCustomMode,
    cursorQuotaAlertThresholdIsPreset,
    defaultTerminal,
    errorReportingEnabled,
    errorReportingSaving,
    externalNetworkEnabled,
    floatingCardAlwaysOnTop,
    floatingCardShowOnStartup,
    generalLoaded,
    generalLoadFailed,
    getResetLabelByTarget,
    ghcpAutoRefresh,
    ghcpAutoRefreshCustomMode,
    ghcpAutoRefreshIsPreset,
    ghcpQuotaAlertEnabled,
    ghcpQuotaAlertThreshold,
    ghcpQuotaAlertThresholdCustomMode,
    ghcpQuotaAlertThresholdIsPreset,
    grokAutoRefresh,
    grokCliPath,
    grokCliSaving,
    grokCliStatus,
    grokCliStatusError,
    grokOpencodeAuthOverwriteOnSwitch,
    grokOpencodeSyncOnSwitch,
    grokQuotaAlertEnabled,
    grokQuotaAlertThreshold,
    grokSyncOfficialAuthOnSwitch,
    handleErrorReportingEnabledChange,
    handlePickAppPath,
    handleResetAppPath,
    handleSelectClaudeLaunchCandidate,
    handleSelectTraeLaunchCandidate,
    hasActiveResetTasks,
    hideDockIcon,
    isAppPathResetDetecting,
    isMacOS,
    isWindows,
    kiroAppPath,
    kiroAutoRefresh,
    kiroAutoRefreshCustomMode,
    kiroAutoRefreshIsPreset,
    kiroQuotaAlertEnabled,
    kiroQuotaAlertThreshold,
    kiroQuotaAlertThresholdCustomMode,
    kiroQuotaAlertThresholdIsPreset,
    language,
    languageOptions,
    loadGeneralConfig,
    loadUpdateSettings,
    menuBarQuotaEnabled,
    menuBarQuotaPlatform,
    menuBarQuotaPlatformOptions,
    normalizeNumberInput,
    openMenuBarQuotaModal,
    platformSettingsOrder,
    qoderAppPath,
    qoderAutoRefresh,
    qoderAutoRefreshCustomMode,
    qoderAutoRefreshIsPreset,
    qoderQuotaAlertEnabled,
    qoderQuotaAlertThreshold,
    qoderQuotaAlertThresholdCustomMode,
    qoderQuotaAlertThresholdIsPreset,
    quotaAlertEnabled,
    quotaAlertThreshold,
    quotaAlertThresholdCustomMode,
    quotaAlertThresholdIsPreset,
    reducedMotionEnabled,
    REFRESH_PRESET_VALUES,
    rememberMainWindowState,
    renderAccountLevelRefreshConfig,
    renderCurrentAccountRefreshRow,
    renderPlatformAutoRefreshRow,
    renderPlatformQuotaAlertRows,
    renderSessionSharingRow,
    renderTraeVariantSettingsGroup,
    sanitizeNumberInput,
    saveGrokCliPath,
    setAntigravityAppPath,
    setAntigravityDualSwitchNoRestartEnabled,
    setAntigravityLaunchOnSwitch,
    setAppAutoLaunchEnabled,
    setAutoImportFromLocalEnabled,
    setAutoImportScanBusy,
    setAutoImportScanStatus,
    setAutoInstall,
    setAutoRefresh,
    setAutoRefreshCustomMode,
    setAutoSwitchAccountScopeMode,
    setAutoSwitchCreditsEnabled,
    setAutoSwitchCreditsThreshold,
    setAutoSwitchCreditsThresholdCustomMode,
    setAutoSwitchEnabled,
    setAutoSwitchSelectedAccountIds,
    setAutoSwitchThreshold,
    setAutoSwitchThresholdCustomMode,
    setClaudeAppPath,
    setClaudeAutoRefresh,
    setClaudeAutoRefreshCustomMode,
    setClaudeQuotaAlertEnabled,
    setClaudeQuotaAlertThreshold,
    setClaudeQuotaAlertThresholdCustomMode,
    setClaudeQuotaDisplayRemaining,
    setCloseBehavior,
    setCodebuddyAppPath,
    setCodebuddyAutoRefresh,
    setCodebuddyAutoRefreshCustomMode,
    setCodebuddyCnAppPath,
    setCodebuddyCnAutoRefresh,
    setCodebuddyCnAutoRefreshCustomMode,
    setCodebuddyCnQuotaAlertEnabled,
    setCodebuddyCnQuotaAlertThreshold,
    setCodebuddyCnQuotaAlertThresholdCustomMode,
    setCodebuddyCnShareSessionsOnSwitch,
    setCodebuddyQuotaAlertEnabled,
    setCodebuddyQuotaAlertThreshold,
    setCodebuddyQuotaAlertThresholdCustomMode,
    setCodebuddyShareSessionsOnSwitch,
    setCursorAppPath,
    setCursorAutoRefresh,
    setCursorAutoRefreshCustomMode,
    setCursorQuotaAlertEnabled,
    setCursorQuotaAlertThreshold,
    setCursorQuotaAlertThresholdCustomMode,
    setDefaultTerminal,
    setExternalNetworkEnabled,
    setFloatingCardAlwaysOnTop,
    setFloatingCardShowOnStartup,
    setGhcpAutoRefresh,
    setGhcpAutoRefreshCustomMode,
    setGhcpQuotaAlertEnabled,
    setGhcpQuotaAlertThreshold,
    setGhcpQuotaAlertThresholdCustomMode,
    setGrokAutoRefresh,
    setGrokCliPath,
    setGrokCliStatusError,
    setGrokOpencodeAuthOverwriteOnSwitch,
    setGrokOpencodeSyncOnSwitch,
    setGrokQuotaAlertEnabled,
    setGrokQuotaAlertThreshold,
    setGrokSyncOfficialAuthOnSwitch,
    setHideDockIcon,
    setKiroAppPath,
    setKiroAutoRefresh,
    setKiroAutoRefreshCustomMode,
    setKiroQuotaAlertEnabled,
    setKiroQuotaAlertThreshold,
    setKiroQuotaAlertThresholdCustomMode,
    setLanguage,
    setMenuBarQuotaEnabled,
    setQoderAppPath,
    setQoderAutoRefresh,
    setQoderAutoRefreshCustomMode,
    setQoderQuotaAlertEnabled,
    setQoderQuotaAlertThreshold,
    setQoderQuotaAlertThresholdCustomMode,
    setQuotaAlertEnabled,
    setQuotaAlertThreshold,
    setQuotaAlertThresholdCustomMode,
    setReducedMotionEnabled,
    setRememberMainWindowState,
    setSideNavLayoutMode,
    setStartupMinimized,
    setStartupPage,
    setTheme,
    setThemeColor,
    setTokenKeeperEnabled,
    setTopRightAdVisible,
    setTraeAppPath,
    setTraeAutoRefresh,
    setTraeAutoRefreshCustomMode,
    setTraeCnAutoRefresh,
    setTraeCnAutoRefreshCustomMode,
    setTraeCnQuotaAlertEnabled,
    setTraeCnQuotaAlertThreshold,
    setTraeCnQuotaAlertThresholdCustomMode,
    setTraeQuotaAlertEnabled,
    setTraeQuotaAlertThreshold,
    setTraeQuotaAlertThresholdCustomMode,
    setTraeSoloAutoRefresh,
    setTraeSoloAutoRefreshCustomMode,
    setTraeSoloCnAutoRefresh,
    setTraeSoloCnAutoRefreshCustomMode,
    setTraeSoloCnQuotaAlertEnabled,
    setTraeSoloCnQuotaAlertThreshold,
    setTraeSoloCnQuotaAlertThresholdCustomMode,
    setTraeSoloQuotaAlertEnabled,
    setTraeSoloQuotaAlertThreshold,
    setTraeSoloQuotaAlertThresholdCustomMode,
    setTrayIconStyle,
    setUiScale,
    setUpdateRemindersEnabled,
    setVscodeAppPath,
    setWebdavAllowedDomains,
    setWindsurfAppPath,
    setWindsurfAutoRefresh,
    setWindsurfAutoRefreshCustomMode,
    setWindsurfQuotaAlertEnabled,
    setWindsurfQuotaAlertThreshold,
    setWindsurfQuotaAlertThresholdCustomMode,
    setWorkbuddyAppPath,
    setWorkbuddyAutoRefresh,
    setWorkbuddyAutoRefreshCustomMode,
    setWorkbuddyQuotaAlertEnabled,
    setWorkbuddyQuotaAlertThreshold,
    setWorkbuddyQuotaAlertThresholdCustomMode,
    setWorkbuddyShareSessionsOnSwitch,
    setZcodeAppPath,
    setZcodeAutoRefresh,
    setZcodeAutoRefreshCustomMode,
    setZedAppPath,
    setZedAutoRefresh,
    setZedAutoRefreshCustomMode,
    setZedQuotaAlertEnabled,
    setZedQuotaAlertThreshold,
    setZedQuotaAlertThresholdCustomMode,
    sideNavLayoutMode,
    startupMinimized,
    startupPage,
    t,
    terminalOptions,
    theme,
    themeColor,
    THRESHOLD_PRESET_VALUES,
    tokenKeeperEnabled,
    topRightAdVisible,
    traeAppPath,
    traeAutoRefresh,
    traeAutoRefreshCustomMode,
    traeAutoRefreshIsPreset,
    traeCnAutoRefresh,
    traeCnAutoRefreshCustomMode,
    traeCnAutoRefreshIsPreset,
    traeCnQuotaAlertEnabled,
    traeCnQuotaAlertThreshold,
    traeCnQuotaAlertThresholdCustomMode,
    traeCnQuotaAlertThresholdIsPreset,
    traeLaunchCandidates,
    traeLaunchCandidatesTarget,
    traeQuotaAlertEnabled,
    traeQuotaAlertThreshold,
    traeQuotaAlertThresholdCustomMode,
    traeQuotaAlertThresholdIsPreset,
    traeSoloAutoRefresh,
    traeSoloAutoRefreshCustomMode,
    traeSoloAutoRefreshIsPreset,
    traeSoloCnAutoRefresh,
    traeSoloCnAutoRefreshCustomMode,
    traeSoloCnAutoRefreshIsPreset,
    traeSoloCnQuotaAlertEnabled,
    traeSoloCnQuotaAlertThreshold,
    traeSoloCnQuotaAlertThresholdCustomMode,
    traeSoloCnQuotaAlertThresholdIsPreset,
    traeSoloQuotaAlertEnabled,
    traeSoloQuotaAlertThreshold,
    traeSoloQuotaAlertThresholdCustomMode,
    traeSoloQuotaAlertThresholdIsPreset,
    trayIconStyle,
    uiScale,
    updateRemindersEnabled,
    updateRemindersLoaded,
    updateRemindersTouchedRef,
    updateSettingsLoadFailed,
    vscodeAppPath,
    webdavAllowedDomains,
    windsurfAppPath,
    windsurfAutoRefresh,
    windsurfAutoRefreshCustomMode,
    windsurfAutoRefreshIsPreset,
    windsurfQuotaAlertEnabled,
    windsurfQuotaAlertThreshold,
    windsurfQuotaAlertThresholdCustomMode,
    windsurfQuotaAlertThresholdIsPreset,
    workbuddyAppPath,
    workbuddyAutoRefresh,
    workbuddyAutoRefreshCustomMode,
    workbuddyAutoRefreshIsPreset,
    workbuddyQuotaAlertEnabled,
    workbuddyQuotaAlertThreshold,
    workbuddyQuotaAlertThresholdCustomMode,
    workbuddyQuotaAlertThresholdIsPreset,
    workbuddyShareSessionsOnSwitch,
    zcodeAppPath,
    zcodeAutoRefresh,
    zcodeAutoRefreshCustomMode,
    zcodeAutoRefreshIsPreset,
    zedAppPath,
    zedAutoRefresh,
    zedAutoRefreshCustomMode,
    zedAutoRefreshIsPreset,
    zedQuotaAlertEnabled,
    zedQuotaAlertThreshold,
    zedQuotaAlertThresholdCustomMode,
    zedQuotaAlertThresholdIsPreset,
  } = props;
  return (
          <>
          {(generalLoadFailed || updateSettingsLoadFailed) && (
            <div className="settings-load-error" role="alert">
              <AlertCircle size={16} />
              <span>{t('common.failed')}</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (generalLoadFailed) void loadGeneralConfig();
                  if (updateSettingsLoadFailed) void loadUpdateSettings();
                }}
              >
                <RefreshCw size={14} />
                {t('common.refresh')}
              </button>
            </div>
          )}
          <SettingsAccountTransferSection directoryEntryOnly />
          <fieldset
            className="settings-general-fieldset"
            disabled={!generalLoaded}
            aria-busy={!generalLoaded}
          >
            <div className="group-title">{t('settings.general.commonTitle', "Chung")}</div>
            <div className="settings-group">
              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.language')}</div>
                  <div className="row-desc">{t('settings.general.languageDesc')}</div>
                </div>
                <div className="row-control">
                  <select 
                    className="settings-select" 
                    value={language} 
                    onChange={(e) => setLanguage(normalizeLanguage(e.target.value))}
                  >
                    {languageOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.theme')}</div>
                  <div className="row-desc">{t('settings.general.themeDesc')}</div>
                </div>
                <div className="row-control">
                  <select 
                    className="settings-select" 
                    value={theme} 
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="light">{t('settings.general.themeLight')}</option>
                    <option value="dark">{t('settings.general.themeDark')}</option>
                    <option value="system">{t('settings.general.themeSystem')}</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.reducedMotion', "Giảm chuyển động")}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.reducedMotionDesc',
                      "Giảm fade, chuyển modal, bóng, blur và cuộn mượt; chỉ giữ phản hồi tải cần thiết"
                    )}
                  </div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={reducedMotionEnabled}
                      onChange={(event) => setReducedMotionEnabled(event.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.defaultTerminal', "Terminal mặc định")}</div>
                  <div className="row-desc">{t('settings.general.defaultTerminalDesc', "Terminal được sử dụng khi mở CLI")}</div>
                </div>
                <div className="row-control">
                  <select 
                    className="settings-select" 
                    value={defaultTerminal} 
                    onChange={(e) => setDefaultTerminal(e.target.value)}
                  >
                    {terminalOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.sideNavLayout', "Bố cục thanh bên")}</div>
                  <div className="row-desc">{t('settings.general.sideNavLayoutDesc', "Chuyển giữa bố cục thanh bên gốc và cổ điển")}</div>
                </div>
                <div className="row-control">
                  <select
                    className="settings-select"
                    value={sideNavLayoutMode}
                    onChange={(e) => setSideNavLayoutMode(e.target.value as SideNavLayoutMode)}
                  >
                    <option value="original">{t('settings.general.sideNavLayoutOriginal', "Bố cục gốc")}</option>
                    <option value="classic">{t('settings.general.sideNavLayoutClassic', "Bố cục cổ điển")}</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.uiScale')}</div>
                  <div className="row-desc">{t('settings.general.uiScaleDesc')}</div>
                </div>
                <div className="row-control">
                  <select
                    className="settings-select"
                    value={uiScale}
                    onChange={(e) => setUiScale(e.target.value)}
                  >
                    {UI_SCALE_OPTIONS.map((value) => (
                      <option key={value} value={value}>{`${Math.round(Number.parseFloat(value) * 100)}%`}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.closeBehavior')}</div>
                  <div className="row-desc">{t('settings.general.closeBehaviorDesc')}</div>
                </div>
                <div className="row-control">
                  <select 
                    className="settings-select" 
                    value={closeBehavior} 
                    onChange={(e) => setCloseBehavior(e.target.value as 'ask' | 'minimize' | 'quit')}
                  >
                    <option value="ask">{t('settings.general.closeBehaviorAsk')}</option>
                    <option value="minimize">{t('settings.general.closeBehaviorMinimize')}</option>
                    <option value="quit">{t('settings.general.closeBehaviorQuit')}</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.startupMinimized', "Khởi động thu nhỏ")}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.startupMinimizedDesc',
                      "Tự động thu nhỏ cửa sổ chính sau khi ứng dụng khởi động; khôi phục từ Dock, thanh tác vụ hoặc khay"
                    )}
                  </div>
                </div>
                <div className="row-control">
                  <select
                    className="settings-select"
                    value={startupMinimized ? 'true' : 'false'}
                    onChange={(e) => setStartupMinimized(e.target.value === 'true')}
                  >
                    <option value="false">{t('common.disable', "Disable​")}</option>
                    <option value="true">{t('common.enable', "Enable​")}</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.rememberMainWindowState', "Ghi nhớ vị trí và kích thước cửa sổ")}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.rememberMainWindowStateDesc',
                      "Khôi phục vị trí và kích thước sau khi khởi động lại hoặc mở từ khay; mặc định tắt"
                    )}
                  </div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={rememberMainWindowState}
                      onChange={(event) => setRememberMainWindowState(event.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.autoUpdate')}</div>
                  <div className="row-desc">{t('settings.general.autoUpdateDesc')}</div>
                </div>
                <div className="row-control">
                  <select
                    className="settings-select"
                    value={autoInstall ? 'true' : 'false'}
                    disabled={!autoInstallLoaded}
                    onChange={(e) => {
                      autoInstallTouchedRef.current = true;
                      setAutoInstall(e.target.value === 'true');
                    }}
                  >
                    <option value="false">{t('settings.general.autoUpdateOff')}</option>
                    <option value="true">{t('settings.general.autoUpdateOn')}</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.updateReminder')}</div>
                  <div className="row-desc">{t('settings.general.updateReminderDesc')}</div>
                </div>
                <div className="row-control">
                  <select
                    className="settings-select"
                    value={updateRemindersEnabled ? 'true' : 'false'}
                    disabled={!updateRemindersLoaded}
                    onChange={(e) => {
                      updateRemindersTouchedRef.current = true;
                      setUpdateRemindersEnabled(e.target.value === 'true');
                    }}
                  >
                    <option value="true">{t('settings.general.updateReminderOn')}</option>
                    <option value="false">{t('settings.general.updateReminderOff')}</option>
                  </select>
                </div>
              </div>

              {isMacOS && (
                <>
                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">
                        {t('settings.general.hideDockIcon', "Ẩn biểu tượng Dock (chỉ macOS)?")}
                      </div>
                      <div className="row-desc">
                        {t(
                          'settings.general.hideDockIconDesc',
                          "Điều khiển hiển thị biểu tượng Dock độc lập, không phụ thuộc vào hành vi thu nhỏ cửa sổ"
                        )}
                      </div>
                    </div>
                    <div className="row-control">
                      <select
                        className="settings-select"
                        value={hideDockIcon ? 'true' : 'false'}
                        onChange={(e) => setHideDockIcon(e.target.value === 'true')}
                      >
                        <option value="false">
                          {t('settings.general.hideDockIconOff', "Không (Hiện biểu tượng Dock)")}
                        </option>
                        <option value="true">
                          {t('settings.general.hideDockIconOn', "Có (Ẩn biểu tượng Dock)")}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">
                        {t('settings.general.trayIconStyle', "Kiểu biểu tượng thanh menu (chỉ macOS)")}
                      </div>
                      <div className="row-desc">
                        {t(
                          'settings.general.trayIconStyleDesc',
                          "Chọn biểu tượng đơn sắc của hệ thống hoặc biểu tượng app gốc có màu"
                        )}
                      </div>
                    </div>
                    <div className="row-control">
                      <select
                        className="settings-select"
                        value={trayIconStyle}
                        onChange={(e) =>
                          setTrayIconStyle(e.target.value === 'color' ? 'color' : 'template')
                        }
                      >
                        <option value="template">
                          {t('settings.general.trayIconStyleTemplate', "Biểu tượng đơn sắc")}
                        </option>
                        <option value="color">
                          {t('settings.general.trayIconStyleColor', "Biểu tượng màu")}
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">
                        {t('settings.general.menuBarQuota', "Hạn mức trực tiếp trên thanh menu")}
                      </div>
                      <div className="row-desc">
                        {menuBarQuotaEnabled
                          ? t(
                              'settings.general.menuBarQuotaEnabledDesc',
                              "Đang bật · {{platform}} · còn lại của tài khoản hiện tại nền tảng đó (thấp nhất trong các hạn mức)",
                              {
                                platform:
                                  menuBarQuotaPlatformOptions.find(
                                    (option) => option.value === menuBarQuotaPlatform
                                  )?.label ?? menuBarQuotaPlatform,
                              }
                            )
                          : t(
                              'settings.general.menuBarQuotaDesc',
                              "Khi bật, hiển thị hạn mức còn lại của tài khoản hiện tại nền tảng đã chọn cạnh biểu tượng. Tùy chọn nền tảng trong hộp thoại."
                            )}
                      </div>
                    </div>
                    <div className="row-control">
                      <select
                        className="settings-select"
                        value={menuBarQuotaEnabled ? 'true' : 'false'}
                        onChange={(e) => {
                          if (e.target.value === 'true') {
                            openMenuBarQuotaModal(menuBarQuotaEnabled ? 'edit' : 'enable');
                            return;
                          }
                          setMenuBarQuotaEnabled(false);
                        }}
                      >
                        <option value="false">{t('common.disable', "Disable​")}</option>
                        <option value="true">{t('common.enable', "Enable​")}</option>
                      </select>
                      {menuBarQuotaEnabled ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => openMenuBarQuotaModal('edit')}
                        >
                          {t('settings.general.menuBarQuotaConfigure', "Cấu hình")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </>
              )}

              <FloatingCardSettings
                startup={floatingCardShowOnStartup} onTop={floatingCardAlwaysOnTop}
                onStartupChange={setFloatingCardShowOnStartup} onTopChange={setFloatingCardAlwaysOnTop}
              />

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.appAutoLaunch')}</div>
                  <div className="row-desc">{t('settings.general.appAutoLaunchDesc')}</div>
                </div>
                <div className="row-control">
                  <select
                    className="settings-select"
                    value={appAutoLaunchEnabled ? 'true' : 'false'}
                    onChange={(e) => setAppAutoLaunchEnabled(e.target.value === 'true')}
                  >
                    <option value="false">{t('common.disable', "Disable​")}</option>
                    <option value="true">{t('common.enable', "Enable​")}</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.tokenKeeper', "Giữ auth")}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.tokenKeeperDesc',
                      "Chỉ làm mới Token tài khoản theo từng nhóm nhỏ khi ủy quyền sắp hết hạn, giảm áp lực yêu cầu nền khi có nhiều tài khoản.",
                    )}
                  </div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={tokenKeeperEnabled}
                      onChange={(e) => setTokenKeeperEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.autoImportFromLocal', "Tự nhập tài khoản cục bộ")}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.autoImportFromLocalDesc',
                      "Bật sẽ quét và nhập đăng nhập cục bộ ngay; sau đó tự nhập khi client chính thức đổi tài khoản. Có thể hỏi quyền keychain.",
                    )}
                    {autoImportScanStatus ? (
                      <div
                        className="row-desc-extra"
                        style={{
                          marginTop: 6,
                          opacity: autoImportScanBusy ? 0.9 : 1,
                        }}
                      >
                        {autoImportScanStatus}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={autoImportFromLocalEnabled}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setAutoImportFromLocalEnabled(enabled);
                        if (!enabled) {
                          // Hủy hiệu lực kết quả quét đang chạy để tránh hiển thị lại trạng thái hoàn tất sau khi đóng
                          autoImportScanSeqRef.current += 1;
                          setAutoImportScanBusy(false);
                          setAutoImportScanStatus(
                            autoImportScanBusy
                              ? t(
                                  'settings.general.autoImportFromLocalScanCancelled',
                                  "Đã tắt; kết quả quét đang chạy sẽ bị bỏ qua",
                                )
                              : '',
                          );
                          return;
                        }
                        const scanSeq = ++autoImportScanSeqRef.current;
                        setAutoImportScanBusy(true);
                        setAutoImportScanStatus(
                          t(
                            'settings.general.autoImportFromLocalScanning',
                            "Đang quét tài khoản cục bộ… có thể tắt bất cứ lúc nào",
                          ),
                        );
                        void (async () => {
                          try {
                            // Chờ bản vá tự động được lưu rồi mới quét lại (debounce 300 ms)
                            await new Promise((resolve) => window.setTimeout(resolve, 450));
                            if (autoImportScanSeqRef.current !== scanSeq) {
                              return;
                            }
                            const result = await invoke<{
                              scanned: number;
                              imported: number;
                              failed: number;
                              platforms: string[];
                            }>('scan_auto_local_import');
                            if (autoImportScanSeqRef.current !== scanSeq) {
                              return;
                            }
                            if (result.imported > 0) {
                              setAutoImportScanStatus(
                                t('settings.general.autoImportFromLocalScanDone', {
                                  imported: result.imported,
                                  scanned: result.scanned,
                                  defaultValue:
                                    "Xong: tìm {{scanned}}, đã nhập {{imported}}",
                                }),
                              );
                            } else if (result.failed > 0) {
                              setAutoImportScanStatus(
                                t(
                                  'settings.general.autoImportFromLocalScanPartial',
                                  "Xong: một số nền tảng lỗi",
                                ),
                              );
                            } else {
                              setAutoImportScanStatus(
                                t(
                                  'settings.general.autoImportFromLocalScanEmpty',
                                  "Xong: không có đăng nhập để nhập",
                                ),
                              );
                            }
                          } catch (err) {
                            if (autoImportScanSeqRef.current !== scanSeq) {
                              return;
                            }
                            console.error('Quét nhập tài khoản cục bộ tự động thất bại:', err);
                            setAutoImportScanStatus(
                              t('settings.general.autoImportFromLocalScanFailed', {
                                error: String(err),
                                defaultValue: "Quét thất bại: {{error}}",
                              }),
                            );
                          } finally {
                            if (autoImportScanSeqRef.current === scanSeq) {
                              setAutoImportScanBusy(false);
                            }
                          }
                        })();
                      }}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.errorReporting')}
                  </div>
                  <div className="row-desc">
                    {t('settings.general.errorReportingDesc')}
                  </div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={errorReportingEnabled}
                      disabled={errorReportingSaving}
                      onChange={(e) => void handleErrorReportingEnabledChange(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <FloatingCardShowSetting />

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.dataDir')}</div>
                  <div className="row-desc">{t('settings.general.dataDirDesc')}</div>
                </div>
                <div className="row-control">
                  <button className="btn btn-secondary" onClick={() => accountService.openDataFolder()}>
                    <FolderOpen size={16} />{t('common.open')}
                  </button>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.topRightAdVisible', "Hiện quảng bá trên cùng")}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.topRightAdVisibleDesc',
                      "Ẩn vị trí quảng bá trên cùng trong ứng dụng. Trang Nhà tài trợ không bị ảnh hưởng."
                    )}
                  </div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={topRightAdVisible}
                      onChange={(e) => setTopRightAdVisible(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <StartupPageSetting value={startupPage} onChange={setStartupPage} />

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.themeColor', "Gói màu")}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.themeColorDesc',
                      "Chồng gói màu lên sáng/tối"
                    )}
                  </div>
                </div>
                <div className="row-control">
                  <ThemeColorSetting value={themeColor} onChange={setThemeColor} />
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.externalNetwork', "Cho phép mạng ngoài")}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.externalNetworkDesc',
                      "Tắt: chặn WebDAV, usage OpenRouter, thông báo và kiểm tra cập nhật (tính năng local vẫn chạy)."
                    )}
                  </div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={externalNetworkEnabled}
                      onChange={(e) => setExternalNetworkEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.webdavAllowedDomains', "Danh sách domain WebDAV")}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.webdavAllowedDomainsDesc',
                      "Cách nhau bằng dấu phẩy; trống = không giới hạn"
                    )}
                  </div>
                </div>
                <div className="row-control">
                  <input
                    className="settings-input"
                    value={webdavAllowedDomains}
                    onChange={(e) => setWebdavAllowedDomains(e.target.value)}
                    placeholder="example.com, dav.example.org"
                  />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ order: platformSettingsOrder.antigravity }}>
                <div className="group-title">{t('settings.general.antigravitySettingsTitle', "Cài đặt Antigravity IDE")}</div>
                <div className="settings-group">
              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.autoRefresh')}</div>
                  <div className="row-desc">{t('settings.general.autoRefreshDesc')}</div>
                </div>
                <div className="row-control">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {autoRefreshCustomMode ? (
                      <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={autoRefresh}
                          placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                          onChange={(e) => setAutoRefresh(sanitizeNumberInput(e.target.value))}
                        onBlur={() => {
                          const normalized = normalizeNumberInput(autoRefresh, 1, 999);
                          setAutoRefresh(normalized);
                          setAutoRefreshCustomMode(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const normalized = normalizeNumberInput(autoRefresh, 1, 999);
                            setAutoRefresh(normalized);
                            setAutoRefreshCustomMode(false);
                          }
                        }}
                      />
                        <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        style={{ minWidth: '120px', width: 'auto' }}
                        value={autoRefresh}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setAutoRefreshCustomMode(true);
                            setAutoRefresh(autoRefresh !== '-1' ? autoRefresh : '1');
                            return;
                          }
                          setAutoRefreshCustomMode(false);
                          setAutoRefresh(val);
                        }}
                      >
                        {!autoRefreshIsPreset && (
                          <option value={autoRefresh}>
                            {autoRefresh} {t('settings.general.minutes')}
                          </option>
                        )}
                        <option value="-1" disabled={hasActiveResetTasks}>{t('settings.general.autoRefreshDisabled')}</option>
                        <option value="2">2 {t('settings.general.minutes')}</option>
                        <option value="5" disabled={hasActiveResetTasks}>5 {t('settings.general.minutes')}</option>
                        <option value="10" disabled={hasActiveResetTasks}>10 {t('settings.general.minutes')}</option>
                        <option value="15" disabled={hasActiveResetTasks}>15 {t('settings.general.minutes')}</option>
                        <option value="custom" disabled={hasActiveResetTasks}>{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                  
                  {hasActiveResetTasks && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '12px',
                      marginTop: '8px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: 'var(--accent)',
                      lineHeight: '1.5'
                    }}>
                      <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{t('settings.general.refreshIntervalLimited')}</span>
                    </div>
                  )}
                </div>
              </div>

	              {renderCurrentAccountRefreshRow('antigravity')}
	              {renderAccountLevelRefreshConfig('antigravity')}

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t(
                      'settings.general.antigravityLaunchOnSwitch',
                      "Khởi chạy Antigravity IDE khi chuyển",
                    )}
                  </div>
                  <div className="row-desc">
                    {t(
                      'settings.general.antigravityLaunchOnSwitchDesc',
                      "Khi tắt, việc chuyển chỉ ghi dữ liệu tài khoản mặc định của Antigravity IDE và không đóng, khởi chạy hoặc khởi động lại ứng dụng.",
                    )}
                  </div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={antigravityLaunchOnSwitch}
                      onChange={(e) => setAntigravityLaunchOnSwitch(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

	              <div className="settings-row">
	                <div className="row-label">
	                  <div className="row-title">{t('settings.general.antigravityAppPath', "Đường dẫn ứng dụng Antigravity IDE")}</div>
                  <div className="row-desc">{t('settings.general.codexAppPathDesc', "Để trống để dùng đường dẫn mặc định")}</div>
                </div>
                <div className="row-control row-control--grow">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                    <input
                      type="text"
                      className="settings-input settings-input--path"
                      value={antigravityAppPath}
                      placeholder={t('settings.general.codexAppPathPlaceholder', "Đường dẫn mặc định")}
                      onChange={(e) => setAntigravityAppPath(e.target.value)}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => handlePickAppPath('antigravity')}
                      disabled={isAppPathResetDetecting('antigravity')}
                    >
                      {t('settings.general.codexPathSelect', "Chọn")}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleResetAppPath('antigravity')}
                      disabled={isAppPathResetDetecting('antigravity')}
                    >
                      <RefreshCw size={16} className={isAppPathResetDetecting('antigravity') ? 'spin' : undefined} />
                      {isAppPathResetDetecting('antigravity')
                        ? t('common.loading', "Đang tải...")
                        : getResetLabelByTarget('antigravity')}
                    </button>
                  </div>
                </div>
              </div>

              {antigravitySeamlessSwitchUnlocked && (
                <div className="settings-row">
                  <div className="row-label">
                    <div className="row-title">
                      {t(
                        'settings.general.antigravityDualSwitchNoRestart',
                        "Chuyển đôi không cần khởi động lại"
                      )}
                    </div>
                    <div className="row-desc">
                      {t(
                        'settings.general.antigravityDualSwitchNoRestartDesc',
                        "Khi chuyển tài khoản, việc ghi dữ liệu cục bộ và chuyển đổi liền mạch qua tiện ích mở rộng được thực hiện trong một luồng, không cần khởi động lại Antigravity IDE."
                      )}
                    </div>
                  </div>
                  <div className="row-control">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={antigravityDualSwitchNoRestartEnabled}
                        onChange={(e) =>
                          setAntigravityDualSwitchNoRestartEnabled(e.target.checked)
                        }
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              )}

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('quickSettings.autoSwitch.enable', "Tự động chuyển đổi")}</div>
                  <div className="row-desc">{t('quickSettings.autoSwitch.hint', "Tự động chuyển khi các nhóm mô hình đang theo dõi chạm ngưỡng; nếu bật theo dõi credits, nó cũng sẽ kích hoạt khi credits còn lại thấp hơn ngưỡng.")}</div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={autoSwitchEnabled}
                      onChange={(e) => setAutoSwitchEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              {autoSwitchEnabled && (
                <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                  <div className="row-label">
                    <div className="row-title">{t('quickSettings.autoSwitch.threshold', "Ngưỡng chuyển đổi")}</div>
                    <div className="row-desc">{t('quickSettings.autoSwitch.thresholdDesc', "Tự động chuyển sẽ kích hoạt khi các nhóm mô hình đang theo dõi chạm ngưỡng phần trăm này")}</div>
                  </div>
                  <div className="row-control">
                    {autoSwitchThresholdCustomMode ? (
                      <div className="settings-inline-input">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={autoSwitchThreshold}
                          placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                          onChange={(e) => setAutoSwitchThreshold(sanitizeNumberInput(e.target.value))}
                        onBlur={() => {
                          const normalized = normalizeNumberInput(autoSwitchThreshold, 0, 100);
                          setAutoSwitchThreshold(normalized);
                          setAutoSwitchThresholdCustomMode(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const normalized = normalizeNumberInput(autoSwitchThreshold, 0, 100);
                            setAutoSwitchThreshold(normalized);
                            setAutoSwitchThresholdCustomMode(false);
                          }
                        }}
                      />
                        <span className="settings-input-unit">%</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        value={autoSwitchThreshold}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setAutoSwitchThresholdCustomMode(true);
                            setAutoSwitchThreshold(autoSwitchThreshold || '20');
                            return;
                          }
                          setAutoSwitchThresholdCustomMode(false);
                          setAutoSwitchThreshold(val);
                        }}
                      >
                        {!autoSwitchThresholdIsPreset && (
                          <option value={autoSwitchThreshold}>{autoSwitchThreshold}%</option>
                        )}
                        <option value="0">0%</option>
                        <option value="20">20%</option>
                        <option value="40">40%</option>
                        <option value="60">60%</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              )}
              {autoSwitchEnabled && (
                <div className="settings-row">
                  <div className="row-label">
                    <div className="row-title">
                      {t('quickSettings.autoSwitch.creditsEnable', "Theo dõi credits")}
                    </div>
                    <div className="row-desc">
                      {t('quickSettings.autoSwitch.creditsThresholdDesc', "Cũng tự động chuyển khi credits còn lại nhỏ hơn hoặc bằng giá trị này")}
                    </div>
                  </div>
                  <div className="row-control">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={autoSwitchCreditsEnabled}
                        onChange={(e) => setAutoSwitchCreditsEnabled(e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              )}
              {autoSwitchEnabled && autoSwitchCreditsEnabled && (
                <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                  <div className="row-label">
                    <div className="row-title">
                      {t('quickSettings.autoSwitch.creditsThreshold', "Ngưỡng credits")}
                    </div>
                    <div className="row-desc">
                      {t('quickSettings.autoSwitch.creditsThresholdDesc', "Cũng tự động chuyển khi credits còn lại nhỏ hơn hoặc bằng giá trị này")}
                    </div>
                  </div>
                  <div className="row-control">
                    {autoSwitchCreditsThresholdCustomMode ? (
                      <div className="settings-inline-input">
                        <input
                          type="number"
                          min={0}
                          className="settings-select settings-select--input-mode"
                          value={autoSwitchCreditsThreshold}
                          placeholder={t('quickSettings.inputCredits', "Nhập credits")}
                          onChange={(e) =>
                            setAutoSwitchCreditsThreshold(sanitizeNumberInput(e.target.value))
                          }
                          onBlur={() => {
                            const normalized = normalizeNumberInput(autoSwitchCreditsThreshold, 0);
                            setAutoSwitchCreditsThreshold(normalized);
                            setAutoSwitchCreditsThresholdCustomMode(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(autoSwitchCreditsThreshold, 0);
                              setAutoSwitchCreditsThreshold(normalized);
                              setAutoSwitchCreditsThresholdCustomMode(false);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        value={autoSwitchCreditsThreshold}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setAutoSwitchCreditsThresholdCustomMode(true);
                            setAutoSwitchCreditsThreshold(autoSwitchCreditsThreshold || '5');
                            return;
                          }
                          setAutoSwitchCreditsThresholdCustomMode(false);
                          setAutoSwitchCreditsThreshold(val);
                        }}
                      >
                        {!autoSwitchCreditsThresholdIsPreset && (
                          <option value={autoSwitchCreditsThreshold}>
                            {autoSwitchCreditsThreshold}
                          </option>
                        )}
                        <option value="0">0</option>
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              )}
              {autoSwitchEnabled && (
                <div className="settings-row settings-row--align-start" style={{ animation: 'fadeUp 0.3s ease both' }}>
                  <div className="row-label">
                    <div className="row-title">
                      {t('settings.general.autoSwitchAccountScope')}
                    </div>
                    <div className="row-desc">
                      {t('settings.general.autoSwitchAccountScopeDesc')}
                    </div>
                  </div>
                  <div className="row-control row-control--grow">
                    <AutoSwitchAccountScopeSelector
                      mode={autoSwitchAccountScopeMode}
                      onModeChange={setAutoSwitchAccountScopeMode}
                      selectedAccountIds={autoSwitchSelectedAccountIds}
                      onSelectedAccountIdsChange={setAutoSwitchSelectedAccountIds}
                      accounts={antigravityScopeAccounts}
                      groups={antigravityAccountGroups}
                      typeOptions={antigravityScopeTypeOptions}
                      useDialog
                    />
                  </div>
                </div>
              )}

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                  <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={quotaAlertEnabled}
                      onChange={(e) => setQuotaAlertEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              {quotaAlertEnabled && (
                <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                  <div className="row-label">
                    <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                    <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                  </div>
                  <div className="row-control">
                    {quotaAlertThresholdCustomMode ? (
                      <div className="settings-inline-input">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={quotaAlertThreshold}
                          placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                          onChange={(e) => setQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                          onBlur={() => {
                            const normalized = normalizeNumberInput(quotaAlertThreshold, 0, 100);
                            setQuotaAlertThreshold(normalized);
                            setQuotaAlertThresholdCustomMode(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(quotaAlertThreshold, 0, 100);
                              setQuotaAlertThreshold(normalized);
                              setQuotaAlertThresholdCustomMode(false);
                            }
                          }}
                        />
                        <span className="settings-input-unit">%</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        value={quotaAlertThreshold}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setQuotaAlertThresholdCustomMode(true);
                            setQuotaAlertThreshold(quotaAlertThreshold || '20');
                            return;
                          }
                          setQuotaAlertThresholdCustomMode(false);
                          setQuotaAlertThreshold(val);
                        }}
                      >
                        {!quotaAlertThresholdIsPreset && (
                          <option value={quotaAlertThreshold}>{quotaAlertThreshold}%</option>
                        )}
                        <option value="0">0%</option>
                        <option value="20">20%</option>
                        <option value="40">40%</option>
                        <option value="60">60%</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>

              </div>

              <SettingsCodexPlatformPanel {...props} />

              <div style={{ order: platformSettingsOrder.claude_manager }}>
                <div className="group-title">
                  {t('settings.general.claudeSettingsTitle', "Cài đặt Claude")}
                </div>
                <div className="settings-group">
                  {renderPlatformAutoRefreshRow({
                    title: t(
                      'settings.general.claudeAutoRefresh',
                      "Tự động làm mới hạn mức Claude",
                    ),
                    description: t(
                      'settings.general.claudeAutoRefreshDesc',
                      "Tự động làm mới bộ nhớ đệm hạn mức cho tài khoản Claude trong nền.",
                    ),
                    value: claudeAutoRefresh,
                    setValue: setClaudeAutoRefresh,
                    customMode: claudeAutoRefreshCustomMode,
                    setCustomMode: setClaudeAutoRefreshCustomMode,
                    isPreset: claudeAutoRefreshIsPreset,
                  })}
                  {renderCurrentAccountRefreshRow('claude')}
                  {renderAccountLevelRefreshConfig('claude')}
                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">
                        {t(
                          'settings.general.claudeQuotaDisplayRemaining',
                          "Claude hiển thị % còn lại",
                        )}
                      </div>
                      <div className="row-desc">
                        {t(
                          'settings.general.claudeQuotaDisplayRemainingDesc',
                          "Mặc định % đã dùng. Bật = % còn lại. Tự chuyển và cảnh báo vẫn theo đã dùng.",
                        )}
                      </div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={claudeQuotaDisplayRemaining}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            setClaudeQuotaDisplayRemaining(enabled);
                            setClaudeQuotaDisplayRemainingEnabled(enabled);
                          }}
                        />
                        <span className="slider" />
                      </label>
                    </div>
                  </div>
                  <div className="settings-row settings-row--align-start">
                    <div className="row-label">
                      <div className="row-title">
                        {t('settings.general.claudeAppPath', "Mục tiêu khởi chạy Claude Desktop")}
                      </div>
                      <div className="row-desc">
                        {t(
                          'settings.general.claudeAppPathDesc',
                          "Hồ sơ mặc định có thể dùng mục tiêu Microsoft Store; hồ sơ đa phiên bản cần Claude.exe thật.",
                        )}
                      </div>
                    </div>
                    <div className="row-control row-control--grow settings-claude-launch-control">
                      <div className="settings-claude-launch-row">
                        <input
                          type="text"
                          className="settings-input settings-input--path"
                          value={claudeAppPath}
                          placeholder={t(
                            'quickSettings.claude.appTargetPlaceholder',
                            "Đường dẫn Claude.exe hoặc shell:AppsFolder\\...",
                          )}
                          onChange={(e) => setClaudeAppPath(e.target.value)}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={() => handlePickAppPath('claude')}
                          disabled={isAppPathResetDetecting('claude')}
                        >
                          {t('settings.general.codexPathSelect', "Chọn")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleResetAppPath('claude')}
                          disabled={isAppPathResetDetecting('claude')}
                        >
                          <RefreshCw
                            size={16}
                            className={isAppPathResetDetecting('claude') ? 'spin' : undefined}
                          />
                          {isAppPathResetDetecting('claude')
                            ? t('common.loading', "Đang tải...")
                            : getResetLabelByTarget('claude')}
                        </button>
                      </div>
                      {claudeLaunchCandidates.length > 0 ? (
                        <div className="settings-claude-candidate-list">
                          {claudeLaunchCandidates.map((candidate) => (
                            <button
                              key={`${candidate.target_type}:${candidate.target}`}
                              type="button"
                              className={`settings-claude-candidate-item${
                                claudeAppPath.trim() === candidate.target ? ' selected' : ''
                              }`}
                              onClick={() => handleSelectClaudeLaunchCandidate(candidate)}
                            >
                              <div className="settings-claude-candidate-main">
                                <span>{candidate.label || 'Claude Desktop'}</span>
                                <span className="settings-claude-candidate-badge">
                                  {candidate.target_type === 'windows_app'
                                    ? t('appPath.missing.windowsApp', 'Microsoft Store')
                                    : 'EXE'}
                                </span>
                              </div>
                              <div className="settings-claude-candidate-target">
                                {candidate.target}
                              </div>
                              {!candidate.supports_multi_instance ? (
                                <div className="settings-claude-candidate-note">
                                  {t(
                                    'appPath.missing.defaultOnly',
                                    "Chỉ dành cho desktop mặc định; hãy chọn Claude.exe thật cho hồ sơ đa phiên bản.",
                                  )}
                                </div>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {renderPlatformQuotaAlertRows({
                    enabled: claudeQuotaAlertEnabled,
                    setEnabled: setClaudeQuotaAlertEnabled,
                    threshold: claudeQuotaAlertThreshold,
                    setThreshold: setClaudeQuotaAlertThreshold,
                    customMode: claudeQuotaAlertThresholdCustomMode,
                    setCustomMode: setClaudeQuotaAlertThresholdCustomMode,
                    isPreset: claudeQuotaAlertThresholdIsPreset,
                  })}
                </div>
              </div>

              <div style={{ order: platformSettingsOrder['github-copilot'] }}>
                <div className="group-title">{t('settings.general.githubCopilotSettingsTitle', "Cài đặt GitHub Copilot")}</div>
                <div className="settings-group">
              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.ghcpAutoRefresh', "Tự động làm mới quota GitHub Copilot")}</div>
                  <div className="row-desc">{t('settings.general.ghcpAutoRefreshDesc', "Tần suất cập nhật nền")}</div>
                </div>
                <div className="row-control">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {ghcpAutoRefreshCustomMode ? (
                      <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={ghcpAutoRefresh}
                          placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                          onChange={(e) => setGhcpAutoRefresh(sanitizeNumberInput(e.target.value))}
                        onBlur={() => {
                          const normalized = normalizeNumberInput(ghcpAutoRefresh, 1, 999);
                          setGhcpAutoRefresh(normalized);
                          setGhcpAutoRefreshCustomMode(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const normalized = normalizeNumberInput(ghcpAutoRefresh, 1, 999);
                            setGhcpAutoRefresh(normalized);
                            setGhcpAutoRefreshCustomMode(false);
                          }
                        }}
                      />
                        <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        style={{ minWidth: '120px', width: 'auto' }}
                        value={ghcpAutoRefresh}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setGhcpAutoRefreshCustomMode(true);
                            setGhcpAutoRefresh(ghcpAutoRefresh !== '-1' ? ghcpAutoRefresh : '1');
                            return;
                          }
                          setGhcpAutoRefreshCustomMode(false);
                          setGhcpAutoRefresh(val);
                        }}
                      >
                        {!ghcpAutoRefreshIsPreset && (
                          <option value={ghcpAutoRefresh}>
                            {ghcpAutoRefresh} {t('settings.general.minutes')}
                          </option>
                        )}
                        <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                        <option value="2">2 {t('settings.general.minutes')}</option>
                        <option value="5">5 {t('settings.general.minutes')}</option>
                        <option value="10">10 {t('settings.general.minutes')}</option>
                        <option value="15">15 {t('settings.general.minutes')}</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {renderCurrentAccountRefreshRow('ghcp')}
              {renderAccountLevelRefreshConfig('ghcp')}

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.vscodeAppPath', "Đường dẫn ứng dụng VS Code")}</div>
                  <div className="row-desc">{t('settings.general.vscodeAppPathDesc', "Để trống để dùng đường dẫn mặc định")}</div>
                </div>
                <div className="row-control row-control--grow">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                    <input
                      type="text"
                      className="settings-input settings-input--path"
                      value={vscodeAppPath}
                      placeholder={t('settings.general.vscodeAppPathPlaceholder', "Đường dẫn mặc định")}
                      onChange={(e) => setVscodeAppPath(e.target.value)}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => handlePickAppPath('vscode')}
                      disabled={isAppPathResetDetecting('vscode')}
                    >
                      {t('settings.general.vscodePathSelect', "Chọn")}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleResetAppPath('vscode')}
                      disabled={isAppPathResetDetecting('vscode')}
                    >
                      <RefreshCw size={16} className={isAppPathResetDetecting('vscode') ? 'spin' : undefined} />
                      {isAppPathResetDetecting('vscode')
                        ? t('common.loading', "Đang tải...")
                        : getResetLabelByTarget('vscode')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                  <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={ghcpQuotaAlertEnabled}
                      onChange={(e) => setGhcpQuotaAlertEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              {ghcpQuotaAlertEnabled && (
                <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                  <div className="row-label">
                    <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                    <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                  </div>
                  <div className="row-control">
                    {ghcpQuotaAlertThresholdCustomMode ? (
                      <div className="settings-inline-input">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={ghcpQuotaAlertThreshold}
                          placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                          onChange={(e) => setGhcpQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                          onBlur={() => {
                            const normalized = normalizeNumberInput(ghcpQuotaAlertThreshold, 0, 100);
                            setGhcpQuotaAlertThreshold(normalized);
                            setGhcpQuotaAlertThresholdCustomMode(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(ghcpQuotaAlertThreshold, 0, 100);
                              setGhcpQuotaAlertThreshold(normalized);
                              setGhcpQuotaAlertThresholdCustomMode(false);
                            }
                          }}
                        />
                        <span className="settings-input-unit">%</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        value={ghcpQuotaAlertThreshold}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setGhcpQuotaAlertThresholdCustomMode(true);
                            setGhcpQuotaAlertThreshold(ghcpQuotaAlertThreshold || '20');
                            return;
                          }
                          setGhcpQuotaAlertThresholdCustomMode(false);
                          setGhcpQuotaAlertThreshold(val);
                        }}
                      >
                        {!ghcpQuotaAlertThresholdIsPreset && (
                          <option value={ghcpQuotaAlertThreshold}>{ghcpQuotaAlertThreshold}%</option>
                        )}
                        <option value="0">0%</option>
                        <option value="20">20%</option>
                        <option value="40">40%</option>
                        <option value="60">60%</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>

              </div>

              <div style={{ order: platformSettingsOrder.windsurf }}>
                <div className="group-title">{t('settings.general.windsurfSettingsTitle', "Cài đặt Devin")}</div>
                <div className="settings-group">
              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.windsurfAutoRefresh', "Tự động làm mới hạn mức Devin")}</div>
                  <div className="row-desc">{t('settings.general.windsurfAutoRefreshDesc', "Tần suất cập nhật tự động dưới nền")}</div>
                </div>
                <div className="row-control">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {windsurfAutoRefreshCustomMode ? (
                      <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={windsurfAutoRefresh}
                          placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                          onChange={(e) => setWindsurfAutoRefresh(sanitizeNumberInput(e.target.value))}
                        onBlur={() => {
                          const normalized = normalizeNumberInput(windsurfAutoRefresh, 1, 999);
                          setWindsurfAutoRefresh(normalized);
                          setWindsurfAutoRefreshCustomMode(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const normalized = normalizeNumberInput(windsurfAutoRefresh, 1, 999);
                            setWindsurfAutoRefresh(normalized);
                            setWindsurfAutoRefreshCustomMode(false);
                          }
                        }}
                      />
                        <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        style={{ minWidth: '120px', width: 'auto' }}
                        value={windsurfAutoRefresh}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setWindsurfAutoRefreshCustomMode(true);
                            setWindsurfAutoRefresh(windsurfAutoRefresh !== '-1' ? windsurfAutoRefresh : '1');
                            return;
                          }
                          setWindsurfAutoRefreshCustomMode(false);
                          setWindsurfAutoRefresh(val);
                        }}
                      >
                        {!windsurfAutoRefreshIsPreset && (
                          <option value={windsurfAutoRefresh}>
                            {windsurfAutoRefresh} {t('settings.general.minutes')}
                          </option>
                        )}
                        <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                        <option value="2">2 {t('settings.general.minutes')}</option>
                        <option value="5">5 {t('settings.general.minutes')}</option>
                        <option value="10">10 {t('settings.general.minutes')}</option>
                        <option value="15">15 {t('settings.general.minutes')}</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {renderCurrentAccountRefreshRow('windsurf')}
              {renderAccountLevelRefreshConfig('windsurf')}

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.windsurfAppPath', "Đường dẫn ứng dụng Devin")}</div>
                  <div className="row-desc">{t('settings.general.windsurfAppPathDesc', "Để trống để dùng đường dẫn mặc định")}</div>
                </div>
                <div className="row-control row-control--grow">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                    <input
                      type="text"
                      className="settings-input settings-input--path"
                      value={windsurfAppPath}
                      placeholder={t('settings.general.windsurfAppPathPlaceholder', "Đường dẫn mặc định")}
                      onChange={(e) => setWindsurfAppPath(e.target.value)}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => handlePickAppPath('windsurf')}
                      disabled={isAppPathResetDetecting('windsurf')}
                    >
                      {t('settings.general.windsurfPathSelect', "Chọn")}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleResetAppPath('windsurf')}
                      disabled={isAppPathResetDetecting('windsurf')}
                    >
                      <RefreshCw size={16} className={isAppPathResetDetecting('windsurf') ? 'spin' : undefined} />
                      {isAppPathResetDetecting('windsurf')
                        ? t('common.loading', "Đang tải...")
                        : getResetLabelByTarget('windsurf')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                  <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={windsurfQuotaAlertEnabled}
                      onChange={(e) => setWindsurfQuotaAlertEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              {windsurfQuotaAlertEnabled && (
                <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                  <div className="row-label">
                    <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                    <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                  </div>
                  <div className="row-control">
                    {windsurfQuotaAlertThresholdCustomMode ? (
                      <div className="settings-inline-input">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={windsurfQuotaAlertThreshold}
                          placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                          onChange={(e) => setWindsurfQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                          onBlur={() => {
                            const normalized = normalizeNumberInput(windsurfQuotaAlertThreshold, 0, 100);
                            setWindsurfQuotaAlertThreshold(normalized);
                            setWindsurfQuotaAlertThresholdCustomMode(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(windsurfQuotaAlertThreshold, 0, 100);
                              setWindsurfQuotaAlertThreshold(normalized);
                              setWindsurfQuotaAlertThresholdCustomMode(false);
                            }
                          }}
                        />
                        <span className="settings-input-unit">%</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        value={windsurfQuotaAlertThreshold}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setWindsurfQuotaAlertThresholdCustomMode(true);
                            setWindsurfQuotaAlertThreshold(windsurfQuotaAlertThreshold || '20');
                            return;
                          }
                          setWindsurfQuotaAlertThresholdCustomMode(false);
                          setWindsurfQuotaAlertThreshold(val);
                        }}
                      >
                        {!windsurfQuotaAlertThresholdIsPreset && (
                          <option value={windsurfQuotaAlertThreshold}>{windsurfQuotaAlertThreshold}%</option>
                        )}
                        <option value="0">0%</option>
                        <option value="20">20%</option>
                        <option value="40">40%</option>
                        <option value="60">60%</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>

              </div>

              <div style={{ order: platformSettingsOrder.kiro }}>
                <div className="group-title">{t('settings.general.kiroSettingsTitle', "Cài đặt Kiro")}</div>
                <div className="settings-group">
              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.kiroAutoRefresh', "Hạn ngạch làm mới tự động của Kiro")}</div>
                  <div className="row-desc">{t('settings.general.kiroAutoRefreshDesc', "Tần suất cập nhật nền")}</div>
                </div>
                <div className="row-control">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {kiroAutoRefreshCustomMode ? (
                      <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={kiroAutoRefresh}
                          placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                          onChange={(e) => setKiroAutoRefresh(sanitizeNumberInput(e.target.value))}
                          onBlur={() => {
                            const normalized = normalizeNumberInput(kiroAutoRefresh, 1, 999);
                            setKiroAutoRefresh(normalized);
                            setKiroAutoRefreshCustomMode(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(kiroAutoRefresh, 1, 999);
                              setKiroAutoRefresh(normalized);
                              setKiroAutoRefreshCustomMode(false);
                            }
                          }}
                        />
                        <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        style={{ minWidth: '120px', width: 'auto' }}
                        value={kiroAutoRefresh}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setKiroAutoRefreshCustomMode(true);
                            setKiroAutoRefresh(kiroAutoRefresh !== '-1' ? kiroAutoRefresh : '1');
                            return;
                          }
                          setKiroAutoRefreshCustomMode(false);
                          setKiroAutoRefresh(val);
                        }}
                      >
                        {!kiroAutoRefreshIsPreset && (
                          <option value={kiroAutoRefresh}>
                            {kiroAutoRefresh} {t('settings.general.minutes')}
                          </option>
                        )}
                        <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                        <option value="2">2 {t('settings.general.minutes')}</option>
                        <option value="5">5 {t('settings.general.minutes')}</option>
                        <option value="10">10 {t('settings.general.minutes')}</option>
                        <option value="15">15 {t('settings.general.minutes')}</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {renderCurrentAccountRefreshRow('kiro')}
              {renderAccountLevelRefreshConfig('kiro')}

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.kiroAppPath', "Đường dẫn ứng dụng Kiro")}</div>
                  <div className="row-desc">{t('settings.general.kiroAppPathDesc', "Để trống để sử dụng đường dẫn mặc định")}</div>
                </div>
                <div className="row-control row-control--grow">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                    <input
                      type="text"
                      className="settings-input settings-input--path"
                      value={kiroAppPath}
                      placeholder={t('settings.general.kiroAppPathPlaceholder', "Đường dẫn mặc định")}
                      onChange={(e) => setKiroAppPath(e.target.value)}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => handlePickAppPath('kiro')}
                      disabled={isAppPathResetDetecting('kiro')}
                    >
                      {t('settings.general.kiroPathSelect', "Lựa chọn")}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleResetAppPath('kiro')}
                      disabled={isAppPathResetDetecting('kiro')}
                    >
                      <RefreshCw size={16} className={isAppPathResetDetecting('kiro') ? 'spin' : undefined} />
                      {isAppPathResetDetecting('kiro')
                        ? t('common.loading', "Đang tải...")
                        : getResetLabelByTarget('kiro')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                  <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={kiroQuotaAlertEnabled}
                      onChange={(e) => setKiroQuotaAlertEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              {kiroQuotaAlertEnabled && (
                <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                  <div className="row-label">
                    <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                    <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                  </div>
                  <div className="row-control">
                    {kiroQuotaAlertThresholdCustomMode ? (
                      <div className="settings-inline-input">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={kiroQuotaAlertThreshold}
                          placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                          onChange={(e) => setKiroQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                          onBlur={() => {
                            const normalized = normalizeNumberInput(kiroQuotaAlertThreshold, 0, 100);
                            setKiroQuotaAlertThreshold(normalized);
                            setKiroQuotaAlertThresholdCustomMode(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(kiroQuotaAlertThreshold, 0, 100);
                              setKiroQuotaAlertThreshold(normalized);
                              setKiroQuotaAlertThresholdCustomMode(false);
                            }
                          }}
                        />
                        <span className="settings-input-unit">%</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        value={kiroQuotaAlertThreshold}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setKiroQuotaAlertThresholdCustomMode(true);
                            setKiroQuotaAlertThreshold(kiroQuotaAlertThreshold || '20');
                            return;
                          }
                          setKiroQuotaAlertThresholdCustomMode(false);
                          setKiroQuotaAlertThreshold(val);
                        }}
                      >
                        {!kiroQuotaAlertThresholdIsPreset && (
                          <option value={kiroQuotaAlertThreshold}>{kiroQuotaAlertThreshold}%</option>
                        )}
                        <option value="0">0%</option>
                        <option value="20">20%</option>
                        <option value="40">40%</option>
                        <option value="60">60%</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
              </div>

              <div style={{ order: platformSettingsOrder.codebuddy }}>
                <div className="group-title">{t('settings.general.codebuddySettingsTitle', "Cài đặt CodeBuddy")}</div>
                <div className="settings-group">
              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.codebuddyAutoRefresh', "Tự động làm mới hạn ngạch CodeBuddy")}</div>
                  <div className="row-desc">{t('settings.general.codebuddyAutoRefreshDesc', "Tần suất tự động cập nhật nền")}</div>
                </div>
                <div className="row-control">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {codebuddyAutoRefreshCustomMode ? (
                      <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={codebuddyAutoRefresh}
                          placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                          onChange={(e) => setCodebuddyAutoRefresh(sanitizeNumberInput(e.target.value))}
                          onBlur={() => {
                            const normalized = normalizeNumberInput(codebuddyAutoRefresh, 1, 999);
                            if (REFRESH_PRESET_VALUES.includes(normalized)) {
                              setCodebuddyAutoRefreshCustomMode(false);
                            }
                            setCodebuddyAutoRefresh(normalized);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(codebuddyAutoRefresh, 1, 999);
                              setCodebuddyAutoRefreshCustomMode(false);
                              setCodebuddyAutoRefresh(normalized);
                            }
                          }}
                        />
                        <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        style={{ minWidth: '120px', width: 'auto' }}
                        value={codebuddyAutoRefresh}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setCodebuddyAutoRefreshCustomMode(true);
                            setCodebuddyAutoRefresh(codebuddyAutoRefresh !== '-1' ? codebuddyAutoRefresh : '1');
                            return;
                          }
                          setCodebuddyAutoRefreshCustomMode(false);
                          setCodebuddyAutoRefresh(val);
                        }}
                      >
                        {!codebuddyAutoRefreshIsPreset && (
                          <option value={codebuddyAutoRefresh}>
                            {codebuddyAutoRefresh} {t('settings.general.minutes')}
                          </option>
                        )}
                        <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                        <option value="2">2 {t('settings.general.minutes')}</option>
                        <option value="5">5 {t('settings.general.minutes')}</option>
                        <option value="10">10 {t('settings.general.minutes')}</option>
                        <option value="15">15 {t('settings.general.minutes')}</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {renderCurrentAccountRefreshRow('codebuddy')}
              {renderAccountLevelRefreshConfig('codebuddy')}

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">
                    {t('settings.general.codebuddyShareSessionsOnSwitch')}
                  </div>
                  <div className="row-desc">
                    {t('settings.general.codebuddyShareSessionsOnSwitchDesc')}
                  </div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={codebuddyShareSessionsOnSwitch}
                      onChange={(event) => setCodebuddyShareSessionsOnSwitch(event.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('settings.general.codebuddyAppPath', "Đường dẫn khởi động CodeBuddy")}</div>
                  <div className="row-desc">{t('settings.general.codebuddyAppPathDesc', "Để trống để dùng đường dẫn mặc định")}</div>
                </div>
                <div className="row-control row-control--grow">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                    <input
                      type="text"
                      className="settings-input settings-input--path"
                      value={codebuddyAppPath}
                      placeholder={t('settings.general.codebuddyAppPathPlaceholder', "Đường dẫn mặc định")}
                      onChange={(e) => setCodebuddyAppPath(e.target.value)}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => handlePickAppPath('codebuddy')}
                      disabled={isAppPathResetDetecting('codebuddy')}
                    >
                      {t('settings.general.codebuddyPathSelect', "Chọn")}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleResetAppPath('codebuddy')}
                      disabled={isAppPathResetDetecting('codebuddy')}
                    >
                      <RefreshCw size={16} className={isAppPathResetDetecting('codebuddy') ? 'spin' : undefined} />
                      {isAppPathResetDetecting('codebuddy')
                        ? t('common.loading', "Đang tải...")
                        : getResetLabelByTarget('codebuddy')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                  <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={codebuddyQuotaAlertEnabled}
                      onChange={(e) => setCodebuddyQuotaAlertEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              {codebuddyQuotaAlertEnabled && (
                <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                  <div className="row-label">
                    <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                    <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                  </div>
                  <div className="row-control">
                    {codebuddyQuotaAlertThresholdCustomMode ? (
                      <div className="settings-inline-input">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={codebuddyQuotaAlertThreshold}
                          placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                          onChange={(e) => setCodebuddyQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                          onBlur={() => {
                            const normalized = normalizeNumberInput(codebuddyQuotaAlertThreshold, 0, 100);
                            if (THRESHOLD_PRESET_VALUES.includes(normalized)) {
                              setCodebuddyQuotaAlertThresholdCustomMode(false);
                            }
                            setCodebuddyQuotaAlertThreshold(normalized);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(codebuddyQuotaAlertThreshold, 0, 100);
                              setCodebuddyQuotaAlertThresholdCustomMode(false);
                              setCodebuddyQuotaAlertThreshold(normalized);
                            }
                          }}
                        />
                        <span className="settings-input-unit">%</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        value={codebuddyQuotaAlertThreshold}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setCodebuddyQuotaAlertThresholdCustomMode(true);
                            setCodebuddyQuotaAlertThreshold(codebuddyQuotaAlertThreshold || '20');
                            return;
                          }
                          setCodebuddyQuotaAlertThresholdCustomMode(false);
                          setCodebuddyQuotaAlertThreshold(val);
                        }}
                      >
                        {!codebuddyQuotaAlertThresholdIsPreset && (
                          <option value={codebuddyQuotaAlertThreshold}>{codebuddyQuotaAlertThreshold}%</option>
                        )}
                        <option value="0">0%</option>
                        <option value="20">20%</option>
                        <option value="40">40%</option>
                        <option value="60">60%</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
              </div>

              <div style={{ order: platformSettingsOrder.codebuddy_cn }}>
                <div className="group-title">{t('settings.general.codebuddyCnSettingsTitle', "Cài đặt CodeBuddy CN")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.codebuddyCnAutoRefresh', "Tự động làm mới hạn ngạch CodeBuddy CN")}</div>
                      <div className="row-desc">{t('settings.general.codebuddyCnAutoRefreshDesc', "Tần suất tự động làm mới nền")}</div>
                    </div>
                    <div className="row-control">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {codebuddyCnAutoRefreshCustomMode ? (
                          <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={codebuddyCnAutoRefresh}
                              placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                              onChange={(e) => setCodebuddyCnAutoRefresh(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(codebuddyCnAutoRefresh, 1, 999);
                                if (REFRESH_PRESET_VALUES.includes(normalized)) {
                                  setCodebuddyCnAutoRefreshCustomMode(false);
                                }
                                setCodebuddyCnAutoRefresh(normalized);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(codebuddyCnAutoRefresh, 1, 999);
                                  setCodebuddyCnAutoRefreshCustomMode(false);
                                  setCodebuddyCnAutoRefresh(normalized);
                                }
                              }}
                            />
                            <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            style={{ minWidth: '120px', width: 'auto' }}
                            value={codebuddyCnAutoRefresh}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setCodebuddyCnAutoRefreshCustomMode(true);
                                setCodebuddyCnAutoRefresh(codebuddyCnAutoRefresh !== '-1' ? codebuddyCnAutoRefresh : '1');
                                return;
                              }
                              setCodebuddyCnAutoRefreshCustomMode(false);
                              setCodebuddyCnAutoRefresh(val);
                            }}
                          >
                            {!codebuddyCnAutoRefreshIsPreset && (
                              <option value={codebuddyCnAutoRefresh}>
                                {codebuddyCnAutoRefresh} {t('settings.general.minutes')}
                              </option>
                            )}
                            <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                            <option value="2">2 {t('settings.general.minutes')}</option>
                            <option value="5">5 {t('settings.general.minutes')}</option>
                            <option value="10">10 {t('settings.general.minutes')}</option>
                            <option value="15">15 {t('settings.general.minutes')}</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderCurrentAccountRefreshRow('codebuddy_cn')}
                  {renderAccountLevelRefreshConfig('codebuddy_cn')}
                  {renderSessionSharingRow(
                    'CodeBuddy CN',
                    codebuddyCnShareSessionsOnSwitch,
                    setCodebuddyCnShareSessionsOnSwitch,
                    true,
                  )}

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.codebuddyCnAppPath', "Đường dẫn ứng dụng CodeBuddy CN")}</div>
                      <div className="row-desc">{t('settings.general.codebuddyCnAppPathDesc', "Để trống để sử dụng đường dẫn mặc định")}</div>
                    </div>
                    <div className="row-control row-control--grow">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                        <input
                          type="text"
                          className="settings-input settings-input--path"
                          value={codebuddyCnAppPath}
                          placeholder={t('settings.general.codebuddyCnAppPathPlaceholder', "Đường dẫn mặc định")}
                          onChange={(e) => setCodebuddyCnAppPath(e.target.value)}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={() => handlePickAppPath('codebuddy_cn')}
                          disabled={isAppPathResetDetecting('codebuddy_cn')}
                        >
                          {t('settings.general.codebuddyCnPathSelect', "Chọn")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleResetAppPath('codebuddy_cn')}
                          disabled={isAppPathResetDetecting('codebuddy_cn')}
                        >
                          <RefreshCw size={16} className={isAppPathResetDetecting('codebuddy_cn') ? 'spin' : undefined} />
                          {isAppPathResetDetecting('codebuddy_cn')
                            ? t('common.loading', "Đang tải...")
                            : getResetLabelByTarget('codebuddy_cn')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                      <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={codebuddyCnQuotaAlertEnabled}
                          onChange={(e) => setCodebuddyCnQuotaAlertEnabled(e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  {codebuddyCnQuotaAlertEnabled && (
                    <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                      <div className="row-label">
                        <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                        <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                      </div>
                      <div className="row-control">
                        {codebuddyCnQuotaAlertThresholdCustomMode ? (
                          <div className="settings-inline-input">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={codebuddyCnQuotaAlertThreshold}
                              placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                              onChange={(e) => setCodebuddyCnQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(codebuddyCnQuotaAlertThreshold, 0, 100);
                                if (THRESHOLD_PRESET_VALUES.includes(normalized)) {
                                  setCodebuddyCnQuotaAlertThresholdCustomMode(false);
                                }
                                setCodebuddyCnQuotaAlertThreshold(normalized);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(codebuddyCnQuotaAlertThreshold, 0, 100);
                                  setCodebuddyCnQuotaAlertThresholdCustomMode(false);
                                  setCodebuddyCnQuotaAlertThreshold(normalized);
                                }
                              }}
                            />
                            <span className="settings-input-unit">%</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            value={codebuddyCnQuotaAlertThreshold}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setCodebuddyCnQuotaAlertThresholdCustomMode(true);
                                setCodebuddyCnQuotaAlertThreshold(codebuddyCnQuotaAlertThreshold || '20');
                                return;
                              }
                              setCodebuddyCnQuotaAlertThresholdCustomMode(false);
                              setCodebuddyCnQuotaAlertThreshold(val);
                            }}
                          >
                            {!codebuddyCnQuotaAlertThresholdIsPreset && (
                              <option value={codebuddyCnQuotaAlertThreshold}>{codebuddyCnQuotaAlertThreshold}%</option>
                            )}
                            <option value="0">0%</option>
                            <option value="20">20%</option>
                            <option value="40">40%</option>
                            <option value="60">60%</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ order: platformSettingsOrder.qoder }}>
                <div className="group-title">{t('quickSettings.qoder.title', "Cài đặt Qoder")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.qoderAutoRefresh', "Tự động làm mới hạn ngạch Qoder")}</div>
                      <div className="row-desc">{t('settings.general.qoderAutoRefreshDesc', "Tần suất tự động làm mới nền")}</div>
                    </div>
                    <div className="row-control">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {qoderAutoRefreshCustomMode ? (
                          <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={qoderAutoRefresh}
                              placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                              onChange={(e) => setQoderAutoRefresh(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(qoderAutoRefresh, 1, 999);
                                if (REFRESH_PRESET_VALUES.includes(normalized)) {
                                  setQoderAutoRefreshCustomMode(false);
                                }
                                setQoderAutoRefresh(normalized);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(qoderAutoRefresh, 1, 999);
                                  setQoderAutoRefreshCustomMode(false);
                                  setQoderAutoRefresh(normalized);
                                }
                              }}
                            />
                            <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            style={{ minWidth: '120px', width: 'auto' }}
                            value={qoderAutoRefresh}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setQoderAutoRefreshCustomMode(true);
                                setQoderAutoRefresh(qoderAutoRefresh !== '-1' ? qoderAutoRefresh : '1');
                                return;
                              }
                              setQoderAutoRefreshCustomMode(false);
                              setQoderAutoRefresh(val);
                            }}
                          >
                            {!qoderAutoRefreshIsPreset && (
                              <option value={qoderAutoRefresh}>
                                {qoderAutoRefresh} {t('settings.general.minutes')}
                              </option>
                            )}
                            <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                            <option value="2">2 {t('settings.general.minutes')}</option>
                            <option value="5">5 {t('settings.general.minutes')}</option>
                            <option value="10">10 {t('settings.general.minutes')}</option>
                            <option value="15">15 {t('settings.general.minutes')}</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderCurrentAccountRefreshRow('qoder')}
                  {renderAccountLevelRefreshConfig('qoder')}

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.qoderAppPath', "Đường dẫn ứng dụng Qoder")}</div>
                      <div className="row-desc">{t('settings.general.qoderAppPathDesc', "Để trống để sử dụng đường dẫn mặc định")}</div>
                    </div>
                    <div className="row-control row-control--grow">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                        <input
                          type="text"
                          className="settings-input settings-input--path"
                          value={qoderAppPath}
                          placeholder={t('settings.general.qoderAppPathPlaceholder', "Đường dẫn mặc định")}
                          onChange={(e) => setQoderAppPath(e.target.value)}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={() => handlePickAppPath('qoder')}
                          disabled={isAppPathResetDetecting('qoder')}
                        >
                          {t('settings.general.qoderPathSelect', "Chọn")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleResetAppPath('qoder')}
                          disabled={isAppPathResetDetecting('qoder')}
                        >
                          <RefreshCw size={16} className={isAppPathResetDetecting('qoder') ? 'spin' : undefined} />
                          {isAppPathResetDetecting('qoder')
                            ? t('common.loading', "Đang tải...")
                            : getResetLabelByTarget('qoder')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                      <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={qoderQuotaAlertEnabled}
                          onChange={(e) => setQoderQuotaAlertEnabled(e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  {qoderQuotaAlertEnabled && (
                    <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                      <div className="row-label">
                        <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                        <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                      </div>
                      <div className="row-control">
                        {qoderQuotaAlertThresholdCustomMode ? (
                          <div className="settings-inline-input">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={qoderQuotaAlertThreshold}
                              placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                              onChange={(e) => setQoderQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(qoderQuotaAlertThreshold, 0, 100);
                                if (THRESHOLD_PRESET_VALUES.includes(normalized)) {
                                  setQoderQuotaAlertThresholdCustomMode(false);
                                }
                                setQoderQuotaAlertThreshold(normalized);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(qoderQuotaAlertThreshold, 0, 100);
                                  setQoderQuotaAlertThresholdCustomMode(false);
                                  setQoderQuotaAlertThreshold(normalized);
                                }
                              }}
                            />
                            <span className="settings-input-unit">%</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            value={qoderQuotaAlertThreshold}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setQoderQuotaAlertThresholdCustomMode(true);
                                setQoderQuotaAlertThreshold(qoderQuotaAlertThreshold || '20');
                                return;
                              }
                              setQoderQuotaAlertThresholdCustomMode(false);
                              setQoderQuotaAlertThreshold(val);
                            }}
                          >
                            {!qoderQuotaAlertThresholdIsPreset && (
                              <option value={qoderQuotaAlertThreshold}>{qoderQuotaAlertThreshold}%</option>
                            )}
                            <option value="0">0%</option>
                            <option value="20">20%</option>
                            <option value="40">40%</option>
                            <option value="60">60%</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ order: platformSettingsOrder.zcode }}>
                <div className="group-title">{t('quickSettings.zcode.title', "Cài đặt ZCode")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.zcodeAutoRefresh', "Tự động làm mới ZCode")}</div>
                      <div className="row-desc">{t('settings.general.zcodeAutoRefreshDesc', "Khoảng làm mới hạn mức trong nền")}</div>
                    </div>
                    <div className="row-control">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {zcodeAutoRefreshCustomMode ? (
                          <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={zcodeAutoRefresh}
                              placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                              onChange={(event) => setZcodeAutoRefresh(sanitizeNumberInput(event.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(zcodeAutoRefresh, 1, 999);
                                if (REFRESH_PRESET_VALUES.includes(normalized)) {
                                  setZcodeAutoRefreshCustomMode(false);
                                }
                                setZcodeAutoRefresh(normalized);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  const normalized = normalizeNumberInput(zcodeAutoRefresh, 1, 999);
                                  setZcodeAutoRefreshCustomMode(false);
                                  setZcodeAutoRefresh(normalized);
                                }
                              }}
                            />
                            <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            style={{ minWidth: '120px', width: 'auto' }}
                            value={zcodeAutoRefresh}
                            onChange={(event) => {
                              const value = event.target.value;
                              if (value === 'custom') {
                                setZcodeAutoRefreshCustomMode(true);
                                setZcodeAutoRefresh(zcodeAutoRefresh !== '-1' ? zcodeAutoRefresh : '1');
                                return;
                              }
                              setZcodeAutoRefreshCustomMode(false);
                              setZcodeAutoRefresh(value);
                            }}
                          >
                            {!zcodeAutoRefreshIsPreset && (
                              <option value={zcodeAutoRefresh}>
                                {zcodeAutoRefresh} {t('settings.general.minutes')}
                              </option>
                            )}
                            <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                            <option value="2">2 {t('settings.general.minutes')}</option>
                            <option value="5">5 {t('settings.general.minutes')}</option>
                            <option value="10">10 {t('settings.general.minutes')}</option>
                            <option value="15">15 {t('settings.general.minutes')}</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderCurrentAccountRefreshRow('zcode')}
                  {renderAccountLevelRefreshConfig('zcode')}

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.zcodeAppPath', "Đường dẫn khởi chạy ZCode")}</div>
                      <div className="row-desc">{t('settings.general.zcodeAppPathDesc', "Để trống để dùng đường dẫn mặc định")}</div>
                    </div>
                    <div className="row-control row-control--grow">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                        <input
                          type="text"
                          className="settings-input settings-input--path"
                          value={zcodeAppPath}
                          placeholder={t('settings.general.codexAppPathPlaceholder', "Đường dẫn mặc định")}
                          onChange={(event) => setZcodeAppPath(event.target.value)}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={() => setZcodeAppPath('')}
                          disabled={isAppPathResetDetecting('zcode') || !zcodeAppPath.trim()}
                        >
                          {t('common.clear', "Xóa")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handlePickAppPath('zcode')}
                          disabled={isAppPathResetDetecting('zcode')}
                        >
                          {t('settings.general.codexPathSelect', "Chọn")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleResetAppPath('zcode')}
                          disabled={isAppPathResetDetecting('zcode')}
                        >
                          <RefreshCw size={16} className={isAppPathResetDetecting('zcode') ? 'spin' : undefined} />
                          {isAppPathResetDetecting('zcode')
                            ? t('common.loading', "Đang tải...")
                            : getResetLabelByTarget('zcode')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ order: platformSettingsOrder.trae }}>
                <div className="group-title">{t('quickSettings.trae.title', "Cài đặt Trae")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.traeAutoRefresh', "Tự động làm mới hạn ngạch Trae")}</div>
                      <div className="row-desc">{t('settings.general.traeAutoRefreshDesc', "Tần suất tự động cập nhật nền")}</div>
                    </div>
                    <div className="row-control">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {traeAutoRefreshCustomMode ? (
                          <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={traeAutoRefresh}
                              placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                              onChange={(e) => setTraeAutoRefresh(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(traeAutoRefresh, 1, 999);
                                if (REFRESH_PRESET_VALUES.includes(normalized)) {
                                  setTraeAutoRefreshCustomMode(false);
                                }
                                setTraeAutoRefresh(normalized);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(traeAutoRefresh, 1, 999);
                                  setTraeAutoRefreshCustomMode(false);
                                  setTraeAutoRefresh(normalized);
                                }
                              }}
                            />
                            <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            style={{ minWidth: '120px', width: 'auto' }}
                            value={traeAutoRefresh}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setTraeAutoRefreshCustomMode(true);
                                setTraeAutoRefresh(traeAutoRefresh !== '-1' ? traeAutoRefresh : '1');
                                return;
                              }
                              setTraeAutoRefreshCustomMode(false);
                              setTraeAutoRefresh(val);
                            }}
                          >
                            {!traeAutoRefreshIsPreset && (
                              <option value={traeAutoRefresh}>
                                {traeAutoRefresh} {t('settings.general.minutes')}
                              </option>
                            )}
                            <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                            <option value="2">2 {t('settings.general.minutes')}</option>
                            <option value="5">5 {t('settings.general.minutes')}</option>
                            <option value="10">10 {t('settings.general.minutes')}</option>
                            <option value="15">15 {t('settings.general.minutes')}</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderCurrentAccountRefreshRow('trae')}
                  {renderAccountLevelRefreshConfig('trae')}

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.traeAppPath', "Đường dẫn khởi động Trae")}</div>
                      <div className="row-desc">{t('settings.general.traeAppPathDesc', "Để trống để dùng đường dẫn mặc định")}</div>
                    </div>
                    <div className="row-control row-control--grow settings-claude-launch-control">
                      <div className="settings-claude-launch-row">
                        <input
                          type="text"
                          className="settings-input settings-input--path"
                          value={traeAppPath}
                          placeholder={t('settings.general.traeAppPathPlaceholder', "Đường dẫn mặc định")}
                          onChange={(e) => setTraeAppPath(e.target.value)}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={() => handlePickAppPath('trae')}
                          disabled={isAppPathResetDetecting('trae')}
                        >
                          {t('settings.general.traePathSelect', "Chọn")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleResetAppPath('trae')}
                          disabled={isAppPathResetDetecting('trae')}
                        >
                          <RefreshCw size={16} className={isAppPathResetDetecting('trae') ? 'spin' : undefined} />
                          {isAppPathResetDetecting('trae')
                            ? t('common.loading', "Đang tải...")
                            : getResetLabelByTarget('trae')}
                        </button>
                      </div>
                      {isWindows && traeLaunchCandidatesTarget === 'trae' && traeLaunchCandidates.length > 0 ? (
                        <div className="settings-claude-candidate-list">
                          {traeLaunchCandidates.map((candidate) => (
                            <button
                              key={`${candidate.target_type}:${candidate.target}`}
                              type="button"
                              className={`settings-claude-candidate-item${
                                traeAppPath.trim() === candidate.target ? ' selected' : ''
                              }`}
                              onClick={() => handleSelectTraeLaunchCandidate('trae', candidate)}
                            >
                              <div className="settings-claude-candidate-main">
                                <span>{candidate.label || 'Trae'}</span>
                                <span className="settings-claude-candidate-badge">EXE</span>
                              </div>
                              <div className="settings-claude-candidate-target">
                                {candidate.target}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                      <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={traeQuotaAlertEnabled}
                          onChange={(e) => setTraeQuotaAlertEnabled(e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  {traeQuotaAlertEnabled && (
                    <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                      <div className="row-label">
                        <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                        <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                      </div>
                      <div className="row-control">
                        {traeQuotaAlertThresholdCustomMode ? (
                          <div className="settings-inline-input">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={traeQuotaAlertThreshold}
                              placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                              onChange={(e) => setTraeQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(traeQuotaAlertThreshold, 0, 100);
                                if (THRESHOLD_PRESET_VALUES.includes(normalized)) {
                                  setTraeQuotaAlertThresholdCustomMode(false);
                                }
                                setTraeQuotaAlertThreshold(normalized);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(traeQuotaAlertThreshold, 0, 100);
                                  setTraeQuotaAlertThresholdCustomMode(false);
                                  setTraeQuotaAlertThreshold(normalized);
                                }
                              }}
                            />
                            <span className="settings-input-unit">%</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            value={traeQuotaAlertThreshold}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setTraeQuotaAlertThresholdCustomMode(true);
                                setTraeQuotaAlertThreshold(traeQuotaAlertThreshold || '20');
                                return;
                              }
                              setTraeQuotaAlertThresholdCustomMode(false);
                              setTraeQuotaAlertThreshold(val);
                            }}
                          >
                            {!traeQuotaAlertThresholdIsPreset && (
                              <option value={traeQuotaAlertThreshold}>{traeQuotaAlertThreshold}%</option>
                            )}
                            <option value="0">0%</option>
                            <option value="20">20%</option>
                            <option value="40">40%</option>
                            <option value="60">60%</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {renderTraeVariantSettingsGroup({
                target: 'trae_solo',
                order: platformSettingsOrder.trae_solo,
                titleKey: 'quickSettings.traeSolo.title',
                titleDefault: 'Cài đặt TRAE SOLO',
                appPathTitleKey: 'settings.general.traeSoloAppPath',
                appPathTitleDefault: 'Đường dẫn khởi chạy TRAE SOLO',
                autoRefresh: traeSoloAutoRefresh,
                setAutoRefresh: setTraeSoloAutoRefresh,
                autoRefreshCustomMode: traeSoloAutoRefreshCustomMode,
                setAutoRefreshCustomMode: setTraeSoloAutoRefreshCustomMode,
                autoRefreshIsPreset: traeSoloAutoRefreshIsPreset,
                quotaAlertEnabled: traeSoloQuotaAlertEnabled,
                setQuotaAlertEnabled: setTraeSoloQuotaAlertEnabled,
                quotaAlertThreshold: traeSoloQuotaAlertThreshold,
                setQuotaAlertThreshold: setTraeSoloQuotaAlertThreshold,
                quotaAlertThresholdCustomMode: traeSoloQuotaAlertThresholdCustomMode,
                setQuotaAlertThresholdCustomMode: setTraeSoloQuotaAlertThresholdCustomMode,
                quotaAlertThresholdIsPreset: traeSoloQuotaAlertThresholdIsPreset,
              })}

              {renderTraeVariantSettingsGroup({
                target: 'trae_cn',
                order: platformSettingsOrder.trae_cn,
                titleKey: 'quickSettings.traeCn.title',
                titleDefault: 'Cài đặt Trae CN',
                appPathTitleKey: 'settings.general.traeCnAppPath',
                appPathTitleDefault: 'Đường dẫn khởi chạy Trae CN',
                autoRefresh: traeCnAutoRefresh,
                setAutoRefresh: setTraeCnAutoRefresh,
                autoRefreshCustomMode: traeCnAutoRefreshCustomMode,
                setAutoRefreshCustomMode: setTraeCnAutoRefreshCustomMode,
                autoRefreshIsPreset: traeCnAutoRefreshIsPreset,
                quotaAlertEnabled: traeCnQuotaAlertEnabled,
                setQuotaAlertEnabled: setTraeCnQuotaAlertEnabled,
                quotaAlertThreshold: traeCnQuotaAlertThreshold,
                setQuotaAlertThreshold: setTraeCnQuotaAlertThreshold,
                quotaAlertThresholdCustomMode: traeCnQuotaAlertThresholdCustomMode,
                setQuotaAlertThresholdCustomMode: setTraeCnQuotaAlertThresholdCustomMode,
                quotaAlertThresholdIsPreset: traeCnQuotaAlertThresholdIsPreset,
              })}

              {renderTraeVariantSettingsGroup({
                target: 'trae_solo_cn',
                order: platformSettingsOrder.trae_solo_cn,
                titleKey: 'quickSettings.traeSoloCn.title',
                titleDefault: 'Cài đặt TRAE SOLO CN',
                appPathTitleKey: 'settings.general.traeSoloCnAppPath',
                appPathTitleDefault: 'Đường dẫn khởi chạy TRAE SOLO CN',
                autoRefresh: traeSoloCnAutoRefresh,
                setAutoRefresh: setTraeSoloCnAutoRefresh,
                autoRefreshCustomMode: traeSoloCnAutoRefreshCustomMode,
                setAutoRefreshCustomMode: setTraeSoloCnAutoRefreshCustomMode,
                autoRefreshIsPreset: traeSoloCnAutoRefreshIsPreset,
                quotaAlertEnabled: traeSoloCnQuotaAlertEnabled,
                setQuotaAlertEnabled: setTraeSoloCnQuotaAlertEnabled,
                quotaAlertThreshold: traeSoloCnQuotaAlertThreshold,
                setQuotaAlertThreshold: setTraeSoloCnQuotaAlertThreshold,
                quotaAlertThresholdCustomMode: traeSoloCnQuotaAlertThresholdCustomMode,
                setQuotaAlertThresholdCustomMode: setTraeSoloCnQuotaAlertThresholdCustomMode,
                quotaAlertThresholdIsPreset: traeSoloCnQuotaAlertThresholdIsPreset,
              })}

              <div style={{ order: platformSettingsOrder.workbuddy }}>
                <div className="group-title">{t('quickSettings.workbuddy.title', "Cài đặt WorkBuddy")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.workbuddyAutoRefresh', "Tự động làm mới hạn ngạch WorkBuddy")}</div>
                      <div className="row-desc">{t('settings.general.workbuddyAutoRefreshDesc', "Tần suất tự động làm mới nền")}</div>
                    </div>
                    <div className="row-control">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {workbuddyAutoRefreshCustomMode ? (
                          <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={workbuddyAutoRefresh}
                              placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                              onChange={(e) => setWorkbuddyAutoRefresh(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(workbuddyAutoRefresh, 1, 999);
                                if (REFRESH_PRESET_VALUES.includes(normalized)) {
                                  setWorkbuddyAutoRefreshCustomMode(false);
                                }
                                setWorkbuddyAutoRefresh(normalized);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(workbuddyAutoRefresh, 1, 999);
                                  setWorkbuddyAutoRefreshCustomMode(false);
                                  setWorkbuddyAutoRefresh(normalized);
                                }
                              }}
                            />
                            <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            style={{ minWidth: '120px', width: 'auto' }}
                            value={workbuddyAutoRefresh}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setWorkbuddyAutoRefreshCustomMode(true);
                                setWorkbuddyAutoRefresh(workbuddyAutoRefresh !== '-1' ? workbuddyAutoRefresh : '1');
                                return;
                              }
                              setWorkbuddyAutoRefreshCustomMode(false);
                              setWorkbuddyAutoRefresh(val);
                            }}
                          >
                            {!workbuddyAutoRefreshIsPreset && (
                              <option value={workbuddyAutoRefresh}>
                                {workbuddyAutoRefresh} {t('settings.general.minutes')}
                              </option>
                            )}
                            <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                            <option value="2">2 {t('settings.general.minutes')}</option>
                            <option value="5">5 {t('settings.general.minutes')}</option>
                            <option value="10">10 {t('settings.general.minutes')}</option>
                            <option value="15">15 {t('settings.general.minutes')}</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderCurrentAccountRefreshRow('workbuddy')}
                  {renderAccountLevelRefreshConfig('workbuddy')}

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">
                        {t('settings.general.workbuddyShareSessionsOnSwitch')}
                      </div>
                      <div className="row-desc">
                        {t('settings.general.workbuddyShareSessionsOnSwitchDesc')}
                      </div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={workbuddyShareSessionsOnSwitch}
                          onChange={(event) =>
                            setWorkbuddyShareSessionsOnSwitch(event.target.checked)
                          }
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.workbuddyAppPath', "Đường dẫn khởi động WorkBuddy")}</div>
                      <div className="row-desc">{t('settings.general.workbuddyAppPathDesc', "Để trống để dùng đường dẫn mặc định")}</div>
                    </div>
                    <div className="row-control row-control--grow">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                        <input
                          type="text"
                          className="settings-input settings-input--path"
                          value={workbuddyAppPath}
                          placeholder={t('settings.general.workbuddyAppPathPlaceholder', "Đường dẫn mặc định")}
                          onChange={(e) => setWorkbuddyAppPath(e.target.value)}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={() => handlePickAppPath('workbuddy')}
                          disabled={isAppPathResetDetecting('workbuddy')}
                        >
                          {t('settings.general.workbuddyPathSelect', "Chọn")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleResetAppPath('workbuddy')}
                          disabled={isAppPathResetDetecting('workbuddy')}
                        >
                          <RefreshCw size={16} className={isAppPathResetDetecting('workbuddy') ? 'spin' : undefined} />
                          {isAppPathResetDetecting('workbuddy')
                            ? t('common.loading', "Đang tải...")
                            : getResetLabelByTarget('workbuddy')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                      <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={workbuddyQuotaAlertEnabled}
                          onChange={(e) => setWorkbuddyQuotaAlertEnabled(e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  {workbuddyQuotaAlertEnabled && (
                    <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                      <div className="row-label">
                        <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                        <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                      </div>
                      <div className="row-control">
                        {workbuddyQuotaAlertThresholdCustomMode ? (
                          <div className="settings-inline-input">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={workbuddyQuotaAlertThreshold}
                              placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                              onChange={(e) => setWorkbuddyQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(workbuddyQuotaAlertThreshold, 0, 100);
                                if (THRESHOLD_PRESET_VALUES.includes(normalized)) {
                                  setWorkbuddyQuotaAlertThresholdCustomMode(false);
                                }
                                setWorkbuddyQuotaAlertThreshold(normalized);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(workbuddyQuotaAlertThreshold, 0, 100);
                                  setWorkbuddyQuotaAlertThresholdCustomMode(false);
                                  setWorkbuddyQuotaAlertThreshold(normalized);
                                }
                              }}
                            />
                            <span className="settings-input-unit">%</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            value={workbuddyQuotaAlertThreshold}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setWorkbuddyQuotaAlertThresholdCustomMode(true);
                                setWorkbuddyQuotaAlertThreshold(workbuddyQuotaAlertThreshold || '20');
                                return;
                              }
                              setWorkbuddyQuotaAlertThresholdCustomMode(false);
                              setWorkbuddyQuotaAlertThreshold(val);
                            }}
                          >
                            {!workbuddyQuotaAlertThresholdIsPreset && (
                              <option value={workbuddyQuotaAlertThreshold}>{workbuddyQuotaAlertThreshold}%</option>
                            )}
                            <option value="0">0%</option>
                            <option value="20">20%</option>
                            <option value="40">40%</option>
                            <option value="60">60%</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ order: platformSettingsOrder.zed }}>
                <div className="group-title">{t('quickSettings.zed.title', "Cài đặt Zed")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.zedAutoRefresh', "Tự động làm mới hạn mức Zed")}</div>
                      <div className="row-desc">{t('settings.general.zedAutoRefreshDesc', "Tần suất cập nhật nền")}</div>
                    </div>
                    <div className="row-control">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {zedAutoRefreshCustomMode ? (
                          <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                            <input
                              type="number"
                              min={1}
                              max={999}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={zedAutoRefresh}
                              placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                              onChange={(e) => setZedAutoRefresh(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(zedAutoRefresh, 1, 999);
                                setZedAutoRefresh(normalized);
                                setZedAutoRefreshCustomMode(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(zedAutoRefresh, 1, 999);
                                  setZedAutoRefresh(normalized);
                                  setZedAutoRefreshCustomMode(false);
                                }
                              }}
                            />
                            <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            style={{ minWidth: '120px', width: 'auto' }}
                            value={zedAutoRefresh}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setZedAutoRefreshCustomMode(true);
                                setZedAutoRefresh(zedAutoRefresh !== '-1' ? zedAutoRefresh : '1');
                                return;
                              }
                              setZedAutoRefreshCustomMode(false);
                              setZedAutoRefresh(val);
                            }}
                          >
                            {!zedAutoRefreshIsPreset && (
                              <option value={zedAutoRefresh}>
                                {zedAutoRefresh} {t('settings.general.minutes')}
                              </option>
                            )}
                            <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                            <option value="2">2 {t('settings.general.minutes')}</option>
                            <option value="5">5 {t('settings.general.minutes')}</option>
                            <option value="10">10 {t('settings.general.minutes')}</option>
                            <option value="15">15 {t('settings.general.minutes')}</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {renderCurrentAccountRefreshRow('zed')}
                  {renderAccountLevelRefreshConfig('zed')}

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('settings.general.zedAppPath', "Đường dẫn khởi chạy Zed")}</div>
                      <div className="row-desc">{t('settings.general.zedAppPathDesc', "Để trống để dùng đường dẫn mặc định")}</div>
                    </div>
                    <div className="row-control row-control--grow">
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                        <input
                          type="text"
                          className="settings-input settings-input--path"
                          value={zedAppPath}
                          placeholder={t('settings.general.zedAppPathPlaceholder', "Đường dẫn mặc định")}
                          onChange={(e) => setZedAppPath(e.target.value)}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={() => handlePickAppPath('zed')}
                          disabled={isAppPathResetDetecting('zed')}
                        >
                          {t('settings.general.zedPathSelect', "Chọn")}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleResetAppPath('zed')}
                          disabled={isAppPathResetDetecting('zed')}
                        >
                          <RefreshCw size={16} className={isAppPathResetDetecting('zed') ? 'spin' : undefined} />
                          {isAppPathResetDetecting('zed')
                            ? t('common.loading', "Đang tải...")
                            : getResetLabelByTarget('zed')}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                      <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={zedQuotaAlertEnabled}
                          onChange={(e) => setZedQuotaAlertEnabled(e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  {zedQuotaAlertEnabled && (
                    <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                      <div className="row-label">
                        <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                        <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                      </div>
                      <div className="row-control">
                        {zedQuotaAlertThresholdCustomMode ? (
                          <div className="settings-inline-input">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              className="settings-select settings-select--input-mode settings-select--with-unit"
                              value={zedQuotaAlertThreshold}
                              placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                              onChange={(e) => setZedQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                              onBlur={() => {
                                const normalized = normalizeNumberInput(zedQuotaAlertThreshold, 0, 100);
                                setZedQuotaAlertThreshold(normalized);
                                setZedQuotaAlertThresholdCustomMode(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const normalized = normalizeNumberInput(zedQuotaAlertThreshold, 0, 100);
                                  setZedQuotaAlertThreshold(normalized);
                                  setZedQuotaAlertThresholdCustomMode(false);
                                }
                              }}
                            />
                            <span className="settings-input-unit">%</span>
                          </div>
                        ) : (
                          <select
                            className="settings-select"
                            value={zedQuotaAlertThreshold}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'custom') {
                                setZedQuotaAlertThresholdCustomMode(true);
                                setZedQuotaAlertThreshold(zedQuotaAlertThreshold || '20');
                                return;
                              }
                              setZedQuotaAlertThresholdCustomMode(false);
                              setZedQuotaAlertThreshold(val);
                            }}
                          >
                            {!zedQuotaAlertThresholdIsPreset && (
                              <option value={zedQuotaAlertThreshold}>{zedQuotaAlertThreshold}%</option>
                            )}
                            <option value="0">0%</option>
                            <option value="20">20%</option>
                            <option value="40">40%</option>
                            <option value="60">60%</option>
                            <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ order: platformSettingsOrder.cursor }}>
                <div className="group-title">{t('quickSettings.cursor.title', "Cài đặt Cursor")}</div>
                <div className="settings-group">
              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('quickSettings.cursorRefreshInterval', "Tự động làm mới hạn mức")}</div>
                  <div className="row-desc">{t('settings.general.windsurfAutoRefreshDesc', "Tần suất cập nhật tự động dưới nền")}</div>
                </div>
                <div className="row-control">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {cursorAutoRefreshCustomMode ? (
                      <div className="settings-inline-input" style={{ minWidth: '120px', width: 'auto' }}>
                        <input
                          type="number"
                          min={1}
                          max={999}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={cursorAutoRefresh}
                          placeholder={t('quickSettings.inputMinutes', "Nhập số phút")}
                          onChange={(e) => setCursorAutoRefresh(sanitizeNumberInput(e.target.value))}
                          onBlur={() => {
                            const normalized = normalizeNumberInput(cursorAutoRefresh, 1, 999);
                            setCursorAutoRefresh(normalized);
                            setCursorAutoRefreshCustomMode(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(cursorAutoRefresh, 1, 999);
                              setCursorAutoRefresh(normalized);
                              setCursorAutoRefreshCustomMode(false);
                            }
                          }}
                        />
                        <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        style={{ minWidth: '120px', width: 'auto' }}
                        value={cursorAutoRefresh}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setCursorAutoRefreshCustomMode(true);
                            setCursorAutoRefresh(cursorAutoRefresh !== '-1' ? cursorAutoRefresh : '1');
                            return;
                          }
                          setCursorAutoRefreshCustomMode(false);
                          setCursorAutoRefresh(val);
                        }}
                      >
                        {!cursorAutoRefreshIsPreset && (
                          <option value={cursorAutoRefresh}>
                            {cursorAutoRefresh} {t('settings.general.minutes')}
                          </option>
                        )}
                        <option value="-1">{t('settings.general.autoRefreshDisabled')}</option>
                        <option value="2">2 {t('settings.general.minutes')}</option>
                        <option value="5">5 {t('settings.general.minutes')}</option>
                        <option value="10">10 {t('settings.general.minutes')}</option>
                        <option value="15">15 {t('settings.general.minutes')}</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {renderCurrentAccountRefreshRow('cursor')}
              {renderAccountLevelRefreshConfig('cursor')}

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('quickSettings.cursor.appPath', "Đường dẫn Cursor")}</div>
                  <div className="row-desc">{t('settings.general.codexAppPathDesc', "Để trống để dùng đường dẫn mặc định")}</div>
                </div>
                <div className="row-control row-control--grow">
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                    <input
                      type="text"
                      className="settings-input settings-input--path"
                      value={cursorAppPath}
                      placeholder={t('settings.general.codexAppPathPlaceholder', "Đường dẫn mặc định")}
                      onChange={(e) => setCursorAppPath(e.target.value)}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={() => handlePickAppPath('cursor')}
                      disabled={isAppPathResetDetecting('cursor')}
                    >
                      {t('settings.general.codexPathSelect', "Chọn")}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleResetAppPath('cursor')}
                      disabled={isAppPathResetDetecting('cursor')}
                    >
                      <RefreshCw size={16} className={isAppPathResetDetecting('cursor') ? 'spin' : undefined} />
                      {isAppPathResetDetecting('cursor')
                        ? t('common.loading', "Đang tải...")
                        : getResetLabelByTarget('cursor')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="settings-row">
                <div className="row-label">
                  <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                  <div className="row-desc">{t('quickSettings.quotaAlert.hint', "Khi hạn mức của bất kỳ mô hình nào trong tài khoản hiện tại thấp hơn ngưỡng, gửi thông báo hệ thống và hiển thị thao tác chuyển tài khoản nhanh trong ứng dụng.")}</div>
                </div>
                <div className="row-control">
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={cursorQuotaAlertEnabled}
                      onChange={(e) => setCursorQuotaAlertEnabled(e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
              {cursorQuotaAlertEnabled && (
                <div className="settings-row" style={{ animation: 'fadeUp 0.3s ease both' }}>
                  <div className="row-label">
                    <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                    <div className="row-desc">{t('quickSettings.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi hạn mức của bất kỳ mô hình nào thấp hơn tỷ lệ này")}</div>
                  </div>
                  <div className="row-control">
                    {cursorQuotaAlertThresholdCustomMode ? (
                      <div className="settings-inline-input">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={cursorQuotaAlertThreshold}
                          placeholder={t('quickSettings.inputPercent', "Nhập phần trăm")}
                          onChange={(e) => setCursorQuotaAlertThreshold(sanitizeNumberInput(e.target.value))}
                          onBlur={() => {
                            const normalized = normalizeNumberInput(cursorQuotaAlertThreshold, 0, 100);
                            setCursorQuotaAlertThreshold(normalized);
                            setCursorQuotaAlertThresholdCustomMode(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const normalized = normalizeNumberInput(cursorQuotaAlertThreshold, 0, 100);
                              setCursorQuotaAlertThreshold(normalized);
                              setCursorQuotaAlertThresholdCustomMode(false);
                            }
                          }}
                        />
                        <span className="settings-input-unit">%</span>
                      </div>
                    ) : (
                      <select
                        className="settings-select"
                        value={cursorQuotaAlertThreshold}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setCursorQuotaAlertThresholdCustomMode(true);
                            setCursorQuotaAlertThreshold(cursorQuotaAlertThreshold || '20');
                            return;
                          }
                          setCursorQuotaAlertThresholdCustomMode(false);
                          setCursorQuotaAlertThreshold(val);
                        }}
                      >
                        {!cursorQuotaAlertThresholdIsPreset && (
                          <option value={cursorQuotaAlertThreshold}>{cursorQuotaAlertThreshold}%</option>
                        )}
                        <option value="0">0%</option>
                        <option value="20">20%</option>
                        <option value="40">40%</option>
                        <option value="60">60%</option>
                        <option value="custom">{t('settings.general.autoRefreshCustom')}</option>
                      </select>
                    )}
                  </div>
                </div>
              )}
            </div>
              </div>
<div style={{ order: platformSettingsOrder.grok }}>
                <div className="group-title">{t('quickSettings.grok.title', "Cài đặt Grok CLI")}</div>
                <div className="settings-group">
                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('quickSettings.grok.cliPath', "Đường dẫn CLI")}</div>
                      <div className="row-desc">
                        {grokCliStatus?.available
                          ? t('quickSettings.grok.cliDetected', "Đã phát hiện: {{version}} · {{path}}", {
                              version: grokCliStatus.version || '--',
                              path: grokCliStatus.binaryPath || '--',
                            })
                          : t('quickSettings.grok.cliMissing', "Không tìm thấy Grok CLI. Hãy nhập đường dẫn riêng.")}
                      </div>
                    </div>
                    <div className="row-control">
                      <input
                        className="settings-input settings-input--path"
                        value={grokCliPath}
                        placeholder={grokCliStatus?.binaryPath || '~/.grok/bin/grok'}
                        onChange={(event) => {
                          setGrokCliPath(event.target.value);
                          setGrokCliStatusError(null);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => void saveGrokCliPath()}
                        disabled={grokCliSaving}
                      >
                        <Save size={14} />
                        {grokCliSaving ? t('common.loading', "Đang tải...") : t('common.save', "Lưu")}
                      </button>
                    </div>
                  </div>
                  {grokCliStatusError && <div className="form-error">{grokCliStatusError}</div>}

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">
                        {t('quickSettings.grok.syncOfficialAuthOnSwitch', "Đồng bộ đăng nhập chính thức")}
                      </div>
                      <div className="row-desc">
                        {t(
                          'quickSettings.grok.syncOfficialAuthOnSwitchDesc',
                          "Khi bật, việc chuyển tài khoản OAuth cho phiên bản mặc định sẽ ghi vào ~/.grok/auth.json chính thức. Khi tắt, một GROK_HOME riêng sẽ được dùng. API Key và các phiên bản bổ sung không ghi đè đăng nhập chính thức.",
                        )}
                      </div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={grokSyncOfficialAuthOnSwitch}
                          onChange={(event) =>
                            setGrokSyncOfficialAuthOnSwitch(event.target.checked)
                          }
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">
                        {t(
                          'settings.general.grokOpencodeAuthOverwrite',
                          "Ghi đè đăng nhập OpenCode khi chuyển đổi Grok",
                        )}
                      </div>
                      <div className="row-desc">
                        {t(
                          'settings.general.grokOpencodeAuthOverwriteDesc',
                          "Khi tắt, chỉ chuyển Grok và OpenCode giữ nguyên trạng thái đăng nhập hiện tại",
                        )}
                      </div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={grokOpencodeAuthOverwriteOnSwitch}
                          onChange={(event) => {
                            const enabled = event.target.checked;
                            setGrokOpencodeAuthOverwriteOnSwitch(enabled);
                            if (!enabled) {
                              setGrokOpencodeSyncOnSwitch(false);
                            }
                          }}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">
                        {t('settings.general.grokOpencodeRestart', "Khởi động lại OpenCode khi chuyển Grok")}
                      </div>
                      <div className="row-desc">
                        {grokOpencodeAuthOverwriteOnSwitch
                          ? t(
                              'settings.general.grokOpencodeRestartDesc',
                              "Sau khi ghi đè thông tin đăng nhập OpenCode, khởi động lại để áp dụng ngay",
                            )
                          : t(
                              'settings.general.grokOpencodeRestartRequiresOverwrite',
                              "Hãy bật \"Ghi đè đăng nhập OpenCode khi chuyển đổi Grok\" trước",
                            )}
                      </div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={grokOpencodeSyncOnSwitch}
                          onChange={(event) => setGrokOpencodeSyncOnSwitch(event.target.checked)}
                          disabled={!grokOpencodeAuthOverwriteOnSwitch}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('quickSettings.grokRefreshInterval', "Tự động làm mới hạn ngạch")}</div>
                      <div className="row-desc">{t('settings.general.windsurfAutoRefreshDesc', "Tần suất cập nhật tự động dưới nền")}</div>
                    </div>
                    <div className="row-control">
                      <div className="settings-inline-input">
                        <input
                          type="number"
                          min={-1}
                          max={999}
                          className="settings-select settings-select--input-mode settings-select--with-unit"
                          value={grokAutoRefresh}
                          onChange={(event) => {
                            if (/^-?\d*$/.test(event.target.value)) {
                              setGrokAutoRefresh(event.target.value);
                            }
                          }}
                          onBlur={() => setGrokAutoRefresh(normalizeNumberInput(grokAutoRefresh, -1, 999))}
                        />
                        <span className="settings-input-unit">{t('settings.general.minutes')}</span>
                      </div>
                    </div>
                  </div>

                  {renderCurrentAccountRefreshRow('grok')}
                  {renderAccountLevelRefreshConfig('grok')}

                  <div className="settings-row">
                    <div className="row-label">
                      <div className="row-title">{t('quickSettings.quotaAlert.enable', "Bật cảnh báo hạn mức")}</div>
                      <div className="row-desc">{t('grok.quotaAlert.hint', "Khi bất kỳ mục hạn mức nào của tài khoản hiện tại xuống dưới ngưỡng, hãy gửi thông báo hệ thống và hiển thị thao tác chuyển nhanh trong ứng dụng.")}</div>
                    </div>
                    <div className="row-control">
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={grokQuotaAlertEnabled}
                          onChange={(event) => setGrokQuotaAlertEnabled(event.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                  {grokQuotaAlertEnabled && (
                    <div className="settings-row">
                      <div className="row-label">
                        <div className="row-title">{t('quickSettings.quotaAlert.threshold', "Ngưỡng cảnh báo")}</div>
                        <div className="row-desc">{t('grok.quotaAlert.thresholdDesc', "Kích hoạt cảnh báo khi bất kỳ mục hạn mức nào xuống dưới tỷ lệ này")}</div>
                      </div>
                      <div className="row-control">
                        <div className="settings-inline-input">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            className="settings-select settings-select--input-mode settings-select--with-unit"
                            value={grokQuotaAlertThreshold}
                            onChange={(event) => setGrokQuotaAlertThreshold(sanitizeNumberInput(event.target.value))}
                            onBlur={() => setGrokQuotaAlertThreshold(normalizeNumberInput(grokQuotaAlertThreshold, 0, 100))}
                          />
                          <span className="settings-input-unit">%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </fieldset>
          </>
        );
}
