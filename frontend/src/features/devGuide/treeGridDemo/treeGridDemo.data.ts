export interface DemoTreeRow extends Record<string, unknown> {
  MENU_ID: string;
  PARENT_ID: string;
  NODE_TYPE: 'FOLDER' | 'LEAF';
  MENU_NAME: string;
  SORT_ORDER: number;
  USE_YN: 'Y' | 'N';
}

export const TREE_GRID_DEMO_ROWS: DemoTreeRow[] = [
  { MENU_ID: 'SYSTEM', PARENT_ID: '', NODE_TYPE: 'FOLDER', MENU_NAME: 'System Management', SORT_ORDER: 1, USE_YN: 'Y' },
  { MENU_ID: 'USER_MGMT', PARENT_ID: 'SYSTEM', NODE_TYPE: 'LEAF', MENU_NAME: 'User Management', SORT_ORDER: 1, USE_YN: 'Y' },
  { MENU_ID: 'COMMON_CODE', PARENT_ID: 'SYSTEM', NODE_TYPE: 'LEAF', MENU_NAME: 'Common Code Management', SORT_ORDER: 2, USE_YN: 'Y' },
  { MENU_ID: 'STANDARD_DATA', PARENT_ID: 'SYSTEM', NODE_TYPE: 'FOLDER', MENU_NAME: 'Standard Data', SORT_ORDER: 3, USE_YN: 'Y' },
  { MENU_ID: 'WORD_MGMT', PARENT_ID: 'STANDARD_DATA', NODE_TYPE: 'LEAF', MENU_NAME: 'Word Management', SORT_ORDER: 1, USE_YN: 'Y' },
  { MENU_ID: 'DOMAIN_MGMT', PARENT_ID: 'STANDARD_DATA', NODE_TYPE: 'LEAF', MENU_NAME: 'Domain Management', SORT_ORDER: 2, USE_YN: 'Y' },
  { MENU_ID: 'STANDARD_DESIGN', PARENT_ID: '', NODE_TYPE: 'FOLDER', MENU_NAME: 'Standard Design', SORT_ORDER: 2, USE_YN: 'Y' },
  { MENU_ID: 'PROJECT_MGMT', PARENT_ID: 'STANDARD_DESIGN', NODE_TYPE: 'LEAF', MENU_NAME: 'Project Management', SORT_ORDER: 1, USE_YN: 'Y' },
  { MENU_ID: 'REQUIREMENTS', PARENT_ID: 'STANDARD_DESIGN', NODE_TYPE: 'LEAF', MENU_NAME: 'Requirements Management', SORT_ORDER: 2, USE_YN: 'Y' },
  { MENU_ID: 'PROGRAM_REGISTER', PARENT_ID: 'STANDARD_DESIGN', NODE_TYPE: 'LEAF', MENU_NAME: 'Program Register', SORT_ORDER: 3, USE_YN: 'Y' },
];
