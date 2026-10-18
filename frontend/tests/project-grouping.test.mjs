import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileDraft } from '../src/modules/standard-design/projectgrouping/projectGroupingApi.ts';
const input = ['a','b','c'].map(REQUIREMENT_ID => ({ REQUIREMENT_ID, REQUIREMENT_NAME: REQUIREMENT_ID, REQUIREMENT_REVISION: 1 }));
test('N:M grouping preserves coverage on exclusion and keeps original draft immutable', () => {
  const draft = { GROUPS: [{ GROUP_ID: '1', MEMBERS: [{ REQUIREMENT_ID: 'a' }] }, { GROUP_ID: '2', MEMBERS: [{ REQUIREMENT_ID: 'a' }, { REQUIREMENT_ID: 'b' }] }], UNCLASSIFIED: [{ REQUIREMENT_ID: 'c', REASON: 'uncertain' }] };
  const result = reconcileDraft({ ...draft, GROUPS: draft.GROUPS.map(g => ({ ...g, MEMBERS: g.MEMBERS.filter(m => m.REQUIREMENT_ID !== 'b') })) }, input);
  assert.deepEqual(result.UNCLASSIFIED.map(m => m.REQUIREMENT_ID), ['b','c']);
  assert.equal(result.UNCLASSIFIED[1].REASON, 'uncertain');
  assert.equal(draft.GROUPS[1].MEMBERS.length, 2);
});
test('direct assignment removes only assigned ID from unclassified', () => {
  const result = reconcileDraft({ GROUPS: [{ MEMBERS: [{ REQUIREMENT_ID: 'c' }] }], UNCLASSIFIED: [{ REQUIREMENT_ID: 'c', REASON: 'old' }] }, input);
  assert.deepEqual(result.UNCLASSIFIED.map(m => m.REQUIREMENT_ID), ['a','b']);
});
