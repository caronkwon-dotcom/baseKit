import type { BaseEntity } from './common';

export interface Role extends BaseEntity {
  ROLE_ID: string;
  ROLE_NAME: string;
  DESCRIPTION?: string;
  USE_YN: 'Y' | 'N';
}
