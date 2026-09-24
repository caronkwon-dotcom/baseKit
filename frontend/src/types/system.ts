import type { ManagedEntity, UseYn } from './common';

export interface SystemConfig extends ManagedEntity {
  SYSTEM_CONFIG_ID: string;
  SYSTEM_NAME: string;
  SYSTEM_LANGUAGE_CODE: string;
  SYSTEM_TIMEZONE_ID: string;
  CONFIG_LOCKED_YN: UseYn;
}
