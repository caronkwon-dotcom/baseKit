import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, themeQuartz, type ColDef, type GridApi } from 'ag-grid-community';
import ActionButton from '../common/ActionButton';
import { COMMON_ACTIONS } from '../../constants/actionCodes';
import { filterTreeNodeIds, flattenTreeRows, getTreeSiblingSortOrder, validateTreeRows, type TreeDataGridFields, type TreeSortDirection } from './treeDataGridModel';
import { useTreeDataGridState } from './useTreeDataGridState';
import './treeDataGrid.css';
import '../grid/basekitGrid.css';

export interface TreeDataGridColumn<T> {
  field: keyof T & string;
  headerName: string;
  width?: number;
  editable?: boolean;
  cellEditor?: 'agTextCellEditor' | 'agSelectCellEditor' | 'agNumberCellEditor';
  cellEditorParams?: Record<string, unknown>;
}

export interface TreeDataGridChange<T> {
  rows: T[];
  changeSet: { INSERTED: T[]; UPDATED: T[]; DELETED: string[] };
  dirty: boolean;
  issues: ReturnType<typeof validateTreeRows<T>>;
}

export interface TreeDataGridProps<T extends Record<string, unknown>> {
  initialRows: T[];
  fields: TreeDataGridFields;
  columns: TreeDataGridColumn<T>[];
  getKey: (row: T) => string;
  maxDepth?: number;
  onSave?: (rows: T[], changeSet: { INSERTED: T[]; UPDATED: T[]; DELETED: string[] }) => void;
  onChange?: (change: TreeDataGridChange<T>) => void;
  emptyMessage?: string;
}

const gridTheme = themeQuartz.withParams({
  headerHeight: 34, rowHeight: 32, fontSize: 12,
  backgroundColor: 'var(--surface-panel)', foregroundColor: 'var(--text-primary)',
  headerBackgroundColor: 'var(--surface-muted)', borderColor: 'var(--border-default)', accentColor: 'var(--brand-primary)',
});

const newId = () => `TREE_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`.toUpperCase();

