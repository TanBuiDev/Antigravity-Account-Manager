import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  ChevronDown,
  Compass,
  LayoutGrid,
  Lightbulb,
  Rocket,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react';
import type { Page } from '../types/navigation';

type ManualAction =
  | { id: string; kind: 'navigate'; page: Page; label: string; primary?: boolean }
  | { id: string; kind: 'layout'; label: string; primary?: boolean };

interface ManualSection {
  id: string;
  icon: ReactNode;
  title: string;
  summary: string;
  outcomes: string[];
  steps: string[];
  cautions: string[];
  keywords: string[];
  actions: ManualAction[];
}

interface ManualPageProps {
  onNavigate: (page: Page) => void;
  onOpenPlatformLayout: () => void;
}

function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase();
}

export function ManualPage({ onNavigate, onOpenPlatformLayout }: ManualPageProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(['quick-start', 'instances', 'settings']),
  );

  const sections = useMemo<ManualSection[]>(
    () => [
      {
        id: 'quick-start',
        icon: <Rocket size={18} />,
        title: t('manual.quickStart.title', "Bắt đầu nhanh (5 phút)"),
        summary: t(
          'manual.quickStart.summary',
          "Mục này giải thích cách dùng Bắt đầu nhanh (5 phút) trong quy trình hàng ngày.",
        ),
        outcomes: [
          t('manual.quickStart.outcomes.0', "Hiểu Bắt đầu nhanh (5 phút) giúp giải quyết điều gì."),
          t('manual.quickStart.outcomes.1', "Dùng quy trình đề xuất trong Bắt đầu nhanh (5 phút) để giảm lỗi thao tác."),
          t('manual.quickStart.outcomes.2', "Xác nhận một lần chạy thành công trong Bắt đầu nhanh (5 phút) trước khi mở rộng."),
        ],
        steps: [
          t('manual.quickStart.steps.0', "Mở trang Bắt đầu nhanh (5 phút)."),
          t('manual.quickStart.steps.1', "Hoàn tất cấu hình cơ bản và liên kết bắt buộc cho Bắt đầu nhanh (5 phút)."),
          t('manual.quickStart.steps.2', "Chạy một thao tác thủ công trong Bắt đầu nhanh (5 phút) để xác minh kết quả."),
          t('manual.quickStart.steps.3', "Khi troubleshooting: Cài đặt -> Thư mục dữ liệu -> Mở, rồi vào logs."),
        ],
        cautions: [
          t('manual.quickStart.cautions.0', "Sao lưu dữ liệu trước thao tác rủi ro hoặc hàng loạt trong Bắt đầu nhanh (5 phút)."),
          t('manual.quickStart.cautions.1', "Kiểm tra bộ lọc và phạm vi mục tiêu trước khi chạy trong Bắt đầu nhanh (5 phút)."),
        ],
        keywords: [
          t('manual.quickStart.keywords.0', "Bắt đầu nhanh (5 phút)"),
          t('manual.quickStart.keywords.1', "hướng dẫn"),
          t('manual.quickStart.keywords.2', 'first run'),
          t('manual.quickStart.keywords.3', 'onboarding'),
        ],
        actions: [
          { id: 'go-dashboard', kind: 'navigate', page: 'dashboard', label: t('manual.actions.goDashboard', "Đi tới bảng điều khiển"), primary: true },
          { id: 'go-overview', kind: 'navigate', page: 'overview', label: t('manual.actions.goAntigravity', "Đi tới Antigravity IDE") },
          { id: 'go-settings', kind: 'navigate', page: 'settings', label: t('manual.actions.goSettings', "Đi tới cài đặt") },
        ],
      },
      {
        id: 'dashboard',
        icon: <Compass size={18} />,
        title: t('manual.dashboard.title', "Bảng điều khiển"),
        summary: t(
          'manual.dashboard.summary',
          "Mục này giải thích cách dùng Bảng điều khiển trong quy trình hàng ngày.",
        ),
        outcomes: [
          t('manual.dashboard.outcomes.0', "Hiểu Bảng điều khiển giúp giải quyết điều gì."),
          t('manual.dashboard.outcomes.1', "Dùng quy trình đề xuất trong Bảng điều khiển để giảm lỗi thao tác."),
        ],
        steps: [
          t('manual.dashboard.steps.0', "Mở trang Bảng điều khiển."),
          t('manual.dashboard.steps.1', "Hoàn tất cấu hình cơ bản và liên kết bắt buộc cho Bảng điều khiển."),
          t('manual.dashboard.steps.2', "Chạy một thao tác thủ công trong Bảng điều khiển để xác minh kết quả."),
        ],
        cautions: [
          t('manual.dashboard.cautions.0', "Sao lưu dữ liệu trước thao tác rủi ro hoặc hàng loạt trong Bảng điều khiển."),
        ],
        keywords: [
          t('manual.dashboard.keywords.0', "Bảng điều khiển"),
          t('manual.dashboard.keywords.1', "hướng dẫn"),
          t('manual.dashboard.keywords.2', "quy trình"),
          t('manual.dashboard.keywords.3', 'dashboard'),
        ],
        actions: [
          { id: 'go-dashboard', kind: 'navigate', page: 'dashboard', label: t('manual.actions.goDashboard', "Đi tới bảng điều khiển"), primary: true },
          { id: 'open-layout', kind: 'layout', label: t('manual.actions.openLayout', "Mở bố cục nền tảng") },
        ],
      },
      {
        id: 'antigravity',
        icon: <Sparkles size={18} />,
        title: t('manual.antigravity.title', "Quản lý tài khoản Antigravity IDE"),
        summary: t(
          'manual.antigravity.summary',
          "Mục này giải thích cách dùng Quản lý tài khoản Antigravity IDE trong quy trình hàng ngày.",
        ),
        outcomes: [
          t('manual.antigravity.outcomes.0', "Hiểu Quản lý tài khoản Antigravity IDE giúp giải quyết điều gì."),
          t('manual.antigravity.outcomes.1', "Dùng quy trình đề xuất trong Quản lý tài khoản Antigravity IDE để giảm lỗi thao tác."),
        ],
        steps: [
          t('manual.antigravity.steps.0', "Mở trang Quản lý tài khoản Antigravity IDE."),
          t('manual.antigravity.steps.1', "Hoàn tất cấu hình cơ bản và liên kết bắt buộc cho Quản lý tài khoản Antigravity IDE."),
          t('manual.antigravity.steps.2', "Chạy một thao tác thủ công trong Quản lý tài khoản Antigravity IDE để xác minh kết quả."),
        ],
        cautions: [
          t('manual.antigravity.cautions.0', "Sao lưu dữ liệu trước thao tác rủi ro hoặc hàng loạt trong Quản lý tài khoản Antigravity IDE."),
        ],
        keywords: [
          t('manual.antigravity.keywords.0', 'antigravity'),
          t('manual.antigravity.keywords.1', "hướng dẫn"),
          t('manual.antigravity.keywords.2', "quy trình"),
          t('manual.antigravity.keywords.3', "tài khoản"),
        ],
        actions: [
          { id: 'go-overview', kind: 'navigate', page: 'overview', label: t('manual.actions.goAntigravity', "Đi tới Antigravity IDE"), primary: true },
        ],
      },
      {
        id: 'providers',
        icon: <BookOpen size={18} />,
        title: t('manual.providers.title', 'Codex / GitHub Copilot / Windsurf / Kiro'),
        summary: t(
          'manual.providers.summary',
          "Mục này giải thích cách dùng Codex / GitHub Copilot / Devin / Kiro trong quy trình hàng ngày.",
        ),
        outcomes: [
          t('manual.providers.outcomes.0', "Hiểu Codex / GitHub Copilot / Devin / Kiro giúp giải quyết điều gì."),
          t('manual.providers.outcomes.1', "Dùng quy trình đề xuất trong Codex / GitHub Copilot / Devin / Kiro để giảm lỗi thao tác."),
          t('manual.providers.outcomes.2', "Xác nhận một lần chạy thành công trong Codex / GitHub Copilot / Devin / Kiro trước khi mở rộng."),
        ],
        steps: [
          t('manual.providers.steps.0', "Mở trang Codex / GitHub Copilot / Devin / Kiro."),
          t('manual.providers.steps.1', "Hoàn tất cấu hình cơ bản và liên kết bắt buộc cho Codex / GitHub Copilot / Devin / Kiro."),
          t('manual.providers.steps.2', "Chạy một thao tác thủ công trong Codex / GitHub Copilot / Devin / Kiro để xác minh kết quả."),
        ],
        cautions: [
          t('manual.providers.cautions.0', "Sao lưu dữ liệu trước thao tác rủi ro hoặc hàng loạt trong Codex / GitHub Copilot / Devin / Kiro."),
          t('manual.providers.cautions.1', "Kiểm tra bộ lọc và phạm vi mục tiêu trước khi chạy trong Codex / GitHub Copilot / Devin / Kiro."),
        ],
        keywords: [
          t('manual.providers.keywords.0', 'codex'),
          t('manual.providers.keywords.1', 'github copilot'),
          t('manual.providers.keywords.2', 'windsurf'),
          t('manual.providers.keywords.3', 'kiro'),
          t('manual.providers.keywords.4', "cài đặt"),
          t('manual.providers.keywords.5', "khắc phục lỗi"),
        ],
        actions: [
          { id: 'go-codex', kind: 'navigate', page: 'codex', label: t('manual.actions.goCodex', "Đi tới Codex"), primary: true },
          { id: 'go-ghcp', kind: 'navigate', page: 'github-copilot', label: t('manual.actions.goGitHubCopilot', "Đi tới GitHub Copilot") },
          { id: 'go-windsurf', kind: 'navigate', page: 'windsurf', label: t('manual.actions.goWindsurf', "Đi tới Devin") },
          { id: 'go-kiro', kind: 'navigate', page: 'kiro', label: t('manual.actions.goKiro', "Đi tới Kiro") },
        ],
      },
      {
        id: 'instances',
        icon: <LayoutGrid size={18} />,
        title: t('manual.instances.title', "Đa instance (trọng tâm)"),
        summary: t(
          'manual.instances.summary',
          "Mục này giải thích cách dùng Đa instance (trọng tâm) trong quy trình hàng ngày.",
        ),
        outcomes: [
          t('manual.instances.outcomes.0', "Hiểu Đa instance (trọng tâm) giúp giải quyết điều gì."),
          t('manual.instances.outcomes.1', "Dùng quy trình đề xuất trong Đa instance (trọng tâm) để giảm lỗi thao tác."),
          t('manual.instances.outcomes.2', "Xác nhận một lần chạy thành công trong Đa instance (trọng tâm) trước khi mở rộng."),
        ],
        steps: [
          t('manual.instances.steps.0', "Mở trang Đa instance (trọng tâm)."),
          t('manual.instances.steps.1', "Hoàn tất cấu hình cơ bản và liên kết bắt buộc cho Đa instance (trọng tâm)."),
          t('manual.instances.steps.2', "Chạy một thao tác thủ công trong Đa instance (trọng tâm) để xác minh kết quả."),
        ],
        cautions: [
          t('manual.instances.cautions.0', "Sao lưu dữ liệu trước thao tác rủi ro hoặc hàng loạt trong Đa instance (trọng tâm)."),
          t('manual.instances.cautions.1', "Kiểm tra bộ lọc và phạm vi mục tiêu trước khi chạy trong Đa instance (trọng tâm)."),
        ],
        keywords: [
          t('manual.instances.keywords.0', "Đa instance (trọng tâm)"),
          t('manual.instances.keywords.1', "hướng dẫn"),
          t('manual.instances.keywords.2', "quy trình"),
          t('manual.instances.keywords.3', "tài khoản"),
          t('manual.instances.keywords.4', "cài đặt"),
        ],
        actions: [
          { id: 'go-instances', kind: 'navigate', page: 'instances', label: t('manual.actions.goInstances', "Đi tới đa instance"), primary: true },
        ],
      },
      {
        id: 'wakeup',
        icon: <Rocket size={18} />,
        title: t('manual.wakeup.title', "Tác vụ wakeup và xác minh"),
        summary: t(
          'manual.wakeup.summary',
          "Mục này giải thích cách dùng Tác vụ wakeup và xác minh trong quy trình hàng ngày.",
        ),
        outcomes: [
          t('manual.wakeup.outcomes.0', "Hiểu Tác vụ wakeup và xác minh giúp giải quyết điều gì."),
          t('manual.wakeup.outcomes.1', "Dùng quy trình đề xuất trong Tác vụ wakeup và xác minh để giảm lỗi thao tác."),
        ],
        steps: [
          t('manual.wakeup.steps.0', "Mở trang Tác vụ wakeup và xác minh."),
          t('manual.wakeup.steps.1', "Hoàn tất cấu hình cơ bản và liên kết bắt buộc cho Tác vụ wakeup và xác minh."),
          t('manual.wakeup.steps.2', "Chạy một thao tác thủ công trong Tác vụ wakeup và xác minh để xác minh kết quả."),
        ],
        cautions: [
          t('manual.wakeup.cautions.0', "Sao lưu dữ liệu trước thao tác rủi ro hoặc hàng loạt trong Tác vụ wakeup và xác minh."),
          t('manual.wakeup.cautions.1', "Kiểm tra bộ lọc và phạm vi mục tiêu trước khi chạy trong Tác vụ wakeup và xác minh."),
        ],
        keywords: [
          t('manual.wakeup.keywords.0', "Tác vụ wakeup và xác minh"),
          t('manual.wakeup.keywords.1', "hướng dẫn"),
          t('manual.wakeup.keywords.2', "quy trình"),
          t('manual.wakeup.keywords.3', "tài khoản"),
          t('manual.wakeup.keywords.4', 'history'),
        ],
        actions: [
          { id: 'go-wakeup', kind: 'navigate', page: 'wakeup', label: t('manual.actions.goWakeup', "Đi tới tác vụ wakeup"), primary: true },
          { id: 'go-verification', kind: 'navigate', page: 'verification', label: t('manual.actions.goVerification', "Đi tới xác minh wakeup") },
        ],
      },
      {
        id: 'settings',
        icon: <Settings size={18} />,
        title: t('manual.settings.title', "Cài đặt và năng lực hệ thống"),
        summary: t(
          'manual.settings.summary',
          "Mục này giải thích cách dùng Cài đặt và năng lực hệ thống trong quy trình hàng ngày.",
        ),
        outcomes: [
          t('manual.settings.outcomes.0', "Hiểu Cài đặt và năng lực hệ thống giúp giải quyết điều gì."),
          t('manual.settings.outcomes.1', "Dùng quy trình đề xuất trong Cài đặt và năng lực hệ thống để giảm lỗi thao tác."),
          t('manual.settings.outcomes.2', "Xác nhận một lần chạy thành công trong Cài đặt và năng lực hệ thống trước khi mở rộng."),
        ],
        steps: [
          t('manual.settings.steps.0', "Mở trang Cài đặt và năng lực hệ thống."),
          t('manual.settings.steps.1', "Hoàn tất cấu hình cơ bản và liên kết bắt buộc cho Cài đặt và năng lực hệ thống."),
          t('manual.settings.steps.2', "Chạy một thao tác thủ công trong Cài đặt và năng lực hệ thống để xác minh kết quả."),
        ],
        cautions: [
          t('manual.settings.cautions.0', "Sao lưu dữ liệu trước thao tác rủi ro hoặc hàng loạt trong Cài đặt và năng lực hệ thống."),
          t('manual.settings.cautions.1', "Kiểm tra bộ lọc và phạm vi mục tiêu trước khi chạy trong Cài đặt và năng lực hệ thống."),
        ],
        keywords: [
          t('manual.settings.keywords.0', "Cài đặt và năng lực hệ thống"),
          t('manual.settings.keywords.1', "hướng dẫn"),
          t('manual.settings.keywords.2', "quy trình"),
          t('manual.settings.keywords.3', "tài khoản"),
          t('manual.settings.keywords.4', "cài đặt"),
          t('manual.settings.keywords.5', "khắc phục lỗi"),
        ],
        actions: [
          { id: 'go-settings', kind: 'navigate', page: 'settings', label: t('manual.actions.goSettings', "Đi tới cài đặt"), primary: true },
          { id: 'open-layout', kind: 'layout', label: t('manual.actions.openLayout', "Mở bố cục nền tảng") },
        ],
      },
      {
        id: 'data-and-privacy',
        icon: <Lightbulb size={18} />,
        title: t('manual.dataPrivacy.title', "Nhập/Xuất, riêng tư và troubleshooting"),
        summary: t(
          'manual.dataPrivacy.summary',
          "Mục này giải thích cách dùng Nhập/Xuất, riêng tư và troubleshooting trong quy trình hàng ngày.",
        ),
        outcomes: [
          t('manual.dataPrivacy.outcomes.0', "Hiểu Nhập/Xuất, riêng tư và troubleshooting giúp giải quyết điều gì."),
          t('manual.dataPrivacy.outcomes.1', "Dùng quy trình đề xuất trong Nhập/Xuất, riêng tư và troubleshooting để giảm lỗi thao tác."),
          t('manual.dataPrivacy.outcomes.2', "Xác nhận một lần chạy thành công trong Nhập/Xuất, riêng tư và troubleshooting trước khi mở rộng."),
          t('manual.dataPrivacy.outcomes.3', "Nếu có sự cố ở Nhập/Xuất, riêng tư và troubleshooting, hãy kiểm tra logs và thu thập bằng chứng trước."),
        ],
        steps: [
          t('manual.dataPrivacy.steps.0', "Mở trang Nhập/Xuất, riêng tư và troubleshooting."),
          t('manual.dataPrivacy.steps.1', "Hoàn tất cấu hình cơ bản và liên kết bắt buộc cho Nhập/Xuất, riêng tư và troubleshooting."),
          t('manual.dataPrivacy.steps.2', "Chạy một thao tác thủ công trong Nhập/Xuất, riêng tư và troubleshooting để xác minh kết quả."),
          t('manual.dataPrivacy.steps.3', "Khi troubleshooting: Cài đặt -> Thư mục dữ liệu -> Mở, rồi vào logs."),
          t('manual.dataPrivacy.steps.4', "Ưu tiên kiểm tra app.log hoặc app.log.* mới nhất."),
          t('manual.dataPrivacy.steps.5', "Khi phản hồi, kèm thời gian, nền tảng, bước tái hiện và logs đã ẩn dữ liệu nhạy cảm."),
        ],
        cautions: [
          t('manual.dataPrivacy.cautions.0', "Sao lưu dữ liệu trước thao tác rủi ro hoặc hàng loạt trong Nhập/Xuất, riêng tư và troubleshooting."),
          t('manual.dataPrivacy.cautions.1', "Kiểm tra bộ lọc và phạm vi mục tiêu trước khi chạy trong Nhập/Xuất, riêng tư và troubleshooting."),
          t('manual.dataPrivacy.cautions.2', "Xóa thông tin nhạy cảm trước khi chia sẻ logs (token, cookie, email)."),
        ],
        keywords: [
          t('manual.dataPrivacy.keywords.0', "Nhập/Xuất, riêng tư và troubleshooting"),
          t('manual.dataPrivacy.keywords.1', "hướng dẫn"),
          t('manual.dataPrivacy.keywords.2', "quy trình"),
          t('manual.dataPrivacy.keywords.3', "tài khoản"),
          t('manual.dataPrivacy.keywords.4', "cài đặt"),
          t('manual.dataPrivacy.keywords.5', "khắc phục lỗi"),
          t('manual.dataPrivacy.keywords.6', 'logs'),
          t('manual.dataPrivacy.keywords.7', 'app.log'),
        ],
        actions: [
          { id: 'go-overview', kind: 'navigate', page: 'overview', label: t('manual.actions.goAntigravity', "Đi tới Antigravity IDE"), primary: true },
          { id: 'go-settings', kind: 'navigate', page: 'settings', label: t('manual.actions.goSettings', "Đi tới cài đặt") },
        ],
      },
    ],
    [t],
  );

  const normalizedQuery = normalizeSearchText(query);

  const filteredSections = useMemo(() => {
    if (!normalizedQuery) return sections;
    return sections.filter((section) => {
      const payload = [
        section.title,
        section.summary,
        ...section.outcomes,
        ...section.steps,
        ...section.cautions,
        ...section.keywords,
      ]
        .join(' ')
        .toLowerCase();
      return payload.includes(normalizedQuery);
    });
  }, [normalizedQuery, sections]);

  const filteredIds = useMemo(() => filteredSections.map((section) => section.id), [filteredSections]);
  const allExpanded = filteredIds.length > 0 && filteredIds.every((id) => expandedIds.has(id));

  const toggleSection = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (allExpanded) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleAction = (action: ManualAction) => {
    if (action.kind === 'layout') {
      onOpenPlatformLayout();
      return;
    }
    onNavigate(action.page);
  };

  return (
    <main className="main-content manual-page">
      <div className="page-header">
        <div className="page-title">{t('manual.title', "Sổ tay sử dụng")}</div>
        <div className="page-subtitle">
          {t(
            'manual.subtitle',
            "Hướng dẫn theo kịch bản công việc. Hiểu mục tiêu trước, sau đó làm theo quy trình đề xuất.",
          )}
        </div>
      </div>

      <section className="manual-toolbar">
        <div className="manual-search">
          <Search size={16} className="manual-search-icon" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('manual.searchPlaceholder', "Tìm tính năng, kịch bản hoặc từ khóa (vd: instance, inject, wakeup)")}
            aria-label={t('manual.searchAria', "Tìm trong sổ tay")}
          />
        </div>
        <div className="manual-toolbar-actions">
          <span className="manual-count">
            {t('manual.resultCount', "Tổng {{count}} mục", { count: filteredSections.length })}
          </span>
          <button className="btn btn-secondary" type="button" onClick={handleToggleAll}>
            {allExpanded
              ? t('manual.actions.collapseAll', "Thu gọn tất cả")
              : t('manual.actions.expandAll', "Mở rộng tất cả")}
          </button>
        </div>
      </section>

      {filteredSections.length === 0 ? (
        <div className="empty-state manual-empty-state">
          <h3>{t('manual.empty.title', "Không có nội dung phù hợp")}</h3>
          <p>{t('manual.empty.desc', "Thử từ khóa: instance, chuyển đổi, cài đặt, xuất dữ liệu.")}</p>
        </div>
      ) : (
        <div className="manual-sections">
          {filteredSections.map((section) => {
            const expanded = expandedIds.has(section.id);
            return (
              <article
                key={section.id}
                className={`manual-card ${expanded ? 'expanded' : ''}`}
              >
                <button
                  type="button"
                  className="manual-card-header"
                  onClick={() => toggleSection(section.id)}
                  aria-expanded={expanded}
                >
                  <div className="manual-card-title-wrap">
                    <span className="manual-card-icon">{section.icon}</span>
                    <div className="manual-card-title-block">
                      <h3>{section.title}</h3>
                      <p>{section.summary}</p>
                    </div>
                  </div>
                  <ChevronDown size={18} className={`manual-card-arrow ${expanded ? 'expanded' : ''}`} />
                </button>

                {expanded && (
                  <div className="manual-card-body">
                    <div className="manual-info-grid">
                      <section className="manual-info-block">
                        <h4>💡 {t('manual.blocks.outcomes', "Tính năng này giúp gì")}</h4>
                        <ul>
                          {section.outcomes.map((item, idx) => (
                            <li key={`${section.id}-outcome-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </section>
                      <section className="manual-info-block">
                        <h4>🎯 {t('manual.blocks.steps', "Các bước đề xuất")}</h4>
                        <ol>
                          {section.steps.map((item, idx) => (
                            <li key={`${section.id}-step-${idx}`}>{item}</li>
                          ))}
                        </ol>
                      </section>
                      <section className="manual-info-block caution">
                        <h4>⚠️ {t('manual.blocks.cautions', "Lưu ý / lỗi thường gặp")}</h4>
                        <ul>
                          {section.cautions.map((item, idx) => (
                            <li key={`${section.id}-caution-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    </div>

                    <div className="manual-keywords">
                      {section.keywords.map((keyword) => (
                        <span key={`${section.id}-${keyword}`} className="manual-keyword-chip">
                          {keyword}
                        </span>
                      ))}
                    </div>

                    <div className="manual-card-actions">
                      {section.actions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          className={action.primary ? "btn btn-primary" : "btn btn-secondary"}
                          onClick={() => handleAction(action)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
