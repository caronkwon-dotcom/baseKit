import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, themeQuartz, type ColDef, type EditableCallbackParams, type GridApi, type ICellRendererParams, type ValueGetterParams } from 'ag-grid-community';
import ProgramDataGrid, { type ProgramDataGridProps } from '../common/ProgramDataGrid';
import type { DataTableProps } from '../common/DataTable';
import type { FieldDefinition } from '../metadata/fieldDefinition';
import type { GridRowState } from './gridRowState';
import { renderMetadataValue } from './gridColumnAdapter';
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

function GridTable<T,>({ columns, rows, getRowKey, selectedRowKeys, onSelectedRowKeysChange, onRowClick, getRowClassName, emptyMessage, fields = [], getFieldValue, editing, loading, currentRowKey, getRowState }: DataTableProps<T> & Pick<BaseKitDataGridProps<T>, 'fields' | 'getFieldValue' | 'editing' | 'loading' | 'currentRowKey' | 'getRowState'>) {
  const apiRef = useRef<GridApi<T> | null>(null);
  const isEditable = useCallback((row: T, key: string, policy: 'always' | 'insert-only' | 'read-only' = 'always') => {
    if (!editing?.keys.includes(key) || policy === 'read-only') return false;
    const state = getRowState?.(row) ?? 'NORMAL';
    if (state === 'DELETED' || (policy === 'insert-only' && state !== 'INSERTED')) return false;
    return editing.isEditable?.(row, key) ?? true;
  }, [editing, getRowState]);
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
    ...columns.map((column) => ({
      colId: column.key, headerName: column.header, initialWidth: column.width, minWidth: column.minWidth,
      flex: column.width ? undefined : column.flex ?? 1,
      valueGetter: (params: ValueGetterParams<T>) => params.data ? String((params.data as Record<string, unknown>)[column.key] ?? '') : '',
      cellRenderer: (params: ICellRendererParams<T>) => params.data ? column.render(params.data) : null,
      headerClass: rows.some((row) => isEditable(row, column.key, column.editPolicy)) ? 'basekit-editable-header' : undefined,
      cellClass: (params: EditableCallbackParams<T>) => params.data && isEditable(params.data, column.key, column.editPolicy) ? 'basekit-editable-cell' : '',
      editable: (params: EditableCallbackParams<T>) => Boolean(params.data && isEditable(params.data, column.key, column.editPolicy)),
    })),
    ...fields.map((field) => ({
      colId: `ATTRIBUTE_${field.key}`, headerName: field.label, flex: 1, minWidth: 100,
      valueGetter: (params: ValueGetterParams<T>) => params.data ? getFieldValue?.(params.data, field) ?? '' : '',
      headerClass: rows.some((row) => isEditable(row, `ATTRIBUTE_${field.key}`)) ? 'basekit-editable-header' : undefined,
      cellClass: (params: EditableCallbackParams<T>) => params.data && isEditable(params.data, `ATTRIBUTE_${field.key}`) ? `basekit-editable-cell basekit-grid-cell-${field.dataType === 'NUMBER' ? 'right' : field.dataType === 'BOOLEAN' ? 'center' : 'left'}` : `basekit-grid-cell-${field.dataType === 'NUMBER' ? 'right' : field.dataType === 'BOOLEAN' ? 'center' : 'left'}`,
      cellRenderer: (params: ICellRendererParams<T>) => renderMetadataValue(params.value == null ? '' : String(params.value), field),
      editable: (params: EditableCallbackParams<T>) => Boolean(params.data && isEditable(params.data, `ATTRIBUTE_${field.key}`)),
      cellEditor: field.controlType === 'SELECT' ? 'agSelectCellEditor' : field.dataType === 'NUMBER' ? 'agNumberCellEditor' : field.dataType === 'BOOLEAN' ? 'agCheckboxCellEditor' : field.dataType === 'DATE' ? 'agDateStringCellEditor' : 'agTextCellEditor',
      cellEditorParams: field.controlType === 'SELECT' ? { values: field.options?.map((option) => option.value) ?? [] } : undefined,
    })),
  ], [columns, fields, getFieldValue, getRowState, isEditable, rows]);

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
    getRowId={(params) => getRowKey(params.data)}
    suppressRowClickSelection
    rowSelection={{ mode: 'multiRow', enableClickSelection: false, headerCheckbox: true }}
    onSelectionChanged={(event) => onSelectedRowKeysChange?.(new Set(event.api.getSelectedRows().map(getRowKey)))}
    onRowClicked={(event) => event.data && onRowClick?.(event.data)}
    getRowClass={(params) => params.data ? [getRowClassName?.(params.data), getRowKey(params.data) === currentRowKey ? 'basekit-current-row' : ''].filter(Boolean).join(' ') : ''}
    readOnlyEdit={Boolean(editing)}
    editType={editing?.mode === 'row' ? 'fullRow' : undefined}
    stopEditingWhenCellsLoseFocus
    onCellEditRequest={(event) => event.data && editing?.onChange(event.data, event.column.getColId(), String(event.newValue ?? ''))}
    overlayNoRowsTemplate={`<span>${emptyMessage ?? '조회 결과가 없습니다.'}</span>`}
  /></div></div>;
}

export default function BaseKitDataGrid<T,>({ fields, getFieldValue, editing, loading, currentRowKey, getRowState, ...props }: BaseKitDataGridProps<T>) {
  return <ProgramDataGrid {...props} renderTable={(table) => <GridTable {...table} fields={fields} getFieldValue={getFieldValue} editing={editing} loading={loading} currentRowKey={currentRowKey} getRowState={getRowState} />} />;
}
