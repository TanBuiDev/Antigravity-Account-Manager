import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
import { RefreshCw, Download, X, Globe, KeyRound, Database, Copy, Check, RotateCw, CircleAlert, Info, Star, Eye, EyeOff, FileUp, FileText, ExternalLink, FolderPlus, Monitor, Terminal, ShieldCheck } from "lucide-react";
import { ModalErrorMessage } from "../components/ModalErrorMessage";
import { scrollElementIntoView } from "../utils/reducedMotion";
import { MfaQuickCodeSelect } from "../components/MfaQuickCodeSelect";
import { SingleSelectDropdown } from "../components/SingleSelectDropdown";
import { useEscCloseTopmost } from "../hooks/useEscClose";
import { useModalScrollLock } from "../hooks/useModalScrollLock";
import "./CodexAccountDialogs.css";
import { CODEX_TEMP_LOGIN_STEPS } from "../services/codexTempLoginService";
import { CODEX_API_PROVIDER_CUSTOM_ID, CODEX_API_PROVIDER_PRESETS, COCKPIT_API_PROVIDER_ID } from "../utils/codexProviderPresets";
import { canUseCodexOAuthAccountProxy } from "../utils/codexAccountProxy";
import type { CodexAccountsViewProps } from "./CodexAccountsView";

