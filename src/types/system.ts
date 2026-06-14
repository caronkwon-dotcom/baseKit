import type { BaseEntity, UseYn } from './common';

export interface SystemConfig extends BaseEntity {
  SYSTEM_TIMEZONE_ID: string;
  SYSTEM_LANGUAGE_CODE: string;
  CONFIG_LOCKED_YN: UseYn;
}
