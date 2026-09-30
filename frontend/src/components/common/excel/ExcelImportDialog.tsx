import { useRef, useState } from 'react';
import FormModal from '../FormModal';
import DataTable, { type DataTableColumn } from '../DataTable';
import { parseExcelFile } from './excelParser';
import type { ExcelImportColumn, ExcelImportParseResult, ExcelImportPreviewRow, ExcelRowMapper, ExcelRowValidator } from './excelTypes';
import type { UnknownHeaderPolicy } from './excelValidation';
import './excelImport.css';

export interface ExcelImportDialogProps<T> {
  open: boolean; columns: ExcelImportColumn[]; validateRow?: ExcelRowValidator; mapRow: ExcelRowMapper<T>;
  onImport: (rows: T[]) => void | Promise<void>; onClose: () => void; unknownHeaderPolicy?: UnknownHeaderPolicy;
}

export default function ExcelImportDialog<T>({ open, columns, validateRow, mapRow, onImport, onClose, unknownHeaderPolicy = 'error' }: ExcelImportDialogProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('선택된 파일 없음');
  const [result, setResult] = useState<ExcelImportParseResult | null>(null);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const reset = () => { setFileName('선택된 파일 없음'); setResult(null); setMessage(''); };
  const close = () => { if (importing) return; reset(); onClose(); };
  const selectFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name); setMessage('');
    try { setResult(await parseExcelFile(file, columns, validateRow, unknownHeaderPolicy)); }
    catch (error) { setResult(null); setMessage(error instanceof Error ? error.message : 'Excel 파일을 읽지 못했습니다.'); }
  };
  const rows = result?.rows ?? [];
  const errorCount = rows.filter((row) => row.status === 'ERROR').length + (result?.headerErrors.length ?? 0);
  const validRows = rows.filter((row) => row.status === 'VALID');
  const previewColumns: DataTableColumn<ExcelImportPreviewRow>[] = [
    { key: 'rowNumber', header: 'No', width: 52, align: 'center', render: (row) => row.rowNumber },
    { key: 'status', header: '상태', width: 64, align: 'center', render: (row) => row.status === 'VALID' ? '정상' : '오류' },
    ...columns.map((column) => ({ key: column.key, header: column.header, width: column.width, render: (row: ExcelImportPreviewRow) => String(row.values[column.key] ?? '') })),
    { key: 'errors', header: '오류내용', minWidth: 180, render: (row) => row.errors.join(' / ') },
  ];
  const submit = async () => {
    if (!result || errorCount > 0 || validRows.length === 0) return;
    setImporting(true);
    try { await onImport(validRows.map((row) => mapRow(row.values, row.rowNumber))); close(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Import 처리에 실패했습니다.'); }
    finally { setImporting(false); }
  };
  return <FormModal open={open} title="Excel Import" submitLabel="Import" submitting={importing} onSubmit={submit} onClose={close}>
    <div className="excel-import-dialog">
      <div className="excel-import-file-row"><span className="excel-import-file-name" title={fileName}>파일: {fileName}</span><button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>파일 선택</button><input ref={inputRef} hidden type="file" accept=".xlsx,.xls" onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ''; }} /></div>
      <div className="excel-import-metrics"><span>총 <strong>{rows.length}</strong>건</span><span className="valid">정상 <strong>{validRows.length}</strong>건</span><span className="error">오류 <strong>{errorCount}</strong>건</span></div>
      {message ? <p className="excel-import-message error">{message}</p> : null}
      {result?.headerErrors.length ? <div className="excel-import-header-errors">{result.headerErrors.map((error) => <div key={error}>{error}</div>)}</div> : null}
      <DataTable columns={previewColumns} rows={rows} getRowKey={(row) => String(row.rowNumber)} getRowClassName={(row) => row.status === 'ERROR' ? 'excel-import-error-row' : ''} emptyMessage="Excel 파일을 선택하면 Preview가 표시됩니다." />
      {errorCount > 0 ? <p className="excel-import-help">오류를 수정한 Excel을 다시 선택한 뒤 Import할 수 있습니다.</p> : null}
    </div>
  </FormModal>;
}