export default function TreeDataGrid<T extends Record<string, unknown>>({ initialRows, fields, columns, getKey, maxDepth = 3, onSave, onChange, emptyMessage = 'No rows match this view.' }: TreeDataGridProps<T>) {
  const [stableGetKey] = useState<(row: T) => string>(() => getKey);
  const state = useTreeDataGridState(initialRows, stableGetKey);
  const { trackedRows, rows, changeSet, dirty, addRow, updateField, removeRows, cancel, accept, getState } = state;
  const apiRef = useRef<GridApi<TreeViewRow<T>> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(initialRows.filter((row) => row[fields.nodeTypeField] === 'FOLDER').map(stableGetKey)));
  const [query, setQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<TreeSortDirection>('ASC');
  const issues = useMemo(() => validateTreeRows(trackedRows, fields, (row) => getState(row.__GRID_ROW_ID), maxDepth), [fields, getState, maxDepth, trackedRows]);
  const filter = useMemo(() => filterTreeNodeIds(trackedRows, fields, query), [fields, query, trackedRows]);
  const visibleRows = useMemo(() => flattenTreeRows(trackedRows, fields, expandedIds, sortDirection, filter), [expandedIds, fields, filter, sortDirection, trackedRows]);
  const gridRows = useMemo(() => visibleRows.map((view, order) => ({
    ...view.row, __GRID_ROW_ID: view.internalId, __TREE_ID: view.id, __TREE_DEPTH: view.depth,
    __TREE_HAS_CHILDREN: view.hasChildren, __TREE_EXPANDED: view.expanded, __TREE_ORDER: order,
    __TREE_STATE: getState(view.internalId),
  } as TreeViewRow<T>)), [getState, visibleRows]);
  const change = useMemo<TreeDataGridChange<T>>(() => ({ rows, changeSet, dirty, issues }), [changeSet, dirty, issues, rows]);
  useEffect(() => { onChange?.(change); }, [change, onChange]);

  const toggleExpanded = useCallback((id: string) => setExpandedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);
  const columnDefs = useMemo<ColDef<TreeViewRow<T>>[]>(() => [
    {
      field: fields.nameField as never, headerName: 'Name', minWidth: 240, flex: 1, editable: true,
      valueSetter: (params) => {
        if (!params.data) return false;
        updateField(params.data.__GRID_ROW_ID, fields.nameField, params.newValue);
        return true;
      },
      cellRenderer: (params: { data?: TreeViewRow<T>; value?: unknown }) => {
        const row = params.data;
        if (!row) return params.value;
        const type = String(row[fields.nodeTypeField]);
        const icon = type === 'FOLDER' ? '▰' : '▧';
        return <div className="tree-grid-name-cell" style={{ paddingInlineStart: `${(row.__TREE_DEPTH - 1) * 20}px` }}>
          {row.__TREE_HAS_CHILDREN ? <button type="button" className="tree-grid-expander" aria-label={`${row.__TREE_EXPANDED ? 'Collapse' : 'Expand'} ${String(row[fields.nameField])}`} aria-expanded={row.__TREE_EXPANDED} onClick={(event) => { event.stopPropagation(); toggleExpanded(row.__TREE_ID); }}>{row.__TREE_EXPANDED ? '▾' : '▸'}</button> : <span className="tree-grid-expander-placeholder" />}
          <span className={`tree-grid-node-icon ${type.toLowerCase()}`} aria-label={type}>{icon}</span><span>{String(params.value ?? '')}</span>
        </div>;
      },
    },
    ...columns.filter((column) => column.field !== fields.nameField).map((column): ColDef<TreeViewRow<T>> => ({
      field: column.field as never, headerName: column.headerName, width: column.width, editable: column.editable ?? true,
      cellEditor: column.cellEditor, cellEditorParams: column.cellEditorParams,
      valueSetter: (params) => {
        if (!params.data) return false;
        updateField(params.data.__GRID_ROW_ID, column.field, params.newValue);
        return true;
      },
    })),
    { colId: '__STATE', headerName: 'Change', width: 92, editable: false, valueGetter: (params) => params.data?.__TREE_STATE ?? '', cellClass: 'tree-grid-state-cell' },
  ], [columns, fields.nameField, fields.nodeTypeField, toggleExpanded, updateField]);

  const selectedRow = trackedRows.find((row) => row.__GRID_ROW_ID === selectedId);
  const selectedTreeId = selectedRow ? String(selectedRow[fields.idField] ?? '') : '';
  const selectedNodeId = visibleRows.find((view) => view.internalId === selectedId)?.id ?? selectedTreeId;
  const add = (parentId: string | null) => {
    const row = {
      [fields.idField]: newId(), [fields.parentIdField]: parentId ?? '', [fields.nodeTypeField]: 'LEAF',
      [fields.nameField]: 'New node', [fields.sortField]: getTreeSiblingSortOrder(rows, fields, parentId),
    } as T;
    setSelectedId(addRow(row));
    if (parentId) setExpandedIds((current) => new Set(current).add(parentId));
  };
  const addChild = () => {
    if (!selectedRow) return;
    const selectedType = String(selectedRow[fields.nodeTypeField]);
    const parentId = selectedType === 'FOLDER' ? String(selectedRow[fields.idField]) : String(selectedRow[fields.parentIdField] ?? '');
    if (!parentId) { window.alert('A top-level item has no parent folder. Use New to add a root item.'); return; }
    const parent = rows.find((row) => String(row[fields.idField]) === parentId);
    if (parent && String(parent[fields.nodeTypeField]) !== 'FOLDER') { window.alert('Children can only be added under a folder.'); return; }
    add(parentId);
  };
  const addSibling = () => {
    if (!selectedRow) return add(null);
    add(String(selectedRow[fields.parentIdField] ?? '') || null);
  };
  const deleteSelected = () => {
    if (!selectedRow) return;
    const selectedChildren = trackedRows.filter((row) => String(row[fields.parentIdField] ?? '') === selectedTreeId && getState(row.__GRID_ROW_ID) !== 'DELETED');
    if (selectedChildren.length) { window.alert('Move or remove child rows before deleting this folder.'); return; }
    removeRows([selectedRow.__GRID_ROW_ID]);
    setSelectedId(null);
  };
  const save = () => {
    if (issues.length) { window.alert([...new Set(issues.map((issue) => issue.message))].join('\n')); return; }
    onSave?.(rows, changeSet);
    accept();
  };
  const expandAll = () => setExpandedIds(new Set(rows.filter((row) => row[fields.nodeTypeField] === 'FOLDER').map(stableGetKey)));
  const collapseAll = () => setExpandedIds(new Set());
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('.ag-cell-inline-editing, input, select, textarea, [contenteditable="true"]')) return;
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const index = visibleRows.findIndex((view) => view.internalId === selectedId);
    if (event.key === 'ArrowRight' && selectedNodeId && visibleRows[index]?.hasChildren && !expandedIds.has(selectedNodeId)) { event.preventDefault(); toggleExpanded(selectedNodeId); return; }
    if (event.key === 'ArrowLeft' && selectedNodeId && expandedIds.has(selectedNodeId)) { event.preventDefault(); toggleExpanded(selectedNodeId); return; }
    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = Math.min(index + 1, visibleRows.length - 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(index - 1, 0);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = visibleRows.length - 1;
    if (nextIndex !== index && visibleRows[nextIndex]) { event.preventDefault(); setSelectedId(visibleRows[nextIndex].internalId); apiRef.current?.setFocusedCell(nextIndex, fields.nameField); }
  };

  return <section className="tree-data-grid" onKeyDown={onKeyDown} tabIndex={0} aria-label="Tree data grid">
    <div className="tree-grid-toolbar">
      <div className="tree-grid-actions">
        <ActionButton actionCode={COMMON_ACTIONS.CREATE} label="New" onClick={() => add(null)} />
        <ActionButton actionCode={COMMON_ACTIONS.CREATE} label="Add child" disabled={!selectedRow} onClick={addChild} />
        <ActionButton actionCode={COMMON_ACTIONS.CREATE} label="Add sibling" onClick={addSibling} />
        <ActionButton actionCode={COMMON_ACTIONS.DELETE} label="Delete" tone="danger" disabled={!selectedRow} onClick={deleteSelected} />
        <ActionButton actionCode={COMMON_ACTIONS.SAVE} label="Save" tone="primary" disabled={!dirty} onClick={save} />
        <ActionButton actionCode={COMMON_ACTIONS.REVERT_CHANGES} label="Cancel" disabled={!dirty} onClick={cancel} />
        <button type="button" className="action-button" onClick={expandAll}>Expand all</button>
        <button type="button" className="action-button" onClick={collapseAll}>Collapse all</button>
      </div>
      <label className="tree-grid-search">Search name or key <input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <button type="button" className="tree-grid-sort" onClick={() => setSortDirection((current) => current === 'ASC' ? 'DESC' : 'ASC')} aria-label={`Sort siblings ${sortDirection === 'ASC' ? 'descending' : 'ascending'}`}>Sibling order {sortDirection === 'ASC' ? '↑' : '↓'}</button>
    </div>
    <div className="tree-grid-table">
      <div className="basekit-ag-grid tree-grid-ag-grid"><AgGridReact<TreeViewRow<T>>
        modules={[AllCommunityModule]} theme={gridTheme} rowData={gridRows} columnDefs={columnDefs} getRowId={(params) => params.data.__TREE_ID}
        postSortRows={(params) => params.nodes.sort((left, right) => (left.data?.__TREE_ORDER ?? 0) - (right.data?.__TREE_ORDER ?? 0))}
        onGridReady={(event) => { apiRef.current = event.api; }} onRowClicked={(event) => event.data && setSelectedId(event.data.__GRID_ROW_ID)}
        getRowClass={(params) => params.data ? [params.data.__TREE_STATE !== 'NORMAL' ? `grid-${params.data.__TREE_STATE.toLowerCase()}-row` : '', selectedId === params.data.__GRID_ROW_ID ? 'tree-grid-selected-row' : ''].filter(Boolean).join(' ') : ''}
        rowHeight={32} headerHeight={34} singleClickEdit stopEditingWhenCellsLoseFocus suppressCellFocus={false}
        overlayNoRowsTemplate={`<span>${emptyMessage}</span>`}
      /></div>
    </div>
    <div className="tree-grid-footer"><span>{rows.length} rows</span><span>{issues.length ? `${issues.length} validation issue(s)` : 'Validation passed'}</span><span>Sibling sort: {sortDirection}</span></div>
  </section>;
}

type TreeViewRow<T> = T & {
  __GRID_ROW_ID: string;
  __TREE_ID: string;
  __TREE_DEPTH: number;
  __TREE_HAS_CHILDREN: boolean;
  __TREE_EXPANDED: boolean;
  __TREE_ORDER: number;
  __TREE_STATE: string;
};
