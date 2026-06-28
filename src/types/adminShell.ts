import type { ReactNode } from 'react';

export type ProgramKey = 'HOME' | 'USER_MGMT' | 'COMMON_CODE_MGMT' | 'MENU_MGMT';

export interface ProgramMeta {
  programKey: ProgramKey;
  programName: string;
  componentName: string;
  screenType: 'HOME' | 'GRID_DETAIL';
  routePath: string;
  actions: string[];
  manualActions: string[];
}

export interface MenuMeta {
  menuKey: string;
  parentMenuKey: string | null;
  menuName: string;
  menuLevel: number;
  menuType: 'GROUP' | 'SCREEN';
  programKey: ProgramKey | null;
  sortOrder: number;
  useYn: 'Y' | 'N';
}

export interface MenuNode extends MenuMeta {
  children: MenuNode[];
}

export interface MdiTab {
  programKey: ProgramKey;
  title: string;
}

export type ProgramComponentMap = Record<ProgramKey, () => ReactNode>;
