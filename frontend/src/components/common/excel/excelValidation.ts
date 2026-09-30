import type { ExcelImportColumn, ExcelRowValidator } from './excelTypes';

export type UnknownHeaderPolicy = 'error' | 'ignore';

export const validateHeaders = (columns: ExcelImportColumn[], headers: string[], unknownHeaderPolicy: UnknownHeaderPolicy = 'error'): string[] => {
  const definedHeaders = new Set(columns.map((column) => column.header));
  const errors: string[] = [];
  const duplicates = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  for (const header of new Set(duplicates)) errors.push(`중복 Header: ${header}`);
  for (const column of columns.filter((item) => item.required)) if (!headers.includes(column.header)) errors.push(`필수 Header 누락: ${column.header}`);
  if (unknownHeaderPolicy === 'error') for (const header of headers.filter((item) => item && !definedHeaders.has(item))) errors.push(`정의되지 않은 Header: ${header}`);
  return errors;
};

export const validateRequiredValues = (columns: ExcelImportColumn[], values: Record<string, unknown>): string[] => columns
  .filter((column) => column.required)
  .filter((column) => values[column.key] === null || values[column.key] === undefined || String(values[column.key]).trim() === '')
  .map((column) => `${column.header}: 필수값 누락`);

export const validateRow = (columns: ExcelImportColumn[], values: Record<string, unknown>, rowNumber: number, businessValidator?: ExcelRowValidator): string[] => [
  ...validateRequiredValues(columns, values),
  ...(businessValidator?.(values, rowNumber) ?? []),
];
