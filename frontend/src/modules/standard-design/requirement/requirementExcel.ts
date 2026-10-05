import type { ExcelImportColumn, ExcelRowMapper, ExcelRowValidator } from '../../../components/common';
import type { RequirementInput } from './requirementApi';

interface CodeOption { CODE: string; CODE_NAME: string }
interface MenuOption { PROJECT_MENU_ID: string; MENU_ID: string }

export interface RequirementExcelContext {
  projectId: string;
  types: CodeOption[];
  statuses: CodeOption[];
  projectMenus: MenuOption[];
}

export const requirementExcelColumns: ExcelImportColumn[] = [
  { key: 'REQUIREMENT_NAME', header: '요구사항명', required: true, width: 200, example: '주문 목록 조회' },
  { key: 'DESCRIPTION', header: '요구사항 내용', required: true, width: 280, example: '주문 목록을 기간·상태 조건으로 조회한다.' },
  { key: 'REQUIREMENT_TYPE', header: '요구유형', width: 100, example: 'NEW' },
  { key: 'PROCESS_DESCRIPTION', header: '프로세스 설명', width: 240, example: '' },
  { key: 'STATUS', header: '상태', width: 100, example: 'DRAFT' },
  { key: 'MENU_IDS', header: '프로젝트 메뉴 ID', width: 180, example: 'ORD_LIST,ORD_DETAIL' },
];

const text = (value: unknown) => value === null || value === undefined ? '' : String(value).trim();
const findCode = (options: CodeOption[], value: string) => options.find((option) => option.CODE === value || option.CODE_NAME === value);
const splitMenuIds = (value: unknown) => text(value).split(/[,;\n]/).map((item) => item.trim()).filter(Boolean);

export const createRequirementExcelValidator = ({ types, statuses, projectMenus }: RequirementExcelContext): ExcelRowValidator => (values) => {
  const errors: string[] = [];
  if (text(values.REQUIREMENT_NAME).length > 200) errors.push('요구사항명은 200자 이하여야 합니다.');
  const type = text(values.REQUIREMENT_TYPE);
  if (type && !findCode(types, type)) errors.push(`등록되지 않은 요구유형입니다: ${type}`);
  const status = text(values.STATUS);
  if (status && !findCode(statuses, status)) errors.push(`등록되지 않은 상태입니다: ${status}`);
  splitMenuIds(values.MENU_IDS).forEach((menuId) => {
    if (!projectMenus.some((menu) => menu.MENU_ID === menuId)) errors.push(`프로젝트 메뉴를 찾을 수 없습니다: ${menuId}`);
  });
  return errors;
};

export const createRequirementExcelMapper = ({ projectId, types, statuses, projectMenus }: RequirementExcelContext): ExcelRowMapper<RequirementInput> => (values) => {
  const type = text(values.REQUIREMENT_TYPE);
  const status = text(values.STATUS);
  const menuIds = new Set(splitMenuIds(values.MENU_IDS));
  return {
    PROJECT_ID: projectId,
    REQUIREMENT_NAME: text(values.REQUIREMENT_NAME),
    REQUIREMENT_TYPE_CODE: type ? findCode(types, type)?.CODE ?? type : 'NEW',
    DESCRIPTION: text(values.DESCRIPTION),
    PROCESS_DESCRIPTION: text(values.PROCESS_DESCRIPTION),
    STATUS: status ? findCode(statuses, status)?.CODE ?? status : 'DRAFT',
    MENU_KEYS: [],
    PROJECT_MENU_IDS: projectMenus.filter((menu) => menuIds.has(menu.MENU_ID)).map((menu) => menu.PROJECT_MENU_ID),
  };
};

export const requirementImportKey = (item: RequirementInput) => JSON.stringify([
  item.REQUIREMENT_NAME, item.DESCRIPTION, item.PROCESS_DESCRIPTION, item.REQUIREMENT_TYPE_CODE, item.STATUS, [...item.PROJECT_MENU_IDS].sort(),
]);

export interface RequirementImportPlan {
  toCreate: RequirementInput[];
  skippedAlreadyCreated: number;
  duplicateNames: string[];
}

/** 같은 Import 세션에서 이미 저장된 건은 제외하고, 기존·파일 내 동일 요구사항명을 중복 후보로 모은다. */
export const planRequirementImport = (items: RequirementInput[], existingNames: string[], alreadyCreatedKeys: ReadonlySet<string>): RequirementImportPlan => {
  const toCreate = items.filter((item) => !alreadyCreatedKeys.has(requirementImportKey(item)));
  const known = new Set(existingNames.map((name) => name.trim().toLocaleLowerCase()));
  const duplicateNames = new Set<string>();
  toCreate.forEach((item) => {
    const name = item.REQUIREMENT_NAME.trim().toLocaleLowerCase();
    if (known.has(name)) duplicateNames.add(item.REQUIREMENT_NAME.trim());
    known.add(name);
  });
  return { toCreate, skippedAlreadyCreated: items.length - toCreate.length, duplicateNames: [...duplicateNames] };
};