/** 渲染 CodexAccountsOverviewPanel 的 expr:showAddModal && 业务面板。 */
export function CodexAddAccountDialog(props: CodexAccountsViewProps) {
  const {
    addMessage,
    addStatus,
    addTab,
    apiBaseUrlInput,
    apiKeyInput,
    apiKeyInputVisible,
    apiModelCatalogDraft,
    apiModelCatalogError,
    apiModelCatalogFetching,
    apiModelCatalogInput,
    apiModelCatalogSyncAvailable,
    apiProviderPresetId,
    apiSyncModelCatalogToCodex,
    closeCodexAddModal,
    CODEX_TOKEN_BATCH_EXAMPLE,
    CODEX_TOKEN_SESSION_EXAMPLE,
    CODEX_TOKEN_SINGLE_EXAMPLE,
    codexAddTargetGroup,
    deviceAuthError,
    deviceAuthInfo,
    deviceAuthStarting,
    deviceCodeCopied,
    formatCodexManagedApiKeyOptionLabel,
    handleApiBaseUrlInputChange,
    handleApiKeyInputChange,
    handleApiKeyLogin,
    handleCopyDeviceCode,
    handleCopyOauthUrl,
    handleCopyReauthEmail,
    handleFetchApiModelCatalog,
    handleCloseLocalImportInstancePicker,
    handleImportFromFiles,
    handleImportFromLocal,
    handleCancelCodexTempLogin,
    handleOpenCodexSecuritySettings,
    handleOpenDeviceAuthUrl,
    handleOpenOauthIncognitoWindow,
    handleOpenOauthUrl,
    handleOauthProxyToggle,
    handleOauthProxyInputChange,
    handleOauthProxyStart,
    handleOpenProviderLink,
    handlePendingOAuthEmailInputChange,
    handleReleaseOauthPort,
    handleRetryOauthAfterTimeout,
    handleRetryOauthTokenExchange,
    handleSavePendingOAuthAccount,
    handleSelectApiProviderPreset,
    handleSelectLocalImportInstance,
    handleSelectManagedProvider,
    handleSelectManagedProviderApiKey,
    handleStartDeviceAuth,
    handleStartCodexTempLogin,
    handleSubmitOauthCallbackUrl,
    handleSwitchBrowserOAuth,
    handleSyncImportedToApiServiceChange,
    handleTokenImport,
    importing,
    isMacOS,
    isOauthTimeoutState,
    isOauthTokenExchangeErrorState,
    localImportBusy,
    localImportError,
    localImportInstances,
    managedProviderApiKeyId,
    managedProviderId,
    managedProviders,
    managedProvidersLoading,
    newManagedProviderNameInput,
    oauthCallbackError,
    oauthCallbackInput,
    oauthCallbackSubmitting,
    oauthCompletingRef,
    oauthLoginIdRef,
    oauthMethod,
    oauthProxyEnabled,
    oauthProxyInput,
    oauthProxyReady,
    oauthProxyFieldError,
    oauthProxyUsesAccountExit,
    oauthProxyExitLabel,
    oauthPortInUse,
    oauthPrepareError,
    oauthTimeoutInfo,
    oauthUrl,
    oauthUrlCopied,
    OPENAI_OFFICIAL_PRESET_ID,
    openCodexAddModal,
    openPendingOAuthNoteModal,
    pendingOAuthEmailInput,
    pendingOAuthFieldErrors,
    pendingOAuthHasNoteDetails,
    reauthEmailCopied,
    reauthTargetAccount,
    reauthTargetEmail,
    renderAccountNoteButton,
    savingPendingOAuthAccount,
    selectedApiProviderPreset,
    selectedManagedProvider,
    selectedSponsorApiProviderTemplate,
    setApiKeyInputVisible,
    setApiModelCatalogError,
    setApiModelCatalogInput,
    setApiSyncModelCatalogToCodex,
    setNewManagedProviderNameInput,
    setOauthCallbackInput,
    setTokenInput,
    shouldShowPendingOAuthDraftForm,
    showAddModal,
    sponsorApiProviderTemplates,
    syncImportedToApiService,
    t,
    tempLoginRecoverable,
    tempLoginCancelling,
    tempLoginNotice,
    tempLoginPhase,
    tempLoginPhaseMessage,
    tempLoginRunning,
    tokenImportProgress,
    tokenInput,
  } = props;
  const addStatusRef = useRef<HTMLDivElement>(null);
  const addDialogRef = useRef<HTMLDivElement>(null);
  const instancePickerDialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showAddModal || addStatus !== "error" || !addMessage) return;
    const frame = window.requestAnimationFrame(() => {
      if (addStatusRef.current) scrollElementIntoView(addStatusRef.current, { block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showAddModal, addStatus, addMessage]);
  useEffect(() => {
    if (oauthProxyFieldError) {
      document.getElementById("codex-oauth-proxy-url")?.focus();
    }
  }, [oauthProxyFieldError]);
  // 选实例弹框叠加在添加账号弹框之上：只让最上层响应 ESC。
  useEscCloseTopmost(
    Boolean(localImportInstances),
    handleCloseLocalImportInstancePicker, instancePickerDialogRef,
  );
  useModalScrollLock(Boolean(showAddModal));
  // 官方登录进行中时，ESC 先取消登录再关闭弹框，避免留下无人接管的临时 profile。
  useEscCloseTopmost(tempLoginRunning, () => {
    void handleCancelCodexTempLogin();
    closeCodexAddModal();
  }, addDialogRef);
  return showAddModal &&
            createPortal(
              <>
                <div className="modal-overlay codex-account-dialog-overlay">
                <div
                  className="modal-content codex-add-modal codex-account-add-modal codex-provider-modal codex-account-dialog"
                  ref={addDialogRef}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2>{t("codex.addModal.title", "Thêm tài khoản Codex")}</h2>
                    <button
                      className="modal-close"
                      onClick={
                        tempLoginRunning
                          ? () => {
                              void handleCancelCodexTempLogin();
                              closeCodexAddModal();
                            }
                          : closeCodexAddModal
                      }
                      disabled={importing || tempLoginCancelling}
                      aria-label={t("common.close", "Đóng")}
                    >
                      <X />
                    </button>
                  </div>
                  <div className="modal-tabs">
                    <button
                      className={`modal-tab ${addTab === "tempLogin" ? "active" : ""}`}
                      onClick={() => openCodexAddModal("tempLogin")}
                      disabled={importing || tempLoginRunning}
                    >
                      <Monitor size={14} />
                      <span className="modal-tab-label">
                        {t("codex.tempLogin.tab", "Đăng nhập chính thức")}
                      </span>
                    </button>
                    <button
                      className={`modal-tab ${addTab === "oauth" ? "active" : ""}`}
                      onClick={() => openCodexAddModal("oauth")}
                      disabled={importing || tempLoginRunning}
                    >
                      <Globe size={14} />
                      <span className="modal-tab-label">
                        {t(
                          "common.shared.addModal.oauth",
                          "OAuth Authorization",
                        )}
                      </span>
                    </button>
                    <button
                      className={`modal-tab ${addTab === "token" ? "active" : ""}`}
                      onClick={() => openCodexAddModal("token")}
                      disabled={importing || tempLoginRunning}
                    >
                      <FileText size={14} />
                      <span className="modal-tab-label">
                        {t("common.shared.addModal.token", "Token / JSON")}
                      </span>
                    </button>
                    <button
                      className={`modal-tab ${addTab === "apikey" ? "active" : ""}`}
                      onClick={() => openCodexAddModal("apikey")}
                      disabled={importing || tempLoginRunning}
                    >
                      <KeyRound size={14} />
                      <span className="modal-tab-label">
                        {t("codex.addModal.token", "API Key")}
                      </span>
                    </button>
                    <button
                      className={`modal-tab ${addTab === "import" ? "active" : ""}`}
                      onClick={() => openCodexAddModal("import")}
                      disabled={importing || tempLoginRunning}
                    >
                      <Database size={14} />
                      <span className="modal-tab-label">
                        {t("accounts.tabs.import", "Nhập")}
                      </span>
                    </button>
                  </div>
                  <div className="modal-body">
                    {codexAddTargetGroup && !reauthTargetAccount && (
                      <div className="codex-add-target-group-hint">
                        <FolderPlus size={14} />
                        <span>
                          {t("codex.addModal.targetGroup", {
                            defaultValue: "将添加到分组：{{group}}",
                            group: codexAddTargetGroup.name,
                          })}
                        </span>
                      </div>
                    )}
                    {reauthTargetAccount && (
                      <div className="codex-reauth-target-summary">
                        {reauthTargetEmail && (
                          <div className="oauth-link codex-reauth-email-block">
                            <label>
                              {t(
                                "codex.oauth.reauthEmailLabel",
                                "Tài khoản ủy quyền lại",
                              )}
                            </label>
                            <div className="oauth-url-box">
                              <input
                                type="text"
                                value={reauthTargetEmail}
                                readOnly
                                aria-label={t(
                                  "codex.oauth.reauthEmailLabel",
                                  "Tài khoản ủy quyền lại",
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => void handleCopyReauthEmail()}
                                title={
                                  reauthEmailCopied
                                    ? t("common.copied", "Đã sao chép")
                                    : t("common.copy", "Copy​")
                                }
                                aria-label={
                                  reauthEmailCopied
                                    ? t("common.copied", "Đã sao chép")
                                    : t("common.copy", "Copy​")
                                }
                              >
                                {reauthEmailCopied ? (
                                  <Check size={16} />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="codex-reauth-note-summary">
                          {renderAccountNoteButton(reauthTargetAccount)}
                        </div>
                      </div>
                    )}
                    {addTab !== "oauth" && <MfaQuickCodeSelect />}
                    {addTab === "tempLogin" && (
                      <div className="add-section">
                        <p className="section-desc">
                          {t(
                            "codex.tempLogin.desc",
                            "Ứng dụng chính thức mở trình duyệt để đăng nhập và xử lý phản hồi ủy quyền. Cockpit đọc và nhập thông tin xác thực cuối cùng sau khi ứng dụng tạm đóng.",
                          )}
                        </p>
                        <ol className="codex-temp-login-steps">
                          {CODEX_TEMP_LOGIN_STEPS.map((step, index) => {
                            const currentIndex = tempLoginPhase
                              ? CODEX_TEMP_LOGIN_STEPS.indexOf(tempLoginPhase)
                              : -1;
                            const state =
                              currentIndex < 0
                                ? "idle"
                                : index < currentIndex
                                  ? "done"
                                  : index === currentIndex
                                    ? "active"
                                    : "idle";
                            return (
                              <li
                                key={step}
                                className={`codex-temp-login-step ${state}`}
                              >
                                <span className="codex-temp-login-step-index">
                                  {index + 1}
                                </span>
                                <span className="codex-temp-login-step-label">
                                  {tempLoginPhaseMessage(step)}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                        {tempLoginRunning && !tempLoginCancelling && (
                          <p className="section-desc codex-temp-login-hint">
                            {t(
                              "codex.tempLogin.waitingHint",
                              "Đăng nhập trong trình duyệt do ứng dụng chính thức mở. Khi phát hiện đầy đủ thông tin xác thực, ứng dụng tạm sẽ đóng và tài khoản được nhập (tối đa 10 phút).",
                            )}
                          </p>
                        )}
                        {tempLoginNotice && (
                          <p className="section-desc codex-temp-login-hint">
                            {tempLoginNotice}
                          </p>
                        )}
                        <button
                          className="btn btn-primary btn-full"
                          onClick={() => void handleStartCodexTempLogin()}
                          disabled={tempLoginRunning || importing}
                        >
                          {tempLoginRunning ? (
                            <RefreshCw size={16} className="loading-spinner" />
                          ) : (
                            <Monitor size={16} />
                          )}
                          {tempLoginRecoverable ? t("codex.tempLogin.retryImport") : t("codex.tempLogin.start", "Mở ứng dụng chính thức và đăng nhập")}
                        </button>
                        {tempLoginRecoverable && !tempLoginRunning && (
                          <button className="btn btn-secondary btn-full" onClick={() => void handleStartCodexTempLogin(true)} disabled={importing}>
                            <Monitor size={16} />
                            {t("codex.tempLogin.start", "Mở ứng dụng chính thức và đăng nhập")}
                          </button>
                        )}
                        {tempLoginRunning && (
                          <button
                            className="btn btn-secondary btn-full"
                            onClick={() => void handleCancelCodexTempLogin()}
                            disabled={tempLoginCancelling}
                          >
                            {tempLoginCancelling ? (
                              <RefreshCw size={16} className="loading-spinner" />
                            ) : (
                              <X size={16} />
                            )}
                            {t("codex.tempLogin.cancel", "Hủy đăng nhập")}
                          </button>
                        )}
                        <p className="section-desc codex-temp-login-note">
                          {t(
                            "codex.tempLogin.note",
                            "Sau khi nhập thành công, cấu hình tạm, dữ liệu chạy và các mục xác thực liên quan sẽ được xóa. Nếu lần nhập cuối thất bại, thông tin đăng nhập được giữ để thử lại. Các phiên bản khác không bị ảnh hưởng.",
                          )}
                        </p>
                      </div>
                    )}
                    {addTab === "oauth" && (
                      <div className="add-section">
                        {shouldShowPendingOAuthDraftForm && (
                          <div className="codex-pending-oauth-draft">
                            <div className="oauth-link">
                              <label>
                                {t(
                                  "codex.pendingAuth.emailLabel",
                                  "Tài khoản chờ xác thực",
                                )}
                              </label>
                              <div className="oauth-url-box oauth-manual-input">
                                <input
                                  type="email"
                                  value={pendingOAuthEmailInput}
                                  onChange={(event) => {
                                    handlePendingOAuthEmailInputChange(
                                      event.target.value,
                                    );
                                  }}
                                  placeholder={t(
                                    "codex.pendingAuth.emailPlaceholder",
                                    "Nhập email tài khoản OpenAI",
                                  )}
                                  disabled={savingPendingOAuthAccount}
                                />
                              </div>
                              {pendingOAuthFieldErrors.email && (
                                <span className="codex-account-note-field-error">
                                  {pendingOAuthFieldErrors.email}
                                </span>
                              )}
                              {pendingOAuthFieldErrors.twoFactorSecret && (
                                <span className="codex-account-note-field-error">
                                  {pendingOAuthFieldErrors.twoFactorSecret}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className={`codex-account-note-chip ${pendingOAuthHasNoteDetails ? "has-note" : "empty-note"}`}
                              onClick={openPendingOAuthNoteModal}
                              disabled={savingPendingOAuthAccount}
                            >
                              <FileText size={12} />
                              <span>
                                {pendingOAuthHasNoteDetails
                                  ? t("codex.accountNote.short", "Ghi chú")
                                  : t("codex.accountNote.addShort", "Thêm")}
                              </span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-full"
                              onClick={() =>
                                void handleSavePendingOAuthAccount()
                              }
                              disabled={
                                savingPendingOAuthAccount ||
                                !pendingOAuthEmailInput.trim()
                              }
                            >
                              {savingPendingOAuthAccount ? (
                                <RefreshCw
                                  size={16}
                                  className="loading-spinner"
                                />
                              ) : (
                                <FileText size={16} />
                              )}
                              {t(
                                "codex.pendingAuth.saveDraft",
                                "Lưu thẻ chờ xác thực",
                              )}
                            </button>
                          </div>
                        )}
                        <p className="section-desc">
                          {t(
                            "codex.oauth.desc",
                            "Nhấn nút bên dưới và hoàn tất ủy quyền OpenAI trong trình duyệt",
                          )}
                        </p>
                        {/* 重新授权已有账号时，只有后端确认了实际出口或出现错误才显示代理区，
                            避免在没有生效出口时闪出一个用不上的开关。 */}
                        {(!reauthTargetAccount ||
                          (!isMacOS &&
                            (Boolean(oauthProxyExitLabel) ||
                              Boolean(oauthPrepareError) ||
                              (oauthProxyEnabled && !oauthProxyUsesAccountExit)))) && (
                          <div className="codex-oauth-proxy-setup">
                            <label className="codex-import-api-service-toggle">
                              <span className="codex-import-api-service-toggle-copy">
                                <strong>{t("codex.oauthProxy.toggle")}</strong>
                                <small>
                                  {reauthTargetAccount
                                    ? t("codex.oauthProxy.hint")
                                    : t(isMacOS ? "codex.oauthProxy.macUnavailable" : "codex.oauthProxy.hint")}
                                </small>
                              </span>
                              <input
                                type="checkbox"
                                checked={oauthProxyEnabled}
                                disabled={isMacOS || deviceAuthStarting || oauthCompletingRef.current}
                                onChange={(event) => void handleOauthProxyToggle(event.target.checked)}
                              />
                              <span className="codex-import-api-service-switch" />
                            </label>
                            {oauthProxyEnabled && (
                              <>
                                {oauthProxyExitLabel && oauthProxyUsesAccountExit && (
                                  <p className="section-desc">
                                    {t("codex.oauthProxy.reauthExit", { name: oauthProxyExitLabel })}
                                  </p>
                                )}
                                <div className="codex-oauth-proxy-field">
                                  <label htmlFor="codex-oauth-proxy-url">{t("codex.oauthProxy.urlLabel")}</label>
                                  <input
                                    id="codex-oauth-proxy-url"
                                    className={oauthProxyFieldError ? "input-error" : ""}
                                    type="password"
                                    autoComplete="off"
                                    spellCheck={false}
                                    value={oauthProxyInput}
                                    onChange={(event) => handleOauthProxyInputChange(event.target.value)}
                                    placeholder={t("codex.oauthProxy.urlPlaceholder")}
                                    aria-invalid={Boolean(oauthProxyFieldError)}
                                    aria-describedby={oauthProxyFieldError ? "codex-oauth-proxy-error" : undefined}
                                  />
                                  {oauthProxyFieldError && <span id="codex-oauth-proxy-error" className="field-error">{oauthProxyFieldError}</span>}
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleOauthProxyStart}
                                    disabled={oauthProxyReady || oauthCompletingRef.current}
                                  >
                                    {t(oauthProxyReady ? "codex.oauthProxy.active" : "codex.oauthProxy.start")}
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                        {/* macOS 当前构建不支持内置授权窗口代理：如实说明，不让重新授权看起来已走该出口。 */}
                        {reauthTargetAccount &&
                          isMacOS &&
                          canUseCodexOAuthAccountProxy(reauthTargetAccount) && (
                            <p className="section-desc">
                              {t("codex.oauthProxy.macUnavailable")}
                            </p>
                          )}
                        <div
                          className="codex-oauth-method-switch"
                          role="tablist"
                        >
                          <button
                            type="button"
                            className={
                              oauthMethod === "browser" ? "active" : ""
                            }
                            onClick={() => void handleSwitchBrowserOAuth()}
                            role="tab"
                            aria-selected={oauthMethod === "browser"}
                          >
                            <Globe size={15} />
                            <span>
                              {t(
                                "common.shared.oauth.browserAuth",
                                "Xác thực trên trình duyệt",
                              )}
                            </span>
                          </button>
                          <button
                            type="button"
                            className={oauthMethod === "device" ? "active" : ""}
                            onClick={() => void handleStartDeviceAuth()}
                            disabled={
                              deviceAuthStarting || oauthCompletingRef.current || oauthProxyEnabled
                            }
                            role="tab"
                            aria-selected={oauthMethod === "device"}
                          >
                            {deviceAuthStarting ? (
                              <RefreshCw
                                size={15}
                                className="loading-spinner"
                              />
                            ) : (
                              <Terminal size={15} />
                            )}
                            <span>
                              {t("common.shared.oauth.deviceAuth", "Xác thực thiết bị")}
                            </span>
                          </button>
                        </div>
                        {oauthMethod === "device" && (
                          <div className="codex-device-auth-notice">
                            <Info size={15} />
                            <span>
                              {t(
                                "common.shared.oauth.deviceAuthPrerequisite",
                                "Nếu xác thực bằng mã thiết bị chưa được bật, hãy bật tính năng này cho Codex trong cài đặt Bảo mật ChatGPT trước.",
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleOpenCodexSecuritySettings()
                              }
                            >
                              {t(
                                "common.shared.oauth.openSecuritySettings",
                                "Mở cài đặt",
                              )}
                            </button>
                          </div>
                        )}
                        {deviceAuthError && (
                          <div className="add-status error">
                            <CircleAlert size={16} />
                            <span>{deviceAuthError}</span>
                          </div>
                        )}
                        {deviceAuthInfo && (
                          <div className="oauth-link codex-device-auth-panel">
                            <div className="codex-device-auth-header">
                              <div>
                                <strong>
                                  {t(
                                    "common.shared.oauth.deviceAuth",
                                    "Xác thực thiết bị",
                                  )}
                                </strong>
                                <span>
                                  {t(
                                    "common.shared.oauth.deviceAuthWaiting",
                                    "Hoàn tất các bước bên dưới, ứng dụng sẽ tự động tiếp tục",
                                  )}
                                </span>
                              </div>
                              <span className="codex-device-auth-status">
                                {t("common.shared.oauth.waiting", "Đang chờ ủy quyền...")}
                              </span>
                            </div>
                            <label>
                              {t(
                                "common.shared.oauth.deviceCode",
                                "Mã thiết bị",
                              )}
                            </label>
                            <div className="oauth-url-box">
                              <input
                                type="text"
                                value={deviceAuthInfo.userCode}
                                readOnly
                              />
                              <button
                                type="button"
                                onClick={() => void handleCopyDeviceCode()}
                                title={
                                  deviceCodeCopied
                                    ? t("common.copied", "Đã sao chép")
                                    : t("common.copy", "Copy​")
                                }
                                aria-label={
                                  deviceCodeCopied
                                    ? t("common.copied", "Đã sao chép")
                                    : t("common.copy", "Copy​")
                                }
                              >
                                {deviceCodeCopied ? (
                                  <Check size={16} />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </button>
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary btn-full"
                              onClick={() => void handleOpenDeviceAuthUrl()}
                            >
                              <ExternalLink size={16} />
                              {t(
                                "common.shared.oauth.openBrowser",
                                "Mở trong trình duyệt",
                              )}
                            </button>
                            <p className="codex-device-auth-footnote">
                              {t(
                                "common.shared.oauth.deviceAuthFootnote",
                                "Xác thực thiết bị không dùng cổng callback cục bộ 1455.",
                              )}
                            </p>
                          </div>
                        )}
                        {oauthMethod === "browser" &&
                          (deviceAuthInfo ||
                          deviceAuthStarting ||
                          deviceAuthError ? null : oauthPrepareError ? (
                            <div className="add-status error">
                              <CircleAlert size={16} />
                              <span>{oauthPrepareError}</span>
                              {oauthPortInUse && (
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={handleReleaseOauthPort}
                                >
                                  {t(
                                    "codex.oauth.portInUseAction",
                                    "Close port and retry",
                                  )}
                                </button>
                              )}
                              {!oauthPortInUse && oauthTimeoutInfo && (
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={handleRetryOauthAfterTimeout}
                                >
                                  {t(
                                    "codex.oauth.timeoutRetry",
                                    "Làm mới link xác thực",
                                  )}
                                </button>
                              )}
                            </div>
                          ) : oauthUrl ? (
                            <div className="oauth-url-section">
                              {!oauthProxyEnabled && <div className="oauth-link">
                                <label>
                                  {t("accounts.oauth.linkLabel", "Liên kết xác thực")}
                                </label>
                                <div className="oauth-url-box">
                                  <input
                                    type="text"
                                    value={oauthUrl}
                                    readOnly
                                  />
                                  <button onClick={handleCopyOauthUrl}>
                                    {oauthUrlCopied ? (
                                      <Check size={16} />
                                    ) : (
                                      <Copy size={16} />
                                    )}
                                  </button>
                                </div>
                              </div>}
                              <button
                                className="btn btn-primary btn-full"
                                onClick={
                                  isOauthTimeoutState
                                    ? handleRetryOauthAfterTimeout
                                    : handleOpenOauthUrl
                                }
                              >
                                {isOauthTimeoutState ? (
                                  <RefreshCw size={16} />
                                ) : (
                                  <Globe size={16} />
                                )}
                                {isOauthTimeoutState
                                  ? t(
                                      "codex.oauth.timeoutRetry",
                                      "Làm mới link xác thực",
                                    )
                                  : oauthProxyEnabled
                                    ? t("codex.oauthProxy.openWindow")
                                    : t(
                                      "common.shared.oauth.openBrowser",
                                      "Open in Browser",
                                    )}
                              </button>
                              {!isOauthTimeoutState && isMacOS && !oauthProxyEnabled && (
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-full"
                                  onClick={() =>
                                    void handleOpenOauthIncognitoWindow()
                                  }
                                >
                                  <ShieldCheck size={16} />
                                  {t(
                                    "common.shared.oauth.incognitoWindow",
                                    "Cửa sổ riêng tư",
                                  )}
                                </button>
                              )}
                              <div className="oauth-link">
                                <label>
                                  {t(
                                    "common.shared.oauth.manualCallbackLabel",
                                    "Nhập URL callback thủ công",
                                  )}
                                </label>
                                <div className="oauth-url-box oauth-manual-input">
                                  <input
                                    type="text"
                                    value={oauthCallbackInput}
                                    onChange={(e) =>
                                      setOauthCallbackInput(e.target.value)
                                    }
                                    placeholder={t(
                                      "common.shared.oauth.manualCallbackPlaceholder",
                                      "Dán đầy đủ URL callback, ví dụ: http://localhost:1455/auth/callback?code=...&state=...",
                                    )}
                                  />
                                  <button
                                    className="oauth-copy-button"
                                    onClick={() =>
                                      void handleSubmitOauthCallbackUrl()
                                    }
                                    disabled={
                                      oauthCallbackSubmitting ||
                                      !oauthCallbackInput.trim()
                                    }
                                  >
                                    {oauthCallbackSubmitting ? (
                                      <RefreshCw
                                        size={16}
                                        className="loading-spinner"
                                      />
                                    ) : (
                                      <Check size={16} />
                                    )}
                                    <span className="oauth-copy-button-label">
                                      {t(
                                        "accounts.oauth.continue",
                                        "Tôi đã xác thực, tiếp tục",
                                      )}
                                    </span>
                                  </button>
                                </div>
                              </div>
                              {oauthCallbackError && (
                                <div className="add-status error">
                                  <CircleAlert size={16} />
                                  <span>{oauthCallbackError}</span>
                                </div>
                              )}
                              {isOauthTimeoutState && (
                                <div className="add-status error">
                                  <CircleAlert size={16} />
                                  <span>
                                    {t(
                                      "codex.oauth.timeout",
                                      "Xác thực đã hết thời gian. Vui lòng nhấn",
                                    )}
                                  </span>
                                </div>
                              )}
                              <div className="codex-oauth-auto-update-note">
                                <Info size={14} />
                                {t(
                                  "common.shared.oauth.hint",
                                  "Sau khi ủy quyền, cửa sổ này sẽ tự cập nhật",
                                )}
                              </div>
                            </div>
                          ) : oauthProxyEnabled && !oauthProxyReady ? null : (
                            <div className="oauth-loading">
                              <RefreshCw
                                size={24}
                                className="loading-spinner"
                              />
                              <span>
                                {t(
                                  "codex.oauth.preparing",
                                  "Đang chuẩn bị liên kết ủy quyền...",
                                )}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                    {addTab === "apikey" && (
                      <div className="add-section">
                        <div className="oauth-link">
                          <label>
                            {t(
                              "codex.modelProviders.selectSavedProvider",
                              "Nhà cung cấp đã lưu",
                            )}
                          </label>
                          {managedProvidersLoading ? (
                            <div className="section-desc">
                              {t("common.loading", "Đang tải...")}
                            </div>
                          ) : managedProviders.length === 0 ? (
                            <div className="section-desc">
                              {t(
                                "codex.modelProviders.noSavedProviders",
                                "Chưa có nhà cung cấp nào được lưu. Bạn có thể điền trực tiếp các trường và hệ thống sẽ tự động lưu.",
                              )}
                            </div>
                          ) : (
                            <div className="api-provider-chip-list">
                              {managedProviders.map((provider) => (
                                <button
                                  key={provider.id}
                                  className={`api-provider-chip ${managedProviderId === provider.id ? "active" : ""}`}
                                  onClick={() =>
                                    handleSelectManagedProvider(provider.id)
                                  }
                                  type="button"
                                >
                                  <span>{provider.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedManagedProvider &&
                          selectedManagedProvider.apiKeys.length > 0 && (
                            <div className="oauth-link">
                              <label>
                                {t(
                                  "codex.modelProviders.selectSavedApiKey",
                                  "API Key đã lưu",
                                )}
                              </label>
                              <SingleSelectDropdown
                                className="codex-managed-api-key-select"
                                value={managedProviderApiKeyId}
                                options={[
                                  {
                                    value: "",
                                    label: t(
                                      "codex.modelProviders.manualApiKeyOption",
                                      "Nhập khóa mới theo cách thủ công",
                                    ),
                                  },
                                  ...selectedManagedProvider.apiKeys.map(
                                    (item) => ({
                                      value: item.id,
                                      label:
                                        formatCodexManagedApiKeyOptionLabel(
                                          item,
                                          t(
                                            "codex.modelProviders.unnamedKey",
                                            "Key chưa có tên",
                                          ),
                                        ),
                                    }),
                                  ),
                                ]}
                                onChange={handleSelectManagedProviderApiKey}
                                placeholder={t(
                                  "codex.modelProviders.selectSavedApiKeyPlaceholder",
                                  "Chọn khóa API",
                                )}
                                ariaLabel={t(
                                  "codex.modelProviders.selectSavedApiKey",
                                  "API Key đã lưu",
                                )}
                              />
                              {selectedManagedProvider.apiKeys.length > 1 && (
                                <p className="api-provider-hint">
                                  {t(
                                    "codex.modelProviders.selectSavedApiKeyHint",
                                    "Nhà cung cấp này có nhiều khóa API. Chọn một khóa tại đây.",
                                  )}
                                </p>
                              )}
                            </div>
                          )}
                        <div className="oauth-link">
                          <label>
                            {t("codex.api.provider.label", "Nhà cung cấp")}
                          </label>
                          <div className="api-provider-chip-list">
                            <button
                              className={`api-provider-chip ${apiProviderPresetId === CODEX_API_PROVIDER_CUSTOM_ID ? "active" : ""}`}
                              onClick={() =>
                                handleSelectApiProviderPreset(
                                  CODEX_API_PROVIDER_CUSTOM_ID,
                                )
                              }
                              type="button"
                            >
                              <span>
                                {t("codex.api.provider.custom", "Tùy chỉnh")}
                              </span>
                            </button>
                            {sponsorApiProviderTemplates.map((template) => (
                              <button
                                key={template.id}
                                className={`api-provider-chip sponsor ${apiProviderPresetId === template.id ? "active" : ""}`}
                                onClick={() =>
                                  handleSelectApiProviderPreset(template.id)
                                }
                                type="button"
                              >
                                <span>{template.name}</span>
                                <Star
                                  size={12}
                                  className="api-provider-chip-badge"
                                />
                              </button>
                            ))}
                            {CODEX_API_PROVIDER_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                className={`api-provider-chip ${apiProviderPresetId === preset.id ? "active" : ""}`}
                                onClick={() =>
                                  handleSelectApiProviderPreset(preset.id)
                                }
                                type="button"
                              >
                                <span>
                                  {t(
                                    `codex.api.providers.${preset.id}.name`,
                                    preset.name,
                                  )}
                                </span>
                                {preset.isPartner && (
                                  <Star
                                    size={12}
                                    className="api-provider-chip-badge"
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                        {selectedSponsorApiProviderTemplate && (
                          <div className="api-provider-hint-block sponsor">
                            <p className="api-provider-hint">
                              {t(
                                "codex.modelProviders.sponsorHint",
                                "URL dịch vụ trạm chuyển riêng đã được điền. Sau khi nhập API Key, thẻ sẽ tự động truy vấn số dư và mức dùng.",
                              )}
                            </p>
                            <div className="api-provider-links">
                              {selectedSponsorApiProviderTemplate.website && (
                                <button
                                  className="btn btn-secondary"
                                  onClick={() =>
                                    void handleOpenProviderLink(
                                      selectedSponsorApiProviderTemplate.website,
                                    )
                                  }
                                >
                                  <ExternalLink size={14} />
                                  {t("codex.api.provider.website", "Trang web")}
                                </button>
                              )}
                              {selectedSponsorApiProviderTemplate.apiKeyUrl && (
                                <button
                                  className="btn btn-secondary"
                                  onClick={() =>
                                    void handleOpenProviderLink(
                                      selectedSponsorApiProviderTemplate.apiKeyUrl,
                                    )
                                  }
                                >
                                  <KeyRound size={14} />
                                  {t(
                                    "codex.api.provider.apiKeyPage",
                                    "Trang API Key",
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {selectedApiProviderPreset &&
                          selectedApiProviderPreset.baseUrls.length > 1 && (
                            <div className="oauth-link">
                              <label>
                                {t("codex.api.provider.endpoint", "Điểm cuối nhà cung cấp")}
                              </label>
                              <div className="api-provider-endpoint-list">
                                {selectedApiProviderPreset.baseUrls.map(
                                  (baseUrl) => (
                                    <button
                                      key={baseUrl}
                                      className={`api-provider-endpoint-chip ${apiBaseUrlInput === baseUrl ? "active" : ""}`}
                                      onClick={() =>
                                        handleApiBaseUrlInputChange(baseUrl)
                                      }
                                      type="button"
                                    >
                                      {baseUrl}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>
                          )}
                        {selectedApiProviderPreset && (
                          <div className="api-provider-hint-block">
                            <p className="api-provider-hint">
                              {t(
                                "codex.api.provider.hint",
                                "Base URL tương thích đã được điền tự động. Bạn vẫn có thể chỉnh sửa thủ công.",
                              )}
                            </p>
                            <div className="api-provider-links">
                              {selectedApiProviderPreset.website && (
                                <button
                                  className="btn btn-secondary"
                                  onClick={() =>
                                    void handleOpenProviderLink(
                                      selectedApiProviderPreset.website || "",
                                    )
                                  }
                                >
                                  <ExternalLink size={14} />
                                  {t("codex.api.provider.website", "Trang web")}
                                </button>
                              )}
                              {selectedApiProviderPreset.apiKeyUrl && (
                                <button
                                  className="btn btn-secondary"
                                  onClick={() =>
                                    void handleOpenProviderLink(
                                      selectedApiProviderPreset.apiKeyUrl || "",
                                    )
                                  }
                                >
                                  <KeyRound size={14} />
                                  {selectedApiProviderPreset.id ===
                                  COCKPIT_API_PROVIDER_ID
                                    ? t(
                                        "codex.api.provider.getApiKey",
                                        "Lấy khóa",
                                      )
                                    : t(
                                        "codex.api.provider.apiKeyPage",
                                        "Trang API Key",
                                      )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="oauth-link">
                          <label>{t("codex.addModal.token", "API Key")}</label>
                          <div className="oauth-url-box oauth-manual-input codex-secret-input">
                            <input
                              type={apiKeyInputVisible ? "text" : "password"}
                              value={apiKeyInput}
                              onChange={(e) =>
                                handleApiKeyInputChange(e.target.value)
                              }
                              autoComplete="off"
                              spellCheck={false}
                            />
                            <button
                              type="button"
                              className="codex-secret-toggle-btn"
                              onClick={() =>
                                setApiKeyInputVisible((visible) => !visible)
                              }
                              title={
                                apiKeyInputVisible
                                  ? t("codex.api.hideApiKey", "Ẩn API Key")
                                  : t("codex.api.showApiKey", "Hiện API Key")
                              }
                              aria-label={
                                apiKeyInputVisible
                                  ? t("codex.api.hideApiKey", "Ẩn API Key")
                                  : t("codex.api.showApiKey", "Hiện API Key")
                              }
                            >
                              {apiKeyInputVisible ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="oauth-link">
                          <label>{t("codex.api.baseUrl", "Base URL")}</label>
                          <div className="oauth-url-box oauth-manual-input">
                            <input
                              type="text"
                              value={apiBaseUrlInput}
                              onChange={(e) =>
                                handleApiBaseUrlInputChange(e.target.value)
                              }
                              placeholder={t(
                                "codex.api.baseUrlPlaceholder",
                                "Để trống để dùng giá trị mặc định chính thức",
                              )}
                            />
                          </div>
                        </div>
                        {apiProviderPresetId !== COCKPIT_API_PROVIDER_ID && (
                          <div className="oauth-link">
                            <label>
                              {t(
                                "codex.modelProviders.newProviderName",
                                "Tên nhà cung cấp (tùy chọn, dùng cho tự động lưu)",
                              )}
                            </label>
                            <div className="oauth-url-box oauth-manual-input">
                              <input
                                type="text"
                                value={newManagedProviderNameInput}
                                onChange={(e) =>
                                  setNewManagedProviderNameInput(e.target.value)
                                }
                                placeholder={t(
                                  "codex.modelProviders.newProviderNamePlaceholder",
                                  "Nếu để trống, tên máy chủ sẽ được dùng tự động",
                                )}
                              />
                            </div>
                          </div>
                        )}
                        {apiProviderPresetId !== OPENAI_OFFICIAL_PRESET_ID && (
                          <>
                            <div className="api-model-catalog-panel">
                              <div className="api-model-catalog-header">
                                <label htmlFor="codex-api-model-catalog-add">
                                  {t(
                                    "codex.api.modelCatalog.label",
                                    "Danh sách mô hình",
                                  )}
                                </label>
                                <span className="api-model-catalog-count">
                                  {t("codex.api.modelCatalog.count", {
                                    defaultValue: "{{count}} mô hình",
                                    count: apiModelCatalogDraft.length,
                                  })}
                                </span>
                              </div>
                              <textarea
                                id="codex-api-model-catalog-add"
                                className="form-input api-model-catalog-input"
                                rows={6}
                                value={apiModelCatalogInput}
                                onChange={(event) => {
                                  setApiModelCatalogInput(event.target.value);
                                  setApiModelCatalogError(null);
                                }}
                                placeholder={t(
                                  "codex.api.modelCatalog.placeholder",
                                  "Nhập một ID mô hình trên mỗi dòng hoặc phân tách các ID bằng dấu phẩy.",
                                )}
                                disabled={addStatus === "loading"}
                                aria-describedby="codex-api-model-catalog-add-hint"
                              />
                              <div className="api-model-catalog-toolbar">
                                <p
                                  id="codex-api-model-catalog-add-hint"
                                  className="api-model-catalog-hint"
                                >
                                  {t(
                                    "codex.api.modelCatalog.editHint",
                                    "Các mô hình đã lấy chỉ được thêm vào bản nháp này. Hãy xem lại và chỉnh sửa trước khi lưu.",
                                  )}
                                </p>
                                <button
                                  type="button"
                                  className="btn btn-secondary api-model-catalog-fetch"
                                  onClick={() =>
                                    void handleFetchApiModelCatalog()
                                  }
                                  disabled={
                                    apiModelCatalogFetching ||
                                    addStatus === "loading" ||
                                    !apiKeyInput.trim()
                                  }
                                >
                                  <RefreshCw
                                    size={14}
                                    className={
                                      apiModelCatalogFetching
                                        ? "loading-spinner"
                                        : undefined
                                    }
                                  />
                                  {apiModelCatalogFetching
                                    ? t(
                                        "codex.api.modelCatalog.fetching",
                                        "Đang lấy...",
                                      )
                                    : t(
                                        "codex.api.modelCatalog.fetch",
                                        "Lấy từ nhà cung cấp",
                                      )}
                                </button>
                              </div>
                              {apiModelCatalogError && (
                                <div className="add-status error api-model-catalog-error">
                                  <CircleAlert size={16} />
                                  <span>{apiModelCatalogError}</span>
                                </div>
                              )}
                            </div>
                            {apiModelCatalogSyncAvailable && (
                              <label className="codex-import-api-service-toggle api-model-catalog-sync-toggle">
                                <span className="codex-import-api-service-toggle-copy">
                                  <strong>
                                    {t(
                                      "codex.api.modelCatalog.syncToggle",
                                      "Đồng bộ mô hình nhà cung cấp với Codex",
                                    )}
                                  </strong>
                                  <small>
                                    {t(
                                      "codex.api.modelCatalog.syncDescription",
                                      "Sau khi lưu, danh sách này được dùng để tạo danh mục mô hình Codex do Cockpit quản lý. Danh mục tùy chỉnh không bị ghi đè.",
                                    )}
                                  </small>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={apiSyncModelCatalogToCodex}
                                  disabled={addStatus === "loading"}
                                  onChange={(event) => {
                                    setApiSyncModelCatalogToCodex(
                                      event.target.checked,
                                    );
                                    setApiModelCatalogError(null);
                                  }}
                                />
                                <span className="codex-import-api-service-switch" />
                              </label>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {addTab === "token" && (
                      <div className="add-section">
                        <p className="section-desc">
                          {t(
                            "codex.token.desc",
                            "Dán auth.json, JSON tài khoản hoặc refresh_token.",
                          )}
                        </p>
                        <details className="token-format-collapse">
                          <summary className="token-format-collapse-summary">
                            {t(
                              "codex.token.formatSummary",
                              "Trường bắt buộc và ví dụ",
                            )}
                          </summary>
                          <div className="token-format">
                            <p className="token-format-required">
                              {t(
                                "codex.token.formatRequired",
                                "Hỗ trợ tokens đầy đủ (id_token + access_token), một refresh_token hoặc mỗi dòng một refresh_token. Khi chỉ có refresh_token, hệ thống sẽ đổi trực tuyến sang thông tin xác thực đầy đủ trước.",
                              )}
                            </p>
                            <div className="token-format-group">
                              <div className="token-format-label">
                                {t(
                                  "codex.token.formatSingleLabel",
                                  "Tokens đầy đủ",
                                )}
                              </div>
                              <pre className="token-format-code">
                                {CODEX_TOKEN_SINGLE_EXAMPLE}
                              </pre>
                            </div>
                            <div className="token-format-group">
                              <div className="token-format-label">
                                {t(
                                  "codex.token.formatRefreshOnlyLabel",
                                  "Chỉ refresh_token",
                                )}
                              </div>
                              <pre className="token-format-code">
                                {CODEX_TOKEN_SESSION_EXAMPLE}
                              </pre>
                            </div>
                            <div className="token-format-group">
                              <div className="token-format-label">
                                {t("codex.token.formatBatchLabel", "Ví dụ hàng loạt")}
                              </div>
                              <pre className="token-format-code">
                                {CODEX_TOKEN_BATCH_EXAMPLE}
                              </pre>
                            </div>
                          </div>
                        </details>
                        <textarea
                          className="token-input"
                          value={tokenInput}
                          onChange={(e) => setTokenInput(e.target.value)}
                          disabled={importing}
                          placeholder={t(
                            "codex.token.placeholder",
                            "Ví dụ: mỗi dòng một refresh_token hoặc {\"refresh_token\":\"rt_...\"}",
                          )}
                        />
                        <label className="codex-import-api-service-toggle">
                          <span className="codex-import-api-service-toggle-copy">
                            <strong>
                              {t(
                                "codex.importApiService.toggle",
                                "Thêm vào dịch vụ API",
                              )}
                            </strong>
                            <small>
                              {t(
                                "codex.importApiService.description",
                                "Thêm các tài khoản đã nhập đủ điều kiện vào nhóm tài khoản dịch vụ API.",
                              )}
                            </small>
                          </span>
                          <input
                            type="checkbox"
                            checked={syncImportedToApiService}
                            disabled={importing}
                            onChange={(event) =>
                              handleSyncImportedToApiServiceChange(
                                event.target.checked,
                              )
                            }
                          />
                          <span className="codex-import-api-service-switch" />
                        </label>
                        <button
                          className="btn btn-primary btn-full"
                          onClick={handleTokenImport}
                          disabled={importing || !tokenInput.trim()}
                        >
                          {importing ? (
                            <RefreshCw size={16} className="loading-spinner" />
                          ) : (
                            <Download size={16} />
                          )}
                          {tokenImportProgress
                            ? `${tokenImportProgress.current}/${tokenImportProgress.total}`
                            : t("common.shared.token.import", "Import")}
                        </button>
                      </div>
                    )}
                    {addTab === "import" && (
                      <div className="add-section">
                        <p className="section-desc">
                          {t(
                            "codex.import.localDesc",
                            "Nhập tài khoản Codex từ các phiên đăng nhập cục bộ.",
                          )}
                        </p>
                        <button
                          className="btn btn-primary btn-full"
                          onClick={handleImportFromLocal}
                          disabled={importing}
                        >
                          {importing ? (
                            <RefreshCw size={16} className="loading-spinner" />
                          ) : (
                            <Database size={16} />
                          )}
                          {t("codex.local.import", "Get Local Account")}
                        </button>
                        <div style={{ height: 12 }} />
                        <p className="section-desc">
                          {t("modals.import.fromFilesDesc")}
                        </p>
                        <label className="codex-import-api-service-toggle">
                          <span className="codex-import-api-service-toggle-copy">
                            <strong>
                              {t(
                                "codex.importApiService.toggle",
                                "Thêm vào dịch vụ API",
                              )}
                            </strong>
                            <small>
                              {t(
                                "codex.importApiService.description",
                                "Thêm các tài khoản đã nhập đủ điều kiện vào nhóm tài khoản dịch vụ API.",
                              )}
                            </small>
                          </span>
                          <input
                            type="checkbox"
                            checked={syncImportedToApiService}
                            disabled={importing}
                            onChange={(event) =>
                              handleSyncImportedToApiServiceChange(
                                event.target.checked,
                              )
                            }
                          />
                          <span className="codex-import-api-service-switch" />
                        </label>
                        <button
                          className="btn btn-secondary btn-full"
                          onClick={handleImportFromFiles}
                          disabled={importing}
                        >
                          {importing ? (
                            <RefreshCw size={16} className="loading-spinner" />
                          ) : (
                            <FileUp size={16} />
                          )}
                          {t("modals.import.fromFiles")}
                        </button>
                      </div>
                    )}
                    {addStatus !== "idle" && (
                      <div ref={addStatusRef} role={addStatus === "error" ? "alert" : "status"} className={`add-status ${addStatus}`}>
                        {addStatus === "success" ? (
                          <Check size={16} />
                        ) : addStatus === "loading" ? (
                          <RefreshCw size={16} className="loading-spinner" />
                        ) : (
                          <CircleAlert size={16} />
                        )}
                        <span>{addMessage}</span>
                        {addTab === "oauth" &&
                          addStatus === "error" &&
                          isOauthTokenExchangeErrorState &&
                          oauthLoginIdRef.current && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() =>
                                void handleRetryOauthTokenExchange()
                              }
                              disabled={oauthCallbackSubmitting}
                            >
                              {oauthCallbackSubmitting ? (
                                <RefreshCw
                                  size={14}
                                  className="loading-spinner"
                                />
                              ) : (
                                <RotateCw size={14} />
                              )}
                              {t("accounts.oauth.continue")}
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                {addTab === "apikey" && (
                  <div className="modal-footer api-key-add-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => void handleApiKeyLogin()}
                      disabled={importing || addStatus === "loading" || apiModelCatalogFetching || !apiKeyInput.trim()}
                    >
                      {addStatus === "loading" ? <RefreshCw size={16} className="loading-spinner" /> : <KeyRound size={16} />}
                      {t("common.shared.addAccount", "Thêm tài khoản")}
                    </button>
                  </div>
                )}
                </div>
              </div>
              {localImportInstances ? (
                <div className="modal-overlay codex-local-import-instance-overlay">
                  <div
                    className="modal codex-local-import-instance-modal"
                    ref={instancePickerDialogRef}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="modal-header">
                      <h2>
                        {t("codex.import.localInstanceTitle", "Chọn phiên bản")}
                      </h2>
                      <button
                        className="modal-close"
                        onClick={handleCloseLocalImportInstancePicker}
                        disabled={localImportBusy}
                        aria-label={t("common.close", "Đóng")}
                      >
                        <X />
                      </button>
                    </div>
                    <div className="modal-body">
                      <ModalErrorMessage message={localImportError} />
                      <p className="codex-local-import-instance-modal__hint">
                        {t(
                          "codex.import.localInstanceDesc",
                          "Phát hiện nhiều phiên bản Codex. Hãy chọn phiên bản để lấy tài khoản cục bộ:",
                        )}
                      </p>
                      {localImportBusy ? (
                        <div className="codex-local-import-instance-modal__busy">
                          <RefreshCw size={14} className="loading-spinner" />
                          <span>
                            {t(
                              "codex.import.importing",
                              "Đang nhập tài khoản cục bộ...",
                            )}
                          </span>
                        </div>
                      ) : null}
                      <div className="codex-local-import-instance-modal__list">
                        {localImportInstances.map((instance) => (
                          <button
                            key={instance.id}
                            className="codex-local-import-instance-modal__option"
                            type="button"
                            onClick={() =>
                              void handleSelectLocalImportInstance(instance.id)
                            }
                            disabled={localImportBusy}
                          >
                            <span className="codex-local-import-instance-modal__option-name">
                              {instance.isDefault
                                ? t("instances.defaultName", "Phiên bản mặc định")
                                : instance.name ||
                                  t("instances.defaultName", "Phiên bản mặc định")}
                            </span>
                            <span className="codex-local-import-instance-modal__option-dir">
                              {instance.userDataDir}
                            </span>
                            {instance.running ? (
                              <span className="codex-local-import-instance-modal__option-badge">
                                {t(
                                  "codex.sessionManager.locationPicker.running",
                                  "Đang chạy",
                                )}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={handleCloseLocalImportInstancePicker}
                        disabled={localImportBusy}
                      >
                        {t("common.cancel", "Hủy")}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              </>,
              document.body,
            );
}
