import type { BaseEntity, UseYn } from './common';
export interface Program extends BaseEntity {
  PROGRAM_ID: string;
  PROGRAM_KEY: string;
  PROGRAM_NAME: string;
  MODULE_CODE: string;
  PROGRAM_TYPE_CODE: string;
  ROUTE: string;
  DESCRIPTION: string | null;
  USE_YN: UseYn;
}
