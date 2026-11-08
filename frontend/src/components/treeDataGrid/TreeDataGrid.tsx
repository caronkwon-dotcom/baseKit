import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, themeQuartz, type CellClassParams, type ColDef, type GridApi, type ICellRendererParams } from 'ag-grid-community';
import ActionButton from '../common/ActionButton';
import { COMMON_ACTIONS } from '../../constants/actionCodes';
import { MetadataSwitch, RowStateIcon } from '../grid/gridCellComponents';
import type { GridRowState } from '../grid/gridRowState';
import { filterTreeNodeIds, flattenTreeRows, getTreeSiblingSortOrder, validateTreeRows, type TreeDataGridFields, type TreeDataGridIssue, type TreeSortDirection } from './treeDataGridModel';
import { useTreeDataGridState } from './useTreeDataGridState';
import './treeDataGrid.css';
import '../grid/basekitGrid.css';

export type TreeDataGridOption = string | { value: string; label: string };
export interface TreeDataGridEditorProps<T> {
  row: T;
  rowId: string;
  value: unknown;
  editable: boolean;
  onChange: (value: unknown) => void;
  onFocus: () => void;
}
export interface TreeDataGridColumn<T> {
  field: keyof T & string;
  headerName: string;
  width?: number;
  editable?: boolean | ((row: T, state: GridRowState) => boolean);
  editor?: 'text' | 'number' | 'select' | 'toggle' | 'custom' | 'none';
  options?: TreeDataGridOption[];
  getOptions?: (row: T) => TreeDataGridOption[];
  toggleValues?: { on: string; off: string; label?: string };
  inputProps?: Record<string, string | number | undefined>;
  renderEditor?: (props: TreeDataGridEditorProps<T>) => ReactNode;
  onChange?: (row: T, value: unknown) => Partial<T>;
  /** Backward-compatible editor options used by the original demo. */
  cellEditor?: 'agTextCellEditor' | 'agSelectCellEditor' | 'agNumberCellEditor';
  cellEditorParams?: Record<string, unknown>;
}

export interface TreeDataGridPendingRow<T> { rowId: string; row: T; state: Exclude<GridRowState, 'NORMAL'> }
export interface TreeDataGridSaveResult { acceptedRowIds?: string[]; message?: string }
export interface TreeDataGridChange<T> {
  rows: T[];
  changeSet: { INSERTED: T[]; UPDATED: T[]; DELETED: string[] };
  pending: TreeDataGridPendingRow<T>[];
  dirty: boolean;
  issues: TreeDataGridIssue[];
}

export interface TreeDataGridProps<T extends Record<string, unknown>> {
  initialRows: T[];
  fields: TreeDataGridFields;
  columns: TreeDataGridColumn<T>[];
  getKey: (row: T) => string;
  maxDepth?: number;
  createRow?: (parentId: string | null, sortOrder: number) => T;
  canHaveChildren?: (row: T) => boolean;
  validateRows?: (rows: T[], getState: (row: T) => GridRowState) => TreeDataGridIssue[];
  onSave?: (rows: T[], changeSet: TreeDataGridChange<T>['changeSet'], pending: TreeDataGridPendingRow<T>[]) => TreeDataGridSaveResult | void | Promise<TreeDataGridSaveResult | void>;
  onChange?: (change: TreeDataGridChange<T>) => void;
  onRowSelect?: (row: T | null) => void;
  saving?: boolean;
  labels?: Partial<Record<'new' | 'addChild' | 'addSibling' | 'delete' | 'save' | 'cancel' | 'expandAll' | 'collapseAll' | 'search' | 'sort' | 'state', string>>;
  emptyMessage?: string;
}

const gridTheme = themeQuartz.withParams({
  headerHeight: 34, rowHeight: 32, fontSize: 12,
  backgroundColor: 'var(--surface-panel)', foregroundColor: 'var(--text-primary)',
  headerBackgroundColor: 'var(--surface-muted)', borderColor: 'var(--border-default)', accentColor: 'var(--brand-primary)',
});

