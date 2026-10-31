import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const flush = () => new Promise(resolve => setImmediate(resolve));
const role = id => ({ ROLE_ID: id, ROLE_CODE: id, ROLE_NAME: id, DESCRIPTION: null, USE_YN: 'Y' });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const permission = allow => ({ PROGRAMS: [{ PROGRAM_ID: 'P', ALLOW_YN: allow }], BUTTON_GROUPS: [] });

// Execute real component effects and event handlers with controlled API promises.
// This verifies request ordering and save guards; it does not emulate a browser DOM.
function host(overrides = {}, groupOverrides = {}) {
  const slots = []; let cursor = 0; let pending = [];
  const calls = [];
  const api = {
    find: async () => [role('A'), role('B')],
    permissions: async () => permission('N'),
    savePermissions: async (...args) => { calls.push(args); return args[1]; },
    ...overrides,
  };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useMemo: fn => fn(),
    useEffect(fn, deps) {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) {
        previous?.cleanup?.();
        const entry = { deps, cleanup: undefined }; slots[index] = entry;
        pending.push(() => { entry.cleanup = fn(); });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '../components/common/DataTable': { __esModule: true, default: 'data-table' },
    '../components/common/PageHeader': { __esModule: true, default: 'page-header' },
    '../components/common/FormModal': { __esModule: true, default: 'modal' },
    '../services/roleApi': { roleApi: api },
    '../services/programApi': { programApi: {
      find: async () => [{ PROGRAM_ID: 'P', PROGRAM_NAME: 'Program', MODULE_CODE: 'CORE' }],
      groups: async () => [], ...groupOverrides,
    } },
  };
  const output = ts.transpileModule(readFileSync(new URL('../src/pages/RoleManagePage.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', output)(name => {
    assert.ok(name in mocks, name); return mocks[name];
  }, module, module.exports);
  const Component = module.exports.default;
  const render = () => { cursor = 0; const tree = Component(); const effects = pending; pending = []; effects.forEach(fn => fn()); return tree; };
  const all = (node, match) => {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(child => all(child, match));
    return [...(match(node) ? [node] : []), ...all(node.props?.children, match)];
  };
  const table = () => all(render(), n => n.type === 'data-table')[0];
  const select = id => { const t = table(); t.props.onRowClick(t.props.rows.find(r => r.ROLE_ID === id)); render(); };
  const save = () => all(render(), n => n.type === 'button' && ['권한 저장', '저장 중…'].includes(n.props.children))[0];
  const checkbox = () => all(render(), n => n.type === 'input' && n.props.type === 'checkbox')[0];
  return { render, table, select, save, checkbox, calls };
}

test('initial loading settles and an empty permission response defaults to denied', async () => {
  const h = host({ permissions: async () => ({ PROGRAMS: [], BUTTON_GROUPS: [] }) });
  assert.match(h.table().props.emptyMessage, /조회/);
  await flush(); h.select('A');
  assert.equal(h.save().props.disabled, true);
  await flush();
  assert.equal(h.save().props.disabled, false);
  assert.equal(h.checkbox().props.checked, false);
  await h.save().props.onClick();
  assert.equal(h.calls[0][0], 'A');
  assert.equal(h.calls[0][1].PROGRAMS[0].ALLOW_YN, 'N');
});

test('role switches discard stale responses and permission failures block saving', async () => {
  const a = deferred(), b = deferred();
  const h = host({ permissions: id => id === 'A' ? a.promise : b.promise });
  h.render(); await flush(); h.select('A'); h.select('B');
  a.resolve(permission('Y')); await flush();
  assert.equal(h.checkbox().props.checked, false);
  assert.equal(h.save().props.disabled, true);
  b.reject(Error('조회 실패')); await flush();
  assert.equal(h.save().props.disabled, true);
  await h.save().props.onClick();
  assert.equal(h.calls.length, 0);
});

test('a pending permission save keeps the selected role fixed', async () => {
  const saving = deferred();
  const h = host({ savePermissions: () => saving.promise });
  h.render(); await flush(); h.select('A'); await flush();
  const request = h.save().props.onClick();
  h.select('B');
  assert.deepEqual([...h.table().props.selectedRowKeys], ['A']);
  saving.resolve(permission('Y')); await request; await flush();
  assert.equal(h.checkbox().props.checked, true);
});

test('button group lookup failures leave the catalog unavailable instead of allowing partial saves', async () => {
  const h = host({}, { groups: async () => { throw Error('그룹 조회 실패'); } });
  h.render(); await flush();
  assert.deepEqual(h.table().props.rows, []);
  assert.equal(h.save(), undefined);
});
