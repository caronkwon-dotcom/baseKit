import type { BaseEntity, UseYn } from './common';

export interface CodeGroup extends BaseEntity {
  CODE_GROUP_ID: string;
  CODE_GROUP_NAME: string;
  DESCRIPTION: string;
  USE_YN: UseYn;
}

export interface Code extends BaseEntity {
  CODE_ID: string;
  CODE_GROUP_ID: string;
  CODE: string;
  CODE_NAME: string;
  SORT_ORDER: number;
  USE_YN: UseYn;
}