const newId = () => `TREE_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
const rowValue = <T extends Record<string, unknown>>(row: T) => {
  const { __GRID_ROW_ID: _id, __TREE_ID: _treeId, __TREE_NODE_ID: _nodeId, __TREE_DEPTH: _depth, __TREE_HAS_CHILDREN: _hasChildren, __TREE_EXPANDED: _expanded, __TREE_ORDER: _order, __TREE_STATE: _state, ...value } = row;
  void _id; void _treeId; void _nodeId; void _depth; void _hasChildren; void _expanded; void _order; void _state;
  return value as T;
};

export default function TreeDataGrid<T extends Record<string, unknown>>({
  initialRows, fields, columns, getKey, maxDepth = 3, createRow, canHaveChildren, validateRows: validateExtra,
  onSave, onChange, onRowSelect, saving = false, labels, emptyMessage = 'No rows match this view.',
}: TreeDataGridProps<T>) {
  const [stableGetKey] = useState<(row: T) => string>(() => getKey);
  const state = useTreeDataGridState(initialRows, stableGetKey);
  const { trackedRows, rows, changeSet, dirty, addRow, updateField, updateRow, removeRows, cancel, accept, getState } = state;
  const apiRef = useRef<GridApi<TreeViewRow<T>> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const nodeKey = useCallback((row: T) => stableGetKey(row) || String((row as Record<string, unknown>).__GRID_ROW_ID ?? ''), [stableGetKey]);
  const previousInitialRows = useRef(initialRows);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(initialRows.filter((row) => row[fields.nodeTypeField] === 'FOLDER').map(nodeKey)));
  const [query, setQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<TreeSortDirection>('ASC');
  const baseIssues = useMemo(() => validateTreeRows(trackedRows, fields, (row) => getState(row.__GRID_ROW_ID), maxDepth), [fields, getState, maxDepth, trackedRows]);
  const extraIssues = useMemo(() => validateExtra?.(trackedRows as T[], (row) => getState(String((row as Record<string, unknown>).__GRID_ROW_ID ?? ''))) ?? [], [getState, trackedRows, validateExtra]);
  const issues = useMemo(() => [...baseIssues, ...extraIssues], [baseIssues, extraIssues]);
  const filter = useMemo(() => filterTreeNodeIds(trackedRows, fields, query), [fields, query, trackedRows]);
  const visibleRows = useMemo(() => flattenTreeRows(trackedRows, fields, expandedIds, sortDirection, filter), [expandedIds, fields, filter, sortDirection, trackedRows]);
  const gridRows = useMemo(() => visibleRows.map((view, order) => ({
    ...view.row, __GRID_ROW_ID: view.internalId, __TREE_ID: view.internalId, __TREE_NODE_ID: view.id, __TREE_DEPTH: view.depth,
    __TREE_HAS_CHILDREN: view.hasChildren, __TREE_EXPANDED: view.expanded, __TREE_ORDER: order,
    __TREE_STATE: getState(view.internalId),
  } as TreeViewRow<T>)), [getState, visibleRows]);
  const pending = useMemo<TreeDataGridPendingRow<T>[]>(() => trackedRows.flatMap((row) => {
    const rowState = getState(row.__GRID_ROW_ID);
    return rowState === 'NORMAL' ? [] : [{ rowId: row.__GRID_ROW_ID, row: rowValue(row), state: rowState }];
  }), [getState, trackedRows]);
  const change = useMemo<TreeDataGridChange<T>>(() => ({ rows, changeSet, pending, dirty, issues }), [changeSet, dirty, issues, pending, rows]);
  useEffect(() => { onChange?.(change); }, [change, onChange]);
  useEffect(() => {
    if (previousInitialRows.current === initialRows) return;
    previousInitialRows.current = initialRows;
    setExpandedIds(new Set(initialRows.filter((row) => (row as Record<string, unknown>)[fields.nodeTypeField] === 'FOLDER').map(nodeKey)));
  }, [fields.nodeTypeField, initialRows, nodeKey]);
  useEffect(() => {
    if (!selectedId || trackedRows.some((row) => row.__GRID_ROW_ID === selectedId)) return undefined;
    const timer = window.setTimeout(() => { setSelectedId(null); onRowSelect?.(null); }, 0);
    return () => window.clearTimeout(timer);
  }, [onRowSelect, selectedId, trackedRows]);

  const toggleExpanded = useCallback((id: string) => setExpandedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);
  const isEditable = useCallback((column: TreeDataGridColumn<T>, row: TreeViewRow<T>) => {
    const rowState = getState(row.__GRID_ROW_ID);
    if (rowState === 'DELETED' || column.editor === 'none') return false;
    return typeof column.editable === 'function' ? column.editable(rowValue(row), rowState) : column.editable ?? true;
  }, [getState]);
  const setColumnValue = useCallback((column: TreeDataGridColumn<T>, row: TreeViewRow<T>, value: unknown) => {
    if (column.onChange) updateRow(row.__GRID_ROW_ID, (current) => column.onChange!(current, value));
    else updateField(row.__GRID_ROW_ID, column.field, value);
    if (column.field === fields.parentIdField && typeof value === 'string' && value) setExpandedIds((current) => new Set(current).add(value));
  }, [fields.parentIdField, updateField, updateRow]);
  const selectRow = useCallback((row: TreeViewRow<T> | null) => {
    setSelectedId(row?.__GRID_ROW_ID ?? null);
    onRowSelect?.(row ? rowValue(row) : null);
  }, [onRowSelect]);

  const optionsFor = useCallback((column: TreeDataGridColumn<T>, row: TreeViewRow<T>): TreeDataGridOption[] => {
    if (column.getOptions) return column.getOptions(rowValue(row));
    if (column.options) return column.options;
    const values = column.cellEditorParams?.values;
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string').map((value) => ({ value, label: value })) : [];
  }, []);
  const editorFor = useCallback((column: TreeDataGridColumn<T>): TreeDataGridColumn<T>['editor'] => column.editor
    ?? (column.cellEditor === 'agNumberCellEditor' ? 'number' : column.cellEditor === 'agSelectCellEditor' ? 'select' : 'text'), []);
  const fieldEditor = useCallback((column: TreeDataGridColumn<T>, row: TreeViewRow<T>, value: unknown) => {
    const editable = isEditable(column, row);
    const onFocus = () => selectRow(row);
    const onValue = (next: unknown) => setColumnValue(column, row, next);
    if (column.renderEditor) return column.renderEditor({ row: rowValue(row), rowId: row.__GRID_ROW_ID, value, editable, onChange: onValue, onFocus });
    const editor = editorFor(column);
    if (editor === 'toggle') {
      const values = column.toggleValues ?? { on: 'Y', off: 'N' };
      return <span className="tree-grid-toggle-editor" onFocusCapture={onFocus} onClickCapture={onFocus}><MetadataSwitch value={value} editable={editable} onChange={onValue as (value: string) => void} field={{ key: column.field, label: values.label ?? column.headerName, dataType: 'STRING', controlType: 'SWITCH', displayType: 'BOOLEAN', required: true, options: [{ value: values.on, label: '사용' }, { value: values.off, label: '미사용' }] }} /></span>;
    }
    if (editor === 'select') return <select className="basekit-grid-input tree-grid-editor" value={String(value ?? '')} disabled={!editable} aria-label={column.headerName} onFocus={onFocus} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onChange={(event) => onValue(event.target.value)}>
      {optionsFor(column, row).map((option) => { const item = typeof option === 'string' ? { value: option, label: option } : option; return <option key={item.value} value={item.value}>{item.label}</option>; })}
    </select>;
    if (editor === 'custom' || editor === 'none') return String(value ?? '');
    return <input className="basekit-grid-input tree-grid-editor" type={editor === 'number' ? 'number' : 'text'} value={value == null ? '' : String(value)} disabled={!editable} aria-label={column.headerName} onFocus={onFocus} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} onChange={(event) => onValue(editor === 'number' ? (event.target.value === '' ? '' : Number(event.target.value)) : event.target.value)} {...column.inputProps} />;
  }, [editorFor, isEditable, optionsFor, selectRow, setColumnValue]);

  const columnDefs = useMemo<ColDef<TreeViewRow<T>>[]>(() => [
    {
      field: fields.nameField as never, headerName: 'Name', minWidth: 260, flex: 1, sortable: false,
      cellClass: 'tree-grid-name-column',
      cellRenderer: (params: ICellRendererParams<TreeViewRow<T>>) => {
        const row = params.data;
        if (!row) return params.value;
        const type = String(row[fields.nodeTypeField]);
        const nameColumn = { field: fields.nameField as keyof T & string, headerName: 'Name', editor: 'text' as const };
        return <div className="tree-grid-name-cell" style={{ paddingInlineStart: `${(row.__TREE_DEPTH - 1) * 20}px` }}>
          {row.__TREE_HAS_CHILDREN ? <button type="button" className="tree-grid-expander" aria-label={`${row.__TREE_EXPANDED ? 'Collapse' : 'Expand'} ${String(row[fields.nameField])}`} aria-expanded={row.__TREE_EXPANDED} onClick={(event) => { event.stopPropagation(); toggleExpanded(row.__TREE_NODE_ID); }}>{row.__TREE_EXPANDED ? '▾' : '▸'}</button> : <span className="tree-grid-expander-placeholder" />}
          <span className={`tree-grid-node-icon ${type.toLowerCase()}`} aria-label={type}>{type === 'FOLDER' ? '▰' : '▧'}</span>
          {fieldEditor(nameColumn, row, params.value)}
        </div>;
      },
      cellRendererParams: { suppressMouseEventHandling: () => true },
    },
    ...columns.map((column): ColDef<TreeViewRow<T>> => ({
      field: column.field as never, headerName: column.headerName, width: column.width, minWidth: column.width ? undefined : 120,
      sortable: false, cellClass: (params: CellClassParams<TreeViewRow<T>>) => params.data && isEditable(column, params.data) ? 'basekit-editable-cell tree-grid-editor-cell' : 'tree-grid-editor-cell',
      cellRenderer: (params: ICellRendererParams<TreeViewRow<T>>) => params.data ? fieldEditor(column, params.data, params.value) : null,
      cellRendererParams: { suppressMouseEventHandling: () => true },
    })),
    { colId: '__STATE', headerName: '변경 상태', width: 94, minWidth: 94, sortable: false, editable: false, valueGetter: (params) => params.data?.__TREE_STATE ?? '', cellRenderer: (params: ICellRendererParams<TreeViewRow<T>>) => {
      const status = params.data?.__TREE_STATE as GridRowState | undefined;
      if (!status || status === 'NORMAL') return null;
      return <span className="tree-grid-state-cell"><RowStateIcon state={status} /><span>{status === 'INSERTED' ? '신규' : status === 'UPDATED' ? '수정' : '삭제'}</span></span>;
    } },
  ], [columns, fieldEditor, fields.nameField, fields.nodeTypeField, isEditable, toggleExpanded]);

  const selectedRow = trackedRows.find((row) => row.__GRID_ROW_ID === selectedId);
  const selectedTreeId = selectedRow ? nodeKey(selectedRow) : '';
  const selectedViewIndex = visibleRows.findIndex((view) => view.internalId === selectedId);
  const selectedNodeId = visibleRows[selectedViewIndex]?.id ?? selectedTreeId;
  const add = (parentId: string | null) => {
    const row = createRow ? createRow(parentId, getTreeSiblingSortOrder(rows, fields, parentId)) : {
      [fields.idField]: newId(), [fields.parentIdField]: parentId ?? '', [fields.nodeTypeField]: 'LEAF',
      [fields.nameField]: 'New node', [fields.sortField]: getTreeSiblingSortOrder(rows, fields, parentId),
    } as T;
    const id = addRow(row);
    setSelectedId(id);
    onRowSelect?.(row);
    if (parentId) setExpandedIds((current) => new Set(current).add(parentId));
    requestAnimationFrame(() => {
      const node = apiRef.current?.getRowNode(id);
      if (node) { apiRef.current?.ensureNodeVisible(node, 'bottom'); if (node.rowIndex != null) apiRef.current?.setFocusedCell(node.rowIndex, fields.nameField); }
    });
  };
  const addChild = () => {
    const selected = selectedRow;
    if (!selected) return;
    const selectedType = String(selected[fields.nodeTypeField]);
    const selectedParentKey = String(selected[fields.idField] ?? '').trim();
    if (selectedType === 'FOLDER' && !selectedParentKey) { window.alert('Enter the new folder key before adding a child.'); return; }
    const parentId = selectedType === 'FOLDER' ? selectedParentKey : String(selected[fields.parentIdField] ?? '');
    if (!parentId) { window.alert('A top-level item has no parent folder. Use New to add a root item.'); return; }
    const parent = trackedRows.find((row) => nodeKey(row) === parentId);
    if (!parent || String(parent[fields.nodeTypeField]) !== 'FOLDER' || (canHaveChildren && !canHaveChildren(rowValue(parent)))) { window.alert('Children can only be added under an eligible folder.'); return; }
    const selectedDepth = visibleRows.find((view) => view.internalId === selected.__GRID_ROW_ID)?.depth ?? 1;
    const parentDepth = selectedType === 'FOLDER' ? selectedDepth : Math.max(1, selectedDepth - 1);
    if (parentDepth >= maxDepth) { window.alert(`Maximum menu depth is ${maxDepth}.`); return; }
    add(parentId);
  };
  const addSibling = () => {
    if (!selectedRow) return add(null);
    const parentId = String(selectedRow[fields.parentIdField] ?? '') || null;
    const parent = parentId ? trackedRows.find((row) => nodeKey(row) === parentId) : null;
    if (parentId && (!parent || String(parent[fields.nodeTypeField]) !== 'FOLDER' || (canHaveChildren && !canHaveChildren(rowValue(parent))))) { window.alert('This folder cannot contain additional items.'); return; }
    add(parentId);
  };
  const deleteSelected = () => {
    if (!selectedRow) return;
    const selectedChildren = trackedRows.filter((row) => String(row[fields.parentIdField] ?? '') === selectedTreeId && getState(row.__GRID_ROW_ID) !== 'DELETED');
    if (selectedChildren.length) { window.alert('Move or remove child rows before deleting this folder.'); return; }
    removeRows([selectedRow.__GRID_ROW_ID]);
    setSelectedId(null); onRowSelect?.(null);
  };
  const save = async () => {
    if (!onSave || !dirty || issues.length || saving) return;
    try {
      const result = await onSave(rows, changeSet, pending);
      if (result?.acceptedRowIds?.length) accept(result.acceptedRowIds);
      else if (!result?.acceptedRowIds) accept();
    } catch {
      // The owner reports API errors and may retry the rows that remain dirty.
    }
  };
  const expandAll = () => setExpandedIds(new Set(rows.filter((row) => row[fields.nodeTypeField] === 'FOLDER').map(nodeKey)));
  const collapseAll = () => setExpandedIds(new Set());
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('.ag-cell-inline-editing, input, select, textarea, button, [contenteditable="true"]')) return;
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const index = visibleRows.findIndex((view) => view.internalId === selectedId);
    if (event.key === 'ArrowRight' && selectedNodeId && visibleRows[index]?.hasChildren && !expandedIds.has(selectedNodeId)) { event.preventDefault(); toggleExpanded(selectedNodeId); return; }
    if (event.key === 'ArrowLeft' && selectedNodeId && expandedIds.has(selectedNodeId)) { event.preventDefault(); toggleExpanded(selectedNodeId); return; }
    let nextIndex = index;
    if (event.key === 'ArrowDown') nextIndex = Math.min(index + 1, visibleRows.length - 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(index - 1, 0);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = visibleRows.length - 1;
    if (nextIndex !== index && visibleRows[nextIndex]) { event.preventDefault(); selectRow(gridRows[nextIndex]); apiRef.current?.setFocusedCell(nextIndex, fields.nameField); }
  };

  return <section className="tree-data-grid" onKeyDown={onKeyDown} tabIndex={0} aria-label="Tree data grid">
    <div className="tree-grid-toolbar">
      <div className="tree-grid-actions">
        <ActionButton actionCode={COMMON_ACTIONS.CREATE} label={labels?.new ?? 'New'} disabled={saving} onClick={() => add(null)} />
        <ActionButton actionCode={COMMON_ACTIONS.CREATE} label={labels?.addChild ?? 'Add child'} disabled={!selectedRow || saving} onClick={addChild} />
        <ActionButton actionCode={COMMON_ACTIONS.CREATE} label={labels?.addSibling ?? 'Add sibling'} disabled={saving} onClick={addSibling} />
        <ActionButton actionCode={COMMON_ACTIONS.DELETE} label={labels?.delete ?? 'Delete'} tone="danger" disabled={!selectedRow || saving} onClick={deleteSelected} />
        <ActionButton actionCode={COMMON_ACTIONS.SAVE} label={saving ? '처리 중…' : labels?.save ?? 'Save'} tone="primary" disabled={!dirty || issues.length > 0 || saving} onClick={() => void save()} />
        <ActionButton actionCode={COMMON_ACTIONS.REVERT_CHANGES} label={labels?.cancel ?? 'Cancel'} disabled={!dirty || saving} onClick={() => { cancel(); onRowSelect?.(null); }} />
        <button type="button" className="action-button" disabled={saving} onClick={expandAll}>{labels?.expandAll ?? 'Expand all'}</button>
        <button type="button" className="action-button" disabled={saving} onClick={collapseAll}>{labels?.collapseAll ?? 'Collapse all'}</button>
      </div>
      <label className="tree-grid-search">{labels?.search ?? 'Search name or key'} <input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <button type="button" className="tree-grid-sort" onClick={() => setSortDirection((current) => current === 'ASC' ? 'DESC' : 'ASC')} aria-label={`Sort siblings ${sortDirection === 'ASC' ? 'descending' : 'ascending'}`}>{labels?.sort ?? `Sibling order ${sortDirection === 'ASC' ? '↑' : '↓'}`}</button>
    </div>
    <div className="tree-grid-table">
      <div className="basekit-ag-grid tree-grid-ag-grid"><AgGridReact<TreeViewRow<T>>
        modules={[AllCommunityModule]} theme={gridTheme} rowData={gridRows} columnDefs={columnDefs} getRowId={(params) => params.data.__GRID_ROW_ID}
        postSortRows={(params) => params.nodes.sort((left, right) => (left.data?.__TREE_ORDER ?? 0) - (right.data?.__TREE_ORDER ?? 0))}
        onGridReady={(event) => { apiRef.current = event.api; }} onRowClicked={(event) => event.data && selectRow(event.data)}
        getRowClass={(params) => params.data ? [params.data.__TREE_STATE !== 'NORMAL' ? `grid-${params.data.__TREE_STATE.toLowerCase()}-row` : '', selectedId === params.data.__GRID_ROW_ID ? 'basekit-current-row tree-grid-selected-row' : ''].filter(Boolean).join(' ') : ''}
        rowHeight={32} headerHeight={34} suppressCellFocus={false} suppressRowClickSelection
        overlayNoRowsTemplate={`<span>${emptyMessage}</span>`}
      /></div>
    </div>
    <div className="tree-grid-footer"><span>{rows.length} rows</span><span>{issues.length ? `${issues.length} validation issue(s)` : 'Validation passed'}</span><span>Sibling sort: {sortDirection}</span></div>
    {issues.length > 0 && <ul className="tree-grid-validation" role="alert">{[...new Set(issues.map((item) => item.message))].map((message) => <li key={message}>{message}</li>)}</ul>}
  </section>;
}

type TreeViewRow<T> = T & {
  __GRID_ROW_ID: string;
  __TREE_ID: string;
  __TREE_NODE_ID: string;
  __TREE_DEPTH: number;
  __TREE_HAS_CHILDREN: boolean;
  __TREE_EXPANDED: boolean;
  __TREE_ORDER: number;
  __TREE_STATE: string;
};
