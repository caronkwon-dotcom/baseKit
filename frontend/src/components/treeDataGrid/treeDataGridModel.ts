import type { GridRowState } from '../grid/gridRowState';

export type TreeDataNodeType = 'FOLDER' | 'LEAF';
export type TreeSortDirection = 'ASC' | 'DESC';

export interface TreeDataGridFields {
  idField: string;
  parentIdField: string;
  nodeTypeField: string;
  nameField: string;
  sortField: string;
}

export interface TreeDataGridRowView<T> {
  row: T;
  id: string;
  internalId: string;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}

export interface TreeDataGridIssue {
  code: 'REQUIRED' | 'DUPLICATE_KEY' | 'PARENT_MISSING' | 'PARENT_NOT_FOLDER' | 'CYCLE' | 'MAX_DEPTH' | 'NODE_TYPE';
  rowId: string;
  field: string;
  message: string;
}

const valueAt = (row: unknown, field: string) => String((row as Record<string, unknown>)[field] ?? '').trim();
const parentAt = (row: unknown, field: string) => valueAt(row, field) || null;
const nodeIdAt = (row: unknown, field: string) => valueAt(row, field) || String((row as Record<string, unknown>).__GRID_ROW_ID ?? '');

function compareSibling<T>(left: T, right: T, fields: TreeDataGridFields, direction: TreeSortDirection) {
  const leftValue = (left as Record<string, unknown>)[fields.sortField];
  const rightValue = (right as Record<string, unknown>)[fields.sortField];
  const leftNumber = Number(leftValue);
  const rightNumber = Number(rightValue);
  const order = Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
    ? leftNumber - rightNumber
    : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, { numeric: true });
  return (order || valueAt(left, fields.idField).localeCompare(valueAt(right, fields.idField))) * (direction === 'ASC' ? 1 : -1);
}

export function filterTreeNodeIds<T>(rows: T[], fields: TreeDataGridFields, query: string) {
  const visibleIds = new Set(rows.map((row) => nodeIdAt(row, fields.idField)));
  const forcedExpandedIds = new Set<string>();
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return { visibleIds, forcedExpandedIds };

  const byId = new Map(rows.map((row) => [nodeIdAt(row, fields.idField), row]));
  const matchingIds = rows
    .filter((row) => [fields.nameField, fields.idField].some((field) => valueAt(row, field).toLocaleLowerCase().includes(normalizedQuery)))
    .map((row) => nodeIdAt(row, fields.idField));
  visibleIds.clear();
  matchingIds.forEach((id) => {
    let currentId: string | null = id;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      visibleIds.add(currentId);
      const current = byId.get(currentId);
      const parentId = current ? parentAt(current, fields.parentIdField) : null;
      if (!parentId || !byId.has(parentId)) break;
      forcedExpandedIds.add(parentId);
      currentId = parentId;
    }
  });
  return { visibleIds, forcedExpandedIds };
}

export function flattenTreeRows<T>(
  rows: T[], fields: TreeDataGridFields, expandedIds: ReadonlySet<string>, direction: TreeSortDirection = 'ASC',
  filter?: { visibleIds: ReadonlySet<string>; forcedExpandedIds: ReadonlySet<string> },
): TreeDataGridRowView<T>[] {
  const childrenByParent = new Map<string | null, T[]>();
  rows.forEach((row) => {
    const parentId = parentAt(row, fields.parentIdField);
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), row]);
  });
  childrenByParent.forEach((siblings) => siblings.sort((left, right) => compareSibling(left, right, fields, direction)));
  const result: TreeDataGridRowView<T>[] = [];
  const visited = new Set<string>();
  const rootedIds = new Set<string>();
  const markRooted = (parentId: string | null) => (childrenByParent.get(parentId) ?? []).forEach((row) => {
    const id = nodeIdAt(row, fields.idField);
    if (!id || rootedIds.has(id)) return;
    rootedIds.add(id);
    markRooted(id);
  });
  markRooted(null);
  const visit = (parentId: string | null, depth: number) => {
    (childrenByParent.get(parentId) ?? []).forEach((row) => {
      const id = nodeIdAt(row, fields.idField);
      if (!id || visited.has(id) || (filter && !filter.visibleIds.has(id))) return;
      visited.add(id);
      const children = childrenByParent.get(id) ?? [];
      const folder = valueAt(row, fields.nodeTypeField) === 'FOLDER';
      const expanded = folder && (expandedIds.has(id) || Boolean(filter?.forcedExpandedIds.has(id)));
      result.push({ row, id, internalId: String((row as Record<string, unknown>).__GRID_ROW_ID ?? id), depth, hasChildren: folder && children.length > 0, expanded });
      if (expanded) visit(id, depth + 1);
    });
  };
  visit(null, 1);
  // Keep malformed orphaned and cyclic records visible so they can be repaired.
  rows.filter((row) => !rootedIds.has(nodeIdAt(row, fields.idField)))
    .sort((left, right) => compareSibling(left, right, fields, direction))
    .forEach((row) => {
      const id = nodeIdAt(row, fields.idField);
      if (!id || visited.has(id) || (filter && !filter.visibleIds.has(id))) return;
      visited.add(id);
      const folder = valueAt(row, fields.nodeTypeField) === 'FOLDER';
      result.push({ row, id, internalId: String((row as Record<string, unknown>).__GRID_ROW_ID ?? id), depth: 1, hasChildren: folder && (childrenByParent.get(id) ?? []).length > 0, expanded: folder && expandedIds.has(id) });
      if (expandedIds.has(id)) visit(id, 2);
    });
  return result;
}

