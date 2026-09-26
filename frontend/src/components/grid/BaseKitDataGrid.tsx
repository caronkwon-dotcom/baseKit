import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, themeQuartz, type GridApi } from 'ag-grid-community';
import ProgramDataGrid, { type ProgramDataGridProps } from '../common/ProgramDataGrid';
import type { DataTableProps } from '../common/DataTable';
import type { FieldDefinition } from '../metadata/fieldDefinition';
import { toGridColumns, type GridEditing } from './gridColumnAdapter';
import { fromMetadataColumnKey } from './metadataColumnKey';
import { normalizeGridFieldValue, validateGridField } from './gridFieldValidation';
import type { GridRowState } from './gridRowState';
import './basekitGrid.css';

const theme = themeQuartz.withParams({
  headerHeight: 34, rowHeight: 32, fontSize: 12,
  backgroundColor: 'var(--surface-panel)', foregroundColor: 'var(--text-primary)',
  headerBackgroundColor: 'var(--surface-muted)', borderColor: 'var(--border-default)', accentColor: 'var(--brand-primary)',
});

export type { GridEditing } from './gridColumnAdapter';

export interface BaseKitDataGridProps<T> extends Omit<ProgramDataGridProps<T>, 'renderTable'> {
  fields?: FieldDefinition[];
  getFieldValue?: (row: T, field: FieldDefinition) => string | undefined;
  editing?: GridEditing<T>;
  loading?: boolean;
  currentRowKey?: string;
  getRowState?: (row: T) => GridRowState;
}

function GridTable<T,>({ columns, rows, getRowKey, selectedRowKeys, onSelectedRowKeysChange, onRowClick, getRowClassName, emptyMessage, fields = [], getFieldValue, editing, loading, currentRowKey, getRowState }: DataTableProps<T> & Pick<BaseKitDataGridProps<T>, 'fields' | 'getFieldValue' | 'editing' | 'loading' | 'currentRowKey' | 'getRowState'>) {
  const apiRef = useRef<GridApi<T> | null>(null);
  const [rejectedCells, setRejectedCells] = useState(new Set<string>());
  const cellKey = useCallback((row: T, key: string) => `${getRowKey(row)}::${key}`, [getRowKey]);
  const fieldForKey = useCallback((key: string) => {
    const metadataKey = fromMetadataColumnKey(key);
    return metadataKey === null
      ? columns.find((column) => column.key === key)?.fieldDefinition
      : fields.find((field) => field.key === metadataKey);
  }, [columns, fields]);
  const valueForKey = useCallback((row: T, key: string, field: FieldDefinition) =>
    fromMetadataColumnKey(key) === null ? (row as Record<string, unknown>)[key] : getFieldValue?.(row, field), [getFieldValue]);
  const validationClass = useCallback((row: T, key: string, field?: FieldDefinition) => {
    if (!field) return '';
    return rejectedCells.has(cellKey(row, key)) || validateGridField(valueForKey(row, key, field), field) ? 'basekit-invalid-cell' : '';
  }, [cellKey, rejectedCells, valueForKey]);
  const changeSwitch = useCallback((row: T, key: string, value: string, field: FieldDefinition) => {
    if (validateGridField(value, field)) return;
    setRejectedCells((current) => { const next = new Set(current); next.delete(cellKey(row, key)); return next; });
    editing?.onChange(row, key, value);
  }, [cellKey, editing]);
  const columnDefs = useMemo(() => toGridColumns({ columns, fields, getFieldValue, editing, getRowState, validationClass, changeSwitch }),
    [changeSwitch, columns, fields, getFieldValue, editing, getRowState, validationClass]);

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
