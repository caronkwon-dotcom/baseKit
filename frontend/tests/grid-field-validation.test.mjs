import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findGridValidationIssue,
  gridValidationIssueMessage,
  normalizeGridFieldValue,
  userGridErrorMessage,
  validateGridField,
} from '../src/components/grid/gridFieldValidation.ts';

const numberField = { key: 'SORT_ORDER', label: '정렬순서', dataType: 'NUMBER', controlType: 'NUMBER', displayType: 'NUMBER', required: true };
const ynField = { key: 'USE_YN', label: '사용', dataType: 'STRING', controlType: 'SWITCH', displayType: 'BOOLEAN', required: true, options: [{ value: 'Y', label: '사용' }, { value: 'N', label: '미사용' }] };
const selectField = { key: 'TYPE', label: '타입', dataType: 'STRING', controlType: 'SELECT', displayType: 'TEXT', required: true, options: [{ value: 'A', label: 'A' }, { value: 'B', label: 'B' }] };
const requiredText = { key: 'NAME', label: '이름', dataType: 'STRING', controlType: 'TEXT', displayType: 'TEXT', required: true };
const limitedText = { key: 'CODE_NAME', label: '코드명', dataType: 'STRING', controlType: 'TEXT', displayType: 'TEXT', required: true, maxLength: 100 };

test('NUMBER rejects text and non-finite values without producing NaN', () => {
  assert.equal(validateGridField('ABC', numberField), '숫자만 입력할 수 있습니다.');
  assert.equal(validateGridField(Number.NaN, numberField), '숫자만 입력할 수 있습니다.');
  assert.equal(validateGridField('123', numberField), null);
  assert.equal(normalizeGridFieldValue('123', numberField), '123');
  assert.equal(normalizeGridFieldValue('ABC', numberField), 'ABC');
});

test('YN switch accepts only its explicit metadata options', () => {
  assert.equal(validateGridField('Y', ynField), null);
  assert.equal(validateGridField('N', ynField), null);
  assert.equal(validateGridField('true', ynField), '허용된 상태값이 아닙니다.');
});

test('SELECT rejects a value outside metadata options', () => {
  assert.equal(validateGridField('A', selectField), null);
  assert.equal(validateGridField('C', selectField), '선택 가능한 값이 아닙니다.');
});

test('REQUIRED rejects empty values and save validation identifies the field', () => {
  const columns = [{ key: 'NAME', header: '이름', render: (row) => row.NAME, fieldDefinition: requiredText }];
  const issue = findGridValidationIssue([{ NAME: '' }], columns);
  assert.equal(issue?.field.key, 'NAME');
  assert.equal(issue?.message, '필수 입력값입니다.');
});

test('TEXT maxLength rejects overflow with a user-facing message', () => {
  assert.equal(validateGridField('A'.repeat(100), limitedText), null);
  assert.equal(validateGridField('A'.repeat(101), limitedText), '코드명은 최대 100자까지 입력할 수 있습니다.');
  const columns = [{ key: 'CODE_NAME', header: '코드명', render: (row) => row.CODE_NAME, fieldDefinition: limitedText }];
  const issue = findGridValidationIssue([{ CODE_NAME: 'A'.repeat(101) }], columns);
  assert.equal(issue && gridValidationIssueMessage(issue), '코드명은 최대 100자까지 입력할 수 있습니다.');
});

test('backend field paths are converted to user-facing length validation', () => {
  const error = new Error('INSERTED[0].CODE_NAME: 크기가 0에서 100 사이여야 합니다.');
  assert.equal(userGridErrorMessage(error, [limitedText], '저장하지 못했습니다.'), '코드명은 최대 100자까지 입력할 수 있습니다.');
});
