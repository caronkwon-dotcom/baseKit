import assert from 'node:assert/strict';
import test from 'node:test';
import { toProjectDraft, createEmptyProjectDraft, filterProjects, getNextProjectId, isProjectDraftDirty } from '../src/modules/standard-design/ui/components/projectReference.ts';
import { getBoundedListWidth } from '../src/modules/standard-design/ui/components/projectSplitter.ts';
import { searchProjectSnapshot, saveToProjectWorkingSet, emptyProjectSearchCondition } from '../src/modules/standard-design/ui/components/projectReference.ts';

const source = { PROJECT_ID: 'SDP-003', PROJECT_NAME: 'BaseKit', CUSTOMER_NAME: '내부 기준', DESCRIPTION: '설명', STATUS: 'IN_PROGRESS', REG_BY: 'admin', MEMBERS: ['member'] };
test('simple copy excludes identities and relations without mutating source', () => {
  const draft = toProjectDraft(source);
  assert.deepEqual(Object.keys(draft).sort(), ['PROJECT_NAME', 'CUSTOMER_NAME', 'DESCRIPTION', 'STATUS'].sort());
  draft.PROJECT_NAME = 'Copy';
  assert.equal(source.PROJECT_NAME, 'BaseKit');
});
test('copied draft is unsaved immediately; blank new and unchanged edit are clean', () => {
  const draft = toProjectDraft(source);
  assert.equal(isProjectDraftDirty({ mode: 'COPY', draft, initialDraft: draft }), true);
  assert.equal(isProjectDraftDirty({ mode: 'EDIT', draft, initialDraft: draft }), false);
  assert.equal(isProjectDraftDirty({ mode: 'EDIT', draft: {...draft, DESCRIPTION: 'changed'}, initialDraft: draft }), true);
  const blank = createEmptyProjectDraft();
  assert.equal(isProjectDraftDirty({ mode: 'NEW', draft: blank, initialDraft: blank }), false);
  assert.equal(isProjectDraftDirty(null), false);
});
test('search combines trimmed case-insensitive names with status and preserves source', () => {
  const rows = [source, {...source, PROJECT_ID: 'SDP-005', STATUS: 'DRAFT'}];
  assert.deepEqual(filterProjects(rows, {PROJECT_NAME: ' basekit ', CUSTOMER_NAME: '내부', STATUS: 'IN_PROGRESS'}), [source]);
  assert.equal(rows.length, 2);
  assert.equal(filterProjects(rows, {PROJECT_NAME: 'missing', CUSTOMER_NAME: '', STATUS: ''}).length, 0);
});
test('new IDs do not overwrite remaining records after deletion or fresh repository additions', () => {
  assert.equal(getNextProjectId([source, {...source, PROJECT_ID: 'SDP-010'}]), 'SDP-011');
  assert.equal(getNextProjectId([]), 'SDP-001');
});
test('splitter reserves its 12px and both pane minima including narrow containers', () => {
  assert.equal(getBoundedListWidth(30, 1440), 30);
  for (const width of [852, 1000, 1280, 1440, 1920]) {
    const low = getBoundedListWidth(-100, width) * width / 100;
    const high = getBoundedListWidth(200, width) * width / 100;
    assert.ok(low >= 360 - 0.001);
    assert.ok(width - high - 12 >= 480 - 0.001);
  }
  const narrow = getBoundedListWidth(90, 600) * 600 / 100;
  assert.ok(narrow > 0 && narrow + 12 < 600);
  assert.equal(getBoundedListWidth(50, 0), 30);
});

test('query snapshot keeps the executed conditions even when dialog draft is edited without searching', () => {
  const input = { PROJECT_NAME: 'Base', CUSTOMER_NAME: '', STATUS: '' };
  const result = searchProjectSnapshot([source], input);
  input.PROJECT_NAME = 'different';
  assert.equal(result.condition.PROJECT_NAME, 'Base');
  assert.deepEqual(result.rows, [source]);
  assert.notEqual(result.rows[0], source);
});

test('dialog query replaces the whole working set, including rows outside the previous set', () => {
  const second = { ...source, PROJECT_ID: 'SDP-004', CUSTOMER_NAME: '외부 고객' };
  const all = [source, second];
  const old = searchProjectSnapshot(all, { ...emptyProjectSearchCondition, CUSTOMER_NAME: '내부' });
  const next = searchProjectSnapshot(all, { ...emptyProjectSearchCondition, CUSTOMER_NAME: '외부' });
  assert.deepEqual(old.rows, [source]);
  assert.deepEqual(next.rows, [second]);
  assert.equal(searchProjectSnapshot(all, emptyProjectSearchCondition).rows.length, 2);
});

test('editing a matching row out of its search criteria retains its working-set membership and order', () => {
  const second = { ...source, PROJECT_ID: 'SDP-004' };
  const rows = [source, second];
  const saved = { ...source, STATUS: 'APPROVED', CUSTOMER_NAME: '변경 고객' };
  const next = saveToProjectWorkingSet(rows, saved);
  assert.deepEqual(next.map(row => row.PROJECT_ID), ['SDP-003', 'SDP-004']);
  assert.equal(next[0].STATUS, 'APPROVED');
  assert.equal(rows[0].STATUS, 'IN_PROGRESS');
});

test('explicit new/copy save appends just the saved project; unrelated repository rows are not loaded', () => {
  const created = { ...source, PROJECT_ID: 'SDP-006', PROJECT_NAME: '복사' };
  const next = saveToProjectWorkingSet([source], created);
  assert.deepEqual(next.map(row => row.PROJECT_ID), ['SDP-003', 'SDP-006']);
  assert.deepEqual(saveToProjectWorkingSet(next, created), next);
});
