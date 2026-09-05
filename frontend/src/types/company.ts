import type { ManagedEntity } from './common';

export interface Company extends ManagedEntity {
  COMPANY_ID: string;
  COMPANY_NAME: string;
  COMPANY_TYPE_CODE: string;
  LANGUAGE_CODE: string;
  TIMEZONE_ID: string;
}
