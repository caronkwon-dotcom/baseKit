import { useEffect, useRef, useState } from 'react';
import FormModal from '../FormModal';
import DataTable, { type DataTableColumn } from '../DataTable';
import { parseExcelFile } from './excelParser';
import type { ExcelImportColumn, ExcelImportParseResult, ExcelImportPreviewRow, ExcelRowMapper, ExcelRowValidator } from './excelTypes';
import type { UnknownHeaderPolicy } from './excelValidation';
import './excelImport.css';

export interface ExcelImportDialogProps<T> {
  open: boolean; columns: ExcelImportColumn[]; validateRow?: ExcelRowValidator; mapRow: ExcelRowMapper<T>;
  onImport: (rows: T[]) => void | Promise<void>; onClose: () => void; unknownHeaderPolicy?: UnknownHeaderPolicy;
  title?: string; submitLabel?: string; disabled?: boolean;
}

export default function ExcelImportDialog<T>({ open, columns, validateRow, mapRow, onImport, onClose, unknownHeaderPolicy = 'error', title = 'Excel Import', submitLabel = 'Import', disabled = false }: ExcelImportDialogProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const busyRef = useRef(false);
  const [fileName, setFileName] = useState('선택된 파일 없음');
  const [result, setResult] = useState<ExcelImportParseResult | null>(null);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  useEffect(() => () => { requestRef.current += 1; }, [open]);
  const reset = () => { requestRef.current += 1; setFileName('선택된 파일 없음'); setResult(null); setMessage(''); setParsing(false); };
  const close = () => { if (busyRef.current) return; reset(); onClose(); };
  const selectFile = async (file: File | undefined) => {
    if (!file || busyRef.current || disabled) return;
    busyRef.current = true;
    const request = ++requestRef.current;
    setFileName(file.name); setMessage(''); setResult(null); setParsing(true);
    try {
      const parsed = await parseExcelFile(file, columns, validateRow, unknownHeaderPolicy);
      if (request === requestRef.current) setResult(parsed);
    }
    catch (error) { if (request === requestRef.current) setMessage(error instanceof Error ? error.message : 'Excel 파일을 읽지 못했습니다.'); }
    finally { busyRef.current = false; if (request === requestRef.current) setParsing(false); }
  };
  const rows = result?.rows ?? [];
  const errorCount = rows.filter((row) => row.status === 'ERROR').length;
  const headerErrorCount = result?.headerErrors.length ?? 0;
  const validRows = rows.filter((row) => row.status === 'VALID');
  const previewColumns: DataTableColumn<ExcelImportPreviewRow>[] = [
    { key: 'rowNumber', header: 'No', width: 52, align: 'center', render: (row) => row.rowNumber },
    { key: 'status', header: '상태', width: 64, align: 'center', render: (row) => row.status === 'VALID' ? '정상' : '오류' },
    ...columns.map((column) => ({ key: column.key, header: column.header, width: column.width, render: (row: ExcelImportPreviewRow) => String(row.values[column.key] ?? '') })),
    { key: 'errors', header: '오류내용', minWidth: 180, render: (row) => row.errors.join(' / ') },
  ];
  const submit = async () => {
    if (busyRef.current || disabled || !result || headerErrorCount > 0 || errorCount > 0 || validRows.length === 0) return;
    busyRef.current = true;
    setImporting(true);
    try { await onImport(validRows.map((row) => mapRow(row.values, row.rowNumber))); reset(); onClose(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Import 처리에 실패했습니다.'); }
    finally { busyRef.current = false; setImporting(false); }
  };
  return <FormModal open={open} title={title} submitLabel={submitLabel} submitting={importing || parsing} submitDisabled={disabled || !result || headerErrorCount > 0 || errorCount > 0 || validRows.length === 0} onSubmit={submit} onClose={close}>
    <div className="excel-import-dialog">
      <div className="excel-import-file-row"><span className="excel-import-file-name" title={fileName}>파일: {fileName}</span><button type="button" className="secondary-button" disabled={disabled || parsing || importing} onClick={() => inputRef.current?.click()}>파일 선택</button><input ref={inputRef} hidden type="file" accept=".xlsx,.xls" disabled={disabled || parsing || importing} onChange={(event) => { void selectFile(event.target.files?.[0]); event.target.value = ''; }} /></div>
      <div className="excel-import-metrics"><span>총 <strong>{rows.length}</strong>건</span><span className="valid">정상 <strong>{validRows.length}</strong>건</span><span className="error">오류 행 <strong>{errorCount}</strong>건</span><span className="error">Header 오류 <strong>{headerErrorCount}</strong>개</span></div>
      {parsing ? <p role="status">Excel 파일을 읽고 있습니다.</p> : null}
      {message ? <p className="excel-import-message error">{message}</p> : null}
      {result?.headerErrors.length ? <div className="excel-import-header-errors">{result.headerErrors.map((error) => <div key={error}>{error}</div>)}</div> : null}
      <DataTable columns={previewColumns} rows={rows} getRowKey={(row) => String(row.rowNumber)} getRowClassName={(row) => row.status === 'ERROR' ? 'excel-import-error-row' : ''} emptyMessage="Excel 파일을 선택하면 Preview가 표시됩니다." />
      {errorCount > 0 || headerErrorCount > 0 ? <p className="excel-import-help">오류를 수정한 Excel을 다시 선택한 뒤 반영할 수 있습니다.</p> : null}
    </div>
  </FormModal>;
}
