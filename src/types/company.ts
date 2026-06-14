import type { BaseEntity, UseYn } from './common';

export interface Company extends BaseEntity {
  COMPANY_ID: string;
  COMPANY_NAME: string;
  COMPANY_TYPE_CODE: string;
  LANGUAGE_CODE: string;
  TIMEZONE_ID: string;
  USE_YN: UseYn;
}
