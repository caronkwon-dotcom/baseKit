import { useState } from 'react';
import ExcelImportDialog, { type ExcelImportDialogProps } from './ExcelImportDialog';
import { downloadExcelTemplate } from './excelTemplate';
import './excelImport.css';

export type ExcelImportProps<T> = Omit<ExcelImportDialogProps<T>, 'open' | 'onClose'> & { templateFileName?: string };
export default function ExcelImport<T>({ columns, templateFileName, disabled = false, ...dialogProps }: ExcelImportProps<T>) {
  const [open, setOpen] = useState(false);
  return <><div className="excel-import-actions"><button type="button" className="secondary-button" disabled={disabled} onClick={() => downloadExcelTemplate(columns, templateFileName)}>Excel Template</button><button type="button" className="primary-button" disabled={disabled} onClick={() => setOpen(true)}>Excel Upload</button></div><ExcelImportDialog {...dialogProps} disabled={disabled} columns={columns} open={open} onClose={() => setOpen(false)} /></>;
}
