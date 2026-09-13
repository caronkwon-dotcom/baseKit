export type DesignStatus = 'DRAFT' | 'IN_PROGRESS' | 'REVIEW' | 'APPROVED';

export interface DesignProject {
  PROJECT_ID: string;
  PROJECT_NAME: string;
  CUSTOMER_NAME: string;
  DESCRIPTION: string;
  STATUS: DesignStatus;
}

export interface WbsItem {
  WBS_ID: string;
  PROJECT_ID: string;
  PARENT_WBS_ID: string | null;
  WBS_NAME: string;
  WBS_LEVEL: number;
  STATUS: DesignStatus;
}

export interface DesignRequirement {
  REQUIREMENT_ID: string;
  PROJECT_ID: string;
  REQUIREMENT_NAME: string;
  DESCRIPTION: string;
  STATUS: DesignStatus;
  WBS_IDS: string[];
  SCREEN_IDS: string[];
  TABLE_IDS: string[];
}

export interface ScreenField {
  FIELD_ID: string;
  FIELD_NAME: string;
  LOGICAL_NAME: string;
  DATA_TYPE: string;
  REQUIRED_YN: 'Y' | 'N';
  DESCRIPTION: string;
}

export interface ScreenDefinition {
  SCREEN_ID: string;
  PROJECT_ID: string;
  SCREEN_NAME: string;
  SCREEN_TYPE: 'LIST' | 'DETAIL' | 'POPUP';
  DESCRIPTION: string;
  STATUS: DesignStatus;
  FIELDS: ScreenField[];
}

export interface DbColumnDefinition {
  COLUMN_ID: string;
  COLUMN_NAME: string;
  LOGICAL_NAME: string;
  DOMAIN_NAME: string;
  DATA_TYPE: string;
  PK_YN: 'Y' | 'N';
  NULLABLE_YN: 'Y' | 'N';
  DESCRIPTION: string;
}

export interface DbTableDefinition {
  TABLE_ID: string;
  PROJECT_ID: string;
  TABLE_NAME: string;
  LOGICAL_NAME: string;
  DESCRIPTION: string;
  STATUS: DesignStatus;
  CATALOG_TABLE_KEY?: string;
  COLUMNS: DbColumnDefinition[];
}

export type DesignLifecycleData = {
  projects: DesignProject[];
  wbsItems: WbsItem[];
  requirements: DesignRequirement[];
  screens: ScreenDefinition[];
  tables: DbTableDefinition[];
};
