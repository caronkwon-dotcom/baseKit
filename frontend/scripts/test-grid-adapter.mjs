import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';

const root = path.resolve(import.meta.dirname, '..');
const source = await readFile(path.join(root, 'src/components/grid/gridColumnAdapter.tsx'), 'utf8');
const target = path.join(root, 'node_modules/.tmp/gridColumnAdapter.test.mjs');
await mkdir(path.dirname(target), { recursive: true });
await writeFile(target, ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 } }).outputText);
const { toGridColumns } = await import(pathToFileURL(target).href);
const fields = [
  { key: 'COUNT', label: '수량', dataType: 'NUMBER', controlType: 'NUMBER', displayType: 'NUMBER', required: false },
  { key: 'LOGIN', label: '로그인', dataType: 'BOOLEAN', controlType: 'SWITCH', displayType: 'BOOLEAN', required: false },
  { key: 'COLOR', label: '색상', dataType: 'STRING', controlType: 'COLOR_PICKER', displayType: 'COLOR', required: false },
  { key: 'BADGE', label: '배지', dataType: 'STRING', controlType: 'SELECT', displayType: 'BADGE', required: true, options: [{ value: 'OK', label: '정상' }] },
];
const original = JSON.stringify(fields);
const fixed = [{ key: 'SORT_ORDER', header: '정렬', width: 48, render: row => row.SORT_ORDER }];
const metadata = { fields, getFieldValue: (row, field) => row.ATTRIBUTE_VALUES[field.key] };
const definitions = toGridColumns(fixed, metadata);
const get = (column, values) => column.valueGetter({ data: { SORT_ORDER: 12, ATTRIBUTE_VALUES: values } });
assert.equal(get(definitions[0], {}), 12, 'fixed numeric sort uses number');
assert.equal(get(definitions[1], { COUNT: '10' }), 10, 'dynamic numeric sort uses number');
assert.equal(get(definitions[1], { COUNT: '0' }), 0, 'zero is preserved');
assert.equal(get(definitions[1], { COUNT: '' }), null, 'empty numeric values stay empty');
assert.equal(get(definitions[2], { LOGIN: 'false' }), false, 'boolean false is preserved');
assert.equal(definitions[2].cellRenderer({ value: false }), '아니오');
assert.match(renderToStaticMarkup(definitions[3].cellRenderer({ value: '#123456' })), /background:#123456/);
assert.match(renderToStaticMarkup(definitions[4].cellRenderer({ value: 'OK' })), /정상/);
assert.equal(definitions[4].cellEditor, 'agSelectCellEditor', 'Community select editor');
assert.ok(definitions.every(column => !column.editable), 'production wrapper is read-only by default');
const editable = toGridColumns(fixed, metadata, { keys: ['ATTRIBUTE_LOGIN'], onChange() {} });
assert.equal(editable[2].editable, true);
assert.equal(editable[2].cellEditor, 'agCheckboxCellEditor');
assert.equal(editable[0].editable, false);
assert.equal(toGridColumns(fixed, { ...metadata, fields: fields.slice(0, 1) }).length, 2, 'metadata removal rebuilds columns');
assert.equal(JSON.stringify(fields), original, 'FieldDefinition inputs are not mutated');
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'));
assert.ok(!Object.keys(lock.packages).some(key => /ag-grid-enterprise|ag-charts-enterprise/.test(key)), 'no Enterprise package');
assert.equal(lock.packages['node_modules/ag-grid-community'].version, '36.2.0');
assert.equal(lock.packages['node_modules/ag-grid-react'].version, '36.2.0');
console.log('PASS: 18 adapter/metadata/Community dependency assertions (not a browser performance test).');
