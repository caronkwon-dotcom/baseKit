import type { BaseEntity, UseYn } from './common';

export interface User extends BaseEntity {
  USER_ID: string;
  LOGIN_ID: string;
  USER_NAME: string;
  EMAIL: string;
  USER_TYPE_CODE: string;
  STATUS_CODE: string;
  LAST_LOGIN_AT: string;
  ACCOUNT_EXPIRED_AT: string;
  USE_YN: UseYn;
}
