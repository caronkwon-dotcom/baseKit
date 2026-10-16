import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptsResponse, buildInput, canEdit, inputSignature, needsReanalysis, stepOf, summarizeGeneration, hasBlock, isLocallyStale, retryRequestId, candidateDiff } from '../src/modules/standard-design/analysis/analysisApi.ts';

const rows = [{ REQUIREMENT_ID: 'R2', MOD_DT: '2026-01-02T00:00:00Z' }, { REQUIREMENT_ID: 'R1', MOD_DT: '2026-01-01T00:00:00Z' }];

test('stepOf maps statuses to the 4-step UX', () => {
  assert.equal(stepOf(null), 0);
  assert.equal(stepOf('ANALYZING'), 1);
  assert.equal(stepOf('ANALYSIS_UNKNOWN'), 1);
  assert.equal(stepOf('REVIEW_READY'), 2);
  assert.equal(stepOf('STALE'), 2);
  assert.equal(stepOf('CONFIRMED'), 3);
  assert.equal(stepOf('PARTIAL'), 3);
});

test('STALE blocks editing and demands re-analysis', () => {
  assert.equal(canEdit('STALE'), false);
  assert.equal(canEdit('REVIEW_READY'), true);
  assert.equal(needsReanalysis('STALE'), true);
  assert.equal(needsReanalysis('CONFIRMED'), false);
});

test('buildInput keeps only selected rows and signature ignores order/whitespace', () => {
  const a = buildInput(rows, ['R1', 'R2'], { R1: ' x ' }, 'o');
  const b = buildInput([...rows].reverse(), ['R2', 'R1'], { R1: 'x' }, ' o ');
  assert.equal(inputSignature(a), inputSignature(b));
  assert.equal(buildInput(rows, ['R1'], {}, '').REQUIREMENTS.length, 1);
  assert.notEqual(inputSignature(a), inputSignature(buildInput(rows, ['R1', 'R2'], { R1: 'y' }, 'o')));
});

test('acceptsResponse drops responses for another analysis or project', () => {
  const cur = { projectId: 'P1', analysisId: 'A1' };
  assert.equal(acceptsResponse(cur, { PROJECT_ID: 'P1', ANALYSIS_ID: 'A1' }), true);
  assert.equal(acceptsResponse(cur, { PROJECT_ID: 'P1', ANALYSIS_ID: 'A2' }), false);
  assert.equal(acceptsResponse(cur, { PROJECT_ID: 'P2', ANALYSIS_ID: 'A1' }), false);
});

test('summarizeGeneration and hasBlock', () => {
  assert.deepEqual(summarizeGeneration([{ STATUS: 'SUCCESS' }, { STATUS: 'FAILED' }, { STATUS: 'PENDING' }, { STATUS: 'SUCCESS' }]), { success: 2, failed: 1, pending: 1 });
  assert.equal(hasBlock({ ISSUES: [{ LEVEL: 'WARN' }] }), false);
  assert.equal(hasBlock({ ISSUES: [{ LEVEL: 'BLOCK' }] }), true);
});

const analysisOf = (status) => ({ ANALYSIS_STATUS: status, OVERALL_OPINION: '', REQUIREMENTS: [{ REQUIREMENT_ID: 'R1', MOD_DT: '2026-01-01T00:00:00Z', DESIGN_OPINION: 'a' }] });
const sameInput = { OVERALL_OPINION: '', REQUIREMENTS: [{ REQUIREMENT_ID: 'R1', MOD_DT: '2026-01-01T00:00:00Z', DESIGN_OPINION: 'a' }] };

test('isLocallyStale marks changed input stale immediately, including an empty selection', () => {
  assert.equal(isLocallyStale(analysisOf('REVIEW_READY'), sameInput), false);
  assert.equal(isLocallyStale(analysisOf('REVIEW_READY'), { ...sameInput, OVERALL_OPINION: 'x' }), true);
  assert.equal(isLocallyStale(analysisOf('CONFIRMED'), { ...sameInput, REQUIREMENTS: [{ ...sameInput.REQUIREMENTS[0], DESIGN_OPINION: 'b' }] }), true);
  assert.equal(isLocallyStale(analysisOf('REVIEW_READY'), { ...sameInput, REQUIREMENTS: [] }), true);
  assert.equal(isLocallyStale(analysisOf('PARTIAL'), { ...sameInput, REQUIREMENTS: [] }), true);
  assert.equal(isLocallyStale(analysisOf('STALE'), sameInput), true);
  assert.equal(isLocallyStale(analysisOf('ANALYZING'), { ...sameInput, REQUIREMENTS: [] }), false);
});

test('retryRequestId reuses the request only after a server-confirmed partial or failed generation', () => {
  const gen = { GENERATION_REQUEST_ID: 'G1', ITEMS: [] };
  assert.equal(retryRequestId(gen, { ANALYSIS_STATUS: 'PARTIAL' }), 'G1');
  assert.equal(retryRequestId(gen, { ANALYSIS_STATUS: 'GENERATION_FAILED' }), 'G1');
  assert.equal(retryRequestId(gen, { ANALYSIS_STATUS: 'GENERATION_UNKNOWN' }), null);
  assert.equal(retryRequestId(gen, { ANALYSIS_STATUS: 'CONFIRMED' }), null);
  assert.equal(retryRequestId(null, { ANALYSIS_STATUS: 'PARTIAL' }), null);
});

test('candidateDiff covers name, purpose, layout, sources and relations', () => {
  const original = { PROGRAM_NAME: 'A', PURPOSE: 'p', SOURCE_REQUIREMENT_IDS: ['R1'], LAYOUT_TYPE: 'SINGLE', MENU_TEMP_IDS: ['M1'], ROLE_TEMP_IDS: [], ACTION_TEMP_IDS: ['A1'], STEP_TEMP_IDS: [] };
  const effective = { ...original, LAYOUT_TYPE: 'L1R2', SOURCE_REQUIREMENT_IDS: ['R1', 'R2'], MENU_TEMP_IDS: [] };
  const rowsOut = candidateDiff({ ORIGINAL: original, EFFECTIVE: effective }, (kind, id) => `${kind}:${id}`);
  const changed = rowsOut.filter((r) => r.changed).map((r) => r.label);
  assert.deepEqual(changed, ['Layout', '출처 Requirement', 'Menu 관계']);
  assert.equal(rowsOut.find((r) => r.label === 'Action 관계').original, 'ACTION:A1');
});