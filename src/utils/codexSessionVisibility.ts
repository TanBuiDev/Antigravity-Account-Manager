import type { TFunction } from 'i18next';
import type { CodexSessionVisibilityRepairSummary } from '../types/codex';

export function formatCodexSessionVisibilityRepairMessage(
  summary: CodexSessionVisibilityRepairSummary,
  t: TFunction,
): string {
  if (summary.skippedSqliteFileCount <= 0) {
    return summary.message;
  }

  if (summary.mutatedInstanceCount === 0) {
    return t(
      'codex.sessionManager.messages.repairVisibilitySkippedOnly',
      "Không tìm thấy khác biệt provider có thể ghi; đã bỏ qua {{count}} tệp state_5.sqlite không hợp lệ hoặc bị hỏng. Codex phải tạo lại chúng trước khi có thể sửa các bản ghi SQLite bên trong.",
      { count: summary.skippedSqliteFileCount },
    );
  }

  return t(
    'codex.sessionManager.messages.repairVisibilitySkippedWithBase',
    "{{message}}; đã bỏ qua {{count}} tệp state_5.sqlite không hợp lệ hoặc bị hỏng. Codex phải tạo lại chúng trước khi có thể sửa các bản ghi SQLite bên trong.",
    { message: summary.message, count: summary.skippedSqliteFileCount },
  );
}
