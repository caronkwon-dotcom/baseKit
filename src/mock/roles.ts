import type { Role } from '../types';

export const roles: Role[] = [
  {
    ROLE_ID: 'ROLE-ADMIN',
    ROLE_NAME: '관리자',
    ROLE_TYPE_CODE: 'ADMIN',
    USE_YN: 'Y',
    CREATED_AT: '2026-06-02T11:00:00',
    CREATED_BY: 'system',
    UPDATED_AT: '2026-06-02T11:00:00',
    UPDATED_BY: 'system',
  },
  {
    ROLE_ID: 'ROLE-OPERATOR',
    ROLE_NAME: '운영자',
    ROLE_TYPE_CODE: 'OPERATOR',
    USE_YN: 'Y',
    CREATED_AT: '2026-06-02T11:10:00',
    CREATED_BY: 'system',
    UPDATED_AT: '2026-06-02T11:10:00',
    UPDATED_BY: 'system',
  },
  {
    ROLE_ID: 'ROLE-USER',
    ROLE_NAME: '일반사용자',
    ROLE_TYPE_CODE: 'USER',
    USE_YN: 'Y',
    CREATED_AT: '2026-06-02T11:20:00',
    CREATED_BY: 'system',
    UPDATED_AT: '2026-06-02T11:20:00',
    UPDATED_BY: 'system',
  },
];
