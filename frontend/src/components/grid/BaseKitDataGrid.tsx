import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, themeQuartz, type ColDef, type EditableCallbackParams, type GridApi, type ICellEditorParams, type ICellRendererParams, type ITooltipParams, type ValueGetterParams } from 'ag-grid-community';
import ProgramDataGrid, { type ProgramDataGridProps } from '../common/ProgramDataGrid';
import type { DataTableProps } from '../common/DataTable';
import type { FieldDefinition } from '../metadata/fieldDefinition';
import type { GridRowState } from './gridRowState';
import { renderMetadataValue } from './gridColumnAdapter';
import { normalizeGridFieldValue, validateGridField } from './gridFieldValidation';
import './basekitGrid.css';

const theme = themeQuartz.withParams({
  headerHeight: 34, rowHeight: 32, fontSize: 12,
  backgroundColor: 'var(--surface-panel)', foregroundColor: 'var(--text-primary)',
  headerBackgroundColor: 'var(--surface-muted)', borderColor: 'var(--border-default)', accentColor: 'var(--brand-primary)',
});

export interface GridEditing<T> {
  mode?: 'cell' | 'row';
  keys: string[];
  onChange: (row: T, key: string, value: string) => void;
  isEditable?: (row: T, key: string) => boolean;
}
export interface BaseKitDataGridProps<T> extends Omit<ProgramDataGridProps<T>, 'renderTable'> {
  fields?: FieldDefinition[];
  getFieldValue?: (row: T, field: FieldDefinition) => string | undefined;
  editing?: GridEditing<T>;
  loading?: boolean;
  currentRowKey?: string;
  getRowState?: (row: T) => GridRowState;
}

