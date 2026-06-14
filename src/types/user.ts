import type { BaseEntity } from './common';

export interface User extends BaseEntity {
  USER_ID: string;
  USER_NAME: string;
  EMAIL: string;
  ROLE_ID: string;
  USE_YN: 'Y' | 'N';
}
