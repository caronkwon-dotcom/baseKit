import type { Role } from '../types';

export const roles: Role[] = [
  {
    roleCode: 'ADMIN',
    roleName: '관리자',
    orderNo: 1,
    useYn: 'Y',
  },
  {
    roleCode: 'OPERATOR',
    roleName: '운영자',
    orderNo: 2,
    useYn: 'Y',
  },
  {
    roleCode: 'USER',
    roleName: '일반사용자',
    orderNo: 3,
    useYn: 'Y',
  },
];