function RowStateIcon({ state }: { state: Exclude<GridRowState, 'NORMAL'> }) {
  const label = state === 'INSERTED' ? '신규 추가' : state === 'UPDATED' ? '수정됨' : '삭제 예정';
  return <span className={`basekit-row-state-icon ${state.toLowerCase()}`} role="img" aria-label={label} title={label}>
    {state === 'UPDATED'
      ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 11.8-.5 2.2 2.2-.5 7.7-7.7-1.7-1.7zM9.9 4.9l1.7 1.7" /></svg>
      : <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.5" /><path d={state === 'INSERTED' ? 'M8 5v6M5 8h6' : 'M5 8h6'} /></svg>}
  </span>;
}

type ReactiveCellEditorProps = ICellEditorParams & { onValueChange: (value: string) => void };

function ColorCellEditor({ value, onValueChange }: ReactiveCellEditorProps) {
  const color = /^#[0-9a-f]{6}$/i.test(String(value ?? '')) ? String(value) : '#000000';
  return <input className="basekit-color-cell-editor" type="color" value={color} onChange={(event) => onValueChange(event.target.value.toUpperCase())} autoFocus />;
}

function MetadataSwitch({ value, field, editable, onChange }: { value: unknown; field: FieldDefinition; editable: boolean; onChange: (value: string) => void }) {
  const values = field.options?.map((option) => option.value) ?? ['true', 'false'];
  const onValue = values[0] ?? 'true';
  const offValue = values[1] ?? 'false';
  const checked = String(value ?? '') === onValue;
  const label = field.options?.find((option) => option.value === (checked ? onValue : offValue))?.label ?? (checked ? 'ON' : 'OFF');
  return <button
    type="button"
    className={`basekit-grid-switch${checked ? ' checked' : ''}`}
    role="switch"
    aria-checked={checked}
    aria-label={`${field.label}: ${label}`}
    title={label}
    disabled={!editable}
    onClick={(event) => { event.stopPropagation(); onChange(checked ? offValue : onValue); }}
  ><span /></button>;
}

const alignment = (field?: FieldDefinition, fallback: 'left' | 'center' | 'right' = 'left') =>
  field?.dataType === 'NUMBER' ? 'right' : field?.controlType === 'SWITCH' || field?.dataType === 'BOOLEAN' ? 'center' : fallback;

const displayValue = (value: unknown, field?: FieldDefinition) => {
  if (field?.dataType !== 'NUMBER') return value ?? '';
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  const numeric = typeof value === 'number' ? value : Number(normalized);
  return Number.isFinite(numeric) ? numeric : '';
};

function GridTable<T,>({ columns, rows, getRowKey, selectedRowKeys, onSelectedRowKeysChange, onRowClick, getRowClassName, emptyMessage, fields = [], getFieldValue, editing, loading, currentRowKey, getRowState }: DataTableProps<T> & Pick<BaseKitDataGridProps<T>, 'fields' | 'getFieldValue' | 'editing' | 'loading' | 'currentRowKey' | 'getRowState'>) {
  const apiRef = useRef<GridApi<T> | null>(null);
  const [rejectedCells, setRejectedCells] = useState(new Set<string>());
  const isEditable = useCallback((row: T, key: string, policy: 'always' | 'insert-only' | 'read-only' = 'always') => {
    if (!editing?.keys.includes(key) || policy === 'read-only') return false;
    const state = getRowState?.(row) ?? 'NORMAL';
    if (state === 'DELETED' || (policy === 'insert-only' && state !== 'INSERTED')) return false;
    return editing.isEditable?.(row, key) ?? true;
  }, [editing, getRowState]);
  const cellKey = useCallback((row: T, key: string) => `${getRowKey(row)}::${key}`, [getRowKey]);
  const fieldForKey = useCallback((key: string) => {
    if (key.startsWith('ATTRIBUTE_')) return fields.find((field) => field.key === key.slice(10));
    return columns.find((column) => column.key === key)?.fieldDefinition;
  }, [columns, fields]);
  const valueForKey = useCallback((row: T, key: string, field: FieldDefinition) =>
    key.startsWith('ATTRIBUTE_') ? getFieldValue?.(row, field) : (row as Record<string, unknown>)[key], [getFieldValue]);
  const validationClass = useCallback((row: T, key: string, field?: FieldDefinition) => {
    if (!field) return '';
    return rejectedCells.has(cellKey(row, key)) || validateGridField(valueForKey(row, key, field), field) ? 'basekit-invalid-cell' : '';
  }, [cellKey, rejectedCells, valueForKey]);
  const changeSwitch = useCallback((row: T, key: string, value: string, field: FieldDefinition) => {
    if (validateGridField(value, field)) return;
    setRejectedCells((current) => { const next = new Set(current); next.delete(cellKey(row, key)); return next; });
    editing?.onChange(row, key, value);
  }, [cellKey, editing]);
  const columnDefs = useMemo<ColDef<T>[]>(() => [
    ...(getRowState ? [{
      colId: '__GRID_ROW_STATE', headerName: '', width: 30, minWidth: 30, maxWidth: 30,
      sortable: false, filter: false, resizable: false, suppressHeaderMenuButton: true, lockPosition: 'left' as const,
      cellClass: 'basekit-row-state-cell',
      cellRenderer: (params: ICellRendererParams<T>) => {
        if (!params.data) return null;
        const state = getRowState(params.data);
        return state === 'NORMAL' ? null : <RowStateIcon state={state} />;
      },
    } satisfies ColDef<T>] : []),
    ...columns.map((column) => {
      const field = column.fieldDefinition;
      return ({
      colId: column.key, headerName: column.header, initialWidth: column.width, minWidth: column.minWidth,
      flex: column.width ? undefined : column.flex ?? 1,
      valueGetter: (params: ValueGetterParams<T>) => params.data ? displayValue((params.data as Record<string, unknown>)[column.key], field) : '',
      cellRenderer: (params: ICellRendererParams<T>) => {
        if (!params.data) return null;
        const editable = isEditable(params.data, column.key, column.editPolicy);
        if (field?.controlType === 'SWITCH') return <MetadataSwitch value={(params.data as Record<string, unknown>)[column.key]} field={field} editable={editable} onChange={(value) => changeSwitch(params.data!, column.key, value, field)} />;
        if (field && (field.controlType === 'SELECT' || field.displayType === 'COLOR' || field.displayType === 'BADGE' || field.displayType === 'BOOLEAN')) return renderMetadataValue(String(params.value ?? ''), field);
        if (field?.dataType === 'NUMBER') return params.value;
        return column.render(params.data);
      },
      cellClass: (params: EditableCallbackParams<T>) => params.data ? [isEditable(params.data, column.key, column.editPolicy) ? 'basekit-editable-cell' : '', `basekit-grid-cell-${alignment(field, column.align)}`, validationClass(params.data, column.key, field)].filter(Boolean).join(' ') : '',
      editable: (params: EditableCallbackParams<T>) => Boolean(params.data && field?.controlType !== 'SWITCH' && isEditable(params.data, column.key, column.editPolicy)),
      cellEditor: field?.controlType === 'SELECT' ? 'agSelectCellEditor' : field?.controlType === 'COLOR_PICKER' ? ColorCellEditor : field?.dataType === 'NUMBER' ? 'agNumberCellEditor' : field?.dataType === 'DATE' ? 'agDateStringCellEditor' : 'agTextCellEditor',
      cellEditorParams: field?.controlType === 'SELECT' ? { values: field.options?.map((option) => option.value) ?? [] } : undefined,
      tooltipValueGetter: (params: ITooltipParams<T>) => field && validateGridField(params.value, field) ? `${field.label}: ${validateGridField(params.value, field)}` : String(params.value ?? ''),
    }); }),
    ...fields.map((field) => {
      const key = `ATTRIBUTE_${field.key}`;
      return ({
      colId: key, headerName: field.label, flex: 1, minWidth: 100,
      valueGetter: (params: ValueGetterParams<T>) => params.data ? getFieldValue?.(params.data, field) ?? '' : '',
      cellClass: (params: EditableCallbackParams<T>) => params.data ? [isEditable(params.data, key) ? 'basekit-editable-cell' : '', `basekit-grid-cell-${alignment(field)}`, validationClass(params.data, key, field)].filter(Boolean).join(' ') : '',
      cellRenderer: (params: ICellRendererParams<T>) => {
        if (!params.data) return null;
        if (field.controlType === 'SWITCH') return <MetadataSwitch value={getFieldValue?.(params.data, field)} field={field} editable={isEditable(params.data, key)} onChange={(value) => changeSwitch(params.data!, key, value, field)} />;
        return renderMetadataValue(params.value == null ? '' : String(displayValue(params.value, field)), field);
      },
      editable: (params: EditableCallbackParams<T>) => Boolean(params.data && field.controlType !== 'SWITCH' && isEditable(params.data, key)),
      cellEditor: field.controlType === 'SELECT' ? 'agSelectCellEditor' : field.controlType === 'COLOR_PICKER' ? ColorCellEditor : field.dataType === 'NUMBER' ? 'agNumberCellEditor' : field.dataType === 'DATE' ? 'agDateStringCellEditor' : 'agTextCellEditor',
      cellEditorParams: field.controlType === 'SELECT' ? { values: field.options?.map((option) => option.value) ?? [] } : undefined,
      tooltipValueGetter: (params: ITooltipParams<T>) => validateGridField(params.value, field) ? `${field.label}: ${validateGridField(params.value, field)}` : String(params.value ?? ''),
    }); }),
  ], [changeSwitch, columns, fields, getFieldValue, getRowState, isEditable, validationClass]);

  useEffect(() => {
    apiRef.current?.forEachNode((node) => node.setSelected(Boolean(node.data && selectedRowKeys?.has(getRowKey(node.data)))));
    apiRef.current?.redrawRows();
  }, [getRowKey, rows, selectedRowKeys]);

  useEffect(() => {
    apiRef.current?.redrawRows();
  }, [currentRowKey]);

  return <div className="data-section"><div className="basekit-ag-grid"><AgGridReact<T>
    modules={[AllCommunityModule]} theme={theme} rowData={rows} columnDefs={columnDefs} loading={loading}
    onGridReady={(event) => { apiRef.current = event.api; event.api.redrawRows(); }}
    onRowDataUpdated={() => setRejectedCells(new Set())}
    getRowId={(params) => getRowKey(params.data)}
    suppressRowClickSelection
    rowSelection={{ mode: 'multiRow', enableClickSelection: false, headerCheckbox: true }}
    onSelectionChanged={(event) => onSelectedRowKeysChange?.(new Set(event.api.getSelectedRows().map(getRowKey)))}
    onRowClicked={(event) => event.data && onRowClick?.(event.data)}
    getRowClass={(params) => params.data ? [getRowClassName?.(params.data), getRowKey(params.data) === currentRowKey ? 'basekit-current-row' : ''].filter(Boolean).join(' ') : ''}
    readOnlyEdit={Boolean(editing)}
    editType={editing?.mode === 'row' ? 'fullRow' : undefined}
    stopEditingWhenCellsLoseFocus
    onCellEditRequest={(event) => {
      if (!event.data || !editing) return;
      const key = event.column.getColId();
      const field = fieldForKey(key);
      const value = field ? normalizeGridFieldValue(event.newValue, field) : String(event.newValue ?? '');
      const message = field ? validateGridField(value, field) : null;
      if (message) {
        setRejectedCells((current) => new Set(current).add(cellKey(event.data!, key)));
        event.api.refreshCells({ rowNodes: [event.node], columns: [key], force: true });
        return;
      }
      setRejectedCells((current) => { const next = new Set(current); next.delete(cellKey(event.data!, key)); return next; });
      editing.onChange(event.data, key, value);
    }}
    overlayNoRowsTemplate={`<span>${emptyMessage ?? '조회 결과가 없습니다.'}</span>`}
  /></div></div>;
}

export default function BaseKitDataGrid<T,>({ fields, getFieldValue, editing, loading, currentRowKey, getRowState, ...props }: BaseKitDataGridProps<T>) {
  return <ProgramDataGrid {...props} renderTable={(table) => <GridTable {...table} fields={fields} getFieldValue={getFieldValue} editing={editing} loading={loading} currentRowKey={currentRowKey} getRowState={getRowState} />} />;
}
