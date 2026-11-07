import test from 'node:test';
import assert from 'node:assert/strict';
import * as pm from '../src/modules/standard-design/projects/projectManagement.ts';

const rows = ids => ids.map(id => ({ PROJECT_ID: id }));

test('first entry picks the context project, else the first row, else the new form', () => {
  assert.deepEqual(pm.initialSelection('READY', rows(['A', 'B', 'C']), 'B'), { kind: 'EDIT', projectId: 'B' });
  assert.deepEqual(pm.initialSelection('READY', rows(['A', 'B', 'C']), ''), { kind: 'EDIT', projectId: 'A' });
  assert.deepEqual(pm.initialSelection('READY', rows(['A', 'B']), 'GONE'), { kind: 'EDIT', projectId: 'A' }, 'a context project that is not in the list is ignored');
  assert.deepEqual(pm.initialSelection('READY', [], ''), { kind: 'NEW' });
  assert.deepEqual(pm.initialSelection('READY', [], 'B'), { kind: 'NEW' });
});

test('nothing is selected and no new form is offered while the list is loading or failed', () => {
  for (const status of ['IDLE', 'LOADING', 'ERROR']) {
    assert.deepEqual(pm.initialSelection(status, rows(['A']), 'A'), { kind: 'NONE' });
    assert.deepEqual(pm.initialSelection(status, [], ''), { kind: 'NONE' });
  }
});

test('after a delete the next row takes over, then the previous one, then the new form', () => {
  const all = rows(['A', 'B', 'C']);
  assert.deepEqual(pm.selectionAfterDelete(all, 'A'), { kind: 'EDIT', projectId: 'B' });
  assert.deepEqual(pm.selectionAfterDelete(all, 'B'), { kind: 'EDIT', projectId: 'C' });
  assert.deepEqual(pm.selectionAfterDelete(all, 'C'), { kind: 'EDIT', projectId: 'B' });
  assert.deepEqual(pm.selectionAfterDelete(rows(['A']), 'A'), { kind: 'NEW' });
  assert.deepEqual(pm.selectionAfterDelete(all, 'unknown'), { kind: 'EDIT', projectId: 'A' }, 'an unknown ID changes nothing but still yields a valid pick');
});

test('the message area shows the screen message first, then the load error, then the loading note', () => {
  assert.deepEqual(pm.areaMessage({ tone: 'warning', text: '조건 없음' }, 'ERROR', '서버 오류'), { type: 'warn', text: '조건 없음' });
  assert.deepEqual(pm.areaMessage(null, 'ERROR', '서버에 연결하지 못했습니다.'), { type: 'error', text: '서버에 연결하지 못했습니다. 프로젝트는 서버에서만 조회합니다.' });
  assert.equal(pm.areaMessage(null, 'LOADING', '').type, 'info');
  assert.equal(pm.areaMessage(null, 'IDLE', '').type, 'info');
  assert.equal(pm.areaMessage(null, 'READY', ''), null);
  assert.deepEqual(['info', 'warning', 'error', 'success'].map(pm.toMessageType), ['info', 'warn', 'error', 'success']);
});
