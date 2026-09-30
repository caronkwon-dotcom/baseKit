import type { ExcelImportColumn, ExcelRowMapper, ExcelRowValidator } from '../../../components/common';
import type { ProjectMenu } from '../projectmenu/projectMenuApi';
import type { Requirement, RequirementInput } from './requirementApi';

export interface RequirementExcelMappedRow {
  rowNumber: number;
  requirementId: string;
  input: RequirementInput;
}

export const requirementExcelColumns: ExcelImportColumn[] = [
  { key: 'REQUIREMENT_ID', header: 'REQUIREMENT_ID', width: 150, example: '' },
  { key: 'REQUIREMENT_NAME', header: 'REQUIREMENT_NAME', required: true, width: 220, example: '구매 요청 승인' },
  { key: 'REQUIREMENT_TYPE_CODE', header: 'REQUIREMENT_TYPE_CODE', required: true, width: 170, example: 'NEW' },
  { key: 'DESCRIPTION', header: 'DESCRIPTION', required: true, width: 360, example: '구매 요청을 등록하고 승인한다.' },
  { key: 'PROCESS_DESCRIPTION', header: 'PROCESS_DESCRIPTION', width: 300, example: '요청 등록 → 검토 → 승인' },
  { key: 'STATUS', header: 'STATUS', width: 120, example: 'DRAFT' },
  { key: 'PROJECT_MENU_PATHS', header: 'PROJECT_MENU_PATHS', width: 320, example: '구매관리 > 구매요청 | 구매관리 > 발주관리' },
];

const normalize = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const menuPath = (menu: ProjectMenu, menus: ProjectMenu[]) => {
  if (!menu.LEVEL1_MENU_ID) return menu.MENU_NAME.trim();
  const parent = menus.find((candidate) => candidate.MENU_ID === menu.LEVEL1_MENU_ID);
  return parent ? `${parent.MENU_NAME.trim()} > ${menu.MENU_NAME.trim()}` : menu.MENU_NAME.trim();
};

export const getProjectMenuPath = (menu: ProjectMenu, menus: ProjectMenu[]) => menuPath(menu, menus);

export const resolveProjectMenuIds = (value: unknown, menus: ProjectMenu[]): { ids: string[]; errors: string[] } => {
  const raw = String(value ?? '').trim();
  if (!raw) return { ids: [], errors: [] };
  const tokens = raw.split('|').map((item) => item.trim());
  const ids: string[] = [];
  const errors: string[] = [];
  for (const token of tokens) {
    if (!token) { errors.push('PROJECT_MENU_PATHS: 빈 메뉴 항목이 있습니다.'); continue; }
    const matches = menus.filter((menu) => normalize(menuPath(menu, menus)) === normalize(token));
    if (matches.length === 0) {
      const nameMatches = menus.filter((menu) => normalize(menu.MENU_NAME) === normalize(token));
      if (nameMatches.length === 1) matches.push(nameMatches[0]);
      else if (nameMatches.length > 1) { errors.push(`PROJECT_MENU_PATHS: 메뉴명이 중복되어 경로를 입력해야 합니다 (${token}).`); continue; }
    }
    if (matches.length === 0) { errors.push(`PROJECT_MENU_PATHS: 존재하지 않는 Project Menu입니다 (${token}).`); continue; }
    if (!ids.includes(matches[0].PROJECT_MENU_ID)) ids.push(matches[0].PROJECT_MENU_ID);
  }
  return { ids, errors };
};

const maxLengthErrors = (values: Record<string, unknown>): string[] => {
  const limits: Record<string, number> = { REQUIREMENT_ID: 50, REQUIREMENT_NAME: 200, REQUIREMENT_TYPE_CODE: 30, DESCRIPTION: 4000, PROCESS_DESCRIPTION: 4000, STATUS: 30 };
  return Object.entries(limits).flatMap(([key, max]) => String(values[key] ?? '').length > max ? [`${key}: 최대 ${max}자까지 입력할 수 있습니다.`] : []);
};

export const createRequirementExcelValidator = ({
  projectId,
  existingRequirements,
  projectMenus,
  requirementTypes,
  statuses,
}: {
  projectId: string;
  existingRequirements: Requirement[];
  projectMenus: ProjectMenu[];
  requirementTypes: string[];
  statuses: string[];
}): ExcelRowValidator => {
  const existingIds = new Set(existingRequirements.filter((row) => row.PROJECT_ID === projectId).map((row) => row.REQUIREMENT_ID));
  const seenIds = new Set<string>();
  return (values, rowNumber) => {
    const errors: string[] = [];
    const requirementId = String(values.REQUIREMENT_ID ?? '').trim();
    const typeCode = String(values.REQUIREMENT_TYPE_CODE ?? '').trim();
    const status = String(values.STATUS ?? '').trim() || 'DRAFT';
    if (requirementId && !existingIds.has(requirementId)) errors.push(`REQUIREMENT_ID: 현재 프로젝트에 존재하지 않습니다 (${requirementId}).`);
    if (requirementId && seenIds.has(requirementId)) errors.push(`REQUIREMENT_ID: 파일 내 중복입니다 (${requirementId}).`);
    if (requirementId) seenIds.add(requirementId);
    if (typeCode && !requirementTypes.includes(typeCode)) errors.push(`REQUIREMENT_TYPE_CODE: 유효하지 않은 코드입니다 (${typeCode}).`);
    if (!statuses.includes(status)) errors.push(`STATUS: 유효하지 않은 코드입니다 (${status}).`);
    errors.push(...resolveProjectMenuIds(values.PROJECT_MENU_PATHS, projectMenus).errors);
    errors.push(...maxLengthErrors(values));
    return errors.map((error) => `Row ${rowNumber}: ${error}`);
  };
};

export const createRequirementExcelMapper = (projectId: string, projectMenus: ProjectMenu[]): ExcelRowMapper<RequirementExcelMappedRow> => (values, rowNumber) => {
  const requirementId = String(values.REQUIREMENT_ID ?? '').trim();
  const resolved = resolveProjectMenuIds(values.PROJECT_MENU_PATHS, projectMenus);
  return {
    rowNumber,
    requirementId,
    input: {
      PROJECT_ID: projectId,
      REQUIREMENT_NAME: String(values.REQUIREMENT_NAME ?? '').trim(),
      REQUIREMENT_TYPE_CODE: String(values.REQUIREMENT_TYPE_CODE ?? '').trim(),
      DESCRIPTION: String(values.DESCRIPTION ?? '').trim(),
      PROCESS_DESCRIPTION: String(values.PROCESS_DESCRIPTION ?? '').trim(),
      STATUS: String(values.STATUS ?? '').trim() || 'DRAFT',
      MENU_KEYS: [],
      PROJECT_MENU_IDS: resolved.ids,
    },
  };
};
