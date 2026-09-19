import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, themeQuartz, type GridApi } from 'ag-grid-community';
import ProgramDataGrid, { type ProgramDataGridProps } from '../common/ProgramDataGrid';
import type { DataTableProps } from '../common/DataTable';
import { toGridColumns, type GridFields, type GridEditing } from './gridColumnAdapter';
import './basekitGrid.css';

const modules = [AllCommunityModule];
const theme = themeQuartz.withParams({
  headerHeight: 34, rowHeight: 32, fontSize: 12,
  fontFamily: 'inherit', spacing: 4, cellHorizontalPadding: 8,
  backgroundColor: 'var(--surface-panel)', foregroundColor: 'var(--text-primary)',
  headerBackgroundColor: 'var(--surface-muted)', borderColor: 'var(--border-default)',
  accentColor: 'var(--brand-primary)', selectedRowBackgroundColor: 'var(--brand-soft)',
  rowHoverColor: 'var(--surface-muted)', wrapperBorderRadius: 4,
});

export interface BaseKitDataGridProps<T> extends Omit<ProgramDataGridProps<T>, 'renderTable'>, GridFields<T> {
  loading?: boolean;
  editing?: GridEditing<T>;
  selectionMode?: 'single' | 'multiple';
}

function GridTable<T>({ fields, getFieldValue, loading = false, editing, selectionMode = 'multiple', ...props }:
  DataTableProps<T> & Pick<BaseKitDataGridProps<T>, 'fields' | 'getFieldValue' | 'loading' | 'editing' | 'selectionMode'>) {
  const { selectedRowKeys, getRowKey } = props;
  const api = useRef<GridApi<T> | null>(null);
  const syncing = useRef(false);
  const columns = useMemo(() => toGridColumns(props.columns, { fields, getFieldValue }, editing), [props.columns, fields, getFieldValue, editing]);
  const syncSelection = useCallback(() => {
    if (!api.current || api.current.isDestroyed()) return;
    syncing.current = true;
    api.current.forEachNode(node => {
      const selected = !!node.data && !!selectedRowKeys?.has(getRowKey(node.data));
      if (node.isSelected() !== selected) node.setSelected(selected);
    });
    syncing.current = false;
  }, [selectedRowKeys, getRowKey]);
  useEffect(syncSelection, [syncSelection, props.rows]);
  const rowSelection = useMemo(() => props.onSelectedRowKeysChange ? selectionMode === 'single'
    ? { mode: 'singleRow' as const, enableClickSelection: false }
    : { mode: 'multiRow' as const, enableClickSelection: !props.onRowClick, headerCheckbox: true }
    : undefined, [props.onSelectedRowKeysChange, props.onRowClick, selectionMode]);

  return <div className="data-section"><div className="basekit-ag-grid" aria-busy={loading}>
    <AgGridReact<T> modules={modules} theme={theme} rowData={props.rows} columnDefs={columns}
      defaultColDef={{ sortable: true, resizable: true, suppressMovable: true }}
      getRowId={params => props.getRowKey(params.data)} rowSelection={rowSelection}
      selectionColumnDef={{ width: 34, minWidth: 34, maxWidth: 34, resizable: false }}
      loading={loading} animateRows={false} rowBuffer={5} tooltipShowDelay={300}
      overlayNoRowsTemplate="<span>조회 결과가 없습니다.</span>"
      noRowsOverlayComponent={() => <span>{props.emptyMessage ?? '조회 결과가 없습니다.'}</span>}
      localeText={{ loadingOoo: '조회 중...', selectAll: '전체 선택', selectRow: '행 선택', deselectRow: '행 선택 해제' }}
      onGridReady={event => { api.current = event.api; syncSelection(); }}
      onRowDataUpdated={syncSelection}
      onSelectionChanged={event => {
        if (syncing.current || event.source === 'api' || event.source === 'rowDataChanged') return;
        const keys = new Set(event.api.getSelectedRows().map(props.getRowKey));
        props.onSelectedRowKeysChange?.(keys);
      }}
      onRowClicked={event => { if (event.data) props.onRowClick?.(event.data); }}
      getRowClass={params => params.data ? props.getRowClassName?.(params.data) : undefined}
      stopEditingWhenCellsLoseFocus readOnlyEdit={!!editing} editType={editing?.mode === 'row' ? 'fullRow' : undefined}
      onCellEditRequest={event => { if (event.data) editing?.onChange(event.data, event.column.getColId(), String(event.newValue ?? '')); }}
    />
  </div></div>;
}

/** Keeps permission actions and row keys in BaseKit; no GridApi escapes this module. */
export default function BaseKitDataGrid<T>({ fields, getFieldValue, loading, editing, selectionMode, ...props }: BaseKitDataGridProps<T>) {
  return <ProgramDataGrid {...props} renderTable={tableProps => <GridTable {...tableProps}
    fields={fields} getFieldValue={getFieldValue} loading={loading} editing={editing} selectionMode={selectionMode} />} />;
}
