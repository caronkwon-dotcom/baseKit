import type { BaseEntity, UseYn } from './common';

export interface Menu extends BaseEntity {
  MENU_ID: string;
  PARENT_MENU_ID: string;
  MENU_NAME: string;
  MENU_PATH: string;
  SORT_ORDER: number;
  USE_YN: UseYn;
}
