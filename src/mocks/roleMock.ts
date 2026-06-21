import { ROLE } from '../constants/roleConstants';
import type { Role } from '../types/role';

export const roleMock: Role[] = [
  {
    roleCode: ROLE.ADMIN,
    roleName: '관리자',
    orderNo: 1,
    useYn: 'Y',
  },
  {
    roleCode: ROLE.PURCHASER,
    roleName: '구매원',
    orderNo: 2,
    useYn: 'Y',
  },
  {
    roleCode: ROLE.MANAGER,
    roleName: '부서장',
    orderNo: 3,
    useYn: 'Y',
  },
  {
    roleCode: ROLE.VENDOR,
    roleName: '협력업체',
    orderNo: 4,
    useYn: 'Y',
  },
];
