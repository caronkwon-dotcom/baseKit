import * as XLSX from 'xlsx';
import { validateHeaders, validateRow, type UnknownHeaderPolicy } from './excelValidation';
import type { ExcelImportColumn, ExcelImportParseResult, ExcelImportPreviewRow, ExcelRowValidator } from './excelTypes';

const text = (value: unknown): string => value === null || value === undefined ? '' : String(value).trim();

export const parseExcelFile = async (file: File, columns: ExcelImportColumn[], businessValidator?: ExcelRowValidator, unknownHeaderPolicy: UnknownHeaderPolicy = 'error'): Promise<ExcelImportParseResult> => {
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Excel에 읽을 수 있는 Sheet가 없습니다.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: false });
  const headers = (matrix[0] ?? []).map(text);
  if (headers.length === 0 || headers.every((header) => !header)) throw new Error('Header Row를 찾을 수 없습니다.');
  const headerErrors = validateHeaders(columns, headers, unknownHeaderPolicy);
  const headerIndexes = new Map(headers.map((header, index) => [header, index]));
  const rows: ExcelImportPreviewRow[] = matrix.slice(1).flatMap((rawRow, index) => {
    const values = Object.fromEntries(columns.map((column) => [column.key, rawRow[headerIndexes.get(column.header) ?? -1] ?? '']));
    if (Object.values(values).every((value) => text(value) === '')) return [];
    const errors = validateRow(columns, values, index + 2, businessValidator);
    return [{ rowNumber: index + 2, values, status: errors.length > 0 ? 'ERROR' : 'VALID', errors } satisfies ExcelImportPreviewRow];
  });
  return { rows, headers, headerErrors };
};
