import type { ManagedEntity } from './common';

export interface CodeGroup extends ManagedEntity {
  CODE_GROUP_ID: string;
  CODE_GROUP_NAME: string;
  DESCRIPTION: string;
}

export interface Code extends ManagedEntity {
  CODE_ID: string;
  CODE_GROUP_ID: string;
  CODE: string;
  CODE_NAME: string;
  SORT_ORDER: number;
}
