import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTreeNodeIds, flattenTreeRows, getTreeSiblingSortOrder, validateTreeRows } from '../src/components/treeDataGrid/treeDataGridModel.ts';

const fields = { idField: 'id', parentIdField: 'parentId', nodeTypeField: 'type', nameField: 'name', sortField: 'order' };
const rows = [
  { id: 'root-b', parentId: '', type: 'FOLDER', name: 'Beta', order: 2 },
  { id: 'child-b', parentId: 'root-b', type: 'FOLDER', name: 'Child B', order: 2 },
  { id: 'leaf-b', parentId: 'child-b', type: 'LEAF', name: 'Needle', order: 1 },
  { id: 'root-a', parentId: '', type: 'FOLDER', name: 'Alpha', order: 1 },
  { id: 'child-a', parentId: 'root-a', type: 'LEAF', name: 'Child A', order: 1 },
];

test('flattens hierarchy in sibling order and hides descendants of collapsed folders', () => {
  const collapsed = flattenTreeRows(rows, fields, new Set());
  assert.deepEqual(collapsed.map((row) => row.id), ['root-a', 'root-b']);
  const expanded = flattenTreeRows(rows, fields, new Set(['root-a', 'root-b', 'child-b']));
  assert.deepEqual(expanded.map((row) => [row.id, row.depth]), [
    ['root-a', 1], ['child-a', 2], ['root-b', 1], ['child-b', 2], ['leaf-b', 3],
  ]);
});

test('sorts siblings without changing parent-child placement', () => {
  const descending = flattenTreeRows(rows, fields, new Set(['root-a', 'root-b']), 'DESC');
  assert.deepEqual(descending.filter((row) => row.depth === 1).map((row) => row.id), ['root-b', 'root-a']);
  assert.equal(descending.find((row) => row.id === 'child-b').depth, 2);
});

test('filters by name or identifier and includes ancestor path expanded', () => {
  const filter = filterTreeNodeIds(rows, fields, 'needle');
  assert.deepEqual([...filter.visibleIds].sort(), ['child-b', 'leaf-b', 'root-b']);
  assert.deepEqual([...filter.forcedExpandedIds], ['child-b', 'root-b']);
  assert.deepEqual(flattenTreeRows(rows, fields, new Set(), 'ASC', filter).map((row) => row.id), ['root-b', 'child-b', 'leaf-b']);
});

test('validates required fields, duplicate keys, invalid parent, cycles and maximum depth', () => {
  const invalid = [
    { id: 'folder', parentId: 'leaf', type: 'FOLDER', name: 'Folder', order: 1 },
    { id: 'leaf', parentId: 'folder', type: 'LEAF', name: 'Leaf', order: 1 },
    { id: 'leaf', parentId: 'missing', type: 'LEAF', name: '', order: -1 },
    { id: 'depth-1', parentId: '', type: 'FOLDER', name: 'One', order: 1 },
    { id: 'depth-2', parentId: 'depth-1', type: 'FOLDER', name: 'Two', order: 1 },
    { id: 'depth-3', parentId: 'depth-2', type: 'FOLDER', name: 'Three', order: 1 },
    { id: 'too-deep', parentId: 'depth-3', type: 'LEAF', name: 'Deep', order: 1 },
  ];
  const issues = validateTreeRows(invalid, fields, () => 'NORMAL', 3);
  const codes = new Set(issues.map((issue) => issue.code));
  assert.ok(codes.has('DUPLICATE_KEY'));
  assert.ok(codes.has('PARENT_MISSING'));
  assert.ok(codes.has('PARENT_NOT_FOLDER'));
  assert.ok(codes.has('CYCLE'));
  assert.ok(codes.has('MAX_DEPTH'));
  assert.ok(codes.has('REQUIRED'));
});

test('allocates the next integer order among siblings only', () => {
  assert.equal(getTreeSiblingSortOrder(rows, fields, 'root-b'), 3);
  assert.equal(getTreeSiblingSortOrder(rows, fields, 'no-children'), 0);
});

test('keeps a row with a missing business key visible by its internal row id', () => {
  const invalid = [{ __GRID_ROW_ID: 'NEW_0', id: '', parentId: '', type: 'FOLDER', name: 'Draft', order: 0 }];
  const flattened = flattenTreeRows(invalid, fields, new Set());
  assert.equal(flattened[0].id, 'NEW_0');
  assert.ok(validateTreeRows(invalid, fields, () => 'INSERTED').some((issue) => issue.field === 'id'));
});

test('supports domain-specific leaf node names while retaining folder parent rules', () => {
  const menuFields = { ...fields, nodeTypes: ['FOLDER', 'PAGE'] };
  const menuRows = [
    { id: 'folder', parentId: '', type: 'FOLDER', name: 'System', order: 1 },
    { id: 'page', parentId: 'folder', type: 'PAGE', name: 'Menu', order: 1 },
  ];
  assert.deepEqual(validateTreeRows(menuRows, menuFields, () => 'NORMAL', 3), []);
  assert.ok(validateTreeRows(menuRows, fields, () => 'NORMAL', 3).some((item) => item.code === 'NODE_TYPE'));
  assert.ok(validateTreeRows([{ ...menuRows[1], parentId: 'page' }], menuFields, () => 'NORMAL', 3).some((item) => item.code === 'PARENT_NOT_FOLDER'));
});
