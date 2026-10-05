import * as XLSX from 'xlsx';
import { validateHeaders, validateRow, type UnknownHeaderPolicy } from './excelValidation';
import type { ExcelImportColumn, ExcelImportParseResult, ExcelImportPreviewRow, ExcelRowValidator } from './excelTypes';

const text = (value: unknown): string => value === null || value === undefined ? '' : String(value).trim();

export const parseExcelFile = async (file: File, columns: ExcelImportColumn[], businessValidator?: ExcelRowValidator, unknownHeaderPolicy: UnknownHeaderPolicy = 'error'): Promise<ExcelImportParseResult> => {
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Excel에 읽을 수 있는 Sheet가 없습니다.');
  const firstRow = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']).s.r : 0;
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', blankrows: true });
  const headers = (matrix[0] ?? []).map(text);
  if (headers.length === 0 || headers.every((header) => !header)) throw new Error('Header Row를 찾을 수 없습니다.');
  const headerErrors = validateHeaders(columns, headers, unknownHeaderPolicy);
  const headerIndexes = new Map(headers.map((header, index) => [header, index]));
  const rows: ExcelImportPreviewRow[] = matrix.slice(1).flatMap((rawRow, index) => {
    const values = Object.fromEntries(columns.map((column) => [column.key, rawRow[headerIndexes.get(column.header) ?? -1] ?? '']));
    if (Object.values(values).every((value) => text(value) === '')) return [];
    const rowNumber = firstRow + index + 2;
    const errors = validateRow(columns, values, rowNumber, businessValidator);
    return [{ rowNumber, values, status: errors.length > 0 ? 'ERROR' : 'VALID', errors } satisfies ExcelImportPreviewRow];
  });
  return { rows, headers, headerErrors };
};
