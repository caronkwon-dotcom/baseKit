import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.resolve(import.meta.dirname, '..');
const server = await createServer({
  root,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true }, appType: 'custom',
});

try {
  // Load the same adapter module imported by the production BaseKitDataGrid.
  const { toGridColumns, canEditGridCell } = await server.ssrLoadModule('/src/components/grid/gridColumnAdapter.tsx');
  const { toMetadataColumnKey, fromMetadataColumnKey } = await server.ssrLoadModule('/src/components/grid/metadataColumnKey.ts');
  const number = { key: 'COUNT', label: '수량', dataType: 'NUMBER', controlType: 'NUMBER', displayType: 'NUMBER', required: false };
  const switchField = { key: 'LOGIN', label: '로그인', dataType: 'STRING', controlType: 'SWITCH', displayType: 'BOOLEAN', required: false, options: [{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] };
  const color = { key: 'COLOR', label: '색상', dataType: 'STRING', controlType: 'COLOR_PICKER', displayType: 'COLOR', required: false };
  const select = { key: 'TYPE', label: '유형', dataType: 'STRING', controlType: 'SELECT', displayType: 'BADGE', required: true, options: [{ value: 'OK', label: '정상' }] };
  const limitedText = { key: 'TEXT', label: '설명', dataType: 'STRING', controlType: 'TEXT', displayType: 'TEXT', required: true, maxLength: 20 };
  const fields = [number, switchField, color, select, limitedText];
  const originalFields = JSON.stringify(fields);
  const columns = [
    { key: 'ID', header: 'ID', editPolicy: 'insert-only', fieldDefinition: limitedText, render: row => row.ID },
    { key: 'ATTRIBUTE_CODE', header: '속성코드', fieldDefinition: limitedText, render: row => row.ATTRIBUTE_CODE },
    { key: 'SORT_ORDER', header: '정렬', fieldDefinition: number, render: row => row.SORT_ORDER },
  ];
  const row = { ID: '1', ATTRIBUTE_CODE: 'FIXED', SORT_ORDER: 12, ATTRIBUTE_VALUES: { COUNT: '10', LOGIN: 'N', COLOR: '#123456', TYPE: 'OK', TEXT: 'hello' } };
  const options = {
    columns, fields, getFieldValue: (item, field) => item.ATTRIBUTE_VALUES[field.key],
    getRowState: () => 'NORMAL',
    validationClass: (_row, _key, field) => field?.required ? 'basekit-invalid-cell' : '',
    changeSwitch: () => {},
  };
  const definitions = toGridColumns(options);
  const byId = (id) => definitions.find(column => column.colId === id);
  const cell = (column, data = row) => ({ data, value: column.valueGetter({ data }), node: { data } });

  assert.equal(definitions[0].colId, '__GRID_ROW_STATE');
  for (const state of ['INSERTED', 'UPDATED', 'DELETED']) {
    const stateColumn = toGridColumns({ ...options, getRowState: () => state })[0];
    assert.match(renderToStaticMarkup(stateColumn.cellRenderer({ data: row })), new RegExp(`basekit-row-state-icon ${state.toLowerCase()}`));
  }
  assert.equal(byId('SORT_ORDER').valueGetter({ data: row }), 12);
  assert.equal(byId(toMetadataColumnKey('COUNT')).valueGetter({ data: row }), 10);
  assert.equal(byId(toMetadataColumnKey('COUNT')).valueGetter({ data: { ...row, ATTRIBUTE_VALUES: { COUNT: '2' } } }), 2);
  assert.equal(byId(toMetadataColumnKey('COUNT')).valueGetter({ data: { ...row, ATTRIBUTE_VALUES: { COUNT: '' } } }), '');
  assert.equal(byId(toMetadataColumnKey('COUNT')).cellEditor, 'agNumberCellEditor');
  assert.equal(byId(toMetadataColumnKey('COUNT')).cellClass(cell(byId(toMetadataColumnKey('COUNT')))).includes('basekit-grid-cell-right'), true);
  assert.equal(byId(toMetadataColumnKey('LOGIN')).cellClass(cell(byId(toMetadataColumnKey('LOGIN')))).includes('basekit-grid-cell-center'), true);
  assert.match(renderToStaticMarkup(byId(toMetadataColumnKey('LOGIN')).cellRenderer(cell(byId(toMetadataColumnKey('LOGIN'))))), /role="switch"/);
  assert.match(renderToStaticMarkup(byId(toMetadataColumnKey('COLOR')).cellRenderer(cell(byId(toMetadataColumnKey('COLOR'))))), /background:#123456/);
  assert.match(renderToStaticMarkup(byId(toMetadataColumnKey('TYPE')).cellRenderer(cell(byId(toMetadataColumnKey('TYPE'))))), /정상/);
  assert.equal(byId(toMetadataColumnKey('TYPE')).cellEditor, 'agSelectCellEditor');
  assert.deepEqual(byId(toMetadataColumnKey('TYPE')).cellEditorParams.values, ['OK']);
  assert.equal(byId(toMetadataColumnKey('TEXT')).cellEditorParams.maxLength, 20);
  assert.equal(typeof byId(toMetadataColumnKey('TEXT')).cellEditor, 'function');
  assert.match(byId(toMetadataColumnKey('TYPE')).tooltipValueGetter({ value: 'INVALID' }), /선택 가능한 값이 아닙니다/);
  assert.ok(definitions.every(column => column.editable === undefined || !column.editable({ data: row })), 'editing is opt-in');
  assert.equal(fromMetadataColumnKey('ATTRIBUTE_CODE'), null, 'fixed business keys are not metadata columns');
  assert.equal(fromMetadataColumnKey(toMetadataColumnKey('CODE')), 'CODE', 'dynamic CODE does not collide with ATTRIBUTE_CODE');

  const editing = { keys: ['ID', 'ATTRIBUTE_CODE', 'SORT_ORDER', ...fields.map(field => toMetadataColumnKey(field.key))], onChange() {} };
  const editable = toGridColumns({ ...options, editing });
  const editableById = (id) => editable.find(column => column.colId === id);
  assert.equal(editableById('ID').editable(cell(editableById('ID'))), false, 'existing key is read-only');
  assert.equal(canEditGridCell(row, 'ID', editing, () => 'INSERTED', 'insert-only'), true, 'inserted key is editable');
  assert.equal(canEditGridCell(row, 'ID', editing, () => 'DELETED', 'insert-only'), false, 'deleted row is read-only');
  assert.equal(canEditGridCell(row, 'ID', editing, () => 'INSERTED', 'read-only'), false, 'read-only policy takes precedence');
  assert.equal(canEditGridCell(row, 'ID', { ...editing, isEditable: () => false }, () => 'INSERTED', 'insert-only'), false, 'caller edit guard is respected');
  assert.equal(editableById('ATTRIBUTE_CODE').editable(cell(editableById('ATTRIBUTE_CODE'))), true);
  assert.equal(editableById(toMetadataColumnKey('TYPE')).editable(cell(editableById(toMetadataColumnKey('TYPE')))), true);
  assert.equal(editableById(toMetadataColumnKey('LOGIN')).editable(cell(editableById(toMetadataColumnKey('LOGIN')))), false, 'switch uses its renderer');
  assert.match(editableById(toMetadataColumnKey('TEXT')).cellClass(cell(editableById(toMetadataColumnKey('TEXT')))), /basekit-editable-cell.*basekit-invalid-cell/);
  assert.equal(toGridColumns({ ...options, fields: fields.slice(0, 1) }).length, columns.length + 2, 'metadata removal rebuilds columns');
  assert.equal(JSON.stringify(fields), originalFields, 'FieldDefinition inputs are not mutated');

  const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
  assert.ok(!Object.keys(lock.packages).some(key => /ag-grid-enterprise|ag-charts-enterprise/.test(key)));
  assert.equal(lock.packages['node_modules/ag-grid-community'].version, '36.2.0');
  assert.equal(lock.packages['node_modules/ag-grid-react'].version, '36.2.0');
  console.log('PASS: production Grid Column Adapter, editing policies, metadata keys, renderers, validation and Community dependencies.');
} finally {
  await server.close();
}
