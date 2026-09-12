import type { ReactNode } from 'react';
import type { ActionCode } from '../constants/actionCodes';

/** BaseKit Core가 소유하는 Program만 선언한다. Product Program은 Module Manifest가 소유한다. */
export const CORE_PROGRAM_KEYS = [
  'HOME',
  'USER_MGMT',
  'COMMON_CODE_MGMT',
  'MENU_MGMT',
  'TABLE_MGMT',
  'TERM_CURATION',
  'WORD_MGMT',
  'DOMAIN_MGMT',
  'DOCUMENT_CENTER',
  'DEV_SEARCH_SAMPLE_TYPE_1',
  'DEV_SEARCH_SAMPLE_TYPE_2',
] as const;

export type CoreProgramKey = (typeof CORE_PROGRAM_KEYS)[number];
export type ProgramKey = string;

/**
 * programKey     : 화면 ID
 * programName    : 화면명
 * componentName  : 연결될 컴포넌트 이름
 * screenType     : 화면 유형
 * routePath      : 향후 라우팅/API 확장용 경로
 * actionCodes    : 프로그램에서 지원하는 공통/업무 액션
 * useYn          : 사용 여부
 */
export interface ProgramMeta {
  programKey: ProgramKey;
  programName: string;
  componentName: string;
  screenType: 'HOME' | 'GRID_DETAIL';
  routePath: string;
  dataScope: 'USER' | 'COMPANY';
  modifyScope: 'NONE' | 'ROLE';
  actionCodes: ActionCode[];
  useYn: 'Y' | 'N';
}

/**
 * menuKey        : 메뉴 ID
 * parentMenuKey  : 상위 메뉴 ID
 * menuName       : 메뉴명
 * menuLevel      : 메뉴 깊이
 * menuType       : 그룹인지 화면인지
 * programKey     : 연결될 화면 ID
 * sortOrder      : 정렬 순서
 * useYn          : 사용 여부
 */
export interface MenuMeta {
  menuKey: string;
  parentMenuKey: string | null;
  menuName: string;
  menuLevel: number;
  menuType: 'GROUP' | 'SCREEN';
  programKey: ProgramKey | null;
  sortOrder: number;
  useYn: 'Y' | 'N';
}

export interface MenuNode extends MenuMeta {
  children: MenuNode[];
}

export interface ActionMeta {
  actionCode: ActionCode;
  actionName: string;
  auditYn: 'Y' | 'N';
}

export interface RoleProgramAction {
  ROLE_CODE: string;
  PROGRAM_KEY: ProgramKey;
  ACTION_CODE: ActionCode;
  ALLOW_YN: 'Y' | 'N';
}

export interface MdiTab {
  programKey: ProgramKey;
  title: string;
}

export type ProgramComponentMap = Record<string, () => ReactNode>;
