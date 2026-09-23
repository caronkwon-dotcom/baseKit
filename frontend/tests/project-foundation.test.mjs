import assert from 'node:assert/strict';
import test from 'node:test';
import { findOrCreateMember, isActiveProjectMemberDuplicate, nextDomainId, validateProjectAssignment, validateProjectDates } from '../src/modules/standard-design/ui/components/projectContext.ts';

const project = { PROJECT_ID: 'SDP-001', PROJECT_NAME: 'Foundation', CUSTOMER_NAME: 'BaseKit', DESCRIPTION: '', STATUS: 'IN_PROGRESS', START_DATE: '2026-01-01', END_DATE: '2026-12-31' };
const assignment = { PROJECT_MEMBER_ID: 'PMB-001', PROJECT_ID: project.PROJECT_ID, MEMBER_ID: 'MEM-001', PARTICIPATION_TYPE_CD: 'INTERNAL', ROLE_CD: 'DV', GRADE_CD: 'INTERMEDIATE', START_DATE: '2026-02-01', END_DATE: '2026-10-31', PLAN_MM: 3.5, STATUS_CD: 'ACTIVE', NOTE: '' };

test('project requires ordered start and end dates', () => {
  assert.equal(validateProjectDates('2026-01-01', '2026-01-01'), '');
  assert.match(validateProjectDates('', '2026-01-01'), /필수/);
  assert.match(validateProjectDates('2026-02-01', '2026-01-01'), /늦을 수 없습니다/);
});

test('project member assignment validates dates, project bounds, and planned MM', () => {
  assert.equal(validateProjectAssignment(assignment, project), '');
  assert.match(validateProjectAssignment({ ...assignment, START_DATE: '2025-12-31' }, project), /프로젝트 시작일/);
  assert.match(validateProjectAssignment({ ...assignment, END_DATE: '2027-01-01' }, project), /프로젝트 종료일/);
  assert.match(validateProjectAssignment({ ...assignment, START_DATE: '2026-08-01', END_DATE: '2026-07-01' }, project), /늦을 수 없습니다/);
  assert.match(validateProjectAssignment({ ...assignment, PLAN_MM: -1 }, project), /0 이상/);
});

test('active assignment uniqueness is scoped to the same project and permits editing itself', () => {
  const rows = [assignment];
  assert.equal(isActiveProjectMemberDuplicate(rows, project.PROJECT_ID, 'MEM-001'), true);
  assert.equal(isActiveProjectMemberDuplicate(rows, project.PROJECT_ID, 'MEM-001', assignment.PROJECT_MEMBER_ID), false);
  assert.equal(isActiveProjectMemberDuplicate(rows, 'SDP-002', 'MEM-001'), false);
  assert.equal(isActiveProjectMemberDuplicate([{ ...assignment, STATUS_CD: 'INACTIVE' }], project.PROJECT_ID, 'MEM-001'), false);
});

test('member profiles are reused across projects by USER identity and IDs remain monotonic', () => {
  const profile = { MEMBER_ID: 'MEM-004', USER_ID: 'USR-1', MEMBER_NAME: 'Kim', ORG_ID: 'R&D', CAREER_YEARS: null, MAIN_SKILL: '', NOTE: '' };
  const user = { USER_ID: 'USR-1', USER_NAME: 'Kim', DEPARTMENT_NAME: 'R&D' };
  assert.equal(findOrCreateMember([profile], user), profile);
  assert.equal(findOrCreateMember([], user).MEMBER_ID, 'MEM-001');
  assert.equal(nextDomainId('PMB', ['PMB-001', 'PMB-009']), 'PMB-010');
});
