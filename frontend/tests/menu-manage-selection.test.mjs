import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness({ rows = [], settings = [], programs = [] } = {}) {
  const states = [], effects = []; let index = 0;
  const react = {
    useState(initial) { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = typeof value === 'function' ? value(states[slot]) : value; }]; },
    useRef(initial) { return { current: initial }; },
    useMemo: fn => fn(), useEffect: fn => effects.push(fn),
  };
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../src/pages/MenuManagePage.tsx', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const require = id => id === 'react' ? react : id === 'react/jsx-runtime' ? { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
    : id.includes('menuApi') ? { menuApi: { find: async () => rows, get: async key => rows.find(row => row.MENU_KEY === key), update: async (key, value) => value, create: async value => value, delete: async () => {} } }
      : id.includes('programApi') ? { programApi: { find: async () => programs } }
        : id.includes('menuExecutionApi') ? { listMenuExecutionSettings: async () => settings, saveMenuExecutionSetting: async value => value }
          : id.includes('ActionButton') ? { __esModule: true, default: props => ({ type: 'button', props: { ...props, children: props.label } }) }
            : id.includes('PageHeader') ? { __esModule: true, default: props => props.rightContent }
              : id.includes('FormField') ? { __esModule: true, default: props => props.children }
                : { __esModule: true, default: () => null };
  vm.runInNewContext(source, { exports, require, Error, Event: class {}, window: { dispatchEvent: () => true }, Map, Set, Math });
  const render = () => { index = 0; return exports.default(); };
  const nodes = node => { if (!node || typeof node !== 'object') return []; if (typeof node.type === 'function') return nodes(node.type(node.props)); return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]; };
  return { states, effects, render, nodes };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('empty DB still exposes the new-menu action and a root menu form', async () => {
  const h = harness(); const page = h.render(); h.effects.forEach(effect => effect()); await tick();
  const updated = h.render();
  const buttons = h.nodes(updated).filter(node => node.type === 'button');
  assert.ok(buttons.some(button => button.props.children === '신규 메뉴'));
  buttons.find(button => button.props.children === '신규 메뉴').props.onClick();
  const editor = h.render();
  assert.equal(h.states[6], true);
  assert.equal(h.states[5].MENU_TYPE_CODE, 'FOLDER');
  assert.equal(h.states[5].PARENT_MENU_KEY, null);
  assert.ok(h.nodes(editor).some(node => node.type === 'input' && node.props.value === ''));
  assert.ok(page);
});

test('nested menu tree selects PAGE and resolves inherited execution setting from root', async () => {
  const root = { MENU_KEY: 'SYS', MENU_NAME: 'System', MENU_TYPE_CODE: 'FOLDER', PARENT_MENU_KEY: null, PROGRAM_KEY: null, SORT_ORDER: 0, USE_YN: 'Y' };
  const child = { MENU_KEY: 'SYS.PAGE', MENU_NAME: 'Page', MENU_TYPE_CODE: 'PAGE', PARENT_MENU_KEY: 'SYS', PROGRAM_KEY: 'P1', SORT_ORDER: 0, USE_YN: 'Y' };
  const h = harness({ rows: [root, child], settings: [{ MENU_ID: 'SYS', EXECUTION_TYPE: 'WINDOW', DESIGN_TYPE: 'LINEAR' }] });
  h.render(); h.effects.forEach(effect => effect()); await tick(); const page = h.render();
  const childButton = h.nodes(page).find(node => node.type === 'div' && node.props.role === 'treeitem' && node.props['aria-level'] === 2);
  assert.ok(childButton);
  await childButton.props.onClick(); h.render();
  assert.equal(h.states[2], 'SYS.PAGE');
  assert.equal(h.states[8].MENU_ID, 'SYS');
  assert.equal(h.states[8].DESIGN_TYPE, 'LINEAR');
});

test('new root outside the execution settings catalog stays on the default and cannot save settings', async () => {
  const root = { MENU_KEY: 'NEW.ROOT', MENU_NAME: 'New Root', MENU_TYPE_CODE: 'FOLDER', PARENT_MENU_KEY: null, PROGRAM_KEY: null, SORT_ORDER: 0, USE_YN: 'Y' };
  const h = harness({ rows: [root] });
  h.render(); h.effects.forEach(effect => effect()); await tick(); const page = h.render();
  const rootButton = h.nodes(page).find(node => node.type === 'div' && node.props.role === 'treeitem' && node.props['aria-level'] === 1);
  await rootButton.props.onClick(); const selected = h.render();
  const executionSelects = h.nodes(selected).filter(node => node.type === 'select' && node.props.value === 'INNER');
  assert.equal(executionSelects.length, 1);
  assert.equal(executionSelects[0].props.disabled, true);
  assert.equal(h.nodes(selected).filter(node => node.type === 'button' && node.props.actionCode === 'SAVE').length, 1);
});
