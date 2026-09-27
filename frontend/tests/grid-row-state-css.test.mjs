import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readSource = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const gridSource = readSource('../src/components/grid/BaseKitDataGrid.tsx');
const pageSource = readSource('../src/pages/CodeManagePage.tsx');
const gridCss = readSource('../src/components/grid/basekitGrid.css');

test('BaseKitDataGrid maps canonical row states to the existing CSS classes', () => {
  const mapping = gridSource.match(/const ROW_STATE_CLASS: Record<GridRowState, string> = \{([\s\S]*?)\};/);
  assert.ok(mapping, 'shared grid should own the row state class mapping');
  assert.match(mapping[1], /NORMAL:\s*''/);
  assert.match(mapping[1], /INSERTED:\s*'grid-inserted-row'/);
  assert.match(mapping[1], /UPDATED:\s*'grid-updated-row'/);
  assert.match(mapping[1], /DELETED:\s*'grid-deleted-row'/);
  assert.match(gridSource, /const rowState = getRowState\?\.\(params\.data\)/);
});

test('row state, custom, and current row classes are composed together', () => {
  assert.match(gridSource, /rowState \? ROW_STATE_CLASS\[rowState\] : ''/);
  assert.match(gridSource, /getRowClassName\?\.\(params\.data\)/);
  assert.match(gridSource, /getRowKey\(params\.data\) === currentRowKey \? 'basekit-current-row'/);
});

test('CodeManagePage relies on the shared mapping and existing row CSS remains available', () => {
  assert.doesNotMatch(pageSource, /grid-(?:inserted|updated|deleted)-row/);
  assert.match(pageSource, /getRowState=\{groups\.getState\}/);
  for (const stateClass of ['grid-inserted-row', 'grid-updated-row', 'grid-deleted-row']) {
    assert.ok(gridCss.includes(`.ag-row.${stateClass}`), `${stateClass} CSS should remain defined`);
  }
  assert.match(gridCss, /grid-deleted-row \.ag-cell[^\n]+text-decoration: line-through/);
});
