import type { ReactNode } from 'react';

export type ProgramKey =
    | 'HOME'
    | 'USER_MGMT'
    | 'COMMON_CODE_MGMT'
    | 'MENU_MGMT'
    | 'DEV_SEARCH_SAMPLE_TYPE_1';

/**
 * programKey     : 화면 ID
 * programName    : 화면명
 * componentName  : 연결될 컴포넌트 이름
 * screenType     : 화면 유형
 * routePath      : 향후 라우팅/API 확장용 경로
 * actions        : 기본 액션
 * manualActions  : 사용자가 직접 정의한 액션
 */
export interface ProgramMeta {
  programKey: ProgramKey;
  programName: string;
  componentName: string;
  screenType: 'HOME' | 'GRID_DETAIL';
  routePath: string;
  actions: string[];
  manualActions: string[];
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

export interface MdiTab {
  programKey: ProgramKey;
  title: string;
}

export type ProgramComponentMap = Record<ProgramKey, () => ReactNode>;
