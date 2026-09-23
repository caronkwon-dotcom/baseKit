import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addGridRow,
  removeGridRows,
  replaceGridRows,
  revertGridRows,
  updateGridRow,
} from '../src/components/grid/gridRowState.ts';

const getKey = (row) => row.ID;
const emptyStore = () => ({
  rows: [],
  states: new Map(),
  originals: new Map(),
  beforeDeleteStates: new Map(),
  sequence: 0,
});
const loadedStore = () => replaceGridRows(emptyStore(), [
  { ID: 'A', NAME: 'Alpha' },
  { ID: 'B', NAME: 'Beta' },
  { ID: 'C', NAME: 'Gamma' },
], getKey);
const row = (store, id) => store.rows.find((item) => item.__GRID_ROW_ID === id);
const state = (store, id) => store.states.get(id);

test('1. added row is removed by revert', () => {
  const added = addGridRow(loadedStore(), { ID: '', NAME: 'New' });
  const id = added.rows.at(-1).__GRID_ROW_ID;
  const reverted = revertGridRows(added, [id]);

  assert.equal(row(reverted, id), undefined);
  assert.equal(state(reverted, id), undefined);
});

test('2. updated row is restored to its original value and NORMAL', () => {
  const updated = updateGridRow(loadedStore(), 'A', (value) => ({ ...value, NAME: 'Changed' }));
  const reverted = revertGridRows(updated, ['A']);

  assert.equal(row(reverted, 'A').NAME, 'Alpha');
  assert.equal(state(reverted, 'A'), 'NORMAL');
});

test('3. deleted row returns to NORMAL', () => {
  const deleted = removeGridRows(loadedStore(), ['A']);
  const reverted = revertGridRows(deleted, ['A']);

  assert.equal(row(reverted, 'A').NAME, 'Alpha');
  assert.equal(state(reverted, 'A'), 'NORMAL');
});

test('4. update then delete then revert preserves the update', () => {
  const updated = updateGridRow(loadedStore(), 'A', (value) => ({ ...value, NAME: 'Changed' }));
  const deleted = removeGridRows(updated, ['A']);
  const reverted = revertGridRows(deleted, ['A']);

  assert.equal(row(reverted, 'A').NAME, 'Changed');
  assert.equal(state(reverted, 'A'), 'UPDATED');
});

test('5. edited inserted row is removed by revert', () => {
  const added = addGridRow(loadedStore(), { ID: '', NAME: 'New' });
  const id = added.rows.at(-1).__GRID_ROW_ID;
  const updated = updateGridRow(added, id, (value) => ({ ...value, NAME: 'Edited new row' }));
  const reverted = revertGridRows(updated, [id]);

  assert.equal(row(reverted, id), undefined);
  assert.equal(state(reverted, id), undefined);
});

test('6. mixed selected rows are reverted according to their state', () => {
  let store = loadedStore();
  store = updateGridRow(store, 'A', (value) => ({ ...value, NAME: 'Changed A' }));
  store = removeGridRows(store, ['B']);
  store = addGridRow(store, { ID: '', NAME: 'New' });
  const insertedId = store.rows.at(-1).__GRID_ROW_ID;
  const reverted = revertGridRows(store, ['A', 'B', 'C', insertedId]);

  assert.equal(row(reverted, insertedId), undefined);
  assert.equal(row(reverted, 'A').NAME, 'Alpha');
  assert.equal(state(reverted, 'A'), 'NORMAL');
  assert.equal(state(reverted, 'B'), 'NORMAL');
  assert.equal(state(reverted, 'C'), 'NORMAL');
});

test('7. successful save reload establishes a new NORMAL baseline', () => {
  const updated = updateGridRow(loadedStore(), 'A', (value) => ({ ...value, NAME: 'Saved value' }));
  const savedRows = updated.rows.map(({ __GRID_ROW_ID, ...value }) => value);
  const reloaded = replaceGridRows(updated, savedRows, getKey);
  const reverted = revertGridRows(reloaded, ['A']);

  assert.equal(row(reverted, 'A').NAME, 'Saved value');
  assert.equal(state(reverted, 'A'), 'NORMAL');
});
