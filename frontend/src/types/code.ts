import type { ManagedEntity, UseYn } from './common';

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
  ATTRIBUTE_VALUES?: Record<string, string>;
}

export type AttributeDataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DATETIME';
export type AttributeControlType = 'TEXT' | 'NUMBER' | 'SWITCH' | 'SELECT' | 'DATE_PICKER' | 'COLOR_PICKER';
export type AttributeDisplayType = 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'COLOR' | 'BADGE';

export interface CodeAttributeDefinition extends ManagedEntity {
  ATTRIBUTE_DEF_ID: string;
  CODE_GROUP_ID: string;
  ATTRIBUTE_CODE: string;
  ATTRIBUTE_NAME: string;
  DATA_TYPE: AttributeDataType;
  CONTROL_TYPE: AttributeControlType;
  DISPLAY_TYPE: AttributeDisplayType;
  REQUIRED_YN: UseYn;
  DEFAULT_VALUE: string | null;
  OPTION_SOURCE: string | null;
  SORT_ORDER: number;
}

export interface CodeAttributeValue {
  CODE_ID: string;
  ATTRIBUTE_DEF_ID: string;
  ATTRIBUTE_CODE: string;
  ATTRIBUTE_VALUE: string;
}
