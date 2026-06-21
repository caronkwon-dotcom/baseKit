import type { Yn } from './common';

export interface MenuPermission {
  roleCode: string;
  menuId: string;
  readYn: Yn;
  createYn: Yn;
  updateYn: Yn;
  deleteYn: Yn;
  customYn: Yn;
}
