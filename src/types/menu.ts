import type { BaseEntity } from './common';

export interface Menu extends BaseEntity {
  MENU_ID: string;
  MENU_NAME: string;
  PARENT_MENU_ID?: string;
  PROGRAM_ID?: string;
  PATH?: string;
  SORT_ORDER: number;
  USE_YN: 'Y' | 'N';
}
