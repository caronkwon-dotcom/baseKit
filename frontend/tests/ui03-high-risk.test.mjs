import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canUseGridAction } from '../src/components/common/gridActionPermission.ts';
import { reloadSavedCodeDetail } from '../src/pages/codeManageDetailReload.ts';
import { getGridChangeSet, replaceGridRows, revertGridRows, updateGridRow } from '../src/components/grid/gridRowState.ts';

const readMetadata = (name) => JSON.parse(readFileSync(new URL(`../meta/${name}.json`, import.meta.url), 'utf8'));
const program = readMetadata('programs').find((item) => item.programKey === 'COMMON_CODE_MGMT');
const permissions = readMetadata('role-program-actions');
const actions = readMetadata('actions');
const hasPermission = (role) => (actionCode) => permissions.some((item) =>
  item.ROLE_CODE === role && item.PROGRAM_KEY === program.programKey &&
  item.ACTION_CODE === actionCode && item.ALLOW_YN === 'Y');

test('default and custom toolbar actions use the same permission policy', () => {
  const visible = (codes, role) => codes.filter((code) => canUseGridAction(code, program.actionCodes, hasPermission(role)));
  assert.deepEqual(visible(['CREATE', 'UPDATE', 'DELETE', 'EXCEL_DOWNLOAD'], 'ADMIN'), ['CREATE', 'UPDATE', 'DELETE']);
  assert.deepEqual(visible(['ADD_ROW', 'REMOVE_ROW', 'REVERT_CHANGES', 'SAVE'], 'ADMIN'),
    ['ADD_ROW', 'REMOVE_ROW', 'REVERT_CHANGES', 'SAVE']);
  assert.deepEqual(visible(['ADD_ROW', 'REMOVE_ROW', 'REVERT_CHANGES', 'SAVE'], 'PURCHASER'), []);
  assert.equal(actions.some((action) => action.actionCode === 'ADD_ROW'), true);
  assert.equal(actions.some((action) => action.actionCode === 'REVERT_CHANGES'), true);
});

const getKey = (row) => row.ID;
const emptyStore = () => ({ rows: [], states: new Map(), originals: new Map(), beforeDeleteStates: new Map(), sequence: 0 });
const cleanStore = (prefix) => replaceGridRows(emptyStore(), [{ ID: `${prefix}-1`, NAME: `${prefix} original` }], getKey);
const dirtyStore = (prefix) => updateGridRow(cleanStore(prefix), `${prefix}-1`, (row) => ({ ...row, NAME: `${prefix} edited` }));
const rowName = (store) => store.rows[0].NAME;
const isDirty = (store) => getGridChangeSet(store, getKey).UPDATED.length > 0;

function setup(attributesDirty, codesDirty) {
  let attributes = attributesDirty ? dirtyStore('attribute') : cleanStore('attribute');
  let codes = codesDirty ? dirtyStore('code') : cleanStore('code');
  const calls = [];
  const reloaders = {
    attributes: async () => { calls.push('attributes'); attributes = cleanStore('attribute'); },
    codes: async () => { calls.push('codes'); codes = cleanStore('code'); },
  };
  return {
    reload: (dataset) => reloadSavedCodeDetail(dataset, 'GROUP-1', { useYn: '' }, reloaders),
    get attributes() { return attributes; },
    get codes() { return codes; },
    calls,
  };
}

test('1. saving codes preserves unsaved attribute edits', async () => {
  const context = setup(true, true);
  await context.reload('codes');
  assert.deepEqual(context.calls, ['codes']);
  assert.equal(rowName(context.attributes), 'attribute edited');
  assert.equal(isDirty(context.attributes), true);
});

test('2. saving attributes preserves unsaved code edits', async () => {
  const context = setup(true, true);
  await context.reload('attributes');
  assert.deepEqual(context.calls, ['attributes']);
  assert.equal(rowName(context.codes), 'code edited');
  assert.equal(isDirty(context.codes), true);
});

test('3. saving with the other dataset clean reloads only the saved dataset', async () => {
  for (const dataset of ['attributes', 'codes']) {
    const context = setup(false, false);
    await context.reload(dataset);
    assert.deepEqual(context.calls, [dataset]);
    assert.equal(isDirty(context.attributes), false);
    assert.equal(isDirty(context.codes), false);
  }
});

test('4. attribute-only edits can be reverted', () => {
  const context = setup(true, false);
  const reverted = revertGridRows(context.attributes, ['attribute-1']);
  assert.equal(rowName(reverted), 'attribute original');
  assert.equal(isDirty(reverted), false);
});

test('5. code-only edits can be reverted', () => {
  const context = setup(false, true);
  const reverted = revertGridRows(context.codes, ['code-1']);
  assert.equal(rowName(reverted), 'code original');
  assert.equal(isDirty(reverted), false);
});

test('6. either save keeps the opposite dirty dataset intact', async () => {
  for (const dataset of ['attributes', 'codes']) {
    const context = setup(true, true);
    await context.reload(dataset);
    const other = dataset === 'attributes' ? context.codes : context.attributes;
    assert.equal(rowName(other), dataset === 'attributes' ? 'code edited' : 'attribute edited');
    assert.equal(isDirty(other), true);
  }
});
