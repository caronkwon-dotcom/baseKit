import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequirementExcelMapper, createRequirementExcelValidator, planRequirementImport, requirementImportKey } from '../src/modules/standard-design/requirement/requirementExcel.ts';

const context = {
  projectId: 'SDP-1',
  types: [{ CODE: 'NEW', CODE_NAME: '신규' }, { CODE: 'CHANGE', CODE_NAME: '변경' }],
  statuses: [{ CODE: 'DRAFT', CODE_NAME: '초안' }],
  projectMenus: [{ PROJECT_MENU_ID: 'PM-1', MENU_ID: 'ORD_LIST' }, { PROJECT_MENU_ID: 'PM-2', MENU_ID: 'ORD_DETAIL' }],
};
const row = { REQUIREMENT_NAME: '주문 조회', DESCRIPTION: '내용', REQUIREMENT_TYPE: '변경', PROCESS_DESCRIPTION: '', STATUS: '', MENU_IDS: 'ORD_LIST, ORD_DETAIL' };

test('mapper resolves code names, defaults and project menu ids', () => {
  const mapped = createRequirementExcelMapper(context)(row, 2);
  assert.equal(mapped.REQUIREMENT_TYPE_CODE, 'CHANGE');
  assert.equal(mapped.STATUS, 'DRAFT');
  assert.deepEqual(mapped.PROJECT_MENU_IDS, ['PM-1', 'PM-2']);
  assert.deepEqual(mapped.MENU_KEYS, []);
});
test('validator rejects unknown type, status and menu', () => {
  const errors = createRequirementExcelValidator(context)({ ...row, REQUIREMENT_TYPE: 'X', STATUS: 'Y', MENU_IDS: 'NOPE' }, 2);
  assert.equal(errors.length, 3);
  assert.deepEqual(createRequirementExcelValidator(context)(row, 2), []);
});
test('plan skips already created rows and reports duplicate names', () => {
  const map = createRequirementExcelMapper(context);
  const a = map(row, 2);
  const b = map({ ...row, DESCRIPTION: '다른 내용' }, 3);
  const c = map({ ...row, REQUIREMENT_NAME: '신규 요구' }, 4);
  const plan = planRequirementImport([a, b, c], ['주문 조회'], new Set([requirementImportKey(c)]));
  assert.equal(plan.skippedAlreadyCreated, 1);
  assert.deepEqual(plan.toCreate, [a, b]);
  assert.deepEqual(plan.duplicateNames, ['주문 조회']);
});
