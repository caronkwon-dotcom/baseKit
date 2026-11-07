import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateDocumentNumberRule } from '../src/features/system/documentNumberManagement/documentNumberValidation.ts';

const validRule = {
  RULE_KEY: 'SALES_ORDER', RULE_NAME: '주문번호', PREFIX: 'SO', DATE_FORMAT: 'YYYYMM',
  SEQUENCE_LENGTH: 6, START_VALUE: 1, INCREMENT_VALUE: 1, RESET_CYCLE: 'MONTH',
  SCOPE_TYPE: 'GLOBAL', USE_YN: 'Y', DESCRIPTION: '',
};

test('document number form reports required fields and invalid cycle/date combinations', () => {
  const errors = validateDocumentNumberRule({ ...validRule, RULE_KEY: '', RULE_NAME: ' ', PREFIX: '', DATE_FORMAT: 'NONE' });
  assert.equal(errors.RULE_KEY, 'RULE KEY는 필수입니다.');
  assert.equal(errors.RULE_NAME, '규칙명은 필수입니다.');
  assert.equal(errors.PREFIX, '접두어는 필수입니다.');
  assert.equal(errors.DATE_FORMAT, '월 초기화는 YYYYMM 형식이 필요합니다.');
});

test('document number form accepts a valid monthly rule and rejects sequence overflow', () => {
  assert.deepEqual(validateDocumentNumberRule(validRule), {});
  assert.equal(validateDocumentNumberRule({ ...validRule, START_VALUE: 1000000 }).START_VALUE, '시작값이 순번 자리수를 초과합니다.');
});

test('static menu, program metadata and component registry point to the same program key', async () => {
  const [programs, menus, registry] = await Promise.all([
    readFile(new URL('../meta/programs.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../meta/menus.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../src/config/programRegistry.tsx', import.meta.url), 'utf8'),
  ]);
  assert.equal(programs.find((program) => program.programKey === 'DOC_NUMBER_MGMT')?.routePath, '/system/document-numbers');
  assert.equal(menus.find((menu) => menu.menuKey === 'SYS.DOC_NUMBER')?.programKey, 'DOC_NUMBER_MGMT');
  assert.match(registry, /DOC_NUMBER_MGMT:\s*\(\)\s*=>\s*<DocumentNumberManagePage\s*\/>/);
});
