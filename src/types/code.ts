import type { BaseEntity } from './common';

export interface CodeGroup extends BaseEntity {
  CODE_GROUP_ID: string;
  CODE_GROUP_NAME: string;
  DESCRIPTION?: string;
  USE_YN: 'Y' | 'N';
}

export interface Code extends BaseEntity {
  CODE_GROUP_ID: string;
  CODE_ID: string;
  CODE_NAME: string;
  SORT_ORDER: number;
  USE_YN: 'Y' | 'N';
}
