import test from 'node:test';
import assert from 'node:assert/strict';
import { canGoNext, initialStep } from '../src/modules/standard-design/ui/components/memberDialogStep.ts';

test('add mode starts at SELECT, edit mode at DETAIL', () => {
  assert.equal(initialStep(false), 'SELECT');
  assert.equal(initialStep(true), 'DETAIL');
});

test('next is allowed only when a user is selected', () => {
  assert.equal(canGoNext(null), false);
  assert.equal(canGoNext(undefined), false);
  assert.equal(canGoNext(''), false);
  assert.equal(canGoNext('U001'), true);
});
