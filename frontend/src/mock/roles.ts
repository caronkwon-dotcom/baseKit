import type { Role } from '../types';

export const roles: Role[] = [
  {
    roleCode: 'ADMIN',
    roleName: '관리자',
    orderNo: 1,
    useYn: 'Y',
  },
  {
    roleCode: 'PURCHASER',
    roleName: '구매원',
    orderNo: 2,
    useYn: 'Y',
  },
  {
    roleCode: 'MANAGER',
    roleName: '부서장',
    orderNo: 3,
    useYn: 'Y',
  },
  {
    roleCode: 'VENDOR',
    roleName: '협력업체',
    orderNo: 4,
    useYn: 'Y',
  },
];
