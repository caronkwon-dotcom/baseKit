import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as XLSX from 'xlsx';

const require = createRequire(import.meta.url);
function load(relative, mocks = {}) {
  const file = new URL(relative, import.meta.url);
  const output = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.endsWith('.css')) return {};
    if (name.startsWith('.')) return load(new URL(`${name}.ts`, file).href, mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', output)(localRequire, module, module.exports);
  return module.exports;
}
const { parseExcelFile } = load('../src/components/common/excel/excelParser.ts');
const columns = [{ key: 'NAME', header: '이름', required: true }, { key: 'NOTE', header: '메모' }];
function file(matrix, origin = 'A1', second) {
  const workbook = XLSX.utils.book_new();
  const sheet = {};
  XLSX.utils.sheet_add_aoa(sheet, matrix, { origin });
  const range = XLSX.utils.decode_range(sheet['!ref']);
  range.s = XLSX.utils.decode_cell(origin);
  sheet['!ref'] = XLSX.utils.encode_range(range);
  XLSX.utils.book_append_sheet(workbook, sheet, '첫째');
  if (second) XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(second), '둘째');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return { name: 'test.xlsx', arrayBuffer: async () => buffer };
}
test('first sheet, sparse physical row numbers and mapper inputs preserve raw values', async () => {
  const seen = [];
  const result = await parseExcelFile(file([['이름', '메모'], ['A', 123], [], ['B', false]], 'A3', [['wrong']]), columns,
    (values, row) => { seen.push(row); return values.NAME === 'B' ? ['업무 오류'] : []; });
  assert.deepEqual(result.rows.map(row => row.rowNumber), [4, 6]);
  assert.deepEqual(seen, [4, 6]);
  assert.equal(result.rows[0].values.NOTE, 123);
  assert.equal(result.rows[1].values.NOTE, false);
  assert.equal(result.rows[1].status, 'ERROR');
  assert.deepEqual(result.headers, ['이름', '메모']);
});
test('headers trim, reject duplicate/missing/unknown; explicit ignore only skips unknown', async () => {
  const bad = await parseExcelFile(file([[' 메모 ', '메모', 'extra'], ['x', 'y', 'z']]), columns);
  assert.equal(bad.headerErrors.length, 3);
  assert.deepEqual(bad.rows[0].errors, ['이름: 필수값 누락']);
  const good = await parseExcelFile(file([[' 이름 ', 'extra'], ['A', 'ignored']]), columns, undefined, 'ignore');
  assert.deepEqual(good.headerErrors, []);
  assert.deepEqual(good.rows[0].values, { NAME: 'A', NOTE: '' });
  await assert.rejects(parseExcelFile({ arrayBuffer: async () => { throw Error('읽기 실패'); } }, columns), /읽기 실패/);
});

// Execute the actual component handlers with a minimal hook host; no DOM claims.
function host(parse, extra = {}) {
  const slots = []; let cursor = 0;
  const react = {
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
    useRef: initial => { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useEffect: () => {},
  };
  const jsx = (type, props) => ({ type, props });
  const Component = load('../src/components/common/excel/ExcelImportDialog.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, '../FormModal': { __esModule: true, default: 'modal' },
    '../DataTable': { __esModule: true, default: 'table' }, './excelParser': { parseExcelFile: parse },
  }).default;
  const props = { open: true, columns, mapRow: (values, rowNumber) => ({ ...values, rowNumber }), onClose: () => {}, onImport: () => {}, ...extra };
  const render = () => { cursor = 0; return Component(props); };
  const find = (node, type) => {
    if (!node) return undefined;
    if (Array.isArray(node)) return node.map(child => find(child, type)).find(Boolean);
    return node.type === type ? node : find(node.props?.children, type);
  };
  const choose = name => find(render(), 'input').props.onChange({ target: { files: [{ name }], value: name } });
  return { render, find, choose };
}
const valid = { headers: ['이름'], headerErrors: [], rows: [{ rowNumber: 2, values: { NAME: 'A' }, status: 'VALID', errors: [] }] };
const flush = () => new Promise(resolve => setImmediate(resolve));
test('reselection clears old preview; parsing blocks selection, submit and close; success closes once', async () => {
  let resolve; let parses = 0; let closes = 0; let imports = 0; let finish;
  const h = host(() => { parses++; return parses === 1 ? Promise.resolve(valid) : new Promise(r => { resolve = r; }); }, {
    onClose: () => { closes++; }, onImport: () => { imports++; return new Promise(r => { finish = r; }); },
  });
  h.choose('first'); await flush();
  assert.equal(h.render().props.submitDisabled, false);
  const oldSubmit = h.render().props.onSubmit;
  h.choose('second');
  assert.deepEqual(h.find(h.render(), 'table').props.rows, []);
  h.choose('third'); await oldSubmit(); h.render().props.onClose();
  assert.equal(parses, 2); assert.equal(imports, 0); assert.equal(closes, 0);
  resolve(valid); await flush();
  const submit = h.render().props.onSubmit;
  const first = submit(); await submit(); h.choose('fourth');
  assert.equal(imports, 1); assert.equal(parses, 2);
  finish(); await first;
  assert.equal(closes, 1);
  assert.deepEqual(h.find(h.render(), 'table').props.rows, []);
});
test('header errors, disabled and rejected imports never close; failure allows explicit retry', async () => {
  let closes = 0; let imports = 0;
  const h = host(async () => valid, { title: '요구사항 Excel', submitLabel: '입력 반영', onClose: () => { closes++; }, onImport: async () => { imports++; throw Error('반영 실패'); } });
  h.choose('good'); await flush();
  assert.equal(h.render().props.title, '요구사항 Excel');
  assert.equal(h.render().props.submitLabel, '입력 반영');
  await h.render().props.onSubmit(); await h.render().props.onSubmit();
  assert.equal(imports, 2); assert.equal(closes, 0);
  const bad = host(async () => ({ ...valid, headerErrors: ['Header 오류'] }), { onImport: () => { imports++; } });
  bad.choose('bad'); await flush(); await bad.render().props.onSubmit();
  assert.equal(bad.render().props.submitDisabled, true); assert.equal(imports, 2);
  const disabled = host(async () => valid, { disabled: true, onImport: () => { imports++; } });
  disabled.choose('disabled'); await flush(); await disabled.render().props.onSubmit();
  assert.equal(imports, 2);
});
