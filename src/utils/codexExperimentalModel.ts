import type { TFunction } from 'i18next';

export function getCodexExperimentalModelErrorMessage(
  t: TFunction,
  error: unknown,
): string | null {
  const message = String(error);
  if (message.includes('EXPERIMENTAL_MODEL_CATALOG_MODELS_REQUIRED')) {
    return t(
      'codex.experimentalModelCatalog.models.validation.required',
      "Giữ lại ít nhất một mô hình.",
    );
  }
  if (message.includes('EXPERIMENTAL_MODEL_CATALOG_MODEL_ID_INVALID')) {
    return t(
      'codex.experimentalModelCatalog.models.validation.modelId',
      "ID mô hình chỉ được chứa chữ cái, chữ số, dấu chấm, dấu gạch ngang, dấu gạch dưới, dấu gạch chéo và dấu hai chấm.",
    );
  }
  if (message.includes('EXPERIMENTAL_MODEL_CATALOG_DISPLAY_NAME_INVALID')) {
    return t(
      'codex.experimentalModelCatalog.models.validation.displayName',
      "Nhập tên hiển thị không quá 100 ký tự.",
    );
  }
  if (message.includes('EXPERIMENTAL_MODEL_CATALOG_MODEL_ID_DUPLICATE')) {
    return t(
      'codex.experimentalModelCatalog.models.validation.duplicate',
      "ID mô hình không được trùng lặp.",
    );
  }
  if (message.includes('EXPERIMENTAL_MODEL_CATALOG_REASONING_EFFORT_INVALID')) {
    return t(
      'codex.experimentalModelCatalog.models.validation.reasoningEffort',
      "Tùy chọn mức suy luận không hợp lệ.",
    );
  }
  if (message.includes('EXPERIMENTAL_MODEL_CATALOG_CONTEXT_WINDOW_INVALID')) {
    return t(
      'codex.experimentalModelCatalog.models.validation.contextWindow',
      "Cửa sổ ngữ cảnh phải là số nguyên lớn hơn 0.",
    );
  }
  if (message.includes('EXPERIMENTAL_MODEL_CATALOG_AUTO_COMPACT_INVALID')) {
    return t(
      'codex.experimentalModelCatalog.models.validation.autoCompact',
      "Ngưỡng nén phải là số nguyên lớn hơn 0.",
    );
  }
  if (message.includes('EXPERIMENTAL_MODEL_CATALOG_AUTO_COMPACT_RANGE_INVALID')) {
    return t(
      'codex.experimentalModelCatalog.models.validation.autoCompactRange',
      "Ngưỡng nén phải nhỏ hơn cửa sổ ngữ cảnh.",
    );
  }
  return null;
}
