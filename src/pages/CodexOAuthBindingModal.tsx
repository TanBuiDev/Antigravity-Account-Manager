import { useRef } from "react";
import { useModalFocusTrap } from "../hooks/useModalFocusTrap";
import { useEscCloseTopmost } from "../hooks/useEscClose";
import {
  ArrowDown,
  ArrowDownWideNarrow,
  ArrowUp,
  CircleAlert,
  Clock,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { AccountTagFilterDropdown } from "../components/AccountTagFilterDropdown";
import { ModalErrorMessage } from "../components/ModalErrorMessage";
import { MultiSelectFilterDropdown } from "../components/MultiSelectFilterDropdown";
import { PaginationControls } from "../components/PaginationControls";
import { SingleSelectFilterDropdown } from "../components/SingleSelectFilterDropdown";
import {
  isCodexAgentIdentityAccount,
  isCodexWebSessionAccount,
} from "../types/codex";
import { isCodexOAuthBindingEligibleAccount } from "../utils/codexLocalAccessAccounts";
import { parseCodexSwitchAuthFailure } from "../utils/codexSwitchAuthFailure";
import type { CodexAccountsViewProps } from "./CodexAccountsView";
import "./CodexOAuthBindingModal.css";

/**
 * 账号级 OAuth 绑定弹框。
 * 从 CodexAccountsOverviewPanel 拆出：账号总览与启动预览共用同一个弹框，
 * 由 CodexAccountsView 渲染，任意页签下都能正常显示。
 */
export function CodexOAuthBindingModal(props: CodexAccountsViewProps) {
  const {
    clearFilterTypes,
    clearTagFilter,
    closeOAuthBindingModal,
    closeOAuthBindingQuotaReserveEditor,
    codexAccountSortOptions,
    confirmOAuthBindingQuotaReserveEditor,
    filterTypes,
    handleClearOAuthBinding,
    handleOAuthBindingQuotaReserveToggle,
    handleReauthorizeOAuthBinding,
    handleSubmitOAuthBinding,
    isLocalAccessOAuthBinding,
    maskAccountText,
    oauthAccounts,
    oauthBindingAccount,
    oauthBindingAvailableTags,
    oauthBindingEligibleAccounts,
    oauthBindingError,
    oauthBindingErrorScrollKey,
    oauthBindingFilteredAccounts,
    oauthBindingHasExistingBinding,
    oauthBindingHourlyReserveDraft,
    oauthBindingHourlyReserveInputRef,
    oauthBindingPagination,
    oauthBindingQuotaReserve,
    oauthBindingQuotaReserveEditorOpen,
    oauthBindingQuotaReserveFieldErrors,
    oauthBindingSaving,
    oauthBindingSelectedAccountId,
    oauthBindingTargetActive,
    oauthBindingTargetKind,
    oauthBindingTierCounts,
    oauthBindingTierFilterOptions,
    oauthBindingWeeklyReserveDraft,
    oauthBindingWeeklyReserveInputRef,
    openCodexAddModal,
    openOAuthBindingQuotaReserveEditor,
    resolvePresentation,
    resolveSubscriptionPresentation,
    searchQuery,
    selectedOAuthBindingAccount,
    setOauthBindingError,
    setOauthBindingHourlyReserveDraft,
    setOauthBindingQuotaReserveFieldErrors,
    setOauthBindingSelectedAccountId,
    setOauthBindingWeeklyReserveDraft,
    setSearchQuery,
    setSortBy,
    setSortDirection,
    sortBy,
    sortDirection,
    t,
    tagFilter,
    toggleFilterTypeValue,
    toggleTagFilterValue,
    validateOAuthBindingQuotaReserveField,
  } = props;

  const bindingDialogRef = useRef<HTMLDivElement>(null);
  const reserveDialogRef = useRef<HTMLDivElement>(null);
  const bindingOpen = Boolean(oauthBindingTargetActive);
  const reserveOpen = Boolean(oauthBindingQuotaReserveEditorOpen && isLocalAccessOAuthBinding);
  useModalFocusTrap(bindingDialogRef, bindingOpen, true, !reserveOpen);
  useModalFocusTrap(reserveDialogRef, reserveOpen);
  useEscCloseTopmost(bindingOpen && !reserveOpen && !oauthBindingSaving, closeOAuthBindingModal, bindingDialogRef);
  useEscCloseTopmost(reserveOpen, closeOAuthBindingQuotaReserveEditor, reserveDialogRef);

  if (!oauthBindingTargetActive && !oauthBindingQuotaReserveEditorOpen) {
    return null;
  }

  return (
    <>
      {oauthBindingTargetActive && (
        <div className="modal-overlay">
          <div
            className="modal-content codex-add-modal codex-oauth-binding-modal"
            ref={bindingDialogRef}
            role="dialog"
            aria-modal={!reserveOpen}
            aria-hidden={reserveOpen || undefined}
            aria-label={t("codex.api.oauthBinding.title", "Liên kết tài khoản OAuth")}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t("codex.api.oauthBinding.title", "Liên kết tài khoản OAuth")}</h2>
              <button
                className="modal-close"
                onClick={closeOAuthBindingModal}
                aria-label={t("common.close", "Đóng")}
                disabled={oauthBindingSaving}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <ModalErrorMessage
                message={oauthBindingError}
                scrollKey={oauthBindingErrorScrollKey}
              />
              {parseCodexSwitchAuthFailure(oauthBindingError) && (
                <div className="codex-oauth-binding-reauthorize">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleReauthorizeOAuthBinding}
                    disabled={oauthBindingSaving}
                  >
                    {t("common.reauthorize", "Ủy quyền lại")}
                  </button>
                </div>
              )}
              <div className="add-section">
                <div className="codex-oauth-binding-context">
                  <p className="section-desc codex-oauth-binding-desc">
                    {oauthBindingTargetKind === "local_access"
                      ? t(
                          "codex.localAccess.oauthBinding.desc",
                          "Tùy chọn. Chỉ có thể chọn tài khoản OAuth có refresh_token. Khi chưa liên kết, dịch vụ API chạy theo luồng API Key cũ; sau khi liên kết, trạng thái đăng nhập dùng tài khoản OAuth và Provider dùng cấu hình dịch vụ API hiện tại.",
                        )
                      : t(
                          "codex.api.oauthBinding.desc",
                          "Tùy chọn. Chỉ có thể chọn tài khoản OAuth có refresh_token. Khi chưa liên kết, tài khoản này chuyển theo luồng API Key cũ; sau khi liên kết, trạng thái đăng nhập dùng tài khoản OAuth và Provider dùng cấu hình tài khoản API Key này.",
                        )}
                  </p>
                  <div className="section-desc codex-oauth-binding-current-target">
                    {oauthBindingTargetKind === "local_access"
                      ? t("codex.localAccess.oauthBinding.currentService", {
                          defaultValue: "Dịch vụ API: {{name}}",
                          name: t("codex.localAccess.title", "Dịch vụ API"),
                        })
                      : oauthBindingAccount
                        ? t("codex.api.oauthBinding.currentAccount", {
                            defaultValue: "Tài khoản API Key: {{name}}",
                            name: maskAccountText(
                              resolvePresentation(oauthBindingAccount)
                                .displayName,
                            ),
                          })
                        : null}
                  </div>
                </div>
                <div className="codex-oauth-binding-picker">
                  <div className="codex-oauth-binding-picker-header">
                    <label>
                      {t(
                        "codex.api.oauthBinding.selectLabel",
                        "Chọn tài khoản OAuth",
                      )}
                    </label>
                    <div className="codex-oauth-binding-picker-controls">
                      {isLocalAccessOAuthBinding && (
                        <div className="codex-oauth-binding-quota-control">
                          <label
                            className="codex-oauth-binding-gateway-toggle codex-oauth-binding-quota-toggle"
                            title={t(
                              "codex.localAccess.oauthBinding.quotaReserveDesc",
                              "Dịch vụ API chỉ dùng tài khoản OAuth này khi hạn mức còn lại của 5 giờ và tuần đều cao hơn mức giữ lại.",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(oauthBindingQuotaReserve)}
                              onChange={(event) =>
                                handleOAuthBindingQuotaReserveToggle(
                                  event.target.checked,
                                )
                              }
                              disabled={oauthBindingSaving}
                            />
                            <span
                              className="codex-oauth-binding-checkbox-ui"
                              aria-hidden="true"
                            />
                            <span>
                              {t(
                                "codex.localAccess.oauthBinding.quotaReserveToggle",
                                "Giữ lại hạn mức OAuth",
                              )}
                            </span>
                          </label>
                          {oauthBindingQuotaReserve && (
                            <button
                              type="button"
                              className="btn codex-oauth-binding-quota-summary"
                              onClick={openOAuthBindingQuotaReserveEditor}
                              disabled={oauthBindingSaving}
                              title={`${t(
                                "codex.localAccess.oauthBinding.quotaReserveHourlyLabel",
                                "Giữ lại 5 giờ",
                              )} ${oauthBindingQuotaReserve.hourlyPercent}% · ${t(
                                "codex.localAccess.oauthBinding.quotaReserveWeeklyLabel",
                                "Giữ lại theo tuần",
                              )} ${oauthBindingQuotaReserve.weeklyPercent}%`}
                              aria-label={`${t("instances.actions.edit", "Chỉnh sửa")} ${t(
                                "codex.localAccess.oauthBinding.quotaReserveToggle",
                                "Giữ lại hạn mức OAuth",
                              )}`}
                            >
                              <span>
                                {t("codex.instances.quota.hourly", "5 giờ")}{" "}
                                <strong>{oauthBindingQuotaReserve.hourlyPercent}%</strong>
                              </span>
                              <span>
                                {t("codex.instances.quota.weekly", "Tuần")}{" "}
                                <strong>{oauthBindingQuotaReserve.weeklyPercent}%</strong>
                              </span>
                              <Pencil size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {oauthAccounts.length === 0 ? (
                    <div className="add-status error">
                      <CircleAlert size={16} />
                      <span>
                        {t(
                          "codex.api.oauthBinding.empty",
                          "Chưa có tài khoản OAuth. Hãy thêm tài khoản ủy quyền OAuth trước.",
                        )}
                      </span>
                    </div>
                  ) : (
                    <>
                      {oauthBindingEligibleAccounts.length === 0 && (
                        <div className="add-status error">
                          <CircleAlert size={16} />
                          <span>
                            {t(
                              "codex.api.oauthBinding.emptyEligible",
                              "Không có tài khoản OAuth có refresh_token. Hãy ủy quyền OAuth lại hoặc thêm tài khoản OAuth đủ điều kiện.",
                            )}
                          </span>
                        </div>
                      )}
                      <div className="codex-oauth-binding-toolbar">
                        <div className="search-box codex-oauth-binding-search">
                          <Search size={16} className="search-icon" />
                          <input
                            type="text"
                            placeholder={t(
                              "common.shared.search",
                              "Tìm kiếm tài khoản...",
                            )}
                            value={searchQuery}
                            onChange={(event) =>
                              setSearchQuery(event.target.value)
                            }
                            disabled={oauthBindingSaving}
                          />
                        </div>
                        <MultiSelectFilterDropdown
                          options={oauthBindingTierFilterOptions}
                          selectedValues={filterTypes}
                          allLabel={t("common.shared.filter.all", {
                            count: oauthBindingTierCounts.all,
                          })}
                          filterLabel={t("common.shared.filterLabel", "Bộ lọc")}
                          clearLabel={t("accounts.clearFilter", "Xóa bộ lọc")}
                          emptyLabel={t("common.none", "None​")}
                          ariaLabel={t("common.shared.filterLabel", "Bộ lọc")}
                          onToggleValue={toggleFilterTypeValue}
                          onClear={clearFilterTypes}
                        />
                        <AccountTagFilterDropdown
                          availableTags={oauthBindingAvailableTags}
                          selectedTags={tagFilter}
                          onToggleTag={toggleTagFilterValue}
                          onClear={clearTagFilter}
                        />
                        <SingleSelectFilterDropdown
                          value={sortBy}
                          options={codexAccountSortOptions}
                          ariaLabel={t("common.shared.sortLabel", "Sắp xếp")}
                          icon={<ArrowDownWideNarrow size={14} />}
                          disabled={oauthBindingSaving}
                          onChange={setSortBy}
                        />
                        {sortBy !== "custom" && (
                          <button
                            type="button"
                            className="sort-direction-btn"
                            onClick={() =>
                              setSortDirection((prev) =>
                                prev === "desc" ? "asc" : "desc",
                              )
                            }
                            disabled={oauthBindingSaving}
                            title={
                              sortDirection === "desc"
                                ? t(
                                    "common.shared.sort.descTooltip",
                                    "Giảm dần (nhấn để chuyển Tăng dần)",
                                  )
                                : t(
                                    "common.shared.sort.ascTooltip",
                                    "Tăng dần (nhấn để chuyển Giảm dần)",
                                  )
                            }
                            aria-label={t(
                              "common.shared.sort.toggleDirection",
                              "Đổi hướng sắp xếp",
                            )}
                          >
                            {sortDirection === "desc" ? (
                              <ArrowDown size={15} />
                            ) : (
                              <ArrowUp size={15} />
                            )}
                          </button>
                        )}
                      </div>
                      {oauthBindingFilteredAccounts.length === 0 ? (
                        <div className="group-account-empty">
                          <span>
                            {t("common.shared.noMatch.title", "Không có tài khoản phù hợp")}
                          </span>
                        </div>
                      ) : (
                        <div className="codex-oauth-binding-list">
                          {oauthBindingPagination.pageItems.map((account) => {
                            const presentation = resolvePresentation(account);
                            const subscriptionInfo =
                              resolveSubscriptionPresentation(account);
                            const selected =
                              oauthBindingSelectedAccountId === account.id;
                            const eligible =
                              isCodexOAuthBindingEligibleAccount(account);
                            const rowDisabled = oauthBindingSaving || !eligible;
                            const emailText = maskAccountText(
                              account.email ||
                                account.account_name ||
                                presentation.displayName ||
                                account.id,
                            );
                            return (
                              <label
                                key={account.id}
                                className={`codex-oauth-binding-row ${selected ? "is-selected" : ""}`}
                                aria-label={emailText}
                                aria-disabled={rowDisabled}
                                title={
                                  eligible
                                    ? emailText
                                    : isCodexAgentIdentityAccount(account)
                                      ? t(
                                          "codex.agentIdentityRegistration.oauthBindingUnsupported",
                                          "Tài khoản Agent Identity chỉ dành cho Dịch vụ API và không thể dùng làm tài khoản liên kết OAuth.",
                                        )
                                      : isCodexWebSessionAccount(account)
                                        ? t(
                                            "codex.webSessionImport.oauthBindingUnsupported",
                                            "Web Session không dùng OAuth.",
                                          )
                                        : t(
                                            "codex.api.oauthBinding.validationSubscriptionRequired",
                                            "Chỉ có thể liên kết tài khoản OAuth có refresh_token",
                                          )
                                }
                                onClick={(event) => {
                                  if (rowDisabled) {
                                    event.preventDefault();
                                    return;
                                  }
                                  setOauthBindingSelectedAccountId(account.id);
                                  setOauthBindingError(null);
                                }}
                              >
                                <input
                                  type="radio"
                                  name="codex-oauth-binding-account"
                                  checked={selected}
                                  onChange={() => {
                                    setOauthBindingSelectedAccountId(
                                      account.id,
                                    );
                                    setOauthBindingError(null);
                                  }}
                                  disabled={rowDisabled}
                                />
                                <div className="codex-oauth-binding-row-main">
                                  <span
                                    className="codex-oauth-binding-row-name"
                                    title={emailText}
                                  >
                                    {emailText}
                                  </span>
                                  <span
                                    className={`tier-badge codex-oauth-binding-row-plan ${presentation.planClass || "unknown"}`}
                                    title={presentation.planLabel}
                                  >
                                    {presentation.planLabel}
                                  </span>
                                  <span
                                    className={`codex-oauth-binding-row-term ${subscriptionInfo.tone}`}
                                    title={subscriptionInfo.titleText}
                                  >
                                    <Clock size={12} />
                                    <span>
                                      {t("codex.subscription.label", "Hết hạn gói")}
                                    </span>
                                    <strong>
                                      {subscriptionInfo.valueText}
                                    </strong>
                                    <span>{subscriptionInfo.detailText}</span>
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <PaginationControls
                        totalItems={oauthBindingPagination.totalItems}
                        currentPage={oauthBindingPagination.currentPage}
                        totalPages={oauthBindingPagination.totalPages}
                        pageSize={oauthBindingPagination.pageSize}
                        pageSizeOptions={oauthBindingPagination.pageSizeOptions}
                        rangeStart={oauthBindingPagination.rangeStart}
                        rangeEnd={oauthBindingPagination.rangeEnd}
                        canGoPrevious={oauthBindingPagination.canGoPrevious}
                        canGoNext={oauthBindingPagination.canGoNext}
                        onPageSizeChange={oauthBindingPagination.setPageSize}
                        onPreviousPage={oauthBindingPagination.goToPreviousPage}
                        onNextPage={oauthBindingPagination.goToNextPage}
                      />
                    </>
                  )}
                </div>
                <div className="api-key-edit-actions">
                  {oauthAccounts.length === 0 && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        closeOAuthBindingModal();
                        openCodexAddModal("oauth");
                      }}
                      disabled={oauthBindingSaving}
                    >
                      {t("codex.addModal.oauth", "Ủy quyền OAuth")}
                    </button>
                  )}
                  {oauthBindingHasExistingBinding && (
                    <button
                      className="btn btn-secondary codex-oauth-binding-clear"
                      onClick={() => void handleClearOAuthBinding()}
                      disabled={oauthBindingSaving}
                    >
                      {t("codex.api.oauthBinding.clearAction", "Bỏ liên kết")}
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={closeOAuthBindingModal}
                    disabled={oauthBindingSaving}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => void handleSubmitOAuthBinding()}
                    disabled={
                      oauthBindingSaving ||
                      !selectedOAuthBindingAccount ||
                      oauthBindingEligibleAccounts.length === 0
                    }
                  >
                    {oauthBindingSaving
                      ? t("common.saving", "Đang lưu...")
                      : t("common.save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {oauthBindingQuotaReserveEditorOpen && isLocalAccessOAuthBinding && (
        <div className="modal-overlay codex-oauth-binding-quota-overlay">
          <div
            className="modal-content codex-add-modal codex-oauth-binding-quota-modal"
            ref={reserveDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("codex.localAccess.oauthBinding.quotaReserveToggle", "Giữ lại hạn mức OAuth")}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {t(
                  "codex.localAccess.oauthBinding.quotaReserveToggle",
                  "Giữ lại hạn mức OAuth",
                )}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={closeOAuthBindingQuotaReserveEditor}
                aria-label={t("common.close", "Đóng")}
              >
                <X />
              </button>
            </div>
            <div className="modal-body">
              <div className="add-section">
                <p className="section-desc codex-oauth-binding-quota-desc">
                  {t(
                    "codex.localAccess.oauthBinding.quotaReserveDesc",
                    "Dịch vụ API chỉ dùng tài khoản OAuth này khi hạn mức còn lại của 5 giờ và tuần đều cao hơn mức giữ lại.",
                  )}
                </p>
                <div className="codex-oauth-binding-quota-fields">
                  <label className="codex-oauth-binding-quota-field">
                    <span>
                      {t(
                        "codex.localAccess.oauthBinding.quotaReserveHourlyLabel",
                        "Giữ lại 5 giờ",
                      )}
                    </span>
                    <div className="codex-oauth-binding-quota-input-wrap">
                      <input
                        ref={oauthBindingHourlyReserveInputRef}
                        className={
                          oauthBindingQuotaReserveFieldErrors.hourlyPercent
                            ? "codex-account-note-input has-error"
                            : "codex-account-note-input"
                        }
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={3}
                        value={oauthBindingHourlyReserveDraft}
                        onChange={(event) => {
                          if (!/^\d*$/.test(event.target.value)) return;
                          setOauthBindingHourlyReserveDraft(event.target.value);
                          setOauthBindingQuotaReserveFieldErrors((prev) => ({
                            ...prev,
                            hourlyPercent: undefined,
                          }));
                        }}
                        onBlur={() =>
                          validateOAuthBindingQuotaReserveField(
                            "hourlyPercent",
                            oauthBindingHourlyReserveDraft,
                          )
                        }
                      />
                      <span aria-hidden="true">%</span>
                    </div>
                    {oauthBindingQuotaReserveFieldErrors.hourlyPercent && (
                      <span className="codex-account-note-field-error codex-oauth-binding-quota-error">
                        {oauthBindingQuotaReserveFieldErrors.hourlyPercent}
                      </span>
                    )}
                  </label>
                  <label className="codex-oauth-binding-quota-field">
                    <span>
                      {t(
                        "codex.localAccess.oauthBinding.quotaReserveWeeklyLabel",
                        "Giữ lại theo tuần",
                      )}
                    </span>
                    <div className="codex-oauth-binding-quota-input-wrap">
                      <input
                        ref={oauthBindingWeeklyReserveInputRef}
                        className={
                          oauthBindingQuotaReserveFieldErrors.weeklyPercent
                            ? "codex-account-note-input has-error"
                            : "codex-account-note-input"
                        }
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={3}
                        value={oauthBindingWeeklyReserveDraft}
                        onChange={(event) => {
                          if (!/^\d*$/.test(event.target.value)) return;
                          setOauthBindingWeeklyReserveDraft(event.target.value);
                          setOauthBindingQuotaReserveFieldErrors((prev) => ({
                            ...prev,
                            weeklyPercent: undefined,
                          }));
                        }}
                        onBlur={() =>
                          validateOAuthBindingQuotaReserveField(
                            "weeklyPercent",
                            oauthBindingWeeklyReserveDraft,
                          )
                        }
                      />
                      <span aria-hidden="true">%</span>
                    </div>
                    {oauthBindingQuotaReserveFieldErrors.weeklyPercent && (
                      <span className="codex-account-note-field-error codex-oauth-binding-quota-error">
                        {oauthBindingQuotaReserveFieldErrors.weeklyPercent}
                      </span>
                    )}
                  </label>
                </div>
                <div className="api-key-edit-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeOAuthBindingQuotaReserveEditor}
                  >
                    {t("common.cancel", "Hủy")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={confirmOAuthBindingQuotaReserveEditor}
                  >
                    {t("common.confirm", "Xác nhận")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
