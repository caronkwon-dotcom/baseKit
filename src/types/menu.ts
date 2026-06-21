import type { Yn } from './common';

export type MenuType = 'FOLDER' | 'PAGE';

export interface Menu {
  menuId: string;
  parentMenuId: string | null;
  menuName: string;
  menuType: MenuType;
  menuLevel: number;
  orderNo: number;
  path?: string;
  icon?: string;
  useYn: Yn;
}

export interface MenuTreeNode extends Menu {
  children: MenuTreeNode[];
}
