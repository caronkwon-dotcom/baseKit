import type { DataTableColumn } from '../common/DataTable';
import type { FieldDefinition } from '../metadata/fieldDefinition';

export interface GridValidationIssue {
  field: FieldDefinition;
  message: string;
}

export const gridValidationIssueMessage = (issue: GridValidationIssue) =>
  issue.message.startsWith(issue.field.label) ? issue.message : `${issue.field.label}: ${issue.message}`;

const empty = (value: unknown) => value == null || String(value).trim() === '';

const topicParticle = (label: string) => {
  const code = label.charCodeAt(label.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '은' : '는';
};

export const maxLengthMessage = (field: FieldDefinition) =>
  `${field.label}${topicParticle(field.label)} 최대 ${field.maxLength}자까지 입력할 수 있습니다.`;

export function validateGridField(value: unknown, field: FieldDefinition): string | null {
  if (empty(value)) return field.required ? '필수 입력값입니다.' : null;

  if (field.maxLength && String(value).length > field.maxLength) return maxLengthMessage(field);

  if (field.dataType === 'NUMBER') {
    const numberValue = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(numberValue)) return '숫자만 입력할 수 있습니다.';
  }

  if (field.controlType === 'SWITCH') {
    const values = field.options?.map((option) => option.value) ?? ['true', 'false'];
    if (!values.includes(String(value))) return '허용된 상태값이 아닙니다.';
  }

  if (field.controlType === 'SELECT') {
    const values = field.options?.map((option) => option.value) ?? [];
    if (!values.includes(String(value))) return '선택 가능한 값이 아닙니다.';
  }

  if (field.controlType === 'COLOR_PICKER' && !/^#[0-9a-f]{6}$/i.test(String(value))) {
    return '색상값은 #RRGGBB 형식이어야 합니다.';
  }

  return null;
}

export function userGridErrorMessage(error: unknown, fields: FieldDefinition[], fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const raw = error.message;
  const matched = fields.find((field) => new RegExp(`(?:^|\\.)${field.key}(?=:|\\b)`, 'i').test(raw));
  if (matched?.maxLength && /(크기|길이|length|size|max)/i.test(raw)) return maxLengthMessage(matched);
  return raw.replace(/(?:INSERTED|UPDATED)\[\d+\]\./gi, '');
}

export function normalizeGridFieldValue(value: unknown, field: FieldDefinition): string {
  if (value == null) return '';
  if (field.dataType !== 'NUMBER') return String(value);
  const normalized = String(value).trim();
  if (!normalized) return '';
  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? String(numberValue) : normalized;
}

export function findGridValidationIssue<T>(
  rows: T[],
  columns: DataTableColumn<T>[],
  fields: FieldDefinition[] = [],
  getFieldValue?: (row: T, field: FieldDefinition) => unknown,
): GridValidationIssue | null {
  for (const row of rows) {
    for (const column of columns) {
      if (!column.fieldDefinition) continue;
      const message = validateGridField((row as Record<string, unknown>)[column.key], column.fieldDefinition);
      if (message) return { field: column.fieldDefinition, message };
    }
    for (const field of fields) {
      const message = validateGridField(getFieldValue?.(row, field), field);
      if (message) return { field, message };
    }
  }
  return null;
}
