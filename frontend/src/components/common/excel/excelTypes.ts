export interface ExcelImportColumn {
  key: string;
  header: string;
  required?: boolean;
  width?: number;
  example?: string | number | boolean;
}

export type ExcelImportRowStatus = 'VALID' | 'ERROR';
export interface ExcelImportPreviewRow { rowNumber: number; status: ExcelImportRowStatus; values: Record<string, unknown>; errors: string[]; }
export interface ExcelImportParseResult { rows: ExcelImportPreviewRow[]; headers: string[]; headerErrors: string[]; }
export type ExcelRowValidator = (values: Record<string, unknown>, rowNumber: number) => string[];
export type ExcelRowMapper<T> = (values: Record<string, unknown>, rowNumber: number) => T;
