import { useEffect, useRef, useState } from 'react'
import { Tag, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useDropdownPanelPlacement } from '../hooks/useDropdownPanelPlacement'
import { useEscCloseTopmost } from '../hooks/useEscClose'
import './AccountFilterDropdown.css'

interface AccountTagFilterDropdownProps {
  availableTags: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  onClear: () => void
  onDeleteTag?: (tag: string) => void
  groupByTag?: boolean
  onToggleGroupByTag?: (enabled: boolean) => void
}

export function AccountTagFilterDropdown({
  availableTags,
  selectedTags,
  onToggleTag,
  onClear,
  onDeleteTag,
  groupByTag = false,
  onToggleGroupByTag,
}: AccountTagFilterDropdownProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEscCloseTopmost(open, () => {
    setOpen(false)
    rootRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, rootRef)
  const { panelPlacement, panelRef, scrollContainerStyle } = useDropdownPanelPlacement(
    rootRef,
    open,
    availableTags.length,
  )

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      setOpen(false)
    }
    // 延迟绑定，避免与打开触发器的同一次点击立刻关闭
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handlePointerDown)
    }, 0)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open])

  return (
    <div className="tag-filter account-filter-surface" ref={rootRef}>
      <button
        type="button"
        className={`tag-filter-btn ${selectedTags.length > 0 ? 'active' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('accounts.filterTags', "Lọc thẻ")}
      >
        <Tag size={14} />
        {selectedTags.length > 0
          ? `${t('accounts.filterTagsCount', "Thẻ")}(${selectedTags.length})`
          : t('accounts.filterTags', "Lọc thẻ")}
      </button>
      {open && (
        <div
          ref={panelRef}
          className={`tag-filter-panel ${panelPlacement === 'top' ? 'open-top' : ''}`}
        >
          {availableTags.length === 0 ? (
            <div className="tag-filter-empty">
              {t('accounts.noAvailableTags', "Không có thẻ nào")}
            </div>
          ) : (
            <div className="tag-filter-options" style={scrollContainerStyle}>
              {availableTags.map((tag) => (
                <label
                  key={tag}
                  className={`tag-filter-option ${selectedTags.includes(tag) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => onToggleTag(tag)}
                  />
                  <span className="tag-filter-name">{tag}</span>
                  {onDeleteTag && (
                    <button
                      type="button"
                      className="tag-filter-delete"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onDeleteTag(tag)
                      }}
                      aria-label={t('accounts.deleteTagAria', {
                        tag,
                        defaultValue: "Xóa thẻ {{tag}}",
                      })}
                    >
                      <X size={12} />
                    </button>
                  )}
                </label>
              ))}
            </div>
          )}
          {onToggleGroupByTag && (
            <>
              <div className="tag-filter-divider" />
              <label className="tag-filter-group-toggle">
                <input
                  type="checkbox"
                  checked={groupByTag}
                  onChange={(event) => onToggleGroupByTag(event.target.checked)}
                />
                <span>{t('accounts.groupByTag', "Nhóm theo thẻ")}</span>
              </label>
            </>
          )}
          {selectedTags.length > 0 && (
            <button type="button" className="tag-filter-clear" onClick={onClear}>
              {t('accounts.clearFilter', "Xóa bộ lọc")}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
