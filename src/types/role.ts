import type { BaseEntity, UseYn } from './common';

export interface Role extends BaseEntity {
  ROLE_ID: string;
  ROLE_NAME: string;
  ROLE_TYPE_CODE: string;
  USE_YN: UseYn;
}
