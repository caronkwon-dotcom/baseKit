import { useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, themeQuartz, type ColDef, type EditableCallbackParams, type GridApi, type ICellRendererParams, type ValueGetterParams } from 'ag-grid-community';
import ProgramDataGrid, { type ProgramDataGridProps } from '../common/ProgramDataGrid';
import type { DataTableProps } from '../common/DataTable';
import type { FieldDefinition } from '../metadata/fieldDefinition';
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
}

function GridTable<T,>({ columns, rows, getRowKey, selectedRowKeys, onSelectedRowKeysChange, onRowClick, getRowClassName, emptyMessage, fields = [], getFieldValue, editing, loading, currentRowKey }: DataTableProps<T> & Pick<BaseKitDataGridProps<T>, 'fields' | 'getFieldValue' | 'editing' | 'loading' | 'currentRowKey'>) {
  const apiRef = useRef<GridApi<T> | null>(null);
  const columnDefs = useMemo<ColDef<T>[]>(() => [
    ...columns.map((column) => ({
      colId: column.key, headerName: column.header, initialWidth: column.width, minWidth: column.minWidth,
      flex: column.width ? undefined : column.flex ?? 1,
      valueGetter: (params: ValueGetterParams<T>) => params.data ? String((params.data as Record<string, unknown>)[column.key] ?? '') : '',
      cellRenderer: (params: ICellRendererParams<T>) => params.data ? column.render(params.data) : null,
      editable: (params: EditableCallbackParams<T>) => Boolean(params.data && editing?.keys.includes(column.key) && (editing.isEditable?.(params.data, column.key) ?? true)),
    })),
    ...fields.map((field) => ({
      colId: `ATTRIBUTE_${field.key}`, headerName: field.label, flex: 1, minWidth: 100,
      valueGetter: (params: ValueGetterParams<T>) => params.data ? getFieldValue?.(params.data, field) ?? '' : '',
      editable: (params: EditableCallbackParams<T>) => Boolean(params.data && editing?.keys.includes(`ATTRIBUTE_${field.key}`) && (editing.isEditable?.(params.data, `ATTRIBUTE_${field.key}`) ?? true)),
      cellEditor: field.controlType === 'SELECT' ? 'agSelectCellEditor' : field.dataType === 'NUMBER' ? 'agNumberCellEditor' : field.dataType === 'BOOLEAN' ? 'agCheckboxCellEditor' : field.dataType === 'DATE' ? 'agDateStringCellEditor' : 'agTextCellEditor',
      cellEditorParams: field.controlType === 'SELECT' ? { values: field.options?.map((option) => option.value) ?? [] } : undefined,
    })),
  ], [columns, editing, fields, getFieldValue]);

  useEffect(() => {
    apiRef.current?.forEachNode((node) => node.setSelected(Boolean(node.data && selectedRowKeys?.has(getRowKey(node.data)))));
  }, [getRowKey, rows, selectedRowKeys]);

  return <div className="data-section"><div className="basekit-ag-grid"><AgGridReact<T>
    modules={[AllCommunityModule]} theme={theme} rowData={rows} columnDefs={columnDefs} loading={loading}
    onGridReady={(event) => { apiRef.current = event.api; }}
    getRowId={(params) => getRowKey(params.data)}
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

export default function BaseKitDataGrid<T,>({ fields, getFieldValue, editing, loading, currentRowKey, ...props }: BaseKitDataGridProps<T>) {
  return <ProgramDataGrid {...props} renderTable={(table) => <GridTable {...table} fields={fields} getFieldValue={getFieldValue} editing={editing} loading={loading} currentRowKey={currentRowKey} />} />;
}
