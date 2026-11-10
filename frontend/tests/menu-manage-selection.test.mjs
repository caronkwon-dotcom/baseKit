import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness({ rows = [], settings = [], programs = [] } = {}) {
  const states = [], effects = [], calls = []; let index = 0; let treeChange = null; let treeProps = null;
  const react = {
    useState(initial) { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
    useRef(initial) { return { current: initial }; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: fn => effects.push(fn),
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../src/pages/MenuManagePage.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const require = id => id === 'react' ? react : id === 'react/jsx-runtime' ? { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
    : id.includes('menuApi') ? { menuApi: { find: async () => rows, get: async key => rows.find(row => row.MENU_KEY === key), update: async (key, value) => { calls.push(['menu-update', key, value]); return value; }, create: async value => { calls.push(['menu-create', value]); return value; }, delete: async () => {} } }
      : id.includes('programApi') ? { programApi: { find: async () => programs } }
        : id.includes('menuExecutionApi') ? { listMenuExecutionSettings: async () => settings, saveMenuExecutionSetting: async value => { calls.push(['execution-save', value]); settings = [...settings.filter(item => item.MENU_ID !== value.MENU_ID), value]; return value; } }
        : id.includes('components/treeDataGrid') ? { TreeDataGrid: props => {
          treeProps = props;
          const currentRows = treeChange?.rows ?? props.initialRows;
          const rowsForChange = nextRows => ({ rows: nextRows, changeSet: { INSERTED: [], UPDATED: [], DELETED: [] }, pending: [], dirty: false, issues: [] });
          const onSelect = row => { const next = rowsForChange(currentRows); treeChange = next; props.onChange(next); props.onRowSelect(row); };
          const addRoot = () => {
            const row = props.createRow(null, 0);
            const next = { rows: [...currentRows, row], changeSet: { INSERTED: [row], UPDATED: [], DELETED: [] }, pending: [{ rowId: 'NEW_ROOT', row, state: 'INSERTED' }], dirty: true, issues: [] };
            treeChange = next; props.onChange(next); props.onRowSelect(row);
          };
          const treeItems = currentRows.map(row => {
            let depth = 1; let parent = row.PARENT_MENU_KEY;
            while (parent) { depth++; parent = currentRows.find(item => item.MENU_KEY === parent)?.PARENT_MENU_KEY ?? null; }
            return { type: 'div', props: { role: 'treeitem', 'aria-level': depth, onClick: () => onSelect(row), children: row.MENU_NAME } };
          });
          return { type: 'div', props: { children: [
            { type: 'button', props: { children: props.labels.new, onClick: addRoot } },
            ...treeItems,
          ] } };
        } }
          : id.includes('ActionButton') ? { __esModule: true, default: props => ({ type: 'button', props: { ...props, children: props.label } }) }
            : id.includes('PageHeader') ? { __esModule: true, default: props => props.rightContent }
              : id.includes('FormField') ? { __esModule: true, default: props => props.children }
                : { __esModule: true, default: () => null };
  vm.runInNewContext(source, { exports, require, Error, Event: class {}, window: { dispatchEvent: () => true, setTimeout: callback => { callback(); return 1; }, clearTimeout: () => {} }, Map, Set, Math });
  const render = () => { index = 0; return exports.default(); };
  const nodes = node => { if (!node || typeof node !== 'object') return []; if (typeof node.type === 'function') return nodes(node.type(node.props)); return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]; };
  return { states, effects, render, nodes, calls, get treeChange() { return treeChange; }, get treeProps() { return treeProps; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('empty DB exposes a root menu action and adds a top-level PAGE row', async () => {
  const h = harness(); const page = h.render(); h.effects.forEach(effect => effect()); await tick();
  const updated = h.render();
  const buttons = h.nodes(updated).filter(node => node.type === 'button');
  assert.ok(buttons.some(button => button.props.children === '최상위 추가'));
  buttons.find(button => button.props.children === '최상위 추가').props.onClick();
  h.render();
  assert.equal(h.treeChange.pending[0].state, 'INSERTED');
  assert.equal(h.treeChange.rows[0].MENU_TYPE_CODE, 'PAGE');
  assert.equal(h.treeChange.rows[0].PARENT_MENU_KEY, null);
  assert.ok(page);
});

test('execution settings are projected to root rows and child rows inherit the root setting', async () => {
  const root = { MENU_KEY: 'SYS', MENU_NAME: 'System', MENU_TYPE_CODE: 'FOLDER', PARENT_MENU_KEY: null, PROGRAM_KEY: null, SORT_ORDER: 0, USE_YN: 'Y' };
  const child = { MENU_KEY: 'SYS.PAGE', MENU_NAME: 'Page', MENU_TYPE_CODE: 'PAGE', PARENT_MENU_KEY: 'SYS', PROGRAM_KEY: 'P1', SORT_ORDER: 0, USE_YN: 'Y' };
  const h = harness({ rows: [root, child], settings: [{ MENU_ID: 'SYS', EXECUTION_TYPE: 'WINDOW', DESIGN_TYPE: 'LINEAR' }] });
  h.nodes(h.render()); h.effects.forEach(effect => effect()); await tick(); h.nodes(h.render());
  assert.equal(h.treeProps.initialRows[0].EXECUTION_TYPE, 'WINDOW');
  assert.equal(h.treeProps.initialRows[0].DESIGN_TYPE, 'LINEAR');
  assert.equal(h.treeProps.initialRows[1].EXECUTION_TYPE, '');
  assert.equal(h.treeProps.initialRows[1].DESIGN_TYPE, '');
  const executionColumn = h.treeProps.columns.find(column => column.field === 'EXECUTION_TYPE');
  assert.equal(executionColumn.editable(root, 'NORMAL'), true);
  assert.equal(executionColumn.editable(child, 'NORMAL'), false);
  const inherited = executionColumn.renderEditor({ row: child, value: '', editable: false, onChange() {}, onFocus() {} });
  assert.equal(inherited.props.children, '1Depth 설정 상속');
  assert.ok(h.treeProps.columns.some(column => column.field === 'PROGRAM_KEY'));
});

test('root execution settings save through the existing API with menu changes', async () => {
  const root = { MENU_KEY: 'NEW.ROOT', MENU_NAME: 'New Root', MENU_TYPE_CODE: 'FOLDER', PARENT_MENU_KEY: null, PROGRAM_KEY: null, SORT_ORDER: 0, USE_YN: 'Y' };
  const h = harness({ rows: [root], settings: [{ MENU_ID: 'NEW.ROOT', EXECUTION_TYPE: 'INNER', DESIGN_TYPE: 'BASEKIT' }] });
  h.nodes(h.render()); h.effects.forEach(effect => effect()); await tick(); h.nodes(h.render());
  const row = { ...h.treeProps.initialRows[0], EXECUTION_TYPE: 'WINDOW', DESIGN_TYPE: 'LINEAR' };
  await h.treeProps.onSave([row], { INSERTED: [], UPDATED: [row], DELETED: [] }, [{ rowId: 'root-id', row, state: 'UPDATED' }]);
  assert.ok(h.calls.some(([type, key]) => type === 'menu-update' && key === 'NEW.ROOT'));
  assert.ok(h.calls.some(([type, value]) => type === 'execution-save' && value.MENU_ID === 'NEW.ROOT' && value.EXECUTION_TYPE === 'WINDOW' && value.DESIGN_TYPE === 'LINEAR'));
  assert.equal(h.nodes(h.render()).some(node => node.props?.['aria-label'] === '메뉴 실행 설정'), false);
});

test('tree Name column is pinned while other columns remain independently resizable', () => {
  const source = readFileSync(new URL('../src/components/treeDataGrid/TreeDataGrid.tsx', import.meta.url), 'utf8');
  assert.match(source, /headerName: 'Name',[\s\S]{0,140}pinned: 'left', lockPinned: true, resizable: true/);
  assert.match(source, /defaultColDef=\{\{ resizable: true \}\}/);
});
