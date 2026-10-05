import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptsResponse, buildInput, canEdit, inputSignature, needsReanalysis, stepOf, summarizeGeneration, hasBlock } from '../src/modules/standard-design/analysis/analysisApi.ts';

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
