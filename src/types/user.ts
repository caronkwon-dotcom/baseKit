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
  PASSWORD_CHANGED_AT: string;
  LOGIN_FAIL_COUNT: number;
  LOCKED_YN: UseYn;
  USE_YN: UseYn;
}
