import { ROLE } from '../constants/roleConstants';
import type { MenuPermission } from '../types/menuPermission';

const pageMenuIds = [
  'SYS_USER',
  'SYS_ROLE',
  'SYS_MENU',
  'SYS_CODE',
  'MASTER_COMPANY',
  'MASTER_ORG',
  'BOARD_NOTICE',
  'BOARD_FAQ',
] as const;

const readonlyPagePermission = (
  roleCode: string,
  menuId: string,
): MenuPermission => ({
  roleCode,
  menuId,
  readYn: 'Y',
  createYn: 'N',
  updateYn: 'N',
  deleteYn: 'N',
  customYn: 'N',
});

export const menuPermissionMock: MenuPermission[] = [
  ...pageMenuIds.map((menuId) => ({
    roleCode: ROLE.ADMIN,
    menuId,
    readYn: 'Y',
    createYn: 'Y',
    updateYn: 'Y',
    deleteYn: 'Y',
    customYn: 'Y',
  })),
  ...pageMenuIds.map((menuId) => readonlyPagePermission(ROLE.PURCHASER, menuId)),
  ...pageMenuIds.map((menuId) => readonlyPagePermission(ROLE.MANAGER, menuId)),
  readonlyPagePermission(ROLE.VENDOR, 'BOARD_NOTICE'),
  readonlyPagePermission(ROLE.VENDOR, 'BOARD_FAQ'),
];
