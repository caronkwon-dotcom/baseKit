import test from 'node:test';
import assert from 'node:assert/strict';
import { candidateState, candidateStateLabel, filterCandidates, ledgerInfoOf, stateCounts } from '../src/modules/standard-design/programs/programDecision.ts';

const done = (decision, status = 'OK') => ({ LEDGER_COMPARE: 'DONE', DECISION: decision, REVIEW_STATUS: status });

test('compared candidates show the judgment and review status the server gave', () => {
 assert.equal(candidateState(done('NEW')), 'NEW');
 assert.equal(candidateState(done('REUSE')), 'REUSE');
 assert.equal(candidateState(done('CHANGE')), 'CHANGE');
 assert.equal(candidateState({ ...done('NEW'), LEDGER_COMPARE: 'PARTIAL' }), 'NEW');
});

test('a wrong or missing judgment is review required and never turned into new', () => {
 assert.equal(candidateState(done('REUSE', 'REVIEW_REQUIRED')), 'REVIEW_REQUIRED');
 assert.equal(candidateState(done('NEW', 'REVIEW_REQUIRED')), 'REVIEW_REQUIRED');
 assert.equal(candidateState(done(null)), 'REVIEW_REQUIRED');
 assert.equal(candidateState(done('MAYBE')), 'REVIEW_REQUIRED');
 assert.equal(candidateState({ LEDGER_COMPARE: 'DONE', DECISION: 'NEW' }), 'REVIEW_REQUIRED');
});

test('older results without a register comparison are not compared, not judged', () => {
 assert.equal(candidateState({}), 'NOT_COMPARED');
 assert.equal(candidateState({ LEDGER_COMPARE: 'NOT_PERFORMED', DECISION: 'NEW', REVIEW_STATUS: 'OK' }), 'NOT_COMPARED');
 assert.equal(candidateState({ LEDGER_COMPARE: null }), 'NOT_COMPARED');
 assert.equal(candidateStateLabel('NOT_COMPARED'), '대장 비교 미수행');
 assert.equal(candidateStateLabel('REVIEW_REQUIRED'), '검토 필요');
});

test('the register size sent to the model is read from the stored request', () => {
 assert.deepEqual(ledgerInfoOf('{"existingProgramsInfo":{"total":18,"included":10,"omitted":8,"detail":"RELEVANT"}}'), { total: 18, included: 10, omitted: 8, detail: 'RELEVANT' });
 assert.equal(ledgerInfoOf('{"requirements":[]}'), null);
 assert.equal(ledgerInfoOf('not json'), null);
 assert.equal(ledgerInfoOf(undefined), null);
});

test('counts and filters follow the same state', () => {
 const list = [done('NEW'), done('NEW'), done('REUSE'), done('CHANGE'), done('REUSE', 'REVIEW_REQUIRED'), {}];
 assert.deepEqual(stateCounts(list), { NEW: 2, REUSE: 1, CHANGE: 1, REVIEW_REQUIRED: 1, NOT_COMPARED: 1 });
 assert.equal(filterCandidates(list, 'ALL').length, 6);
 assert.equal(filterCandidates(list, 'NEW').length, 2);
 assert.equal(filterCandidates(list, 'REVIEW_REQUIRED').length, 1);
});
