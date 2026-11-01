import test from 'node:test';
import assert from 'node:assert/strict';
import { analysisBlockReason, analysisTypeStatus, disabledStepNotes, groupStepStates, stepLabel, stepFromQuery } from '../src/modules/standard-design/requirementgroup/groupStepState.ts';

const run = (type, status, version, at = '2026-11-01T01:00:00') => ({ ANALYSIS_TYPE: type, ANALYSIS_ID: `${type}-${status}-${version}-${at}`, STATUS: status, GROUP_VERSION: version, CREATED_AT: at });
const input = (patch = {}) => ({ saved: true, dirty: false, status: 'DRAFT', version: 3, memberCount: 2, hasDiscarded: false, analyses: [], ...patch });

test('STEP 01 reflects group status and unsaved edits', () => {
 assert.equal(groupStepStates(input({ saved: false }))[1].status, 'NOT_STARTED');
 assert.equal(groupStepStates(input())[1].status, 'IN_PROGRESS');
 assert.equal(groupStepStates(input({ dirty: true, status: 'CONFIRMED' }))[1].status, 'IN_PROGRESS');
 assert.equal(groupStepStates(input({ status: 'CONFIRMED' }))[1].status, 'DONE');
 assert.equal(groupStepStates(input({ status: 'REVIEW_REQUIRED' }))[1].status, 'REVIEW_REQUIRED');
 assert.equal(groupStepStates(input({ saved: false }))[1].enabled, true);
});

test('STEP 02 only shows stored results: it needs a saved unchanged group and no analysis precondition', () => {
 for (const status of ['DRAFT', 'REVIEW_REQUIRED', 'CONFIRMED']) assert.equal(groupStepStates(input({ status }))[2].enabled, true, status);
 assert.match(groupStepStates(input({ saved: false }))[2].reason, /저장/);
 assert.match(groupStepStates(input({ dirty: true }))[2].reason, /저장하지 않은 변경/);
 assert.equal(groupStepStates(input({ memberCount: 0 }))[2].enabled, true);
 assert.equal(groupStepStates(input({ hasDiscarded: true }))[2].enabled, true);
 assert.equal(groupStepStates(input())[2].status, 'UNKNOWN');
 assert.equal(groupStepStates(input({ dirty: true }))[2].status, 'DISABLED');
 assert.equal(analysisBlockReason(input()), '');
 assert.match(analysisBlockReason(input({ memberCount: 0 })), /Requirement/);
 assert.match(analysisBlockReason(input({ hasDiscarded: true })), /폐기/);
});

test('STEP 03 additionally requires a confirmed group', () => {
 assert.equal(groupStepStates(input({ status: 'CONFIRMED' }))[3].enabled, true);
 const draft = groupStepStates(input({ status: 'DRAFT' }))[3];
 assert.equal(draft.enabled, false); assert.equal(draft.reason, '그룹을 확정하세요.'); assert.equal(draft.status, 'DISABLED');
 assert.match(groupStepStates(input({ status: 'REVIEW_REQUIRED' }))[3].reason, /재확정/);
 assert.match(groupStepStates(input({ status: 'CONFIRMED', dirty: true }))[3].reason, /저장하지 않은 변경/);
 assert.equal(groupStepStates(input({ status: 'CONFIRMED', memberCount: 0 }))[3].enabled, false);
});

test('analysis status is computed per type from the current group version', () => {
 const rec = 'GROUP_RECOMMENDATION', design = 'GROUP_DESIGN';
 assert.equal(analysisTypeStatus(null, rec, 3), 'UNKNOWN');
 assert.equal(analysisTypeStatus([], rec, 3), 'NOT_STARTED');
 assert.equal(analysisTypeStatus([run(rec, 'SUCCESS', 3)], rec, 3), 'DONE');
 assert.equal(analysisTypeStatus([run(rec, 'SUCCEEDED', 3)], rec, 3), 'DONE');
 assert.equal(analysisTypeStatus([run(rec, 'SUCCESS', 2)], rec, 3), 'REVIEW_REQUIRED');
 assert.equal(analysisTypeStatus([run(rec, 'RUNNING', 3)], rec, 3), 'IN_PROGRESS');
 assert.equal(analysisTypeStatus([run(rec, 'FAILED_LLM', 3)], rec, 3), 'FAILED');
 assert.equal(analysisTypeStatus([run(rec, 'FAILED_LLM', 3, '2026-11-01T02:00:00'), run(rec, 'SUCCESS', 3, '2026-11-01T01:00:00')], rec, 3), 'DONE');
 assert.equal(analysisTypeStatus([run(rec, 'SUCCESS', 2), run(rec, 'FAILED_TIMEOUT', 3, '2026-11-01T02:00:00')], rec, 3), 'FAILED');
 assert.equal(analysisTypeStatus([run(design, 'SUCCESS', 3)], rec, 3), 'NOT_STARTED');
 assert.equal(analysisTypeStatus([run(design, 'RUNNING', 3)], rec, 3), 'NOT_STARTED');
});

test('a version change turns the completed design step into re-review and never auto-completes', () => {
 const analyses = [run('GROUP_RECOMMENDATION', 'SUCCESS', 3), run('GROUP_DESIGN', 'SUCCESS', 4)];
 const before = groupStepStates(input({ status: 'CONFIRMED', version: 4, analyses }));
 assert.equal(before[2].status, 'UNKNOWN');
 assert.equal(before[3].status, 'DONE');
 const after = groupStepStates(input({ status: 'DRAFT', version: 5, analyses }));
 assert.equal(after[3].status, 'DISABLED');
 assert.equal(groupStepStates(input({ status: 'CONFIRMED', version: 5, analyses }))[3].status, 'REVIEW_REQUIRED');
 assert.equal(groupStepStates(input({ analyses: null }))[2].status, 'UNKNOWN');
});

test('labels carry the step title and a text status, and legacy URLs map to a step', () => {
 assert.equal(stepLabel(1, 'DONE'), 'STEP 01 그룹 구성·확정 · 완료');
 assert.equal(stepLabel(2, 'UNKNOWN'), 'STEP 02 그룹핑 분석 결과');
 assert.equal(stepLabel(3, 'DISABLED'), 'STEP 03 설계 분석·초안 검토');
 assert.equal(stepLabel(3, 'UNKNOWN'), 'STEP 03 설계 분석·초안 검토');
 assert.equal(stepFromQuery(new URLSearchParams('')), 1);
 assert.equal(stepFromQuery(new URLSearchParams('tab=analysis')), 2);
 assert.equal(stepFromQuery(new URLSearchParams('tab=analysis&step=3')), 3);
 assert.equal(stepFromQuery(new URLSearchParams('step=1&tab=analysis')), 1);
 assert.equal(stepFromQuery(new URLSearchParams('step=9')), 1);
});

test('blocked steps are explained once per reason', () => {
 assert.deepEqual(disabledStepNotes(groupStepStates(input({ dirty: true }))), ['STEP 02·03 이동 불가: 저장하지 않은 변경이 있습니다. 저장한 후 이동하세요.']);
 assert.deepEqual(disabledStepNotes(groupStepStates(input())), ['STEP 03 이동 불가: 그룹을 확정하세요.']);
 assert.deepEqual(disabledStepNotes(groupStepStates(input({ status: 'CONFIRMED' }))), []);
});
