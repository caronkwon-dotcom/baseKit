import type {
  DbTableDefinition,
  DesignLifecycleData,
  DesignProject,
  DesignRequirement,
  ScreenDefinition,
  WbsItem,
} from './designLifecycle.types';

const STORAGE_KEY = 'basekit.standard-design.lifecycle.v1';
const PROJECT_CONTEXT_KEY = 'basekit.standard-design.project-context.v1';

const initialData: DesignLifecycleData = {
  projects: [{ PROJECT_ID: 'SDP-001', PROJECT_NAME: 'BaseKit 적용 설계', CUSTOMER_NAME: '내부 기준', DESCRIPTION: '설계 산출물과 추적성을 검증하는 기준 프로젝트입니다.', STATUS: 'IN_PROGRESS' }],
  wbsItems: [
    { WBS_ID: 'WBS-001', PROJECT_ID: 'SDP-001', PARENT_WBS_ID: null, WBS_NAME: '요구사항 분석', WBS_LEVEL: 1, STATUS: 'IN_PROGRESS' },
    { WBS_ID: 'WBS-002', PROJECT_ID: 'SDP-001', PARENT_WBS_ID: 'WBS-001', WBS_NAME: '표준 관리 분석', WBS_LEVEL: 2, STATUS: 'DRAFT' },
  ],
  requirements: [{ REQUIREMENT_ID: 'REQ-001', PROJECT_ID: 'SDP-001', REQUIREMENT_NAME: '표준용어 조회', DESCRIPTION: '사용자는 표준용어 목록과 상세 정보를 조회할 수 있어야 합니다.', STATUS: 'IN_PROGRESS', WBS_IDS: ['WBS-002'], SCREEN_IDS: ['SCR-001'], TABLE_IDS: ['TBL-001'] }],
  screens: [{ SCREEN_ID: 'SCR-001', PROJECT_ID: 'SDP-001', SCREEN_NAME: '표준용어 목록', SCREEN_TYPE: 'LIST', DESCRIPTION: '표준용어 검색과 목록 조회 화면입니다.', STATUS: 'IN_PROGRESS', FIELDS: [{ FIELD_ID: 'FLD-001', FIELD_NAME: 'TERM_NAME', LOGICAL_NAME: '표준용어명', DATA_TYPE: 'STRING', REQUIRED_YN: 'N', DESCRIPTION: '검색 및 목록 표시 항목' }] }],
  tables: [{ TABLE_ID: 'TBL-001', PROJECT_ID: 'SDP-001', TABLE_NAME: 'BSDTTERM', LOGICAL_NAME: '표준용어', DESCRIPTION: '표준용어 조회 설계 기준 테이블입니다.', STATUS: 'DRAFT', CATALOG_TABLE_KEY: 'TERM', COLUMNS: [{ COLUMN_ID: 'COL-001', COLUMN_NAME: 'TERM_ID', LOGICAL_NAME: '용어ID', DOMAIN_NAME: 'ID', DATA_TYPE: 'VARCHAR(36)', PK_YN: 'Y', NULLABLE_YN: 'N', DESCRIPTION: '표준용어 식별자' }] }],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadData(): DesignLifecycleData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return clone(initialData);
  try {
    return JSON.parse(stored) as DesignLifecycleData;
  } catch {
    throw new Error('저장된 설계 Lifecycle 데이터 형식이 올바르지 않습니다.');
  }
}

function saveData(data: DesignLifecycleData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function upsert<T, K extends keyof T>(rows: T[], item: T, key: K) {
  const index = rows.findIndex((row) => row[key] === item[key]);
  return index < 0 ? [...rows, item] : rows.map((row, rowIndex) => rowIndex === index ? item : row);
}

export const designLifecycleRepository = {
  getData: () => loadData(),
  getSelectedProjectId: () => localStorage.getItem(PROJECT_CONTEXT_KEY) ?? loadData().projects[0]?.PROJECT_ID ?? '',
  setSelectedProjectId: (projectId: string) => localStorage.setItem(PROJECT_CONTEXT_KEY, projectId),
  saveProject: (project: DesignProject) => {
    const data = loadData();
    saveData({ ...data, projects: upsert(data.projects, project, 'PROJECT_ID') });
  },
  saveWbs: (item: WbsItem) => {
    const data = loadData();
    saveData({ ...data, wbsItems: upsert(data.wbsItems, item, 'WBS_ID') });
  },
  saveRequirement: (item: DesignRequirement) => {
    const data = loadData();
    saveData({ ...data, requirements: upsert(data.requirements, item, 'REQUIREMENT_ID') });
  },
  saveScreen: (item: ScreenDefinition) => {
    const data = loadData();
    saveData({ ...data, screens: upsert(data.screens, item, 'SCREEN_ID') });
  },
  saveTable: (item: DbTableDefinition) => {
    const data = loadData();
    saveData({ ...data, tables: upsert(data.tables, item, 'TABLE_ID') });
  },
  deleteItem: (type: keyof Pick<DesignLifecycleData, 'projects' | 'wbsItems' | 'requirements' | 'screens' | 'tables'>, id: string) => {
    const data = loadData();
    if (type === 'projects') saveData({ ...data, projects: data.projects.filter((item) => item.PROJECT_ID !== id) });
    if (type === 'wbsItems') saveData({ ...data, wbsItems: data.wbsItems.filter((item) => item.WBS_ID !== id) });
    if (type === 'requirements') saveData({ ...data, requirements: data.requirements.filter((item) => item.REQUIREMENT_ID !== id) });
    if (type === 'screens') saveData({ ...data, screens: data.screens.filter((item) => item.SCREEN_ID !== id) });
    if (type === 'tables') saveData({ ...data, tables: data.tables.filter((item) => item.TABLE_ID !== id) });
  },
};
