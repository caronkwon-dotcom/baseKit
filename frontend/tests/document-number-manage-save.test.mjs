import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(seed = []) {
  const hookState = [], effects = [], calls = [];
  let hookIndex = 0, gridRows = [], rowStates = new Map(), sequence = 0, gridProps;
  let rules = structuredClone(seed);
  const api = {
    list: async () => structuredClone(rules),
    create: async value => {
      calls.push(['create', structuredClone(value)]);
      const saved = { ...value, RULE_VERSION: 1, CURRENT_VALUE: 0, REG_DT: '', REG_BY: '', MOD_DT: '', MOD_BY: '' };
      rules.push(saved);
      return saved;
    },
    update: async (value, version) => {
      calls.push(['update', structuredClone(value), version]);
      rules = rules.map(rule => rule.RULE_KEY === value.RULE_KEY && rule.RULE_VERSION === version ? { ...rule, ...value } : rule);
      return rules.find(rule => rule.RULE_KEY === value.RULE_KEY && rule.RULE_VERSION === version);
    },
    preview: async () => ({ DOCUMENT_NUMBER: 'PRJ-2026-0001' }),
    history: async () => [],
  };
  const getKey = row => `${row.RULE_KEY}:${row.RULE_VERSION}`;
  const changeSet = () => {
    const changes = { INSERTED: [], UPDATED: [], DELETED: [] };
    for (const row of gridRows) {
      const state = rowStates.get(row.__GRID_ROW_ID);
      const { __GRID_ROW_ID: _id, ...value } = row;
      if (state === 'INSERTED') changes.INSERTED.push(value);
      if (state === 'UPDATED') changes.UPDATED.push(value);
    }
    return changes;
  };
  const grid = {
    get rows() { return gridRows; },
    replace(value) {
      gridRows = value.map(row => ({ ...structuredClone(row), __GRID_ROW_ID: getKey(row) || `NEW_${sequence++}` }));
      rowStates = new Map(gridRows.map(row => [row.__GRID_ROW_ID, 'NORMAL']));
    },
    add(value) {
      const row = { ...structuredClone(value), __GRID_ROW_ID: `NEW_${sequence++}` };
      gridRows = [...gridRows, row]; rowStates.set(row.__GRID_ROW_ID, 'INSERTED');
    },
    update(id, change) {
      gridRows = gridRows.map(row => {
        if (row.__GRID_ROW_ID !== id) return row;
        const next = change(row);
        if (rowStates.get(id) !== 'INSERTED') rowStates.set(id, JSON.stringify(next) === JSON.stringify(row) ? 'NORMAL' : 'UPDATED');
        return next;
      });
    },
    revert() {},
    getState: row => rowStates.get(row.__GRID_ROW_ID) ?? 'NORMAL',
    get changeSet() { return changeSet(); },
    get dirty() { const set = changeSet(); return set.INSERTED.length + set.UPDATED.length + set.DELETED.length > 0; },
  };
  const memo = (factory, deps) => {
    const index = hookIndex++, previous = hookState[index];
    if (previous && deps?.length === previous.deps.length && deps.every((dependency, i) => Object.is(dependency, previous.deps[i]))) return previous.value;
    const value = factory(); hookState[index] = { deps: deps ?? [], value }; return value;
  };
  const react = {
    useState(initial) { const index = hookIndex++; if (!(index in hookState)) hookState[index] = initial; return [hookState[index], value => { hookState[index] = typeof value === 'function' ? value(hookState[index]) : value; }]; },
    useRef(initial) { const index = hookIndex++; if (!(index in hookState)) hookState[index] = { current: initial }; return hookState[index]; },
    useMemo: (fn, deps) => memo(fn, deps), useCallback: (fn, deps) => memo(() => fn, deps), useEffect: fn => effects.push(fn), useLayoutEffect: fn => fn(),
  };
  const jsxRuntime = {
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  };
  const source = ts.transpileModule(readFileSync(new URL('../src/features/system/documentNumberManagement/DocumentNumberManagePage.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const require = id => id === 'react' ? react
    : id === 'react/jsx-runtime' ? jsxRuntime
      : id.includes('gridRowState') ? { useGridRowState: () => grid }
        : id.includes('documentNumberApi') ? { documentNumberApi: api }
          : id.includes('gridFieldValidation') ? { findGridValidationIssue: () => null, gridValidationIssueMessage: () => '' }
            : id.includes('documentNumberValidation') ? { validateDocumentNumberRule: draft => !draft.RULE_KEY.trim() ? { RULE_KEY: 'RULE KEY는 필수 입력값입니다.' } : {} }
              : id.includes('actionCodes') ? { COMMON_ACTIONS: { CREATE: 'CREATE', UPDATE: 'UPDATE', SAVE: 'SAVE', SEARCH: 'SEARCH', REVERT_CHANGES: 'REVERT_CHANGES' } }
                : id.includes('metadataRepository') ? { hasAction: () => true }
                  : id.includes('BaseKitDataGrid') ? { __esModule: true, default: props => {
                    gridProps = props;
                    return jsxRuntime.jsxs('div', { children: props.toolbarActions.map(action => jsxRuntime.jsx('button', {
                      children: action.label,
                      disabled: typeof action.disabled === 'function' ? action.disabled({ rows: props.rows, selectedRows: [] }) : action.disabled,
                      onClick: () => action.onClick({ rows: props.rows, selectedRows: [] }),
                    })) });
                  } }
                    : { __esModule: true, default: () => null };
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, require, Error, structuredClone, window: { setTimeout: callback => { callback(); return 1; }, clearTimeout() {} }, Map, Set, Number, String, Object, JSON });
  const render = () => { hookIndex = 0; return module.exports.default(); };
  const nodes = node => {
    if (!node || typeof node !== 'object') return [];
    if (typeof node.type === 'function') return nodes(node.type(node.props));
    return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
  };
  return { render, nodes, effects, calls, api, grid, get gridProps() { return gridProps; } };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const validRule = (RULE_KEY, RULE_NAME = '프로젝트번호') => ({
  RULE_KEY, RULE_VERSION: 1, RULE_NAME, PREFIX: 'PRJ', DATE_FORMAT: 'YYYY', SEQUENCE_LENGTH: 4,
  START_VALUE: 1, INCREMENT_VALUE: 1, RESET_CYCLE: 'YEAR', SCOPE_TYPE: 'GLOBAL', USE_YN: 'Y',
  DESCRIPTION: '', CURRENT_VALUE: 0, REG_DT: '', REG_BY: '', MOD_DT: '', MOD_BY: '',
});

test('new RULE KEY input updates tracked React row state before save validation and API create', async () => {
  const h = harness();
  h.nodes(h.render()); h.effects.forEach(effect => effect()); await tick(); h.nodes(h.render());
  h.nodes(h.render()).find(node => node.type === 'button' && node.props.children === '신규 행').props.onClick();
  h.nodes(h.render());
  const stableRowKey = h.gridProps.getRowKey;
  const row = h.grid.rows[0];
  const keyColumn = h.gridProps.columns.find(column => column.key === 'RULE_KEY');
  const editor = keyColumn.render(row);
  assert.equal(editor.type, 'input');
  assert.equal(editor.props.defaultValue, '');
  editor.props.onBlur({ currentTarget: { value: 'PROJECT_TEST' } });
  h.nodes(h.render());
  assert.equal(h.gridProps.getRowKey, stableRowKey);
  assert.equal(h.grid.rows[0].RULE_KEY, 'PROJECT_TEST');
  const save = h.nodes(h.render()).find(node => node.type === 'button' && node.props.children === '저장');
  assert.equal(save.props.disabled, false);
  save.props.onClick(); await tick(); await tick();
  assert.equal(h.calls.filter(([type]) => type === 'create').length, 1);
  assert.equal(h.calls.find(([type]) => type === 'create')[1].RULE_KEY, 'PROJECT_TEST');
});

test('existing RULE edits still use the versioned update API', async () => {
  const h = harness([validRule('PROJECT')]);
  h.nodes(h.render()); h.effects.forEach(effect => effect()); await tick(); h.nodes(h.render());
  const row = h.gridProps.rows[0];
  h.gridProps.editing.onChange(row, 'RULE_NAME', '프로젝트 코드');
  const save = h.nodes(h.render()).find(node => node.type === 'button' && node.props.children === '저장');
  save.props.onClick(); await tick(); await tick();
  assert.equal(h.calls.filter(([type]) => type === 'update').length, 1);
  assert.equal(h.calls.find(([type]) => type === 'update')[2], 1);
});
