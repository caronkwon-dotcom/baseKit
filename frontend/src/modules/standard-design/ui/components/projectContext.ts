import type { DesignMember, DesignProject, ProjectMember } from '../../design-lifecycle/designLifecycle.types';

export const PARTICIPATION_TYPES = [
  { value: 'INTERNAL', label: '내부 인력' },
  { value: 'PARTNER', label: '협력사/외부' },
  { value: 'CUSTOMER', label: '고객/현업' },
] as const;

export const PROJECT_ROLES = [
  { value: 'PM', label: 'PM · Project Manager' },
  { value: 'PL', label: 'PL · Project Leader' },
  { value: 'DV', label: 'DV · Developer' },
  { value: 'BA', label: 'BA · Business Analyst' },
  { value: 'QA', label: 'QA · Quality Assurance' },
  { value: 'USER', label: 'USER · 현업 참여자' },
] as const;

export const PROJECT_GRADES = [
  { value: 'BEGINNER', label: '초급' },
  { value: 'INTERMEDIATE', label: '중급' },
  { value: 'ADVANCED', label: '고급' },
  { value: 'EXPERT', label: '특급' },
] as const;

export function nextDomainId(prefix: string, ids: string[]) {
  const number = ids.reduce((max, id) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  return `${prefix}-${String(number).padStart(3, '0')}`;
}

export function validateProjectDates(start: string, end: string) {
  if (!start || !end) return '프로젝트 시작일과 종료일은 필수입니다.';
  if (start > end) return '프로젝트 시작일은 종료일보다 늦을 수 없습니다.';
  return '';
}

export function validateProjectAssignment(assignment: ProjectMember, project: DesignProject) {
  if (!assignment.START_DATE || !assignment.END_DATE) return '투입 시작일과 종료일을 입력하세요.';
  if (assignment.START_DATE > assignment.END_DATE) return '투입 시작일은 종료일보다 늦을 수 없습니다.';
  if (project.START_DATE && assignment.START_DATE < project.START_DATE) return '투입 시작일은 프로젝트 시작일보다 빠를 수 없습니다.';
  if (project.END_DATE && assignment.END_DATE > project.END_DATE) return '투입 종료일은 프로젝트 종료일보다 늦을 수 없습니다.';
  if (!Number.isFinite(assignment.PLAN_MM) || assignment.PLAN_MM < 0) return '계획 MM은 0 이상이어야 합니다.';
  return '';
}

export function findOrCreateMember(
  members: DesignMember[],
  user: { USER_ID: string; USER_NAME: string; DEPARTMENT_NAME: string },
): DesignMember {
  return members.find((member) => member.USER_ID === user.USER_ID) ?? {
    MEMBER_ID: nextDomainId('MEM', members.map((member) => member.MEMBER_ID)),
    USER_ID: user.USER_ID,
    MEMBER_NAME: user.USER_NAME,
    ORG_ID: user.DEPARTMENT_NAME,
    CAREER_YEARS: null,
    MAIN_SKILL: '',
    NOTE: '',
  };
}

export function isActiveProjectMemberDuplicate(
  assignments: ProjectMember[],
  projectId: string,
  memberId: string,
  exceptId?: string,
) {
  return assignments.some((item) => item.PROJECT_ID === projectId && item.MEMBER_ID === memberId
    && item.STATUS_CD === 'ACTIVE' && item.PROJECT_MEMBER_ID !== exceptId);
}

