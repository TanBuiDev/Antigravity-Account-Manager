import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderPlus, LogOut } from 'lucide-react';
import { PlatformGroupTabs } from './PlatformGroupTabs';
import { AccountGroupModal, AddToGroupModal } from './AccountGroupModal';
import type { UsePlatformAccountGroupsReturn } from '../hooks/usePlatformAccountGroups';

export interface AccountSelectionToolbarProps {
  selectedCount: number;
  allSelected: boolean;
  disabled?: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  actions?: ReactNode;
  children?: ReactNode;

  /** Đối tượng trả về từ Hook nhóm nền tảng dùng chung; hiển thị tab nhóm và các nút thêm/xóa tài khoản khỏi nhóm khi được truyền vào */
  grouping?: UsePlatformAccountGroupsReturn;
  /** Dùng để đếm số tài khoản trong từng tab nhóm và thêm tài khoản vào nhóm */
  accounts?: Array<{ id: string; [key: string]: any }>;
  /** Danh sách ID tài khoản đang chọn để thêm vào hoặc xóa khỏi nhóm */
  selectedIds?: string[];
}

export function AccountSelectionToolbar({
  selectedCount,
  allSelected,
  disabled = false,
  onToggleSelectAll,
  onClearSelection,
  actions,
  children,
  grouping,
  accounts,
  selectedIds,
}: AccountSelectionToolbarProps) {
  const { t } = useTranslation();
  const hasSelection = selectedCount > 0;

  const middleContent = children ?? (grouping ? (
    <PlatformGroupTabs
      groups={grouping.groups}
      activeGroupId={grouping.activeGroupId}
      onSelectGroup={grouping.setActiveGroupId}
      onOpenManage={() => grouping.setShowManageModal(true)}
      accounts={accounts || []}
    />
  ) : null);

  const resolvedActions = (
    <>
      {grouping && (
        <>
          <button
            type="button"
            className="btn btn-secondary icon-only"
            onClick={() => grouping.setShowAddToGroupModal(true)}
            title={t('accounts.groups.addToGroup', "Thêm vào nhóm")}
            aria-label={t('accounts.groups.addToGroup', "Thêm vào nhóm")}
          >
            <FolderPlus size={14} />
          </button>
          {grouping.activeGroup && (
            <button
              type="button"
              className="btn btn-secondary icon-only"
              onClick={() => void grouping.handleRemoveFromGroup(selectedIds || [])}
              title={t('accounts.groups.removeFromGroup', "Xóa khỏi nhóm")}
              aria-label={t('accounts.groups.removeFromGroup', "Xóa khỏi nhóm")}
            >
              <LogOut size={14} />
            </button>
          )}
        </>
      )}
      {actions}
    </>
  );

  return (
    <>
      <div className={`codex-overview-selection-bar account-selection-toolbar ${middleContent ? 'has-middle' : ''}`}>
        <div className="codex-overview-selection-left">
          <label className="codex-overview-select-all">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={disabled}
              onChange={onToggleSelectAll}
            />
            <span>{t('common.selectAll', "Chọn tất cả")}</span>
          </label>
          {hasSelection && (
            <>
              <span className="codex-overview-selected-count">
                {t('claude.selection.selected', "Đã chọn {{count}}", { count: selectedCount })}
              </span>
              <button
                type="button"
                className="codex-overview-clear-selection-btn"
                onClick={onClearSelection}
              >
                {t('messages.clearSelection', "Bỏ chọn")}
              </button>
            </>
          )}
        </div>
        {middleContent && (
          <div className="account-selection-toolbar-middle">
            {middleContent}
          </div>
        )}
        {hasSelection && (
          <div className="codex-overview-selection-actions">{resolvedActions}</div>
        )}
      </div>

      {grouping && (
        <>
          <AccountGroupModal
            isOpen={grouping.showManageModal}
            onClose={() => grouping.setShowManageModal(false)}
            platform={grouping.platform}
            onGroupsChanged={grouping.reloadGroups}
            accounts={accounts}
          />

          <AddToGroupModal
            isOpen={grouping.showAddToGroupModal}
            onClose={() => grouping.setShowAddToGroupModal(false)}
            accountIds={selectedIds || []}
            platform={grouping.platform}
            onAdded={() => {
              void grouping.reloadGroups();
              onClearSelection();
            }}
          />
        </>
      )}
    </>
  );
}
