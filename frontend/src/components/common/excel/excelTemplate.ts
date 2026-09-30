import * as XLSX from 'xlsx';
import type { ExcelImportColumn } from './excelTypes';

export const downloadExcelTemplate = (columns: ExcelImportColumn[], fileName = 'excel-import-template.xlsx') => {
  const sheet = XLSX.utils.aoa_to_sheet([columns.map((column) => column.header), columns.map((column) => column.example ?? '')]);
  sheet['!cols'] = columns.map((column) => ({ wch: Math.max(12, column.width ? Math.round(column.width / 8) : column.header.length + 4) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Import');
  XLSX.writeFile(workbook, fileName);
};
