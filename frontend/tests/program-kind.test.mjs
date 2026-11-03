import test from 'node:test';
import assert from 'node:assert/strict';
import { isScreenKind, programKindLabel } from '../src/modules/standard-design/programs/programKind.ts';

test('known kinds have labels and anything else is left blank', () => {
 assert.equal(programKindLabel('SCREEN'), '화면');
 assert.equal(programKindLabel('BATCH'), '배치');
 assert.equal(programKindLabel('INTERFACE'), '연동');
 assert.equal(programKindLabel('REPORT'), '보고서');
 assert.equal(programKindLabel('WIDGET'), '');
 assert.equal(programKindLabel('toString'), '');
 assert.equal(programKindLabel(null), '');
 assert.equal(programKindLabel(undefined), '');
});

test('only screens are targets of screen design', () => {
 assert.equal(isScreenKind('SCREEN'), true);
 assert.equal(isScreenKind('BATCH'), false);
 assert.equal(isScreenKind(null), false);
});