export function validateTreeRows<T>(rows: T[], fields: TreeDataGridFields, getRowState: (row: T) => GridRowState, maxDepth = 3) {
  const activeRows = rows.filter((row) => getRowState(row) !== 'DELETED');
  const issues: TreeDataGridIssue[] = [];
  const byId = new Map<string, T>();
  const idCounts = new Map<string, number>();
  activeRows.forEach((row) => {
    const id = valueAt(row, fields.idField);
    if (id) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
    if (id && !byId.has(id)) byId.set(id, row);
  });
  activeRows.forEach((row) => {
    const id = valueAt(row, fields.idField);
    const rowId = id || String((row as Record<string, unknown>).__GRID_ROW_ID ?? '');
    const name = valueAt(row, fields.nameField);
    const nodeType = valueAt(row, fields.nodeTypeField);
    const parentId = parentAt(row, fields.parentIdField);
    const sortRaw = String((row as Record<string, unknown>)[fields.sortField] ?? '').trim();
    const sortValue = Number(sortRaw);
    if (!id) issues.push({ code: 'REQUIRED', rowId, field: fields.idField, message: 'Identifier is required.' });
    if (!name) issues.push({ code: 'REQUIRED', rowId, field: fields.nameField, message: 'Name is required.' });
    if (id && (idCounts.get(id) ?? 0) > 1) issues.push({ code: 'DUPLICATE_KEY', rowId, field: fields.idField, message: `Duplicate identifier: ${id}` });
    if (nodeType !== 'FOLDER' && nodeType !== 'LEAF') issues.push({ code: 'NODE_TYPE', rowId, field: fields.nodeTypeField, message: 'Type must be FOLDER or LEAF.' });
    if (!sortRaw || !Number.isInteger(sortValue) || sortValue < 0) issues.push({ code: 'REQUIRED', rowId, field: fields.sortField, message: 'Sort order must be a non-negative integer.' });
    if (parentId && !byId.has(parentId)) issues.push({ code: 'PARENT_MISSING', rowId, field: fields.parentIdField, message: `Parent identifier not found: ${parentId}` });
    if (parentId && byId.has(parentId) && valueAt(byId.get(parentId), fields.nodeTypeField) !== 'FOLDER') {
      issues.push({ code: 'PARENT_NOT_FOLDER', rowId, field: fields.parentIdField, message: 'A child must have a FOLDER parent.' });
    }
    let currentId: string | null = id || null;
    const ancestors = new Set<string>();
    let depth = 0;
    let cycleDetected = false;
    while (currentId && byId.has(currentId)) {
      if (ancestors.has(currentId)) {
        issues.push({ code: 'CYCLE', rowId, field: fields.parentIdField, message: 'Circular parent reference detected.' });
        cycleDetected = true;
        break;
      }
      ancestors.add(currentId);
      depth += 1;
      currentId = parentAt(byId.get(currentId), fields.parentIdField);
    }
    if (!cycleDetected && depth > maxDepth) issues.push({ code: 'MAX_DEPTH', rowId, field: fields.parentIdField, message: `Maximum depth is ${maxDepth}.` });
  });
  return issues;
}

export function getTreeSiblingSortOrder<T>(rows: T[], fields: TreeDataGridFields, parentId: string | null) {
  const siblingOrders = rows.filter((row) => parentAt(row, fields.parentIdField) === parentId)
    .map((row) => Number((row as Record<string, unknown>)[fields.sortField])).filter(Number.isFinite);
  return siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
}
